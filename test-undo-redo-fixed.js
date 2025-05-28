// 修复后的 Undo/Redo 功能测试脚本
// 在浏览器控制台中运行此脚本

console.log('🧪 开始测试修复后的 Undo/Redo 功能...');

function testUndoRedoFixed() {
    console.log('\n=== 🧪 修复后的 Undo/Redo 功能测试 ===');
    
    // 1. 检查基础组件
    console.log('\n1️⃣ 基础组件检查:');
    console.log('- window.ide 存在:', !!window.ide);
    console.log('- 编辑器存在:', !!window.ide?.editor);
    console.log('- 版本管理器存在:', !!window.ide?.versionManager);
    console.log('- UndoManager 存在:', !!window.ide?.versionManager?.undoManager);
    
    if (!window.ide || !window.ide.editor || !window.ide.versionManager || !window.ide.versionManager.undoManager) {
        console.error('❌ 基础组件不完整，无法进行测试');
        return;
    }
    
    const editor = window.ide.editor;
    const vm = window.ide.versionManager;
    const undoManager = vm.undoManager;
    
    // 2. 检查编辑器命令覆盖
    console.log('\n2️⃣ 编辑器命令检查:');
    console.log('- 编辑器模型存在:', !!editor.getModel());
    
    // 3. 测试 UndoManager 状态
    console.log('\n3️⃣ UndoManager 状态:');
    console.log('- canUndo():', undoManager.canUndo());
    console.log('- canRedo():', undoManager.canRedo());
    console.log('- scope 大小:', undoManager.scope ? undoManager.scope.size : 'undefined');
    
    // 4. 测试编辑器内容操作
    console.log('\n4️⃣ 编辑器内容操作测试:');
    
    // 保存原始内容
    const originalContent = editor.getValue();
    console.log('- 原始内容长度:', originalContent.length);
    
    // 添加测试内容
    const testText = '\n% 测试内容 ' + Date.now();
    editor.setValue(originalContent + testText);
    console.log('- 添加测试内容:', testText);
    
    // 等待一下让 Yjs 同步
    setTimeout(() => {
        console.log('\n5️⃣ 同步后状态检查:');
        console.log('- canUndo():', undoManager.canUndo());
        console.log('- canRedo():', undoManager.canRedo());
        
        // 测试按钮状态
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        console.log('- undoBtn.disabled:', undoBtn?.disabled);
        console.log('- redoBtn.disabled:', redoBtn?.disabled);
        
        // 测试 undo 操作
        if (undoManager.canUndo()) {
            console.log('\n6️⃣ 测试 Undo 操作:');
            console.log('- 执行 undo...');
            const undoResult = window.ide.undo();
            console.log('- undo 结果:', undoResult);
            
            setTimeout(() => {
                console.log('- undo 后内容长度:', editor.getValue().length);
                console.log('- canUndo():', undoManager.canUndo());
                console.log('- canRedo():', undoManager.canRedo());
                
                // 测试 redo 操作
                if (undoManager.canRedo()) {
                    console.log('\n7️⃣ 测试 Redo 操作:');
                    console.log('- 执行 redo...');
                    const redoResult = window.ide.redo();
                    console.log('- redo 结果:', redoResult);
                    
                    setTimeout(() => {
                        console.log('- redo 后内容长度:', editor.getValue().length);
                        console.log('- canUndo():', undoManager.canUndo());
                        console.log('- canRedo():', undoManager.canRedo());
                        
                        console.log('\n✅ 测试完成');
                    }, 100);
                } else {
                    console.log('❌ 无法测试 redo：canRedo() 返回 false');
                }
            }, 100);
        } else {
            console.log('❌ 无法测试 undo：canUndo() 返回 false');
        }
    }, 200);
}

// 测试快捷键功能
function testShortcutKeys() {
    console.log('\n=== ⌨️ 快捷键测试 ===');
    
    if (!window.ide || !window.ide.editor) {
        console.error('❌ 编辑器未初始化');
        return;
    }
    
    const editor = window.ide.editor;
    
    console.log('📝 请在编辑器中输入一些文本，然后：');
    console.log('1. 按 Ctrl+Z 测试撤销');
    console.log('2. 按 Ctrl+Y 或 Ctrl+Shift+Z 测试重做');
    console.log('3. 观察按钮状态变化');
    
    // 监听编辑器焦点
    editor.focus();
    console.log('✅ 编辑器已获得焦点，可以开始测试快捷键');
}

// 测试按钮点击
function testButtonClicks() {
    console.log('\n=== 🖱️ 按钮点击测试 ===');
    
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (!undoBtn || !redoBtn) {
        console.error('❌ 按钮元素未找到');
        return;
    }
    
    console.log('- undoBtn 存在:', !!undoBtn);
    console.log('- redoBtn 存在:', !!redoBtn);
    console.log('- undoBtn.disabled:', undoBtn.disabled);
    console.log('- redoBtn.disabled:', redoBtn.disabled);
    
    // 添加一些内容以便测试
    if (window.ide && window.ide.editor) {
        const editor = window.ide.editor;
        const originalContent = editor.getValue();
        editor.setValue(originalContent + '\n% 按钮测试内容 ' + Date.now());
        
        setTimeout(() => {
            console.log('- 添加内容后 undoBtn.disabled:', undoBtn.disabled);
            
            if (!undoBtn.disabled) {
                console.log('🖱️ 点击撤销按钮...');
                undoBtn.click();
                
                setTimeout(() => {
                    console.log('- 点击后 redoBtn.disabled:', redoBtn.disabled);
                    
                    if (!redoBtn.disabled) {
                        console.log('🖱️ 点击重做按钮...');
                        redoBtn.click();
                    }
                }, 100);
            }
        }, 200);
    }
}

// 运行所有测试
function runAllTests() {
    console.log('🚀 开始运行所有测试...');
    
    testUndoRedoFixed();
    
    setTimeout(() => {
        testShortcutKeys();
    }, 1000);
    
    setTimeout(() => {
        testButtonClicks();
    }, 2000);
}

// 导出函数
window.testUndoRedoFixed = testUndoRedoFixed;
window.testShortcutKeys = testShortcutKeys;
window.testButtonClicks = testButtonClicks;
window.runAllTests = runAllTests;

console.log('\n✅ 测试脚本加载完成！');
console.log('📋 可用命令:');
console.log('- window.testUndoRedoFixed() - 测试修复后的 undo/redo 功能');
console.log('- window.testShortcutKeys() - 测试快捷键功能');
console.log('- window.testButtonClicks() - 测试按钮点击功能');
console.log('- window.runAllTests() - 运行所有测试');

// 自动运行基础测试
testUndoRedoFixed(); 