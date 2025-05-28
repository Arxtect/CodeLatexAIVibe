import { AgentPlugin } from '../core/AgentPlugin.js';
import { createVSCodeGlobal } from '../core/VSCodeCompat.js';

/**
 * LatexMaster Agent - 基于 OpenAI 的智能 LaTeX 助手
 * 类似 Cline/Cursor 的功能，能够自动分析需求并执行一系列操作
 */
export class LatexMasterAgent extends AgentPlugin {
    constructor() {
        super();
        
        this.id = 'latex-master-agent';
        this.name = 'LaTeX Master';
        this.description = '基于 OpenAI 的智能 LaTeX 助手，能够自动分析需求并执行复杂任务';
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
            model: 'gpt-4',
            maxTokens: 4000,
            temperature: 0.7,
            baseURL: 'https://api.openai.com/v1'
        };
        
        // 任务执行状态
        this.isExecuting = false;
        this.currentPlan = null;
        this.executionHistory = [];
        
        // 上下文收集器
        this.contextCollector = new ContextCollector();
    }
    
    onInit() {
        super.onInit();
        
        // 创建 VS Code 兼容 API
        this.vscode = createVSCodeGlobal(this.agentAPI);
        
        // 创建输出通道
        this.outputChannel = this.vscode.window.createOutputChannel('LaTeX Master');
        
        // 加载配置
        this.loadConfiguration();
        
        // 注册命令
        this.registerCommands();
        
        this.log('info', 'LaTeX Master Agent 已初始化');
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        const savedConfig = this.getConfig('latexMaster', {});
        this.config = { ...this.config, ...savedConfig };
        
        if (!this.config.apiKey) {
            this.outputChannel.appendLine('⚠️ 请配置 OpenAI API Key');
        }
    }
    
    /**
     * 注册命令
     */
    registerCommands() {
        this.vscode.commands.registerCommand('latexMaster.configure', async () => {
            await this.showConfigurationDialog();
        });
        
        this.vscode.commands.registerCommand('latexMaster.analyze', async () => {
            await this.analyzeProject();
        });
    }
    
    /**
     * 显示配置对话框
     */
    async showConfigurationDialog() {
        const apiKey = await this.vscode.window.showInputBox({
            prompt: '请输入 OpenAI API Key',
            value: this.config.apiKey,
            password: true
        });
        
        if (apiKey !== undefined) {
            this.config.apiKey = apiKey;
            
            const model = await this.vscode.window.showQuickPick([
                'gpt-4',
                'gpt-4-turbo',
                'gpt-3.5-turbo'
            ], {
                placeHolder: '选择 OpenAI 模型'
            });
            
            if (model) {
                this.config.model = model;
            }
            
            // 保存配置
            this.setConfig('latexMaster', this.config);
            this.vscode.window.showInformationMessage('配置已保存');
        }
    }
    
    /**
     * 处理用户消息
     */
    async processMessage(message, context) {
        try {
            if (!this.config.apiKey) {
                return this.createResponse(
                    '❌ 请先配置 OpenAI API Key\n\n点击右上角设置按钮进行配置',
                    [this.createUIAction('showMessage', { 
                        message: '请使用命令 "配置 API Key" 进行设置',
                        type: 'warning'
                    })]
                );
            }
            
            if (this.isExecuting) {
                return this.createResponse('🔄 正在执行任务中，请稍候...');
            }
            
            this.outputChannel.appendLine(`\n📝 用户请求: ${message}`);
            
            // 收集上下文
            const fullContext = await this.collectContext(message, context);
            
            // 分析任务并生成执行计划
            const plan = await this.analyzeAndPlan(message, fullContext);
            
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
        fullContext.editor = await this.contextCollector.getEditorContext();
        
        // 最近的操作历史
        fullContext.history = this.executionHistory.slice(-5);
        
        this.outputChannel.appendLine(`📊 上下文收集完成: ${Object.keys(fullContext).length} 项`);
        
        return fullContext;
    }
    
    /**
     * 分析任务并生成执行计划
     */
    async analyzeAndPlan(message, context) {
        try {
            this.outputChannel.appendLine('🤖 正在分析任务...');
            
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(message, context);
            
            const response = await this.callOpenAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);
            
            const plan = this.parsePlanResponse(response);
            
            if (plan) {
                this.currentPlan = plan;
                this.outputChannel.appendLine(`📋 执行计划生成: ${plan.steps.length} 个步骤`);
                plan.steps.forEach((step, i) => {
                    this.outputChannel.appendLine(`  ${i + 1}. ${step.description}`);
                });
            }
            
            return plan;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ 计划生成失败: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 构建系统提示词
     */
    buildSystemPrompt() {
        return `你是 LaTeX Master，一个智能的 LaTeX 文档助手。你的任务是分析用户需求，制定详细的执行计划，并生成相应的操作指令。

你可以执行以下类型的操作：
1. create - 创建新文件
2. edit - 编辑现有文件
3. delete - 删除文件
4. move - 移动/重命名文件
5. search - 搜索文件内容
6. compile - 编译 LaTeX 文档
7. terminal - 执行终端命令
8. ui - 用户界面操作

请根据用户需求，生成一个详细的执行计划，格式如下：

\`\`\`json
{
  "analysis": "对用户需求的分析",
  "goal": "要达成的目标",
  "steps": [
    {
      "id": 1,
      "type": "create|edit|delete|move|search|compile|terminal|ui",
      "description": "步骤描述",
      "target": "目标文件路径或操作对象",
      "content": "文件内容或操作参数",
      "reasoning": "执行此步骤的原因"
    }
  ],
  "expectedOutcome": "预期结果"
}
\`\`\`

注意：
- 分析要准确理解用户意图
- 步骤要详细且可执行
- 考虑 LaTeX 文档的最佳实践
- 确保操作的安全性和合理性`;
    }
    
    /**
     * 构建用户提示词
     */
    buildUserPrompt(message, context) {
        let prompt = `用户需求: ${message}\n\n`;
        
        // 添加项目上下文
        if (context.project) {
            prompt += `项目信息:\n${JSON.stringify(context.project, null, 2)}\n\n`;
        }
        
        // 添加文件结构
        if (context.fileStructure) {
            prompt += `文件结构:\n${context.fileStructure}\n\n`;
        }
        
        // 添加当前编辑器状态
        if (context.editor && context.editor.content) {
            prompt += `当前编辑的文件:\n`;
            prompt += `路径: ${context.editor.filePath}\n`;
            prompt += `内容预览:\n${context.editor.content.substring(0, 500)}...\n\n`;
        }
        
        // 添加历史操作
        if (context.history && context.history.length > 0) {
            prompt += `最近的操作历史:\n`;
            context.history.forEach((item, i) => {
                prompt += `${i + 1}. ${item.description}\n`;
            });
            prompt += '\n';
        }
        
        prompt += '请分析上述信息，生成详细的执行计划。';
        
        return prompt;
    }
    
    /**
     * 调用 OpenAI API
     */
    async callOpenAI(messages) {
        const response = await fetch(`${this.config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API 错误: ${error.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
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
            this.outputChannel.appendLine(`❌ 计划解析失败: ${error.message}`);
            this.outputChannel.appendLine(`原始响应: ${response}`);
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
            
            this.outputChannel.appendLine('🚀 开始执行计划...');
            
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i];
                this.outputChannel.appendLine(`\n📍 步骤 ${i + 1}: ${step.description}`);
                
                const action = await this.createActionFromStep(step, context);
                if (action) {
                    actions.push(action);
                    responseText += `✅ **步骤 ${i + 1}**: ${step.description}\n`;
                    
                    // 记录执行历史
                    this.executionHistory.push({
                        timestamp: new Date().toISOString(),
                        description: step.description,
                        type: step.type,
                        target: step.target
                    });
                } else {
                    responseText += `❌ **步骤 ${i + 1}**: ${step.description} (执行失败)\n`;
                }
            }
            
            responseText += `\n🎉 **预期结果**: ${plan.expectedOutcome}`;
            
            this.outputChannel.appendLine('\n✅ 计划执行完成');
            
            return this.createResponse(responseText, actions);
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ 计划执行失败: ${error.message}`);
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
                    return this.createEditAction(step.target, [{
                        range: { startLine: 0, endLine: 0 },
                        text: step.content || ''
                    }]);
                    
                case 'delete':
                    return this.createDeleteAction(step.target);
                    
                case 'move':
                    return this.createMoveAction(step.target, step.destination || '');
                    
                case 'search':
                    return this.createSearchAction(step.target, step.query || '');
                    
                case 'compile':
                    return this.createCompileAction(step.target || 'main.tex');
                    
                case 'terminal':
                    return this.createTerminalAction(step.content || '');
                    
                case 'ui':
                    return this.createUIAction(step.action || 'showMessage', {
                        message: step.content || step.description
                    });
                    
                default:
                    this.outputChannel.appendLine(`⚠️ 未知的步骤类型: ${step.type}`);
                    return null;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ 创建动作失败: ${error.message}`);
            return null;
        }
    }
    
    /**
     * 分析项目
     */
    async analyzeProject() {
        try {
            const context = await this.collectContext('分析项目结构和内容', {});
            
            const analysis = await this.analyzeAndPlan('请分析当前项目的结构、内容和潜在的改进建议', context);
            
            if (analysis) {
                this.outputChannel.appendLine('\n📊 项目分析结果:');
                this.outputChannel.appendLine(analysis.analysis);
                
                this.vscode.window.showInformationMessage('项目分析完成，请查看输出面板');
            }
            
        } catch (error) {
            this.vscode.window.showErrorMessage(`项目分析失败: ${error.message}`);
        }
    }
    
    onDestroy() {
        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
        super.onDestroy();
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
        
        try {
            // 递归获取所有文件
            await this.scanDirectory('/', files);
            return files.sort((a, b) => a.path.localeCompare(b.path));
        } catch (error) {
            console.error('扫描文件失败:', error);
            return [];
        }
    }
    
    /**
     * 扫描目录
     */
    async scanDirectory(dirPath, files) {
        try {
            const entries = await window.ide.fileSystem.readdir(dirPath);
            
            for (const entry of entries) {
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
                        
                        // 递归扫描子目录
                        await this.scanDirectory(fullPath, files);
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
     * 获取编辑器上下文
     */
    async getEditorContext() {
        try {
            if (!window.ide) {
                return null;
            }
            
            // 获取当前活动的编辑器
            const activeEditor = window.ide.editor;
            if (!activeEditor) {
                return null;
            }
            
            // 获取当前文件信息
            const currentFile = window.ide.currentFile;
            if (!currentFile) {
                return null;
            }
            
            // 获取编辑器内容和位置信息
            const content = activeEditor.getValue();
            const position = activeEditor.getPosition();
            const selection = activeEditor.getSelection();
            
            // 获取文件统计信息
            const lines = content.split('\n');
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            
            return {
                filePath: currentFile,
                content: content,
                contentPreview: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''),
                language: this.detectLanguage(currentFile),
                position: position ? {
                    line: position.lineNumber,
                    column: position.column
                } : { line: 1, column: 1 },
                selection: selection ? {
                    startLine: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLine: selection.endLineNumber,
                    endColumn: selection.endColumn,
                    selectedText: activeEditor.getModel().getValueInRange(selection)
                } : null,
                statistics: {
                    lines: lines.length,
                    characters: content.length,
                    words: wordCount,
                    size: new Blob([content]).size
                },
                lastModified: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('获取编辑器上下文失败:', error);
            return null;
        }
    }
    
    /**
     * 检测文件语言
     */
    detectLanguage(filePath) {
        if (!filePath) return 'plaintext';
        
        const extension = this.getFileExtension(filePath);
        const languageMap = {
            'tex': 'latex',
            'bib': 'bibtex',
            'md': 'markdown',
            'js': 'javascript',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'py': 'python',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java'
        };
        
        return languageMap[extension] || 'plaintext';
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
    
    /**
     * 获取项目统计信息
     */
    async getProjectStats() {
        try {
            const files = await this.getAllFiles();
            const texFiles = files.filter(f => f.extension === 'tex');
            const bibFiles = files.filter(f => f.extension === 'bib');
            const imageFiles = files.filter(f => ['png', 'jpg', 'jpeg', 'pdf', 'eps'].includes(f.extension));
            
            let totalWords = 0;
            let totalLines = 0;
            
            // 统计 LaTeX 文件的内容
            for (const file of texFiles) {
                try {
                    const content = await window.ide.fileSystem.readFile(file.path);
                    const lines = content.split('\n');
                    const words = content.split(/\s+/).filter(word => word.length > 0);
                    
                    totalLines += lines.length;
                    totalWords += words.length;
                } catch (error) {
                    console.warn(`无法读取文件 ${file.path}:`, error);
                }
            }
            
            return {
                totalFiles: files.length,
                texFiles: texFiles.length,
                bibFiles: bibFiles.length,
                imageFiles: imageFiles.length,
                totalWords: totalWords,
                totalLines: totalLines,
                projectSize: files.reduce((total, file) => total + (file.size || 0), 0)
            };
        } catch (error) {
            console.error('获取项目统计失败:', error);
            return null;
        }
    }
} 