// 测试按钮状态的脚本
// 在浏览器控制台中运行

console.log('🔍 检查 Undo/Redo 按钮状态...');

function checkButtonStatus() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const sidebarUndoBtn = document.getElementById('sidebarUndoBtn');
    const sidebarRedoBtn = document.getElementById('sidebarRedoBtn');
    
    console.log('\n📋 按钮存在性检查:');
    console.log('- 工具栏撤销按钮:', !!undoBtn);
    console.log('- 工具栏重做按钮:', !!redoBtn);
    console.log('- 侧边栏撤销按钮:', !!sidebarUndoBtn);
    console.log('- 侧边栏重做按钮:', !!sidebarRedoBtn);
    
    if (window.ide && window.ide.versionManager) {
        const vm = window.ide.versionManager;
        const canUndo = vm.canUndo();
        const canRedo = vm.canRedo();
        
        console.log('\n📋 版本管理器状态:');
        console.log('- 可以撤销:', canUndo);
        console.log('- 可以重做:', canRedo);
        console.log('- UndoManager 存在:', !!vm.undoManager);
        
        console.log('\n📋 按钮状态:');
        if (undoBtn) {
            console.log('- 工具栏撤销按钮禁用:', undoBtn.disabled);
            console.log('- 工具栏撤销按钮应该禁用:', !canUndo);
        }
        if (redoBtn) {
            console.log('- 工具栏重做按钮禁用:', redoBtn.disabled);
            console.log('- 工具栏重做按钮应该禁用:', !canRedo);
        }
        if (sidebarUndoBtn) {
            console.log('- 侧边栏撤销按钮禁用:', sidebarUndoBtn.disabled);
        }
        if (sidebarRedoBtn) {
            console.log('- 侧边栏重做按钮禁用:', sidebarRedoBtn.disabled);
        }
        
        // 检查状态是否一致
        const toolbarUndoCorrect = !undoBtn || (undoBtn.disabled === !canUndo);
        const toolbarRedoCorrect = !redoBtn || (redoBtn.disabled === !canRedo);
        
        console.log('\n📋 状态一致性:');
        console.log('- 工具栏撤销按钮状态正确:', toolbarUndoCorrect);
        console.log('- 工具栏重做按钮状态正确:', toolbarRedoCorrect);
        
        if (!toolbarUndoCorrect || !toolbarRedoCorrect) {
            console.log('\n⚠️ 发现状态不一致，尝试强制更新...');
            window.ide.updateUndoRedoButtons();
            
            setTimeout(() => {
                console.log('\n📋 更新后状态:');
                if (undoBtn) {
                    console.log('- 工具栏撤销按钮禁用:', undoBtn.disabled);
                }
                if (redoBtn) {
                    console.log('- 工具栏重做按钮禁用:', redoBtn.disabled);
                }
            }, 100);
        }
    } else {
        console.log('\n❌ IDE 或版本管理器未初始化');
    }
}

// 立即检查
checkButtonStatus();

// 导出函数供手动调用
window.checkButtonStatus = checkButtonStatus;

// 监听编辑器变化
if (window.ide && window.ide.editor) {
    let changeTimeout;
    window.ide.editor.onDidChangeModelContent(() => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => {
            console.log('\n📝 编辑器内容变化后检查按钮状态:');
            checkButtonStatus();
        }, 200);
    });
}

console.log('\n✅ 按钮状态检查完成。可以调用 window.checkButtonStatus() 重新检查。'); 