import * as monaco from 'monaco-editor';

export class LaTeXAutoCompletePlugin {
    constructor() {
        this.id = 'latex-autocomplete';
        this.name = 'LaTeX 自动完成';
        this.description = '为 LaTeX 文档提供智能自动完成功能';
        this.version = '1.0.0';
        this.type = 'autocomplete';
        this.supportedLanguages = ['latex'];
        this.completionProvider = null;
        this.enabled = true;
    }

    init(pluginManager) {
        this.pluginManager = pluginManager;
        // 延迟注册，确保 Monaco Editor 已经完全初始化
        setTimeout(() => {
            this.registerCompletionProvider();
        }, 100);
    }

    registerCompletionProvider() {
        try {
            this.completionProvider = monaco.languages.registerCompletionItemProvider('latex', {
                provideCompletionItems: (model, position) => {
                    return this.provideCompletionItems(model, position);
                },
                triggerCharacters: ['\\', '{', '[', '$']
            });

            console.log('LaTeX 自动完成插件初始化完成');
        } catch (error) {
            console.error('LaTeX 自动完成插件注册失败:', error);
        }
    }

    provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const line = model.getLineContent(position.lineNumber);
        const beforeCursor = line.substring(0, position.column - 1);
        
        // 计算正确的范围
        let startColumn = word.startColumn;
        let endColumn = word.endColumn;
        
        // 如果是反斜杠开头的命令，包含反斜杠
        if (beforeCursor.endsWith('\\') || /\\[a-zA-Z]*$/.test(beforeCursor)) {
            const match = beforeCursor.match(/\\[a-zA-Z]*$/);
            if (match) {
                startColumn = position.column - match[0].length;
                endColumn = position.column;
            }
        }
        
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startColumn,
            endColumn: endColumn
        };

        const suggestions = [];

        // 检查是否在输入命令
        if (beforeCursor.endsWith('\\') || /\\[a-zA-Z]*$/.test(beforeCursor)) {
            suggestions.push(...this.getCommandCompletions(range));
        }

        // 检查是否在输入环境
        if (/\\begin\{[^}]*$/.test(beforeCursor)) {
            suggestions.push(...this.getEnvironmentCompletions(range));
        }

        // 检查是否在数学模式
        if (this.isInMathMode(model, position)) {
            suggestions.push(...this.getMathCompletions(range));
        }

        // 检查是否在输入包名
        if (/\\usepackage\{[^}]*$/.test(beforeCursor)) {
            suggestions.push(...this.getPackageCompletions(range));
        }

        // 如果没有特定上下文，但用户正在输入，提供基本的 LaTeX 命令
        if (suggestions.length === 0) {
            // 检查是否在输入任何内容
            if (word.word.length > 0 || beforeCursor.endsWith('\\')) {
                suggestions.push(...this.getCommandCompletions(range));
            }
        }

        // 调试信息（仅在开发模式下显示）
        if (suggestions.length > 0) {
            console.log('LaTeX 自动补全:', {
                position,
                beforeCursor,
                word: word.word,
                range,
                suggestionsCount: suggestions.length
            });
        }

        return { suggestions };
    }

    getCommandCompletions(range) {
        const commands = [
            // 文档结构
            {
                label: 'documentclass',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'documentclass{${1:article}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '定义文档类型',
                range
            },
            {
                label: 'usepackage',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'usepackage{${1:package}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '引入宏包',
                range
            },
            {
                label: 'begin',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'begin{${1:environment}}\n\t$0\n\\end{${1:environment}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '开始环境',
                range
            },
            {
                label: 'section',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'section{${1:标题}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '章节标题',
                range
            },
            {
                label: 'subsection',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'subsection{${1:标题}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '子章节标题',
                range
            },
            {
                label: 'title',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'title{${1:文档标题}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '文档标题',
                range
            },
            {
                label: 'author',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'author{${1:作者姓名}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '作者信息',
                range
            },
            {
                label: 'maketitle',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'maketitle',
                documentation: '生成标题页',
                range
            },

            // 文本格式
            {
                label: 'textbf',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'textbf{${1:粗体文本}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '粗体文本',
                range
            },
            {
                label: 'textit',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'textit{${1:斜体文本}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '斜体文本',
                range
            },
            {
                label: 'emph',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'emph{${1:强调文本}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '强调文本',
                range
            },

            // 数学
            {
                label: 'frac',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'frac{${1:分子}}{${2:分母}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '分数',
                range
            },
            {
                label: 'sqrt',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'sqrt{${1:表达式}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '平方根',
                range
            },

            // 引用
            {
                label: 'ref',
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: 'ref{${1:label}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '交叉引用',
                range
            },
            {
                label: 'label',
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: 'label{${1:标签名}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '设置标签',
                range
            },
            {
                label: 'cite',
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: 'cite{${1:引用键}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '文献引用',
                range
            }
        ];

        return commands;
    }

    getEnvironmentCompletions(range) {
        const environments = [
            {
                label: 'document',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'document',
                documentation: '文档主体环境',
                range
            },
            {
                label: 'equation',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'equation',
                documentation: '带编号的数学公式',
                range
            },
            {
                label: 'align',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'align',
                documentation: '对齐的数学公式',
                range
            },
            {
                label: 'itemize',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'itemize',
                documentation: '无序列表',
                range
            },
            {
                label: 'enumerate',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'enumerate',
                documentation: '有序列表',
                range
            },
            {
                label: 'figure',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'figure',
                documentation: '图片环境',
                range
            },
            {
                label: 'table',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'table',
                documentation: '表格环境',
                range
            },
            {
                label: 'center',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'center',
                documentation: '居中环境',
                range
            },
            {
                label: 'abstract',
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: 'abstract',
                documentation: '摘要环境',
                range
            }
        ];

        return environments;
    }

    getMathCompletions(range) {
        const mathSymbols = [
            // 希腊字母
            { label: 'alpha', insertText: 'alpha', documentation: 'α' },
            { label: 'beta', insertText: 'beta', documentation: 'β' },
            { label: 'gamma', insertText: 'gamma', documentation: 'γ' },
            { label: 'delta', insertText: 'delta', documentation: 'δ' },
            { label: 'epsilon', insertText: 'epsilon', documentation: 'ε' },
            { label: 'theta', insertText: 'theta', documentation: 'θ' },
            { label: 'lambda', insertText: 'lambda', documentation: 'λ' },
            { label: 'mu', insertText: 'mu', documentation: 'μ' },
            { label: 'pi', insertText: 'pi', documentation: 'π' },
            { label: 'sigma', insertText: 'sigma', documentation: 'σ' },
            { label: 'phi', insertText: 'phi', documentation: 'φ' },

            // 数学符号
            { label: 'infty', insertText: 'infty', documentation: '∞' },
            { label: 'partial', insertText: 'partial', documentation: '∂' },
            { label: 'nabla', insertText: 'nabla', documentation: '∇' },
            { label: 'pm', insertText: 'pm', documentation: '±' },
            { label: 'mp', insertText: 'mp', documentation: '∓' },
            { label: 'leq', insertText: 'leq', documentation: '≤' },
            { label: 'geq', insertText: 'geq', documentation: '≥' },
            { label: 'neq', insertText: 'neq', documentation: '≠' },
            { label: 'approx', insertText: 'approx', documentation: '≈' },
            { label: 'equiv', insertText: 'equiv', documentation: '≡' },

            // 数学函数
            { label: 'sum', insertText: 'sum_{${1:下标}}^{${2:上标}}', documentation: '求和符号' },
            { label: 'int', insertText: 'int_{${1:下限}}^{${2:上限}}', documentation: '积分符号' },
            { label: 'prod', insertText: 'prod_{${1:下标}}^{${2:上标}}', documentation: '连乘符号' },
            { label: 'lim', insertText: 'lim_{${1:变量} \\to ${2:极限值}}', documentation: '极限符号' }
        ];

        return mathSymbols.map(symbol => ({
            ...symbol,
            kind: monaco.languages.CompletionItemKind.Constant,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
        }));
    }

    getPackageCompletions(range) {
        const packages = [
            { label: 'amsmath', documentation: '数学公式增强包' },
            { label: 'amsfonts', documentation: '数学字体包' },
            { label: 'amssymb', documentation: '数学符号包' },
            { label: 'graphicx', documentation: '图片处理包' },
            { label: 'geometry', documentation: '页面布局包' },
            { label: 'hyperref', documentation: '超链接包' },
            { label: 'xcolor', documentation: '颜色包' },
            { label: 'listings', documentation: '代码高亮包' },
            { label: 'tikz', documentation: '绘图包' },
            { label: 'babel', documentation: '多语言支持包' },
            { label: 'fontenc', documentation: '字体编码包' },
            { label: 'inputenc', documentation: '输入编码包' },
            { label: 'natbib', documentation: '参考文献包' },
            { label: 'booktabs', documentation: '表格美化包' },
            { label: 'multicol', documentation: '多栏排版包' }
        ];

        return packages.map(pkg => ({
            label: pkg.label,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: pkg.label,
            documentation: pkg.documentation,
            range
        }));
    }

    isInMathMode(model, position) {
        const line = model.getLineContent(position.lineNumber);
        const beforeCursor = line.substring(0, position.column - 1);
        
        // 简单检查是否在数学模式中
        const dollarCount = (beforeCursor.match(/\$/g) || []).length;
        return dollarCount % 2 === 1;
    }

    enable() {
        this.enabled = true;
        if (!this.completionProvider) {
            this.registerCompletionProvider();
        }
        console.log('LaTeX 自动完成插件已启用');
    }

    disable() {
        this.enabled = false;
        if (this.completionProvider) {
            this.completionProvider.dispose();
            this.completionProvider = null;
        }
        console.log('LaTeX 自动完成插件已禁用');
    }

    destroy() {
        if (this.completionProvider) {
            this.completionProvider.dispose();
        }
        console.log('LaTeX 自动完成插件已卸载');
    }

    // 添加自定义完成项
    addCustomCompletion(completion) {
        // 可以动态添加自定义完成项
        console.log('添加自定义完成项:', completion);
    }

    // 获取完成统计信息
    getCompletionStats() {
        return {
            commands: this.getCommandCompletions({}).length,
            environments: this.getEnvironmentCompletions({}).length,
            mathSymbols: this.getMathCompletions({}).length,
            packages: this.getPackageCompletions({}).length
        };
    }

    // 测试自动补全功能
    testAutoComplete() {
        console.log('测试 LaTeX 自动补全功能:');
        console.log('- 插件已启用:', this.enabled);
        console.log('- 完成提供者已注册:', !!this.completionProvider);
        console.log('- 统计信息:', this.getCompletionStats());
        
        // 测试一个简单的补全
        const testRange = {
            startLineNumber: 1,
            endLineNumber: 1,
            startColumn: 1,
            endColumn: 1
        };
        
        const commands = this.getCommandCompletions(testRange);
        console.log('- 可用命令数量:', commands.length);
        console.log('- 前5个命令:', commands.slice(0, 5).map(c => c.label));
        
        return {
            enabled: this.enabled,
            registered: !!this.completionProvider,
            commandCount: commands.length
        };
    }
} 