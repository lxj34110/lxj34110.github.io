// 设置处理模块

// 应用设置函数
function applySettings(settings) {
    const content = document.getElementById('content');
    if (content) {
        content.style.lineHeight = settings.lineHeight;
        content.style.fontSize = settings.fontSize;
    }
    document.body.className = settings.theme;
}

// 初始化设置
function initSettings(settingsDB, callback) {
    if (!settingsDB) return;
    
    window.indexedDBHelper.getDataByKey('readingSettings', 'globalSettings')
        .then(result => {
            const savedSettings = result ? result.settings : {};
            const settings = {
                lineHeight: savedSettings.lineHeight || '1.6',
                fontSize: savedSettings.fontSize || '1.125rem',
                theme: savedSettings.theme || 'light'
            };
            applySettings(settings);
            if (callback) callback(settings);
        })
        .catch(error => {
            console.error('初始化设置失败:', error);
            // 使用默认设置
            const settings = {
                lineHeight: '1.6',
                fontSize: '1.125rem',
                theme: 'light'
            };
            applySettings(settings);
            if (callback) callback(settings);
        });
}

// 设置变化事件监听
function setupSettingsEventListeners(settingsDB) {
    const lineHeightSelect = document.getElementById('lineHeight');
    const fontSizeSelect = document.getElementById('fontSize');
    const themeSelect = document.getElementById('theme');
    const settingsToggle = document.getElementById('settingsToggle');
    
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            const settings = document.querySelector('.settings');
            if (settings) {
                settings.style.display = settings.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }
    
    if (lineHeightSelect && fontSizeSelect && themeSelect) {
        const updateSettings = () => {
            const settings = {
                lineHeight: lineHeightSelect.value,
                fontSize: fontSizeSelect.value,
                theme: themeSelect.value
            };
            applySettings(settings);
            if (settingsDB) {
                const settingsData = { id: 'globalSettings', settings: settings };
                window.indexedDBHelper.updateData('readingSettings', settingsData)
                    .catch(error => {
                        console.error('保存设置失败:', error);
                    });
            }
        };
        
        lineHeightSelect.addEventListener('change', updateSettings);
        fontSizeSelect.addEventListener('change', updateSettings);
        themeSelect.addEventListener('change', updateSettings);
    }
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        applySettings,
        initSettings,
        setupSettingsEventListeners
    };
}

