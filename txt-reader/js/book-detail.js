// 全局变量，用于存储设置数据库引用和DOM元素
let settingsDB;
// let chapterList;
// let content;
// let bookName = '';
// let encodedBookName = '';
// Import chapters and currentChapterIndex from edit-handler.js
// let chapters; // 这些变量将从 edit-handler.js 导入
// let currentChapterIndex;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    
    // Initialize chapters and currentChapterIndex from edit-handler module
    if (typeof window.editHandler !== 'undefined') {
        chapters = window.editHandler.chapters || [];
        currentChapterIndex = window.editHandler.currentChapterIndex || 0;
    } else {
        // Fallback to local initialization if module export is not available
        chapters = [];
        currentChapterIndex = 0;
    }
    
    // Initialize reader functions from reader-functions module
    if (typeof window.readerFunctions !== 'undefined' && typeof window.readerFunctions.initReaderFunctions === 'function') {
        window.readerFunctions.initReaderFunctions();
    }
    
    // Initialize edit functionality from edit-handler module
    if (typeof window.editHandler !== 'undefined' && typeof window.editHandler.initEditFunctionality === 'function') {
        // We'll call initEditFunctionality after chapters are loaded
    }
    
    // 添加保存到indexdb按钮的事件监听
    const saveIndexdbEditButton = document.getElementById('saveIndexdbEdit');
    if (saveIndexdbEditButton) {
        saveIndexdbEditButton.addEventListener('click', () => {
            if (typeof window.editHandler !== 'undefined' && typeof window.editHandler.saveChapterToIndexedDB === 'function') {
                window.editHandler.saveChapterToIndexedDB();
            } else {
                console.error('saveChapterToIndexedDB function is not available');
            }
        });
    }

    // 初始化IndexedDB数据库（用于用户设置存储）
    const settingsStores = [
        { name: 'readingSettings', keyPath: 'id' },
        { name: 'readingPositions', keyPath: 'bookName' }
    ];
    
    window.indexedDBHelper.initDB('userSettingsDB', 1, settingsStores)
        .then(db => {
            settingsDB = db;
            // 初始化设置
            if (typeof initSettings !== 'undefined') {
                initSettings(settingsDB, (settings) => {
                    // 设置变化事件监听
                    if (typeof setupSettingsEventListeners !== 'undefined') {
                        setupSettingsEventListeners(settingsDB);
                    }
                });
            }
        })
        .catch(error => {
            console.error('用户设置数据库错误:', error);
        });

    // 从 URL 参数获取图书名
    const urlParams = new URLSearchParams(window.location.search);
    bookName = decodeURIComponent(urlParams.get('bookName'));
    encodedBookName = encodeURIComponent(bookName);
    // 更新标题为书籍名称
    const h1Element = document.getElementById('txtTitle');//.querySelector('h1');
    if (h1Element) {
        h1Element.textContent = bookName.replace(".txt","") || 'txt在线阅读工具';
    }

    if (bookName) {
        // 从IndexedDB获取文件内容
        const stores = [
            {
                name: 'books',
                keyPath: 'name'
            }
        ];
        
        window.indexedDBHelper.initDB('bookDB', 6, stores)
            .then(db => {
                return window.indexedDBHelper.getDataByKey('bookDB', 'books', encodeURIComponent(bookName));
            })
            .then(result => {
                console.log('bookName:', bookName);
                console.log('bookData:', result ? '存在' : '不存在');
                if (result) {
                    // 使用新模块的函数渲染书籍内容
                    if (typeof window.readerFunctions !== 'undefined') {
                        window.readerFunctions.renderBookContentFromDB(result);
                    } else {
                        // 如果新模块不可用，使用原有方法
                        // 如果result有content属性，说明是从indexdb加载的已修改内容
                        const fileContent = result.content ? 
                            (typeof result.content === 'string' ? result.content : 
                                result.content.map(chapter => chapter.content).join('')) : 
                            result;
                        chapters = parseChapters(fileContent);
                        renderChapters(chapters);
                        renderContent(chapters);
                        // 从 IndexedDB 读取阅读位置
                        if (settingsDB) {
                            const transaction = settingsDB.transaction(['readingPositions'], 'readonly');
                            const store = transaction.objectStore('readingPositions');
                            const getRequest = store.get(encodeURIComponent(bookName));
                            getRequest.onsuccess = function() {
                                const savedPosition = getRequest.result.position;
                                if (savedPosition) {
                                    const { chapterIndex, scrollTop } = savedPosition;
                                    highlightChapter(chapterIndex);
                                    content.textContent = chapters[chapterIndex].content;
                                    content.scrollTop = scrollTop;
                                    updateWordCount(chapterIndex);
                                    // 滚动到对应的章节目录位置
                                    const chapterItems = chapterList.querySelectorAll('div');
                                    if (chapterItems[chapterIndex]) {
                                        chapterList.scrollTop = chapterItems[chapterIndex].offsetTop - 200;
                                    }
                                }
                            };
                        }
                    }
                } else {
                    alert('书籍内容不存在，请重新添加！');
                    content.textContent = '书籍内容不存在，请返回书架重新添加！';
                }
            })
            .catch(error => {
                console.error('获取文件内容失败:', error);
            });
        function renderBookContent(fileContent) {            
            chapters = parseChapters(fileContent);            
            renderChapters(chapters);            
            renderContent(chapters);                        
            // 从 IndexedDB 读取阅读位置            
            if (settingsDB) {
                const transaction = settingsDB.transaction(['readingPositions'], 'readonly');
                const store = transaction.objectStore('readingPositions');
                const getRequest = store.get(encodeURIComponent(bookName));
                getRequest.onsuccess = function() {
                    const savedPosition = getRequest.result.position;
                    if (savedPosition) {
                        const { chapterIndex, scrollTop } = savedPosition;
                        highlightChapter(chapterIndex);
                        content.textContent = chapters[chapterIndex].content;
                        content.scrollTop = scrollTop;
                        // 滚动到对应的章节目录位置
                        const chapterItems = chapterList.querySelectorAll('div.chapter-item');
                        if (chapterItems[chapterIndex]) {
                            chapterList.scrollTop = chapterItems[chapterIndex].offsetTop - 200;
                        }
                    }
                };
            }           
        }
    }
});
