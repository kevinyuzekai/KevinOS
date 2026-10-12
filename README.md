# KevinOS · 网页操作系统

> 一个完全运行在浏览器中的桌面操作系统。纯 HTML / CSS / JavaScript 构建，**零依赖、零构建步骤**。
> 无需登录 ID，打开即用。

<p align="center">
  <img src="assets/logo.png" alt="KevinOS" width="120" />
</p>

<p align="center">
  <b>KevinOS 1.0 “Navy”</b> · KevinKernel 5.1-web
</p>

## 🌐 在线体验

开启 GitHub Pages 后访问：**https://kevinyuzekai.github.io/KevinOS/**

> 开启方式：仓库 **Settings → Pages → Source** 选择 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，保存即可。

## ✨ 特性

- **丝滑动画**：开机引导、窗口开启 / 关闭 / 最小化 / 还原、面板弹出、拖拽吸附，全部采用弹性缓动曲线
- **完整窗口系统**：拖拽、八向缩放、最大化、最小化 + 任务栏还原、屏幕边缘自动分屏、`Alt+Tab` 切换、Z 序聚焦管理
- **虚拟文件系统（VFS）**：树形结构，支持新建 / 重命名 / 复制 / 剪切 / 粘贴 / 移动 / 删除 / 导入文件；当前为**演示模式**，每次启动自动清空
- **KevinOffice 办公套件**：内置文字（Word）、表格（Excel）、演示（PPT）与 PDF 阅读四大模块，兼容 WPS 主要功能
- **内置浏览器**：多标签页、地址栏导航、搜索、书签快捷入口、`kevin://` 内置页面，并对禁止嵌入的站点做优雅降级
- **内置文件管理器**：侧边栏位置导航、面包屑路径栏、网格 / 列表双视图、搜索、右键菜单、拖拽整理
- **15 个原生应用**：浏览器、文件管理器、终端、文本编辑器、计算器、图片查看器、媒体播放器、日历、便签、设置、应用商店、关于本机、天气、代码编辑器、KevinOffice
- **多设备触屏适配**：自动识别桌面 / 手机 / 平板 / 手表并适配布局与交互（型号仅内部识别，界面不展示）
- **个性化**：浅色 / 深色主题、5 种强调色、8 张壁纸、亮度与音量调节、玻璃模糊效果开关
- **通知中心与快捷设置**：通知气泡、通知历史、深色模式 / Wi-Fi / 蓝牙等快捷开关
- **无登录**：直接进入桌面，无需账号与登录 ID

## 🖥️ 内置应用

| 应用 | 说明 |
| --- | --- |
| Kevin 浏览器 | 多标签网页浏览器，支持搜索与 `kevin://` 内置页面 |
| 文件管理器 | 图形化文件管理，拖拽整理、导入导出 |
| 终端 | `ksh` Shell，30+ 命令（`ls` `cd` `cat` `tree` `neofetch` `open` …） |
| KevinOffice | 办公套件：文字 / 表格 / 演示 / PDF，表格含公式引擎 |
| 代码编辑器 | 类 VS Code：文件树、多标签、语法高亮、命令面板 |
| 文本编辑器 | 打开 / 保存 / 另存为、自动换行、快捷键 `Ctrl+S` |
| 计算器 | 表达式计算，支持键盘输入 |
| 图片查看器 | 缩放、旋转、翻页、滚轮缩放 |
| 媒体播放器 | Web Audio 合成音乐引擎 + 实时频谱可视化 |
| 日历 | 月视图、今日高亮、日程增删 |
| 便签 | 自动保存、搜索、多便签管理 |
| 天气 | 任意城市实时天气、逐小时与未来 7 天预报 |
| 设置 | 主题 / 强调色 / 壁纸 / 亮度 / 音量 / 存储 / 系统信息 |
| 应用商店 | 应用目录，一键启动 |
| 关于本机 | 版本与运行环境信息 |

## 🚀 快速开始

无需任何依赖，直接打开即可：

```bash
# 方式一：直接双击 index.html 在浏览器中打开

# 方式二：启动本地静态服务器（推荐，浏览器 iframe 等能力更完整）
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
| `Ctrl/⌘ + Alt + ← / →` | 当前窗口左右分屏 |
| `Ctrl/⌘ + Alt + ↑` | 当前窗口最大化 / 还原 |
| `Alt + Tab` | 切换窗口 |
| `Esc` | 关闭开始菜单 / 通知中心 / 右键菜单 |

> 小技巧：拖动窗口到屏幕顶部可最大化，拖到左右边缘可自动分屏；右键桌面或文件可呼出上下文菜单。

## 📁 项目结构

```
.
├── index.html              # 系统外壳与桌面结构
├── assets/
│   └── logo.png            # 系统 LOGO
├── css/
│   ├── reset.css           # 基础重置
│   ├── theme.css           # 主题变量、壁纸、开机动画
│   ├── desktop.css         # 桌面、任务栏、开始菜单、通知中心
│   ├── window.css          # 窗口外观与动画
│   ├── apps.css            # 各应用样式
│   └── responsive.css      # 手机 / 平板 / 手表触屏适配
└── js/
    ├── core/
    │   ├── fs.js           # 虚拟文件系统（VFS，演示模式）
    │   ├── registry.js     # 应用注册表与通用工具
    │   ├── window.js       # 窗口管理器
    │   ├── desktop.js      # 桌面环境（图标 / 任务栏 / 开始菜单 / 通知）
    │   └── system.js       # 系统引导与全局设置
    └── apps/
        ├── browser.js      # 内置浏览器
        ├── files.js        # 文件管理器
        ├── terminal.js     # 终端
        ├── editor.js       # 文本编辑器
        ├── calculator.js   # 计算器
        ├── photos.js       # 图片查看器
        ├── media.js        # 媒体播放器
        ├── calendar.js     # 日历
        ├── notes.js        # 便签
        ├── settings.js     # 设置
        ├── about.js        # 关于本机
        ├── store.js        # 应用商店
        ├── weather.js      # 天气
        ├── code.js         # 代码编辑器
        └── office.js       # KevinOffice 办公套件
```

## 🧱 技术说明

- **无框架、无依赖**：全部为原生 Web 技术，便于阅读、二次开发与部署。
- **窗口管理**：`js/core/window.js` 负责窗口创建、焦点与 Z 序、拖拽、八向缩放、边缘吸附以及系统对话框。
- **数据持久化**：当前为**演示模式**，虚拟文件系统每次启动都会清空（`js/core/fs.js` 中 `PERSIST = false`），系统设置存储于 `localStorage` 的 `kevinos.settings.v1`。
- **多设备适配**：`index.html` 顶部的识别脚本根据 UA 与视口特征区分桌面 / 手机 / 平板 / 手表，写入 `<html data-device data-touch>`；`css/responsive.css` 据此调整布局与触屏交互。设备型号仅存于 `K.device.model`，不在界面展示。
- **浏览器应用**：外部站点通过 `<iframe>` 加载；受同源策略与 `X-Frame-Options` 限制的站点会被识别，并提供"在新窗口打开"的降级方案。
- **应用扩展**：新增应用只需在 `js/apps/` 下调用 `KevinOS.registerApp({ id, name, icon, gradient, mount(win, args) })`，并在 `index.html` 中引入脚本即可。

## 🗺️ 路线图

- [ ] 多桌面 / 虚拟工作区
- [ ] 窗口分组与贴靠布局
- [ ] 更多内置应用（音乐库、相册幻灯片、绘图板）
- [ ] 主题包与自定义 CSS 变量
- [ ] PWA 离线安装支持

## 📄 许可

MIT License · © 2026 KevinOS Project

---

<p align="center">用 HTML / CSS / JavaScript 构建 · Made with ❤️ for the Web</p>