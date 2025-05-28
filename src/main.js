import { IDE } from './core/IDE.js';
import { PluginManager } from './core/PluginManager.js';
import { FileSystem } from './core/FileSystem.js';
import { LaTeXSyntaxPlugin } from './plugins/LaTeXSyntaxPlugin.js';
import { LaTeXAutoCompletePlugin } from './plugins/LaTeXAutoCompletePlugin.js';
import { ExamplePlugin } from './plugins/ExamplePlugin.js';

// Configure Monaco Editor workers - disable to avoid worker loading issues
self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        // Return empty data URL to disable workers
        return 'data:text/javascript;charset=utf-8,';
    },
    getWorker: function(moduleId, label) {
        // Return a mock worker that does nothing
        return {
            postMessage: () => {},
            terminate: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
        };
    }
};

// 全局变量
window.ide = null;

// 暴露为全局函数
window.hideContextMenu = () => {
    if (window.contextMenuManager) {
        window.contextMenuManager.hide();
    }
};

// 初始化 IDE
async function initIDE() {
    try {
        // 创建 IDE 实例
        window.ide = new IDE();
        
        // 初始化文件系统
        await window.ide.fileSystem.init();
        
        // 注册语法插件（必须在编辑器初始化前注册）
        window.ide.pluginManager.registerPlugin(new LaTeXSyntaxPlugin());
        
        // 初始化编辑器
        await window.ide.initEditor();
        
        // 注册其他插件（在编辑器初始化后注册）
        window.ide.pluginManager.registerPlugin(new LaTeXAutoCompletePlugin());
        window.ide.pluginManager.registerPlugin(new ExamplePlugin());
        
        // 初始化 UI
        await window.ide.initUI();
        
        // 暴露设置 UI 到全局
        window.settingsUI = window.ide.settingsUI;
        
        // 暴露版本侧边栏到全局
        window.versionSidebar = window.ide.versionSidebar;
        
        // 暴露测试函数到全局
        window.testAutoComplete = () => {
            const plugin = window.ide.pluginManager.getPlugin('latex-autocomplete');
            if (plugin && plugin.testAutoComplete) {
                return plugin.testAutoComplete();
            } else {
                console.error('LaTeX 自动补全插件未找到');
                return null;
            }
        };
        
        // Undo/Redo 测试函数已禁用
        // window.testUndoRedo = () => {
        //     if (!window.ide || !window.ide.versionManager) {
        //         console.error('版本管理器未初始化');
        //         return null;
        //     }
            
        //     const vm = window.ide.versionManager;
        //     console.log('Undo/Redo 功能测试:');
        //     console.log('- UndoManager 已创建:', !!vm.undoManager);
        //     console.log('- 可以撤销:', vm.canUndo());
        //     console.log('- 可以重做:', vm.canRedo());
        //     console.log('- 项目文档已初始化:', !!vm.projectDoc);
        //     console.log('- 文件绑定数量:', vm.fileBindings.size);
            
        //     if (vm.projectDoc) {
        //         const filesMap = vm.projectDoc.getMap('files');
        //         console.log('- 项目中的文件数:', filesMap.size);
        //         filesMap.forEach((yText, fileName) => {
        //             console.log(`  - ${fileName}: ${yText.length} 字符`);
        //         });
        //     }
            
        //     // 强制更新按钮状态
        //     window.ide.updateUndoRedoButtons();
            
        //     return {
        //         undoManagerExists: !!vm.undoManager,
        //         canUndo: vm.canUndo(),
        //         canRedo: vm.canRedo(),
        //         fileCount: vm.fileBindings.size
        //     };
        // };
        
        // // 暴露强制更新按钮状态的函数
        // window.forceUpdateUndoRedoButtons = () => {
        //     if (window.ide && window.ide.updateUndoRedoButtons) {
        //         window.ide.updateUndoRedoButtons();
        //         console.log('已强制更新 undo/redo 按钮状态');
        //     }
        // };
        
        // 创建示例项目
        await createSampleProject();
        
        // Undo/Redo 按钮状态更新已禁用
        // setTimeout(() => {
        //     if (window.ide && window.ide.updateUndoRedoButtons) {
        //         window.ide.updateUndoRedoButtons();
        //         console.log('IDE 初始化完成，按钮状态已更新');
        //     }
        // }, 500);
        
        // 初始化 Agent 系统
        await initAgents();
        
        // 启动存储监控
        window.startStorageMonitoring();
        
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
    if (window.currentContextTarget && window.currentContextTarget.path) {
        if (confirm(`确定要删除 "${window.currentContextTarget.path}" 吗？`)) {
            // TODO: 实现文件删除功能
            console.log('删除文件:', window.currentContextTarget.path);
        }
    }
    window.hideContextMenu();
};

window.renameFile = () => {
    if (window.currentContextTarget && window.currentContextTarget.path) {
        const newName = prompt('请输入新名称:', window.currentContextTarget.path);
        if (newName && newName !== window.currentContextTarget.path) {
            // TODO: 实现文件重命名功能
            console.log('重命名文件:', window.currentContextTarget.path, '->', newName);
        }
    }
    window.hideContextMenu();
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

// Undo/Redo functionality disabled
// window.undo = () => {
//     if (window.ide) {
//         return window.ide.undo();
//     }
//     return false;
// };

// window.redo = () => {
//     if (window.ide) {
//         return window.ide.redo();
//     }
//     return false;
// };

// Agent 相关的全局函数
window.toggleAgentPanel = () => {
    if (window.ide) {
        window.ide.toggleAgentPanel();
    }
};

window.showAgentPanel = () => {
    if (window.ide) {
        window.ide.showAgentPanel();
    }
};

window.hideAgentPanel = () => {
    if (window.ide) {
        window.ide.hideAgentPanel();
    }
};

// 初始化 Agent 系统
async function initAgents() {
    try {
        // 动态导入 Agent 插件
        const { LatexMasterAgentPlugin } = await import('./plugins/LatexMasterAgentPlugin.js');
        const { AgentPanelPlugin } = await import('./plugins/AgentPanelPlugin.js');
        
        // 注册 Agent 面板插件（必须先注册）
        const agentPanel = new AgentPanelPlugin();
        window.ide.pluginManager.registerPlugin(agentPanel);
        
        // 注册 LaTeX Master Agent 插件
        const latexMaster = new LatexMasterAgentPlugin();
        window.ide.pluginManager.registerPlugin(latexMaster);
        
        console.log('Agent 插件系统初始化完成');
        
        // 添加调试信息，检查全局函数注册情况
        setTimeout(() => {
            console.log('=== 全局函数检查 ===');
            console.log('window.addSelectionToContext:', typeof window.addSelectionToContext);
            console.log('window.addCurrentFileToContext:', typeof window.addCurrentFileToContext);
            console.log('window.addFileToContextByPath:', typeof window.addFileToContextByPath);
            console.log('window.agentPanel:', !!window.agentPanel);
            console.log('=== 检查完成 ===');
        }, 1000);
        
    } catch (error) {
        console.error('Agent 插件系统初始化失败:', error);
    }
}

// 存储管理全局函数
window.getStorageInfo = () => {
    if (window.ide) {
        return window.ide.getStorageInfo();
    }
    return null;
};

window.getStorageStats = () => {
    if (window.ide) {
        return window.ide.getStorageStats();
    }
    return null;
};

window.checkStorageHealth = () => {
    if (window.ide) {
        return window.ide.checkStorageHealth();
    }
    return null;
};

window.showStorageStatus = () => {
    if (window.ide) {
        return window.ide.showStorageStatus();
    }
    return null;
};

window.cleanupStorage = (options = {}) => {
    if (window.ide) {
        return window.ide.cleanupStorage(options);
    }
    return null;
};

window.setMaxSnapshots = (count) => {
    if (window.ide) {
        window.ide.setMaxSnapshots(count);
        console.log(`最大快照数量已设置为: ${count}`);
    }
};

window.getMaxSnapshots = () => {
    if (window.ide) {
        return window.ide.getMaxSnapshots();
    }
    return null;
};

// 快速清理函数
window.quickCleanup = () => {
    if (window.ide) {
        console.log('开始快速清理存储...');
        const result = window.ide.cleanupStorage({
            keepSnapshots: 10,
            cleanOtherProjects: true,
            cleanTemporary: true,
            aggressive: false
        });
        console.log('快速清理完成:', result);
        return result;
    }
    return null;
};

// 激进清理函数（谨慎使用）
window.aggressiveCleanup = () => {
    if (window.ide) {
        const confirm = window.confirm('激进清理将删除大量数据，确定要继续吗？');
        if (confirm) {
            console.log('开始激进清理存储...');
            const result = window.ide.cleanupStorage({
                keepSnapshots: 5,
                cleanOtherProjects: true,
                cleanTemporary: true,
                aggressive: true
            });
            console.log('激进清理完成:', result);
            return result;
        }
    }
    return null;
};

// 更新存储状态指示器
window.updateStorageStatus = () => {
    if (!window.ide) return;
    
    try {
        const health = window.ide.checkStorageHealth();
        const statusElement = document.getElementById('storageStatus');
        
        if (!statusElement) return;
        
        const usageText = `💾 存储: ${health.used.toFixed(1)}MB/${health.quota}MB (${health.usagePercentage}%)`;
        statusElement.textContent = usageText;
        
        // 移除所有状态类
        statusElement.classList.remove('warning', 'critical');
        
        // 根据使用率添加相应的状态类
        if (health.health.status === 'critical') {
            statusElement.classList.add('critical');
            statusElement.title = '存储空间严重不足！点击查看详情并清理';
        } else if (health.health.status === 'warning') {
            statusElement.classList.add('warning');
            statusElement.title = '存储空间使用率较高，建议清理。点击查看详情';
        } else {
            statusElement.title = '存储状态良好。点击查看详细信息';
        }
        
    } catch (error) {
        console.warn('更新存储状态失败:', error);
        const statusElement = document.getElementById('storageStatus');
        if (statusElement) {
            statusElement.textContent = '💾 存储: 错误';
            statusElement.title = '无法获取存储状态';
        }
    }
};

// 设置定期更新存储状态
window.startStorageMonitoring = () => {
    // 立即更新一次
    window.updateStorageStatus();
    
    // 每30秒更新一次
    setInterval(() => {
        window.updateStorageStatus();
    }, 30000);
    
    console.log('存储监控已启动');
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initIDE();
}); 