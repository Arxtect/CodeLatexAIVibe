// 简化的 UndoManager 测试脚本
console.log('🧪 开始简化的 UndoManager 测试...');

function testSimpleUndo() {
    console.log('\n=== 🧪 简化 UndoManager 测试 ===');
    
    if (!window.ide || !window.ide.editor || !window.ide.versionManager) {
        console.error('❌ 基础组件不存在');
        return;
    }
    
    const editor = window.ide.editor;
    const vm = window.ide.versionManager;
    
    console.log('1. 基础状态检查:');
    console.log('- 编辑器存在:', !!editor);
    console.log('- 版本管理器存在:', !!vm);
    console.log('- UndoManager 存在:', !!vm.undoManager);
    console.log('- 当前文件:', window.ide.currentFile);
    
    if (!vm.undoManager) {
        console.error('❌ UndoManager 不存在，无法测试');
        return;
    }
    
    console.log('\n2. UndoManager 状态:');
    console.log('- canUndo():', vm.undoManager.canUndo());
    console.log('- canRedo():', vm.undoManager.canRedo());
    console.log('- scope 大小:', vm.undoManager.scope ? vm.undoManager.scope.size : 'undefined');
    
    // 检查当前文件的 Y.Text
    if (window.ide.currentFile && vm.projectDoc) {
        const relativePath = vm.getRelativePath(window.ide.currentFile);
        const filesMap = vm.projectDoc.getMap('files');
        const yText = filesMap.get(relativePath);
        
        console.log('\n3. 当前文件状态:');
        console.log('- 相对路径:', relativePath);
        console.log('- Y.Text 存在:', !!yText);
        console.log('- Y.Text 长度:', yText ? yText.length : 'N/A');
        console.log('- 编辑器内容长度:', editor.getValue().length);
        
        if (yText) {
            // 检查 Y.Text 是否在 UndoManager 的 scope 中
            let inScope = false;
            if (vm.undoManager.scope) {
                vm.undoManager.scope.forEach(item => {
                    if (item === yText) {
                        inScope = true;
                    }
                });
            }
            console.log('- Y.Text 在 UndoManager scope 中:', inScope);
        }
    }
    
    console.log('\n4. 开始编辑测试...');
    
    // 记录原始内容
    const originalContent = editor.getValue();
    console.log('- 原始内容长度:', originalContent.length);
    
    // 添加测试文本（使用 executeEdits 而不是 setValue）
    const testText = '\n% 简单测试 ' + Date.now();
    const position = editor.getPosition();
    const lineCount = editor.getModel().getLineCount();
    const lastLineLength = editor.getModel().getLineLength(lineCount);
    
    editor.executeEdits('test-insert', [{
        range: new monaco.Range(lineCount, lastLineLength + 1, lineCount, lastLineLength + 1),
        text: testText
    }]);
    
    console.log('- 添加测试文本:', testText);
    console.log('- 新内容长度:', editor.getValue().length);
    
    // 等待 Yjs 同步
    setTimeout(() => {
        console.log('\n5. 同步后检查:');
        console.log('- canUndo():', vm.undoManager.canUndo());
        console.log('- canRedo():', vm.undoManager.canRedo());
        
        // 检查按钮状态
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        console.log('- undoBtn.disabled:', undoBtn?.disabled);
        console.log('- redoBtn.disabled:', redoBtn?.disabled);
        
        if (vm.undoManager.canUndo()) {
            console.log('\n6. 测试撤销:');
            vm.undoManager.undo();
            
            setTimeout(() => {
                console.log('- 撤销后内容长度:', editor.getValue().length);
                console.log('- canUndo():', vm.undoManager.canUndo());
                console.log('- canRedo():', vm.undoManager.canRedo());
                
                if (vm.undoManager.canRedo()) {
                    console.log('\n7. 测试重做:');
                    vm.undoManager.redo();
                    
                    setTimeout(() => {
                        console.log('- 重做后内容长度:', editor.getValue().length);
                        console.log('✅ 测试完成');
                    }, 100);
                }
            }, 100);
        } else {
            console.log('❌ 无法撤销，可能的原因:');
            console.log('  1. UndoManager 没有跟踪到编辑操作');
            console.log('  2. Y.Text 没有正确添加到 scope');
            console.log('  3. MonacoBinding 配置有问题');
        }
    }, 500);
}

// 强制重新绑定文件
function forceRebind() {
    console.log('\n=== 🔄 强制重新绑定 ===');
    
    if (!window.ide.currentFile) {
        console.error('❌ 没有当前文件');
        return;
    }
    
    const filePath = window.ide.currentFile;
    console.log('- 重新绑定文件:', filePath);
    
    // 解绑
    window.ide.versionManager.unbindFile(filePath);
    
    // 重新绑定
    setTimeout(() => {
        window.ide.versionManager.bindFileToEditor(filePath, window.ide.editor);
        console.log('- 重新绑定完成');
        
        // 更新按钮状态
        setTimeout(() => {
            window.ide.updateUndoRedoButtons();
        }, 100);
    }, 100);
}

// 导出函数
window.testSimpleUndo = testSimpleUndo;
window.forceRebind = forceRebind;

console.log('\n✅ 简化测试脚本加载完成！');
console.log('📋 可用命令:');
console.log('- window.testSimpleUndo() - 运行简化的 UndoManager 测试');
console.log('- window.forceRebind() - 强制重新绑定当前文件');

// 自动运行测试
testSimpleUndo(); 