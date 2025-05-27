export class SettingsUI {
    constructor(settingsManager, shortcutManager, pluginManager) {
        this.settingsManager = settingsManager;
        this.shortcutManager = shortcutManager;
        this.pluginManager = pluginManager;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 设置导航
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchTab(item.dataset.tab);
            });
        });

        // 快捷键搜索
        const shortcutsSearch = document.getElementById('shortcutsSearch');
        if (shortcutsSearch) {
            shortcutsSearch.addEventListener('input', (e) => {
                this.filterShortcuts(e.target.value);
            });
        }

        // 编辑器设置
        this.setupEditorSettings();
        
        // UI 设置
        this.setupUISettings();
        
        // 导入文件
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importSettings(e.target.files[0]);
            });
        }
    }

    switchTab(tabId) {
        // 更新导航
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // 更新内容
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // 加载对应的内容
        switch (tabId) {
            case 'shortcuts':
                this.loadShortcuts();
                break;
            case 'plugins':
                this.loadPlugins();
                break;
            case 'editor':
                this.loadEditorSettings();
                break;
            case 'ui':
                this.loadUISettings();
                break;
            case 'versions':
                this.loadVersionSettings();
                break;
        }
    }

    // 快捷键管理
    loadShortcuts() {
        const shortcutsList = document.getElementById('shortcutsList');
        shortcutsList.innerHTML = '';

        const actions = this.shortcutManager.getAllActions();
        const actionDescriptions = {
            'newFile': '新建文件',
            'openFile': '打开文件',
            'saveFile': '保存文件',
            'closeTab': '关闭标签',
            'compile': '编译',
            'rename': '重命名',
            'delete': '删除',
            'find': '查找',
            'replace': '替换',
            'toggleSidebar': '切换侧边栏',
            'commandPalette': '命令面板',
            'toggleVersionSidebar': '切换版本侧边栏',
            'createSnapshot': '创建快照',
            'undo': '撤销',
            'redo': '重做'
        };

        // 添加所有快捷键
        const shortcuts = this.settingsManager.get('shortcuts');
        for (const [actionId, shortcut] of Object.entries(shortcuts)) {
            const description = actionDescriptions[actionId] || actionId;
            this.createShortcutItem(actionId, description, shortcut);
        }
    }

    createShortcutItem(actionId, description, shortcut) {
        const shortcutsList = document.getElementById('shortcutsList');
        
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        item.dataset.actionId = actionId;
        
        item.innerHTML = `
            <div class="shortcut-description">${description}</div>
            <div class="shortcut-key" data-shortcut="${shortcut}">${shortcut}</div>
            <button class="shortcut-edit" onclick="window.settingsUI.editShortcut('${actionId}')">编辑</button>
        `;
        
        shortcutsList.appendChild(item);
    }

    editShortcut(actionId) {
        const item = document.querySelector(`[data-action-id="${actionId}"]`);
        const keyElement = item.querySelector('.shortcut-key');
        const currentShortcut = keyElement.dataset.shortcut;
        
        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentShortcut;
        input.className = 'shortcut-key';
        input.style.background = '#1e1e1e';
        input.style.border = '1px solid #0e639c';
        
        // 替换显示元素
        keyElement.replaceWith(input);
        input.focus();
        input.select();
        
        // 监听键盘事件
        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            const newShortcut = this.shortcutManager.getShortcutFromEvent(e);
            
            if (newShortcut && this.shortcutManager.isValidShortcut(newShortcut)) {
                input.value = newShortcut;
            }
        });
        
        // 保存或取消
        const save = () => {
            const newShortcut = input.value.trim();
            if (newShortcut && this.shortcutManager.isValidShortcut(newShortcut)) {
                try {
                    this.settingsManager.setShortcut(actionId, newShortcut);
                    this.loadShortcuts(); // 重新加载
                } catch (error) {
                    alert(error.message);
                    this.loadShortcuts();
                }
            } else {
                this.loadShortcuts();
            }
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                this.loadShortcuts();
            }
        });
    }

    filterShortcuts(query) {
        const items = document.querySelectorAll('.shortcut-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const description = item.querySelector('.shortcut-description').textContent.toLowerCase();
            const shortcut = item.querySelector('.shortcut-key').textContent.toLowerCase();
            
            if (description.includes(lowerQuery) || shortcut.includes(lowerQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 插件管理
    loadPlugins() {
        const pluginsList = document.getElementById('pluginsList');
        pluginsList.innerHTML = '';

        const plugins = this.pluginManager.getAllPlugins();
        
        plugins.forEach(plugin => {
            this.createPluginItem(plugin);
        });
    }

    createPluginItem(plugin) {
        const pluginsList = document.getElementById('pluginsList');
        const isEnabled = this.settingsManager.isPluginEnabled(plugin.id);
        
        const item = document.createElement('div');
        item.className = 'plugin-item';
        
        item.innerHTML = `
            <div class="plugin-info">
                <div class="plugin-name">${plugin.name}</div>
                <div class="plugin-description">${plugin.description || '无描述'}</div>
            </div>
            <div class="plugin-toggle">
                <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                       onchange="window.settingsUI.togglePlugin('${plugin.id}', this.checked)">
            </div>
            <button class="plugin-config" onclick="window.settingsUI.configurePlugin('${plugin.id}')">配置</button>
        `;
        
        pluginsList.appendChild(item);
    }

    togglePlugin(pluginId, enabled) {
        if (enabled) {
            this.settingsManager.enablePlugin(pluginId);
            this.pluginManager.enablePlugin(pluginId);
        } else {
            this.settingsManager.disablePlugin(pluginId);
            this.pluginManager.disablePlugin(pluginId);
        }
    }

    configurePlugin(pluginId) {
        const plugin = this.pluginManager.getPlugin(pluginId);
        if (plugin && plugin.configure) {
            plugin.configure();
        } else {
            alert('此插件没有配置选项');
        }
    }

    // 编辑器设置
    setupEditorSettings() {
        const fontSize = document.getElementById('editorFontSize');
        const theme = document.getElementById('editorTheme');
        const wordWrap = document.getElementById('editorWordWrap');
        const minimap = document.getElementById('editorMinimap');
        const autoSave = document.getElementById('editorAutoSave');
        const autoSaveDelay = document.getElementById('editorAutoSaveDelay');

        if (fontSize) {
            fontSize.addEventListener('change', () => {
                this.settingsManager.set('editor', 'fontSize', parseInt(fontSize.value));
            });
        }

        if (theme) {
            theme.addEventListener('change', () => {
                this.settingsManager.set('editor', 'theme', theme.value);
            });
        }

        if (wordWrap) {
            wordWrap.addEventListener('change', () => {
                this.settingsManager.set('editor', 'wordWrap', wordWrap.checked ? 'on' : 'off');
            });
        }

        if (minimap) {
            minimap.addEventListener('change', () => {
                this.settingsManager.set('editor', 'minimap', minimap.checked);
            });
        }

        if (autoSave) {
            autoSave.addEventListener('change', () => {
                this.settingsManager.set('editor', 'autoSave', autoSave.checked);
            });
        }

        if (autoSaveDelay) {
            autoSaveDelay.addEventListener('change', () => {
                this.settingsManager.set('editor', 'autoSaveDelay', parseInt(autoSaveDelay.value));
            });
        }
    }

    loadEditorSettings() {
        const settings = this.settingsManager.get('editor');
        
        const fontSize = document.getElementById('editorFontSize');
        const theme = document.getElementById('editorTheme');
        const wordWrap = document.getElementById('editorWordWrap');
        const minimap = document.getElementById('editorMinimap');
        const autoSave = document.getElementById('editorAutoSave');
        const autoSaveDelay = document.getElementById('editorAutoSaveDelay');

        if (fontSize) fontSize.value = settings.fontSize;
        if (theme) theme.value = settings.theme;
        if (wordWrap) wordWrap.checked = settings.wordWrap === 'on';
        if (minimap) minimap.checked = settings.minimap;
        if (autoSave) autoSave.checked = settings.autoSave;
        if (autoSaveDelay) autoSaveDelay.value = settings.autoSaveDelay;
    }

    // UI 设置
    setupUISettings() {
        const sidebarWidth = document.getElementById('sidebarWidth');
        const sidebarWidthValue = document.getElementById('sidebarWidthValue');
        const showStatusBar = document.getElementById('showStatusBar');
        const showToolbar = document.getElementById('showToolbar');
        const compactMode = document.getElementById('compactMode');

        if (sidebarWidth) {
            sidebarWidth.addEventListener('input', () => {
                const value = sidebarWidth.value;
                sidebarWidthValue.textContent = `${value}px`;
                this.settingsManager.set('ui', 'sidebarWidth', parseInt(value));
            });
        }

        if (showStatusBar) {
            showStatusBar.addEventListener('change', () => {
                this.settingsManager.set('ui', 'showStatusBar', showStatusBar.checked);
            });
        }

        if (showToolbar) {
            showToolbar.addEventListener('change', () => {
                this.settingsManager.set('ui', 'showToolbar', showToolbar.checked);
            });
        }

        if (compactMode) {
            compactMode.addEventListener('change', () => {
                this.settingsManager.set('ui', 'compactMode', compactMode.checked);
            });
        }
    }

    loadUISettings() {
        const settings = this.settingsManager.get('ui');
        
        const sidebarWidth = document.getElementById('sidebarWidth');
        const sidebarWidthValue = document.getElementById('sidebarWidthValue');
        const showStatusBar = document.getElementById('showStatusBar');
        const showToolbar = document.getElementById('showToolbar');
        const compactMode = document.getElementById('compactMode');

        if (sidebarWidth) {
            sidebarWidth.value = settings.sidebarWidth;
            sidebarWidthValue.textContent = `${settings.sidebarWidth}px`;
        }
        if (showStatusBar) showStatusBar.checked = settings.showStatusBar;
        if (showToolbar) showToolbar.checked = settings.showToolbar;
        if (compactMode) compactMode.checked = settings.compactMode;
    }

    // 导入/导出
    exportSettings() {
        const settings = this.settingsManager.exportSettings();
        const blob = new Blob([settings], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'latex-ide-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importSettings(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const success = this.settingsManager.importSettings(text);
            
            if (success) {
                alert('设置导入成功！');
                this.loadAllSettings();
            } else {
                alert('设置导入失败，请检查文件格式');
            }
        } catch (error) {
            alert('设置导入失败：' + error.message);
        }
    }

    resetAllSettings() {
        if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
            this.settingsManager.resetSettings();
            this.loadAllSettings();
            alert('设置已重置为默认值');
        }
    }

    resetShortcuts() {
        if (confirm('确定要重置所有快捷键吗？')) {
            this.settingsManager.resetShortcuts();
            this.loadShortcuts();
        }
    }

    // 版本管理设置
    loadVersionSettings() {
        if (!window.ide || !window.ide.versionManager) {
            document.getElementById('versions-tab').innerHTML = `
                <h3>版本管理</h3>
                <p>版本管理系统未初始化</p>
            `;
            return;
        }

        const versionManager = window.ide.versionManager;
        const status = versionManager.getProjectStatus();
        const snapshots = versionManager.getProjectSnapshots();

        const versionsTab = document.getElementById('versions-tab');
        versionsTab.innerHTML = `
            <h3>版本管理</h3>
            
            <div class="setting-group">
                <h4>项目状态</h4>
                ${status ? `
                    <div class="version-status-grid">
                        <div class="status-item">
                            <span class="status-label">项目路径:</span>
                            <span class="status-value">${status.projectPath}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">文件数量:</span>
                            <span class="status-value">${status.fileCount}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">快照数量:</span>
                            <span class="status-value">${status.totalSnapshots}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">自动保存:</span>
                            <span class="status-value ${status.autoSaveEnabled ? 'enabled' : 'disabled'}">
                                ${status.autoSaveEnabled ? '已启用' : '已禁用'}
                            </span>
                        </div>
                    </div>
                ` : '<p>项目未初始化</p>'}
            </div>

            <div class="setting-group">
                <h4>自动保存设置</h4>
                <label>
                    <input type="checkbox" id="autoSaveEnabled" ${status?.autoSaveEnabled ? 'checked' : ''} 
                           onchange="window.settingsUI.toggleAutoSave(this.checked)">
                    启用自动保存
                </label>
                <div class="setting-description">自动创建项目快照以防止数据丢失</div>
                
                <label>自动保存间隔 (秒)</label>
                <input type="number" id="autoSaveInterval" min="10" max="3600" value="${status?.autoSaveInterval || 30}"
                       onchange="window.settingsUI.setAutoSaveInterval(this.value)">
                <div class="setting-description">设置自动保存的时间间隔</div>
            </div>

            <div class="setting-group">
                <h4>快照管理</h4>
                <button class="btn-primary" onclick="window.settingsUI.createProjectSnapshot()">创建项目快照</button>
                <button class="btn-secondary" onclick="window.settingsUI.exportVersionHistory()">导出版本历史</button>
                <button class="btn-danger" onclick="window.settingsUI.clearVersionHistory()">清空版本历史</button>
            </div>

            <div class="setting-group">
                <h4>版本历史 (最近10个)</h4>
                <div class="version-history-list" id="versionHistoryList">
                    ${this.renderVersionHistoryList(snapshots.slice(-10).reverse())}
                </div>
                ${snapshots.length > 10 ? `
                    <div class="version-pagination">
                        <p>显示最近 10 个版本，共 ${snapshots.length} 个版本</p>
                        <button class="btn-secondary" onclick="window.settingsUI.showAllVersions()">查看全部版本</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderVersionHistoryList(snapshots) {
        if (snapshots.length === 0) {
            return '<p>暂无版本快照</p>';
        }

        return snapshots.map((snapshot, index) => {
            const isLatest = index === 0;
            const date = new Date(snapshot.timestamp);
            const fileCount = Object.keys(snapshot.files).length;
            
            return `
                <div class="version-history-item">
                    <div class="version-header">
                        <span class="version-number">v${snapshot.version}</span>
                        ${isLatest ? '<span class="latest-badge">最新</span>' : ''}
                        <span class="version-time">${date.toLocaleString()}</span>
                    </div>
                    <div class="version-info">
                        <div class="version-description">${snapshot.description || '无描述'}</div>
                        <div class="version-stats">${fileCount} 个文件</div>
                    </div>
                    <div class="version-actions">
                        <button class="btn-small btn-secondary" onclick="window.settingsUI.restoreProjectSnapshot('${snapshot.id}')">恢复</button>
                        <button class="btn-small btn-secondary" onclick="window.settingsUI.viewProjectSnapshot('${snapshot.id}')">查看</button>
                        <button class="btn-small btn-danger" onclick="window.settingsUI.deleteProjectSnapshot('${snapshot.id}')">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 版本管理操作方法
    toggleAutoSave(enabled) {
        if (window.ide && window.ide.versionManager) {
            window.ide.versionManager.setAutoSaveEnabled(enabled);
            this.loadVersionSettings();
        }
    }

    setAutoSaveInterval(seconds) {
        if (window.ide && window.ide.versionManager) {
            window.ide.versionManager.setAutoSaveInterval(parseInt(seconds));
        }
    }

    createProjectSnapshot() {
        if (window.ide && window.ide.versionManager) {
            const description = prompt('请输入快照描述（可选）:');
            if (description !== null) {
                window.ide.versionManager.createProjectSnapshot(description);
                this.loadVersionSettings();
            }
        }
    }

    restoreProjectSnapshot(snapshotId) {
        if (confirm('确定要恢复到此版本吗？当前未保存的更改将丢失。')) {
            if (window.ide && window.ide.versionManager) {
                window.ide.versionManager.restoreProjectSnapshot(snapshotId);
                this.loadVersionSettings();
            }
        }
    }

    viewProjectSnapshot(snapshotId) {
        if (window.ide && window.ide.versionManager) {
            const snapshot = window.ide.versionManager.getProjectSnapshot(snapshotId);
            if (snapshot && window.versionSidebar) {
                window.versionSidebar.showSnapshotViewer(snapshot);
            }
        }
    }

    deleteProjectSnapshot(snapshotId) {
        if (confirm('确定要删除此快照吗？此操作不可撤销。')) {
            if (window.ide && window.ide.versionManager) {
                window.ide.versionManager.deleteProjectSnapshot(snapshotId);
                this.loadVersionSettings();
            }
        }
    }

    exportVersionHistory() {
        if (window.ide && window.ide.versionManager) {
            const snapshots = window.ide.versionManager.getProjectSnapshots();
            const status = window.ide.versionManager.getProjectStatus();
            
            const data = {
                projectPath: status?.projectPath,
                exportTime: new Date().toISOString(),
                snapshots: snapshots
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `project-version-history-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    clearVersionHistory() {
        if (confirm('确定要清空所有版本历史吗？此操作不可撤销！')) {
            if (window.ide && window.ide.versionManager) {
                const status = window.ide.versionManager.getProjectStatus();
                if (status) {
                    localStorage.removeItem(`project_snapshots_${status.projectPath}`);
                    this.loadVersionSettings();
                    alert('版本历史已清空');
                }
            }
        }
    }

    showAllVersions() {
        // 这里可以实现一个完整的版本历史查看器
        alert('完整版本历史查看器功能待实现');
    }

    loadAllSettings() {
        this.loadShortcuts();
        this.loadPlugins();
        this.loadEditorSettings();
        this.loadUISettings();
        this.loadVersionSettings();
    }

    open() {
        document.getElementById('settingsModal').style.display = 'flex';
        this.loadAllSettings();
    }

    close() {
        document.getElementById('settingsModal').style.display = 'none';
    }
} 