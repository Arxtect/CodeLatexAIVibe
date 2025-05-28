/**
 * Agent 面板插件
 * 提供统一的 Agent 管理和聊天界面
 */
export class AgentPanelPlugin {
    constructor() {
        this.id = 'agent-panel';
        this.name = 'Agent 面板';
        this.description = '提供 AI Agent 的管理和聊天界面';
        this.version = '1.0.0';
        this.type = 'ui';
        this.enabled = true;
        
        // 面板状态
        this.isVisible = false;
        this.isExpanded = true;
        this.chatHistory = [];
        
        // 上下文管理
        this.contextItems = [];
        
        // 插件管理器引用
        this.pluginManager = null;
        this.panel = null;
    }
    
    init(pluginManager) {
        this.pluginManager = pluginManager;
        
        // 设置 Agent 面板引用
        pluginManager.setAgentPanel(this);
        
        // 创建面板
        this.createPanel();
        this.setupEventListeners();
        
        // 注册全局函数
        this.registerGlobalFunctions();
        
        // 自动激活 LaTeX Master Agent
        setTimeout(() => {
            this.autoActivateAgent();
        }, 500);
        
        console.log('Agent 面板插件初始化完成');
    }
    
    /**
     * 创建面板 DOM 结构
     */
    createPanel() {
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
                <!-- 聊天历史 -->
                <div class="chat-container" id="chat-container">
                    <div class="chat-messages" id="chat-messages">
                        <div class="welcome-message">
                            <div class="message-content">
                                <h3>👋 欢迎使用 AI 助手</h3>
                                <p>我可以帮助您：</p>
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
                    <!-- 上下文管理区域 -->
                    <div class="context-manager" id="context-manager">
                        <div class="context-header">
                            <span class="context-title">📎 上下文</span>
                            <div class="context-controls">
                                <button class="btn-context" id="add-file-btn" title="添加文件到上下文">📄 文件</button>
                                <button class="btn-context" id="clear-context-btn" title="清空上下文">🗑️ 清空</button>
                            </div>
                        </div>
                        <div class="context-items" id="context-items">
                            <!-- 上下文项目将在这里显示 -->
                        </div>
                    </div>
                    
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chat-input" 
                            class="chat-input" 
                            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                            rows="1"
                        ></textarea>
                        <div class="chat-input-actions">
                            <button id="chat-new-conversation-btn" class="btn-new-conversation" title="新建对话">
                                <span class="new-conversation-icon">💬</span>
                            </button>
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
        
        // 初始化上下文显示
        this.updateContextDisplay();
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
                background: var(--warning-color, #fd7e14);
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
                background: var(--warning-light, #fff3cd);
                color: var(--warning-dark, #856404);
                border: 1px solid var(--warning-color, #fd7e14);
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
            
            .chat-input-container {
                border-top: 1px solid var(--border-color, #e0e0e0);
                background: white;
            }
            
            .context-manager {
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                background: var(--bg-secondary, #f8f9fa);
                max-height: 200px;
                overflow-y: auto;
            }
            
            .context-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
            }
            
            .context-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary, #666);
            }
            
            .context-controls {
                display: flex;
                gap: 4px;
            }
            
            .btn-context {
                padding: 4px 8px;
                border: 1px solid var(--border-color, #ddd);
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 10px;
                color: var(--text-secondary, #666);
                transition: all 0.2s;
            }
            
            .btn-context:hover {
                background: var(--primary-color, #007bff);
                color: white;
                border-color: var(--primary-color, #007bff);
            }
            
            .context-items {
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .context-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                background: white;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 2px;
            }
            
            .context-item-info {
                flex: 1;
                display: flex;
                align-items: center;
            }
            
            .context-item-compact {
                display: flex;
                align-items: center;
                gap: 6px;
                width: 100%;
            }
            
            .context-type-icon {
                font-size: 14px;
                flex-shrink: 0;
            }
            
            .context-item-name {
                color: var(--text-color, #333);
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
            }
            
            .context-item-preview {
                color: var(--text-secondary, #666);
                font-style: italic;
                max-height: 40px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .context-item-remove {
                background: none;
                border: none;
                color: var(--danger-color, #dc3545);
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 2px;
                font-size: 12px;
            }
            
            .context-item-remove:hover {
                background: var(--danger-color, #dc3545);
                color: white;
            }
            
            .stream-cursor {
                animation: blink 1s infinite;
                color: var(--primary-color, #007bff);
                font-weight: bold;
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
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
            
            .btn-send, .btn-clear, .btn-new-conversation {
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
            
            .btn-new-conversation {
                background: var(--success-color, #28a745);
                color: white;
            }
            
            .btn-new-conversation:hover {
                background: var(--success-dark, #1e7e34);
                transform: scale(1.05);
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
            
            .context-item-remove:hover {
                background: var(--danger-color, #dc3545);
                color: white;
            }
            
            .context-load-more {
                margin-top: 4px;
                padding: 4px 8px;
                border: 1px solid var(--primary-color, #007bff);
                border-radius: 3px;
                background: transparent;
                color: var(--primary-color, #007bff);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
                width: 100%;
            }
            
            .context-load-more:hover {
                background: var(--primary-color, #007bff);
                color: white;
            }
            
            .context-size-info {
                font-size: 10px;
                color: var(--text-tertiary, #999);
                margin-left: 4px;
                padding: 1px 4px;
                background: var(--bg-secondary, #f8f9fa);
                border-radius: 2px;
            }
            
            /* 执行面板样式 */
            .execution-panel {
                margin: 12px 0;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 8px;
                background: var(--bg-color, #ffffff);
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .execution-panel.collapsed .execution-content {
                display: none;
            }
            
            .execution-panel.completed {
                border-color: #28a745;
            }
            
            .execution-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--header-bg, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                cursor: pointer;
                user-select: none;
            }
            
            .execution-header:hover {
                background: var(--hover-bg, #e9ecef);
            }
            
            .execution-header.completed {
                background: #d4edda;
                border-bottom-color: #c3e6cb;
            }
            
            .execution-header.partial-success {
                background: #fff3cd;
                border-bottom-color: #ffeaa7;
            }
            
            .execution-title {
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .execution-progress {
                font-size: 12px;
                color: var(--text-secondary, #666);
                background: var(--bg-secondary, #f8f9fa);
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .execution-toggle {
                font-size: 12px;
                color: var(--text-secondary, #666);
                transition: transform 0.3s ease;
            }
            
            .execution-panel.collapsed .execution-toggle {
                transform: rotate(-90deg);
            }
            
            .execution-content {
                padding: 16px;
            }
            
            .execution-progress-bar {
                width: 100%;
                height: 4px;
                background: var(--bg-secondary, #f8f9fa);
                border-radius: 2px;
                margin-bottom: 16px;
                overflow: hidden;
            }
            
            .execution-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            .execution-steps {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .execution-step {
                display: flex;
                align-items: center;
                padding: 12px;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 6px;
                background: var(--bg-color, #ffffff);
                transition: all 0.3s ease;
            }
            
            .execution-step.executing {
                border-color: #ffc107;
                background: #fff3cd;
            }
            
            .execution-step.success {
                border-color: #28a745;
                background: #d4edda;
            }
            
            .execution-step.error {
                border-color: #dc3545;
                background: #f8d7da;
            }
            
            .execution-step .step-status {
                margin-right: 12px;
                font-size: 16px;
            }
            
            .execution-step .step-status.executing {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .execution-step .step-description {
                flex: 1;
                font-weight: 500;
                color: var(--text-color, #333);
            }
            
            .char-count {
                font-size: 11px;
                color: var(--text-secondary, #666);
            }
            
            /* 工具调用面板样式 */
            .tool-call-panel {
                margin: 12px 0;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 8px;
                background: var(--bg-color, #ffffff);
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .tool-call-panel.collapsed .tool-call-content {
                display: none;
            }
            
            .tool-call-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--header-bg, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                cursor: pointer;
                user-select: none;
            }
            
            .tool-call-header:hover {
                background: var(--hover-bg, #e9ecef);
            }
            
            .tool-call-header.completed {
                background: #d4edda;
                border-bottom-color: #c3e6cb;
            }
            
            .tool-call-title {
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .tool-call-progress {
                font-size: 12px;
                color: var(--text-secondary, #666);
                background: var(--bg-secondary, #f8f9fa);
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .tool-call-toggle {
                font-size: 12px;
                color: var(--text-secondary, #666);
                transition: transform 0.3s ease;
            }
            
            .tool-call-panel.collapsed .tool-call-toggle {
                transform: rotate(-90deg);
            }
            
            .tool-call-content {
                padding: 16px;
            }
            
            .tool-call-progress-bar {
                width: 100%;
                height: 4px;
                background: var(--bg-secondary, #f8f9fa);
                border-radius: 2px;
                margin-bottom: 16px;
                overflow: hidden;
            }
            
            .tool-call-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #0056b3);
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            .tool-call-steps {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .tool-call-step {
                display: flex;
                flex-direction: column;
                padding: 12px;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 6px;
                background: var(--bg-color, #ffffff);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .tool-call-step:hover {
                background: var(--hover-bg, #f8f9fa);
            }
            
            .tool-call-step.executing {
                border-color: #ffc107;
                background: #fff3cd;
            }
            
            .tool-call-step.success {
                border-color: #28a745;
                background: #d4edda;
            }
            
            .tool-call-step.error {
                border-color: #dc3545;
                background: #f8d7da;
            }
            
            .tool-call-step .step-status {
                margin-right: 8px;
                font-size: 14px;
            }
            
            .tool-call-step .step-description {
                flex: 1;
                font-weight: 500;
                color: var(--text-color, #333);
            }
            
            .step-details {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--border-color, #e0e0e0);
                transition: all 0.3s ease;
            }
            
            .step-details.collapsed {
                display: none;
            }
            
            .step-args,
            .step-result {
                margin-bottom: 12px;
            }
            
            .step-args strong,
            .step-result strong {
                display: block;
                margin-bottom: 6px;
                color: var(--text-color, #333);
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .step-args pre,
            .step-result pre {
                background: var(--bg-secondary, #f8f9fa);
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 4px;
                padding: 8px;
                font-size: 11px;
                line-height: 1.4;
                overflow-x: auto;
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            .step-result pre {
                max-height: 200px;
                overflow-y: auto;
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
        
        // 聊天输入
        const chatInput = this.panel.querySelector('#chat-input');
        const sendBtn = this.panel.querySelector('#chat-send-btn');
        const clearBtn = this.panel.querySelector('#chat-clear-btn');
        const newConversationBtn = this.panel.querySelector('#chat-new-conversation-btn');
        
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
        
        newConversationBtn.addEventListener('click', () => {
            this.newConversation();
        });
        
        // 上下文管理按钮
        this.panel.querySelector('#add-file-btn').addEventListener('click', () => {
            this.showFileSelector();
        });
        
        this.panel.querySelector('#clear-context-btn').addEventListener('click', () => {
            this.clearContext();
        });
        
        // 拖拽功能
        this.setupDragAndDrop();
    }
    
    /**
     * 注册全局函数
     */
    registerGlobalFunctions() {
        console.log('注册Agent面板全局函数...');
        window.toggleAgentPanel = () => this.toggle();
        window.showAgentPanel = () => this.show();
        window.hideAgentPanel = () => this.hide();
        window.agentPanel = this;
        
        // 添加全局上下文管理函数
        window.addSelectionToContext = () => this.addSelectionToContext();
        window.addCurrentFileToContext = () => this.addCurrentFileToContext();
        window.addFileToContextByPath = (filePath) => this.addFileToContextByPath(filePath);
        
        // 注册右键菜单项
        this.registerContextMenuItems();
        
        console.log('全局函数注册完成:', {
            toggleAgentPanel: !!window.toggleAgentPanel,
            agentPanel: !!window.agentPanel,
            addSelectionToContext: !!window.addSelectionToContext,
            addCurrentFileToContext: !!window.addCurrentFileToContext,
            addFileToContextByPath: !!window.addFileToContextByPath
        });
    }

    /**
     * 注册右键菜单项
     */
    registerContextMenuItems() {
        if (!window.contextMenuManager) {
            console.warn('ContextMenuManager 未找到，稍后重试...');
            // 延迟注册，等待 ContextMenuManager 初始化
            setTimeout(() => this.registerContextMenuItems(), 500);
            return;
        }

        const contextMenuManager = window.contextMenuManager;

        // AI 上下文相关菜单项
        contextMenuManager.registerMenuItem('add-file-to-context', {
            label: '添加文件到AI上下文',
            icon: '📄',
            contexts: ['file'],
            group: 'ai-context',
            order: 1,
            pluginId: this.id,
            action: (target) => {
                if (target && target.path) {
                    this.addFileToContextByPath(target.path);
                    this.showNotification(`已添加文件到上下文: ${target.path.split('/').pop()}`, 'success');
                }
            },
            condition: (context, target) => context === 'file' && target && target.path
        });

        contextMenuManager.registerMenuItem('add-current-file-to-context', {
            label: '添加当前文件到AI上下文',
            icon: '📄',
            contexts: ['empty', 'folder', 'tab'],
            group: 'ai-context',
            order: 2,
            pluginId: this.id,
            action: () => {
                this.addCurrentFileToContext();
            },
            condition: () => window.ide && window.ide.currentFile
        });

        contextMenuManager.registerMenuItem('add-selection-to-context', {
            label: '添加选中文本到AI上下文',
            icon: '📝',
            contexts: ['tab'],
            group: 'ai-context',
            order: 3,
            pluginId: this.id,
            action: () => {
                this.addSelectionToContext();
            },
            condition: () => {
                // 检查是否有选中的文本
                if (!window.ide || !window.ide.editor) return false;
                const selection = window.ide.editor.getSelection();
                return selection && !selection.isEmpty();
            }
        });

        contextMenuManager.registerMenuItem('show-agent-panel', {
            label: '打开AI助手',
            icon: '🤖',
            contexts: ['file', 'folder', 'empty', 'tab'],
            group: 'ai-panel',
            order: 1,
            separator: true,
            pluginId: this.id,
            action: () => {
                this.show();
            }
        });

        console.log('Agent面板右键菜单项已注册');
    }
    
    /**
     * 自动激活 LaTeX Master Agent
     */
    autoActivateAgent() {
        try {
            const latexAgent = this.pluginManager.getPlugin('latex-master-agent');
            if (latexAgent && latexAgent.enabled !== false) {
                this.pluginManager.activateAgent('latex-master-agent');
                this.updateStatus('connected', `已连接: ${latexAgent.name}`);
                
                // 隐藏欢迎消息
                const welcomeMsg = this.panel.querySelector('.welcome-message');
                if (welcomeMsg) {
                    welcomeMsg.style.display = 'none';
                }
                
                // 添加连接消息
                this.addMessage('agent', `您好！我是 ${latexAgent.name}。${latexAgent.description}`);
            } else {
                this.updateStatus('disconnected', '未找到可用的 Agent');
            }
        } catch (error) {
            console.error('自动激活 Agent 失败:', error);
            this.updateStatus('disconnected', '连接失败');
        }
    }
    
    /**
     * 更新 Agent 列表
     */
    updateAgentList() {
        // 不再需要更新Agent列表，因为我们使用单一Agent
        console.log('Agent列表更新已简化');
    }
    
    /**
     * 选择 Agent
     */
    selectAgent(agentId) {
        // 不再需要手动选择Agent，自动激活
        console.log('Agent选择已简化');
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
        const sendBtn = this.panel.querySelector('#chat-send-btn');
        const message = input.value.trim();
        
        if (!message) return;
        
        const activeAgent = this.pluginManager.getActiveAgent();
        if (!activeAgent) {
            alert('请先选择一个 Agent');
            return;
        }
        
        // 禁用发送按钮和输入框
        sendBtn.disabled = true;
        input.disabled = true;
        sendBtn.style.opacity = '0.6';
        input.style.opacity = '0.6';
        
        // 添加用户消息到界面
        this.addMessage('user', message);
        
        // 清空输入框
        input.value = '';
        this.updateCharCount();
        this.autoResize();
        
        // 显示输入指示器
        this.showTypingIndicator();
        this.updateStatus('processing', '处理中...');
        
        // 创建流式响应的消息容器
        const streamMessageId = this.addStreamMessage('agent');
        
        try {
            // 准备上下文
            const context = {
                contextItems: this.contextItems
            };
            
            // 流处理回调
            const onStream = (chunk, fullContent) => {
                this.updateStreamMessage(streamMessageId, fullContent);
            };
            
            // 调用插件管理器发送消息（支持流处理）
            const response = await this.pluginManager.sendMessageToAgent(message, context, onStream);
            
            // 处理响应
            if (response) {
                // 确保流式消息显示完整内容
                this.updateStreamMessage(streamMessageId, response.content || response.text || '处理完成');
                
                // 执行 Agent 返回的动作并显示执行过程
                if (response.actions && response.actions.length > 0) {
                    const executionId = this.showExecutionPanel(response.actions);
                    
                    for (let i = 0; i < response.actions.length; i++) {
                        const action = response.actions[i];
                        
                        // 更新当前执行的操作
                        this.updateExecutionStep(executionId, i, 'executing', `正在执行: ${this.getActionDescription(action)}`);
                        
                        try {
                            const result = await this.pluginManager.executeAgentAction(action);
                            
                            if (result) {
                                this.updateExecutionStep(executionId, i, 'success', `✅ ${this.getActionDescription(action)}`);
                            } else {
                                this.updateExecutionStep(executionId, i, 'error', `❌ ${this.getActionDescription(action)} (执行失败)`);
                            }
                        } catch (error) {
                            console.error('动作执行失败:', error);
                            this.updateExecutionStep(executionId, i, 'error', `❌ ${this.getActionDescription(action)} (${error.message})`);
                        }
                        
                        // 短暂延迟，让用户看到执行过程
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    
                    // 完成执行
                    this.completeExecution(executionId);
                }
            }
            
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
            
        } catch (error) {
            console.error('消息处理失败:', error);
            this.updateStreamMessage(streamMessageId, `错误: ${error.message}`);
            this.hideTypingIndicator();
            this.updateStatus('connected', '已连接');
        } finally {
            // 重新启用发送按钮和输入框
            sendBtn.disabled = false;
            input.disabled = false;
            sendBtn.style.opacity = '1';
            input.style.opacity = '1';
            input.focus(); // 重新聚焦到输入框
        }
    }
    
    /**
     * 新建对话
     */
    newConversation() {
        // 确认对话框
        if (this.chatHistory.length > 0) {
            const confirmed = confirm('确定要开始新对话吗？这将清空当前的聊天历史和上下文。');
            if (!confirmed) return;
        }
        
        // 清空聊天历史
        this.clearChat();
        
        // 清空上下文
        this.clearContext();
        
        // 显示新对话开始消息
        this.addMessage('system', '🆕 新对话已开始');
        
        // 显示通知
        this.showNotification('新对话已开始，聊天历史和上下文已清空', 'success');
        
        // 聚焦到输入框
        const input = this.panel.querySelector('#chat-input');
        if (input) {
            input.focus();
        }
    }
    
    /**
     * 显示执行面板
     */
    showExecutionPanel(actions) {
        const executionId = 'exec_' + Date.now();
        
        // 构建步骤HTML
        const stepsHtml = actions.map((action, index) => {
            let paramsDisplay = '{}';
            try {
                if (action.params && typeof action.params === 'object') {
                    paramsDisplay = JSON.stringify(action.params, null, 2);
                } else if (action.data && typeof action.data === 'object') {
                    paramsDisplay = JSON.stringify(action.data, null, 2);
                }
            } catch (error) {
                console.error('解析操作参数失败:', error);
                paramsDisplay = String(action.params || action.data || '{}');
            }
            
            return `
                <div class="execution-step" data-step="${index}">
                    <div style="display: flex; align-items: center;">
                        <span class="step-status">⏳</span>
                        <span class="step-description">${this.getActionDescription(action)}</span>
                    </div>
                    <div class="step-details collapsed">
                        <div class="step-args">
                            <strong>操作类型:</strong>
                            <pre>${action.type || '未知'}</pre>
                            <strong>参数:</strong>
                            <pre>${paramsDisplay}</pre>
                        </div>
                        <div class="step-result" style="display: none;">
                            <strong>执行结果:</strong>
                            <pre class="result-content"></pre>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 创建执行面板
        const panel = document.createElement('div');
        panel.className = 'execution-panel';
        panel.id = executionId;
        panel.innerHTML = `
            <div class="execution-header">
                <span class="execution-title">🚀 执行计划</span>
                <span class="execution-progress">0/${actions.length}</span>
                <span class="execution-toggle">▼</span>
            </div>
            <div class="execution-content">
                <div class="execution-progress-bar">
                    <div class="execution-progress-fill" style="width: 0%"></div>
                </div>
                <div class="execution-steps">
                    ${stepsHtml}
                </div>
            </div>
        `;
        
        // 添加点击事件处理
        const header = panel.querySelector('.execution-header');
        header.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });
        
        // 插入到消息容器中
        const messagesContainer = this.panel.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.appendChild(panel);
            // 滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // 添加步骤点击事件
            panel.querySelectorAll('.execution-step').forEach(step => {
                step.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const details = step.querySelector('.step-details');
                    if (details) {
                        details.classList.toggle('collapsed');
                    }
                });
            });
        } else {
            console.error('消息容器未找到');
        }
        
        return executionId;
    }
    
    /**
     * 更新执行步骤状态
     */
    updateExecutionStep(executionId, stepIndex, status, description, result = null) {
        const executionPanel = document.getElementById(executionId);
        if (!executionPanel) {
            console.warn(`执行面板未找到: ${executionId}`);
            return;
        }
        
        const step = executionPanel.querySelector(`[data-step="${stepIndex}"]`);
        if (!step) {
            console.warn(`执行步骤未找到: ${stepIndex}`);
            return;
        }
        
        const statusElement = step.querySelector('.step-status');
        if (!statusElement) {
            console.warn(`状态元素未找到: ${stepIndex}`);
            return;
        }
        
        // 更新状态图标和样式
        step.classList.remove('executing', 'success', 'error');
        switch (status) {
            case 'executing':
                statusElement.textContent = '⚡';
                statusElement.className = 'step-status executing';
                step.classList.add('executing');
                break;
            case 'success':
                statusElement.textContent = '✅';
                statusElement.className = 'step-status success';
                step.classList.add('success');
                break;
            case 'error':
                statusElement.textContent = '❌';
                statusElement.className = 'step-status error';
                step.classList.add('error');
                break;
        }
        
        // 更新描述
        if (description) {
            const descElement = step.querySelector('.step-description');
            if (descElement) {
                descElement.textContent = description;
            }
        }
        
        // 显示执行结果
        if (result !== null) {
            const resultDiv = step.querySelector('.step-result');
            const resultContent = step.querySelector('.result-content');
            if (resultDiv && resultContent) {
                try {
                    const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    resultContent.textContent = resultText;
                    resultDiv.style.display = 'block';
                } catch (error) {
                    resultContent.textContent = String(result);
                    resultDiv.style.display = 'block';
                }
            }
        }
        
        // 更新进度条
        const completedSteps = executionPanel.querySelectorAll('.step-status.success, .step-status.error').length;
        const totalSteps = executionPanel.querySelectorAll('.execution-step').length;
        const progressPercent = (completedSteps / totalSteps) * 100;
        
        const progressFill = executionPanel.querySelector('.execution-progress-fill');
        const progressText = executionPanel.querySelector('.execution-progress');
        
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
        if (progressText) {
            progressText.textContent = `${completedSteps}/${totalSteps}`;
        }
        
        // 滚动到底部
        const messagesContainer = this.panel.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    /**
     * 完成执行
     */
    completeExecution(executionId) {
        const executionPanel = document.getElementById(executionId);
        if (!executionPanel) {
            console.warn(`执行面板未找到: ${executionId}`);
            return;
        }

        const header = executionPanel.querySelector('.execution-header');
        if (!header) {
            console.warn(`执行面板头部未找到: ${executionId}`);
            return;
        }

        const successSteps = executionPanel.querySelectorAll('.step-status.success').length;
        const errorSteps = executionPanel.querySelectorAll('.step-status.error').length;
        const totalSteps = executionPanel.querySelectorAll('.execution-step').length;

        // 更新标题
        const title = header.querySelector('.execution-title');
        if (title) {
            if (errorSteps === 0) {
                title.textContent = `✅ 执行完成 (${totalSteps} 个步骤全部成功)`;
                header.classList.add('completed');
            } else {
                title.textContent = `⚠️ 执行完成 (${successSteps} 成功, ${errorSteps} 失败)`;
                header.classList.add('partial-success');
            }
        }

        // 添加完成状态
        executionPanel.classList.add('completed');

        // 3秒后自动折叠
        setTimeout(() => {
            if (executionPanel.parentNode) {
                executionPanel.classList.add('collapsed');
            }
        }, 3000);
    }
    
    /**
     * 获取操作描述
     */
    getActionDescription(action) {
        if (!action || !action.type) {
            return '未知操作';
        }
        
        const type = action.type;
        const params = action.params || {};
        
        switch (type) {
            case 'create':
                return `📝 创建文件: ${params.path || '未指定'} ${params.content ? `(${params.content.length} 字符)` : ''}`;
            case 'edit':
                if (params.operation === 'replace') {
                    return `🔄 替换内容: ${params.path || '未指定'} (${params.search ? `查找: "${params.search.substring(0, 30)}..."` : '全文替换'})`;
                } else if (params.operation === 'insert') {
                    return `✏️ 插入内容: ${params.path || '未指定'} (行 ${params.line || '?'})`;
                } else if (params.operation === 'append') {
                    return `➕ 追加内容: ${params.path || '未指定'}`;
                } else {
                    return `✏️ 编辑文件: ${params.path || '未指定'}`;
                }
            case 'delete':
                return `🗑️ 删除文件: ${params.path || '未指定'}`;
            case 'move':
                return `📁 移动文件: ${params.from || '未指定'} → ${params.to || '未指定'}`;
            case 'search':
                return `🔍 搜索文件: ${params.path || '所有文件'} (查找: "${params.query || '未指定'}")`;
            case 'compile':
                return `🔨 编译 LaTeX: ${params.path || '当前文件'}`;
            case 'terminal':
                return `⚡ 执行命令: ${params.command || '未指定'}`;
            case 'ui':
                if (params.action === 'showMessage') {
                    return `💬 显示消息: ${params.message || '未指定'}`;
                } else if (params.action === 'openFile') {
                    return `📂 打开文件: ${params.path || '未指定'}`;
                } else if (params.action === 'closeFile') {
                    return `❌ 关闭文件: ${params.path || '未指定'}`;
                } else {
                    return `🖥️ UI 操作: ${params.action || '未指定'}`;
                }
            case 'read':
                return `📖 读取文件: ${params.path || '未指定'}`;
            case 'write':
                return `💾 写入文件: ${params.path || '未指定'} ${params.content ? `(${params.content.length} 字符)` : ''}`;
            case 'open':
                return `📂 打开文件: ${params.path || '未指定'}`;
            case 'close':
                return `❌ 关闭文件: ${params.path || '未指定'}`;
            case 'save':
                return `💾 保存文件: ${params.path || '未指定'}`;
            case 'format':
                return `🎨 格式化文件: ${params.path || '当前文件'}`;
            case 'validate':
                return `✅ 验证文件: ${params.path || '当前文件'}`;
            case 'preview':
                return `👁️ 预览文件: ${params.path || '当前文件'}`;
            case 'backup':
                return `💾 备份文件: ${params.path || '当前文件'}`;
            case 'restore':
                return `🔄 恢复文件: ${params.path || '未指定'}`;
            default:
                // 对于未知的操作类型，尝试从参数中提取有用信息
                const paramInfo = Object.keys(params).length > 0 ? 
                    ` (${Object.keys(params).slice(0, 2).map(key => `${key}: ${String(params[key]).substring(0, 20)}`).join(', ')})` : '';
                return `🔧 ${type}${paramInfo}`;
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
        if (role === 'user') {
            avatar = '👤';
            name = '您';
        } else if (role === 'system') {
            avatar = '🔔';
            name = '系统';
        } else {
            avatar = '🤖';
            const activeAgent = this.pluginManager.getActiveAgent();
            name = activeAgent?.name || 'Agent';
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar ${role}">${avatar}</div>
                <span class="message-name">${name}</span>
                <span class="message-timestamp">${time}</span>
            </div>
            <div class="message-content">${this.formatMessage(content)}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 添加到历史记录
        this.chatHistory.push({
            role: role,
            content: content,
            timestamp: time
        });
    }
    
    /**
     * 格式化消息内容
     */
    formatMessage(content) {
        // 确保内容是字符串
        if (typeof content !== 'string') {
            if (content === null || content === undefined) {
                return '';
            }
            // 如果是对象，尝试提取有用的信息
            if (typeof content === 'object') {
                if (content.content) {
                    content = content.content;
                } else if (content.text) {
                    content = content.text;
                } else {
                    content = JSON.stringify(content, null, 2);
                }
            } else {
                content = String(content);
            }
        }
        
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
        const messagesContainer = this.panel.querySelector('#chat-messages');
        messagesContainer.innerHTML = '';
        
        // 清空历史记录
        this.chatHistory = [];
        
        // 显示欢迎消息
        const welcomeMsg = this.panel.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'block';
        }
    }
    
    /**
     * 显示设置
     */
    async showSettings() {
        const activeAgent = this.pluginManager.getActiveAgent();
        
        if (!activeAgent) {
            alert('请先选择一个 Agent');
            return;
        }
        
        try {
            await this.pluginManager.showPluginConfig(activeAgent.id);
        } catch (error) {
            console.error('显示设置失败:', error);
            alert(`显示设置失败: ${error.message}`);
        }
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
     * 显示 Agent 管理器
     */
    showAgentManager() {
        // 不再需要Agent管理器，因为我们使用单一Agent
        console.log('Agent管理器已简化');
    }
    
    /**
     * 添加 Agent 管理器样式
     */
    addAgentManagerStyles() {
        // 不再需要Agent管理器样式
        console.log('Agent管理器样式已移除');
    }
    
    /**
     * 销毁插件
     */
    destroy() {
        console.log('销毁Agent面板插件...');
        
        // 注销右键菜单项
        if (window.contextMenuManager) {
            window.contextMenuManager.unregisterPluginMenuItems(this.id);
        }
        
        // 移除面板
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        
        // 清理全局函数
        delete window.toggleAgentPanel;
        delete window.showAgentPanel;
        delete window.hideAgentPanel;
        delete window.agentPanel;
        delete window.addSelectionToContext;
        delete window.addCurrentFileToContext;
        delete window.addFileToContextByPath;
        
        // 清理样式
        const styles = document.getElementById('agent-panel-styles');
        if (styles) {
            styles.remove();
        }
        
        console.log('Agent面板插件已销毁');
    }
    
    /**
     * 添加流式消息容器
     */
    addStreamMessage(role) {
        const messagesContainer = this.panel.querySelector('#chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const time = new Date().toLocaleTimeString();
        const messageId = `stream-${Date.now()}`;
        messageDiv.id = messageId;
        
        let avatar, name;
        if (role === 'user') {
            avatar = '👤';
            name = '您';
        } else {
            avatar = '🤖';
            const activeAgent = this.pluginManager.getActiveAgent();
            name = activeAgent?.name || 'Agent';
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar ${role}">${avatar}</div>
                <span class="message-name">${name}</span>
                <span class="message-timestamp">${time}</span>
            </div>
            <div class="message-content stream-content">
                <span class="stream-cursor">▋</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageId;
    }
    
    /**
     * 更新流式消息内容
     */
    updateStreamMessage(messageId, content) {
        const messageDiv = document.getElementById(messageId);
        if (!messageDiv) return;
        
        const contentDiv = messageDiv.querySelector('.message-content');
        if (!contentDiv) return;
        
        // 格式化内容并添加光标
        const formattedContent = this.formatMessage(content);
        contentDiv.innerHTML = formattedContent + '<span class="stream-cursor">▋</span>';
        
        // 滚动到底部
        const messagesContainer = this.panel.querySelector('#chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * 完成流式消息（移除光标）
     */
    finishStreamMessage(messageId, finalContent) {
        const messageDiv = document.getElementById(messageId);
        if (!messageDiv) return;
        
        const contentDiv = messageDiv.querySelector('.message-content');
        if (!contentDiv) return;
        
        // 移除光标，显示最终内容
        contentDiv.innerHTML = this.formatMessage(finalContent);
        contentDiv.classList.remove('stream-content');
        
        // 添加到历史记录
        this.chatHistory.push({
            role: 'agent',
            content: finalContent,
            timestamp: new Date().toLocaleTimeString()
        });
    }
    
    /**
     * 添加选中内容到上下文
     */
    addSelectionToContext() {
        try {
            if (!window.ide || !window.ide.editor) {
                alert('编辑器未初始化');
            return;
        }
        
            const editor = window.ide.editor;
            const selection = editor.getSelection();
            const model = editor.getModel();
            
            if (!selection || selection.isEmpty()) {
                alert('请先选中一些文本');
            return;
        }
        
            const selectedText = model.getValueInRange(selection);
            const fileName = window.ide.currentFile || '未知文件';
            
            if (selectedText.trim()) {
                this.addContextItem({
                    type: 'selection',
                    name: `${fileName} (第${selection.startLineNumber}-${selection.endLineNumber}行)`,
                    content: selectedText,
                    preview: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '')
                });
                
                // 如果面板未显示，显示面板
                if (!this.isVisible) {
                    this.show();
                }
            }
        } catch (error) {
            console.error('添加选中内容失败:', error);
            alert('添加选中内容失败: ' + error.message);
        }
    }
    
    /**
     * 添加当前文件到上下文
     */
    async addCurrentFileToContext() {
        try {
            if (!window.ide || !window.ide.currentFile) {
                // 如果没有当前文件，显示文件选择器
                this.showFileSelector();
                return;
            }
            
            const fileName = window.ide.currentFile;
            let content = '';
            
            if (window.ide.editor && window.ide.editor.getModel()) {
                content = window.ide.editor.getModel().getValue();
            } else if (window.ide.fileSystem) {
                content = await window.ide.fileSystem.readFile(fileName, 'utf8');
            }
            
            // 获取性能设置
            const performanceSettings = window.ide?.settingsManager?.get('performance') || {};
            const maxFileSize = performanceSettings.contextFileLimit || 1024 * 1024; // 1MB 默认
            const previewLength = performanceSettings.previewLength || 2000;
            const enableChunkedLoading = performanceSettings.enableChunkedLoading !== false;
            
            // 检查文件大小，防止内存问题
            if (content.length > maxFileSize) {
                const shouldContinue = confirm(
                    `文件 "${fileName}" 较大 (${Math.round(content.length / 1024)}KB)，` +
                    `超过设置的限制 (${Math.round(maxFileSize / 1024)}KB)。\n\n` +
                    `是否继续添加？建议：选择文件的关键部分而不是整个文件。`
                );
                if (!shouldContinue) {
                    return;
                }
            }
            
            // 创建上下文项目
            const contextItem = {
                type: 'file',
                name: fileName,
                content: content,
                size: content.length,
                truncated: false
            };
            
            // 如果启用分段加载且内容较大，使用分段显示
            if (enableChunkedLoading && content.length > previewLength) {
                const chunkedData = this.createChunkedContent(contextItem, performanceSettings);
                contextItem.chunkedData = chunkedData;
                contextItem.preview = chunkedData.displayContent;
                contextItem.truncated = chunkedData.hasMore;
            } else {
                // 使用简单截断
                contextItem.preview = content.length > previewLength 
                    ? content.substring(0, previewLength) + `\n\n... (文件较大，已截断，总长度: ${content.length} 字符)`
                    : content;
                contextItem.truncated = content.length > previewLength;
            }
            
            this.addContextItem(contextItem);
            
            // 如果面板未显示，显示面板
            if (!this.isVisible) {
                this.show();
            }
        } catch (error) {
            console.error('添加文件失败:', error);
            alert('添加文件失败: ' + error.message);
        }
    }
    
    /**
     * 显示文件选择器（文件树结构）
     */
    async showFileSelector() {
        try {
            const fileTree = await this.buildFileTree();
            
            if (!fileTree || Object.keys(fileTree).length === 0) {
                alert('项目中没有文件');
                return;
            }
            
            const selectedFiles = await this.showFileTreeModal('选择文件', fileTree);
            if (selectedFiles && selectedFiles.length > 0) {
                // 批量添加选中的文件
                for (const filePath of selectedFiles) {
                    await this.addFileToContextByPath(filePath);
                }
                
                if (!this.isVisible) {
                    this.show();
                }
            }
        } catch (error) {
            console.error('显示文件选择器失败:', error);
            alert('显示文件选择器失败: ' + error.message);
        }
    }

    /**
     * 构建文件树结构
     */
    async buildFileTree() {
        const files = await this.getProjectFiles();
        const tree = {};
        
        // 构建树结构
        files.forEach(file => {
            if (file.type !== 'file') return; // 只处理文件
            
            const parts = file.path.split('/').filter(p => p);
            let current = tree;
            
            // 构建路径
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { type: 'directory', children: {}, path: '/' + parts.slice(0, i + 1).join('/') };
                }
                current = current[part].children;
            }
            
            // 添加文件
            const fileName = parts[parts.length - 1];
            current[fileName] = { 
                type: 'file', 
                path: file.path,
                size: file.size || 0
            };
        });
        
        return tree;
    }

    /**
     * 获取项目中的所有文件
     */
    async getProjectFiles() {
        const files = [];
        const visitedPaths = new Set(); // 防止循环引用
        
        try {
            if (!window.ide || !window.ide.fileSystem) {
                console.warn('文件系统未初始化');
                return [];
            }
            
            // 递归获取所有文件，添加深度限制
            await this.scanDirectory('/', files, visitedPaths, 0, 10);
            return files.sort((a, b) => a.path.localeCompare(b.path));
        } catch (error) {
            console.error('扫描文件失败:', error);
            return [];
        }
    }

    /**
     * 扫描目录（用于文件树构建）
     */
    async scanDirectory(dirPath, files, visitedPaths = new Set(), currentDepth = 0, maxDepth = 10) {
        // 防止无限递归
        if (currentDepth >= maxDepth) {
            console.warn(`达到最大扫描深度 ${maxDepth}，停止扫描: ${dirPath}`);
            return;
        }
        
        // 防止循环引用
        const normalizedPath = dirPath.replace(/\/+/g, '/');
        if (visitedPaths.has(normalizedPath)) {
            console.warn(`检测到循环引用，跳过: ${dirPath}`);
            return;
        }
        visitedPaths.add(normalizedPath);
        
        try {
            const entries = await window.ide.fileSystem.readdir(dirPath);
            
            for (const entry of entries) {
                // 跳过隐藏文件和特殊目录
                if (entry.startsWith('.') || entry === 'node_modules' || entry === '__pycache__') {
                    continue;
                }
                
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                
                try {
                    const stats = await window.ide.fileSystem.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        files.push({
                            path: fullPath,
                            type: 'directory',
                            name: entry,
                            size: 0
                        });
                        
                        // 递归扫描子目录，增加深度
                        await this.scanDirectory(fullPath, files, visitedPaths, currentDepth + 1, maxDepth);
                    } else {
                        files.push({
                            path: fullPath,
                            type: 'file',
                            name: entry,
                            size: stats.size || 0,
                            extension: this.getFileExtension(entry)
                        });
                    }
                } catch (statError) {
                    console.warn(`无法获取 ${fullPath} 的状态:`, statError);
                }
            }
        } catch (error) {
            console.warn(`无法读取目录 ${dirPath}:`, error);
        } finally {
            // 扫描完成后从访问集合中移除
            visitedPaths.delete(normalizedPath);
        }
    }

    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1) : '';
    }

    /**
     * 显示文件树选择模态框
     */
    async showFileTreeModal(title, fileTree) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'file-tree-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <div class="modal-header-actions">
                                <button class="btn-select-all" id="select-all-btn">全选</button>
                                <button class="btn-clear-all" id="clear-all-btn">清空</button>
                                <button class="modal-close">×</button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <div class="file-tree-container">
                                <div class="file-tree" id="file-tree">
                                    ${this.renderFileTree(fileTree)}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div class="selected-count">
                                已选择 <span id="selected-count">0</span> 个文件
                            </div>
                            <div class="modal-actions">
                                <button class="btn-cancel">取消</button>
                                <button class="btn-confirm" id="confirm-btn">确定</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加样式
            this.addFileTreeStyles();
            
            // 事件处理
            const fileTreeElement = modal.querySelector('#file-tree');
            const selectedCountElement = modal.querySelector('#selected-count');
            const confirmBtn = modal.querySelector('#confirm-btn');
            const selectAllBtn = modal.querySelector('#select-all-btn');
            const clearAllBtn = modal.querySelector('#clear-all-btn');
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.btn-cancel');
            
            let selectedFiles = new Set();
            
            // 更新选中计数
            const updateSelectedCount = () => {
                selectedCountElement.textContent = selectedFiles.size;
                confirmBtn.disabled = selectedFiles.size === 0;
            };
            
            // 文件树点击事件
            fileTreeElement.addEventListener('click', (e) => {
                const item = e.target.closest('.tree-item');
                if (!item) return;
                
                const filePath = item.dataset.path;
                const isFile = item.dataset.type === 'file';
                const toggle = item.querySelector('.tree-toggle');
                
                // 如果点击的是切换按钮
                if (e.target === toggle) {
                    e.preventDefault();
                    
                    if (!isFile && toggle) {
                        // 文件夹：切换展开/折叠
                        const children = item.querySelector('.tree-children');
                        
                        if (children) {
                            const isExpanded = toggle.dataset.expanded === 'true';
                            
                            if (isExpanded) {
                                // 折叠
                                children.style.display = 'none';
                                toggle.textContent = '▶';
                                toggle.dataset.expanded = 'false';
                                item.classList.remove('expanded');
                            } else {
                                // 展开
                                children.style.display = 'block';
                                toggle.textContent = '▼';
                                toggle.dataset.expanded = 'true';
                                item.classList.add('expanded');
                            }
                        }
                    }
                } else if (isFile) {
                    // 文件：切换选中状态（点击整行）
                    e.preventDefault();
                    
                    if (selectedFiles.has(filePath)) {
                        selectedFiles.delete(filePath);
                        item.classList.remove('selected');
                    } else {
                        selectedFiles.add(filePath);
                        item.classList.add('selected');
                    }
                    updateSelectedCount();
                } else if (!isFile) {
                    // 文件夹：点击标签也可以展开/折叠
                    if (toggle) {
                        toggle.click();
                    }
                }
            });
            
            // 全选按钮
            selectAllBtn.addEventListener('click', () => {
                const fileItems = modal.querySelectorAll('.tree-item[data-type="file"]');
                selectedFiles.clear();
                
                fileItems.forEach(item => {
                    const filePath = item.dataset.path;
                    selectedFiles.add(filePath);
                    item.classList.add('selected');
                });
                
                updateSelectedCount();
            });
            
            // 清空按钮
            clearAllBtn.addEventListener('click', () => {
                const fileItems = modal.querySelectorAll('.tree-item[data-type="file"]');
                selectedFiles.clear();
                
                fileItems.forEach(item => {
                    item.classList.remove('selected');
                });
                
                updateSelectedCount();
            });
            
            // 关闭模态框
            const closeModal = () => {
                modal.remove();
                resolve(null);
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // 确定按钮
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(Array.from(selectedFiles));
            });
            
            // 初始化
            updateSelectedCount();
            
            // 添加到页面
            document.body.appendChild(modal);
        });
    }

    /**
     * 渲染文件树
     */
    renderFileTree(tree, level = 0) {
        let html = '';
        
        // 排序：文件夹在前，文件在后
        const entries = Object.entries(tree).sort(([, a], [, b]) => {
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return 0;
        });
        
        for (const [name, item] of entries) {
            const isDirectory = item.type === 'directory';
            const icon = isDirectory ? '📁' : this.getFileIcon(name);
            const hasChildren = isDirectory && Object.keys(item.children || {}).length > 0;
            
            // 为文件添加更明显的样式类
            const itemClass = isDirectory ? 'directory' : 'file';
            const debugInfo = `<!-- ${item.type}: ${name} -->`;
            
            html += `
                ${debugInfo}
                <div class="tree-item ${itemClass}" 
                     data-type="${item.type}" 
                     data-path="${item.path}"
                     data-level="${level}"
                     data-name="${name}">
                    <div class="tree-content tree-level-${level}">
                        ${hasChildren ? 
                            '<span class="tree-toggle" data-expanded="false">▶</span>' : 
                            '<span class="tree-spacer"></span>'
                        }
                        <span class="tree-icon" title="${isDirectory ? '文件夹' : '文件'}">${icon}</span>
                        <span class="tree-label" title="${item.path}">${name}</span>
                        ${!isDirectory && item.size ? 
                            `<span class="tree-size" title="文件大小">${this.formatFileSize(item.size)}</span>` : 
                            ''
                        }
                    </div>
                    ${hasChildren ? `
                        <div class="tree-children" style="display: none;">
                            ${this.renderFileTree(item.children, level + 1)}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return html;
    }

    /**
     * 获取文件图标
     */
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const iconMap = {
            'tex': '📄',
            'latex': '📄', 
            'md': '📝',
            'txt': '📄',
            'js': '📜',
            'json': '⚙️',
            'html': '🌐',
            'css': '🎨',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️',
            'pdf': '📕',
            'zip': '📦',
            'bib': '📚'
        };
        return iconMap[ext] || '📄';
    }
    
    /**
     * 添加上下文项目
     */
    addContextItem(item) {
        // 检查是否已存在相同的项目
        const existing = this.contextItems.find(ctx => 
            ctx.type === item.type && ctx.name === item.name
        );
        
        if (existing) {
            if (confirm('该项目已存在，是否替换？')) {
                this.removeContextItem(existing);
            } else {
                return;
            }
        }
        
        // 添加唯一ID
        item.id = Date.now() + Math.random();
        this.contextItems.push(item);
        
        this.updateContextDisplay();
    }
    
    /**
     * 移除上下文项目
     */
    removeContextItem(item) {
        const index = this.contextItems.findIndex(ctx => ctx.id === item.id);
        if (index > -1) {
            this.contextItems.splice(index, 1);
            this.updateContextDisplay();
        }
    }
    
    /**
     * 清空上下文
     */
    clearContext() {
        if (this.contextItems.length === 0) return;
        
        if (confirm('确定要清空所有上下文吗？')) {
            this.contextItems = [];
            this.updateContextDisplay();
        }
    }
    
    /**
     * 更新上下文显示
     */
    updateContextDisplay() {
        const container = this.panel.querySelector('#context-items');
        
        if (this.contextItems.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 8px; font-size: 12px;">暂无上下文</div>';
            return;
        }
        
        container.innerHTML = this.contextItems.map(item => {
            const compactName = this.getCompactName(item);
            const typeIcon = this.getContextTypeIcon(item.type);
            
            // 检查是否有分段数据
            const hasChunkedData = item.chunkedData && item.chunkedData.hasMore;
            const chunkInfo = item.chunkedData ? 
                `(${item.chunkedData.currentChunk}/${item.chunkedData.totalChunks} 段)` : '';
            
            // 构建加载更多按钮
            const loadMoreButton = hasChunkedData ? 
                `<button class="context-load-more" onclick="window.agentPanel.loadNextChunk('${item.id}')" title="加载下一段内容">
                    📄 加载更多 ${chunkInfo}
                </button>` : '';
            
            // 显示文件大小信息
            const sizeInfo = item.size ? 
                `<span class="context-size-info">${this.formatFileSize(item.size)}</span>` : '';
            
            return `
                <div class="context-item" data-id="${item.id}">
                    <div class="context-item-info">
                        <div class="context-item-compact">
                            <span class="context-type-icon">${typeIcon}</span>
                            <span class="context-item-name">${compactName}</span>
                            ${sizeInfo}
                        </div>
                        ${loadMoreButton}
                    </div>
                    <button class="context-item-remove" onclick="window.agentPanel.removeContextItemById('${item.id}')">×</button>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 获取紧凑的名称显示
     */
    getCompactName(item) {
        switch (item.type) {
            case 'selection':
                // 显示为：文件名:行数-行数
                const match = item.name.match(/^(.+) \(第(\d+)-(\d+)行\)$/);
                if (match) {
                    const [, fileName, startLine, endLine] = match;
                    const shortFileName = fileName.split('/').pop(); // 只显示文件名
                    return `${shortFileName}:${startLine}-${endLine}`;
                }
                return item.name;
            case 'file':
                // 只显示文件名
                return item.name.split('/').pop();
            case 'folder':
                // 显示文件夹名和文件数量
                const folderName = item.name.split('/').pop() || item.name;
                const fileCount = item.files ? item.files.length : 0;
                return `${folderName} (${fileCount}个文件)`;
            default:
                return item.name;
        }
    }
    
    /**
     * 获取上下文类型图标
     */
    getContextTypeIcon(type) {
        const icons = {
            'selection': '📝',
            'file': '📄',
            'folder': '📁'
        };
        return icons[type] || '📄';
    }
    
    /**
     * 根据ID移除上下文项目
     */
    removeContextItemById(id) {
        const item = this.contextItems.find(ctx => ctx.id == id);
        if (item) {
            this.removeContextItem(item);
        }
    }
    
    /**
     * 通过路径添加文件夹到上下文
     */
    async addFolderToContextByPath(folderPath) {
        try {
            if (!folderPath) {
                folderPath = prompt('请输入文件夹路径:', '/');
                if (!folderPath) return;
            }
            
            if (!window.ide || !window.ide.fileSystem) {
                alert('文件系统未初始化');
                return;
            }
            
            const files = await this.scanFolder(folderPath, new Set(), 0, 8);
            const fileList = files.map(f => f.path).join('\n');
            
            this.addContextItem({
                type: 'folder',
                name: folderPath,
                content: fileList,
                preview: `包含 ${files.length} 个文件`,
                files: files
            });
            
            // 如果面板未显示，显示面板
            if (!this.isVisible) {
                this.show();
            }
        } catch (error) {
            console.error('添加文件夹失败:', error);
            alert('添加文件夹失败: ' + error.message);
        }
    }
    
    /**
     * 通过路径添加文件到上下文
     */
    async addFileToContextByPath(filePath) {
        try {
            if (!filePath) {
                alert('文件路径无效');
                return;
            }
            
            if (!window.ide || !window.ide.fileSystem) {
                alert('文件系统未初始化');
                return;
            }
            
            const content = await window.ide.fileSystem.readFile(filePath, 'utf8');
            
            // 检查文件大小
            const maxFileSize = 1024 * 1024; // 1MB 限制
            const maxPreviewLength = 2000; // 预览最大长度
            
            if (content.length > maxFileSize) {
                const shouldContinue = confirm(
                    `文件 "${filePath}" 较大 (${Math.round(content.length / 1024)}KB)，` +
                    `可能影响性能。是否继续添加？\n\n` +
                    `建议：选择文件的关键部分而不是整个文件。`
                );
                if (!shouldContinue) {
                    return;
                }
            }
            
            // 截断过长的内容用于预览
            const truncatedContent = content.length > maxPreviewLength 
                ? content.substring(0, maxPreviewLength) + `\n\n... (文件太大，已截断，总长度: ${content.length} 字符)`
                : content;
            
            this.addContextItem({
                type: 'file',
                name: filePath,
                content: content,
                preview: truncatedContent,
                size: content.length,
                truncated: content.length > maxPreviewLength
            });
            
            // 如果面板未显示，显示面板
            if (!this.isVisible) {
                this.show();
            }
        } catch (error) {
            console.error('添加文件失败:', error);
            alert('添加文件失败: ' + error.message);
        }
    }
    
    /**
     * 扫描文件夹
     */
    async scanFolder(folderPath, visitedPaths = new Set(), currentDepth = 0, maxDepth = 8) {
        const files = [];
        
        // 防止无限递归
        if (currentDepth >= maxDepth) {
            console.warn(`达到最大扫描深度 ${maxDepth}，停止扫描: ${folderPath}`);
            return files;
        }
        
        // 防止循环引用
        const normalizedPath = folderPath.replace(/\/+/g, '/');
        if (visitedPaths.has(normalizedPath)) {
            console.warn(`检测到循环引用，跳过: ${folderPath}`);
            return files;
        }
        visitedPaths.add(normalizedPath);
        
        try {
            const entries = await window.ide.fileSystem.readdir(folderPath);
            
            for (const entry of entries) {
                // 跳过隐藏文件和特殊目录
                if (entry.startsWith('.') || entry === 'node_modules' || entry === '__pycache__') {
                    continue;
                }
                
                const fullPath = folderPath === '/' ? `/${entry}` : `${folderPath}/${entry}`;
                
                try {
                    const stats = await window.ide.fileSystem.stat(fullPath);
                    
                    if (stats.isFile()) {
                        files.push({
                            path: fullPath,
                            name: entry,
                            size: stats.size || 0
                        });
                    } else if (stats.isDirectory()) {
                        // 递归扫描子目录，增加深度
                        const subFiles = await this.scanFolder(fullPath, visitedPaths, currentDepth + 1, maxDepth);
                        files.push(...subFiles);
                    }
                } catch (statError) {
                    console.warn(`无法获取 ${fullPath} 的状态:`, statError);
                }
            }
        } catch (error) {
            console.warn(`无法读取目录 ${folderPath}:`, error);
        } finally {
            // 扫描完成后从访问集合中移除
            visitedPaths.delete(normalizedPath);
        }
        
        return files;
    }
    
    /**
     * 创建分段内容显示组件
     */
    createChunkedContent(item, settings) {
        const chunkSize = settings?.chunkSize || window.ide?.settingsManager?.get('performance')?.chunkSize || 5000;
        const maxChunks = settings?.maxChunksPerFile || window.ide?.settingsManager?.get('performance')?.maxChunksPerFile || 10;
        
        if (!item.content || item.content.length <= chunkSize) {
            // 内容不需要分段
            return {
                displayContent: item.content || '',
                hasMore: false,
                currentChunk: 0,
                totalChunks: 1
            };
        }
        
        // 计算总段数
        const totalChunks = Math.min(Math.ceil(item.content.length / chunkSize), maxChunks);
        
        // 返回第一段内容
        const firstChunk = item.content.substring(0, chunkSize);
        
        return {
            displayContent: firstChunk,
            hasMore: totalChunks > 1,
            currentChunk: 1,
            totalChunks: totalChunks,
            fullContent: item.content,
            chunkSize: chunkSize
        };
    }
    
    /**
     * 加载下一段内容
     */
    loadNextChunk(itemId) {
        const item = this.contextItems.find(ctx => ctx.id == itemId);
        if (!item || !item.chunkedData) {
            return;
        }
        
        const chunkedData = item.chunkedData;
        if (chunkedData.currentChunk >= chunkedData.totalChunks) {
            return; // 已经是最后一段
        }
        
        // 计算下一段的起始和结束位置
        const startPos = chunkedData.currentChunk * chunkedData.chunkSize;
        const endPos = Math.min(startPos + chunkedData.chunkSize, chunkedData.fullContent.length);
        const nextChunk = chunkedData.fullContent.substring(startPos, endPos);
        
        // 更新显示内容
        chunkedData.displayContent += '\n\n' + nextChunk;
        chunkedData.currentChunk++;
        chunkedData.hasMore = chunkedData.currentChunk < chunkedData.totalChunks;
        
        // 更新显示
        this.updateContextDisplay();
        
        // 显示加载提示
        this.showNotification(`已加载第 ${chunkedData.currentChunk} 段，共 ${chunkedData.totalChunks} 段`, 'info');
    }
    
    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        // 根据类型设置背景色
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ffc107';
                notification.style.color = '#212529';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // 添加动画样式（如果还没有）
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes < 1024) {
            return `${bytes}B`;
        } else if (bytes < 1024 * 1024) {
            return `${Math.round(bytes / 1024)}KB`;
        } else {
            return `${Math.round(bytes / (1024 * 1024) * 10) / 10}MB`;
        }
    }

    /**
     * 添加文件树样式
     */
    addFileTreeStyles() {
        if (document.getElementById('file-tree-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'file-tree-styles';
        styles.textContent = `
            .file-tree-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
            }
            
            .file-tree-modal .modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .file-tree-modal .modal-content {
                background: white;
                border-radius: 8px;
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            }
            
            .file-tree-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
                flex-shrink: 0;
            }
            
            .file-tree-modal .modal-header h3 {
                margin: 0;
                color: #333;
                flex: 1;
            }
            
            .modal-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .btn-select-all,
            .btn-clear-all {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                color: #666;
                transition: all 0.2s;
            }
            
            .btn-select-all:hover,
            .btn-clear-all:hover {
                background: #f0f0f0;
                border-color: #ccc;
            }
            
            .file-tree-modal .modal-close {
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
            
            .file-tree-modal .modal-body {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .file-tree-container {
                flex: 1;
                overflow-y: auto;
                padding: 10px 0;
            }
            
            .file-tree {
                padding: 0 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .tree-item {
                margin: 0;
                user-select: none;
                position: relative;
            }
            
            .tree-item:hover .tree-content {
                background: #f5f5f5;
            }
            
            .tree-item.selected .tree-content {
                background: #e3f2fd;
                border: 1px solid #2196f3;
                border-radius: 3px;
            }
            
            .tree-content {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                cursor: pointer;
                transition: background-color 0.2s;
                min-height: 24px;
                border-radius: 3px;
            }
            
            /* 树形层级缩进 */
            .tree-level-0 { padding-left: 6px; }
            .tree-level-1 { padding-left: 22px; }
            .tree-level-2 { padding-left: 38px; }
            .tree-level-3 { padding-left: 54px; }
            .tree-level-4 { padding-left: 70px; }
            .tree-level-5 { padding-left: 86px; }
            .tree-level-6 { padding-left: 102px; }
            .tree-level-7 { padding-left: 118px; }
            .tree-level-8 { padding-left: 134px; }
            .tree-level-9 { padding-left: 150px; }
            
            .tree-toggle {
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #666;
                cursor: pointer;
                transition: transform 0.2s;
                flex-shrink: 0;
                border-radius: 2px;
            }
            
            .tree-toggle:hover {
                background: #e0e0e0;
            }
            
            .tree-spacer {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }
            
            .tree-icon {
                font-size: 14px;
                flex-shrink: 0;
                width: 16px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 16px;
            }
            
            .tree-label {
                flex: 1;
                font-size: 13px;
                color: #333;
                cursor: pointer;
                min-width: 0;
                word-break: break-word;
                padding: 0;
                line-height: 1.3;
                margin: 0;
                display: flex;
                align-items: center;
            }
            
            .tree-size {
                font-size: 11px;
                color: #888;
                opacity: 0.8;
                flex-shrink: 0;
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
            }
            
            .tree-children {
                overflow: hidden;
                transition: all 0.2s ease;
            }
            
            .tree-item.directory .tree-content {
                font-weight: 500;
            }
            
            .tree-item.file .tree-content {
                font-weight: normal;
            }
            
            .tree-item.directory .tree-label {
                color: #1976d2;
                font-weight: 500;
            }
            
            .tree-item.file .tree-label {
                color: #212121;
                font-weight: 400;
            }
            
            .tree-item.file .tree-icon {
                opacity: 0.9;
            }
            
            .tree-item.file .tree-size {
                background: #e8f5e8;
                color: #2e7d32;
                border: 1px solid #c8e6c9;
            }
            
            .file-tree-modal .modal-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-top: 1px solid #eee;
                background: #f8f9fa;
                flex-shrink: 0;
            }
            
            .selected-count {
                font-size: 14px;
                color: #666;
            }
            
            .selected-count span {
                font-weight: bold;
                color: #2196f3;
            }
            
            .modal-actions {
                display: flex;
                gap: 10px;
            }
            
            .btn-cancel,
            .btn-confirm {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: background-color 0.2s;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #5a6268;
            }
            
            .btn-confirm {
                background: #2196f3;
                color: white;
            }
            
            .btn-confirm:hover:not(:disabled) {
                background: #1976d2;
            }
            
            .btn-confirm:disabled {
                background: #ccc;
                cursor: not-allowed;
                opacity: 0.6;
            }
        `;
        document.head.appendChild(styles);
    }

    showToolCallPanel(toolCalls) {
        const toolCallId = 'tool_' + Date.now();
        
        // 创建工具调用面板
        const panel = document.createElement('div');
        panel.className = 'tool-call-panel';
        panel.id = toolCallId;
        
        // 构建步骤HTML
        const stepsHtml = toolCalls.map((toolCall, index) => {
            let argsDisplay = '{}';
            try {
                const args = JSON.parse(toolCall.function.arguments);
                argsDisplay = JSON.stringify(args, null, 2);
            } catch (error) {
                console.error('解析工具调用参数失败:', error);
                argsDisplay = toolCall.function.arguments || '{}';
            }
            
            return `
                <div class="tool-call-step" data-step="${index}">
                    <div style="display: flex; align-items: center;">
                        <span class="step-status">⏳</span>
                        <span class="step-description">${this.getToolCallDescription(toolCall)}</span>
                    </div>
                    <div class="step-details collapsed">
                        <div class="step-args">
                            <strong>函数名:</strong>
                            <pre>${toolCall.function.name}</pre>
                            <strong>参数:</strong>
                            <pre>${argsDisplay}</pre>
                        </div>
                        <div class="step-result" style="display: none;">
                            <strong>结果:</strong>
                            <pre class="result-content"></pre>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        panel.innerHTML = `
            <div class="tool-call-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <span class="tool-call-title">🔧 工具调用</span>
                <span class="tool-call-progress">0/${toolCalls.length}</span>
                <span class="tool-call-toggle">▼</span>
            </div>
            <div class="tool-call-content">
                <div class="tool-call-progress-bar">
                    <div class="tool-call-progress-fill" style="width: 0%"></div>
                </div>
                <div class="tool-call-steps">
                    ${stepsHtml}
                </div>
            </div>
        `;
        
        // 插入到消息容器中
        const messagesContainer = this.panel.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.appendChild(panel);
            // 滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // 添加步骤点击事件
            panel.querySelectorAll('.tool-call-step').forEach(step => {
                step.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const details = step.querySelector('.step-details');
                    if (details) {
                        details.classList.toggle('collapsed');
                    }
                });
            });
        } else {
            console.error('消息容器未找到');
        }
        
        return toolCallId;
    }

    updateToolCallStep(toolCallId, stepIndex, status, result = null) {
        const panel = document.getElementById(toolCallId);
        if (!panel) return;
        
        const step = panel.querySelector(`[data-step="${stepIndex}"]`);
        if (!step) return;
        
        const statusIcon = step.querySelector('.step-status');
        const stepDetails = step.querySelector('.step-details');
        const resultDiv = step.querySelector('.step-result');
        const resultContent = step.querySelector('.result-content');
        
        // 更新状态图标
        switch (status) {
            case 'executing':
                statusIcon.textContent = '⚡';
                statusIcon.className = 'step-status executing';
                step.classList.add('executing');
                break;
            case 'success':
                statusIcon.textContent = '✅';
                statusIcon.className = 'step-status success';
                step.classList.remove('executing');
                step.classList.add('success');
                break;
            case 'error':
                statusIcon.textContent = '❌';
                statusIcon.className = 'step-status error';
                step.classList.remove('executing');
                step.classList.add('error');
                break;
        }
        
        // 显示结果
        if (result && resultDiv && resultContent) {
            resultContent.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
            resultDiv.style.display = 'block';
            
            // 添加点击展开功能
            step.addEventListener('click', () => {
                stepDetails.classList.toggle('collapsed');
            });
        }
        
        // 更新进度
        const completedSteps = panel.querySelectorAll('.tool-call-step.success, .tool-call-step.error').length;
        const totalSteps = panel.querySelectorAll('.tool-call-step').length;
        const progressFill = panel.querySelector('.tool-call-progress-fill');
        const progressText = panel.querySelector('.tool-call-progress');
        
        if (progressFill && progressText) {
            const percentage = (completedSteps / totalSteps) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${completedSteps}/${totalSteps}`;
        }
    }

    completeToolCall(toolCallId) {
        const panel = document.getElementById(toolCallId);
        if (!panel) return;
        
        const header = panel.querySelector('.tool-call-header');
        const title = panel.querySelector('.tool-call-title');
        
        // 更新标题
        title.textContent = '🔧 工具调用完成';
        header.classList.add('completed');
        
        // 3秒后自动折叠
        setTimeout(() => {
            panel.classList.add('collapsed');
        }, 3000);
    }

    getToolCallDescription(toolCall) {
        const functionName = toolCall.function.name;
        let args;
        
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch (error) {
            console.error('解析工具调用参数失败:', error);
            args = {};
        }
        
        switch (functionName) {
            case 'read_file':
                return `📄 读取文件: ${args.file_path || args.path || '未指定'}`;
            case 'write_file':
                return `💾 写入文件: ${args.file_path || args.path || '未指定'} (${args.content ? args.content.length + ' 字符' : '空内容'})`;
            case 'create_file':
                return `📝 创建文件: ${args.file_path || args.path || '未指定'}`;
            case 'delete_file':
                return `🗑️ 删除文件: ${args.file_path || args.path || '未指定'}`;
            case 'list_files':
                return `📁 列出文件: ${args.directory_path || args.path || '/'} ${args.recursive ? '(递归)' : ''}`;
            case 'get_file_structure':
                return `🌳 获取文件结构 (深度: ${args.max_depth || 10})`;
            case 'get_current_file':
                return `📝 获取当前文件信息`;
            case 'get_selection':
                return `✂️ 获取选中文本`;
            case 'get_cursor_position':
                return `📍 获取光标位置`;
            case 'search_in_files':
                return `🔍 搜索: "${args.query || args.search_term || '未指定'}" ${args.file_pattern ? `(${args.file_pattern})` : ''}`;
            case 'get_project_info':
                return `📊 获取项目信息`;
            case 'get_open_tabs':
                return `📑 获取打开的标签页`;
            case 'get_recent_changes':
                return `📈 获取最近变更 (${args.limit || 10}条)`;
            case 'execute_command':
                return `⚡ 执行命令: ${args.command || '未指定'}`;
            case 'open_file':
                return `📂 打开文件: ${args.file_path || args.path || '未指定'}`;
            case 'close_file':
                return `❌ 关闭文件: ${args.file_path || args.path || '未指定'}`;
            case 'save_file':
                return `💾 保存文件: ${args.file_path || args.path || '未指定'}`;
            case 'get_file_content':
                return `📖 获取文件内容: ${args.file_path || args.path || '未指定'}`;
            case 'set_cursor_position':
                return `📍 设置光标位置: 行 ${args.line || '?'}, 列 ${args.column || '?'}`;
            case 'insert_text':
                return `✏️ 插入文本: "${args.text ? args.text.substring(0, 50) + (args.text.length > 50 ? '...' : '') : '空文本'}"`;
            case 'replace_text':
                return `🔄 替换文本: "${args.old_text || '未指定'}" → "${args.new_text || '未指定'}"`;
            case 'get_workspace_info':
                return `🏢 获取工作区信息`;
            case 'compile_latex':
                return `🔨 编译 LaTeX: ${args.file_path || args.path || '当前文件'}`;
            case 'preview_pdf':
                return `👁️ 预览 PDF: ${args.file_path || args.path || '当前文件'}`;
            default:
                // 对于未知的工具调用，尝试从参数中提取有用信息
                const paramInfo = Object.keys(args).length > 0 ? 
                    ` (${Object.keys(args).slice(0, 3).map(key => `${key}: ${String(args[key]).substring(0, 20)}`).join(', ')})` : '';
                return `🔧 ${functionName}${paramInfo}`;
        }
    }
} 