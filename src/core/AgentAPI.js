/**
 * Agent API - VS Code 风格的 Agent 插件抽象接口
 * 参考 Cline 等 VS Code 插件的交互模式设计
 */

export class AgentAPI {
    constructor(ide) {
        this.ide = ide;
        this.agents = new Map();
        this.activeAgent = null;
        this.chatHistory = [];
        this.taskQueue = [];
        this.isProcessing = false;
        
        // 事件发射器
        this.eventEmitter = new EventTarget();
        
        // 初始化 Agent 面板
        this.initAgentPanel();
    }

    /**
     * 注册 Agent 插件
     * @param {AgentPlugin} agent - Agent 插件实例
     */
    registerAgent(agent) {
        if (!agent.id) {
            throw new Error('Agent 必须有唯一的 ID');
        }

        this.agents.set(agent.id, agent);
        
        // 初始化 Agent
        if (typeof agent.init === 'function') {
            agent.init(this);
        }

        console.log(`Agent ${agent.id} 注册成功`);
        this.emit('agentRegistered', { agent });
    }

    /**
     * 卸载 Agent 插件
     * @param {string} agentId - Agent ID
     */
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        if (typeof agent.destroy === 'function') {
            agent.destroy();
        }

        this.agents.delete(agentId);
        
        if (this.activeAgent === agent) {
            this.activeAgent = null;
        }

        console.log(`Agent ${agentId} 卸载成功`);
        this.emit('agentUnregistered', { agentId });
    }

    /**
     * 激活指定的 Agent
     * @param {string} agentId - Agent ID
     */
    activateAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} 不存在`);
        }

        this.activeAgent = agent;
        this.emit('agentActivated', { agent });
        console.log(`Agent ${agentId} 已激活`);
    }

    /**
     * 发送消息给当前激活的 Agent
     * @param {string} message - 用户消息
     * @param {Object} context - 上下文信息
     */
    async sendMessage(message, context = {}) {
        if (!this.activeAgent) {
            throw new Error('没有激活的 Agent');
        }

        if (this.isProcessing) {
            this.taskQueue.push({ message, context });
            return;
        }

        this.isProcessing = true;

        try {
            // 添加到聊天历史
            this.addToChatHistory('user', message, context);

            // 发送给 Agent 处理
            const response = await this.activeAgent.processMessage(message, {
                ...context,
                workspace: this.getWorkspaceContext(),
                editor: this.getEditorContext(),
                files: this.getFilesContext()
            });

            // 添加 Agent 响应到历史
            this.addToChatHistory('agent', response.content, response.context);

            // 执行 Agent 返回的动作
            if (response.actions && response.actions.length > 0) {
                await this.executeActions(response.actions);
            }

            this.emit('messageProcessed', { message, response });
            return response;

        } catch (error) {
            console.error('Agent 处理消息失败:', error);
            this.emit('messageError', { message, error });
            throw error;
        } finally {
            this.isProcessing = false;
            
            // 处理队列中的下一个任务
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                setTimeout(() => this.sendMessage(nextTask.message, nextTask.context), 100);
            }
        }
    }

    /**
     * 执行 Agent 返回的动作
     * @param {Array} actions - 动作列表
     */
    async executeActions(actions) {
        for (const action of actions) {
            try {
                await this.executeAction(action);
            } catch (error) {
                console.error('执行动作失败:', action, error);
                this.emit('actionError', { action, error });
            }
        }
    }

    /**
     * 执行单个动作
     * @param {Object} action - 动作对象
     */
    async executeAction(action) {
        console.log('AgentAPI.executeAction 被调用:', action);
        
        switch (action.type) {
            case 'edit':
                console.log('执行编辑动作');
                await this.handleEditAction(action);
                break;
            case 'create':
                console.log('执行创建动作');
                await this.handleCreateAction(action);
                break;
            case 'delete':
                console.log('执行删除动作');
                await this.handleDeleteAction(action);
                break;
            case 'move':
                console.log('执行移动动作');
                await this.handleMoveAction(action);
                break;
            case 'search':
                console.log('执行搜索动作');
                await this.handleSearchAction(action);
                break;
            case 'compile':
                console.log('执行编译动作');
                await this.handleCompileAction(action);
                break;
            case 'terminal':
                console.log('执行终端动作');
                await this.handleTerminalAction(action);
                break;
            case 'ui':
                console.log('执行UI动作');
                await this.handleUIAction(action);
                break;
            default:
                console.warn('未知的动作类型:', action.type);
        }

        this.emit('actionExecuted', { action });
        console.log('动作执行完成:', action.type);
    }

    /**
     * 处理编辑动作
     */
    async handleEditAction(action) {
        const { filePath, edits, options = {} } = action;
        
        console.log('handleEditAction 开始:', { filePath, editsCount: edits.length, options });
        
        try {
            // 打开文件（如果未打开）
            if (!this.ide.openTabs.has(filePath)) {
                console.log('文件未打开，正在打开:', filePath);
                await this.ide.openFile(filePath);
            }

            // 切换到目标文件
            this.ide.switchToTab(filePath);

            const editor = this.ide.editor;
            if (!editor) {
                console.error('编辑器未初始化');
                return;
            }

            const model = editor.getModel();
            if (!model) {
                console.error('编辑器模型未找到');
                return;
            }

            // 检查monaco是否可用
            if (typeof monaco === 'undefined') {
                console.error('Monaco编辑器未定义，尝试直接操作模型');
                
                // 直接使用模型的方法，不依赖monaco.Range
                for (const edit of edits) {
                    const range = {
                        startLineNumber: edit.range.startLineNumber,
                        startColumn: edit.range.startColumn,
                        endLineNumber: edit.range.endLineNumber,
                        endColumn: edit.range.endColumn
                    };
                    
                    // 使用模型的pushEditOperations方法
                    model.pushEditOperations([], [{
                        range: range,
                        text: edit.text
                    }], () => null);
                }
            } else {
                // 使用monaco.Range
                for (const edit of edits) {
                    const range = new monaco.Range(
                        edit.range.startLineNumber,
                        edit.range.startColumn,
                        edit.range.endLineNumber,
                        edit.range.endColumn
                    );
                    
                    model.pushEditOperations([], [{
                        range: range,
                        text: edit.text
                    }], () => null);
                }
            }

            console.log('编辑操作完成');

            // 如果需要，保存文件
            if (options.save) {
                console.log('正在保存文件');
                await this.ide.saveCurrentFile();
            }
        } catch (error) {
            console.error('编辑文件失败:', error);
            throw error;
        }
    }

    /**
     * 处理创建文件动作
     */
    async handleCreateAction(action) {
        const { filePath, content = '', options = {} } = action;
        
        console.log('handleCreateAction 开始:', { filePath, contentLength: content.length, options });
        
        try {
            await this.ide.fileSystem.writeFile(filePath, content);
            console.log('文件写入成功:', filePath);
            
            this.ide.refreshFileExplorer();
            console.log('文件浏览器已刷新');

            if (options.open) {
                console.log('正在打开文件:', filePath);
                await this.ide.openFile(filePath);
                console.log('文件已打开:', filePath);
            }
        } catch (error) {
            console.error('创建文件失败:', error);
            throw error;
        }
    }

    /**
     * 处理删除动作
     */
    async handleDeleteAction(action) {
        const { filePath, options = {} } = action;
        
        if (options.confirm && !confirm(`确定要删除 ${filePath} 吗？`)) {
            return;
        }

        await this.ide.fileSystem.unlink(filePath);
        
        // 如果文件当前打开，关闭标签
        if (this.ide.openTabs.has(filePath)) {
            this.ide.closeTab(filePath);
        }
        
        this.ide.refreshFileExplorer();
    }

    /**
     * 处理移动/重命名动作
     */
    async handleMoveAction(action) {
        const { fromPath, toPath } = action;
        
        const content = await this.ide.fileSystem.readFile(fromPath);
        await this.ide.fileSystem.writeFile(toPath, content);
        await this.ide.fileSystem.unlink(fromPath);
        
        // 更新打开的标签
        if (this.ide.openTabs.has(fromPath)) {
            const tabData = this.ide.openTabs.get(fromPath);
            this.ide.openTabs.delete(fromPath);
            this.ide.openTabs.set(toPath, tabData);
            
            // 更新标签显示
            const tab = document.querySelector(`[data-file-path="${fromPath}"]`);
            if (tab) {
                tab.dataset.filePath = toPath;
                tab.querySelector('span').textContent = toPath.split('/').pop();
            }
            
            if (this.ide.currentFile === fromPath) {
                this.ide.currentFile = toPath;
            }
        }
        
        this.ide.refreshFileExplorer();
    }

    /**
     * 处理搜索动作
     */
    async handleSearchAction(action) {
        const { query, options = {} } = action;
        
        // 实现文件内容搜索
        const results = [];
        const files = await this.getAllFiles();
        
        for (const filePath of files) {
            try {
                const content = await this.ide.fileSystem.readFile(filePath);
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.includes(query)) {
                        results.push({
                            filePath,
                            lineNumber: index + 1,
                            line: line.trim(),
                            match: query
                        });
                    }
                });
            } catch (error) {
                // 忽略读取失败的文件
            }
        }
        
        return results;
    }

    /**
     * 处理编译动作
     */
    async handleCompileAction(action) {
        const { filePath, options = {} } = action;
        
        if (filePath) {
            await this.ide.openFile(filePath);
        }
        
        this.ide.compileLatex();
    }

    /**
     * 处理终端动作
     */
    async handleTerminalAction(action) {
        const { command, options = {} } = action;
        
        // 这里可以集成终端功能
        console.log('执行终端命令:', command);
        
        // 模拟命令执行
        return {
            exitCode: 0,
            stdout: `命令 "${command}" 执行完成`,
            stderr: ''
        };
    }

    /**
     * 处理 UI 动作
     */
    async handleUIAction(action) {
        const { type, data } = action;
        
        switch (type) {
            case 'showMessage':
                alert(data.message);
                break;
            case 'showProgress':
                // 显示进度条
                this.showProgress(data.title, data.message);
                break;
            case 'openSettings':
                this.ide.openSettings();
                break;
            default:
                console.warn('未知的 UI 动作:', type);
        }
    }

    /**
     * 获取工作区上下文
     */
    getWorkspaceContext() {
        return {
            rootPath: '/',
            openFiles: Array.from(this.ide.openTabs.keys()),
            currentFile: this.ide.currentFile,
            projectType: 'latex'
        };
    }

    /**
     * 获取编辑器上下文
     */
    getEditorContext() {
        if (!this.ide.editor || !this.ide.currentFile) {
            return null;
        }

        const editor = this.ide.editor;
        const position = editor.getPosition();
        const selection = editor.getSelection();
        
        return {
            filePath: this.ide.currentFile,
            content: editor.getValue(),
            position: {
                lineNumber: position.lineNumber,
                column: position.column
            },
            selection: selection ? {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn,
                selectedText: editor.getModel().getValueInRange(selection)
            } : null,
            language: editor.getModel().getLanguageId()
        };
    }

    /**
     * 获取文件系统上下文
     * @returns {Promise<Object>} 文件系统上下文
     */
    async getFilesContext() {
        const files = await this.getAllFiles();
        const fileTree = await this.buildFileTree();
        
        return {
            totalFiles: files.length,
            files: files,
            fileTree: fileTree,
            workspaceRoot: '/'
        };
    }

    /**
     * 获取所有文件列表
     */
    async getAllFiles() {
        const files = [];
        
        const scanDirectory = async (dirPath) => {
            try {
                const items = await this.ide.fileSystem.readdir(dirPath);
                
                for (const item of items) {
                    const fullPath = dirPath === '/' ? `/${item}` : `${dirPath}/${item}`;
                    const stats = await this.ide.fileSystem.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // 忽略无法访问的目录
            }
        };
        
        await scanDirectory('/');
        return files;
    }

    /**
     * 构建文件树
     */
    async buildFileTree() {
        const tree = { name: '/', type: 'directory', children: [] };
        const files = await this.getAllFiles();
        
        for (const filePath of files) {
            const parts = filePath.split('/').filter(Boolean);
            let current = tree;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;
                
                let child = current.children.find(c => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        type: isFile ? 'file' : 'directory',
                        path: '/' + parts.slice(0, i + 1).join('/'),
                        children: isFile ? undefined : []
                    };
                    current.children.push(child);
                }
                
                if (!isFile) {
                    current = child;
                }
            }
        }
        
        return tree;
    }

    /**
     * 添加到聊天历史
     */
    addToChatHistory(role, content, context = {}) {
        this.chatHistory.push({
            id: Date.now() + Math.random(),
            role,
            content,
            context,
            timestamp: new Date().toISOString()
        });

        // 限制历史记录数量
        if (this.chatHistory.length > 100) {
            this.chatHistory.splice(0, this.chatHistory.length - 100);
        }

        this.emit('chatHistoryUpdated', { history: this.chatHistory });
    }

    /**
     * 获取聊天历史
     */
    getChatHistory() {
        return [...this.chatHistory];
    }

    /**
     * 清空聊天历史
     */
    clearChatHistory() {
        this.chatHistory = [];
        this.emit('chatHistoryCleared');
    }

    /**
     * 显示进度
     */
    showProgress(title, message) {
        // 实现进度显示逻辑
        console.log(`[${title}] ${message}`);
    }

    /**
     * 初始化 Agent 面板
     */
    initAgentPanel() {
        // 动态导入 AgentPanel 避免循环依赖
        import('./AgentPanel.js').then(({ AgentPanel }) => {
            this.panel = new AgentPanel(this);
            console.log('Agent 面板初始化完成');
        }).catch(error => {
            console.error('Agent 面板初始化失败:', error);
        });
    }

    /**
     * 显示 Agent 面板
     */
    showPanel() {
        if (this.panel) {
            this.panel.show();
        }
    }

    /**
     * 隐藏 Agent 面板
     */
    hidePanel() {
        if (this.panel) {
            this.panel.hide();
        }
    }

    /**
     * 切换 Agent 面板显示状态
     */
    togglePanel() {
        if (this.panel) {
            this.panel.toggle();
        }
    }

    /**
     * 事件发射
     */
    emit(eventName, data) {
        this.eventEmitter.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    /**
     * 事件监听
     */
    on(eventName, callback) {
        this.eventEmitter.addEventListener(eventName, (event) => {
            callback(event.detail);
        });
    }

    /**
     * 移除事件监听
     */
    off(eventName, callback) {
        this.eventEmitter.removeEventListener(eventName, callback);
    }

    /**
     * 销毁
     */
    destroy() {
        // 清理所有 Agent
        for (const [agentId] of this.agents) {
            this.unregisterAgent(agentId);
        }
        
        this.agents.clear();
        this.chatHistory = [];
        this.taskQueue = [];
        this.activeAgent = null;
    }

    /**
     * VS Code 兼容 API - 获取工作区文件夹
     */
    getWorkspaceFolders() {
        return [{
            uri: { fsPath: '/', scheme: 'file' },
            name: 'LaTeX Project',
            index: 0
        }];
    }

    /**
     * VS Code 兼容 API - 获取活动文本编辑器
     */
    getActiveTextEditor() {
        const editorContext = this.getEditorContext();
        if (!editorContext) return null;

        return {
            document: {
                uri: { fsPath: editorContext.filePath, scheme: 'file' },
                fileName: editorContext.filePath,
                languageId: editorContext.language,
                getText: () => editorContext.content,
                lineCount: editorContext.lineCount,
                lineAt: (line) => ({
                    text: editorContext.content.split('\n')[line] || '',
                    lineNumber: line
                })
            },
            selection: {
                start: { line: editorContext.selection.startLineNumber - 1, character: editorContext.selection.startColumn - 1 },
                end: { line: editorContext.selection.endLineNumber - 1, character: editorContext.selection.endColumn - 1 }
            },
            edit: async (editBuilder) => {
                // 实现编辑功能
                const edits = editBuilder.edits || [];
                await this.executeAction({
                    type: 'edit',
                    filePath: editorContext.filePath,
                    edits: edits
                });
            }
        };
    }

    /**
     * VS Code 兼容 API - 显示信息消息
     */
    showInformationMessage(message, ...items) {
        this.emit('showMessage', { type: 'info', message, items });
        // 简单实现
        console.log('Info:', message);
        return Promise.resolve(items[0]);
    }

    /**
     * VS Code 兼容 API - 显示警告消息
     */
    showWarningMessage(message, ...items) {
        this.emit('showMessage', { type: 'warning', message, items });
        console.warn('Warning:', message);
        return Promise.resolve(items[0]);
    }

    /**
     * VS Code 兼容 API - 显示错误消息
     */
    showErrorMessage(message, ...items) {
        this.emit('showMessage', { type: 'error', message, items });
        console.error('Error:', message);
        return Promise.resolve(items[0]);
    }

    /**
     * VS Code 兼容 API - 执行命令
     */
    async executeCommand(command, ...args) {
        this.emit('executeCommand', { command, args });
        
        // 映射常用命令
        switch (command) {
            case 'vscode.open':
                if (args[0] && args[0].fsPath) {
                    await this.ide.openFile(args[0].fsPath);
                }
                break;
            case 'workbench.action.files.save':
                await this.ide.saveCurrentFile();
                break;
            case 'workbench.action.files.saveAll':
                // 保存所有文件
                for (const filePath of this.ide.openTabs.keys()) {
                    await this.ide.saveFile(filePath);
                }
                break;
            default:
                console.log('执行命令:', command, args);
        }
    }

    /**
     * VS Code 兼容 API - 注册命令
     */
    registerCommand(command, callback) {
        this.on(`command:${command}`, callback);
        return {
            dispose: () => this.off(`command:${command}`, callback)
        };
    }

    /**
     * VS Code 兼容 API - 文件系统监听
     */
    createFileSystemWatcher(globPattern) {
        const watcher = {
            onDidCreate: (callback) => {
                this.on('fileCreated', callback);
                return { dispose: () => this.off('fileCreated', callback) };
            },
            onDidChange: (callback) => {
                this.on('fileChanged', callback);
                return { dispose: () => this.off('fileChanged', callback) };
            },
            onDidDelete: (callback) => {
                this.on('fileDeleted', callback);
                return { dispose: () => this.off('fileDeleted', callback) };
            },
            dispose: () => {
                // 清理监听器
            }
        };
        return watcher;
    }

    /**
     * VS Code 兼容 API - 获取配置
     */
    getConfiguration(section) {
        const config = this.ide.settingsManager.getSettings();
        
        return {
            get: (key, defaultValue) => {
                const fullKey = section ? `${section}.${key}` : key;
                return config[fullKey] || defaultValue;
            },
            update: async (key, value, target) => {
                const fullKey = section ? `${section}.${key}` : key;
                await this.ide.settingsManager.updateSetting(fullKey, value);
            },
            has: (key) => {
                const fullKey = section ? `${section}.${key}` : key;
                return fullKey in config;
            }
        };
    }

    /**
     * 创建输出通道（类似 VS Code 的 OutputChannel）
     */
    createOutputChannel(name) {
        return {
            name,
            append: (text) => {
                this.emit('outputChannelAppend', { channel: name, text });
                console.log(`[${name}]`, text);
            },
            appendLine: (text) => {
                this.emit('outputChannelAppendLine', { channel: name, text });
                console.log(`[${name}]`, text);
            },
            clear: () => {
                this.emit('outputChannelClear', { channel: name });
            },
            show: () => {
                this.emit('outputChannelShow', { channel: name });
            },
            hide: () => {
                this.emit('outputChannelHide', { channel: name });
            },
            dispose: () => {
                this.emit('outputChannelDispose', { channel: name });
            }
        };
    }
} 