export class VersionUI {
    constructor(versionManager, ide) {
        this.versionManager = versionManager;
        this.ide = ide;
        this.currentFile = null;
        this.selectedSnapshots = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 监听版本管理器事件
        this.versionManager.on('snapshotCreated', (data) => {
            this.refreshVersionHistory();
            this.showNotification('快照创建成功', 'success');
        });

        this.versionManager.on('snapshotRestored', (data) => {
            this.refreshVersionHistory();
            this.showNotification('已恢复到指定版本', 'success');
        });

        this.versionManager.on('snapshotDeleted', (data) => {
            this.refreshVersionHistory();
            this.showNotification('快照已删除', 'info');
        });
    }

    // 打开版本管理界面
    open(filePath = null) {
        this.currentFile = filePath || this.ide.currentFile;
        if (!this.currentFile) {
            this.showNotification('请先打开一个文件', 'warning');
            return;
        }

        document.getElementById('versionModal').style.display = 'flex';
        this.loadVersionHistory();
    }

    // 关闭版本管理界面
    close() {
        document.getElementById('versionModal').style.display = 'none';
        this.selectedSnapshots = [];
    }

    // 加载版本历史
    loadVersionHistory() {
        if (!this.currentFile) return;

        const history = this.versionManager.getDocumentHistory(this.currentFile);
        this.renderVersionHistory(history);
        this.renderVersionStats(history);
    }

    // 渲染版本历史列表
    renderVersionHistory(history) {
        const container = document.getElementById('versionHistoryList');
        container.innerHTML = '';

        if (history.snapshots.length === 0) {
            container.innerHTML = `
                <div class="no-versions">
                    <p>暂无版本快照</p>
                    <button class="btn-primary" onclick="window.versionUI.createSnapshot()">
                        创建第一个快照
                    </button>
                </div>
            `;
            return;
        }

        // 按时间倒序显示
        const sortedSnapshots = [...history.snapshots].reverse();
        
        sortedSnapshots.forEach((snapshot, index) => {
            const item = this.createVersionItem(snapshot, index === 0);
            container.appendChild(item);
        });
    }

    // 创建版本项元素
    createVersionItem(snapshot, isLatest = false) {
        const item = document.createElement('div');
        item.className = 'version-item';
        item.dataset.snapshotId = snapshot.id;

        const date = new Date(snapshot.timestamp);
        const timeAgo = this.getTimeAgo(date);

        item.innerHTML = `
            <div class="version-header">
                <div class="version-info">
                    <div class="version-title">
                        <span class="version-number">v${snapshot.version}</span>
                        ${isLatest ? '<span class="latest-badge">最新</span>' : ''}
                        <input type="checkbox" class="version-checkbox" 
                               onchange="window.versionUI.onVersionSelect(this, '${snapshot.id}')">
                    </div>
                    <div class="version-time">${timeAgo}</div>
                </div>
                <div class="version-actions">
                    <button class="btn-small btn-secondary" 
                            onclick="window.versionUI.restoreSnapshot('${snapshot.id}')">
                        恢复
                    </button>
                    <button class="btn-small btn-secondary" 
                            onclick="window.versionUI.viewSnapshot('${snapshot.id}')">
                        查看
                    </button>
                    <button class="btn-small btn-danger" 
                            onclick="window.versionUI.deleteSnapshot('${snapshot.id}')">
                        删除
                    </button>
                </div>
            </div>
            <div class="version-description">
                ${snapshot.description || '无描述'}
            </div>
            <div class="version-stats">
                <span class="content-length">${snapshot.content.length} 字符</span>
                <span class="timestamp">${date.toLocaleString()}</span>
            </div>
        `;

        return item;
    }

    // 渲染版本统计
    renderVersionStats(history) {
        const container = document.getElementById('versionStats');
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${history.totalVersions}</div>
                    <div class="stat-label">总版本数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${history.currentContent.length}</div>
                    <div class="stat-label">当前字符数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${history.lastModified ? this.getTimeAgo(new Date(history.lastModified)) : '无'}</div>
                    <div class="stat-label">最后修改</div>
                </div>
            </div>
        `;
    }

    // 创建快照
    createSnapshot() {
        if (!this.currentFile) return;

        const description = prompt('请输入快照描述（可选）:');
        if (description === null) return; // 用户取消

        const snapshot = this.versionManager.createSnapshot(this.currentFile, description);
        if (snapshot) {
            this.refreshVersionHistory();
        }
    }

    // 恢复快照
    restoreSnapshot(snapshotId) {
        if (!this.currentFile) return;

        if (confirm('确定要恢复到此版本吗？当前未保存的更改将丢失。')) {
            const success = this.versionManager.restoreSnapshot(this.currentFile, snapshotId);
            if (success) {
                this.refreshVersionHistory();
            }
        }
    }

    // 查看快照内容
    viewSnapshot(snapshotId) {
        const snapshots = this.versionManager.getSnapshots(this.currentFile);
        const snapshot = snapshots.find(s => s.id === snapshotId);
        
        if (snapshot) {
            this.showSnapshotViewer(snapshot);
        }
    }

    // 删除快照
    deleteSnapshot(snapshotId) {
        if (confirm('确定要删除此快照吗？此操作不可撤销。')) {
            const success = this.versionManager.deleteSnapshot(this.currentFile, snapshotId);
            if (success) {
                this.refreshVersionHistory();
            }
        }
    }

    // 版本选择处理
    onVersionSelect(checkbox, snapshotId) {
        if (checkbox.checked) {
            if (this.selectedSnapshots.length < 2) {
                this.selectedSnapshots.push(snapshotId);
            } else {
                checkbox.checked = false;
                this.showNotification('最多只能选择两个版本进行比较', 'warning');
            }
        } else {
            const index = this.selectedSnapshots.indexOf(snapshotId);
            if (index > -1) {
                this.selectedSnapshots.splice(index, 1);
            }
        }

        this.updateCompareButton();
    }

    // 更新比较按钮状态
    updateCompareButton() {
        const compareBtn = document.getElementById('compareVersionsBtn');
        if (compareBtn) {
            compareBtn.disabled = this.selectedSnapshots.length !== 2;
            compareBtn.textContent = `比较版本 (${this.selectedSnapshots.length}/2)`;
        }
    }

    // 比较选中的版本
    compareSelectedVersions() {
        if (this.selectedSnapshots.length !== 2) return;

        const snapshots = this.versionManager.getSnapshots(this.currentFile);
        const snapshot1 = snapshots.find(s => s.id === this.selectedSnapshots[0]);
        const snapshot2 = snapshots.find(s => s.id === this.selectedSnapshots[1]);

        if (snapshot1 && snapshot2) {
            this.showVersionComparison(snapshot1, snapshot2);
        }
    }

    // 显示版本比较
    showVersionComparison(snapshot1, snapshot2) {
        const comparison = this.versionManager.compareSnapshots(snapshot1, snapshot2);
        
        // 创建比较窗口
        const modal = document.createElement('div');
        modal.className = 'modal version-compare-modal';
        modal.innerHTML = `
            <div class="modal-content version-compare-content">
                <div class="modal-header">
                    <h3>版本比较</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="compare-header">
                    <div class="compare-info">
                        <div class="compare-version">
                            <h4>版本 ${snapshot1.version}</h4>
                            <p>${new Date(snapshot1.timestamp).toLocaleString()}</p>
                        </div>
                        <div class="compare-stats">
                            <span class="added">+${comparison.changes.added}</span>
                            <span class="removed">-${comparison.changes.removed}</span>
                        </div>
                        <div class="compare-version">
                            <h4>版本 ${snapshot2.version}</h4>
                            <p>${new Date(snapshot2.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div class="compare-content">
                    ${this.renderDiff(comparison.diff)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // 渲染差异内容
    renderDiff(diff) {
        let html = '<div class="diff-container">';
        
        diff.forEach(item => {
            const className = `diff-line diff-${item.type}`;
            const prefix = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' ';
            html += `
                <div class="${className}">
                    <span class="line-number">${item.lineNumber}</span>
                    <span class="line-prefix">${prefix}</span>
                    <span class="line-content">${this.escapeHtml(item.line)}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    // 显示快照查看器
    showSnapshotViewer(snapshot) {
        const modal = document.createElement('div');
        modal.className = 'modal snapshot-viewer-modal';
        modal.innerHTML = `
            <div class="modal-content snapshot-viewer-content">
                <div class="modal-header">
                    <h3>快照查看 - v${snapshot.version}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="snapshot-info">
                    <p><strong>时间:</strong> ${new Date(snapshot.timestamp).toLocaleString()}</p>
                    <p><strong>描述:</strong> ${snapshot.description || '无描述'}</p>
                    <p><strong>大小:</strong> ${snapshot.content.length} 字符</p>
                </div>
                <div class="snapshot-content">
                    <pre><code>${this.escapeHtml(snapshot.content)}</code></pre>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // 刷新版本历史
    refreshVersionHistory() {
        if (this.currentFile) {
            this.loadVersionHistory();
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 获取相对时间
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} 天前`;
        if (hours > 0) return `${hours} 小时前`;
        if (minutes > 0) return `${minutes} 分钟前`;
        return '刚刚';
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 导出版本历史
    exportVersionHistory() {
        if (!this.currentFile) return;

        const history = this.versionManager.getDocumentHistory(this.currentFile);
        const data = {
            filePath: this.currentFile,
            exportTime: new Date().toISOString(),
            history: history
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `version-history-${this.currentFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 自动快照设置
    setupAutoSnapshot() {
        const interval = prompt('请输入自动快照间隔（分钟，0 表示禁用）:', '5');
        if (interval === null) return;

        const minutes = parseInt(interval);
        if (isNaN(minutes) || minutes < 0) {
            this.showNotification('无效的时间间隔', 'error');
            return;
        }

        if (this.autoSnapshotTimer) {
            clearInterval(this.autoSnapshotTimer);
        }

        if (minutes > 0) {
            this.autoSnapshotTimer = setInterval(() => {
                if (this.ide.currentFile && this.ide.isDirty) {
                    this.versionManager.createSnapshot(this.ide.currentFile, '自动快照');
                }
            }, minutes * 60 * 1000);

            this.showNotification(`已设置 ${minutes} 分钟自动快照`, 'success');
        } else {
            this.showNotification('已禁用自动快照', 'info');
        }
    }
} 