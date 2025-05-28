export class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.editor = null;
        this.hooks = {
            'editor.init': [],
            'editor.content.change': [],
            'file.open': [],
            'file.save': [],
            'syntax.highlight': [],
            'autocomplete.provide': [],
            'agent.message': []
        };
        
        this.activeAgent = null;
        this.agentPanel = null;
    }

    // 注册插件
    registerPlugin(plugin) {
        if (!plugin.id) {
            throw new Error('插件必须有唯一的 ID');
        }

        if (this.plugins.has(plugin.id)) {
            console.warn(`插件 ${plugin.id} 已存在，将被替换`);
        }

        this.plugins.set(plugin.id, plugin);
        
        // 初始化插件
        if (typeof plugin.init === 'function') {
            plugin.init(this);
        }

        // 注册插件的钩子
        if (plugin.hooks) {
            for (const [hookName, handler] of Object.entries(plugin.hooks)) {
                this.addHook(hookName, handler);
            }
        }

        console.log(`插件 ${plugin.id} 注册成功`);
        
        if (plugin.type === 'agent') {
            this.updateAgentPanel();
        }
    }

    // 卸载插件
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`插件 ${pluginId} 不存在`);
            return;
        }

        // 调用插件的清理方法
        if (typeof plugin.destroy === 'function') {
            plugin.destroy();
        }

        // 移除插件的钩子
        if (plugin.hooks) {
            for (const [hookName, handler] of Object.entries(plugin.hooks)) {
                this.removeHook(hookName, handler);
            }
        }

        this.plugins.delete(pluginId);
        console.log(`插件 ${pluginId} 卸载成功`);
        
        if (plugin.type === 'agent') {
            this.updateAgentPanel();
        }
    }

    // 获取插件
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    // 获取所有插件
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }
    
    // 获取特定类型的插件
    getPluginsByType(type) {
        return this.getAllPlugins().filter(plugin => plugin.type === type);
    }
    
    // 获取所有 Agent 插件
    getAgentPlugins() {
        return this.getPluginsByType('agent');
    }

    // 启用插件
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = true;
            if (typeof plugin.enable === 'function') {
                plugin.enable();
            }
            console.log(`插件 ${pluginId} 已启用`);
            
            // 如果是 Agent 插件，更新 Agent 面板
            if (plugin.type === 'agent') {
                this.updateAgentPanel();
            }
        }
    }

    // 禁用插件
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = false;
            if (typeof plugin.disable === 'function') {
                plugin.disable();
            }
            console.log(`插件 ${pluginId} 已禁用`);
            
            // 如果是当前激活的 Agent，取消激活
            if (plugin.type === 'agent' && this.activeAgent && this.activeAgent.id === pluginId) {
                this.activeAgent = null;
                console.log(`已取消激活 Agent: ${pluginId}`);
            }
            
            // 如果是 Agent 插件，更新 Agent 面板
            if (plugin.type === 'agent') {
                this.updateAgentPanel();
            }
        }
    }

    // 添加钩子
    addHook(hookName, handler) {
        if (!this.hooks[hookName]) {
            this.hooks[hookName] = [];
        }
        this.hooks[hookName].push(handler);
    }

    // 移除钩子
    removeHook(hookName, handler) {
        if (this.hooks[hookName]) {
            const index = this.hooks[hookName].indexOf(handler);
            if (index > -1) {
                this.hooks[hookName].splice(index, 1);
            }
        }
    }

    // 触发钩子
    async triggerHook(hookName, ...args) {
        if (!this.hooks[hookName]) {
            return [];
        }

        const results = [];
        for (const handler of this.hooks[hookName]) {
            try {
                const result = await handler(...args);
                if (result !== undefined) {
                    results.push(result);
                }
            } catch (error) {
                console.error(`钩子 ${hookName} 执行失败:`, error);
            }
        }
        return results;
    }

    // 初始化编辑器相关功能
    initEditor(editor) {
        this.editor = editor;
        
        // 触发编辑器初始化钩子
        this.triggerHook('editor.init', editor);

        // 监听编辑器内容变化
        editor.onDidChangeModelContent((e) => {
            this.triggerHook('editor.content.change', e, editor);
        });
    }

    /**
     * 为插件提供注册右键菜单项的接口
     */
    registerContextMenuAction(actionConfig) {
        if (window.ide && window.ide.registerContextMenuAction) {
            window.ide.registerContextMenuAction(actionConfig);
        } else {
            console.warn('IDE实例或registerContextMenuAction方法不可用');
        }
    }

    // 获取语法高亮提供者
    getSyntaxHighlightProviders(language) {
        return this.getAllPlugins().filter(plugin => 
            plugin.type === 'syntax' && 
            plugin.supportedLanguages && 
            plugin.supportedLanguages.includes(language)
        );
    }

    // 获取自动完成提供者
    getAutoCompleteProviders(language) {
        return this.getAllPlugins().filter(plugin => 
            plugin.type === 'autocomplete' && 
            plugin.supportedLanguages && 
            plugin.supportedLanguages.includes(language)
        );
    }

    // 插件通信机制
    sendMessage(fromPluginId, toPluginId, message) {
        const targetPlugin = this.getPlugin(toPluginId);
        if (targetPlugin && typeof targetPlugin.onMessage === 'function') {
            targetPlugin.onMessage(fromPluginId, message);
        }
    }

    // 广播消息给所有插件
    broadcastMessage(fromPluginId, message) {
        for (const [pluginId, plugin] of this.plugins) {
            if (pluginId !== fromPluginId && typeof plugin.onMessage === 'function') {
                plugin.onMessage(fromPluginId, message);
            }
        }
    }

    // 获取插件配置
    getPluginConfig(pluginId) {
        const config = localStorage.getItem(`plugin_config_${pluginId}`);
        return config ? JSON.parse(config) : {};
    }

    // 保存插件配置
    setPluginConfig(pluginId, config) {
        localStorage.setItem(`plugin_config_${pluginId}`, JSON.stringify(config));
    }
    
    // 显示插件配置界面
    async showPluginConfig(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (!plugin) {
            throw new Error(`插件 ${pluginId} 不存在`);
        }
        
        // 如果是 Agent 插件且有配置界面
        if (plugin.type === 'agent' && typeof plugin.getConfigUI === 'function') {
            const configUI = plugin.getConfigUI();
            if (configUI) {
                return await this.showAgentConfigModal(plugin, configUI);
            }
        }
        
        // 通用插件配置
        return await this.showGenericPluginConfig(plugin);
    }
    
    // 显示 Agent 配置模态框
    async showAgentConfigModal(plugin, configUI) {
        return new Promise((resolve, reject) => {
            // 创建模态框
            const modal = document.createElement('div');
            modal.className = 'plugin-config-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>${configUI.title}</h3>
                            <button class="modal-close">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="plugin-config-form">
                                ${this.generateConfigFields(configUI.fields, plugin.config)}
                            </form>
                            ${configUI.actions ? this.generateConfigActions(configUI.actions) : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-cancel">取消</button>
                            <button type="submit" class="btn-save">保存配置</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加样式
            this.addConfigModalStyles();
            
            // 事件处理
            const form = modal.querySelector('#plugin-config-form');
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.btn-cancel');
            const saveBtn = modal.querySelector('.btn-save');
            
            // 关闭模态框
            const closeModal = () => {
                modal.remove();
                resolve(null);
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // 保存配置
            const saveConfig = async () => {
                try {
                    const formData = new FormData(form);
                    const config = {};
                    
                    // 收集表单数据
                    for (const field of configUI.fields) {
                        const value = formData.get(field.key);
                        if (field.type === 'number') {
                            config[field.key] = parseFloat(value);
                        } else if (field.type === 'range') {
                            config[field.key] = parseFloat(value);
                        } else if (field.type === 'checkbox') {
                            config[field.key] = value === 'on'; // checkbox 返回 'on' 或 null
                        } else {
                            config[field.key] = value;
                        }
                    }
                    
                    // 验证配置
                    if (typeof plugin.validateConfig === 'function') {
                        plugin.validateConfig(config);
                    }
                    
                    // 保存配置
                    plugin.setConfig(config);
                    
                    modal.remove();
                    resolve(config);
                    
                } catch (error) {
                    alert(`配置保存失败: ${error.message}`);
                }
            };
            
            saveBtn.addEventListener('click', saveConfig);
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                saveConfig();
            });
            
            // 处理配置动作
            if (configUI.actions) {
                configUI.actions.forEach(action => {
                    const btn = modal.querySelector(`[data-action="${action.action}"]`);
                    if (btn) {
                        btn.addEventListener('click', async () => {
                            try {
                                const formData = new FormData(form);
                                const currentConfig = {};
                                
                                for (const field of configUI.fields) {
                                    const value = formData.get(field.key);
                                    if (field.type === 'number' || field.type === 'range') {
                                        currentConfig[field.key] = parseFloat(value);
                                    } else {
                                        currentConfig[field.key] = value;
                                    }
                                }
                                
                                if (typeof plugin.handleConfigAction === 'function') {
                                    const result = await plugin.handleConfigAction(action.action, currentConfig);
                                    if (result && result.message) {
                                        alert(result.message);
                                    }
                                }
                            } catch (error) {
                                alert(`操作失败: ${error.message}`);
                            }
                        });
                    }
                });
            }
            
            // 添加到页面
            document.body.appendChild(modal);
        });
    }
    
    // 生成配置字段
    generateConfigFields(fields, currentConfig) {
        return fields.map(field => {
            const value = currentConfig[field.key] || '';
            let input = '';
            
            switch (field.type) {
                case 'text':
                case 'password':
                case 'url':
                    input = `<input type="${field.type}" name="${field.key}" value="${value}" 
                             placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
                    break;
                case 'number':
                    input = `<input type="number" name="${field.key}" value="${value}" 
                             min="${field.min || ''}" max="${field.max || ''}" step="${field.step || 1}" 
                             ${field.required ? 'required' : ''}>`;
                    break;
                case 'range':
                    input = `<input type="range" name="${field.key}" value="${value}" 
                             min="${field.min || 0}" max="${field.max || 1}" step="${field.step || 0.1}">
                             <span class="range-value">${value}</span>`;
                    break;
                case 'select':
                    const options = field.options.map(opt => 
                        `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
                    ).join('');
                    input = `<select name="${field.key}" ${field.required ? 'required' : ''}>${options}</select>`;
                    break;
                case 'textarea':
                    input = `<textarea name="${field.key}" rows="${field.rows || 4}" 
                             placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${value}</textarea>`;
                    break;
                case 'checkbox':
                    input = `<input type="checkbox" name="${field.key}" ${value ? 'checked' : ''}>`;
                    break;
                default:
                    input = `<input type="text" name="${field.key}" value="${value}">`;
            }
            
            return `
                <div class="config-field">
                    <label for="${field.key}">${field.label}:</label>
                    ${input}
                    ${field.description ? `<small>${field.description}</small>` : ''}
                </div>
            `;
        }).join('');
    }
    
    // 生成配置动作按钮
    generateConfigActions(actions) {
        const buttons = actions.map(action => 
            `<button type="button" class="btn-action btn-${action.type || 'secondary'}" 
                     data-action="${action.action}">${action.label}</button>`
        ).join('');
        
        return `<div class="config-actions">${buttons}</div>`;
    }
    
    // 添加配置模态框样式
    addConfigModalStyles() {
        if (document.getElementById('plugin-config-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'plugin-config-styles';
        styles.textContent = `
            .plugin-config-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
            }
            
            .modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: white;
                border-radius: 8px;
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            }
            
            .modal-header h3 {
                margin: 0;
                color: #333;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .config-field {
                margin-bottom: 20px;
            }
            
            .config-field label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #333;
            }
            
            .config-field input,
            .config-field select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .config-field textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                font-family: inherit;
                resize: vertical;
                min-height: 80px;
            }
            
            .config-field input[type="range"] {
                width: calc(100% - 50px);
                display: inline-block;
            }
            
            .range-value {
                display: inline-block;
                width: 40px;
                text-align: center;
                font-weight: bold;
                color: #007acc;
            }
            
            .config-field small {
                display: block;
                margin-top: 5px;
                color: #666;
                font-size: 12px;
            }
            
            .config-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            
            .btn-action {
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 14px;
            }
            
            .btn-action.btn-secondary {
                background: #6c757d;
                color: white;
                border-color: #6c757d;
            }
            
            .btn-action.btn-warning {
                background: #ffc107;
                color: #212529;
                border-color: #ffc107;
            }
            
            .btn-action:hover {
                opacity: 0.8;
            }
            
            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid #eee;
                background: #f8f9fa;
            }
            
            .btn-cancel,
            .btn-save {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .btn-save {
                background: #007acc;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #5a6268;
            }
            
            .btn-save:hover {
                background: #0056b3;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // 显示通用插件配置
    async showGenericPluginConfig(plugin) {
        alert(`${plugin.name} 的配置功能开发中...`);
    }
    
    // Agent 相关方法
    
    // 激活 Agent
    activateAgent(agentId) {
        const agent = this.getPlugin(agentId);
        if (!agent || agent.type !== 'agent') {
            throw new Error(`Agent ${agentId} 不存在或不是有效的 Agent 插件`);
        }
        
        this.activeAgent = agent;
        console.log(`Agent ${agent.name} 已激活`);
        
        // 触发 Agent 激活事件
        this.triggerHook('agent.activated', agent);
        
        return agent;
    }
    
    // 获取当前激活的 Agent
    getActiveAgent() {
        return this.activeAgent;
    }
    
    // 发送消息给 Agent
    async sendMessageToAgent(message, context = {}, onStream = null) {
        if (!this.activeAgent) {
            throw new Error('没有激活的 Agent');
        }
        
        const fullContext = {
            ...context,
            targetAgent: this.activeAgent.id,
            timestamp: new Date().toISOString()
        };
        
        // 触发 Agent 消息钩子
        const results = await this.triggerHook('agent.message', message, fullContext);
        
        // 如果有结果，返回第一个
        if (results.length > 0) {
            return results[0];
        }
        
        // 直接调用 Agent 的 processMessage 方法
        if (typeof this.activeAgent.processMessage === 'function') {
            return await this.activeAgent.processMessage(message, fullContext, onStream);
        }
        
        throw new Error('Agent 没有实现 processMessage 方法');
    }
    
    // 执行 Agent 动作
    async executeAgentAction(action) {
        if (!action || !action.type) {
            throw new Error('无效的动作');
        }
        
        console.log('执行 Agent 动作:', action);
        
        switch (action.type) {
            case 'create':
                return await this.executeCreateAction(action.data);
            case 'edit':
                return await this.executeEditAction(action.data);
            case 'delete':
                return await this.executeDeleteAction(action.data);
            case 'ui':
                return await this.executeUIAction(action.data);
            default:
                console.warn(`未知的动作类型: ${action.type}`);
                return false;
        }
    }
    
    // 执行创建文件动作
    async executeCreateAction(data) {
        try {
            if (!window.ide || !window.ide.fileSystem) {
                throw new Error('文件系统未初始化');
            }
            
            await window.ide.fileSystem.writeFile(data.filePath, data.content || '');
            
            // 刷新文件浏览器
            if (window.ide.refreshFileExplorer) {
                window.ide.refreshFileExplorer();
            }
            
            // 打开创建的文件
            if (window.ide.openFile) {
                window.ide.openFile(data.filePath);
            }
            
            console.log(`文件已创建: ${data.filePath}`);
            return true;
        } catch (error) {
            console.error('创建文件失败:', error);
            return false;
        }
    }
    
    // 执行编辑文件动作
    async executeEditAction(data) {
        try {
            if (!window.ide || !window.ide.editor) {
                throw new Error('编辑器未初始化');
            }
            
            // 如果文件未打开，先打开文件
            if (window.ide.currentFile !== data.filePath) {
                if (window.ide.openFile) {
                    await window.ide.openFile(data.filePath);
                }
            }
            
            const editor = window.ide.editor;
            const model = editor.getModel();
            
            if (!model) {
                throw new Error('编辑器模型未初始化');
            }
            
            // 应用编辑
            if (data.edits && Array.isArray(data.edits)) {
                for (const edit of data.edits) {
                    if (edit.range) {
                        // 替换指定范围的文本
                        const range = new monaco.Range(
                            edit.range.startLine,
                            edit.range.startColumn || 1,
                            edit.range.endLine,
                            edit.range.endColumn || 1
                        );
                        model.pushEditOperations([], [{
                            range: range,
                            text: edit.text
                        }], () => null);
                    } else {
                        // 在文档末尾添加文本
                        const lineCount = model.getLineCount();
                        const lastLineLength = model.getLineLength(lineCount);
                        const range = new monaco.Range(lineCount, lastLineLength + 1, lineCount, lastLineLength + 1);
                        model.pushEditOperations([], [{
                            range: range,
                            text: edit.text
                        }], () => null);
                    }
                }
            }
            
            console.log(`文件已编辑: ${data.filePath}`);
            return true;
        } catch (error) {
            console.error('编辑文件失败:', error);
            return false;
        }
    }
    
    // 执行删除文件动作
    async executeDeleteAction(data) {
        try {
            if (!window.ide || !window.ide.fileSystem) {
                throw new Error('文件系统未初始化');
            }
            
            await window.ide.fileSystem.unlink(data.filePath);
            
            // 刷新文件浏览器
            if (window.ide.refreshFileExplorer) {
                window.ide.refreshFileExplorer();
            }
            
            console.log(`文件已删除: ${data.filePath}`);
            return true;
        } catch (error) {
            console.error('删除文件失败:', error);
            return false;
        }
    }
    
    // 执行 UI 动作
    async executeUIAction(data) {
        try {
            switch (data.action) {
                case 'showMessage':
                    alert(data.params.message);
                    break;
                case 'showPluginConfig':
                    await this.showPluginConfig(data.params.pluginId);
                    break;
                default:
                    console.warn(`未知的 UI 动作: ${data.action}`);
                    return false;
            }
            
            return true;
        } catch (error) {
            console.error('执行 UI 动作失败:', error);
            return false;
        }
    }
    
    // 更新 Agent 面板
    updateAgentPanel() {
        // 如果有 Agent 面板，通知它更新
        if (this.agentPanel && typeof this.agentPanel.updateAgentList === 'function') {
            this.agentPanel.updateAgentList();
        }
    }
    
    // 设置 Agent 面板引用
    setAgentPanel(agentPanel) {
        this.agentPanel = agentPanel;
    }

    // 插件依赖检查
    checkDependencies(plugin) {
        if (!plugin.dependencies) {
            return true;
        }

        for (const dep of plugin.dependencies) {
            if (!this.plugins.has(dep)) {
                console.error(`插件 ${plugin.id} 依赖的插件 ${dep} 未找到`);
                return false;
            }
        }

        return true;
    }

    // 按依赖顺序加载插件
    loadPluginsInOrder(plugins) {
        // 简单的拓扑排序实现
        const loaded = new Set();
        const loadPlugin = (plugin) => {
            if (loaded.has(plugin.id)) {
                return;
            }

            // 先加载依赖
            if (plugin.dependencies) {
                for (const dep of plugin.dependencies) {
                    const depPlugin = plugins.find(p => p.id === dep);
                    if (depPlugin) {
                        loadPlugin(depPlugin);
                    }
                }
            }

            // 加载当前插件
            this.registerPlugin(plugin);
            loaded.add(plugin.id);
        };

        plugins.forEach(loadPlugin);
    }

    // 获取插件状态
    getPluginStatus() {
        const status = {};
        for (const [id, plugin] of this.plugins) {
            status[id] = {
                name: plugin.name,
                version: plugin.version,
                type: plugin.type,
                enabled: plugin.enabled !== false,
                dependencies: plugin.dependencies || []
            };
        }
        return status;
    }
} 