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

    async readFile(filePath, encoding = 'utf8') {
        this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            this.fs.readFile(filePath, encoding, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async writeFile(filePath, content, encoding = 'utf8') {
        this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            try {
                // 确保目录存在
                const dir = filePath.substring(0, filePath.lastIndexOf('/'));
                if (dir && dir !== '') {
                    await this.ensureDirectoryExists(dir);
                }
                
                this.fs.writeFile(filePath, content, encoding, (err) => {
                    if (err) {
                        console.error(`写入文件失败: ${filePath}`, err);
                        reject(err);
                    } else {
                        console.log(`文件写入成功: ${filePath}`);
                        resolve();
                    }
                });
            } catch (error) {
                console.error(`创建目录失败: ${filePath}`, error);
                reject(error);
            }
        });
    }

    async ensureDirectoryExists(dirPath) {
        if (!dirPath || dirPath === '/' || dirPath === '') {
            return;
        }

        try {
            // 检查目录是否存在
            const stats = await this.stat(dirPath);
            if (stats.isDirectory()) {
                return; // 目录已存在
            }
        } catch (error) {
            // 目录不存在，需要创建
        }

        // 递归创建父目录
        const parentDir = dirPath.substring(0, dirPath.lastIndexOf('/'));
        if (parentDir && parentDir !== '') {
            await this.ensureDirectoryExists(parentDir);
        }

        // 创建当前目录
        return new Promise((resolve, reject) => {
            this.fs.mkdir(dirPath, (err) => {
                if (err && err.code !== 'EEXIST') {
                    console.error(`创建目录失败: ${dirPath}`, err);
                    reject(err);
                } else {
                    console.log(`目录创建成功: ${dirPath}`);
                    resolve();
                }
            });
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
                        tree.children.push(await this.getFileTree(fullPath, visitedPaths, currentDepth + 1, maxDepth));
                    } else {
                        tree.children.push({
                            name: file,
                            path: fullPath,
                            type: 'file'
                        });
                    }
                } catch (statError) {
                    console.warn(`获取文件状态失败: ${fullPath}`, statError);
                }
            }
        } catch (err) {
            console.error(`读取目录失败: ${dirPath}`, err);
            tree.warning = '读取目录失败';
        }
        
        return tree;
    }
}