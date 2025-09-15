// reader-functions.js - 目录、阅读、进度条功能模块

// 全局变量，用于存储设置数据库引用和DOM元素
let readerSettingsDB;
let chapterList;
let content;
let bookName = '';
let encodedBookName = '';
let readerChapters = [];
let readerCurrentChapterIndex = 0;



// 保存阅读位置到IndexedDB
function saveReadingPosition(chapterIndex, scrollTop) {
    if (readerSettingsDB && bookName) {
        const positionData = { 
            bookName: encodedBookName, 
            position: { 
                chapterIndex: chapterIndex, 
                scrollTop: scrollTop 
            } 
        };
        
        // 使用公用的IndexedDB助手更新数据
        window.indexedDBHelper.updateData('readingPositions', 'positions', positionData)
            .catch(error => {
                console.error('保存阅读位置失败:', error);
            });
    }
}

// 解析章节
function parseChapters(text) {
    const chapterRegex = /^[\s#*$]*(第)?[零一二三四五六七八九十百千1234567890]+章.*$/gm;
    const matches = [];
    let match;
    let lastIndex = 0;
    
    while ((match = chapterRegex.exec(text)) !== null) {
        if (matches.length > 0) {
            matches[matches.length - 1].content = text.slice(lastIndex, match.index);
        }
        matches.push({
            title: match[0],
            startIndex: match.index,
            content: ''
        });
        lastIndex = match.index;
    }
    
    if (matches.length > 0) {
        matches[matches.length - 1].content = text.slice(lastIndex);
    } else {
        matches.push({ title: '章节识别失败', content: text });
    }
    
    return matches;
}

// 渲染章节列表
function renderChapters(chaptersData) {
    readerChapters = chaptersData; // 更新全局变量
    chapterList.innerHTML = '';
    
    // 从 IndexedDB 读取阅读位置
    if (readerSettingsDB) {
        function readReadingPosition() {
            window.indexedDBHelper.getDataByKey('readingPositions', 'positions', encodedBookName)
                .then(result => {
                    if (result && result.position) {
                        const savedPosition = result.position;
                        readerCurrentChapterIndex = savedPosition.chapterIndex;
                        // 更新章节显示
                        highlightChapter(readerCurrentChapterIndex);
                        content.textContent = readerChapters[readerCurrentChapterIndex].content;
            content.scrollTop = savedPosition.scrollTop || 0;
                        updateWordCount(currentChapterIndex);
                        
                        // 滚动到对应的章节目录位置
                        const chapterItems = chapterList.querySelectorAll('div');
                        if (chapterItems[currentChapterIndex]) {
                            chapterList.scrollTop = chapterItems[currentChapterIndex].offsetTop - 200;
                        }
                    }
                })
                .catch(error => {
                    // 如果读取失败，继续延迟执行
                    setTimeout(readReadingPosition, 100);
                });
        }
        
        // 尝试立即读取，如果失败则延迟执行
        readReadingPosition();
    }
    
    readerChapters.forEach((chapter, index) => {
                const chapterDiv = document.createElement('div');
                chapterDiv.textContent = chapter.title;
                chapterDiv.classList.add('chapter-item');
                if (index === readerCurrentChapterIndex) {
                    chapterDiv.classList.add('active');
                }
                chapterDiv.addEventListener('click', () => {
                    readerCurrentChapterIndex = index;
                    updateChapter(index);
                });
        chapterList.appendChild(chapterDiv);
    });
}

// 渲染内容
function renderContent(chapters) {
    readerChapters = chapters;
    if (chapters.length > 0) {
        content.textContent = chapters[0].content;
        highlightChapter(0);
        updateWordCount(0);
    }
    
    // 添加滚动事件监听，使用全局函数保存阅读位置
    content.addEventListener('scroll', debounce(() => {
        const chapterIndex = Array.from(chapterList.querySelectorAll('div')).findIndex(item => item.classList.contains('active'));
        if (chapterIndex !== -1) {
            saveReadingPosition(chapterIndex, content.scrollTop);
        }
        // 新增：检测是否滚动到内容底部（允许10px误差）
        const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10;
        const chapterButtons = document.getElementById('chapterButtons');
        if (chapterButtons) {
            chapterButtons.style.display = isAtBottom ? 'flex' : 'none';
        }
        }, 300)); // 300ms防抖
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// 高亮章节
function highlightChapter(index) {
    const chapterItems = chapterList.querySelectorAll('div.chapter-item');
    chapterItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 通用章节更新函数
function updateChapter(index) {
    highlightChapter(index);
    content.textContent = readerChapters[index].content;
    updateWordCount(index);
    content.scrollTop = 0;
    saveReadingPosition(index, 0);
}


// 初始化阅读器功能
function initReaderFunctions() {
    chapterList = document.getElementById('chapterList');
    content = document.getElementById('content');
    
    // 初始化readingPositions数据库
    const stores = [
        { name: 'positions', keyPath: 'bookName' }
    ];
    
    // 初始化数据库
    window.indexedDBHelper.initDB('readingPositions', 1, stores)
        .then(db => {
            readerSettingsDB = db;
        })
        .catch(error => {
            console.error('初始化阅读位置数据库失败:', error);
        });
    
    // 创建阅读进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    // 设置进度条样式
    progressBar.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 5px;
      background-color: #007bff;
      height: 0%;
      transition: height 0.1s ease;
      z-index: 100;
    `;
    // 设置父容器为相对定位
    content.parentNode.style.position = 'relative';
    // 将进度条添加到父容器
    content.parentNode.appendChild(progressBar);
    
    // 添加滚动监听事件
    content.addEventListener('scroll', () => {
      const scrollTop = content.scrollTop;
      const scrollHeight = content.scrollHeight - content.clientHeight;
      if (scrollHeight === 0) return; // 避免除以零
      const percentage = (scrollTop / scrollHeight) * 100;
      progressBar.style.height = `${percentage}%`;
    });
    
    // 添加目录切换按钮事件监听
    const toggleBtn = document.getElementById('toggleChapters');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const chapterList = document.getElementById('chapterList');
            if (chapterList) {
                const isHidden = chapterList.style.display === 'none';
            chapterList.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '▥' : '▤';//'▥隐藏目录' : '▤显示目录'
            
            // 显示目录时滚动到当前章节
            if (isHidden) {
                const activeChapter = chapterList.querySelector('.active');
                if (activeChapter) {
                    activeChapter.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            }
        });
    }
    
    // 添加上一章/下一章按钮事件监听
    document.getElementById('prevChapter').addEventListener('click', () => {
        if (readerCurrentChapterIndex > 0) {
            readerCurrentChapterIndex--;
            updateChapter(readerCurrentChapterIndex);
        }
    });
    
    document.getElementById('nextChapter').addEventListener('click', () => {
    if (readerCurrentChapterIndex < readerChapters.length - 1) {
        readerCurrentChapterIndex++;
        updateChapter(readerCurrentChapterIndex);
    }
});

// 添加Alt+R快捷键监听
 document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'r') {
        e.preventDefault();
        window.location.href = 'welcome.html';
    }
});

    // 新增：底部章节切换按钮事件监听
    const prevChapterBottom = document.getElementById('prevChapterBottom');
    const nextChapterBottom = document.getElementById('nextChapterBottom');
    if (prevChapterBottom && nextChapterBottom) {
        prevChapterBottom.addEventListener('click', () => {
            if (readerCurrentChapterIndex > 0) {
                readerCurrentChapterIndex--;
                updateChapter(readerCurrentChapterIndex);
            }
        });
        nextChapterBottom.addEventListener('click', () => {
            if (readerCurrentChapterIndex < readerChapters.length - 1) {
                readerCurrentChapterIndex++;
                updateChapter(readerCurrentChapterIndex);
            }
        });
    }
}

// 从 IndexedDB 渲染书籍内容
function renderBookContentFromDB(bookData) {   
    // 如果bookData是字符串（原始文件内容），则解析章节
    // 如果bookData是对象（已修改的书籍数据），则直接使用其内容
    if (typeof bookData === 'string') {
        chapters = parseChapters(bookData);
    } else if (typeof bookData === 'object' && bookData.content) {
        // 从indexdb加载的已修改内容
        // 检查bookData.content是否为数组
        if (Array.isArray(bookData.content)) {
            chapters = bookData.content.map(chapter => ({
                title: chapter.title,
                content: chapter.content
            }));
        } else if (typeof bookData.content === 'string') {
            // 如果content是字符串，直接解析章节
            chapters = parseChapters(bookData.content);
        } else {
            console.error('书籍内容格式不正确:', typeof bookData.content);
            return;
        }
    } else {
        console.error('无效的书籍数据格式');
        return;
    }
            
    renderChapters(chapters);            
    renderContent(chapters);                        
    
    // 初始化编辑功能
    if (typeof window.editHandler !== 'undefined' && typeof window.editHandler.initEditFunctionality === 'function') {
        window.editHandler.initEditFunctionality(chapters, currentChapterIndex);
    }
    
    // 从 IndexedDB 读取阅读位置            
    if (readerSettingsDB) {
        window.indexedDBHelper.getDataByKey('readingPositions', 'positions', encodeURIComponent(bookName))
                .then(result => {
                    if (result && result.position) {
                        const savedPosition = result.position;
                        const { chapterIndex, scrollTop } = savedPosition;
                        readerCurrentChapterIndex = chapterIndex;
                        highlightChapter(chapterIndex);
                        content.textContent = readerChapters[chapterIndex].content;
            content.scrollTop = scrollTop;
                    // 滚动到对应的章节目录位置
                    const chapterItems = chapterList.querySelectorAll('div.chapter-item');
                    if (chapterItems[chapterIndex]) {
                        chapterList.scrollTop = chapterItems[chapterIndex].offsetTop - 200;
                    }
                }
            })
            .catch(error => {
                console.error('读取阅读位置失败:', error);
            });
    }           
}

// 导出函数和变量供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveReadingPosition,
        parseChapters,
        renderChapters,
        renderContent,
        highlightChapter,
        updateChapter,
        initReaderFunctions,
        renderBookContentFromDB
    };
}

// 为浏览器环境添加全局访问
if (typeof window !== 'undefined') {
    window.readerFunctions = {
        saveReadingPosition,
        parseChapters,
        renderChapters,
        renderContent,
        highlightChapter,
        updateChapter,
        initReaderFunctions,
        renderBookContentFromDB

    };
}