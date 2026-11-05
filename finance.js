/* =========================================================================
   Finance Module — گسترده v9
   ========================================================================= */
function finHelpers() {
  const get = () => {
    if (!db.finReceipts) db.finReceipts = [];
    if (!db.finDiscounts) db.finDiscounts = [];
    if (!db.finSettings) db.finSettings = { currency: 'تومان', fiscalYear: '', taxRate: 0 };
    return {
      receipts: db.finReceipts,
      discounts: db.finDiscounts,
      settings: db.finSettings
    };
  };

  const totalPaid = sid => get().receipts
    .filter(r => r.sid === sid)
    .reduce((s, r) => s + (+r.amount || 0), 0);

  const totalDiscount = sid => get().discounts
    .filter(d => d.sid === sid)
    .reduce((s, d) => s + (+d.amount || 0), 0);

  const totalDebt = sid => (db.fin || [])
    .filter(f => f.sid === sid)
    .reduce((s, f) => s + (+f.amount || 0), 0);

  const balance = sid => totalDebt(sid) - totalDiscount(sid) - totalPaid(sid);

  const statusFor = sid => {
    const b = balance(sid);
    if (b <= 0) return { key: 'paid', label: t('finSettled'), cls: 'ok' };
    const debt = totalDebt(sid);
    const paidPct = debt > 0 ? (totalPaid(sid) + totalDiscount(sid)) / debt * 100 : 0;
    if (paidPct > 0) return { key: 'partial', label: t('finPartial'), cls: 'warn' };
    return { key: 'unpaid', label: t('finUnpaid'), cls: 'bad' };
  };

  const nextReceiptNo = () => {
    const rs = get().receipts;
    const maxNo = rs.reduce((m, r) => Math.max(m, +r.receiptNo || 0), 0);
    return maxNo + 1;
  };

  const totals = () => {
    const ids = mine().map(s => s.id);
    let debt = 0, paid = 0, disc = 0;
    ids.forEach(id => {
      debt += totalDebt(id);
      paid += totalPaid(id);
      disc += totalDiscount(id);
    });
    return { debt, paid, discount: disc, balance: debt - disc - paid };
  };

  return { get, totalPaid, totalDiscount, totalDebt, balance, statusFor, nextReceiptNo, totals };
}

function fmoney(n) {
  const cur = finHelpers().get().settings.currency || (LANG === 'fa' ? 'تومان' : 'Toman');
  return (n == null || isNaN(+n)) ? '—' : (+n).toLocaleString(LANG === 'fa' ? 'fa-IR' : 'en-US') + ' ' + cur;
}

/* ============ Main View ============ */
V.fin = function () {
  const tab = db._finTab || 'overview';
  const tabs = [
    ['overview', t('finOverview')],
    ['entries', t('finCharges')],
    ['receipts', t('finPayments')],
    ['discounts', t('finDiscounts')],
    ['reports', t('finReports')],
    ['students', t('finStudentStatus')]
  ];
  const tabBar = `<div class="tabs">${tabs.map(tb =>
    `<button class="${tab === tb[0] ? 'on' : ''}" data-a="finTab" data-v="${tb[0]}">${tb[1]}</button>`
  ).join('')}</div>`;

  let body = '';
  switch (tab) {
    case 'overview': body = finOverview(); break;
    case 'entries': body = finEntries(); break;
    case 'receipts': body = finReceipts(); break;
    case 'discounts': body = finDiscounts(); break;
    case 'reports': body = finReports(); break;
    case 'students': body = finStudents(); break;
  }

  return head(t('fin'), LANG === 'fa' ? 'مدیریت شهریه، پرداخت‌ها، تخفیف‌ها و گزارش‌ها' : 'Tuition, payments, discounts and reports') +
    tabBar + body;
};

function finOverview() {
  const H = finHelpers();
  const totals = H.totals();
  const payPct = totals.debt > 0 ? Math.round((totals.paid + totals.discount) / totals.debt * 100) : 0;

  return `<div class="stats">
    <div class="stat"><b>${fmoney(totals.debt)}</b><small>${t('finTotalDebt')}</small></div>
    <div class="stat ok"><b>${fmoney(totals.paid)}</b><small>${t('finTotalPaid')}</small></div>
    <div class="stat info"><b>${fmoney(totals.discount)}</b><small>${t('finTotalDiscount')}</small></div>
    <div class="stat ${totals.balance > 0 ? 'warn' : 'ok'}"><b>${fmoney(totals.balance)}</b><small>${t('finTotalBalance')}</small></div>
  </div>` +
    card(t('finPaymentProgress'), `
      <div style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden">
        <div style="background:var(--grad);height:100%;width:${clamp(payPct, 0, 100)}%;transition:width .3s"></div>
      </div>
      <div class="row" style="margin-top:8px">
        <span class="mu">${num(payPct)}%</span>
        <span class="mu">${fmoney(totals.paid + totals.discount)} / ${fmoney(totals.debt)}</span>
      </div>`) +
    card(t('finRecentTransactions'), (() => {
      const all = [
        ...(db.fin || []).map(f => ({ type: 'charge', ts: f.ts || 0, sid: f.sid, amount: f.amount, label: f.type, obj: f })),
        ...H.get().receipts.map(r => ({ type: 'payment', ts: r.ts, sid: r.sid, amount: r.amount, label: '#' + r.receiptNo, obj: r })),
        ...H.get().discounts.map(d => ({ type: 'discount', ts: d.ts, sid: d.sid, amount: d.amount, label: d.reason, obj: d }))
      ].sort((a, b) => b.ts - a.ts).slice(0, 10);
      if (!all.length) return empty(t('empty'), '💰');
      const rows = all.map(x => `<tr>
        <td>${x.type === 'charge' ? `<span class="tag bad">${t('finCharge')}</span>` : x.type === 'payment' ? `<span class="tag ok">${t('finPayment')}</span>` : `<span class="tag info">${t('finDiscount')}</span>`}</td>
        <td>${sname(x.sid)}</td>
        <td>${esc(x.label || '—')}</td>
        <td><b>${fmoney(x.amount)}</b></td>
        <td>${formatJalaliShort(new Date(x.ts).toLocaleDateString('en-CA'))}</td>
      </tr>`);
      return tbl([t('type'), t('students'), LANG === 'fa' ? 'شرح' : 'Details', t('amount'), t('date')], rows, t('empty'), '💳');
    })());
}

function finEntries() {
  const H = finHelpers();
  const ids = mine().map(s => s.id);
  const items = (db.fin || []).filter(f => ids.includes(f.sid));
  const p = paginate(items, 'fin');

  const rows = p.slice.map(f => {
    const paid = (H.get().receipts).filter(r => r.chargeId === f.id).reduce((s, r) => s + (+r.amount || 0), 0);
    const disc = (H.get().discounts).filter(d => d.chargeId === f.id).reduce((s, d) => s + (+d.amount || 0), 0);
    const remain = (+f.amount || 0) - paid - disc;
    const status = remain <= 0 ? { label: t('paid'), cls: 'ok' } : (paid + disc) > 0 ? { label: LANG === 'fa' ? 'جزئی' : 'Partial', cls: 'warn' } : { label: t('unpaid'), cls: 'bad' };
    return `<tr>
      <td>${sname(f.sid)}</td>
      <td>${esc(f.type)}</td>
      <td><b>${fmoney(f.amount)}</b></td>
      <td>${fmoney(paid)}</td>
      <td>${fmoney(disc)}</td>
      <td><span class="tag ${status.cls}">${fmoney(remain)}</span></td>
      <td>${f.due ? formatJalaliShort(f.due) : '—'}</td>
      <td>
        ${remain > 0 && isAdmin() ? `<button class="b ok sm" data-a="addReceiptForCharge" data-i="${f.id}">${LANG === 'fa' ? 'پرداخت' : 'Pay'}</button> ` : ''}
        ${isAdmin() ? delBtn('fin', f.id) : ''}
      </td>
    </tr>`;
  });

  const form = isAdmin() ? card(t('finAddCharge'), `
    <form class="fm" onsubmit="ACT.addFin(event)">
      <label>${t('students')}<select name="sid" required>${stOpts()}</select></label>
      <label>${t('amount')}<input name="amount" required inputmode="numeric"></label>
      <label>${t('type')}<select name="type">${opts([['شهریه', 'شهریه'], ['کتاب', 'کتاب'], ['اردو', 'اردو'], ['سایر', 'سایر']])}</select></label>
      <label>${t('due')}
        <div class="dp-wrap">
          <input type="text" readonly name="dueJ" data-jalali="" onclick="ACT.openDP(this, v => this.value=formatJalaliShort(v||''))" placeholder="${t('selectDate')}">
          <input type="hidden" name="due">
        </div>
      </label>
      <label style="grid-column:1/-1">${t('finNote')}<input name="note" placeholder="${LANG === 'fa' ? 'اختیاری' : 'Optional'}"></label>
      <button class="b p">${t('add')}</button>
    </form>`) : '';

  return form + card(t('finChargesList'), `
    <div class="row" style="margin-bottom:10px">
      <button class="b sm" data-a="csvFin">${t('export')} CSV</button>
    </div>` +
    tbl([t('students'), t('type'), t('amount'), t('paid'), t('finDiscounts'), t('finRemain'), t('due'), t('actions')], rows, t('empty'), '💰') +
    pagerHtml('fin', p.total));
}

function finReceipts() {
  const H = finHelpers();
  const ids = mine().map(s => s.id);
  const items = (H.get().receipts || []).filter(r => ids.includes(r.sid)).sort((a, b) => b.ts - a.ts);
  const p = paginate(items, 'finReceipts');

  const rows = p.slice.map(r => `<tr>
    <td><b>#${esc(r.receiptNo || '—')}</b></td>
    <td>${sname(r.sid)}</td>
    <td><b>${fmoney(r.amount)}</b></td>
    <td>${esc(r.method || 'نقد')}</td>
    <td>${formatJalaliShort(new Date(r.ts).toLocaleDateString('en-CA'))}</td>
    <td>${uname(r.by)}</td>
    <td>
      <button class="b e sm" data-a="viewReceipt" data-i="${r.id}">${t('finViewReceipt')}</button>
      ${isAdmin() ? `<button class="b d sm" data-a="del" data-i="${r.id}" data-v="finReceipts">${t('delete')}</button>` : ''}
    </td>
  </tr>`);

  const form = isAdmin() ? card(t('finAddPayment'), `
    <form class="fm" onsubmit="ACT.addReceipt(event)">
      <label>${t('students')}<select name="sid" required>${stOpts()}</select></label>
      <label>${t('amount')}<input name="amount" required inputmode="numeric"></label>
      <label>${t('finMethod')}<select name="method">
        ${opts([['نقد', t('finCash')], ['کارت', t('finCard')], ['آنلاین', t('finOnline')], ['چک', t('finCheck')]])}
      </select></label>
      <label>${t('finForChargeOptional')}<select name="chargeId"><option value="">—</option>
        ${opts((db.fin || []).filter(f => mine().some(s => s.id === f.sid)).map(f => [f.id, sname(f.sid) + ' — ' + f.type + ' — ' + fmoney(f.amount)]))}
      </select></label>
      <label style="grid-column:1/-1">${t('finNote')}<input name="note"></label>
      <button class="b p">${t('add')}</button>
    </form>`) : '';

  return form + card(t('finReceiptsList'),
    tbl(['#', t('students'), t('amount'), t('finMethod'), t('date'), LANG === 'fa' ? 'ثبت‌کننده' : 'By', t('actions')], rows, t('empty'), '🧾') +
    pagerHtml('finReceipts', p.total));
}

function finDiscounts() {
  const H = finHelpers();
  const ids = mine().map(s => s.id);
  const items = (H.get().discounts || []).filter(d => ids.includes(d.sid)).sort((a, b) => b.ts - a.ts);
  const p = paginate(items, 'finDiscounts');

  const rows = p.slice.map(d => `<tr>
    <td>${sname(d.sid)}</td>
    <td><b>${fmoney(d.amount)}</b></td>
    <td>${esc(d.reason || '—')}</td>
    <td>${formatJalaliShort(new Date(d.ts).toLocaleDateString('en-CA'))}</td>
    <td>${uname(d.by)}</td>
    <td>${isAdmin() ? delBtn('finDiscounts', d.id) : ''}</td>
  </tr>`);

  const form = isAdmin() ? card(t('finAddDiscount'), `
    <form class="fm" onsubmit="ACT.addDiscount(event)">
      <label>${t('students')}<select name="sid" required>${stOpts()}</select></label>
      <label>${t('amount')}<input name="amount" required inputmode="numeric"></label>
      <label>${t('finReason')}<input name="reason" required placeholder="${LANG === 'fa' ? 'بورس، تخفیف خواهر/برادر، ...' : 'Scholarship, sibling discount, ...'}"></label>
      <label>${t('finForChargeOptional')}<select name="chargeId"><option value="">—</option>
        ${opts((db.fin || []).filter(f => mine().some(s => s.id === f.sid)).map(f => [f.id, sname(f.sid) + ' — ' + f.type]))}
      </select></label>
      <button class="b p">${t('add')}</button>
    </form>`) : '';

  return form + card(t('finDiscountsList'),
    tbl([t('students'), t('amount'), t('finReason'), t('date'), LANG === 'fa' ? 'ثبت‌کننده' : 'By', t('actions')], rows, t('empty'), '🎁') +
    pagerHtml('finDiscounts', p.total));
}

function finReports() {
  const H = finHelpers();
  const ids = mine().map(s => s.id);
  const items = (db.fin || []).filter(f => ids.includes(f.sid));

  const byType = {};
  items.forEach(f => { byType[f.type] = (byType[f.type] || 0) + (+f.amount || 0) });
  const typeRows = Object.entries(byType).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${fmoney(v)}</td></tr>`);

  const byMonth = {};
  items.forEach(f => {
    const d = f.due ? new Date(f.due + 'T12:00:00') : new Date();
    if (isNaN(d.getTime())) return;
    const [jy, jm] = dateToJalali(d);
    const key = `${jy}-${String(jm).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + (+f.amount || 0);
  });
  const monthRows = Object.entries(byMonth).sort().map(([k, v]) => `<tr>
    <td>${k.replace('-', '/')}</td>
    <td>${fmoney(v)}</td>
  </tr>`);

  const totals = H.totals();
  const months = Object.keys(byMonth).sort();
  const maxMonth = Math.max(...Object.values(byMonth), 1);
  const bars = months.map(m => {
    const v = byMonth[m];
    const pct = (v / maxMonth) * 100;
    return `<div><b>${fmoney(v).split(' ')[0]}</b><i style="height:${clamp(pct, 3, 100)}%"></i><span>${m.replace('-', '/')}</span></div>`;
  }).join('');

  return `<div class="row" style="margin-bottom:10px">
    <button class="b sm" data-a="exportFinReport">${t('export')} CSV</button>
    <button class="b sm" data-a="exportFinPDF">${t('exportPDF')}</button>
  </div>` +
    `<div class="stats">
      <div class="stat"><b>${fmoney(totals.debt)}</b><small>${t('finTotalDebt')}</small></div>
      <div class="stat ok"><b>${fmoney(totals.paid)}</b><small>${t('finTotalPaid')}</small></div>
      <div class="stat info"><b>${fmoney(totals.discount)}</b><small>${t('finTotalDiscount')}</small></div>
      <div class="stat warn"><b>${fmoney(totals.balance)}</b><small>${t('finTotalBalance')}</small></div>
    </div>` +
    card(t('finMonthlyChart'),
      bars ? `<div class="bars">${bars}</div>` : empty(t('noData'), '📊')) +
    card(t('finByType'),
      typeRows.length ? tbl([t('type'), t('amount')], typeRows, t('empty'), '📊') : empty(t('noData'), '📊')) +
    card(t('finByMonth'),
      monthRows.length ? tbl([LANG === 'fa' ? 'ماه' : 'Month', t('amount')], monthRows, t('empty'), '📊') : empty(t('noData'), '📊'));
}

function finStudents() {
  const H = finHelpers();
  const S = mine();
  const filter = db._finStudentFilter || 'all';

  const rows = S.map(s => {
    const debt = H.totalDebt(s.id);
    const paid = H.totalPaid(s.id);
    const disc = H.totalDiscount(s.id);
    const bal = H.balance(s.id);
    const st = H.statusFor(s.id);
    return { s, debt, paid, disc, bal, st };
  }).filter(x => filter === 'all' || x.st.key === filter);

  const html = rows.map(({ s, debt, paid, disc, bal, st }) => `<tr>
    <td><b>${esc(s.name)}</b></td>
    <td>${cname(s.classId)}</td>
    <td>${fmoney(debt)}</td>
    <td>${fmoney(paid)}</td>
    <td>${fmoney(disc)}</td>
    <td><span class="tag ${st.cls}">${st.label}</span></td>
    <td><b>${fmoney(bal)}</b></td>
    <td>
      <button class="b e sm" data-a="viewStudentFin" data-i="${s.id}">${t('finDetails')}</button>
      ${bal > 0 && (mgr() || isAdmin()) ? `<button class="b sm" data-a="notifyParentDebt" data-i="${s.id}">${t('finRemind')}</button>` : ''}
    </td>
  </tr>`);

  return card(t('finStudentStatus'), `
    <div class="row" style="margin-bottom:12px">
      <label style="max-width:200px">${t('finFilter')}<select onchange="ACT.finStudentFilter(this.value)">
        ${opts([['all', t('all')], ['paid', t('finSettled')], ['partial', t('finPartial')], ['unpaid', t('finUnpaid')]], filter)}
      </select></label>
      <button class="b sm" data-a="exportFinStudents">${t('export')} CSV</button>
    </div>` +
    tbl([t('students'), t('className'), t('finTotalDebt'), t('paid'), t('finDiscounts'), t('status'), t('finBalance'), t('actions')], html, t('empty'), '👥'));
}