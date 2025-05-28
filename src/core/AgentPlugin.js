/**
 * Agent Plugin 基础抽象类
 * 所有 Agent 插件都应该继承这个类并实现必要的方法
 */

export class AgentPlugin {
    constructor() {
        // 必须在子类中设置这些属性
        this.id = null;
        this.name = null;
        this.description = null;
        this.version = '1.0.0';
        this.author = null;
        this.capabilities = [];
        this.supportedLanguages = ['latex'];
        this.enabled = true;
        
        // Agent 配置
        this.config = {};
        
        // API 引用
        this.agentAPI = null;
        this.ide = null;
    }

    /**
     * 初始化 Agent
     * @param {AgentAPI} agentAPI - Agent API 实例
     */
    init(agentAPI) {
        this.agentAPI = agentAPI;
        this.ide = agentAPI.ide;
        
        // 加载配置
        this.loadConfig();
        
        // 子类可以重写这个方法进行自定义初始化
        this.onInit();
    }

    /**
     * 子类重写：自定义初始化逻辑
     */
    onInit() {
        // 子类实现
    }

    /**
     * 处理用户消息 - 必须由子类实现
     * @param {string} message - 用户消息
     * @param {Object} context - 上下文信息
     * @returns {Promise<Object>} 响应对象
     */
    async processMessage(message, context) {
        throw new Error('processMessage 方法必须由子类实现');
    }

    /**
     * 获取 Agent 能力描述
     * @returns {Array} 能力列表
     */
    getCapabilities() {
        return this.capabilities;
    }

    /**
     * 检查是否支持指定的能力
     * @param {string} capability - 能力名称
     * @returns {boolean}
     */
    hasCapability(capability) {
        return this.capabilities.includes(capability);
    }

    /**
     * 获取 Agent 信息
     * @returns {Object} Agent 信息
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            version: this.version,
            author: this.author,
            capabilities: this.capabilities,
            supportedLanguages: this.supportedLanguages,
            enabled: this.enabled
        };
    }

    /**
     * 启用 Agent
     */
    enable() {
        this.enabled = true;
        this.onEnable();
    }

    /**
     * 禁用 Agent
     */
    disable() {
        this.enabled = false;
        this.onDisable();
    }

    /**
     * 子类重写：启用时的处理
     */
    onEnable() {
        // 子类实现
    }

    /**
     * 子类重写：禁用时的处理
     */
    onDisable() {
        // 子类实现
    }

    /**
     * 加载配置
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(`agent_config_${this.id}`);
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error(`加载 Agent ${this.id} 配置失败:`, error);
        }
    }

    /**
     * 保存配置
     */
    saveConfig() {
        try {
            localStorage.setItem(`agent_config_${this.id}`, JSON.stringify(this.config));
        } catch (error) {
            console.error(`保存 Agent ${this.id} 配置失败:`, error);
        }
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        this.onConfigUpdated(this.config);
    }

    /**
     * 子类重写：配置更新时的处理
     * @param {Object} config - 更新后的配置
     */
    onConfigUpdated(config) {
        // 子类实现
    }

    /**
     * 获取工作区上下文
     * @returns {Object} 工作区上下文
     */
    getWorkspaceContext() {
        return this.agentAPI ? this.agentAPI.getWorkspaceContext() : null;
    }

    /**
     * 获取编辑器上下文
     * @returns {Object} 编辑器上下文
     */
    getEditorContext() {
        return this.agentAPI ? this.agentAPI.getEditorContext() : null;
    }

    /**
     * 获取文件系统上下文
     * @returns {Promise<Object>} 文件系统上下文
     */
    async getFilesContext() {
        return this.agentAPI ? await this.agentAPI.getFilesContext() : null;
    }

    /**
     * 创建响应对象
     * @param {string} content - 响应内容
     * @param {Array} actions - 动作列表
     * @param {Object} context - 上下文
     * @returns {Object} 响应对象
     */
    createResponse(content, actions = [], context = {}) {
        return {
            content,
            actions,
            context,
            agentId: this.id,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 创建编辑动作
     * @param {string} filePath - 文件路径
     * @param {Array} edits - 编辑列表
     * @param {Object} options - 选项
     * @returns {Object} 编辑动作
     */
    createEditAction(filePath, edits, options = {}) {
        return {
            type: 'edit',
            filePath,
            edits,
            options
        };
    }

    /**
     * 创建文件创建动作
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     * @param {Object} options - 选项
     * @returns {Object} 创建动作
     */
    createCreateAction(filePath, content = '', options = {}) {
        return {
            type: 'create',
            filePath,
            content,
            options
        };
    }

    /**
     * 创建文件删除动作
     * @param {string} filePath - 文件路径
     * @param {Object} options - 选项
     * @returns {Object} 删除动作
     */
    createDeleteAction(filePath, options = {}) {
        return {
            type: 'delete',
            filePath,
            options
        };
    }

    /**
     * 创建文件移动动作
     * @param {string} fromPath - 源路径
     * @param {string} toPath - 目标路径
     * @returns {Object} 移动动作
     */
    createMoveAction(fromPath, toPath) {
        return {
            type: 'move',
            fromPath,
            toPath
        };
    }

    /**
     * 创建搜索动作
     * @param {string} query - 搜索查询
     * @param {Object} options - 选项
     * @returns {Object} 搜索动作
     */
    createSearchAction(query, options = {}) {
        return {
            type: 'search',
            query,
            options
        };
    }

    /**
     * 创建编译动作
     * @param {string} filePath - 文件路径
     * @param {Object} options - 选项
     * @returns {Object} 编译动作
     */
    createCompileAction(filePath = null, options = {}) {
        return {
            type: 'compile',
            filePath,
            options
        };
    }

    /**
     * 创建终端动作
     * @param {string} command - 命令
     * @param {Object} options - 选项
     * @returns {Object} 终端动作
     */
    createTerminalAction(command, options = {}) {
        return {
            type: 'terminal',
            command,
            options
        };
    }

    /**
     * 创建 UI 动作
     * @param {string} type - UI 动作类型
     * @param {Object} data - 数据
     * @returns {Object} UI 动作
     */
    createUIAction(type, data) {
        return {
            type: 'ui',
            type: type,
            data
        };
    }

    /**
     * 发送消息给其他 Agent
     * @param {string} targetAgentId - 目标 Agent ID
     * @param {Object} message - 消息
     */
    sendMessageToAgent(targetAgentId, message) {
        if (this.agentAPI) {
            this.agentAPI.sendMessage(targetAgentId, {
                from: this.id,
                ...message
            });
        }
    }

    /**
     * 记录日志
     * @param {string} level - 日志级别
     * @param {string} message - 消息
     * @param {Object} data - 附加数据
     */
    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            agentId: this.id,
            level,
            message,
            data
        };

        console[level] ? console[level](`[${this.id}]`, message, data) : console.log(`[${this.id}]`, message, data);
        
        // 可以扩展为保存到日志系统
    }

    /**
     * 错误处理
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     */
    handleError(error, context = '') {
        this.log('error', `${context}: ${error.message}`, {
            stack: error.stack,
            context
        });
    }

    /**
     * 验证消息格式
     * @param {string} message - 消息
     * @returns {boolean} 是否有效
     */
    validateMessage(message) {
        return typeof message === 'string' && message.trim().length > 0;
    }

    /**
     * 解析用户意图
     * @param {string} message - 用户消息
     * @returns {Object} 意图对象
     */
    parseIntent(message) {
        // 基础意图解析，子类可以重写
        const lowerMessage = message.toLowerCase().trim();
        
        if (lowerMessage.includes('创建') || lowerMessage.includes('新建')) {
            return { type: 'create', confidence: 0.7 };
        }
        
        if (lowerMessage.includes('编辑') || lowerMessage.includes('修改')) {
            return { type: 'edit', confidence: 0.7 };
        }
        
        if (lowerMessage.includes('删除') || lowerMessage.includes('移除')) {
            return { type: 'delete', confidence: 0.7 };
        }
        
        if (lowerMessage.includes('搜索') || lowerMessage.includes('查找')) {
            return { type: 'search', confidence: 0.7 };
        }
        
        if (lowerMessage.includes('编译') || lowerMessage.includes('构建')) {
            return { type: 'compile', confidence: 0.7 };
        }
        
        return { type: 'unknown', confidence: 0.0 };
    }

    /**
     * 销毁 Agent
     */
    destroy() {
        this.onDestroy();
        this.agentAPI = null;
        this.ide = null;
    }

    /**
     * 子类重写：销毁时的处理
     */
    onDestroy() {
        // 子类实现
    }
} 