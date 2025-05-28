import * as BrowserFS from 'browserfs';

export class FileSystem {
    constructor() {
        this.fs = null;
        this.initialized = false;
    }

    async init() {
        return new Promise((resolve, reject) => {
            BrowserFS.configure({
                fs: "MountableFileSystem",
                options: {
                    "/": {
                        fs: "InMemory"
                    },
                    "/tmp": {
                        fs: "InMemory"
                    }
                }
            }, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.fs = BrowserFS.BFSRequire('fs');
                this.initialized = true;
                console.log('文件系统初始化完成');
                resolve();
            });
        });
    }

    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('文件系统未初始化');
        }
    }

    async readFile(filePath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async writeFile(filePath, content) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            // 确保目录存在
            const dir = filePath.substring(0, filePath.lastIndexOf('/'));
            if (dir && dir !== '') {
                this.fs.mkdir(dir, { recursive: true }, (mkdirErr) => {
                    if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                        reject(mkdirErr);
                        return;
                    }
                    
                    this.fs.writeFile(filePath, content, 'utf8', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                this.fs.writeFile(filePath, content, 'utf8', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    async readdir(dirPath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.readdir(dirPath, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files || []);
                }
            });
        });
    }

    async mkdir(dirPath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.mkdir(dirPath, { recursive: true }, (err) => {
                if (err && err.code !== 'EEXIST') {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async unlink(filePath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.unlink(filePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async rmdir(dirPath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.rmdir(dirPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async stat(path) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.stat(path, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    async exists(path) {
        this.ensureInitialized();
        
        return new Promise((resolve) => {
            this.fs.exists(path, (exists) => {
                resolve(exists);
            });
        });
    }

    async rename(oldPath, newPath) {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // 获取文件树结构
    async getFileTree(dirPath = '/', visitedPaths = new Set(), currentDepth = 0, maxDepth = 10) {
        this.ensureInitialized();
        
        // 防止无限递归
        if (currentDepth >= maxDepth) {
            console.warn(`达到最大扫描深度 ${maxDepth}，停止扫描: ${dirPath}`);
            return {
                name: dirPath === '/' ? 'root' : dirPath.split('/').pop(),
                path: dirPath,
                type: 'directory',
                children: [],
                warning: '目录层级过深，已停止扫描'
            };
        }
        
        // 防止循环引用
        const normalizedPath = dirPath.replace(/\/+/g, '/');
        if (visitedPaths.has(normalizedPath)) {
            console.warn(`检测到循环引用，跳过: ${dirPath}`);
            return {
                name: dirPath === '/' ? 'root' : dirPath.split('/').pop(),
                path: dirPath,
                type: 'directory',
                children: [],
                warning: '检测到循环引用'
            };
        }
        visitedPaths.add(normalizedPath);
        
        const tree = {
            name: dirPath === '/' ? 'root' : dirPath.split('/').pop(),
            path: dirPath,
            type: 'directory',
            children: []
        };

        try {
            const files = await this.readdir(dirPath);
            
            for (const file of files) {
                // 跳过隐藏文件和特殊目录
                if (file.startsWith('.') || file === 'node_modules' || file === '__pycache__') {
                    continue;
                }
                
                const fullPath = dirPath === '/' ? `/${file}` : `${dirPath}/${file}`;
                
                try {
                    const stats = await this.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        const subTree = await this.getFileTree(fullPath, visitedPaths, currentDepth + 1, maxDepth);
                        tree.children.push(subTree);
                    } else {
                        tree.children.push({
                            name: file,
                            path: fullPath,
                            type: 'file',
                            size: stats.size
                        });
                    }
                } catch (statError) {
                    console.warn(`无法获取 ${fullPath} 的状态:`, statError);
                }
            }
        } catch (error) {
            console.error('获取文件树失败:', error);
            tree.error = error.message;
        } finally {
            // 扫描完成后从访问集合中移除
            visitedPaths.delete(normalizedPath);
        }

        return tree;
    }

    // 导出文件系统内容为 JSON
    async exportToJSON() {
        const tree = await this.getFileTree('/', new Set(), 0, 10);
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            files: {}
        };

        const collectFiles = async (node) => {
            if (node.type === 'file') {
                try {
                    const content = await this.readFile(node.path);
                    exportData.files[node.path] = {
                        content: content,
                        size: node.size
                    };
                } catch (error) {
                    console.error(`读取文件 ${node.path} 失败:`, error);
                }
            } else if (node.children) {
                for (const child of node.children) {
                    await collectFiles(child);
                }
            }
        };

        await collectFiles(tree);
        return exportData;
    }

    // 从 JSON 导入文件系统内容
    async importFromJSON(jsonData) {
        if (!jsonData.files) {
            throw new Error('无效的导入数据格式');
        }

        for (const [filePath, fileData] of Object.entries(jsonData.files)) {
            try {
                await this.writeFile(filePath, fileData.content);
            } catch (error) {
                console.error(`导入文件 ${filePath} 失败:`, error);
            }
        }
    }
} 