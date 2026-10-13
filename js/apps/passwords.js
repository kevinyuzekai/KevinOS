/* ============================================================
 * KevinOS · 密码管理器（可安装应用，本地加密存储）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const STORE_KEY = 'kevinos-passwords';
  const ENC_KEY = 'kevinos-vault-2026';

  function xor(str, key) {
    let out = '';
    for (let i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    return out;
  }
  function loadVault() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      return JSON.parse(xor(atob(raw), ENC_KEY));
    } catch { return []; }
  }
  function saveVault(v) {
    try { localStorage.setItem(STORE_KEY, btoa(xor(JSON.stringify(v), ENC_KEY))); } catch (e) {}
  }

  K.registerApp({
    id: 'passwords', name: '密码管理', icon: 'settings', installable: true,
    gradient: ['#64748b', '#475569'], category: '安全',
    size: { w: 720, h: 560 },
    mount(win) {
      let vault = loadVault();
      const list = el('div', { class: 'pw-list' });
      const detail = el('div', { class: 'pw-detail' });

      function showDetail(i) {
        const item = vault[i];
        detail.innerHTML = '';
        const siteIn = el('input', { class: 'pw-input', value: item.site });
        const userIn = el('input', { class: 'pw-input', value: item.username });
        const passIn = el('input', { class: 'pw-input', type: 'password', value: item.password });
        const noteIn = el('textarea', { class: 'pw-input', rows: '3' });
        noteIn.value = item.note || '';

        const toggleBtn = el('button', { class: 'btn', text: '显示' });
        toggleBtn.addEventListener('click', () => {
          passIn.type = passIn.type === 'password' ? 'text' : 'password';
          toggleBtn.textContent = passIn.type === 'password' ? '显示' : '隐藏';
        });
        const copyBtn = el('button', { class: 'btn', text: '复制' });
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(item.password).then(() => K.desktop.notify({ title: '密码管理', body: '密码已复制', icon: 'settings' }));
        });
        const saveBtn = el('button', { class: 'btn primary', text: '保存' });
        saveBtn.addEventListener('click', () => {
          vault[i] = { site: siteIn.value, username: userIn.value, password: passIn.value, note: noteIn.value };
          saveVault(vault); renderList(); showDetail(i);
          K.desktop.notify({ title: '密码管理', body: '已保存', icon: 'settings' });
        });
        const delBtn = el('button', { class: 'btn', text: '删除' });
        delBtn.addEventListener('click', () => {
          if (confirm('确定删除该密码条目？')) { vault.splice(i, 1); saveVault(vault); renderList(); detail.innerHTML = ''; }
        });

        detail.append(
          el('label', { text: '网站/服务' }), siteIn,
          el('label', { text: '用户名' }), userIn,
          el('label', { text: '密码' }),
          el('div', { class: 'pw-pass-row' }, [passIn, toggleBtn, copyBtn]),
          el('label', { text: '备注' }), noteIn,
          el('div', { class: 'pw-actions' }, [saveBtn, delBtn])
        );
      }

      function renderList() {
        list.innerHTML = '';
        if (!vault.length) {
          list.appendChild(el('div', { class: 'pw-empty', text: '暂无密码条目，点击「添加」新建' }));
          return;
        }
        vault.forEach((item, i) => {
          const row = el('div', { class: 'pw-row' }, [
            el('span', { class: 'pw-site', text: item.site }),
            el('span', { class: 'pw-user', text: item.username })
          ]);
          row.addEventListener('click', () => showDetail(i));
          list.appendChild(row);
        });
      }

      const addBtn = el('button', { class: 'btn primary', text: '＋ 添加密码' });
      addBtn.addEventListener('click', () => {
        vault.push({ site: '新网站', username: '', password: '', note: '' });
        saveVault(vault); renderList(); showDetail(vault.length - 1);
      });

      const header = el('div', { class: 'pw-header' }, [el('h2', { text: '密码管理' }), addBtn]);
      const body = el('div', { class: 'pw-body' }, [list, detail]);
      const root = el('div', { class: 'app-col pw-root' }, [header, body]);
      win.body.appendChild(root);
      renderList();
    }
  });
})();
