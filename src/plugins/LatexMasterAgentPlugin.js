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
     * 处理用户消息的主入口 - 实现两阶段循环逻辑
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
            
            // 收集初始上下文
            let fullContext = await this.collectContext(message, context);
            
            // 初始化循环控制
            let maxIterations = 15;
            let iteration = 0;
            let conversationHistory = []; // 存储整个对话历史
            let accumulatedContext = { ...fullContext }; // 累积的上下文信息
            
            while (true) {
                iteration++;
                this.log('info', `处理迭代 ${iteration}/${maxIterations}`);
                
                // 检查是否达到软限制
                if (iteration > maxIterations) {
                    this.log('warn', `达到迭代软限制 ${maxIterations}，请求用户确认`);
                    
                    const confirmMessage = `⚠️ 任务处理已进行 ${maxIterations} 轮迭代，可能比较复杂。\n\n` +
                        `当前进度：\n` +
                        `- 已完成 ${conversationHistory.length} 个阶段\n` +
                        `- 工具调用: ${conversationHistory.filter(h => h.type === 'tool_calls').length} 次\n` +
                        `- 执行操作: ${conversationHistory.filter(h => h.type === 'execute_operations').length} 次\n\n` +
                        `是否继续处理？`;
                    
                    const shouldContinue = await this.showIterationConfirmDialog(confirmMessage, iteration);
                    
                    if (!shouldContinue) {
                        this.log('info', '用户选择停止处理');
                        return this.createResponse(
                            `⏹️ 任务已停止\n\n` +
                            `处理摘要：\n` +
                            `- 总迭代次数: ${iteration - 1}\n` +
                            `- 工具调用: ${conversationHistory.filter(h => h.type === 'tool_calls').length} 次\n` +
                            `- 执行操作: ${conversationHistory.filter(h => h.type === 'execute_operations').length} 次\n\n` +
                            `任务可能已部分完成，请检查结果。如需继续，请重新发送请求。`
                        );
                    }
                    
                    // 用户选择继续，重置计数器并增加限制
                    this.log('info', '用户选择继续，重置迭代计数器');
                    maxIterations += 10;
                    
                    if (onStream) {
                        onStream(`\n🔄 继续处理任务 (迭代 ${iteration})...\n`, '');
                    }
                }
                
                // 构建包含累积上下文的消息
                const contextualMessage = this.buildContextualMessage(message, accumulatedContext, conversationHistory);
                
                // 让 AI 自由选择：工具调用（只读）或执行操作（写入）
                this.log('info', '调用 AI 进行自由决策...');
                const response = await this.callOpenAI([
                    { role: 'system', content: this.buildFlexibleSystemPrompt() },
                    { role: 'user', content: contextualMessage }
                ], onStream);
                
                // 处理 AI 的响应
                if (response && response.isToolCallResponse) {
                    // AI 选择了工具调用（只读操作）
                    this.log('info', 'AI 选择了工具调用模式');
                    
                    const toolCallResult = await this.handleToolCallsWithReadOnlyFilter(response, accumulatedContext);
                    
                    // 将工具调用结果添加到累积上下文
                    accumulatedContext = this.mergeContext(accumulatedContext, {
                        toolCallResults: toolCallResult.results,
                        lastToolCallSummary: toolCallResult.summary
                    });
                    
                    // 添加到对话历史
                    conversationHistory.push({
                        type: 'tool_calls',
                        response: response,
                        result: toolCallResult,
                        timestamp: new Date().toISOString()
                    });
                    
                    this.log('info', `工具调用完成，获得 ${Object.keys(toolCallResult.results).length} 个结果`);
                    
                } else if (typeof response === 'string') {
                    // AI 返回了文本响应，尝试解析是否包含执行指令
                    const executionPlan = this.parseExecutionInstructions(response);
                    
                    if (executionPlan && executionPlan.operations && executionPlan.operations.length > 0) {
                        // AI 选择了执行操作模式
                        this.log('info', 'AI 选择了执行操作模式');
                        
                        const executeResult = await this.executeOperationsFromPlan(executionPlan, accumulatedContext);
                        
                        // 将执行结果添加到累积上下文
                        accumulatedContext = this.mergeContext(accumulatedContext, {
                            executionResults: executeResult.results,
                            lastExecutionSummary: executeResult.summary
                        });
                        
                        // 添加到对话历史
                        conversationHistory.push({
                            type: 'execute_operations',
                            plan: executionPlan,
                            result: executeResult,
                            timestamp: new Date().toISOString()
                        });
                        
                        this.log('info', `执行操作完成: ${executeResult.completedSteps}/${executeResult.totalSteps} 步骤`);
                        
                    } else {
                        // AI 认为任务已完成或给出了最终回答
                        this.log('info', 'AI 给出最终回答');
                        
                        const finalMessage = `${response}\n\n` +
                            `📊 处理摘要：\n` +
                            `- 总迭代次数: ${iteration}\n` +
                            `- 工具调用: ${conversationHistory.filter(h => h.type === 'tool_calls').length} 次\n` +
                            `- 执行操作: ${conversationHistory.filter(h => h.type === 'execute_operations').length} 次`;
                        
                        return this.createResponse(finalMessage);
                    }
                } else {
                    this.log('warn', '未知的响应格式', response);
                    return this.createResponse('❌ 响应格式异常，请重试');
                }
            }
            
        } catch (error) {
            this.handleError(error, 'processMessage');
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
                
                const result = await this.toolCallManager.executeToolCall(toolCall);
                
                // 存储结果
                results.gatheredData[tool.name] = result;
                
                // 更新工具调用状态
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'success', result);
                }
                
                this.log('info', `工具 ${tool.name} 执行成功`);
                
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
            'get_editor_state'
        ];
        return readOnlyTools.includes(toolName);
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
        
        if (newData.gatheredData) {
            // 合并获取的数据
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
        this.log('info', `执行动作: ${action.type} - ${action.target || action.description}`);
        
        try {
            switch (action.type) {
                case 'create':
                    // 创建文件，自动创建所需目录
                    await this.ensureDirectoryExists(action.target);
                    await window.ide.fileSystem.writeFile(action.target, action.content || '');
                    this.log('info', `文件创建成功: ${action.target}`);
                    
                    // 更新文件浏览器
                    if (window.ide.updateFileTree) {
                        window.ide.updateFileTree();
                    }
                    break;
                    
                case 'mkdir':
                    // 创建目录
                    await this.ensureDirectoryExists(action.target, true);
                    this.log('info', `目录创建成功: ${action.target}`);
                    
                    // 更新文件浏览器
                    if (window.ide.updateFileTree) {
                        window.ide.updateFileTree();
                    }
                    break;
                    
                case 'edit':
                    // 编辑文件，如果文件不存在则创建
                    if (action.editType === 'replace') {
                        await this.ensureDirectoryExists(action.target);
                        await window.ide.fileSystem.writeFile(action.target, action.content || '');
                    } else if (action.editType === 'insert') {
                        // 读取现有内容，插入新内容
                        let existingContent = '';
                        try {
                            existingContent = await window.ide.fileSystem.readFile(action.target);
                        } catch (error) {
                            // 文件不存在，创建新文件
                            await this.ensureDirectoryExists(action.target);
                            existingContent = '';
                        }
                        
                        const lines = existingContent.split('\n');
                        const insertLine = action.startLine || lines.length;
                        lines.splice(insertLine, 0, action.content || '');
                        
                        await window.ide.fileSystem.writeFile(action.target, lines.join('\n'));
                    } else if (action.editType === 'delete') {
                        // 删除指定行
                        const existingContent = await window.ide.fileSystem.readFile(action.target);
                        const lines = existingContent.split('\n');
                        const startLine = action.startLine || 0;
                        const endLine = action.endLine || startLine;
                        lines.splice(startLine, endLine - startLine + 1);
                        
                        await window.ide.fileSystem.writeFile(action.target, lines.join('\n'));
                    }
                    this.log('info', `文件编辑成功: ${action.target}`);
                    
                    // 如果当前文件正在编辑器中打开，更新编辑器内容
                    if (window.ide.currentFile === action.target && window.ide.editor) {
                        const updatedContent = await window.ide.fileSystem.readFile(action.target);
                        window.ide.editor.setValue(updatedContent);
                    }
                    break;
                    
                case 'delete':
                    // 删除文件
                    await window.ide.fileSystem.unlink(action.target);
                    this.log('info', `文件删除成功: ${action.target}`);
                    
                    // 如果删除的是当前打开的文件，关闭编辑器
                    if (window.ide.currentFile === action.target) {
                        window.ide.closeFile(action.target);
                    }
                    
                    // 更新文件浏览器
                    if (window.ide.updateFileTree) {
                        window.ide.updateFileTree();
                    }
                    break;
                    
                case 'rmdir':
                    // 删除目录
                    await window.ide.fileSystem.rmdir(action.target);
                    this.log('info', `目录删除成功: ${action.target}`);
                    
                    // 更新文件浏览器
                    if (window.ide.updateFileTree) {
                        window.ide.updateFileTree();
                    }
                    break;
                    
                case 'move':
                    // 移动/重命名文件
                    await this.ensureDirectoryExists(action.target);
                    await window.ide.fileSystem.rename(action.source, action.target);
                    this.log('info', `文件移动成功: ${action.source} -> ${action.target}`);
                    
                    // 如果移动的是当前打开的文件，更新编辑器
                    if (window.ide.currentFile === action.source) {
                        window.ide.currentFile = action.target;
                        // 更新标签页
                        if (window.ide.updateTabTitle) {
                            window.ide.updateTabTitle(action.source, action.target);
                        }
                    }
                    
                    // 更新文件浏览器
                    if (window.ide.updateFileTree) {
                        window.ide.updateFileTree();
                    }
                    break;
                    
                case 'compile':
                    // 编译 LaTeX 文档
                    this.log('info', `编译 LaTeX 文档: ${action.target}`);
                    // 这里可以添加实际的编译逻辑
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
     * 确保目录存在，如果不存在则创建
     */
    async ensureDirectoryExists(filePath, isDirectory = false) {
        try {
            let dirPath;
            if (isDirectory) {
                // 如果是目录路径
                dirPath = filePath;
            } else {
                // 如果是文件路径，提取目录部分
                const pathParts = filePath.split('/');
                pathParts.pop(); // 移除文件名
                dirPath = pathParts.join('/');
            }
            
            // 如果是根目录或空路径，不需要创建
            if (!dirPath || dirPath === '/' || dirPath === '') {
                return;
            }
            
            // 检查目录是否存在
            try {
                const stats = await window.ide.fileSystem.stat(dirPath);
                if (stats.isDirectory()) {
                    return; // 目录已存在
                }
            } catch (error) {
                // 目录不存在，需要创建
            }
            
            // 递归创建父目录
            const parentPath = dirPath.split('/').slice(0, -1).join('/');
            if (parentPath && parentPath !== '/') {
                await this.ensureDirectoryExists(parentPath, true);
            }
            
            // 创建当前目录
            await window.ide.fileSystem.mkdir(dirPath);
            this.log('info', `目录创建成功: ${dirPath}`);
            
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
- 支持的操作类型：create, edit, delete, move, search, compile, terminal, ui

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
7. **terminal** - 执行终端命令
8. **ui** - 用户界面操作

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
     * 调用 OpenAI API（带超时和重试机制，支持流处理和工具调用）
     */
    async callOpenAI(messages, onStream = null) {
        let lastError = null;
        let conversationMessages = [...messages]; // 复制消息数组
        
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log('info', `OpenAI API 调用尝试 ${attempt + 1}/${this.config.maxRetries + 1}`);
                
                const controller = new AbortController();
                const timeoutMs = this.config.timeout * 1000; // 转换为毫秒
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    this.log('warn', `API 请求超时 (${this.config.timeout}秒)`);
                }, timeoutMs);
                
                // 准备请求体
                const requestBody = {
                    model: this.config.model,
                    messages: conversationMessages,
                    temperature: this.config.temperature
                };
                
                // 对于 o1 系列模型，不支持某些参数
                if (!this.config.model.startsWith('o1-')) {
                    requestBody.max_tokens = this.config.maxTokens;
                }
                
                // 智能选择模式：检查是否需要工具调用
                let useToolCalling = false;
                let useStreaming = !!onStream && this.config.enableStreaming;
                
                if (this.toolCallManager) {
                    const tools = this.toolCallManager.getToolDefinitions();
                    if (tools.length > 0) {
                        // 计算工具调用轮次，防止无限循环
                        const toolCallRounds = conversationMessages.filter(msg => msg.role === 'assistant' && msg.tool_calls).length;
                        const maxToolCallRounds = 15; // 最大允许15轮工具调用，支持两阶段系统的多轮迭代
                        
                        if (toolCallRounds < maxToolCallRounds) {
                            // 检查最后一条用户消息或助手消息是否需要工具调用
                            const lastMessage = conversationMessages[conversationMessages.length - 1];
                            const needsTools = this.shouldUseTools(lastMessage?.content || '', conversationMessages);
                            
                            if (needsTools) {
                                useToolCalling = true;
                                useStreaming = false; // 工具调用时禁用流模式
                                requestBody.tools = tools;
                                requestBody.tool_choice = 'auto';
                                this.log('info', `启用工具调用模式 (第${toolCallRounds + 1}轮)，可用工具: ${tools.length} 个`);
                            } else {
                                this.log('info', '当前消息不需要工具调用');
                            }
                        } else {
                            this.log('warn', `已达到最大工具调用轮次 (${maxToolCallRounds})，禁用工具调用`);
                        }
                    }
                }
                
                // 设置流模式
                if (useStreaming) {
                    requestBody.stream = true;
                    this.log('info', '启用流式响应模式');
                }
                
                const response = await fetch(`${this.config.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'User-Agent': 'LaTeX-Master-Agent/1.0.0'
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
                    if (useStreaming && requestBody.stream) {
                        return await this.handleStreamResponse(response, onStream);
                    } else {
                        // 处理普通响应
                        const data = await response.json();
                        
                        if (!data.choices || !data.choices[0]) {
                            throw new Error('OpenAI API 返回格式异常');
                        }
                        
                        const choice = data.choices[0];
                        
                        // 检查是否有工具调用
                        if (choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                            this.log('info', `收到 ${choice.message.tool_calls.length} 个工具调用请求`);
                            const toolCallResult = await this.handleToolCalls(choice.message, conversationMessages, onStream);
                            // handleToolCalls返回的是对象，我们需要返回这个对象以便在analyzeAndPlan中正确处理
                            return toolCallResult;
                        }
                        
                        // 普通消息响应
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
                    return this.createCompileAction(step.target);
                    
                case 'terminal':
                    return this.createTerminalAction(step.command);
                    
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
                newContent: newContent,
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
     * 创建终端命令动作
     */
    createTerminalAction(command) {
        return this.createAction('terminal', {
            command: command
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
            '扩写', '扩展', '完善', '补充', '创建', '新建',
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
        
        // 特殊情况：如果用户明确要求查看、分析或扩写项目内容，优先使用工具调用
        const projectAnalysisKeywords = [
            '查看.*项目', '分析.*项目', '整个项目', '所有.*章节', '扩写.*章节',
            '新建.*章节', '完善.*文档', '优化.*结构'
        ];
        
        const needsProjectAnalysis = projectAnalysisKeywords.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(message);
        });
        
        if (needsProjectAnalysis) {
            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (需要项目分析)`);
            return true;
        }
        
        // 检查是否已经有足够的上下文信息
        if (conversationMessages && conversationMessages.length > 0) {
            const toolResults = conversationMessages.filter(msg => msg.role === 'tool');
            
            // 如果已经有工具调用结果，检查是否需要更多信息
            if (toolResults.length > 0) {
                // 分析最近的工具调用结果
                const recentToolResult = toolResults[toolResults.length - 1];
                try {
                    const result = JSON.parse(recentToolResult.content);
         
                    // 如果最近的工具调用失败，可能需要尝试其他工具
                    if (!result.success) {
                        this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (上次工具调用失败)`);
                        return true;
                    }
                    
                    // 检查是否需要基于已有结果进行进一步的工具调用
                    // 例如：获取了文件列表后，可能需要读取具体文件
                    if (result.files && Array.isArray(result.files) && result.files.length > 0) {
                        // 如果有文件列表但消息中提到具体文件操作，可能需要读取文件
                        const needsFileContent = /读取|查看|内容|分析|修改|编辑|扩写/.test(lowerMessage);
                        if (needsFileContent) {
                            this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (需要读取文件内容)`);
                            return true;
                        }
                    }
                    
                } catch (error) {
                    // 解析失败，可能需要重新调用工具
                    this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (工具结果解析失败)`);
                    return true;
                }
            }
        }
        
        // 默认情况下，如果有工具关键词就启用工具调用
        this.log('info', `工具调用判断: "${message.substring(0, 50)}..." -> true (包含工具关键词)`);
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

你可以自由选择以下两种工作方式：

**1. 工具调用模式（信息获取）**
当你需要获取更多信息时，可以使用以下只读工具：
- \`read_file\`: 读取文件内容
- \`list_files\`: 列出目录文件
- \`get_file_structure\`: 获取项目结构
- \`search_in_files\`: 搜索文件内容
- \`get_project_info\`: 获取项目信息
- \`get_editor_state\`: 获取编辑器状态

**2. 执行操作模式（文件操作）**
当你有足够信息需要执行具体操作时，在你的回答中包含操作指令：

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

**可用的操作类型：**
- \`create\`: 创建新文件
- \`edit\`: 编辑现有文件（支持replace/insert/delete）
- \`delete\`: 删除文件
- \`move\`: 移动/重命名文件
- \`mkdir\`: 创建目录
- \`rmdir\`: 删除目录
- \`compile\`: 编译LaTeX文档

**决策原则：**
1. 如果需要查看/分析现有文件但没有足够信息 → 使用工具调用
2. 如果需要搜索特定内容但不知道在哪个文件 → 使用工具调用
3. 如果有足够信息可以执行具体操作 → 在回答中包含操作指令
4. 如果只是回答问题或提供建议 → 直接回答

**重要：**
- 工具调用只能用于读取信息，不能修改文件
- 操作指令只能用于修改文件，不能读取信息
- 你可以在多轮对话中灵活切换这两种模式
- 每次的结果都会作为上下文提供给你，帮助你做出更好的决策`;
    }

    /**
     * 构建包含累积上下文的消息
     */
    buildContextualMessage(originalMessage, accumulatedContext, conversationHistory) {
        let message = `**用户需求：** ${originalMessage}\n\n`;
        
        // 添加当前可用的上下文信息
        message += `**当前上下文信息：**\n`;
        
        // 项目信息
        if (accumulatedContext.project) {
            message += `- 项目：${accumulatedContext.project.name || '未命名'} (${accumulatedContext.project.files || 0} 个文件)\n`;
        }
        
        // 当前编辑器状态
        if (accumulatedContext.editor && accumulatedContext.editor.filePath) {
            message += `- 当前编辑文件：${accumulatedContext.editor.filePath}\n`;
            if (accumulatedContext.editor.content) {
                const preview = accumulatedContext.editor.content.substring(0, 200);
                message += `- 文件内容预览：${preview}${accumulatedContext.editor.content.length > 200 ? '...' : ''}\n`;
            }
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
        }
        
        // 执行结果
        if (accumulatedContext.executionResults) {
            const resultCount = Object.keys(accumulatedContext.executionResults).length;
            message += `- 已执行的操作：${resultCount} 项操作结果\n`;
            if (accumulatedContext.lastExecutionSummary) {
                message += `  最近执行：${accumulatedContext.lastExecutionSummary}\n`;
            }
        }
        
        message += '\n';
        
        // 添加对话历史摘要
        if (conversationHistory && conversationHistory.length > 0) {
            message += `**执行历史：**\n`;
            conversationHistory.forEach((entry, index) => {
                message += `${index + 1}. [${entry.type}] `;
                if (entry.type === 'tool_calls') {
                    const toolCount = entry.response.content?.tool_calls?.length || 0;
                    const successCount = Object.keys(entry.result.results || {}).length;
                    message += `工具调用 (${successCount}/${toolCount} 成功)\n`;
                } else if (entry.type === 'execute_operations') {
                    const { completedSteps, totalSteps } = entry.result;
                    message += `执行操作 (${completedSteps}/${totalSteps} 完成)\n`;
                }
            });
            message += '\n';
        }
        
        message += `**请基于上述信息，选择合适的方式处理用户需求。**`;
        
        return message;
    }

    /**
     * 处理工具调用并过滤只读操作
     */
    async handleToolCallsWithReadOnlyFilter(response, context) {
        const toolCalls = response.content.tool_calls || [];
        const results = {};
        let successCount = 0;
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
                this.log('warn', `跳过非只读工具: ${toolName}`);
                
                if (toolCallId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'error', {
                        success: false,
                        error: '工具调用模式下只允许只读操作'
                    });
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
        
        summary = `${successCount}/${toolCalls.length} 个工具调用成功`;
        
        return {
            results,
            summary,
            successCount,
            totalCount: toolCalls.length
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
            
            const operationsJson = operationsMatch[1].trim();
            const operations = JSON.parse(operationsJson);
            
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
                
                if (executionId && window.agentPanel) {
                    window.agentPanel.updateToolCallStep(executionId, i, 'executing');
                }
                
                const action = await this.createActionFromOperation(operation, context);
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