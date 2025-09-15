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
            return window.indexedDBHelper.getAllData('bookMetadataDB', 'bookMetadata');
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
            window.indexedDBHelper.updateData('bookMetadataDB', 'bookMetadata', book)
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
            // 根据文件类型添加不同的类名
            if (book.name.startsWith('草稿_')) {
                bookCard.classList.add('draft-book');
            } else {
                bookCard.classList.add('reading-book');
            }
            
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
            
            // 添加阅读标识或草稿标识
            const bookTypeTag = document.createElement('span');
            if (book.name.startsWith('草稿_')) {
                bookTypeTag.className = 'book-tag draft-tag';
                bookTypeTag.textContent = '草稿';
            } else {
                bookTypeTag.className = 'book-tag reading-tag';
                bookTypeTag.textContent = '阅读';
            }
            bookCard.appendChild(bookTypeTag);
            
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
                // 从IndexedDB获取文件内容，不指定版本号，自动使用当前版本
                const dbRequest = indexedDB.open('bookDB');
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['books'], 'readonly');
                    const store = transaction.objectStore('books');
                    const getRequest = store.get(encodeURIComponent(book.name));
                    getRequest.onsuccess = function() {
                            const fileContent = getRequest.result?.content;
                            const hasRecord = getRequest.result !== undefined;
                            console.log('查询的键:', encodeURIComponent(book.name));
                            console.log('查询结果:', getRequest.result);
                            if (hasRecord) {
                                // 检查是否为草稿文件（以"草稿_"开头的文件）
                                if (book.name.startsWith('草稿_')) {
                                    const url = new URL('../page/word-draft.html', window.location.origin);
                                    url.searchParams.set('fileName', encodeURIComponent(book.name));
                                    window.location.href = url.toString();
                                } else {
                                    const url = new URL('../page/book-detail.html', window.location.origin);
                                    url.searchParams.set('bookName', encodeURIComponent(book.name));
                                    window.location.href = url.toString();
                                }
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

    // 从bookDB获取所有草稿文件并添加到书架
    function loadDraftsFromBookDB() {
        const dbRequest = indexedDB.open('bookDB');
        dbRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'name' });
            }
        };
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            // 检查对象存储是否存在
            if (!db.objectStoreNames.contains('books')) {
                console.error('对象存储 "books" 不存在');
                // 如果不存在，关闭数据库连接并重新初始化
                db.close();
                const newDbRequest = indexedDB.open('bookDB'); // 不指定版本号，自动使用当前版本
                newDbRequest.onupgradeneeded = function(event) {
                    const newDb = event.target.result;
                    if (!newDb.objectStoreNames.contains('books')) {
                        newDb.createObjectStore('books', { keyPath: 'name' });
                    }
                };
                newDbRequest.onsuccess = function(event) {
                    const newDb = event.target.result;
                    const transaction = newDb.transaction(['books'], 'readonly');
                    const store = transaction.objectStore('books');
                    const getRequest = store.getAll();
                    getRequest.onsuccess = function() {
                        const allBooks = getRequest.result;
                        // 过滤出草稿文件（以"草稿_"开头的文件）
                        const drafts = allBooks.filter(book => {
                            try {
                                const decodedName = decodeURIComponent(book.name);
                                return decodedName.startsWith('草稿_') && !([...selectedBooks].some(b => b.name === decodedName));
                            } catch (e) {
                                console.error('解码文件名失败:', book.name, e);
                                return false;
                            }
                        });
                        
                        // 将草稿文件添加到书架
                        drafts.forEach(draft => {
                            try {
                                const decodedName = decodeURIComponent(draft.name);
                                // 检查是否已存在
                                if (![...selectedBooks].some(b => b.name === decodedName)) {
                                    selectedBooks.add({ 
                                        name: decodedName, 
                                        lastModified: draft.lastModified || Date.now(), 
                                        size: draft.content?.length || 0, 
                                        type: 'text/plain' 
                                    });
                                }
                            } catch (e) {
                                console.error('处理草稿文件失败:', draft.name, e);
                            }
                        });
                        
                        saveBooksToIndexedDB();
                        renderBooks();
                    };
                };
                newDbRequest.onerror = function(event) {
                    console.error('IndexedDB错误:', event.target.error);
                };
                return;
            }
            
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const getRequest = store.getAll();
            getRequest.onsuccess = function() {
                const allBooks = getRequest.result;
                // 过滤出草稿文件（以"草稿_"开头的文件）
                const drafts = allBooks.filter(book => {
                    try {
                        const decodedName = decodeURIComponent(book.name);
                        return decodedName.startsWith('草稿_') && !([...selectedBooks].some(b => b.name === decodedName));
                    } catch (e) {
                        console.error('解码文件名失败:', book.name, e);
                        return false;
                    }
                });
                
                // 将草稿文件添加到书架
                drafts.forEach(draft => {
                    try {
                        const decodedName = decodeURIComponent(draft.name);
                        // 检查是否已存在
                        if (![...selectedBooks].some(b => b.name === decodedName)) {
                            selectedBooks.add({ 
                                name: decodedName, 
                                lastModified: draft.lastModified || Date.now(), 
                                size: draft.content?.length || 0, 
                                type: 'text/plain' 
                            });
                        }
                    } catch (e) {
                        console.error('处理草稿文件失败:', draft.name, e);
                    }
                });
                
                saveBooksToIndexedDB();
                renderBooks();
            };
        };
        dbRequest.onerror = function(event) {
            console.error('IndexedDB错误:', event.target.error);
        };
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
                    const dbRequest = indexedDB.open('bookDB');
                    dbRequest.onupgradeneeded = function(event) {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('books')) {
                            db.createObjectStore('books', { keyPath: 'name' });
                        }
                    };
                    dbRequest.onsuccess = function(event) {
                        const db = event.target.result;
                        // 检查对象存储是否存在
                        if (!db.objectStoreNames.contains('books')) {
                            console.error('对象存储 "books" 不存在');
                            // 如果不存在，关闭数据库连接并重新初始化
                            db.close();
                            const newDbRequest = indexedDB.open('bookDB'); // 不指定版本号，自动使用当前版本
                            newDbRequest.onupgradeneeded = function(event) {
                                const newDb = event.target.result;
                                if (!newDb.objectStoreNames.contains('books')) {
                                    newDb.createObjectStore('books', { keyPath: 'name' });
                                }
                            };
                            newDbRequest.onsuccess = function(event) {
                                const newDb = event.target.result;
                                const transaction = newDb.transaction(['books'], 'readwrite');
                                const store = transaction.objectStore('books');
                                // 存储文件内容到IndexedDB
                                store.put({ name: encodeURIComponent(file.name), content: fileContent });
                                transaction.oncomplete = function() {
                                    selectedBooks.add({ name: file.name, lastModified: file.lastModified, size: file.size, type: file.type });
                                    saveBooksToIndexedDB();
                                    renderBooks();
                                };
                            };
                            newDbRequest.onerror = function(event) {
                                console.error('IndexedDB错误:', event.target.error);
                            };
                            return;
                        }
                        
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
    // 加载草稿文件
    loadDraftsFromBookDB();

    // 草稿按钮事件
    const draftBtn = document.getElementById('draftBtn');
    if (draftBtn) {
        draftBtn.addEventListener('click', () => {
            // 生成默认的草稿文件名
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const fileName = `草稿_${timestamp}.txt`;
            
            // 直接跳转到word-draft.html页面，让页面自己创建新文件
            const url = new URL('page/word-draft.html', window.location.origin);
            url.searchParams.set('fileName', fileName);
            window.location.href = url.toString();
        });
    }

    // 全选/取消全选按钮事件
    const allSelectedBtn = document.getElementById('allSelected');
    allSelectedBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.delete-checkbox');
        const allChecked = [...checkboxes].every(checkbox => checkbox.checked);
        checkboxes.forEach(checkbox => checkbox.checked = !allChecked);
        allSelectedBtn.textContent = allChecked ? '☑' : '☒'; //'批量全选 ☑' : '取消全选☒';
    });

    // 编辑选中书籍事件
    const editSelectedBtn = document.getElementById('editSelected');
    if (editSelectedBtn) {
        editSelectedBtn.addEventListener('click', () => {
            const selectedCheckboxes = document.querySelectorAll('.delete-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                alert('请先选择要编辑的书籍');
                return;
            }
            if (selectedCheckboxes.length > 1) {
                alert('只能同时编辑一本书籍');
                return;
            }
            
            const bookName = selectedCheckboxes[0].dataset.bookName;
            // 检查是否为草稿文件（以"草稿_"开头的文件）
            if (bookName.startsWith('草稿_')) {
                const url = new URL('../page/word-draft.html', window.location.origin);
                url.searchParams.set('fileName', encodeURIComponent(bookName));
                window.location.href = url.toString();
            } else {
                const url = new URL('../page/book-detail.html', window.location.origin);
                url.searchParams.set('bookName', encodeURIComponent(bookName));
                window.location.href = url.toString();
            }
        });
    }

    // 添加切换标识按钮事件
    // const toggleBookTypeBtn = document.createElement('button');
    // toggleBookTypeBtn.id = 'toggleBookType';
    // toggleBookTypeBtn.className = 'toggle-btn';
    // toggleBookTypeBtn.textContent = '🔄'; //[阅读]和[草稿]模式切换标识
    //[阅读]和[草稿]模式切换标识
    const toggleBookTypeBtn = document.getElementById('toggleBookType');
    document.querySelector('.book-tool').appendChild(toggleBookTypeBtn);
    
    toggleBookTypeBtn.addEventListener('click', () => {
        const selectedCheckboxes = document.querySelectorAll('.delete-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('请先选择要切换标识的书籍');
            return;
        }
        
        const booksToToggle = Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.bookName);
        
        booksToToggle.forEach(bookName => {
            // 从内存中找到对应的book对象
            let bookToUpdate = null;
            selectedBooks.forEach(book => {
                if (book.name === bookName) {
                    bookToUpdate = book;
                }
            });
            
            if (bookToUpdate) {
                // 移除旧的book对象
                selectedBooks.delete(bookToUpdate);
                
                // 创建新名称
                let newName;
                if (bookToUpdate.name.startsWith('草稿_')) {
                    // 从草稿切换为阅读
                    newName = bookToUpdate.name.replace('草稿_', '');
                } else {
                    // 从阅读切换为草稿
                    if (!bookToUpdate.name.startsWith('草稿_')) {
                        newName = `草稿_${bookToUpdate.name}`;
                    } else {
                        newName = bookToUpdate.name;
                    }
                }
                
                // 复制文件内容并重命名，不指定版本号，自动使用当前版本
                const dbRequest = indexedDB.open('bookDB');
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['books'], 'readwrite');
                    const store = transaction.objectStore('books');
                    
                    // 获取原始文件内容
                    const getRequest = store.get(encodeURIComponent(bookToUpdate.name));
                    getRequest.onsuccess = function() {
                        const fileContent = getRequest.result?.content;
                        if (fileContent) {
                            // 存储新名称的文件
                            store.put({ name: encodeURIComponent(newName), content: fileContent, lastModified: Date.now() });
                            
                            // 删除旧名称的文件
                            store.delete(encodeURIComponent(bookToUpdate.name));
                        }
                    };
                };
                
                // 添加新的book对象到内存中
                const updatedBook = {
                    ...bookToUpdate,
                    name: newName,
                    lastModified: Date.now()
                };
                selectedBooks.add(updatedBook);
                
                // 更新元数据
                window.indexedDBHelper.deleteData('bookMetadataDB', 'bookMetadata', bookToUpdate.name)
                            .then(() => {
                                window.indexedDBHelper.updateData('bookMetadataDB', 'bookMetadata', updatedBook);
                            })
                    .catch(error => {
                        console.error('更新书籍元数据失败:', error);
                    });
            }
        });
        
        // 保存更新并重新渲染
        saveBooksToIndexedDB();
        renderBooks();
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
                window.indexedDBHelper.deleteData('bookMetadataDB', 'bookMetadata', bookName)
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
            
            window.indexedDBHelper.initDB('bookDB', 6, stores)
                .then(db => {
                    bookNames.forEach(bookName => {
                        const encodedName = encodeURIComponent(bookName);
                        window.indexedDBHelper.deleteData('bookDB', 'books', encodedName)
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
                    // 如果数据库初始化失败，也记录错误但不中断流程
                    console.error('数据库初始化失败:', error);
                    reject(error);
                });
        });
    }
});