// UndoManager 详细调试脚本
console.log('🔍 开始 UndoManager 详细调试...');

function debugUndoManager() {
    console.log('\n=== 🔍 UndoManager 详细调试 ===');
    
    if (!window.ide) {
        console.error('❌ window.ide 不存在');
        return;
    }
    
    const ide = window.ide;
    const editor = ide.editor;
    const vm = ide.versionManager;
    
    console.log('\n1️⃣ 基础组件检查:');
    console.log('- IDE 存在:', !!ide);
    console.log('- 编辑器存在:', !!editor);
    console.log('- 版本管理器存在:', !!vm);
    console.log('- 项目文档存在:', !!vm?.projectDoc);
    console.log('- UndoManager 存在:', !!vm?.undoManager);
    
    if (!editor || !vm || !vm.undoManager) {
        console.error('❌ 基础组件缺失，无法继续调试');
        return;
    }
    
    console.log('\n2️⃣ UndoManager 详细信息:');
    const undoManager = vm.undoManager;
    console.log('- UndoManager 类型:', undoManager.constructor.name);
    console.log('- canUndo():', undoManager.canUndo());
    console.log('- canRedo():', undoManager.canRedo());
    console.log('- scope 存在:', !!undoManager.scope);
    console.log('- scope 大小:', undoManager.scope ? undoManager.scope.size : 'N/A');
    console.log('- captureTimeout:', undoManager.captureTimeout);
    console.log('- trackedOrigins:', undoManager.trackedOrigins);
    
    if (undoManager.scope && undoManager.scope.size > 0) {
        console.log('- scope 内容:');
        let index = 0;
        undoManager.scope.forEach(item => {
            console.log(`  [${index}]:`, item.constructor.name, `(长度: ${item.length || 'N/A'})`);
            index++;
        });
    }
    
    console.log('\n3️⃣ 当前文件状态:');
    console.log('- 当前文件:', ide.currentFile);
    
    if (ide.currentFile && vm.projectDoc) {
        const relativePath = vm.getRelativePath(ide.currentFile);
        const filesMap = vm.projectDoc.getMap('files');
        const yText = filesMap.get(relativePath);
        
        console.log('- 相对路径:', relativePath);
        console.log('- Y.Text 存在:', !!yText);
        
        if (yText) {
            console.log('- Y.Text 类型:', yText.constructor.name);
            console.log('- Y.Text 长度:', yText.length);
            console.log('- Y.Text 内容预览:', yText.toString().substring(0, 100) + '...');
            
            // 检查 Y.Text 是否在 UndoManager scope 中
            let inScope = false;
            if (undoManager.scope) {
                undoManager.scope.forEach(item => {
                    if (item === yText) {
                        inScope = true;
                    }
                });
            }
            console.log('- Y.Text 在 UndoManager scope 中:', inScope);
        }
    }
    
    console.log('\n4️⃣ 编辑器状态:');
    console.log('- 编辑器模型存在:', !!editor.getModel());
    console.log('- 编辑器内容长度:', editor.getValue().length);
    console.log('- 编辑器内容预览:', editor.getValue().substring(0, 100) + '...');
    
    console.log('\n5️⃣ 文件绑定状态:');
    console.log('- 文件绑定数量:', vm.fileBindings.size);
    vm.fileBindings.forEach((binding, filePath) => {
        console.log(`- ${filePath}:`, !!binding);
    });
    
    console.log('\n6️⃣ 按钮状态:');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    console.log('- undoBtn 存在:', !!undoBtn);
    console.log('- undoBtn.disabled:', undoBtn?.disabled);
    console.log('- redoBtn 存在:', !!redoBtn);
    console.log('- redoBtn.disabled:', redoBtn?.disabled);
}

function testManualEdit() {
    console.log('\n=== ✏️ 手动编辑测试 ===');
    
    if (!window.ide || !window.ide.editor) {
        console.error('❌ 编辑器不存在');
        return;
    }
    
    const editor = window.ide.editor;
    const vm = window.ide.versionManager;
    
    console.log('📝 请手动在编辑器中输入一些文字...');
    console.log('⏱️ 5秒后检查 UndoManager 状态...');
    
    setTimeout(() => {
        console.log('\n检查手动编辑后的状态:');
        console.log('- canUndo():', vm.undoManager?.canUndo());
        console.log('- canRedo():', vm.undoManager?.canRedo());
        
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        console.log('- undoBtn.disabled:', undoBtn?.disabled);
        console.log('- redoBtn.disabled:', redoBtn?.disabled);
        
        if (vm.undoManager?.canUndo()) {
            console.log('✅ UndoManager 正常工作！');
        } else {
            console.log('❌ UndoManager 没有检测到编辑操作');
        }
    }, 5000);
}

function testProgrammaticEdit() {
    console.log('\n=== 🤖 程序化编辑测试 ===');
    
    if (!window.ide || !window.ide.editor) {
        console.error('❌ 编辑器不存在');
        return;
    }
    
    const editor = window.ide.editor;
    const vm = window.ide.versionManager;
    
    console.log('开始程序化编辑测试...');
    
    // 获取当前位置
    const model = editor.getModel();
    const lineCount = model.getLineCount();
    const lastLineLength = model.getLineLength(lineCount);
    
    // 使用 executeEdits 插入文本
    const testText = '\n% 程序化测试 ' + Date.now();
    editor.executeEdits('debug-test', [{
        range: new monaco.Range(lineCount, lastLineLength + 1, lineCount, lastLineLength + 1),
        text: testText
    }]);
    
    console.log('- 插入文本:', testText);
    
    // 等待同步
    setTimeout(() => {
        console.log('\n同步后检查:');
        console.log('- canUndo():', vm.undoManager?.canUndo());
        console.log('- canRedo():', vm.undoManager?.canRedo());
        
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        console.log('- undoBtn.disabled:', undoBtn?.disabled);
        console.log('- redoBtn.disabled:', redoBtn?.disabled);
        
        if (vm.undoManager?.canUndo()) {
            console.log('✅ 程序化编辑被 UndoManager 检测到！');
            
            // 测试撤销
            console.log('\n测试撤销...');
            vm.undoManager.undo();
            
            setTimeout(() => {
                console.log('- 撤销后 canUndo():', vm.undoManager?.canUndo());
                console.log('- 撤销后 canRedo():', vm.undoManager?.canRedo());
                console.log('- 撤销后内容长度:', editor.getValue().length);
            }, 100);
        } else {
            console.log('❌ 程序化编辑没有被 UndoManager 检测到');
        }
    }, 300);
}

function fixUndoManager() {
    console.log('\n=== 🔧 尝试修复 UndoManager ===');
    
    if (!window.ide || !window.ide.versionManager) {
        console.error('❌ 版本管理器不存在');
        return;
    }
    
    const vm = window.ide.versionManager;
    
    console.log('1. 重新初始化 UndoManager...');
    
    // 销毁现有的 UndoManager
    if (vm.undoManager) {
        try {
            vm.undoManager.destroy();
        } catch (e) {
            console.log('销毁旧 UndoManager 时出错:', e.message);
        }
    }
    
    // 重新设置
    vm.setupUndoManager();
    
    console.log('2. 重新绑定当前文件...');
    if (window.ide.currentFile) {
        vm.unbindFile(window.ide.currentFile);
        setTimeout(() => {
            vm.bindFileToEditor(window.ide.currentFile, window.ide.editor);
            console.log('✅ 重新绑定完成');
            
            // 更新按钮状态
            setTimeout(() => {
                window.ide.updateUndoRedoButtons();
                console.log('✅ 按钮状态已更新');
            }, 100);
        }, 100);
    }
}

// 导出函数
window.debugUndoManager = debugUndoManager;
window.testManualEdit = testManualEdit;
window.testProgrammaticEdit = testProgrammaticEdit;
window.fixUndoManager = fixUndoManager;

console.log('\n✅ UndoManager 调试脚本加载完成！');
console.log('📋 可用命令:');
console.log('- window.debugUndoManager() - 详细调试信息');
console.log('- window.testManualEdit() - 测试手动编辑');
console.log('- window.testProgrammaticEdit() - 测试程序化编辑');
console.log('- window.fixUndoManager() - 尝试修复 UndoManager');

// 自动运行调试
debugUndoManager(); 