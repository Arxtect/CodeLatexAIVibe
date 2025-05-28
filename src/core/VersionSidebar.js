export class VersionSidebar {
    constructor(versionManager, ide) {
        this.versionManager = versionManager;
        this.ide = ide;
        this.isVisible = false;
        this.selectedSnapshots = [];
        
        this.setupEventListeners();
        this.createSidebarHTML();
    }

    setupEventListeners() {
        // 监听版本管理器事件
        this.versionManager.on('snapshotCreated', () => {
            this.refreshVersionList();
        });

        this.versionManager.on('snapshotRestored', () => {
            this.refreshVersionList();
        });

        this.versionManager.on('snapshotDeleted', () => {
            this.refreshVersionList();
        });

        this.versionManager.on('projectInitialized', () => {
            this.refreshVersionList();
        });

        this.versionManager.on('undoPerformed', () => {
            this.updateUndoRedoButtons();
        });

        this.versionManager.on('redoPerformed', () => {
            this.updateUndoRedoButtons();
        });
    }

    // 创建侧边栏 HTML 结构
    createSidebarHTML() {
        const sidebarHTML = `
            <div class="version-sidebar-container" id="versionSidebarContainer">
                <div class="version-sidebar-header">
                    <div class="version-sidebar-title">
                        <span>版本历史</span>
                        <button class="version-sidebar-toggle" id="versionSidebarToggle" onclick="window.versionSidebar.toggle()">
                            <span class="toggle-icon">◀</span>
                        </button>
                    </div>
                    <div class="version-sidebar-actions">
                        <button class="btn-small btn-primary" onclick="window.versionSidebar.createSnapshot()" title="创建快照">
                            📸
                        </button>
                        <!-- Undo/Redo buttons disabled -->
                        <!-- <button class="btn-small btn-secondary" id="sidebarUndoBtn" onclick="window.versionSidebar.undo()" title="撤销" disabled>
                            ↶
                        </button>
                        <button class="btn-small btn-secondary" id="sidebarRedoBtn" onclick="window.versionSidebar.redo()" title="重做" disabled>
                            ↷
                        </button> -->
                    </div>
                </div>
                <div class="version-sidebar-content" id="versionSidebarContent">
                    <div class="version-status" id="versionStatus">
                        <!-- 项目状态信息 -->
                    </div>
                    <div class="version-list" id="versionList">
                        <!-- 版本列表 -->
                    </div>
                </div>
            </div>
        `;

        // 将侧边栏添加到主容器
        const ideContainer = document.querySelector('.ide-container');
        if (ideContainer) {
            ideContainer.insertAdjacentHTML('beforeend', sidebarHTML);
        }
    }

    // 切换侧边栏显示/隐藏
    toggle() {
        this.isVisible = !this.isVisible;
        const container = document.getElementById('versionSidebarContainer');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        if (this.isVisible) {
            container.classList.add('visible');
            toggleIcon.textContent = '▶';
            this.refreshVersionList();
        } else {
            container.classList.remove('visible');
            toggleIcon.textContent = '◀';
        }
    }

    // 显示侧边栏
    show() {
        if (!this.isVisible) {
            this.toggle();
        }
    }

    // 隐藏侧边栏
    hide() {
        if (this.isVisible) {
            this.toggle();
        }
    }

    // 刷新版本列表
    refreshVersionList() {
        if (!this.isVisible) return;

        this.updateProjectStatus();
        this.updateVersionList();
        this.updateUndoRedoButtons();
    }

    // 更新项目状态
    updateProjectStatus() {
        const statusContainer = document.getElementById('versionStatus');
        const status = this.versionManager.getProjectStatus();
        
        if (!status) {
            statusContainer.innerHTML = `
                <div class="status-item">
                    <span class="status-label">项目未初始化</span>
                </div>
            `;
            return;
        }

        statusContainer.innerHTML = `
            <div class="status-grid">
                <div class="status-item">
                    <span class="status-value">${status.fileCount}</span>
                    <span class="status-label">文件数</span>
                </div>
                <div class="status-item">
                    <span class="status-value">${status.totalSnapshots}</span>
                    <span class="status-label">快照数</span>
                </div>
                <div class="status-item">
                    <span class="status-indicator ${status.autoSaveEnabled ? 'enabled' : 'disabled'}"></span>
                    <span class="status-label">自动保存</span>
                </div>
            </div>
        `;
    }

    // 更新版本列表
    updateVersionList() {
        const listContainer = document.getElementById('versionList');
        const snapshots = this.versionManager.getProjectSnapshots();
        
        if (snapshots.length === 0) {
            listContainer.innerHTML = `
                <div class="no-versions">
                    <p>暂无版本快照</p>
                    <button class="btn-small btn-primary" onclick="window.versionSidebar.createSnapshot()">
                        创建快照
                    </button>
                </div>
            `;
            return;
        }

        // 按时间倒序显示最近的10个版本
        const recentSnapshots = [...snapshots].reverse().slice(0, 10);
        
        listContainer.innerHTML = recentSnapshots.map((snapshot, index) => {
            const isLatest = index === 0;
            const timeAgo = this.getTimeAgo(new Date(snapshot.timestamp));
            const fileCount = Object.keys(snapshot.files).length;
            
            return `
                <div class="version-item" data-snapshot-id="${snapshot.id}">
                    <div class="version-header">
                        <div class="version-number">v${snapshot.version}</div>
                        ${isLatest ? '<span class="latest-badge">最新</span>' : ''}
                    </div>
                    <div class="version-info">
                        <div class="version-time">${timeAgo}</div>
                        <div class="version-files">${fileCount} 个文件</div>
                        <div class="version-description">${snapshot.description || '无描述'}</div>
                    </div>
                    <div class="version-actions">
                        <button class="btn-tiny btn-secondary" onclick="window.versionSidebar.restoreSnapshot('${snapshot.id}')" title="恢复">
                            ↺
                        </button>
                        <button class="btn-tiny btn-secondary" onclick="window.versionSidebar.viewSnapshot('${snapshot.id}')" title="查看">
                            👁
                        </button>
                        <button class="btn-tiny btn-danger" onclick="window.versionSidebar.deleteSnapshot('${snapshot.id}')" title="删除">
                            🗑
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 如果有更多版本，显示查看全部按钮
        if (snapshots.length > 10) {
            listContainer.insertAdjacentHTML('beforeend', `
                <div class="view-all-versions">
                    <button class="btn-small btn-secondary" onclick="window.versionSidebar.openVersionSettings()">
                        查看全部 ${snapshots.length} 个版本
                    </button>
                </div>
            `);
        }
    }

    // 更新撤销/重做按钮状态 - 已禁用
    updateUndoRedoButtons() {
        // Undo/Redo functionality disabled
        // const sidebarUndoBtn = document.getElementById('sidebarUndoBtn');
        // const sidebarRedoBtn = document.getElementById('sidebarRedoBtn');
        
        // if (sidebarUndoBtn) {
        //     sidebarUndoBtn.disabled = !this.versionManager.canUndo();
        // }
        
        // if (sidebarRedoBtn) {
        //     sidebarRedoBtn.disabled = !this.versionManager.canRedo();
        // }
        
        // // 同时更新工具栏按钮
        // if (this.ide && this.ide.updateUndoRedoButtons) {
        //     this.ide.updateUndoRedoButtons();
        // }
    }

    // 创建快照
    createSnapshot() {
        const description = prompt('请输入快照描述（可选）:');
        if (description !== null) {
            const snapshot = this.versionManager.createProjectSnapshot(description);
            if (!snapshot) {
                // 显示提示信息
                this.showNotification('项目内容未发生变化，无需创建快照', 'info');
            }
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 恢复快照
    restoreSnapshot(snapshotId) {
        if (confirm('确定要恢复到此版本吗？当前未保存的更改将丢失。')) {
            this.versionManager.restoreProjectSnapshot(snapshotId);
        }
    }

    // 查看快照
    viewSnapshot(snapshotId) {
        const snapshot = this.versionManager.getProjectSnapshot(snapshotId);
        if (snapshot) {
            this.showSnapshotViewer(snapshot);
        }
    }

    // 删除快照
    deleteSnapshot(snapshotId) {
        if (confirm('确定要删除此快照吗？此操作不可撤销。')) {
            this.versionManager.deleteProjectSnapshot(snapshotId);
        }
    }

    // 撤销操作 - 已禁用
    undo() {
        console.log('Undo functionality disabled');
        // this.versionManager.undo();
    }

    // 重做操作 - 已禁用
    redo() {
        console.log('Redo functionality disabled');
        // this.versionManager.redo();
    }

    // 打开版本设置页面
    openVersionSettings() {
        // 切换到设置页面的版本管理标签
        if (window.settingsUI) {
            window.settingsUI.open();
            window.settingsUI.switchTab('versions');
        }
    }

    // 显示快照查看器
    showSnapshotViewer(snapshot) {
        const modal = document.createElement('div');
        modal.className = 'modal snapshot-viewer-modal';
        modal.innerHTML = `
            <div class="modal-content snapshot-viewer-content">
                <div class="modal-header">
                    <h3>项目快照 - v${snapshot.version}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="snapshot-info">
                    <p><strong>时间:</strong> ${new Date(snapshot.timestamp).toLocaleString()}</p>
                    <p><strong>描述:</strong> ${snapshot.description || '无描述'}</p>
                    <p><strong>文件数:</strong> ${Object.keys(snapshot.files).length}</p>
                </div>
                <div class="snapshot-files">
                    <h4>包含的文件:</h4>
                    <div class="file-list">
                        ${Object.entries(snapshot.files).map(([fileName, fileData]) => `
                            <div class="file-item">
                                <span class="file-name">${fileName}</span>
                                <span class="file-size">${fileData.size} 字符</span>
                                <button class="btn-tiny btn-secondary" onclick="window.versionSidebar.viewFileContent('${fileName}', \`${fileData.content.replace(/`/g, '\\`')}\`)">
                                    查看
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // 添加键盘事件监听
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        // 添加点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        });

        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // 查看文件内容
    viewFileContent(fileName, content) {
        const modal = document.createElement('div');
        modal.className = 'modal file-content-modal';
        modal.innerHTML = `
            <div class="modal-content file-content-content">
                <div class="modal-header">
                    <h3>${fileName}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="file-content">
                    <pre><code>${this.escapeHtml(content)}</code></pre>
                </div>
            </div>
        `;

        // 添加键盘事件监听
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        // 添加点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        });

        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // 获取相对时间
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 销毁
    destroy() {
        const container = document.getElementById('versionSidebarContainer');
        if (container) {
            container.remove();
        }
    }
} 