import { AgentPlugin } from '../core/AgentPlugin.js';
import { createVSCodeGlobal } from '../core/VSCodeCompat.js';

/**
 * Cline 兼容 Agent
 * 展示如何移植 VS Code 插件到我们的 Agent 系统
 */
export class ClineCompatAgent extends AgentPlugin {
    constructor() {
        super();
        
        // 设置 Agent 基本信息
        this.id = 'cline-compat-agent';
        this.name = 'Cline 兼容助手';
        this.description = '基于 Cline 插件模式的 AI 编程助手，支持代码生成、文件操作和项目管理';
        this.version = '1.0.0';
        this.author = 'LaTeX IDE Team';
        
        // 定义 Agent 能力
        this.capabilities = [
            'code-generation',
            'file-operations',
            'project-management',
            'debugging-assistance',
            'refactoring',
            'documentation'
        ];
        
        // VS Code 兼容 API
        this.vscode = null;
        this.outputChannel = null;
        
        // 默认配置
        this.config = {
            autoSave: true,
            showProgress: true,
            maxTokens: 4000,
            temperature: 0.7,
            model: 'gpt-4'
        };
    }

    /**
     * 初始化 Agent
     */
    onInit() {
        // 创建 VS Code 兼容 API
        this.vscode = createVSCodeGlobal(this.agentAPI);
        
        // 创建输出通道
        this.outputChannel = this.vscode.window.createOutputChannel('Cline Agent');
        
        // 注册命令
        this.registerCommands();
        
        // 设置文件监听
        this.setupFileWatchers();
        
        this.log('info', 'Cline 兼容 Agent 初始化完成');
        this.outputChannel.appendLine('Cline 兼容 Agent 已启动');
    }

    /**
     * 注册 VS Code 风格的命令
     */
    registerCommands() {
        // 注册主要命令
        this.vscode.commands.registerCommand('cline.chat', () => {
            this.agentAPI.showPanel();
        });

        this.vscode.commands.registerCommand('cline.newTask', () => {
            this.startNewTask();
        });

        this.vscode.commands.registerCommand('cline.clearHistory', () => {
            this.clearChatHistory();
        });

        this.vscode.commands.registerCommand('cline.exportChat', () => {
            this.exportChatHistory();
        });
    }

    /**
     * 设置文件监听器
     */
    setupFileWatchers() {
        // 监听文件变化
        const watcher = this.vscode.workspace.createFileSystemWatcher('**/*');
        
        watcher.onDidCreate((uri) => {
            this.outputChannel.appendLine(`文件已创建: ${uri.fsPath}`);
        });

        watcher.onDidChange((uri) => {
            this.outputChannel.appendLine(`文件已修改: ${uri.fsPath}`);
        });

        watcher.onDidDelete((uri) => {
            this.outputChannel.appendLine(`文件已删除: ${uri.fsPath}`);
        });
    }

    /**
     * 处理用户消息 - 主要的 Cline 风格处理逻辑
     */
    async processMessage(message, context) {
        try {
            this.outputChannel.appendLine(`处理用户消息: ${message}`);
            
            // 显示进度
            if (this.config.showProgress) {
                this.vscode.window.showInformationMessage('正在处理您的请求...');
            }

            // 解析用户意图
            const intent = this.parseUserIntent(message);
            
            // 获取当前上下文
            const currentContext = await this.getCurrentContext();
            
            // 根据意图类型处理
            switch (intent.type) {
                case 'code_generation':
                    return await this.handleCodeGeneration(message, intent, currentContext);
                case 'file_operation':
                    return await this.handleFileOperation(message, intent, currentContext);
                case 'project_analysis':
                    return await this.handleProjectAnalysis(message, intent, currentContext);
                case 'debugging':
                    return await this.handleDebugging(message, intent, currentContext);
                case 'refactoring':
                    return await this.handleRefactoring(message, intent, currentContext);
                default:
                    return await this.handleGeneralQuery(message, intent, currentContext);
            }

        } catch (error) {
            this.handleError(error, 'processMessage');
            this.outputChannel.appendLine(`错误: ${error.message}`);
            return this.createResponse('抱歉，处理您的请求时出现了错误。请查看输出面板了解详情。');
        }
    }

    /**
     * 解析用户意图 - Cline 风格的意图识别
     */
    parseUserIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // 代码生成意图
        if (lowerMessage.includes('创建') || lowerMessage.includes('生成') || 
            lowerMessage.includes('写') || lowerMessage.includes('实现')) {
            return {
                type: 'code_generation',
                action: this.extractCodeAction(message),
                target: this.extractTarget(message)
            };
        }
        
        // 文件操作意图
        if (lowerMessage.includes('文件') || lowerMessage.includes('删除') || 
            lowerMessage.includes('移动') || lowerMessage.includes('重命名')) {
            return {
                type: 'file_operation',
                action: this.extractFileAction(message),
                target: this.extractTarget(message)
            };
        }
        
        // 项目分析意图
        if (lowerMessage.includes('分析') || lowerMessage.includes('结构') || 
            lowerMessage.includes('概览') || lowerMessage.includes('总结')) {
            return {
                type: 'project_analysis',
                scope: this.extractAnalysisScope(message)
            };
        }
        
        // 调试意图
        if (lowerMessage.includes('调试') || lowerMessage.includes('错误') || 
            lowerMessage.includes('bug') || lowerMessage.includes('问题')) {
            return {
                type: 'debugging',
                issue: this.extractIssue(message)
            };
        }
        
        // 重构意图
        if (lowerMessage.includes('重构') || lowerMessage.includes('优化') || 
            lowerMessage.includes('改进') || lowerMessage.includes('整理')) {
            return {
                type: 'refactoring',
                target: this.extractTarget(message)
            };
        }
        
        return {
            type: 'general',
            query: message
        };
    }

    /**
     * 获取当前上下文 - 类似 Cline 的上下文收集
     */
    async getCurrentContext() {
        const activeEditor = this.vscode.window.activeTextEditor();
        const workspaceFolders = this.vscode.workspace.workspaceFolders;
        const files = await this.vscode.workspace.findFiles('**/*', '**/node_modules/**');
        
        return {
            activeFile: activeEditor ? {
                path: activeEditor.document.fileName,
                content: activeEditor.document.getText(),
                language: activeEditor.document.languageId,
                selection: activeEditor.selection
            } : null,
            workspace: {
                folders: workspaceFolders,
                files: files.slice(0, 50) // 限制文件数量
            },
            openTabs: Array.from(this.ide.openTabs.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 处理代码生成请求
     */
    async handleCodeGeneration(message, intent, context) {
        this.outputChannel.appendLine('处理代码生成请求');
        
        // 分析需要生成的代码类型
        const codeType = this.analyzeCodeType(message, context);
        
        // 生成代码
        const generatedCode = await this.generateCode(codeType, message, context);
        
        // 创建动作
        const actions = [];
        
        if (context.activeFile) {
            // 在当前文件中插入代码
            actions.push(this.createEditAction(
                context.activeFile.path,
                [{
                    range: context.activeFile.selection,
                    text: generatedCode
                }]
            ));
        } else {
            // 创建新文件
            const fileName = this.suggestFileName(codeType, message);
            actions.push(this.createCreateAction(fileName, generatedCode, { open: true }));
        }
        
        return this.createResponse(
            `我已经为您生成了${codeType}代码。代码已${context.activeFile ? '插入到当前文件' : '创建为新文件'}。`,
            actions
        );
    }

    /**
     * 处理文件操作请求
     */
    async handleFileOperation(message, intent, context) {
        this.outputChannel.appendLine('处理文件操作请求');
        
        const actions = [];
        let responseMessage = '';
        
        switch (intent.action) {
            case 'create':
                const newFileName = intent.target || 'new-file.tex';
                actions.push(this.createCreateAction(newFileName, '', { open: true }));
                responseMessage = `已创建文件: ${newFileName}`;
                break;
                
            case 'delete':
                if (context.activeFile) {
                    actions.push(this.createDeleteAction(context.activeFile.path));
                    responseMessage = `已删除文件: ${context.activeFile.path}`;
                }
                break;
                
            case 'rename':
                if (context.activeFile && intent.target) {
                    actions.push(this.createMoveAction(context.activeFile.path, intent.target));
                    responseMessage = `已重命名文件: ${context.activeFile.path} -> ${intent.target}`;
                }
                break;
        }
        
        return this.createResponse(responseMessage, actions);
    }

    /**
     * 处理项目分析请求
     */
    async handleProjectAnalysis(message, intent, context) {
        this.outputChannel.appendLine('处理项目分析请求');
        
        const analysis = await this.analyzeProject(context);
        
        return this.createResponse(
            `## 项目分析报告\n\n${analysis}`,
            []
        );
    }

    /**
     * 生成代码
     */
    async generateCode(codeType, message, context) {
        // 这里应该调用 AI 模型生成代码
        // 现在返回示例代码
        
        switch (codeType) {
            case 'latex-document':
                return this.generateLatexDocument(message);
            case 'latex-section':
                return this.generateLatexSection(message);
            case 'latex-table':
                return this.generateLatexTable(message);
            case 'latex-equation':
                return this.generateLatexEquation(message);
            default:
                return `% 生成的代码\n% 基于请求: ${message}\n\n`;
        }
    }

    /**
     * 分析代码类型
     */
    analyzeCodeType(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('文档')) return 'latex-document';
        if (lowerMessage.includes('章节')) return 'latex-section';
        if (lowerMessage.includes('表格')) return 'latex-table';
        if (lowerMessage.includes('公式')) return 'latex-equation';
        
        return 'general';
    }

    /**
     * 分析项目
     */
    async analyzeProject(context) {
        const fileCount = context.workspace.files.length;
        const latexFiles = context.workspace.files.filter(f => f.fsPath.endsWith('.tex')).length;
        const openTabs = context.openTabs.length;
        
        return `
**文件统计:**
- 总文件数: ${fileCount}
- LaTeX 文件: ${latexFiles}
- 打开的标签: ${openTabs}

**当前活动文件:**
${context.activeFile ? `- ${context.activeFile.path} (${context.activeFile.language})` : '- 无'}

**建议:**
- 项目结构良好
- 建议定期备份重要文件
- 可以考虑添加更多文档说明
        `.trim();
    }

    /**
     * 生成 LaTeX 文档模板
     */
    generateLatexDocument(message) {
        return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{新文档}
\\author{作者}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{引言}

这是一个新的 LaTeX 文档。

\\end{document}`;
    }

    /**
     * 生成 LaTeX 章节
     */
    generateLatexSection(message) {
        const title = this.extractSectionTitle(message) || '新章节';
        return `\\section{${title}}

这是${title}的内容。

`;
    }

    /**
     * 生成 LaTeX 表格
     */
    generateLatexTable(message) {
        return `\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|c|}
\\hline
列1 & 列2 & 列3 \\\\
\\hline
数据1 & 数据2 & 数据3 \\\\
数据4 & 数据5 & 数据6 \\\\
\\hline
\\end{tabular}
\\caption{表格标题}
\\label{tab:example}
\\end{table}

`;
    }

    /**
     * 生成 LaTeX 公式
     */
    generateLatexEquation(message) {
        return `\\begin{equation}
E = mc^2
\\label{eq:einstein}
\\end{equation}

`;
    }

    /**
     * 辅助方法
     */
    extractCodeAction(message) {
        if (message.includes('创建')) return 'create';
        if (message.includes('生成')) return 'generate';
        if (message.includes('写')) return 'write';
        return 'generate';
    }

    extractFileAction(message) {
        if (message.includes('创建')) return 'create';
        if (message.includes('删除')) return 'delete';
        if (message.includes('重命名')) return 'rename';
        if (message.includes('移动')) return 'move';
        return 'create';
    }

    extractTarget(message) {
        // 简单的目标提取逻辑
        const match = message.match(/["']([^"']+)["']/);
        return match ? match[1] : null;
    }

    extractAnalysisScope(message) {
        if (message.includes('项目')) return 'project';
        if (message.includes('文件')) return 'file';
        return 'general';
    }

    extractIssue(message) {
        return message;
    }

    extractSectionTitle(message) {
        const match = message.match(/章节[""']([^""']+)[""']/);
        return match ? match[1] : null;
    }

    suggestFileName(codeType, message) {
        switch (codeType) {
            case 'latex-document':
                return '/new-document.tex';
            case 'latex-section':
                return '/new-section.tex';
            default:
                return '/new-file.tex';
        }
    }

    /**
     * 开始新任务
     */
    startNewTask() {
        this.agentAPI.clearChatHistory();
        this.outputChannel.appendLine('开始新任务');
        this.vscode.window.showInformationMessage('已开始新任务，聊天历史已清空');
    }

    /**
     * 清空聊天历史
     */
    clearChatHistory() {
        this.agentAPI.clearChatHistory();
        this.outputChannel.appendLine('聊天历史已清空');
    }

    /**
     * 导出聊天历史
     */
    exportChatHistory() {
        const history = this.agentAPI.getChatHistory();
        const exportData = JSON.stringify(history, null, 2);
        
        // 创建导出文件
        const fileName = `/chat-export-${Date.now()}.json`;
        const action = this.createCreateAction(fileName, exportData, { open: true });
        
        this.agentAPI.executeAction(action);
        this.outputChannel.appendLine(`聊天历史已导出到: ${fileName}`);
    }

    /**
     * 处理一般查询
     */
    async handleGeneralQuery(message, intent, context) {
        return this.createResponse(
            `我理解您的请求："${message}"。作为 Cline 兼容助手，我可以帮助您：\n\n` +
            `- 生成和编辑 LaTeX 代码\n` +
            `- 管理项目文件\n` +
            `- 分析项目结构\n` +
            `- 调试和优化代码\n\n` +
            `请告诉我您具体需要什么帮助？`
        );
    }

    /**
     * 处理调试请求
     */
    async handleDebugging(message, intent, context) {
        this.outputChannel.appendLine('处理调试请求');
        
        if (context.activeFile) {
            const analysis = this.analyzeCodeForIssues(context.activeFile.content);
            return this.createResponse(
                `## 代码分析结果\n\n${analysis}\n\n如需具体修复建议，请提供更多详细信息。`
            );
        }
        
        return this.createResponse('请打开一个文件，我可以帮您分析其中的问题。');
    }

    /**
     * 处理重构请求
     */
    async handleRefactoring(message, intent, context) {
        this.outputChannel.appendLine('处理重构请求');
        
        return this.createResponse(
            '重构功能正在开发中。目前我可以帮助您：\n\n' +
            '- 优化 LaTeX 代码结构\n' +
            '- 整理文件组织\n' +
            '- 改进代码可读性\n\n' +
            '请具体说明您想要重构的内容。'
        );
    }

    /**
     * 分析代码问题
     */
    analyzeCodeForIssues(content) {
        const issues = [];
        
        // 简单的 LaTeX 代码分析
        if (!content.includes('\\documentclass')) {
            issues.push('- 缺少文档类声明');
        }
        
        if (!content.includes('\\begin{document}')) {
            issues.push('- 缺少文档开始标记');
        }
        
        if (!content.includes('\\end{document}')) {
            issues.push('- 缺少文档结束标记');
        }
        
        if (issues.length === 0) {
            return '代码结构看起来正常，没有发现明显问题。';
        }
        
        return '发现以下问题：\n\n' + issues.join('\n');
    }

    /**
     * 销毁时清理资源
     */
    onDestroy() {
        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
        this.log('info', 'Cline 兼容 Agent 已销毁');
    }
} 