/**
 * VS Code 兼容层
 * 提供类似 VS Code Extension API 的接口，便于移植现有插件
 */

export class VSCodeCompat {
    constructor(agentAPI) {
        this.agentAPI = agentAPI;
        this.ide = agentAPI.ide;
        
        // 模拟 VS Code 的全局对象
        this.window = this.createWindowAPI();
        this.workspace = this.createWorkspaceAPI();
        this.commands = this.createCommandsAPI();
        this.env = this.createEnvAPI();
        this.extensions = this.createExtensionsAPI();
    }

    /**
     * 创建 window API
     */
    createWindowAPI() {
        return {
            activeTextEditor: () => this.agentAPI.getActiveTextEditor(),
            showInformationMessage: (...args) => this.agentAPI.showInformationMessage(...args),
            showWarningMessage: (...args) => this.agentAPI.showWarningMessage(...args),
            showErrorMessage: (...args) => this.agentAPI.showErrorMessage(...args),
            showInputBox: (options = {}) => {
                return new Promise((resolve) => {
                    const input = prompt(options.prompt || '请输入:', options.value || '');
                    resolve(input);
                });
            },
            showQuickPick: (items, options = {}) => {
                return new Promise((resolve) => {
                    // 简单实现，实际应该显示选择器
                    const choice = prompt(`请选择 (${items.join(', ')}):`, items[0]);
                    resolve(choice);
                });
            },
            createOutputChannel: (name) => this.agentAPI.createOutputChannel(name),
            onDidChangeActiveTextEditor: (callback) => {
                this.agentAPI.on('activeEditorChanged', callback);
                return { dispose: () => this.agentAPI.off('activeEditorChanged', callback) };
            }
        };
    }

    /**
     * 创建 workspace API
     */
    createWorkspaceAPI() {
        return {
            workspaceFolders: this.agentAPI.getWorkspaceFolders(),
            getConfiguration: (section) => this.agentAPI.getConfiguration(section),
            createFileSystemWatcher: (pattern) => this.agentAPI.createFileSystemWatcher(pattern),
            openTextDocument: async (uri) => {
                const filePath = typeof uri === 'string' ? uri : uri.fsPath;
                await this.ide.openFile(filePath);
                return this.agentAPI.getActiveTextEditor()?.document;
            },
            saveAll: async () => {
                for (const filePath of this.ide.openTabs.keys()) {
                    await this.ide.saveFile(filePath);
                }
            },
            findFiles: async (include, exclude) => {
                const files = await this.agentAPI.getAllFiles();
                // 简单的文件过滤实现
                return files.map(f => ({ fsPath: f, scheme: 'file' }));
            },
            onDidSaveTextDocument: (callback) => {
                this.agentAPI.on('documentSaved', callback);
                return { dispose: () => this.agentAPI.off('documentSaved', callback) };
            },
            onDidChangeTextDocument: (callback) => {
                this.agentAPI.on('documentChanged', callback);
                return { dispose: () => this.agentAPI.off('documentChanged', callback) };
            }
        };
    }

    /**
     * 创建 commands API
     */
    createCommandsAPI() {
        return {
            registerCommand: (command, callback) => this.agentAPI.registerCommand(command, callback),
            executeCommand: (...args) => this.agentAPI.executeCommand(...args)
        };
    }

    /**
     * 创建 env API
     */
    createEnvAPI() {
        return {
            appName: 'LaTeX IDE',
            appRoot: '/',
            language: 'zh-cn',
            machineId: 'latex-ide-machine',
            sessionId: Date.now().toString(),
            shell: '/bin/bash',
            uriScheme: 'file'
        };
    }

    /**
     * 创建 extensions API
     */
    createExtensionsAPI() {
        return {
            getExtension: (id) => {
                // 返回扩展信息
                return {
                    id,
                    extensionPath: `/extensions/${id}`,
                    isActive: true,
                    packageJSON: {},
                    exports: {}
                };
            },
            all: []
        };
    }

    /**
     * 创建类似 VS Code 的 Uri 类
     */
    static createUri() {
        return class Uri {
            constructor(scheme, authority, path, query, fragment) {
                this.scheme = scheme || 'file';
                this.authority = authority || '';
                this.path = path || '';
                this.query = query || '';
                this.fragment = fragment || '';
            }

            static file(path) {
                return new Uri('file', '', path);
            }

            static parse(value) {
                // 简单的 URI 解析
                const url = new URL(value);
                return new Uri(url.protocol.slice(0, -1), url.hostname, url.pathname, url.search.slice(1), url.hash.slice(1));
            }

            get fsPath() {
                return this.path;
            }

            toString() {
                return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
            }
        };
    }

    /**
     * 创建类似 VS Code 的 Range 类
     */
    static createRange() {
        return class Range {
            constructor(startLine, startCharacter, endLine, endCharacter) {
                this.start = { line: startLine, character: startCharacter };
                this.end = { line: endLine, character: endCharacter };
            }

            get isEmpty() {
                return this.start.line === this.end.line && this.start.character === this.end.character;
            }

            contains(positionOrRange) {
                if (positionOrRange.line !== undefined) {
                    // Position
                    return this.start.line <= positionOrRange.line && positionOrRange.line <= this.end.line;
                } else {
                    // Range
                    return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
                }
            }
        };
    }

    /**
     * 创建类似 VS Code 的 Position 类
     */
    static createPosition() {
        return class Position {
            constructor(line, character) {
                this.line = line;
                this.character = character;
            }

            isBefore(other) {
                return this.line < other.line || (this.line === other.line && this.character < other.character);
            }

            isAfter(other) {
                return this.line > other.line || (this.line === other.line && this.character > other.character);
            }

            isEqual(other) {
                return this.line === other.line && this.character === other.character;
            }
        };
    }

    /**
     * 创建类似 VS Code 的 Selection 类
     */
    static createSelection() {
        const Range = this.createRange();
        
        return class Selection extends Range {
            constructor(anchorLine, anchorCharacter, activeLine, activeCharacter) {
                super(anchorLine, anchorCharacter, activeLine, activeCharacter);
                this.anchor = { line: anchorLine, character: anchorCharacter };
                this.active = { line: activeLine, character: activeCharacter };
            }

            get isReversed() {
                return this.anchor.line > this.active.line || 
                       (this.anchor.line === this.active.line && this.anchor.character > this.active.character);
            }
        };
    }

    /**
     * 获取完整的 VS Code 兼容 API
     */
    getVSCodeAPI() {
        const Uri = VSCodeCompat.createUri();
        const Range = VSCodeCompat.createRange();
        const Position = VSCodeCompat.createPosition();
        const Selection = VSCodeCompat.createSelection();

        return {
            // 核心 API
            window: this.window,
            workspace: this.workspace,
            commands: this.commands,
            env: this.env,
            extensions: this.extensions,

            // 类型定义
            Uri,
            Range,
            Position,
            Selection,

            // 常量
            ViewColumn: {
                One: 1,
                Two: 2,
                Three: 3,
                Active: -1,
                Beside: -2
            },

            // 状态栏
            StatusBarAlignment: {
                Left: 1,
                Right: 2
            },

            // 诊断严重性
            DiagnosticSeverity: {
                Error: 0,
                Warning: 1,
                Information: 2,
                Hint: 3
            },

            // 文件类型
            FileType: {
                Unknown: 0,
                File: 1,
                Directory: 2,
                SymbolicLink: 64
            }
        };
    }
}

/**
 * 创建全局 vscode 对象，用于插件兼容
 */
export function createVSCodeGlobal(agentAPI) {
    const compat = new VSCodeCompat(agentAPI);
    return compat.getVSCodeAPI();
} 