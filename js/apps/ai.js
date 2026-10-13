/* ============================================================
 * KevinOS · AI 助手
 * 支持 OpenAI 兼容接口与 Anthropic 原生接口，用户自行填写 API Key
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
    provider: 'DeepSeek',
    apiType: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    systemPrompt: '你是 KevinOS 的 AI 助手，回答简洁、准确、有帮助。',
    temperature: 0.7
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

  /* ---------------- API 调用 ---------------- */
  async function chatStream(settings, messages, onChunk, signal) {
    const { apiType, baseUrl, apiKey, model, systemPrompt, temperature } = settings;
    const msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    messages.forEach(m => msgs.push({ role: m.role, content: m.content }));

    if (apiType === 'anthropic') {
      // Anthropic 原生接口（system 单独字段）
      const sys = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');
      const userMsgs = msgs.filter(m => m.role !== 'system');
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model, messages: userMsgs, system: sys || undefined,
          max_tokens: 4096, stream: true, temperature
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            if (j.type === 'content_block_delta' && j.delta && j.delta.text) onChunk(j.delta.text);
          } catch (e) {}
        }
      }
      return;
    }

    // OpenAI 兼容接口
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages: msgs, stream: true, temperature })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const delta = j.choices && j.choices[0] && j.choices[0].delta;
          if (delta && delta.content) onChunk(delta.content);
        } catch (e) {}
      }
    }
  }

  /* ---------------- 应用 ---------------- */
  K.registerApp({
    id: 'ai', name: 'AI 助手', icon: 'about',
    gradient: ['#7c3aed', '#a855f7'], pinned: true, category: '工具',
    size: { w: 880, h: 620 },
    mount(win) {
      let settings = loadSettings();
      let chats = loadChats();
      let activeId = chats[0] ? chats[0].id : null;
      let abortCtrl = null;

      const sidebar = el('div', { class: 'ai-side' });
      const chatArea = el('div', { class: 'ai-chat' });
      const root = el('div', { class: 'app-row ai-root' }, [sidebar, chatArea]);

      // —— 侧栏 ——
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

      // —— 聊天区 ——
      const header = el('div', { class: 'ai-header' }, [
        el('span', { class: 'ai-title', text: 'AI 助手' }),
        el('div', { style: { flex: '1' } }),
        el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 2H9l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1L9 22h6l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13z"/></svg>', title: '设置' })
      ]);
      const settingsBtn = header.querySelector('button');
      const messagesEl = el('div', { class: 'ai-messages' });
      const inputWrap = el('div', { class: 'ai-input-wrap' });
      const input = el('textarea', { class: 'ai-input', placeholder: '输入消息，Enter 发送，Shift+Enter 换行…', rows: '1' });
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
          const empty = el('div', { class: 'ai-empty' }, [
            el('div', { class: 'ai-empty-title', text: '开始与 AI 对话' }),
            el('div', { class: 'ai-empty-sub', text: settings.apiKey ? '服务商：' + settings.provider + ' · 模型：' + settings.model : '⚠️ 请先点击右上角设置填写 API Key' })
          ]);
          messagesEl.appendChild(empty);
          return;
        }
        c.messages.forEach(m => messagesEl.appendChild(renderMsg(m)));
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function renderMsg(m) {
        const wrap = el('div', { class: 'ai-msg ' + m.role });
        const bubble = el('div', { class: 'ai-bubble', text: m.content || '' });
        const actions = el('div', { class: 'ai-msg-actions' });
        if (m.role === 'assistant' && m.content) {
          const copy = el('button', { class: 'ai-act', text: '复制' });
          copy.addEventListener('click', () => { navigator.clipboard.writeText(m.content); copy.textContent = '已复制'; setTimeout(() => copy.textContent = '复制', 1200); });
          actions.appendChild(copy);
        }
        wrap.append(bubble, actions);
        return wrap;
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
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

        // 添加空 assistant 消息用于流式填充
        const assistantMsg = { role: 'assistant', content: '' };
        c.messages.push(assistantMsg);
        const bubbleEl = renderMsg(assistantMsg);
        messagesEl.appendChild(bubbleEl);
        const textEl = bubbleEl.querySelector('.ai-bubble');
        messagesEl.scrollTop = messagesEl.scrollHeight;

        sendBtn.hidden = true; stopBtn.hidden = false;
        abortCtrl = new AbortController();
        try {
          await chatStream(settings, c.messages.slice(0, -1), chunk => {
            assistantMsg.content += chunk;
            textEl.textContent = assistantMsg.content;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }, abortCtrl.signal);
        } catch (err) {
          assistantMsg.content += '\n\n❌ 出错：' + (err.message || err);
          textEl.textContent = assistantMsg.content;
        } finally {
          abortCtrl = null;
          sendBtn.hidden = false; stopBtn.hidden = true;
          saveChats(chats);
          renderSidebar();
        }
      }

      // —— 设置面板 ——
      settingsBtn.addEventListener('click', () => openSettings());

      function openSettings() {
        const panel = el('div', { class: 'ai-settings-mask' });
        const dialog = el('div', { class: 'ai-settings' });
        const title = el('div', { class: 'set-h1', text: 'AI 助手设置' });
        const close = el('button', { class: 't-btn', text: '✕' });
        close.addEventListener('click', () => panel.remove());

        // 服务商
        const provSel = el('select', { class: 'ai-input-field' });
        PROVIDERS.forEach(p => provSel.appendChild(el('option', { value: p.name, text: p.name })));
        provSel.value = settings.provider;

        const apiTypeSel = el('select', { class: 'ai-input-field' }, [
          el('option', { value: 'openai', text: 'OpenAI 兼容' }),
          el('option', { value: 'anthropic', text: 'Anthropic 原生' })
        ]);
        apiTypeSel.value = settings.apiType;

        const baseInput = el('input', { class: 'ai-input-field', type: 'text', value: settings.baseUrl, placeholder: 'https://...' });
        const keyInput = el('input', { class: 'ai-input-field', type: 'password', value: settings.apiKey, placeholder: 'sk-...' });
        const modelInput = el('input', { class: 'ai-input-field', type: 'text', value: settings.model, placeholder: '模型名称' });
        const sysInput = el('textarea', { class: 'ai-input-field', style: { minHeight: '70px' }, text: settings.systemPrompt });
        const tempInput = el('input', { class: 'ai-input-field', type: 'range', min: '0', max: '2', step: '0.1', value: String(settings.temperature) });
        const tempVal = el('span', { text: settings.temperature });

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
          row('Base URL', baseInput, '服务商的 API 根地址'),
          row('API Key', keyInput, '仅保存在本地浏览器'),
          row('模型', modelInput),
          row('系统提示词', sysInput),
          row('温度', el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [tempInput, tempVal]), '越高越随机')
        ]);

        const saveBtn = el('button', { class: 't-btn accent', text: '保存' });
        saveBtn.addEventListener('click', () => {
          settings = {
            provider: provSel.value,
            apiType: apiTypeSel.value,
            baseUrl: baseInput.value.trim(),
            apiKey: keyInput.value.trim(),
            model: modelInput.value.trim(),
            systemPrompt: sysInput.value,
            temperature: +tempInput.value
          };
          saveSettings(settings);
          panel.remove();
          renderChat();
        });

        dialog.append(
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [title, close]),
          form,
          el('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' } }, [saveBtn])
        );
        panel.appendChild(dialog);
        panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
        win.body.appendChild(panel);
      }

      win.body.appendChild(root);
      renderSidebar();
      renderChat();
    }
  });
})();
