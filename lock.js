'use strict';
/* Отключване: паролата се въвежда веднъж на телефон; после се пази само ключът, в този телефон. */
(() => {
  const SALT = 'lhsIarYKj2/DCvVirCpw+A==', ITER = 310000, LS = 'vk-key-1';
  const enc = new TextEncoder();
  const norm = s => s.normalize('NFC').toLowerCase().trim().replace(/[\s,_.–—-]+/g, '-');
  const unb64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  const b64 = u => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
  const ls = { get: () => { try { return localStorage.getItem(LS); } catch (e) { return null; } }, set: v => { try { localStorage.setItem(LS, v); } catch (e) {} }, del: () => { try { localStorage.removeItem(LS); } catch (e) {} } };
  let bin = null;
  const getBin = async () => {
    if (bin) return bin;
    const r = await fetch('app.bin'); if (!r.ok) throw new Error('net');
    return (bin = new Uint8Array(await r.arrayBuffer()));
  };
  async function derive(pw) {
    const base = await crypto.subtle.importKey('raw', enc.encode(norm(pw)), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(SALT), iterations: ITER }, base, 256));
  }
  async function open(raw) {
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const b = await getBin();
    if (String.fromCharCode(b[0], b[1], b[2]) !== 'VK1') throw new Error('format');
    const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(3, 15) }, key, b.slice(15));
    const json = await new Response(new Blob([p]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return { key, data: JSON.parse(json) };
  }
  function start(o) {
    window.__FK = o.key; window.__IMG = o.data.img;
    window.__forgetKey = () => { ls.del(); location.reload(); };
    document.getElementById('lock').remove();
    const s = document.createElement('script');
    s.src = URL.createObjectURL(new Blob([o.data.js], { type: 'text/javascript' }));
    document.body.appendChild(s);
  }
  const L = id => document.getElementById(id);
  function show(state, msg) {
    L('lock').dataset.state = state;
    L('lk-msg').textContent = msg || '';
    if (state === 'ask') setTimeout(() => L('lk-pw').focus(), 50);
  }
  async function boot() {
    if (!window.crypto?.subtle || !('DecompressionStream' in window)) { show('err', 'Отвори адреса в Chrome — този браузър не може да отключи приложението.'); return; }
    const saved = ls.get();
    if (saved) {
      try { start(await open(unb64(saved))); return; }
      catch (e) { if (e.message === 'net') { show('err', 'Няма интернет. Отвори адреса веднъж с интернет — после работи и без него.'); return; } ls.del(); }
    }
    show('ask');
  }
  L('lk-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = L('lk-pw').value; if (!norm(pw)) return;
    show('busy');
    try {
      const raw = await derive(pw), o = await open(raw);
      ls.set(b64(raw)); start(o);
    } catch (err) {
      if (err.message === 'net') show('ask', 'Няма интернет. Опитай пак с интернет.');
      else { show('ask', 'Грешна парола. Опитай пак.'); L('lk-pw').select(); }
    }
  });
  boot();
})();
