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

        this.registerTool('write_file', {
            description: '创建或写入文件内容',
            parameters: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: '要写入的文件路径（相对于项目根目录）'
                    },
                    content: {
                        type: 'string',
                        description: '要写入的文件内容'
                    },
                    encoding: {
                        type: 'string',
                        description: '文件编码，默认为utf8',
                        default: 'utf8'
                    }
                },
                required: ['file_path', 'content']
            },
            handler: this.writeFile.bind(this)
        });

        this.registerTool('delete_file', {
            description: '删除指定文件',
            parameters: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: '要删除的文件路径（相对于项目根目录）'
                    }
                },
                required: ['file_path']
            },
            handler: this.deleteFile.bind(this)
        });

        this.registerTool('create_directory', {
            description: '创建目录',
            parameters: {
                type: 'object',
                properties: {
                    directory_path: {
                        type: 'string',
                        description: '要创建的目录路径（相对于项目根目录）'
                    }
                },
                required: ['directory_path']
            },
            handler: this.createDirectory.bind(this)
        });

        this.registerTool('delete_directory', {
            description: '删除目录（包括其中的所有文件）',
            parameters: {
                type: 'object',
                properties: {
                    directory_path: {
                        type: 'string',
                        description: '要删除的目录路径（相对于项目根目录）'
                    },
                    recursive: {
                        type: 'boolean',
                        description: '是否递归删除子目录，默认为true',
                        default: true
                    }
                },
                required: ['directory_path']
            },
            handler: this.deleteDirectory.bind(this)
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
        
        console.log('executeToolCall 调试信息:', {
            name,
            args,
            argsType: typeof args,
            toolCall: toolCall
        });
        
        if (!this.tools.has(name)) {
            throw new Error(`未知的工具: ${name}`);
        }

        const tool = this.tools.get(name);
        
        // 解析参数（如果是字符串）
        let parsedArgs = args;
        if (typeof args === 'string') {
            try {
                parsedArgs = JSON.parse(args);
            } catch (error) {
                console.error('解析工具调用参数失败:', error, args);
                throw new Error(`工具调用参数解析失败: ${error.message}`);
            }
        }
        
        console.log('解析后的参数:', parsedArgs);
        
        try {
            console.log(`执行工具调用: ${name}`, parsedArgs);
            const result = await tool.handler(parsedArgs);
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
        
        // 验证参数
        if (!file_path || typeof file_path !== 'string') {
            console.error('readFile: file_path 参数无效', { file_path, args });
            return {
                success: false,
                error: `文件路径无效: ${file_path}`,
                file_path: file_path || 'undefined'
            };
        }
        
        try {
            console.log(`读取文件: ${file_path}`);
            const content = await this.ide.fileSystem.readFile(file_path, encoding);
            
            // 检查内容是否为 undefined 或 null
            if (content === undefined || content === null) {
                throw new Error(`文件内容为空或无法读取: ${file_path}`);
            }
            
            const stats = await this.ide.fileSystem.stat(file_path);
            
            return {
                success: true,
                file_path,
                content: String(content), // 确保内容是字符串
                size: String(content).length,
                encoding,
                last_modified: stats.mtime ? stats.mtime.toISOString() : new Date().toISOString()
            };
        } catch (error) {
            console.error(`读取文件失败: ${file_path}`, error);
            return {
                success: false,
                error: error.message || '未知错误',
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
                // 确保 entry 是字符串
                if (!entry || typeof entry !== 'string') continue;
                if (entry.startsWith('.')) continue; // 跳过隐藏文件
                
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                
                try {
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
                        // 安全地获取文件扩展名
                        const parts = entry.split('.');
                        const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
                        
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
                } catch (statError) {
                    console.warn(`获取文件状态失败: ${fullPath}`, statError);
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
                // 确保 entry 是字符串
                if (!entry || typeof entry !== 'string') continue;
                if (!includeHidden && entry.startsWith('.')) continue;
                
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                
                try {
                    const stats = await this.ide.fileSystem.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        const subtree = await this.buildFileTree(fullPath, maxDepth, includeHidden, depth + 1);
                        if (subtree) {
                            tree.children.push(subtree);
                        }
                    } else {
                        // 安全地获取文件扩展名
                        const parts = entry.split('.');
                        const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
                        
                        tree.children.push({
                            name: entry,
                            path: fullPath,
                            type: 'file',
                            size: stats.size || 0,
                            extension
                        });
                    }
                } catch (statError) {
                    console.warn(`获取文件状态失败: ${fullPath}`, statError);
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

    async getRecentChanges(args) {
        const { limit = 10 } = args;
        
        try {
            // 这里可以实现获取最近变更的逻辑
            // 目前返回模拟数据
            return {
                success: true,
                changes: [
                    {
                        file_path: '/main.tex',
                        action: 'modified',
                        timestamp: new Date().toISOString(),
                        description: '修改了主文档'
                    }
                ],
                total: 1
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 新增的文件操作工具
    async writeFile(args) {
        const { file_path, content, encoding = 'utf8' } = args;
        
        try {
            await this.ide.fileSystem.writeFile(file_path, content, encoding);
            
            return {
                success: true,
                file_path,
                content_length: content.length,
                encoding,
                message: `文件 ${file_path} 创建/写入成功`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                file_path
            };
        }
    }

    async deleteFile(args) {
        const { file_path } = args;
        
        try {
            // 检查文件是否存在
            const stats = await this.ide.fileSystem.stat(file_path);
            if (stats.isDirectory()) {
                throw new Error('指定路径是目录，请使用 delete_directory 工具');
            }
            
            await this.ide.fileSystem.unlink(file_path);
            
            return {
                success: true,
                file_path,
                message: `文件 ${file_path} 删除成功`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                file_path
            };
        }
    }

    async createDirectory(args) {
        const { directory_path } = args;
        
        try {
            // 检查目录是否已存在
            try {
                const stats = await this.ide.fileSystem.stat(directory_path);
                if (stats.isDirectory()) {
                    return {
                        success: true,
                        directory_path,
                        message: `目录 ${directory_path} 已存在`
                    };
                }
            } catch (error) {
                // 目录不存在，继续创建
            }
            
            await this.ide.fileSystem.mkdir(directory_path);
            
            return {
                success: true,
                directory_path,
                message: `目录 ${directory_path} 创建成功`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                directory_path
            };
        }
    }

    async deleteDirectory(args) {
        const { directory_path, recursive = true } = args;
        
        try {
            // 检查目录是否存在
            const stats = await this.ide.fileSystem.stat(directory_path);
            if (!stats.isDirectory()) {
                throw new Error('指定路径不是目录，请使用 delete_file 工具');
            }
            
            if (recursive) {
                // 递归删除目录及其内容
                await this.deleteDirectoryRecursive(directory_path);
            } else {
                // 只删除空目录
                await this.ide.fileSystem.rmdir(directory_path);
            }
            
            return {
                success: true,
                directory_path,
                recursive,
                message: `目录 ${directory_path} 删除成功`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                directory_path
            };
        }
    }

    async deleteDirectoryRecursive(dirPath) {
        try {
            const entries = await this.ide.fileSystem.readdir(dirPath);
            
            // 删除目录中的所有文件和子目录
            for (const entry of entries) {
                const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
                const stats = await this.ide.fileSystem.stat(fullPath);
                
                if (stats.isDirectory()) {
                    await this.deleteDirectoryRecursive(fullPath);
                } else {
                    await this.ide.fileSystem.unlink(fullPath);
                }
            }
            
            // 删除空目录
            await this.ide.fileSystem.rmdir(dirPath);
        } catch (error) {
            console.warn(`删除目录失败: ${dirPath}`, error);
            throw error;
        }
    }
} 