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
        
        // 暴露设置 UI 到全局
        window.settingsUI = window.ide.settingsUI;
        
        // 暴露版本侧边栏到全局
        window.versionSidebar = window.ide.versionSidebar;
        
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

    const chapterContent = `\\chapter{第一章}

这是第一章的内容。

\\section{章节介绍}
这里是章节的详细介绍。

\\subsection{子章节}
子章节的内容。`;

    const bibliographyContent = `@article{einstein1905,
    title={Zur Elektrodynamik bewegter Körper},
    author={Einstein, Albert},
    journal={Annalen der Physik},
    volume={17},
    number={10},
    pages={891--921},
    year={1905}
}

@book{knuth1984,
    title={The TeXbook},
    author={Knuth, Donald E.},
    year={1984},
    publisher={Addison-Wesley}
}`;

    try {
        // 创建主文件
        await window.ide.fileSystem.writeFile('/main.tex', sampleContent);
        await window.ide.fileSystem.writeFile('/README.md', '# LaTeX 项目\n\n这是一个示例 LaTeX 项目。\n\n## 文件结构\n\n- `main.tex` - 主文档\n- `chapters/` - 章节文件夹\n- `images/` - 图片文件夹\n- `references/` - 参考文献');
        
        // 创建文件夹和子文件
        await window.ide.fileSystem.mkdir('/chapters');
        await window.ide.fileSystem.writeFile('/chapters/chapter1.tex', chapterContent);
        await window.ide.fileSystem.writeFile('/chapters/introduction.tex', '\\chapter{引言}\n\n这是引言部分的内容。');
        
        await window.ide.fileSystem.mkdir('/images');
        await window.ide.fileSystem.writeFile('/images/README.md', '# 图片文件夹\n\n请将图片文件放在这个文件夹中。');
        
        await window.ide.fileSystem.mkdir('/references');
        await window.ide.fileSystem.writeFile('/references/bibliography.bib', bibliographyContent);
        
        // 创建配置文件夹
        await window.ide.fileSystem.mkdir('/config');
        await window.ide.fileSystem.writeFile('/config/settings.json', '{\n  "compiler": "pdflatex",\n  "output": "pdf",\n  "bibtex": true\n}');
        
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

// 设置相关的全局函数
window.openSettings = () => {
    if (window.ide) {
        window.ide.openSettings();
    }
};

window.exportSettings = () => {
    if (window.ide && window.ide.settingsUI) {
        window.ide.settingsUI.exportSettings();
    }
};

window.resetAllSettings = () => {
    if (window.ide && window.ide.settingsUI) {
        window.ide.settingsUI.resetAllSettings();
    }
};

window.resetShortcuts = () => {
    if (window.ide && window.ide.settingsUI) {
        window.ide.settingsUI.resetShortcuts();
    }
};

// 版本管理相关的全局函数
window.toggleVersionSidebar = () => {
    if (window.ide) {
        window.ide.toggleVersionSidebar();
    }
};

window.createSnapshot = () => {
    if (window.ide) {
        window.ide.createSnapshot();
    }
};

window.undo = () => {
    if (window.ide) {
        return window.ide.undo();
    }
    return false;
};

window.redo = () => {
    if (window.ide) {
        return window.ide.redo();
    }
    return false;
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initIDE); 