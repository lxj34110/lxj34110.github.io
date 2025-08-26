// 编辑功能处理模块

let originalContent = '';
let chapters = [];
let currentChapterIndex = 0;

// 初始化编辑功能
function initEditFunctionality(chaptersData, currentIndex) {
    chapters = chaptersData;
    currentChapterIndex = currentIndex;
    
    const editButton = document.getElementById('editChapter');
    const saveButton = document.getElementById('saveChapterEdit');
    const cancelButton = document.getElementById('cancelChapterEdit');
    const recallButton = document.getElementById('recallEdit');
    const recoverButton = document.getElementById('recoverEdit');
    const editControls = document.getElementById('editControls');
    const editStatus = document.getElementById('editStatus');
    const contentDiv = document.getElementById('content');
    
    // 用于撤销/反撤销功能的历史记录
    let history = [];
    let historyIndex = -1;

    // 编辑按钮点击事件
    if (editButton) {
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
            editButton.textContent = '✍';
            editButton.disabled = true;
            
            // 初始化历史记录
            history = [originalContent];
            historyIndex = 0;
            
            // 初始化撤销/反撤销按钮状态
            if (recallButton) {
                recallButton.disabled = true;
            }
            if (recoverButton) {
                recoverButton.disabled = true;
            }
            
            // 实时更新字数统计和历史记录
            contentDiv.addEventListener('input', () => {
                // 更新章节内容
                chapters[currentChapterIndex].content = contentDiv.textContent;
                // 更新字数统计
                if (typeof updateWordCount !== 'undefined') {
                    updateWordCount(currentChapterIndex);
                }
                
                // 更新历史记录
                // 如果当前不是历史记录的最新状态，则截断历史记录
                if (historyIndex < history.length - 1) {
                    history = history.slice(0, historyIndex + 1);
                }
                // 添加新的历史记录
                history.push(contentDiv.textContent);
                historyIndex = history.length - 1;
                
                // 更新撤销/反撤销按钮状态
                if (recallButton) {
                    recallButton.disabled = historyIndex === 0;
                }
                if (recoverButton) {
                    recoverButton.disabled = historyIndex === history.length - 1;
                }
            });
        });
    }

    // 取消编辑按钮点击事件
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // 检查是否有保存到indexdb的操作
            const stores = [
                {
                    name: 'books',
                    keyPath: 'name'
                }
            ];
            
            window.indexedDBHelper.initDB('bookDB', 1, stores)
                .then(db => {
                    return window.indexedDBHelper.getDataByKey('books', encodeURIComponent(bookName));
                })
                .then(result => {
                    if (result && result.content) {
                        // 如果indexdb中有保存的内容，则重新加载该章节
                        if (Array.isArray(result.content)) {
                            contentDiv.textContent = result.content[currentChapterIndex].content;
                            // 更新全局章节内容
                            chapters[currentChapterIndex].content = result.content[currentChapterIndex].content;
                        } else if (typeof result.content === 'string') {
                            // 如果是字符串，需要重新解析章节
                            const parsedChapters = window.readerFunctions.parseChapters(result.content);
                            contentDiv.textContent = parsedChapters[currentChapterIndex].content;
                            // 更新全局章节内容
                            chapters[currentChapterIndex].content = parsedChapters[currentChapterIndex].content;
                        }
                    } else {
                        // 如果没有保存的内容，则恢复原始内容
                        contentDiv.textContent = originalContent;
                    }
                    
                    // 禁用编辑模式
                    contentDiv.contentEditable = 'false';
                    contentDiv.classList.remove('editing');
                    // 隐藏编辑控件和状态
                    editControls.style.display = 'none';
                    editStatus.style.display = 'none';
                    // 恢复按钮状态
                    editButton.textContent = '✎';
                    editButton.disabled = false;
                    
                    // 更新字数统计
                    if (typeof updateWordCount !== 'undefined') {
                        updateWordCount(currentChapterIndex);
                    }
                })
                .catch(error => {
                    console.error('从indexdb加载内容失败:', error);
                    // 出错时恢复原始内容
                    contentDiv.textContent = originalContent;
                    // 禁用编辑模式
                    contentDiv.contentEditable = 'false';
                    contentDiv.classList.remove('editing');
                    // 隐藏编辑控件和状态
                    editControls.style.display = 'none';
                    editStatus.style.display = 'none';
                    // 恢复按钮状态
                    editButton.textContent = '✎';
                    editButton.disabled = false;
                });
        });
    }

    // 撤销按钮点击事件
    if (recallButton) {
        recallButton.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                contentDiv.textContent = history[historyIndex];
                chapters[currentChapterIndex].content = history[historyIndex];
                
                // 更新字数统计
                if (typeof updateWordCount !== 'undefined') {
                    updateWordCount(currentChapterIndex);
                }
                
                // 更新撤销/反撤销按钮状态
                recallButton.disabled = historyIndex === 0;
                if (recoverButton) {
                    recoverButton.disabled = false;
                }
            }
        });
    }
    
    // 反撤销按钮点击事件
    if (recoverButton) {
        recoverButton.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                contentDiv.textContent = history[historyIndex];
                chapters[currentChapterIndex].content = history[historyIndex];
                
                // 更新字数统计
                if (typeof updateWordCount !== 'undefined') {
                    updateWordCount(currentChapterIndex);
                }
                
                // 更新撤销/反撤销按钮状态
                if (recallButton) {
                    recallButton.disabled = false;
                }
                recoverButton.disabled = historyIndex === history.length - 1;
            }
        });
    }
    
    // 保存编辑按钮点击事件
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            // 更新章节内容
            chapters[currentChapterIndex].content = contentDiv.textContent;
            // 更新字数统计
            if (typeof updateWordCount !== 'undefined') {
                updateWordCount(currentChapterIndex);
            }
            // 禁用编辑模式
            contentDiv.contentEditable = 'false';
            contentDiv.classList.remove('editing');
            // 隐藏编辑控件和状态
            editControls.style.display = 'none';
            editStatus.style.display = 'none';
            // 恢复按钮状态
            editButton.textContent = '✎';
            editButton.disabled = false;

            // 保存为TXT文件
            saveChapterAsTxt();
        });
    }
}

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
            message = `章节内容已保存至:\n${fileName}\n\n提示: 文件已保存到您选择的位置\n您可以通过文件管理器查找此文件`;
        } else {
            message = `下载已启动，请检查默认下载文件夹:\n${fileName}\n\n提示: 传统下载方式无法确认保存状态，请确保:\n1. 浏览器允许来自此网站的下载\n2. 手机存储空间充足\n3. 查看浏览器默认下载路径\n\n故障排除:\n• 检查浏览器的"下载历史"页面\n• 在文件管理器中搜索"${fileName}"\n• 确认浏览器弹出窗口阻止设置未阻止下载\n• 尝试使用Chrome浏览器获得更好兼容性`;
        }
        alert(message);
    } else {
        alert(`章节内容已保存至默认下载文件夹:${fileName}\n\n提示: 现代浏览器支持选择保存位置，请使用Chrome、Edge或Firefox最新版本以获得更好体验。`);
    }
}

// 更新字数统计
function updateWordCount(index) {
    const text = chapters[index].content.trim();
    const wordCount = text.replace(/\s+/g, '').length;
    const wordCountElement = document.getElementById('chapterWordCount');
    if (wordCountElement) {
        wordCountElement.textContent = `字数: ${wordCount}`;
    }
}

// 保存章节内容到IndexedDB
function saveChapterToIndexedDB() {
    if (!bookName || !chapters || chapters.length === 0) {
        console.error('无法保存章节内容: 缺少必要数据');
        return;
    }
    
    // 准备要保存的数据
    const bookData = {
        name: encodeURIComponent(bookName),
        content: chapters.map(chapter => ({
            title: chapter.title,
            content: chapter.content
        }))
    };
    
    // 使用indexedDBHelper保存数据
    const stores = [
        {
            name: 'books',
            keyPath: 'name'
        }
    ];
    
    window.indexedDBHelper.initDB('bookDB', 1, stores)
        .then(db => {
            return window.indexedDBHelper.updateData('books', bookData);
        })
        .then(() => {
            console.log('章节内容已保存到IndexedDB');
            alert('章节内容已保存到IndexedDB');
        })
        .catch(error => {
            console.error('保存到IndexedDB失败:', error);
            alert('保存到IndexedDB失败: ' + error.message);
        });
}


// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initEditFunctionality,
        saveChapterAsTxt,
        showSaveNotification,
        updateWordCount,
        saveChapterToIndexedDB,
        chapters,
        currentChapterIndex
    };
}

// 浏览器环境导出
if (typeof window !== 'undefined') {
    window.editHandler = {
        initEditFunctionality,
        saveChapterAsTxt,
        showSaveNotification,
        updateWordCount,
        saveChapterToIndexedDB,
        chapters,
        currentChapterIndex
    };
}