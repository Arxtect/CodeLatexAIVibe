import * as monaco from 'monaco-editor';

export class ExamplePlugin {
    constructor() {
        this.id = 'example-plugin';
        this.name = '示例插件';
        this.description = '提供字数统计、自动保存和保存历史记录功能';
        this.version = '1.0.0';
        this.type = 'utility';
        this.supportedLanguages = ['latex', 'markdown'];
        this.enabled = true;
        
        // 插件配置
        this.config = {
            enabled: true,
            autoSave: false,
            wordCount: true
        };
    }

    init(pluginManager) {
        this.pluginManager = pluginManager;
        
        // 注册钩子
        this.pluginManager.addHook('editor.init', this.onEditorInit.bind(this));
        this.pluginManager.addHook('editor.content.change', this.onContentChange.bind(this));
        this.pluginManager.addHook('file.save', this.onFileSave.bind(this));
        
        // 添加自定义 UI 元素
        this.addCustomUI();
        
        console.log('示例插件初始化完成');
    }

    // 编辑器初始化时的处理
    onEditorInit(editor) {
        console.log('编辑器已初始化，示例插件开始工作');
        
        // 添加自定义命令
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            this.showWordCount();
        });
        
        // 添加自定义动作
        editor.addAction({
            id: 'example-plugin.word-count',
            label: '显示字数统计',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
            run: () => {
                this.showWordCount();
            }
        });
    }

    // 内容变化时的处理
    onContentChange(event, editor) {
        if (this.config.wordCount) {
            this.updateWordCount(editor);
        }
        
        if (this.config.autoSave) {
            this.scheduleAutoSave();
        }
    }

    // 文件保存时的处理
    onFileSave(filePath, content) {
        console.log(`文件 ${filePath} 已保存，内容长度: ${content.length}`);
        
        // 可以在这里添加保存后的处理逻辑
        this.logSaveEvent(filePath, content);
    }

    // 添加自定义 UI 元素
    addCustomUI() {
        // 在状态栏添加字数统计
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            const wordCountElement = document.createElement('span');
            wordCountElement.id = 'word-count';
            wordCountElement.textContent = '字数: 0';
            statusBar.appendChild(wordCountElement);
        }

        // 插件菜单已集成到设置系统中
    }

    // 插件配置方法 - 由设置系统调用
    configure() {
        const settings = prompt(
            '示例插件设置 (JSON格式):\n' +
            '- enabled: 是否启用插件\n' +
            '- autoSave: 是否自动保存\n' +
            '- wordCount: 是否显示字数统计',
            JSON.stringify(this.config, null, 2)
        );
        
        if (settings) {
            try {
                const newConfig = JSON.parse(settings);
                this.config = { ...this.config, ...newConfig };
                this.pluginManager.setPluginConfig(this.id, this.config);
                alert('设置已保存');
                
                // 应用新配置
                this.applyConfig();
            } catch (error) {
                alert('设置格式错误: ' + error.message);
            }
        }
    }

    // 应用配置
    applyConfig() {
        // 根据配置更新插件行为
        if (!this.config.wordCount) {
            const wordCountElement = document.getElementById('word-count');
            if (wordCountElement) {
                wordCountElement.style.display = 'none';
            }
        } else {
            const wordCountElement = document.getElementById('word-count');
            if (wordCountElement) {
                wordCountElement.style.display = 'inline';
            }
        }
    }

    // 更新字数统计
    updateWordCount(editor) {
        const content = editor.getValue();
        const wordCount = this.countWords(content);
        const charCount = content.length;
        
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `字数: ${wordCount} | 字符: ${charCount}`;
        }
    }

    // 计算字数
    countWords(text) {
        // 移除 LaTeX 命令和注释
        const cleanText = text
            .replace(/\\[a-zA-Z@]+\*?(\{[^}]*\}|\[[^\]]*\])?/g, '') // 移除命令
            .replace(/%.*$/gm, '') // 移除注释
            .replace(/\$[^$]*\$/g, '') // 移除行内数学
            .replace(/\$\$[^$]*\$\$/g, '') // 移除显示数学
            .trim();
        
        if (!cleanText) return 0;
        
        // 中英文混合字数统计
        const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = cleanText
            .replace(/[\u4e00-\u9fa5]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 0).length;
        
        return chineseChars + englishWords;
    }

    // 显示字数统计对话框
    showWordCount() {
        const editor = this.pluginManager.editor;
        if (!editor) return;
        
        const content = editor.getValue();
        const wordCount = this.countWords(content);
        const charCount = content.length;
        const lineCount = content.split('\n').length;
        
        alert(`文档统计信息：\n字数: ${wordCount}\n字符数: ${charCount}\n行数: ${lineCount}`);
    }

    // 自动保存调度
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (window.ide && window.ide.currentFile) {
                window.ide.saveCurrentFile();
                console.log('自动保存完成');
            }
        }, 5000); // 5秒后自动保存
    }

    // 记录保存事件
    logSaveEvent(filePath, content) {
        const saveLog = {
            timestamp: new Date().toISOString(),
            filePath: filePath,
            contentLength: content.length,
            wordCount: this.countWords(content)
        };
        
        // 保存到本地存储
        const logs = JSON.parse(localStorage.getItem('save-logs') || '[]');
        logs.push(saveLog);
        
        // 只保留最近100条记录
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('save-logs', JSON.stringify(logs));
    }

    // 启用插件
    enable() {
        this.enabled = true;
        this.addCustomUI();
        console.log('示例插件已启用');
    }

    // 禁用插件
    disable() {
        this.enabled = false;
        
        // 移除 UI 元素
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.remove();
        }
        
        // 清理定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        console.log('示例插件已禁用');
    }

    // 获取保存日志
    getSaveLogs() {
        return JSON.parse(localStorage.getItem('save-logs') || '[]');
    }

    // 导出统计数据
    exportStats() {
        const logs = this.getSaveLogs();
        const stats = {
            totalSaves: logs.length,
            totalWords: logs.reduce((sum, log) => sum + log.wordCount, 0),
            averageWordsPerSave: logs.length > 0 ? 
                Math.round(logs.reduce((sum, log) => sum + log.wordCount, 0) / logs.length) : 0,
            firstSave: logs.length > 0 ? logs[0].timestamp : null,
            lastSave: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        };
        
        return stats;
    }

    // 插件消息处理
    onMessage(fromPluginId, message) {
        console.log(`收到来自插件 ${fromPluginId} 的消息:`, message);
        
        switch (message.type) {
            case 'get-word-count':
                const editor = this.pluginManager.editor;
                if (editor) {
                    const wordCount = this.countWords(editor.getValue());
                    this.pluginManager.sendMessage(this.id, fromPluginId, {
                        type: 'word-count-response',
                        wordCount: wordCount
                    });
                }
                break;
            
            case 'get-stats':
                const stats = this.exportStats();
                this.pluginManager.sendMessage(this.id, fromPluginId, {
                    type: 'stats-response',
                    stats: stats
                });
                break;
        }
    }

    // 插件清理
    destroy() {
        // 清理定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // 移除 UI 元素
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.remove();
        }
        
        console.log('示例插件已卸载');
    }

    // 获取插件信息
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            version: this.version,
            type: this.type,
            supportedLanguages: this.supportedLanguages,
            config: this.config,
            stats: this.exportStats()
        };
    }
} 