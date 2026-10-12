/* ============================================================
 * KevinOS · 终端
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  K.registerApp({
    id: 'terminal', name: '终端', icon: 'terminal',
    gradient: ['#0f172a', '#334155'], pinned: true, category: '系统',
    size: { w: 760, h: 480 },
    mount(win) {
      let cwd = '/Home';
      const history = [];
      let hIndex = -1;

      const out = el('div', { class: 'term' });
      const inputLine = el('div', { class: 'term-input-line' });
      const promptEl = el('span', { class: 'term-prompt' });
      const input = el('input', { class: 'term-input', type: 'text', autocomplete: 'off', spellcheck: 'false' });
      inputLine.append(promptEl, input);
      out.appendChild(inputLine);
      out.style.paddingBottom = '14px';

      function promptStr() {
        return `<span class="p-user">kevin</span><span class="term-dim">@</span><span class="p-path">kevinos</span><span class="term-dim">:</span><span class="p-path">${cwd}</span><span class="term-dim">$</span> `;
      }
      function updatePrompt() { promptEl.innerHTML = promptStr(); }

      function print(html, cls) {
        const line = el('div', { class: 'term-line ' + (cls || ''), html });
        out.insertBefore(line, inputLine);
        out.scrollTop = out.scrollHeight;
      }
      function printText(text, cls) { print(escapeHtml(text), cls); }
      function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

      const fileList = path => (FS.list(path) || []);

      /* ---------- 命令表 ---------- */
      const CMDS = {
        help() {
          printText('KevinOS Shell — 可用命令：', 'term-dim');
          const rows = [
            ['help', '显示此帮助'], ['ls [路径]', '列出目录内容'], ['cd <路径>', '切换目录'],
            ['pwd', '显示当前路径'], ['cat <文件>', '查看文件内容'], ['mkdir <名称>', '新建文件夹'],
            ['touch <文件>', '新建空文件'], ['echo <文本> > <文件>', '写入文件'],
            ['rm <路径>', '删除文件/文件夹'], ['cp <源> <目标目录>', '复制'], ['mv <源> <目标目录>', '移动'],
            ['tree [路径]', '树形展示'], ['wc <文件>', '统计行/词/字符'], ['head <文件>', '查看前 10 行'],
            ['open <应用>', '启动应用'], ['apps', '列出所有应用'], ['theme <light|dark>', '切换主题'],
            ['accent <颜色>', '切换强调色'], ['wall <n>', '切换壁纸'], ['neofetch', '系统信息'],
            ['date', '当前时间'], ['whoami', '当前用户'], ['clear', '清屏'], ['history', '命令历史'], ['reset', '重置文件系统']
          ];
          rows.forEach(([c, d]) => print(`  <span class="term-ok">${c.padEnd(26, ' ').replace(/ /g, '&nbsp;')}</span><span class="term-dim">${d}</span>`));
        },
        ls(args) {
          const p = args[0] ? FS.normalize(args[0].startsWith('/') ? args[0] : cwd + '/' + args[0]) : cwd;
          const items = fileList(p);
          if (!items) return printText('ls: 无法访问 ' + p, 'term-err');
          if (!items.length) return printText('（空目录）', 'term-dim');
          const nl = items.map(i => i.type === 'folder'
            ? `<span class="p-path">${escapeHtml(i.name)}/</span>`
            : escapeHtml(i.name));
          print(nl.join('&nbsp;&nbsp;&nbsp;'));
        },
        cd(args) {
          const t = args[0] || '/Home';
          const p = FS.normalize(t.startsWith('/') ? t : cwd + '/' + t);
          const n = FS.resolve(p);
          if (!n || n.type !== 'folder') return printText('cd: 目录不存在: ' + t, 'term-err');
          cwd = p === '/' ? '/' : p; updatePrompt();
        },
        pwd() { printText(cwd); },
        cat(args) {
          if (!args[0]) return printText('cat: 缺少文件名', 'term-err');
          const c = FS.readFile(FS.normalize(cwd + '/' + args[0]));
          if (c == null) return printText('cat: 无法读取 ' + args[0], 'term-err');
          printText(c);
        },
        mkdir(args) {
          if (!args[0]) return printText('mkdir: 缺少名称', 'term-err');
          const r = FS.mkdir(cwd + '/' + args[0]);
          printText(r.ok ? `已创建文件夹 ${args[0]}` : 'mkdir: ' + r.error, r.ok ? 'term-ok' : 'term-err');
        },
        touch(args) {
          if (!args[0]) return printText('touch: 缺少文件名', 'term-err');
          FS.writeFile(cwd + '/' + args[0], '');
          printText(`已创建 ${args[0]}`, 'term-ok');
        },
        rm(args) {
          if (!args[0]) return printText('rm: 缺少路径', 'term-err');
          const r = FS.remove(FS.normalize(cwd + '/' + args[0]));
          printText(r.ok ? '已删除' : 'rm: ' + r.error, r.ok ? 'term-ok' : 'term-err');
        },
        cp(args) {
          if (args.length < 2) return printText('用法: cp <源> <目标目录>', 'term-err');
          const r = FS.copy(FS.normalize(cwd + '/' + args[0]), FS.normalize(cwd + '/' + args[1]));
          printText(r.ok ? '已复制' : 'cp: ' + r.error, r.ok ? 'term-ok' : 'term-err');
        },
        mv(args) {
          if (args.length < 2) return printText('用法: mv <源> <目标目录>', 'term-err');
          const r = FS.move(FS.normalize(cwd + '/' + args[0]), FS.normalize(cwd + '/' + args[1]));
          printText(r.ok ? '已移动' : 'mv: ' + r.error, r.ok ? 'term-ok' : 'term-err');
        },
        tree(args) {
          const p = args[0] ? FS.normalize(args[0].startsWith('/') ? args[0] : cwd + '/' + args[0]) : cwd;
          print(`<span class="p-path">${escapeHtml(p)}</span>`);
          (function walk(path, prefix) {
            const items = fileList(path) || [];
            items.forEach((it, i) => {
              const last = i === items.length - 1;
              print(escapeHtml(prefix + (last ? '└── ' : '├── ')) + (it.type === 'folder' ? `<span class="p-path">${escapeHtml(it.name)}/</span>` : escapeHtml(it.name)));
              if (it.type === 'folder') walk(FS.normalize(path + '/' + it.name), prefix + (last ? '    ' : '│   '));
            });
          })(p, '');
        },
        wc(args) {
          if (!args[0]) return printText('wc: 缺少文件名', 'term-err');
          const c = FS.readFile(FS.normalize(cwd + '/' + args[0]));
          if (c == null) return printText('wc: 无法读取', 'term-err');
          const lines = c ? c.split('\n').length : 0;
          const words = c.trim() ? c.trim().split(/\s+/).length : 0;
          printText(`${lines} 行  ${words} 词  ${c.length} 字符`);
        },
        head(args) {
          if (!args[0]) return printText('head: 缺少文件名', 'term-err');
          const c = FS.readFile(FS.normalize(cwd + '/' + args[0]));
          if (c == null) return printText('head: 无法读取', 'term-err');
          printText(c.split('\n').slice(0, 10).join('\n'));
        },
        echo(args, raw) {
          const m = raw.match(/^echo\s+([\s\S]*?)\s*>\s*(\S+)\s*$/);
          if (m) {
            const text = stripQuotes(m[1]);
            FS.writeFile(cwd + '/' + m[2], text);
            return printText(`已写入 ${m[2]}`, 'term-ok');
          }
          printText(stripQuotes(raw.replace(/^echo\s*/, '')));
        },
        open(args) {
          if (!args[0]) return printText('用法: open <应用ID>，如 open browser', 'term-err');
          const app = K.apps.getApp(args[0]);
          if (!app) return printText('未找到应用: ' + args[0], 'term-err');
          K.WM.open(args[0]);
          printText('正在启动 ' + app.name + '…', 'term-ok');
        },
        apps() {
          K.apps.allApps().forEach(a => print(`  <span class="term-ok">${a.id.padEnd(12, ' ').replace(/ /g, '&nbsp;')}</span><span class="term-dim">${a.name}</span>`));
        },
        theme(args) {
          const t = (args[0] || '').toLowerCase();
          if (!['light', 'dark'].includes(t)) return printText('用法: theme light|dark', 'term-err');
          K.system.setTheme(t); printText('主题已切换为 ' + t, 'term-ok');
        },
        accent(args) {
          const list = ['blue', 'violet', 'green', 'pink', 'orange'];
          const a = (args[0] || '').toLowerCase();
          if (!list.includes(a)) return printText('用法: accent ' + list.join('|'), 'term-err');
          K.system.setAccent(a); printText('强调色已切换为 ' + a, 'term-ok');
        },
        wall(args) {
          const n = parseInt(args[0], 10);
          if (isNaN(n)) return printText('用法: wall <编号 0-' + (K.system.wallpapers.length - 1) + '>', 'term-err');
          K.system.setWallpaper(n); printText('壁纸已切换', 'term-ok');
        },
        date() { printText(new Date().toLocaleString('zh-CN')); },
        whoami() { printText('kevin'); },
        clear() { out.querySelectorAll('.term-line').forEach(n => n.remove()); },
        history() { history.forEach((h, i) => print(`  <span class="term-dim">${i + 1}</span>  ${escapeHtml(h)}`)); },
        neofetch() {
          const u = FS.usage();
          const logo = [
            '   ▄▄▄▄▄▄   ',
            '  █  ▄▄  █  ',
            '  █ █  █ █  ',
            '  █ █▄▄█ █  ',
            '  █      █  ',
            '   ▀▀▀▀▀▀   '
          ];
          const info = [
            '<span class="term-ok">kevin</span>@<span class="term-ok">kevinos</span>',
            '<span class="term-dim">-----------------</span>',
            '<span class="term-ok">OS</span>: KevinOS 1.0 “Navy”',
            '<span class="term-ok">Kernel</span>: KevinKernel 5.1-web',
            '<span class="term-ok">Shell</span>: ksh 1.0',
            '<span class="term-ok">Resolution</span>: ' + window.innerWidth + 'x' + window.innerHeight,
            '<span class="term-ok">Theme</span>: ' + K.system.getTheme(),
            '<span class="term-ok">Files</span>: ' + u.files + '  ·  文件夹: ' + u.folders,
            '<span class="term-ok">Uptime</span>: ' + K.system.uptimeText()
          ];
          const rows = Math.max(logo.length, info.length);
          for (let i = 0; i < rows; i++) {
            print(`<span class="p-path">${escapeHtml((logo[i] || '             '))}</span>  ${info[i] || ''}`);
          }
        },
        reset: async function () {
          const ok = await K.WM.UI.confirm('确定要重置整个文件系统吗？此操作不可撤销。', '重置文件系统', { danger: true, okText: '重置' });
          if (ok) { FS.reset(); cwd = '/Home'; updatePrompt(); printText('文件系统已重置。', 'term-ok'); }
        },
        exit() { printText('再见 👋', 'term-dim'); setTimeout(() => win.close(), 500); }
      };

      function stripQuotes(s) { s = s.trim(); if ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'"))) return s.slice(1, -1); return s; }

      function exec(raw) {
        raw = raw.trim();
        if (!raw) return;
        history.push(raw); hIndex = history.length;
        print(`<span class="p-user">kevin@kevinos</span><span class="term-dim">:</span><span class="p-path">${cwd}</span><span class="term-dim">$</span> ${escapeHtml(raw)}`, 'in');
        const parts = raw.split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);
        if (CMDS[cmd]) { try { CMDS[cmd](args, raw); } catch (e) { printText('错误: ' + e.message, 'term-err'); } }
        else printText(`${cmd}: 未找到命令。输入 help 查看帮助`, 'term-err');
        out.scrollTop = out.scrollHeight;
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { exec(input.value); input.value = ''; }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIndex > 0) { hIndex--; input.value = history[hIndex] || ''; } }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex] || ''; } else { hIndex = history.length; input.value = ''; } }
        else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); CMDS.clear(); }
      });

      out.addEventListener('click', () => input.focus());

      win.body.appendChild(out);
      printText('KevinOS Shell (ksh) 1.0', 'term-ok');
      printText('输入 help 查看可用命令。', 'term-dim');
      print('');
      updatePrompt();
      setTimeout(() => input.focus(), 100);
    }
  });
})();