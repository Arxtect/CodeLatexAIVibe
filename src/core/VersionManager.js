import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { MonacoBinding } from 'y-monaco';

export class VersionManager {
    constructor() {
        this.projectDoc = null; // 项目级 Y.Doc
        this.projectProvider = null; // 项目持久化提供者
        this.fileBindings = new Map(); // 文件路径 -> YText 绑定
        this.projectPath = null; // 当前项目路径
        this.autoSaveEnabled = false; // 默认开启自动保存
        this.autoSaveInterval = 30000; // 30秒自动保存
        this.autoSaveTimer = null;
        this.undoManager = null; // Yjs UndoManager - 已禁用
        this.eventListeners = new Map();
        
        // 存储管理配置
        this.maxSnapshots = 50; // 默认最大快照数量
        this.storageWarningThreshold = 0.8; // 存储使用率警告阈值
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventListeners = new Map();
    }

    // 初始化项目版本管理
    async initProject(projectPath) {
        console.log(`🚀 开始初始化项目版本管理: ${projectPath}`);
        
        this.projectPath = projectPath;
        
        // 创建项目级 Y.Doc
        this.projectDoc = new Y.Doc();
        console.log('✅ 项目文档已创建');
        
        // 设置项目持久化
        this.projectProvider = new IndexeddbPersistence(`project_${projectPath}`, this.projectDoc);
        console.log('✅ 项目持久化提供者已创建');
        
        // 等待初始化完成
        await new Promise(resolve => {
            this.projectProvider.on('synced', () => {
                console.log('✅ 项目持久化同步完成');
                resolve();
            });
        });
        
        // UndoManager 已禁用
        // if (this.undoManager) {
        //     console.log('✅ UndoManager 创建验证成功');
        // } else {
        //     console.error('❌ UndoManager 创建验证失败');
        // }
        
        // 启动自动保存
        this.startAutoSave();
        
        // 监听项目文档变化
        this.projectDoc.on('update', (update, origin) => {
            this.onProjectUpdate(update, origin);
        });
        
        console.log(`✅ 项目版本管理初始化完成: ${projectPath}`);
        console.log('- projectDoc:', !!this.projectDoc);
        console.log('- undoManager:', !!this.undoManager);
        console.log('- projectProvider:', !!this.projectProvider);
        
        this.notifyListeners('projectInitialized', { projectPath });
    }

    // 设置 Undo/Redo 管理器
    setupUndoManager() {
        if (this.projectDoc) {
            try {
                // 创建 UndoManager，初始时为空
                this.undoManager = new Y.UndoManager([], {
                    captureTimeout: 500 // 500ms 内的操作会被合并
                });
                
                // 监听 UndoManager 状态变化
                this.undoManager.on('stack-item-added', (event) => {
                    console.log('UndoManager: 添加了新的操作到栈', event);
                    this.notifyListeners('undoStackChanged', {});
                });
                
                this.undoManager.on('stack-item-popped', (event) => {
                    console.log('UndoManager: 从栈中弹出操作', event);
                    this.notifyListeners('undoStackChanged', {});
                });
                
                // 获取现有文件并添加到跟踪
                const filesMap = this.projectDoc.getMap('files');
                const existingFiles = [];
                filesMap.forEach((yText, fileName) => {
                    existingFiles.push(yText);
                    console.log(`发现现有文件: ${fileName}`);
                });
                
                if (existingFiles.length > 0) {
                    // 重新创建 UndoManager 包含现有文件
                    this.undoManager = new Y.UndoManager(existingFiles, {
                        captureTimeout: 500
                    });
                    
                    // 重新绑定事件
                    this.undoManager.on('stack-item-added', (event) => {
                        console.log('UndoManager: 添加了新的操作到栈', event);
                        this.notifyListeners('undoStackChanged', {});
                    });
                    
                    this.undoManager.on('stack-item-popped', (event) => {
                        console.log('UndoManager: 从栈中弹出操作', event);
                        this.notifyListeners('undoStackChanged', {});
                    });
                    
                    console.log(`已将 ${existingFiles.length} 个现有文件添加到 UndoManager`);
                }
                
                // 监听新文件添加
                filesMap.observe((event) => {
                    event.changes.keys.forEach((change, key) => {
                        if (change.action === 'add') {
                            const yText = filesMap.get(key);
                            if (yText && this.undoManager) {
                                this.undoManager.addToScope(yText);
                                console.log(`已将新文件 ${key} 添加到 UndoManager 跟踪`);
                            }
                        }
                    });
                });
                
                console.log('✅ UndoManager 已成功初始化');
                console.log('- UndoManager 实例:', !!this.undoManager);
                console.log('- 初始 scope 大小:', this.undoManager.scope ? this.undoManager.scope.size : 0);
                console.log('- trackedOrigins:', this.undoManager.trackedOrigins);
                
            } catch (error) {
                console.error('❌ UndoManager 初始化失败:', error);
                this.undoManager = null;
            }
        } else {
            console.error('❌ 无法创建 UndoManager: projectDoc 不存在');
        }
    }

    // 更新 UndoManager 跟踪的类型（已废弃，使用 addToScope 代替）
    updateUndoManager() {
        // 这个方法已经不需要了，因为我们使用 addToScope 动态添加
        console.log('UndoManager 使用动态添加，无需重新创建');
    }

    // 绑定文件到编辑器
    bindFileToEditor(filePath, editor) {
        if (!this.projectDoc) {
            console.error('项目未初始化');
            return null;
        }

        const filesMap = this.projectDoc.getMap('files');
        const relativePath = this.getRelativePath(filePath);
        
        // 获取或创建文件的 YText
        let yText = filesMap.get(relativePath);
        let isNewFile = false;
        
        if (!yText) {
            yText = new Y.Text();
            filesMap.set(relativePath, yText);
            isNewFile = true;
            console.log(`创建新的 Y.Text 对象: ${relativePath}`);
        }

        // UndoManager 已禁用
        // if (this.undoManager && yText) {
        //     // 检查是否已经在 scope 中
        //     let alreadyInScope = false;
        //     if (this.undoManager.scope) {
        //         this.undoManager.scope.forEach(item => {
        //             if (item === yText) {
        //                 alreadyInScope = true;
        //             }
        //         });
        //     }
            
        //     if (!alreadyInScope) {
        //         this.undoManager.addToScope(yText);
        //         console.log(`已将 Y.Text 添加到 UndoManager scope: ${relativePath}`);
        //     }
        // }

        // 如果已有绑定，先销毁
        if (this.fileBindings.has(filePath)) {
            this.fileBindings.get(filePath).destroy();
        }

        // 创建新绑定
        const binding = new MonacoBinding(
            yText,
            editor.getModel(),
            new Set([editor])
        );

        this.fileBindings.set(filePath, binding);
        
        console.log(`文件已绑定到项目版本管理: ${relativePath}`);
        // console.log(`- UndoManager 存在:`, !!this.undoManager);
        // console.log(`- UndoManager scope 大小:`, this.undoManager?.scope?.size || 0);
        
        return binding;
    }

    // 解绑文件
    unbindFile(filePath) {
        if (this.fileBindings.has(filePath)) {
            this.fileBindings.get(filePath).destroy();
            this.fileBindings.delete(filePath);
        }
    }

    // 获取相对路径
    getRelativePath(filePath) {
        if (!this.projectPath) return filePath;
        return filePath.startsWith(this.projectPath) 
            ? filePath.substring(this.projectPath.length + 1)
            : filePath;
    }

    // 创建项目快照
    createProjectSnapshot(description = '') {
        if (!this.projectDoc) return null;

        const filesMap = this.projectDoc.getMap('files');
        
        // 收集当前所有文件内容
        const currentFiles = {};
        filesMap.forEach((yText, fileName) => {
            currentFiles[fileName] = {
                content: yText.toString(),
                size: yText.length
            };
        });

        // 检查是否有内容变化
        if (!this.hasContentChanged(currentFiles)) {
            console.log('项目内容未发生变化，跳过快照创建');
            return null;
        }

        const projectSnapshot = {
            id: this.generateSnapshotId(),
            projectPath: this.projectPath,
            timestamp: new Date().toISOString(),
            description: description,
            files: currentFiles,
            state: Y.encodeStateAsUpdate(this.projectDoc),
            version: this.getNextProjectVersion()
        };

        // 保存快照
        this.saveProjectSnapshot(projectSnapshot);
        
        this.notifyListeners('snapshotCreated', { snapshot: projectSnapshot });
        
        console.log(`项目快照已创建: ${projectSnapshot.id}`);
        return projectSnapshot;
    }

    // 检查内容是否有变化
    hasContentChanged(currentFiles) {
        const snapshots = this.getProjectSnapshots();
        
        // 如果没有历史快照，说明是第一次，需要创建
        if (snapshots.length === 0) {
            return true;
        }

        // 获取最新快照
        const latestSnapshot = snapshots[snapshots.length - 1];
        
        // 比较文件数量
        const currentFileNames = Object.keys(currentFiles);
        const latestFileNames = Object.keys(latestSnapshot.files);
        
        if (currentFileNames.length !== latestFileNames.length) {
            return true;
        }

        // 比较每个文件的内容
        for (const fileName of currentFileNames) {
            // 检查文件是否存在于最新快照中
            if (!latestSnapshot.files[fileName]) {
                return true;
            }
            
            // 比较文件内容
            if (currentFiles[fileName].content !== latestSnapshot.files[fileName].content) {
                return true;
            }
        }

        // 检查是否有文件被删除
        for (const fileName of latestFileNames) {
            if (!currentFiles[fileName]) {
                return true;
            }
        }

        return false;
    }

    // 恢复项目快照
    restoreProjectSnapshot(snapshotId) {
        const snapshot = this.getProjectSnapshot(snapshotId);
        if (!snapshot) return false;

        if (!this.projectDoc) return false;

        // 应用快照状态
        Y.applyUpdate(this.projectDoc, snapshot.state);
        
        this.notifyListeners('snapshotRestored', { snapshot });
        
        console.log(`项目已恢复到快照: ${snapshotId}`);
        return true;
    }

    // 获取项目快照列表
    getProjectSnapshots() {
        try {
            const key = `project_snapshots_${this.projectPath}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取项目快照失败:', error);
            return [];
        }
    }

    // 获取单个项目快照
    getProjectSnapshot(snapshotId) {
        const snapshots = this.getProjectSnapshots();
        return snapshots.find(s => s.id === snapshotId);
    }

    // 保存项目快照
    saveProjectSnapshot(snapshot) {
        try {
            const snapshots = this.getProjectSnapshots();
            snapshots.push(snapshot);
            
            // 限制快照数量（使用配置的最大值）
            if (snapshots.length > this.maxSnapshots) {
                snapshots.splice(0, snapshots.length - this.maxSnapshots);
            }
            
            const key = `project_snapshots_${this.projectPath}`;
            const dataToSave = JSON.stringify(snapshots);
            
            // 尝试保存，如果超出配额则进行清理
            this.saveWithQuotaManagement(key, dataToSave, snapshots);
            
        } catch (error) {
            console.error('保存项目快照失败:', error);
            
            // 如果是配额错误，尝试清理存储
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }
    
    // 带配额管理的保存方法
    saveWithQuotaManagement(key, dataToSave, snapshots) {
        try {
            localStorage.setItem(key, dataToSave);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('存储配额已满，开始清理旧快照...');
                
                // 逐步减少快照数量直到能够保存
                let maxRetries = 5;
                let currentSnapshots = [...snapshots];
                
                while (maxRetries > 0 && currentSnapshots.length > 10) {
                    // 每次减少20%的快照
                    const removeCount = Math.max(1, Math.floor(currentSnapshots.length * 0.2));
                    currentSnapshots.splice(0, removeCount);
                    
                    try {
                        const reducedData = JSON.stringify(currentSnapshots);
                        localStorage.setItem(key, reducedData);
                        console.log(`已清理 ${removeCount} 个旧快照，当前保留 ${currentSnapshots.length} 个快照`);
                        return;
                    } catch (retryError) {
                        if (retryError.name !== 'QuotaExceededError') {
                            throw retryError;
                        }
                        maxRetries--;
                    }
                }
                
                // 如果还是无法保存，进行更激进的清理
                if (maxRetries === 0) {
                    this.performAggressiveCleanup();
                    
                    // 最后尝试只保存最新的10个快照
                    const minimalSnapshots = snapshots.slice(-10);
                    const minimalData = JSON.stringify(minimalSnapshots);
                    localStorage.setItem(key, minimalData);
                    console.log('已执行激进清理，仅保留最新10个快照');
                }
            } else {
                throw error;
            }
        }
    }
    
    // 处理存储配额超出
    handleStorageQuotaExceeded() {
        console.warn('检测到存储配额超出，开始清理...');
        
        // 获取当前存储使用情况
        const storageInfo = this.getStorageInfo();
        console.log('当前存储使用情况:', storageInfo);
        
        // 清理策略：
        // 1. 清理其他项目的旧快照
        this.cleanupOtherProjectSnapshots();
        
        // 2. 清理当前项目的旧快照
        this.cleanupCurrentProjectSnapshots();
        
        // 3. 清理临时数据
        this.cleanupTemporaryData();
        
        console.log('存储清理完成');
    }
    
    // 获取存储使用信息
    getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;
        const items = {};
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;
                itemCount++;
                
                if (key.startsWith('project_snapshots_')) {
                    items[key] = {
                        size: size,
                        sizeKB: Math.round(size / 1024),
                        sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
                    };
                }
            }
        }
        
        return {
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024),
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            itemCount,
            snapshotItems: items
        };
    }
    
    // 清理其他项目的快照
    cleanupOtherProjectSnapshots() {
        const currentProjectKey = `project_snapshots_${this.projectPath}`;
        const keysToClean = [];
        
        for (let key in localStorage) {
            if (key.startsWith('project_snapshots_') && key !== currentProjectKey) {
                keysToClean.push(key);
            }
        }
        
        // 删除其他项目的快照（保留最新5个）
        keysToClean.forEach(key => {
            try {
                const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
                if (snapshots.length > 5) {
                    const reducedSnapshots = snapshots.slice(-5);
                    localStorage.setItem(key, JSON.stringify(reducedSnapshots));
                    console.log(`已清理项目快照: ${key}，保留最新5个`);
                }
            } catch (error) {
                console.warn(`清理项目快照失败: ${key}`, error);
                localStorage.removeItem(key);
            }
        });
    }
    
    // 清理当前项目的快照
    cleanupCurrentProjectSnapshots() {
        const key = `project_snapshots_${this.projectPath}`;
        try {
            const snapshots = this.getProjectSnapshots();
            if (snapshots.length > 20) {
                // 保留最新20个快照
                const reducedSnapshots = snapshots.slice(-20);
                localStorage.setItem(key, JSON.stringify(reducedSnapshots));
                console.log(`已清理当前项目快照，保留最新20个`);
            }
        } catch (error) {
            console.warn('清理当前项目快照失败:', error);
        }
    }
    
    // 清理临时数据
    cleanupTemporaryData() {
        const keysToRemove = [];
        
        for (let key in localStorage) {
            // 清理可能的临时数据
            if (key.startsWith('temp_') || 
                key.startsWith('cache_') || 
                key.startsWith('debug_') ||
                key.includes('_temp') ||
                key.includes('_cache')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`已清理临时数据: ${key}`);
        });
    }
    
    // 执行激进清理
    performAggressiveCleanup() {
        console.warn('执行激进存储清理...');
        
        // 清理所有非当前项目的快照
        const currentProjectKey = `project_snapshots_${this.projectPath}`;
        const keysToRemove = [];
        
        for (let key in localStorage) {
            if (key.startsWith('project_snapshots_') && key !== currentProjectKey) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`已删除其他项目快照: ${key}`);
        });
        
        // 清理所有临时数据
        this.cleanupTemporaryData();
        
        console.log('激进清理完成');
    }
    
    // 获取存储使用统计
    getStorageStats() {
        const info = this.getStorageInfo();
        const quota = this.estimateStorageQuota();
        
        return {
            used: info.totalSizeMB,
            quota: quota,
            usagePercentage: quota > 0 ? Math.round((info.totalSizeMB / quota) * 100) : 0,
            itemCount: info.itemCount,
            snapshotCount: Object.keys(info.snapshotItems).length
        };
    }
    
    // 估算存储配额
    estimateStorageQuota() {
        // 大多数浏览器的 localStorage 限制在 5-10MB
        // 这里返回一个保守估计
        return 5; // MB
    }

    // 删除项目快照
    deleteProjectSnapshot(snapshotId) {
        try {
            const snapshots = this.getProjectSnapshots();
            const index = snapshots.findIndex(s => s.id === snapshotId);
            
            if (index > -1) {
                snapshots.splice(index, 1);
                const key = `project_snapshots_${this.projectPath}`;
                localStorage.setItem(key, JSON.stringify(snapshots));
                
                this.notifyListeners('snapshotDeleted', { snapshotId });
                return true;
            }
        } catch (error) {
            console.error('删除项目快照失败:', error);
        }
        return false;
    }

    // 比较项目快照
    compareProjectSnapshots(snapshot1Id, snapshot2Id) {
        const snapshot1 = this.getProjectSnapshot(snapshot1Id);
        const snapshot2 = this.getProjectSnapshot(snapshot2Id);
        
        if (!snapshot1 || !snapshot2) return null;

        const comparison = {
            snapshot1,
            snapshot2,
            fileDiffs: {},
            summary: {
                filesChanged: 0,
                filesAdded: 0,
                filesRemoved: 0,
                totalLinesAdded: 0,
                totalLinesRemoved: 0
            }
        };

        // 获取所有文件名
        const allFiles = new Set([
            ...Object.keys(snapshot1.files),
            ...Object.keys(snapshot2.files)
        ]);

        allFiles.forEach(fileName => {
            const file1 = snapshot1.files[fileName];
            const file2 = snapshot2.files[fileName];

            if (!file1) {
                // 文件被添加
                comparison.fileDiffs[fileName] = {
                    type: 'added',
                    content: file2.content,
                    linesAdded: file2.content.split('\n').length
                };
                comparison.summary.filesAdded++;
                comparison.summary.totalLinesAdded += file2.content.split('\n').length;
            } else if (!file2) {
                // 文件被删除
                comparison.fileDiffs[fileName] = {
                    type: 'removed',
                    content: file1.content,
                    linesRemoved: file1.content.split('\n').length
                };
                comparison.summary.filesRemoved++;
                comparison.summary.totalLinesRemoved += file1.content.split('\n').length;
            } else if (file1.content !== file2.content) {
                // 文件被修改
                const diff = this.computeTextDiff(file1.content, file2.content);
                comparison.fileDiffs[fileName] = {
                    type: 'modified',
                    diff: diff.diff,
                    linesAdded: diff.stats.added,
                    linesRemoved: diff.stats.removed
                };
                comparison.summary.filesChanged++;
                comparison.summary.totalLinesAdded += diff.stats.added;
                comparison.summary.totalLinesRemoved += diff.stats.removed;
            }
        });

        return comparison;
    }

    // 计算文本差异
    computeTextDiff(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');
        const diff = [];
        const stats = { added: 0, removed: 0, unchanged: 0 };
        
        let i = 0, j = 0;
        while (i < lines1.length || j < lines2.length) {
            if (i >= lines1.length) {
                diff.push({ type: 'added', line: lines2[j], lineNumber: j + 1 });
                stats.added++;
                j++;
            } else if (j >= lines2.length) {
                diff.push({ type: 'removed', line: lines1[i], lineNumber: i + 1 });
                stats.removed++;
                i++;
            } else if (lines1[i] === lines2[j]) {
                diff.push({ type: 'unchanged', line: lines1[i], lineNumber: i + 1 });
                stats.unchanged++;
                i++;
                j++;
            } else {
                diff.push({ type: 'removed', line: lines1[i], lineNumber: i + 1 });
                diff.push({ type: 'added', line: lines2[j], lineNumber: j + 1 });
                stats.removed++;
                stats.added++;
                i++;
                j++;
            }
        }
        
        return { diff, stats };
    }

    // Undo 操作 - 已禁用
    undo() {
        console.log('Undo functionality disabled');
        return false;
        // if (this.undoManager && this.undoManager.canUndo()) {
        //     this.undoManager.undo();
        //     this.notifyListeners('undoPerformed', {});
        //     return true;
        // }
        // return false;
    }

    // Redo 操作 - 已禁用
    redo() {
        console.log('Redo functionality disabled');
        return false;
        // if (this.undoManager && this.undoManager.canRedo()) {
        //     this.undoManager.redo();
        //     this.notifyListeners('redoPerformed', {});
        //     return true;
        // }
        // return false;
    }

    // 检查是否可以 Undo - 已禁用
    canUndo() {
        return false;
        // return this.undoManager ? this.undoManager.canUndo() : false;
    }

    // 检查是否可以 Redo - 已禁用
    canRedo() {
        return false;
        // return this.undoManager ? this.undoManager.canRedo() : false;
    }

    // 启动自动保存
    startAutoSave() {
        if (this.autoSaveEnabled && !this.autoSaveTimer) {
            this.autoSaveTimer = setInterval(() => {
                const snapshot = this.createProjectSnapshot('自动保存');
                if (snapshot) {
                    console.log('自动保存快照已创建');
                } else {
                    console.log('自动保存：内容未变化，跳过快照创建');
                }
            }, this.autoSaveInterval);
            
            console.log(`自动保存已启动，间隔: ${this.autoSaveInterval / 1000}秒`);
        }
    }

    // 停止自动保存
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('自动保存已停止');
        }
    }

    // 设置自动保存间隔
    setAutoSaveInterval(seconds) {
        this.autoSaveInterval = seconds * 1000;
        if (this.autoSaveEnabled) {
            this.stopAutoSave();
            this.startAutoSave();
        }
    }

    // 启用/禁用自动保存
    setAutoSaveEnabled(enabled) {
        this.autoSaveEnabled = enabled;
        if (enabled) {
            this.startAutoSave();
        } else {
            this.stopAutoSave();
        }
    }

    // 获取项目状态
    getProjectStatus() {
        if (!this.projectDoc) return null;

        const filesMap = this.projectDoc.getMap('files');
        const snapshots = this.getProjectSnapshots();
        
        return {
            projectPath: this.projectPath,
            fileCount: filesMap.size,
            totalSnapshots: snapshots.length,
            lastSnapshot: snapshots.length > 0 ? snapshots[snapshots.length - 1] : null,
            autoSaveEnabled: this.autoSaveEnabled,
            autoSaveInterval: this.autoSaveInterval / 1000,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    // 项目更新事件处理
    onProjectUpdate(update, origin) {
        this.notifyListeners('projectUpdated', { update, origin });
    }

    // 生成快照 ID
    generateSnapshotId() {
        return 'project_snapshot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 获取下一个项目版本号
    getNextProjectVersion() {
        const snapshots = this.getProjectSnapshots();
        return snapshots.length + 1;
    }

    // 事件监听
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyListeners(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件监听器执行失败 (${event}):`, error);
                }
            });
        }
    }

    // 销毁
    destroy() {
        this.stopAutoSave();
        
        // 清理所有文件绑定
        for (const binding of this.fileBindings.values()) {
            binding.destroy();
        }
        
        // 清理 UndoManager
        if (this.undoManager) {
            this.undoManager.destroy();
        }
        
        // 清理项目提供者
        if (this.projectProvider) {
            this.projectProvider.destroy();
        }
        
        // 清理项目文档
        if (this.projectDoc) {
            this.projectDoc.destroy();
        }
        
        this.fileBindings.clear();
        this.eventListeners.clear();
        
        console.log('项目版本管理器已销毁');
    }

    // 手动清理存储（用于调试和维护）
    manualCleanup(options = {}) {
        const {
            keepSnapshots = 10,
            cleanOtherProjects = true,
            cleanTemporary = true,
            aggressive = false
        } = options;
        
        console.log('开始手动存储清理...', options);
        
        const beforeInfo = this.getStorageInfo();
        console.log('清理前存储使用:', beforeInfo);
        
        try {
            if (cleanTemporary) {
                this.cleanupTemporaryData();
            }
            
            if (cleanOtherProjects) {
                this.cleanupOtherProjectSnapshots();
            }
            
            // 清理当前项目快照
            const key = `project_snapshots_${this.projectPath}`;
            const snapshots = this.getProjectSnapshots();
            if (snapshots.length > keepSnapshots) {
                const reducedSnapshots = snapshots.slice(-keepSnapshots);
                localStorage.setItem(key, JSON.stringify(reducedSnapshots));
                console.log(`已清理当前项目快照，保留最新${keepSnapshots}个`);
            }
            
            if (aggressive) {
                this.performAggressiveCleanup();
            }
            
            const afterInfo = this.getStorageInfo();
            console.log('清理后存储使用:', afterInfo);
            
            const savedKB = beforeInfo.totalSizeKB - afterInfo.totalSizeKB;
            console.log(`清理完成，释放了 ${savedKB}KB 存储空间`);
            
            return {
                success: true,
                beforeSize: beforeInfo.totalSizeKB,
                afterSize: afterInfo.totalSizeKB,
                savedKB: savedKB
            };
            
        } catch (error) {
            console.error('手动清理失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 检查存储健康状况
    checkStorageHealth() {
        const stats = this.getStorageStats();
        const health = {
            status: 'good',
            warnings: [],
            recommendations: []
        };
        
        if (stats.usagePercentage > 90) {
            health.status = 'critical';
            health.warnings.push('存储使用率超过90%，可能导致保存失败');
            health.recommendations.push('立即清理旧快照');
        } else if (stats.usagePercentage > 70) {
            health.status = 'warning';
            health.warnings.push('存储使用率较高');
            health.recommendations.push('考虑清理一些旧快照');
        }
        
        if (stats.snapshotCount > 10) {
            health.recommendations.push('考虑减少快照保留数量');
        }
        
        return {
            ...stats,
            health
        };
    }
    
    // 设置最大快照数量
    setMaxSnapshots(count) {
        this.maxSnapshots = Math.max(5, Math.min(100, count));
        console.log(`最大快照数量已设置为: ${this.maxSnapshots}`);
    }
    
    // 获取最大快照数量
    getMaxSnapshots() {
        return this.maxSnapshots;
    }
} 