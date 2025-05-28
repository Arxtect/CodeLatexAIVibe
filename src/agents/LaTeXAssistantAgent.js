import { AgentPlugin } from '../core/AgentPlugin.js';

/**
 * LaTeX 助手 Agent - 完整功能演示
 * 包含文件生成、引用查询、内容修改、编译修复等功能
 */
export class LaTeXAssistantAgent extends AgentPlugin {
    constructor() {
        super();
        
        // 设置 Agent 基本信息
        this.id = 'latex-assistant';
        this.name = 'LaTeX 智能助手';
        this.description = '全功能 LaTeX 编辑助手，支持文件生成、引用管理、内容修改和编译错误修复';
        this.version = '2.0.0';
        this.author = 'LaTeX IDE Team';
        
        // 定义 Agent 能力
        this.capabilities = [
            'file-generation',      // 文件生成
            'reference-management', // 引用管理
            'content-editing',      // 内容编辑
            'compilation-fixing',   // 编译修复
            'code-analysis',        // 代码分析
            'template-creation',    // 模板创建
            'bibliography-search'   // 文献搜索
        ];
        
        // 默认配置
        this.config = {
            autoSave: true,
            autoCompile: false,
            verboseMode: true,
            maxResponseLength: 2000,
            enableSmartSuggestions: true,
            defaultDocumentClass: 'article',
            defaultEncoding: 'utf8'
        };

        // 内置模板库
        this.templates = {
            article: this.getArticleTemplate(),
            report: this.getReportTemplate(),
            book: this.getBookTemplate(),
            beamer: this.getBeamerTemplate(),
            letter: this.getLetterTemplate()
        };

        // 常见编译错误模式
        this.errorPatterns = [
            {
                pattern: /Undefined control sequence/,
                type: 'undefined_command',
                solutions: ['检查命令拼写', '添加相应的包', '定义缺失的命令']
            },
            {
                pattern: /Missing \\begin\{document\}/,
                type: 'missing_begin_document',
                solutions: ['添加 \\begin{document}']
            },
            {
                pattern: /File .* not found/,
                type: 'file_not_found',
                solutions: ['检查文件路径', '创建缺失的文件', '修正文件名']
            },
            {
                pattern: /Package .* Error/,
                type: 'package_error',
                solutions: ['检查包的使用方法', '更新包版本', '使用替代包']
            }
        ];

        // 引用数据库
        this.referenceDatabase = new Map();
        this.initializeReferenceDatabase();
    }

    /**
     * 初始化引用数据库
     */
    initializeReferenceDatabase() {
        // 添加一些示例引用
        this.referenceDatabase.set('einstein1905', {
            type: 'article',
            title: 'Zur Elektrodynamik bewegter Körper',
            author: 'Einstein, Albert',
            journal: 'Annalen der Physik',
            volume: '17',
            number: '10',
            pages: '891--921',
            year: '1905',
            tags: ['physics', 'relativity', 'electrodynamics']
        });

        this.referenceDatabase.set('knuth1984', {
            type: 'book',
            title: 'The TeXbook',
            author: 'Knuth, Donald E.',
            publisher: 'Addison-Wesley',
            year: '1984',
            tags: ['tex', 'typesetting', 'programming']
        });

        this.referenceDatabase.set('lamport1994', {
            type: 'book',
            title: 'LaTeX: A Document Preparation System',
            author: 'Lamport, Leslie',
            publisher: 'Addison-Wesley',
            edition: '2nd',
            year: '1994',
            tags: ['latex', 'documentation', 'typesetting']
        });
    }

    /**
     * 自定义初始化
     */
    onInit() {
        this.log('info', 'LaTeX 智能助手初始化完成');
        this.setupEventListeners();
        this.loadUserReferences();
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

            // 监听编译错误
            this.agentAPI.on('compilationError', (data) => {
                this.onCompilationError(data);
            });
        }
    }

    /**
     * 处理用户消息的核心方法
     */
    async processMessage(message, context) {
        try {
            if (!this.validateMessage(message)) {
                return this.createResponse('请输入有效的消息。');
            }

            this.log('info', '处理用户消息', { message, context });

            // 解析用户意图
            const intent = this.parseIntent(message);
            
            // 根据意图处理消息
            switch (intent.type) {
                case 'generate':
                    return await this.handleGenerateIntent(message, context);
                case 'reference':
                    return await this.handleReferenceIntent(message, context);
                case 'edit':
                    return await this.handleEditIntent(message, context);
                case 'fix':
                    return await this.handleFixIntent(message, context);
                case 'search':
                    return await this.handleSearchIntent(message, context);
                case 'analyze':
                    return await this.handleAnalyzeIntent(message, context);
                default:
                    return await this.handleGeneralIntent(message, context);
            }

        } catch (error) {
            this.handleError(error, 'processMessage');
            return this.createResponse('抱歉，处理您的请求时出现了错误。请稍后再试。');
        }
    }

    /**
     * 解析用户意图 - 重写基类方法
     * @param {string} message - 用户消息
     * @returns {Object} 意图对象
     */
    parseIntent(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // 生成相关意图
        if (lowerMessage.includes('生成') || lowerMessage.includes('创建') || 
            lowerMessage.includes('新建') || lowerMessage.includes('generate')) {
            return { type: 'generate', confidence: 0.9 };
        }
        
        // 引用相关意图
        if (lowerMessage.includes('引用') || lowerMessage.includes('文献') || 
            lowerMessage.includes('参考') || lowerMessage.includes('cite') ||
            lowerMessage.includes('bibliography')) {
            return { type: 'reference', confidence: 0.9 };
        }
        
        // 编辑相关意图
        if (lowerMessage.includes('格式化') || lowerMessage.includes('编辑') || 
            lowerMessage.includes('修改') || lowerMessage.includes('替换') ||
            lowerMessage.includes('插入') || lowerMessage.includes('删除')) {
            return { type: 'edit', confidence: 0.9 };
        }
        
        // 修复相关意图
        if (lowerMessage.includes('修复') || lowerMessage.includes('错误') || 
            lowerMessage.includes('fix') || lowerMessage.includes('debug')) {
            return { type: 'fix', confidence: 0.9 };
        }
        
        // 搜索相关意图
        if (lowerMessage.includes('搜索') || lowerMessage.includes('查找') || 
            lowerMessage.includes('search') || lowerMessage.includes('find')) {
            return { type: 'search', confidence: 0.9 };
        }
        
        // 分析相关意图
        if (lowerMessage.includes('分析') || lowerMessage.includes('检查') || 
            lowerMessage.includes('analyze') || lowerMessage.includes('check')) {
            return { type: 'analyze', confidence: 0.9 };
        }
        
        // 默认为一般意图
        return { type: 'general', confidence: 0.5 };
    }

    /**
     * 处理文件生成意图
     */
    async handleGenerateIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('文档') || lowerMessage.includes('document')) {
            return await this.generateDocument(message, context);
        }
        
        if (lowerMessage.includes('章节') || lowerMessage.includes('section')) {
            return await this.generateSection(message, context);
        }
        
        if (lowerMessage.includes('表格') || lowerMessage.includes('table')) {
            return await this.generateTable(message, context);
        }
        
        if (lowerMessage.includes('公式') || lowerMessage.includes('equation')) {
            return await this.generateEquation(message, context);
        }

        if (lowerMessage.includes('图片') || lowerMessage.includes('figure')) {
            return await this.generateFigure(message, context);
        }

        if (lowerMessage.includes('列表') || lowerMessage.includes('list')) {
            return await this.generateList(message, context);
        }

        if (lowerMessage.includes('参考文献') || lowerMessage.includes('bibliography')) {
            return await this.generateBibliography(message, context);
        }
        
        return this.createResponse('我可以帮您生成：文档、章节、表格、公式、图片、列表、参考文献。请告诉我您想生成什么？');
    }

    /**
     * 生成完整文档
     */
    async generateDocument(message, context) {
        const fileName = this.extractFileName(message) || 'machine-learning-report.tex';
        const documentType = this.extractDocumentType(message) || 'report';
        const title = this.extractTitle(message) || '机器学习研究报告';
        const author = this.extractAuthor(message) || '研究团队';
        
        const template = this.templates[documentType] || this.templates.report;
        const content = template
            .replace('{{TITLE}}', title)
            .replace('{{AUTHOR}}', author)
            .replace('{{DATE}}', '\\today');
        
        const actions = [
            this.createCreateAction(`/${fileName}`, content, { open: true }),
            this.createUIAction('showMessage', { 
                message: `已生成 ${documentType} 文档: ${fileName}`,
                type: 'success'
            })
        ];
        
        return this.createResponse(
            `我已经为您生成了一个新的 ${documentType} 文档 "${fileName}"。\n\n文档包含：\n- 标题：${title}\n- 作者：${author}\n- 基本结构和常用包\n- 示例内容\n\n文件已自动打开，您可以开始编辑。`,
            actions
        );
    }

    /**
     * 生成章节
     */
    async generateSection(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加章节。');
        }
        
        const sectionTitle = this.extractSectionTitle(message) || '新章节';
        const sectionLevel = this.extractSectionLevel(message) || 'section';
        const includeContent = message.includes('内容') || message.includes('content');
        
        let sectionCode = `\\${sectionLevel}{${sectionTitle}}\n\n`;
        
        if (includeContent) {
            sectionCode += `这里是${sectionTitle}的内容。\n\n`;
            
            if (sectionLevel === 'section') {
                sectionCode += `\\subsection{子章节}\n\n子章节的详细内容。\n\n`;
            }
        }
        
        const position = editorContext.position;
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: 1
            },
            text: sectionCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经添加了${sectionLevel}："${sectionTitle}"${includeContent ? '，并包含了示例内容' : ''}。`,
            actions
        );
    }

    /**
     * 生成表格
     */
    async generateTable(message, context) {
        const { rows, cols } = this.extractTableDimensions(message);
        const caption = this.extractCaption(message) || '实验结果';
        const label = this.extractLabel(message) || 'tab:results';
        
        let tableCode = `\\begin{table}[htbp]\n`;
        tableCode += `\\centering\n`;
        tableCode += `\\caption{${caption}}\n`;
        tableCode += `\\label{${label}}\n`;
        tableCode += `\\begin{tabular}{${'|c'.repeat(cols)}|}\n`;
        tableCode += `\\hline\n`;
        
        // 生成表头
        const headers = [];
        for (let i = 1; i <= cols; i++) {
            headers.push(`列${i}`);
        }
        tableCode += headers.join(' & ') + ' \\\\\n';
        tableCode += `\\hline\n`;
        
        // 生成数据行
        for (let i = 1; i < rows; i++) {
            const rowData = [];
            for (let j = 1; j <= cols; j++) {
                rowData.push(`数据${i}-${j}`);
            }
            tableCode += rowData.join(' & ') + ' \\\\\n';
            tableCode += `\\hline\n`;
        }
        
        tableCode += `\\end{tabular}\n`;
        tableCode += `\\end{table}\n\n`;
        
        const editorContext = this.getEditorContext();
        const actions = [];
        
        if (editorContext) {
            // 如果有打开的文件，插入到当前位置
            const position = editorContext.position || { lineNumber: 1, column: 1 };
            const edits = [{
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: 1
                },
                text: tableCode
            }];
            
            actions.push(this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave }));
        } else {
            // 如果没有打开的文件，创建新文件
            const fileName = 'table-example.tex';
            const documentContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{表格示例}
\\author{LaTeX 智能助手}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{表格示例}

${tableCode}

\\end{document}`;
            
            actions.push(this.createCreateAction(`/${fileName}`, documentContent, { open: true }));
        }
        
        return this.createResponse(
            `我已经生成了一个 ${rows}×${cols} 的表格，标题为"${caption}"。${editorContext ? '表格已插入到当前文档中。' : '已创建新文档包含该表格。'}您可以根据需要修改表格内容。`,
            actions
        );
    }

    /**
     * 处理引用相关意图
     */
    async handleReferenceIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('查找') || lowerMessage.includes('搜索') || lowerMessage.includes('search')) {
            return await this.searchReferences(message, context);
        }
        
        if (lowerMessage.includes('添加') || lowerMessage.includes('add')) {
            return await this.addReference(message, context);
        }
        
        if (lowerMessage.includes('引用') || lowerMessage.includes('cite')) {
            return await this.insertCitation(message, context);
        }
        
        if (lowerMessage.includes('生成') || lowerMessage.includes('create')) {
            return await this.generateBibliography(message, context);
        }
        
        return this.createResponse('我可以帮您：搜索引用、添加引用、插入引用、生成参考文献。请告诉我您需要什么？');
    }

    /**
     * 搜索引用
     */
    async searchReferences(message, context) {
        const query = this.extractSearchQuery(message);
        if (!query) {
            return this.createResponse('请告诉我您要搜索的关键词，例如："搜索 Einstein 的文献"');
        }
        
        const results = [];
        for (const [key, ref] of this.referenceDatabase) {
            const searchText = `${ref.title} ${ref.author} ${ref.tags?.join(' ') || ''}`.toLowerCase();
            if (searchText.includes(query.toLowerCase())) {
                results.push({ key, ...ref });
            }
        }
        
        if (results.length === 0) {
            return this.createResponse(`没有找到包含"${query}"的引用。您可以添加新的引用或尝试其他关键词。`);
        }
        
        let responseText = `找到 ${results.length} 个相关引用：\n\n`;
        results.forEach((ref, index) => {
            responseText += `${index + 1}. **${ref.key}**\n`;
            responseText += `   标题：${ref.title}\n`;
            responseText += `   作者：${ref.author}\n`;
            responseText += `   年份：${ref.year}\n`;
            if (ref.journal) responseText += `   期刊：${ref.journal}\n`;
            if (ref.publisher) responseText += `   出版社：${ref.publisher}\n`;
            responseText += `\n`;
        });
        
        responseText += `您可以说"引用 ${results[0].key}"来插入引用。`;
        
        return this.createResponse(responseText);
    }

    /**
     * 插入引用
     */
    async insertCitation(message, context) {
        const citationKey = this.extractCitationKey(message);
        if (!citationKey) {
            return this.createResponse('请指定要引用的文献，例如："引用 einstein1905"');
        }
        
        if (!this.referenceDatabase.has(citationKey)) {
            return this.createResponse(`没有找到引用"${citationKey}"。请先添加这个引用或检查拼写。\n\n可用的引用包括：\n${Array.from(this.referenceDatabase.keys()).map(key => `- ${key}`).join('\n')}`);
        }
        
        const citationText = `\\cite{${citationKey}}`;
        const editorContext = this.getEditorContext();
        const actions = [];
        
        if (editorContext) {
            // 如果有打开的文件，插入到当前位置
            const position = editorContext.position || { lineNumber: 1, column: 1 };
            const edits = [{
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                },
                text: citationText
            }];
            
            actions.push(this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave }));
        } else {
            // 如果没有打开的文件，创建新文件
            const ref = this.referenceDatabase.get(citationKey);
            const fileName = 'citation-example.tex';
            const documentContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{cite}

\\title{引用示例}
\\author{LaTeX 智能助手}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{引用示例}

这里引用了一篇重要的文献${citationText}。

\\bibliographystyle{plain}
\\begin{thebibliography}{9}

\\bibitem{${citationKey}}
${ref.author} (${ref.year}).
\\textit{${ref.title}}.
${ref.journal ? ref.journal : ref.publisher}.

\\end{thebibliography}

\\end{document}`;
            
            actions.push(this.createCreateAction(`/${fileName}`, documentContent, { open: true }));
        }
        
        const ref = this.referenceDatabase.get(citationKey);
        return this.createResponse(
            `我已经插入了对"${ref.title}"的引用。${editorContext ? '引用已插入到当前位置。' : '已创建新文档包含该引用。'}记得在文档末尾添加参考文献列表。`,
            actions
        );
    }

    /**
     * 处理编译修复意图
     */
    async handleFixIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('编译') || lowerMessage.includes('compile')) {
            return await this.fixCompilationErrors(message, context);
        }
        
        if (lowerMessage.includes('语法') || lowerMessage.includes('syntax')) {
            return await this.fixSyntaxErrors(message, context);
        }
        
        if (lowerMessage.includes('格式') || lowerMessage.includes('format')) {
            return await this.fixFormatting(message, context);
        }
        
        return this.createResponse('我可以帮您修复：编译错误、语法错误、格式问题。请告诉我具体遇到了什么问题？');
    }

    /**
     * 修复编译错误
     */
    async fixCompilationErrors(message, context) {
        // 模拟检测编译错误的过程
        const editorContext = this.getEditorContext();
        
        if (!editorContext) {
            return this.createResponse('当前没有打开的 LaTeX 文档。请先打开一个文档，然后我可以帮您检查和修复编译错误。\n\n我可以帮您修复的常见错误包括：\n- 未定义的命令\n- 缺失的包\n- 语法错误\n- 环境不匹配');
        }
        
        // 模拟常见的编译错误和修复建议
        const mockErrors = [
            {
                line: 15,
                message: 'Undefined control sequence \\includegraphics',
                type: 'undefined_command',
                fix: '添加 \\usepackage{graphicx} 包'
            },
            {
                line: 23,
                message: 'Missing \\begin{document}',
                type: 'missing_begin_document',
                fix: '确保文档包含 \\begin{document}'
            }
        ];
        
        let responseText = '我检测到以下潜在的编译问题并提供修复建议：\n\n';
        const fixes = [];
        
        mockErrors.forEach((error, index) => {
            responseText += `${index + 1}. **错误**：${error.message}\n`;
            responseText += `   **位置**：第 ${error.line} 行\n`;
            responseText += `   **修复建议**：${error.fix}\n\n`;
        });
        
        responseText += '💡 **常见修复方法**：\n';
        responseText += '- 检查所有必需的包是否已导入\n';
        responseText += '- 确保所有环境都正确闭合\n';
        responseText += '- 验证命令拼写是否正确\n';
        responseText += '- 检查特殊字符是否正确转义\n\n';
        responseText += '如果您遇到具体的编译错误，请将错误信息告诉我，我可以提供更精确的修复建议。';
        
        return this.createResponse(responseText);
    }

    /**
     * 分析错误类型
     */
    analyzeError(error) {
        for (const pattern of this.errorPatterns) {
            if (pattern.pattern.test(error.message)) {
                return pattern;
            }
        }
        
        return {
            type: 'unknown',
            solutions: ['检查语法', '查看 LaTeX 文档', '寻求帮助']
        };
    }

    /**
     * 生成自动修复
     */
    generateAutoFix(error, errorType) {
        switch (errorType.type) {
            case 'missing_begin_document':
                return {
                    type: 'insert',
                    line: error.line,
                    text: '\\begin{document}\n'
                };
            
            case 'undefined_command':
                const command = this.extractUndefinedCommand(error.message);
                if (command) {
                    const packageSuggestion = this.suggestPackageForCommand(command);
                    if (packageSuggestion) {
                        return {
                            type: 'insert',
                            line: 1,
                            text: `\\usepackage{${packageSuggestion}}\n`
                        };
                    }
                }
                break;
        }
        
        return null;
    }

    /**
     * 处理内容编辑意图
     */
    async handleEditIntent(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您编辑内容。');
        }
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('格式化') || lowerMessage.includes('format')) {
            return await this.formatDocument(message, context);
        }
        
        if (lowerMessage.includes('替换') || lowerMessage.includes('replace')) {
            return await this.replaceText(message, context);
        }
        
        if (lowerMessage.includes('删除') || lowerMessage.includes('delete')) {
            return await this.deleteContent(message, context);
        }
        
        if (lowerMessage.includes('插入') || lowerMessage.includes('insert')) {
            return await this.insertContent(message, context);
        }
        
        return this.createResponse('我可以帮您：格式化文档、替换文本、删除内容、插入内容。请告诉我具体要做什么？');
    }

    /**
     * 格式化文档
     */
    async formatDocument(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('当前没有打开的文档需要格式化。请先打开一个 LaTeX 文件，或者让我为您生成一个新文档。\n\n格式化功能包括：\n- 移除多余空行\n- 清理行尾空格\n- 标准化环境语法\n- 优化数学模式格式');
        }
        
        const content = editorContext.content || '';
        
        // 基本格式化规则
        let formattedContent = content
            .replace(/\n\n\n+/g, '\n\n')  // 移除多余空行
            .replace(/[ \t]+$/gm, '')      // 移除行尾空格
            .replace(/\\begin\{([^}]+)\}/g, '\\begin{$1}')  // 标准化环境
            .replace(/\\end\{([^}]+)\}/g, '\\end{$1}')
            .replace(/\$\s+/g, '$')        // 移除数学模式中的多余空格
            .replace(/\s+\$/g, '$');
        
        // 检查是否有实际变化
        if (formattedContent === content) {
            return this.createResponse('文档格式已经很好，无需进一步格式化。');
        }
        
        const actions = [
            this.createEditAction(editorContext.filePath, [{
                range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1000, // 使用较大的数字覆盖整个文档
                    endColumn: 1
                },
                text: formattedContent
            }], { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            '我已经格式化了您的文档，包括：\n- 移除多余空行\n- 清理行尾空格\n- 标准化环境语法\n- 优化数学模式格式\n\n文档格式已优化完成。',
            actions
        );
    }

    /**
     * 获取文档模板
     */
    getArticleTemplate() {
        return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}
\\date{{{DATE}}}

\\begin{document}

\\maketitle

\\begin{abstract}
这里是摘要内容。
\\end{abstract}

\\section{引言}
这里是引言部分的内容。

\\section{主要内容}
这里是主要内容。

\\subsection{子章节}
子章节的详细内容。

\\section{结论}
这里是结论部分。

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
    }

    getReportTemplate() {
        return `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}
\\date{{{DATE}}}

\\begin{document}

\\maketitle

\\tableofcontents

\\chapter{引言}
这里是引言章节的内容。

\\chapter{主要内容}
这里是主要内容章节。

\\section{第一节}
第一节的内容。

\\section{第二节}
第二节的内容。

\\chapter{结论}
这里是结论章节。

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
    }

    getBookTemplate() {
        return `\\documentclass[12pt,a4paper]{book}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}
\\date{{{DATE}}}

\\begin{document}

\\frontmatter
\\maketitle
\\tableofcontents

\\mainmatter

\\part{第一部分}

\\chapter{引言}
这里是引言章节的内容。

\\chapter{主要内容}
这里是主要内容章节。

\\part{第二部分}

\\chapter{详细分析}
详细分析的内容。

\\chapter{结论}
这里是结论章节。

\\backmatter

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
    }

    getBeamerTemplate() {
        return `\\documentclass{beamer}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}

\\usetheme{Madrid}
\\usecolortheme{default}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}
\\date{{{DATE}}}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}
\\frametitle{目录}
\\tableofcontents
\\end{frame}

\\section{引言}
\\begin{frame}
\\frametitle{引言}
\\begin{itemize}
\\item 第一点
\\item 第二点
\\item 第三点
\\end{itemize}
\\end{frame}

\\section{主要内容}
\\begin{frame}
\\frametitle{主要内容}
这里是主要内容的幻灯片。
\\end{frame}

\\section{结论}
\\begin{frame}
\\frametitle{结论}
这里是结论部分。
\\end{frame}

\\begin{frame}
\\frametitle{谢谢}
\\centering
谢谢大家！
\\end{frame}

\\end{document}`;
    }

    getLetterTemplate() {
        return `\\documentclass{letter}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}

\\signature{{{AUTHOR}}}
\\address{发件人地址\\\\城市，邮编}

\\begin{document}

\\begin{letter}{收件人姓名\\\\收件人地址\\\\城市，邮编}

\\opening{尊敬的先生/女士：}

这里是信件的正文内容。

\\closing{此致\\\\敬礼}

\\end{letter}

\\end{document}`;
    }

    // 辅助方法
    extractFileName(message) {
        const match = message.match(/文件名[：:]?\s*([^\s]+)/);
        return match ? match[1] : null;
    }

    extractDocumentType(message) {
        if (message.includes('报告') || message.includes('report')) return 'report';
        if (message.includes('书籍') || message.includes('book')) return 'book';
        if (message.includes('演示') || message.includes('beamer')) return 'beamer';
        if (message.includes('信件') || message.includes('letter')) return 'letter';
        return 'article';
    }

    extractTitle(message) {
        const match = message.match(/标题[：:]?\s*([^，。]+)/);
        return match ? match[1].trim() : null;
    }

    extractAuthor(message) {
        const match = message.match(/作者[：:]?\s*([^，。]+)/);
        return match ? match[1].trim() : null;
    }

    extractSectionTitle(message) {
        const match = message.match(/章节[：:]?\s*([^，。]+)/) || 
                     message.match(/"([^"]+)"/) ||
                     message.match(/《([^》]+)》/);
        return match ? match[1].trim() : null;
    }

    extractSectionLevel(message) {
        if (message.includes('章') || message.includes('chapter')) return 'chapter';
        if (message.includes('子章节') || message.includes('subsection')) return 'subsection';
        if (message.includes('子子章节') || message.includes('subsubsection')) return 'subsubsection';
        return 'section';
    }

    extractTableDimensions(message) {
        const match = message.match(/(\d+)[×x](\d+)/) || 
                     message.match(/(\d+)\s*行\s*(\d+)\s*列/) ||
                     message.match(/(\d+)\s*列\s*(\d+)\s*行/);
        if (match) {
            return { rows: parseInt(match[1]), cols: parseInt(match[2]) };
        }
        return { rows: 3, cols: 3 };
    }

    extractCaption(message) {
        const match = message.match(/标题[：:]?\s*([^，。]+)/) ||
                     message.match(/caption[：:]?\s*([^，。]+)/);
        return match ? match[1].trim() : null;
    }

    extractLabel(message) {
        const match = message.match(/标签[：:]?\s*([^，。]+)/) ||
                     message.match(/label[：:]?\s*([^，。]+)/);
        return match ? match[1].trim() : null;
    }

    extractSearchQuery(message) {
        const match = message.match(/搜索\s+(.+)/) ||
                     message.match(/查找\s+(.+)/) ||
                     message.match(/search\s+(.+)/i);
        return match ? match[1].trim() : null;
    }

    extractCitationKey(message) {
        const match = message.match(/引用\s+(\w+)/) ||
                     message.match(/cite\s+(\w+)/i);
        return match ? match[1] : null;
    }

    // 事件处理
    onFileChanged(data) {
        if (this.config.verboseMode) {
            this.log('info', '文件已更改', data);
        }
    }

    onCompilationStarted(data) {
        if (this.config.verboseMode) {
            this.log('info', '编译开始', data);
        }
    }

    onCompilationError(data) {
        this.log('error', '编译错误', data);
        // 可以在这里自动分析错误并提供修复建议
    }

    // 获取最近的编译错误（模拟）
    getLastCompilationErrors() {
        // 这里应该从 IDE 获取实际的编译错误
        return [
            {
                line: 15,
                message: 'Undefined control sequence \\unknowncommand',
                file: 'main.tex'
            }
        ];
    }

    extractUndefinedCommand(message) {
        const match = message.match(/\\(\w+)/);
        return match ? match[1] : null;
    }

    suggestPackageForCommand(command) {
        const packageMap = {
            'includegraphics': 'graphicx',
            'url': 'url',
            'href': 'hyperref',
            'textcolor': 'xcolor',
            'lstlisting': 'listings'
        };
        return packageMap[command] || null;
    }

    loadUserReferences() {
        // 从本地存储加载用户的引用
        try {
            const saved = localStorage.getItem('user_references');
            if (saved) {
                const userRefs = JSON.parse(saved);
                for (const [key, ref] of Object.entries(userRefs)) {
                    this.referenceDatabase.set(key, ref);
                }
            }
        } catch (error) {
            this.log('error', '加载用户引用失败', error);
        }
    }

    saveUserReferences() {
        // 保存用户的引用到本地存储
        try {
            const userRefs = {};
            for (const [key, ref] of this.referenceDatabase) {
                userRefs[key] = ref;
            }
            localStorage.setItem('user_references', JSON.stringify(userRefs));
        } catch (error) {
            this.log('error', '保存用户引用失败', error);
        }
    }

    /**
     * 生成公式
     */
    async generateEquation(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加公式。');
        }
        
        const equationType = this.extractEquationType(message) || 'equation';
        let equationCode = '';
        
        switch (equationType) {
            case 'inline':
                equationCode = '$E = mc^2$';
                break;
            case 'display':
                equationCode = '$$E = mc^2$$';
                break;
            default:
                equationCode = '\\begin{equation}\n    E = mc^2\n\\end{equation}\n\n';
        }
        
        const position = editorContext.position || { lineNumber: 1, column: 1 };
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: 1
            },
            text: equationCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经生成了一个${equationType}公式。您可以根据需要修改公式内容。`,
            actions
        );
    }

    /**
     * 生成图片环境
     */
    async generateFigure(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加图片。');
        }
        
        const caption = this.extractCaption(message) || '图片标题';
        const label = this.extractLabel(message) || 'fig:example';
        const imagePath = this.extractImagePath(message) || 'example.png';
        
        const figureCode = `\\begin{figure}[htbp]
\\centering
\\includegraphics[width=0.8\\textwidth]{${imagePath}}
\\caption{${caption}}
\\label{${label}}
\\end{figure}

`;
        
        const position = editorContext.position || { lineNumber: 1, column: 1 };
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: 1
            },
            text: figureCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经生成了图片环境，标题为"${caption}"。请确保图片文件"${imagePath}"存在于正确的路径中。`,
            actions
        );
    }

    /**
     * 生成列表
     */
    async generateList(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加列表。');
        }
        
        const listType = message.includes('有序') || message.includes('numbered') ? 'enumerate' : 'itemize';
        const items = this.extractListItems(message) || ['第一项', '第二项', '第三项'];
        
        let listCode = `\\begin{${listType}}\n`;
        items.forEach(item => {
            listCode += `\\item ${item}\n`;
        });
        listCode += `\\end{${listType}}\n\n`;
        
        const position = editorContext.position || { lineNumber: 1, column: 1 };
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: 1
            },
            text: listCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `我已经生成了一个${listType === 'enumerate' ? '有序' : '无序'}列表，包含 ${items.length} 个项目。`,
            actions
        );
    }

    /**
     * 生成参考文献
     */
    async generateBibliography(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您添加参考文献。');
        }
        
        const bibliographyCode = `\\bibliographystyle{plain}
\\bibliography{references}

% 或者手动添加参考文献：
\\begin{thebibliography}{9}

\\bibitem{einstein1905}
Einstein, A. (1905).
\\textit{Zur Elektrodynamik bewegter Körper}.
Annalen der Physik, 17(10), 891--921.

\\bibitem{knuth1984}
Knuth, D. E. (1984).
\\textit{The TeXbook}.
Addison-Wesley.

\\end{thebibliography}

`;
        
        const position = editorContext.position || { lineNumber: 1, column: 1 };
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: 1
            },
            text: bibliographyCode
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            '我已经生成了参考文献部分，包含了两种方式：使用外部 .bib 文件和手动添加。您可以选择适合的方式。',
            actions
        );
    }

    /**
     * 添加引用
     */
    async addReference(message, context) {
        // 从消息中提取引用信息
        const refInfo = this.extractReferenceInfo(message);
        
        if (!refInfo.key) {
            return this.createResponse('请提供引用的关键信息，例如："添加引用 key:newpaper2024, 标题:新论文, 作者:张三"');
        }
        
        // 添加到引用数据库
        this.referenceDatabase.set(refInfo.key, {
            type: refInfo.type || 'article',
            title: refInfo.title || '未知标题',
            author: refInfo.author || '未知作者',
            year: refInfo.year || new Date().getFullYear().toString(),
            journal: refInfo.journal,
            publisher: refInfo.publisher,
            tags: refInfo.tags || []
        });
        
        // 保存到本地存储
        this.saveUserReferences();
        
        return this.createResponse(
            `已成功添加引用"${refInfo.key}"到数据库。您现在可以使用"引用 ${refInfo.key}"来插入这个引用。`
        );
    }

    /**
     * 处理搜索意图
     */
    async handleSearchIntent(message, context) {
        return await this.searchReferences(message, context);
    }

    /**
     * 处理分析意图
     */
    async handleAnalyzeIntent(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您分析内容。');
        }
        
        const content = editorContext.content || '';
        const analysis = this.analyzeLatexContent(content);
        
        return this.createResponse(
            `文档分析结果：\n\n` +
            `📊 **统计信息**：\n` +
            `- 总行数：${analysis.lineCount}\n` +
            `- 字符数：${analysis.charCount}\n` +
            `- 章节数：${analysis.sectionCount}\n` +
            `- 公式数：${analysis.equationCount}\n` +
            `- 表格数：${analysis.tableCount}\n` +
            `- 图片数：${analysis.figureCount}\n\n` +
            `🔍 **潜在问题**：\n` +
            `${analysis.issues.length > 0 ? analysis.issues.join('\n') : '未发现明显问题'}`
        );
    }

    /**
     * 修复语法错误
     */
    async fixSyntaxErrors(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您检查语法。');
        }
        
        const content = editorContext.content || '';
        const syntaxIssues = this.checkSyntax(content);
        
        if (syntaxIssues.length === 0) {
            return this.createResponse('✅ 未发现语法错误。您的 LaTeX 代码看起来很好！');
        }
        
        let responseText = '发现以下语法问题：\n\n';
        syntaxIssues.forEach((issue, index) => {
            responseText += `${index + 1}. **第 ${issue.line} 行**：${issue.message}\n`;
            responseText += `   建议：${issue.suggestion}\n\n`;
        });
        
        return this.createResponse(responseText);
    }

    /**
     * 修复格式问题
     */
    async fixFormatting(message, context) {
        return await this.formatDocument(message, context);
    }

    /**
     * 替换文本
     */
    async replaceText(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您替换文本。');
        }
        
        const { oldText, newText } = this.extractReplaceInfo(message);
        
        if (!oldText) {
            return this.createResponse('请指定要替换的文本，例如："替换 旧文本 为 新文本"');
        }
        
        const content = editorContext.content || '';
        const newContent = content.replace(new RegExp(oldText, 'g'), newText || '');
        
        const actions = [
            this.createEditAction(editorContext.filePath, [{
                range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: editorContext.lineCount || 1,
                    endColumn: 1
                },
                text: newContent
            }], { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `已将"${oldText}"替换为"${newText || '(空)'}"。`,
            actions
        );
    }

    /**
     * 删除内容
     */
    async deleteContent(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您删除内容。');
        }
        
        const targetText = this.extractDeleteTarget(message);
        
        if (!targetText) {
            return this.createResponse('请指定要删除的内容，例如："删除 目标文本"');
        }
        
        const content = editorContext.content || '';
        const newContent = content.replace(new RegExp(targetText, 'g'), '');
        
        const actions = [
            this.createEditAction(editorContext.filePath, [{
                range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: editorContext.lineCount || 1,
                    endColumn: 1
                },
                text: newContent
            }], { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `已删除所有包含"${targetText}"的内容。`,
            actions
        );
    }

    /**
     * 插入内容
     */
    async insertContent(message, context) {
        const editorContext = this.getEditorContext();
        if (!editorContext) {
            return this.createResponse('请先打开一个 LaTeX 文件，然后我可以帮您插入内容。');
        }
        
        const insertText = this.extractInsertText(message);
        
        if (!insertText) {
            return this.createResponse('请指定要插入的内容，例如："插入 新内容"');
        }
        
        const position = editorContext.position || { lineNumber: 1, column: 1 };
        const edits = [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: insertText
        }];
        
        const actions = [
            this.createEditAction(editorContext.filePath, edits, { save: this.config.autoSave })
        ];
        
        return this.createResponse(
            `已在当前位置插入内容："${insertText}"。`,
            actions
        );
    }

    // 辅助方法
    extractEquationType(message) {
        if (message.includes('行内') || message.includes('inline')) return 'inline';
        if (message.includes('显示') || message.includes('display')) return 'display';
        return 'equation';
    }

    extractImagePath(message) {
        const match = message.match(/图片[：:]?\s*([^\s，。]+)/);
        return match ? match[1] : null;
    }

    extractListItems(message) {
        const match = message.match(/项目[：:]?\s*(.+)/);
        if (match) {
            return match[1].split(/[，,]/).map(item => item.trim());
        }
        return null;
    }

    extractReferenceInfo(message) {
        const info = {};
        
        const keyMatch = message.match(/key[：:]?\s*([^\s，。]+)/);
        if (keyMatch) info.key = keyMatch[1];
        
        const titleMatch = message.match(/标题[：:]?\s*([^，。]+)/);
        if (titleMatch) info.title = titleMatch[1].trim();
        
        const authorMatch = message.match(/作者[：:]?\s*([^，。]+)/);
        if (authorMatch) info.author = authorMatch[1].trim();
        
        const yearMatch = message.match(/年份[：:]?\s*(\d{4})/);
        if (yearMatch) info.year = yearMatch[1];
        
        return info;
    }

    analyzeLatexContent(content) {
        return {
            lineCount: content.split('\n').length,
            charCount: content.length,
            sectionCount: (content.match(/\\section/g) || []).length,
            equationCount: (content.match(/\\begin\{equation\}/g) || []).length,
            tableCount: (content.match(/\\begin\{table\}/g) || []).length,
            figureCount: (content.match(/\\begin\{figure\}/g) || []).length,
            issues: []
        };
    }

    checkSyntax(content) {
        const issues = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            // 检查未闭合的大括号
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            if (openBraces !== closeBraces) {
                issues.push({
                    line: index + 1,
                    message: '大括号不匹配',
                    suggestion: '检查大括号的开闭'
                });
            }
        });
        
        return issues;
    }

    extractReplaceInfo(message) {
        const match = message.match(/替换\s+(.+?)\s+为\s+(.+)/);
        if (match) {
            return { oldText: match[1].trim(), newText: match[2].trim() };
        }
        return { oldText: null, newText: null };
    }

    extractDeleteTarget(message) {
        const match = message.match(/删除\s+(.+)/);
        return match ? match[1].trim() : null;
    }

    extractInsertText(message) {
        const match = message.match(/插入\s+(.+)/);
        return match ? match[1].trim() : null;
    }

    async handleGeneralIntent(message, context) {
        return this.createResponse(
            `我是 LaTeX 智能助手，可以帮您：\n\n` +
            `📝 **文件生成**：生成文档、章节、表格、公式等\n` +
            `📚 **引用管理**：搜索、添加、插入引用和参考文献\n` +
            `✏️ **内容编辑**：格式化、替换、删除、插入内容\n` +
            `🔧 **编译修复**：分析和修复编译错误\n\n` +
            `请告诉我您需要什么帮助，例如：\n` +
            `- "生成一个报告文档，标题是机器学习研究"\n` +
            `- "搜索 Einstein 的文献"\n` +
            `- "修复编译错误"\n` +
            `- "格式化当前文档"`
        );
    }
} 