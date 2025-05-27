import * as monaco from 'monaco-editor';
import { FileSystem } from './FileSystem.js';
import { PluginManager } from './PluginManager.js';

export class IDE {
    constructor() {
        this.editor = null;
        this.fileSystem = new FileSystem();
        this.pluginManager = new PluginManager();
        this.openTabs = new Map(); // 存储打开的标签页
        this.currentFile = null;
        this.isDirty = false; // 当前文件是否有未保存的更改
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

    initUI() {
        // 初始化右键菜单
        this.initContextMenu();
        
        // 初始化键盘快捷键
        this.initKeyboardShortcuts();
        
        // 初始化文件浏览器
        this.refreshFileExplorer();
    }

    initContextMenu() {
        const fileExplorer = document.getElementById('fileExplorer');
        const contextMenu = document.getElementById('contextMenu');

        fileExplorer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        });

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });
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
        fileExplorer.innerHTML = '';

        try {
            const files = await this.fileSystem.readdir('/');
            
            for (const file of files) {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <div class="file-icon"></div>
                    <span>${file}</span>
                `;
                
                fileItem.addEventListener('click', () => {
                    this.openFile(`/${file}`);
                });

                fileExplorer.appendChild(fileItem);
            }
        } catch (error) {
            console.error('刷新文件浏览器失败:', error);
        }
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
} 