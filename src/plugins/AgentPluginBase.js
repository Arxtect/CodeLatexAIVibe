/**
 * Agent 插件基类
 * 继承标准插件接口，但添加 Agent 特有的功能
 */
export class AgentPluginBase {
    constructor() {
        this.id = '';
        this.name = '';
        this.description = '';
        this.version = '1.0.0';
        this.type = 'agent'; // 特殊类型标识
        this.enabled = true;
        
        // Agent 特有属性
        this.capabilities = [];
        this.config = {};
        this.isExecuting = false;
        this.executionHistory = [];
        
        // 插件管理器引用
        this.pluginManager = null;
        this.ide = null;
    }
    
    /**
     * 插件初始化（标准插件接口）
     */
    init(pluginManager) {
        this.pluginManager = pluginManager;
        this.ide = window.ide;
        
        // 加载配置
        this.loadConfiguration();
        
        // Agent 特有初始化
        this.onInit();
        
        console.log(`Agent 插件 ${this.name} 初始化完成`);
    }
    
    /**
     * Agent 特有初始化方法（子类重写）
     */
    onInit() {
        // 子类重写此方法
    }
    
    /**
     * 启用插件
     */
    enable() {
        this.enabled = true;
        this.onEnable();
        console.log(`Agent ${this.name} 已启用`);
    }
    
    /**
     * 禁用插件
     */
    disable() {
        this.enabled = false;
        this.onDisable();
        console.log(`Agent ${this.name} 已禁用`);
    }
    
    /**
     * 销毁插件
     */
    destroy() {
        this.onDestroy();
        console.log(`Agent ${this.name} 已销毁`);
    }
    
    /**
     * Agent 启用时的回调（子类重写）
     */
    onEnable() {
        // 子类重写此方法
    }
    
    /**
     * Agent 禁用时的回调（子类重写）
     */
    onDisable() {
        // 子类重写此方法
    }
    
    /**
     * Agent 销毁时的回调（子类重写）
     */
    onDestroy() {
        // 子类重写此方法
    }
    
    /**
     * 处理用户消息（Agent 核心方法）
     */
    async processMessage(message, context) {
        throw new Error('子类必须实现 processMessage 方法');
    }
    
    /**
     * 获取 Agent 配置界面
     */
    getConfigUI() {
        return null; // 子类可以重写返回配置界面
    }
    
    /**
     * 验证配置
     */
    validateConfig(config) {
        return true; // 子类可以重写进行配置验证
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        const savedConfig = this.getConfig();
        this.config = { ...this.config, ...savedConfig };
    }
    
    /**
     * 获取配置
     */
    getConfig(key = null) {
        const allConfig = this.pluginManager.getPluginConfig(this.id);
        return key ? allConfig[key] : allConfig;
    }
    
    /**
     * 设置配置
     */
    setConfig(key, value = null) {
        let configToSave;
        
        if (typeof key === 'object' && value === null) {
            // 保存整个配置对象
            configToSave = key;
        } else {
            // 保存单个配置项
            const currentConfig = this.getConfig();
            configToSave = { ...currentConfig, [key]: value };
        }
        
        this.pluginManager.setPluginConfig(this.id, configToSave);
        this.config = { ...this.config, ...configToSave };
    }
    
    /**
     * 创建响应对象
     */
    createResponse(content, actions = []) {
        return {
            content: content,
            actions: actions,
            timestamp: new Date().toISOString(),
            agentId: this.id
        };
    }
    
    /**
     * 创建动作对象
     */
    createAction(type, data) {
        return {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            agentId: this.id
        };
    }
    
    /**
     * 创建文件创建动作
     */
    createCreateAction(filePath, content) {
        return this.createAction('create', {
            filePath: filePath,
            content: content
        });
    }
    
    /**
     * 创建文件编辑动作
     */
    createEditAction(filePath, edits) {
        return this.createAction('edit', {
            filePath: filePath,
            edits: edits
        });
    }
    
    /**
     * 创建文件删除动作
     */
    createDeleteAction(filePath) {
        return this.createAction('delete', {
            filePath: filePath
        });
    }
    
    /**
     * 创建 UI 动作
     */
    createUIAction(action, params) {
        return this.createAction('ui', {
            action: action,
            params: params
        });
    }
    
    /**
     * 记录执行历史
     */
    addToHistory(description, type, target) {
        this.executionHistory.push({
            timestamp: new Date().toISOString(),
            description: description,
            type: type,
            target: target
        });
        
        // 保持历史记录在合理范围内
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(-50);
        }
    }
    
    /**
     * 获取最近的执行历史
     */
    getRecentHistory(count = 10) {
        return this.executionHistory.slice(-count);
    }
    
    /**
     * 错误处理
     */
    handleError(error, context = '') {
        console.error(`Agent ${this.name} 错误 [${context}]:`, error);
        
        // 可以添加错误报告机制
        this.addToHistory(`错误: ${error.message}`, 'error', context);
    }
    
    /**
     * 日志记录
     */
    log(level, message, data = null) {
        const logMessage = `[${this.name}] ${message}`;
        
        switch (level) {
            case 'info':
                console.log(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'error':
                console.error(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
    
    /**
     * 获取编辑器上下文
     */
    getEditorContext() {
        if (!this.ide || !this.ide.editor) {
            return null;
        }
        
        const editor = this.ide.editor;
        const currentFile = this.ide.currentFile;
        
        if (!currentFile) {
            return null;
        }
        
        return {
            filePath: currentFile,
            content: editor.getValue(),
            position: editor.getPosition(),
            selection: editor.getSelection(),
            language: editor.getModel().getLanguageId()
        };
    }
    
    /**
     * 获取项目上下文
     */
    getProjectContext() {
        if (!this.ide) {
            return null;
        }
        
        return {
            openFiles: this.ide.openTabs ? Array.from(this.ide.openTabs.keys()) : [],
            currentFile: this.ide.currentFile,
            fileSystem: this.ide.fileSystem
        };
    }
    
    /**
     * 发送插件消息
     */
    sendMessage(targetPluginId, message) {
        if (this.pluginManager) {
            this.pluginManager.sendMessage(this.id, targetPluginId, message);
        }
    }
    
    /**
     * 广播消息
     */
    broadcastMessage(message) {
        if (this.pluginManager) {
            this.pluginManager.broadcastMessage(this.id, message);
        }
    }
    
    /**
     * 接收消息（插件通信）
     */
    onMessage(fromPluginId, message) {
        // 子类可以重写此方法处理插件间通信
        this.log('info', `收到来自 ${fromPluginId} 的消息:`, message);
    }
} 