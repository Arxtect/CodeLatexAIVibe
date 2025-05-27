# LaTeX IDE 使用指南

## 快速开始

### 1. 启动 IDE
打开浏览器访问 `http://localhost:3000`，IDE 将自动加载并创建示例项目。

### 2. 界面介绍

#### 主要区域
- **左侧边栏**: 文件资源管理器，显示项目中的所有文件
- **顶部工具栏**: 常用操作按钮（新建、保存、编译等）
- **中央编辑区**: Monaco 编辑器，支持语法高亮和自动完成
- **标签栏**: 显示已打开的文件，支持多文件切换
- **底部状态栏**: 显示文件信息、光标位置、字数统计等

## 基本操作

### 文件管理

#### 新建文件
1. 点击工具栏的"新建文件"按钮
2. 或使用快捷键 `Ctrl+N` (Mac: `Cmd+N`)
3. 在弹出的对话框中输入文件名（如 `chapter1.tex`）
4. 点击"创建"按钮

#### 新建文件夹
1. 点击工具栏的"新建文件夹"按钮
2. 输入文件夹名称
3. 点击"创建"按钮

#### 打开文件
- 在左侧文件浏览器中点击文件名即可打开

#### 保存文件
1. 点击工具栏的"保存"按钮
2. 或使用快捷键 `Ctrl+S` (Mac: `Cmd+S`)

#### 关闭文件
1. 点击标签页右侧的 "×" 按钮
2. 或使用快捷键 `Ctrl+W` (Mac: `Cmd+W`)

### 编辑功能

#### 语法高亮
IDE 自动识别 `.tex` 文件并提供语法高亮：
- **命令**: `\documentclass`, `\section` 等显示为蓝色
- **环境**: `\begin{document}`, `\end{document}` 等显示为绿色
- **注释**: `%` 开头的行显示为绿色
- **数学公式**: `$...$` 和 `$$...$$` 内容特殊高亮
- **字符串**: 大括号和方括号内容

#### 自动完成
输入以下字符会触发自动完成：

##### 命令自动完成 (输入 `\`)
- `\doc` → `\documentclass{article}`
- `\sec` → `\section{标题}`
- `\fra` → `\frac{分子}{分母}`
- `\tex` → `\textbf{粗体文本}`

##### 环境自动完成 (输入 `\begin{`)
- `\begin{doc` → `document`
- `\begin{equ` → `equation`
- `\begin{ite` → `itemize`

##### 数学符号自动完成 (在数学模式中)
- `\alp` → `\alpha`
- `\bet` → `\beta`
- `\sum` → `\sum_{下标}^{上标}`

##### 包名自动完成 (输入 `\usepackage{`)
- `ams` → `amsmath`, `amsfonts`, `amssymb`
- `gra` → `graphicx`
- `geo` → `geometry`

#### 代码折叠
- LaTeX 环境支持代码折叠
- 点击行号左侧的折叠图标
- 或使用 `Ctrl+Shift+[` 折叠，`Ctrl+Shift+]` 展开

#### 括号匹配
- 自动匹配 `{}`, `[]`, `()`, `$$`
- 输入左括号时自动补全右括号
- 选中文本后输入括号会包围选中内容

## 高级功能

### 插件系统

#### 默认插件
1. **LaTeX 语法高亮插件**: 提供完整的 LaTeX 语法高亮
2. **LaTeX 自动完成插件**: 提供智能的代码自动完成
3. **示例插件**: 提供字数统计、自动保存等实用功能

#### 插件功能
- **字数统计**: 状态栏实时显示字数和字符数
- **统计对话框**: 按 `Ctrl+K` (Mac: `Cmd+K`) 显示详细统计
- **自动保存**: 可在设置页面的插件管理中启用
- **保存日志**: 自动记录保存历史

#### 插件管理
1. 点击工具栏的"设置"按钮
2. 选择"插件管理"标签页
3. 使用复选框启用/禁用插件
4. 点击"配置"按钮设置插件选项
5. 修改 JSON 配置：
   ```json
   {
     "enabled": true,
     "autoSave": false,
     "wordCount": true
   }
   ```

### 快捷键

#### 文件操作
- `Ctrl+N` / `Cmd+N`: 新建文件
- `Ctrl+S` / `Cmd+S`: 保存文件
- `Ctrl+W` / `Cmd+W`: 关闭当前标签

#### 编辑操作
- `Ctrl+Z` / `Cmd+Z`: 撤销
- `Ctrl+Y` / `Cmd+Shift+Z`: 重做
- `Ctrl+F` / `Cmd+F`: 查找
- `Ctrl+H` / `Cmd+Option+F`: 替换
- `Ctrl+/` / `Cmd+/`: 切换注释

#### 插件快捷键
- `Ctrl+K` / `Cmd+K`: 显示字数统计

### 右键菜单
在文件浏览器中右键点击可以：
- 新建文件
- 新建文件夹
- 删除文件（待实现）
- 重命名文件（待实现）

## LaTeX 编写技巧

### 文档结构
```latex
\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}

\title{文档标题}
\author{作者姓名}
\date{\today}

\begin{document}
\maketitle

\section{章节标题}
内容...

\end{document}
```

### 数学公式
```latex
% 行内公式
这是行内公式：$E = mc^2$

% 显示公式
\begin{equation}
    \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
\end{equation}

% 多行对齐公式
\begin{align}
    a &= b + c \\
    d &= e + f
\end{align}
```

### 列表
```latex
% 无序列表
\begin{itemize}
    \item 第一项
    \item 第二项
\end{itemize}

% 有序列表
\begin{enumerate}
    \item 第一项
    \item 第二项
\end{enumerate}
```

### 图片和表格
```latex
% 图片
\begin{figure}[h]
    \centering
    \includegraphics[width=0.5\textwidth]{image.png}
    \caption{图片标题}
    \label{fig:example}
\end{figure}

% 表格
\begin{table}[h]
    \centering
    \begin{tabular}{|c|c|c|}
        \hline
        列1 & 列2 & 列3 \\
        \hline
        数据1 & 数据2 & 数据3 \\
        \hline
    \end{tabular}
    \caption{表格标题}
    \label{tab:example}
\end{table}
```

## 故障排除

### 常见问题

#### 1. 自动完成不工作
- 确保文件扩展名为 `.tex`
- 检查是否在正确的上下文中（如命令、环境等）

#### 2. 语法高亮异常
- 刷新页面重新加载
- 检查 LaTeX 语法是否正确

#### 3. 文件保存失败
- 检查文件名是否包含特殊字符
- 确保有足够的浏览器存储空间

#### 4. 插件功能异常
- 打开浏览器开发者工具查看控制台错误
- 尝试重新加载页面

### 性能优化

#### 大文件处理
- 对于大型文档，建议拆分为多个文件
- 使用 `\input{}` 或 `\include{}` 命令组织文档

#### 内存使用
- 定期关闭不需要的标签页
- 清理浏览器缓存

## 扩展开发

### 创建自定义插件
参考 `src/plugins/ExamplePlugin.js` 创建自己的插件：

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
在 `src/main.js` 中注册插件：
```javascript
import { MyPlugin } from './plugins/MyPlugin.js';
window.ide.pluginManager.registerPlugin(new MyPlugin());
```

## 技术支持

如遇到问题或需要帮助：
1. 查看浏览器开发者工具的控制台
2. 检查项目的 GitHub Issues
3. 提交新的 Issue 描述问题 