# LaTeX IDE

一个基于 Monaco Editor 和 BrowserFS 的简易 LaTeX IDE，支持语法高亮、自动完成、插件系统、AI Agent 智能助手和多文件编辑。

## 功能特性

### 核心功能
- 🎨 **语法高亮** - 完整的 LaTeX 语法高亮支持
- 🔧 **智能自动完成** - 基于规则的 LaTeX 命令、环境、数学符号自动完成
- 📁 **多文件管理** - 支持项目级别的多文件编辑和管理
- 💾 **文件系统** - 基于 BrowserFS 的虚拟文件系统
- 🔌 **插件系统** - 可扩展的插件架构
- 🤖 **AI Agent 系统** - 智能助手，支持文档生成、引用管理、编译修复等

### 编辑器功能
- 📝 **Monaco Editor** - 强大的代码编辑器
- 🌙 **深色主题** - 专为 LaTeX 优化的深色主题
- 📋 **标签页管理** - 多文件标签页切换
- ⌨️ **快捷键支持** - 常用编辑快捷键
- 🔍 **代码折叠** - LaTeX 环境代码折叠
- ↶↷ **撤销/重做** - 基于 Yjs 的智能撤销重做功能

### AI Agent 功能
- 📝 **文档生成** - 自动生成 LaTeX 文档模板（article、report、book、beamer、letter）
- 📚 **引用管理** - 搜索、添加、插入学术引用和参考文献
- ✏️ **内容编辑** - 智能格式化、文本替换、内容插入
- 🔧 **编译修复** - 分析和修复常见的 LaTeX 编译错误
- 🎯 **一键演示** - 完整功能演示，展示所有 AI 能力

### 用户界面
- 🗂️ **文件浏览器** - 侧边栏文件管理
- 🛠️ **工具栏** - 常用操作按钮
- 📊 **状态栏** - 文件信息和光标位置显示
- 🖱️ **右键菜单** - 文件操作上下文菜单
- 🤖 **Agent 面板** - VS Code 风格的 AI 助手聊天界面

## AI Agent 系统

### 🤖 Agent 架构

本项目采用了类似 VS Code 扩展的 Agent 架构设计，支持多个 AI Agent 并行工作：

```
┌─────────────────────────────────────────────────────────────┐
│                    LaTeX IDE                                │
├─────────────────────────────────────────────────────────────┤
│  AgentAPI (核心 API 层)                                     │
│  ├── Agent 注册和管理                                       │
│  ├── 消息处理系统                                           │
│  ├── 动作执行系统                                           │
│  ├── 上下文获取                                             │
│  └── 事件系统                                               │
├─────────────────────────────────────────────────────────────┤
│  VSCodeCompat (兼容层)                                      │
│  ├── window API                                            │
│  ├── workspace API                                         │
│  ├── commands API                                          │
│  ├── Uri, Range, Position 类                               │
│  └── 事件监听                                               │
├─────────────────────────────────────────────────────────────┤
│  AgentPlugin (基类)                                        │
│  ├── 生命周期管理                                           │
│  ├── 配置系统                                               │
│  ├── 动作创建辅助                                           │
│  └── 意图解析                                               │
├─────────────────────────────────────────────────────────────┤
│  具体 Agent 实现                                            │
│  ├── LaTeXAssistantAgent                                   │
│  ├── ClineCompatAgent                                      │
│  └── ExampleAgent                                          │
└─────────────────────────────────────────────────────────────┘
```

### 🎯 内置 Agent

#### 1. LaTeX Master (LatexMasterAgent)
**功能**：基于 OpenAI 的智能 LaTeX 助手，类似 Cline/Cursor 的功能

**特性**：
- **智能分析**：自动分析用户需求并制定执行计划
- **多步骤执行**：自动执行一系列复杂操作
- **上下文感知**：收集项目文件结构、编辑器状态等完整上下文
- **OpenAI 集成**：支持 GPT-4、GPT-4 Turbo、GPT-3.5 Turbo
- **配置管理**：完整的 API Key、模型参数配置界面

**支持的操作**：
- **智能文档生成**：`帮我创建一个关于机器学习的学术论文，包含摘要、引言、方法、实验和结论`
- **项目重构**：`重新组织项目结构，将章节分离到不同文件`
- **内容优化**：`优化当前文档的结构和内容，使其更符合学术规范`
- **错误修复**：`分析并修复所有编译错误，确保文档能正常生成PDF`
- **批量操作**：`为所有章节添加目录和交叉引用`

**配置方法**：
1. 选择 "LaTeX Master" Agent
2. 点击设置按钮 ⚙️
3. 输入 OpenAI API Key
4. 选择模型和参数
5. 测试连接并保存

#### 2. LaTeX 智能助手 (LaTeXAssistantAgent)
**功能**：专为 LaTeX 编辑优化的全功能 AI 助手

**支持的操作**：
- **文档生成**：`生成一个报告文档，标题是机器学习研究`
- **章节管理**：`添加一个新章节：实验方法`
- **表格生成**：`生成一个3×4的表格，标题是实验结果`
- **公式插入**：`插入爱因斯坦质能方程`
- **引用搜索**：`搜索 Einstein 的文献`
- **引用插入**：`引用 einstein1905`
- **文档格式化**：`格式化当前文档`
- **编译修复**：`修复编译错误`

#### 3. Cline 兼容助手 (ClineCompatAgent)
**功能**：兼容 VS Code Cline 插件的交互模式

**特性**：
- 完整的 VS Code API 兼容
- 项目分析和代码建议
- 文件操作和重构
- 调试支持

#### 4. 示例助手 (ExampleAgent)
**功能**：演示 Agent 开发的基础示例

### 🚀 使用 AI Agent

#### 1. 打开 Agent 面板
- **快捷键**：`Ctrl+Shift+A`
- **按钮**：点击右侧工具栏的 🤖 按钮
- **菜单**：通过主菜单访问

#### 2. 选择 Agent
在 Agent 面板中选择您需要的 AI 助手：
- **LaTeX 智能助手** - 推荐用于 LaTeX 文档编辑
- **Cline 兼容助手** - 适合代码开发和项目管理
- **示例助手** - 学习 Agent 开发

#### 3. 开始对话
直接输入自然语言指令，例如：
```
生成一个学术论文模板，标题是"深度学习在自然语言处理中的应用"
```

#### 4. 一键演示
点击 **🎯 演示功能** 按钮，自动展示所有 AI 能力：
1. 文档生成演示
2. 文献搜索演示
3. 引用插入演示
4. 表格生成演示
5. 文档格式化演示
6. 编译修复演示

### 🔧 支持的动作类型

| 动作类型 | 功能描述 | 示例用途 |
|----------|----------|----------|
| `create` | 创建新文件 | 生成 LaTeX 文档、配置文件 |
| `edit` | 编辑文件内容 | 修改代码、插入文本、替换内容 |
| `delete` | 删除文件 | 清理临时文件、移除过时文件 |
| `move` | 移动/重命名文件 | 重构项目结构、文件重命名 |
| `search` | 搜索文件内容 | 查找引用、搜索特定内容 |
| `compile` | 编译 LaTeX | 生成 PDF、检查语法错误 |
| `ui` | 用户界面操作 | 显示消息、更新状态 |

### 🛠️ 开发自定义 Agent

#### 1. 创建 Agent 类
```javascript
import { AgentPlugin } from '../core/AgentPlugin.js';
import { createVSCodeGlobal } from '../core/VSCodeCompat.js';

export class MyCustomAgent extends AgentPlugin {
    constructor() {
        super();
        
        // 设置基本信息
        this.id = 'my-custom-agent';
        this.name = '我的自定义助手';
        this.description = '专门处理特定任务的 AI 助手';
        this.capabilities = ['custom-feature-1', 'custom-feature-2'];
    }
    
    onInit() {
        // 创建 VS Code 兼容 API
        this.vscode = createVSCodeGlobal(this.agentAPI);
        
        // 其他初始化逻辑
        this.setupCustomFeatures();
    }
    
    async processMessage(message, context) {
        // 解析用户意图
        const intent = this.parseIntent(message);
        
        // 处理不同类型的请求
        switch (intent.type) {
            case 'custom-action':
                return await this.handleCustomAction(message, context);
            default:
                return this.createResponse('我可以帮您处理自定义任务');
        }
    }
    
    async handleCustomAction(message, context) {
        // 实现自定义功能
        const actions = [
            this.createCreateAction('/output.tex', 'Generated content'),
            this.createUIAction('showMessage', { message: '任务完成' })
        ];
        
        return this.createResponse('自定义任务已完成', actions);
    }
}
```

#### 2. 注册 Agent
在 `src/main.js` 中注册您的 Agent：
```javascript
async function initAgents() {
    try {
        const { MyCustomAgent } = await import('../agents/MyCustomAgent.js');
        const myAgent = new MyCustomAgent();
        window.ide.agentAPI.registerAgent(myAgent);
    } catch (error) {
        console.error('Agent 注册失败:', error);
    }
}
```

#### 3. VS Code API 兼容
您的 Agent 可以使用完整的 VS Code API：
```javascript
// 文件操作
const document = await this.vscode.workspace.openTextDocument(uri);
const files = await this.vscode.workspace.findFiles('**/*.tex');

// 用户界面
this.vscode.window.showInformationMessage('操作成功');
const input = await this.vscode.window.showInputBox({ prompt: '请输入' });

// 命令系统
this.vscode.commands.registerCommand('myAgent.doSomething', callback);
await this.vscode.commands.executeCommand('workbench.action.files.save');
```

### 📋 Agent 开发最佳实践

#### 1. 意图解析
```javascript
parseIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    if (lowerMessage.includes('生成') || lowerMessage.includes('创建')) {
        return { type: 'generate', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('搜索') || lowerMessage.includes('查找')) {
        return { type: 'search', confidence: 0.9 };
    }
    
    return { type: 'general', confidence: 0.5 };
}
```

#### 2. 错误处理
```javascript
async processMessage(message, context) {
    try {
        // 处理逻辑
        const result = await this.handleMessage(message, context);
        return this.createResponse(result.content, result.actions);
    } catch (error) {
        this.handleError(error, 'processMessage');
        return this.createResponse('处理失败，请稍后再试');
    }
}
```

#### 3. 上下文感知
```javascript
async processMessage(message, context) {
    // 获取编辑器上下文
    const editorContext = this.getEditorContext();
    if (editorContext) {
        const currentFile = editorContext.filePath;
        const currentContent = editorContext.content;
        const cursorPosition = editorContext.position;
        
        // 基于上下文处理消息
    }
}
```

## 技术架构

### 核心组件
- **IDE 类** - 主要的 IDE 控制器
- **FileSystem 类** - 基于 BrowserFS 的文件系统封装
- **PluginManager 类** - 插件管理和生命周期控制
- **AgentAPI 类** - AI Agent 系统核心 API
- **AgentPanel 类** - VS Code 风格的 Agent 聊天界面

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

### AI Agent 使用
1. **打开 Agent 面板** - 按 `Ctrl+Shift+A` 或点击 🤖 按钮
2. **选择 Agent** - 从下拉菜单选择合适的 AI 助手
3. **输入指令** - 使用自然语言描述您的需求
4. **查看结果** - AI 会自动执行相应操作并提供反馈

### 快捷键
- `Ctrl+N` - 新建文件
- `Ctrl+S` - 创建版本快照（内容已实时同步）
- `Ctrl+W` - 关闭当前标签页
- `Ctrl+Z` - 撤销操作
- `Ctrl+Y` - 重做操作
- `Ctrl+Shift+V` - 切换版本历史侧边栏
- `Ctrl+Shift+S` - 创建项目快照
- `Ctrl+Shift+A` - 切换 AI Agent 面板

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
│   │   ├── PluginManager.js # 插件管理器
│   │   ├── AgentAPI.js     # Agent 系统核心 API
│   │   ├── AgentPanel.js   # Agent 聊天界面
│   │   ├── AgentPlugin.js  # Agent 插件基类
│   │   └── VSCodeCompat.js # VS Code 兼容层
│   ├── agents/             # AI Agent 目录
│   │   ├── LaTeXAssistantAgent.js  # LaTeX 智能助手
│   │   ├── ClineCompatAgent.js     # Cline 兼容助手
│   │   └── ExampleAgent.js         # 示例助手
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
- [ ] 扩展 AI Agent 功能

### 长期目标
- [ ] 实时协作编辑
- [ ] Git 集成
- [ ] 更多语言支持
- [ ] Agent 插件市场
- [ ] 云端 AI 模型集成

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