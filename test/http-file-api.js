/**
 * HTTPFileAPI - 提供基于HTTP的文件中转API接口
 * 允许通过HTTP请求调用FileTransferAPI的功能
 */
class HTTPFileAPI {
    constructor() {
        // 等待FileTransferAPI初始化
        this.apiReady = false;
        this.initPromise = null;
    }

    /**
     * 初始化HTTP API和底层FileTransferAPI
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                // 确保FileTransferAPI已加载
                if (!window.fileTransferAPI) {
                    throw new Error('FileTransferAPI未加载，请确保先引入file-transfer-api.js');
                }

                // 初始化FileTransferAPI
                await window.fileTransferAPI.init();
                this.apiReady = true;
                console.log('HTTPFileAPI初始化成功');
                resolve();
            } catch (error) {
                console.error('HTTPFileAPI初始化失败:', error);
                reject(error);
            }
        });

        return this.initPromise;
    }

    /**
     * 检查API是否就绪
     * @private
     */
    async _checkReady() {
        if (!this.apiReady) {
            await this.init();
        }
    }

    /**
     * 处理HTTP请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} - 返回处理结果
     */
    async handleRequest(endpoint, data = {}) {
        try {
            await this._checkReady();

            switch (endpoint) {
                case 'upload':
                    return await this._handleUpload(data);
                case 'list':
                    return await this._handleList(data);
                case 'info':
                    return await this._handleInfo(data);
                case 'download':
                    return await this._handleDownload(data);
                case 'delete':
                    return await this._handleDelete(data);
                case 'clear':
                    return await this._handleClear();
                default:
                    throw new Error(`未知的API端点: ${endpoint}`);
            }
        } catch (error) {
            console.error('HTTP请求处理失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 处理文件上传请求
     * @param {Object} data - 上传请求数据
     * @returns {Promise<Object>}
     * @private
     */
    async _handleUpload(data) {
        // 在实际HTTP请求中，文件通常通过FormData上传
        // 这里为了模拟，我们假设data中包含文件信息
        if (!data.file || !(data.file instanceof File || data.file instanceof Blob)) {
            throw new Error('请提供有效的File或Blob对象');
        }

        // 处理上传进度
        const options = {};
        if (data.onProgress && typeof data.onProgress === 'function') {
            options.onProgress = data.onProgress;
        }

        // 调用FileTransferAPI上传文件
        const fileInfo = await window.fileTransferAPI.uploadFile(data.file, options);

        return {
            success: true,
            data: fileInfo
        };
    }

    /**
     * 处理获取文件列表请求
     * @param {Object} data - 查询选项
     * @returns {Promise<Object>}
     * @private
     */
    async _handleList(data) {
        const options = {};
        if (data.status) {
            options.status = data.status;
        }

        const fileList = await window.fileTransferAPI.getFileList(options);

        return {
            success: true,
            data: fileList,
            total: fileList.length
        };
    }

    /**
     * 处理获取文件信息请求
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>}
     * @private
     */
    async _handleInfo(data) {
        if (!data.fileId) {
            throw new Error('请提供文件ID');
        }

        const fileInfo = await window.fileTransferAPI.getFileInfo(data.fileId);

        if (!fileInfo) {
            return {
                success: false,
                error: '文件不存在'
            };
        }

        return {
            success: true,
            data: fileInfo
        };
    }

    /**
     * 处理文件下载请求
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>}
     * @private
     */
    async _handleDownload(data) {
        if (!data.fileId) {
            throw new Error('请提供文件ID');
        }

        const fileContent = await window.fileTransferAPI.getFileContent(data.fileId);
        const fileInfo = await window.fileTransferAPI.getFileInfo(data.fileId);

        // 在实际HTTP请求中，这里会返回文件内容
        // 在这个实现中，我们返回文件URL，以便前端可以下载
        const fileUrl = URL.createObjectURL(fileContent);

        return {
            success: true,
            data: {
                fileUrl,
                fileName: fileInfo.fileName,
                fileType: fileInfo.fileType,
                fileSize: fileInfo.fileSize
            }
        };
    }

    /**
     * 处理文件删除请求
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>}
     * @private
     */
    async _handleDelete(data) {
        if (!data.fileId) {
            throw new Error('请提供文件ID');
        }

        await window.fileTransferAPI.deleteFile(data.fileId);

        return {
            success: true,
            message: '文件删除成功'
        };
    }

    /**
     * 处理清空所有文件请求
     * @returns {Promise<Object>}
     * @private
     */
    async _handleClear() {
        await window.fileTransferAPI.clearAllFiles();

        return {
            success: true,
            message: '所有文件已清除'
        };
    }

    /**
     * 发送HTTP请求（模拟）
     * 这个方法模拟通过HTTP发送请求到API
     * @param {string} url - 请求URL
     * @param {string} method - 请求方法
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} - 返回响应结果
     */
    async sendRequest(url, method = 'POST', data = {}) {
        try {
            // 解析URL获取端点
            const urlParts = url.split('?')[0].split('/');
            const endpoint = urlParts[urlParts.length - 1];

            // 模拟HTTP请求延迟
            await new Promise(resolve => setTimeout(resolve, 100));

            // 处理请求
            return await this.handleRequest(endpoint, data);
        } catch (error) {
            console.error('HTTP请求失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 提供基于Fetch API的HTTP客户端
     * @returns {Object} - 返回HTTP客户端对象
     */
    getHttpClient() {
        const api = this;

        return {
            // 上传文件
            upload: async (file, options = {}) => {
                return await api.sendRequest('/api/file/upload', 'POST', { file, ...options });
            },

            // 获取文件列表
            list: async (params = {}) => {
                return await api.sendRequest('/api/file/list', 'GET', params);
            },

            // 获取文件信息
            info: async (fileId) => {
                return await api.sendRequest('/api/file/info', 'GET', { fileId });
            },

            // 下载文件
            download: async (fileId) => {
                return await api.sendRequest('/api/file/download', 'GET', { fileId });
            },

            // 删除文件
            delete: async (fileId) => {
                return await api.sendRequest('/api/file/delete', 'DELETE', { fileId });
            },

            // 清空所有文件
            clear: async () => {
                return await api.sendRequest('/api/file/clear', 'DELETE');
            }
        };
    }
}

// 创建单例实例
const httpFileAPIInstance = new HTTPFileAPI();

// 暴露全局对象
window.httpFileAPI = httpFileAPIInstance;

// 提供便捷的HTTP客户端
window.fileTransferClient = httpFileAPIInstance.getHttpClient();

// 导出API（支持模块化导入）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        httpFileAPI: httpFileAPIInstance,
        fileTransferClient: httpFileAPIInstance.getHttpClient()
    };
}