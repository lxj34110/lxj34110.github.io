document.addEventListener('DOMContentLoaded', () => {
    const draftContent = document.getElementById('draftContent');
    const saveDraftBtn = document.getElementById('saveDraft');
    const saveAsDraftBtn = document.getElementById('saveAsDraft');
    const draftTitle = document.getElementById('draftTitle');
    
    // 从URL参数获取文件名
    const urlParams = new URLSearchParams(window.location.search);
    let fileName = urlParams.get('fileName');
    
    // 如果没有文件名参数，则生成默认文件名
    if (!fileName) {
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        fileName = `草稿_${timestamp}.txt`;
    }
    
    // 更新页面标题
    draftTitle.textContent = fileName.replace(".txt", "");
    
    // 从IndexedDB加载草稿内容
    if (fileName) {
        const stores = [
            {
                name: 'books',
                keyPath: 'name'
            }
        ];
        
        window.indexedDBHelper.initDB('bookDB', 6, stores)
            .then(db => {
                return window.indexedDBHelper.getDataByKey('bookDB', 'books', encodeURIComponent(fileName));
            })
            .then(result => {
                if (result && result.content) {
                    // 如果是数组格式（章节格式），则合并内容
                    if (Array.isArray(result.content)) {
                        draftContent.value = result.content.map(chapter => chapter.content).join('\n\n');
                    } else {
                        // 如果是字符串格式
                        draftContent.value = result.content;
                    }
                }
            })
            .catch(error => {
                console.error('加载草稿内容失败:', error);
                logErrorToServer('加载草稿内容失败', error);
                alert('加载草稿内容失败: ' + error.message);
            });
    }
    
    // 保存草稿按钮事件
    saveDraftBtn.addEventListener('click', () => {
        saveDraft(fileName, draftContent.value);
    });
    
    // 另存为按钮事件
    saveAsDraftBtn.addEventListener('click', () => {
        const newFileName = prompt('请输入文件名:', fileName);
        if (newFileName) {
            // 确保文件名以.txt结尾
            const finalFileName = newFileName.endsWith('.txt') ? newFileName : `${newFileName}.txt`;
            saveDraft(finalFileName, draftContent.value);
        }
    });
    
    // 保存草稿到IndexedDB
    function saveDraft(name, content) {
        console.log('开始保存草稿:', name);
        
        const stores = [
            {
                name: 'books',
                keyPath: 'name'
            }
        ];
        
        // 同时更新书架元数据
        const metadataStores = [
            {
                name: 'bookMetadata',
                keyPath: 'name'
                // 添加索引
                ,indexes: [
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            }
        ];
        
        Promise.all([
            window.indexedDBHelper.initDB('bookDB', 6, stores),
            window.indexedDBHelper.initDB('bookMetadataDB', 1, metadataStores)
        ])
        .then(([bookDB, metadataDB]) => {
            console.log('数据库初始化成功');
            
            // 保存内容到bookDB
            const bookData = {
                name: encodeURIComponent(name),
                content: content
            };
            
            // 保存元数据到bookMetadataDB
            const metadata = {
                name: name,
                lastModified: Date.now(),
                size: content.length,
                type: 'text/plain'
            };
            
            console.log('准备保存数据:', {bookData, metadata});
            
            return Promise.all([
                window.indexedDBHelper.updateData('bookDB', 'books', bookData),
                window.indexedDBHelper.updateData('bookMetadataDB', 'bookMetadata', metadata)
            ]);
        })
        .then(() => {
            console.log('草稿保存成功');
            alert('草稿保存成功！');
            // 更新页面标题
            draftTitle.textContent = name.replace(".txt", "");
            // 更新URL参数
            const url = new URL(window.location);
            url.searchParams.set('fileName', name);
            window.history.replaceState({}, '', url);
        })
        .catch(error => {
            console.error('保存草稿失败:', error);
            logErrorToServer('保存草稿失败', error);
            alert('保存草稿失败: ' + error.message);
        });
    }
    
    // 将错误日志发送到服务器
    function logErrorToServer(message, error) {
        fetch('/log-error', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                stack: error.stack || ''
            })
        }).catch(err => {
            console.error('无法将错误日志发送到服务器:', err);
        });
    }
});