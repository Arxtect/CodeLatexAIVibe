export class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.editor = null;
        this.hooks = {
            'editor.init': [],
            'editor.content.change': [],
            'file.open': [],
            'file.save': [],
            'syntax.highlight': [],
            'autocomplete.provide': []
        };
    }

    // 注册插件
    registerPlugin(plugin) {
        if (!plugin.id) {
            throw new Error('插件必须有唯一的 ID');
        }

        if (this.plugins.has(plugin.id)) {
            console.warn(`插件 ${plugin.id} 已存在，将被替换`);
        }

        this.plugins.set(plugin.id, plugin);
        
        // 初始化插件
        if (typeof plugin.init === 'function') {
            plugin.init(this);
        }

        // 注册插件的钩子
        if (plugin.hooks) {
            for (const [hookName, handler] of Object.entries(plugin.hooks)) {
                this.addHook(hookName, handler);
            }
        }

        console.log(`插件 ${plugin.id} 注册成功`);
    }

    // 卸载插件
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`插件 ${pluginId} 不存在`);
            return;
        }

        // 调用插件的清理方法
        if (typeof plugin.destroy === 'function') {
            plugin.destroy();
        }

        // 移除插件的钩子
        if (plugin.hooks) {
            for (const [hookName, handler] of Object.entries(plugin.hooks)) {
                this.removeHook(hookName, handler);
            }
        }

        this.plugins.delete(pluginId);
        console.log(`插件 ${pluginId} 卸载成功`);
    }

    // 获取插件
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    // 获取所有插件
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    // 启用插件
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            if (typeof plugin.enable === 'function') {
                plugin.enable();
            }
            console.log(`插件 ${pluginId} 已启用`);
        }
    }

    // 禁用插件
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            if (typeof plugin.disable === 'function') {
                plugin.disable();
            }
            console.log(`插件 ${pluginId} 已禁用`);
        }
    }

    // 添加钩子
    addHook(hookName, handler) {
        if (!this.hooks[hookName]) {
            this.hooks[hookName] = [];
        }
        this.hooks[hookName].push(handler);
    }

    // 移除钩子
    removeHook(hookName, handler) {
        if (this.hooks[hookName]) {
            const index = this.hooks[hookName].indexOf(handler);
            if (index > -1) {
                this.hooks[hookName].splice(index, 1);
            }
        }
    }

    // 触发钩子
    async triggerHook(hookName, ...args) {
        if (!this.hooks[hookName]) {
            return [];
        }

        const results = [];
        for (const handler of this.hooks[hookName]) {
            try {
                const result = await handler(...args);
                if (result !== undefined) {
                    results.push(result);
                }
            } catch (error) {
                console.error(`钩子 ${hookName} 执行失败:`, error);
            }
        }
        return results;
    }

    // 初始化编辑器相关功能
    initEditor(editor) {
        this.editor = editor;
        
        // 触发编辑器初始化钩子
        this.triggerHook('editor.init', editor);

        // 监听编辑器内容变化
        editor.onDidChangeModelContent((e) => {
            this.triggerHook('editor.content.change', e, editor);
        });
    }

    // 获取语法高亮提供者
    getSyntaxHighlightProviders(language) {
        return this.getAllPlugins().filter(plugin => 
            plugin.type === 'syntax' && 
            plugin.supportedLanguages && 
            plugin.supportedLanguages.includes(language)
        );
    }

    // 获取自动完成提供者
    getAutoCompleteProviders(language) {
        return this.getAllPlugins().filter(plugin => 
            plugin.type === 'autocomplete' && 
            plugin.supportedLanguages && 
            plugin.supportedLanguages.includes(language)
        );
    }

    // 插件通信机制
    sendMessage(fromPluginId, toPluginId, message) {
        const targetPlugin = this.getPlugin(toPluginId);
        if (targetPlugin && typeof targetPlugin.onMessage === 'function') {
            targetPlugin.onMessage(fromPluginId, message);
        }
    }

    // 广播消息给所有插件
    broadcastMessage(fromPluginId, message) {
        for (const [pluginId, plugin] of this.plugins) {
            if (pluginId !== fromPluginId && typeof plugin.onMessage === 'function') {
                plugin.onMessage(fromPluginId, message);
            }
        }
    }

    // 获取插件配置
    getPluginConfig(pluginId) {
        const config = localStorage.getItem(`plugin_config_${pluginId}`);
        return config ? JSON.parse(config) : {};
    }

    // 保存插件配置
    setPluginConfig(pluginId, config) {
        localStorage.setItem(`plugin_config_${pluginId}`, JSON.stringify(config));
    }

    // 插件依赖检查
    checkDependencies(plugin) {
        if (!plugin.dependencies) {
            return true;
        }

        for (const depId of plugin.dependencies) {
            if (!this.plugins.has(depId)) {
                console.error(`插件 ${plugin.id} 依赖的插件 ${depId} 未找到`);
                return false;
            }
        }
        return true;
    }

    // 按依赖顺序加载插件
    loadPluginsInOrder(plugins) {
        const loaded = new Set();
        const loading = new Set();

        const loadPlugin = (plugin) => {
            if (loaded.has(plugin.id)) {
                return true;
            }

            if (loading.has(plugin.id)) {
                console.error(`检测到循环依赖: ${plugin.id}`);
                return false;
            }

            loading.add(plugin.id);

            // 先加载依赖
            if (plugin.dependencies) {
                for (const depId of plugin.dependencies) {
                    const depPlugin = plugins.find(p => p.id === depId);
                    if (depPlugin && !loadPlugin(depPlugin)) {
                        return false;
                    }
                }
            }

            // 加载当前插件
            this.registerPlugin(plugin);
            loaded.add(plugin.id);
            loading.delete(plugin.id);
            return true;
        };

        for (const plugin of plugins) {
            loadPlugin(plugin);
        }
    }

    // 获取插件状态
    getPluginStatus() {
        const status = {};
        for (const [id, plugin] of this.plugins) {
            status[id] = {
                name: plugin.name || id,
                version: plugin.version || '1.0.0',
                type: plugin.type || 'unknown',
                enabled: true,
                dependencies: plugin.dependencies || []
            };
        }
        return status;
    }
} 