/* =========================================================================
   Views — بخش اصلی
   ========================================================================= */
const V = {};

/* ============ Dashboard ============ */
V.dash = function () {
  const S = mine();
  const ids = S.map(s => s.id);
  const gs = db.grades.filter(g => ids.includes(g.sid));
  const today = iso();
  const dayAtt = {};
  Object.keys(((db.att || {})[today] || {})).forEach(b => Object.assign(dayAtt, ((db.att || {})[today] || {})[b] || {}));

  const cls = myClasses().map(c => {
    const sids = db.students.filter(s => s.classId === c.id).map(s => s.id);
    return { n: c.name, a: avg(db.grades.filter(g => sids.includes(g.sid)).map(g => g.score)) };
  }).filter(x => x.a != null);

  const an = annList().slice(0, 3);
  const upcomingEvents = (db.showcase || []).filter(e => !e.date || e.date >= today)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(0, 3);
  const upcomingCal = (db.calendar || []).filter(c => c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  const dueHw = (() => {
    let list = (db.homework || []).filter(h => {
      if (scoped()) { const s = db.students.find(x => x.id === me.sid); return s && h.classId === s.classId }
      if (teacherScoped()) return (me.classIds || []).includes(h.classId);
      return true;
    });
    if (scoped() && me.sid) list = list.filter(h => !h.submissions || !h.submissions[me.sid]);
    else if (teacherScoped()) list = list.filter(h => {
      const classStudents = db.students.filter(s => s.classId === h.classId);
      return classStudents.some(s => !h.submissions || !h.submissions[s.id]);
    });
    else list = [];
    return list;
  })();

  const pendingLeaves = (db.leaves || []).filter(l => l.status === 'pending').length;
  const absenceWarn = mgr() || teacherScoped() ? studentsWithAbsenceWarning(3) : [];

  return head(t('dashboard'), `${t('welcome')} ${esc(me.name)}${db.year ? ` · ${esc(db.year)}` : ''}`) +
    `<div class="stats">
      <div class="stat acc"><b>${num(S.length)}</b><small>${t('students')}</small></div>
      ${scoped() ? '' : `<div class="stat"><b>${num(myClasses().length)}</b><small>${t('classes')}</small></div>
      <div class="stat ok"><b>${num(ids.filter(i => dayAtt[i] && dayAtt[i].status === 'p').length)}</b><small>${t('present')} ${LANG === 'fa' ? 'امروز' : 'today'}</small></div>
      <div class="stat bad"><b>${num(ids.filter(i => dayAtt[i] && dayAtt[i].status === 'a').length)}</b><small>${t('absent')} ${LANG === 'fa' ? 'امروز' : 'today'}</small></div>`}
      <div class="stat"><b>${f1(avg(gs.map(g => g.score)))}</b><small>${t('average')} ${t('grades')}</small></div>
      ${dueHw.length ? `<div class="stat warn"><b>${num(dueHw.length)}</b><small>${t('hw')} ${LANG === 'fa' ? 'در انتظار' : 'pending'}</small></div>` : ''}
      ${pendingLeaves && mgr() ? `<div class="stat warn"><b>${num(pendingLeaves)}</b><small>${t('leaves')} ${LANG === 'fa' ? 'در انتظار' : 'pending'}</small></div>` : ''}
    </div>` +
    (absenceWarn.length ? card(`⚠️ ${t('warnAbsence')}`, `
      <div class="stack">${absenceWarn.slice(0, 5).map(s => `
        <div class="row" style="padding:8px 0;border-bottom:1px solid var(--bd)">
          <span><b>${esc(s.name)}</b> <span class="mu">— ${num(s.absences)} ${t('absent')} / ${num(s.total)}</span></span>
          <button class="b sm" data-a="notifyParent" data-i="${esc(s.sid)}">${t('sendNotification')}</button>
        </div>`).join('')}</div>`) : '') +
    (scoped() ? '' : card(`${t('average')} ${t('grades')} ${LANG === 'fa' ? 'هر کلاس' : 'per class'}`, cls.length
      ? `<div class="bars">${cls.map(c => `<div><b>${f1(c.a)}</b><i style="height:${clamp(c.a * 5, 3, 100)}%"></i><span>${esc(c.n)}</span></div>`).join('')}</div>`
      : empty(t('empty'), '📊'))) +
    (upcomingEvents.length ? card(t('events') + ' ' + (LANG === 'fa' ? 'پیش‌رو' : 'Upcoming'),
      `<div class="events-grid">${upcomingEvents.map(e => evCardMini(e)).join('')}</div>`) : '') +
    (upcomingCal.length ? card(t('calendar'), `<div class="stack">${upcomingCal.map(c => `
      <div class="row" style="padding:8px 0;border-bottom:1px solid var(--bd)">
        <span><b>${esc(c.title)}</b></span>
        <span class="tag ${c.type === 'exam' ? 'bad' : c.type === 'holiday' ? 'warn' : c.type === 'deadline' ? 'info' : 'p'}">${formatJalaliShort(c.date)}</span>
      </div>`).join('')}</div>`) : '') +
    card(t('news'), (db.news || []).slice(0, 3).map(n => `<div class="ann"><div class="body"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${formatJalaliShort(n.date)}</small></div></div>`).join('') || empty(t('empty'), '📰')) +
    card(t('ann'), an.length
      ? an.map(a => `<div class="ann"><div class="body"><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div></div>`).join('')
      : empty(t('empty'), '📢'));
};

/* ============ Students ============ */
V.students = function () {
  const all = mine();
  const p = paginate(all, 'students');
  const rows = p.slice.map(s => `<tr data-s="${esc(s.name + s.nid + s.parent)}">
    <td><b>${esc(s.name)}</b></td>
    <td dir="ltr">${esc(s.nid)}</td>
    <td>${cname(s.classId)}</td>
    <td>${esc(s.parent)}</td>
    <td dir="ltr">${esc(s.phone)}</td>
    <td>
      <button class="b e sm" data-a="qrStudent" data-i="${esc(s.id)}">QR</button>
      ${mgr() ? editBtn('students', s.id) + ' ' + delBtn('students', s.id) : ''}
    </td>
  </tr>`);
  const importBox = mgr()
    ? `<div class="row start gap" style="margin-top:12px;flex-wrap:wrap">
        <label class="b sm" style="cursor:pointer">${t('import')} Excel<input type="file" accept=".xlsx,.xls,.csv" hidden onchange="ACT.importStudents(this.files[0])"></label>
        <button class="b sm" data-a="dlStudentTpl">${LANG === 'fa' ? 'دانلود قالب' : 'Download template'} CSV</button>
      </div>` : '';
  return head(t('students')) +
    (mgr() ? card(t('add') + ' ' + t('student'), `
      <form class="fm" onsubmit="ACT.addStudent(event)">
        <label>${t('name')}<input name="name" required></label>
        <label>${LANG === 'fa' ? 'کد ملی' : 'National ID'}<input name="nid" required pattern="[0-9۰-۹]{10}" inputmode="numeric"></label>
        <label>${t('className')}<select name="classId" required>${opts(myClasses().map(c => [c.id, c.name]))}</select></label>
        <label>${t('parent')}<input name="parent"></label>
        <label>${LANG === 'fa' ? 'تلفن ولی' : 'Parent Phone'}<input name="phone" dir="ltr"></label>
        <button class="b p">${t('add')}</button>
      </form>${importBox}`) : '') +
    card(`${t('students')} (${num(all.length)})`, `
      <div class="row" style="margin-bottom:12px">
        <input placeholder="${t('search2')}…" oninput="ACT.find(this.value)" style="flex:1;min-width:180px">
        <button class="b sm np" data-a="csvStudents">${t('export')} CSV</button>
      </div>` +
      tbl([t('name'), LANG === 'fa' ? 'کد ملی' : 'National ID', t('className'), t('parent'), LANG === 'fa' ? 'تلفن' : 'Phone', t('actions')], rows, t('empty'), '👥') +
      pagerHtml('students', p.total));
};

/* ============ Classes ============ */
V.classes = function () {
  const rows = myClasses().map(c => `<tr>
    <td><b>${esc(c.name)}</b></td>
    <td>${esc(c.grade)}</td>
    <td>${esc(c.room)}</td>
    <td>${num(db.students.filter(s => s.classId === c.id).length)}</td>
    <td>${mgr() ? editBtn('classes', c.id) + ' ' + delBtn('classes', c.id) : ''}</td>
  </tr>`);
  return head(t('classes')) +
    (mgr() ? card(t('add') + ' ' + t('classes'), `
      <form class="fm" onsubmit="ACT.addClass(event)">
        <label>${t('name')}<input name="name" required></label>
        <label>${LANG === 'fa' ? 'پایه' : 'Grade'}<input name="grade"></label>
        <label>${LANG === 'fa' ? 'اتاق' : 'Room'}<input name="room"></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', tbl([t('name'), LANG === 'fa' ? 'پایه' : 'Grade', LANG === 'fa' ? 'اتاق' : 'Room', t('students'), t('actions')], rows, t('empty'), '🏛️'));
};

/* ============ Grades ============ */
V.grades = function () {
  const all = db.grades.filter(g => {
    if (gf && g.sid !== gf) return false;
    if (teacherScoped()) { const s = db.students.find(x => x.id === g.sid); return s && me.classIds.includes(s.classId) }
    if (scoped()) return g.sid === me.sid;
    return true;
  });
  const p = paginate(all, 'grades');
  const rows = p.slice.map(g => `<tr>
    <td>${formatJalaliShort(g.date)}</td>
    <td>${sname(g.sid)}</td>
    <td>${esc(g.subject)}</td>
    <td>${esc(g.type)}</td>
    <td>${scoreTag(g.score)}</td>
    <td>${me.role !== 'parent' && me.role !== 'student' ? editBtn('grades', g.id) + ' ' + delBtn('grades', g.id) : ''}</td>
  </tr>`);

  const draftRows = gradeDraft.map((g, i) => `<tr>
    <td>${sname(g.sid)}</td><td>${esc(g.subject)}</td><td>${esc(g.type)}</td>
    <td>${scoreTag(g.score)}</td>
    <td><button class="b d sm" data-a="rmGradeDraft" data-i="${i}">${t('delete')}</button></td>
  </tr>`);
  const draftBox = needsConfirm() && gradeDraft.length
    ? `<div class="draft-bar">
        <span>📝 <b>${num(gradeDraft.length)}</b> ${LANG === 'fa' ? 'نمره در انتظار تأیید' : 'pending grades'}</span>
        <div>
          <button class="b sm" data-a="clearGradeDraft">${t('cancel')}</button>
          <button class="b ok sm" data-a="confirmGrades">${t('confirm')}</button>
        </div>
      </div>`
    + tbl([t('students'), t('subject'), t('type'), t('score'), ''], draftRows) : '';

  const formHtml = me.role !== 'parent' && me.role !== 'student'
    ? card(t('add') + ' ' + t('grades'), `
      <form class="fm" onsubmit="ACT.addGrade(event)">
        <label>${t('students')}<select name="sid" required>${stOpts()}</select></label>
        <label>${t('subject')}<input name="subject" required></label>
        <label>${t('type')}<select name="type">${opts([['میان‌ترم', 'میان‌ترم'], ['پایان‌ترم', 'پایان‌ترم'], ['کوییز', 'کوییز'], ['پروژه', 'پروژه']])}</select></label>
        <label>${t('score')} (0-20)<input name="score" required inputmode="decimal"></label>
        <button class="b p">${t('add')}</button>
      </form>${draftBox}`)
    : '';

  return head(t('grades')) + formHtml +
    card('', `
      <div class="row" style="margin-bottom:12px">
        <label style="max-width:220px">${t('students')}<select onchange="ACT.gf(this.value)"><option value="">${t('all')}</option>${stOpts(gf)}</select></label>
        <button class="b sm np" data-a="csvGrades">${t('export')} CSV</button>
      </div>` +
      tbl([t('date'), t('students'), t('subject'), t('type'), t('score'), t('actions')], rows, t('empty'), '📝') +
      pagerHtml('grades', p.total));
};

/* ============ Attendance ============ */
V.att = function () {
  const date = ad, bell = attBell;

  if (!canMarkAtt()) {
    const sids = mine().map(s => s.id);
    const rows = [];
    const dates = Object.keys(db.att || {}).sort().reverse();
    dates.forEach(d => {
      BELLS.forEach(b => {
        const day = attDay(d, b);
        sids.forEach(sid => {
          if (!day[sid]) return;
          const st = day[sid];
          const label = ST[st.status] ? ST[st.status].label[LANG] : '—';
          const tag = ST[st.status] ? ST[st.status].cls : '';
          const delay = st.status === 'l' && st.delay ? ` (${num(st.delay)} ${t('delayMinutes')})` : '';
          rows.push(`<tr>
            <td>${formatJalaliShort(d)}</td>
            <td>${t(b)}</td>
            <td>${sname(sid)}</td>
            <td><span class="tag ${tag}">${label}${delay}</span></td>
          </tr>`);
        });
      });
    });
    return head(t('att'), LANG === 'fa' ? 'فقط مشاهده' : 'View only') +
      card(t('history'), rows.length
        ? `<div class="ov"><table><thead><tr><th>${t('date')}</th><th>${t('bell')}</th><th>${t('students')}</th><th>${t('status')}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`
        : empty(t('empty'), '✅'));
  }

  const saved = attDay(date, bell);
  const day = needsConfirm() ? Object.assign({}, saved, attDraft) : saved;
  const list = mine().filter(s => !attClass || s.classId === attClass);
  const p = paginate(list, 'att');
  const summaryText = attSummaryText(date, bell);

  const bellsHtml = BELLS.map(b => {
    const filled = Object.keys(attDay(date, b)).length > 0;
    return `<button type="button" class="${b === bell ? 'on' : ''} ${filled && b !== bell ? 'has' : ''}" data-a="setBell" data-v="${esc(b)}">
      ${t(b)}${filled ? ' ✓' : ''}
    </button>`;
  }).join('');

  const cnt = k => num(Object.values(day).filter(r => r && r.status === k).length);
  const draftCount = Object.keys(attDraft).length;

  const rows = p.slice.map(s => {
    const cur = day[s.id] || {};
    const buttons = Object.keys(ST).map(k => `
      <button type="button" class="b sm ${cur.status === k ? 'on' : ''}" data-a="mark" data-i="${esc(s.id)}" data-v="${k}">
        ${ST[k].label[LANG]}
      </button>`).join(' ');
    const delayInput = cur.status === 'l'
      ? ` <input type="number" min="0" max="120" value="${cur.delay || 0}" style="width:70px;display:inline-block"
           onchange="ACT.setDelay('${esc(s.id)}', this.value)" title="${t('delayMinutes')}">`
      : '';
    return `<tr>
      <td><b>${esc(s.name)}</b></td>
      <td>${cname(s.classId)}</td>
      <td>${buttons}${delayInput}</td>
    </tr>`;
  });

  const draftBar = needsConfirm()
    ? (draftCount
      ? `<div class="draft-bar">
          <span>⚠️ <b>${num(draftCount)}</b> ${LANG === 'fa' ? 'تغییر در انتظار تأیید' : 'pending changes'} — <b>${t(bell)}</b> · ${formatJalaliShort(date)}</span>
          <div>
            <button type="button" class="b sm" data-a="clearAttDraft">${t('clearDraft')}</button>
            <button type="button" class="b ok sm" data-a="confirmAtt">${t('confirmAtt')} ${t(bell)}</button>
          </div>
        </div>`
      : `<p class="hint">${LANG === 'fa' ? '۱) زنگ را انتخاب کنید ← ۲) وضعیت را بزنید ← ۳) تأیید کنید' : '1) Pick bell 2) Mark status 3) Confirm'}</p>`)
    : `<p class="hint">${LANG === 'fa' ? 'زنگ انتخاب‌شده' : 'Selected bell'}: <b>${t(bell)}</b></p>`;

  return head(t('att'), `${t('attendanceFor')} «${t(bell)}» · ${formatJalali(date)}`) +
    card(`${t('selectDate')} & ${t('bell')}`, `
      <div class="row" style="margin-bottom:12px">
        <label style="max-width:200px">${t('selectDate')}
          <div class="dp-wrap">
            <input type="text" readonly value="${formatJalaliShort(date)}" data-jalali="${formatJalaliShort(date)}" onclick="ACT.openDP(this, v => { if(v) { ad=v; attDraft={}; render(); } })">
          </div>
        </label>
        <label style="max-width:200px">${t('selectClass')}<select onchange="ACT.attClass(this.value)">
          <option value="">${t('all')}</option>
          ${opts(myClasses().map(c => [c.id, c.name]), attClass)}
        </select></label>
        <button class="b p sm" data-a="openScanner">📷 ${t('scanQR')}</button>
      </div>
      <p class="hint" style="margin-bottom:8px">${t('bell')}:</p>
      <div class="bells">${bellsHtml}</div>
      <div class="row start gap" style="margin-top:12px">
        <button type="button" class="b" data-a="allP">${t('markAll')}</button>
        <button type="button" class="b" data-a="allA">${t('markAllAbsent')}</button>
        <span class="mu">${t('present')}: ${cnt('p')} · ${t('absent')}: ${cnt('a')} · ${t('late')}: ${cnt('l')} · ${t('excused')}: ${cnt('e')}</span>
        <button type="button" class="b sm np" data-a="csvAtt" style="margin-inline-start:auto">${t('export')} CSV</button>
      </div>
      ${draftBar}`) +
    (summaryText ? card(`${t('summary')} — ${t(bell)} · ${formatJalaliShort(date)}`, `<div class="summary-box">${summaryText}</div>`) : '') +
    card(`${t('students')} — ${t(bell)}`,
      tbl([t('students'), t('className'), t('status')], rows, t('empty'), '✅') +
      pagerHtml('att', p.total)) +
    attHeatmapCard();
};

function attHeatmapCard() {
  const S = mine();
  if (!S.length) return '';
  const dates = Object.keys(db.att || {}).sort().reverse().slice(0, 30);
  const bells = BELLS;
  const cells = [];
  dates.forEach(d => {
    bells.forEach(b => {
      const day = attDay(d, b);
      S.forEach(s => {
        const rec = day[s.id];
        const st = rec ? rec.status : 'none';
        cells.push(`<div class="cell ${st}" title="${esc(s.name)} — ${formatJalaliShort(d)} — ${t(b)} — ${rec ? ST[rec.status].label[LANG] : t('none')}"></div>`);
      });
    });
  });
  return card(t('heatmap') + ' — ' + (LANG === 'fa' ? '۳۰ روز اخیر' : 'Last 30 days'), `
    <div class="row start gap" style="margin-bottom:10px;font-size:12px">
      <span><span style="display:inline-block;width:12px;height:12px;background:var(--ok);border-radius:3px"></span> ${t('present')}</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:var(--bad);border-radius:3px"></span> ${t('absent')}</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:var(--warn);border-radius:3px"></span> ${t('late')}</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:var(--info);border-radius:3px"></span> ${t('excused')}</span>
    </div>
    <div class="heatmap">${cells.join('')}</div>
    <p class="hint">${LANG === 'fa' ? 'هر مربع نشان‌دهنده یک دانش‌آموز در یک زنگ و یک روز است' : 'Each cell = one student in one bell on one day'}</p>`);
}

/* ============ Analysis ============ */
V.analysis = function () {
  const S = mine();
  if (!S.length) return head(t('analysis')) + card('', empty(t('empty'), '📊'));

  const selected = S.find(x => x.id === rs) || S[0];
  const gs = db.grades.filter(g => g.sid === selected.id);
  const sorted = gs.slice().sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((g, i) => ({ x: i, y: g.score, label: `${g.subject} (${g.type})`, date: g.date }));
  const classMates = db.students.filter(s => s.classId === selected.classId);
  const classAvgScores = classMates.map(m => avg(db.grades.filter(g => g.sid === m.id).map(g => g.score))).filter(a => a != null);
  const classAvg = avg(classAvgScores);
  const studentAvg = avg(gs.map(g => g.score));
  const chartSvg = chartData.length > 1 ? renderLineChart(chartData, classAvg) : '<p class="mu">داده کافی نیست</p>';

  return head(t('analysis'), `${esc(selected.name)} · ${cname(selected.classId)}`) +
    (S.length > 1 ? card('', `<label style="max-width:260px">${t('students')}<select onchange="ACT.rs(this.value)">${stOpts(selected.id)}</select></label>`) : '') +
    `<div class="stats">
      <div class="stat ${studentAvg >= classAvg ? 'ok' : 'warn'}"><b>${f1(studentAvg)}</b><small>${t('average')} ${t('students')}</small></div>
      <div class="stat"><b>${f1(classAvg)}</b><small>${t('classAvg')}</small></div>
      <div class="stat ${studentAvg >= classAvg ? 'ok' : 'bad'}"><b>${studentAvg >= classAvg ? '+' : ''}${f1(studentAvg - classAvg)}</b><small>${t('compare')}</small></div>
      <div class="stat info"><b>${num(gs.length)}</b><small>${t('grades')}</small></div>
    </div>` +
    card(t('trend'), `<div class="line-chart">${chartSvg}</div>`) +
    card(t('grades'), (() => {
      const bySubject = {};
      gs.forEach(g => { (bySubject[g.subject] = bySubject[g.subject] || []).push(g) });
      const rows = Object.keys(bySubject).map(k => {
        const a = avg(bySubject[k].map(g => g.score));
        return `<tr>
          <td><b>${esc(k)}</b></td>
          <td>${num(bySubject[k].length)}</td>
          <td>${scoreTag(a)}</td>
          <td>${bySubject[k].map(g => `<span class="tag">${esc(g.type)}: ${f1(g.score)}</span>`).join(' ')}</td>
        </tr>`;
      });
      return rows.length
        ? tbl([t('subject'), t('count'), t('average'), LANG === 'fa' ? 'ریز' : 'Details'], rows)
        : empty(t('empty'), '📈');
    })()) +
    (() => {
      const att = attForStudent(selected.id);
      const total = att.p + att.a + att.l + att.e;
      const rate = total ? Math.round((att.p / total) * 100) : 0;
      return card(t('attendanceRate'), `
        <div class="stats">
          <div class="stat ok"><b>${num(att.p)}</b><small>${t('present')}</small></div>
          <div class="stat bad"><b>${num(att.a)}</b><small>${t('absent')}</small></div>
          <div class="stat warn"><b>${num(att.l)}</b><small>${t('late')}</small></div>
          <div class="stat info"><b>${num(rate)}%</b><small>${t('attendanceRate')}</small></div>
        </div>`);
    })() +
    card(t('leaderboard') + ' ' + t('provereshi'), (() => {
      const lb = provereshiLeaderboard();
      if (!lb.length) return empty(t('noData'), '🏆');
      const rows = lb.slice(0, 10).map((s, i) => `<tr>
        <td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : num(i + 1)}</td>
        <td><b>${esc(s.name)}</b></td>
        <td>${num(s.points)}</td>
        <td>${num(s.count)}</td>
        <td>${money(s.amount)}</td>
      </tr>`);
      return tbl(['#', t('students'), t('points'), t('activity'), t('amount')], rows);
    })());
};

function renderLineChart(data, classAvg) {
  const W = 800, H = 200, PAD = 40;
  const innerW = W - PAD * 2;
  const innerH = H - PAD;
  const maxY = 20;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD + i * stepX;
    const y = PAD + innerH - (d.y / maxY) * innerH;
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${PAD + innerW},${PAD + innerH} L${PAD},${PAD + innerH} Z`;
  const classLine = classAvg != null ? PAD + innerH - (classAvg / maxY) * innerH : null;
  const gridLines = [0, 5, 10, 15, 20].map(v => {
    const y = PAD + innerH - (v / maxY) * innerH;
    return `<line class="grid-line" x1="${PAD}" x2="${PAD + innerW}" y1="${y}" y2="${y}"/>
            <text class="axis-label" x="${PAD - 8}" y="${y + 4}" text-anchor="end">${v}</text>`;
  }).join('');
  const dots = points.map((p, i) => `
    <circle class="data-dot" cx="${p.x}" cy="${p.y}" r="4">
      <title>${esc(p.label)} — ${f1(p.y)} (${formatJalaliShort(p.date)})</title>
    </circle>`).join('');
  const classLineSvg = classLine != null
    ? `<line x1="${PAD}" x2="${PAD + innerW}" y1="${classLine}" y2="${classLine}" stroke="var(--mu)" stroke-dasharray="4 4" stroke-width="1.5"/>
       <text class="val-label" x="${PAD + innerW - 5}" y="${classLine - 5}" text-anchor="end" fill="var(--mu)">${LANG === 'fa' ? 'میانگین کلاس' : 'Class avg'}: ${f1(classAvg)}</text>`
    : '';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="var(--p)" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="var(--p)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${classLineSvg}
    <path class="data-area" d="${areaD}"/>
    <path class="data-line" d="${pathD}"/>
    ${dots}
  </svg>`;
}

function evCardMini(e, canEdit) {
  const imgStyle = e.img ? `style="background-image:url('${esc(e.img)}')"` : '';
  const icon = !e.img ? `<div class="empty-img">🎪</div>` : '';
  return `<div class="ev-card">
    <div class="img" ${imgStyle}>
      ${icon}
      ${e.cat ? `<span class="cat">${esc(t('categories')[e.cat] || e.cat)}</span>` : ''}
      ${e.pinned ? `<span class="pin">📌</span>` : ''}
    </div>
    <div class="body">
      <h3>${esc(e.title)}</h3>
      <p>${esc(e.desc || '')}</p>
      <div class="meta">
        <span>${formatJalaliShort(e.date)}</span>
        ${canEdit ? `<span class="actions">
          ${editBtn('showcase', e.id)}
          ${delBtn('showcase', e.id)}
        </span>` : ''}
      </div>
    </div>
  </div>`;
}

function pollsBlock() {
  const list = (db.polls || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (!list.length) return card(t('poll'), empty(t('noData'), '🗳️'));
  const body = list.map(pl => {
    const myVote = (pl.votes || {})[me.id];
    const total = Object.keys(pl.votes || {}).length;
    const counts = pl.options.map((_, i) => Object.values(pl.votes || {}).filter(v => v === i).length);
    const expired = pl.deadline && iso() > pl.deadline;
    const img = pl.img ? `<div class="ev-card"><div class="img" style="background-image:url('${esc(pl.img)}')"></div><div class="body"><h3>${esc(pl.title)}</h3></div></div>` : '';
    const optsHtml = pl.options.map((o, i) => {
      const pct = total ? Math.round(counts[i] / total * 100) : 0;
      const isMine = myVote === i;
      return `<label class="chk-group" style="display:block;padding:8px 12px;border:1px solid var(--bd);border-radius:10px;margin-bottom:6px;cursor:pointer;background:${isMine ? 'rgba(79,70,229,.1)' : 'var(--card)'}">
        <input type="radio" name="poll_${pl.id}" value="${i}" ${isMine ? 'checked' : ''} ${myVote !== undefined || expired ? 'disabled' : ''} onchange="ACT.vote('${pl.id}', ${i})">
        ${esc(o)}
        ${myVote !== undefined || expired ? `<span class="mu" style="float:left">${num(pct)}٪ (${num(counts[i])})</span>` : ''}
      </label>`;
    }).join('');
    return `<div class="card flat" style="margin-bottom:12px">
      <div class="row"><b>${esc(pl.title)}</b><span class="mu">${num(total)} ${t('votes')}${expired ? ' · ' + t('expired') : ''}</span></div>
      ${img}
      <div style="margin-top:10px">${optsHtml}</div>
      ${pl.deadline ? `<small class="mu">${t('deadline')}: ${formatJalaliShort(pl.deadline)}</small>` : ''}
    </div>`;
  }).join('');
  return card(t('poll'), body);
}

function stOpts(sel) {
  return opts(mine().map(s => [s.id, s.name]), sel);
}
function allStOpts(sel) {
  return opts(db.students.map(s => [s.id, s.name]), sel);
}