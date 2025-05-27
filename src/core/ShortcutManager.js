export class ShortcutManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.actions = new Map();
        this.activeShortcuts = new Map();
        
        this.setupEventListeners();
        this.updateShortcuts();
        
        // 监听设置变更
        this.settingsManager.on('settingsChanged', () => {
            this.updateShortcuts();
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    registerAction(actionId, callback, description) {
        this.actions.set(actionId, {
            callback,
            description,
            id: actionId
        });
    }

    unregisterAction(actionId) {
        this.actions.delete(actionId);
    }

    updateShortcuts() {
        this.activeShortcuts.clear();
        const shortcuts = this.settingsManager.get('shortcuts');
        
        for (const [actionId, shortcut] of Object.entries(shortcuts)) {
            if (this.actions.has(actionId)) {
                this.activeShortcuts.set(shortcut, actionId);
            }
        }
    }

    handleKeyDown(e) {
        const shortcut = this.getShortcutFromEvent(e);
        const actionId = this.activeShortcuts.get(shortcut);
        
        if (actionId && this.actions.has(actionId)) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const action = this.actions.get(actionId);
                action.callback();
            } catch (error) {
                console.error(`执行快捷键动作失败 (${actionId}):`, error);
            }
        }
    }

    getShortcutFromEvent(e) {
        const parts = [];
        
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        // 特殊键处理
        const specialKeys = {
            'Escape': 'Escape',
            'Enter': 'Enter',
            'Tab': 'Tab',
            'Backspace': 'Backspace',
            'Delete': 'Delete',
            'Insert': 'Insert',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PageUp',
            'PageDown': 'PageDown',
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right',
            'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
            'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
            'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
        };
        
        if (specialKeys[e.key]) {
            parts.push(specialKeys[e.key]);
        } else if (e.key.length === 1) {
            parts.push(e.key.toUpperCase());
        }
        
        return parts.join('+');
    }

    getActionDescription(actionId) {
        const action = this.actions.get(actionId);
        return action ? action.description : actionId;
    }

    getAllActions() {
        return Array.from(this.actions.values());
    }

    getShortcutForAction(actionId) {
        return this.settingsManager.getShortcut(actionId);
    }

    setShortcutForAction(actionId, shortcut) {
        try {
            this.settingsManager.setShortcut(actionId, shortcut);
            this.updateShortcuts();
            return true;
        } catch (error) {
            console.error('设置快捷键失败:', error);
            return false;
        }
    }

    // 快捷键验证
    isValidShortcut(shortcut) {
        const parts = shortcut.split('+');
        if (parts.length === 0) return false;
        
        const modifiers = ['Ctrl', 'Alt', 'Shift'];
        const lastPart = parts[parts.length - 1];
        
        // 最后一部分必须是实际的键
        if (modifiers.includes(lastPart)) return false;
        
        return true;
    }

    // 快捷键格式化
    formatShortcut(shortcut) {
        const parts = shortcut.split('+');
        const modifiers = [];
        let key = '';
        
        for (const part of parts) {
            if (['Ctrl', 'Alt', 'Shift'].includes(part)) {
                modifiers.push(part);
            } else {
                key = part;
            }
        }
        
        // 确保修饰键顺序一致
        const orderedModifiers = ['Ctrl', 'Alt', 'Shift'].filter(mod => modifiers.includes(mod));
        
        return [...orderedModifiers, key].join('+');
    }

    // 获取快捷键冲突
    getShortcutConflicts(shortcut, excludeAction) {
        const conflicts = [];
        const shortcuts = this.settingsManager.get('shortcuts');
        
        for (const [actionId, existingShortcut] of Object.entries(shortcuts)) {
            if (actionId !== excludeAction && existingShortcut === shortcut) {
                conflicts.push({
                    actionId,
                    description: this.getActionDescription(actionId)
                });
            }
        }
        
        return conflicts;
    }
} 