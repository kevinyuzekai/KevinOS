# KevinOS · 网页操作系统

> 一个完全运行在浏览器中的桌面操作系统。纯 HTML / CSS / JavaScript 构建，零依赖、零构建步骤。

![KevinOS](assets/logo.png)

## ✨ 特性

- **丝滑动画**：开机引导、窗口开启/关闭/最小化/还原、面板弹出、拖拽吸附均采用弹性缓动曲线
- **完整窗口系统**：拖拽、八向缩放、最大化、最小化、任务栏还原、边缘自动分屏、Alt+Tab 切换、Z 序管理
- **虚拟文件系统（VFS）**：树形结构 + `localStorage` 持久化，支持新建 / 重命名 / 复制 / 剪切 / 粘贴 / 移动 / 删除 / 导入文件
- **内置浏览器**：多标签页、地址栏导航、搜索、书签快捷入口、内置 `kevin://` 页面，并对禁止嵌入的站点做优雅降级
- **内置文件管理器**：侧边栏位置导航、面包屑路径栏、网格/列表双视图、搜索、右键菜单、拖拽整理
- **12 个原生应用**：浏览器、文件管理器、终端、文本编辑器、计算器、图片查看器、媒体播放器、日历、便签、设置、应用商店、关于本机
- **个性化**：浅色/深色主题、5 种强调色、8 张壁纸、亮度与音量调节、玻璃模糊效果开关
- **通知中心与快捷设置**：通知气泡、通知历史、Wi-Fi/蓝牙/深色模式等快捷开关
- **无登录**：直接进入桌面，无需账号与登录 ID

## 🖥️ 内置应用

| 应用 | 说明 |
| --- | --- |
| Kevin 浏览器 | 多标签网页浏览器，支持搜索与 `kevin://` 内置页面 |
| 文件管理器 | 图形化文件管理，拖拽整理、导入导出 |
| 终端 | `ksh` Shell，30+ 命令（`ls` `cd` `cat` `tree` `neofetch` `open` …） |
| 文本编辑器 | 打开 / 保存 / 另存为、自动换行、快捷键 `Ctrl+S` |
| 计算器 | 表达式计算，支持键盘输入 |
| 图片查看器 | 缩放、旋转、翻页、滚轮缩放 |
| 媒体播放器 | Web Audio 合成音乐引擎 + 实时频谱可视化 |
| 日历 | 月视图、今日高亮、日程增删 |
| 便签 | 自动保存、搜索、多便签管理 |
| 设置 | 主题 / 强调色 / 壁纸 / 亮度 / 音量 / 存储 / 系统信息 |
| 应用商店 | 应用目录，一键启动 |
| 关于本机 | 版本与运行环境信息 |

## 🚀 快速开始

无需任何依赖，直接打开即可：

```bash
# 方式一：直接双击 index.html 在浏览器中打开

# 方式二：启动本地静态服务器（推荐）
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl/⌘ + Alt + T` | 打开终端 |
| `Ctrl/⌘ + Alt + E` | 打开文件管理器 |
| `Ctrl/⌘ + Alt + B` | 打开浏览器 |
| `Ctrl/⌘ + Alt + N` | 打开便签 |
| `Ctrl/⌘ + Alt + L` | 打开设置 |
| `Ctrl/⌘ + Alt + ←/→` | 当前窗口左右分屏 |
| `Ctrl/⌘ + Alt + ↑` | 当前窗口最大化 / 还原 |
| `Alt + Tab` | 切换窗口 |
| `Esc` | 关闭开始菜单 / 通知中心 / 右键菜单 |

## 🌐 部署到 GitHub Pages

1. 在 GitHub 上新建一个名为 `KevinOS` 的仓库（Public）。
2. 在本地项目目录执行：

```bash
git init
git add .
git commit -m "feat: KevinOS 网页操作系统 v1.0"
git branch -M main
git remote add origin https://github.com/<你的用户名>/KevinOS.git
git push -u origin main
```

3. 进入仓库 **Settings → Pages**，将 **Source** 设为 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。
4. 稍等片刻，访问 `https://<你的用户名>.github.io/KevinOS/` 即可使用。

> 由于是纯静态站点，也可直接部署到 Vercel / Netlify / Cloudflare Pages 等平台。

## 📁 项目结构

```
KevinOS/
├── index.html              # 系统外壳与桌面结构
├── assets/
│   └── logo.png            # 系统 LOGO
├── css/
│   ├── reset.css           # 基础重置
│   ├── theme.css           # 主题变量、壁纸、开机动画
│   ├── desktop.css         # 桌面、任务栏、开始菜单、通知中心
│   ├── window.css          # 窗口外观与动画
│   └── apps.css            # 各应用样式
└── js/
    ├── core/
    │   ├── fs.js           # 虚拟文件系统（VFS）
    │   ├── registry.js     # 应用注册表与通用工具
    │   ├── window.js       # 窗口管理器
    │   ├── desktop.js      # 桌面环境（图标/任务栏/开始菜单/通知）
    │   └── system.js       # 系统引导与全局设置
    └── apps/
        ├── browser.js      ├── files.js       ├── terminal.js
        ├── editor.js       ├── calculator.js  ├── photos.js
        ├── media.js        ├── calendar.js    ├── notes.js
        ├── settings.js     ├── about.js       └── store.js
```

## 🧱 技术说明

- **无框架、无依赖**：全部为原生 Web 技术，便于阅读、二次开发与部署。
- **窗口管理**：`js/core/window.js` 负责创建、焦点、Z 序、拖拽、八向缩放、边缘吸附与电源对话框。
- **数据持久化**：文件系统与系统设置分别存储于 `localStorage` 的 `kevinos.fs.v1` 与 `kevinos.settings.v1`。
- **浏览器应用**：外部站点通过 `<iframe>` 加载；受同源策略与 `X-Frame-Options` 限制的站点会被识别并提供"在新窗口打开"的降级方案。

## 📄 许可

MIT License · © 2026 KevinOS Project