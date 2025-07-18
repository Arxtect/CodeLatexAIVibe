export class SettingsManager {
    constructor() {
        this.settings = {
            shortcuts: {
                'newFile': 'Ctrl+N',
                'openFile': 'Ctrl+O',
                'saveFile': 'Ctrl+S',
                'closeTab': 'Ctrl+W',
                'compile': 'F5',
                'rename': 'F2',
                'delete': 'Delete',
                'find': 'Ctrl+F',
                'replace': 'Ctrl+H',
                'toggleSidebar': 'Ctrl+B',
                'commandPalette': 'Ctrl+Shift+P',
                'toggleVersionSidebar': 'Ctrl+Shift+V',
                'createSnapshot': 'Ctrl+Shift+S',
                'toggleAgentPanel': 'Ctrl+Shift+A'
                // undo/redo 由编辑器直接处理，避免冲突
            },
            plugins: {
                enabled: [],
                disabled: [],
                config: {}
            },
            editor: {
                fontSize: 14,
                theme: 'latex-dark',
                wordWrap: 'on',
                minimap: true,
                lineNumbers: true,
                autoSave: false,
                autoSaveDelay: 2000
            },
            ui: {
                sidebarWidth: 250,
                showStatusBar: true,
                showToolbar: true,
                compactMode: false,
                showLineNumbers: true,
                showMinimap: true
            },
            performance: {
                // 文件大小阈值 (字节)
                warningFileSize: 500 * 1024,      // 500KB - 性能优化警告
                maxFileSize: 2 * 1024 * 1024,     // 2MB - 最大文件大小
                contextFileLimit: 1024 * 1024,    // 1MB - 上下文文件限制
                
                // 内容显示阈值 (字符)
                previewLength: 2000,              // 预览长度
                chunkSize: 5000,                  // 分段加载大小
                maxContextLength: 8000,           // API上下文最大长度
                maxItemLength: 2000,              // 单个项目最大长度
                
                // 分段加载设置
                enableChunkedLoading: true,       // 启用分段加载
                autoLoadChunks: false,            // 自动加载下一段
                maxChunksPerFile: 10,             // 每个文件最大段数
                
                // 编辑器性能优化
                disableMinimapForLargeFiles: true,
                disableFoldingForLargeFiles: true,
                disableWordWrapForLargeFiles: true
            }
        };
        
        this.loadSettings();
        this.setupEventListeners();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('latex-ide-settings');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                this.settings = this.mergeSettings(this.settings, savedSettings);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('latex-ide-settings', JSON.stringify(this.settings));
            this.notifySettingsChanged();
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    mergeSettings(defaults, saved) {
        const merged = { ...defaults };
        for (const key in saved) {
            if (typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
                merged[key] = { ...defaults[key], ...saved[key] };
            } else {
                merged[key] = saved[key];
            }
        }
        return merged;
    }

    get(category, key) {
        if (key) {
            return this.settings[category]?.[key];
        }
        return this.settings[category];
    }

    set(category, key, value) {
        if (!this.settings[category]) {
            this.settings[category] = {};
        }
        
        if (typeof key === 'object') {
            // 批量设置
            Object.assign(this.settings[category], key);
        } else {
            this.settings[category][key] = value;
        }
        
        this.saveSettings();
    }

    // 快捷键管理
    getShortcut(action) {
        return this.settings.shortcuts[action];
    }

    setShortcut(action, shortcut) {
        // 检查快捷键冲突
        const existing = this.findShortcutConflict(shortcut, action);
        if (existing) {
            throw new Error(`快捷键 "${shortcut}" 已被 "${existing}" 使用`);
        }
        
        this.settings.shortcuts[action] = shortcut;
        this.saveSettings();
    }

    findShortcutConflict(shortcut, excludeAction) {
        for (const [action, existingShortcut] of Object.entries(this.settings.shortcuts)) {
            if (action !== excludeAction && existingShortcut === shortcut) {
                return action;
            }
        }
        return null;
    }

    resetShortcuts() {
        this.settings.shortcuts = {
            'newFile': 'Ctrl+N',
            'openFile': 'Ctrl+O',
            'saveFile': 'Ctrl+S',
            'closeTab': 'Ctrl+W',
            'compile': 'F5',
            'rename': 'F2',
            'delete': 'Delete',
            'find': 'Ctrl+F',
            'replace': 'Ctrl+H',
            'toggleSidebar': 'Ctrl+B',
            'commandPalette': 'Ctrl+Shift+P',
            'toggleVersionSidebar': 'Ctrl+Shift+V',
            'createSnapshot': 'Ctrl+Shift+S'
            // undo/redo 由编辑器直接处理，避免冲突
        };
        this.saveSettings();
    }

    // 插件管理
    enablePlugin(pluginId) {
        const enabled = this.settings.plugins.enabled;
        const disabled = this.settings.plugins.disabled;
        
        if (!enabled.includes(pluginId)) {
            enabled.push(pluginId);
        }
        
        const disabledIndex = disabled.indexOf(pluginId);
        if (disabledIndex > -1) {
            disabled.splice(disabledIndex, 1);
        }
        
        this.saveSettings();
    }

    disablePlugin(pluginId) {
        const enabled = this.settings.plugins.enabled;
        const disabled = this.settings.plugins.disabled;
        
        const enabledIndex = enabled.indexOf(pluginId);
        if (enabledIndex > -1) {
            enabled.splice(enabledIndex, 1);
        }
        
        if (!disabled.includes(pluginId)) {
            disabled.push(pluginId);
        }
        
        this.saveSettings();
    }

    isPluginEnabled(pluginId) {
        return this.settings.plugins.enabled.includes(pluginId) && 
               !this.settings.plugins.disabled.includes(pluginId);
    }

    getPluginConfig(pluginId) {
        return this.settings.plugins.config[pluginId] || {};
    }

    setPluginConfig(pluginId, config) {
        this.settings.plugins.config[pluginId] = config;
        this.saveSettings();
    }

    // 事件系统
    setupEventListeners() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifySettingsChanged() {
        if (this.listeners.has('settingsChanged')) {
            this.listeners.get('settingsChanged').forEach(callback => {
                try {
                    callback(this.settings);
                } catch (error) {
                    console.error('设置变更通知失败:', error);
                }
            });
        }
    }

    // 导入/导出设置
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    importSettings(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = this.mergeSettings(this.settings, imported);
            this.saveSettings();
            return true;
        } catch (error) {
            console.error('导入设置失败:', error);
            return false;
        }
    }

    resetSettings() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }

    getDefaultSettings() {
        return {
            shortcuts: {
                'newFile': 'Ctrl+N',
                'openFile': 'Ctrl+O',
                'saveFile': 'Ctrl+S',
                'closeTab': 'Ctrl+W',
                'compile': 'F5',
                'rename': 'F2',
                'delete': 'Delete',
                'find': 'Ctrl+F',
                'replace': 'Ctrl+H',
                'toggleSidebar': 'Ctrl+B',
                'commandPalette': 'Ctrl+Shift+P',
                'toggleVersionSidebar': 'Ctrl+Shift+V',
                'createSnapshot': 'Ctrl+Shift+S',
                'toggleAgentPanel': 'Ctrl+Shift+A'
            },
            plugins: {
                enabled: [],
                disabled: [],
                config: {}
            },
            editor: {
                fontSize: 14,
                theme: 'latex-dark',
                wordWrap: 'on',
                minimap: true,
                lineNumbers: true,
                autoSave: false,
                autoSaveDelay: 2000
            },
            ui: {
                sidebarWidth: 250,
                showStatusBar: true,
                showToolbar: true,
                compactMode: false,
                showLineNumbers: true,
                showMinimap: true
            },
            performance: {
                // 文件大小阈值 (字节)
                warningFileSize: 500 * 1024,      // 500KB - 性能优化警告
                maxFileSize: 2 * 1024 * 1024,     // 2MB - 最大文件大小
                contextFileLimit: 1024 * 1024,    // 1MB - 上下文文件限制
                
                // 内容显示阈值 (字符)
                previewLength: 2000,              // 预览长度
                chunkSize: 5000,                  // 分段加载大小
                maxContextLength: 8000,           // API上下文最大长度
                maxItemLength: 2000,              // 单个项目最大长度
                
                // 分段加载设置
                enableChunkedLoading: true,       // 启用分段加载
                autoLoadChunks: false,            // 自动加载下一段
                maxChunksPerFile: 10,             // 每个文件最大段数
                
                // 编辑器性能优化
                disableMinimapForLargeFiles: true,
                disableFoldingForLargeFiles: true,
                disableWordWrapForLargeFiles: true
            }
        };
    }
} 