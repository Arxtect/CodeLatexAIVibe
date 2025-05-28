/**
 * 工具调用管理器
 * 允许AI模型主动请求项目数据和执行操作
 */
export class ToolCallManager {
    constructor(ide) {
        this.ide = ide;
        this.tools = new Map();
        this.registerDefaultTools();
    }

    /**
     * 注册默认工具
     */
    registerDefaultTools() {
        // 文件系统工具
        this.registerTool('read_file', {
            description: '读取指定文件的内容',
            parameters: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: '要读取的文件路径（相对于项目根目录）'
                    },
                    encoding: {
                        type: 'string',
                        description: '文件编码，默认为utf8',
                        default: 'utf8'
                    }
                },
                required: ['file_path']
            },
            handler: this.readFile.bind(this)
        });

        this.registerTool('list_files', {
            description: '列出指定目录下的文件和文件夹',
            parameters: {
                type: 'object',
                properties: {
                    directory_path: {
                        type: 'string',
                        description: '要列出的目录路径，默认为根目录',
                        default: '/'
                    },
                    recursive: {
                        type: 'boolean',
                        description: '是否递归列出子目录，默认为false',
                        default: false
                    },
                    file_types: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '过滤的文件类型（扩展名），如["tex", "md"]'
                    }
                },
                required: []
            },
            handler: this.listFiles.bind(this)
        });

        this.registerTool('get_file_structure', {
            description: '获取项目的完整文件结构树',
            parameters: {
                type: 'object',
                properties: {
                    max_depth: {
                        type: 'number',
                        description: '最大深度，默认为10',
                        default: 10
                    },
                    include_hidden: {
                        type: 'boolean',
                        description: '是否包含隐藏文件，默认为false',
                        default: false
                    }
                },
                required: []
            },
            handler: this.getFileStructure.bind(this)
        });

        // 编辑器工具
        this.registerTool('get_current_file', {
            description: '获取当前打开文件的信息和内容',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: this.getCurrentFile.bind(this)
        });

        this.registerTool('get_selection', {
            description: '获取编辑器中当前选中的文本',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: this.getSelection.bind(this)
        });

        this.registerTool('get_cursor_position', {
            description: '获取编辑器中光标的位置信息',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: this.getCursorPosition.bind(this)
        });

        // 搜索工具
        this.registerTool('search_in_files', {
            description: '在项目文件中搜索指定文本',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '要搜索的文本'
                    },
                    file_pattern: {
                        type: 'string',
                        description: '文件名模式，如"*.tex"或"*.md"'
                    },
                    case_sensitive: {
                        type: 'boolean',
                        description: '是否区分大小写，默认为false',
                        default: false
                    },
                    max_results: {
                        type: 'number',
                        description: '最大结果数量，默认为50',
                        default: 50
                    }
                },
                required: ['query']
            },
            handler: this.searchInFiles.bind(this)
        });

        // 项目信息工具
        this.registerTool('get_project_info', {
            description: '获取项目的基本信息和统计数据',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: this.getProjectInfo.bind(this)
        });

        this.registerTool('get_open_tabs', {
            description: '获取当前打开的所有标签页信息',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: this.getOpenTabs.bind(this)
        });

        // 版本控制工具
        this.registerTool('get_recent_changes', {
            description: '获取最近的文件变更历史',
            parameters: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: '返回的变更数量限制，默认为10',
                        default: 10
                    }
                },
                required: []
            },
            handler: this.getRecentChanges.bind(this)
        });

        console.log(`已注册 ${this.tools.size} 个工具`);
    }

    /**
     * 注册工具
     */
    registerTool(name, config) {
        this.tools.set(name, {
            name,
            description: config.description,
            parameters: config.parameters,
            handler: config.handler
        });
    }

    /**
     * 获取所有工具的定义（用于AI模型）
     */
    getToolDefinitions() {
        const tools = [];
        for (const [name, tool] of this.tools) {
            tools.push({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            });
        }
        return tools;
    }

    /**
     * 执行工具调用
     */
    async executeToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        
        if (!this.tools.has(name)) {
            throw new Error(`未知的工具: ${name}`);
        }

        const tool = this.tools.get(name);
        
        try {
            console.log(`执行工具调用: ${name}`, args);
            const result = await tool.handler(args);
            console.log(`工具调用完成: ${name}`);
            return result;
        } catch (error) {
            console.error(`工具调用失败: ${name}`, error);
            throw new Error(`工具调用失败: ${error.message}`);
        }
    }

    // 工具处理函数
    async readFile(args) {
        const { file_path, encoding = 'utf8' } = args;
        
        try {
            const content = await this.ide.fileSystem.readFile(file_path, encoding);
            const stats = await this.ide.fileSystem.stat(file_path);
            
            return {
                success: true,
                file_path,
                content,
                size: content.length,
                encoding,
                last_modified: stats.mtime || new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                file_path
            };
        }
    }

    async listFiles(args) {
        const { directory_path = '/', recursive = false, file_types } = args;
        
        try {
            const files = [];
            await this.scanDirectory(directory_path, files, recursive, file_types);
            
            return {
                success: true,
                directory_path,
                files: files.map(file => ({
                    name: file.name,
                    path: file.path,
                    type: file.type,
                    size: file.size,
                    extension: file.extension
                }))
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                directory_path
            };
        }
    }

    async scanDirectory(dirPath, files, recursive, fileTypes, depth = 0, maxDepth = 10) {
        if (depth >= maxDepth) return;
        
        try {
            const entries = await this.ide.fileSystem.readdir(dirPath);
            
            for (const entry of entries) {
                if (entry.startsWith('.')) continue; // 跳过隐藏文件
                
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                const stats = await this.ide.fileSystem.stat(fullPath);
                
                if (stats.isDirectory()) {
                    files.push({
                        name: entry,
                        path: fullPath,
                        type: 'directory',
                        size: 0
                    });
                    
                    if (recursive) {
                        await this.scanDirectory(fullPath, files, recursive, fileTypes, depth + 1, maxDepth);
                    }
                } else {
                    const extension = entry.split('.').pop().toLowerCase();
                    
                    // 文件类型过滤
                    if (fileTypes && fileTypes.length > 0 && !fileTypes.includes(extension)) {
                        continue;
                    }
                    
                    files.push({
                        name: entry,
                        path: fullPath,
                        type: 'file',
                        size: stats.size || 0,
                        extension
                    });
                }
            }
        } catch (error) {
            console.warn(`扫描目录失败: ${dirPath}`, error);
        }
    }

    async getFileStructure(args) {
        const { max_depth = 10, include_hidden = false } = args;
        
        try {
            const structure = await this.buildFileTree('/', max_depth, include_hidden);
            return {
                success: true,
                structure,
                max_depth,
                include_hidden
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async buildFileTree(dirPath, maxDepth, includeHidden, depth = 0) {
        if (depth >= maxDepth) return null;
        
        const tree = {
            name: dirPath === '/' ? 'root' : dirPath.split('/').pop(),
            path: dirPath,
            type: 'directory',
            children: []
        };
        
        try {
            const entries = await this.ide.fileSystem.readdir(dirPath);
            
            for (const entry of entries) {
                if (!includeHidden && entry.startsWith('.')) continue;
                
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                const stats = await this.ide.fileSystem.stat(fullPath);
                
                if (stats.isDirectory()) {
                    const subtree = await this.buildFileTree(fullPath, maxDepth, includeHidden, depth + 1);
                    if (subtree) {
                        tree.children.push(subtree);
                    }
                } else {
                    tree.children.push({
                        name: entry,
                        path: fullPath,
                        type: 'file',
                        size: stats.size || 0,
                        extension: entry.split('.').pop().toLowerCase()
                    });
                }
            }
        } catch (error) {
            console.warn(`构建文件树失败: ${dirPath}`, error);
        }
        
        return tree;
    }

    getCurrentFile() {
        if (!this.ide.currentFile || !this.ide.editor) {
            return {
                success: false,
                error: '没有打开的文件'
            };
        }
        
        const content = this.ide.editor.getValue();
        const model = this.ide.editor.getModel();
        
        return {
            success: true,
            file_path: this.ide.currentFile,
            content,
            line_count: model.getLineCount(),
            language: model.getLanguageId(),
            size: content.length
        };
    }

    getSelection() {
        if (!this.ide.editor) {
            return {
                success: false,
                error: '编辑器未初始化'
            };
        }
        
        const selection = this.ide.editor.getSelection();
        const model = this.ide.editor.getModel();
        
        if (!selection || selection.isEmpty()) {
            return {
                success: false,
                error: '没有选中的文本'
            };
        }
        
        const selectedText = model.getValueInRange(selection);
        
        return {
            success: true,
            text: selectedText,
            start_line: selection.startLineNumber,
            start_column: selection.startColumn,
            end_line: selection.endLineNumber,
            end_column: selection.endColumn,
            length: selectedText.length
        };
    }

    getCursorPosition() {
        if (!this.ide.editor) {
            return {
                success: false,
                error: '编辑器未初始化'
            };
        }
        
        const position = this.ide.editor.getPosition();
        const model = this.ide.editor.getModel();
        
        return {
            success: true,
            line: position.lineNumber,
            column: position.column,
            offset: model.getOffsetAt(position),
            total_lines: model.getLineCount()
        };
    }

    async searchInFiles(args) {
        const { query, file_pattern, case_sensitive = false, max_results = 50 } = args;
        
        try {
            const results = [];
            const files = [];
            await this.scanDirectory('/', files, true);
            
            // 过滤文件
            let filteredFiles = files.filter(f => f.type === 'file');
            if (file_pattern) {
                const pattern = file_pattern.replace('*', '.*');
                const regex = new RegExp(pattern, 'i');
                filteredFiles = filteredFiles.filter(f => regex.test(f.name));
            }
            
            // 搜索文件内容
            for (const file of filteredFiles) {
                if (results.length >= max_results) break;
                
                try {
                    const content = await this.ide.fileSystem.readFile(file.path, 'utf8');
                    const lines = content.split('\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const searchText = case_sensitive ? line : line.toLowerCase();
                        const searchQuery = case_sensitive ? query : query.toLowerCase();
                        
                        if (searchText.includes(searchQuery)) {
                            results.push({
                                file_path: file.path,
                                line_number: i + 1,
                                line_content: line.trim(),
                                match_position: searchText.indexOf(searchQuery)
                            });
                            
                            if (results.length >= max_results) break;
                        }
                    }
                } catch (error) {
                    console.warn(`搜索文件失败: ${file.path}`, error);
                }
            }
            
            return {
                success: true,
                query,
                results,
                total_matches: results.length,
                files_searched: filteredFiles.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                query
            };
        }
    }

    async getProjectInfo() {
        try {
            const files = [];
            await this.scanDirectory('/', files, true);
            
            const filesByType = {};
            let totalSize = 0;
            
            files.forEach(file => {
                if (file.type === 'file') {
                    const ext = file.extension || 'unknown';
                    if (!filesByType[ext]) {
                        filesByType[ext] = { count: 0, size: 0 };
                    }
                    filesByType[ext].count++;
                    filesByType[ext].size += file.size;
                    totalSize += file.size;
                }
            });
            
            return {
                success: true,
                total_files: files.filter(f => f.type === 'file').length,
                total_directories: files.filter(f => f.type === 'directory').length,
                total_size: totalSize,
                files_by_type: filesByType,
                current_file: this.ide.currentFile,
                open_tabs: this.ide.openTabs.size
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getOpenTabs() {
        const tabs = [];
        
        for (const [filePath, tabData] of this.ide.openTabs) {
            tabs.push({
                file_path: filePath,
                is_current: filePath === this.ide.currentFile,
                is_dirty: tabData.isDirty || false,
                size: tabData.content ? tabData.content.length : 0
            });
        }
        
        return {
            success: true,
            tabs,
            current_file: this.ide.currentFile,
            total_tabs: tabs.length
        };
    }

    getRecentChanges(args) {
        const { limit = 10 } = args;
        
        // 这里可以集成版本管理系统的历史记录
        // 目前返回模拟数据
        return {
            success: true,
            changes: [],
            limit,
            message: '版本历史功能待实现'
        };
    }
} 