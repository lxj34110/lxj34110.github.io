// 简化版的IndexedDB操作
function initDB() {
    return new Promise((resolve, reject) => {
        // 指定版本号，确保能触发onupgradeneeded事件
        const request = indexedDB.open('bookDB', 6);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            const currentVersion = event.oldVersion;
            const newVersion = event.newVersion;
            
            log(`数据库版本升级: ${currentVersion || 0} -> ${newVersion}`);
            
            // 创建存储书籍内容的对象存储
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'name' });
                log('创建books对象存储成功');
            }
            
            // 创建存储光标位置的对象存储
            if (!db.objectStoreNames.contains('cursorPositions')) {
                db.createObjectStore('cursorPositions', { keyPath: 'fileName' });
                log('创建cursorPositions对象存储成功');
            }
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            log('数据库初始化成功，版本: ' + db.version);
            resolve(db);
        };
        
        request.onerror = function(event) {
            log('数据库初始化失败: ' + event.target.error, true);
            reject(new Error('数据库初始化失败: ' + event.target.error));
        };
        
        // 处理版本变更失败的情况
        request.blocked = function() {
            log('数据库被阻止，可能有其他连接未关闭', true);
        };
    });
}

function saveData(db, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        const request = store.put(data);
        
        request.onsuccess = function() {
            resolve();
        };
        
        request.onerror = function(event) {
            reject(new Error('保存数据失败: ' + event.target.error));
        };
    });
}

// 保存光标位置
function saveCursorPosition(db, fileName, position) {
    return new Promise((resolve, reject) => {
        try {
            // 检查对象存储是否存在
            if (!db.objectStoreNames.contains('cursorPositions')) {
                log('cursorPositions对象存储不存在，尝试重新初始化数据库', true);
                // 重新初始化数据库，确保对象存储被创建
                initDB().then(() => {
                    log('数据库重新初始化后，尝试保存光标位置');
                    // 再次尝试保存
                    const transaction = db.transaction(['cursorPositions'], 'readwrite');
                    const store = transaction.objectStore('cursorPositions');
                    const request = store.put({
                        fileName: encodeURIComponent(fileName),
                        position: position,
                        timestamp: Date.now()
                    });
                    
                    request.onsuccess = function() {
                        log('光标位置保存成功');
                        resolve();
                    };
                    
                    request.onerror = function(event) {
                        log('保存光标位置失败: ' + event.target.error, true);
                        resolve(); // 即使失败也继续执行，不阻塞主流程
                    };
                }).catch(err => {
                    log('重新初始化数据库失败: ' + err.message, true);
                    resolve(); // 即使失败也继续执行，不阻塞主流程
                });
                return;
            }
            
            const transaction = db.transaction(['cursorPositions'], 'readwrite');
            const store = transaction.objectStore('cursorPositions');
            const request = store.put({
                fileName: encodeURIComponent(fileName),
                position: position,
                timestamp: Date.now()
            });
            
            request.onsuccess = function() {
                log('光标位置保存成功');
                resolve();
            };
            
            request.onerror = function(event) {
                log('保存光标位置失败: ' + event.target.error, true);
                resolve(); // 即使失败也继续执行，不阻塞主流程
            };
        } catch (error) {
            log('保存光标位置时发生异常: ' + error.message, true);
            resolve(); // 发生异常时继续执行，不阻塞主流程
        }
    });
}

// 加载光标位置
function loadCursorPosition(db, fileName) {
    return new Promise((resolve, reject) => {
        try {
            // 检查对象存储是否存在
            if (!db.objectStoreNames.contains('cursorPositions')) {
                log('cursorPositions对象存储不存在，返回默认位置', true);
                resolve(0);
                return;
            }
            
            const transaction = db.transaction(['cursorPositions'], 'readonly');
            const store = transaction.objectStore('cursorPositions');
            const request = store.get(encodeURIComponent(fileName));
            
            request.onsuccess = function() {
                if (request.result && request.result.position !== undefined) {
                    resolve(request.result.position);
                } else {
                    resolve(0); // 默认位置
                }
            };
            
            request.onerror = function(event) {
                log('加载光标位置失败: ' + event.target.error, true);
                resolve(0); // 失败时返回默认位置
            };
        } catch (error) {
            log('加载光标位置时发生异常: ' + error.message, true);
            resolve(0); // 发生异常时返回默认位置
        }
    });
}

function loadData(db, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['books'], 'readonly');
        const store = transaction.objectStore('books');
        const request = store.get(key);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            reject(new Error('加载数据失败: ' + event.target.error));
        };
    });
}

// 从URL参数获取文件名
function getFileNameFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('fileName');
    if (fileName) {
        const decodedFileName = decodeURIComponent(fileName);
        document.getElementById('fileName').value = decodedFileName;
        return decodedFileName;
    }
    return null;
}

// 加载内容
function loadContent(fileName) {
    if (!fileName || !db) return;
    
    const encodedFileName = encodeURIComponent(fileName);
    loadData(db, encodedFileName).then(result => {
        if (result && result.content !== undefined) {
            // 检查内容是否为对象数组格式（从阅读模式转换过来的情况）
            if (Array.isArray(result.content) && result.content.length > 0 && result.content[0].content) {
                // 如果是对象数组，将每个章节内容拼接为文本
                document.getElementById('content').value = result.content.map(chapter => chapter.content).join('\n\n');
                log('从阅读模式加载内容成功，已转换格式: ' + fileName);
            } else if (typeof result.content === 'string') {
                // 如果是字符串，直接显示
                document.getElementById('content').value = result.content;
                log('从URL加载数据成功: ' + fileName);
            } else {
                // 如果是其他类型，尝试转换为字符串
                document.getElementById('content').value = String(result.content);
                log('内容格式不规范，已转换为字符串: ' + fileName);
            }
            
            // 加载完成后恢复光标位置
            restoreCursorPosition(fileName);
        } else {
            // 如果文件不存在，则创建新文件
            document.getElementById('content').value = '';
            log('文件不存在，创建新文件: ' + fileName);
            // 保存空文件到数据库
            return saveData(db, { name: encodedFileName, content: '' })
                .then(() => {
                    log('新文件保存成功: ' + fileName);
                });
        }
    }).catch(error => {
        log('从URL加载数据失败: ' + error.message, true);
        // 即使加载失败，也要确保内容区域为空
        document.getElementById('content').value = '';
    });
}

// 恢复光标位置
function restoreCursorPosition(fileName) {
    if (!db || !fileName) return;
    
    loadCursorPosition(db, fileName).then(position => {
        const contentArea = document.getElementById('content');
        contentArea.focus();
        
        // 设置光标位置，但不超过文本长度
        const textLength = contentArea.value.length;
        const finalPosition = Math.min(position, textLength);
        contentArea.setSelectionRange(finalPosition, finalPosition);
        
        // 滚动到光标位置
        scrollToCursorPosition(contentArea, finalPosition);
        
        log('光标位置已恢复到: ' + finalPosition);
    });
}

// 滚动到光标位置
function scrollToCursorPosition(textarea, position) {
    // 创建一个临时元素来计算滚动位置
    const temp = document.createElement('div');
    temp.style.cssText = 'position: absolute; top: -1000px; left: 0; white-space: pre-wrap; font-family: inherit; font-size: inherit; line-height: inherit;';
    temp.textContent = textarea.value.substring(0, position);
    document.body.appendChild(temp);
    
    const height = temp.offsetHeight;
    document.body.removeChild(temp);
    
    // 滚动到计算的位置
    textarea.scrollTop = Math.max(0, height - textarea.clientHeight / 2);
}

// 日志功能
// 日志容器变量
let logDiv;

function log(message, isError = false) {
    // 如果logDiv未定义，先检查DOM
    if (!logDiv) {
        logDiv = document.getElementById('log');
        // 如果仍然未找到，将消息输出到控制台
        if (!logDiv) {
            console.log(isError ? `[ERROR] ${message}` : message);
            return;
        }
    }
    
    const div = document.createElement('div');
    div.textContent = message;
    if (isError) div.className = 'error';
    logDiv.appendChild(div);
    logDiv.scrollTop = logDiv.scrollHeight;
}

let db;

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化logDiv引用
    logDiv = document.getElementById('log');
    // 先从URL获取文件名并设置到输入框
    const fileNameFromUrl = getFileNameFromUrl();
    
    // 初始化数据库
    initDB().then(database => {
        db = database;
        log('数据库初始化成功');
        
        // 如果从URL获取到了文件名，加载对应内容
        if (fileNameFromUrl) {
            loadContent(fileNameFromUrl);
        }
    }).catch(error => {
        log('数据库初始化失败: ' + error.message, true);
    });
    
    // 为文本区域添加点击事件监听，记录点击位置
    const contentArea = document.getElementById('content');
    contentArea.addEventListener('click', function() {
        // 延迟记录，确保光标位置已更新
        setTimeout(() => {
            const fileName = document.getElementById('fileName').value;
            if (fileName && db) {
                const position = contentArea.selectionStart;
                saveCursorPosition(db, fileName, position);
            }
        }, 100);
    });
    
    // 为文本区域添加键盘事件监听，记录编辑位置
    contentArea.addEventListener('keyup', function() {
        const fileName = document.getElementById('fileName').value;
        if (fileName && db) {
            const position = contentArea.selectionStart;
            // 每300毫秒最多保存一次，避免频繁写入
            const now = Date.now();
            if (!contentArea.lastSaveTime || now - contentArea.lastSaveTime > 300) {
                contentArea.lastSaveTime = now;
                saveCursorPosition(db, fileName, position);
            }
        }
    });
    
    // 清空日志
    document.getElementById('clearLog').addEventListener('click', function() {
        logDiv.innerHTML = '';
    });
    
    // 保存数据
    document.getElementById('saveBtn').addEventListener('click', function() {
        const saveButton = this;
        
        if (!db) {
            log('数据库未初始化', true);
            // 显示保存失败提示
            showSaveNotification('保存失败：数据库未初始化', false);
            return;
        }
        
        const content = document.getElementById('content').value;
        const fileName = document.getElementById('fileName').value;
        
        if (!fileName) {
            log('请输入文件名', true);
            // 显示保存失败提示
            showSaveNotification('保存失败：请输入文件名', false);
            return;
        }
        
        // 禁用保存按钮，防止重复点击
        saveButton.disabled = true;
        
        // 创建保存中提示元素
        const savingIndicator = document.createElement('span');
        savingIndicator.textContent = '保存中...';
        savingIndicator.style.cssText = 'position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background-color: rgba(255, 255, 255, 0.9); padding: 4px 8px; border-radius: 4px; font-size: 12px;';
        
        // 为了能显示绝对定位的提示，给按钮设置相对定位
        const originalPosition = saveButton.style.position;
        saveButton.style.position = 'relative';
        
        // 添加保存中提示
        saveButton.appendChild(savingIndicator);
        
        const data = {
            name: encodeURIComponent(fileName),
            content: content
        };
        
        // 先保存内容
        saveData(db, data).then(() => {
            log('数据保存成功: ' + fileName);
            
            // 保存当前光标位置
            const position = contentArea.selectionStart;
            return saveCursorPosition(db, fileName, position);
        }).then(() => {
            // 同时保存元数据到bookMetadataDB，以便在书架中显示
            return new Promise((resolve, reject) => {
                const metadataDBRequest = indexedDB.open('bookMetadataDB', 1);
                metadataDBRequest.onsuccess = function(metadataEvent) {
                    const metadataDB = metadataEvent.target.result;
                    const metadataTransaction = metadataDB.transaction(['bookMetadata'], 'readwrite');
                    const metadataStore = metadataTransaction.objectStore('bookMetadata');
                    const now = new Date();
                    metadataStore.put({ name: fileName, lastModified: now.getTime(), size: content.length, type: 'text/plain' });
                    metadataTransaction.oncomplete = function() {
                        log('元数据保存成功: ' + fileName);
                        resolve();
                    };
                    metadataTransaction.onerror = function(event) {
                        log('元数据保存失败: ' + event.target.error, true);
                        resolve(); // 元数据保存失败不影响主保存流程
                    };
                };
                metadataDBRequest.onerror = function(event) {
                    log('元数据数据库打开失败: ' + event.target.error, true);
                    resolve(); // 元数据数据库打开失败不影响主保存流程
                };
            });
        }).then(() => {
            // 保存成功
            showSaveNotification('保存成功: ' + fileName, true);
        }).catch(error => {
            log('保存失败: ' + error.message, true);
            // 保存失败
            showSaveNotification('保存失败: ' + error.message, false);
        }).finally(() => {
            // 恢复保存按钮状态
            // setTimeout(() => {
                saveButton.disabled = false;
                // 移除保存中提示
                if (saveButton.contains(savingIndicator)) {
                    saveButton.removeChild(savingIndicator);
                }
                // 恢复按钮的原始定位
                saveButton.style.position = originalPosition;
            // }, 500);
        });
    });
    
    // 加载数据
    document.getElementById('loadBtn').addEventListener('click', function() {
        if (!db) {
            log('数据库未初始化', true);
            return;
        }
        
        const fileName = document.getElementById('fileName').value;
        
        loadData(db, encodeURIComponent(fileName)).then(result => {
            if (result && result.content) {
                document.getElementById('content').value = result.content;
                log('数据加载成功: ' + fileName);
            } else {
                log('未找到数据: ' + fileName);
            }
        }).catch(error => {
            log('加载失败: ' + error.message, true);
        });
    });
    
    // 检查数据库
    document.getElementById('checkDB').addEventListener('click', function() {
        if (!db) {
            log('数据库未初始化', true);
            return;
        }
        
        const transaction = db.transaction(['books'], 'readonly');
        const store = transaction.objectStore('books');
        const request = store.getAll();
        
        request.onsuccess = function() {
            const results = request.result;
            log('数据库中的文件数量: ' + results.length);
            results.forEach(item => {
                log('- ' + decodeURIComponent(item.name));
            });
        };
        
        request.onerror = function(event) {
            log('检查数据库失败: ' + event.target.error, true);
        };
    });
    
    // 下载文件
    document.getElementById('downBtn').addEventListener('click', function() {
        const content = document.getElementById('content').value;
        const fileName = document.getElementById('fileName').value;
        
        if (!fileName) {
            log('请输入文件名', true);
            return;
        }
        
        // 确保文件扩展名是.txt
        const finalFileName = fileName.endsWith('.txt') ? fileName : fileName + '.txt';
        
        // 创建Blob对象
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        log('文件下载成功: ' + finalFileName);
    });
    
    // 日志区域折叠/展开功能
    const toggleLogButton = document.querySelector('.toggle-log');
    const logContent = document.getElementById('logContent');
    
    toggleLogButton.addEventListener('click', function() {
        logContent.classList.toggle('expanded');
        this.textContent = logContent.classList.contains('expanded') ? '▲' : '▼';
    });
});

// 显示保存通知
function showSaveNotification(message, isSuccess) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    // 设置成功或失败的样式
    if (isSuccess) {
        notification.style.backgroundColor = '#10b981'; // 绿色
        notification.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> ' + message;
    } else {
        notification.style.backgroundColor = '#ef4444'; // 红色
        notification.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ' + message;
    }
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        }, 300);
    }, 3000);
}