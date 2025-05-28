/**
 * Agent Panel - VS Code 风格的 Agent 聊天面板
 */

export class AgentPanel {
    constructor(agentAPI) {
        this.agentAPI = agentAPI;
        this.isVisible = false;
        this.isExpanded = true;
        this.currentInput = '';
        
        // 创建面板 DOM
        this.createPanel();
        this.setupEventListeners();
        
        // 监听 Agent API 事件
        this.setupAgentListeners();
    }

    /**
     * 创建面板 DOM 结构
     */
    createPanel() {
        // 创建主面板容器
        this.panel = document.createElement('div');
        this.panel.id = 'agent-panel';
        this.panel.className = 'agent-panel hidden';
        
        this.panel.innerHTML = `
            <div class="agent-panel-header">
                <div class="agent-panel-title">
                    <span class="agent-icon">🤖</span>
                    <span class="agent-title-text">AI 助手</span>
                    <div class="agent-status">
                        <span class="status-indicator" id="agent-status-indicator"></span>
                        <span class="status-text" id="agent-status-text">未连接</span>
                    </div>
                </div>
                <div class="agent-panel-controls">
                    <button class="btn-icon" id="agent-settings-btn" title="设置">⚙️</button>
                    <button class="btn-icon" id="agent-minimize-btn" title="最小化">−</button>
                    <button class="btn-icon" id="agent-close-btn" title="关闭">×</button>
                </div>
            </div>
            
            <div class="agent-panel-content" id="agent-panel-content">
                <!-- Agent 选择器 -->
                <div class="agent-selector">
                    <label for="agent-select">选择 Agent:</label>
                    <select id="agent-select" class="agent-select">
                        <option value="">请选择 Agent</option>
                    </select>
                    <button id="agent-demo-btn" class="demo-button" title="启动 LaTeX 智能助手演示">
                        🎯 演示功能
                    </button>
                </div>
                
                <!-- 聊天历史 -->
                <div class="chat-container" id="chat-container">
                    <div class="chat-messages" id="chat-messages">
                        <div class="welcome-message">
                            <div class="message-content">
                                <h3>👋 欢迎使用 AI 助手</h3>
                                <p>请选择一个 Agent 开始对话。我可以帮助您：</p>
                                <ul>
                                    <li>创建和编辑 LaTeX 文档</li>
                                    <li>管理项目文件</li>
                                    <li>搜索和导航代码</li>
                                    <li>编译和调试</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 输入区域 -->
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chat-input" 
                            class="chat-input" 
                            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                            rows="1"
                        ></textarea>
                        <div class="chat-input-actions">
                            <button id="chat-send-btn" class="btn-send" title="发送 (Enter)">
                                <span class="send-icon">📤</span>
                            </button>
                            <button id="chat-clear-btn" class="btn-clear" title="清空历史">
                                <span class="clear-icon">🗑️</span>
                            </button>
                        </div>
                    </div>
                    <div class="chat-input-footer">
                        <span class="input-hint">Shift+Enter 换行 • Enter 发送</span>
                        <span class="char-count" id="char-count">0</span>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
        
        // 添加到页面
        document.body.appendChild(this.panel);
    }

    /**
     * 添加样式
     */
    addStyles() {
        if (document.getElementById('agent-panel-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'agent-panel-styles';
        styles.textContent = `
            .agent-panel {
                position: fixed;
                right: 20px;
                top: 80px;
                width: 400px;
                height: 600px;
                background: var(--bg-color, #ffffff);
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: all 0.3s ease;
            }
            
            .agent-panel.hidden {
                display: none;
            }
            
            .agent-panel.minimized .agent-panel-content {
                display: none;
            }
            
            .agent-panel.minimized {
                height: auto;
            }
            
            .agent-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--header-bg, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                border-radius: 8px 8px 0 0;
                cursor: move;
            }
            
            .agent-panel-title {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .agent-icon {
                font-size: 18px;
            }
            
            .agent-title-text {
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .agent-status {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: 12px;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #dc3545;
            }
            
            .status-indicator.connected {
                background: #28a745;
            }
            
            .status-indicator.processing {
                background: #ffc107;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .status-text {
                font-size: 12px;
                color: var(--text-secondary, #666);
            }
            
            .agent-panel-controls {
                display: flex;
                gap: 4px;
            }
            
            .btn-icon {
                width: 24px;
                height: 24px;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                color: var(--text-secondary, #666);
                transition: background-color 0.2s;
            }
            
            .btn-icon:hover {
                background: var(--hover-bg, #e9ecef);
            }
            
            .agent-panel-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .agent-selector {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                background: var(--bg-secondary, #f8f9fa);
            }
            
            .agent-selector label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                font-weight: 500;
                color: var(--text-secondary, #666);
            }
            
            .agent-select {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 4px;
                background: white;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .demo-button {
                width: 100%;
                padding: 8px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .demo-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .demo-button:active {
                transform: translateY(0);
            }
            
            .chat-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                scroll-behavior: smooth;
            }
            
            .welcome-message {
                text-align: center;
                color: var(--text-secondary, #666);
                padding: 20px;
            }
            
            .welcome-message h3 {
                margin: 0 0 12px 0;
                color: var(--text-color, #333);
            }
            
            .welcome-message ul {
                text-align: left;
                margin: 12px 0;
                padding-left: 20px;
            }
            
            .message {
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
            }
            
            .message.user {
                align-items: flex-end;
            }
            
            .message.agent {
                align-items: flex-start;
            }
            
            .message.system {
                align-items: center;
            }
            
            .message-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 4px;
                font-size: 12px;
                color: var(--text-secondary, #666);
            }
            
            .message-avatar {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }
            
            .message-avatar.user {
                background: var(--primary-color, #007bff);
                color: white;
            }
            
            .message-avatar.agent {
                background: var(--success-color, #28a745);
                color: white;
            }
            
            .message-avatar.system {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .message-content {
                max-width: 85%;
                padding: 8px 12px;
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            }
            
            .message.user .message-content {
                background: var(--primary-color, #007bff);
                color: white;
                border-bottom-right-radius: 4px;
            }
            
            .message.agent .message-content {
                background: var(--bg-secondary, #f8f9fa);
                color: var(--text-color, #333);
                border: 1px solid var(--border-color, #e0e0e0);
                border-bottom-left-radius: 4px;
            }
            
            .message.system .message-content {
                background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
                color: var(--text-color, #333);
                border: 2px solid #667eea;
                border-radius: 12px;
                text-align: center;
                font-weight: 500;
            }
            
            .message-content pre {
                background: rgba(0, 0, 0, 0.1);
                padding: 8px;
                border-radius: 4px;
                overflow-x: auto;
                margin: 4px 0;
            }
            
            .message-content code {
                background: rgba(0, 0, 0, 0.1);
                padding: 2px 4px;
                border-radius: 3px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            
            .message-timestamp {
                font-size: 11px;
                color: var(--text-tertiary, #999);
                margin-top: 2px;
            }
            
            .message-actions {
                display: flex;
                gap: 4px;
                margin-top: 4px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .message:hover .message-actions {
                opacity: 1;
            }
            
            .action-btn {
                padding: 2px 6px;
                font-size: 11px;
                border: 1px solid var(--border-color, #e0e0e0);
                background: white;
                border-radius: 3px;
                cursor: pointer;
                color: var(--text-secondary, #666);
            }
            
            .action-btn:hover {
                background: var(--hover-bg, #e9ecef);
            }
            
            .chat-input-container {
                border-top: 1px solid var(--border-color, #e0e0e0);
                background: white;
            }
            
            .chat-input-wrapper {
                display: flex;
                align-items: flex-end;
                padding: 12px;
                gap: 8px;
            }
            
            .chat-input {
                flex: 1;
                min-height: 36px;
                max-height: 120px;
                padding: 8px 12px;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 18px;
                resize: none;
                font-size: 14px;
                line-height: 1.4;
                font-family: inherit;
                outline: none;
                transition: border-color 0.2s;
            }
            
            .chat-input:focus {
                border-color: var(--primary-color, #007bff);
            }
            
            .chat-input-actions {
                display: flex;
                gap: 4px;
            }
            
            .btn-send, .btn-clear {
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .btn-send {
                background: var(--primary-color, #007bff);
                color: white;
            }
            
            .btn-send:hover {
                background: var(--primary-dark, #0056b3);
                transform: scale(1.05);
            }
            
            .btn-send:disabled {
                background: var(--disabled-color, #ccc);
                cursor: not-allowed;
                transform: none;
            }
            
            .btn-clear {
                background: var(--danger-color, #dc3545);
                color: white;
            }
            
            .btn-clear:hover {
                background: var(--danger-dark, #c82333);
                transform: scale(1.05);
            }
            
            .chat-input-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 12px 8px;
                font-size: 11px;
                color: var(--text-tertiary, #999);
            }
            
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                color: var(--text-secondary, #666);
                font-style: italic;
            }
            
            .typing-dots {
                display: flex;
                gap: 2px;
            }
            
            .typing-dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: var(--text-secondary, #666);
                animation: typing 1.4s infinite;
            }
            
            .typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.4;
                }
                30% {
                    transform: translateY(-10px);
                    opacity: 1;
                }
            }
            
            /* 滚动条样式 */
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: var(--scrollbar-color, #ccc);
                border-radius: 3px;
            }
            
            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-hover, #999);
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .agent-panel {
                    right: 10px;
                    left: 10px;
                    width: auto;
                    top: 60px;
                    height: calc(100vh - 80px);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 面板控制按钮
        this.panel.querySelector('#agent-close-btn').addEventListener('click', () => {
            this.hide();
        });
        
        this.panel.querySelector('#agent-minimize-btn').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        this.panel.querySelector('#agent-settings-btn').addEventListener('click', () => {
            this.showSettings();
        });
        
        // Agent 选择器
        this.panel.querySelector('#agent-select').addEventListener('change', (e) => {
            this.selectAgent(e.target.value);
        });
        
        // 演示按钮
        this.panel.querySelector('#agent-demo-btn').addEventListener('click', () => {
            this.startDemo();
        });
        
        // 聊天输入
        const chatInput = this.panel.querySelector('#chat-input');
        const sendBtn = this.panel.querySelector('#chat-send-btn');
        const clearBtn = this.panel.querySelector('#chat-clear-btn');
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        chatInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResize();
        });
        
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearChat();
        });
        
        // 拖拽功能
        this.setupDragAndDrop();
    }

    /**
     * 设置 Agent API 事件监听
     */
    setupAgentListeners() {
        this.agentAPI.on('agentRegistered', (data) => {
            this.updateAgentSelector();
            this.updateStatus('connected', '已连接');
        });
        
        this.agentAPI.on('agentUnregistered', (data) => {
            this.updateAgentSelector();
        });
        
        this.agentAPI.on('agentActivated', (data) => {
            this.updateStatus('connected', `已连接: ${data.agent.name}`);
        });
        
        this.agentAPI.on('messageProcessed', (data) => {
            this.addMessage('agent', data.response.content);
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
        });
        
        this.agentAPI.on('messageError', (data) => {
            this.addMessage('agent', `错误: ${data.error.message}`);
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
        });
        
        this.agentAPI.on('chatHistoryUpdated', (data) => {
            // 可以在这里同步聊天历史
        });
    }

    /**
     * 显示面板
     */
    show() {
        this.panel.classList.remove('hidden');
        this.isVisible = true;
        
        // 聚焦输入框
        setTimeout(() => {
            this.panel.querySelector('#chat-input').focus();
        }, 100);
    }

    /**
     * 隐藏面板
     */
    hide() {
        this.panel.classList.add('hidden');
        this.isVisible = false;
    }

    /**
     * 切换显示/隐藏
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 切换最小化
     */
    toggleMinimize() {
        this.panel.classList.toggle('minimized');
        this.isExpanded = !this.panel.classList.contains('minimized');
        
        const btn = this.panel.querySelector('#agent-minimize-btn');
        btn.textContent = this.isExpanded ? '−' : '+';
        btn.title = this.isExpanded ? '最小化' : '展开';
    }

    /**
     * 更新 Agent 选择器
     */
    updateAgentSelector() {
        const select = this.panel.querySelector('#agent-select');
        const agents = this.agentAPI.agents;
        
        // 清空现有选项
        select.innerHTML = '<option value="">请选择 Agent</option>';
        
        // 添加 Agent 选项
        for (const [id, agent] of agents) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${agent.name} (${agent.version})`;
            select.appendChild(option);
        }
        
        // 如果有激活的 Agent，选中它
        if (this.agentAPI.activeAgent) {
            select.value = this.agentAPI.activeAgent.id;
        }
    }

    /**
     * 选择 Agent
     */
    selectAgent(agentId) {
        if (!agentId) {
            this.updateStatus('disconnected', '未连接');
            return;
        }
        
        try {
            this.agentAPI.activateAgent(agentId);
            const agent = this.agentAPI.agents.get(agentId);
            this.updateStatus('connected', `已连接: ${agent.name}`);
            
            // 清空欢迎消息
            const welcomeMsg = this.panel.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.style.display = 'none';
            }
            
            // 添加连接消息
            this.addMessage('agent', `您好！我是 ${agent.name}。${agent.description}`);
            
        } catch (error) {
            this.updateStatus('disconnected', '连接失败');
            console.error('激活 Agent 失败:', error);
        }
    }

    /**
     * 更新状态
     */
    updateStatus(status, text) {
        const indicator = this.panel.querySelector('#agent-status-indicator');
        const statusText = this.panel.querySelector('#agent-status-text');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const input = this.panel.querySelector('#chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!this.agentAPI.activeAgent) {
            alert('请先选择一个 Agent');
            return;
        }
        
        // 添加用户消息到界面
        this.addMessage('user', message);
        
        // 清空输入框
        input.value = '';
        this.updateCharCount();
        this.autoResize();
        
        // 显示输入指示器
        this.showTypingIndicator();
        this.updateStatus('processing', '处理中...');
        
        try {
            // 真正调用Agent的processMessage方法
            const context = this.getAgentContext();
            const response = await this.agentAPI.activeAgent.processMessage(message, context);
            
            // 处理Agent的响应
            if (response) {
                // 添加Agent响应到界面
                this.addMessage('agent', response.content || response.text || '处理完成');
                
                // 执行Agent返回的动作
                if (response.actions && response.actions.length > 0) {
                    for (const action of response.actions) {
                        await this.agentAPI.executeAction(action);
                    }
                }
            }
            
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
            
        } catch (error) {
            console.error('消息处理失败:', error);
            this.addMessage('agent', `错误: ${error.message}`);
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
        }
    }

    /**
     * 添加消息到聊天界面
     */
    addMessage(role, content, timestamp = null) {
        const messagesContainer = this.panel.querySelector('#chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const time = timestamp || new Date().toLocaleTimeString();
        
        let avatar, name;
        if (role === 'system') {
            avatar = '🎯';
            name = '演示系统';
        } else if (role === 'user') {
            avatar = '👤';
            name = '您';
        } else {
            avatar = '🤖';
            name = this.agentAPI.activeAgent?.name || 'Agent';
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar ${role}">${avatar}</div>
                <span class="message-name">${name}</span>
                <span class="message-timestamp">${time}</span>
            </div>
            <div class="message-content">${this.formatMessage(content)}</div>
            <div class="message-actions">
                <button class="action-btn" onclick="navigator.clipboard.writeText('${content.replace(/'/g, "\\'")}')">复制</button>
                ${role === 'agent' ? '<button class="action-btn">重新生成</button>' : ''}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 格式化消息内容
     */
    formatMessage(content) {
        // 处理代码块
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // 处理行内代码
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 处理换行
        content = content.replace(/\n/g, '<br>');
        
        // 处理链接
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }

    /**
     * 显示输入指示器
     */
    showTypingIndicator() {
        const messagesContainer = this.panel.querySelector('#chat-messages');
        
        // 移除现有的输入指示器
        const existing = messagesContainer.querySelector('.typing-indicator');
        if (existing) existing.remove();
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <span>🤖 正在输入</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 隐藏输入指示器
     */
    hideTypingIndicator() {
        const indicator = this.panel.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * 清空聊天记录
     */
    clearChat() {
        if (confirm('确定要清空聊天记录吗？')) {
            const messagesContainer = this.panel.querySelector('#chat-messages');
            messagesContainer.innerHTML = '';
            
            // 清空 Agent API 的聊天历史
            this.agentAPI.clearChatHistory();
            
            // 显示欢迎消息
            const welcomeMsg = this.panel.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.style.display = 'block';
            }
        }
    }

    /**
     * 更新字符计数
     */
    updateCharCount() {
        const input = this.panel.querySelector('#chat-input');
        const counter = this.panel.querySelector('#char-count');
        counter.textContent = input.value.length;
    }

    /**
     * 自动调整输入框高度
     */
    autoResize() {
        const input = this.panel.querySelector('#chat-input');
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    /**
     * 显示设置
     */
    showSettings() {
        // 这里可以打开 Agent 设置对话框
        alert('Agent 设置功能开发中...');
    }

    /**
     * 启动演示功能
     */
    async startDemo() {
        // 确保面板可见
        this.show();
        
        // 自动选择 LaTeX 智能助手
        const latexAgent = Array.from(this.agentAPI.agents.values())
            .find(agent => agent.id === 'latex-assistant');
        
        if (!latexAgent) {
            this.addMessage('system', '❌ LaTeX 智能助手未找到。请确保已正确加载 LaTeX Assistant Agent。');
            return;
        }
        
        // 激活 LaTeX 智能助手
        this.selectAgent('latex-assistant');
        
        // 清空聊天记录
        this.clearChatForDemo();
        
        // 添加演示开始消息
        this.addMessage('system', '🎯 <strong>LaTeX 智能助手演示开始</strong><br><br>我将为您展示以下功能：<br>📝 文件生成<br>📚 引用管理<br>✏️ 内容编辑<br>🔧 编译修复');
        
        // 开始演示序列
        this.runDemoSequence();
    }

    /**
     * 运行演示序列
     */
    async runDemoSequence() {
        const demoSteps = [
            {
                delay: 2000,
                userMessage: '生成一个报告文档，标题是机器学习研究报告',
                description: '📝 演示文档生成功能'
            },
            {
                delay: 4000,
                userMessage: '搜索 Einstein 的文献',
                description: '📚 演示文献搜索功能'
            },
            {
                delay: 4000,
                userMessage: '引用 einstein1905',
                description: '📚 演示引用插入功能'
            },
            {
                delay: 4000,
                userMessage: '生成一个3×4的表格，标题是实验结果',
                description: '📝 演示表格生成功能'
            },
            {
                delay: 4000,
                userMessage: '格式化当前文档',
                description: '✏️ 演示文档格式化功能'
            },
            {
                delay: 4000,
                userMessage: '修复编译错误',
                description: '🔧 演示编译错误修复功能'
            }
        ];

        for (let i = 0; i < demoSteps.length; i++) {
            const step = demoSteps[i];
            
            // 等待指定时间
            await this.delay(step.delay);
            
            // 添加步骤说明
            this.addMessage('system', `<strong>${step.description}</strong>`);
            
            // 等待一下再发送用户消息
            await this.delay(1000);
            
            // 模拟用户输入
            this.simulateUserInput(step.userMessage);
            
            // 等待一下再发送
            await this.delay(1500);
            
            // 发送消息
            await this.sendDemoMessage(step.userMessage);
        }
        
        // 演示结束
        await this.delay(3000);
        this.addMessage('system', '🎉 <strong>演示完成！</strong><br><br>您可以继续与 LaTeX 智能助手对话，体验更多功能。<br><br>支持的命令类型：<br>• 生成文档/章节/表格/公式<br>• 搜索/添加/引用文献<br>• 格式化/编辑内容<br>• 修复编译错误');
    }

    /**
     * 模拟用户输入
     */
    simulateUserInput(message) {
        const input = this.panel.querySelector('#chat-input');
        input.value = '';
        
        // 逐字符输入效果
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < message.length) {
                input.value += message[i];
                i++;
                this.updateCharCount();
            } else {
                clearInterval(typeInterval);
            }
        }, 50);
    }

    /**
     * 发送演示消息
     */
    async sendDemoMessage(message) {
        if (!this.agentAPI.activeAgent) {
            console.error('没有激活的Agent');
            return;
        }
        
        console.log('发送演示消息:', message);
        
        // 添加用户消息到界面
        this.addMessage('user', message);
        
        // 清空输入框
        const input = this.panel.querySelector('#chat-input');
        input.value = '';
        this.updateCharCount();
        
        // 显示输入指示器
        this.showTypingIndicator();
        this.updateStatus('processing', '处理中...');
        
        try {
            // 真正调用Agent的processMessage方法
            const context = this.getAgentContext();
            console.log('Agent上下文:', context);
            
            const response = await this.agentAPI.activeAgent.processMessage(message, context);
            console.log('Agent响应:', response);
            
            // 处理Agent的响应
            if (response) {
                // 添加Agent响应到界面
                this.addMessage('agent', response.content || response.text || '处理完成');
                
                // 执行Agent返回的动作
                if (response.actions && response.actions.length > 0) {
                    console.log('执行动作:', response.actions);
                    for (const action of response.actions) {
                        console.log('执行单个动作:', action);
                        await this.agentAPI.executeAction(action);
                    }
                } else {
                    console.log('没有动作需要执行');
                }
            } else {
                console.log('Agent没有返回响应');
            }
            
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
            
        } catch (error) {
            console.error('演示消息处理失败:', error);
            this.addMessage('agent', `错误: ${error.message}`);
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
        }
    }

    /**
     * 获取Agent上下文信息
     */
    getAgentContext() {
        const context = {
            timestamp: new Date().toISOString(),
            user: 'demo-user',
            session: 'demo-session'
        };

        // 添加当前文件信息
        if (this.agentAPI.ide.currentFile) {
            context.activeFile = {
                path: this.agentAPI.ide.currentFile,
                content: this.agentAPI.ide.editor ? this.agentAPI.ide.editor.getValue() : '',
                language: 'latex'
            };
        }

        // 添加编辑器信息
        if (this.agentAPI.ide.editor) {
            const position = this.agentAPI.ide.editor.getPosition();
            context.editor = {
                position: position,
                selection: this.agentAPI.ide.editor.getSelection(),
                model: this.agentAPI.ide.editor.getModel()
            };
        }

        // 添加项目信息
        context.project = {
            openFiles: Array.from(this.agentAPI.ide.openTabs.keys()),
            currentFile: this.agentAPI.ide.currentFile
        };

        return context;
    }

    /**
     * 清空聊天记录（演示用）
     */
    clearChatForDemo() {
        const messagesContainer = this.panel.querySelector('#chat-messages');
        messagesContainer.innerHTML = '';
        
        // 隐藏欢迎消息
        const welcomeMsg = this.panel.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
        }
    }

    /**
     * 添加系统消息
     */
    addSystemMessage(content) {
        this.addMessage('system', content);
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 设置拖拽功能
     */
    setupDragAndDrop() {
        const header = this.panel.querySelector('.agent-panel-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = this.panel.offsetLeft;
            startTop = this.panel.offsetTop;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.panel.style.left = (startLeft + deltaX) + 'px';
            this.panel.style.top = (startTop + deltaY) + 'px';
            this.panel.style.right = 'auto';
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    /**
     * 销毁面板
     */
    destroy() {
        if (this.panel) {
            this.panel.remove();
        }
        
        const styles = document.getElementById('agent-panel-styles');
        if (styles) {
            styles.remove();
        }
    }
} 