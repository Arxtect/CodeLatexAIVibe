import * as monaco from 'monaco-editor';
import { FileSystem } from './FileSystem.js';
import { PluginManager } from './PluginManager.js';
import { SettingsManager } from './SettingsManager.js';
import { ShortcutManager } from './ShortcutManager.js';
import { SettingsUI } from './SettingsUI.js';
import { VersionManager } from './VersionManager.js';
import { VersionSidebar } from './VersionSidebar.js';

export class IDE {
    constructor() {
        this.editor = null;
        this.fileSystem = new FileSystem();
        this.pluginManager = new PluginManager();
        this.settingsManager = new SettingsManager();
        this.shortcutManager = new ShortcutManager(this.settingsManager);
        this.settingsUI = null; // 将在 initUI 中初始化
        this.versionManager = new VersionManager();
        this.versionSidebar = null; // 将在 initUI 中初始化
        this.openTabs = new Map(); // 存储打开的标签页
        this.currentFile = null;
        this.isDirty = false; // 当前文件是否有未保存的更改
        
        this.setupShortcuts();
        this.setupSettingsListeners();
    }

    setupShortcuts() {
        // 注册所有快捷键动作
        this.shortcutManager.registerAction('newFile', () => this.createNewFile(), '新建文件');
        this.shortcutManager.registerAction('saveFile', () => this.saveCurrentFile(), '保存文件');
        this.shortcutManager.registerAction('closeTab', () => this.closeCurrentTab(), '关闭标签');
        this.shortcutManager.registerAction('compile', () => this.compileLatex(), '编译');
        this.shortcutManager.registerAction('rename', () => this.renameCurrentFile(), '重命名');
        this.shortcutManager.registerAction('delete', () => this.deleteCurrentFile(), '删除');
        this.shortcutManager.registerAction('toggleSidebar', () => this.toggleSidebar(), '切换侧边栏');
        this.shortcutManager.registerAction('toggleVersionSidebar', () => this.toggleVersionSidebar(), '切换版本侧边栏');
        this.shortcutManager.registerAction('createSnapshot', () => this.createSnapshot(), '创建快照');
        this.shortcutManager.registerAction('undo', () => this.undo(), '撤销');
        this.shortcutManager.registerAction('redo', () => this.redo(), '重做');
    }

    setupSettingsListeners() {
        // 监听设置变更
        this.settingsManager.on('settingsChanged', (settings) => {
            this.applySettings(settings);
        });
    }

    applySettings(settings) {
        if (this.editor) {
            // 应用编辑器设置
            const editorSettings = settings.editor;
            this.editor.updateOptions({
                fontSize: editorSettings.fontSize,
                wordWrap: editorSettings.wordWrap,
                minimap: { enabled: editorSettings.minimap },
                lineNumbers: editorSettings.lineNumbers ? 'on' : 'off'
            });

            // 应用主题
            monaco.editor.setTheme(editorSettings.theme);
        }

        // 应用 UI 设置
        const uiSettings = settings.ui;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.width = `${uiSettings.sidebarWidth}px`;
        }

        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.style.display = uiSettings.showStatusBar ? 'flex' : 'none';
        }

        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            toolbar.style.display = uiSettings.showToolbar ? 'flex' : 'none';
        }
    }

    async initEditor() {
        // 配置 Monaco Editor
        monaco.editor.defineTheme('latex-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword.latex', foreground: '569cd6' },
                { token: 'string.latex', foreground: 'ce9178' },
                { token: 'comment.latex', foreground: '6a9955' },
                { token: 'number.latex', foreground: 'b5cea8' },
                { token: 'delimiter.latex', foreground: 'd4d4d4' },
                { token: 'command.latex', foreground: 'dcdcaa' },
                { token: 'environment.latex', foreground: '4ec9b0' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editorCursor.foreground': '#aeafad',
                'editor.selectionBackground': '#264f78',
                'editor.lineHighlightBackground': '#2a2d2e'
            }
        });

        // 创建编辑器实例
        this.editor = monaco.editor.create(document.getElementById('editor'), {
            value: '',
            language: 'latex',
            theme: 'latex-dark',
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            minimap: {
                enabled: true
            },
            wordWrap: 'on',
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: true
        });

        // 监听编辑器内容变化
        this.editor.onDidChangeModelContent(() => {
            this.isDirty = true;
            this.updateTabStatus();
            this.updateStatusBar();
        });

        // 监听光标位置变化
        this.editor.onDidChangeCursorPosition((e) => {
            this.updateCursorPosition(e.position);
        });

        // 让插件管理器初始化编辑器相关功能
        this.pluginManager.initEditor(this.editor);
    }

    async initUI() {
        // 初始化设置 UI
        this.settingsUI = new SettingsUI(this.settingsManager, this.shortcutManager, this.pluginManager);
        
        // 初始化版本侧边栏
        this.versionSidebar = new VersionSidebar(this.versionManager, this);
        
        // 初始化项目版本管理
        await this.initProjectVersioning();
        
        // 初始化右键菜单
        this.initContextMenu();
        
        // 初始化文件浏览器
        this.refreshFileExplorer();
        
        // 应用初始设置
        this.applySettings(this.settingsManager.settings);
    }

    async initProjectVersioning() {
        // 使用当前工作目录作为项目路径
        const projectPath = '/'; // 根目录作为项目路径
        await this.versionManager.initProject(projectPath);
        console.log('项目版本管理已初始化');
    }

    initContextMenu() {
        const fileExplorer = document.getElementById('fileExplorer');
        const contextMenu = document.getElementById('contextMenu');
        let contextTarget = null;

        fileExplorer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // 找到被右键点击的文件项
            contextTarget = e.target.closest('.file-item');
            
            // 更新右键菜单内容
            this.updateContextMenu(contextTarget);
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        });

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
            contextTarget = null;
        });
        
        // 存储当前右键目标，供其他函数使用
        this.contextTarget = null;
        fileExplorer.addEventListener('contextmenu', (e) => {
            this.contextTarget = e.target.closest('.file-item');
        });
    }

    updateContextMenu(target) {
        const contextMenu = document.getElementById('contextMenu');
        
        if (!target) {
            // 空白区域右键
            contextMenu.innerHTML = `
                <div class="context-menu-item" onclick="window.createNewFile()">新建文件</div>
                <div class="context-menu-item" onclick="window.createNewFolder()">新建文件夹</div>
            `;
        } else if (target.classList.contains('folder')) {
            // 文件夹右键
            contextMenu.innerHTML = `
                <div class="context-menu-item" onclick="window.ide.createFileInFolder()">在此文件夹中新建文件</div>
                <div class="context-menu-item" onclick="window.ide.createFolderInFolder()">在此文件夹中新建文件夹</div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" onclick="window.ide.renameItem()">重命名</div>
                <div class="context-menu-item" onclick="window.ide.deleteItem()">删除</div>
            `;
        } else {
            // 文件右键
            contextMenu.innerHTML = `
                <div class="context-menu-item" onclick="window.ide.openFile(window.ide.getContextTargetPath())">打开</div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" onclick="window.ide.renameItem()">重命名</div>
                <div class="context-menu-item" onclick="window.ide.deleteItem()">删除</div>
            `;
        }
    }

    getContextTargetPath() {
        if (!this.contextTarget) return null;
        return this.contextTarget.dataset.path || null;
    }

    async createFileInFolder() {
        const folderPath = this.getContextTargetPath();
        if (!folderPath) return;
        
        const fileName = prompt('请输入文件名:');
        if (!fileName) return;
        
        try {
            const filePath = folderPath === '/' ? `/${fileName}` : `${folderPath}/${fileName}`;
            await this.fileSystem.writeFile(filePath, '');
            await this.refreshFileExplorer();
            this.openFile(filePath);
        } catch (error) {
            alert('创建文件失败: ' + error.message);
        }
    }

    async createFolderInFolder() {
        const folderPath = this.getContextTargetPath();
        if (!folderPath) return;
        
        const folderName = prompt('请输入文件夹名:');
        if (!folderName) return;
        
        try {
            const newFolderPath = folderPath === '/' ? `/${folderName}` : `${folderPath}/${folderName}`;
            await this.fileSystem.mkdir(newFolderPath);
            await this.refreshFileExplorer();
        } catch (error) {
            alert('创建文件夹失败: ' + error.message);
        }
    }

    async renameItem() {
        const itemPath = this.getContextTargetPath();
        if (!itemPath) return;
        
        const currentName = itemPath.split('/').pop();
        const newName = prompt('请输入新名称:', currentName);
        if (!newName || newName === currentName) return;
        
        try {
            const parentPath = itemPath.substring(0, itemPath.lastIndexOf('/')) || '/';
            const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
            
            // 检查是否是文件夹
            const stats = await this.fileSystem.stat(itemPath);
            if (stats.isDirectory()) {
                // 重命名文件夹 (简单实现，实际需要递归处理)
                alert('文件夹重命名功能暂未实现');
            } else {
                // 重命名文件
                const content = await this.fileSystem.readFile(itemPath);
                await this.fileSystem.writeFile(newPath, content);
                await this.fileSystem.unlink(itemPath);
                
                // 如果文件当前打开，更新标签
                if (this.openTabs.has(itemPath)) {
                    const tabData = this.openTabs.get(itemPath);
                    this.openTabs.delete(itemPath);
                    this.openTabs.set(newPath, tabData);
                    
                    // 更新标签显示
                    const tab = document.querySelector(`[data-file-path="${itemPath}"]`);
                    if (tab) {
                        tab.dataset.filePath = newPath;
                        tab.querySelector('span').textContent = newName;
                    }
                    
                    if (this.currentFile === itemPath) {
                        this.currentFile = newPath;
                    }
                }
            }
            
            await this.refreshFileExplorer();
        } catch (error) {
            alert('重命名失败: ' + error.message);
        }
    }

    async deleteItem() {
        const itemPath = this.getContextTargetPath();
        if (!itemPath) return;
        
        const itemName = itemPath.split('/').pop();
        if (!confirm(`确定要删除 "${itemName}" 吗？`)) return;
        
        try {
            const stats = await this.fileSystem.stat(itemPath);
            if (stats.isDirectory()) {
                // 删除文件夹 (简单实现)
                try {
                    await this.fileSystem.rmdir(itemPath);
                } catch (error) {
                    alert('无法删除非空文件夹');
                    return;
                }
            } else {
                // 删除文件
                await this.fileSystem.unlink(itemPath);
                
                // 如果文件当前打开，关闭标签
                if (this.openTabs.has(itemPath)) {
                    this.closeTab(itemPath);
                }
            }
            
            await this.refreshFileExplorer();
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S 保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
            // Ctrl+N 新建文件
            else if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                window.createNewFile();
            }
            // Ctrl+O 打开文件
            else if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                // TODO: 实现打开文件对话框
            }
            // Ctrl+W 关闭当前标签
            else if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                this.closeCurrentTab();
            }

        });
    }

    async refreshFileExplorer() {
        const fileExplorer = document.getElementById('fileExplorer');
        
        // 显示加载状态
        fileExplorer.innerHTML = '<div class="loading">加载中...</div>';
        
        try {
            await this.renderFileTree('/', fileExplorer, 0);
        } catch (error) {
            console.error('刷新文件浏览器失败:', error);
            fileExplorer.innerHTML = '<div class="error">加载文件失败</div>';
        }
    }

    async renderFileTree(dirPath, container, level = 0) {
        try {
            // 如果是根目录，清空容器
            if (level === 0) {
                container.innerHTML = '';
            }
            
            const files = await this.fileSystem.readdir(dirPath);
            
            // 如果文件夹为空，显示提示
            if (files.length === 0 && level > 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'empty-folder';
                emptyItem.style.paddingLeft = `${16 + level * 20}px`;
                emptyItem.innerHTML = '<span style="color: #666; font-style: italic;">空文件夹</span>';
                container.appendChild(emptyItem);
                return;
            }
            
            for (const file of files) {
                const fullPath = dirPath === '/' ? `/${file}` : `${dirPath}/${file}`;
                const stats = await this.fileSystem.stat(fullPath);
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.style.paddingLeft = `${16 + level * 20}px`;
                
                if (stats.isDirectory()) {
                    // 文件夹
                    fileItem.classList.add('folder');
                    fileItem.dataset.path = fullPath;
                    fileItem.innerHTML = `
                        <div class="file-icon folder-icon">📁</div>
                        <span class="file-name">${file}</span>
                        <div class="folder-toggle">▶</div>
                    `;
                    
                    const folderContent = document.createElement('div');
                    folderContent.className = 'folder-content collapsed';
                    
                    fileItem.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const toggle = fileItem.querySelector('.folder-toggle');
                        const icon = fileItem.querySelector('.folder-icon');
                        
                        try {
                            if (folderContent.classList.contains('collapsed')) {
                                // 展开文件夹
                                folderContent.classList.remove('collapsed');
                                folderContent.classList.add('expanded');
                                toggle.classList.add('expanded');
                                toggle.textContent = '▼';
                                icon.textContent = '📂';
                                
                                // 如果还没有加载内容，则加载
                                if (folderContent.children.length === 0) {
                                    await this.renderFileTree(fullPath, folderContent, level + 1);
                                }
                            } else {
                                // 折叠文件夹
                                folderContent.classList.remove('expanded');
                                folderContent.classList.add('collapsed');
                                toggle.classList.remove('expanded');
                                toggle.textContent = '▶';
                                icon.textContent = '📁';
                            }
                        } catch (error) {
                            console.error('文件夹操作失败:', error);
                            // 重置状态
                            folderContent.classList.remove('expanded');
                            folderContent.classList.add('collapsed');
                            toggle.classList.remove('expanded');
                            toggle.textContent = '▶';
                            icon.textContent = '📁';
                        }
                    });
                    
                    container.appendChild(fileItem);
                    container.appendChild(folderContent);
                } else {
                    // 文件
                    const fileExtension = file.split('.').pop().toLowerCase();
                    const fileIcon = this.getFileIcon(fileExtension);
                    
                    fileItem.classList.add('file');
                    fileItem.dataset.path = fullPath;
                    fileItem.innerHTML = `
                        <div class="file-icon">${fileIcon}</div>
                        <span class="file-name">${file}</span>
                    `;
                    
                    fileItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openFile(fullPath);
                        
                        // 高亮选中的文件
                        document.querySelectorAll('.file-item.selected').forEach(item => {
                            item.classList.remove('selected');
                        });
                        fileItem.classList.add('selected');
                    });
                    
                    container.appendChild(fileItem);
                }
            }
        } catch (error) {
            console.error(`渲染文件树失败 (${dirPath}):`, error);
        }
    }

    getFileIcon(extension) {
        const iconMap = {
            'tex': '📄',
            'latex': '📄',
            'md': '📝',
            'txt': '📄',
            'js': '📜',
            'json': '⚙️',
            'html': '🌐',
            'css': '🎨',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️',
            'pdf': '📕',
            'zip': '📦',
            'default': '📄'
        };
        
        return iconMap[extension] || iconMap['default'];
    }

    async openFile(filePath) {
        try {
            // 如果文件已经打开，直接切换到该标签
            if (this.openTabs.has(filePath)) {
                this.switchToTab(filePath);
                return;
            }

            const content = await this.fileSystem.readFile(filePath);
            
            // 创建新标签
            this.createTab(filePath);
            
            // 存储文件内容
            this.openTabs.set(filePath, {
                content: content,
                originalContent: content,
                isDirty: false
            });

            // 切换到新标签
            this.switchToTab(filePath);
            
            // 设置编辑器内容
            this.editor.setValue(content);
            
            // 根据文件扩展名设置语言
            const language = this.getLanguageFromFileName(filePath);
            monaco.editor.setModelLanguage(this.editor.getModel(), language);

            // 绑定版本管理
            this.versionManager.bindFileToEditor(filePath, this.editor);

            this.isDirty = false;
            this.updateStatusBar();
            
        } catch (error) {
            console.error('打开文件失败:', error);
            alert('打开文件失败: ' + error.message);
        }
    }

    createTab(filePath) {
        const tabBar = document.getElementById('tabBar');
        const fileName = filePath.split('/').pop();
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.filePath = filePath;
        tab.innerHTML = `
            <span>${fileName}</span>
            <div class="tab-close" onclick="event.stopPropagation(); window.ide.closeTab('${filePath}')">×</div>
        `;
        
        tab.addEventListener('click', () => {
            this.switchToTab(filePath);
        });

        tabBar.appendChild(tab);
    }

    switchToTab(filePath) {
        // 保存当前文件内容
        if (this.currentFile && this.openTabs.has(this.currentFile)) {
            const tabData = this.openTabs.get(this.currentFile);
            tabData.content = this.editor.getValue();
            tabData.isDirty = this.isDirty;
        }

        // 更新当前文件
        this.currentFile = filePath;
        
        // 更新标签样式
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filePath === filePath) {
                tab.classList.add('active');
            }
        });

        // 加载文件内容到编辑器
        if (this.openTabs.has(filePath)) {
            const tabData = this.openTabs.get(filePath);
            this.editor.setValue(tabData.content);
            this.isDirty = tabData.isDirty;
        }

        this.updateStatusBar();
    }

    closeTab(filePath) {
        // 检查是否有未保存的更改
        if (this.openTabs.has(filePath)) {
            const tabData = this.openTabs.get(filePath);
            if (tabData.isDirty) {
                const shouldSave = confirm('文件有未保存的更改，是否保存？');
                if (shouldSave) {
                    this.saveFile(filePath);
                }
            }
        }

        // 移除标签
        const tab = document.querySelector(`[data-file-path="${filePath}"]`);
        if (tab) {
            tab.remove();
        }

        // 移除文件数据
        this.openTabs.delete(filePath);

        // 如果关闭的是当前文件，切换到其他标签
        if (this.currentFile === filePath) {
            const remainingTabs = document.querySelectorAll('.tab');
            if (remainingTabs.length > 0) {
                const nextFilePath = remainingTabs[0].dataset.filePath;
                this.switchToTab(nextFilePath);
            } else {
                this.currentFile = null;
                this.editor.setValue('');
                this.isDirty = false;
                this.updateStatusBar();
            }
        }
    }

    closeCurrentTab() {
        if (this.currentFile) {
            this.closeTab(this.currentFile);
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile) {
            alert('没有打开的文件');
            return;
        }

        await this.saveFile(this.currentFile);
    }

    async saveFile(filePath) {
        try {
            const content = this.editor.getValue();
            await this.fileSystem.writeFile(filePath, content);
            
            // 更新标签数据
            if (this.openTabs.has(filePath)) {
                const tabData = this.openTabs.get(filePath);
                tabData.content = content;
                tabData.originalContent = content;
                tabData.isDirty = false;
            }

            this.isDirty = false;
            this.updateTabStatus();
            this.updateStatusBar();
            
            document.getElementById('statusText').textContent = '文件已保存';
            setTimeout(() => {
                document.getElementById('statusText').textContent = '就绪';
            }, 2000);
            
        } catch (error) {
            console.error('保存文件失败:', error);
            alert('保存文件失败: ' + error.message);
        }
    }

    updateTabStatus() {
        if (this.currentFile) {
            const tab = document.querySelector(`[data-file-path="${this.currentFile}"]`);
            if (tab) {
                const fileName = tab.querySelector('span');
                const originalName = this.currentFile.split('/').pop();
                fileName.textContent = this.isDirty ? `${originalName} •` : originalName;
            }
        }
    }

    updateStatusBar() {
        const fileType = this.currentFile ? this.getLanguageFromFileName(this.currentFile) : 'text';
        document.getElementById('fileType').textContent = fileType.toUpperCase();
        
        // 更新状态文本
        if (this.currentFile) {
            const fileName = this.currentFile.split('/').pop();
            const isDirty = this.isDirty ? ' (已修改)' : '';
            document.getElementById('statusText').textContent = `${fileName}${isDirty}`;
        }
    }

    updateCursorPosition(position) {
        document.getElementById('cursorPosition').textContent = `行 ${position.lineNumber}, 列 ${position.column}`;
    }

    getLanguageFromFileName(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'tex':
            case 'latex':
                return 'latex';
            case 'md':
                return 'markdown';
            case 'js':
                return 'javascript';
            case 'json':
                return 'json';
            case 'html':
                return 'html';
            case 'css':
                return 'css';
            default:
                return 'plaintext';
        }
    }

    compileLatex() {
        if (!this.currentFile || !this.currentFile.endsWith('.tex')) {
            alert('请先打开一个 LaTeX 文件');
            return;
        }

        document.getElementById('statusText').textContent = '正在编译...';
        
        // 模拟编译过程
        setTimeout(() => {
            document.getElementById('statusText').textContent = '编译完成';
            setTimeout(() => {
                document.getElementById('statusText').textContent = '就绪';
            }, 2000);
        }, 1000);
    }

    // 快捷键动作方法
    createNewFile() {
        document.getElementById('newFileModal').style.display = 'flex';
        document.getElementById('newFileName').focus();
    }

    renameCurrentFile() {
        if (this.currentFile) {
            this.contextTarget = document.querySelector(`[data-path="${this.currentFile}"]`);
            this.renameItem();
        }
    }

    deleteCurrentFile() {
        if (this.currentFile) {
            this.contextTarget = document.querySelector(`[data-path="${this.currentFile}"]`);
            this.deleteItem();
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const isHidden = sidebar.style.display === 'none';
            sidebar.style.display = isHidden ? 'flex' : 'none';
        }
    }

    openSettings() {
        if (this.settingsUI) {
            this.settingsUI.open();
        }
    }

    // 版本管理相关方法
    toggleVersionSidebar() {
        if (this.versionSidebar) {
            this.versionSidebar.toggle();
        }
    }

    createSnapshot() {
        if (this.versionManager) {
            const description = prompt('请输入快照描述（可选）:');
            if (description !== null) {
                this.versionManager.createProjectSnapshot(description);
            }
        }
    }

    undo() {
        if (this.versionManager) {
            return this.versionManager.undo();
        }
        return false;
    }

    redo() {
        if (this.versionManager) {
            return this.versionManager.redo();
        }
        return false;
    }

    // 重写 closeTab 方法以清理版本管理
    closeTab(filePath) {
        // 检查是否有未保存的更改
        if (this.openTabs.has(filePath)) {
            const tabData = this.openTabs.get(filePath);
            if (tabData.isDirty) {
                const shouldSave = confirm('文件有未保存的更改，是否保存？');
                if (shouldSave) {
                    this.saveFile(filePath);
                }
            }
        }

        // 解绑版本管理
        this.versionManager.unbindFile(filePath);

        // 移除标签
        const tab = document.querySelector(`[data-file-path="${filePath}"]`);
        if (tab) {
            tab.remove();
        }

        // 移除文件数据
        this.openTabs.delete(filePath);

        // 如果关闭的是当前文件，切换到其他标签
        if (this.currentFile === filePath) {
            const remainingTabs = document.querySelectorAll('.tab');
            if (remainingTabs.length > 0) {
                const nextFilePath = remainingTabs[0].dataset.filePath;
                this.switchToTab(nextFilePath);
            } else {
                this.currentFile = null;
                this.editor.setValue('');
                this.isDirty = false;
                this.updateStatusBar();
            }
        }
    }
} 