document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const bookList = document.getElementById('bookList');
    const addToBookshelfBtn = document.getElementById('addToBookshelf');
    
    // 声明selectedBooks并初始化为空Set
    let selectedBooks = new Set();
    
    // 初始化IndexedDB数据库（用于元数据存储）
    let metadataDB;
    const stores = [
        {
            name: 'bookMetadata',
            keyPath: 'name'
        }
    ];
    
    window.indexedDBHelper.initDB('bookMetadataDB', 1, stores)
        .then(database => {
            metadataDB = database;
            // 从IndexedDB加载已选择的书籍
            return window.indexedDBHelper.getAllData('bookMetadata');
        })
        .then(savedBooks => {
            selectedBooks = new Set(savedBooks);
            renderBooks();
        })
        .catch(error => {
            console.error('元数据数据库错误:', error);
        });

    // 保存书籍到 IndexedDB
    function saveBooksToIndexedDB() {
        if (!metadataDB) return;
        Array.from(selectedBooks).forEach(book => {
            window.indexedDBHelper.updateData('bookMetadata', book)
                .catch(error => {
                    console.error('保存书籍到IndexedDB失败:', error);
                });
        });
    }

    // 渲染书籍列表
    function renderBooks() {
        bookList.innerHTML = '';
        selectedBooks.forEach((book, index) => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'delete-checkbox';
            checkbox.dataset.bookName = book.name;
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            bookCard.appendChild(checkbox);
            
            const bookCover = document.createElement('img');
            bookCover.src = '../img/book-banner.jpg';
            bookCover.alt = '书籍封面';
            bookCover.className = 'book-cover';
            
            const bookInfo = document.createElement('div');
            bookInfo.className = 'book-info';
            
            const bookTitle = document.createElement('div');
            bookTitle.className = 'book-title';
            bookTitle.textContent = book.name;
            
            const bookAuthor = document.createElement('label');
            bookAuthor.className = 'book-date';
            // bookAuthor.textContent = '作者信息待完善';
            // 修改：将固定文本改为文件最后修改时间（添加时间）
            const date = new Date(book.lastModified);
            const year = date.getFullYear().toString();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            bookAuthor.textContent =  `☪ ${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

            bookInfo.appendChild(bookTitle);
            bookInfo.appendChild(bookAuthor);
            
            bookCard.appendChild(bookCover);
            bookCard.appendChild(bookInfo);
            
            bookCard.dataset.index = index;
            bookCard.addEventListener('click', async () => {
                // 从IndexedDB获取文件内容
                const dbRequest = indexedDB.open('bookDB', 1);
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['books'], 'readonly');
                    const store = transaction.objectStore('books');
                    const getRequest = store.get(encodeURIComponent(book.name));
                    getRequest.onsuccess = function() {
                        const fileContent = getRequest.result?.content;
                        console.log('查询的键:', encodeURIComponent(book.name));
                        console.log('查询结果:', getRequest.result);
                        if (fileContent) {
                            const url = new URL('page/book-detail.html', window.location.origin);
                            url.searchParams.set('bookName', encodeURIComponent(book.name));
                            window.location.href = url.toString();
                        } else {
                            alert(`书籍内容不存在，请重新添加！\n查询的键: ${encodeURIComponent(book.name)}`);
                        }
                    };
                };
                dbRequest.onerror = function(event) {
                    console.error('IndexedDB错误:', event.target.error);
                };
            });
            
            bookList.appendChild(bookCard);
        });
    }

    // 文件选择事件
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(async (file) => {
            if (![...selectedBooks].some(b => b.name === file.name)) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const fileContent = event.target.result;
                    // 初始化IndexedDB数据库
                    const dbRequest = indexedDB.open('bookDB', 1);
                    dbRequest.onupgradeneeded = function(event) {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('books')) {
                            db.createObjectStore('books', { keyPath: 'name' });
                        }
                    };
                    dbRequest.onsuccess = function(event) {
                        const db = event.target.result;
                        const transaction = db.transaction(['books'], 'readwrite');
                        const store = transaction.objectStore('books');
                        // 存储文件内容到IndexedDB
                        store.put({ name: encodeURIComponent(file.name), content: fileContent });
                        transaction.oncomplete = function() {
                            selectedBooks.add({ name: file.name, lastModified: file.lastModified, size: file.size, type: file.type });
                            saveBooksToIndexedDB();
                            renderBooks();
                        };
                    };
                    dbRequest.onerror = function(event) {
                        console.error('IndexedDB错误:', event.target.error);
                    };

                };
                reader.readAsText(file);
            }
        });
    });

    // 加入书架事件
    // addToBookshelfBtn.addEventListener('click', () => {
    //     const selectedItems = bookList.querySelectorAll('.selected');
    //     selectedItems.forEach(item => {
    //         const index = item.dataset.index;
    //         const book = [...selectedBooks][index];
    //         console.log(`已加入书架: ${book.name}`);
    //     });
    //     saveBooksToLocalStorage();
    // });

    // 初始化渲染
    renderBooks();

    // 全选/取消全选按钮事件
    const allSelectedBtn = document.getElementById('allSelected');
    allSelectedBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.delete-checkbox');
        const allChecked = [...checkboxes].every(checkbox => checkbox.checked);
        checkboxes.forEach(checkbox => checkbox.checked = !allChecked);
        allSelectedBtn.textContent = allChecked ? '☑' : '☒'; //'批量全选 ☑' : '取消全选☒';
    });

    // 批量删除按钮事件
    document.getElementById('deleteSelected').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
        const booksToDelete = Array.from(checkboxes).map(checkbox => checkbox.dataset.bookName);
        
        // 先从内存中删除选中的书籍
        booksToDelete.forEach(bookName => {
            selectedBooks.forEach(book => {
                if (book.name === bookName) {
                    selectedBooks.delete(book);
                }
            });
        });
        
        // 从IndexedDB中删除选中的书籍
        if (metadataDB) {
            // 先删除元数据
            deleteFromMetadataDB(booksToDelete)
                .then(() => {
                    // 再删除书籍内容
                    return deleteFromBookDB(booksToDelete);
                })
                .then(() => {
                    console.log('所有选中的书籍已成功删除');
                    renderBooks();
                })
                .catch(error => {
                    console.error('删除书籍时出错:', error);
                    renderBooks(); // 即使出错也重新渲染
                });
        } else {
            // 如果数据库未打开，只重新渲染
            renderBooks();
        }
    });
    
    // 从元数据数据库中删除书籍
    function deleteFromMetadataDB(bookNames) {
        return new Promise((resolve, reject) => {
            let completed = 0;
            let errors = [];
            
            if (bookNames.length === 0) {
                resolve();
                return;
            }
            
            bookNames.forEach(bookName => {
                window.indexedDBHelper.deleteData('bookMetadata', bookName)
                    .then(() => {
                        completed++;
                        if (completed === bookNames.length) {
                            if (errors.length > 0) {
                                reject(errors);
                            } else {
                                resolve();
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`删除书籍元数据失败: ${bookName}`, error);
                        errors.push(error);
                        completed++;
                        if (completed === bookNames.length) {
                            reject(errors);
                        }
                    });
            });
        });
    }
    
    // 从书籍数据库中删除书籍内容
    function deleteFromBookDB(bookNames) {
        return new Promise((resolve, reject) => {
            let completed = 0;
            let errors = [];
            
            if (bookNames.length === 0) {
                resolve();
                return;
            }
            
            // 初始化书籍数据库
            const stores = [
                {
                    name: 'books',
                    keyPath: 'name'
                }
            ];
            
            window.indexedDBHelper.initDB('bookDB', 1, stores)
                .then(db => {
                    bookNames.forEach(bookName => {
                        const encodedName = encodeURIComponent(bookName);
                        window.indexedDBHelper.deleteData('books', encodedName)
                            .then(() => {
                                completed++;
                                if (completed === bookNames.length) {
                                    if (errors.length > 0) {
                                        reject(errors);
                                    } else {
                                        resolve();
                                    }
                                }
                            })
                            .catch(error => {
                                console.error(`删除书籍内容失败: ${bookName}`, error);
                                errors.push(error);
                                completed++;
                                if (completed === bookNames.length) {
                                    reject(errors);
                                }
                            });
                    });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
});