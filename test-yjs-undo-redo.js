// Yjs UndoManager 功能测试脚本
// 在浏览器控制台中运行此脚本

console.log('🧪 开始测试 Yjs UndoManager 功能...');

function testYjsUndoRedo() {
    console.log('\n=== 🧪 Yjs UndoManager 功能测试 ===');
    
    // 1. 检查基础组件
    console.log('\n1️⃣ 基础组件检查:');
    console.log('- window.ide 存在:', !!window.ide);
    console.log('- 编辑器存在:', !!window.ide?.editor);
    console.log('- 版本管理器存在:', !!window.ide?.versionManager);
    console.log('- projectDoc 存在:', !!window.ide?.versionManager?.projectDoc);
    console.log('- UndoManager 存在:', !!window.ide?.versionManager?.undoManager);
    
    if (!window.ide || !window.ide.editor || !window.ide.versionManager || !window.ide.versionManager.undoManager) {
        console.error('❌ 基础组件不完整，无法进行测试');
        return;
    }
    
    const editor = window.ide.editor;
    const vm = window.ide.versionManager;
    const undoManager = vm.undoManager;
    
    // 2. 检查 UndoManager 状态
    console.log('\n2️⃣ UndoManager 状态:');
    console.log('- canUndo():', undoManager.canUndo());
    console.log('- canRedo():', undoManager.canRedo());
    console.log('- scope 大小:', undoManager.scope ? undoManager.scope.size : 'undefined');
    
    // 3. 检查当前文件绑定
    console.log('\n3️⃣ 当前文件绑定检查:');
    console.log('- 当前文件:', window.ide.currentFile);
    console.log('- 文件绑定数量:', vm.fileBindings.size);
    
    if (window.ide.currentFile) {
        const relativePath = vm.getRelativePath(window.ide.currentFile);
        const filesMap = vm.projectDoc.getMap('files');
        const yText = filesMap.get(relativePath);
        console.log('- 当前文件的 Y.Text 存在:', !!yText);
        console.log('- Y.Text 内容长度:', yText ? yText.length : 'N/A');
        console.log('- 编辑器内容长度:', editor.getValue().length);
    }
    
    // 4. 测试编辑操作
    console.log('\n4️⃣ 测试编辑操作:');
    
    // 保存原始内容
    const originalContent = editor.getValue();
    console.log('- 原始内容长度:', originalContent.length);
    
    // 在编辑器中插入测试文本
    const testText = '\n% 测试 Yjs UndoManager ' + Date.now();
    const position = editor.getPosition();
    editor.executeEdits('test-insert', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: testText
    }]);
    
    console.log('- 插入测试文本:', testText);
    console.log('- 插入后内容长度:', editor.getValue().length);
    
    // 等待 Yjs 同步
    setTimeout(() => {
        console.log('\n5️⃣ 同步后状态检查:');
        console.log('- canUndo():', undoManager.canUndo());
        console.log('- canRedo():', undoManager.canRedo());
        
        // 检查按钮状态
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        console.log('- undoBtn.disabled:', undoBtn?.disabled);
        console.log('- redoBtn.disabled:', redoBtn?.disabled);
        
        // 如果可以撤销，测试撤销操作
        if (undoManager.canUndo()) {
            console.log('\n6️⃣ 测试撤销操作:');
            console.log('- 执行撤销...');
            const undoResult = undoManager.undo();
            console.log('- 撤销结果:', undoResult);
            
            setTimeout(() => {
                console.log('- 撤销后内容长度:', editor.getValue().length);
                console.log('- canUndo():', undoManager.canUndo());
                console.log('- canRedo():', undoManager.canRedo());
                
                // 如果可以重做，测试重做操作
                if (undoManager.canRedo()) {
                    console.log('\n7️⃣ 测试重做操作:');
                    console.log('- 执行重做...');
                    const redoResult = undoManager.redo();
                    console.log('- 重做结果:', redoResult);
                    
                    setTimeout(() => {
                        console.log('- 重做后内容长度:', editor.getValue().length);
                        console.log('- canUndo():', undoManager.canUndo());
                        console.log('- canRedo():', undoManager.canRedo());
                        
                        console.log('\n✅ 测试完成');
                    }, 100);
                } else {
                    console.log('❌ 无法测试重做：canRedo() 返回 false');
                }
            }, 100);
        } else {
            console.log('❌ 无法测试撤销：canUndo() 返回 false');
            console.log('💡 这可能表示 UndoManager 没有正确跟踪编辑操作');
        }
    }, 300);
}

// 测试文件绑定
function testFileBinding() {
    console.log('\n=== 📁 文件绑定测试 ===');
    
    if (!window.ide || !window.ide.versionManager) {
        console.error('❌ IDE 或版本管理器不存在');
        return;
    }
    
    const vm = window.ide.versionManager;
    
    console.log('- 项目文档存在:', !!vm.projectDoc);
    console.log('- 文件绑定数量:', vm.fileBindings.size);
    
    if (vm.projectDoc) {
        const filesMap = vm.projectDoc.getMap('files');
        console.log('- 项目中的文件数量:', filesMap.size);
        
        filesMap.forEach((yText, fileName) => {
            console.log(`  - ${fileName}: ${yText.length} 字符`);
        });
    }
    
    if (vm.undoManager) {
        console.log('- UndoManager scope 大小:', vm.undoManager.scope ? vm.undoManager.scope.size : 'undefined');
        
        if (vm.undoManager.scope) {
            let scopeIndex = 0;
            vm.undoManager.scope.forEach(item => {
                console.log(`  - scope[${scopeIndex}]:`, item.constructor.name);
                scopeIndex++;
            });
        }
    }
}

// 强制重新绑定当前文件
function forceRebindCurrentFile() {
    console.log('\n=== 🔄 强制重新绑定当前文件 ===');
    
    if (!window.ide || !window.ide.currentFile) {
        console.error('❌ 没有当前文件');
        return;
    }
    
    const filePath = window.ide.currentFile;
    console.log('- 重新绑定文件:', filePath);
    
    // 解绑
    window.ide.versionManager.unbindFile(filePath);
    console.log('- 已解绑文件');
    
    // 重新绑定
    setTimeout(() => {
        const binding = window.ide.versionManager.bindFileToEditor(filePath, window.ide.editor);
        console.log('- 重新绑定结果:', !!binding);
        
        // 更新按钮状态
        setTimeout(() => {
            window.ide.updateUndoRedoButtons();
            console.log('- 按钮状态已更新');
        }, 100);
    }, 100);
}

// 导出函数
window.testYjsUndoRedo = testYjsUndoRedo;
window.testFileBinding = testFileBinding;
window.forceRebindCurrentFile = forceRebindCurrentFile;

console.log('\n✅ Yjs UndoManager 测试脚本加载完成！');
console.log('📋 可用命令:');
console.log('- window.testYjsUndoRedo() - 测试 Yjs UndoManager 功能');
console.log('- window.testFileBinding() - 测试文件绑定状态');
console.log('- window.forceRebindCurrentFile() - 强制重新绑定当前文件');

// 自动运行基础测试
testYjsUndoRedo(); 