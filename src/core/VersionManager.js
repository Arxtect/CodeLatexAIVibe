import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { MonacoBinding } from 'y-monaco';

export class VersionManager {
    constructor() {
        this.projectDoc = null; // 项目级 Y.Doc
        this.projectProvider = null; // 项目持久化提供者
        this.fileBindings = new Map(); // 文件绑定映射
        this.projectPath = null; // 当前项目路径
        this.autoSaveEnabled = true; // 默认开启自动保存
        this.autoSaveInterval = 30000; // 30秒自动保存
        this.autoSaveTimer = null;
        this.undoManager = null; // Undo/Redo 管理器
        this.listeners = new Map();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.listeners = new Map();
    }

    // 初始化项目版本管理
    async initProject(projectPath) {
        this.projectPath = projectPath;
        
        // 创建项目级 Y.Doc
        this.projectDoc = new Y.Doc();
        
        // 设置项目持久化
        this.projectProvider = new IndexeddbPersistence(`project_${projectPath}`, this.projectDoc);
        
        // 等待初始化完成
        await new Promise(resolve => {
            this.projectProvider.on('synced', resolve);
        });
        
        // 设置 Undo/Redo 管理器
        this.setupUndoManager();
        
        // 启动自动保存
        this.startAutoSave();
        
        // 监听项目文档变化
        this.projectDoc.on('update', (update, origin) => {
            this.onProjectUpdate(update, origin);
        });
        
        console.log(`项目版本管理已初始化: ${projectPath}`);
        this.notifyListeners('projectInitialized', { projectPath });
    }

    // 设置 Undo/Redo 管理器
    setupUndoManager() {
        if (this.projectDoc) {
            // 创建 UndoManager，跟踪所有文件的变化
            const trackedTypes = [];
            
            // 获取所有文件的 YText
            const filesMap = this.projectDoc.getMap('files');
            filesMap.forEach((yText, fileName) => {
                trackedTypes.push(yText);
            });
            
            this.undoManager = new Y.UndoManager(trackedTypes);
            
            // 监听新文件添加
            filesMap.observe(() => {
                this.updateUndoManager();
            });
        }
    }

    // 更新 UndoManager 跟踪的类型
    updateUndoManager() {
        if (this.undoManager && this.projectDoc) {
            const filesMap = this.projectDoc.getMap('files');
            const trackedTypes = [];
            
            filesMap.forEach((yText, fileName) => {
                trackedTypes.push(yText);
            });
            
            // 重新创建 UndoManager
            this.undoManager.destroy();
            this.undoManager = new Y.UndoManager(trackedTypes);
        }
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
        if (!yText) {
            yText = new Y.Text();
            filesMap.set(relativePath, yText);
            
            // 更新 UndoManager
            this.updateUndoManager();
        }

        // 如果已有绑定，先销毁
        if (this.fileBindings.has(filePath)) {
            this.fileBindings.get(filePath).destroy();
        }

        // 创建新绑定
        const binding = new MonacoBinding(
            yText,
            editor.getModel(),
            new Set([editor]),
            null
        );

        this.fileBindings.set(filePath, binding);
        
        console.log(`文件已绑定到项目版本管理: ${relativePath}`);
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
        const projectSnapshot = {
            id: this.generateSnapshotId(),
            projectPath: this.projectPath,
            timestamp: new Date().toISOString(),
            description: description,
            files: {},
            state: Y.encodeStateAsUpdate(this.projectDoc),
            version: this.getNextProjectVersion()
        };

        // 收集所有文件内容
        filesMap.forEach((yText, fileName) => {
            projectSnapshot.files[fileName] = {
                content: yText.toString(),
                size: yText.length
            };
        });

        // 保存快照
        this.saveProjectSnapshot(projectSnapshot);
        
        this.notifyListeners('snapshotCreated', { snapshot: projectSnapshot });
        
        console.log(`项目快照已创建: ${projectSnapshot.id}`);
        return projectSnapshot;
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
            
            // 限制快照数量（保留最近100个）
            if (snapshots.length > 100) {
                snapshots.splice(0, snapshots.length - 100);
            }
            
            const key = `project_snapshots_${this.projectPath}`;
            localStorage.setItem(key, JSON.stringify(snapshots));
        } catch (error) {
            console.error('保存项目快照失败:', error);
        }
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

    // Undo 操作
    undo() {
        if (this.undoManager && this.undoManager.canUndo()) {
            this.undoManager.undo();
            this.notifyListeners('undoPerformed', {});
            return true;
        }
        return false;
    }

    // Redo 操作
    redo() {
        if (this.undoManager && this.undoManager.canRedo()) {
            this.undoManager.redo();
            this.notifyListeners('redoPerformed', {});
            return true;
        }
        return false;
    }

    // 检查是否可以 Undo
    canUndo() {
        return this.undoManager ? this.undoManager.canUndo() : false;
    }

    // 检查是否可以 Redo
    canRedo() {
        return this.undoManager ? this.undoManager.canRedo() : false;
    }

    // 启动自动保存
    startAutoSave() {
        if (this.autoSaveEnabled && !this.autoSaveTimer) {
            this.autoSaveTimer = setInterval(() => {
                this.createProjectSnapshot('自动保存');
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
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
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
        this.listeners.clear();
        
        console.log('项目版本管理器已销毁');
    }
} 