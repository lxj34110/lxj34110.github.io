// IndexedDB 公用操作方法

var db;

// 初始化IndexedDB数据库
function initDB(dbName, version, stores) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            stores.forEach(store => {
                if (!db.objectStoreNames.contains(store.name)) {
                    const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
                    if (store.indexes) {
                        store.indexes.forEach(index => {
                            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                        });
                    }
                }
            });
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function(event) {
            console.error('IndexedDB初始化错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 添加数据
function addData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('添加数据错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 获取所有数据
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('获取数据错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 根据key获取数据
function getDataByKey(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('获取数据错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 更新数据
function updateData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('更新数据错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 删除数据
function deleteData(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = function() {
            resolve();
        };

        request.onerror = function(event) {
            console.error('删除数据错误:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 暴露全局函数
window.indexedDBHelper = {
    initDB,
    addData,
    getAllData,
    getDataByKey,
    updateData,
    deleteData
};