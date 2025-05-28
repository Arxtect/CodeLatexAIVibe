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
            'openai-integration',
            'tool-calling' // 新增工具调用能力
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
            enableStreaming: true, // 默认启用流式响应
            enableToolCalling: true // 默认启用工具调用
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
        if (window.ide) {
            this.toolCallManager = new ToolCallManager(window.ide);
        }
        
        // 注册 Agent 特有的钩子
        this.pluginManager.addHook('agent.message', this.handleAgentMessage.bind(this));
        
        this.log('info', 'LaTeX Master Agent 已初始化');
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
                },
                {
                    key: 'enableToolCalling',
                    label: '启用工具调用',
                    type: 'checkbox',
                    description: '开启后 AI 可以主动请求项目数据'
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
            enableStreaming: true, // 默认启用流式响应
            enableToolCalling: true // 默认启用工具调用
        };
    }
    
    /**
     * 处理用户消息
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
            
            // 分析任务并生成执行计划
            const plan = await this.analyzeAndPlan(message, fullContext, onStream);
            
            if (!plan) {
                return this.createResponse('❌ 无法理解您的需求，请重新描述');
            }
            
            // 执行计划
            return await this.executePlan(plan, fullContext);
            
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
            
            const plan = this.parsePlanResponse(response);
            
            if (plan) {
                this.currentPlan = plan;
                this.log('info', `执行计划生成: ${plan.steps.length} 个步骤`);
                plan.steps.forEach((step, i) => {
                    this.log('info', `  ${i + 1}. ${step.description}`);
                });
            }
            
            return plan;
            
        } catch (error) {
            this.log('error', '计划生成失败', error);
            throw error;
        }
    }
    
    /**
     * 构建系统提示词
     */
    buildSystemPrompt() {
        let systemPrompt = `你是 LaTeX Master，一个智能的 LaTeX 文档助手。你的任务是分析用户需求，制定详细的执行计划，并生成相应的操作指令。

你可以执行以下类型的操作：
1. **create** - 创建新文件
2. **edit** - 编辑现有文件（支持精确的行范围编辑）
3. **delete** - 删除文件
4. **move** - 移动/重命名文件
5. **search** - 搜索文件内容
6. **compile** - 编译 LaTeX 文档
7. **terminal** - 执行终端命令
8. **ui** - 用户界面操作

**重要：你必须生成可直接执行的具体操作步骤。**`;

        // 如果启用了工具调用，添加工具说明
        if (this.config.enableToolCalling && this.toolCallManager) {
            systemPrompt += `

**🔧 工具调用能力：**
你可以主动调用以下工具来获取项目信息：

📁 **文件系统工具：**
- \`read_file\`: 读取指定文件的内容
- \`list_files\`: 列出目录下的文件和文件夹
- \`get_file_structure\`: 获取完整的项目文件结构树

📝 **编辑器工具：**
- \`get_current_file\`: 获取当前打开文件的信息和内容
- \`get_selection\`: 获取编辑器中选中的文本
- \`get_cursor_position\`: 获取光标位置信息

🔍 **搜索工具：**
- \`search_in_files\`: 在项目文件中搜索指定文本

📊 **项目信息工具：**
- \`get_project_info\`: 获取项目基本信息和统计数据
- \`get_open_tabs\`: 获取当前打开的标签页信息
- \`get_recent_changes\`: 获取最近的文件变更历史

**使用建议：**
1. 在分析用户需求时，主动使用工具获取必要的上下文信息
2. 如果用户提到特定文件，使用 \`read_file\` 获取文件内容
3. 如果需要了解项目结构，使用 \`get_file_structure\` 或 \`list_files\`
4. 如果需要搜索特定内容，使用 \`search_in_files\`
5. 优先使用工具获取准确信息，而不是依赖用户提供的上下文

**工具调用时机：**
- 用户询问特定文件内容时
- 需要了解项目结构时
- 需要搜索代码或文档时
- 分析问题需要更多上下文时`;
        }

        systemPrompt += `

对于文件编辑操作，你需要：
1. 先读取文件内容（如果用户提供了上下文）
2. 分析需要修改的具体位置
3. 生成精确的编辑指令，包括：
   - 起始行号和结束行号
   - 要替换的内容
   - 新的内容

请根据用户需求，生成一个详细的执行计划，格式如下：

\`\`\`json
{
  "analysis": "对用户需求的详细分析",
  "goal": "要达成的具体目标",
  "steps": [
    {
      "id": 1,
      "type": "edit",
      "description": "删除重复内容",
      "target": "/images/README.md",
      "content": "# 图片文件夹\\n\\n请将图片文件放在这个文件夹中。\\n\\n支持的格式：\\n- PNG\\n- JPG\\n- JPEG\\n- GIF\\n- SVG\\n\\n## 使用说明\\n\\n1. 将图片文件拖拽到此文件夹\\n2. 在LaTeX文档中引用图片\\n3. 使用相对路径引用",
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
                
                // 智能选择模式：
                // 1. 如果启用工具调用且有工具可用，检查是否需要工具调用
                // 2. 如果需要工具调用，优先使用工具调用（禁用流模式）
                // 3. 否则根据用户配置决定是否使用流模式
                let useToolCalling = false;
                let useStreaming = !!onStream && this.config.enableStreaming;
                
                if (this.config.enableToolCalling && this.toolCallManager) {
                    const tools = this.toolCallManager.getToolDefinitions();
                    if (tools.length > 0) {
                        // 检查消息内容是否可能需要工具调用
                        const lastMessage = conversationMessages[conversationMessages.length - 1];
                        const needsTools = this.shouldUseTools(lastMessage?.content || '');
                        
                        if (needsTools) {
                            useToolCalling = true;
                            useStreaming = false; // 工具调用时禁用流模式
                            requestBody.tools = tools;
                            requestBody.tool_choice = 'auto';
                            this.log('info', `启用工具调用模式，可用工具: ${tools.length} 个`);
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
                            return await this.handleToolCalls(choice.message, conversationMessages, onStream);
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
     * 判断是否需要使用工具
     */
    shouldUseTools(message) {
        if (!message) return false;
        
        // 检查消息中是否包含需要工具调用的关键词
        const toolKeywords = [
            '读取文件', '查看文件', '获取文件', '文件内容',
            '列出文件', '文件列表', '目录结构', '项目结构',
            '搜索', '查找', '检索',
            '当前文件', '打开的文件', '编辑器',
            '选中', '光标', '位置',
            '项目信息', '统计', '概览',
            '扩写', '扩展', '完善', '补充', '创建',
            '帮我', '请', '能否', '可以',
            'latex', 'tex', '文档', '论文'
        ];
        
        const lowerMessage = message.toLowerCase();
        return toolKeywords.some(keyword => 
            lowerMessage.includes(keyword) || 
            lowerMessage.includes(keyword.toLowerCase())
        );
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
            // 提取 JSON 部分
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (!jsonMatch) {
                throw new Error('响应中未找到有效的 JSON 格式');
            }
            
            const plan = JSON.parse(jsonMatch[1]);
            
            // 验证计划格式
            if (!plan.steps || !Array.isArray(plan.steps)) {
                throw new Error('计划格式无效：缺少 steps 数组');
            }
            
            return plan;
            
        } catch (error) {
            this.log('error', '计划解析失败', { error: error.message, response });
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
                    
                default:
                    this.log('warn', `未知的步骤类型: ${step.type}`);
                    return null;
            }
        } catch (error) {
            this.log('error', '创建动作失败', error);
            return null;
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
            toolCallId = window.agentPanel.showToolCallPanel(assistantMessage.tool_calls);
        }
        
        // 执行所有工具调用
        for (let i = 0; i < assistantMessage.tool_calls.length; i++) {
            const toolCall = assistantMessage.tool_calls[i];
            
            try {
                this.log('info', `执行工具调用: ${toolCall.function.name}`);
                
                // 更新工具调用状态为执行中
                if (toolCallId && window.agentPanel && typeof window.agentPanel.updateToolCallStep === 'function') {
                    window.agentPanel.updateToolCallStep(toolCallId, i, 'executing');
                }
                
                // 解析参数
                const args = JSON.parse(toolCall.function.arguments);
                
                // 执行工具调用
                const result = await this.toolCallManager.executeToolCall(toolCall);
                
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
                
                this.log('info', `工具调用完成: ${toolCall.function.name}`);
                
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
        return await this.callOpenAI(conversationMessages, onStream);
    }
    
    onDestroy() {
        super.onDestroy();
        
        // 清理资源
        if (this.contextCollector) {
            this.contextCollector.clearCache();
        }
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