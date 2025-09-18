// IndexedDB 公用操作方法

/**
 * IndexedDB Helper - 提供IndexedDB数据库操作的工具类
 */
class IndexedDBHelper {
    constructor() {
        // 存储数据库连接的Map
        this.databases = new Map();
    }

    /**
     * 初始化IndexedDB数据库
     * @param {string} dbName - 数据库名称
     * @param {number} version - 数据库版本
     * @param {Array} stores - 存储定义数组
     * @returns {Promise<IDBDatabase>} - 返回数据库连接Promise
     */
    async initDB(dbName, version, stores) {
        return new Promise((resolve, reject) => {
            console.log('初始化数据库:', dbName, version);
            const request = indexedDB.open(dbName, version || 1); // 如果未指定版本，默认为1

            request.onupgradeneeded = (event) => {
                console.log('数据库升级 needed');
                const db = event.target.result;
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store.name)) {
                        console.log('创建对象存储:', store.name);
                        const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
                        if (store.indexes) {
                            store.indexes.forEach(index => {
                                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                            });
                        }
                    }
                });
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                console.log('数据库初始化成功:', dbName);
                this.databases.set(dbName, db);
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB初始化错误:', event.target.error);
                reject(new Error('IndexedDB初始化错误: ' + event.target.error.message));
            };
        });
    }

    /**
     * 获取数据库连接
     * @param {string} dbName - 数据库名称
     * @returns {IDBDatabase|null} - 返回数据库连接或null
     */
    getDB(dbName) {
        return this.databases.get(dbName) || null;
    }

    /**
     * 添加数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 存储名称
     * @param {*} data - 要添加的数据
     * @returns {Promise<any>} - 返回操作结果Promise
     */
    async addData(dbName, storeName, data) {
        const db = this.getDB(dbName);
        if (!db) {
            throw new Error('数据库未初始化: ' + dbName);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('添加数据错误:', event.target.error);
                reject(new Error('添加数据错误: ' + event.target.error.message));
            };
        });
    }

    /**
     * 获取所有数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 存储名称
     * @returns {Promise<Array>} - 返回数据数组Promise
     */
    async getAllData(dbName, storeName) {
        const db = this.getDB(dbName);
        if (!db) {
            throw new Error('数据库未初始化: ' + dbName);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('获取数据错误:', event.target.error);
                reject(new Error('获取数据错误: ' + event.target.error.message));
            };
        });
    }

    /**
     * 根据key获取数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 存储名称
     * @param {*} key - 数据键
     * @returns {Promise<any>} - 返回数据Promise
     */
    async getDataByKey(dbName, storeName, key) {
        const db = this.getDB(dbName);
        if (!db) {
            throw new Error('数据库未初始化: ' + dbName);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('获取数据错误:', event.target.error);
                reject(new Error('获取数据错误: ' + event.target.error.message));
            };
        });
    }

    /**
     * 更新数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 存储名称
     * @param {*} data - 要更新的数据
     * @returns {Promise<any>} - 返回操作结果Promise
     */
    async updateData(dbName, storeName, data) {
        const db = this.getDB(dbName);
        if (!db) {
            throw new Error('数据库未初始化: ' + dbName);
        }
        
        console.log('更新数据到存储:', storeName, data);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                console.log('数据更新成功:', storeName);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('更新数据错误:', event.target.error);
                reject(new Error('更新数据错误: ' + event.target.error.message));
            };
        });
    }

    /**
     * 删除数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 存储名称
     * @param {*} key - 数据键
     * @returns {Promise<void>} - 返回操作结果Promise
     */
    async deleteData(dbName, storeName, key) {
        const db = this.getDB(dbName);
        if (!db) {
            throw new Error('数据库未初始化: ' + dbName);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error('删除数据错误:', event.target.error);
                reject(new Error('删除数据错误: ' + event.target.error.message));
            };
        });
    }
}

// 创建单例实例
const indexedDBHelperInstance = new IndexedDBHelper();

// 暴露全局对象，兼容旧的API调用方式
window.indexedDBHelper = {
    initDB: indexedDBHelperInstance.initDB.bind(indexedDBHelperInstance),
    addData: indexedDBHelperInstance.addData.bind(indexedDBHelperInstance),
    getAllData: indexedDBHelperInstance.getAllData.bind(indexedDBHelperInstance),
    getDataByKey: indexedDBHelperInstance.getDataByKey.bind(indexedDBHelperInstance),
    updateData: indexedDBHelperInstance.updateData.bind(indexedDBHelperInstance),
    deleteData: indexedDBHelperInstance.deleteData.bind(indexedDBHelperInstance),
    // 新增方法
    getDB: indexedDBHelperInstance.getDB.bind(indexedDBHelperInstance)
};

/**
 * 创建兼容旧API的方法
 * 旧API使用方式：window.indexedDBHelper.method(storeName, ...args)
 * 新API使用方式：window.indexedDBHelper.method(dbName, storeName, ...args)
 */
function createLegacyAPI() {
    // 存储最后一次初始化的数据库名称
    let lastDBName = null;
    
    // 保存原始的方法
    const originalMethods = {
        initDB: window.indexedDBHelper.initDB,
        addData: window.indexedDBHelper.addData,
        getAllData: window.indexedDBHelper.getAllData,
        getDataByKey: window.indexedDBHelper.getDataByKey,
        updateData: window.indexedDBHelper.updateData,
        deleteData: window.indexedDBHelper.deleteData
    };
    
    // 重写initDB方法以跟踪最后一次初始化的数据库
    window.indexedDBHelper.initDB = async function(dbName, version, stores) {
        const result = await originalMethods.initDB(dbName, version, stores);
        lastDBName = dbName;
        return result;
    };
    
    // 实现兼容旧API的方法，但不覆盖新API的方法
    // 创建新的方法名来提供兼容层
    window.indexedDBHelper.addDataLegacy = async function(storeName, data) {
        if (!lastDBName) {
            throw new Error('数据库未初始化');
        }
        return originalMethods.addData(lastDBName, storeName, data);
    };
    
    window.indexedDBHelper.getAllDataLegacy = async function(storeName) {
        if (!lastDBName) {
            throw new Error('数据库未初始化');
        }
        return originalMethods.getAllData(lastDBName, storeName);
    };
    
    window.indexedDBHelper.getDataByKeyLegacy = async function(storeName, key) {
        if (!lastDBName) {
            throw new Error('数据库未初始化');
        }
        return originalMethods.getDataByKey(lastDBName, storeName, key);
    };
    
    window.indexedDBHelper.updateDataLegacy = async function(storeName, data) {
        if (!lastDBName) {
            throw new Error('数据库未初始化');
        }
        return originalMethods.updateData(lastDBName, storeName, data);
    };
    
    window.indexedDBHelper.deleteDataLegacy = async function(storeName, key) {
        if (!lastDBName) {
            throw new Error('数据库未初始化');
        }
        return originalMethods.deleteData(lastDBName, storeName, key);
    };
    
    // 为了完全兼容，创建一个新的全局对象来模拟原来的行为
    window.indexedDBHelperLegacy = {
        initDB: window.indexedDBHelper.initDB,
        addData: window.indexedDBHelper.addDataLegacy,
        getAllData: window.indexedDBHelper.getAllDataLegacy,
        getDataByKey: window.indexedDBHelper.getDataByKeyLegacy,
        updateData: window.indexedDBHelper.updateDataLegacy,
        deleteData: window.indexedDBHelper.deleteDataLegacy
    };
}

// 初始化兼容层
createLegacyAPI();