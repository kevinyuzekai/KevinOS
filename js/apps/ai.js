/* ============================================================
 * KevinOS · AI 助手
 * 支持 OpenAI 兼容 / Anthropic 原生接口，含 Agent 模式（可操作系统）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const SET_KEY = 'kevinos.ai.settings.v1';
  const CHAT_KEY = 'kevinos.ai.chats.v1';

  /* ---------------- 服务商预设 ---------------- */
  const PROVIDERS = [
    { name: 'OpenAI', type: 'openai', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { name: 'DeepSeek', type: 'openai', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { name: 'Moonshot (Kimi)', type: 'openai', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    { name: 'Qwen (通义)', type: 'openai', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    { name: 'Zhipu (智谱 GLM)', type: 'openai', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    { name: 'OpenRouter', type: 'openai', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
    { name: 'SiliconFlow', type: 'openai', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
    { name: 'Ollama (本地)', type: 'openai', base: 'http://localhost:11434/v1', model: 'llama3.1' },
    { name: 'Anthropic', type: 'anthropic', base: 'https://api.anthropic.com', model: 'claude-3-5-haiku-latest' },
    { name: '自定义', type: 'openai', base: '', model: '' }
  ];

  const DEFAULT_SETTINGS = {
    provider: 'DeepSeek', apiType: 'openai', baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '', model: 'deepseek-chat',
    systemPrompt: '你是 KevinOS 的 AI 助手，回答简洁、准确、有帮助。',
    temperature: 0.7, agentMode: false
  };

  function loadSettings() {
    try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SET_KEY)) || {}); }
    catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }
  function saveSettings(s) { localStorage.setItem(SET_KEY, JSON.stringify(s)); }
  function loadChats() {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveChats(c) { localStorage.setItem(CHAT_KEY, JSON.stringify(c)); }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ================= Agent 工具集 ================= */
  const AGENT_TOOLS = [
    { type: 'function', function: {
      name: 'open_app', description: '打开一个应用',
      parameters: { type: 'object', properties: { app_id: { type: 'string', description: '应用 ID，如 files/browser/terminal/office/settings/ai/notes/calculator/photos/weather/code/about/store' } }, required: ['app_id'] }
    }},
    { type: 'function', function: {
      name: 'list_apps', description: '列出所有可用应用及其 ID', parameters: { type: 'object', properties: {} }
    }},
    { type: 'function', function: {
      name: 'list_dir', description: '列出目录内容',
      parameters: { type: 'object', properties: { path: { type: 'string', description: '目录路径，如 /Home/Desktop' } }, required: ['path'] }
    }},
    { type: 'function', function: {
      name: 'read_file', description: '读取文件内容',
      parameters: { type: 'object', properties: { path: { type: 'string', description: '文件路径' } }, required: ['path'] }
    }},
    { type: 'function', function: {
      name: 'write_file', description: '创建或覆盖写入文件',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
    }},
    { type: 'function', function: {
      name: 'create_dir', description: '创建目录',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    }},
    { type: 'function', function: {
      name: 'delete_file', description: '删除文件或目录',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    }},
    { type: 'function', function: {
      name: 'list_windows', description: '列出当前打开的窗口', parameters: { type: 'object', properties: {} }
    }},
    { type: 'function', function: {
      name: 'close_window', description: '关闭指定窗口',
      parameters: { type: 'object', properties: { window_id: { type: 'string', description: '窗口 ID，从 list_windows 获取' } }, required: ['window_id'] }
    }},
    { type: 'function', function: {
      name: 'set_wallpaper', description: '更换壁纸',
      parameters: { type: 'object', properties: { index: { type: 'integer', description: '壁纸序号（0-23）' } }, required: ['index'] }
    }},
    { type: 'function', function: {
      name: 'set_theme', description: '切换主题',
      parameters: { type: 'object', properties: { theme: { type: 'string', enum: ['dark', 'light'] } }, required: ['theme'] }
    }},
    { type: 'function', function: {
      name: 'notify', description: '发送系统通知',
      parameters: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'] }
    }},
    { type: 'function', function: {
      name: 'get_system_info', description: '获取系统信息（运行时间、主题、壁纸、音量等）', parameters: { type: 'object', properties: {} }
    }},
    { type: 'function', function: {
      name: 'sleep', description: '让系统进入睡眠（屏保）', parameters: { type: 'object', properties: {} }
    }}
  ];

  const AGENT_SYSTEM_PROMPT = '你是 KevinOS 的 AI 助手，运行在 Agent 模式下，可以调用工具操作系统。' +
    '可用工具包括：打开应用、读写文件、管理窗口、更换壁纸/主题、发送通知、获取系统信息等。' +
    '当用户请求涉及操作系统时，调用相应工具并根据结果回答。每次回复前先思考是否需要调用工具。' +
    '回答简洁，工具调用结果直接转述，不要编造。';

  async function executeTool(name, args) {
    try {
      switch (name) {
        case 'open_app':
          K.WM.open(args.app_id);
          return { ok: true, message: '已打开应用: ' + args.app_id };
        case 'list_apps':
          return K.apps.allApps().map(a => ({ id: a.id, name: a.name, category: a.category }));
        case 'list_dir': {
          const items = K.FS.list(args.path) || [];
          return items.map(n => ({ name: n.name, type: n.type }));
        }
        case 'read_file': {
          const r = K.FS.readFile(args.path);
          return r.ok ? { content: r.content } : { error: r.error };
        }
        case 'write_file': {
          const r = K.FS.writeFile(args.path, args.content || '');
          return r.ok ? { ok: true, message: '已写入: ' + args.path } : { error: r.error };
        }
        case 'create_dir': {
          const r = K.FS.mkdir(args.path);
          return r.ok ? { ok: true } : { error: r.error };
        }
        case 'delete_file': {
          const r = K.FS.remove(args.path);
          return r.ok ? { ok: true } : { error: r.error };
        }
        case 'list_windows':
          return K.WM.windows.map(w => ({ id: w.id, app: w.appId, title: w.app.name, focused: w.focused }));
        case 'close_window': {
          const w = K.WM.windows.find(x => x.id === args.window_id);
          if (w) { K.WM.close(w); return { ok: true }; }
          return { error: '窗口不存在' };
        }
        case 'set_wallpaper':
          K.system.setWallpaper(args.index);
          return { ok: true, message: '壁纸已切换' };
        case 'set_theme':
          K.system.setTheme(args.theme);
          return { ok: true, message: '主题已切换为 ' + args.theme };
        case 'notify':
          K.desktop.notify({ title: args.title, body: args.body });
          return { ok: true };
        case 'get_system_info':
          return {
            uptime: K.system.uptimeText(),
            theme: K.system.settings.theme,
            wallpaper: K.system.wallpapers[K.system.settings.wallpaper]?.name,
            volume: K.system.settings.volume,
            brightness: K.system.settings.brightness,
            open_windows: K.WM.windows.length
          };
        case 'sleep':
          K.system.sleep();
          return { ok: true };
        default:
          return { error: '未知工具: ' + name };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  /* ---------------- API 调用（普通流式） ---------------- */
  async function chatStream(settings, messages, onChunk, signal) {
    const { apiType, baseUrl, apiKey, model, systemPrompt, temperature } = settings;
    const msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    messages.forEach(m => msgs.push({ role: m.role, content: m.content }));

    if (apiType === 'anthropic') {
      const sys = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');
      const userMsgs = msgs.filter(m => m.role !== 'system');
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/v1/messages', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, messages: userMsgs, system: sys || undefined, max_tokens: 4096, stream: true, temperature })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim(); if (!data || data === '[DONE]') continue;
          try { const j = JSON.parse(data); if (j.type === 'content_block_delta' && j.delta && j.delta.text) onChunk(j.delta.text); } catch (e) {}
        }
      }
      return;
    }

    const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages: msgs, stream: true, temperature })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim(); if (!data || data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const delta = j.choices && j.choices[0] && j.choices[0].delta;
          if (delta && delta.content) onChunk(delta.content);
        } catch (e) {}
      }
    }
  }

  /* ---------------- Agent 模式：工具调用循环（非流式） ---------------- */
  async function agentChat(settings, messages, onChunk, onTool, signal) {
    const { apiType, baseUrl, apiKey, model, temperature } = settings;
    let msgs = [{ role: 'system', content: AGENT_SYSTEM_PROMPT }, ...messages.map(m => ({ role: m.role, content: m.content }))];

    for (let iter = 0; iter < 12; iter++) {
      if (signal.aborted) throw new Error('已停止');
      let assistantMsg;

      if (apiType === 'anthropic') {
        const sys = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');
        const userMsgs = msgs.filter(m => m.role !== 'system');
        const tools = AGENT_TOOLS.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }));
        const res = await fetch(baseUrl.replace(/\/$/, '') + '/v1/messages', {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model, messages: userMsgs, system: sys || undefined, max_tokens: 4096, tools, temperature })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
        const j = await res.json();
        const textParts = (j.content || []).filter(c => c.type === 'text');
        const toolParts = (j.content || []).filter(c => c.type === 'tool_use');
        assistantMsg = { role: 'assistant', content: textParts.map(p => p.text).join('') || '' };
        if (textParts.length && textParts[0].text) onChunk(textParts[0].text);

        if (toolParts.length) {
          msgs.push({ role: 'assistant', content: j.content });
          for (const tp of toolParts) {
            onTool && onTool(tp.name, tp.input);
            const result = await executeTool(tp.name, tp.input || {});
            msgs.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tp.id, content: JSON.stringify(result) }] });
          }
          continue;
        }
        return assistantMsg.content;

      } else {
        // OpenAI 兼容
        const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model, messages: msgs, tools: AGENT_TOOLS, temperature })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
        const j = await res.json();
        const msg = j.choices[0].message;
        assistantMsg = { role: 'assistant', content: msg.content || '' };

        if (msg.tool_calls && msg.tool_calls.length) {
          msgs.push({ role: 'assistant', content: msg.content, tool_calls: msg.tool_calls });
          for (const tc of msg.tool_calls) {
            let args = {};
            try { args = JSON.parse(tc.function.arguments); } catch (e) {}
            onTool && onTool(tc.function.name, args);
            const result = await executeTool(tc.function.name, args);
            msgs.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) });
          }
          continue;
        }
        if (msg.content) onChunk(msg.content);
        return msg.content || '';
      }
    }
    return '（已达到最大工具调用次数）';
  }

  /* ---------------- 应用 ---------------- */
  K.registerApp({
    id: 'ai', name: 'AI 助手', icon: 'about',
    gradient: ['#6D28D9', '#A78BFA'], pinned: true, category: '工具',
    size: { w: 900, h: 640 },
    mount(win) {
      let settings = loadSettings();
      let chats = loadChats();
      let activeId = chats[0] ? chats[0].id : null;
      let abortCtrl = null;

      const sidebar = el('div', { class: 'ai-side' });
      const chatArea = el('div', { class: 'ai-chat' });
      const root = el('div', { class: 'app-row ai-root' }, [sidebar, chatArea]);

      const newBtn = el('button', { class: 'ai-new-btn', html: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg> 新建对话' });
      newBtn.addEventListener('click', () => {
        const c = { id: uid(), title: '新对话', messages: [], time: Date.now() };
        chats.unshift(c); activeId = c.id; saveChats(chats); renderSidebar(); renderChat();
      });
      const listEl = el('div', { class: 'ai-chat-list' });
      sidebar.append(newBtn, listEl);

      function renderSidebar() {
        listEl.innerHTML = '';
        chats.forEach(c => {
          const item = el('div', { class: 'ai-chat-item' + (c.id === activeId ? ' active' : '') }, [
            el('span', { class: 'aci-title', text: c.title || '新对话' }),
            el('button', { class: 'aci-del', text: '×', title: '删除' })
          ]);
          item.querySelector('.aci-title').addEventListener('click', () => { activeId = c.id; renderSidebar(); renderChat(); });
          item.querySelector('.aci-del').addEventListener('click', e => {
            e.stopPropagation();
            chats = chats.filter(x => x.id !== c.id);
            if (activeId === c.id) activeId = chats[0] ? chats[0].id : null;
            saveChats(chats); renderSidebar(); renderChat();
          });
          listEl.appendChild(item);
        });
      }

      // —— 聊天区头部 ——
      const agentToggle = el('button', { class: 'ai-agent-toggle' + (settings.agentMode ? ' on' : ''), text: '🤖 Agent 模式' });
      agentToggle.addEventListener('click', () => {
        settings.agentMode = !settings.agentMode;
        agentToggle.classList.toggle('on', settings.agentMode);
        saveSettings(settings);
        renderChat();
      });
      const header = el('div', { class: 'ai-header' }, [
        el('span', { class: 'ai-title', text: 'AI 助手' }),
        agentToggle,
        el('div', { style: { flex: '1' } }),
        el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 2H9l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1L9 22h6l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13z"/></svg>', title: '设置' })
      ]);
      const settingsBtn = header.querySelectorAll('button')[1];
      const messagesEl = el('div', { class: 'ai-messages' });
      const inputWrap = el('div', { class: 'ai-input-wrap' });
      const input = el('textarea', { class: 'ai-input', placeholder: '输入消息…', rows: '1' });
      const sendBtn = el('button', { class: 'ai-send accent', html: '<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>' });
      const stopBtn = el('button', { class: 'ai-stop', text: '■ 停止', hidden: true });
      inputWrap.append(input, sendBtn, stopBtn);
      chatArea.append(header, messagesEl, inputWrap);

      function activeChat() { return chats.find(c => c.id === activeId); }

      function renderChat() {
        messagesEl.innerHTML = '';
        const c = activeChat();
        header.querySelector('.ai-title').textContent = c ? (c.title || '新对话') : 'AI 助手';
        if (!c || !c.messages.length) {
          const sub = settings.apiKey
            ? (settings.agentMode ? 'Agent 模式已开启 · 可操作系统' : '服务商：' + settings.provider + ' · 模型：' + settings.model)
            : '⚠️ 请先点击右上角设置填写 API Key';
          messagesEl.appendChild(el('div', { class: 'ai-empty' }, [
            el('div', { class: 'ai-empty-title', text: settings.agentMode ? 'Agent 模式' : '开始与 AI 对话' }),
            el('div', { class: 'ai-empty-sub', text: sub })
          ]));
          return;
        }
        c.messages.forEach(m => messagesEl.appendChild(renderMsg(m)));
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function renderMsg(m) {
        const wrap = el('div', { class: 'ai-msg ' + m.role });
        const bubble = el('div', { class: 'ai-bubble' });
        if (m.toolCalls) {
          const toolBox = el('div', { class: 'ai-tools' });
          m.toolCalls.forEach(tc => {
            const tcEl = el('div', { class: 'ai-tool-call' }, [
              el('span', { class: 'ai-tool-name', text: '🔧 ' + tc.name }),
              el('span', { class: 'ai-tool-args', text: JSON.stringify(tc.args) })
            ]);
            toolBox.appendChild(tcEl);
          });
          wrap.appendChild(toolBox);
        }
        if (m.content) bubble.textContent = m.content;
        const actions = el('div', { class: 'ai-msg-actions' });
        if (m.role === 'assistant' && m.content) {
          const copy = el('button', { class: 'ai-act', text: '复制' });
          copy.addEventListener('click', () => { navigator.clipboard.writeText(m.content); copy.textContent = '已复制'; setTimeout(() => copy.textContent = '复制', 1200); });
          actions.appendChild(copy);
        }
        if (m.content) wrap.appendChild(bubble);
        wrap.appendChild(actions);
        return wrap;
      }

      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      sendBtn.addEventListener('click', send);
      stopBtn.addEventListener('click', () => { if (abortCtrl) abortCtrl.abort(); });

      async function send() {
        const text = input.value.trim();
        if (!text || abortCtrl) return;
        let c = activeChat();
        if (!c) { c = { id: uid(), title: text.slice(0, 20), messages: [], time: Date.now() }; chats.unshift(c); activeId = c.id; }
        c.messages.push({ role: 'user', content: text });
        c.title = c.title === '新对话' ? text.slice(0, 20) : c.title;
        input.value = '';
        saveChats(chats); renderSidebar(); renderChat();

        if (!settings.apiKey) {
          c.messages.push({ role: 'assistant', content: '请先在设置中填写 API Key。' });
          saveChats(chats); renderChat(); return;
        }

        const assistantMsg = { role: 'assistant', content: '', toolCalls: [] };
        c.messages.push(assistantMsg);
        const bubbleEl = renderMsg(assistantMsg);
        messagesEl.appendChild(bubbleEl);
        const textEl = bubbleEl.querySelector('.ai-bubble');
        messagesEl.scrollTop = messagesEl.scrollHeight;

        sendBtn.hidden = true; stopBtn.hidden = false;
        abortCtrl = new AbortController();
        try {
          const onTool = (name, args) => {
            assistantMsg.toolCalls.push({ name, args });
            const tcEl = el('div', { class: 'ai-tool-call' }, [
              el('span', { class: 'ai-tool-name', text: '🔧 ' + name }),
              el('span', { class: 'ai-tool-args', text: JSON.stringify(args).slice(0, 80) })
            ]);
            bubbleEl.insertBefore(tcEl, textEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          };
          const onChunk = chunk => {
            assistantMsg.content += chunk;
            if (textEl) textEl.textContent = assistantMsg.content;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          };

          if (settings.agentMode) {
            await agentChat(settings, c.messages.slice(0, -1), onChunk, onTool, abortCtrl.signal);
          } else {
            await chatStream(settings, c.messages.slice(0, -1), onChunk, abortCtrl.signal);
          }
        } catch (err) {
          assistantMsg.content += '\n\n❌ 出错：' + (err.message || err);
          if (textEl) textEl.textContent = assistantMsg.content;
        } finally {
          abortCtrl = null;
          sendBtn.hidden = false; stopBtn.hidden = true;
          saveChats(chats); renderSidebar();
        }
      }

      // —— 设置面板 ——
      settingsBtn.addEventListener('click', openSettings);

      function openSettings() {
        const panel = el('div', { class: 'ai-settings-mask' });
        const dialog = el('div', { class: 'ai-settings' });
        const close = el('button', { class: 't-btn', text: '✕' });
        close.addEventListener('click', () => panel.remove());

        const provSel = el('select', { class: 'ai-input-field' });
        PROVIDERS.forEach(p => provSel.appendChild(el('option', { value: p.name, text: p.name })));
        provSel.value = settings.provider;

        const apiTypeSel = el('select', { class: 'ai-input-field' }, [
          el('option', { value: 'openai', text: 'OpenAI 兼容' }),
          el('option', { value: 'anthropic', text: 'Anthropic 原生' })
        ]);
        apiTypeSel.value = settings.apiType;

        const baseInput = el('input', { class: 'ai-input-field', type: 'text', value: settings.baseUrl });
        const keyInput = el('input', { class: 'ai-input-field', type: 'password', value: settings.apiKey, placeholder: 'sk-...' });
        const modelInput = el('input', { class: 'ai-input-field', type: 'text', value: settings.model });
        const sysInput = el('textarea', { class: 'ai-input-field', style: { minHeight: '70px' }, text: settings.systemPrompt });
        const tempInput = el('input', { class: 'ai-input-field', type: 'range', min: '0', max: '2', step: '0.1', value: String(settings.temperature) });
        const tempVal = el('span', { text: settings.temperature });
        const agentChk = el('input', { type: 'checkbox', checked: settings.agentMode });
        agentChk.addEventListener('change', () => { settings.agentMode = agentChk.checked; agentToggle.classList.toggle('on', settings.agentMode); });

        provSel.addEventListener('change', () => {
          const p = PROVIDERS.find(x => x.name === provSel.value);
          if (p) { apiTypeSel.value = p.type; baseInput.value = p.base; if (p.model) modelInput.value = p.model; }
        });
        tempInput.addEventListener('input', () => tempVal.textContent = tempInput.value);

        const row = (label, ctrl, hint) => el('div', { class: 'set-row' }, [
          el('div', { class: 'sr-main' }, [el('div', { class: 'sr-t', text: label }), hint ? el('div', { class: 'sr-d', text: hint }) : null]),
          ctrl
        ]);

        const form = el('div', { class: 'set-group' }, [
          row('服务商', provSel),
          row('接口类型', apiTypeSel),
          row('Base URL', baseInput),
          row('API Key', keyInput, '仅保存在本地浏览器'),
          row('模型', modelInput),
          row('系统提示词', sysInput),
          row('Agent 模式', el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [agentChk, el('span', { text: '允许 AI 调用工具操作系统' })]), '开启后 AI 可打开应用、读写文件、管理窗口等'),
          row('温度', el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [tempInput, tempVal]))
        ]);

        const saveBtn = el('button', { class: 't-btn accent', text: '保存' });
        saveBtn.addEventListener('click', () => {
          settings = {
            provider: provSel.value, apiType: apiTypeSel.value, baseUrl: baseInput.value.trim(),
            apiKey: keyInput.value.trim(), model: modelInput.value.trim(), systemPrompt: sysInput.value,
            temperature: +tempInput.value, agentMode: agentChk.checked
          };
          saveSettings(settings); panel.remove(); renderChat();
        });

        dialog.append(
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [el('div', { class: 'set-h1', text: 'AI 助手设置' }), close]),
          form,
          el('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' } }, [saveBtn])
        );
        panel.appendChild(dialog);
        panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
        win.body.appendChild(panel);
      }

      win.body.appendChild(root);
      renderSidebar(); renderChat();
    }
  });
})();
