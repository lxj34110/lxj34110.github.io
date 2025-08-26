// 引入IndexedDB公用操作方法
// 确保在auth.js之前引入indexeddb-helper.js

var db;

// 初始化IndexedDB数据库
function initDB() {
    const stores = [
        {
            name: 'users',
            keyPath: 'username',
            indexes: [
                { name: 'password', keyPath: 'password', unique: false }
            ]
        }
    ];
    
    window.indexedDBHelper.initDB('UserDB', 1, stores)
        .then(database => {
            db = database;
            checkAndCreateDefaultUsers();
        })
        .catch(error => {
            console.error('IndexedDB初始化错误:', error);
        });
}

// 检查并创建默认用户
function checkAndCreateDefaultUsers() {
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const request = store.count();

    request.onsuccess = function() {
        if (request.result === 0) {
            createDefaultUsers();
        }
    };
}

// 创建默认用户
function createDefaultUsers() {
    const users = ['admin', 'system', 'test', 'guest'];
    const today = new Date();
    const password = `${today.getMonth() + 1}`.padStart(2, '0') + `${today.getDate()}`.padStart(2, '0');
    
    users.forEach(username => {
        window.indexedDBHelper.addData('users', { username, password })
            .catch(error => {
                console.error('添加默认用户失败:', error);
            });
    });
}

// 验证用户登录
function validateLogin(username, password, callback) {
    // 直接验证用户名是否在允许列表中
    const allowedUsers = ['admin', 'system', 'test', 'guest'];
    if (allowedUsers.includes(username)) {
        const today = new Date();
        const expectedPassword = `${today.getMonth() + 1}`.padStart(2, '0') + `${today.getDate()}`.padStart(2, '0');
        callback(password === expectedPassword);
    } else {
        callback(false);
    }
}

// 检查用户是否已登录
function isLoggedIn() {
    return sessionStorage.getItem('username') !== null;
}

// 登出功能
function logout() {
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
}

// 初始化数据库
document.addEventListener('DOMContentLoaded', initDB);

// 暴露全局函数
window.auth = {
    validateLogin,
    isLoggedIn,
    logout
};

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errorMessage = document.getElementById('error-message');
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                errorMessage.textContent = '用户名和密码不能为空';
                return;
            }
            
            validateLogin(username, password, function(valid) {
                if (valid) {
                    sessionStorage.setItem('username', username);
                    window.location.href = 'book-shelf.html';
                } else {
                    errorMessage.textContent = '用户名或密码错误';
                    passwordInput.value = '';
                }
            });
        });
    }
});