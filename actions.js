/* =========================================================================
   Actions
   ========================================================================= */
const ACT = {

/* ============ Common ============ */
pg(key, v) { const n = +v; if (n >= 1) { pg[key] = n; render() } },
closeModal() { closeModal() },
find(q) {
  q = (q || '').trim().toLowerCase();
  $$('tr[data-s]').forEach(r => { r.hidden = r.dataset.s.toLowerCase().indexOf(q) < 0 });
},

openDP(input, onSelect) {
  openDatepicker(input, (isoStr, jalaliStr) => {
    if (onSelect) onSelect(isoStr, jalaliStr);
    const form = input.closest('form');
    if (form) {
      const hidden = form.querySelector('input[type=hidden][name="due"]');
      if (hidden && input.dataset.feri) hidden.value = isoStr;
    }
  });
},

/* ============ Login ============ */
login(e) { AUTH.login(e) },
verifyOtp(e) { AUTH.verifyOtp(e) },
cancelOtp() { AUTH.cancelOtp() },
logout() { AUTH.logout() },
chUser(e) { AUTH.chUser(e) },
chPw(e) { AUTH.chPw(e) },

/* ============ Students ============ */
addStudent(e) {
  e.preventDefault();
  const f = fd(e), nid = en(f.nid);
  if (!validNid(nid)) return toast(LANG === 'fa' ? 'کد ملی نامعتبر' : 'Invalid national ID', 'bad');
  if (db.students.some(s => s.nid === nid)) return toast(LANG === 'fa' ? 'کد ملی تکراری' : 'Duplicate ID', 'bad');
  push('students', {
    name: f.name.trim(), nid, classId: f.classId,
    parent: (f.parent || '').trim(), phone: en(f.phone || '')
  }, t('successfullyAdded'));
  audit('add', 'students', f.name);
},

csvStudents() {
  const list = mgr() ? db.students : mine();
  if (!list.length) return toast(t('noData'), 'bad');
  const rows = [['name', 'nid', 'class', 'parent', 'phone']].concat(list.map(s => {
    const cn = (db.classes.find(c => c.id === s.classId) || {}).name || '';
    return [s.name, String(s.nid || ''), cn, s.parent || '', String(s.phone || '')];
  }));
  csvDownload(rows, 'students_backup_' + iso() + '.csv');
  xlsxDownload(rows, 'students_backup_' + iso() + '.xlsx', 'Students');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

dlStudentTpl() {
  const rows = [
    ['نام', 'کد ملی', 'کلاس', 'ولی', 'تلفن'],
    ['پارسا محمدی', '2000000002', 'دهم ریاضی', 'رضا محمدی', '09121230001'],
    ['نیما کریمی', '2000000010', 'دهم ریاضی', 'حسن کریمی', '09121230002'],
    ['آیدا رضایی', '2000000029', 'دهم تجربی', 'علی رضایی', '09121230003']
  ];
  csvDownload(rows, 'students_template.csv');
  xlsxDownload(rows, 'students_template.xlsx', 'Students');
  toast(LANG === 'fa' ? 'قالب دانلود شد' : 'Template downloaded', 'ok');
},

async importStudents(file) {
  if (!file) return;
  try {
    const rows = await parseSheet(file);
    if (rows.length < 2) return toast(LANG === 'fa' ? 'فایل خالی است' : 'Empty file', 'bad');
    let added = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !String(r[0] || '').trim()) continue;
      const name = String(r[0]).trim();
      const nid = normNid(r[1]);
      const className = String(r[2] || '').trim();
      const parent = String(r[3] || '').trim();
      const phone = normPhone(r[4]);
      if (!name || !nid) { skipped++; continue }
      if (!validNid(nid)) { skipped++; continue }
      if (db.students.some(s => s.nid === nid)) { skipped++; continue }
      let classId = findClassId(className);
      if (!classId && className) { classId = uid(); db.classes.push({ id: classId, name: className, grade: '', room: '' }) }
      if (!classId) {
        if (db.classes.length) classId = db.classes[0].id;
        else { classId = uid(); db.classes.push({ id: classId, name: 'Default', grade: '', room: '' }) }
      }
      db.students.push({ id: uid(), name, nid, classId, parent, phone });
      added++;
    }
    save(); render();
    let msg = num(added) + ' ' + (LANG === 'fa' ? 'اضافه شد' : 'added');
    if (skipped) msg += ' · ' + num(skipped) + ' ' + (LANG === 'fa' ? 'رد شد' : 'skipped');
    toast(msg, added ? 'ok' : 'bad');
  } catch (err) { toast('Error: ' + (err.message || ''), 'bad') }
},

findClassId(name) {
  name = String(name || '').trim();
  const c = db.classes.find(x => x.name === name || x.name.replace(/\s/g, '') === name.replace(/\s/g, ''));
  return c ? c.id : null;
},

/* ============ Classes ============ */
addClass(e) {
  e.preventDefault();
  const f = fd(e);
  push('classes', { name: f.name.trim(), grade: (f.grade || '').trim(), room: (f.room || '').trim() }, t('successfullyAdded'));
},

/* ============ Grades ============ */
addGrade(e) {
  e.preventDefault();
  const f = fd(e);
  const sc = parseFloat(en(f.score).replace('٫', '.'));
  if (!(sc >= 0 && sc <= 20)) return toast(LANG === 'fa' ? 'نمره بین ۰ تا ۲۰' : 'Score 0-20', 'bad');
  if (needsConfirm()) {
    gradeDraft.push({ sid: f.sid, subject: f.subject.trim(), type: f.type, score: sc, date: iso() });
    e.target.reset(); render();
    toast(LANG === 'fa' ? 'به لیست انتظار اضافه شد' : 'Added to pending', 'warn');
  } else {
    push('grades', { sid: f.sid, subject: f.subject.trim(), type: f.type, score: sc, date: iso() }, t('successfullyAdded'));
    audit('grade_add', 'grades', sname(f.sid) + ' · ' + f.subject + ' · ' + sc);
  }
},
confirmGrades() {
  if (!gradeDraft.length) return;
  gradeDraft.forEach(g => db.grades.push(Object.assign({ id: uid() }, g)));
  const n = gradeDraft.length;
  audit('grade_add', 'grades', n + ' confirmed');
  gradeDraft = []; save(); render();
  toast(num(n) + ' ' + t('successfullySaved'), 'ok');
},
clearGradeDraft() { gradeDraft = []; render(); toast(t('cancel') + '!') },
rmGradeDraft(i) { gradeDraft.splice(+i, 1); render() },

csvGrades() {
  const src = db.grades.filter(g => {
    if (scoped()) return g.sid === me.sid;
    if (teacherScoped()) { const s = db.students.find(x => x.id === g.sid); return s && me.classIds.includes(s.classId) }
    return true;
  });
  const rows = [['date', 'student', 'subject', 'type', 'score']].concat(src.map(g => [
    g.date, (db.students.find(s => s.id === g.sid) || {}).name || '', g.subject, g.type, g.score
  ]));
  csvDownload(rows, 'grades_' + iso() + '.csv');
  xlsxDownload(rows, 'grades_' + iso() + '.xlsx', 'Grades');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

gf(v) { gf = v; pg.grades = 1; render() },

/* ============ Attendance ============ */
attClass(v) { attClass = v; pg.att = 1; attDraft = {}; render() },
setBell(bell) {
  if (Object.keys(attDraft).length) {
    if (!confirm(t('confirmDiscard'))) return;
    attDraft = {};
  }
  attBell = bell;
  render();
},
mark(sid, status) {
  if (!canMarkAtt()) return toast(t('accessDenied'), 'bad');
  if (needsConfirm()) {
    attDraft[sid] = { status, delay: (attDraft[sid] && attDraft[sid].delay) || 0, _bell: attBell, _date: ad };
    render();
  } else {
    if (!db.att) db.att = {};
    if (!db.att[ad]) db.att[ad] = {};
    if (!db.att[ad][attBell]) db.att[ad][attBell] = {};
    const prev = db.att[ad][attBell][sid] || {};
    const delay = status === 'l' ? (prev.delay || 0) : 0;
    db.att[ad][attBell][sid] = { status, delay };
    save(); render();
    if (USE_SERVER) api.attSave(ad, attBell, [{ sid, status, delay }]).catch(() => { });
  }
},
setDelay(sid, v) {
  if (!canMarkAtt()) return;
  const d = clamp(parseInt(en(v), 10) || 0, 0, 120);
  if (needsConfirm()) {
    const cur = attDraft[sid] || attDay(ad, attBell)[sid] || { status: 'l', delay: 0 };
    if (cur.status !== 'l') return;
    attDraft[sid] = Object.assign({}, cur, { status: 'l', delay: d });
    render();
  } else {
    if (db.att[ad] && db.att[ad][attBell] && db.att[ad][attBell][sid]) {
      if (db.att[ad][attBell][sid].status !== 'l') return;
      db.att[ad][attBell][sid].delay = d;
      save(); render();
    }
  }
},
allP() {
  if (!canMarkAtt()) return toast(t('accessDenied'), 'bad');
  const list = mine().filter(s => !attClass || s.classId === attClass);
  if (needsConfirm()) {
    list.forEach(s => attDraft[s.id] = { status: 'p', delay: 0, _bell: attBell, _date: ad });
    render(); toast(LANG === 'fa' ? 'همه حاضر — تأیید کنید' : 'All present — confirm', 'warn');
  } else {
    if (!db.att) db.att = {};
    if (!db.att[ad]) db.att[ad] = {};
    if (!db.att[ad][attBell]) db.att[ad][attBell] = {};
    list.forEach(s => db.att[ad][attBell][s.id] = { status: 'p', delay: 0 });
    save(); render(); toast(t('attSaved'), 'ok');
  }
},
allA() {
  if (!canMarkAtt()) return toast(t('accessDenied'), 'bad');
  const list = mine().filter(s => !attClass || s.classId === attClass);
  if (needsConfirm()) {
    list.forEach(s => attDraft[s.id] = { status: 'a', delay: 0, _bell: attBell, _date: ad });
    render(); toast(LANG === 'fa' ? 'همه غایب — تأیید کنید' : 'All absent — confirm', 'warn');
  } else {
    if (!db.att) db.att = {};
    if (!db.att[ad]) db.att[ad] = {};
    if (!db.att[ad][attBell]) db.att[ad][attBell] = {};
    list.forEach(s => db.att[ad][attBell][s.id] = { status: 'a', delay: 0 });
    save(); render(); toast(t('attSaved'), 'ok');
  }
},
confirmAtt() {
  if (!canMarkAtt()) return toast(t('accessDenied'), 'bad');
  if (!Object.keys(attDraft).length) return;
  if (!db.att) db.att = {};
  if (!db.att[ad]) db.att[ad] = {};
  if (!db.att[ad][attBell]) db.att[ad][attBell] = {};
  const payload = [];
  Object.keys(attDraft).forEach(id => {
    const rec = attDraft[id];
    if (rec._bell && rec._bell !== attBell) return;
    if (rec._date && rec._date !== ad) return;
    const clean = { status: rec.status, delay: rec.delay || 0 };
    db.att[ad][attBell][id] = clean;
    payload.push({ sid: id, status: clean.status, delay: clean.delay });
  });
  const n = Object.keys(attDraft).length;
  audit('att_change', 'attendance', n + ' · ' + attBell);
  attDraft = {}; save(); render();
  toast(num(n) + ' ' + t('successfullySaved'), 'ok');
  if (USE_SERVER) api.attSave(ad, attBell, payload).catch(() => { });
},
clearAttDraft() { attDraft = {}; render(); toast(t('cancel') + '!') },
csvAtt() {
  const day = attDay(ad, attBell);
  const list = mine().filter(s => !attClass || s.classId === attClass);
  const rows = [['date', 'bell', 'student', 'class', 'status', 'delay']].concat(
    list.map(s => {
      const r = day[s.id] || {};
      return [ad, attBell, s.name, (db.classes.find(c => c.id === s.classId) || {}).name || '',
        ST[r.status] ? ST[r.status].label[LANG] : 'none', r.delay || 0];
    })
  );
  csvDownload(rows, `attendance_${ad}_${attBell}.csv`);
  xlsxDownload(rows, `attendance_${ad}_${attBell}.xlsx`, attBell);
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

notifyParent(sid) {
  const s = db.students.find(x => x.id === sid);
  if (!s) return;
  const stat = attForStudent(sid);
  const parentUser = db.users.find(u => u.sid === sid && u.role === 'parent');
  if (parentUser) {
    if (!db.messages) db.messages = [];
    db.messages.push({
      id: uid(), from: me.id, to: parentUser.id,
      text: (LANG === 'fa'
        ? `هشدار: ${s.name} تاکنون ${stat.a} جلسه غیبت داشته است.`
        : `Alert: ${s.name} has ${stat.a} absences.`),
      ts: Date.now(), read: false
    });
    save();
    toast(LANG === 'fa' ? 'اعلان به والد ارسال شد' : 'Notification sent to parent', 'ok');
  } else {
    toast(LANG === 'fa' ? 'والدی برای این دانش‌آموز یافت نشد' : 'No parent account found', 'warn');
  }
},

/* ============ Scanner ============ */
async openScanner() {
  if (!canMarkAtt()) return toast(t('accessDenied'), 'bad');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return toast(t('scannerError'), 'bad');
  }
  if (typeof jsQR === 'undefined' && typeof window.jsQR === 'undefined') {
    return toast(LANG === 'fa' ? 'کتابخانه jsQR لود نشده' : 'jsQR not loaded', 'bad');
  }

  openModal(`<h2>📷 ${t('scanQR')}</h2>
    <p class="mu" style="margin-bottom:12px">${t('scanQRDesc')}</p>
    <div class="scanner-box">
      <video id="qrVideo" autoplay playsinline muted></video>
      <div class="scanner-overlay"><div class="scanner-target"></div></div>
    </div>
    <p class="hint" style="text-align:center;margin-top:10px">${LANG === 'fa' ? 'دوربین باید به QR کد دانش‌آموز باشد' : 'Point camera at student QR code'}</p>
    <div id="scanResult" class="summary-box" style="margin-top:12px;display:none"></div>`);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    scannerStream = stream;
    const video = document.getElementById('qrVideo');
    if (video) video.srcObject = stream;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scan = () => {
      if (!document.getElementById('qrVideo')) {
        if (scannerStream) { scannerStream.getTracks().forEach(tk => tk.stop()); scannerStream = null }
        return;
      }
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = (window.jsQR || jsQR)(imgData.data, canvas.width, canvas.height);
        if (code && code.data) {
          handleScannedQR(code.data);
          return;
        }
      }
      requestAnimationFrame(scan);
    };
    scan();
  } catch (err) {
    console.error(err);
    toast(t('scannerError'), 'bad');
    closeModal();
  }
},

qrStudent(sid) {
  const s = db.students.find(x => x.id === sid);
  if (!s) return;
  const payload = 'PARTO|' + s.id + '|' + s.nid + '|' + s.name;
  const html = `<h2>${t('qrForStudent')} — ${esc(s.name)}</h2>
    <div class="qr-wrap" id="qrPrintArea">
      <canvas id="qrCanvas" width="240" height="240"></canvas>
      <div class="qr-caption">${esc(s.name)}</div>
      <div class="mu">${LANG === 'fa' ? 'کد ملی' : 'National ID'}: ${s.nid}</div>
      <div class="mu">${cname(s.classId)}</div>
      <p class="hint" style="margin-top:10px">${LANG === 'fa' ? 'این QR را چاپ و روی کارت دانش‌آموزی نصب کنید' : 'Print this QR and attach to student ID card'}</p>
    </div>
    <div class="row" style="justify-content:center;margin-top:12px">
      <button class="b p" onclick="window.print()">🖨 ${t('print')}</button>
      <button class="b" onclick="ACT.qrPDF('${esc(s.name)}')">📄 PDF</button>
    </div>`;
  openModal(html);
  setTimeout(() => {
    const canvas = document.getElementById('qrCanvas');
    if (canvas) drawQRCode(payload, canvas);
  }, 50);
},
async qrPDF(name) {
  const area = document.getElementById('qrPrintArea');
  if (!area) return;
  await generatePDF(area.outerHTML, 'qr_' + (name || 'student') + '.pdf');
},

/* ============ Provereshi ============ */
provTab(tab) { provereshiTab = tab; render() },
provSelectEvent(eid) { provEventView = eid; render() },

addProvType(e) {
  e.preventDefault();
  if (!isProvereshiMgr()) return;
  const f = fd(e);
  push('provTypes', {
    name: f.name.trim(), icon: f.icon, op: f.op,
    unit: (f.unit || '').trim(), active: true, createdBy: me.id
  }, t('successfullyAdded'));
},
provToggleType(id) {
  if (!isProvereshiMgr()) return;
  const tp = provType(id);
  if (!tp) return;
  tp.active = !tp.active;
  save(); render();
},

addProvEvent(e) {
  e.preventDefault();
  if (!isProvereshiMgr()) return;
  const f = fd(e);
  const formEl = e.target;
  const leaders = Array.from(formEl.querySelectorAll('input[name="leaders"]:checked')).map(x => x.value);
  push('provEvents', {
    typeId: f.typeId, title: f.title.trim(), desc: f.desc || '',
    date: f.date, leaders, active: !!f.active, createdBy: me.id
  }, t('successfullyAdded'));
  audit('prov_event', 'provEvents', f.title);
  e.target.reset();
},
provEditEvent(id) {
  if (!isProvereshiMgr()) return;
  const ev = provEvent(id);
  if (!ev) return;
  const leadersBox = db.users.filter(u => u.role !== 'admin').map(u =>
    `<label><input type="checkbox" name="leaders" value="${u.id}" ${(ev.leaders || []).includes(u.id) ? 'checked' : ''}> ${esc(u.name)} (${ROLE[u.role][LANG]})</label>`
  ).join('');
  openModal(`<h2>${t('edit')}</h2>
    <form class="fm" onsubmit="ACT.saveProvEvent(event, '${ev.id}')">
      <label>${t('eventTitle')}<input name="title" value="${esc(ev.title)}" required></label>
      <label>${t('type')}<select name="typeId">${opts((db.provTypes || []).map(tp => [tp.id, tp.icon + ' ' + tp.name]), ev.typeId)}</select></label>
      <label>${t('date')}<input type="date" name="date" value="${ev.date}"></label>
      <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="2">${esc(ev.desc || '')}</textarea></label>
      <label style="grid-column:1/-1">${t('leaders')}<div class="chk-group">${leadersBox}</div></label>
      <label class="inline"><input type="checkbox" name="active" ${ev.active !== false ? 'checked' : ''}> ${LANG === 'fa' ? 'فعال' : 'Active'}</label>
      <button class="b p">${t('save')}</button>
    </form>`);
},
saveProvEvent(e, id) {
  e.preventDefault();
  if (!isProvereshiMgr()) return;
  const ev = provEvent(id); if (!ev) return;
  const f = fd(e);
  const formEl = e.target;
  const leaders = Array.from(formEl.querySelectorAll('input[name="leaders"]:checked')).map(x => x.value);
  Object.assign(ev, {
    title: f.title.trim(), typeId: f.typeId, date: f.date,
    desc: f.desc || '', leaders, active: !!f.active
  });
  save(); closeModal(); render(); toast(t('successfullySaved'), 'ok');
},
provOpenEvent(eid) {
  const ev = provEvent(eid); if (!ev) return;
  provEventView = eid;
  const tp = provType(ev.typeId);
  if (tp && tp.op === 'coupon') provereshiTab = 'coupon';
  else if (tp && tp.op === 'attend') provereshiTab = 'attend';
  else if (tp && tp.op === 'vote') provereshiTab = 'vote';
  render();
},

addCoupon(e) {
  e.preventDefault();
  const f = fd(e);
  const evs = (db.provEvents || []).filter(x => {
    const tp = provType(x.typeId);
    return tp && tp.op === 'coupon' && (x.active !== false);
  });
  const ev = provEventView ? provEvent(provEventView) : evs[0];
  if (!ev) return toast(LANG === 'fa' ? 'رویدادی نیست' : 'No event', 'bad');
  if (!isProvereshiMgr() && !(ev.leaders || []).includes(me.id)) return toast(t('accessDenied'), 'bad');
  push('provRecords', {
    eventId: ev.id, typeId: ev.typeId, sid: f.sid, by: me.id,
    data: { item: f.item, amount: parseInt(en(f.amount), 10) || 0 }
  }, t('successfullyAdded'));
  audit('coupon', 'provRecords', sname(f.sid) + ' · ' + f.item);
  e.target.reset();
},
addAttendRecord(e) {
  e.preventDefault();
  const f = fd(e);
  const evs = (db.provEvents || []).filter(x => {
    const tp = provType(x.typeId);
    return tp && tp.op === 'attend' && (x.active !== false);
  });
  const ev = provEventView ? provEvent(provEventView) : evs[0];
  if (!ev) return toast(LANG === 'fa' ? 'رویدادی نیست' : 'No event', 'bad');
  if (!isProvereshiMgr() && !(ev.leaders || []).includes(me.id)) return toast(t('accessDenied'), 'bad');
  push('provRecords', {
    eventId: ev.id, typeId: ev.typeId, sid: f.sid, by: me.id,
    data: { status: f.status, note: f.note || '' }
  }, t('successfullySaved'));
  e.target.reset();
},

addElection(e) {
  e.preventDefault();
  if (!isProvereshiMgr()) return;
  const f = fd(e);
  const cands = f.candidates.split(/\n+/).map(x => x.trim()).filter(Boolean).map(n => ({ name: n }));
  if (cands.length < 2) return toast(LANG === 'fa' ? 'حداقل دو کاندید' : 'Min 2 candidates', 'bad');
  push('provElections', {
    title: f.title.trim(), candidates: cands, votes: {},
    open: true, deadline: f.deadline || '', createdBy: me.id
  }, t('successfullyAdded'));
  audit('election', 'provElections', f.title);
  e.target.reset();
},
provCastVote(elId, cidx) {
  const el = (db.provElections || []).find(x => x.id === elId);
  if (!el) return;
  if (!el.open) return toast(LANG === 'fa' ? 'رأی‌گیری بسته' : 'Closed', 'bad');
  if (el.deadline && iso() > el.deadline) return toast(LANG === 'fa' ? 'مهلت تمام' : 'Expired', 'bad');
  if (el.votes[me.id] !== undefined) return toast(LANG === 'fa' ? 'قبلاً رأی داده‌اید' : 'Already voted', 'bad');
  el.votes[me.id] = +cidx;
  save(); render(); toast(t('successfullySaved'), 'ok');
  audit('vote', 'provElections', el.title);
},
provToggleElection(elId) {
  if (!isProvereshiMgr()) return;
  const el = (db.provElections || []).find(x => x.id === elId);
  if (!el) return;
  el.open = !el.open;
  save(); render();
},

csvProv() {
  const rows = [['date', 'event', 'type', 'student', 'detail', 'amount', 'by']].concat(
    (db.provRecords || []).map(r => {
      const ev = provEvent(r.eventId);
      const tp = provType(r.typeId);
      return [
        new Date(r.ts).toLocaleDateString('en-CA'),
        ev ? ev.title : '', tp ? tp.name : '',
        (db.students.find(s => s.id === r.sid) || {}).name || '',
        (r.data && (r.data.item || r.data.status)) || '',
        r.data && r.data.amount || 0,
        (db.users.find(u => u.id === r.by) || {}).name || ''
      ];
    })
  );
  csvDownload(rows, 'provereshi_' + iso() + '.csv');
  xlsxDownload(rows, 'provereshi_' + iso() + '.xlsx', 'Prov');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

/* ============ Showcase ============ */
async previewShowcaseImg(inp) {
  try {
    const file = inp.files[0]; if (!file) return;
    const data = await readImageAsDataURL(file, 400);
    const hidden = document.getElementById('showcaseImgData');
    if (hidden) hidden.value = data;
    const hint = document.getElementById('showcaseImgHint');
    if (hint) hint.textContent = '✓ ' + Math.round(data.length / 1024) + ' KB';
    toast(t('successfullySaved'), 'ok');
  } catch (err) { toast(err.message, 'bad') }
},
async previewPollImg(inp) {
  try {
    const file = inp.files[0]; if (!file) return;
    const data = await readImageAsDataURL(file, 300);
    const hidden = document.getElementById('pollImgData');
    if (hidden) hidden.value = data;
    toast(t('successfullySaved'), 'ok');
  } catch (err) { toast(err.message, 'bad') }
},
addShowcase(e) {
  e.preventDefault();
  const f = fd(e);
  push('showcase', {
    title: f.title.trim(), desc: f.desc.trim(), img: f.img || '',
    cat: f.cat, date: f.date, pinned: !!f.pinned, authorId: me.id
  }, t('successfullyAdded'));
  audit('showcase', 'showcase', f.title);
  e.target.reset();
},
addNews(e) {
  e.preventDefault();
  const f = fd(e);
  push('news', { title: f.title, body: f.body, img: f.img || '', date: iso(), authorId: me.id }, t('successfullyAdded'));
},
addCalEvent(e) {
  e.preventDefault();
  const f = fd(e);
  push('calendar', { date: f.date, title: f.title.trim(), type: f.type, desc: f.desc || '' }, t('successfullyAdded'));
},

/* ============ Polls ============ */
addPoll(e) {
  e.preventDefault();
  const f = fd(e);
  const options = f.options.split(/\n+/).map(x => x.trim()).filter(Boolean);
  if (options.length < 2) return toast(LANG === 'fa' ? 'حداقل دو گزینه' : 'Min 2 options', 'bad');
  push('polls', {
    title: f.title.trim(), options, votes: {}, img: f.img || '',
    multi: false, createdBy: me.id, date: iso(), deadline: f.deadline || ''
  }, t('successfullyAdded'));
  e.target.reset();
},
vote(pid, opt) {
  const pl = (db.polls || []).find(x => x.id === pid);
  if (!pl) return;
  pl.votes = pl.votes || {};
  if (pl.deadline && iso() > pl.deadline) return toast(t('expired'), 'bad');
  if (pl.votes[me.id] !== undefined) return toast(LANG === 'fa' ? 'قبلاً رأی داده‌اید' : 'Already voted', 'bad');
  pl.votes[me.id] = +opt;
  save(); render(); toast(t('successfullySaved'), 'ok');
  audit('vote', 'polls', pl.title);
  if (USE_SERVER) api.pollVote(pid, +opt).catch(() => { });
},

/* ============ Discipline ============ */
addDisc(e) {
  e.preventDefault();
  const f = fd(e);
  push('discipline', { sid: f.sid, type: f.type, desc: f.desc, severity: f.severity, date: iso(), by: me.id }, t('successfullyAdded'));
},

/* ============ Online ============ */
addOnline(e) {
  e.preventDefault();
  const f = fd(e);
  const live = !!document.querySelector('input[name="live"]:checked');
  const item = {
    title: f.title, classId: f.classId, time: f.time, link: f.link, live,
    teacher: me.name, createdBy: me.id, ts: Date.now()
  };
  push('online', item, t('successfullyAdded'));
  if (USE_SERVER && live) wsSend({ type: 'online-start', data: item });
},

/* ============ Homework ============ */
addHw(e) {
  e.preventDefault();
  const f = fd(e);
  push('homework', {
    classId: f.classId, subject: f.subject, title: f.title, desc: f.desc || '',
    due: f.due, createdBy: me.id, submissions: {}
  }, t('successfullyAdded'));
},
submitHw(id) {
  const h = (db.homework || []).find(x => x.id === id);
  if (!h) return;
  h.submissions = h.submissions || {};
  if (h.submissions[me.sid]) return toast(LANG === 'fa' ? 'قبلاً ارسال کرده‌اید' : 'Already submitted', 'bad');
  h.submissions[me.sid] = { ts: Date.now(), text: 'submitted' };
  save(); render(); toast(t('successfullySaved'), 'ok');
  if (USE_SERVER) api.post('/homework/' + id + '/submit', {}).catch(() => { });
},
viewHwSubs(id) {
  const h = (db.homework || []).find(x => x.id === id);
  if (!h) return;
  const subs = h.submissions || {};
  const all = db.students.filter(s => s.classId === h.classId);
  const html = `<h2>${esc(h.title)}</h2>
    <div class="ov"><table>
      <thead><tr><th>${t('students')}</th><th>${t('status')}</th><th>${t('time')}</th></tr></thead>
      <tbody>${all.map(s => {
        const sub = subs[s.id];
        return `<tr><td>${esc(s.name)}</td>
          <td>${sub ? `<span class="tag ok">${LANG === 'fa' ? 'ارسال' : 'Submitted'}</span>` : `<span class="tag bad">${LANG === 'fa' ? 'ارسال نشده' : 'Not submitted'}</span>`}</td>
          <td>${sub ? formatJalaliShort(new Date(sub.ts).toLocaleDateString('en-CA')) + ' ' + new Date(sub.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
  openModal(html, true);
},

/* ============ Messages ============ */
sendMsg(e) {
  e.preventDefault();
  const f = fd(e);
  if (!f.to) return toast(LANG === 'fa' ? 'گیرنده را انتخاب کنید' : 'Select recipient', 'bad');
  const allowed = allowedChatPeers().some(u => u.id === f.to) || mgr();
  if (!allowed) return toast(t('accessDenied'), 'bad');
  if (!db.messages) db.messages = [];
  db.messages.push({ id: uid(), from: me.id, to: f.to, text: f.text.trim(), ts: Date.now(), read: false });
  save(); render(); toast(t('successfullySaved'), 'ok');
  if (USE_SERVER) api.post('/messages', { to: f.to, text: f.text }).catch(() => { });
  wsSend({ type: 'message', to: f.to, text: f.text, from: me.id });
},

/* ============ Chat ============ */
async chatOpen(peerId) {
  if (!allowedChatPeers().some(u => u.id === peerId)) return toast(t('accessDenied'), 'bad');
  chatPeer = peerId;
  if (!chatCache[peerId]) chatCache[peerId] = [];
  chatCache[peerId].forEach(m => m.read = true);
  if (USE_SERVER) {
    try {
      const hist = await api.chatHistory(peerId);
      if (Array.isArray(hist)) chatCache[peerId] = hist;
    } catch { }
  }
  render();
  setTimeout(() => { const el = $('#chatMsgs'); if (el) el.scrollTop = el.scrollHeight }, 50);
},
chatSend(e) {
  e.preventDefault();
  const txt = e.target.text.value.trim();
  if (!txt || !chatPeer) return;
  if (!allowedChatPeers().some(u => u.id === chatPeer)) return toast(t('accessDenied'), 'bad');
  chatCache[chatPeer] = chatCache[chatPeer] || [];
  chatCache[chatPeer].push({ from: me.id, text: txt, ts: Date.now(), me: true, read: true });
  e.target.reset();
  render();
  setTimeout(() => { const el = $('#chatMsgs'); if (el) el.scrollTop = el.scrollHeight }, 30);
  if (USE_SERVER) api.chatSend(chatPeer, txt).catch(() => { });
  wsSend({ type: 'chat', to: chatPeer, text: txt, from: me.id, fromName: me.name });
},

/* ============ Announcements ============ */
annTarget(sel) {
  const box = document.getElementById('annClassBox');
  if (box) box.style.display = sel.value === 'class' ? '' : 'none';
},
addAnn(e) {
  e.preventDefault();
  const f = fd(e);
  push('ann', {
    title: f.title.trim(), target: f.target, classId: f.classId || '',
    body: f.body.trim(), date: new Date().toLocaleDateString('en-CA'),
    authorId: me.id
  }, t('successfullyAdded'));
},

/* ============ Leaves ============ */
addLeave(e) {
  e.preventDefault();
  const f = fd(e);
  if (!me.sid) return toast(LANG === 'fa' ? 'حساب شما به دانش‌آموز متصل نیست' : 'No student linked', 'bad');
  if (f.from > f.to) return toast(LANG === 'fa' ? 'تاریخ شروع باید قبل باشد' : 'Invalid dates', 'bad');
  push('leaves', {
    sid: me.sid, from: f.from, to: f.to, reason: f.reason.trim(),
    status: 'pending', by: me.id
  }, t('successfullySaved'));
  audit('leave_request', 'leaves', sname(me.sid));
  e.target.reset();
},
leaveDecide(id, status) {
  if (!mgr()) return;
  const l = (db.leaves || []).find(x => x.id === id);
  if (!l) return;
  l.status = status;
  l.decidedBy = me.id;
  l.decidedTs = Date.now();
  save(); render();
  toast(t('successfullySaved'), 'ok');
  audit('leave_action', 'leaves', sname(l.sid) + ' · ' + status);
},

/* ============ Calendar ============ */
calPrev() {
  calJM--; if (calJM < 1) { calJM = 12; calJY-- }
  render();
},
calNext() {
  calJM++; if (calJM > 12) { calJM = 1; calJY++ }
  render();
},

/* ============ Timetable ============ */
ttClass(v) { ttClassId = v; render() },
ttSet(cid, day, bell, val) {
  if (!isProvereshiMgr()) return;
  if (!db.timetable) db.timetable = {};
  if (!db.timetable[cid]) db.timetable[cid] = {};
  if (!db.timetable[cid][day]) db.timetable[cid][day] = {};
  db.timetable[cid][day][bell] = val.trim();
  save();
  toast(t('successfullySaved'), 'ok');
},
ttExport(cid) {
  const tt = (db.timetable || {})[cid] || {};
  const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
  const rows = [['day', 'bell1', 'bell2', 'bell3', 'bell4']].concat(
    weekdays.map(d => [d, 1, 2, 3, 4].map(b => (tt[d] && tt[d][b]) || ''))
  );
  csvDownload(rows, 'timetable_' + cid + '.csv');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

/* ============ Quiz ============ */
newQuizForm(e) {
  e.preventDefault();
  const f = fd(e);
  const quiz = {
    id: uid(), title: f.title, classId: f.classId, subject: f.subject,
    duration: +f.duration || 15, questions: [], attempts: {},
    createdBy: me.id, date: iso()
  };
  db.quizzes = db.quizzes || [];
  db.quizzes.push(quiz);
  save();
  openModal(`<h2>${esc(quiz.title)}</h2>
    <form onsubmit="ACT.addQuizQ(event, '${quiz.id}')" class="fm">
      <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="text" rows="2" required></textarea></label>
      <label>1<input name="o1" required></label>
      <label>2<input name="o2" required></label>
      <label>3<input name="o3"></label>
      <label>4<input name="o4"></label>
      <label>${LANG === 'fa' ? 'پاسخ صحیح' : 'Correct'}<input type="number" name="correct" min="1" max="4" value="1" required></label>
      <button class="b p">${t('add')}</button>
    </form>
    <div style="margin-top:12px"><button class="b ok" data-a="finishQuiz" data-i="${quiz.id}">${t('confirm')}</button></div>`, true);
},
addQuizQ(e, qid) {
  e.preventDefault();
  const q = (db.quizzes || []).find(x => x.id === qid);
  if (!q) return;
  const f = fd(e);
  const options = [f.o1, f.o2, f.o3, f.o4].filter(Boolean);
  q.questions.push({ text: f.text, options, correct: (+f.correct) - 1 });
  save();
  toast(LANG === 'fa' ? 'سوال اضافه شد' : 'Question added', 'ok');
  e.target.reset();
},
finishQuiz() { closeModal(); render(); toast(t('successfullySaved'), 'ok'); },
startQuiz(qid) {
  const q = (db.quizzes || []).find(x => x.id === qid);
  if (!q) return;
  if (!(q.questions || []).length) return toast(LANG === 'fa' ? 'سوالی ندارد' : 'No questions', 'bad');
  if (scoped() && q.attempts && q.attempts[me.id]) return toast(LANG === 'fa' ? 'قبلاً شرکت کرده‌اید' : 'Already taken', 'bad');
  if (quizSession && !confirm(t('confirmExitQuiz'))) return;
  quizSession = { quiz: q, answers: {}, start: Date.now() };
  renderQuizSession();
},
renderQuizSession() {
  const s = quizSession;
  if (!s) return;
  const q = s.quiz;
  const duration = (q.duration || 15) * 60000;
  const endAt = s.start + duration;

  const html = `<div class="row" style="margin-bottom:12px">
      <h2 style="margin:0">${esc(q.title)} — ${num(q.questions.length)}</h2>
      <span class="quiz-timer" id="quizTimer">${num(q.duration || 15)}:00</span>
    </div>
    <div id="quizBody">
      ${q.questions.map((qq, i) => `
        <div class="quiz-q">
          <b>${num(i + 1)}. ${esc(qq.text)}</b>
          <div class="opts">
            ${qq.options.map((o, j) => `
              <label><input type="radio" name="q${i}" value="${j}" ${s.answers[i] === j ? 'checked' : ''}
                onchange="ACT.quizAns(${i}, ${j})"> ${esc(o)}</label>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <div class="row" style="margin-top:12px;justify-content:flex-end">
      <button class="b" data-a="cancelQuiz">${t('quizCancel')}</button>
      <button class="b p" data-a="submitQuiz">${t('quizSubmit')}</button>
    </div>`;
  openModal(html, true);

  if (quizTimer) clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    const el = document.getElementById('quizTimer');
    if (!el || !quizSession) { clearInterval(quizTimer); quizTimer = null; return }
    const remain = Math.max(0, endAt - Date.now());
    const m = Math.floor(remain / 60000);
    const sec = Math.floor((remain % 60000) / 1000);
    el.textContent = num(m) + ':' + String(sec).padStart(2, '0');
    el.className = 'quiz-timer' + (remain < 60000 ? ' bad' : remain < 300000 ? ' warn' : '');
    if (remain <= 0) {
      clearInterval(quizTimer); quizTimer = null;
      toast(t('quizTimeUp'), 'warn');
      ACT.submitQuiz();
    }
  }, 500);
},
quizAns(qi, oi) { if (quizSession) quizSession.answers[qi] = oi },
submitQuiz() {
  if (!quizSession) return;
  if (quizTimer) { clearInterval(quizTimer); quizTimer = null }
  const s = quizSession, q = s.quiz;
  let correct = 0;
  q.questions.forEach((qq, i) => { if (s.answers[i] === qq.correct) correct++ });
  const total = q.questions.length;
  const score = total ? +(correct / total * 20).toFixed(2) : 0;
  q.attempts = q.attempts || {};
  q.attempts[me.id] = { score, total, correct, ts: Date.now() };
  quizSession = null;
  save(); closeModal(); render();
  toast(`${t('yourScore')}: ${f1(score)} / 20 (${num(correct)} / ${num(total)})`, 'ok');
},
cancelQuiz() {
  if (quizSession && !confirm(t('confirmExitQuiz'))) return;
  if (quizTimer) { clearInterval(quizTimer); quizTimer = null }
  quizSession = null; closeModal(); render();
},

/* ============ Report Card ============ */
rs(v) { rs = v; render() },

exportReport(sid) {
  const s = db.students.find(x => x.id === sid);
  if (!s) return;
  const gs = db.grades.filter(g => g.sid === sid);
  const att = attForStudent(sid);
  const rows = [
    ['report', s.name],
    ['class', (db.classes.find(c => c.id === s.classId) || {}).name || ''],
    ['avg', f1(avg(gs.map(g => g.score)))],
    ['present', att.p], ['absent', att.a], ['late', att.l],
    [],
    ['date', 'subject', 'type', 'score']
  ].concat(gs.map(g => [formatJalaliShort(g.date), g.subject, g.type, g.score]));
  csvDownload(rows, `report_${s.name}.csv`);
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},
async exportReportPDF(sid) {
  const container = document.getElementById('reportCardContainer');
  if (!container) return toast(LANG === 'fa' ? 'کارنامه یافت نشد' : 'Report not found', 'bad');
  const html = container.innerHTML;
  const s = db.students.find(x => x.id === sid);
  const filename = s ? `report_${s.name}_${iso()}.pdf` : 'report.pdf';
  await generatePDF(html, filename);
},

/* ============ Users ============ */
async addUser(e) {
  e.preventDefault();
  const f = fd(e);
  if (db.users.some(u => u.username.toLowerCase() === String(f.username || '').trim().toLowerCase())) return toast(LANG === 'fa' ? 'نام کاربری تکراری' : 'Username exists', 'bad');
  if (['parent', 'student'].includes(f.role) && !f.sid) return toast(LANG === 'fa' ? 'دانش‌آموز مرتبط را انتخاب کنید' : 'Select student', 'bad');
  if (f.role === 'admin' && !isAdmin()) return toast(t('accessDenied'), 'bad');
  const formEl = e.target;
  const classIds = f.role === 'teacher'
    ? Array.from((formEl || document).querySelectorAll('input[name="classIds"]:checked')).map(c => c.value)
    : [];
  if (f.role === 'teacher' && !classIds.length) return toast(LANG === 'fa' ? 'حداقل یک کلاس' : 'Min 1 class', 'bad');
  db.users.push(await mkUser(f.username, f.name.trim(), f.role, f.pw, f.sid || '', classIds));
  audit('add', 'users', f.name);
  save(); render(); toast(t('successfullyAdded'), 'ok');
},
roleChange(sel) {
  const role = sel.value;
  const root = (sel && sel.closest && (sel.closest('form') || sel.closest('.modal') || document)) || document;
  const sidLab = root.querySelector ? root.querySelector('#sidLab') : $('#sidLab');
  const clsLab = root.querySelector ? root.querySelector('#clsLab') : $('#clsLab');
  if (sidLab) sidLab.style.display = ['parent', 'student'].includes(role) ? '' : 'none';
  if (clsLab) clsLab.style.display = role === 'teacher' ? 'grid' : 'none';
},
dlTeacherTpl() {
  const rows = [['نام', 'نام کاربری', 'رمز', 'کلاس‌ها'],
    ['معلم نمونه', 'teacher2', '123456', 'دهم ریاضی,دهم انسانی']];
  csvDownload(rows, 'teachers_template.csv');
  xlsxDownload(rows, 'teachers_template.xlsx', 'Teachers');
  toast(LANG === 'fa' ? 'قالب دانلود شد' : 'Template downloaded', 'ok');
},
async importTeachers(file) {
  if (!file || !isAdmin()) return;
  try {
    const rows = await parseSheet(file);
    if (rows.length < 2) return toast(LANG === 'fa' ? 'فایل خالی' : 'Empty', 'bad');
    let added = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !String(r[0] || '').trim()) continue;
      const name = String(r[0]).trim();
      const username = String(r[1] || '').trim();
      const pw = String(r[2] || '123456');
      const classesStr = String(r[3] || '');
      if (!name || !username || username.length < 3) { skipped++; continue }
      if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) { skipped++; continue }
      const classIds = classesStr.split(/[,،]/).map(n => findClassId(n.trim())).filter(Boolean);
      if (!classIds.length) { skipped++; continue }
      db.users.push(await mkUser(username, name, 'teacher', pw || '123456', '', classIds));
      added++;
    }
    save(); render();
    toast(num(added) + ' ' + (LANG === 'fa' ? 'اضافه شد' : 'added') + (skipped ? ` · ${num(skipped)} ${LANG === 'fa' ? 'رد شد' : 'skipped'}` : ''), added ? 'ok' : 'bad');
  } catch (err) { toast('Error', 'bad') }
},

/* ============ Settings ============ */
school(e) {
  e.preventDefault();
  const f = fd(e);
  db.school = f.school.trim();
  db.year = f.year.trim();
  save(); render(); toast(t('successfullySaved'), 'ok');
},
toggle2FA(role, val) {
  if (!isAdmin()) return;
  if (!db.settings) db.settings = { twoFA: { admin: false, vice: false } };
  if (!db.settings.twoFA) db.settings.twoFA = { admin: false, vice: false };
  db.settings.twoFA[role] = !!val;
  save(); toast(t('successfullySaved'), 'ok');
},
setThemeBtn(th) { THEME = th; applyTheme(); render(); },
toggleLangBtn() { LANG = LANG === 'fa' ? 'en' : 'fa'; applyTheme(); render(); },
export() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: 'application/json' }));
  a.download = 'school_backup_' + iso() + '.json';
  a.click();
},
async import(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!['users', 'students', 'classes', 'grades'].every(k => Array.isArray(d[k]))) throw 0;
    if (!confirm(t('confirmRestore'))) return;
    db = d; if (!db.v) db.v = 9;
    save(); me = null;
    sessionStorage.clear(); localStorage.removeItem('u');
    render(); toast(LANG === 'fa' ? 'بازیابی شد؛ دوباره وارد شوید' : 'Restored; please login again', 'ok');
  } catch (e) { toast(LANG === 'fa' ? 'فایل معتبر نیست' : 'Invalid file', 'bad') }
},
reset() {
  if (confirm(t('confirmReset'))) {
    localStorage.removeItem(K); localStorage.removeItem('u');
    sessionStorage.clear(); location.hash = '';
    location.reload();
  }
},

/* ============ Edit ============ */
edit(id, c) { editForm(c, id) },
saveEdit(e) {
  e.preventDefault();
  const f = fd(e), type = window.editTarget.type, id = window.editTarget.id;
  if (type === 'students') {
    const nid = en(f.nid);
    if (!validNid(nid)) return toast(LANG === 'fa' ? 'کد ملی نامعتبر' : 'Invalid ID', 'bad');
    if (db.students.some(s => s.id !== id && s.nid === nid)) return toast(LANG === 'fa' ? 'کد ملی تکراری' : 'Duplicate ID', 'bad');
    Object.assign(db.students.find(s => s.id === id), { name: f.name.trim(), nid, classId: f.classId, parent: f.parent.trim(), phone: en(f.phone) });
  } else if (type === 'classes') {
    Object.assign(db.classes.find(c => c.id === id), { name: f.name.trim(), grade: f.grade.trim(), room: f.room.trim() });
  } else if (type === 'grades') {
    const sc = parseFloat(en(f.score).replace('٫', '.'));
    if (!(sc >= 0 && sc <= 20)) return toast(LANG === 'fa' ? 'نمره ۰ تا ۲۰' : 'Score 0-20', 'bad');
    Object.assign(db.grades.find(g => g.id === id), { sid: f.sid, subject: f.subject.trim(), type: f.type, score: sc });
    audit('grade_change', 'grades', 'edited');
  } else if (type === 'users') {
    const u = db.users.find(x => x.id === id);
    if (!u) return;
    if (!isAdmin() && (f.role === 'admin' || u.role === 'admin'))
      return toast(t('accessDenied'), 'bad');
    const oldRole = u.role;
    u.name = f.name.trim();
    u.role = f.role;
    u.sid = f.sid || '';
    u.classIds = f.role === 'teacher'
      ? $$('#modalBg input[name="classIds"]:checked').map(c => c.value)
      : [];
    if (oldRole !== f.role) audit('role_change', 'users', u.name + ': ' + oldRole + ' → ' + f.role);
  } else if (type === 'showcase') {
    const sh = db.showcase.find(x => x.id === id);
    Object.assign(sh, {
      title: f.title.trim(), desc: f.desc, cat: f.cat, date: f.date,
      img: f.img || sh.img
    });
  } else if (type === 'finReceipts') {
    const r = (db.finReceipts || []).find(x => x.id === id);
    if (r) {
      const amt = parseInt(en(f.amount), 10);
      if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
      r.amount = amt;
      r.method = f.method || r.method;
      r.note = f.note || '';
    }
  } else if (type === 'finDiscounts') {
    const d = (db.finDiscounts || []).find(x => x.id === id);
    if (d) {
      const amt = parseInt(en(f.amount), 10);
      if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
      d.amount = amt;
      d.reason = f.reason || d.reason;
    }
  }
  save(); closeModal(); render(); toast(t('successfullySaved'), 'ok');
},

/* ============ Delete ============ */
del(id, c) {
  if (!confirm(t('confirmDelete'))) return;
  if (c === 'classes' && db.students.some(s => s.classId === id))
    return toast(LANG === 'fa' ? 'ابتدا دانش‌آموزان کلاس را جابه‌جا کنید' : 'Move students first', 'bad');
  if (c === 'users') {
    const u = db.users.find(x => x.id === id);
    if (!u) return;
    if (u.id === me.id) return toast(LANG === 'fa' ? 'حساب خودتان را نمی‌توانید حذف کنید' : 'Cannot delete yourself', 'bad');
    if (!isAdmin() && u.role === 'admin') return toast(t('accessDenied'), 'bad');
    if (u.role === 'admin' && db.users.filter(x => x.role === 'admin').length < 2)
      return toast(LANG === 'fa' ? 'حداقل یک مدیر باید بماند' : 'Keep at least one admin', 'bad');
  }
  if (c === 'provTypes') {
    const used = (db.provEvents || []).some(e => e.typeId === id);
    if (used) return toast(LANG === 'fa' ? 'در رویدادها استفاده شده' : 'In use', 'bad');
  }
  if (c === 'students') {
    db.grades = (db.grades || []).filter(g => g.sid !== id);
    db.fin = (db.fin || []).filter(f => f.sid !== id);
    db.finReceipts = (db.finReceipts || []).filter(r => r.sid !== id);
    db.finDiscounts = (db.finDiscounts || []).filter(d => d.sid !== id);
    db.discipline = (db.discipline || []).filter(x => x.sid !== id);
    db.provRecords = (db.provRecords || []).filter(x => x.sid !== id);
    db.leaves = (db.leaves || []).filter(x => x.sid !== id);
    (db.homework || []).forEach(h => { if (h.submissions) delete h.submissions[id] });
    (db.polls || []).forEach(p => { if (p.votes) delete p.votes[id] });
    (db.quizzes || []).forEach(q => { if (q.attempts) delete q.attempts[id] });
    Object.keys(db.att || {}).forEach(d => {
      Object.keys(db.att[d] || {}).forEach(b => { if (db.att[d][b]) delete db.att[d][b][id] });
    });
    db.users = (db.users || []).filter(u => !(u.sid === id && (u.role === 'parent' || u.role === 'student')));
  }
  if (c === 'provEvents') {
    db.provRecords = (db.provRecords || []).filter(x => x.eventId !== id);
  }
  if (c === 'fin') {
    db.finReceipts = (db.finReceipts || []).filter(r => r.chargeId !== id);
    db.finDiscounts = (db.finDiscounts || []).filter(d => d.chargeId !== id);
  }
  db[c] = (db[c] || []).filter(x => x.id !== id);
  audit('del', c, id);
  save(); render(); toast(t('successfullyDeleted'), 'ok');
  if (USE_SERVER) api.remove(c, id).catch(() => { });
},

/* ============ Finance ============ */
finTab(tab) { db._finTab = tab; render() },
finStudentFilter(v) { db._finStudentFilter = v; render() },

addFin(e) {
  e.preventDefault();
  const f = fd(e);
  const amt = parseInt(en(f.amount), 10);
  if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
  push('fin', {
    sid: f.sid, type: f.type, amount: amt,
    due: f.due || '', paid: false, note: f.note || ''
  }, t('successfullyAdded'));
  audit('fin_add', 'fin', sname(f.sid) + ' · ' + f.type + ' · ' + amt);
  e.target.reset();
},
addReceipt(e) {
  e.preventDefault();
  if (!isAdmin()) return toast(t('accessDenied'), 'bad');
  const f = fd(e);
  const amt = parseInt(en(f.amount), 10);
  if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
  const H = finHelpers();
  const receiptNo = H.nextReceiptNo();
  if (!db.finReceipts) db.finReceipts = [];
  db.finReceipts.push({
    id: uid(), sid: f.sid, amount: amt, method: f.method || 'نقد',
    chargeId: f.chargeId || '', note: f.note || '',
    receiptNo, by: me.id, ts: Date.now()
  });
  audit('fin_receipt', 'finReceipts', '#' + receiptNo + ' · ' + sname(f.sid) + ' · ' + amt);
  save(); render(); toast(t('successfullySaved'), 'ok');
  e.target.reset();
},
addReceiptForCharge(chargeId) {
  const charge = (db.fin || []).find(c => c.id === chargeId);
  if (!charge) return;
  const H = finHelpers();
  const paid = (H.get().receipts).filter(r => r.chargeId === chargeId).reduce((s, r) => s + (+r.amount || 0), 0);
  const disc = (H.get().discounts).filter(d => d.chargeId === chargeId).reduce((s, d) => s + (+d.amount || 0), 0);
  const remain = (+charge.amount || 0) - paid - disc;

  openModal(`<h2>${LANG === 'fa' ? 'پرداخت برای' : 'Pay for'}: ${esc(charge.type)}</h2>
    <div class="summary-box" style="margin-bottom:12px">
      <div><span class="mu">${t('students')}:</span> <b>${sname(charge.sid)}</b></div>
      <div><span class="mu">${LANG === 'fa' ? 'مبلغ هزینه' : 'Charge'}:</span> <b>${fmoney(charge.amount)}</b></div>
      <div><span class="mu">${LANG === 'fa' ? 'مانده' : 'Remaining'}:</span> <b style="color:var(--warn)">${fmoney(remain)}</b></div>
    </div>
    <form class="fm" onsubmit="ACT.saveReceiptForCharge(event, '${chargeId}')">
      <label>${t('amount')}<input name="amount" value="${remain}" inputmode="numeric" required></label>
      <label>${t('finMethod')}<select name="method">
        ${opts([['نقد', t('finCash')], ['کارت', t('finCard')], ['آنلاین', t('finOnline')], ['چک', t('finCheck')]])}
      </select></label>
      <label style="grid-column:1/-1">${t('finNote')}<input name="note"></label>
      <button class="b p">${t('save')}</button>
    </form>`);
},
saveReceiptForCharge(e, chargeId) {
  e.preventDefault();
  const charge = (db.fin || []).find(c => c.id === chargeId);
  if (!charge) return;
  const f = fd(e);
  const amt = parseInt(en(f.amount), 10);
  if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
  const H = finHelpers();
  const receiptNo = H.nextReceiptNo();
  if (!db.finReceipts) db.finReceipts = [];
  db.finReceipts.push({
    id: uid(), sid: charge.sid, amount: amt, method: f.method,
    chargeId, note: f.note || '', receiptNo, by: me.id, ts: Date.now()
  });
  audit('fin_receipt', 'finReceipts', '#' + receiptNo + ' · ' + sname(charge.sid));
  save(); closeModal(); render(); toast(t('successfullySaved'), 'ok');
},
addDiscount(e) {
  e.preventDefault();
  if (!isAdmin()) return toast(t('accessDenied'), 'bad');
  const f = fd(e);
  const amt = parseInt(en(f.amount), 10);
  if (!(amt > 0)) return toast(LANG === 'fa' ? 'مبلغ نامعتبر' : 'Invalid amount', 'bad');
  if (!db.finDiscounts) db.finDiscounts = [];
  db.finDiscounts.push({
    id: uid(), sid: f.sid, amount: amt, reason: f.reason || '',
    chargeId: f.chargeId || '', by: me.id, ts: Date.now()
  });
  audit('fin_discount', 'finDiscounts', sname(f.sid) + ' · ' + amt);
  save(); render(); toast(t('successfullySaved'), 'ok');
  e.target.reset();
},
viewReceipt(id) {
  const r = (db.finReceipts || []).find(x => x.id === id);
  if (!r) return;
  const charge = r.chargeId ? (db.fin || []).find(c => c.id === r.chargeId) : null;
  const html = `<div class="report-card" style="padding:24px" id="receiptPrintArea">
    <div class="report-head">
      <div>
        <div class="school">${esc(db.school)}</div>
        <div class="meta">${t('finReceipt')}</div>
      </div>
      <div class="badge-rank">
        #${esc(r.receiptNo || '—')}
        <small>${t('finReceiptNo')}</small>
      </div>
    </div>
    <table class="report-table">
      <tbody>
        <tr><th>${t('students')}</th><td>${sname(r.sid)}</td></tr>
        <tr><th>${t('amount')}</th><td><b>${fmoney(r.amount)}</b></td></tr>
        <tr><th>${t('finMethod')}</th><td>${esc(r.method || '—')}</td></tr>
        ${charge ? `<tr><th>${LANG === 'fa' ? 'بابت' : 'For'}</th><td>${esc(charge.type)} — ${fmoney(charge.amount)}</td></tr>` : ''}
        ${r.note ? `<tr><th>${t('finNote')}</th><td>${esc(r.note)}</td></tr>` : ''}
        <tr><th>${t('date')}</th><td>${formatJalaliShort(new Date(r.ts).toLocaleDateString('en-CA'))} ${new Date(r.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td></tr>
        <tr><th>${LANG === 'fa' ? 'ثبت‌کننده' : 'By'}</th><td>${uname(r.by)}</td></tr>
      </tbody>
    </table>
    <div class="report-sign">
      <div>${LANG === 'fa' ? 'امضای دریافت‌کننده' : 'Received by'}</div>
      <div>${LANG === 'fa' ? 'امضای پرداخت‌کننده' : 'Paid by'}</div>
    </div>
    <div class="report-foot">
      <span>${esc(db.school)}</span>
      <span>${formatJalaliShort(iso())}</span>
    </div>
  </div>
  <div class="row" style="margin-top:12px;justify-content:center">
    <button class="b p" onclick="window.print()">🖨 ${t('print')}</button>
    <button class="b" onclick="ACT.receiptPDF('${r.id}')">📄 PDF</button>
  </div>`;
  openModal(html, true);
},
async receiptPDF(id) {
  const area = document.getElementById('receiptPrintArea');
  if (!area) return;
  const r = (db.finReceipts || []).find(x => x.id === id);
  const filename = r ? `receipt_${r.receiptNo || 'x'}.pdf` : 'receipt.pdf';
  await generatePDF(area.outerHTML, filename);
},
viewStudentFin(sid) {
  const H = finHelpers();
  const charges = (db.fin || []).filter(f => f.sid === sid);
  const receipts = (db.finReceipts || []).filter(r => r.sid === sid);
  const discounts = (db.finDiscounts || []).filter(d => d.sid === sid);
  const debt = H.totalDebt(sid);
  const paid = H.totalPaid(sid);
  const disc = H.totalDiscount(sid);
  const bal = H.balance(sid);
  const chargeRows = charges.map(c => `<tr>
    <td>${esc(c.type)}</td>
    <td>${fmoney(c.amount)}</td>
    <td>${c.due ? formatJalaliShort(c.due) : '—'}</td>
  </tr>`).join('');
  const receiptRows = receipts.sort((a, b) => b.ts - a.ts).map(r => `<tr>
    <td>#${esc(r.receiptNo || '—')}</td>
    <td>${fmoney(r.amount)}</td>
    <td>${esc(r.method || '—')}</td>
    <td>${formatJalaliShort(new Date(r.ts).toLocaleDateString('en-CA'))}</td>
  </tr>`).join('');
  const discountRows = discounts.map(d => `<tr>
    <td>${fmoney(d.amount)}</td>
    <td>${esc(d.reason || '—')}</td>
    <td>${formatJalaliShort(new Date(d.ts).toLocaleDateString('en-CA'))}</td>
  </tr>`).join('');

  const html = `<h2>${sname(sid)}</h2>
    <div class="stats" style="margin-bottom:16px">
      <div class="stat"><b>${fmoney(debt)}</b><small>${t('finTotalDebt')}</small></div>
      <div class="stat ok"><b>${fmoney(paid)}</b><small>${t('finTotalPaid')}</small></div>
      <div class="stat info"><b>${fmoney(disc)}</b><small>${t('finTotalDiscount')}</small></div>
      <div class="stat ${bal > 0 ? 'warn' : 'ok'}"><b>${fmoney(bal)}</b><small>${t('finTotalBalance')}</small></div>
    </div>
    <h3>${t('finCharges')}</h3>
    ${chargeRows ? `<table class="report-table"><thead><tr><th>${t('type')}</th><th>${t('amount')}</th><th>${t('due')}</th></tr></thead><tbody>${chargeRows}</tbody></table>` : empty(t('noData'))}
    <h3 style="margin-top:16px">${t('finPayments')}</h3>
    ${receiptRows ? `<table class="report-table"><thead><tr><th>#</th><th>${t('amount')}</th><th>${t('finMethod')}</th><th>${t('date')}</th></tr></thead><tbody>${receiptRows}</tbody></table>` : empty(t('noData'))}
    <h3 style="margin-top:16px">${t('finDiscounts')}</h3>
    ${discountRows ? `<table class="report-table"><thead><tr><th>${t('amount')}</th><th>${t('finReason')}</th><th>${t('date')}</th></tr></thead><tbody>${discountRows}</tbody></table>` : empty(t('noData'))}`;
  openModal(html, true);
},
notifyParentDebt(sid) {
  const s = db.students.find(x => x.id === sid);
  if (!s) return;
  const H = finHelpers();
  const bal = H.balance(sid);
  if (bal <= 0) return toast(LANG === 'fa' ? 'بدهی ندارد' : 'No debt', 'info');
  const parentUser = db.users.find(u => u.sid === sid && u.role === 'parent');
  if (!parentUser) return toast(LANG === 'fa' ? 'والد یافت نشد' : 'No parent', 'warn');
  if (!db.messages) db.messages = [];
  db.messages.push({
    id: uid(), from: me.id, to: parentUser.id,
    text: LANG === 'fa'
      ? `یادآوری: مانده بدهی ${s.name} مبلغ ${fmoney(bal)} است.`
      : `Reminder: ${s.name}'s balance is ${fmoney(bal)}.`,
    ts: Date.now(), read: false
  });
  save();
  toast(LANG === 'fa' ? 'یادآوری ارسال شد' : 'Reminder sent', 'ok');
},
exportFinReport() {
  const ids = mine().map(s => s.id);
  const charges = (db.fin || []).filter(f => ids.includes(f.sid));
  const receipts = (db.finReceipts || []).filter(r => ids.includes(r.sid));
  const discounts = (db.finDiscounts || []).filter(d => ids.includes(d.sid));

  const rows = [['type', 'student', 'amount', 'date', 'method_or_reason']];
  charges.forEach(c => rows.push(['charge', sname(c.sid), c.amount, c.due || '', c.type]));
  receipts.forEach(r => rows.push(['payment', sname(r.sid), r.amount, new Date(r.ts).toLocaleDateString('en-CA'), r.method]));
  discounts.forEach(d => rows.push(['discount', sname(d.sid), d.amount, new Date(d.ts).toLocaleDateString('en-CA'), d.reason]));

  csvDownload(rows, 'finance_report_' + iso() + '.csv');
  xlsxDownload(rows, 'finance_report_' + iso() + '.xlsx', 'Finance');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},
async exportFinPDF() {
  const container = document.querySelector('main');
  if (!container) return;
  await generatePDF(container.innerHTML, 'finance_report_' + iso() + '.pdf');
},
exportFinStudents() {
  const H = finHelpers();
  const S = mine();
  const rows = [['student', 'class', 'debt', 'paid', 'discount', 'balance', 'status']];
  S.forEach(s => {
    const st = H.statusFor(s.id);
    rows.push([
      s.name, (db.classes.find(c => c.id === s.classId) || {}).name || '',
      H.totalDebt(s.id), H.totalPaid(s.id), H.totalDiscount(s.id), H.balance(s.id), st.label
    ]);
  });
  csvDownload(rows, 'finance_students_' + iso() + '.csv');
  xlsxDownload(rows, 'finance_students_' + iso() + '.xlsx', 'Students');
  toast(LANG === 'fa' ? 'خروجی گرفته شد' : 'Exported', 'ok');
},

/* ============ Misc ============ */
toggleNotif() { toggleNotifPanel() },
closeNotif() {
  const p = document.getElementById('notifPanel');
  if (p) p.remove();
  notifPanelOpen = false;
},
markAllNotifRead() {
  (db.ann || []).forEach(a => {
    if (!a.readBy) a.readBy = [];
    if (!a.readBy.includes(me.id)) a.readBy.push(me.id);
  });
  (db.messages || []).forEach(m => { if (m.to === me.id) m.read = true });
  Object.values(chatCache).forEach(msgs => msgs.forEach(m => m.read = true));
  save(); ACT.closeNotif(); render(); toast(t('successfullySaved'), 'ok');
},
openNotif(id) {
  const list = getNotifications();
  const n = list.find(x => x.id === id);
  if (!n) return;
  if (n.type === 'ann') {
    const a = (db.ann || []).find(x => x.id === n.refId);
    if (a) {
      if (!a.readBy) a.readBy = [];
      if (!a.readBy.includes(me.id)) a.readBy.push(me.id);
      save();
    }
    page = 'ann'; location.hash = '#ann';
  } else if (n.type === 'msg') {
    const m = (db.messages || []).find(x => x.id === n.refId);
    if (m) m.read = true;
    save();
    page = 'msg'; location.hash = '#msg';
  } else if (n.type === 'chat') {
    chatPeer = n.refId;
    if (chatCache[chatPeer]) chatCache[chatPeer].forEach(m => m.read = true);
    page = 'chat'; location.hash = '#chat';
  } else if (n.type === 'leave') {
    page = 'leaves'; location.hash = '#leaves';
  } else if (n.type === 'absence') {
    page = 'att'; location.hash = '#att';
  }
  ACT.closeNotif();
  render();
},
openSearch() { openSearch() },
gsSelect(idx) {
  const item = window.__gsItems && window.__gsItems[+idx];
  if (item && item.action) { closeSearch(); item.action() }
},
toggleThemeMenu() {
  themeMenuOpen = !themeMenuOpen;
  render();
  if (themeMenuOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(ev) {
        if (!ev.target.closest('.theme-switch')) {
          themeMenuOpen = false;
          document.removeEventListener('click', closeMenu);
          render();
        }
      });
    }, 10);
  }
}
};