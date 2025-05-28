import { AgentPlugin } from '../core/AgentPlugin.js';

/**
 * 示例 Agent 插件
 * 展示如何实现一个基础的 LaTeX 助手 Agent
 */
export class ExampleAgent extends AgentPlugin {
    constructor() {
        super();
        
        // 设置 Agent 基本信息
        this.id = 'example-agent';
        this.name = 'LaTeX 助手';
        this.description = '一个简单的 LaTeX 编辑助手，可以帮助创建、编辑和管理 LaTeX 文档';
        this.version = '1.0.0';
        this.author = 'LaTeX IDE Team';
        
        // 定义 Agent 能力
        this.capabilities = [
            'document-creation',
            'code-editing',
            'latex-assistance',
            'file-management',
            'compilation-help'
        ];
        
        // 默认配置
        this.config = {
            autoSave: true,
            suggestionsEnabled: true,
            verboseMode: false,
            maxResponseLength: 1000
        };
    }

    /**
     * 自定义初始化
     */
    onInit() {
        this.log('info', 'LaTeX 助手 Agent 初始化完成');
        
        // 可以在这里设置定时任务、监听器等
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (this.agentAPI) {
            // 监听文件变化
            this.agentAPI.on('fileChanged', (data) => {
                this.onFileChanged(data);
            });
            
            // 监听编译事件
            this.agentAPI.on('compilationStarted', (data) => {
                this.onCompilationStarted(data);
            });
        }
    }

    /**
     * 处理用户消息的核心方法
     */
    async processMessage(message, context) {
        try {
            // 验证消息
            if (!this.validateMessage(message)) {
                return this.createResponse('请输入有效的消息。');
            }

            this.log('info', '处理用户消息', { message, context });

            // 解析用户意图
            const intent = this.parseIntent(message);
            
            // 根据意图处理消息
            switch (intent.type) {
                case 'create':
                    return await this.handleCreateIntent(message, context);
                case 'edit':
                    return await this.handleEditIntent(message, context);
                case 'delete':
                    return await this.handleDeleteIntent(message, context);
                case 'search':
                    return await this.handleSearchIntent(message, context);
                case 'compile':
                    return await this.handleCompileIntent(message, context);
                default:
                    return await this.handleGeneralIntent(message, context);
            }

        } catch (error) {
            this.handleError(error, 'processMessage');
            return this.createResponse('抱歉，处理您的请求时出现了错误。请稍后再试。');
        }
    }

    /**
     * 处理创建意图
     */
    async handleCreateIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('文档') || lowerMessage.includes('document')) {
            return await this.createLatexDocument(message, context);
        }
        
        if (lowerMessage.includes('章节') || lowerMessage.includes('section')) {
            return await this.createSection(message, context);
        }
        
        if (lowerMessage.includes('表格') || lowerMessage.includes('table')) {
            return await this.createTable(message, context);
        }
        
        if (lowerMessage.includes('公式') || lowerMessage.includes('equation')) {
            return await this.createEquation(message, context);
        }
        
        return this.createResponse('我可以帮您创建 LaTeX 文档、章节、表格或公式。请告诉我您想创建什么？');
    }

    /**
     * 创建 LaTeX 文档
     */
    async createLatexDocument(message, context) {
        const fileName = this.extractFileName(message) || 'new-document.tex';
        const documentType = this.extractDocumentType(message);
        
        const template = this.getDocumentTemplate(documentType);
        
        const actions = [
            this.createCreateAction(`/${fileName}`, template, { open: true }),
            this.createUIAction('showMessage', { 
                message: `已创建 ${documentType} 文档: ${fileName}` 
            })
        ];
        
        return this.createResponse(
            `我已经为您创建了一个新的 ${documentType} 文档 "${fileName}"。文档包含了基本的结构和常用的包。`,
            actions
        );
    }

    /**
     * 创建章节
     */
    async createSection(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加章节。');
        }
        
        const sectionTitle = this.extractSectionTitle(message) || '新章节';
        const sectionLevel = this.extractSectionLevel(message);
        
        const sectionCode = this.generateSectionCode(sectionLevel, sectionTitle);
        
        // 在当前光标位置插入章节
        const position = editorContext.position;
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: sectionCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经在当前位置添加了${sectionLevel}："${sectionTitle}"。`,
            actions
        );
    }

    /**
     * 创建表格
     */
    async createTable(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加表格。');
        }
        
        const { rows, cols } = this.extractTableDimensions(message);
        const tableCode = this.generateTableCode(rows, cols);
        
        const position = editorContext.position;
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: tableCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经为您创建了一个 ${rows}×${cols} 的表格。您可以根据需要修改表格内容。`,
            actions
        );
    }

    /**
     * 创建公式
     */
    async createEquation(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加公式。');
        }
        
        const equationType = this.extractEquationType(message);
        const equationCode = this.generateEquationCode(equationType);
        
        const position = editorContext.position;
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: equationCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经为您添加了${equationType}公式环境。请在其中输入您的数学公式。`,
            actions
        );
    }

    /**
     * 处理编辑意图
     */
    async handleEditIntent(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个文件，然后我可以帮您进行编辑。');
        }
        
        // 这里可以实现更复杂的编辑逻辑
        return this.createResponse(
            '我可以帮您编辑当前文档。请告诉我您想要进行什么样的修改？比如：\n' +
            '- 添加章节或内容\n' +
            '- 修改格式\n' +
            '- 插入表格或公式\n' +
            '- 调整文档结构'
        );
    }

    /**
     * 处理删除意图
     */
    async handleDeleteIntent(message, context) {
        return this.createResponse(
            '我可以帮您删除文件或内容。为了安全起见，请明确告诉我您想删除什么。\n' +
            '例如："删除当前章节"或"删除文件 example.tex"'
        );
    }

    /**
     * 处理搜索意图
     */
    async handleSearchIntent(message, context) {
        const query = this.extractSearchQuery(message);
        if (!query) {
            return this.createResponse('请告诉我您想搜索什么内容？');
        }
        
        const actions = [
            this.createSearchAction(query)
        ];
        
        return this.createResponse(
            `我正在搜索 "${query}"...`,
            actions
        );
    }

    /**
     * 处理编译意图
     */
    async handleCompileIntent(message, context) {
        const editorContext = this.getEditorContext();
        
        const actions = [
            this.createCompileAction(editorContext?.filePath)
        ];
        
        return this.createResponse(
            '我正在为您编译 LaTeX 文档...',
            actions
        );
    }

    /**
     * 处理一般意图
     */
    async handleGeneralIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        
        // 帮助信息
        if (lowerMessage.includes('帮助') || lowerMessage.includes('help')) {
            return this.createResponse(this.getHelpMessage());
        }
        
        // 状态查询
        if (lowerMessage.includes('状态') || lowerMessage.includes('status')) {
            return this.createResponse(await this.getStatusMessage());
        }
        
        // 默认响应
        return this.createResponse(
            '我是您的 LaTeX 助手。我可以帮您：\n' +
            '• 创建新的 LaTeX 文档、章节、表格和公式\n' +
            '• 编辑和格式化文档内容\n' +
            '• 搜索文件和内容\n' +
            '• 编译 LaTeX 文档\n' +
            '• 管理项目文件\n\n' +
            '请告诉我您需要什么帮助？'
        );
    }

    /**
     * 获取帮助信息
     */
    getHelpMessage() {
        return `LaTeX 助手使用指南：

📝 创建内容：
• "创建新文档" - 创建新的 LaTeX 文档
• "添加章节：标题" - 在当前位置添加章节
• "创建表格 3x4" - 创建指定大小的表格
• "插入公式" - 添加数学公式环境

✏️ 编辑功能：
• "编辑当前文档" - 获取编辑建议
• "格式化代码" - 整理文档格式

🔍 搜索功能：
• "搜索：关键词" - 在项目中搜索内容

🔧 工具功能：
• "编译文档" - 编译当前 LaTeX 文档
• "查看状态" - 显示项目状态信息

输入 "帮助" 可随时查看此信息。`;
    }

    /**
     * 获取状态信息
     */
    async getStatusMessage() {
        const workspace = this.getWorkspaceContext();
        const editor = this.getEditorContext();
        const files = await this.getFilesContext();
        
        return `📊 项目状态：

📁 工作区：${workspace?.rootPath || '未知'}
📄 当前文件：${editor?.filePath || '无'}
📚 总文件数：${files?.totalFiles || 0}
🔖 打开的文件：${workspace?.openFiles?.length || 0}

⚙️ Agent 配置：
• 自动保存：${this.config.autoSave ? '开启' : '关闭'}
• 建议功能：${this.config.suggestionsEnabled ? '开启' : '关闭'}
• 详细模式：${this.config.verboseMode ? '开启' : '关闭'}`;
    }

    // 辅助方法

    extractFileName(message) {
        const match = message.match(/文件名[：:]?\s*([^\s]+)/);
        return match ? match[1] : null;
    }

    extractDocumentType(message) {
        if (message.includes('文章') || message.includes('article')) return 'article';
        if (message.includes('报告') || message.includes('report')) return 'report';
        if (message.includes('书籍') || message.includes('book')) return 'book';
        return 'article';
    }

    extractSectionTitle(message) {
        const patterns = [
            /章节[：:]?\s*([^，。]+)/,
            /标题[：:]?\s*([^，。]+)/,
            /section[：:]?\s*([^，。]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1].trim();
        }
        return null;
    }

    extractSectionLevel(message) {
        if (message.includes('子章节') || message.includes('subsection')) return '子章节';
        if (message.includes('子子章节') || message.includes('subsubsection')) return '子子章节';
        return '章节';
    }

    extractTableDimensions(message) {
        const match = message.match(/(\d+)\s*[x×]\s*(\d+)/);
        if (match) {
            return { rows: parseInt(match[1]), cols: parseInt(match[2]) };
        }
        return { rows: 3, cols: 3 }; // 默认大小
    }

    extractEquationType(message) {
        if (message.includes('行内') || message.includes('inline')) return '行内';
        if (message.includes('编号') || message.includes('numbered')) return '编号';
        return '显示';
    }

    extractSearchQuery(message) {
        const patterns = [
            /搜索[：:]?\s*([^，。]+)/,
            /查找[：:]?\s*([^，。]+)/,
            /search[：:]?\s*([^，。]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) return match[1].trim();
        }
        return null;
    }

    getDocumentTemplate(type) {
        const templates = {
            article: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{文档标题}
\\author{作者姓名}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{介绍}
这里是文档的介绍部分。

\\section{主要内容}
这里是文档的主要内容。

\\end{document}`,
            
            report: `\\documentclass{report}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{报告标题}
\\author{作者姓名}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents

\\chapter{介绍}
这里是报告的介绍部分。

\\chapter{方法}
这里描述使用的方法。

\\chapter{结果}
这里展示结果。

\\chapter{结论}
这里是结论部分。

\\end{document}`,
            
            book: `\\documentclass{book}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{书籍标题}
\\author{作者姓名}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents

\\part{第一部分}

\\chapter{第一章}
\\section{章节内容}
这里是章节内容。

\\end{document}`
        };
        
        return templates[type] || templates.article;
    }

    generateSectionCode(level, title) {
        const commands = {
            '章节': '\\section',
            '子章节': '\\subsection',
            '子子章节': '\\subsubsection'
        };
        
        const command = commands[level] || '\\section';
        return `\n${command}{${title}}\n\n`;
    }

    generateTableCode(rows, cols) {
        const colSpec = 'c'.repeat(cols);
        let tableContent = '';
        
        for (let i = 0; i < rows; i++) {
            const row = Array(cols).fill('内容').join(' & ');
            tableContent += `    ${row} \\\\\n`;
        }
        
        return `\n\\begin{table}[h]
\\centering
\\begin{tabular}{${colSpec}}
\\hline
${tableContent}\\hline
\\end{tabular}
\\caption{表格标题}
\\label{tab:my-table}
\\end{table}\n\n`;
    }

    generateEquationCode(type) {
        switch (type) {
            case '行内':
                return '$公式内容$';
            case '编号':
                return `\n\\begin{equation}
公式内容
\\label{eq:my-equation}
\\end{equation}\n\n`;
            default:
                return `\n\\[
公式内容
\\]\n\n`;
        }
    }

    /**
     * 文件变化事件处理
     */
    onFileChanged(data) {
        if (this.config.verboseMode) {
            this.log('info', '文件发生变化', data);
        }
    }

    /**
     * 编译开始事件处理
     */
    onCompilationStarted(data) {
        this.log('info', '开始编译文档', data);
    }

    /**
     * 配置更新处理
     */
    onConfigUpdated(config) {
        this.log('info', '配置已更新', config);
    }

    /**
     * 销毁处理
     */
    onDestroy() {
        this.log('info', 'LaTeX 助手 Agent 已销毁');
    }
} 