import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { MonacoBinding } from 'y-monaco';

export class VersionManager {
    constructor() {
        this.docs = new Map(); // 存储每个文件的 Y.Doc
        this.providers = new Map(); // 存储持久化提供者
        this.bindings = new Map(); // 存储 Monaco 绑定
        this.snapshots = new Map(); // 存储快照
        this.currentFile = null;
        this.listeners = new Map();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.listeners = new Map();
    }

    // 为文件创建或获取 Y.Doc
    getOrCreateDoc(filePath) {
        if (!this.docs.has(filePath)) {
            const doc = new Y.Doc();
            this.docs.set(filePath, doc);
            
            // 设置持久化
            const provider = new IndexeddbPersistence(filePath, doc);
            this.providers.set(filePath, provider);
            
            // 监听文档变化
            doc.on('update', (update, origin) => {
                this.onDocumentUpdate(filePath, update, origin);
            });
            
            console.log(`为文件 ${filePath} 创建了 Y.Doc`);
        }
        
        return this.docs.get(filePath);
    }

    // 绑定 Monaco 编辑器
    bindEditor(filePath, editor) {
        const doc = this.getOrCreateDoc(filePath);
        const yText = doc.getText('content');
        
        // 如果已有绑定，先销毁
        if (this.bindings.has(filePath)) {
            this.bindings.get(filePath).destroy();
        }
        
        // 创建新绑定
        const binding = new MonacoBinding(
            yText,
            editor.getModel(),
            new Set([editor]),
            null // 不使用 awareness (用户光标)
        );
        
        this.bindings.set(filePath, binding);
        this.currentFile = filePath;
        
        console.log(`为文件 ${filePath} 绑定了 Monaco 编辑器`);
        
        return binding;
    }

    // 解绑编辑器
    unbindEditor(filePath) {
        if (this.bindings.has(filePath)) {
            this.bindings.get(filePath).destroy();
            this.bindings.delete(filePath);
        }
    }

    // 创建快照
    createSnapshot(filePath, description = '') {
        const doc = this.getOrCreateDoc(filePath);
        const yText = doc.getText('content');
        
        const snapshot = {
            id: this.generateSnapshotId(),
            filePath: filePath,
            timestamp: new Date().toISOString(),
            description: description,
            content: yText.toString(),
            state: Y.encodeStateAsUpdate(doc),
            version: this.getNextVersion(filePath)
        };
        
        if (!this.snapshots.has(filePath)) {
            this.snapshots.set(filePath, []);
        }
        
        this.snapshots.get(filePath).push(snapshot);
        
        // 保存到 localStorage
        this.saveSnapshotsToStorage();
        
        this.notifyListeners('snapshotCreated', { filePath, snapshot });
        
        console.log(`为文件 ${filePath} 创建了快照: ${snapshot.id}`);
        return snapshot;
    }

    // 恢复到指定快照
    restoreSnapshot(filePath, snapshotId) {
        const snapshots = this.snapshots.get(filePath);
        if (!snapshots) return false;
        
        const snapshot = snapshots.find(s => s.id === snapshotId);
        if (!snapshot) return false;
        
        const doc = this.getOrCreateDoc(filePath);
        const yText = doc.getText('content');
        
        // 清空当前内容并设置为快照内容
        doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, snapshot.content);
        });
        
        this.notifyListeners('snapshotRestored', { filePath, snapshot });
        
        console.log(`恢复文件 ${filePath} 到快照: ${snapshot.id}`);
        return true;
    }

    // 获取文件的所有快照
    getSnapshots(filePath) {
        return this.snapshots.get(filePath) || [];
    }

    // 获取所有文件的快照
    getAllSnapshots() {
        const allSnapshots = [];
        for (const [filePath, snapshots] of this.snapshots) {
            allSnapshots.push(...snapshots.map(s => ({ ...s, filePath })));
        }
        return allSnapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // 比较两个快照
    compareSnapshots(snapshot1, snapshot2) {
        const diff = this.computeDiff(snapshot1.content, snapshot2.content);
        return {
            snapshot1,
            snapshot2,
            diff,
            changes: this.analyzeDiff(diff)
        };
    }

    // 计算文本差异
    computeDiff(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');
        const diff = [];
        
        let i = 0, j = 0;
        while (i < lines1.length || j < lines2.length) {
            if (i >= lines1.length) {
                diff.push({ type: 'added', line: lines2[j], lineNumber: j + 1 });
                j++;
            } else if (j >= lines2.length) {
                diff.push({ type: 'removed', line: lines1[i], lineNumber: i + 1 });
                i++;
            } else if (lines1[i] === lines2[j]) {
                diff.push({ type: 'unchanged', line: lines1[i], lineNumber: i + 1 });
                i++;
                j++;
            } else {
                // 简单的差异检测
                diff.push({ type: 'removed', line: lines1[i], lineNumber: i + 1 });
                diff.push({ type: 'added', line: lines2[j], lineNumber: j + 1 });
                i++;
                j++;
            }
        }
        
        return diff;
    }

    // 分析差异统计
    analyzeDiff(diff) {
        const stats = {
            added: 0,
            removed: 0,
            unchanged: 0
        };
        
        diff.forEach(item => {
            stats[item.type === 'unchanged' ? 'unchanged' : item.type]++;
        });
        
        return stats;
    }

    // 获取文档历史
    getDocumentHistory(filePath) {
        const doc = this.getOrCreateDoc(filePath);
        const snapshots = this.getSnapshots(filePath);
        
        return {
            filePath,
            currentContent: doc.getText('content').toString(),
            snapshots,
            totalVersions: snapshots.length,
            lastModified: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : null
        };
    }

    // 文档更新事件处理
    onDocumentUpdate(filePath, update, origin) {
        // 可以在这里添加自动快照逻辑
        this.notifyListeners('documentUpdated', { filePath, update, origin });
    }

    // 生成快照 ID
    generateSnapshotId() {
        return 'snapshot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 获取下一个版本号
    getNextVersion(filePath) {
        const snapshots = this.snapshots.get(filePath) || [];
        return snapshots.length + 1;
    }

    // 保存快照到本地存储
    saveSnapshotsToStorage() {
        const snapshotsData = {};
        for (const [filePath, snapshots] of this.snapshots) {
            snapshotsData[filePath] = snapshots;
        }
        localStorage.setItem('yjs-snapshots', JSON.stringify(snapshotsData));
    }

    // 从本地存储加载快照
    loadSnapshotsFromStorage() {
        try {
            const data = localStorage.getItem('yjs-snapshots');
            if (data) {
                const snapshotsData = JSON.parse(data);
                for (const [filePath, snapshots] of Object.entries(snapshotsData)) {
                    this.snapshots.set(filePath, snapshots);
                }
                console.log('从本地存储加载了快照数据');
            }
        } catch (error) {
            console.error('加载快照数据失败:', error);
        }
    }

    // 删除快照
    deleteSnapshot(filePath, snapshotId) {
        const snapshots = this.snapshots.get(filePath);
        if (!snapshots) return false;
        
        const index = snapshots.findIndex(s => s.id === snapshotId);
        if (index === -1) return false;
        
        snapshots.splice(index, 1);
        this.saveSnapshotsToStorage();
        
        this.notifyListeners('snapshotDeleted', { filePath, snapshotId });
        return true;
    }

    // 清理文件的所有数据
    cleanupFile(filePath) {
        // 解绑编辑器
        this.unbindEditor(filePath);
        
        // 销毁持久化提供者
        if (this.providers.has(filePath)) {
            this.providers.get(filePath).destroy();
            this.providers.delete(filePath);
        }
        
        // 删除文档
        if (this.docs.has(filePath)) {
            this.docs.get(filePath).destroy();
            this.docs.delete(filePath);
        }
        
        // 删除快照
        this.snapshots.delete(filePath);
        this.saveSnapshotsToStorage();
        
        console.log(`清理了文件 ${filePath} 的所有版本数据`);
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

    // 初始化
    init() {
        this.loadSnapshotsFromStorage();
        console.log('版本管理器初始化完成');
    }

    // 销毁
    destroy() {
        // 清理所有绑定
        for (const binding of this.bindings.values()) {
            binding.destroy();
        }
        
        // 清理所有提供者
        for (const provider of this.providers.values()) {
            provider.destroy();
        }
        
        // 清理所有文档
        for (const doc of this.docs.values()) {
            doc.destroy();
        }
        
        this.docs.clear();
        this.providers.clear();
        this.bindings.clear();
        this.listeners.clear();
        
        console.log('版本管理器已销毁');
    }
} 