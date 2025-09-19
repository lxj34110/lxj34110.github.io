// 文件中转API - 用于缓存上传的数据

/**
 * FileTransferAPI - 提供基于IndexedDB的文件中转功能
 */
class FileTransferAPI {
    constructor() {
        // 数据库配置
        this.DB_NAME = 'FileTransferDB';
        this.DB_VERSION = 1;
        this.FILE_STORE_NAME = 'transferredFiles';
        this.CHUNK_STORE_NAME = 'fileChunks';
        
        // 分块大小 (5MB)
        this.CHUNK_SIZE = 5 * 1024 * 1024;
        
        // 等待IndexedDBHelper初始化
        this.initialized = false;
    }

    /**
     * 初始化文件中转API
     * @returns {Promise<void>} - 返回初始化完成Promise
     */
    async init() {
        if (this.initialized) {
            return;
        }

        try {
            // 确保IndexedDBHelper已加载
            if (!window.indexedDBHelper) {
                throw new Error('IndexedDBHelper未加载，请确保先引入indexeddb-helper.js');
            }

            // 初始化数据库
            await window.indexedDBHelper.initDB(this.DB_NAME, this.DB_VERSION, [
                {
                    name: this.FILE_STORE_NAME,
                    keyPath: 'id',
                    indexes: [
                        { name: 'fileName', keyPath: 'fileName', unique: false },
                        { name: 'uploadDate', keyPath: 'uploadDate', unique: false },
                        { name: 'status', keyPath: 'status', unique: false }
                    ]
                },
                {
                    name: this.CHUNK_STORE_NAME,
                    keyPath: ['fileId', 'chunkIndex'],
                    indexes: [
                        { name: 'fileId', keyPath: 'fileId', unique: false }
                    ]
                }
            ]);

            this.initialized = true;
            console.log('FileTransferAPI初始化成功');
        } catch (error) {
            console.error('FileTransferAPI初始化失败:', error);
            throw error;
        }
    }

    /**
     * 检查是否已初始化
     * @private
     */
    _checkInitialized() {
        if (!this.initialized) {
            throw new Error('FileTransferAPI尚未初始化，请先调用init()方法');
        }
    }

    /**
     * 上传文件并缓存到IndexedDB
     * @param {File|Blob} file - 要上传的文件
     * @param {Object} options - 上传选项
     * @param {Function} options.onProgress - 上传进度回调
     * @returns {Promise<Object>} - 返回文件信息
     */
    async uploadFile(file, options = {}) {
        this._checkInitialized();
        
        try {
            // 生成文件ID
            const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const totalSize = file.size;
            const totalChunks = Math.ceil(totalSize / this.CHUNK_SIZE);
            
            // 创建文件记录
            const fileInfo = {
                id: fileId,
                fileName: file.name,
                fileType: file.type,
                fileSize: totalSize,
                uploadDate: new Date().toISOString(),
                status: 'uploading',
                totalChunks,
                uploadedChunks: 0
            };
            
            // 保存文件信息
            await window.indexedDBHelper.addData(this.DB_NAME, this.FILE_STORE_NAME, fileInfo);
            
            // 分块上传文件
            for (let i = 0; i < totalChunks; i++) {
                const start = i * this.CHUNK_SIZE;
                const end = Math.min(start + this.CHUNK_SIZE, totalSize);
                const chunk = file.slice(start, end);
                
                // 读取文件块并保存
                const arrayBuffer = await this._readFileChunk(chunk);
                
                // 保存文件块
                await window.indexedDBHelper.addData(this.DB_NAME, this.CHUNK_STORE_NAME, {
                    fileId,
                    chunkIndex: i,
                    chunkData: arrayBuffer,
                    chunkSize: chunk.size
                });
                
                // 更新上传进度
                fileInfo.uploadedChunks = i + 1;
                await window.indexedDBHelper.updateData(this.DB_NAME, this.FILE_STORE_NAME, fileInfo);
                
                // 调用进度回调
                if (options.onProgress) {
                    const progress = Math.round((i + 1) / totalChunks * 100);
                    options.onProgress({
                        fileId,
                        fileName: file.name,
                        progress,
                        uploadedBytes: start + chunk.size,
                        totalBytes: totalSize
                    });
                }
            }
            
            // 标记上传完成
            fileInfo.status = 'completed';
            await window.indexedDBHelper.updateData(this.DB_NAME, this.FILE_STORE_NAME, fileInfo);
            
            console.log('文件上传完成:', file.name);
            return fileInfo;
        } catch (error) {
            console.error('文件上传失败:', error);
            
            // 标记上传失败
            if (fileId) {
                try {
                    const fileInfo = await window.indexedDBHelper.getDataByKey(
                        this.DB_NAME, 
                        this.FILE_STORE_NAME, 
                        fileId
                    );
                    if (fileInfo) {
                        fileInfo.status = 'failed';
                        await window.indexedDBHelper.updateData(this.DB_NAME, this.FILE_STORE_NAME, fileInfo);
                    }
                } catch (e) {
                    console.error('更新文件状态失败:', e);
                }
            }
            
            throw error;
        }
    }

    /**
     * 读取文件块为ArrayBuffer
     * @param {Blob} chunk - 文件块
     * @returns {Promise<ArrayBuffer>} - 返回文件块的ArrayBuffer
     * @private
     */
    _readFileChunk(chunk) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (event) => reject(new Error('读取文件块失败'));
            reader.readAsArrayBuffer(chunk);
        });
    }

    /**
     * 获取文件列表
     * @param {Object} options - 查询选项
     * @param {string} options.status - 按状态筛选 (all, uploading, completed, failed)
     * @returns {Promise<Array>} - 返回文件列表
     */
    async getFileList(options = {}) {
        this._checkInitialized();
        
        try {
            let files = await window.indexedDBHelper.getAllData(this.DB_NAME, this.FILE_STORE_NAME);
            
            // 按状态筛选
            if (options.status && options.status !== 'all') {
                files = files.filter(file => file.status === options.status);
            }
            
            // 按上传日期排序（最新的在前）
            files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            
            return files;
        } catch (error) {
            console.error('获取文件列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件信息
     * @param {string} fileId - 文件ID
     * @returns {Promise<Object|null>} - 返回文件信息或null
     */
    async getFileInfo(fileId) {
        this._checkInitialized();
        
        try {
            return await window.indexedDBHelper.getDataByKey(
                this.DB_NAME, 
                this.FILE_STORE_NAME, 
                fileId
            );
        } catch (error) {
            console.error('获取文件信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件内容
     * @param {string} fileId - 文件ID
     * @returns {Promise<Blob>} - 返回文件Blob对象
     */
    async getFileContent(fileId) {
        this._checkInitialized();
        
        try {
            // 获取文件信息
            const fileInfo = await this.getFileInfo(fileId);
            if (!fileInfo || fileInfo.status !== 'completed') {
                throw new Error('文件不存在或未上传完成');
            }
            
            // 获取所有文件块
            const db = window.indexedDBHelper.getDB(this.DB_NAME);
            if (!db) {
                throw new Error('数据库连接失败');
            }
            
            // 使用索引获取特定文件的所有块
            const chunks = [];
            const transaction = db.transaction([this.CHUNK_STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.CHUNK_STORE_NAME);
            const index = store.index('fileId');
            
            // 使用游标遍历所有块
            await new Promise((resolve, reject) => {
                const request = index.openCursor(fileId);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        chunks.push({
                            index: cursor.value.chunkIndex,
                            data: cursor.value.chunkData
                        });
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = (event) => {
                    reject(new Error('获取文件块失败: ' + event.target.error));
                };
            });
            
            // 按块索引排序
            chunks.sort((a, b) => a.index - b.index);
            
            // 合并文件块
            const blob = new Blob(chunks.map(chunk => chunk.data), { type: fileInfo.fileType });
            return blob;
        } catch (error) {
            console.error('获取文件内容失败:', error);
            throw error;
        }
    }

    /**
     * 删除文件
     * @param {string} fileId - 文件ID
     * @returns {Promise<void>} - 返回操作结果Promise
     */
    async deleteFile(fileId) {
        this._checkInitialized();
        
        try {
            // 开始事务
            const db = window.indexedDBHelper.getDB(this.DB_NAME);
            if (!db) {
                throw new Error('数据库连接失败');
            }
            
            const transaction = db.transaction([this.FILE_STORE_NAME, this.CHUNK_STORE_NAME], 'readwrite');
            const fileStore = transaction.objectStore(this.FILE_STORE_NAME);
            const chunkStore = transaction.objectStore(this.CHUNK_STORE_NAME);
            const chunkIndex = chunkStore.index('fileId');
            
            // 删除文件记录
            await new Promise((resolve, reject) => {
                const request = fileStore.delete(fileId);
                request.onsuccess = resolve;
                request.onerror = (event) => reject(new Error('删除文件记录失败: ' + event.target.error));
            });
            
            // 删除所有相关文件块
            await new Promise((resolve, reject) => {
                const request = chunkIndex.openCursor(fileId);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = (event) => {
                    reject(new Error('删除文件块失败: ' + event.target.error));
                };
            });
            
            console.log('文件删除成功:', fileId);
        } catch (error) {
            console.error('删除文件失败:', error);
            throw error;
        }
    }

    /**
     * 清除所有文件
     * @returns {Promise<void>} - 返回操作结果Promise
     */
    async clearAllFiles() {
        this._checkInitialized();
        
        try {
            const db = window.indexedDBHelper.getDB(this.DB_NAME);
            if (!db) {
                throw new Error('数据库连接失败');
            }
            
            const transaction = db.transaction([this.FILE_STORE_NAME, this.CHUNK_STORE_NAME], 'readwrite');
            
            // 清空文件存储
            await new Promise((resolve, reject) => {
                const request = transaction.objectStore(this.FILE_STORE_NAME).clear();
                request.onsuccess = resolve;
                request.onerror = (event) => reject(new Error('清空文件存储失败: ' + event.target.error));
            });
            
            // 清空文件块存储
            await new Promise((resolve, reject) => {
                const request = transaction.objectStore(this.CHUNK_STORE_NAME).clear();
                request.onsuccess = resolve;
                request.onerror = (event) => reject(new Error('清空文件块存储失败: ' + event.target.error));
            });
            
            console.log('所有文件已清除');
        } catch (error) {
            console.error('清除文件失败:', error);
            throw error;
        }
    }
}

// 创建单例实例
const fileTransferAPIInstance = new FileTransferAPI();

// 暴露全局对象
window.fileTransferAPI = fileTransferAPIInstance;

// 导出API（支持模块化导入）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = fileTransferAPIInstance;
}