/* =========================================================================
   Utilities
   ========================================================================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const iso = () => new Date().toLocaleDateString('en-CA');
const fd = e => Object.fromEntries(new FormData(e.target));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const f1 = n => (n == null || n === '' || isNaN(+n)) ? '—' : (+n).toFixed(2);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const money = n => (n == null || n === '' || isNaN(+n)) ? '—'
  : (+n).toLocaleString(LANG === 'fa' ? 'fa-IR' : 'en-US') + (LANG === 'fa' ? ' تومان' : ' Toman');
const moneyCur = (n, cur) => (n == null || isNaN(+n)) ? '—'
  : (+n).toLocaleString(LANG === 'fa' ? 'fa-IR' : 'en-US') + ' ' + (cur || (LANG === 'fa' ? 'تومان' : 'Toman'));
const num = n => (n == null || isNaN(+n)) ? '—'
  : (+n).toLocaleString(LANG === 'fa' ? 'fa-IR' : 'en-US');

/* Toast */
const toast = (m, type) => {
  const x = $('#toast');
  x.textContent = m;
  x.className = 'show ' + (type || '');
  clearTimeout(x._t);
  x._t = setTimeout(() => x.className = '', 3200);
};

/* Modal */
let modal = null;
function openModal(html, wide) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'modalBg';
  bg.innerHTML = `<div class="modal${wide ? ' wide' : ''}">${html}
    <div class="row" style="margin-top:16px;justify-content:flex-end">
      <button class="b" data-a="closeModal">${t('close')}</button>
    </div></div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal() });
  document.body.appendChild(bg);
  modal = bg;
}
function closeModal() {
  if (modal) { modal.remove(); modal = null; window.editTarget = null; }
}

/* Image reading */
function readImageAsDataURL(file, maxKB) {
  maxKB = maxKB || 400;
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    if (!file.type.startsWith('image/')) return reject(new Error('Not an image'));
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        let quality = 0.85;
        let data = c.toDataURL('image/jpeg', quality);
        while (data.length / 1024 > maxKB && quality > 0.35) {
          quality -= 0.1;
          data = c.toDataURL('image/jpeg', quality);
        }
        resolve(data);
      };
      img.onerror = () => reject(new Error('Cannot read image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

/* CSRF token — برای API واقعی */
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
}

/* Pagination */
const PER_PAGE = 10;
const pg = { students: 1, grades: 1, fin: 1, users: 1, att: 1, news: 1, hw: 1, quiz: 1, msg: 1, disc: 1, events: 1, audit: 1, leaves: 1, poll: 1, finReceipts: 1, finDiscounts: 1 };

function paginate(arr, key) {
  if (!pg[key] || pg[key] < 1) pg[key] = 1;
  const total = Math.max(1, Math.ceil((arr || []).length / PER_PAGE));
  if (pg[key] > total) pg[key] = total;
  const start = (pg[key] - 1) * PER_PAGE;
  return { slice: arr.slice(start, start + PER_PAGE), total, page: pg[key] };
}
function pagerHtml(key, total) {
  if (total <= 1) return '';
  let h = '<div class="pager np">';
  h += `<button class="b sm" data-a="pg" data-i="${key}" data-v="${pg[key] - 1}" ${pg[key] <= 1 ? 'disabled' : ''}>${t('prev')}</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - pg[key]) <= 2)
      h += `<button class="b sm${i === pg[key] ? ' on' : ''}" data-a="pg" data-i="${key}" data-v="${i}">${num(i)}</button>`;
    else if (Math.abs(i - pg[key]) === 3) h += '<span class="mu">…</span>';
  }
  h += `<button class="b sm" data-a="pg" data-i="${key}" data-v="${pg[key] + 1}" ${pg[key] >= total ? 'disabled' : ''}>${t('next')}</button></div>`;
  return h;
}

/* HTML helpers */
const head = (title, sub) => `<h1>${title}</h1>${sub ? `<p class="mu">${sub}</p>` : ''}`;
const card = (h, b) => `<section class="card">${h ? `<h2>${h}</h2>` : ''}${b}</section>`;
const empty = (msg, ico) => `<div class="empty"><div class="ico">${ico || '📭'}</div><p>${msg}</p></div>`;
const tbl = (headers, rows, emptyMsg, ico) => rows.length
  ? `<div class="ov"><table><thead><tr>${headers.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
  : empty(emptyMsg || t('empty'), ico || '📭');
const opts = (arr, sel) => arr.map(x => `<option value="${esc(x[0])}"${String(x[0]) === String(sel) ? ' selected' : ''}>${esc(x[1])}</option>`).join('');
const delBtn = (c, i) => `<button class="b d sm" data-a="del" data-i="${esc(i)}" data-v="${c}">${t('delete')}</button>`;
const editBtn = (c, i) => `<button class="b e sm" data-a="edit" data-i="${esc(i)}" data-v="${c}">${t('edit')}</button>`;
const scoreTag = n => `<span class="tag ${n < 10 ? 'bad' : n >= 17 ? 'ok' : ''}">${f1(n)}</span>`;

/* CSV / XLSX */
function csvDownload(rows, filename) {
  const bom = '\uFEFF';
  const txt = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  a.click();
}
function xlsxDownload(rows, filename, sheetName) {
  if (typeof XLSX === 'undefined') return false;
  try {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    XLSX.writeFile(wb, filename);
    return true;
  } catch (e) { console.warn(e); return false }
}

/* PDF */
async function generatePDF(htmlContent, filename) {
  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    toast(LANG === 'fa' ? 'کتابخانه PDF لود نشده' : 'PDF library not loaded', 'bad');
    return;
  }
  try {
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (typeof html2canvas !== 'undefined') {
      const temp = document.createElement('div');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      temp.style.width = '800px';
      temp.style.background = '#fff';
      temp.innerHTML = htmlContent;
      document.body.appendChild(temp);
      const canvas = await html2canvas(temp, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = canvas.height * imgW / canvas.width;
      let y = 10;
      let remainH = imgH;
      while (remainH > 0) {
        doc.addImage(imgData, 'JPEG', 10, y, imgW, imgH);
        remainH -= (pageH - 20);
        if (remainH > 0) { doc.addPage(); y = 10; }
        else break;
      }
      temp.remove();
    } else {
      doc.setFontSize(16);
      doc.text('Parto School', 10, 20);
    }

    doc.save(filename || 'report.pdf');
    toast(LANG === 'fa' ? 'PDF دانلود شد' : 'PDF downloaded', 'ok');
  } catch (err) {
    console.error(err);
    toast(LANG === 'fa' ? 'خطا در ساخت PDF' : 'PDF error', 'bad');
  }
}

/* CSV parse */
function parseCSVText(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++ }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',' || c === ';' || c === '\t') { row.push(cur); cur = '' }
      else if (c === '\n' || (c === '\r' && n === '\n')) { if (c === '\r') i++; row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') { row.push(cur); rows.push(row); row = []; cur = '' }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function parseSheet(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    const isCsv = /\.(csv|txt)$/i.test(name) || (file.type || '').includes('csv');
    const isXls = /\.xlsx?$/i.test(name) || (file.type || '').includes('sheet') || (file.type || '').includes('excel');
    function readCsv() {
      const r = new FileReader();
      r.onload = e => {
        try {
          const rows = parseCSVText(e.target.result || '');
          rows.length ? resolve(rows) : reject(new Error('empty file'));
        } catch (err) { reject(err) }
      };
      r.onerror = () => reject(new Error('read failed'));
      r.readAsText(file, 'UTF-8');
    }
    if (isCsv || (!isXls && typeof XLSX === 'undefined')) return readCsv();
    if (typeof XLSX === 'undefined') return reject(new Error('xlsx not loaded'));
    const r = new FileReader();
    r.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', codepage: 65001, cellText: true, cellDates: true });
        const sh = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false });
        resolve(rows);
      } catch (err) { try { readCsv() } catch (e2) { reject(err) } }
    };
    r.onerror = () => reject(new Error('read failed'));
    r.readAsArrayBuffer(file);
  });
}

const normNid = v => {
  let s = en(String(v ?? '')).replace(/[^0-9]/g, '');
  if (s.length > 0 && s.length < 10) s = s.padStart(10, '0');
  return s;
};
const normPhone = v => en(String(v ?? '')).replace(/[^0-9]/g, '');

function validNid(n) {
  n = en(n);
  if (!/^\d{10}$/.test(n) || /^(\d)\1{9}$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += (+n[i]) * (10 - i);
  const r = s % 11;
  return (r < 2 && +n[9] === r) || (r >= 2 && +n[9] === 11 - r);
}

/* Hash */
async function hp(p, s) {
  if (!crypto.subtle) {
    let h = 5381;
    for (const c of s + p) h = (h * 33 ^ c.charCodeAt(0)) >>> 0;
    return 'x' + h;
  }
  const E = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', E.encode(p), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: E.encode(s), iterations: 100000, hash: 'SHA-256' },
    k, 256
  );
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function mkUser(username, name, role, pw, sid, classIds) {
  sid = sid || ''; classIds = classIds || [];
  const salt = uid() + uid();
  return { id: uid(), username, name, role, sid, classIds, salt, hash: await hp(pw, salt) };
}

/* Jalali Datepicker */
let activeDP = null;
function openDatepicker(input, onSelect) {
  // اگر قبلاً باز است ببند
  if (activeDP) { activeDP.remove(); activeDP = null; }
  if (!input) return;

  // بررسی: آیا input تاریخ شمسی نگه می‌دارد؟
  // input.value ISO میلادی است (YYYY-MM-DD) یا رشته شمسی؟
  // برای سازگاری، مقدار را ISO میلادی در input.value و شمسی در data-jalali نگه می‌داریم
  let cur = input.dataset.jalali || '';
  let [jy, jm, jd] = cur
    ? cur.split('/').map(Number)
    : dateToJalali(input.value ? new Date(input.value + 'T12:00:00') : new Date());

  const wrap = input.closest('.dp-wrap') || input.parentElement;
  wrap.classList.add('dp-wrap');
  const popup = document.createElement('div');
  popup.className = 'dp-popup open';
  wrap.appendChild(popup);
  activeDP = popup;

  function renderDP() {
    const monthName = (LANG === 'fa' ? JALALI_MONTHS_FA : JALALI_MONTHS_EN)[jm - 1];
    const total = jalaliMonthDays(jy, jm);
    // روز اول ماه در هفته شمسی
    const firstDate = jalaliToDate(jy, jm, 1);
    const firstWeekday = jalaliWeekday(firstDate); // 0=شنبه
    const weekdays = LANG === 'fa' ? JALALI_WEEKDAYS_FA : JALALI_WEEKDAYS_EN;
    const today = new Date();
    const [tjy, tjm, tjd] = dateToJalali(today);

    let cells = '';
    // خانه‌های خالی قبل
    for (let i = 0; i < firstWeekday; i++) cells += '<button disabled></button>';
    for (let d = 1; d <= total; d++) {
      const isToday = (jy === tjy && jm === tjm && d === tjd);
      const isSel = (cur === `${jy}/${String(jm).padStart(2, '0')}/${String(d).padStart(2, '0')}`);
      cells += `<button data-dp-day="${d}" class="${isToday ? 'today' : ''}${isSel ? ' sel' : ''}">${LANG === 'fa' ? toFa(d) : d}</button>`;
    }

    popup.innerHTML = `
      <div class="dp-head">
        <button data-dp-nav="-1">‹</button>
        <span class="title">${monthName} ${LANG === 'fa' ? toFa(jy) : jy}</span>
        <button data-dp-nav="1">›</button>
      </div>
      <div class="dp-grid">
        ${weekdays.map(w => `<div class="wd">${w}</div>`).join('')}
        ${cells}
      </div>
      <div class="dp-foot">
        <button data-dp-today>${t('dpToday')}</button>
        <button data-dp-clear>${t('dpClear')}</button>
      </div>
    `;

    // رویدادها
    popup.querySelectorAll('[data-dp-nav]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const delta = +btn.dataset.dpNav;
        jm += delta;
        if (jm < 1) { jm = 12; jy--; }
        if (jm > 12) { jm = 1; jy++; }
        renderDP();
      };
    });
    popup.querySelectorAll('[data-dp-day]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        jd = +btn.dataset.dpDay;
        cur = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
        const isoStr = jalaliToISO(cur);
        input.value = isoStr;
        input.dataset.jalali = cur;
        if (onSelect) onSelect(isoStr, cur);
        closeDP();
      };
    });
    popup.querySelector('[data-dp-today]').onclick = (e) => {
      e.stopPropagation();
      const [y, m, d] = dateToJalali(new Date());
      jy = y; jm = m; jd = d;
      renderDP();
    };
    popup.querySelector('[data-dp-clear]').onclick = (e) => {
      e.stopPropagation();
      input.value = '';
      input.dataset.jalali = '';
      if (onSelect) onSelect('', '');
      closeDP();
    };
  }

  function closeDP() {
    popup.remove();
    activeDP = null;
    document.removeEventListener('click', onDocClick);
  }
  function onDocClick(ev) {
    if (!popup.contains(ev.target) && ev.target !== input && !wrap.contains(ev.target)) {
      closeDP();
    }
  }

  renderDP();
  setTimeout(() => document.addEventListener('click', onDocClick), 0);
}

/* مقادیر پیش‌فرض */
let me = null, page = 'dash';
let THEME = localStorage.getItem('parto_theme') || 'light';
let attClass = '', attBell = 'bell1', ad = todayISO();
let gf = '', rs = '';
let fails = 0, lock = 0;
let attDraft = {};
let gradeDraft = [];
let chatPeer = null, chatCache = {};
let quizSession = null, quizTimer = null;
let provereshiTab = 'events';
let provEventView = null;
let calJY = 0, calJM = 0; // مقداردهی اولیه در app.js
let ttClassId = '';
let notifPanelOpen = false;
let searchOpen = false;
let otpPending = null;
let themeMenuOpen = false;
let scannerStream = null;
let pendingFile = {}; // for image preview

const BELLS = ['bell1', 'bell2', 'bell3', 'bell4', 'bell5', 'bell6', 'bell7'];
const ST = {
  p: { label: { fa: 'حاضر', en: 'Present' }, cls: 'ok' },
  a: { label: { fa: 'غایب', en: 'Absent' }, cls: 'bad' },
  l: { label: { fa: 'تأخیر', en: 'Late' }, cls: 'warn' },
  e: { label: { fa: 'مرخصی', en: 'Excused' }, cls: 'info' }
};

const ROLE = {
  admin: { fa: 'مدیر', en: 'Admin' },
  vice: { fa: 'معاون', en: 'Vice Principal' },
  teacher: { fa: 'معلم', en: 'Teacher' },
  parent: { fa: 'ولی', en: 'Parent' },
  student: { fa: 'دانش‌آموز', en: 'Student' }
};

const PERM = {
  admin: ['dash', 'events', 'news', 'students', 'classes', 'grades', 'att', 'hw', 'quiz', 'poll', 'disc', 'online', 'msg', 'chat', 'ann', 'fin', 'rep', 'users', 'acc', 'set', 'provereshi', 'calendar', 'timetable', 'audit', 'leaves', 'analysis'],
  vice: ['dash', 'events', 'news', 'students', 'classes', 'grades', 'att', 'hw', 'quiz', 'poll', 'disc', 'online', 'msg', 'chat', 'ann', 'rep', 'users', 'acc', 'provereshi', 'calendar', 'timetable', 'leaves', 'analysis'],
  teacher: ['dash', 'events', 'news', 'students', 'grades', 'att', 'hw', 'quiz', 'poll', 'disc', 'online', 'msg', 'chat', 'ann', 'rep', 'acc', 'provereshi', 'calendar', 'timetable', 'leaves', 'analysis'],
  parent: ['dash', 'events', 'news', 'att', 'hw', 'poll', 'disc', 'online', 'msg', 'chat', 'ann', 'fin', 'rep', 'acc', 'calendar', 'leaves'],
  student: ['dash', 'events', 'news', 'att', 'hw', 'quiz', 'poll', 'online', 'msg', 'chat', 'ann', 'rep', 'acc', 'calendar']
};

const PAGES = [
  ['dash', '📊', 'dashboard'],
  ['events', '🎪', 'events'],
  ['news', '📰', 'news'],
  ['provereshi', '🏫', 'provereshi'],
  ['calendar', '📅', 'calendar'],
  ['timetable', '📋', 'timetable'],
  ['students', '👥', 'students'],
  ['classes', '🏛️', 'classes'],
  ['grades', '📝', 'grades'],
  ['att', '✅', 'att'],
  ['leaves', '🌴', 'leaves'],
  ['hw', '📚', 'hw'],
  ['quiz', '🧪', 'quiz'],
  ['poll', '🗳️', 'poll'],
  ['disc', '⚖️', 'disc'],
  ['online', '🎥', 'online'],
  ['msg', '✏️', 'msg'],
  ['chat', '💬', 'chat'],
  ['ann', '📢', 'ann'],
  ['fin', '💰', 'fin'],
  ['rep', '📈', 'rep'],
  ['analysis', '📊', 'analysis'],
  ['users', '👤', 'users'],
  ['audit', '📋', 'audit'],
  ['acc', '🔑', 'acc'],
  ['set', '⚙️', 'set']
];

const PROV_OP = {
  coupon: { fa: 'کوپن / خرید', en: 'Coupon / Purchase' },
  attend: { fa: 'ثبت حضور', en: 'Attendance' },
  vote: { fa: 'رأی‌گیری', en: 'Voting' },
  custom: { fa: 'عمومی', en: 'General' }
};
const PROV_ICONS = ['🍲', '🕌', '🗳️', '📚', '🏕️', '🏆', '🎯', '🎨', '⚪', '🎵', '🌝', '🤝', '💰', '🎓', '📖', '🍱', '🎬', '🍎'];
const EVENT_CATS = ['مذهبی', 'فرهنگی', 'ورزشی', 'علمی', 'اجتماعی', 'اردو', 'جشن', 'عمومی'];

const AUDIT_ACTIONS = {
  login: { fa: 'ورود', en: 'Login' }, logout: { fa: 'خروج', en: 'Logout' },
  del: { fa: 'حذف', en: 'Delete' }, edit: { fa: 'ویرایش', en: 'Edit' },
  add: { fa: 'افزودن', en: 'Add' }, grade_add: { fa: 'ثبت نمره', en: 'Grade Added' },
  grade_change: { fa: 'تغییر نمره', en: 'Grade Changed' }, att_change: { fa: 'تغییر حضور', en: 'Attendance Changed' },
  role_change: { fa: 'تغییر نقش', en: 'Role Changed' }, coupon: { fa: 'ثبت کوپن', en: 'Coupon' },
  vote: { fa: 'رأی', en: 'Vote' }, leave_request: { fa: 'درخواست مرخصی', en: 'Leave Request' },
  leave_action: { fa: 'بررسی مرخصی', en: 'Leave Action' },
  prov_event: { fa: 'رویداد پرورشی', en: 'Prov Event' },
  election: { fa: 'انتخابات', en: 'Election' }, showcase: { fa: 'رویداد عمومی', en: 'Showcase' },
  fin_add: { fa: 'افزودن تراکنش مالی', en: 'Finance Add' },
  fin_receipt: { fa: 'رسید پرداخت', en: 'Receipt' },
  fin_discount: { fa: 'تخفیف', en: 'Discount' }
};

/* =========================================================================
   Scoping helpers (بعد از db تعریف)
   ========================================================================= */
function scoped() { return me && (me.role === 'parent' || me.role === 'student'); }
function teacherScoped() { return me && me.role === 'teacher' && (me.classIds || []).length > 0; }
function mine() {
  if (scoped()) return db.students.filter(s => s.id === me.sid);
  if (teacherScoped()) return db.students.filter(s => me.classIds.includes(s.classId));
  return db.students;
}
function myClasses() {
  return teacherScoped() ? db.classes.filter(c => me.classIds.includes(c.id)) : db.classes;
}
const sname = id => esc((db.students.find(s => s.id === id) || {}).name || '—');
const cname = id => esc((db.classes.find(c => c.id === id) || {}).name || '—');
const uname = id => esc((db.users.find(u => u.id === id) || {}).name || '—');
const mgr = () => me && (me.role === 'admin' || me.role === 'vice');
const isAdmin = () => me && me.role === 'admin';
const canMarkAtt = () => me && (me.role === 'admin' || me.role === 'vice' || me.role === 'teacher');
const needsConfirm = () => me && me.role === 'teacher';
const isProvereshiMgr = () => me && (me.role === 'admin' || me.role === 'vice');
const provType = id => (db.provTypes || []).find(t => t.id === id);
const provEvent = id => (db.provEvents || []).find(e => e.id === id);
const provRecordsFor = (eventId, sid) => (db.provRecords || []).filter(r =>
  r.eventId === eventId && (!sid || r.sid === sid)
);
const allowedChatPeers = () => {
  if (!me) return [];
  const others = db.users.filter(u => u.id !== me.id);
  if (me.role === 'admin' || me.role === 'vice') return others;
  if (me.role === 'teacher') {
    return others.filter(u => {
      if (u.role === 'admin' || u.role === 'vice' || u.role === 'teacher') return true;
      if ((u.role === 'student' || u.role === 'parent') && u.sid) {
        const st = db.students.find(s => s.id === u.sid);
        return st && (me.classIds || []).includes(st.classId);
      }
      return false;
    });
  }
  if (me.role === 'student' || me.role === 'parent') {
    const st = db.students.find(s => s.id === me.sid);
    const cid = st && st.classId;
    return others.filter(u => {
      if (u.role === 'admin' || u.role === 'vice') return true;
      if (u.role === 'teacher' && cid && (u.classIds || []).includes(cid)) return true;
      return false;
    });
  }
  return [];
};

function attDay(date, bell) {
  return ((db.att || {})[date] || {})[bell] || {};
}
function attForStudent(sid) {
  const stat = { p: 0, a: 0, l: 0, e: 0 };
  Object.keys(db.att || {}).forEach(d => {
    Object.keys(db.att[d] || {}).forEach(b => {
      const rec = db.att[d][b][sid];
      if (rec && stat[rec.status] !== undefined) stat[rec.status]++;
    });
  });
  return stat;
}
function attSummaryText(date, bell) {
  const day = attDay(date, bell);
  const ids = Object.keys(day);
  if (!ids.length) return null;
  const groups = { p: [], a: [], l: [], e: [] };
  ids.forEach(id => {
    const r = day[id];
    const name = (db.students.find(s => s.id === id) || {}).name || '—';
    if (groups[r.status]) groups[r.status].push({ name, delay: r.delay || 0 });
  });
  const parts = [];
  if (groups.p.length) parts.push(`<span class="p">${groups.p.map(x => esc(x.name)).join('، ')} ${t('present')}</span>`);
  if (groups.a.length) parts.push(`<span class="a">${groups.a.map(x => esc(x.name)).join('، ')} ${t('absent')}</span>`);
  if (groups.l.length) parts.push(`<span class="l">${groups.l.map(x => esc(x.name) + (x.delay ? ` (${num(x.delay)})` : '')).join('، ')} ${t('late')}</span>`);
  if (groups.e.length) parts.push(`${groups.e.map(x => esc(x.name)).join('، ')} ${t('excused')}`);
  return parts.join(' · ');
}
function studentsWithAbsenceWarning(minAbsences) {
  minAbsences = minAbsences || 3;
  const result = [];
  mine().forEach(s => {
    const stat = attForStudent(s.id);
    if (stat.a >= minAbsences) {
      result.push({ sid: s.id, name: s.name, absences: stat.a, total: stat.p + stat.a + stat.l + stat.e });
    }
  });
  return result.sort((a, b) => b.absences - a.absences);
}
function annList() {
  return (db.ann || [])
    .filter(a => {
      if (isProvereshiMgr()) return true;
      if (a.target === 'all') return true;
      if (a.target === me.role) return true;
      if (a.target === 'class' && a.classId) {
        const st = db.students.find(s => s.id === me.sid);
        return st && st.classId === a.classId;
      }
      return false;
    })
    .sort((x, y) => (y.ts || 0) - (x.ts || 0));
}
function audit(action, target, detail) {
  if (!db.audit) db.audit = [];
  db.audit.unshift({
    id: uid(), userId: me ? me.id : null,
    action, target: String(target || ''), detail: String(detail || ''),
    ts: Date.now()
  });
  if (db.audit.length > 500) db.audit.length = 500;
  save();
}