/* ============================================================
 * KevinOS · 应用注册表 & 通用工具
 * ============================================================ */
(function () {
  'use strict';

  const K = window.KevinOS = window.KevinOS || {};

  /* ---------------- 图标（内联 SVG，fill=currentColor） ---------------- */
  const ICONS = {
  files: '<path d="M5 2h14a1.5 1.5 0 0 1 1.5 1.5v17A1.5 1.5 0 0 1 19 22H5a1.5 1.5 0 0 1-1.5-1.5v-17A1.5 1.5 0 0 1 5 2zm1.5 3v4h11V5h-11zm0 6v4h11v-4h-11zm0 6v2.5h11V17h-11z"/>',  // 文件管理器 — 抽屉柜 + 把手
  settings: '<path d="M10.6 2h2.8l.4 2.3c.62.19 1.2.47 1.72.83l2.15-.88 1.4 2.43-1.77 1.53c.11.52.17 1.05.17 1.6s-.06 1.08-.17 1.6l1.77 1.53-1.4 2.43-2.15-.88c-.52.36-1.1.64-1.72.83l-.4 2.3h-2.8l-.4-2.3a6.6 6.6 0 0 1-1.72-.83l-2.15.88-1.4-2.43 1.77-1.53A7.7 7.7 0 0 1 8.5 12c0-.55.06-1.08.17-1.6L6.9 8.87l1.4-2.43 2.15.88c.52-.36 1.1-.64 1.72-.83L10.6 2zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',  // 设置 — 齿轮 + 悬浮内环
  store: '<path d="M4 3.5h16l1.3 4.9a3 3 0 0 1-5.8.3 3 3 0 0 1-5.8 0 3 3 0 0 1-5.8-.3L4 3.5zm1.4 8.6V20a1 1 0 0 0 1 1h11.2a1 1 0 0 0 1-1v-7.9a4.9 4.9 0 0 1-1.6.8V20h-3v-4.6a1.9 1.9 0 0 0-3.8 0V20h-3.2v-7.6a4.9 4.9 0 0 1-1.6-.8z"/>',  // 应用商店 — 遮阳篷店面 + 玻璃门
  about: '<path d="M4 3.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-6v2h3.4a1 1 0 0 1 0 2H6.6a1 1 0 0 1 0-2H10v-2H4A1.5 1.5 0 0 1 2.5 15V5A1.5 1.5 0 0 1 4 3.5zm1 2.5v8h14V6H5z"/>',  // 关于本机 — 显示器 + 屏内 i
  browser: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/>',  // Kevin 浏览器 — 地球仪 + 经纬线
  clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/>',  // 时钟 — 表盘 + 指针 + 高光弧
  terminal: '<path d="M3 4h18a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 21 20H3a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 3 4zm1.5 2v12h15V6h-15z"/>',  // 终端 — 终端窗 + 悬浮 >_
  code: '<path d="M9.2 6.6L4.4 12l4.8 5.4L7.9 18.9 2 12l5.9-6.9 1.3 1.5zm5.6 0l4.8 5.4-4.8 5.4 1.3 1.5L22 12l-5.9-6.9-1.3 1.5z"/>',  // 代码编辑器 — 尖括号 + 悬浮斜杠
  converter: '<path d="M3 6.4h11.1L10.5 2.9l1.5-1.4 7.9 6.3-7.9 6.3-1.5-1.4 3.6-3.1H3V6.4z"/>',  // 单位换算 — 双向箭头（实上虚下）
  qrcode: '<path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5z"/>',  // 二维码 — 定位角 + 散点
  weather: '<path d="M8 20.5a4.8 4.8 0 0 1-.5-9.56 6 6 0 0 1 11.44 1.7A3.9 3.9 0 0 1 17.6 20.5H8z"/>',  // 天气 — 云 + 露头太阳
  translate: '<path d="M5.4 13.2l3.6-7.4h2.4l3.6 7.4h-2.3l-.7-1.6H8.4l-.7 1.6H5.4zm4-3.4h1.9L10.7 7l-1.3 2.8z"/>',  // 翻译 — 气泡 + 大 A
  calculator: '<path d="M5.5 2h13A1.5 1.5 0 0 1 20 3.5v17a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-17A1.5 1.5 0 0 1 5.5 2zM6 5v4.5h12V5H6zm.7 7v2h2.2v-2H6.7zm3.7 0v2h2.2v-2h-2.2zm3.7 0v2h2.2v-2h-2.2zM6.7 15v2h2.2v-2H6.7zm3.7 0v2h2.2v-2h-2.2zm3.7 0v2h2.2v-2h-2.2z"/>',  // 计算器 — 竖机身 + 屏高光 + 键孔
  calendar: '<path d="M6.5 2h2v2h7V2h2a2 2 0 0 1 2 2v1.5h.5v15a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 20.5v-15H4.5V4a2 2 0 0 1 2-2zM5 8v12h14V8H5zm8.5 8h3v3h-3v-3z"/>',  // 日历 — 双吊环 + 日期格 + 今日块
  todo: '<path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm.5 5v2.2h12V7h-12zm0 4.9v2.2h12v-2.2h-12zm0 4.9v2.2h7v-2.2h-7z"/>',  // 待办 — 清单卡 + 悬浮大勾
  office: '<path d="M11 3h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 14h-8a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 11 3zm1 3v1.6h6V6h-6zm0 3.4V11h4V9.4h-4z"/>',  // KOffice — 三张叠放的纸
  editor: '<path d="M6 2.5h8.2L19 7.3V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5zm7.6 1.8V7.5H17l-3.4-3.2zM6.5 10v1.7h11V10h-11zm0 3.6v1.7h11v-1.7h-11zm0 3.6v1.7h7v-1.7h-7z"/>',  // 文本编辑器 — 竖页 + 折角 + 光标
  notes: '<path d="M4.5 4A1.5 1.5 0 0 1 6 2.5h12A1.5 1.5 0 0 1 19.5 4v10.6L14.6 20H6a1.5 1.5 0 0 1-1.5-1.5V4zm2 4v1.7h10V8h-10zm0 3.8v1.7h7v-1.7h-7z"/>',  // 便签 — 方签 + 翻角
  reader: '<path d="M11 5.3C9.2 4.2 7.1 3.6 4.9 3.6H3v15.1h2c2.2 0 4.3.6 6 1.7V5.3zm2 15.1c1.7-1.1 3.8-1.7 6-1.7h2V3.6h-1.9c-2.2 0-4.3.6-6.1 1.7v15.1z"/>',  // 阅读器 — 摊开的书
  media: '<path d="M4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13A2.5 2.5 0 0 1 4.5 3zM4 16.5v2h16v-2H4zm5-9.8v7.6l6-3.8-6-3.8z"/>',  // 媒体播放器 — 圆角屏 + 播放 + 进度
  music: '<path d="M10 3.4l9.6-1.9v3L12 6.2v8.9a4.1 4.1 0 1 1-2-3.5V3.4zm-2 12.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"/>',  // 音乐 — 音符 + 声波弧
  recorder: '<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h8A2.5 2.5 0 0 1 16.5 7v.9l3.1-1.9c.75-.45 1.7.08 1.7.96v9.08c0 .88-.95 1.4-1.7.96l-3.1-1.9v.9A2.5 2.5 0 0 1 14 19.5H6A2.5 2.5 0 0 1 3.5 17V7zm4.75 2.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5z"/>',  // 录屏 — 摄像机 + 镜头 + 录制点
  screenshot: '<path d="M3 8.5V5a2 2 0 0 1 2-2h3.5v2H5.5A.5.5 0 0 0 5 5.5V8.5H3zm12.5-5.5H19a2 2 0 0 1 2 2v3.5h-2V5.5a.5.5 0 0 0-.5-.5h-3.5V3zM3 15.5V19a2 2 0 0 0 2 2h3.5v-2H5.5a.5.5 0 0 1-.5-.5v-3H3zM21 15.5V19a2 2 0 0 1-2 2h-3.5v-2h3a.5.5 0 0 0 .5-.5v-3h2z"/>',  // 截图 — 取景四角 + 中心点
  passwords: '<path d="M14.5 2.5a7.5 7.5 0 0 0-6.9 10.4L2.5 18v3.5H6v-2.3h2.4v-2.4h2.2l-1-1a7.5 7.5 0 1 0 4.9-13.3zm0 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"/>',  // 密码管理 — 钥匙 + 悬浮钥匙孔
  archive: '<path d="M12 2.6l8.7 3.9v11L12 21.4l-8.7-3.9v-11L12 2.6zm0 2.4L7.1 7.3 12 9.6l4.9-2.3L12 5zm-6.7 4.9v7.2l4.7 2.1v-7.2L5.3 9.9zm13.4 0-4.7 2.1v7.2l4.7-2.1V9.9z"/>',  // 压缩解压 — 立体箱 + 拉链齿
  ai: '<path d="M10.6 1.6l2.1 5.6 5.6 2.1-5.6 2.1-2.1 5.6-2.1-5.6-5.6-2.1 5.6-2.1 2.1-5.6z"/>',  // AI 助手 — 大星 + 小伴星
  paint: '<path d="M11.5 2.5c-5.3 0-9.2 3.7-9.2 8.6 0 4.4 3.3 7.2 6.6 7.2 1.55 0 2.25-1 2.25-1.85 0-.8-.6-1.45-.6-2.25 0-1 .75-1.75 1.75-1.75h2c3.1 0 5.45-2.2 5.45-5.2 0-3.4-3.5-4.85-8.25-4.85zM6.3 10.1a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm2.9-3.3a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm5 0a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7z"/>',  // 画板 — 调色板 + 斜持画笔
  photos: '<path d="M3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13A1.5 1.5 0 0 1 3.5 4zM4.5 6.5v11h15v-11h-15z"/>',  // 图片查看器 — 单张横片 + 山与日
  gallery: '<path d="M3 3h8.2v8.2H3V3zm1.6 4.9l1.9-2.3 1.2 1.5 1.5-2 1.9 2.8H4.6z"/>',  // 相册 — 四宫格 + 首格山景
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>',  // 文件夹（桌面/下载） — 系统对象
  file: '<path d="M6 2.5h8.2L19 7.3V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5zm7.6 1.8V7.5H17l-3.4-3.2z"/>',  // 通用文件 — 折角空白页
  text: '<path d="M6 2.5h8.2L19 7.3V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5zm7.6 1.8V7.5H17l-3.4-3.2zM7.5 10.5v1.7h9v-1.7h-9zm0 3.8v1.7h6v-1.7h-6z"/>',  // 纯文本文件 — 折角页 + 两行字
  material: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/>',  // 透明效果（快捷设置） — 半填充圆（对比/通透）
    /* 以下为旧键，Pixel 定稿要求本轮不动：通用提示 / 深色模式 / 音频 / 文档 / 网络 */
    info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    image: '<path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 13.5l4.2-5.2 2.6 3.1 3-4 3.2 6.1H5z"/>',
    audio: '<path d="M12 3v11.6A3.5 3.5 0 1 0 14 18V7h4V3h-6z"/>',
    doc: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5z"/>',
    wifi: '<path d="M12 3C7.5 3 3.5 4.7.6 7.6l1.4 1.4C4.7 6.5 8.2 5 12 5s7.3 1.5 10 4l1.4-1.4C20.5 4.7 16.5 3 12 3zm0 4c-3 0-5.7 1.1-7.8 3l1.4 1.4C7.2 9.8 9.5 9 12 9s4.8.8 6.4 2.4l1.4-1.4C17.7 8.1 15 7 12 7zm0 4c-1.7 0-3.2.6-4.4 1.7l1.4 1.4c.8-.7 1.9-1.1 3-1.1s2.2.4 3 1.1l1.4-1.4C15.2 11.6 13.7 11 12 11zm0 4a2 2 0 0 0-1.4 3.4l1.4 1.6 1.4-1.6A2 2 0 0 0 12 15z"/>',
    'wifi-off': '<path d="M4.3 3 3 4.3l2.9 2.9C4.6 7.8 3.4 8.6 2.4 9.5L3.8 11c.9-.85 1.9-1.5 3-1.95L8.5 10.7C7.1 11.2 5.9 12 4.9 13.1l1.4 1.4c.8-.8 1.8-1.4 2.9-1.7l1.6 1.6c-.9.2-1.7.6-2.4 1.3l1.4 1.4c.6-.6 1.4-.9 2.2-.9l4 4L17 21.5l-3.6-3.6c-.4.2-.9.35-1.4.45V20a2 2 0 0 0 2.8 1.8l1.5-1.5c.7-.7 1.1-1.6 1.4-2.5l4.5 4.5 1.3-1.3L4.3 3zm7.7.05c-2.1 0-4.1.55-5.9 1.5l1.5 1.5A12 12 0 0 1 12 5c3.8 0 7.2 1.5 9.6 4l1.4-1.4C20.4 4.75 16.5 3 12 3.05z"/>',
  };

  /* ---------------- 副形表（双色剪影 · 方案 A） ----------------
   * 与 ICONS 平行、键同名：主形纯白进 ICONS，副形半透明白进这里。
   * 透明度写在 path 自己的 fill-opacity 上（0.25~0.7），CSS 一行都不用改 ——
   * 现有 .app-ico svg{fill:currentColor} 只覆盖 fill，不覆盖 fill-opacity。
   */
  const SUB_GLYPHS = {
  files: '<path d="M9.5 6.3h5v1.4h-5V6.3zm0 6h5v1.4h-5v-1.4zm0 6h5v1.4h-5v-1.4z" fill-opacity=".55"/>',
  settings: '<circle cx="12" cy="12" r="1.6" fill-opacity=".5"/>',
  store: '<path d="M10.6 15.3h2.8v1.5h-2.8v-1.5z" fill-opacity=".55"/>',
  about: '<path d="M11.1 7.3a.95.95 0 1 1 1.9 0 .95.95 0 0 1-1.9 0zM11.2 9.8h1.7v3.9h-1.7V9.8z" fill-opacity=".6"/>',
  browser: '<path d="M12 2.6c2.8 2.2 4.3 5.3 4.3 9.4s-1.5 7.2-4.3 9.4c-2.8-2.2-4.3-5.3-4.3-9.4s1.5-7.2 4.3-9.4zm0 3.2c-1.5 1.8-2.3 4-2.3 6.2s.8 4.4 2.3 6.2c1.5-1.8 2.3-4 2.3-6.2s-.8-4.4-2.3-6.2zM4.6 11.2h14.8v1.6H4.6v-1.6z" fill-opacity=".5"/>',
  clock: '<path d="M11.1 6.8h1.8v5.3h4.6v1.8h-6.4V6.8z" fill-opacity=".65"/><path d="M12 4.4a7.6 7.6 0 0 1 7.6 7.6h-1.9A5.7 5.7 0 0 0 12 6.3V4.4z" fill-opacity=".4"/>',
  terminal: '<path d="M6.4 8.4l3.5 3.15-3.5 3.15L5 13.4l2.2-1.85L5 9.7l1.4-1.3zm5.4 6.7h6v1.8h-6v-1.8z" fill-opacity=".6"/>',
  code: '<path d="M13.4 5.2l1.9.45-4.6 13-1.9-.45 4.6-13z" fill-opacity=".55"/>',
  converter: '<path d="M21 15.6H9.9l3.6-3.5-1.5-1.4L4.1 17l7.9 6.3 1.5-1.4-3.6-3.5H21v-2.8z" fill-opacity=".45"/>',
  qrcode: '<path d="M14 14h2.5v2.5H14V14zm5 0h2v2h-2v-2zm-5 5h2.5v2H14v-2zm5-2.5h2v4.5h-2v-4.5zm-2.5 2.5H18v2h-1.5v-2z" fill-opacity=".55"/>',
  weather: '<circle cx="8.2" cy="7.4" r="3.5" fill-opacity=".55"/>',
  translate: '<path d="M4 3h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.6V15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill-opacity=".45"/>',
  calculator: '<path d="M14 5.6h3.4v3.3H14V5.6z" fill-opacity=".5"/>',
  calendar: '<path d="M7.5 10.5h3v3h-3v-3zm6 0h3v3h-3v-3zm-6 5.5h3v3h-3v-3z" fill-opacity=".4"/>',
  todo: '<path d="M13.2 14.4l2.9 2.9 4.7-4.7 1.4 1.4-6.1 6.1-4.3-4.3 1.4-1.4z" fill-opacity=".6"/>',
  office: '<path d="M4 8.5h6v9.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 18V8.5z" fill-opacity=".35"/><path d="M7.5 5.5H13v9.5a2.5 2.5 0 0 1-2.5 2.5H10A2.5 2.5 0 0 1 7.5 15V5.5z" fill-opacity=".6"/>',
  editor: '<path d="M15.3 16.6h1.6v4.6h-1.6v-4.6z" fill-opacity=".7"/>',
  notes: '<path d="M14.9 19.9l.1-4.2a1 1 0 0 1 1-1l4.1-.1-5.2 5.3z" fill-opacity=".55"/>',
  reader: '<path d="M5.2 6.8h3.6v1.5H5.2V6.8zm0 3.3h3.6v1.5H5.2v-1.5zm10-3.3h3.6v1.5h-3.6V6.8zm0 3.3h3.6v1.5h-3.6v-1.5z" fill-opacity=".5"/>',
  media: '<path d="M4.8 17.2h6.4v.7H4.8v-.7z" fill-opacity=".7"/>',
  music: '<path d="M17.4 12.4a4.4 4.4 0 0 1 0 7.2" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"/>',
  recorder: '<circle cx="8.25" cy="12" r="1.5" fill-opacity=".7"/>',
  screenshot: '<circle cx="12" cy="12" r="2.4" fill-opacity=".6"/>',
  passwords: '<circle cx="14.5" cy="10" r="1.7" fill-opacity=".6"/>',
  archive: '<path d="M11.25 11.2h1.5v1.5h-1.5v-1.5zm0 2.6h1.5v1.5h-1.5v-1.5zm0 2.6h1.5v1.5h-1.5v-1.5z" fill-opacity=".6"/>',
  ai: '<path d="M18.4 13.6l.95 2.45 2.45.95-2.45.95-.95 2.45-.95-2.45-2.45-.95 2.45-.95.95-2.45z" fill-opacity=".6"/>',
  paint: '<path d="M15.4 15.2l4.2-4.2 2.3 2.3-4.2 4.2-3.2.9.9-3.2z" fill-opacity=".6"/>',
  photos: '<path d="M6 16l3.6-4.4 2.3 2.8 2.7-3.6 3.9 5.2H6z" fill-opacity=".7"/><circle cx="8.6" cy="9.4" r="1.6" fill-opacity=".7"/>',
  gallery: '<path d="M12.8 3H21v8.2h-8.2V3zM3 12.8h8.2V21H3v-8.2zm9.8 0H21V21h-8.2v-8.2z" fill-opacity=".45"/>',
  folder: '<path d="M3 9.5h18v1.5H3z" fill-opacity=".3"/>',
  file: '<path d="M7.5 11h9v6.5h-9V11z" fill-opacity=".25"/>',
  text: '<path d="M7.5 17.5h4.5v1.5H7.5v-1.5z" fill-opacity=".55"/>',
  material: '<path d="M12 4a8 8 0 0 1 0 16V4z" fill-opacity=".5"/>',
  };


  /* ---------------- 应用注册 ---------------- */
  const apps = new Map();
  const INSTALLED_KEY = 'kevinos-installed-apps';

  function getInstalled() {
    try { return JSON.parse(localStorage.getItem(INSTALLED_KEY)) || {}; } catch { return {}; }
  }
  function setInstalled(map) { localStorage.setItem(INSTALLED_KEY, JSON.stringify(map)); }

  function registerApp(def) {
    apps.set(def.id, Object.assign({ pinned: false, category: '其他', installable: false }, def));
  }
  function getApp(id) { return apps.get(id); }
  function allApps() { return Array.from(apps.values()); }
  function isInstalled(id) {
    const app = apps.get(id);
    if (!app) return false;
    if (!app.installable) return true;
    return !!getInstalled()[id];
  }
  function installApp(id) {
    const map = getInstalled();
    map[id] = true;
    setInstalled(map);
    window.dispatchEvent(new CustomEvent('kevinos:apps-changed', { detail: { id, action: 'install' } }));
  }
  function uninstallApp(id) {
    const map = getInstalled();
    delete map[id];
    setInstalled(map);
    window.dispatchEvent(new CustomEvent('kevinos:apps-changed', { detail: { id, action: 'uninstall' } }));
  }
  function installedApps() { return allApps().filter(a => isInstalled(a.id)); }

  /* ---------------- 应用图标渲染（双色剪影 · 定稿） ----------------
   * 主形纯白进 ICONS，副形半透明白进 SUB_GLYPHS（透明度写在 path 的 fill-opacity 上，
   * CSS 一行都不用改）。阈值：**容器短边 < 28px 只渲染主形**（20px 标题栏单色），
   * ≥28px 才注入副形（30px 通用小图标 / 42px 文件管理器行内 / 48 / 72 全部双色）。
   * ------------------------------------------------------------------ */
  const SUB_GLYPH_MIN_PX = 28;
  // 档位 → 容器短边 px。标题栏是 .app-ico.sm 但被 CSS 覆盖成 20px，
  // 类名分辨不出来，所以 window.js 走独立渲染路径、显式传第 3 个参数。
  const ICON_SIZE_BY_CLASS = { '': 48, lg: 56, fm: 42, sm: 30, xs: 20 };
  // 副形要压在主形下面的键（只有天气：太阳要在云的后面）
  const SUB_UNDER = new Set(['weather']);

  function appIconEl(app, cls, sizePx) {
    const el = document.createElement('div');
    const c = cls || '';
    el.className = 'app-ico' + (c ? ' ' + c : '');
    const g = app.gradient || ['#2C5AE0', '#4F7CFF'];
    el.style.background = `linear-gradient(145deg, ${g[0]}, ${g[1]})`;
    const px = sizePx || ICON_SIZE_BY_CLASS[c] || ICON_SIZE_BY_CLASS[''];
    const sub = (px >= SUB_GLYPH_MIN_PX && SUB_GLYPHS[app.icon]) ? SUB_GLYPHS[app.icon] : '';
    const main = ICONS[app.icon] || ICONS.info;
    if (sub) el.classList.add('has-sub');
    el.innerHTML = `<svg viewBox="0 0 24 24">${sub && SUB_UNDER.has(app.icon) ? sub + main : main + sub}</svg>`;
    return el;
  }

  function iconEl(name, color) {
    const span = document.createElement('span');
    span.className = 'app-ico sm';
    span.style.background = color || 'linear-gradient(145deg,#2C5AE0,#4F7CFF)';
    span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.about}</svg>`;
    return span;
  }

  /* ---------------- DOM 工具 ---------------- */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') node.className = props[k];
      else if (k === 'html') node.innerHTML = props[k];
      else if (k === 'text') node.textContent = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(node.style, props[k]);
      else if (k.startsWith('on') && typeof props[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else node.setAttribute(k, props[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function svgIcon(name, cls) {
    const span = el('span', { class: cls || 'ico' });
    span.innerHTML = `<svg viewBox="0 0 24 24" class="ico">${ICONS[name] || ''}</svg>`;
    return span;
  }

  function fmtSize(bytes) {
    if (bytes == null) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  K.ICONS = ICONS;
  K.apps = { registerApp, getApp, allApps, appIconEl, iconEl, isInstalled, installApp, uninstallApp, installedApps };
  K.registerApp = registerApp;
  K.util = { el, svgIcon, fmtSize, fmtTime };
})();