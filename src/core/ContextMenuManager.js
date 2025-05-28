/**
 * 右键菜单管理器
 * 允许插件动态注册右键菜单选项
 */
export class ContextMenuManager {
    constructor() {
        this.menuItems = new Map(); // 存储菜单项
        this.contextMenu = null;
        this.currentTarget = null;
        this.init();
    }

    init() {
        // 创建右键菜单元素
        this.contextMenu = document.getElementById('contextMenu');
        if (!this.contextMenu) {
            console.warn('右键菜单元素未找到');
            return;
        }

        // 监听点击事件隐藏菜单
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hide();
            }
        });
    }

    /**
     * 注册右键菜单项
     * @param {string} id - 菜单项ID
     * @param {Object} config - 菜单项配置
     */
    registerMenuItem(id, config) {
        const menuItem = {
            id,
            label: config.label,
            icon: config.icon || '',
            action: config.action,
            condition: config.condition || (() => true), // 显示条件
            contexts: config.contexts || ['file', 'folder', 'editor', 'tab'], // 适用的上下文
            group: config.group || 'default', // 菜单组
            order: config.order || 100, // 排序
            separator: config.separator || false, // 是否在此项后添加分隔符
            pluginId: config.pluginId // 注册此菜单项的插件ID
        };

        this.menuItems.set(id, menuItem);
        console.log(`右键菜单项已注册: ${id} - ${menuItem.label}`);
    }

    /**
     * 注销右键菜单项
     * @param {string} id - 菜单项ID
     */
    unregisterMenuItem(id) {
        if (this.menuItems.has(id)) {
            this.menuItems.delete(id);
            console.log(`右键菜单项已注销: ${id}`);
        }
    }

    /**
     * 注销插件的所有菜单项
     * @param {string} pluginId - 插件ID
     */
    unregisterPluginMenuItems(pluginId) {
        const itemsToRemove = [];
        for (const [id, item] of this.menuItems) {
            if (item.pluginId === pluginId) {
                itemsToRemove.push(id);
            }
        }
        
        itemsToRemove.forEach(id => this.unregisterMenuItem(id));
        console.log(`已注销插件 ${pluginId} 的 ${itemsToRemove.length} 个菜单项`);
    }

    /**
     * 显示右键菜单
     * @param {Event} event - 右键事件
     * @param {string} context - 上下文类型 ('file', 'folder', 'editor', 'tab', 'empty')
     * @param {Object} target - 目标对象信息
     */
    show(event, context, target = null) {
        event.preventDefault();
        
        this.currentTarget = target;
        window.currentContextTarget = target;

        // 获取适用的菜单项
        const applicableItems = this.getApplicableMenuItems(context, target);
        
        if (applicableItems.length === 0) {
            return; // 没有适用的菜单项
        }

        // 构建菜单HTML
        const menuHTML = this.buildMenuHTML(applicableItems);
        this.contextMenu.innerHTML = menuHTML;

        // 显示菜单
        this.contextMenu.classList.remove('hidden');
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = event.pageX + 'px';
        this.contextMenu.style.top = event.pageY + 'px';

        // 确保菜单在视窗内
        this.adjustMenuPosition();
    }

    /**
     * 隐藏右键菜单
     */
    hide() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
            this.contextMenu.classList.add('hidden');
        }
        this.currentTarget = null;
        window.currentContextTarget = null;
    }

    /**
     * 获取适用的菜单项
     * @param {string} context - 上下文类型
     * @param {Object} target - 目标对象
     * @returns {Array} 适用的菜单项列表
     */
    getApplicableMenuItems(context, target) {
        const items = [];
        
        for (const [id, item] of this.menuItems) {
            // 检查上下文是否匹配
            if (!item.contexts.includes(context)) {
                continue;
            }

            // 检查显示条件
            try {
                if (!item.condition(context, target)) {
                    continue;
                }
            } catch (error) {
                console.warn(`菜单项 ${id} 的条件检查失败:`, error);
                continue;
            }

            items.push(item);
        }

        // 按组和顺序排序
        items.sort((a, b) => {
            if (a.group !== b.group) {
                return a.group.localeCompare(b.group);
            }
            return a.order - b.order;
        });

        return items;
    }

    /**
     * 构建菜单HTML
     * @param {Array} items - 菜单项列表
     * @returns {string} 菜单HTML
     */
    buildMenuHTML(items) {
        let html = '';
        let currentGroup = null;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // 添加组分隔符
            if (currentGroup !== null && currentGroup !== item.group) {
                html += '<div class="context-menu-separator"></div>';
            }
            currentGroup = item.group;

            // 添加菜单项
            const icon = item.icon ? `${item.icon} ` : '';
            html += `
                <div class="context-menu-item" onclick="window.contextMenuManager.executeAction('${item.id}')">
                    ${icon}${item.label}
                </div>
            `;

            // 添加项目分隔符
            if (item.separator && i < items.length - 1) {
                html += '<div class="context-menu-separator"></div>';
            }
        }

        return html;
    }

    /**
     * 执行菜单项动作
     * @param {string} itemId - 菜单项ID
     */
    executeAction(itemId) {
        const item = this.menuItems.get(itemId);
        if (!item) {
            console.warn(`菜单项未找到: ${itemId}`);
            return;
        }

        try {
            // 执行动作
            if (typeof item.action === 'function') {
                item.action(this.currentTarget);
            } else if (typeof item.action === 'string') {
                // 如果是字符串，尝试作为全局函数执行
                const func = window[item.action];
                if (typeof func === 'function') {
                    func(this.currentTarget);
                } else {
                    console.warn(`全局函数未找到: ${item.action}`);
                }
            }
        } catch (error) {
            console.error(`执行菜单项动作失败 (${itemId}):`, error);
        } finally {
            this.hide();
        }
    }

    /**
     * 调整菜单位置确保在视窗内
     */
    adjustMenuPosition() {
        if (!this.contextMenu) return;

        const rect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 调整水平位置
        if (rect.right > viewportWidth) {
            const newLeft = viewportWidth - rect.width - 10;
            this.contextMenu.style.left = Math.max(10, newLeft) + 'px';
        }

        // 调整垂直位置
        if (rect.bottom > viewportHeight) {
            const newTop = viewportHeight - rect.height - 10;
            this.contextMenu.style.top = Math.max(10, newTop) + 'px';
        }
    }

    /**
     * 注册默认的菜单项
     */
    registerDefaultMenuItems() {
        // 文件操作组
        this.registerMenuItem('open-file', {
            label: '打开',
            icon: '📂',
            contexts: ['file'],
            group: 'file-ops',
            order: 1,
            action: (target) => {
                if (target && target.path && window.ide) {
                    window.ide.openFile(target.path);
                }
            },
            condition: (context, target) => context === 'file' && target && target.path
        });

        this.registerMenuItem('rename-item', {
            label: '重命名',
            icon: '✏️',
            contexts: ['file', 'folder'],
            group: 'file-ops',
            order: 10,
            action: (target) => {
                if (window.ide && window.ide.renameItem) {
                    window.ide.contextTarget = target ? target.element : null;
                    window.ide.renameItem();
                }
            }
        });

        this.registerMenuItem('delete-item', {
            label: '删除',
            icon: '🗑️',
            contexts: ['file', 'folder'],
            group: 'file-ops',
            order: 11,
            separator: true,
            action: (target) => {
                if (window.ide && window.ide.deleteItem) {
                    window.ide.contextTarget = target ? target.element : null;
                    window.ide.deleteItem();
                }
            }
        });

        // 新建操作组
        this.registerMenuItem('new-file', {
            label: '新建文件',
            icon: '📄',
            contexts: ['empty', 'folder'],
            group: 'create',
            order: 1,
            action: () => {
                if (window.createNewFile) {
                    window.createNewFile();
                }
            }
        });

        this.registerMenuItem('new-folder', {
            label: '新建文件夹',
            icon: '📁',
            contexts: ['empty', 'folder'],
            group: 'create',
            order: 2,
            separator: true,
            action: () => {
                if (window.createNewFolder) {
                    window.createNewFolder();
                }
            }
        });

        // 标签页操作组
        this.registerMenuItem('close-tab', {
            label: '关闭标签',
            icon: '❌',
            contexts: ['tab'],
            group: 'tab-ops',
            order: 1,
            action: (target) => {
                if (target && target.path && window.ide) {
                    window.ide.closeTab(target.path);
                }
            }
        });

        this.registerMenuItem('close-other-tabs', {
            label: '关闭其他标签',
            icon: '🗂️',
            contexts: ['tab'],
            group: 'tab-ops',
            order: 2,
            action: (target) => {
                if (target && target.path && window.ide) {
                    window.ide.closeOtherTabs(target.path);
                }
            }
        });

        this.registerMenuItem('save-file', {
            label: '保存文件',
            icon: '💾',
            contexts: ['tab'],
            group: 'tab-ops',
            order: 3,
            separator: true,
            action: (target) => {
                if (target && target.path && window.ide) {
                    window.ide.saveFile(target.path);
                }
            }
        });
    }
} 