// 全局变量，用于存储设置数据库引用和DOM元素
let settingsDB;
let chapterList;
let content;
let currentChapterIndex = 0; // 当前章节索引
let chapters = []; // 存储章节数据
let bookName = '';
let encodedBookName = '';

// 通用章节更新函数
function updateChapter(index) {
    highlightChapter(index);
    content.textContent = chapters[index].content;
    updateWordCount(index);
    content.scrollTop = 0;
    saveReadingPosition(index, 0);
}

// 保存阅读位置到IndexedDB
function saveReadingPosition(chapterIndex, scrollTop) {
    if (settingsDB && bookName) {
        const transaction = settingsDB.transaction(['readingPositions'], 'readwrite');
        const store = transaction.objectStore('readingPositions');
        store.put({ 
            bookName: encodedBookName, 
            position: { 
                chapterIndex: chapterIndex, 
                scrollTop: scrollTop 
            } 
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    chapterList = document.getElementById('chapterList');
    content = document.getElementById('content');
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
    const lineHeightSelect = document.getElementById('lineHeight');
    const fontSizeSelect = document.getElementById('fontSize');
    const themeSelect = document.getElementById('theme');
    const settingsToggle = document.getElementById('settingsToggle');
    settingsToggle.addEventListener('click', () => {
        const settings = document.querySelector('.settings');
        settings.style.display = settings.style.display === 'none' ? 'flex' : 'none';
    });

    // 初始化IndexedDB数据库（用于用户设置存储）
    const settingsDBRequest = indexedDB.open('userSettingsDB', 1);
    settingsDBRequest.onupgradeneeded = function(event) {
        settingsDB = event.target.result;
        if (!settingsDB.objectStoreNames.contains('readingSettings')) {
            settingsDB.createObjectStore('readingSettings', { keyPath: 'id' });
        }
        if (!settingsDB.objectStoreNames.contains('readingPositions')) {
            settingsDB.createObjectStore('readingPositions', { keyPath: 'bookName' });
        }
    };
    // 初始化设置
    function initSettings() {
        const transaction = settingsDB.transaction(['readingSettings'], 'readonly');
        const store = transaction.objectStore('readingSettings');
        const getRequest = store.get('globalSettings');
        getRequest.onsuccess = function() {
            const savedSettings = getRequest.result?.settings || {};
            lineHeightSelect.value = savedSettings.lineHeight || '1.6';
            fontSizeSelect.value = savedSettings.fontSize || '1.125rem';
            themeSelect.value = savedSettings.theme || 'light';
            applySettings(savedSettings);
        };
    }
    settingsDBRequest.onsuccess = function(event) {
        settingsDB = event.target.result;
        initSettings();
    }
    settingsDBRequest.onerror = function(event) {
        console.error('用户设置数据库错误:', event.target.error);
    };


    // 设置变化事件监听
    lineHeightSelect.addEventListener('change', () => {
        const settings = {
            lineHeight: lineHeightSelect.value,
            fontSize: fontSizeSelect.value,
            theme: themeSelect.value
        };
        applySettings(settings);
        if (settingsDB) {
            const transaction = settingsDB.transaction(['readingSettings'], 'readwrite');
            const store = transaction.objectStore('readingSettings');
            store.put({ id: 'globalSettings', settings: settings });
        }
    });

    fontSizeSelect.addEventListener('change', () => {
        const settings = {
            lineHeight: lineHeightSelect.value,
            fontSize: fontSizeSelect.value,
            theme: themeSelect.value
        };
        applySettings(settings);
        if (settingsDB) {
            const transaction = settingsDB.transaction(['readingSettings'], 'readwrite');
            const store = transaction.objectStore('readingSettings');
            store.put({ id: 'globalSettings', settings: settings });
        }
    });

    themeSelect.addEventListener('change', () => {
        const settings = {
            lineHeight: lineHeightSelect.value,
            fontSize: fontSizeSelect.value,
            theme: themeSelect.value
        };
        applySettings(settings);
        if (settingsDB) {
            const transaction = settingsDB.transaction(['readingSettings'], 'readwrite');
            const store = transaction.objectStore('readingSettings');
            store.put({ id: 'globalSettings', settings: settings });
        }
    });

    // 应用设置函数
    function applySettings(settings) {
        content.style.lineHeight = settings.lineHeight;
        content.style.fontSize = settings.fontSize;
        document.body.className = settings.theme;
    }

    // 从 URL 参数获取图书名
    const urlParams = new URLSearchParams(window.location.search);
    bookName = decodeURIComponent(urlParams.get('bookName'));
    encodedBookName = encodeURIComponent(bookName);
    // 更新标题为书籍名称
    const h1Element = document.getElementById('txtTitle');//.querySelector('h1');
    if (h1Element) {
        h1Element.textContent = bookName.replace(".txt","") || 'txt在线阅读工具';
    }
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
        if (currentChapterIndex > 0) {
            currentChapterIndex--;
            updateChapter(currentChapterIndex);
        }
    });
    
    document.getElementById('nextChapter').addEventListener('click', () => {
    if (currentChapterIndex < chapters.length - 1) {
        currentChapterIndex++;
        updateChapter(currentChapterIndex);
    }
});

// 添加Alt+R快捷键监听
 document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'r') {
        e.preventDefault();
        window.location.href = 'welcome.html';
    }
});

    // 章节编辑功能
    let originalContent = '';
    const editButton = document.getElementById('editChapter');
    const saveButton = document.getElementById('saveChapterEdit');
    const cancelButton = document.getElementById('cancelChapterEdit');
    const editControls = document.getElementById('editControls');
    const editStatus = document.getElementById('editStatus');
    const contentDiv = document.getElementById('content');

    // 编辑按钮点击事件
    editButton.addEventListener('click', () => {
        // 保存原始内容用于取消编辑
        originalContent = contentDiv.textContent;
        // 启用编辑模式
        contentDiv.contentEditable = 'true';
        contentDiv.classList.add('editing');
        // 显示编辑控件和状态
        editControls.style.display = 'block';
        editStatus.style.display = 'block';
        // 聚焦到内容区域
        contentDiv.focus();
        // 更改按钮文本
        editButton.textContent = '✍';//'正在编辑...';
        editButton.disabled = true;
    });

    // 取消编辑按钮点击事件
    cancelButton.addEventListener('click', () => {
        // 恢复原始内容
        contentDiv.textContent = originalContent;
        // 禁用编辑模式
        contentDiv.contentEditable = 'false';
        contentDiv.classList.remove('editing');
        // 隐藏编辑控件和状态
        editControls.style.display = 'none';
        editStatus.style.display = 'none';
        // 恢复按钮状态
        editButton.textContent = '✎';//'编辑章节';
        editButton.disabled = false;
    });

    // 保存编辑按钮点击事件
    saveButton.addEventListener('click', () => {
        // 更新章节内容
        chapters[currentChapterIndex].content = contentDiv.textContent;
        // 更新字数统计
        updateWordCount(currentChapterIndex);
        // 禁用编辑模式
        contentDiv.contentEditable = 'false';
        contentDiv.classList.remove('editing');
        // 隐藏编辑控件和状态
        editControls.style.display = 'none';
        editStatus.style.display = 'none';
        // 恢复按钮状态
        editButton.textContent = '✎'//'编辑章节';
        editButton.disabled = false;

        // 保存为TXT文件
        saveChapterAsTxt();
    });

    // 将章节内容保存为TXT文件
    // 将章节内容保存为TXT文件
    async function saveChapterAsTxt() {
        const contentElement = document.getElementById('content');
        let content = contentElement.innerText;
        // 恢复HTML标签处理逻辑
        content = content.replace(/<br\s*\/?>/gi, '\n').replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
        content = content.replace(/<[^>]*>/g, '').trim();

        if (!content) {
            alert('无法保存空内容，请确保章节有文字内容后重试');
            return;
        }

        const chapterTitle = chapters[currentChapterIndex].title;
        const cleanTitle = chapterTitle.replace(/[\\/:*?"<>|]/g, '');
        const now = new Date();
        const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const fileName = `${cleanTitle}+${dateTime}.txt`;

        try {
            // 尝试使用文件系统API保存文件
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Text Files',
                        accept: {'text/plain': ['.txt']},
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                showSaveNotification(fileName, true);
            } else {
                // 传统下载方式
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                // 使用合成鼠标事件提高移动端兼容性
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                a.dispatchEvent(event);
                // 延长延迟至5秒，确保低速移动设备完成下载
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 5000);
                showSaveNotification(fileName, false);
            }
        } catch (error) {
            console.error('文件保存失败:', error);
            alert(`文件保存失败: ${error.message}\n\n请尝试以下解决方法:\n1. 检查浏览器存储权限\n2. 确保手机存储空间充足\n3. 手动创建/txt文件夹后重试\n4. 确认章节内容不为空`);
        }
    }

    function showSaveNotification(fileName, usedFileSystemAPI) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            let message;
            if (usedFileSystemAPI) {
                message = `章节内容已保存至:
${fileName}

提示: 文件已保存到您选择的位置
您可以通过文件管理器查找此文件`;
            } else {
                message = `下载已启动，请检查默认下载文件夹:
${fileName}

提示: 传统下载方式无法确认保存状态，请确保:
1. 浏览器允许来自此网站的下载
2. 手机存储空间充足
3. 查看浏览器默认下载路径

故障排除:
• 检查浏览器的"下载历史"页面
• 在文件管理器中搜索"${fileName}"
• 确认浏览器弹出窗口阻止设置未阻止下载
• 尝试使用Chrome浏览器获得更好兼容性`;
            }
            alert(message);
        } else {
            alert(`章节内容已保存至默认下载文件夹:${fileName}

提示: 现代浏览器支持选择保存位置，请使用Chrome、Edge或Firefox最新版本以获得更好体验。`);
        }
    }
    // 新增：底部章节切换按钮事件监听
    const prevChapterBottom = document.getElementById('prevChapterBottom');
    const nextChapterBottom = document.getElementById('nextChapterBottom');
    if (prevChapterBottom && nextChapterBottom) {
        prevChapterBottom.addEventListener('click', () => {
            if (currentChapterIndex > 0) {
                currentChapterIndex--;
                updateChapter(currentChapterIndex);
            }
        });
        nextChapterBottom.addEventListener('click', () => {
            if (currentChapterIndex < chapters.length - 1) {
                currentChapterIndex++;
                updateChapter(currentChapterIndex);
            }
        });
    }

    if (bookName) {
        // 从IndexedDB获取文件内容
        const dbRequest = indexedDB.open('bookDB', 1);
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const getRequest = store.get(encodeURIComponent(bookName));
            getRequest.onsuccess = function() {
                const fileContent = getRequest.result?.content;
                console.log('bookName:', bookName);
                console.log('fileContent:', fileContent ? '存在' : '不存在');
                if (fileContent) {
                    const chapters = parseChapters(fileContent);
                    renderChapters(chapters);
                    renderContent(chapters);
                    // 从 IndexedDB 读取阅读位置
                    if (settingsDB) {
                        const transaction = settingsDB.transaction(['readingPositions'], 'readonly');
                        const store = transaction.objectStore('readingPositions');
                        const getRequest = store.get(encodeURIComponent(bookName));
                        getRequest.onsuccess = function() {
                            const savedPosition = getRequest.result?.position;
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
                } else {
                    alert('书籍内容不存在，请重新添加！');
                    content.textContent = '书籍内容不存在，请返回书架重新添加！';
                }
            };
        };
        
        dbRequest.onerror = function(event) {
            console.error('获取文件内容失败:', event.target.error);
        };
        function renderBookContent(fileContent) {            
            const chapters = parseChapters(fileContent);            
            renderChapters(chapters);            
            renderContent(chapters);                        
            // 从 IndexedDB 读取阅读位置            
            if (settingsDB) {
                const transaction = settingsDB.transaction(['readingPositions'], 'readonly');
                const store = transaction.objectStore('readingPositions');
                const getRequest = store.get(encodeURIComponent(bookName));
                getRequest.onsuccess = function() {
                    const savedPosition = getRequest.result?.position;
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

    function renderChapters(chaptersData) {
        chapters = chaptersData; // 更新全局变量
        chapterList.innerHTML = '';
        
        // 从 IndexedDB 读取阅读位置
        if (settingsDB) {
            function readReadingPosition() {
                try {
                    const transaction = settingsDB.transaction(['readingPositions'], 'readonly');
                    const store = transaction.objectStore('readingPositions');
                    const getRequest = store.get(encodedBookName);
                    getRequest.onsuccess = function() {
                        const savedPosition = getRequest.result?.position;
                        if (savedPosition) {
                            currentChapterIndex = savedPosition.chapterIndex;
                            // 更新章节显示
                            highlightChapter(currentChapterIndex);
                            content.textContent = chapters[currentChapterIndex].content;
                            content.scrollTop = savedPosition.scrollTop || 0;
                            updateWordCount(currentChapterIndex);
                            
                            // 滚动到对应的章节目录位置
                            const chapterItems = chapterList.querySelectorAll('div');
                            if (chapterItems[currentChapterIndex]) {
                                chapterList.scrollTop = chapterItems[currentChapterIndex].offsetTop - 200;
                            }
                        }
                    };
                } catch (e) {
                    // 如果仍然在版本变更事务中，继续延迟执行
                    setTimeout(readReadingPosition, 100);
                }
            }
            
            // 尝试立即读取，如果失败则延迟执行
            readReadingPosition();
        }
        
        chapters.forEach((chapter, index) => {
            const chapterDiv = document.createElement('div');
            chapterDiv.textContent = chapter.title;
            chapterDiv.classList.add('chapter-item');
            if (index === currentChapterIndex) {
                chapterDiv.classList.add('active');
            }
            chapterDiv.addEventListener('click', () => {
                currentChapterIndex = index;
                updateChapter(index);
            });
            chapterList.appendChild(chapterDiv);
        });
    }

    function renderContent(chapters) {
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

function updateWordCount(index) {
    const text = chapters[index].content.trim();
    const wordCount = text.replace(/\s+/g, '').length;
    const wordCountElement = document.getElementById('chapterWordCount');
    if (wordCountElement) {
        wordCountElement.textContent = `字数: ${wordCount}`;
    }
}
