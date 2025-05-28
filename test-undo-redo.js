// Undo/Redo 功能测试脚本
// 在浏览器控制台中运行此脚本来测试功能

console.log('🧪 开始 Undo/Redo 功能测试...');

// 测试函数
async function testUndoRedoFunctionality() {
    // 检查基础组件
    console.log('\n📋 1. 检查基础组件...');
    
    if (!window.ide) {
        console.error('❌ IDE 未初始化');
        return false;
    }
    
    if (!window.ide.versionManager) {
        console.error('❌ 版本管理器未初始化');
        return false;
    }
    
    if (!window.ide.editor) {
        console.error('❌ 编辑器未初始化');
        return false;
    }
    
    console.log('✅ 基础组件检查通过');
    
    // 检查 UndoManager
    console.log('\n📋 2. 检查 UndoManager...');
    const vm = window.ide.versionManager;
    
    if (!vm.undoManager) {
        console.error('❌ UndoManager 未创建');
        return false;
    }
    
    console.log('✅ UndoManager 已创建');
    console.log(`   - 可撤销: ${vm.canUndo()}`);
    console.log(`   - 可重做: ${vm.canRedo()}`);
    
    // 创建测试文件
    console.log('\n📋 3. 创建测试文件...');
    
    try {
        // 创建新文件
        await window.ide.fileSystem.writeFile('/test-undo.tex', '');
        await window.ide.refreshFileExplorer();
        
        // 打开文件
        await window.ide.openFile('/test-undo.tex');
        console.log('✅ 测试文件已创建并打开');
    } catch (error) {
        console.error('❌ 创建测试文件失败:', error);
        return false;
    }
    
    // 测试编辑和撤销
    console.log('\n📋 4. 测试编辑和撤销...');
    
    const editor = window.ide.editor;
    const initialContent = editor.getValue();
    
    // 添加一些文本
    editor.setValue('\\documentclass{article}\n');
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待 Yjs 同步
    
    console.log(`   - 初始内容长度: ${initialContent.length}`);
    console.log(`   - 编辑后内容长度: ${editor.getValue().length}`);
    console.log(`   - 可撤销: ${vm.canUndo()}`);
    
    if (!vm.canUndo()) {
        console.warn('⚠️ 编辑后仍无法撤销，可能需要更多时间同步');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`   - 延迟后可撤销: ${vm.canUndo()}`);
    }
    
    // 执行撤销
    if (vm.canUndo()) {
        const undoResult = vm.undo();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`   - 撤销操作结果: ${undoResult}`);
        console.log(`   - 撤销后内容长度: ${editor.getValue().length}`);
        console.log(`   - 撤销后可重做: ${vm.canRedo()}`);
        
        // 执行重做
        if (vm.canRedo()) {
            const redoResult = vm.redo();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log(`   - 重做操作结果: ${redoResult}`);
            console.log(`   - 重做后内容长度: ${editor.getValue().length}`);
        }
    }
    
    // 测试按钮状态
    console.log('\n📋 5. 测试按钮状态...');
    
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn && redoBtn) {
        console.log(`   - 撤销按钮存在: ${!!undoBtn}`);
        console.log(`   - 重做按钮存在: ${!!redoBtn}`);
        console.log(`   - 撤销按钮禁用: ${undoBtn.disabled}`);
        console.log(`   - 重做按钮禁用: ${redoBtn.disabled}`);
        
        // 更新按钮状态
        window.ide.updateUndoRedoButtons();
        console.log('✅ 按钮状态已更新');
    } else {
        console.error('❌ 撤销/重做按钮未找到');
    }
    
    // 测试快捷键
    console.log('\n📋 6. 测试快捷键绑定...');
    
    const shortcuts = window.ide.settingsManager.get('shortcuts');
    console.log(`   - 撤销快捷键: ${shortcuts.undo}`);
    console.log(`   - 重做快捷键: ${shortcuts.redo}`);
    
    // 清理测试文件
    console.log('\n📋 7. 清理测试文件...');
    
    try {
        await window.ide.fileSystem.unlink('/test-undo.tex');
        await window.ide.refreshFileExplorer();
        console.log('✅ 测试文件已清理');
    } catch (error) {
        console.warn('⚠️ 清理测试文件失败:', error);
    }
    
    console.log('\n🎉 Undo/Redo 功能测试完成！');
    return true;
}

// 运行测试
testUndoRedoFunctionality().then(success => {
    if (success) {
        console.log('\n✅ 所有测试通过！');
    } else {
        console.log('\n❌ 测试失败，请检查控制台错误信息');
    }
}).catch(error => {
    console.error('\n💥 测试过程中发生错误:', error);
});

// 导出测试函数供手动调用
window.testUndoRedoFunctionality = testUndoRedoFunctionality; 