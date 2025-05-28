# LaTeX IDE

一个基于 Monaco Editor 和 BrowserFS 的简易 LaTeX IDE，支持语法高亮、自动完成、插件系统和多文件编辑。

## 功能特性

### 核心功能
- 🎨 **语法高亮** - 完整的 LaTeX 语法高亮支持
- 🔧 **智能自动完成** - 基于规则的 LaTeX 命令、环境、数学符号自动完成
- 📁 **多文件管理** - 支持项目级别的多文件编辑和管理
- 💾 **文件系统** - 基于 BrowserFS 的虚拟文件系统
- 🔌 **插件系统** - 可扩展的插件架构

### 编辑器功能
- 📝 **Monaco Editor** - 强大的代码编辑器
- 🌙 **深色主题** - 专为 LaTeX 优化的深色主题
- 📋 **标签页管理** - 多文件标签页切换
- ⌨️ **快捷键支持** - 常用编辑快捷键
- 🔍 **代码折叠** - LaTeX 环境代码折叠
- ↶↷ **撤销/重做** - 基于 Yjs 的智能撤销重做功能

### 用户界面
- 🗂️ **文件浏览器** - 侧边栏文件管理
- 🛠️ **工具栏** - 常用操作按钮
- 📊 **状态栏** - 文件信息和光标位置显示
- 🖱️ **右键菜单** - 文件操作上下文菜单

## 技术架构

### 核心组件
- **IDE 类** - 主要的 IDE 控制器
- **FileSystem 类** - 基于 BrowserFS 的文件系统封装
- **PluginManager 类** - 插件管理和生命周期控制

### 默认插件
- **LaTeXSyntaxPlugin** - LaTeX 语法高亮插件
- **LaTeXAutoCompletePlugin** - LaTeX 自动完成插件

### 插件系统
- 🔌 **可替换设计** - 语法高亮和自动完成都是插件，可以被其他插件替换
- 🔗 **钩子机制** - 丰富的钩子系统支持插件扩展
- 📦 **依赖管理** - 插件依赖检查和按序加载
- 💬 **插件通信** - 插件间消息传递机制

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建项目
```bash
npm run build
```

## 使用说明

### 基本操作
1. **新建文件** - 点击工具栏"新建文件"按钮或使用 Ctrl+N
2. **保存文件** - 点击"保存"按钮或使用 Ctrl+S
3. **打开文件** - 在文件浏览器中点击文件名
4. **关闭文件** - 点击标签页的关闭按钮或使用 Ctrl+W

### 编辑功能
- **语法高亮** - 自动识别 LaTeX 语法并高亮显示
- **自动完成** - 输入 `\` 触发命令自动完成
- **环境补全** - 在 `\begin{` 后自动提示环境名称
- **数学符号** - 在数学模式中提供符号自动完成

### 快捷键
- `Ctrl+N` - 新建文件
- `Ctrl+S` - 创建版本快照（内容已实时同步）
- `Ctrl+W` - 关闭当前标签页
- `Ctrl+Z` - 撤销操作
- `Ctrl+Y` - 重做操作
- `Ctrl+Shift+V` - 切换版本历史侧边栏
- `Ctrl+Shift+S` - 创建项目快照

## 插件开发

### 插件结构
```javascript
export class MyPlugin {
    constructor() {
        this.id = 'my-plugin';
        this.name = '我的插件';
        this.version = '1.0.0';
        this.type = 'custom';
    }

    init(pluginManager) {
        // 插件初始化逻辑
    }

    destroy() {
        // 插件清理逻辑
    }
}
```

### 注册插件
```javascript
const plugin = new MyPlugin();
ide.pluginManager.registerPlugin(plugin);
```

### 钩子系统
可用的钩子：
- `editor.init` - 编辑器初始化
- `editor.content.change` - 编辑器内容变化
- `file.open` - 文件打开
- `file.save` - 文件保存
- `syntax.highlight` - 语法高亮
- `autocomplete.provide` - 自动完成

## 项目结构

```
├── index.html              # 主页面
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
├── src/
│   ├── main.js             # 入口文件
│   ├── core/               # 核心模块
│   │   ├── IDE.js          # IDE 主类
│   │   ├── FileSystem.js   # 文件系统
│   │   └── PluginManager.js # 插件管理器
│   └── plugins/            # 插件目录
│       ├── LaTeXSyntaxPlugin.js      # 语法高亮插件
│       └── LaTeXAutoCompletePlugin.js # 自动完成插件
└── README.md               # 项目说明
```

## 依赖项

- **monaco-editor** - 代码编辑器
- **browserfs** - 浏览器文件系统
- **vite** - 构建工具

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 开发计划

### 短期目标
- [ ] 完善文件删除和重命名功能
- [ ] 添加文件搜索功能
- [ ] 实现 LaTeX 编译预览
- [ ] 添加更多 LaTeX 命令和环境

### 长期目标
- [ ] 实时协作编辑
- [ ] Git 集成
- [ ] 更多语言支持
- [ ] 插件市场

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。 