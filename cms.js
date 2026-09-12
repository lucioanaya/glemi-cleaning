(() => {
  const cfg = window.GLEMI_SUPABASE;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.url, cfg.key);
  const page = (() => {
    const p = location.pathname.split('/').pop();
    return (!p || p === '') ? 'index.html' : p;
  })();
  const editMode = new URLSearchParams(location.search).get('glemi_editor') === '1';

  const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
  function domKey(el) {
    if (el.id) return `#${el.id}`;
    const parts = [];
    let n = el;
    while (n && n !== document.body) {
      let i = 1, s = n;
      while ((s = s.previousElementSibling)) if (s.tagName === n.tagName) i++;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${i})`);
      n = n.parentElement;
    }
    return `body>${parts.join('>')}`;
  }
  function resolve(key) {
    try { return document.querySelector(key.startsWith('#') ? key : key); } catch { return null; }
  }
  function editableType(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return 'image';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return 'placeholder';
    if (el.tagName === 'A' && el.children.length === 0) return 'link';
    const tags = ['H1','H2','H3','H4','H5','H6','P','SPAN','LI','BUTTON','LABEL','STRONG','B','SMALL','DIV'];
    if (tags.includes(el.tagName) && el.children.length === 0 && el.textContent.trim()) return 'text';
    return null;
  }
  function valueFor(el, type) {
    if (type === 'image') return {value: el.getAttribute('src') || '', extra: el.getAttribute('alt') || ''};
    if (type === 'placeholder') return {value: el.getAttribute('placeholder') || '', extra: ''};
    if (type === 'link') return {value: el.textContent.trim(), extra: el.getAttribute('href') || ''};
    return {value: el.textContent.trim(), extra: ''};
  }
  function applyOne(row) {
    const el = resolve(row.element_key);
    if (!el) return;
    if (row.content_type === 'image') {
      if (row.value) el.setAttribute('src', row.value);
      if (row.extra_value != null) el.setAttribute('alt', row.extra_value);
    } else if (row.content_type === 'placeholder') {
      el.setAttribute('placeholder', row.value || '');
    } else if (row.content_type === 'link') {
      el.textContent = row.value || '';
      if (row.extra_value != null) el.setAttribute('href', row.extra_value || '#');
    } else {
      el.textContent = row.value || '';
    }
  }
  async function loadOverrides() {
    const { data } = await sb.from('site_content').select('*').eq('page', page);
    (data || []).forEach(applyOne);
  }
  function installEditor() {
    document.documentElement.classList.add('glemi-edit-mode');
    const style = document.createElement('style');
    style.textContent = `
      .glemi-edit-mode [data-glemi-editable="1"]{cursor:pointer!important;outline:1px dashed transparent;outline-offset:3px;transition:outline .12s,box-shadow .12s}
      .glemi-edit-mode [data-glemi-editable="1"]:hover{outline:2px solid #2f6fed!important;box-shadow:0 0 0 4px rgba(47,111,237,.12)!important}
      .glemi-edit-selected{outline:3px solid #f59e0b!important;box-shadow:0 0 0 5px rgba(245,158,11,.16)!important}
      .glemi-editor-badge{position:fixed;right:14px;bottom:14px;z-index:999999;background:#0f172a;color:white;padding:9px 12px;border-radius:999px;font:700 12px/1 system-ui;box-shadow:0 8px 30px #0003}
    `;
    document.head.appendChild(style);
    const badge = document.createElement('div'); badge.className='glemi-editor-badge'; badge.textContent='GLEMI · Edit mode'; document.body.appendChild(badge);
    document.querySelectorAll('body *').forEach(el => {
      if (el.closest('.glemi-editor-badge')) return;
      const type = editableType(el); if (!type) return;
      el.dataset.glemiEditable='1'; el.dataset.glemiKey=domKey(el); el.dataset.glemiType=type;
    });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-glemi-editable="1"]');
      if (!el) return;
      e.preventDefault(); e.stopPropagation();
      document.querySelectorAll('.glemi-edit-selected').forEach(x=>x.classList.remove('glemi-edit-selected'));
      el.classList.add('glemi-edit-selected');
      const type=el.dataset.glemiType, vals=valueFor(el,type);
      parent.postMessage({source:'glemi-cms',action:'select',page,key:el.dataset.glemiKey,type,tag:el.tagName.toLowerCase(),value:vals.value,extra:vals.extra}, location.origin);
    }, true);
    document.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); }, true);
    window.addEventListener('message', e => {
      if (e.origin !== location.origin || e.data?.source !== 'glemi-admin') return;
      if (e.data.action === 'refresh') loadOverrides();
    });
  }
  loadOverrides().finally(() => { if (editMode) installEditor(); });
})();
