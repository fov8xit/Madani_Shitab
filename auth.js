/* =========================================================================
   Authentication
   ========================================================================= */
const AUTH = {
  async login(e) {
    e.preventDefault();
    if (Date.now() < lock) return toast(LANG === 'fa' ? 'چند بار اشتباه؛ ۳۰ ثانیه صبر کنید' : 'Too many attempts; wait 30s', 'bad');
    const f = fd(e);
    const username = f.username.trim();

    if (USE_SERVER) {
      try {
        const res = await api.login(username, f.password, f.role);
        if (!res) return toast(t('wrongCreds'), 'bad');
        if (res.otpRequired) {
          otpPending = { user: res.user, bootstrap: res.bootstrap, code: res.otpDemo };
          render();
          toast(LANG === 'fa' ? 'کد ارسال شد (دمو: ' + res.otpDemo + ')' : 'Code sent (demo: ' + res.otpDemo + ')', 'info');
          return;
        }
        me = res.user;
        db = res.bootstrap || db;
        save();
        (f.remember ? localStorage : sessionStorage).setItem('u', me.id);
        localStorage.setItem('parto_role', me.role);
        page = location.hash.slice(1) || 'dash';
        wsConnect();
        audit('login', '', '');
        render();
        return toast(t('welcome') + ' ' + me.name, 'ok');
      } catch (err) { return toast('API: ' + err.message, 'bad'); }
    }

    const u = db.users.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u) { if (++fails >= 5) { lock = Date.now() + 3e4; fails = 0 } return toast(t('wrongCreds'), 'bad') }
    if (u.role !== f.role) { if (++fails >= 5) { lock = Date.now() + 3e4; fails = 0 } return toast(t('roleMismatch'), 'bad') }
    if (await hp(f.password, u.salt) === u.hash) {
      fails = 0;
      const tfa = db.settings && db.settings.twoFA && db.settings.twoFA[u.role];
      if (tfa) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        otpPending = { user: u, code, remember: f.remember };
        toast((LANG === 'fa' ? 'کد دمو: ' : 'Demo code: ') + code, 'info');
        render();
        return;
      }
      me = u;
      attDraft = {}; gradeDraft = []; chatCache = {};
      (f.remember ? localStorage : sessionStorage).setItem('u', u.id);
      localStorage.setItem('parto_role', u.role);
      page = location.hash.slice(1) || 'dash';
      wsConnect();
      audit('login', '', '');
      render();
    } else {
      if (++fails >= 5) { lock = Date.now() + 3e4; fails = 0 }
      toast(t('wrongCreds'), 'bad');
    }
  },

  verifyOtp(e) {
    e.preventDefault();
    const f = fd(e);
    const code = (f.code || '').trim();
    if (!otpPending || otpPending.code !== code) return toast(t('otpWrong'), 'bad');
    me = otpPending.user;
    const remember = otpPending.remember;
    otpPending = null;
    attDraft = {}; gradeDraft = []; chatCache = {};
    (remember ? localStorage : sessionStorage).setItem('u', me.id);
    localStorage.setItem('parto_role', me.role);
    page = location.hash.slice(1) || 'dash';
    wsConnect();
    audit('login', '', '2FA');
    render();
    toast(t('welcome') + ' ' + me.name, 'ok');
  },

  cancelOtp() { otpPending = null; render() },

  async logout() {
    if (USE_SERVER) { try { await api.logout() } catch { } }
    if (window.ws) { try { window.ws.close() } catch { } }
    window.ws = null; window.wsReady = false;
    audit('logout', '', '');
    me = null; attDraft = {}; gradeDraft = []; chatCache = {}; chatPeer = null; quizSession = null;
    sessionStorage.removeItem('u');
    localStorage.removeItem('u');
    render();
  },

  async chUser(e) {
    e.preventDefault();
    const f = fd(e), n = f.username.trim();
    if (!USE_SERVER && await hp(f.pw, me.salt) !== me.hash) return toast(LANG === 'fa' ? 'رمز فعلی اشتباه' : 'Wrong password', 'bad');
    if (db.users.some(u => u.id !== me.id && u.username.toLowerCase() === n.toLowerCase()))
      return toast(LANG === 'fa' ? 'نام کاربری تکراری' : 'Username exists', 'bad');
    me.username = n;
    if (USE_SERVER) { try { await api.post('/auth/username', { username: n, password: f.pw }) } catch (err) { return toast(err.message, 'bad') } }
    save(); render(); toast(t('successfullySaved'), 'ok');
  },

  async chPw(e) {
    e.preventDefault();
    const f = fd(e);
    if (!USE_SERVER && await hp(f.old, me.salt) !== me.hash) return toast(LANG === 'fa' ? 'رمز فعلی اشتباه' : 'Wrong password', 'bad');
    if (f.pw !== f.pw2) return toast(LANG === 'fa' ? 'تکرار رمز یکسان نیست' : 'Passwords do not match', 'bad');
    if (USE_SERVER) {
      try { await api.post('/auth/password', { old: f.old, pw: f.pw }); toast(t('successfullySaved'), 'ok'); e.target.reset() }
      catch (err) { toast(err.message, 'bad') }
      return;
    }
    me.salt = uid() + uid();
    me.hash = await hp(f.pw, me.salt);
    save(); e.target.reset(); toast(t('successfullySaved'), 'ok');
  }
};

/* WebSocket */
let ws = null, wsReady = false;
function wsConnect() {
  if (!WS_URL || !me) return;
  try {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      wsReady = true;
      ws.send(JSON.stringify({ type: 'auth', userId: me.id, role: me.role }));
    };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data) } catch { return }
      handleWsMessage(m);
    };
    ws.onclose = () => { wsReady = false; setTimeout(wsConnect, 5000); };
    ws.onerror = () => { wsReady = false; };
  } catch (err) { console.warn('WS error', err) }
}
function wsSend(obj) {
  if (wsReady && ws) { try { ws.send(JSON.stringify(obj)) } catch { } }
}
function handleWsMessage(m) {
  switch (m.type) {
    case 'chat': {
      const peer = (m.from === (me && me.id)) ? m.to : m.from;
      if (!peer) break;
      chatCache[peer] = chatCache[peer] || [];
      chatCache[peer].push({ from: m.from, text: m.text, ts: m.ts || Date.now(), me: m.from === (me && me.id), read: m.from === (me && me.id) });
      if (chatPeer === peer) render();
      else if (m.from !== (me && me.id)) toast(t('newMsgFrom') + ' ' + (m.fromName || m.from), 'info');
      break;
    }
    case 'notify': toast(m.text, m.kind || 'info'); break;
    case 'refresh': if (m.col) reload(); break;
  }
}