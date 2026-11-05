/* =========================================================================
   Database + Seed + Save
   ========================================================================= */
const K = 'parto_lms_v9';
const API_BASE = window.API_BASE || '/api';
const WS_URL = window.WS_URL || null;
let USE_SERVER = false;
let db = {};

const save = () => {
  if (USE_SERVER) return;
  try { localStorage.setItem(K, JSON.stringify(db)) }
  catch (e) { toast(LANG === 'fa' ? 'حجم داده بیشتر از ظرفیت مرورگر است' : 'Storage quota exceeded', 'bad') }
};
async function reload() {
  if (USE_SERVER) {
    const fresh = await api.bootstrap();
    if (fresh) { db = fresh; save() }
  }
  render();
}

/* API */
const api = {
  async call(method, path, body) {
    if (!USE_SERVER) return null;
    const opt = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      credentials: 'include'
    };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(API_BASE + path, opt);
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`API ${r.status}: ${txt || r.statusText}`);
    }
    return r.json().catch(() => null);
  },
  get: p => api.call('GET', p),
  post: (p, b) => api.call('POST', p, b),
  put: (p, b) => api.call('PUT', p, b),
  del: p => api.call('DELETE', p),
  login: (u, p, role) => api.post('/auth/login', { username: u, password: p, role }),
  verifyOtp: c => api.post('/auth/otp', { code: c }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  bootstrap: () => api.get('/bootstrap'),
  save: (col, obj) => api.post('/' + col, obj),
  update: (col, id, o) => api.put('/' + col + '/' + id, o),
  remove: (col, id) => api.del('/' + col + '/' + id),
  attSave: (date, bell, rows) => api.post('/attendance', { date, bell, rows }),
  chatSend: (to, text) => api.post('/chat', { to, text }),
  chatHistory: peer => api.get('/chat/' + peer),
  pollVote: (pid, opt) => api.post('/polls/' + pid + '/vote', { option: opt })
};

/* Seed */
async function seed() {
  const classes = [
    { id: 'c1', name: LANG === 'fa' ? 'دهم ریاضی' : 'Grade 10 Math', grade: '10', room: '101', teacherId: '' },
    { id: 'c2', name: LANG === 'fa' ? 'دهم تجربی' : 'Grade 10 Science', grade: '10', room: '102', teacherId: '' },
    { id: 'c3', name: LANG === 'fa' ? 'دهم انسانی' : 'Grade 10 Humanities', grade: '10', room: '103', teacherId: '' },
    { id: 'c4', name: LANG === 'fa' ? 'یازدهم ریاضی' : 'Grade 11 Math', grade: '11', room: '201', teacherId: '' }
  ];
  const students = [
    ['علی احمدی', '0499370899', 'c1', 'حسن احمدی', '09121111111'],
    ['زهرا رضایی', '0499370902', 'c2', 'محمد رضایی', '09122222222'],
    ['محمد کریمی', '0499370910', 'c1', 'رضا کریمی', '09123333333'],
    ['سارا محمدی', '0499370929', 'c4', 'اکبر محمدی', '09124444444'],
    ['رضا نوری', '0499370937', 'c1', 'حسن نوری', '09125555555'],
    ['مریم حسینی', '0123456789', 'c3', 'علی حسینی', '09126666666']
  ].map((arr, i) => ({ id: 's' + i, name: arr[0], nid: arr[1], classId: arr[2], parent: arr[3], phone: arr[4] }));

  const g = (i, subject, score, type) => ({ id: uid(), sid: 's' + i, subject, score, type, date: iso() });
  const grades = [
    g(0, 'ریاضی', 18.5, 'میان‌ترم'), g(0, 'فیزیک', 15, 'کوییز'), g(0, 'ریاضی', 19, 'پایان‌ترم'),
    g(1, 'زیست', 17, 'میان‌ترم'), g(1, 'شیمی', 16.5, 'کوییز'),
    g(2, 'ریاضی', 8.5, 'میان‌ترم'), g(2, 'فیزیک', 12, 'کوییز'),
    g(3, 'ادبیات', 19, 'پایان‌ترم'), g(3, 'عربی', 18, 'میان‌ترم'),
    g(5, 'تاریخ', 16, 'میان‌ترم'), g(5, 'جغرافیا', 14, 'کوییز')
  ];

  const users = [
    await mkUser('manager', 'مدیر مدرسه', 'admin', '12345678'),
    await mkUser('Qazanfari', 'قاضی‌نفری (معاون)', 'vice', '12345678'),
    await mkUser('teacher', 'خانم معلم', 'teacher', 'teacher', '', ['c1', 'c2']),
    await mkUser('parent1', 'حسن احمدی', 'parent', '12345678', 's0'),
    await mkUser('student1', 'علی احمدی', 'student', '12345678', 's0')
  ];

  const today = iso();
  const att = {};
  att[today] = {};
  BELLS.slice(0, 3).forEach(b => {
    att[today][b] = {};
    students.forEach((s, i) => { att[today][b][s.id] = { status: i % 5 === 0 ? 'a' : i % 4 === 0 ? 'l' : 'p', delay: i % 4 === 0 ? 5 : 0 } });
  });

  const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
  const timetable = {};
  classes.forEach(c => {
    timetable[c.id] = {};
    weekdays.forEach((d, di) => {
      timetable[c.id][d] = {};
      for (let b = 1; b <= 4; b++) {
        const subs = ['ریاضی', 'فیزیک', 'شیمی', 'ادبیات', 'عربی', 'زیست', 'تاریخ', 'جغرافیا'];
        timetable[c.id][d][b] = subs[(di + b) % subs.length];
      }
    });
  });

  const cal = [
    { id: uid(), date: iso(), title: 'شروع سال تحصیلی', type: 'event', desc: '', ts: Date.now() },
    { id: uid(), date: isoDate(15), title: 'امتحان میان‌ترم ریاضی', type: 'exam', desc: '', ts: Date.now() },
    { id: uid(), date: isoDate(22), title: 'هفته وحدت', type: 'holiday', desc: '', ts: Date.now() }
  ];

  return {
    v: 9,
    school: LANG === 'fa' ? 'مدرسه پرتو' : 'Parto School',
    year: '1404-1405',
    classes, students, grades, users,
    att,
    ann: [
      { id: uid(), title: 'شروع سال تحصیلی', target: 'all', body: 'به همه دانش‌آموزان خوش آمد می‌گوییم.', date: iso(), authorId: users[0].id, ts: Date.now() }
    ],
    news: [
      { id: uid(), title: 'افتتاح آزمایشگاه جدید', body: 'آزمایشگاه فیزیک با تجهیزات جدید افتتاح شد.', date: iso(), authorId: users[0].id, img: '', ts: Date.now() }
    ],
    fin: [],
    polls: [
      { id: uid(), title: 'نظر شما درباره ساعات کلاس‌ها؟', options: ['خیلی خوب', 'خوب', 'نیاز به تغییر'], votes: {}, multi: false, createdBy: users[0].id, date: iso(), deadline: '', img: '', ts: Date.now() }
    ],
    discipline: [
      { id: uid(), sid: 's0', type: 'تذکر شفاهی', desc: 'بی‌نظمی در کلاس', date: iso(), by: users[0].id, severity: 'low' }
    ],
    homework: [
      { id: uid(), classId: 'c1', subject: 'ریاضی', title: 'تمرین فصل ۳', desc: 'صفحه ۴۵ تا ۵۰', due: iso(), createdBy: users[2].id, submissions: {} }
    ],
    quizzes: [],
    online: [],
    messages: [],
    chats: {},
    provTypes: [
      { id: 'pt1', name: 'بوفه', icon: '🍲', op: 'coupon', unit: 'تومان', active: true, createdBy: users[0].id, ts: Date.now() },
      { id: 'pt2', name: 'نمازخانه', icon: '🕌', op: 'attend', unit: '', active: true, createdBy: users[0].id, ts: Date.now() },
      { id: 'pt3', name: 'شورای دانش‌آموزی', icon: '🗳️', op: 'vote', unit: '', active: true, createdBy: users[0].id, ts: Date.now() }
    ],
    provEvents: [],
    provRecords: [],
    provElections: [],
    showcase: [
      { id: uid(), title: 'هفته وحدت', desc: 'هفته وحدت، فاصله میان ۱۲ ربیع‌الاول و ۱۷ ربیع‌الاول است. این هفته نماد وحدت مسلمانان است.', img: '', cat: 'مذهبی', date: iso(), authorId: users[0].id, pinned: true, ts: Date.now() }
    ],
    calendar: cal,
    timetable,
    leaves: [],
    audit: [],
    settings: { twoFA: { admin: false, vice: false } },
    finReceipts: [],
    finDiscounts: [],
    finSettings: { currency: 'تومان', fiscalYear: '1404-1405', taxRate: 0 },
    _finTab: 'overview',
    _finStudentFilter: 'all'
  };
}

function isoDate(day) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}