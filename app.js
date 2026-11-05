/* =========================================================================
   Render + Init + Edit Form + Notification + Global Search
   ========================================================================= */

/* ============ Provereshi Tabs ============ */
function provEventsTab() {
  const evs = (db.provEvents || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const rows = evs.map(e => {
    const tp = provType(e.typeId);
    const records = provRecordsFor(e.id);
    return `<div class="prov-tile">
      <span class="count">${num(records.length)} ${LANG === 'fa' ? 'رکورد' : 'records'}</span>
      <div class="ico">${tp ? tp.icon : '📍'}</div>
      <h3>${esc(e.title)}</h3>
      <div class="mu">${tp ? esc(tp.name) : '—'} · ${formatJalaliShort(e.date)}</div>
      <div class="leaders">${t('leaders')}: <b>${(e.leaders || []).map(id => uname(id)).join('، ') || '—'}</b></div>
      <div class="actions row gap" style="margin-top:10px">
        <button class="b p sm" data-a="provOpenEvent" data-i="${e.id}">${t('edit')}</button>
        ${isProvereshiMgr() ? `<button class="b e sm" data-a="provEditEvent" data-i="${e.id}">${t('edit')}</button>
        <button class="b d sm" data-a="del" data-i="${e.id}" data-v="provEvents">${t('delete')}</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const form = isProvereshiMgr() ? card(t('add'), `
    <form class="fm" onsubmit="ACT.addProvEvent(event)">
      <label>${t('eventTitle')}<input name="title" required></label>
      <label>${t('type')}<select name="typeId" required>
        ${opts((db.provTypes || []).filter(x => x.active).map(x => [x.id, x.icon + ' ' + x.name]))}
      </select></label>
      <label>${t('date')}
        <div class="dp-wrap">
          <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
          <input type="hidden" name="date" value="${iso()}">
        </div>
      </label>
      <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="2"></textarea></label>
      <label style="grid-column:1/-1">${t('leaders')}
        <div class="chk-group">
          ${db.users.filter(u => u.role !== 'admin').map(u =>
    `<label><input type="checkbox" name="leaders" value="${u.id}"> ${esc(u.name)} (${ROLE[u.role][LANG]})</label>`
  ).join('')}
        </div>
      </label>
      <label class="inline"><input type="checkbox" name="active" checked> ${LANG === 'fa' ? 'فعال' : 'Active'}</label>
      <button class="b p">${t('add')}</button>
    </form>`) : '';

  return form + card(t('provEvents'),
    evs.length ? `<div class="prov-grid">${rows}</div>` : empty(t('empty'), '🏫'));
}

function provCouponTab() {
  const couponType = (db.provTypes || []).find(x => x.op === 'coupon');
  if (!couponType) return empty(LANG === 'fa' ? 'نوع «کوپن» تعریف نشده' : 'Coupon type not defined', '🍲');
  const evs = (db.provEvents || []).filter(e => e.typeId === couponType.id && e.active !== false);
  const myLeads = evs.filter(e => isProvereshiMgr() || (e.leaders || []).includes(me.id));
  if (!myLeads.length) return empty(LANG === 'fa' ? 'شما سرپرست بوفه نیستید' : 'You are not a cafeteria leader', '🍲');

  const activeEvent = provEventView ? (myLeads.find(e => e.id === provEventView) || myLeads[0]) : myLeads[0];
  const records = provRecordsFor(activeEvent.id).sort((a, b) => b.ts - a.ts);
  const totalAmount = records.reduce((s, r) => s + (+(r.data && r.data.amount || 0)), 0);
  const todayRecords = records.filter(r => new Date(r.ts).toLocaleDateString('en-CA') === iso());

  const rows = records.slice(0, 30).map(r => `<tr>
    <td>${sname(r.sid)}</td>
    <td>${esc(r.data && r.data.item || '—')}</td>
    <td>${fmoney(r.data && r.data.amount || 0)}</td>
    <td>${formatJalaliShort(new Date(r.ts).toLocaleDateString('en-CA'))}</td>
    <td>${uname(r.by)}</td>
    <td>${isProvereshiMgr() ? delBtn('provRecords', r.id) : ''}</td>
  </tr>`);

  const eventSelector = myLeads.length > 1
    ? `<label style="max-width:320px">${LANG === 'fa' ? 'رویداد فعال' : 'Active event'}<select onchange="ACT.provSelectEvent(this.value)">
        ${opts(myLeads.map(e => [e.id, e.title + ' · ' + formatJalaliShort(e.date)]), activeEvent.id)}
      </select></label>` : '';

  return card(t('provCoupon') + ' — ' + esc(activeEvent.title), `
    <div class="stats">
      <div class="stat"><b>${num(records.length)}</b><small>${LANG === 'fa' ? 'کل کوپن' : 'Total coupons'}</small></div>
      <div class="stat ok"><b>${fmoney(totalAmount)}</b><small>${t('total')}</small></div>
      <div class="stat warn"><b>${num(todayRecords.length)}</b><small>${LANG === 'fa' ? 'امروز' : 'Today'}</small></div>
    </div>
    <div class="row" style="margin-top:14px">${eventSelector}</div>
    <form class="fm" onsubmit="ACT.addCoupon(event)" style="margin-top:14px">
      <label>${t('students')}<select name="sid" required>${allStOpts()}</select></label>
      <label>${t('couponItem')}<input name="item" required></label>
      <label>${t('couponAmount')}<input name="amount" inputmode="numeric" required></label>
      <button class="b p">${t('couponAdd')}</button>
    </form>
    <h3 style="margin-top:18px">${LANG === 'fa' ? 'آخرین کوپن‌ها' : 'Recent coupons'}</h3>
    ${tbl([t('students'), t('couponItem'), t('amount'), t('date'), LANG === 'fa' ? 'ثبت‌کننده' : 'By', ''], rows, t('empty'), '🍲')}`);
}

function provAttendTab() {
  const attendType = (db.provTypes || []).find(x => x.op === 'attend');
  if (!attendType) return empty(LANG === 'fa' ? 'نوع «حضور» تعریف نشده' : 'Attendance type not defined', '🕌');
  const evs = (db.provEvents || []).filter(e => e.typeId === attendType.id && e.active !== false);
  const myLeads = evs.filter(e => isProvereshiMgr() || (e.leaders || []).includes(me.id));
  if (!myLeads.length) return empty(LANG === 'fa' ? 'شما سرپرست نمازخانه نیستید' : 'You are not a prayer room leader', '🕌');

  const activeEvent = provEventView ? (myLeads.find(e => e.id === provEventView) || myLeads[0]) : myLeads[0];
  const records = provRecordsFor(activeEvent.id).sort((a, b) => b.ts - a.ts);
  const todayStr = iso();
  const todayRecords = records.filter(r => new Date(r.ts).toLocaleDateString('en-CA') === todayStr);

  const rows = todayRecords.map(r => `<tr>
    <td>${sname(r.sid)}</td>
    <td>${esc(r.data && r.data.status || '—')}</td>
    <td>${esc(r.data && r.data.note || '—')}</td>
    <td>${new Date(r.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
    <td>${uname(r.by)}</td>
    <td>${isProvereshiMgr() ? delBtn('provRecords', r.id) : ''}</td>
  </tr>`);

  const eventSelector = myLeads.length > 1
    ? `<label style="max-width:320px">${LANG === 'fa' ? 'رویداد فعال' : 'Active event'}<select onchange="ACT.provSelectEvent(this.value)">
        ${opts(myLeads.map(e => [e.id, e.title]), activeEvent.id)}
      </select></label>` : '';

  return card(t('provAttend') + ' — ' + esc(activeEvent.title), `
    <div class="stats">
      <div class="stat ok"><b>${num(todayRecords.length)}</b><small>${LANG === 'fa' ? 'حاضر امروز' : 'Present today'}</small></div>
      <div class="stat"><b>${num(records.length)}</b><small>${LANG === 'fa' ? 'کل رکوردها' : 'Total records'}</small></div>
    </div>
    <div class="row" style="margin-top:14px">${eventSelector}</div>
    <form class="fm" onsubmit="ACT.addAttendRecord(event)" style="margin-top:14px">
      <label>${t('students')}<select name="sid" required>${allStOpts()}</select></label>
      <label>${t('status')}<select name="status">
        ${opts([['حاضر', t('present')], ['غایب', t('absent')], ['امانت', LANG === 'fa' ? 'امانت' : 'Borrowed'], ['سایر', LANG === 'fa' ? 'سایر' : 'Other']])}
      </select></label>
      <label>${LANG === 'fa' ? 'توضیح' : 'Note'}<input name="note"></label>
      <button class="b p">${t('attendAdd')}</button>
    </form>
    <h3 style="margin-top:18px">${LANG === 'fa' ? 'امروز' : 'Today'}</h3>
    ${tbl([t('students'), t('status'), LANG === 'fa' ? 'توضیح' : 'Note', t('time'), LANG === 'fa' ? 'ثبت‌کننده' : 'By', ''], rows, t('empty'), '🕌')}`);
}

function provVoteTab() {
  const voteType = (db.provTypes || []).find(x => x.op === 'vote');
  if (!voteType) return empty(LANG === 'fa' ? 'نوع «رأی‌گیری» تعریف نشده' : 'Voting type not defined', '🗳️');
  const elections = (db.provElections || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const openElections = elections.filter(el => el.open);
  const closedElections = elections.filter(el => !el.open);
  const mgrUser = isProvereshiMgr();

  let html = '';

  if (mgrUser) {
    html += card(t('electionCreate'), `
      <form class="fm" onsubmit="ACT.addElection(event)">
        <label style="grid-column:1/-1">${t('eventTitle')}<input name="title" required></label>
        <label>${t('deadline')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="deadline">
          </div>
        </label>
        <label style="grid-column:1/-1">${t('candidates')}</label>
        <textarea name="candidates" rows="5" required placeholder="${LANG === 'fa' ? 'علی احمدی\nزهرا رضایی' : 'Ali Ahmadi\nZahra Rezaei'}"></textarea>
        <button class="b p">${t('electionCreate')}</button>
      </form>`);
  }

  html += card(LANG === 'fa' ? 'انتخابات باز' : 'Open Elections',
    openElections.length ? openElections.map(el => {
      const totalVotes = Object.keys(el.votes || {}).length;
      const counts = el.candidates.map((_, i) => Object.values(el.votes || {}).filter(v => v === i).length);
      const myVote = (el.votes || {})[me.id];
      const hasVoted = myVote !== undefined;

      const candCards = el.candidates.map((c, i) => {
        const pct = totalVotes ? Math.round(counts[i] / totalVotes * 100) : 0;
        const voters = mgrUser ? Object.entries(el.votes || {}).filter(([_, v]) => v === i).map(([uid]) => uname(uid)) : [];
        const selected = myVote === i;
        return `<div class="vote-card ${selected ? 'selected' : ''}">
          <div class="av">${esc(c.name.slice(0, 1))}</div>
          <h3>${esc(c.name)}</h3>
          ${hasVoted || !el.open
            ? `<div class="votes-bar"><i style="width:${pct}%"></i></div>
               <div class="votes-num">${num(counts[i])} ${t('votes')} (${num(pct)}%)</div>`
            : `<button class="b p sm" data-a="provCastVote" data-i="${el.id}" data-v="${i}" style="width:100%">${t('voteNow')}</button>`}
          ${mgrUser && hasVoted && voters.length
            ? `<div class="voter-list">${voters.map(v => esc(v)).join('، ')}</div>` : ''}
        </div>`;
      }).join('');

      return `<div class="card flat" style="margin-bottom:14px">
        <div class="row">
          <b>${esc(el.title)}</b>
          <span class="tag">${num(totalVotes)} ${t('votes')} · ${el.open ? '✓ ' + (LANG === 'fa' ? 'باز' : 'Open') : (LANG === 'fa' ? 'بسته' : 'Closed')}</span>
        </div>
        ${el.deadline ? `<small class="mu">${t('deadline')}: ${formatJalaliShort(el.deadline)}</small>` : ''}
        <div class="vote-grid">${candCards}</div>
        ${mgrUser ? `<div class="row" style="margin-top:12px">
          <button class="b sm" data-a="provToggleElection" data-i="${el.id}">${el.open ? (LANG === 'fa' ? 'بستن' : 'Close') : (LANG === 'fa' ? 'باز کردن' : 'Reopen')}</button>
          <button class="b d sm" data-a="del" data-i="${el.id}" data-v="provElections">${t('delete')}</button>
        </div>` : ''}
      </div>`;
    }).join('') : empty(LANG === 'fa' ? 'انتخابات بازی نیست' : 'No open elections', '🗳️'));

  if (closedElections.length) {
    html += card(LANG === 'fa' ? 'انتخابات پایان‌یافته' : 'Closed Elections',
      closedElections.map(el => {
        const totalVotes = Object.keys(el.votes || {}).length;
        const counts = el.candidates.map((_, i) => Object.values(el.votes || {}).filter(v => v === i).length);
        const winIdx = counts.indexOf(Math.max(...counts));
        return `<div class="card flat" style="margin-bottom:10px">
          <b>${esc(el.title)}</b>
          <div class="mu">${t('winner')}: <b>${el.candidates[winIdx] ? esc(el.candidates[winIdx].name) : '—'}</b> — ${num(counts[winIdx] || 0)} ${t('votes')} / ${num(totalVotes)}</div>
        </div>`;
      }).join(''));
  }

  return html;
}

function provTypesTab() {
  if (!isProvereshiMgr()) return empty(t('accessDenied'), '🔒');
  const types = db.provTypes || [];
  const rows = types.map(tp => `<tr>
    <td><b>${esc(tp.icon)} ${esc(tp.name)}</b></td>
    <td>${esc(PROV_OP[tp.op] ? PROV_OP[tp.op][LANG] : tp.op)}</td>
    <td>${tp.unit ? esc(tp.unit) : '—'}</td>
    <td>${tp.active ? `<span class="tag ok">${LANG === 'fa' ? 'فعال' : 'Active'}</span>` : `<span class="tag bad">${LANG === 'fa' ? 'غیرفعال' : 'Inactive'}</span>`}</td>
    <td>
      <button class="b e sm" data-a="provToggleType" data-i="${tp.id}">${tp.active ? (LANG === 'fa' ? 'غیرفعال' : 'Disable') : (LANG === 'fa' ? 'فعال' : 'Enable')}</button>
      <button class="b d sm" data-a="del" data-i="${tp.id}" data-v="provTypes">${t('delete')}</button>
    </td>
  </tr>`);

  return card(t('add'), `
    <form class="fm" onsubmit="ACT.addProvType(event)">
      <label>${t('name')}<input name="name" required></label>
      <label>${LANG === 'fa' ? 'آیکون' : 'Icon'}<select name="icon">${opts(PROV_ICONS.map(i => [i, i]))}</select></label>
      <label>${t('type')}<select name="op">
        ${opts(Object.entries(PROV_OP).map(([k, v]) => [k, v[LANG]]))}
      </select></label>
      <label>${LANG === 'fa' ? 'واحد پولی' : 'Currency unit'}<input name="unit" placeholder="${LANG === 'fa' ? 'تومان' : 'Toman'}"></label>
      <button class="b p">${t('add')}</button>
    </form>`) +
    card(t('provTypes'),
      types.length ? tbl([t('name'), t('type'), LANG === 'fa' ? 'واحد' : 'Unit', t('status'), t('actions')], rows, t('empty'), '📋') : empty(t('empty'), '📋'));
}

function provReportTab() {
  const records = (db.provRecords || []).slice();
  const byType = {};
  records.forEach(r => {
    const tp = provType(r.typeId);
    if (!tp) return;
    byType[tp.name] = (byType[tp.name] || 0) + 1;
  });
  const byStudent = {};
  records.forEach(r => {
    if (!byStudent[r.sid]) byStudent[r.sid] = { coupon: 0, attend: 0, total: 0 };
    const tp = provType(r.typeId);
    if (tp && tp.op === 'coupon') byStudent[r.sid].coupon += (+(r.data && r.data.amount || 0));
    if (tp && tp.op === 'attend') byStudent[r.sid].attend++;
    byStudent[r.sid].total++;
  });
  const sortedStudents = Object.entries(byStudent).sort((a, b) => b[1].total - a[1].total);

  const summaryStats = `<div class="stats">
    <div class="stat"><b>${num(records.length)}</b><small>${LANG === 'fa' ? 'کل رکوردها' : 'Total records'}</small></div>
    <div class="stat ok"><b>${money(records.reduce((s, r) => s + (+(r.data && r.data.amount || 0)), 0))}</b><small>${LANG === 'fa' ? 'مجموع کوپن' : 'Total coupons'}</small></div>
    <div class="stat warn"><b>${num(records.filter(r => {
    const tp = provType(r.typeId);
    return tp && tp.op === 'attend';
  }).length)}</b><small>${LANG === 'fa' ? 'ثبت حضور' : 'Attendance'}</small></div>
  </div>`;

  const typeRows = Object.entries(byType).map(([name, count]) => `<tr><td>${esc(name)}</td><td>${num(count)}</td></tr>`);
  const stuRows = sortedStudents.slice(0, 30).map(([sid, data]) => `<tr>
    <td>${sname(sid)}</td>
    <td>${num(data.total)}</td>
    <td>${num(data.attend)}</td>
    <td>${money(data.coupon)}</td>
  </tr>`);

  return `<div class="row" style="margin-bottom:10px">
    <button class="b sm" data-a="csvProv">${t('export')} CSV</button>
  </div>` +
    summaryStats +
    card(LANG === 'fa' ? 'به تفکیک نوع' : 'By type',
      typeRows.length ? tbl([t('type'), t('count')], typeRows, t('empty'), '📊') : empty(t('noData'), '📊')) +
    card(LANG === 'fa' ? 'به تفکیک دانش‌آموز' : 'By student',
      stuRows.length ? tbl([t('students'), t('total'), LANG === 'fa' ? 'حضور' : 'Attend', LANG === 'fa' ? 'مجموع کوپن' : 'Coupons'], stuRows, t('empty'), '📊') : empty(t('noData'), '📊'));
}

/* ============ V.provereshi wrapper ============ */
V.provereshi = function () {
  const tabs = [
    ['events', t('provEvents')],
    ['coupon', t('provCoupon')],
    ['attend', t('provAttend')],
    ['vote', t('provVote')],
    ['types', t('provTypes')],
    ['report', t('provReport')]
  ];
  const tabBar = `<div class="tabs">${tabs.map(tb =>
    `<button class="${provereshiTab === tb[0] ? 'on' : ''}" data-a="provTab" data-v="${tb[0]}">${tb[1]}</button>`
  ).join('')}</div>`;

  let body = '';
  switch (provereshiTab) {
    case 'events': body = provEventsTab(); break;
    case 'coupon': body = provCouponTab(); break;
    case 'attend': body = provAttendTab(); break;
    case 'vote': body = provVoteTab(); break;
    case 'types': body = provTypesTab(); break;
    case 'report': body = provReportTab(); break;
  }
  return head(t('provereshi'), LANG === 'fa' ? 'مدیریت رویدادها، بوفه، نمازخانه و شورای دانش‌آموزی' : 'Manage events, cafeteria, prayer room and student council') +
    (isProvereshiMgr() ? '<p class="hint">' + (LANG === 'fa' ? 'شما دسترسی کامل دارید.' : 'You have full access.') + '</p>' : '') +
    tabBar + body;
};

/* ============ V.events ============ */
V.events = function () {
  const list = (db.showcase || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.ts || 0) - (a.ts || 0));
  const p = paginate(list, 'events');
  const canEdit = isProvereshiMgr();

  const grid = p.slice.length
    ? `<div class="events-grid">${p.slice.map(e => evCardMini(e, canEdit)).join('')}</div>`
    : empty(t('empty'), '🎪');

  return head(t('events'), LANG === 'fa' ? 'رویدادها و مناسبت‌های مدرسه' : 'School events and occasions') +
    (canEdit ? card(t('addEvent'), `
      <form class="fm" onsubmit="ACT.addShowcase(event)">
        <label>${t('eventTitle')}<input name="title" required></label>
        <label>${t('eventCat')}<select name="cat">${opts(EVENT_CATS.map(c => [c, t('categories')[c] || c]))}</select></label>
        <label>${t('date')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="date" value="${iso()}">
          </div>
        </label>
        <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="3" required></textarea></label>
        <label style="grid-column:1/-1">${t('eventImg')}
          <input type="file" accept="image/*" onchange="ACT.previewShowcaseImg(this)">
          <input type="hidden" name="img" id="showcaseImgData">
          <small class="hint" id="showcaseImgHint">${LANG === 'fa' ? 'حداکثر ۴۰۰ کیلوبایت — خودکار فشرده می‌شود' : 'Max 400KB — auto compressed'}</small>
        </label>
        <label class="inline"><input type="checkbox" name="pinned"> ${t('eventPinned')}</label>
        <button class="b p">${t('addEvent')}</button>
      </form>`) : '') +
    card(t('poll'), canEdit ? `
      <form class="fm" onsubmit="ACT.addPoll(event)" style="margin-bottom:16px">
        <label style="grid-column:1/-1">${t('poll')}<input name="title" required></label>
        <label style="grid-column:1/-1">${t('pollOptions')}<textarea name="options" rows="3" required></textarea></label>
        <label>${t('pollDeadline')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="deadline">
          </div>
        </label>
        <label style="grid-column:1/-1">${t('eventImg')}
          <input type="file" accept="image/*" onchange="ACT.previewPollImg(this)">
          <input type="hidden" name="img" id="pollImgData">
        </label>
        <button class="b p">${t('addPoll')}</button>
      </form>` : '') +
    card('', grid + pagerHtml('events', p.total)) +
    pollsBlock();
};

/* ============ V.news ============ */
V.news = function () {
  const p = paginate((db.news || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)), 'news');
  const rows = p.slice.map(n => `
    <div class="ann">
      <div class="body">
        <b>${esc(n.title)}</b>
        <p>${esc(n.body)}</p>
        <small class="mu">${formatJalaliShort(n.date)}${n.authorId ? ' · ' + uname(n.authorId) : ''}</small>
      </div>
      ${mgr() ? delBtn('news', n.id) : ''}
    </div>`);
  return head(t('news')) +
    (mgr() ? card(t('add') + ' ' + t('news'), `
      <form class="fm" onsubmit="ACT.addNews(event)">
        <label>${t('name')}<input name="title" required></label>
        <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="body" rows="3" required></textarea></label>
        <label>${t('eventImg')}<input name="img" dir="ltr" placeholder="https://..."></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', rows.join('') || empty(t('empty'), '📰')) +
    pagerHtml('news', p.total);
};

/* ============ V.quiz ============ */
V.quiz = function () {
  const list = (db.quizzes || []).filter(q => {
    if (scoped()) { const s = db.students.find(x => x.id === me.sid); return s && q.classId === s.classId }
    if (teacherScoped()) return (me.classIds || []).includes(q.classId);
    return true;
  });
  const p = paginate(list, 'quiz');
  const canCreate = me.role === 'teacher' || mgr();
  const rows = p.slice.map(q => {
    const attempts = (q.attempts || {});
    const myAtt = attempts[me.id];
    return `<tr>
      <td><b>${esc(q.title)}</b></td>
      <td>${cname(q.classId)}</td>
      <td>${esc(q.subject)}</td>
      <td>${num((q.questions || []).length)} ${t('quizQuestions')}</td>
      <td>${num(q.duration || 0)} ${t('quizDuration')}</td>
      <td>${scoped() ? (myAtt ? `<span class="tag ok">${f1(myAtt.score)} / ${num(myAtt.total)}</span>` : `<button class="b p sm" data-a="startQuiz" data-i="${q.id}">${t('startQuiz')}</button>`) : `<span class="mu">${num(Object.keys(attempts).length)} ${LANG === 'fa' ? 'شرکت‌کننده' : 'participants'}</span>`}</td>
    </tr>`;
  });
  return head(t('quiz')) +
    (canCreate ? card(t('add') + ' ' + t('quiz'), `
      <form onsubmit="ACT.newQuizForm(event)" class="fm">
        <label>${t('eventTitle')}<input name="title" required></label>
        <label>${t('className')}<select name="classId" required>${opts(myClasses().map(c => [c.id, c.name]))}</select></label>
        <label>${t('subject')}<input name="subject" required></label>
        <label>${t('quizDuration')}<input type="number" name="duration" value="15" min="1"></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', tbl([t('eventTitle'), t('className'), t('subject'), t('quizQuestions'), t('quizDuration'), t('actions')], rows, t('empty'), '🧪') + pagerHtml('quiz', p.total));
};

/* ============ V.poll ============ */
V.poll = function () {
  return head(t('poll')) + pollsBlock() +
    (mgr() ? card(t('addPoll'), `
      <form class="fm" onsubmit="ACT.addPoll(event)">
        <label style="grid-column:1/-1">${t('eventTitle')}<input name="title" required></label>
        <label style="grid-column:1/-1">${t('pollOptions')}<textarea name="options" rows="3" required></textarea></label>
        <label>${t('pollDeadline')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="deadline">
          </div>
        </label>
        <button class="b p">${t('addPoll')}</button>
      </form>`) : '');
};

/* ============ V.hw ============ */
V.hw = function () {
  const list = (db.homework || []).filter(h => {
    if (scoped()) { const s = db.students.find(x => x.id === me.sid); return s && h.classId === s.classId }
    if (teacherScoped()) return me.classIds.includes(h.classId);
    return true;
  });
  const p = paginate(list, 'hw');
  const rows = p.slice.map(h => {
    const sub = h.submissions || {};
    const subCount = Object.keys(sub).length;
    const total = db.students.filter(s => s.classId === h.classId).length;
    const mySub = scoped() && sub[me.sid];
    return `<tr>
      <td><b>${esc(h.title)}</b><div class="mu" style="font-size:12px">${esc(h.desc || '')}</div></td>
      <td>${cname(h.classId)}</td>
      <td>${esc(h.subject)}</td>
      <td>${formatJalaliShort(h.due)}</td>
      <td>${num(subCount)} / ${num(total)}</td>
      <td>
        ${scoped()
        ? (mySub ? `<span class="tag ok">${LANG === 'fa' ? 'ارسال شده' : 'Submitted'}</span>` : `<button class="b p sm" data-a="submitHw" data-i="${h.id}">${LANG === 'fa' ? 'ارسال' : 'Submit'}</button>`)
        : `<button class="b e sm" data-a="viewHwSubs" data-i="${h.id}">${LANG === 'fa' ? 'مشاهده' : 'View'}</button>`}
        ${mgr() ? delBtn('homework', h.id) : ''}
      </td>
    </tr>`;
  });
  const canAdd = me.role === 'teacher' || mgr();
  return head(t('hw')) +
    (canAdd ? card(t('add') + ' ' + t('hw'), `
      <form class="fm" onsubmit="ACT.addHw(event)">
        <label>${t('className')}<select name="classId" required>${opts(myClasses().map(c => [c.id, c.name]))}</select></label>
        <label>${t('subject')}<input name="subject" required></label>
        <label>${t('eventTitle')}<input name="title" required></label>
        <label>${t('due')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="due" value="${iso()}">
          </div>
        </label>
        <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="2"></textarea></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', tbl([t('eventTitle'), t('className'), t('subject'), t('due'), LANG === 'fa' ? 'ارسال' : 'Submitted', t('actions')], rows, t('empty'), '📚') + pagerHtml('hw', p.total));
};

/* ============ V.online ============ */
V.online = function () {
  const list = (db.online || []).filter(o => {
    if (scoped()) { const s = db.students.find(x => x.id === me.sid); return s && (!o.classId || o.classId === s.classId) }
    if (teacherScoped()) return !o.classId || me.classIds.includes(o.classId);
    return true;
  });
  const body = list.map(o => {
    const isLive = o.live;
    return `<div class="online-card">
      <div>
        <div class="row"><b>${esc(o.title)}</b>${isLive ? `<span class="live">${LANG === 'fa' ? 'زنده' : 'LIVE'}</span>` : `<span class="tag">${LANG === 'fa' ? 'آفلاین' : 'Offline'}</span>`}</div>
        <div class="mu" style="font-size:12.5px;margin-top:4px">${cname(o.classId)} · ${esc(o.teacher || '')} · ${esc(o.time || '')}</div>
      </div>
      <a class="b p" href="${esc(o.link)}" target="_blank" rel="noopener">${LANG === 'fa' ? 'ورود' : 'Join'}</a>
    </div>`;
  }).join('');
  const canCreate = me.role === 'teacher' || mgr();
  return head(t('online')) +
    (canCreate ? card(t('add') + ' ' + t('online'), `
      <form class="fm" onsubmit="ACT.addOnline(event)">
        <label>${t('eventTitle')}<input name="title" required></label>
        <label>${t('className')}<select name="classId">${opts(myClasses().map(c => [c.id, c.name]))}</select></label>
        <label>${t('time')}<input name="time"></label>
        <label style="grid-column:1/-1">${LANG === 'fa' ? 'لینک' : 'Link'}<input name="link" dir="ltr" required></label>
        <label class="inline"><input type="checkbox" name="live"> ${LANG === 'fa' ? 'زنده' : 'Live'}</label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', body || empty(t('empty'), '🎥'));
};

/* ============ V.msg ============ */
V.msg = function () {
  const list = (db.messages || []).filter(m => m.to === me.id || m.from === me.id);
  const p = paginate(list.slice().sort((a, b) => b.ts - a.ts), 'msg');
  const rows = p.slice.map(m => `<tr>
    <td>${m.from === me.id ? `<span class="tag p">${LANG === 'fa' ? 'ارسالی' : 'Sent'}</span>` : `<span class="tag info">${LANG === 'fa' ? 'دریافتی' : 'Received'}</span>`}</td>
    <td>${m.from === me.id ? uname(m.to) : uname(m.from)}</td>
    <td>${esc(m.text)}</td>
    <td>${formatJalaliShort(new Date(m.ts).toLocaleDateString('en-CA'))} ${new Date(m.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
  </tr>`);
  return head(t('msg')) +
    card(LANG === 'fa' ? 'ارسال پیام' : 'Send Message', `
      <form class="fm" onsubmit="ACT.sendMsg(event)">
        <label>${LANG === 'fa' ? 'گیرنده' : 'Recipient'}<select name="to" required>${opts(db.users.filter(u => u.id !== me.id).map(u => [u.id, u.name + ' (' + ROLE[u.role][LANG] + ')']))}</select></label>
        <label style="grid-column:1/-1">${LANG === 'fa' ? 'متن' : 'Text'}<textarea name="text" rows="2" required></textarea></label>
        <button class="b p">${t('send')}</button>
      </form>`) +
    card('', tbl([t('type'), LANG === 'fa' ? 'طرف' : 'With', LANG === 'fa' ? 'متن' : 'Text', t('date')], rows, t('empty'), '✏️') + pagerHtml('msg', p.total));
};

/* ============ V.chat ============ */
V.chat = function () {
  const peers = allowedChatPeers().map(u => ({
    id: u.id, name: u.name, role: u.role,
    last: (chatCache[u.id] || []).slice(-1)[0],
    unread: (chatCache[u.id] || []).filter(m => !m.read && m.from !== me.id).length
  }));
  const peerList = peers.map(u => `
    <div class="item ${chatPeer === u.id ? 'on' : ''}" data-a="chatOpen" data-i="${u.id}">
      <div class="avatar" style="width:32px;height:32px;font-size:12px">${esc(u.name.slice(0, 1))}</div>
      <div style="flex:1;min-width:0">
        <div class="nm">${esc(u.name)}</div>
        <div class="ls">${u.last ? esc(u.last.text.slice(0, 30)) : ROLE[u.role][LANG]}</div>
      </div>
      ${u.unread ? `<span class="badge">${num(u.unread)}</span>` : ''}
    </div>`).join('');

  const msgs = (chatCache[chatPeer] || []).map(m => `
    <div class="msg ${m.from === me.id ? 'me' : 'you'}">
      ${esc(m.text)}
      <span class="t">${formatJalaliShort(new Date(m.ts).toLocaleDateString('en-CA'))} ${new Date(m.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>`).join('');

  const chatHeadHtml = chatPeer
    ? `<div class="chat-head"><span>${esc((db.users.find(u => u.id === chatPeer) || {}).name || '')}</span>
        <span class="mu" style="font-size:12px">${wsReady ? '🟢 ' + t('onlineStatus') : '🔴 ' + t('offlineStatus')}</span></div>`
    : `<div class="chat-head">${t('selectPeer')}</div>`;

  return `<h1>${t('chat')}</h1>` +
    `<div class="chat-wrap">
      <div class="chat-list">${peerList || empty(t('empty'), '💬')}</div>
      <div class="chat-box">
        ${chatHeadHtml}
        <div class="chat-msgs" id="chatMsgs">${msgs || (chatPeer ? empty(t('startChat'), '💬') : '')}</div>
        ${chatPeer ? `<form class="chat-input" onsubmit="ACT.chatSend(event)">
          <input name="text" placeholder="${t('chatPlaceholder')}" autocomplete="off" required>
          <button class="b p">${t('send')}</button>
        </form>` : ''}
      </div>
    </div>`;
};

/* ============ V.ann ============ */
V.ann = function () {
  const list = annList().map(a => `<div class="ann">
    <div class="body">
      <b>${esc(a.title)}</b>
      <span class="tag">${esc(a.target === 'class' ? t('className') + ' ' + cname(a.classId) : (I18N[LANG][a.target] || a.target))}</span>
      <p>${esc(a.body)}</p>
      <small class="mu">${formatJalaliShort(a.date)}</small>
    </div>
    ${mgr() ? delBtn('ann', a.id) : ''}
  </div>`).join('');
  return head(t('ann')) +
    (mgr() ? card(LANG === 'fa' ? 'انتشار اعلان' : 'Publish Announcement', `
      <form class="fm" onsubmit="ACT.addAnn(event)">
        <label>${t('eventTitle')}<input name="title" required></label>
        <label>${LANG === 'fa' ? 'مخاطب' : 'Target'}<select name="target" onchange="ACT.annTarget(this)">
          ${opts([['all', t('all')], ['teacher', ROLE.teacher[LANG]], ['parent', ROLE.parent[LANG]], ['student', ROLE.student[LANG]], ['class', LANG === 'fa' ? 'یک کلاس' : 'A class']])}
        </select></label>
        <label id="annClassBox" style="display:none">${t('className')}<select name="classId">${opts(db.classes.map(c => [c.id, c.name]))}</select></label>
        <label style="grid-column:1/-1">${LANG === 'fa' ? 'متن' : 'Text'}<textarea name="body" rows="3" required></textarea></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', list || empty(t('empty'), '📢'));
};

/* ============ V.disc ============ */
V.disc = function () {
  const list = (db.discipline || []).filter(d => scoped() ? d.sid === me.sid : true);
  const p = paginate(list.slice().sort((a, b) => b.date.localeCompare(a.date)), 'disc');
  const sevTag = s => `<span class="tag ${s === 'high' ? 'bad' : s === 'mid' ? 'warn' : 'info'}">${s === 'high' ? (LANG === 'fa' ? 'شدید' : 'High') : s === 'mid' ? (LANG === 'fa' ? 'متوسط' : 'Medium') : (LANG === 'fa' ? 'خفیف' : 'Low')}</span>`;
  const rows = p.slice.map(d => `<tr>
    <td>${sname(d.sid)}</td>
    <td>${esc(d.type)}</td>
    <td>${esc(d.desc)}</td>
    <td>${sevTag(d.severity || 'low')}</td>
    <td>${formatJalaliShort(d.date)}</td>
    <td>${mgr() ? delBtn('discipline', d.id) : ''}</td>
  </tr>`);
  return head(t('disc')) +
    (mgr() ? card(t('add'), `
      <form class="fm" onsubmit="ACT.addDisc(event)">
        <label>${t('students')}<select name="sid" required>${opts(db.students.map(s => [s.id, s.name]))}</select></label>
        <label>${t('type')}<select name="type">${opts([['تذکر شفاهی', LANG === 'fa' ? 'تذکر شفاهی' : 'Verbal'], ['تذکر کتبی', LANG === 'fa' ? 'تذکر کتبی' : 'Written'], ['احضار ولی', LANG === 'fa' ? 'احضار ولی' : 'Parent Call'], ['تشویق', LANG === 'fa' ? 'تشویق' : 'Praise']])}</select></label>
        <label>${LANG === 'fa' ? 'شدت' : 'Severity'}<select name="severity">${opts([['low', LANG === 'fa' ? 'خفیف' : 'Low'], ['mid', LANG === 'fa' ? 'متوسط' : 'Medium'], ['high', LANG === 'fa' ? 'شدید' : 'High']])}</select></label>
        <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="2" required></textarea></label>
        <button class="b p">${t('add')}</button>
      </form>`) : '') +
    card('', tbl([t('students'), t('type'), t('eventDesc'), LANG === 'fa' ? 'شدت' : 'Severity', t('date'), t('actions')], rows, t('empty'), '⚖️') + pagerHtml('disc', p.total));
};

/* ============ V.leaves ============ */
V.leaves = function () {
  const isMgrUser = mgr();
  const isParent = me.role === 'parent' || me.role === 'student';
  let list = (db.leaves || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (isParent) list = list.filter(l => l.sid === me.sid);
  const p = paginate(list, 'leaves');
  const statusTag = s => s === 'ok' ? `<span class="tag ok">${t('leaveApproved')}</span>`
    : s === 'no' ? `<span class="tag bad">${t('leaveRejected')}</span>`
      : `<span class="tag warn">${t('leavePending')}</span>`;
  const rows = p.slice.map(l => `<div class="leave-card">
    <div class="body">
      <b>${sname(l.sid)}</b>
      <div>${t('leaveFrom')} ${formatJalaliShort(l.from)} ${t('leaveTo')} ${formatJalaliShort(l.to)} · ${statusTag(l.status)}</div>
      <div class="mu" style="margin-top:4px">${esc(l.reason)}</div>
      ${l.decidedBy ? `<small class="mu">${LANG === 'fa' ? 'بررسی توسط' : 'Reviewed by'} ${uname(l.decidedBy)} · ${formatJalaliShort(new Date(l.decidedTs).toLocaleDateString('en-CA'))}</small>` : ''}
    </div>
    ${isMgrUser && l.status === 'pending'
      ? `<div style="display:flex;gap:6px;flex-direction:column">
          <button class="b ok sm" data-a="leaveDecide" data-i="${l.id}" data-v="ok">${t('leaveApprove')}</button>
          <button class="b d sm" data-a="leaveDecide" data-i="${l.id}" data-v="no">${t('leaveReject')}</button>
        </div>`
      : ''}
  </div>`);
  const form = isParent
    ? card(t('leaveRequest'), `
      <form class="fm" onsubmit="ACT.addLeave(event)">
        <label>${t('leaveFrom')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="from" value="${iso()}">
          </div>
        </label>
        <label>${t('leaveTo')}
          <div class="dp-wrap">
            <input type="text" readonly data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
            <input type="hidden" name="to" value="${iso()}">
          </div>
        </label>
        <label style="grid-column:1/-1">${t('leaveReason')}<textarea name="reason" rows="2" required></textarea></label>
        <button class="b p">${t('leaveSubmit')}</button>
      </form>`)
    : '';
  return head(t('leaves'), isMgrUser ? (LANG === 'fa' ? 'بررسی درخواست‌های مرخصی' : 'Review leave requests') : (LANG === 'fa' ? 'درخواست مرخصی' : 'Request leave')) +
    form +
    card('', rows.join('') || empty(t('empty'), '🌴') + pagerHtml('leaves', p.total));
};

/* ============ V.audit ============ */
V.audit = function () {
  const list = (db.audit || []).slice().sort((a, b) => b.ts - a.ts);
  const p = paginate(list, 'audit');
  const rows = p.slice.map(a => `<div class="audit-row">
    <span class="tag">${AUDIT_ACTIONS[a.action] ? AUDIT_ACTIONS[a.action][LANG] : a.action}</span>
    <span class="act">${uname(a.userId)}</span>
    <span class="tgt">${esc(a.detail || '')}${a.target ? ` <span class="mu">(${esc(a.target)})</span>` : ''}</span>
    <span class="ts">${formatJalaliShort(new Date(a.ts).toLocaleDateString('en-CA'))} ${new Date(a.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>`);
  return head(t('audit'), LANG === 'fa' ? 'آخرین ۵۰۰ عملیات سیستم' : 'Last 500 operations') +
    card('', rows.join('') || empty(t('empty'), '📋') + pagerHtml('audit', p.total));
};

/* ============ V.users ============ */
V.users = function () {
  const roles = Object.keys(ROLE).filter(k => isAdmin() || k !== 'admin').map(k => [k, ROLE[k][LANG]]);
  const p = paginate(db.users, 'users');
  const rows = p.slice.map(u => {
    const canDel = u.id !== me.id && !(u.role === 'admin' && !isAdmin());
    const related = u.sid ? sname(u.sid) : (u.classIds && u.classIds.length ? u.classIds.map(cname).join('، ') : '—');
    return `<tr>
      <td><b>${esc(u.name)}</b></td>
      <td dir="ltr">${esc(u.username)}</td>
      <td><span class="tag">${ROLE[u.role][LANG]}</span></td>
      <td>${related}</td>
      <td>${editBtn('users', u.id)} ${canDel ? delBtn('users', u.id) : ''}</td>
    </tr>`;
  });
  const importTeachers = isAdmin()
    ? `<div class="row start gap" style="margin-top:12px;flex-wrap:wrap">
        <label class="b sm" style="cursor:pointer">${t('import')} Excel<input type="file" accept=".xlsx,.xls,.csv" hidden onchange="ACT.importTeachers(this.files[0])"></label>
        <button class="b sm" data-a="dlTeacherTpl">${LANG === 'fa' ? 'دانلود نمونه' : 'Download template'}</button>
      </div>` : '';
  return head(t('users')) +
    card(t('add') + ' ' + t('users'), `
      <form class="fm" onsubmit="ACT.addUser(event)">
        <label>${t('name')}<input name="name" required></label>
        <label>${t('username')}<input name="username" dir="ltr" required pattern="[A-Za-z0-9_]{3,}"></label>
        <label>${t('password')}<input name="pw" type="password" minlength="6" required></label>
        <label>${LANG === 'fa' ? 'نقش' : 'Role'}<select name="role" onchange="ACT.roleChange(this)">${opts(roles)}</select></label>
        <label id="sidLab">${LANG === 'fa' ? 'دانش‌آموز مرتبط' : 'Related student'}<select name="sid"><option value="">—</option>${opts(db.students.map(s => [s.id, s.name]))}</select></label>
        <label id="clsLab" style="display:none;grid-column:1/-1">${LANG === 'fa' ? 'کلاس‌های معلم' : 'Teacher classes'}
          <div class="chk-group">${db.classes.map(c => `<label><input type="checkbox" name="classIds" value="${esc(c.id)}"> ${esc(c.name)}</label>`).join('')}</div>
        </label>
        <button class="b p">${t('add')}</button>
      </form>${importTeachers}`) +
    card('', tbl([t('name'), t('username'), LANG === 'fa' ? 'نقش' : 'Role', LANG === 'fa' ? 'مرتبط' : 'Related', t('actions')], rows, t('empty'), '👤') + pagerHtml('users', p.total));
};

/* ============ V.acc ============ */
V.acc = function () {
  return head(t('acc')) +
    card(t('changeUsername'), `
      <p class="mu" style="margin-bottom:12px">${t('username')}: <b dir="ltr">${esc(me.username)}</b></p>
      <form class="fm" onsubmit="ACT.chUser(event)">
        <label>${t('username')}<input name="username" dir="ltr" required pattern="[A-Za-z0-9_]{3,}"></label>
        <label>${t('currentPass')}<input name="pw" type="password" required></label>
        <button class="b p">${t('save')}</button>
      </form>`) +
    card(t('changePassword'), `
      <form class="fm" onsubmit="ACT.chPw(event)">
        <label>${t('currentPass')}<input name="old" type="password" required></label>
        <label>${t('newPass')}<input name="pw" type="password" minlength="6" required></label>
        <label>${t('repeatPass')}<input name="pw2" type="password" minlength="6" required></label>
        <button class="b p">${t('save')}</button>
      </form>`) +
    card(t('logout'), `<button class="b d" data-a="logout">${t('logout')}</button>`);
};

/* ============ V.set ============ */
V.set = function () {
  const st = db.settings || { twoFA: { admin: false, vice: false } };
  return head(t('set')) +
    card(t('schoolName'), `
      <form class="fm" onsubmit="ACT.school(event)">
        <label>${t('schoolName')}<input name="school" value="${esc(db.school)}" required></label>
        <label>${t('schoolYear')}<input name="year" value="${esc(db.year || '')}"></label>
        <button class="b p">${t('save')}</button>
      </form>`) +
    card(t('appearance'), `
      <div class="row"><span>${t('theme')}</span>
        <div class="row gap">
          ${['light', 'dark', 'gray', 'orange'].map(th => `
            <button class="b sm ${THEME === th ? 'on' : ''}" data-a="setThemeBtn" data-v="${th}">
              ${th === 'light' ? '☀️' : th === 'dark' ? '🌙' : th === 'gray' ? '⚫' : '🟠'} ${t('theme' + th.charAt(0).toUpperCase() + th.slice(1))}
            </button>`).join('')}
        </div>
      </div>
      <div class="row" style="margin-top:12px"><span>${t('language')}</span>
        <button class="b sm" data-a="toggleLangBtn">${LANG === 'fa' ? 'English' : 'فارسی'}</button>
      </div>`) +
    (isAdmin() ? card(t('twoFA'), `
      <p class="mu" style="margin-bottom:12px">${LANG === 'fa' ? 'در نسخه دمو، کد از طریق toast نمایش داده می‌شود.' : 'Demo: code shown via toast.'}</p>
      <div class="stack">
        <label class="inline"><input type="checkbox" ${st.twoFA.admin ? 'checked' : ''} onchange="ACT.toggle2FA('admin', this.checked)"> ${t('twoFAEnable')}</label>
        <label class="inline"><input type="checkbox" ${st.twoFA.vice ? 'checked' : ''} onchange="ACT.toggle2FA('vice', this.checked)"> ${t('twoFAVice')}</label>
      </div>`) : '') +
    card(t('backup'), `
      <div class="row start gap">
        <button class="b" data-a="export">${t('downloadBackup')}</button>
        <label class="b" style="display:inline-block;cursor:pointer">${t('restoreBackup')}<input type="file" accept=".json" hidden onchange="ACT.import(this.files[0])"></label>
        <button class="b d" data-a="reset">${t('resetAll')}</button>
      </div>`);
};

/* ============ V.rep ============ */
V.rep = function () {
  const S = mine();
  if (!S.length) return head(t('rep')) + card('', empty(t('empty'), '📈'));
  const s = S.find(x => x.id === rs) || S[0];
  const gs = db.grades.filter(g => g.sid === s.id);
  const scores = gs.map(g => g.score);
  const bySubject = {};
  gs.forEach(g => { (bySubject[g.subject] = bySubject[g.subject] || []).push(g) });
  const classMates = db.students.filter(x => x.classId === s.classId);
  const rankList = classMates.map(m => {
    const ms = db.grades.filter(g => g.sid === m.id).map(g => g.score);
    return { id: m.id, avg: avg(ms) };
  }).filter(x => x.avg != null).sort((a, b) => b.avg - a.avg);
  const _ri = rankList.findIndex(x => x.id === s.id);
  const myRank = _ri >= 0 ? _ri + 1 : null;
  const classAvg = avg(rankList.map(x => x.avg));
  const att = attForStudent(s.id);
  const attTotal = att.p + att.a + att.l + att.e;
  const attRate = attTotal ? Math.round((att.p / attTotal) * 100) : 0;

  const H = finHelpers();
  const due = PERM[me.role].includes('fin') ? H.balance(s.id) : null;

  const subjRows = Object.keys(bySubject).map(k => {
    const items = bySubject[k];
    const a = avg(items.map(g => g.score));
    return `<tr>
      <td><b>${esc(k)}</b></td>
      <td>${num(items.length)}</td>
      <td>${items.map(g => `<span class="tag" style="margin:1px">${esc(g.type)}: ${f1(g.score)}</span>`).join(' ')}</td>
      <td>${scoreTag(a)}</td>
    </tr>`;
  }).join('');

  const allRows = gs.slice().sort((a, b) => a.date.localeCompare(b.date)).map(g => `<tr>
    <td>${formatJalaliShort(g.date)}</td><td>${esc(g.subject)}</td><td>${esc(g.type)}</td><td>${scoreTag(g.score)}</td>
  </tr>`).join('');

  const provRecords = (db.provRecords || []).filter(r => r.sid === s.id);
  const provSummary = provRecords.length ? provRecords.slice(0, 10).map(r => {
    const ev = provEvent(r.eventId);
    const tp = provType(r.typeId);
    return `<tr>
      <td>${formatJalaliShort(new Date(r.ts).toLocaleDateString('en-CA'))}</td>
      <td>${tp ? esc(tp.icon) : ''} ${ev ? esc(ev.title) : '—'}</td>
      <td>${esc(r.data && r.data.item || r.data && r.data.status || '')}</td>
      <td>${r.data && r.data.amount ? money(r.data.amount) : '—'}</td>
    </tr>`;
  }).join('') : '';

  const finSummary = PERM[me.role].includes('fin') ? `
    <h3 style="margin-top:20px">${LANG === 'fa' ? 'خلاصه مالی' : 'Financial Summary'}</h3>
    <table class="report-table">
      <thead><tr><th>${LANG === 'fa' ? 'شرح' : 'Item'}</th><th>${t('amount')}</th></tr></thead>
      <tbody>
        <tr><td>${t('finTotalDebt')}</td><td>${fmoney(H.totalDebt(s.id))}</td></tr>
        <tr><td>${t('paid')}</td><td>${fmoney(H.totalPaid(s.id))}</td></tr>
        <tr><td>${t('finDiscounts')}</td><td>${fmoney(H.totalDiscount(s.id))}</td></tr>
        <tr style="background:var(--soft)"><td><b>${t('finBalance')}</b></td><td><b>${fmoney(H.balance(s.id))}</b></td></tr>
      </tbody>
    </table>` : '';

  const reportCardHtml = `
    <div class="report-card">
      <div class="report-head">
        <div>
          <div class="school">${esc(db.school)}</div>
          <div class="meta">${esc(db.year || '—')} · ${esc(s.name)} · ${cname(s.classId)}</div>
          <div class="meta">${LANG === 'fa' ? 'کد ملی' : 'National ID'}: ${s.nid}</div>
        </div>
        <div class="badge-rank">
          ${myRank == null ? '—' : num(myRank) + ' / ' + num(rankList.length)}
          <small>${t('rank')}</small>
        </div>
      </div>
      <div class="report-grid">
        <div class="cell"><b>${f1(avg(scores))}</b><small>${t('gpa')}</small></div>
        <div class="cell"><b>${f1(classAvg)}</b><small>${t('classAvg')}</small></div>
        <div class="cell"><b>${num(scores.filter(x => x >= 17).length)}</b><small>${t('above17')}</small></div>
        <div class="cell"><b>${num(scores.filter(x => x < 10).length)}</b><small>${t('below10')}</small></div>
        <div class="cell"><b>${num(att.p)}</b><small>${t('present')}</small></div>
        <div class="cell"><b>${num(att.a)}</b><small>${t('absent')}</small></div>
        <div class="cell"><b>${num(att.l)}</b><small>${t('late')}</small></div>
        <div class="cell"><b>${num(attRate)}%</b><small>${t('attendanceRate')}</small></div>
      </div>
      <h3 style="margin-top:8px">${LANG === 'fa' ? 'ریز نمرات' : 'Detailed Grades'}</h3>
      ${Object.keys(bySubject).length
      ? `<table class="report-table">
          <thead><tr><th>${t('subject')}</th><th>${t('count')}</th><th>${t('grades')}</th><th>${t('average')}</th></tr></thead>
          <tbody>${subjRows}</tbody>
        </table>`
      : empty(t('empty'), '📝')}
      <h3 style="margin-top:20px">${t('history')}</h3>
      ${gs.length
      ? `<table class="report-table">
          <thead><tr><th>${t('date')}</th><th>${t('subject')}</th><th>${t('type')}</th><th>${t('score')}</th></tr></thead>
          <tbody>${allRows}</tbody>
        </table>`
      : empty(t('empty'))}
      ${provSummary ? `<h3 style="margin-top:20px">${t('provActivities')}</h3>
        <table class="report-table">
          <thead><tr><th>${t('date')}</th><th>${t('events')}</th><th>${t('details')}</th><th>${t('amount')}</th></tr></thead>
          <tbody>${provSummary}</tbody>
        </table>` : ''}
      ${finSummary}
      ${due != null ? `<div style="margin-top:18px" class="row">
        <b>${LANG === 'fa' ? 'مانده بدهی' : 'Balance'}: <span class="tag ${due > 0 ? 'warn' : 'ok'}">${due > 0 ? fmoney(due) : (LANG === 'fa' ? 'بدون بدهی' : 'No due')}</span></b>
      </div>` : ''}
      <div class="report-sign">
        <div>${LANG === 'fa' ? 'امضای معلم' : 'Teacher'}</div>
        <div>${LANG === 'fa' ? 'امضای مدیر' : 'Principal'}</div>
        <div>${LANG === 'fa' ? 'امضای ولی' : 'Parent'}</div>
      </div>
      <div class="report-foot">
        <span>${LANG === 'fa' ? 'تاریخ صدور' : 'Issued'}: ${formatJalaliShort(iso())}</span>
        <span>${esc(db.school)}</span>
      </div>
    </div>`;

  return head(t('rep'), `${esc(s.name)} · ${cname(s.classId)}`) +
    (S.length > 1 ? card('', `<label style="max-width:260px">${t('students')}<select onchange="ACT.rs(this.value)">${stOpts(s.id)}</select></label>`) : '') +
    `<div style="margin-top:16px" id="reportCardContainer">${reportCardHtml}</div>` +
    `<div class="row np" style="margin-top:16px">
      <button class="b p" data-a="exportReportPDF" data-i="${s.id}">📄 ${t('exportPDF')}</button>
      <button class="b sm np" data-a="exportReport" data-i="${s.id}">${t('export')} CSV</button>
      <button class="b sm np" onclick="window.print()">🖨 ${t('print')}</button>
    </div>`;
};

/* ============ Edit Form ============ */
function editForm(type, id) {
  window.editTarget = { type, id };
  if (type === 'students') {
    const s = db.students.find(x => x.id === id); if (!s) return;
    openModal(`<h2>${t('edit')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('name')}<input name="name" value="${esc(s.name)}" required></label>
        <label>${LANG === 'fa' ? 'کد ملی' : 'National ID'}<input name="nid" value="${esc(s.nid)}" required></label>
        <label>${t('className')}<select name="classId">${opts(myClasses().map(c => [c.id, c.name]), s.classId)}</select></label>
        <label>${t('parent')}<input name="parent" value="${esc(s.parent)}"></label>
        <label>${LANG === 'fa' ? 'تلفن' : 'Phone'}<input name="phone" dir="ltr" value="${esc(s.phone)}"></label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'classes') {
    const c = db.classes.find(x => x.id === id); if (!c) return;
    openModal(`<h2>${t('edit')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('name')}<input name="name" value="${esc(c.name)}" required></label>
        <label>${LANG === 'fa' ? 'پایه' : 'Grade'}<input name="grade" value="${esc(c.grade)}"></label>
        <label>${LANG === 'fa' ? 'اتاق' : 'Room'}<input name="room" value="${esc(c.room)}"></label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'grades') {
    const g = db.grades.find(x => x.id === id); if (!g) return;
    openModal(`<h2>${t('edit')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('students')}<select name="sid">${stOpts(g.sid)}</select></label>
        <label>${t('subject')}<input name="subject" value="${esc(g.subject)}" required></label>
        <label>${t('type')}<select name="type">${opts([['میان‌ترم', 'میان‌ترم'], ['پایان‌ترم', 'پایان‌ترم'], ['کوییز', 'کوییز'], ['پروژه', 'پروژه']], g.type)}</select></label>
        <label>${t('score')}<input name="score" value="${g.score}" required></label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'users') {
    const u = db.users.find(x => x.id === id); if (!u) return;
    const roles = Object.keys(ROLE).filter(k => isAdmin() || k !== 'admin' || u.role === 'admin').map(k => [k, ROLE[k][LANG]]);
    openModal(`<h2>${t('edit')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('name')}<input name="name" value="${esc(u.name)}" required></label>
        <label>${LANG === 'fa' ? 'نقش' : 'Role'}<select name="role" onchange="ACT.roleChange(this)">${opts(roles, u.role)}</select></label>
        <label id="sidLab" style="${['parent', 'student'].includes(u.role) ? '' : 'display:none'}">${LANG === 'fa' ? 'دانش‌آموز مرتبط' : 'Related student'}
          <select name="sid"><option value="">—</option>${opts(db.students.map(s => [s.id, s.name]), u.sid || '')}</select>
        </label>
        <label id="clsLab" style="${u.role === 'teacher' ? 'grid-column:1/-1' : 'display:none;grid-column:1/-1'}">${LANG === 'fa' ? 'کلاس‌های معلم' : 'Teacher classes'}
          <div class="chk-group">${db.classes.map(c => `<label><input type="checkbox" name="classIds" value="${esc(c.id)}"${(u.classIds || []).includes(c.id) ? ' checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>
        </label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'showcase') {
    const e = (db.showcase || []).find(x => x.id === id); if (!e) return;
    openModal(`<h2>${t('edit')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('eventTitle')}<input name="title" value="${esc(e.title)}" required></label>
        <label>${t('eventCat')}<select name="cat">${opts(EVENT_CATS.map(c => [c, t('categories')[c] || c]), e.cat)}</select></label>
        <label>${t('date')}<input type="date" name="date" value="${e.date || ''}"></label>
        <label style="grid-column:1/-1">${t('eventDesc')}<textarea name="desc" rows="3">${esc(e.desc || '')}</textarea></label>
        <label style="grid-column:1/-1">${t('eventImg')}
          <input type="file" accept="image/*" onchange="ACT.previewShowcaseImg(this)">
          <input type="hidden" name="img" id="showcaseImgData">
        </label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'finReceipts') {
    const r = (db.finReceipts || []).find(x => x.id === id); if (!r) return;
    const cur = (db.finSettings && db.finSettings.currency) || (LANG === 'fa' ? 'تومان' : 'Toman');
    openModal(`<h2>${LANG === 'fa' ? 'ویرایش رسید' : 'Edit Receipt'} #${esc(r.receiptNo || '')}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('amount')} (${cur})<input name="amount" value="${r.amount}" inputmode="numeric" required></label>
        <label>${t('finMethod')}<select name="method">
          ${opts([['نقد', t('finCash')], ['کارت', t('finCard')], ['آنلاین', t('finOnline')], ['چک', t('finCheck')]], r.method)}
        </select></label>
        <label style="grid-column:1/-1">${t('finNote')}<input name="note" value="${esc(r.note || '')}"></label>
        <button class="b p">${t('save')}</button>
      </form>`);
  } else if (type === 'finDiscounts') {
    const d = (db.finDiscounts || []).find(x => x.id === id); if (!d) return;
    const cur = (db.finSettings && db.finSettings.currency) || (LANG === 'fa' ? 'تومان' : 'Toman');
    openModal(`<h2>${LANG === 'fa' ? 'ویرایش تخفیف' : 'Edit Discount'}</h2>
      <form class="fm" onsubmit="ACT.saveEdit(event)">
        <label>${t('amount')} (${cur})<input name="amount" value="${d.amount}" inputmode="numeric" required></label>
        <label style="grid-column:1/-1">${t('finReason')}<input name="reason" value="${esc(d.reason || '')}"></label>
        <button class="b p">${t('save')}</button>
      </form>`);
  }
}

/* ============ Notifications ============ */
function getNotifications() {
  const items = [];
  annList().forEach(a => {
    items.push({
      id: 'ann_' + a.id, type: 'ann', refId: a.id,
      title: '📢 ' + a.title, body: a.body, ts: a.ts || 0,
      read: (a.readBy || []).includes(me.id)
    });
  });
  (db.messages || []).filter(m => m.to === me.id && !m.read).forEach(m => {
    items.push({
      id: 'msg_' + m.id, type: 'msg', refId: m.id,
      title: '✏️ ' + t('newMsgFrom') + ' ' + uname(m.from),
      body: m.text, ts: m.ts, read: false
    });
  });
  Object.entries(chatCache).forEach(([peer, msgs]) => {
    const unread = msgs.filter(m => !m.read && m.from !== me.id);
    if (unread.length) {
      items.push({
        id: 'chat_' + peer, type: 'chat', refId: peer,
        title: '💬 ' + num(unread.length) + ' — ' + uname(peer),
        body: unread[0].text, ts: unread[unread.length - 1].ts, read: false
      });
    }
  });
  if (mgr()) {
    (db.leaves || []).filter(l => l.status === 'pending').forEach(l => {
      items.push({
        id: 'leave_' + l.id, type: 'leave', refId: l.id,
        title: '🌴 ' + t('leaveRequest') + ' — ' + sname(l.sid),
        body: t('leaveFrom') + ' ' + formatJalaliShort(l.from) + ' ' + t('leaveTo') + ' ' + formatJalaliShort(l.to),
        ts: l.ts, read: false
      });
    });
  }
  if (mgr() || teacherScoped()) {
    studentsWithAbsenceWarning(3).slice(0, 5).forEach(s => {
      items.push({
        id: 'absent_' + s.sid, type: 'absence', refId: s.sid,
        title: '⚠️ ' + t('warnAbsence') + ' — ' + esc(s.name),
        body: num(s.absences) + ' ' + t('absent') + ' / ' + num(s.total),
        ts: Date.now() - 1000, read: false
      });
    });
  }
  return items.sort((a, b) => b.ts - a.ts);
}

function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  if (notifPanelOpen) {
    const panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.id = 'notifPanel';
    const items = getNotifications();
    const unreadCount = items.filter(i => !i.read).length;
    panel.innerHTML = `
      <div class="head">
        <span>🔔 ${t('notifications')} ${unreadCount ? `<span class="tag bad">${num(unreadCount)}</span>` : ''}</span>
        <div class="row gap">
          ${unreadCount ? `<button class="b sm" data-a="markAllNotifRead">${t('markAllRead')}</button>` : ''}
          <button class="b sm" data-a="closeNotif">✕</button>
        </div>
      </div>
      <div class="list">
        ${items.length ? items.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}" data-a="openNotif" data-i="${esc(n.id)}">
            <b>${esc(n.title)}</b>
            <p>${esc(n.body || '')}</p>
            <small>${formatJalaliShort(new Date(n.ts).toLocaleDateString('en-CA'))} ${new Date(n.ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        `).join('') : empty(t('noNotifications'), '🔔')}
      </div>`;
    document.body.appendChild(panel);
    document.addEventListener('click', function closePanel(ev) {
      const p = document.getElementById('notifPanel');
      const btn = ev.target.closest('[data-a="toggleNotif"]');
      if (p && !p.contains(ev.target) && !btn) {
        p.remove();
        notifPanelOpen = false;
        document.removeEventListener('click', closePanel);
      }
    });
  } else {
    const p = document.getElementById('notifPanel');
    if (p) p.remove();
  }
}

/* ============ Global Search ============ */
function openSearch() {
  if (searchOpen) return;
  searchOpen = true;
  const bg = document.createElement('div');
  bg.className = 'gs-bg';
  bg.id = 'gsBg';
  bg.innerHTML = `<div class="gs-box" onclick="event.stopPropagation()">
    <input id="gsInput" placeholder="${t('searchPlaceholder')}" autofocus>
    <div class="gs-results" id="gsResults"></div>
    <div class="gs-foot">${LANG === 'fa' ? 'Enter برای انتخاب · Esc برای بستن' : 'Enter to select · Esc to close'}</div>
  </div>`;
  bg.addEventListener('click', closeSearch);
  document.body.appendChild(bg);
  setTimeout(() => document.getElementById('gsInput').focus(), 50);
}
function closeSearch() {
  const bg = document.getElementById('gsBg');
  if (bg) bg.remove();
  searchOpen = false;
}
function doSearch(q) {
  const results = document.getElementById('gsResults');
  if (!results) return;
  q = (q || '').trim().toLowerCase();
  if (!q) { results.innerHTML = ''; window.__gsItems = []; return }

  const items = [];
  (mgr() || teacherScoped() ? db.students : mine()).forEach(s => {
    if (s.name.toLowerCase().includes(q) || String(s.nid).includes(q) || (s.parent || '').toLowerCase().includes(q)) {
      items.push({ icon: '👤', title: s.name, sub: t('students') + ' · ' + cname(s.classId), action: () => { page = 'students'; location.hash = '#students'; closeSearch(); render() } });
    }
  });
  if (!scoped()) {
    db.users.filter(u => u.role !== 'student' && u.role !== 'parent').forEach(u => {
      if (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) {
        items.push({ icon: '👨‍🏫', title: u.name, sub: ROLE[u.role][LANG] + ' · ' + u.username, action: () => { page = 'users'; location.hash = '#users'; closeSearch(); render() } });
      }
    });
  }
  myClasses().forEach(c => {
    if (c.name.toLowerCase().includes(q)) {
      items.push({ icon: '🏛️', title: c.name, sub: t('classes') + ' · ' + c.grade, action: () => { page = 'classes'; location.hash = '#classes'; closeSearch(); render() } });
    }
  });
  (db.showcase || []).forEach(e => {
    if (e.title.toLowerCase().includes(q) || (e.desc || '').toLowerCase().includes(q)) {
      items.push({ icon: '🎪', title: e.title, sub: t('events') + ' · ' + formatJalaliShort(e.date), action: () => { page = 'events'; location.hash = '#events'; closeSearch(); render() } });
    }
  });
  (db.homework || []).forEach(h => {
    if (h.title.toLowerCase().includes(q)) {
      items.push({ icon: '📚', title: h.title, sub: t('hw') + ' · ' + cname(h.classId), action: () => { page = 'hw'; location.hash = '#hw'; closeSearch(); render() } });
    }
  });
  (db.provEvents || []).forEach(ev => {
    if (ev.title.toLowerCase().includes(q)) {
      const tp = provType(ev.typeId);
      items.push({ icon: tp ? tp.icon : '🏫', title: ev.title, sub: t('provereshi') + ' · ' + (tp ? tp.name : ''), action: () => { page = 'provereshi'; location.hash = '#provereshi'; closeSearch(); render() } });
    }
  });
  if (PERM[me.role].includes('fin')) {
    (db.fin || []).forEach(f => {
      const sName = (db.students.find(s => s.id === f.sid) || {}).name || '';
      if (sName.toLowerCase().includes(q) || (f.type || '').toLowerCase().includes(q)) {
        items.push({ icon: '💰', title: sName + ' — ' + f.type, sub: t('fin'), action: () => { page = 'fin'; location.hash = '#fin'; closeSearch(); render() } });
      }
    });
  }

  results.innerHTML = items.length
    ? items.slice(0, 20).map((it, i) => `
        <div class="gs-item" data-a="gsSelect" data-i="${i}">
          <div class="ico">${it.icon}</div>
          <div class="info"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></div>
        </div>`).join('')
    : `<div class="empty" style="padding:20px">${LANG === 'fa' ? 'نتیجه‌ای یافت نشد' : 'No results'}</div>`;
  window.__gsItems = items;
}

/* ============ Init ============ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', THEME);
  document.documentElement.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', LANG);
  localStorage.setItem('parto_theme', THEME);
  localStorage.setItem('parto_lang', LANG);
  const colors = { light: '#4f46e5', dark: '#0f172a', gray: '#475569', orange: '#ea580c' };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors[THEME] || '#4f46e5');
}

function render() {
  applyTheme();
  const app = $('#app');
  if (!me) {
    if (otpPending) {
      app.innerHTML = `<div class="login"><form onsubmit="ACT.verifyOtp(event)">
        <div class="logo"><i>پ</i>${esc(db.school)}</div>
        <h1>${t('otpTitle')}</h1>
        <p class="mu" style="text-align:center">${t('otpDesc')}</p>
        <label>${t('otpCode')}<input name="code" dir="ltr" maxlength="6" required autofocus placeholder="••••••"></label>
        <button class="b p block">${t('otpVerify')}</button>
        <button type="button" class="b block" onclick="ACT.cancelOtp()">${t('otpCancel')}</button>
      </form></div>`;
      return;
    }
    app.innerHTML = `<div class="login"><form onsubmit="ACT.login(event)">
      <div class="logo"><i>پ</i>${esc(db.school)}</div>
      <h1>${t('login')}</h1>
      <label>${t('loginAs')}
        <select name="role">${opts(
      [
        ['student', ROLE.student[LANG]],
        ['parent', ROLE.parent[LANG]],
        ['teacher', ROLE.teacher[LANG]],
        ['vice', ROLE.vice[LANG]],
        ['admin', ROLE.admin[LANG]]
      ],
      localStorage.getItem('parto_role') || 'student'
    )}</select>
      </label>
      <label>${t('username')}<input name="username" dir="ltr" autocomplete="username" required></label>
      <label>${t('password')}<input name="password" type="password" autocomplete="current-password" required></label>
      <label class="inline" style="font-weight:400"><input type="checkbox" name="remember"> ${t('remember')}</label>
      <button class="b p block">${t('loginBtn')}</button>
      <p class="hint" style="text-align:center;margin-top:4px">${LANG === 'fa' ? 'نقش انتخابی باید با حساب مطابقت داشته باشد' : 'Selected role must match account'}</p>
      <div class="row" style="justify-content:center;margin-top:8px;gap:8px">
        <button type="button" class="b sm" onclick="ACT.toggleLangBtn()">${LANG === 'fa' ? 'English' : 'فارسی'}</button>
        <button type="button" class="b sm" onclick="ACT.setThemeBtn('light')">☀️</button>
        <button type="button" class="b sm" onclick="ACT.setThemeBtn('dark')">🌙</button>
        <button type="button" class="b sm" onclick="ACT.setThemeBtn('gray')">⚫</button>
        <button type="button" class="b sm" onclick="ACT.setThemeBtn('orange')">🟠</button>
      </div>
    </form></div>`;
    return;
  }

  if (!PERM[me.role] || !PERM[me.role].includes(page)) page = 'dash';

  const notifs = getNotifications();
  const unreadNotifs = notifs.filter(n => !n.read).length;
  const unreadMsgs = (db.messages || []).filter(m => m.to === me.id && !m.read).length;
  const unreadChats = Object.values(chatCache).flat().filter(m => !m.read && m.from !== me.id).length;
  const pendingLeaves = (db.leaves || []).filter(l => l.status === 'pending').length;

  const navItems = PAGES
    .filter(p => PERM[me.role].includes(p[0]))
    .map(p => {
      let badge = '';
      if (p[0] === 'msg' && unreadMsgs) badge = `<span class="badge">${num(unreadMsgs)}</span>`;
      if (p[0] === 'chat' && unreadChats) badge = `<span class="badge">${num(unreadChats)}</span>`;
      if (p[0] === 'leaves' && mgr() && pendingLeaves) badge = `<span class="badge">${num(pendingLeaves)}</span>`;
      return `<a href="#${p[0]}" class="${p[0] === page ? 'on' : ''}">${p[1]} ${t(p[2])}${badge}</a>`;
    }).join('');

  const viewFn = V[page] || V.dash;
  let pageHtml = '';
  try { pageHtml = viewFn(); }
  catch (err) {
    console.error('View error:', err);
    pageHtml = `<div class="card"><h2>⚠️ ${t('errTitle')}</h2><p class="mu">${esc(err.message || err)}</p><button class="b" onclick="location.reload()">${t('errReload')}</button></div>`;
  }

  const themeIcons = { light: '☀️', dark: '🌙', gray: '⚫', orange: '🟠' };

  app.innerHTML = `
    <header>
      <div class="logo"><i>پ</i>${esc(db.school)}</div>
      <div class="who">
        <button class="notif-btn" data-a="toggleNotif" title="${t('notifications')}">
          🔔${unreadNotifs ? `<span class="dot"></span>` : ''}
        </button>
        <button class="theme-btn np" data-a="openSearch" title="${t('search')} (Ctrl+K)">🔍</button>
        <span class="mu np">${formatJalali(new Date())}</span>
        <span class="tag">${ROLE[me.role][LANG]}</span>
        <div class="avatar">${esc(me.name.slice(0, 1))}</div>
        <b class="np">${esc(me.name)}</b>
        <div class="theme-switch">
          <button class="theme-btn np" data-a="toggleThemeMenu" title="${t('theme')}">${themeIcons[THEME] || '☀️'}</button>
          ${themeMenuOpen ? `
            <div class="theme-menu open">
              ${['light', 'dark', 'gray', 'orange'].map(th => `
                <button data-a="setThemeBtn" data-v="${th}" class="${THEME === th ? 'on' : ''}">
                  <span class="theme-dot" style="background:${th === 'light' ? '#fff' : th === 'dark' ? '#0f172a' : th === 'gray' ? '#475569' : '#ea580c'}"></span>
                  ${t('theme' + th.charAt(0).toUpperCase() + th.slice(1))}
                </button>`).join('')}
            </div>` : ''}
        </div>
        <button class="lang-btn np" data-a="toggleLangBtn" title="${t('language')}">${LANG === 'fa' ? 'EN' : 'FA'}</button>
        <button class="b" data-a="logout">${t('logout')}</button>
      </div>
    </header>
    <div class="wrap">
      <nav>${navItems}</nav>
      <main>${pageHtml}</main>
    </div>`;

  if (page === 'chat') {
    const el = $('#chatMsgs');
    if (el) el.scrollTop = el.scrollHeight;
  }
}

/* ============ Document Listeners ============ */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const fn = ACT[b.dataset.a];
  if (fn) {
    try { fn(b.dataset.i, b.dataset.v); }
    catch (err) { console.error('Action error:', b.dataset.a, err); toast('Error: ' + err.message, 'bad'); }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modal) closeModal();
    if (searchOpen) closeSearch();
    if (notifPanelOpen) ACT.closeNotif();
    if (themeMenuOpen) { themeMenuOpen = false; render(); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (me) openSearch();
  }
});

document.addEventListener('input', e => {
  if (e.target && e.target.id === 'gsInput') doSearch(e.target.value);
});

addEventListener('hashchange', () => {
  if (me) { page = location.hash.slice(1) || 'dash'; render() }
});

window.addEventListener('resize', () => {
  if (page === 'chat') {
    const el = $('#chatMsgs');
    if (el) el.scrollTop = el.scrollHeight;
  }
});

window.addEventListener('beforeunload', () => {
  if (quizTimer) clearInterval(quizTimer);
  if (scannerStream) {
    try { scannerStream.getTracks().forEach(tk => tk.stop()); } catch { }
    scannerStream = null;
  }
  if (ws) { try { ws.close(); } catch { } ws = null; }
});

/* ============ Init ============ */
(async function init() {
  applyTheme();

  if (USE_SERVER) {
    try {
      const id = sessionStorage.getItem('u') || localStorage.getItem('u');
      if (id) {
        const res = await api.me();
        if (res && res.user) {
          me = res.user;
          db = res.bootstrap || await api.bootstrap();
          wsConnect();
        }
      }
    } catch (err) {
      console.warn('Server error:', err);
      toast(LANG === 'fa' ? 'اتصال به سرور برقرار نشد. حالت آفلاین.' : 'Server unreachable. Offline mode.', 'warn');
      USE_SERVER = false;
    }
  }

  if (!USE_SERVER) {
    const raw = localStorage.getItem(K);
    if (raw) {
      try { db = JSON.parse(raw); }
      catch (e) { db = await seed(); }
    } else {
      db = await seed();
    }
  }

  if (!db.v) db.v = 9;

  ['classes', 'students', 'grades', 'users', 'ann', 'news', 'fin', 'polls', 'discipline',
    'homework', 'quizzes', 'online', 'messages', 'provTypes', 'provEvents', 'provRecords',
    'provElections', 'showcase', 'calendar', 'leaves', 'audit', 'finReceipts', 'finDiscounts'].forEach(k => {
      if (!Array.isArray(db[k])) db[k] = [];
    });
  if (!db.att) db.att = {};
  if (!db.chats) db.chats = {};
  if (!db.timetable) db.timetable = {};
  if (!db.settings) db.settings = { twoFA: { admin: false, vice: false } };
  if (!db.settings.twoFA) db.settings.twoFA = { admin: false, vice: false };
  if (!db.finSettings) db.finSettings = { currency: 'تومان', fiscalYear: '', taxRate: 0 };
  if (typeof db._finTab === 'undefined') db._finTab = 'overview';
  if (typeof db._finStudentFilter === 'undefined') db._finStudentFilter = 'all';

  /* مهاجرت: fin قدیمی paid=true → finReceipts */
  (db.fin || []).forEach(f => {
    if (f.paid && typeof f.paid === 'boolean') {
      const exists = db.finReceipts.some(r => r.chargeId === f.id);
      if (!exists) {
        const maxNo = db.finReceipts.reduce((m, r) => Math.max(m, +r.receiptNo || 0), 0);
        db.finReceipts.push({
          id: uid(), sid: f.sid, amount: +f.amount || 0,
          method: 'نقد', chargeId: f.id,
          note: LANG === 'fa' ? 'مهاجرت خودکار' : 'Auto migration',
          receiptNo: maxNo + 1, by: null, ts: Date.now(), _migrated: true
        });
      }
    }
  });

  /* تنظیم تقویم شمسی */
  const [tjy, tjm] = dateToJalali(new Date());
  calJY = tjy; calJM = tjm;

  /* restore session */
  if (!me) {
    const id = sessionStorage.getItem('u') || localStorage.getItem('u');
    me = (db.users || []).find(u => u.id === id) || null;
    if (me) wsConnect();
  }

  page = location.hash.slice(1) || 'dash';
  save();
  render();

  if (me) setTimeout(() => toast(LANG === 'fa' ? 'خوش آمدید ' + me.name : 'Welcome ' + me.name, 'ok'), 300);
})();