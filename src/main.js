import { IDE } from './core/IDE.js';
import { PluginManager } from './core/PluginManager.js';
import { FileSystem } from './core/FileSystem.js';
import { LaTeXSyntaxPlugin } from './plugins/LaTeXSyntaxPlugin.js';
import { LaTeXAutoCompletePlugin } from './plugins/LaTeXAutoCompletePlugin.js';
import { ExamplePlugin } from './plugins/ExamplePlugin.js';

// 全局变量
window.ide = null;

// 初始化 IDE
async function initIDE() {
    try {
        // 创建 IDE 实例
        window.ide = new IDE();
        
        // 初始化文件系统
        await window.ide.fileSystem.init();
        
        // 注册默认插件
        window.ide.pluginManager.registerPlugin(new LaTeXSyntaxPlugin());
        window.ide.pluginManager.registerPlugin(new LaTeXAutoCompletePlugin());
        window.ide.pluginManager.registerPlugin(new ExamplePlugin());
        
        // 初始化编辑器
        await window.ide.initEditor();
        
        // 初始化 UI
        window.ide.initUI();
        
        // 创建示例项目
        await createSampleProject();
        
        console.log('LaTeX IDE 初始化完成');
    } catch (error) {
        console.error('IDE 初始化失败:', error);
    }
}

// 创建示例项目
async function createSampleProject() {
    const sampleContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{LaTeX 示例文档}
\\author{作者姓名}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{介绍}
这是一个 LaTeX 示例文档。

\\section{数学公式}
这里是一个数学公式：
\\begin{equation}
    E = mc^2
\\end{equation}

\\subsection{更多公式}
行内公式：$\\alpha + \\beta = \\gamma$

\\section{列表}
\\begin{itemize}
    \\item 第一项
    \\item 第二项
    \\item 第三项
\\end{itemize}

\\end{document}`;

    try {
        await window.ide.fileSystem.writeFile('/main.tex', sampleContent);
        await window.ide.fileSystem.writeFile('/README.md', '# LaTeX 项目\n\n这是一个示例 LaTeX 项目。');
        
        // 刷新文件浏览器
        window.ide.refreshFileExplorer();
        
        // 打开主文件
        window.ide.openFile('/main.tex');
    } catch (error) {
        console.error('创建示例项目失败:', error);
    }
}

// 全局函数 - 供 HTML 调用
window.createNewFile = () => {
    document.getElementById('newFileModal').style.display = 'flex';
    document.getElementById('newFileName').focus();
};

window.createNewFolder = () => {
    document.getElementById('newFolderModal').style.display = 'flex';
    document.getElementById('newFolderName').focus();
};

window.saveCurrentFile = () => {
    if (window.ide) {
        window.ide.saveCurrentFile();
    }
};

window.compileLatex = () => {
    if (window.ide) {
        window.ide.compileLatex();
    }
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).style.display = 'none';
};

window.confirmNewFile = async () => {
    const fileName = document.getElementById('newFileName').value.trim();
    if (fileName) {
        try {
            await window.ide.fileSystem.writeFile(`/${fileName}`, '');
            window.ide.refreshFileExplorer();
            window.ide.openFile(`/${fileName}`);
            window.closeModal('newFileModal');
            document.getElementById('newFileName').value = '';
        } catch (error) {
            alert('创建文件失败: ' + error.message);
        }
    }
};

window.confirmNewFolder = async () => {
    const folderName = document.getElementById('newFolderName').value.trim();
    if (folderName) {
        try {
            await window.ide.fileSystem.mkdir(`/${folderName}`);
            window.ide.refreshFileExplorer();
            window.closeModal('newFolderModal');
            document.getElementById('newFolderName').value = '';
        } catch (error) {
            alert('创建文件夹失败: ' + error.message);
        }
    }
};

window.deleteFile = () => {
    // TODO: 实现删除文件功能
    console.log('删除文件功能待实现');
};

window.renameFile = () => {
    // TODO: 实现重命名文件功能
    console.log('重命名文件功能待实现');
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initIDE); 