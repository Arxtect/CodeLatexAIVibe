import { AgentPluginBase } from './AgentPluginBase.js';
import { ToolCallManager } from '../core/ToolCallManager.js';

/**
 * LaTeX Master Agent 插件
 * 基于 OpenAI 的智能 LaTeX 助手，类似 Cline/Cursor 的功能
 */
export class LatexMasterAgentPlugin extends AgentPluginBase {
    constructor() {
        super();
        
        this.id = 'latex-master-agent';
        this.name = 'LaTeX Master';
        this.description = '基于 OpenAI 的智能 LaTeX 助手，能够自动分析需求并执行复杂任务';
        this.version = '1.0.0';
        this.capabilities = [
            'intelligent-analysis',
            'auto-planning',
            'multi-step-execution',
            'context-awareness',
            'openai-integration'
        ];
        
        // OpenAI 配置
        this.config = {
            apiKey: '',
            model: 'gpt-4o',
            maxTokens: 4000,
            temperature: 0.7,
            baseURL: 'https://api.openai.com/v1',
            timeout: 30, // 30秒超时（以秒为单位）
            maxRetries: 3,
            customContext: '',
            enableStreaming: true // 默认启用流式响应
        };
        
        // 任务执行状态
        this.currentPlan = null;
        
        // 上下文收集器
        this.contextCollector = new ContextCollector();
        
        // 工具调用管理器
        this.toolCallManager = null;
        
        // **新增：任务控制属性**
        this.shouldPauseTask = false;
        this.currentTaskId = null;
        this.isExecuting = false;
        this.operationHistory = [];
    }
    
    onInit() {
        super.onInit();
        
        // 初始化工具调用管理器
        this.initToolCallManager();
        
        // 注册 Agent 特有的钩子
        this.pluginManager.addHook('agent.message', this.handleAgentMessage.bind(this));
        
        this.log('info', 'LaTeX Master Agent 已初始化');
    }
    
    /**
     * 初始化工具调用管理器
     */
    async initToolCallManager() {
        try {
            if (window.ide) {
                this.toolCallManager = new ToolCallManager(window.ide);
                this.log('info', '工具调用管理器已初始化');
            }
        } catch (error) {
            this.log('warn', '工具调用管理器初始化失败:', error.message);
        }
    }
    
    /**
     * Agent 启用时的回调
     */
    onEnable() {
        super.onEnable();
        this.log('info', 'LaTeX Master Agent 已启用');
    }
    
    /**
     * Agent 禁用时的回调
     */
    onDisable() {
        super.onDisable();
        this.log('info', 'LaTeX Master Agent 已禁用');
    }
    
    /**
     * 检查 Agent 是否可用
     */
    isAvailable() {
        return this.enabled && this.config.apiKey && this.config.apiKey.trim();
    }
    
    /**
     * 获取配置界面
     */
    getConfigUI() {
        return {
            title: '🤖 LaTeX Master 配置',
            fields: [
                {
                    key: 'apiKey',
                    label: 'OpenAI API Key',
                    type: 'password',
                    placeholder: 'sk-...',
                    required: true,
                    description: '您的 OpenAI API 密钥'
                },
                {
                    key: 'model',
                    label: '模型',
                    type: 'select',
                    options: [
                        { value: 'gpt-4o', label: 'GPT-4o (最新)' },
                        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (快速)' },
                        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                        { value: 'gpt-4', label: 'GPT-4' },
                        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                        { value: 'o1-preview', label: 'o1-preview (推理)' },
                        { value: 'o1-mini', label: 'o1-mini (推理)' }
                    ],
                    description: '选择要使用的 OpenAI 模型'
                },
                {
                    key: 'maxTokens',
                    label: '最大 Token 数',
                    type: 'number',
                    min: 100,
                    max: 32000,
                    step: 100,
                    description: '单次请求的最大 token 数量 (100-32000)'
                },
                {
                    key: 'temperature',
                    label: '创造性 (Temperature)',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.1,
                    description: '控制回答的创造性，0=保守，2=非常创新'
                },
                {
                    key: 'baseURL',
                    label: 'API 基础 URL',
                    type: 'url',
                    placeholder: 'https://api.openai.com/v1',
                    description: 'OpenAI API 的基础 URL（支持代理）'
                },
                {
                    key: 'timeout',
                    label: '请求超时 (秒)',
                    type: 'number',
                    min: 5,
                    max: 120,
                    step: 5,
                    description: 'API 请求超时时间 (5-120秒)'
                },
                {
                    key: 'maxRetries',
                    label: '最大重试次数',
                    type: 'number',
                    min: 0,
                    max: 5,
                    step: 1,
                    description: '请求失败时的最大重试次数'
                },
                {
                    key: 'customContext',
                    label: '自定义上下文',
                    type: 'textarea',
                    placeholder: '输入额外的上下文信息，如项目特殊要求、编码规范等...',
                    description: '为 AI 提供额外的上下文信息，帮助生成更准确的回答'
                },
                {
                    key: 'enableStreaming',
                    label: '启用流式响应',
                    type: 'checkbox',
                    description: '开启后 AI 回答将实时显示，提供更流畅的体验'
                }
            ],
            actions: [
                {
                    label: '🔗 测试连接',
                    action: 'testConnection',
                    type: 'secondary'
                },
                {
                    label: '🔄 重置默认',
                    action: 'resetDefaults',
                    type: 'warning'
                }
            ]
        };
    }
    
    /**
     * 验证配置
     */
    validateConfig(config) {
        if (!config.apiKey || !config.apiKey.trim()) {
            throw new Error('请输入 OpenAI API Key');
        }
        
        if (config.maxTokens < 100 || config.maxTokens > 32000) {
            throw new Error('Token 数量必须在 100-32000 之间');
        }
        
        if (config.temperature < 0 || config.temperature > 2) {
            throw new Error('Temperature 必须在 0-2 之间');
        }
        
        if (config.timeout < 5 || config.timeout > 120) {
            throw new Error('超时时间必须在 5-120 秒之间');
        }
        
        if (config.maxRetries < 0 || config.maxRetries > 5) {
            throw new Error('重试次数必须在 0-5 之间');
        }
        
        return true;
    }
    
    /**
     * 处理配置动作
     */
    async handleConfigAction(action, config) {
        switch (action) {
            case 'testConnection':
                return await this.testOpenAIConnection(config);
            case 'resetDefaults':
                return this.getDefaultConfig();
            default:
                throw new Error(`未知的配置动作: ${action}`);
        }
    }
    
    /**
     * 测试 OpenAI 连接
     */
    async testOpenAIConnection(config) {
        try {
            const controller = new AbortController();
            const timeoutMs = (config.timeout || 10) * 1000; // 转换为毫秒
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            const response = await fetch(`${config.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const modelCount = data.data ? data.data.length : 0;
                return { 
                    success: true, 
                    message: `✅ 连接成功！API Key 有效，可访问 ${modelCount} 个模型。` 
                };
            } else {
                const error = await response.json();
                return { 
                    success: false, 
                    message: `❌ 连接失败: ${error.error?.message || response.statusText}` 
                };
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, message: '❌ 连接超时，请检查网络或 API URL' };
            }
            return { success: false, message: `❌ 连接失败: ${error.message}` };
        }
    }
    
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            apiKey: '',
            model: 'gpt-4o',
            maxTokens: 4000,
            temperature: 0.7,
            baseURL: 'https://api.openai.com/v1',
            timeout: 30, // 30秒
            maxRetries: 3,
            customContext: '',
            enableStreaming: true // 默认启用流式响应
        };
    }
    
    /**
     * 处理用户消息的主入口 - 重新设计为灵活的单操作模式
     */
    async processMessage(message, context, onStream = null) {
        try {
            // 检查 Agent 是否启用
            if (!this.enabled) {
                return this.createResponse(
                    '❌ LaTeX Master Agent 已禁用\n\n请在插件管理中启用此 Agent',
                    []
                );
            }
            
            if (!this.config.apiKey) {
                return this.createResponse(
                    '❌ 请先配置 OpenAI API Key\n\n请在插件设置中配置您的 API Key',
                    [this.createUIAction('showPluginConfig', { pluginId: this.id })]
                );
            }
            
            if (this.isExecuting) {
                return this.createResponse('🔄 正在执行任务中，请稍候...');
            }
            
            this.log('info', `开始处理消息: ${message}`);
            
            // **新增：初始化任务状态**
            this.initTaskState();
            
            // 收集初始上下文
            let fullContext = await this.collectContext(message, context);
            
            // 初始化操作历史
            let operationHistory = [];
            let maxOperations = 20; // 最大操作次数
            let operationCount = 0;
            
            while (true) {
                // **新增：检查任务暂停**
                if (this.shouldPauseTask) {
                    this.log('info', '任务被用户暂停');
                    this.resetTaskState();
                    return this.createResponse(
                        `⏸️ 任务已暂停\n\n` +
                        `执行摘要：\n` +
                        `- 总操作次数: ${operationCount}\n` +
                        `- 读操作: ${operationHistory.filter(h => h.operation.type === 'read').length} 次\n` +
                        `- 写操作: ${operationHistory.filter(h => h.operation.type === 'write').length} 次\n\n` +
                        `任务已暂停，可稍后继续。`
                    );
                }
                
                operationCount++;
                this.log('info', `执行操作 ${operationCount}/${maxOperations}`);
                
                // 检查是否达到操作限制
                if (operationCount > maxOperations) {
                    const confirmMessage = `⚠️ 已执行 ${maxOperations} 个操作，任务可能比较复杂。\n\n` +
                        `当前进度：\n` +
                        `- 读操作: ${operationHistory.filter(h => h.operation.type === 'read').length} 次\n` +
                        `- 写操作: ${operationHistory.filter(h => h.operation.type === 'write').length} 次\n\n` +
                        `是否继续执行？`;
                    
                    const shouldContinue = await this.showIterationConfirmDialog(confirmMessage, operationCount);
                    
                    if (!shouldContinue) {
                        this.log('info', '用户选择停止任务');
                        this.resetTaskState();
                        return this.createResponse(
                            `⏹️ 任务已停止\n\n` +
                            `执行摘要：\n` +
                            `- 总操作次数: ${operationCount - 1}\n` +
                            `- 读操作: ${operationHistory.filter(h => h.operation.type === 'read').length} 次\n` +
                            `- 写操作: ${operationHistory.filter(h => h.operation.type === 'write').length} 次\n\n` +
                            `任务可能已部分完成，请检查结果。如需继续，请重新发送请求。`
                        );
                    }
                    
                    // 用户选择继续，重置计数器并增加限制
                    maxOperations += 10;
                    
                    if (onStream) {
                        onStream(`\n🔄 继续执行任务 (操作 ${operationCount})...\n`, '');
                    }
                }
                
                // **重要修复：构建包含累积信息的上下文消息**
                const contextualMessage = this.buildEnhancedContextualMessage(message, fullContext, operationHistory);
                
                // 调用 AI 获取下一个操作
                this.log('info', '请求 AI 选择下一个操作...');
                const response = await this.callOpenAI([
                    { role: 'system', content: this.buildSingleOperationSystemPrompt() },
                    { role: 'user', content: contextualMessage }
                ], onStream);
                
                // 解析 AI 的响应
                const operation = this.parseSingleOperation(response);
                
                if (!operation) {
                    this.log('error', 'AI 响应格式无效');
                    this.resetTaskState();
                    return this.createResponse('❌ AI 响应格式无效，请重试');
                }
                
                // 检查是否任务完成
                if (operation.type === 'complete') {
                    this.log('info', 'AI 决定完成任务');
                    this.resetTaskState();
                    
                    // **新增：添加完成操作到历史**
                    const completeHistoryItem = {
                        operation,
                        result: { success: true, type: 'complete', message: operation.message },
                        timestamp: new Date().toISOString(),
                        operationNumber: operationCount,
                        type: 'complete'
                    };
                    operationHistory.push(completeHistoryItem);
                    this.updateOperationHistoryUI(operationHistory);
                    
                    const finalMessage = `${operation.message || '任务已完成'}\n\n` +
                        `📊 执行摘要：\n` +
                        `- 总操作次数: ${operationCount}\n` +
                        `- 读操作: ${operationHistory.filter(h => h.operation.type === 'read').length} 次\n` +
                        `- 写操作: ${operationHistory.filter(h => h.operation.type === 'write').length} 次`;
                    
                    return this.createResponse(finalMessage);
                }
                
                // **重要修复：检查重复操作**
                const isDuplicateOperation = this.checkDuplicateOperation(operation, operationHistory);
                if (isDuplicateOperation) {
                    this.log('warn', `检测到重复操作: ${operation.type} - ${operation.action}`);
                    
                    // 强制完成任务以避免无限循环
                    this.resetTaskState();
                    return this.createResponse(
                        `⚠️ 检测到重复操作，任务已停止\n\n` +
                        `重复操作: ${operation.action}\n` +
                        `已执行 ${operationCount} 个操作\n\n` +
                        `可能原因：\n` +
                        `- AI未正确理解已获取的信息\n` +
                        `- 操作结果传递存在问题\n\n` +
                        `建议重新发送请求或检查项目状态。`
                    );
                }
                
                // 执行单个操作
                const operationResult = await this.executeSingleOperation(operation, fullContext);
                
                // 将操作结果添加到历史
                const historyItem = {
                    operation,
                    result: operationResult,
                    timestamp: new Date().toISOString(),
                    operationNumber: operationCount,
                    type: operation.type
                };
                operationHistory.push(historyItem);
                
                // **重要修复：更新fullContext以包含所有累积信息**
                if (operation.type === 'read' && operationResult.success) {
                    // 将读操作结果累积到fullContext中
                    fullContext = this.updateContextWithOperationResult(fullContext, operation, operationResult, operationHistory);
                    this.log('info', `上下文已更新，包含操作结果: ${operation.action}`);
                }
                
                // **新增：实时更新操作历史UI**
                this.updateOperationHistoryUI(operationHistory);
                
                this.log('info', `操作 ${operationCount} 完成: ${operation.action} - ${operationResult.success ? '成功' : '失败'}`);
            }
            
        } catch (error) {
            this.handleError(error, 'processMessage');
            this.resetTaskState();
            return this.createResponse(`❌ 处理失败: ${error.message}`);
        }
    }
    
    /**
     * 显示迭代确认对话框
     */
    async showIterationConfirmDialog(message, currentIteration) {
        return new Promise((resolve) => {
            // 创建模态对话框
            const modal = document.createElement('div');
            modal.className = 'iteration-confirm-modal';
            modal.innerHTML = `
                <div class="iteration-confirm-overlay">
                    <div class="iteration-confirm-dialog">
                        <div class="iteration-confirm-header">
                            <h3>🔄 任务处理确认</h3>
                        </div>
                        <div class="iteration-confirm-content">
                            <div class="iteration-confirm-message">${message.replace(/\n/g, '<br>')}</div>
                        </div>
                        <div class="iteration-confirm-actions">
                            <button class="iteration-confirm-btn iteration-confirm-continue">
                                🚀 继续处理
                            </button>
                            <button class="iteration-confirm-btn iteration-confirm-stop">
                                ⏹️ 停止任务
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .iteration-confirm-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                }
                
                .iteration-confirm-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                
                .iteration-confirm-dialog {
                    background: #2d2d30;
                    border: 1px solid #464647;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .iteration-confirm-header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #464647;
                }
                
                .iteration-confirm-header h3 {
                    margin: 0;
                    color: #cccccc;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .iteration-confirm-content {
                    padding: 20px 24px;
                }
                
                .iteration-confirm-message {
                    color: #d4d4d4;
                    line-height: 1.6;
                    font-size: 14px;
                    white-space: pre-wrap;
                }
                
                .iteration-confirm-actions {
                    padding: 16px 24px 24px;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .iteration-confirm-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 120px;
                }
                
                .iteration-confirm-continue {
                    background: #0e639c;
                    color: white;
                }
                
                .iteration-confirm-continue:hover {
                    background: #1177bb;
                    transform: translateY(-1px);
                }
                
                .iteration-confirm-stop {
                    background: #6c757d;
                    color: white;
                }
                
                .iteration-confirm-stop:hover {
                    background: #5a6268;
                    transform: translateY(-1px);
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(modal);
            
            // 绑定事件
            const continueBtn = modal.querySelector('.iteration-confirm-continue');
            const stopBtn = modal.querySelector('.iteration-confirm-stop');
            
            const cleanup = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            };
            
            continueBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            stopBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            // ESC键关闭（默认停止）
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', handleKeydown);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleKeydown);
            
            // 点击遮罩关闭（默认停止）
            modal.querySelector('.iteration-confirm-overlay').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * 大语言模型决策 - 决定下一步是获取信息还是执行操作
     */
    async makeDecision(originalMessage, context, conversationHistory, onStream = null) {
        try {
            this.log('info', '正在进行决策分析...');
            
            const systemPrompt = this.buildDecisionSystemPrompt();
            const userPrompt = this.buildDecisionUserPrompt(originalMessage, context, conversationHistory);
            
            // 临时禁用工具调用，确保AI返回决策JSON格式
            const originalToolCallManager = this.toolCallManager;
            this.toolCallManager = null; // 临时禁用工具调用
            
            try {
                const response = await this.callOpenAI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], null); // 决策阶段不使用流模式
                
                // 恢复工具调用管理器
                this.toolCallManager = originalToolCallManager;
                
                // 处理不同类型的响应
                let responseText = null;
                
                if (typeof response === 'string') {
                    // 直接的文本响应
                    responseText = response;
                } else if (response && typeof response === 'object') {
                    if (response.isToolCallResponse) {
                        // 工具调用响应，提取内容
                        if (response.content && typeof response.content === 'string') {
                            responseText = response.content;
                        } else if (response.content && response.content.content) {
                            responseText = response.content.content;
                        } else {
                            this.log('warn', '工具调用响应格式异常', response);
                            return {
                                type: 'complete_task',
                                message: '❌ 决策响应格式异常，任务已停止',
                                reasoning: '工具调用响应格式异常'
                            };
                        }
                    } else if (response.content) {
                        // 普通对象响应
                        responseText = response.content;
                    } else {
                        this.log('warn', '响应对象格式异常', response);
                        return {
                            type: 'complete_task',
                            message: '❌ 决策响应格式异常，任务已停止',
                            reasoning: '响应对象格式异常'
                        };
                    }
                } else {
                    this.log('warn', '响应格式异常', response);
                    return {
                        type: 'complete_task',
                        message: '❌ 决策响应格式异常，任务已停止',
                        reasoning: '响应格式异常'
                    };
                }
                
                // 解析决策响应
                const decision = this.parseDecisionResponse(responseText);
                
                if (decision) {
                    this.log('info', `决策结果: ${decision.type} - ${decision.reasoning || '无说明'}`);
                    return decision;
                }
                
                this.log('warn', '无法解析决策响应，返回停止任务决策', responseText);
                // 当无法解析决策响应时，返回停止任务的决策
                return {
                    type: 'complete_task',
                    message: '❌ 决策响应格式异常，任务已停止\n\n可能的原因：\n• AI 模型返回了非标准格式的响应\n• 网络连接问题导致响应不完整\n• API 配置问题\n\n建议：\n• 检查网络连接\n• 验证 API Key 配置\n• 尝试重新发送请求',
                    reasoning: '决策响应解析失败，为安全起见停止任务'
                };
                
            } catch (error) {
                // 确保恢复工具调用管理器
                this.toolCallManager = originalToolCallManager;
                throw error;
            }
            
        } catch (error) {
            this.log('error', '决策分析失败', error);
            throw error;
        }
    }
    
    /**
     * 执行信息获取阶段（只读操作）
     */
    async executeGatherInfo(decision, context) {
        this.log('info', `执行信息获取: ${decision.tools?.length || 0} 个工具调用`);
        
        const results = {
            success: true,
            gatheredData: {},
            errors: []
        };
        
        if (!decision.tools || !Array.isArray(decision.tools)) {
            this.log('warn', '信息获取决策中没有工具调用');
            return results;
        }
        
        // 显示工具调用面板
        let toolCallId = null;
        if (window.agentPanel && typeof window.agentPanel.showToolCallPanel === 'function') {
            const toolCalls = decision.tools.map((tool, index) => ({
                id: `gather_${Date.now()}_${index}`,
                function: {
                    name: tool.name,
                    arguments: JSON.stringify(tool.parameters || {})
                }
            }));
            toolCallId = window.agentPanel.showToolCallPanel(toolCalls);
        }
        
        // 执行每个工具调用
        for (let i = 0; i < decision.tools.length; i++) {
            const tool = decision.tools[i];
            
            try {
                this.log('info', `执行信息获取工具 ${i + 1}/${decision.tools.length}: ${tool.name}`);
                
                // 更新工具调用状态
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'executing');
                }
                
                // 验证工具是否为只读操作
                if (!this.isReadOnlyTool(tool.name)) {
                    throw new Error(`工具 ${tool.name} 不是只读操作，信息获取阶段只允许读取操作`);
                }
                
                // 执行工具调用
                const toolCall = {
                    id: `gather_${Date.now()}_${i}`,
                    function: {
                        name: tool.name,
                        arguments: JSON.stringify(tool.parameters || {})
                    }
                };
                
                this.log('info', `执行工具调用: ${tool.name}`, { parameters: tool.parameters });
                
                const result = await this.toolCallManager.executeToolCall(toolCall);
                
                // 详细记录工具调用结果
                console.log(`🔧 工具调用 [${tool.name}] 结果:`, {
                    parameters: tool.parameters,
                    result: result,
                    success: result?.success !== false,
                    resultType: typeof result,
                    resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
                    timestamp: new Date().toISOString()
                });
                
                // 存储结果
                results.gatheredData[tool.name] = result;
                
                // 更新工具调用状态
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'success', result);
                }
                
                this.log('info', `工具 ${tool.name} 执行成功`, { result: result });
                
            } catch (error) {
                this.log('error', `工具 ${tool.name} 执行失败`, error);
                
                results.errors.push({
                    tool: tool.name,
                    error: error.message
                });
                
                // 更新工具调用状态
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'error', { error: error.message });
                }
            }
        }
        
        // 完成工具调用
        if (toolCallId && window.agentPanel && typeof window.agentPanel.completeToolCall === 'function') {
            window.agentPanel.completeToolCall(toolCallId);
        }
        
        results.success = results.errors.length === 0;
        return results;
    }
    
    /**
     * 执行操作阶段（写入/修改操作）
     */
    async executeOperations(decision, context) {
        this.log('info', `执行操作: ${decision.operations?.length || 0} 个操作`);
        
        const results = {
            success: true,
            completedSteps: 0,
            totalSteps: decision.operations?.length || 0,
            errors: []
        };
        
        if (!decision.operations || !Array.isArray(decision.operations)) {
            this.log('warn', '操作决策中没有操作步骤');
            return results;
        }
        
        // 显示执行面板（使用紫色主题的工具调用面板）
        let executionId = null;
        if (window.agentPanel && typeof window.agentPanel.showToolCallPanel === 'function') {
            // 将操作转换为工具调用格式以复用可视化
            const toolCalls = decision.operations.map((op, index) => ({
                id: `exec_${Date.now()}_${index}`,
                function: {
                    name: op.type,
                    arguments: JSON.stringify(op.parameters || {})
                }
            }));
            executionId = window.agentPanel.showToolCallPanel(toolCalls, 'execution');
        }
        
        // 执行每个操作
        for (let i = 0; i < decision.operations.length; i++) {
            const operation = decision.operations[i];
            
            try {
                this.log('info', `执行操作 ${i + 1}/${decision.operations.length}: ${operation.type} - ${operation.description}`);
                
                // 更新执行状态
                if (executionId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(executionId, i, 'executing');
                }
                
                // 验证操作是否为写入操作
                if (!this.isWriteOperation(operation.type)) {
                    throw new Error(`操作 ${operation.type} 不是写入操作，执行阶段只允许写入/修改操作`);
                }
                
                // 创建并执行动作
                const action = await this.createActionFromOperation(operation, context);
                
                if (action) {
                    // 这里应该执行实际的文件操作
                    await this.executeAction(action);
                    results.completedSteps++;
                    
                    // 更新执行状态
                    if (executionId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                        window.agentPanel.updateToolCallStep(executionId, i, 'success', { action: action.type, description: operation.description });
                    }
                    
                    if (executionId && window.agentPanel && typeof window.agentPanel.updateExecutionStep === 'function') {
                        window.agentPanel.updateExecutionStep(executionId, i, 'success', operation.description, { action: action.type });
                    }
                    
                    this.log('info', `操作 ${operation.type} 执行成功`);
                } else {
                    throw new Error(`无法创建操作: ${operation.type}`);
                }
                
            } catch (error) {
                this.log('error', `操作 ${operation.type} 执行失败`, error);
                
                results.errors.push({
                    operation: operation.type,
                    description: operation.description,
                    error: error.message
                });
                
                // 更新执行状态
                if (executionId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(executionId, i, 'error', { error: error.message });
                }
            }
        }
        
        // 完成执行
        if (executionId && window.agentPanel && typeof window.agentPanel.completeToolCall === 'function') {
            window.agentPanel.completeToolCall(executionId);
        }
        
        results.success = results.errors.length === 0;
        return results;
    }
    
    /**
     * 检查工具是否为只读操作
     */
    isReadOnlyTool(toolName) {
        const readOnlyTools = [
            'read_file',
            'list_files', 
            'get_file_structure',
            'search_in_files',
            'get_project_info',
            'get_editor_state',
            'get_current_file',
            'get_selection',
            'get_cursor_position',
            'get_open_tabs',
            'get_recent_changes'
        ];
        
        // 明确排除所有写入工具
        const writeOnlyTools = [
            'write_file',
            'create_file',
            'delete_file',
            'create_directory',
            'delete_directory',
            'move_file',
            'rename_file',
            'compile_latex',
            'save_file',
            'close_file',
            'open_file'
        ];
        
        // 如果是写入工具，直接返回false并记录警告
        if (writeOnlyTools.includes(toolName)) {
            this.log('error', `🚫 严重错误：工具 ${toolName} 是写入操作，绝对不允许在工具调用模式下使用！`);
            console.error(`🚫 AI尝试在工具调用模式下使用写入工具: ${toolName}`);
            return false;
        }
        
        const isReadOnly = readOnlyTools.includes(toolName);
        
        if (!isReadOnly) {
            this.log('warn', `⚠️ 未知工具 ${toolName}，默认不允许在工具调用模式下使用`);
        }
        
        return isReadOnly;
    }
    
    /**
     * 检查操作是否为写入操作
     */
    isWriteOperation(operationType) {
        const writeOperations = [
            'create',
            'edit', 
            'delete',
            'move',
            'compile',
            'mkdir',
            'rmdir'
        ];
        return writeOperations.includes(operationType);
    }
    
    /**
     * 合并上下文信息
     */
    mergeContext(existingContext, newData) {
        const merged = { ...existingContext };
        
        // 处理工具调用结果
        if (newData.toolCallResults) {
            // 保留新的结构，同时也合并到根级别
            merged.toolCallResults = { ...(merged.toolCallResults || {}), ...newData.toolCallResults };
            merged.lastToolCallSummary = newData.lastToolCallSummary;
            
            // 将成功的工具调用结果也合并到根级别，用于兼容旧的读取方式
            Object.keys(newData.toolCallResults).forEach(toolName => {
                const result = newData.toolCallResults[toolName];
                if (result && result.success) {
                    merged[toolName] = result;
                }
            });
        }
        
        // 处理执行结果
        if (newData.executionResults) {
            merged.executionResults = { ...(merged.executionResults || {}), ...newData.executionResults };
            merged.lastExecutionSummary = newData.lastExecutionSummary;
        }
        
        // 处理旧格式的gatheredData（向后兼容）
        if (newData.gatheredData) {
            Object.keys(newData.gatheredData).forEach(key => {
                const data = newData.gatheredData[key];
                if (data && data.success) {
                    merged[key] = data;
                }
            });
        }
        
        return merged;
    }
    
    /**
     * 从操作创建动作
     */
    async createActionFromOperation(operation, context) {
        switch (operation.type) {
            case 'create':
                return this.createCreateAction(operation.target, operation.content || '');
                
            case 'edit':
                return this.createAdvancedEditAction(operation, context);
                
            case 'delete':
                return this.createDeleteAction(operation.target);
                
            case 'move':
                return this.createMoveAction(operation.source, operation.target);
                
            case 'compile':
                return this.createCompileAction(operation.target);
                
            case 'mkdir':
                return this.createMkdirAction(operation.target);
                
            case 'rmdir':
                return this.createRmdirAction(operation.target);
                
            default:
                this.log('warn', `未知的操作类型: ${operation.type}`);
                return null;
        }
    }
    
    /**
     * 执行单个动作
     */
    async executeAction(action) {
        // 兼容不同的动作格式
        const target = action.target || action.data?.filePath || action.data?.target;
        const content = action.content || action.data?.content;
        const source = action.source || action.data?.source;
        
        this.log('info', `执行动作: ${action.type} - ${target || action.description}`);
        
        // 添加调试日志
        console.log('executeAction 调试信息:', {
            actionType: action.type,
            target: target,
            content: content ? `${content.substring(0, 100)}...` : 'null',
            contentLength: content ? content.length : 0,
            actionData: action.data ? Object.keys(action.data) : [],
            actionStructure: Object.keys(action)
        });
        
        // 验证必要参数
        if (!target && action.type !== 'ui') {
            throw new Error(`动作 ${action.type} 缺少目标路径`);
        }
        
        // 验证内容（对于需要内容的操作）
        if ((action.type === 'create' || action.type === 'edit') && !content) {
            console.warn(`警告: ${action.type} 操作没有内容`, {
                target: target,
                actionData: action.data,
                contentSources: {
                    actionContent: action.content,
                    dataContent: action.data?.content
                }
            });
        }
        
        try {
            switch (action.type) {
                case 'create':
                    // 创建文件，自动创建所需目录
                    await this.ensureDirectoryExists(target);
                    await window.ide.fileSystem.writeFile(target, content || '');
                    this.log('info', `文件创建成功: ${target}, 内容长度: ${(content || '').length}`);
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'mkdir':
                    // 创建目录
                    await this.ensureDirectoryExists(target, true);
                    this.log('info', `目录创建成功: ${target}`);
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'edit':
                    // 编辑文件，如果文件不存在则创建
                    const editType = action.editType || action.data?.editType || 'replace';
                    
                    if (editType === 'replace') {
                        await this.ensureDirectoryExists(target);
                        await window.ide.fileSystem.writeFile(target, content || '');
                        this.log('info', `文件编辑成功 (replace): ${target}, 内容长度: ${(content || '').length}`);
                    } else if (editType === 'insert') {
                        // 读取现有内容，插入新内容
                        let existingContent = '';
                        try {
                            existingContent = await window.ide.fileSystem.readFile(target);
                        } catch (error) {
                            // 文件不存在，创建新文件
                            await this.ensureDirectoryExists(target);
                            existingContent = '';
                        }
                        
                        const lines = existingContent.split('\n');
                        const insertLine = action.startLine || action.data?.startLine || lines.length;
                        lines.splice(insertLine, 0, content || '');
                        
                        await window.ide.fileSystem.writeFile(target, lines.join('\n'));
                        this.log('info', `文件编辑成功 (insert): ${target}`);
                    } else if (editType === 'delete') {
                        // 删除指定行
                        const existingContent = await window.ide.fileSystem.readFile(target);
                        const lines = existingContent.split('\n');
                        const startLine = action.startLine || action.data?.startLine || 0;
                        const endLine = action.endLine || action.data?.endLine || startLine;
                        lines.splice(startLine, endLine - startLine + 1);
                        
                        await window.ide.fileSystem.writeFile(target, lines.join('\n'));
                        this.log('info', `文件编辑成功 (delete): ${target}`);
                    }
                    
                    // 如果当前文件正在编辑器中打开，更新编辑器内容
                    if (window.ide.currentFile === target && window.ide.editor) {
                        const updatedContent = await window.ide.fileSystem.readFile(target);
                        window.ide.editor.setValue(updatedContent);
                    }
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'delete':
                    // 删除文件
                    await window.ide.fileSystem.unlink(target);
                    this.log('info', `文件删除成功: ${target}`);
                    
                    // 如果删除的是当前打开的文件，关闭编辑器
                    if (window.ide.currentFile === target) {
                        window.ide.closeFile(target);
                    }
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'rmdir':
                    // 删除目录
                    await window.ide.fileSystem.rmdir(target);
                    this.log('info', `目录删除成功: ${target}`);
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'move':
                    // 移动/重命名文件
                    await this.ensureDirectoryExists(target);
                    await window.ide.fileSystem.rename(source, target);
                    this.log('info', `文件移动成功: ${source} -> ${target}`);
                    
                    // 如果移动的是当前打开的文件，更新编辑器
                    if (window.ide.currentFile === source) {
                        window.ide.currentFile = target;
                        // 更新标签页
                        if (window.ide.updateTabTitle) {
                            window.ide.updateTabTitle(source, target);
                        }
                    }
                    
                    // 强制刷新文件浏览器
                    await this.forceRefreshFileTree();
                    break;
                    
                case 'compile':
                    // 编译 LaTeX 文档
                    this.log('info', `编译 LaTeX 文档: ${target}`);
                    // 这里可以添加实际的编译逻辑
                    break;
                    
                case 'ui':
                    // UI 操作
                    const uiAction = action.action || action.data?.action;
                    const params = action.params || action.data?.params;
                    this.log('info', `执行 UI 操作: ${uiAction}`, params);
                    // 这里可以添加 UI 操作逻辑
                    break;
                    
                default:
                    this.log('warn', `未知的动作类型: ${action.type}`);
                    break;
            }
            
            return true;
        } catch (error) {
            this.log('error', `动作执行失败: ${action.type}`, error);
            throw error;
        }
    }
    
    /**
     * 强制刷新文件树
     */
    async forceRefreshFileTree() {
        try {
            // 方法1：直接调用IDE的刷新方法
            if (window.ide && window.ide.refreshFileExplorer) {
                await window.ide.refreshFileExplorer();
                this.log('info', '文件树刷新成功 (IDE方法)');
            }
            
            // 方法2：触发文件系统更新事件
            if (window.ide && window.ide.fileSystem && window.ide.fileSystem.notifyChange) {
                window.ide.fileSystem.notifyChange();
                this.log('info', '文件系统更新通知已发送');
            }
            
            // 方法3：通过插件管理器刷新
            if (window.pluginManager && window.pluginManager.triggerHook) {
                await window.pluginManager.triggerHook('file-system.refresh');
                this.log('info', '文件系统刷新钩子已触发');
            }
            
            // 方法4：延迟刷新（确保文件操作完成）
            setTimeout(async () => {
                if (window.ide && window.ide.refreshFileExplorer) {
                    try {
                        await window.ide.refreshFileExplorer();
                        this.log('info', '延迟文件树刷新完成');
                    } catch (error) {
                        this.log('warn', '延迟刷新失败', error);
                    }
                }
            }, 500); // 500ms后刷新
            
        } catch (error) {
            this.log('warn', '文件树刷新失败', error);
        }
    }
    
    /**
     * 确保目录存在，如果不存在则创建
     */
    async ensureDirectoryExists(filePath, isDirectory = false) {
        // 验证输入参数
        if (!filePath || typeof filePath !== 'string') {
            this.log('warn', `ensureDirectoryExists: 无效的文件路径: ${filePath}`);
            return;
        }
        
        try {
            let dirPath;
            if (isDirectory) {
                // 如果是目录路径
                dirPath = filePath;
            } else {
                // 如果是文件路径，提取目录部分
                const pathParts = filePath.split('/').filter(part => part !== '');
                pathParts.pop(); // 移除文件名
                dirPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
            }
            
            // 如果是根目录，不需要创建
            if (!dirPath || dirPath === '/' || dirPath === '') {
                return;
            }
            
            // 检查目录是否存在
            try {
                const stats = await window.ide.fileSystem.stat(dirPath);
                if (stats.isDirectory()) {
                    this.log('info', `目录已存在: ${dirPath}`);
                    return; // 目录已存在
                }
            } catch (error) {
                // 目录不存在，需要创建
                this.log('info', `目录不存在，需要创建: ${dirPath}`);
            }
            
            // 递归创建父目录（防止无限递归）
            const pathParts = dirPath.split('/').filter(part => part !== '');
            if (pathParts.length > 1) {
                const parentPath = '/' + pathParts.slice(0, -1).join('/');
                if (parentPath !== dirPath && parentPath !== '/') {
                    await this.ensureDirectoryExists(parentPath, true);
                }
            }
            
            // 创建当前目录
            try {
                await window.ide.fileSystem.mkdir(dirPath);
                this.log('info', `目录创建成功: ${dirPath}`);
            } catch (error) {
                // 如果目录已存在，忽略错误
                if (error.code === 'EEXIST' || error.message.includes('exists')) {
                    this.log('info', `目录已存在（创建时发现）: ${dirPath}`);
                    return;
                }
                throw error;
            }
            
        } catch (error) {
            this.log('error', `创建目录失败: ${filePath}`, error);
            throw error;
        }
    }
    
    /**
     * 收集上下文信息
     */
    async collectContext(message, context) {
        const fullContext = {
            userMessage: message,
            timestamp: new Date().toISOString(),
            ...context
        };
        
        // 项目元数据
        fullContext.project = await this.contextCollector.getProjectMetadata();
        
        // 文件结构
        fullContext.fileStructure = await this.contextCollector.getFileStructure();
        
        // 当前编辑器状态
        fullContext.editor = this.getEditorContext();
        
        // 最近的操作历史
        fullContext.history = this.getRecentHistory(5);
        
        // 处理用户添加的上下文项目
        if (context.contextItems && Array.isArray(context.contextItems)) {
            fullContext.userContextItems = context.contextItems.map(item => ({
                type: item.type,
                name: item.name,
                content: item.content,
                preview: item.preview
            }));
        }
        
        this.log('info', `上下文收集完成: ${Object.keys(fullContext).length} 项`);
        
        return fullContext;
    }
    
    /**
     * 分析任务并生成执行计划（旧版本，保留作为备用）
     * 注意：新的两阶段模式使用 makeDecision 方法
     */
    async analyzeAndPlan(message, context, onStream = null) {
        try {
            this.log('info', '正在分析任务...');
            
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(message, context);
            
            // 根据配置决定是否使用流处理
            const useStreaming = this.config.enableStreaming && onStream;
            
            const response = await this.callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], useStreaming ? onStream : null);
            
            this.log('info', `收到响应类型: ${typeof response}`);
            this.log('info', `收到响应: ${typeof response === 'string' ? response.substring(0, 100) + '...' : JSON.stringify(response).substring(0, 100) + '...'}`);
            
            // 检查响应类型
            if (typeof response === 'object' && response.isToolCallResponse) {
                // 这是工具调用的响应，直接返回
                this.log('info', '工具调用完成，返回最终响应');
                return {
                    isToolCallResponse: true,
                    content: response.content
                };
            }
            
            // 确保response是字符串类型
            const responseText = typeof response === 'string' ? response : JSON.stringify(response);
            
            // 检查是否是任务完成标识符
            if (responseText.trim().startsWith('TASK_COMPLETED:')) {
                this.log('info', '任务已完成');
                return {
                    isTaskCompleted: true,
                    content: responseText.trim()
                };
            }
            
            // 尝试解析为执行计划
            const plan = this.parsePlanResponse(responseText);
            
            if (plan) {
                this.currentPlan = plan;
                this.log('info', `执行计划生成: ${plan.steps.length} 个步骤`);
                plan.steps.forEach((step, i) => {
                    this.log('info', `  ${i + 1}. ${step.description}`);
                });
                return plan;
            }
            
            // 如果既不是工具调用也不是有效计划，返回直接响应
            this.log('info', '返回直接响应（非计划模式）');
            return {
                isDirectResponse: true,
                content: responseText
            };
            
        } catch (error) {
            this.log('error', '任务分析失败', error);
            throw error;
        }
    }
    
    /**
     * 构建系统提示词（旧版本，保留作为备用）
     * 注意：新的两阶段模式使用 buildDecisionSystemPrompt 方法
     */
    buildSystemPrompt() {
        let systemPrompt = `你是 LaTeX Master，一个智能的 LaTeX 文档助手。

**⚠️ 注意：此提示词为旧版本，新版本使用两阶段决策模式**

**🔧 工作模式说明：**

你有两种工作模式：

**1. 工具调用模式（Tool Calling）**
- 当你需要获取项目信息时使用
- 可用工具：read_file, list_files, get_file_structure, search_in_files 等
- 使用场景：用户要求分析现有文件但没有提供文件内容时
- 工具调用完成后，你会收到结果并基于结果生成最终回答

**2. 执行计划模式（Execution Plan）**
- 当你有足够信息执行具体任务时使用
- 生成JSON格式的执行计划，包含具体的操作步骤
- 支持的操作类型：create, edit, delete, move, search, compile, ui

**重要决策规则：**
- 如果用户要求分析、修改现有文件但上下文中没有文件内容 → 使用工具调用获取信息
- 如果有足够信息执行任务 → 生成执行计划
- 如果只需要回答问题或提供建议 → 直接回答

**执行计划中的操作类型（不要与工具调用混淆）：**
1. **create** - 创建新文件
2. **edit** - 编辑现有文件（支持精确的行范围编辑）
3. **delete** - 删除文件
4. **move** - 移动/重命名文件
5. **search** - 搜索文件内容
6. **compile** - 编译 LaTeX 文档
7. **ui** - 用户界面操作

**注意：执行计划中不要使用工具调用类型（如 read_file, list_files 等）！**

当生成执行计划时，请使用以下格式：

\`\`\`json
{
  "analysis": "对用户需求的详细分析",
  "goal": "要达成的具体目标",
  "steps": [
    {
      "id": 1,
      "type": "edit",
      "description": "删除重复内容",
      "target": "/main.tex",
      "content": "新的文件内容",
      "editType": "replace",
      "startLine": 1,
      "endLine": -1,
      "reasoning": "将整个文件内容替换为去重后的版本"
    }
  ],
  "expectedOutcome": "预期的具体结果"
}
\`\`\`

**编辑操作的详细说明：**
- **editType**: "replace" (替换), "insert" (插入), "delete" (删除)
- **startLine**: 起始行号（1开始），-1表示文件末尾
- **endLine**: 结束行号（包含），-1表示文件末尾
- **content**: 新的内容（对于replace和insert）

**示例编辑操作：**
1. 替换整个文件：startLine: 1, endLine: -1, editType: "replace"
2. 删除第5-10行：startLine: 5, endLine: 10, editType: "delete"
3. 在第3行后插入：startLine: 3, endLine: 3, editType: "insert"

注意：
- 分析要准确理解用户意图
- 步骤要详细且可执行
- 考虑 LaTeX 文档的最佳实践
- 确保操作的安全性和合理性
- 对于文件编辑，必须提供具体的行号和内容`;

        // 添加自定义上下文
        if (this.config.customContext && this.config.customContext.trim()) {
            systemPrompt += `\n\n**自定义上下文信息：**\n${this.config.customContext.trim()}`;
        }

        return systemPrompt;
    }
    
    /**
     * 构建用户提示词
     */
    buildUserPrompt(message, context) {
        let prompt = `用户需求: ${message}\n\n`;
        
        // 获取性能设置
        const performanceSettings = window.ide?.settingsManager?.get('performance') || {};
        const maxContextLength = performanceSettings.maxContextLength || 8000;
        const maxItemLength = performanceSettings.maxItemLength || 2000;
        
        let totalLength = prompt.length;
        
        // 添加用户指定的上下文项目
        if (context.userContextItems && context.userContextItems.length > 0) {
            prompt += `用户提供的上下文:\n`;
            context.userContextItems.forEach((item, index) => {
                if (totalLength > maxContextLength) {
                    prompt += `... (上下文过长，已截断)\n`;
                    return;
                }
                
                const itemHeader = `${index + 1}. ${item.type === 'selection' ? '选中文本' : item.type === 'file' ? '文件' : '文件夹'}: ${item.name}\n`;
                prompt += itemHeader;
                totalLength += itemHeader.length;
                
                if (item.content && totalLength < maxContextLength) {
                    // 使用设置中的项目长度限制
                    let content = item.content;
                    if (content.length > maxItemLength) {
                        content = content.substring(0, maxItemLength) + `\n... (内容过长，已截断，原长度: ${item.content.length} 字符)`;
                    }
                    
                    // 检查添加后是否超过总长度限制
                    if (totalLength + content.length > maxContextLength) {
                        const remainingLength = maxContextLength - totalLength - 50; // 留一些余量
                        if (remainingLength > 100) {
                            content = content.substring(0, remainingLength) + '\n... (上下文长度限制，已截断)';
                        } else {
                            prompt += `内容: (因长度限制已跳过)\n\n`;
                            return;
                        }
                    }
                    
                    prompt += `内容:\n${content}\n\n`;
                    totalLength += content.length + 10;
                }
            });
        }
        
        // 添加项目上下文（简化版本）
        if (context.project && totalLength < maxContextLength) {
            const projectInfo = `项目信息: ${context.project.name} (${context.project.files || 0} 个文件)\n\n`;
            if (totalLength + projectInfo.length < maxContextLength) {
                prompt += projectInfo;
                totalLength += projectInfo.length;
            }
        }
        
        // 添加文件结构（截断版本）
        if (context.fileStructure && totalLength < maxContextLength) {
            let fileStructure = context.fileStructure;
            const maxStructureLength = Math.min(1000, maxContextLength - totalLength - 200);
            
            if (fileStructure.length > maxStructureLength) {
                fileStructure = fileStructure.substring(0, maxStructureLength) + '\n... (文件结构过长，已截断)';
            }
            
            if (totalLength + fileStructure.length < maxContextLength) {
                prompt += `文件结构:\n${fileStructure}\n\n`;
                totalLength += fileStructure.length + 20;
            }
        }
        
        // 添加当前编辑器状态（简化版本）
        if (context.editor && context.editor.content && totalLength < maxContextLength) {
            const maxEditorLength = Math.min(500, maxContextLength - totalLength - 200);
            let editorContent = context.editor.content;
            
            if (editorContent.length > maxEditorLength) {
                editorContent = editorContent.substring(0, maxEditorLength) + '\n... (编辑器内容过长，已截断)';
            }
            
            if (totalLength + editorContent.length < maxContextLength) {
                prompt += `当前编辑的文件:\n`;
                prompt += `路径: ${context.editor.filePath}\n`;
                prompt += `内容预览:\n${editorContent}\n\n`;
                totalLength += editorContent.length + 50;
            }
        }
        
        // 添加历史操作（简化版本）
        if (context.history && context.history.length > 0 && totalLength < maxContextLength) {
            const historyText = `最近的操作历史:\n${context.history.slice(0, 3).map((item, i) => `${i + 1}. ${item.description}`).join('\n')}\n\n`;
            
            if (totalLength + historyText.length < maxContextLength) {
                prompt += historyText;
                totalLength += historyText.length;
            }
        }
        
        prompt += '请分析上述信息，生成详细的执行计划。';
        
        // 最终检查长度
        if (prompt.length > maxContextLength) {
            console.warn(`提示词长度 ${prompt.length} 超过设置限制 ${maxContextLength}，已截断`);
            prompt = prompt.substring(0, maxContextLength - 100) + '\n\n... (内容过长，已截断)\n\n请分析上述信息，生成详细的执行计划。';
        }
        
        console.log(`构建的提示词长度: ${prompt.length} 字符 (限制: ${maxContextLength})`);
        return prompt;
    }
    
    /**
     * 调用 OpenAI API（简化版本，用于单操作模式）
     */
    async callOpenAI(messages, onStream = null) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log('info', `OpenAI API 调用尝试 ${attempt + 1}/${this.config.maxRetries + 1}`);
                
                const controller = new AbortController();
                const timeoutMs = this.config.timeout * 1000;
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    this.log('warn', `API 请求超时 (${this.config.timeout}秒)`);
                }, timeoutMs);
                
                // 准备请求体（简化版本，不使用工具调用）
                const requestBody = {
                    model: this.config.model,
                    messages: messages,
                    temperature: this.config.temperature
                };
                
                // 对于 o1 系列模型，不支持某些参数
                if (!this.config.model.startsWith('o1-')) {
                    requestBody.max_tokens = this.config.maxTokens;
                }
                
                // 设置流模式
                if (onStream && this.config.enableStreaming) {
                    requestBody.stream = true;
                    this.log('info', '启用流式响应模式');
                }
                
                const response = await fetch(`${this.config.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'User-Agent': 'LaTeX-Master-Agent/2.0.0'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                    
                    // 检查是否是可重试的错误
                    if (this.isRetryableError(response.status, errorData)) {
                        lastError = new Error(`OpenAI API 错误 (尝试 ${attempt + 1}): ${errorMessage}`);
                        this.log('warn', `可重试错误: ${errorMessage}`);
                        
                        if (attempt < this.config.maxRetries) {
                            const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // 指数退避，最大10秒
                            this.log('info', `等待 ${delay}ms 后重试...`);
                            await this.sleep(delay);
                            continue;
                        }
                    } else {
                        throw new Error(`OpenAI API 错误: ${errorMessage}`);
                    }
                } else {
                    // 处理流式响应
                    if (onStream && requestBody.stream && this.config.enableStreaming) {
                        return await this.handleStreamResponse(response, onStream);
                    } else {
                        // 处理普通响应
                        const data = await response.json();
                        
                        if (!data.choices || !data.choices[0]) {
                            throw new Error('OpenAI API 返回格式异常');
                        }
                        
                        const choice = data.choices[0];
                        
                        if (!choice.message || !choice.message.content) {
                            throw new Error('OpenAI API 返回格式异常');
                        }
                        
                        this.log('info', `API 调用成功，使用了 ${data.usage?.total_tokens || '未知'} tokens`);
                        
                        return choice.message.content;
                    }
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    lastError = new Error(`请求超时 (${this.config.timeout}秒)`);
                    this.log('warn', `请求超时，尝试 ${attempt + 1}/${this.config.maxRetries + 1}`);
                } else {
                    lastError = error;
                    this.log('error', `API 调用失败: ${error.message}`);
                }
                
                // 如果是最后一次尝试，抛出错误
                if (attempt === this.config.maxRetries) {
                    break;
                }
                
                // 等待后重试
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                this.log('info', `等待 ${delay}ms 后重试...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError || new Error('OpenAI API 调用失败');
    }
    
    /**
     * 处理流式响应
     */
    async handleStreamResponse(response, onStream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;
                            
                            if (delta?.content) {
                                fullContent += delta.content;
                                // 调用流处理回调
                                if (onStream) {
                                    onStream(delta.content, fullContent);
                                }
                            }
                        } catch (parseError) {
                            // 忽略解析错误，继续处理下一行
                            continue;
                        }
                    }
                }
            }
            
            this.log('info', `流式 API 调用成功，总长度: ${fullContent.length} 字符`);
            return fullContent;
            
        } finally {
            reader.releaseLock();
        }
    }
    
    /**
     * 检查是否是可重试的错误
     */
    isRetryableError(status, errorData) {
        // 5xx 服务器错误通常可以重试
        if (status >= 500) return true;
        
        // 429 速率限制可以重试
        if (status === 429) return true;
        
        // 某些特定的错误代码可以重试
        const retryableErrorTypes = [
            'server_error',
            'timeout',
            'rate_limit_exceeded',
            'service_unavailable'
        ];
        
        const errorType = errorData.error?.type;
        return retryableErrorTypes.includes(errorType);
    }
    
    /**
     * 睡眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 解析计划响应
     */
    parsePlanResponse(response) {
        try {
            this.log('info', `解析计划响应，长度: ${response.length}`);
            this.log('info', `响应前100字符: ${response.substring(0, 100)}...`);
            
            let jsonText = null;
            
            // 方法1: 尝试提取 ```json 代码块
            const jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n\s*```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1].trim();
                this.log('info', '找到JSON代码块');
            }
            
            // 方法2: 如果没有代码块，尝试查找JSON对象
            if (!jsonText) {
                const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
                if (jsonObjectMatch) {
                    jsonText = jsonObjectMatch[0];
                    this.log('info', '找到JSON对象');
                }
            }
            
            // 方法3: 如果整个响应看起来像JSON，直接使用
            if (!jsonText) {
                const trimmedResponse = response.trim();
                if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
                    jsonText = trimmedResponse;
                    this.log('info', '整个响应是JSON');
                }
            }
            
            if (!jsonText) {
                this.log('warn', '响应中未找到有效的JSON格式');
                this.log('warn', `完整响应: ${response}`);
                return null;
            }
            
            this.log('info', `提取的JSON文本: ${jsonText.substring(0, 200)}...`);
            
            // 解析JSON
            const plan = JSON.parse(jsonText);
            
            // 验证计划格式
            if (!plan.steps || !Array.isArray(plan.steps)) {
                this.log('error', '计划格式无效：缺少 steps 数组');
                this.log('error', `解析的计划对象: ${JSON.stringify(plan, null, 2)}`);
                return null;
            }
            
            this.log('info', `成功解析计划，包含 ${plan.steps.length} 个步骤`);
            return plan;
            
        } catch (error) {
            this.log('error', '计划解析失败', { 
                error: error.message, 
                response: response.substring(0, 500) + '...' 
            });
            return null;
        }
    }
    
    /**
     * 执行计划
     */
    async executePlan(plan, context) {
        try {
            this.isExecuting = true;
            const actions = [];
            let responseText = `🎯 **执行计划**: ${plan.goal}\n\n`;
            responseText += `📋 **分析**: ${plan.analysis}\n\n`;
            
            this.log('info', '开始执行计划...');
            
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i];
                this.log('info', `步骤 ${i + 1}: ${step.description}`);
                
                const action = await this.createActionFromStep(step, context);
                if (action) {
                    actions.push(action);
                    responseText += `✅ **步骤 ${i + 1}**: ${step.description}\n`;
                    
                    // 记录执行历史
                    this.addToHistory(step.description, step.type, step.target);
                } else {
                    responseText += `❌ **步骤 ${i + 1}**: ${step.description} (执行失败)\n`;
                }
            }
            
            responseText += `\n🎉 **预期结果**: ${plan.expectedOutcome}`;
            
            this.log('info', '计划执行完成');
            
            return this.createResponse(responseText, actions);
            
        } catch (error) {
            this.log('error', '计划执行失败', error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }
    
    /**
     * 从步骤创建动作
     */
    async createActionFromStep(step, context) {
        try {
            switch (step.type) {
                case 'create':
                    return this.createCreateAction(step.target, step.content || '');
                    
                case 'edit':
                    return await this.createAdvancedEditAction(step, context);
                    
                case 'delete':
                    return this.createDeleteAction(step.target);
                    
                case 'move':
                    return this.createMoveAction(step.target, step.destination);
                    
                case 'search':
                    return this.createSearchAction(step.target, step.query);
                    
                case 'compile':
                    
                case 'rmdir':
                    return this.createRmdirAction(operation.target);
                    
                case 'ui':
                    return this.createUIAction(step.action || 'showMessage', {
                        message: step.content || step.description
                    });
                
                // 支持工具调用类型的步骤
                case 'list_files':
                case 'read_file':
                case 'get_file_structure':
                case 'search_in_files':
                case 'get_current_file':
                case 'get_selection':
                case 'get_cursor_position':
                case 'get_project_info':
                case 'get_open_tabs':
                case 'get_recent_changes':
                    // 这些是工具调用类型，应该在工具调用阶段处理，不应该出现在执行计划中
                    this.log('warn', `步骤类型 ${step.type} 应该通过工具调用处理，而不是执行计划`);
                    return this.createUIAction('showMessage', {
                        message: `⚠️ 步骤 "${step.description}" 需要通过工具调用处理，请重新生成计划`
                    });
                    
                default:
                    this.log('warn', `未知的步骤类型: ${step.type}`);
                    return this.createUIAction('showMessage', {
                        message: `❌ 未知的步骤类型: ${step.type}`
                    });
            }
        } catch (error) {
            this.log('error', '创建动作失败', error);
            return this.createUIAction('showMessage', {
                message: `❌ 创建动作失败: ${error.message}`
            });
        }
    }
    
    /**
     * 创建高级编辑动作
     */
    async createAdvancedEditAction(step, context) {
        try {
            const filePath = step.target;
            const editType = step.editType || 'replace';
            const startLine = step.startLine || 1;
            const endLine = step.endLine || -1;
            const content = step.content || '';
            
            // 读取当前文件内容（如果需要）
            let currentContent = '';
            try {
                if (window.ide && window.ide.fileSystem) {
                    currentContent = await window.ide.fileSystem.readFile(filePath, 'utf8');
                }
            } catch (error) {
                // 文件可能不存在，这是正常的
                this.log('info', `文件 ${filePath} 不存在或无法读取，将创建新文件`);
            }
            
            const lines = currentContent.split('\n');
            let newContent = '';
            
            switch (editType) {
                case 'replace':
                    if (startLine === 1 && endLine === -1) {
                        // 替换整个文件
                        newContent = content;
                    } else {
                        // 替换指定行范围
                        const actualEndLine = endLine === -1 ? lines.length : endLine;
                        const beforeLines = lines.slice(0, startLine - 1);
                        const afterLines = lines.slice(actualEndLine);
                        newContent = [...beforeLines, content, ...afterLines].join('\n');
                    }
                    break;
                    
                case 'insert':
                    // 在指定行后插入
                    const insertLines = lines.slice(0, startLine);
                    const remainingLines = lines.slice(startLine);
                    newContent = [...insertLines, content, ...remainingLines].join('\n');
                    break;
                    
                case 'delete':
                    // 删除指定行范围
                    const actualEndLineForDelete = endLine === -1 ? lines.length : endLine;
                    const beforeDeleteLines = lines.slice(0, startLine - 1);
                    const afterDeleteLines = lines.slice(actualEndLineForDelete);
                    newContent = [...beforeDeleteLines, ...afterDeleteLines].join('\n');
                    break;
                    
                default:
                    throw new Error(`未知的编辑类型: ${editType}`);
            }
            
            // 创建编辑动作，使用完整的文件替换
            return this.createAction('edit', {
                filePath: filePath,
                content: newContent,  // 修改为content
                editType: editType,
                startLine: startLine,
                endLine: endLine,
                originalContent: currentContent
            });
            
        } catch (error) {
            this.log('error', '创建高级编辑动作失败', error);
            throw error;
        }
    }
    
    /**
     * 创建移动文件动作
     */
    createMoveAction(sourcePath, destinationPath) {
        return this.createAction('move', {
            sourcePath: sourcePath,
            destinationPath: destinationPath
        });
    }
    
    /**
     * 创建搜索动作
     */
    createSearchAction(filePath, query) {
        return this.createAction('search', {
            filePath: filePath,
            query: query
        });
    }
    
    /**
     * 创建编译动作
     */
    createCompileAction(filePath) {
        return this.createAction('compile', {
            filePath: filePath
        });
    }
    

    /**
     * 创建目录动作
     */
    createMkdirAction(dirPath) {
        return {
            type: 'mkdir',
            target: dirPath,
            description: `创建目录: ${dirPath}`,
            timestamp: new Date().toISOString(),
            agentId: this.id
        };
    }

    /**
     * 删除目录动作
     */
    createRmdirAction(dirPath) {
        return {
            type: 'rmdir',
            target: dirPath,
            description: `删除目录: ${dirPath}`,
            timestamp: new Date().toISOString(),
            agentId: this.id
        };
    }
    
    /**
     * 处理 Agent 消息钩子
     */
    async handleAgentMessage(message, context) {
        if (context.targetAgent === this.id) {
            return await this.processMessage(message, context);
        }
    }
    
    onDestroy() {
        super.onDestroy();
        
        // 清理资源
        if (this.contextCollector) {
            this.contextCollector.clearCache();
        }
    }
    
    /**
     * 判断是否需要使用工具
     */
    shouldUseTools(message, conversationMessages = []) {
        if (!message) return false;
        
        // 检查消息中是否包含需要工具调用的关键词
        const toolKeywords = [
            // 文件操作相关
            '读取文件', '查看文件', '获取文件', '文件内容', '文件信息',
            '列出文件', '文件列表', '目录结构', '项目结构', '文件结构',
            
            // 项目分析相关
            '查看项目', '分析项目', '项目概览', '项目信息', '整个项目',
            '所有文件', '全部文件', '项目中的文件',
            
            // 搜索相关
            '搜索', '查找', '检索', '寻找',
            
            // 编辑器状态
            '当前文件', '打开的文件', '编辑器', '正在编辑',
            '选中', '光标', '位置',
            
            // 内容分析和扩展
            '扩写', '扩展', '完善', '补充', '创建', '新建', '改写', '重写',
            '分析', '修改', '优化', '去重', '重复',
            '章节', '内容', '文档',
            
            // 通用请求词
            '帮我', '请', '能否', '可以', '需要',
            
            // LaTeX相关
            'latex', 'tex', '文档', '论文', '报告'
        ];
        
        const lowerMessage = message.toLowerCase();
        const hasToolKeywords = toolKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // 如果消息本身不包含工具关键词，直接返回false
        if (!hasToolKeywords) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> false (无工具关键词)`);
            return false;
        }
        
        // **重要修复：检查是否为初始请求（没有上下文信息的情况）**
        // 如果用户要求查看文件结构或修改文件，但当前没有文件内容，应该使用工具调用
        const needsFileStructure = /文件结构|项目结构|目录结构|查看.*文件|所有文件/.test(lowerMessage);
        const needsFileModification = /改写|重写|修改|扩写|创建.*章节|新建.*文件/.test(lowerMessage);
        
        // 检查当前上下文中是否已有足够的信息
        let hasFileStructure = false;
        let hasFileContents = false;
        let hasProjectInfo = false;
        
        // 检查对话历史中是否已经获取了相关信息
        if (conversationMessages && conversationMessages.length > 0) {
            const userMessages = conversationMessages.filter(msg => msg.role === 'user');
            const lastUserMessage = userMessages[userMessages.length - 1];
            
            if (lastUserMessage && lastUserMessage.content) {
                const content = lastUserMessage.content;
                
                // 检查是否已有文件结构信息
                hasFileStructure = content.includes('📄 **get_file_structure**:') || 
                                 content.includes('📄 **list_files**:') ||
                                 content.includes('项目结构:') ||
                                 content.includes('找到') && content.includes('个文件/目录:');
                
                // 检查是否已有文件内容
                hasFileContents = content.includes('📄 **read_file**:') && content.includes('文件内容:');
                
                // 检查是否已有项目信息
                hasProjectInfo = content.includes('📄 **get_project_info**:');
            }
            
            // 检查工具调用结果
            const toolResults = conversationMessages.filter(msg => msg.role === 'tool');
            
            if (toolResults.length > 0) {
                toolResults.forEach(tr => {
                    try {
                        const result = JSON.parse(tr.content);
                        if (result.success) {
                            if (result.structure || result.files) hasFileStructure = true;
                            if (result.content && result.file_path) hasFileContents = true;
                            if (result.total_files !== undefined) hasProjectInfo = true;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                });
            }
        }
        
        // **核心逻辑：根据用户需求和当前信息状态决定是否需要工具调用**
        
        // 1. 如果用户要求查看文件结构，但没有结构信息
        if (needsFileStructure && !hasFileStructure) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (需要文件结构信息)`);
            return true;
        }
        
        // 2. 如果用户要求修改文件但没有具体的文件内容
        if (needsFileModification && !hasFileContents) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (需要文件内容用于修改)`);
            return true;
        }
        
        // 3. 如果用户提到具体操作但上下文明显不足
        if ((needsFileStructure || needsFileModification) && (!hasFileStructure && !hasFileContents)) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (上下文信息不足)`);
            return true;
        }
        
        // 4. 特殊情况：用户首次请求且需要项目信息
        const isFirstRequest = !conversationMessages || conversationMessages.length <= 2;
        if (isFirstRequest && (needsFileStructure || needsFileModification)) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (首次请求需要项目信息)`);
            return true;
        }
        
        // 5. 如果已经有足够信息，不需要工具调用
        if (hasFileStructure && (needsFileModification ? hasFileContents : true)) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> false (已有足够信息)`);
            return false;
        }
        
        // 6. 检查是否已经有多次工具调用但仍无有效结果
        if (conversationMessages && conversationMessages.length > 0) {
            const toolResults = conversationMessages.filter(msg => msg.role === 'tool');
            if (toolResults.length > 3) { // 如果已经有多次工具调用
                this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> false (已有${toolResults.length}次工具调用结果)`);
                return false;
            }
        }
        
        // 7. 默认情况：如果有工具关键词且信息不足，使用工具调用
        this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (有关键词且需要更多信息)`);
        return true;
    }
    
    /**
     * 处理工具调用
     */
    async handleToolCalls(assistantMessage, conversationMessages, onStream = null) {
        this.log('info', `处理 ${assistantMessage.tool_calls.length} 个工具调用`);
        
        // 添加助手的工具调用消息到对话历史
        conversationMessages.push(assistantMessage);
        
        // 显示工具调用面板
        let toolCallId = null;
        if (window.agentPanel && typeof window.agentPanel.showToolCallPanel === 'function') {
            this.log('info', '显示工具调用面板...');
            toolCallId = window.agentPanel.showToolCallPanel(assistantMessage.tool_calls);
        }
        
        // 执行所有工具调用
        for (let i = 0; i < assistantMessage.tool_calls.length; i++) {
            const toolCall = assistantMessage.tool_calls[i];
            
            try {
                this.log('info', `执行工具调用 ${i + 1}/${assistantMessage.tool_calls.length}: ${toolCall.function.name}`);
                
                // 更新工具调用状态为执行中
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'executing');
                }
                
                // 执行工具调用
                const result = await this.toolCallManager.executeToolCall(toolCall);
                
                this.log('info', `工具调用结果: ${JSON.stringify(result).substring(0, 200)}...`);
                
                // 添加工具调用结果到对话历史
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
                
                // 更新工具调用状态为成功
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'success', result);
                }
                
            } catch (error) {
                this.log('error', `工具调用失败: ${toolCall.function.name}`, error);
                
                // 添加错误结果到对话历史
                const errorResult = {
                    success: false,
                    error: error.message
                };
                
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(errorResult)
                });
                
                // 更新工具调用状态为错误
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'error', errorResult);
                }
            }
        }
        
        // 完成工具调用
        if (toolCallId && window.agentPanel && typeof window.agentPanel.completeToolCall === 'function') {
            window.agentPanel.completeToolCall(toolCallId);
        }
        
        // 再次调用 API 获取最终响应
        this.log('info', '工具调用完成，获取最终响应...');
        const finalResponse = await this.callOpenAI(conversationMessages, onStream);
        
        // 返回标记为工具调用响应的对象
        return {
            isToolCallResponse: true,
            content: finalResponse
        };
    }
    
    /**
     * 构建决策阶段的系统提示词
     */
    buildDecisionSystemPrompt() {
        return `你是 LaTeX Master，一个智能的 LaTeX 文档助手。

**🔧 两阶段工作模式：**

你需要分析用户需求并决定下一步行动。你只能返回以下四种JSON格式之一：

**1. 信息获取阶段（gather_info）**
当你需要更多信息来完成任务时使用。只能使用只读工具：
\`\`\`json
{
  "type": "gather_info",
  "reasoning": "为什么需要获取这些信息",
  "tools": [
    {
      "name": "read_file",
      "parameters": {"file_path": "/path/to/file"}
    },
    {
      "name": "list_files", 
      "parameters": {"directory": "/path/to/dir"}
    },
    {
      "name": "search_in_files",
      "parameters": {"query": "搜索内容", "file_pattern": "*.tex"}
    }
  ]
}
\`\`\`

**可用的只读工具：**
- \`read_file\`: 读取文件内容
- \`list_files\`: 列出目录文件
- \`get_file_structure\`: 获取项目结构
- \`search_in_files\`: 搜索文件内容
- \`get_project_info\`: 获取项目信息
- \`get_editor_state\`: 获取编辑器状态

**2. 执行操作阶段（execute_operations）**
当你有足够信息执行具体任务时使用。只能使用写入操作：
\`\`\`json
{
  "type": "execute_operations",
  "reasoning": "为什么执行这些操作",
  "operations": [
    {
      "type": "create",
      "description": "创建新文件",
      "target": "/path/to/new/file.tex",
      "content": "文件内容"
    },
    {
      "type": "edit",
      "description": "编辑现有文件",
      "target": "/path/to/file.tex",
      "editType": "replace",
      "startLine": 1,
      "endLine": -1,
      "content": "新的文件内容"
    }
  ]
}
\`\`\`

**可用的写入操作：**
- \`create\`: 创建新文件
- \`edit\`: 编辑现有文件（支持replace/insert/delete）
- \`delete\`: 删除文件
- \`move\`: 移动/重命名文件
- \`mkdir\`: 创建目录
- \`rmdir\`: 删除目录
- \`compile\`: 编译LaTeX文档

**3. 任务完成（complete_task）**
当所有任务都已完成时使用：
\`\`\`json
{
  "type": "complete_task",
  "message": "任务完成的总结信息"
}
\`\`\`

**4. 直接响应（direct_response）**
当只需要回答问题而不需要文件操作时使用：
\`\`\`json
{
  "type": "direct_response", 
  "message": "直接回答用户的问题"
}
\`\`\`

**决策规则：**
1. 如果需要查看/分析现有文件但没有文件内容 → gather_info
2. 如果需要搜索特定内容但不知道在哪个文件 → gather_info  
3. 如果有足够信息可以执行具体操作 → execute_operations
4. 如果所有操作都已完成 → complete_task
5. 如果只是回答问题或提供建议 → direct_response

**重要：**
- 每次只返回一种类型的JSON
- 信息获取阶段和执行操作阶段严格分离
- 不要在同一个响应中混合读取和写入操作
- 必须包含reasoning字段说明决策原因`;
    }
    
    /**
     * 构建决策阶段的用户提示词
     */
    buildDecisionUserPrompt(originalMessage, context, conversationHistory) {
        let prompt = `**用户需求：** ${originalMessage}\n\n`;
        
        // 添加当前可用的上下文信息
        prompt += `**当前上下文信息：**\n`;
        
        // 项目信息
        if (context.project) {
            prompt += `- 项目：${context.project.name || '未命名'} (${context.project.files || 0} 个文件)\n`;
        }
        
        // 当前编辑器状态
        if (context.editor && context.editor.filePath) {
            prompt += `- 当前编辑文件：${context.editor.filePath}\n`;
            if (context.editor.content) {
                const preview = context.editor.content.substring(0, 200);
                prompt += `- 文件内容预览：${preview}${context.editor.content.length > 200 ? '...' : ''}\n`;
            }
        }
        
        // 用户提供的上下文
        if (context.userContextItems && context.userContextItems.length > 0) {
            prompt += `- 用户提供的上下文：${context.userContextItems.length} 项\n`;
            context.userContextItems.forEach((item, index) => {
                prompt += `  ${index + 1}. ${item.type}: ${item.name}\n`;
            });
        }
        
        // 已获取的信息
        const gatheredInfo = Object.keys(context).filter(key => 
            ['read_file', 'list_files', 'get_file_structure', 'search_in_files', 'get_project_info'].includes(key)
        );
        if (gatheredInfo.length > 0) {
            prompt += `- 已获取的信息：${gatheredInfo.join(', ')}\n`;
        }
        
        prompt += '\n';
        
        // 添加对话历史
        if (conversationHistory && conversationHistory.length > 0) {
            prompt += `**执行历史：**\n`;
            conversationHistory.forEach((entry, index) => {
                prompt += `${index + 1}. [${entry.type}] `;
                if (entry.type === 'gather_info') {
                    const toolCount = entry.decision.tools?.length || 0;
                    const successCount = Object.keys(entry.result.gatheredData || {}).length;
                    prompt += `获取信息 (${successCount}/${toolCount} 成功)\n`;
                } else if (entry.type === 'execute_operations') {
                    const { completedSteps, totalSteps } = entry.result;
                    prompt += `执行操作 (${completedSteps}/${totalSteps} 完成)\n`;
                }
            });
            prompt += '\n';
        }
        
        prompt += `**请分析上述信息，决定下一步行动。只返回一个JSON对象，不要包含其他文本。**`;
        
        return prompt;
    }
    
    /**
     * 解析决策响应
     */
    parseDecisionResponse(response) {
        if (!response || typeof response !== 'string') {
            this.log('warn', '决策响应为空或格式错误');
            return null;
        }
        
        try {
            // 尝试直接解析JSON
            let jsonStr = response.trim();
            
            // 如果响应包含代码块，提取JSON部分
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            
            // 如果没有代码块，查找第一个完整的JSON对象
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
            }
            
            const decision = JSON.parse(jsonStr);
            
            // 验证决策格式
            if (!decision.type) {
                this.log('warn', '决策响应缺少type字段');
                return null;
            }
            
            const validTypes = ['gather_info', 'execute_operations', 'complete_task', 'direct_response'];
            if (!validTypes.includes(decision.type)) {
                this.log('warn', `无效的决策类型: ${decision.type}`);
                return null;
            }
            
            // 验证特定类型的必需字段
            switch (decision.type) {
                case 'gather_info':
                    if (!decision.tools || !Array.isArray(decision.tools)) {
                        this.log('warn', 'gather_info决策缺少tools数组');
                        return null;
                    }
                    break;
                    
                case 'execute_operations':
                    if (!decision.operations || !Array.isArray(decision.operations)) {
                        this.log('warn', 'execute_operations决策缺少operations数组');
                        return null;
                    }
                    break;
                    
                case 'complete_task':
                case 'direct_response':
                    if (!decision.message) {
                        this.log('warn', `${decision.type}决策缺少message字段`);
                        return null;
                    }
                    break;
            }
            
            this.log('info', `解析决策成功: ${decision.type}`);
            return decision;
            
        } catch (error) {
            this.log('error', '决策响应JSON解析失败', error);
            this.log('debug', '原始响应:', response);
            return null;
        }
    }
    
    /**
     * 构建灵活的系统提示词，让AI自由选择工具调用或执行操作
     */
    buildFlexibleSystemPrompt() {
        return `你是 LaTeX Master，一个智能的 LaTeX 文档助手。

**🔧 工作模式：**

你有两种严格分离的工作模式，绝对不能混合使用：

**1. 工具调用模式（信息获取阶段）**
**用途：** 只能用于获取信息和分析现状
**可用工具：**
- \`read_file\`: 读取文件内容
- \`list_files\`: 列出目录文件
- \`get_file_structure\`: 获取项目结构
- \`search_in_files\`: 搜索文件内容
- \`get_project_info\`: 获取项目信息
- \`get_editor_state\`: 获取编辑器状态

**⚠️ 严格禁止：**
- 绝对不能使用任何文件修改工具（write_file, create_file, delete_file等）
- 不能进行任何写入操作
- 只能读取和分析

**2. 执行操作模式（文件操作阶段）**
**用途：** 执行具体的文件操作和修改
**使用方式：** 在回答中包含 \`\`\`operations 指令块

\`\`\`operations
[
  {
    "type": "create",
    "description": "创建新文件",
    "target": "/path/to/new/file.tex",
    "content": "文件内容"
  },
  {
    "type": "edit",
    "description": "编辑现有文件",
    "target": "/path/to/file.tex",
    "editType": "replace",
    "startLine": 1,
    "endLine": -1,
    "content": "新的文件内容"
  }
]
\`\`\`

**⚠️ JSON格式重要说明：**
LaTeX代码在JSON中必须使用正确的转义：
- LaTeX命令：\`\\\\\\\\chapter{}\` （四个反斜杠）
- 换行符：\`\\\\\\\\n\` （四个反斜杠加n）
- 数学符号：\`\\\\\\\\$\`

**正确示例：**
\`\`\`operations
[
  {
    "type": "create",
    "description": "创建量子力学章节",
    "target": "/chapters/chapter1.tex",
    "content": "\\\\\\\\chapter{量子力学基础}\\\\\\\\n\\\\\\\\n这是第一章的内容。\\\\\\\\n\\\\\\\\n\\\\\\\\section{基本概念}\\\\\\\\n\\\\\\\\n量子力学是描述微观粒子运动的理论。"
  }
]
\`\`\`

**错误示例（不要这样做）：**
\`\`\`operations
[
  {
    "content": "\\chapter{量子力学}"  // ❌ 错误：反斜杠不够
  }
]
\`\`\`

**🎯 决策规则（严格遵循）：**

**使用工具调用的情况：**
1. 用户要求查看/分析文件，但你没有文件内容
2. 用户要求了解项目结构，但你不知道有什么文件
3. 用户提到具体文件，但你需要先读取内容
4. 需要搜索特定内容但不知道位置

**使用执行操作的情况：**
1. 你已经有足够信息来创建/修改文件
2. 用户明确要求创建新文件
3. 用户要求修改现有文件且你已知道文件内容
4. 你有足够的项目结构信息来执行操作

**🚫 绝对禁止：**
1. 在工具调用中使用write_file、create_file等写入工具
2. 在operations块中使用read_file、list_files等读取工具
3. 在同一个响应中混合使用两种模式
4. 在JSON中使用未正确转义的LaTeX代码

**📋 工作流程示例：**

**场景1：用户说"帮我创建一个LaTeX文档"**
- 如果不知道项目结构 → 先用 get_file_structure 工具调用
- 然后用 operations 块创建文件

**场景2：用户说"修改main.tex文件"**
- 如果没有文件内容 → 先用 read_file 工具调用获取内容
- 然后用 operations 块修改文件

**场景3：用户说"查看项目结构"**
- 直接用工具调用获取信息，然后回答

**💡 关键提示：**
- 信息获取和文件操作严格分离
- 先获取信息，再执行操作
- 每次只做一个阶段的事情
- 确保LaTeX代码正确转义

**✅ 成功标准：**
- 信息充足时立即执行操作
- 不重复获取已有的信息
- 不在错误的模式下使用工具
- JSON格式正确无错误`;
    }

    /**
     * 构建包含累积上下文的消息
     */
    buildContextualMessage(originalMessage, accumulatedContext, conversationHistory) {
        let message = `**用户需求：** ${originalMessage}\n\n`;
        
        // 添加当前可用的上下文信息
        message += `**当前上下文信息：**\n`;
        
        // 检查是否有足够的项目信息
        let hasFileStructure = false;
        let hasFileContents = false;
        let hasProjectInfo = false;
        
        // 项目信息
        if (accumulatedContext.project) {
            message += `- 项目：${accumulatedContext.project.name || '未命名'} (${accumulatedContext.project.files || 0} 个文件)\n`;
            hasProjectInfo = true;
        } else {
            message += `- 项目信息：❌ 未获取\n`;
        }
        
        // 文件结构信息
        if (accumulatedContext.fileStructure) {
            const preview = accumulatedContext.fileStructure.length > 300 
                ? accumulatedContext.fileStructure.substring(0, 300) + '...(截断)'
                : accumulatedContext.fileStructure;
            message += `- 文件结构：✅ 已获取\n  ${preview.replace(/\n/g, '\n  ')}\n`;
            hasFileStructure = true;
        } else {
            message += `- 文件结构：❌ 未获取\n`;
        }
        
        // 当前编辑器状态
        if (accumulatedContext.editor && accumulatedContext.editor.filePath) {
            message += `- 当前编辑文件：${accumulatedContext.editor.filePath}\n`;
            if (accumulatedContext.editor.content) {
                const preview = accumulatedContext.editor.content.substring(0, 200);
                message += `- 文件内容预览：${preview}${accumulatedContext.editor.content.length > 200 ? '...' : ''}\n`;
                hasFileContents = true;
            }
        } else {
            message += `- 当前编辑文件：❌ 无文件打开\n`;
        }
        
        // 用户提供的上下文
        if (accumulatedContext.userContextItems && accumulatedContext.userContextItems.length > 0) {
            message += `- 用户提供的上下文：${accumulatedContext.userContextItems.length} 项\n`;
        }
        
        // 工具调用结果
        if (accumulatedContext.toolCallResults) {
            const resultCount = Object.keys(accumulatedContext.toolCallResults).length;
            message += `- 已获取的信息：${resultCount} 项工具调用结果\n`;
            if (accumulatedContext.lastToolCallSummary) {
                message += `  最近获取：${accumulatedContext.lastToolCallSummary}\n`;
            }
            
            // 检查具体的工具调用结果
            let hasStructureFromTools = false;
            let hasContentFromTools = false;
            
            // 添加具体的工具调用结果内容
            message += `\n**具体获取的信息：**\n`;
            Object.keys(accumulatedContext.toolCallResults).forEach(toolName => {
                const result = accumulatedContext.toolCallResults[toolName];
                if (result && result.success) {
                    message += `\n📄 **${toolName}**:\n`;
                    
                    if (toolName === 'read_file' && result.content) {
                        const filePath = result.file_path || '未知文件';
                        const contentPreview = result.content.length > 800 
                            ? result.content.substring(0, 800) + '\n... (内容过长，已截断)'
                            : result.content;
                        message += `- 文件路径: ${filePath}\n`;
                        message += `- 文件内容:\n\`\`\`\n${contentPreview}\n\`\`\`\n`;
                        hasContentFromTools = true;
                    } else if (toolName === 'list_files' && result.files) {
                        message += `- 找到 ${result.files.length} 个文件/目录:\n`;
                        result.files.slice(0, 20).forEach(file => {
                            message += `  - ${file.type === 'directory' ? '📁' : '📄'} ${file.name} (${file.path})\n`;
                        });
                        if (result.files.length > 20) {
                            message += `  ... 还有 ${result.files.length - 20} 个文件/目录\n`;
                        }
                        hasStructureFromTools = true;
                    } else if (toolName === 'search_in_files' && result.results) {
                        message += `- 搜索结果: 找到 ${result.results.length} 个匹配项\n`;
                        result.results.slice(0, 10).forEach(match => {
                            message += `  - ${match.file_path}:${match.line_number}: ${match.line_content.trim()}\n`;
                        });
                        if (result.results.length > 10) {
                            message += `  ... 还有 ${result.results.length - 10} 个匹配项\n`;
                        }
                    } else if (toolName === 'get_file_structure' && result.structure) {
                        const structurePreview = typeof result.structure === 'string' 
                            ? (result.structure.length > 500 ? result.structure.substring(0, 500) + '\n... (结构过长，已截断)' : result.structure)
                            : JSON.stringify(result.structure, null, 2);
                        message += `- 项目结构:\n\`\`\`\n${structurePreview}\n\`\`\`\n`;
                        hasStructureFromTools = true;
                    } else if (toolName === 'get_project_info') {
                        message += `- 项目信息: ${result.total_files || 0} 个文件, ${result.total_directories || 0} 个目录\n`;
                        if (result.files_by_type) {
                            message += `- 文件类型分布:\n`;
                            Object.keys(result.files_by_type).forEach(type => {
                                const typeInfo = result.files_by_type[type];
                                message += `  - .${type}: ${typeInfo.count} 个文件\n`;
                            });
                        }
                    } else {
                        // 其他工具调用结果的通用处理
                        const resultSummary = JSON.stringify(result, null, 2);
                        const preview = resultSummary.length > 300 
                            ? resultSummary.substring(0, 300) + '\n... (结果过长，已截断)'
                            : resultSummary;
                        message += `- 结果:\n\`\`\`json\n${preview}\n\`\`\`\n`;
                    }
                } else if (result && !result.success) {
                    message += `\n❌ **${toolName}**: 失败 - ${result.error || '未知错误'}\n`;
                }
            });
            
            // 更新检查结果
            hasFileStructure = hasFileStructure || hasStructureFromTools;
            hasFileContents = hasFileContents || hasContentFromTools;
        }
        
        // 执行结果
        if (accumulatedContext.executionResults) {
            const resultCount = Object.keys(accumulatedContext.executionResults).length;
            message += `- 已执行的操作：${resultCount} 项操作结果\n`;
            if (accumulatedContext.lastExecutionSummary) {
                message += `  最近执行：${accumulatedContext.lastExecutionSummary}\n`;
            }
            
            // 添加具体的执行结果内容
            message += `\n**具体执行结果：**\n`;
            Object.keys(accumulatedContext.executionResults).forEach(key => {
                const result = accumulatedContext.executionResults[key];
                if (result && result.operation) {
                    const op = result.operation;
                    const status = result.success ? '✅' : '❌';
                    message += `${status} **${op.type}**: ${op.description}\n`;
                    if (op.target) {
                        message += `   - 目标: ${op.target}\n`;
                    }
                    if (result.error) {
                        message += `   - 错误: ${result.error}\n`;
                    }
                }
            });
        }
        
        message += '\n';
        
        // **新增：信息缺失检查和建议**
        message += `**📋 信息状态检查：**\n`;
        
        // 分析用户需求
        const lowerMessage = originalMessage.toLowerCase();
        const needsFileStructure = /文件结构|项目结构|目录结构|查看.*文件|所有文件|改写|重写/.test(lowerMessage);
        const needsFileContents = /改写|重写|修改|扩写|创建.*章节|新建.*文件|分析.*内容/.test(lowerMessage);
        
        if (needsFileStructure && !hasFileStructure) {
            message += `❌ **缺少文件结构信息** - 需要获取项目文件结构\n`;
        } else if (hasFileStructure) {
            message += `✅ **文件结构信息** - 已获取\n`;
        }
        
        if (needsFileContents && !hasFileContents) {
            message += `❌ **缺少文件内容** - 需要读取具体文件内容\n`;
        } else if (hasFileContents) {
            message += `✅ **文件内容** - 已获取\n`;
        }
        
        // 根据缺失信息给出建议
        if ((needsFileStructure && !hasFileStructure) || (needsFileContents && !hasFileContents)) {
            message += `\n💡 **建议操作：**\n`;
            if (needsFileStructure && !hasFileStructure) {
                message += `- 使用 get_file_structure 或 list_files 获取项目结构\n`;
            }
            if (needsFileContents && !hasFileContents) {
                message += `- 使用 read_file 读取主要文件内容（如 main.tex）\n`;
            }
        } else if (hasFileStructure && (!needsFileContents || hasFileContents)) {
            message += `\n🚀 **可以开始执行操作：** 信息充足，可以进行文件修改\n`;
        }
        
        // 添加详细的执行历史
        if (conversationHistory && conversationHistory.length > 0) {
            message += `\n**详细执行历史：**\n`;
            
            // 统计已执行的操作
            const executedOperations = new Set();
            const readFiles = new Set();
            
            conversationHistory.forEach((entry, index) => {
                message += `${index + 1}. [${entry.type}] `;
                
                if (entry.type === 'tool_calls') {
                    const toolCount = entry.response.content?.tool_calls?.length || 0;
                    const successCount = Object.keys(entry.result.results || {}).length;
                    message += `工具调用 (${successCount}/${toolCount} 成功)\n`;
                    
                    // 记录已读取的文件
                    if (entry.result.results) {
                        Object.keys(entry.result.results).forEach(toolName => {
                            if (toolName === 'read_file') {
                                const result = entry.result.results[toolName];
                                if (result.success && result.filePath) {
                                    readFiles.add(result.filePath);
                                }
                            }
                        });
                    }
                    
                } else if (entry.type === 'execute_operations') {
                    const { completedSteps, totalSteps } = entry.result;
                    message += `执行操作 (${completedSteps}/${totalSteps} 完成)\n`;
                    
                    // 记录已执行的操作
                    if (entry.plan && entry.plan.operations) {
                        entry.plan.operations.forEach(op => {
                            const opKey = `${op.type}:${op.target || op.source}`;
                            executedOperations.add(opKey);
                        });
                    }
                    
                    // 详细列出执行的操作
                    if (entry.plan && entry.plan.operations) {
                        entry.plan.operations.forEach((op, opIndex) => {
                            message += `   ${opIndex + 1}. ${op.type}: ${op.target || op.source} - ${op.description}\n`;
                        });
                    }
                }
            });
            
            // 添加防重复提醒
            if (executedOperations.size > 0) {
                message += `\n**已执行的操作（请勿重复）：**\n`;
                Array.from(executedOperations).forEach(op => {
                    message += `- ${op}\n`;
                });
            }
            
            if (readFiles.size > 0) {
                message += `\n🚫 **已读取的文件（请勿重复读取！）：**\n`;
                Array.from(readFiles).forEach(file => {
                    message += `- ${file} ✅ 已读取\n`;
                });
                message += `\n⚠️ **注意：上述文件内容已在"具体获取的信息"部分显示，请基于已有内容进行操作，不要重复读取！**\n`;
            }
            
            message += '\n';
        }
        
        // 添加明确的完成检查
        message += `**🎯 任务执行指导：**\n`;
        message += `- 📋 如果用户要求扩写/修改文件且已有文件内容 → 立即执行操作，使用 \`\`\`operations 块\n`;
        message += `- 📂 如果用户要求创建新文件且已了解项目结构 → 立即执行操作，创建相应文件\n`;
        message += `- 🔍 如果已经获取了足够信息来回答用户问题 → 直接回答，不要继续获取信息\n`;
        message += `- ⚠️ 避免重复执行相同的操作或读取相同的文件\n`;
        message += `- ✅ 如果任务已完成，请明确说明完成情况并停止\n\n`;
        
        message += `**请基于上述信息，选择合适的方式处理用户需求。**`;
        
        return message;
    }

    /**
     * 处理工具调用并过滤只读操作
     */
    async handleToolCallsWithReadOnlyFilter(response, context) {
        // 检查响应结构，获取工具调用数组
        let toolCalls = [];
        
        if (response.isToolCallResponse && response.content) {
            // 从原始的工具调用响应中获取
            if (response.content.tool_calls && Array.isArray(response.content.tool_calls)) {
                toolCalls = response.content.tool_calls;
            } else if (response.content.message && response.content.message.tool_calls) {
                toolCalls = response.content.message.tool_calls;
            }
        } else if (response.tool_calls && Array.isArray(response.tool_calls)) {
            toolCalls = response.tool_calls;
        } else if (response.content && response.content.tool_calls) {
            toolCalls = response.content.tool_calls;
        }
        
        console.log('工具调用处理调试:', {
            responseType: typeof response,
            isToolCallResponse: response.isToolCallResponse,
            toolCallsCount: toolCalls.length,
            responseStructure: Object.keys(response),
            contentStructure: response.content ? Object.keys(response.content) : null
        });
        
        // 如果没有找到工具调用，返回空结果
        if (!toolCalls || toolCalls.length === 0) {
            this.log('warn', '响应中没有找到有效的工具调用');
            return {
                results: {},
                summary: '0/0 个工具调用成功',
                successCount: 0,
                totalCount: 0
            };
        }
        
        const results = {};
        let successCount = 0;
        let rejectedCount = 0;
        let summary = '';
        
        // 显示工具调用面板
        let toolCallId = null;
        if (window.agentPanel && typeof window.agentPanel.showToolCallPanel === 'function') {
            toolCallId = window.agentPanel.showToolCallPanel(toolCalls, 'tool_call');
        }
        
        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            const toolName = toolCall.function.name;
            
            // 检查是否为只读工具
            if (!this.isReadOnlyTool(toolName)) {
                this.log('error', `🚫 拒绝执行写入工具: ${toolName} - 工具调用模式只允许只读操作`);
                
                const rejectionResult = {
                    success: false,
                    error: `工具调用模式禁止使用写入工具 ${toolName}`,
                    tool_name: toolName,
                    rejected: true,
                    suggestion: `请在执行操作模式中使用 ${toolName} 或使用 operations 指令块`
                };
                
                results[toolName] = rejectionResult;
                rejectedCount++;
                
                if (toolCallId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'error', rejectionResult);
                }
                continue;
            }
            
            try {
                this.log('info', `执行只读工具: ${toolName}`);
                
                if (toolCallId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'executing');
                }
                
                const result = await this.toolCallManager.executeToolCall(toolCall);
                results[toolName] = result;
                successCount++;
                
                if (toolCallId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'success', result);
                }
                
            } catch (error) {
                this.log('error', `工具调用失败: ${toolName}`, error);
                results[toolName] = { success: false, error: error.message };
                
                if (toolCallId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'error', {
                        success: false,
                        error: error.message
                    });
                }
            }
        }
        
        if (toolCallId && window.agentPanel) {
            window.agentPanel.completeToolCall(toolCallId);
        }
        
        // 构建详细的摘要信息
        if (rejectedCount > 0) {
            summary = `${successCount}/${toolCalls.length} 个工具调用成功，${rejectedCount} 个被拒绝（写入工具）`;
            this.log('warn', `有 ${rejectedCount} 个写入工具被拒绝执行，请使用执行操作模式`);
        } else {
            summary = `${successCount}/${toolCalls.length} 个工具调用成功`;
        }
        
        return {
            results,
            summary,
            successCount,
            totalCount: toolCalls.length,
            rejectedCount
        };
    }

    /**
     * 解析执行指令
     */
    parseExecutionInstructions(response) {
        try {
            // 查找 operations 代码块
            const operationsMatch = response.match(/```operations\s*([\s\S]*?)\s*```/);
            if (!operationsMatch) {
                return null;
            }
            
            let operationsJson = operationsMatch[1].trim();
            
            // 预处理JSON，修复常见的转义问题
            operationsJson = this.preprocessOperationsJson(operationsJson);
            
            let operations;
            try {
                operations = JSON.parse(operationsJson);
            } catch (parseError) {
                this.log('error', `JSON解析失败，原始内容: ${operationsJson.substring(0, 500)}...`);
                this.log('error', `解析错误详情: ${parseError.message}`);
                
                // 尝试修复常见的JSON错误
                const fixedJson = this.attemptJsonFix(operationsJson);
                if (fixedJson) {
                    try {
                        operations = JSON.parse(fixedJson);
                        this.log('info', 'JSON修复成功');
                    } catch (secondError) {
                        this.log('error', 'JSON修复后仍然解析失败', secondError);
                        return null;
                    }
                } else {
                    return null;
                }
            }
            
            if (!Array.isArray(operations)) {
                this.log('warn', '操作指令必须是数组格式');
                return null;
            }
            
            // 验证操作格式
            for (const op of operations) {
                if (!op.type || !this.isWriteOperation(op.type)) {
                    this.log('warn', `无效的操作类型: ${op.type}`);
                    return null;
                }
            }
            
            return {
                operations,
                originalResponse: response
            };
            
        } catch (error) {
            this.log('error', '解析执行指令失败', error);
            return null;
        }
    }
    
    /**
     * 预处理Operations JSON，修复常见的转义问题
     */
    preprocessOperationsJson(jsonStr) {
        // 修复LaTeX命令中的反斜杠转义问题
        let processed = jsonStr;
        
        try {
            // 1. 首先处理明显的LaTeX命令模式
            // 将 \\documentclass 这样的模式转换为正确的JSON转义格式
            processed = processed.replace(/\\\\documentclass/g, '\\\\\\\\documentclass');
            processed = processed.replace(/\\\\begin/g, '\\\\\\\\begin');
            processed = processed.replace(/\\\\end/g, '\\\\\\\\end');
            processed = processed.replace(/\\\\include/g, '\\\\\\\\include');
            processed = processed.replace(/\\\\chapter/g, '\\\\\\\\chapter');
            processed = processed.replace(/\\\\section/g, '\\\\\\\\section');
            processed = processed.replace(/\\\\subsection/g, '\\\\\\\\subsection');
            
            // 2. 处理换行符
            processed = processed.replace(/\\\\n/g, '\\\\\\\\n');
            
            // 3. 更智能的content字段处理
            processed = processed.replace(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g, (match, content) => {
                // 对content内容进行深度清理
                let fixedContent = content;
                
                // 修复所有LaTeX命令（使用更通用的模式）
                // 匹配 \word{ 模式并确保正确转义
                fixedContent = fixedContent.replace(/\\([a-zA-Z]+)\{/g, '\\\\\\\\$1{');
                
                // 修复单独的反斜杠（但不是已经转义的）
                fixedContent = fixedContent.replace(/(?<!\\)\\(?![\\"])/g, '\\\\\\\\');
                
                // 修复换行符
                fixedContent = fixedContent.replace(/\\n/g, '\\\\\\\\n');
                
                // 修复数学模式
                fixedContent = fixedContent.replace(/\\\$/g, '\\\\\\\\$');
                
                // 修复特殊字符
                fixedContent = fixedContent.replace(/\\&/g, '\\\\\\\\&');
                fixedContent = fixedContent.replace(/\\%/g, '\\\\\\\\%');
                fixedContent = fixedContent.replace(/\\#/g, '\\\\\\\\#');
                
                return `"content": "${fixedContent}"`;
            });
            
            // 4. 处理description字段
            processed = processed.replace(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g, (match, desc) => {
                let fixedDesc = desc.replace(/\\/g, '\\\\\\\\');
                return `"description": "${fixedDesc}"`;
            });
            
            // 5. 最后的清理 - 移除多余的转义
            // 如果有四个以上连续的反斜杠，可能过度转义了
            processed = processed.replace(/\\{6,}/g, '\\\\\\\\');
            
            this.log('info', `JSON预处理完成，原长度: ${jsonStr.length}, 处理后长度: ${processed.length}`);
            
            return processed;
            
        } catch (error) {
            this.log('error', 'JSON预处理失败', error);
            return jsonStr; // 返回原始字符串
        }
    }
    
    /**
     * 尝试修复JSON格式错误
     */
    attemptJsonFix(jsonStr) {
        let fixed = jsonStr;
        
        try {
            // 1. 修复未转义的反斜杠
            fixed = fixed.replace(/\\(?!["\\/bfnrtuz])/g, '\\\\');
            
            // 2. 修复字符串中的未转义引号
            fixed = fixed.replace(/"([^"]*)"([^,}\]]*)"([^"]*)"([^,}\]]*)/g, (match, ...args) => {
                // 简单的引号转义处理
                return match.replace(/"/g, '\\"').replace(/\\"/g, '"').replace(/^"|"$/g, '"');
            });
            
            // 3. 修复可能的多余逗号
            fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
            
            // 4. 验证是否为有效JSON
            JSON.parse(fixed);
            return fixed;
            
        } catch (error) {
            this.log('warn', `JSON修复尝试失败: ${error.message}`);
            
            // 最后的尝试：手动构造基本结构
            try {
                const basicPattern = /\{\s*"type"\s*:\s*"([^"]+)"\s*,\s*"target"\s*:\s*"([^"]+)"/g;
                const matches = [...jsonStr.matchAll(basicPattern)];
                
                if (matches.length > 0) {
                    const basicOps = matches.map(match => ({
                        type: match[1],
                        target: match[2],
                        description: `${match[1]} operation on ${match[2]}`,
                        content: ""
                    }));
                    
                    this.log('info', `构造基本操作结构: ${basicOps.length} 个操作`);
                    return JSON.stringify(basicOps);
                }
            } catch (basicError) {
                this.log('warn', '基本结构构造也失败了');
            }
            
            return null;
        }
    }

    /**
     * 从计划执行操作
     */
    async executeOperationsFromPlan(plan, context) {
        const operations = plan.operations;
        const results = {};
        let completedSteps = 0;
        let summary = '';
        
        // 显示执行面板
        let executionId = null;
        if (window.agentPanel && typeof window.agentPanel.showToolCallPanel === 'function') {
            // 转换操作为工具调用格式以复用可视化
            const toolCallsFormat = operations.map((op, index) => ({
                id: `exec_${index}`,
                type: 'function',
                function: {
                    name: op.type,
                    arguments: JSON.stringify(op)
                }
            }));
            
            executionId = window.agentPanel.showToolCallPanel(toolCallsFormat, 'execution');
        }
        
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            
            try {
                this.log('info', `执行操作 ${i + 1}/${operations.length}: ${operation.type}`);
                
                // 添加详细的操作日志
                console.log(`🔧 执行操作详情 [${operation.type}]:`, {
                    index: i + 1,
                    total: operations.length,
                    operation: operation,
                    hasContent: !!operation.content,
                    contentLength: operation.content ? operation.content.length : 0,
                    contentPreview: operation.content ? operation.content.substring(0, 200) + '...' : 'null'
                });
                
                if (executionId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(executionId, i, 'executing');
                }
                
                const action = await this.createActionFromOperation(operation, context);
                
                // 添加动作创建日志
                console.log(`🎯 创建动作结果:`, {
                    operationType: operation.type,
                    actionType: action ? action.type : 'null',
                    actionData: action ? Object.keys(action.data || {}) : [],
                    actionTarget: action ? (action.target || action.data?.filePath) : 'null'
                });
                
                const result = await this.executeAction(action);
                
                results[`operation_${i}`] = {
                    operation,
                    result,
                    success: true
                };
                completedSteps++;
                
                if (executionId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(executionId, i, 'success', result);
                }
                
            } catch (error) {
                this.log('error', `操作执行失败: ${operation.type}`, error);
                results[`operation_${i}`] = {
                    operation,
                    error: error.message,
                    success: false
                };
                
                if (executionId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(executionId, i, 'error', {
                        success: false,
                        error: error.message
                    });
                }
            }
        }
        
        if (executionId && window.agentPanel) {
            window.agentPanel.completeToolCall(executionId);
        }
        
        summary = `${completedSteps}/${operations.length} 个操作成功执行`;
        
        return {
            results,
            summary,
            completedSteps,
            totalSteps: operations.length
        };
    }

    /**
     * 构建单操作模式的系统提示词
     */
    buildSingleOperationSystemPrompt() {
        return `你是 LaTeX Master，一个智能的 LaTeX 文档助手。

**🚨 格式要求（必须严格遵守）：**

你必须返回以下三种JSON格式之一，不能有任何其他格式：

**1. 读操作（获取信息）：**
\`\`\`json
{
  "type": "read",
  "action": "具体操作名",
  "parameters": { "参数": "值" },
  "reasoning": "为什么执行这个操作"
}
\`\`\`

**2. 写操作（修改文件）：**
\`\`\`json
{
  "type": "write",
  "action": "具体操作名", 
  "parameters": { "参数": "值" },
  "reasoning": "为什么执行这个操作"
}
\`\`\`

**3. 任务完成：**
\`\`\`json
{
  "type": "complete",
  "message": "任务完成的详细说明",
  "reasoning": "为什么认为任务已完成"
}
\`\`\`

**⚠️ 格式错误示例（绝对不要这样做）：**
❌ \`{"type": "get_project_info"}\` （错误：action作为type）
❌ \`{"action": "read_file"}\` （错误：缺少type）
❌ \`{"tool": "read_file"}\` （错误：字段名错误）

**✅ 正确格式示例：**
✅ \`{"type": "read", "action": "get_project_info", "parameters": {}}\`
✅ \`{"type": "write", "action": "create_file", "parameters": {"file_path": "/test.tex", "content": "内容"}}\`

**🎯 工作模式：单操作模式**

你每次只能执行一个操作，然后等待结果。所有操作都会返回完整结果供你分析。

**📋 可用操作清单：**

**🟢 读操作（type: "read"）：**
- \`read_file\`: 读取文件内容
  - 参数：\`{"file_path": "/path/to/file"}\`
- \`list_files\`: 列出目录文件
  - 参数：\`{"directory_path": "/path/to/dir"}\`
- \`get_file_structure\`: 获取项目结构
  - 参数：\`{}\` （无参数）
- \`search_in_files\`: 搜索文件内容
  - 参数：\`{"query": "搜索内容", "file_pattern": "*.tex"}\`
- \`get_project_info\`: 获取项目信息
  - 参数：\`{}\` （无参数）
- \`get_current_file\`: 获取当前打开的文件
  - 参数：\`{}\` （无参数）

**🟣 写操作（type: "write"）：**
- \`create_file\`: 创建新文件
  - 参数：\`{"file_path": "/path/to/file", "content": "文件内容"}\`
- \`edit_file\`: 编辑现有文件
  - 参数：\`{"file_path": "/path/to/file", "content": "新内容", "edit_type": "replace"}\`
- \`delete_file\`: 删除文件
  - 参数：\`{"file_path": "/path/to/file"}\`
- \`create_directory\`: 创建目录
  - 参数：\`{"directory_path": "/path/to/dir"}\`
- \`delete_directory\`: 删除目录
  - 参数：\`{"directory_path": "/path/to/dir"}\`
- \`move_file\`: 移动/重命名文件
  - 参数：\`{"source_path": "/old/path", "target_path": "/new/path"}\`

**⚠️ LaTeX 代码转义规则：**
在JSON字符串中，LaTeX命令需要四个反斜杠：
- 正确：\`"\\\\\\\\chapter{标题}"\`
- 错误：\`"\\chapter{标题}"\`

**🎯 操作策略：**

1. **信息收集优先**：如果不确定项目结构，先用读操作获取信息
2. **逐步执行**：每次只做一个明确的操作
3. **智能判断**：根据已有信息决定下一步操作
4. **完整结果**：所有操作都会返回完整结果供分析
5. **明确完成**：当所有任务完成时，使用 \`complete\` 类型

**📚 完整操作示例：**

**示例1：获取项目信息**
\`\`\`json
{
  "type": "read",
  "action": "get_project_info",
  "parameters": {},
  "reasoning": "需要了解项目的基本信息和文件数量"
}
\`\`\`

**示例2：创建LaTeX章节文件**
\`\`\`json
{
  "type": "write",
  "action": "create_file",
  "parameters": {
    "file_path": "/chapters/chapter1.tex",
    "content": "\\\\\\\\chapter{量子力学基础}\\\\\\\\n\\\\\\\\n这是第一章的内容。\\\\\\\\n\\\\\\\\n\\\\\\\\section{基本概念}\\\\\\\\n\\\\\\\\n量子力学是描述微观粒子运动的理论。"
  },
  "reasoning": "创建第一章文件，包含章节标题和基本内容"
}
\`\`\`

**示例3：任务完成**
\`\`\`json
{
  "type": "complete",
  "message": "所有章节文件已成功创建，LaTeX文档结构已完成。创建了3个章节文件和1个主文件，项目结构完整。",
  "reasoning": "用户要求的所有LaTeX文件都已创建完成，任务目标已达成"
}
\`\`\`

**💡 关键原则：**
- 一次只做一件事
- 先了解再行动
- 每个操作都要有明确的reasoning
- 所有操作结果都会完整返回
- 确保LaTeX代码正确转义
- 严格按照JSON格式返回`;
    }
    
    /**
     * 构建单操作模式的消息
     */
    buildSingleOperationMessage(originalMessage, context, operationHistory) {
        let message = `**用户需求：** ${originalMessage}\n\n`;
        
        // 添加当前上下文信息
        message += `**📊 当前状态：**\n`;
        
        // 项目信息
        if (context.project) {
            message += `- 项目：${context.project.name || '未命名'} (${context.project.files || 0} 个文件)\n`;
        }
        
        // 当前编辑器状态
        if (context.editor && context.editor.filePath) {
            message += `- 当前文件：${context.editor.filePath}\n`;
        }
        
        // 最新操作结果
        if (context.lastOperationResult) {
            message += `- 上次操作结果：✅ 成功\n`;
        }
        
        // 操作历史统计
        const readOps = operationHistory.filter(h => h.operation.type === 'read').length;
        const writeOps = operationHistory.filter(h => h.operation.type === 'write').length;
        
        message += `- 已执行操作：🟢 ${readOps} 读 | 🟣 ${writeOps} 写\n\n`;
        
        // 详细操作历史（最近5个）
        if (operationHistory.length > 0) {
            message += `**📜 操作历史：**\n`;
            const recentOps = operationHistory.slice(-5);
            
            recentOps.forEach((hist, index) => {
                const op = hist.operation;
                const result = hist.result;
                const icon = op.type === 'read' ? '🟢' : '🟣';
                const status = result.success ? '✅' : '❌';
                
                message += `${hist.operationNumber}. ${icon} ${op.action} - ${status}\n`;
                message += `   目标: ${op.parameters.file_path || op.parameters.directory_path || '系统操作'}\n`;
                
                // 如果是读操作且有返回值，显示简要信息
                if (op.type === 'read' && op.need_return && result.success) {
                    if (op.action === 'read_file' && result.content) {
                        const preview = result.content.substring(0, 100);
                        message += `   内容预览: ${preview}${result.content.length > 100 ? '...' : ''}\n`;
                    } else if (op.action === 'list_files' && result.files) {
                        message += `   发现: ${result.files.length} 个文件/目录\n`;
                    } else if (op.action === 'get_file_structure' && result.structure) {
                        message += `   结构: 已获取项目结构\n`;
                    }
                }
                
                message += `\n`;
            });
            
            if (operationHistory.length > 5) {
                message += `   ... 还有 ${operationHistory.length - 5} 个历史操作\n\n`;
            }
        }
        
        // 上次操作的详细结果（如果需要返回值）
        if (context.lastOperationResult && context.lastOperationResult.success) {
            const lastOp = operationHistory[operationHistory.length - 1]?.operation;
            if (lastOp && lastOp.type === 'read') {
                message += `**📄 上次读操作详细结果：**\n`;
                
                const result = context.lastOperationResult;
                if (lastOp.action === 'read_file' && result.content) {
                    message += `- 文件路径: ${result.file_path}\n`;
                    message += `- 文件内容:\n\`\`\`\n${result.content}\n\`\`\`\n\n`;
                } else if (lastOp.action === 'list_files' && result.files) {
                    message += `- 目录: ${result.directory}\n`;
                    message += `- 文件列表:\n`;
                    result.files.forEach(file => {
                        message += `  ${file.type === 'directory' ? '📁' : '📄'} ${file.name}\n`;
                    });
                    message += `\n`;
                } else if (lastOp.action === 'get_file_structure' && result.structure) {
                    message += `- 项目结构:\n\`\`\`\n${result.structure}\n\`\`\`\n\n`;
                } else if (lastOp.action === 'search_in_files' && result.results) {
                    message += `- 搜索结果: ${result.results.length} 个匹配\n`;
                    result.results.slice(0, 5).forEach(match => {
                        message += `  ${match.file_path}:${match.line_number} - ${match.line_content.trim()}\n`;
                    });
                    message += `\n`;
                }
            }
        }
        
        // 任务指导
        message += `**🎯 下一步操作指导：**\n`;
        message += `- 如需了解项目结构，使用 get_file_structure\n`;
        message += `- 如需读取文件内容，使用 read_file\n`;
        message += `- 如需创建文件，使用 create_file 并确保LaTeX代码正确转义\n`;
        message += `- 如果任务已完成，返回 complete 类型\n\n`;
        
        message += `**请选择下一个操作：**`;
        
        return message;
    }
    
    /**
     * 解析单操作响应
     */
    parseSingleOperation(response) {
        try {
            if (!response || typeof response !== 'string') {
                return null;
            }
            
            // 提取JSON部分
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                             response.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                this.log('warn', '响应中未找到JSON格式');
                return null;
            }
            
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            let operation = JSON.parse(jsonStr);
            
            // **智能格式修复**
            operation = this.autoFixOperationFormat(operation);
            
            // 验证必需字段
            if (!operation.type) {
                this.log('warn', '操作缺少type字段');
                return null;
            }
            
            // 验证操作类型
            const validTypes = ['read', 'write', 'complete'];
            if (!validTypes.includes(operation.type)) {
                this.log('warn', `无效的操作类型: ${operation.type}`);
                return null;
            }
            
            // 对于读写操作，验证必需字段
            if (operation.type !== 'complete') {
                if (!operation.action || !operation.parameters) {
                    this.log('warn', '读写操作缺少action或parameters字段');
                    return null;
                }
            }
            
            // 预处理LaTeX内容
            if (operation.type === 'write' && operation.parameters.content) {
                operation.parameters.content = this.preprocessLatexContent(operation.parameters.content);
            }
            
            this.log('info', `解析操作成功: ${operation.type} - ${operation.action || 'complete'}`);
            return operation;
            
        } catch (error) {
            this.log('error', '解析操作响应失败', error);
            return null;
        }
    }
    
    /**
     * 自动修复AI响应格式错误
     */
    autoFixOperationFormat(operation) {
        // 定义读操作和写操作映射
        const readActions = [
            'read_file', 'list_files', 'get_file_structure', 'search_in_files',
            'get_project_info', 'get_current_file', 'get_editor_state',
            'get_selection', 'get_cursor_position', 'get_open_tabs', 'get_recent_changes'
        ];
        
        const writeActions = [
            'create_file', 'edit_file', 'delete_file', 'create_directory',
            'delete_directory', 'move_file', 'rename_file', 'write_file'
        ];
        
        // 情况1：AI直接返回了action作为type
        if (readActions.includes(operation.type)) {
            this.log('info', `自动修复：将 ${operation.type} 从 type 字段移动到 action 字段（读操作）`);
            return {
                type: 'read',
                action: operation.type,
                parameters: operation.parameters || {},
                reasoning: operation.reasoning || `执行读操作: ${operation.type}`
            };
        }
        
        if (writeActions.includes(operation.type)) {
            this.log('info', `自动修复：将 ${operation.type} 从 type 字段移动到 action 字段（写操作）`);
            return {
                type: 'write',
                action: operation.type,
                parameters: operation.parameters || {},
                reasoning: operation.reasoning || `执行写操作: ${operation.type}`
            };
        }
        
        // 情况2：缺少必要字段，尝试从其他字段推断
        if (!operation.action && operation.tool_name) {
            this.log('info', `自动修复：从 tool_name 字段推断 action`);
            operation.action = operation.tool_name;
        }
        
        if (!operation.parameters && operation.args) {
            this.log('info', `自动修复：从 args 字段推断 parameters`);
            operation.parameters = operation.args;
        }
        
        // 情况3：根据action自动推断type
        if (!operation.type && operation.action) {
            if (readActions.includes(operation.action)) {
                this.log('info', `自动修复：根据 action ${operation.action} 推断为读操作`);
                operation.type = 'read';
            } else if (writeActions.includes(operation.action)) {
                this.log('info', `自动修复：根据 action ${operation.action} 推断为写操作`);
                operation.type = 'write';
            }
        }
        
        // 情况4：处理完成任务的格式
        if (operation.type === 'complete' || operation.action === 'complete') {
            return {
                type: 'complete',
                message: operation.message || operation.content || '任务已完成',
                reasoning: operation.reasoning || '用户任务已完成'
            };
        }
        
        return operation;
    }
    
    /**
     * 执行单个操作
     */
    async executeSingleOperation(operation, context) {
        const startTime = Date.now();
        
        try {
            this.log('info', `执行操作: ${operation.type} - ${operation.action || 'complete'}`);
            
            if (operation.type === 'complete') {
                return {
                    success: true,
                    type: 'complete',
                    message: operation.message || '任务已完成',
                    duration: Date.now() - startTime
                };
            }
            
            let result;
            
            if (operation.type === 'read') {
                // 执行读操作
                result = await this.executeReadOperation(operation);
            } else if (operation.type === 'write') {
                // 执行写操作
                result = await this.executeWriteOperation(operation);
            } else {
                throw new Error(`未知的操作类型: ${operation.type}`);
            }
            
            result.duration = Date.now() - startTime;
            this.log('info', `操作完成: ${result.success ? '成功' : '失败'} (${result.duration}ms)`);
            
            return result;
            
        } catch (error) {
            this.log('error', `操作执行失败: ${operation.type} - ${operation.action}`, error);
            
            return {
                success: false,
                type: operation.type,
                action: operation.action,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }
    
    /**
     * 执行读操作
     */
    async executeReadOperation(operation) {
        const { action, parameters } = operation;
        
        try {
            let result;
            
            switch (action) {
                case 'read_file':
                    result = await this.toolCallManager.readFile(parameters);
                    break;
                case 'list_files':
                    result = await this.toolCallManager.listFiles(parameters);
                    break;
                case 'get_file_structure':
                    result = await this.toolCallManager.getFileStructure(parameters);
                    break;
                case 'search_in_files':
                    result = await this.toolCallManager.searchInFiles(parameters);
                    break;
                case 'get_project_info':
                    result = await this.toolCallManager.getProjectInfo();
                    break;
                case 'get_current_file':
                    result = this.toolCallManager.getCurrentFile();
                    break;
                default:
                    throw new Error(`未知的读操作: ${action}`);
            }
            
            // 始终返回完整结果
            result.type = 'read';
            result.action = action;
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                type: 'read',
                action: action,
                error: error.message
            };
        }
    }
    
    /**
     * 执行写操作
     */
    async executeWriteOperation(operation) {
        const { action, parameters } = operation;
        
        try {
            let result;
            
            switch (action) {
                case 'create_file':
                    // 确保目录存在
                    await this.ensureDirectoryExists(parameters.file_path);
                    await window.ide.fileSystem.writeFile(parameters.file_path, parameters.content || '');
                    result = {
                        success: true,
                        file_path: parameters.file_path,
                        content_length: (parameters.content || '').length,
                        message: `文件 ${parameters.file_path} 创建成功`
                    };
                    break;
                    
                case 'edit_file':
                    const editType = parameters.edit_type || 'replace';
                    
                    if (editType === 'replace') {
                        await this.ensureDirectoryExists(parameters.file_path);
                        await window.ide.fileSystem.writeFile(parameters.file_path, parameters.content || '');
                    } else if (editType === 'append') {
                        let existingContent = '';
                        try {
                            existingContent = await window.ide.fileSystem.readFile(parameters.file_path);
                        } catch (error) {
                            // 文件不存在，创建新文件
                            await this.ensureDirectoryExists(parameters.file_path);
                        }
                        const newContent = existingContent + (parameters.content || '');
                        await window.ide.fileSystem.writeFile(parameters.file_path, newContent);
                    }
                    
                    result = {
                        success: true,
                        file_path: parameters.file_path,
                        edit_type: editType,
                        content_length: (parameters.content || '').length,
                        message: `文件 ${parameters.file_path} 编辑成功`
                    };
                    break;
                    
                case 'delete_file':
                    await window.ide.fileSystem.unlink(parameters.file_path);
                    result = {
                        success: true,
                        file_path: parameters.file_path,
                        message: `文件 ${parameters.file_path} 删除成功`
                    };
                    break;
                    
                case 'create_directory':
                    await this.ensureDirectoryExists(parameters.directory_path, true);
                    result = {
                        success: true,
                        directory_path: parameters.directory_path,
                        message: `目录 ${parameters.directory_path} 创建成功`
                    };
                    break;
                    
                case 'delete_directory':
                    await window.ide.fileSystem.rmdir(parameters.directory_path);
                    result = {
                        success: true,
                        directory_path: parameters.directory_path,
                        message: `目录 ${parameters.directory_path} 删除成功`
                    };
                    break;
                    
                case 'move_file':
                    await this.ensureDirectoryExists(parameters.target_path);
                    await window.ide.fileSystem.rename(parameters.source_path, parameters.target_path);
                    result = {
                        success: true,
                        source_path: parameters.source_path,
                        target_path: parameters.target_path,
                        message: `文件从 ${parameters.source_path} 移动到 ${parameters.target_path}`
                    };
                    break;
                    
                default:
                    throw new Error(`未知的写操作: ${action}`);
            }
            
            // 强制刷新文件树
            await this.forceRefreshFileTree();
            
            result.type = 'write';
            result.action = action;
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                type: 'write',
                action: action,
                error: error.message,
                parameters: parameters
            };
        }
    }
    
    /**
     * 预处理LaTeX内容
     */
    preprocessLatexContent(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }
        
        try {
            // 修复LaTeX转义问题
            let processed = content;
            
            // 将四个反斜杠转换为两个（JSON中的四个反斜杠 = 实际的两个反斜杠）
            processed = processed.replace(/\\\\\\\\/g, '\\\\');
            
            this.log('info', `LaTeX内容预处理完成，原长度: ${content.length}, 处理后长度: ${processed.length}`);
            
            return processed;
            
        } catch (error) {
            this.log('error', 'LaTeX内容预处理失败', error);
            return content; // 返回原始内容
        }
    }
    
    /**
     * **新增：初始化任务状态**
     */
    initTaskState() {
        this.isExecuting = true;
        this.shouldPauseTask = false;
        this.currentTaskId = `task_${Date.now()}`;
        this.operationHistory = [];
        this.log('info', `任务初始化: ${this.currentTaskId}`);
    }
    
    /**
     * **新增：重置任务状态**
     */
    resetTaskState() {
        this.isExecuting = false;
        this.shouldPauseTask = false;
        this.currentTaskId = null;
        this.log('info', '任务状态已重置');
    }
    
    /**
     * **新增：暂停当前任务**
     */
    pauseCurrentTask() {
        if (this.isExecuting) {
            this.shouldPauseTask = true;
            this.log('info', '设置任务暂停标志');
            return true;
        }
        return false;
    }
    
    /**
     * **新增：恢复当前任务**
     */
    resumeCurrentTask() {
        this.shouldPauseTask = false;
        this.log('info', '取消任务暂停标志');
    }
    
    /**
     * **新增：检查任务暂停状态**
     */
    checkTaskPause() {
        return this.shouldPauseTask;
    }
    
    /**
     * **新增：更新操作历史UI**
     */
    updateOperationHistoryUI(operationHistory) {
        try {
            // 调用全局的操作历史渲染函数
            if (window.renderOperationHistory && typeof window.renderOperationHistory === 'function') {
                window.renderOperationHistory(operationHistory);
                this.log('info', `操作历史UI已更新: ${operationHistory.length} 个操作`);
            } else {
                this.log('warn', 'renderOperationHistory 函数不可用');
            }
        } catch (error) {
            this.log('error', '更新操作历史UI失败', error);
        }
    }
    
    /**
     * **新增：检查重复操作**
     */
    checkDuplicateOperation(operation, operationHistory) {
        if (operationHistory.length < 2) return false;
        
        // 检查最近3个操作是否有重复
        const recentOps = operationHistory.slice(-3);
        
        for (const histItem of recentOps) {
            const hist = histItem.operation;
            
            // 检查相同的操作类型和action
            if (hist.type === operation.type && hist.action === operation.action) {
                // 对于文件操作，还要检查目标文件
                if (operation.parameters?.file_path && hist.parameters?.file_path) {
                    if (operation.parameters.file_path === hist.parameters.file_path) {
                        return true;
                    }
                } else if (operation.parameters?.directory_path && hist.parameters?.directory_path) {
                    if (operation.parameters.directory_path === hist.parameters.directory_path) {
                        return true;
                    }
                } else {
                    // 对于无参数的操作（如get_file_structure），直接认为是重复
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * **新增：更新上下文包含操作结果**
     */
    updateContextWithOperationResult(fullContext, operation, operationResult, operationHistory) {
        // 创建新的上下文对象
        const updatedContext = { ...fullContext };
        
        // 累积操作结果
        if (!updatedContext.accumulatedResults) {
            updatedContext.accumulatedResults = {};
        }
        
        // 存储操作结果
        const resultKey = `${operation.action}_${Date.now()}`;
        updatedContext.accumulatedResults[resultKey] = {
            operation,
            result: operationResult,
            timestamp: new Date().toISOString()
        };
        
        // 根据操作类型更新特定字段
        switch (operation.action) {
            case 'get_file_structure':
                if (operationResult.structure) {
                    updatedContext.fileStructure = operationResult.structure;
                    updatedContext.projectStructureKnown = true;
                }
                break;
                
            case 'read_file':
                if (operationResult.content) {
                    if (!updatedContext.knownFiles) {
                        updatedContext.knownFiles = {};
                    }
                    updatedContext.knownFiles[operationResult.file_path] = {
                        content: operationResult.content,
                        lastRead: new Date().toISOString()
                    };
                }
                break;
                
            case 'list_files':
                if (operationResult.files) {
                    if (!updatedContext.directoryListings) {
                        updatedContext.directoryListings = {};
                    }
                    const dirPath = operation.parameters?.directory_path || '/';
                    updatedContext.directoryListings[dirPath] = {
                        files: operationResult.files,
                        lastListed: new Date().toISOString()
                    };
                }
                break;
                
            case 'get_project_info':
                if (operationResult.success) {
                    updatedContext.projectInfo = operationResult;
                }
                break;
        }
        
        // 更新最后操作结果
        updatedContext.lastOperationResult = operationResult;
        
        // 统计信息
        const readOps = operationHistory.filter(h => h.operation.type === 'read').length;
        const writeOps = operationHistory.filter(h => h.operation.type === 'write').length;
        
        updatedContext.operationStats = {
            totalOperations: operationHistory.length,
            readOperations: readOps,
            writeOperations: writeOps,
            lastUpdate: new Date().toISOString()
        };
        
        return updatedContext;
    }
    
    /**
     * **新增：构建增强的上下文消息**
     */
    buildEnhancedContextualMessage(originalMessage, fullContext, operationHistory) {
        let message = `**用户需求：** ${originalMessage}\n\n`;
        
        // 检查已获取的信息
        const hasFileStructure = !!(fullContext.fileStructure || fullContext.projectStructureKnown);
        const hasFileContents = !!(fullContext.knownFiles && Object.keys(fullContext.knownFiles).length > 0);
        const hasProjectInfo = !!(fullContext.projectInfo);
        const hasDirectoryListings = !!(fullContext.directoryListings && Object.keys(fullContext.directoryListings).length > 0);
        
        // 信息状态摘要
        message += `**📊 信息状态检查：**\n`;
        message += `- 项目结构: ${hasFileStructure ? '✅ 已获取' : '❌ 未获取'}\n`;
        message += `- 文件内容: ${hasFileContents ? '✅ 已获取' : '❌ 未获取'}\n`;
        message += `- 项目信息: ${hasProjectInfo ? '✅ 已获取' : '❌ 未获取'}\n`;
        message += `- 目录列表: ${hasDirectoryListings ? '✅ 已获取' : '❌ 未获取'}\n\n`;
        
        // 操作历史统计
        if (operationHistory.length > 0) {
            const readOps = operationHistory.filter(h => h.operation.type === 'read').length;
            const writeOps = operationHistory.filter(h => h.operation.type === 'write').length;
            
            message += `**📜 操作历史统计：**\n`;
            message += `- 总操作数: ${operationHistory.length}\n`;
            message += `- 读操作: ${readOps} 次\n`;
            message += `- 写操作: ${writeOps} 次\n\n`;
            
            // 显示最近的操作
            const recentOps = operationHistory.slice(-5);
            message += `**最近操作：**\n`;
            recentOps.forEach((hist, index) => {
                const op = hist.operation;
                const result = hist.result;
                const status = result.success ? '✅' : '❌';
                message += `${hist.operationNumber}. ${status} ${op.action} `;
                
                if (op.parameters?.file_path) {
                    message += `(${op.parameters.file_path})`;
                } else if (op.parameters?.directory_path) {
                    message += `(${op.parameters.directory_path})`;
                }
                message += '\n';
            });
            message += '\n';
        }
        
        // 详细的已获取信息
        if (hasFileStructure && fullContext.fileStructure) {
            message += `**📁 已知项目结构：**\n`;
            const structure = fullContext.fileStructure;
            const preview = structure.length > 800 ? structure.substring(0, 800) + '\n... (结构过长，已截断)' : structure;
            message += `\`\`\`\n${preview}\n\`\`\`\n\n`;
        }
        
        if (hasFileContents && fullContext.knownFiles) {
            message += `**📄 已知文件内容：**\n`;
            Object.keys(fullContext.knownFiles).forEach(filePath => {
                const fileInfo = fullContext.knownFiles[filePath];
                const contentPreview = fileInfo.content.length > 400 
                    ? fileInfo.content.substring(0, 400) + '\n... (内容过长，已截断)'
                    : fileInfo.content;
                message += `- **${filePath}** (读取时间: ${fileInfo.lastRead}):\n`;
                message += `\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
            });
        }
        
        if (hasDirectoryListings && fullContext.directoryListings) {
            message += `**📂 已知目录内容：**\n`;
            Object.keys(fullContext.directoryListings).forEach(dirPath => {
                const listing = fullContext.directoryListings[dirPath];
                message += `- **${dirPath}** (${listing.files.length} 个文件/目录):\n`;
                listing.files.slice(0, 10).forEach(file => {
                    message += `  ${file.type === 'directory' ? '📁' : '📄'} ${file.name}\n`;
                });
                if (listing.files.length > 10) {
                    message += `  ... 还有 ${listing.files.length - 10} 个文件/目录\n`;
                }
                message += '\n';
            });
        }
        
        // 避免重复操作的提醒
        message += `**⚠️ 重要提醒：**\n`;
        message += `- 🚫 不要重复执行已经成功的读操作\n`;
        message += `- 📋 使用上述已获取的信息来回答用户问题\n`;
        message += `- 🎯 如果有足够信息执行用户要求的任务，请直接执行写操作\n`;
        message += `- ✅ 如果任务已完成，请返回 complete 类型\n\n`;
        
        // 任务指导
        message += `**🎯 下一步建议：**\n`;
        
        const lowerMessage = originalMessage.toLowerCase();
        const needsWrite = /创建|新建|编辑|修改|删除/.test(lowerMessage);
        const needsAnalysis = /分析|查看|检查|优化/.test(lowerMessage);
        
        if (needsWrite && hasFileStructure) {
            message += `- 🟣 建议执行写操作：已有足够结构信息，可以创建/修改文件\n`;
        } else if (needsAnalysis && (hasFileContents || hasFileStructure)) {
            message += `- 📊 建议分析现有信息：已有足够数据进行分析\n`;
        } else if (!hasFileStructure) {
            message += `- 🟢 建议获取项目结构：使用 get_file_structure\n`;
        } else if (!hasFileContents && needsWrite) {
            message += `- 🟢 建议读取关键文件：如 main.tex 等\n`;
        } else {
            message += `- 🎯 建议基于现有信息执行用户请求\n`;
        }
        
        message += `\n**请基于上述已获取的信息选择合适的操作，避免重复获取。**`;
        
        return message;
    }
}

/**
 * 上下文收集器
 */
class ContextCollector {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30秒缓存
    }
    
    /**
     * 获取项目元数据
     */
    async getProjectMetadata() {
        const cacheKey = 'project';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        
        try {
            const metadata = {
                name: 'LaTeX IDE Project',
                type: 'latex',
                created: new Date().toISOString(),
                files: 0,
                size: 0,
                lastModified: new Date().toISOString()
            };
            
            // 获取文件统计信息
            if (window.ide && window.ide.fileSystem) {
                const files = await this.getAllFiles();
                metadata.files = files.length;
                metadata.size = files.reduce((total, file) => total + (file.size || 0), 0);
            }
            
            this.setCachedData(cacheKey, metadata);
            return metadata;
        } catch (error) {
            console.error('获取项目元数据失败:', error);
            return {
                name: 'LaTeX IDE Project',
                type: 'latex',
                error: error.message
            };
        }
    }
    
    /**
     * 获取文件结构
     */
    async getFileStructure() {
        const cacheKey = 'structure';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        
        try {
            const structure = await this.buildFileTree();
            this.setCachedData(cacheKey, structure);
            return structure;
        } catch (error) {
            console.error('获取文件结构失败:', error);
            return '无法获取文件结构: ' + error.message;
        }
    }
    
    /**
     * 构建文件树
     */
    async buildFileTree() {
        if (!window.ide || !window.ide.fileSystem) {
            return '文件系统未初始化';
        }
        
        try {
            const files = await this.getAllFiles();
            return this.formatFileTree(files);
        } catch (error) {
            console.error('构建文件树失败:', error);
            return '构建文件树失败: ' + error.message;
        }
    }
    
    /**
     * 获取所有文件
     */
    async getAllFiles() {
        const files = [];
        const visitedPaths = new Set(); // 防止循环引用
        
        try {
            // 递归获取所有文件，添加深度限制
            await this.scanDirectory('/', files, visitedPaths, 0, 10);
            return files.sort((a, b) => a.path.localeCompare(b.path));
        } catch (error) {
            console.error('扫描文件失败:', error);
            return [];
        }
    }
    
    /**
     * 扫描目录
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
     * 格式化文件树
     */
    formatFileTree(files) {
        const tree = {};
        
        // 构建树结构
        files.forEach(file => {
            const parts = file.path.split('/').filter(p => p);
            let current = tree;
            
            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = index === parts.length - 1 && file.type === 'file' 
                        ? { type: 'file', extension: file.extension, size: file.size }
                        : { type: 'directory', children: {} };
                }
                
                if (current[part].children) {
                    current = current[part].children;
                }
            });
        });
        
        // 转换为字符串格式
        return this.treeToString(tree, '', true);
    }
    
    /**
     * 将树结构转换为字符串
     */
    treeToString(node, prefix = '', isRoot = false) {
        let result = isRoot ? '项目根目录/\n' : '';
        const entries = Object.entries(node);
        
        entries.forEach(([name, info], index) => {
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            
            if (info.type === 'file') {
                result += `${prefix}${connector}${name}`;
                if (info.extension === 'tex') result += ' (LaTeX)';
                else if (info.extension === 'bib') result += ' (Bibliography)';
                else if (info.extension === 'md') result += ' (Markdown)';
                result += '\n';
            } else {
                result += `${prefix}${connector}${name}/\n`;
                if (info.children && Object.keys(info.children).length > 0) {
                    result += this.treeToString(info.children, nextPrefix);
                }
            }
        });
        
        return result;
    }
    
    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1) : '';
    }
    
    /**
     * 获取缓存数据
     */
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }
    
    /**
     * 设置缓存数据
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }
} 