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
     * 处理消息
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
            
            this.log('info', `用户请求: ${message}`);
            
            // 收集上下文
            const fullContext = await this.collectContext(message, context);
            
            // 初始化对话历史和循环控制
            let conversationMessages = [];
            let maxIterations = 5; // 防止无限循环
            let iteration = 0;
            let originalMessage = message; // 保存原始消息
            
            while (iteration < maxIterations) {
                iteration++;
                this.log('info', `处理迭代 ${iteration}/${maxIterations}`);
                
                // 判断是否需要使用工具调用
                const shouldUseTools = this.shouldUseTools(originalMessage, conversationMessages);
                
                if (shouldUseTools) {
                    this.log('info', '使用工具调用模式');
                    
                    // 构建工具调用的消息
                    const systemPrompt = this.buildSystemPrompt();
                    const userPrompt = this.buildUserPrompt(originalMessage, fullContext);
                    
                    const toolCallMessages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                        ...conversationMessages
                    ];
                    
                    // 调用API进行工具调用
                    const toolCallResponse = await this.callOpenAI(toolCallMessages, onStream);
                    
                    // 检查是否是工具调用响应
                    if (typeof toolCallResponse === 'object' && toolCallResponse.isToolCallResponse) {
                        // 工具调用完成，将结果添加到对话历史
                        conversationMessages.push({
                            role: 'assistant',
                            content: toolCallResponse.content
                        });
                        
                        this.log('info', '工具调用完成，继续处理后续响应');
                        // 继续下一轮处理，让AI基于工具调用结果生成执行计划
                        continue;
                    } else {
                        // 如果不是工具调用，直接返回响应
                        return this.createResponse(toolCallResponse);
                    }
                } else {
                    this.log('info', '使用执行计划模式');
                    
                    // 分析并生成执行计划
                    const result = await this.analyzeAndPlan(originalMessage, fullContext, onStream);
                    
                    if (!result) {
                        return this.createResponse('❌ 无法理解您的需求，请重新描述');
                    }
                    
                    // 处理不同类型的响应
                    if (result.isToolCallResponse) {
                        // 工具调用响应，添加到对话历史并继续
                        conversationMessages.push({
                            role: 'assistant',
                            content: result.content
                        });
                        this.log('info', '收到工具调用响应，继续处理');
                        continue;
                    } else if (result.isTaskCompleted) {
                        // 任务完成，返回完成消息
                        this.log('info', '任务已完成');
                        return this.createResponse(`✅ ${result.content}`);
                    } else if (result.isDirectResponse) {
                        // 直接响应，不需要执行计划
                        this.log('info', '返回直接响应');
                        return this.createResponse(result.content);
                    } else if (result.steps && Array.isArray(result.steps)) {
                        // 检查是否包含completeTask步骤
                        const hasCompleteTask = result.steps.some(step => step.type === 'completeTask');
                        
                        if (hasCompleteTask) {
                            // 包含完成任务步骤，执行计划并结束
                            this.log('info', '执行计划包含完成任务步骤，开始执行并结束');
                            return await this.executePlan(result, fullContext);
                        } else {
                            // 不包含完成任务步骤，执行当前计划并继续
                            this.log('info', '执行部分计划，继续处理');
                            
                            // 执行当前计划
                            await this.executePlan(result, fullContext);
                            
                            // 将执行结果添加到对话历史
                            conversationMessages.push({
                                role: 'assistant',
                                content: `已执行计划: ${result.goal}。请继续下一步操作。`
                            });
                            
                            // 添加用户消息，要求继续完成任务
                            conversationMessages.push({
                                role: 'user',
                                content: '请继续完成剩余的任务，直到全部完成。'
                            });
                            
                            // 继续下一轮处理
                            continue;
                        }
                    } else {
                        // 未知响应类型
                        this.log('warn', '未知的响应类型', result);
                        return this.createResponse('❌ 响应格式异常，请重试');
                    }
                }
            }
            
            // 如果达到最大迭代次数，返回警告
            this.log('warn', `达到最大迭代次数 ${maxIterations}，停止处理`);
            return this.createResponse('⚠️ 处理过程过长，已自动停止。任务可能已部分完成，请检查结果或尝试简化您的请求。');
            
        } catch (error) {
            this.handleError(error, 'processMessage');
            return this.createResponse(`❌ 处理失败: ${error.message}`);
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
     * 分析任务并生成执行计划
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
     * 构建系统提示词
     */
    buildSystemPrompt() {
        let systemPrompt = `你是 LaTeX Master，一个智能的 LaTeX 文档助手。

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
                        const maxToolCallRounds = 3; // 最大允许3轮工具调用
                        
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