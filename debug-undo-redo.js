// 详细的 Undo/Redo 调试脚本
// 在浏览器控制台中运行此脚本

console.log('🔍 开始详细诊断 Undo/Redo 按钮问题...');

function detailedDiagnosis() {
    console.log('\n=== 🔍 详细诊断报告 ===');
    
    // 1. 检查按钮元素
    console.log('\n1️⃣ 按钮元素检查:');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    console.log('- undoBtn 元素:', undoBtn);
    console.log('- redoBtn 元素:', redoBtn);
    
    if (undoBtn) {
        console.log('- undoBtn.disabled:', undoBtn.disabled);
        console.log('- undoBtn.onclick:', undoBtn.onclick);
        console.log('- undoBtn.getAttribute("onclick"):', undoBtn.getAttribute('onclick'));
    }
    
    if (redoBtn) {
        console.log('- redoBtn.disabled:', redoBtn.disabled);
        console.log('- redoBtn.onclick:', redoBtn.onclick);
        console.log('- redoBtn.getAttribute("onclick"):', redoBtn.getAttribute('onclick'));
    }
    
    // 2. 检查全局函数
    console.log('\n2️⃣ 全局函数检查:');
    console.log('- window.undo 函数:', typeof window.undo, window.undo);
    console.log('- window.redo 函数:', typeof window.redo, window.redo);
    console.log('- window.ide 对象:', !!window.ide);
    
    if (window.ide) {
        console.log('- window.ide.undo 方法:', typeof window.ide.undo);
        console.log('- window.ide.redo 方法:', typeof window.ide.redo);
        console.log('- window.ide.versionManager:', !!window.ide.versionManager);
    }
    
    // 3. 检查版本管理器
    console.log('\n3️⃣ 版本管理器检查:');
    if (window.ide && window.ide.versionManager) {
        const vm = window.ide.versionManager;
        console.log('- versionManager 存在:', !!vm);
        console.log('- undoManager 存在:', !!vm.undoManager);
        console.log('- projectDoc 存在:', !!vm.projectDoc);
        console.log('- canUndo():', vm.canUndo());
        console.log('- canRedo():', vm.canRedo());
        
        if (vm.undoManager) {
            console.log('- undoManager.canUndo():', vm.undoManager.canUndo());
            console.log('- undoManager.canRedo():', vm.undoManager.canRedo());
        }
        
        if (vm.projectDoc) {
            const filesMap = vm.projectDoc.getMap('files');
            console.log('- 项目文件数:', filesMap.size);
            console.log('- 文件绑定数:', vm.fileBindings.size);
        }
    } else {
        console.log('- 版本管理器未初始化');
    }
    
    // 4. 测试按钮点击
    console.log('\n4️⃣ 按钮点击测试:');
    
    if (undoBtn && !undoBtn.disabled) {
        console.log('- 尝试点击撤销按钮...');
        try {
            undoBtn.click();
            console.log('- 撤销按钮点击成功');
        } catch (error) {
            console.error('- 撤销按钮点击失败:', error);
        }
    } else {
        console.log('- 撤销按钮被禁用或不存在');
    }
    
    if (redoBtn && !redoBtn.disabled) {
        console.log('- 尝试点击重做按钮...');
        try {
            redoBtn.click();
            console.log('- 重做按钮点击成功');
        } catch (error) {
            console.error('- 重做按钮点击失败:', error);
        }
    } else {
        console.log('- 重做按钮被禁用或不存在');
    }
    
    // 5. 测试手动调用
    console.log('\n5️⃣ 手动调用测试:');
    
    try {
        if (window.undo) {
            console.log('- 调用 window.undo()...');
            const result = window.undo();
            console.log('- window.undo() 结果:', result);
        }
    } catch (error) {
        console.error('- window.undo() 调用失败:', error);
    }
    
    try {
        if (window.redo) {
            console.log('- 调用 window.redo()...');
            const result = window.redo();
            console.log('- window.redo() 结果:', result);
        }
    } catch (error) {
        console.error('- window.redo() 调用失败:', error);
    }
    
    // 6. 检查编辑器状态
    console.log('\n6️⃣ 编辑器状态检查:');
    if (window.ide && window.ide.editor) {
        const editor = window.ide.editor;
        console.log('- 编辑器存在:', !!editor);
        console.log('- 当前文件:', window.ide.currentFile);
        console.log('- 编辑器内容长度:', editor.getValue().length);
        console.log('- 编辑器模型:', !!editor.getModel());
    } else {
        console.log('- 编辑器未初始化');
    }
    
    // 7. 强制更新按钮状态
    console.log('\n7️⃣ 强制更新按钮状态:');
    if (window.ide && window.ide.updateUndoRedoButtons) {
        console.log('- 调用 updateUndoRedoButtons()...');
        window.ide.updateUndoRedoButtons();
        
        setTimeout(() => {
            console.log('- 更新后按钮状态:');
            if (undoBtn) console.log('  - undoBtn.disabled:', undoBtn.disabled);
            if (redoBtn) console.log('  - redoBtn.disabled:', redoBtn.disabled);
        }, 100);
    }
    
    console.log('\n=== 🏁 诊断完成 ===');
}

// 运行诊断
detailedDiagnosis();

// 导出函数
window.detailedDiagnosis = detailedDiagnosis;

// 创建一个简单的测试函数
window.testButtonClick = function() {
    console.log('\n🧪 测试按钮点击功能...');
    
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    // 先输入一些内容
    if (window.ide && window.ide.editor) {
        const editor = window.ide.editor;
        const originalContent = editor.getValue();
        
        console.log('1. 添加测试内容...');
        editor.setValue(originalContent + '\n% 测试内容 ' + Date.now());
        
        setTimeout(() => {
            console.log('2. 检查撤销按钮状态...');
            console.log('   - canUndo:', window.ide.versionManager.canUndo());
            console.log('   - undoBtn.disabled:', undoBtn.disabled);
            
            if (!undoBtn.disabled) {
                console.log('3. 点击撤销按钮...');
                undoBtn.click();
                
                setTimeout(() => {
                    console.log('4. 检查重做按钮状态...');
                    console.log('   - canRedo:', window.ide.versionManager.canRedo());
                    console.log('   - redoBtn.disabled:', redoBtn.disabled);
                    
                    if (!redoBtn.disabled) {
                        console.log('5. 点击重做按钮...');
                        redoBtn.click();
                    }
                }, 200);
            }
        }, 200);
    }
};

console.log('\n✅ 调试脚本加载完成！');
console.log('📋 可用命令:');
console.log('- window.detailedDiagnosis() - 运行详细诊断');
console.log('- window.testButtonClick() - 测试按钮点击功能'); 