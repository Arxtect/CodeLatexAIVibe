import * as monaco from 'monaco-editor';

export class LaTeXSyntaxPlugin {
    constructor() {
        this.id = 'latex-syntax';
        this.name = 'LaTeX 语法高亮';
        this.version = '1.0.0';
        this.type = 'syntax';
        this.supportedLanguages = ['latex'];
        this.languageRegistered = false;
    }

    init(pluginManager) {
        this.pluginManager = pluginManager;
        this.registerLanguage();
    }

    registerLanguage() {
        if (this.languageRegistered) {
            return;
        }

        // 注册 LaTeX 语言
        monaco.languages.register({ id: 'latex' });

        // 设置语言配置
        monaco.languages.setLanguageConfiguration('latex', {
            comments: {
                lineComment: '%'
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '$', close: '$' },
                { open: '$$', close: '$$' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '$', close: '$' }
            ],
            folding: {
                markers: {
                    start: new RegExp('^\\s*\\\\begin\\{([^}]*)\\}'),
                    end: new RegExp('^\\s*\\\\end\\{([^}]*)\\}')
                }
            }
        });

        // 设置语法高亮规则
        monaco.languages.setMonarchTokensProvider('latex', {
            tokenizer: {
                root: [
                    // 注释
                    [/%.*$/, 'comment'],
                    
                    // 数学环境
                    [/\$\$/, { token: 'string.latex', next: '@displaymath' }],
                    [/\$/, { token: 'string.latex', next: '@inlinemath' }],
                    
                    // 环境
                    [/\\begin\{([^}]*)\}/, { token: 'keyword.latex', next: '@environment.$1' }],
                    [/\\end\{([^}]*)\}/, 'keyword.latex'],
                    
                    // 命令
                    [/\\[a-zA-Z@]+\*?/, 'command.latex'],
                    [/\\[^a-zA-Z@]/, 'command.latex'],
                    
                    // 参数
                    [/\{/, { token: 'delimiter.latex', next: '@braces' }],
                    [/\[/, { token: 'delimiter.latex', next: '@brackets' }],
                    
                    // 特殊字符
                    [/[&%$#_{}~^\\]/, 'delimiter.latex'],
                    
                    // 数字
                    [/\d+(\.\d+)?/, 'number.latex']
                ],

                // 大括号内容
                braces: [
                    [/[^{}]+/, 'string'],
                    [/\{/, { token: 'delimiter.latex', next: '@braces' }],
                    [/\}/, { token: 'delimiter.latex', next: '@pop' }]
                ],

                // 方括号内容
                brackets: [
                    [/[^\[\]]+/, 'string'],
                    [/\[/, { token: 'delimiter.latex', next: '@brackets' }],
                    [/\]/, { token: 'delimiter.latex', next: '@pop' }]
                ],

                // 行内数学
                inlinemath: [
                    [/[^$\\]+/, 'string.latex'],
                    [/\\[a-zA-Z@]+\*?/, 'command.latex'],
                    [/\\[^a-zA-Z@]/, 'command.latex'],
                    [/\$/, { token: 'string.latex', next: '@pop' }]
                ],

                // 显示数学
                displaymath: [
                    [/[^$\\]+/, 'string.latex'],
                    [/\\[a-zA-Z@]+\*?/, 'command.latex'],
                    [/\\[^a-zA-Z@]/, 'command.latex'],
                    [/\$\$/, { token: 'string.latex', next: '@pop' }]
                ],

                // 环境内容
                environment: [
                    [/\\end\{$S2\}/, { token: 'keyword.latex', next: '@pop' }],
                    [/%.*$/, 'comment'],
                    [/\\[a-zA-Z@]+\*?/, 'command.latex'],
                    [/\\[^a-zA-Z@]/, 'command.latex'],
                    [/\{/, { token: 'delimiter.latex', next: '@braces' }],
                    [/\[/, { token: 'delimiter.latex', next: '@brackets' }],
                    [/[^\\%{}[\]]+/, 'environment.latex']
                ]
            }
        });

        this.languageRegistered = true;
        console.log('LaTeX 语法高亮插件初始化完成');
    }

    destroy() {
        // 清理资源
        console.log('LaTeX 语法高亮插件已卸载');
    }

    // 获取语法高亮配置
    getSyntaxConfig() {
        return {
            language: 'latex',
            theme: 'latex-dark',
            features: [
                'comments',
                'commands',
                'environments',
                'math',
                'brackets',
                'folding'
            ]
        };
    }

    // 自定义语法规则
    addCustomRule(rule) {
        // 可以动态添加自定义语法规则
        console.log('添加自定义语法规则:', rule);
    }

    // 获取支持的 LaTeX 命令列表
    getLatexCommands() {
        return [
            // 文档结构
            'documentclass', 'usepackage', 'begin', 'end',
            'title', 'author', 'date', 'maketitle',
            'section', 'subsection', 'subsubsection',
            'chapter', 'part', 'paragraph', 'subparagraph',
            
            // 文本格式
            'textbf', 'textit', 'texttt', 'textsc', 'emph',
            'underline', 'overline', 'textcolor', 'colorbox',
            'large', 'Large', 'LARGE', 'huge', 'Huge',
            'small', 'footnotesize', 'scriptsize', 'tiny',
            
            // 数学
            'frac', 'sqrt', 'sum', 'int', 'prod', 'lim',
            'alpha', 'beta', 'gamma', 'delta', 'epsilon',
            'theta', 'lambda', 'mu', 'pi', 'sigma', 'phi',
            'infty', 'partial', 'nabla', 'pm', 'mp',
            'leq', 'geq', 'neq', 'approx', 'equiv',
            
            // 列表和表格
            'item', 'itemize', 'enumerate', 'description',
            'tabular', 'table', 'figure', 'caption', 'label',
            
            // 引用和参考
            'ref', 'cite', 'bibliography', 'bibliographystyle',
            'footnote', 'marginpar',
            
            // 其他
            'newline', 'linebreak', 'pagebreak', 'clearpage',
            'hspace', 'vspace', 'quad', 'qquad',
            'includegraphics', 'input', 'include'
        ];
    }

    // 获取支持的环境列表
    getLatexEnvironments() {
        return [
            'document', 'abstract', 'quote', 'quotation',
            'verse', 'verbatim', 'center', 'flushleft', 'flushright',
            'itemize', 'enumerate', 'description',
            'tabular', 'array', 'table', 'figure',
            'equation', 'align', 'gather', 'split',
            'matrix', 'pmatrix', 'bmatrix', 'vmatrix',
            'theorem', 'proof', 'definition', 'lemma',
            'minipage', 'multicols'
        ];
    }
} 