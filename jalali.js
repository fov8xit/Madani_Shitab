/* =========================================================================
   Jalali (Persian) Calendar Utilities
   با استفاده از الگوریتم تبدیل میلادی ↔ شمسی
   ========================================================================= */

/**
 * تبدیل تاریخ میلادی به شمسی
 * @param {number} gy - سال میلادی
 * @param {number} gm - ماه میلادی (1-12)
 * @param {number} gd - روز میلادی
 * @returns {[number, number, number]} [jy, jm, jd]
 */
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) -
    (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) -
    80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/**
 * تبدیل تاریخ شمسی به میلادی
 * @param {number} jy - سال شمسی
 * @param {number} jm - ماه شمسی (1-12)
 * @param {number} jd - روز شمسی
 * @returns {[number, number, number]} [gy, gm, gd]
 */
function jalaliToGregorian(jy, jm, jd) {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + ((Math.floor(jy / 33)) * 8) +
    (Math.floor(((jy % 33) + 3) / 4)) + 78 + jd +
    ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * (Math.floor(days / 146097));
  days %= 146097;
  if (days > 36524) {
    gy += 100 * (Math.floor(--days / 36524));
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

/**
 * تعداد روزهای ماه شمسی
 */
function jalaliMonthDays(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // اسفند
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/**
 * سال شمسی کبیسه؟
 */
function isLeapJalaliYear(jy) {
  const [, gmm] = jalaliToGregorian(jy + 1, 1, 1);
  const [, , gd] = jalaliToGregorian(jy, 12, 29);
  return gd === 29 && gmm > 1;
}

/**
 * نام ماه‌های شمسی
 */
const JALALI_MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const JALALI_MONTHS_EN = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
const JALALI_WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const JALALI_WEEKDAYS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * تبدیل Date میلادی → {jy, jm, jd}
 */
function dateToJalali(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * تبدیل {jy, jm, jd} → Date میلادی
 */
function jalaliToDate(jy, jm, jd) {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

/**
 * ISO (YYYY-MM-DD میلادی) → رشته شمسی "YYYY/MM/DD"
 */
function isoToJalali(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return String(iso);
    const [jy, jm, jd] = dateToJalali(d);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch { return String(iso); }
}

/**
 * رشته شمسی "YYYY/MM/DD" → ISO میلادی
 */
function jalaliToISO(str) {
  if (!str) return '';
  const m = String(str).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) return '';
  const [gy, gm, gd] = jalaliToGregorian(+m[1], +m[2], +m[3]);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

/**
 * Date → رشته شمسی
 */
function dateToJalaliStr(date) {
  const [jy, jm, jd] = dateToJalali(date);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/**
 * امروز به ISO میلادی
 */
function todayISO() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * روز هفته شمسی (0=شنبه تا 6=جمعه) از Date میلادی
 */
function jalaliWeekday(date) {
  // getDay(): 0=یکشنبه ... 6=شنبه
  // می‌خواهیم: 0=شنبه ... 6=جمعه
  const gd = date.getDay(); // 0=Sun..6=Sat
  // شنبه = 6 در getDay
  return (gd + 1) % 7;
}

/**
 * فرمت کامل تاریخ برای نمایش
 */
function formatJalali(date) {
  if (!date) return '—';
  const d = (typeof date === 'string') ? new Date(date + 'T12:00:00') : date;
  if (isNaN(d.getTime())) return '—';
  const [jy, jm, jd] = dateToJalali(d);
  if (LANG === 'fa') {
    return `${jd} ${JALALI_MONTHS_FA[jm - 1]} ${jy}`;
  }
  return `${JALALI_MONTHS_EN[jm - 1]} ${jd}, ${jy}`;
}

/**
 * فرمت کوتاه تاریخ
 */
function formatJalaliShort(date) {
  if (!date) return '—';
  const d = (typeof date === 'string') ? new Date(date + 'T12:00:00') : date;
  if (isNaN(d.getTime())) return '—';
  const [jy, jm, jd] = dateToJalali(d);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/**
 * تبدیل اعداد لاتین به فارسی
 */
function toFa(str) {
  if (LANG !== 'fa') return String(str ?? '');
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  return String(str ?? '').replace(/[0-9]/g, d => faDigits[+d]);
}
function en(str) {
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  return String(str || '').replace(/[۰-۹]/g, d => faDigits.indexOf(d));
}