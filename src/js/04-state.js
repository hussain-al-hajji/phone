// ---------------------------------------------------------------------
// الحالة الحية من قاعدة البيانات + دمج المحتوى (الافتراضي في الكود + التراكب من Firebase)
// المصفوفة الأصلية COURSE لا تُعدَّل أبدًا؛ كل تعديل يُحفظ كتراكب منفصل.
// ---------------------------------------------------------------------
const Store = {
  contentAxes: {}, contentEx: {}, addedAxes: {}, addedEx: {}, visibility: {}, enabled: {}, order: [],
  site: {}, groupCount: DEFAULT_GROUPS, groupNames: {}, assign: {}, users: {}, posts: {}, reveal: {},
  labTimers: {}, labAnswers: {}, broadcast: null, resetStamp: 0, registered: 0, ready: false
};
const DEFAULT_SITE = {
  headerTitle: 'التحول التجاري عبر الهاتف المحمول',
  headerSub: 'ورشة تفاعلية مباشرة',
  heroTitle: 'التحول التجاري عبر الهاتف المحمول',
  heroDesc: 'رحلة من خمس وحدات مترابطة: نفهم المستخدم، ثم نتعلم كيف نؤثر في سلوكه، ونصمم البيئة التي يتحرك داخلها، ونزيل عوائق الدفع ونبني الثقة، ثم نقرأ البيانات ونحسّن باستمرار — مع شرائح تفاعلية وتمارين حية تشارك فيها من جوالك.',
  heroImage: '',
  footerName: 'حسين الحاجي',
  footerBio: 'مدرب التجارة الإلكترونية والعمل الحر عبر الإنترنت، متخصص في العمل مع الشباب',
  footerUrl: 'www.hussain-al-hajji.com',
  linkedin: '', x: '', instagram: '', whatsapp: '', email: ''
};
const DEFAULT_CONGRATS = {
  emoji: '🏆',
  title: 'تهنئة إنجاز',
  paragraphs: ['نبارك لـ {{name}} إنجازه المتميز في برنامج «{{courseTitle}}».', 'لقد أتممت رحلة التعلّم بجدية ومشاركة فاعلة، من فهم سلوك المستخدم حتى بناء منهجية التحسين المستمر.', 'نتمنى لك تطبيقًا موفقًا لما تعلمته في عملك القادم.'],
  footerRight: 'التاريخ: {{date}}',
  footerLeft: 'حسين الحاجي — مدرب البرنامج',
  notice: 'تنبيه: ستختفي هذه التهنئة مع الأوسمة بعد ' + CONGRATS_DAYS_DEFAULT + ' أيام من انتهاء البرنامج. حمّلها الآن أو أرسلها إلى بريدك.'
};
const DEFAULT_PDF = { enabled: true, coverTitle: '', coverSub: 'الملف المرجعي لشرائح البرنامج', trainerName: 'حسين الحاجي', trainerRole: 'مدرب التجارة الإلكترونية والعمل الحر عبر الإنترنت', trainerBio: 'متخصص في العمل مع الشباب، ويقدّم برامج تطبيقية في التجارة الإلكترونية والتحول الرقمي للأعمال.', trainerContact: 'www.hussain-al-hajji.com' };

const DEF_AXIS = {}; COURSE.axes.forEach(a => { DEF_AXIS[a.id] = a; });
const DEF_EX = {}; COURSE.axes.forEach(a => a.exercises.forEach(e => { DEF_EX[e.id] = e; })); COURSE.activities.forEach(e => { DEF_EX[e.id] = e; }); DEF_EX[COURSE.survey.id] = COURSE.survey;
const SURVEY_ID = COURSE.survey.id;
const DEF_SLIDE_CHART = {}; COURSE.axes.forEach(a => a.slides.forEach(s => { if (s.chart) DEF_SLIDE_CHART[s.id] = s.chart; }));

const Content = {
  site() { return Object.assign({}, DEFAULT_SITE, Store.site.home || {}); },
  congrats() { const c = Object.assign({}, DEFAULT_CONGRATS, Store.site.congrats || {}); c.paragraphs = arr(c.paragraphs); return c; },
  pdf() { return Object.assign({}, DEFAULT_PDF, Store.site.pdf || {}); },
  courseTitle() { const el = document.getElementById('brandTitle'); return (el && el.textContent.trim()) || Content.site().headerTitle; },
  isHidden(id) { return Store.visibility && Store.visibility[id] === false; },
  isEnabled(id) { return !(Store.enabled && Store.enabled[id] === false); },
  color(a) { return AXIS_COLORS[((a && a.color) || 0) % AXIS_COLORS.length]; },
  mergeAxis(id) {
    const def = DEF_AXIS[id], added = Store.addedAxes[id];
    if (!def && !added) return null;
    let a;
    if (def) {
      const ov = Store.contentAxes[id];
      a = Object.assign({}, def, ov || {}, { id, _modified: !!ov, _added: false });
      a.exercises = undefined;
    } else {
      a = Object.assign({ unit: 0, color: 0, icon: 'star', slides: [], highlights: [] }, added, { id, _added: true, _modified: false });
    }
    a.highlights = arr(a.highlights);
    a.slides = arr(a.slides).map((s, i) => { const o = Object.assign({}, s); o.points = arr(o.points); o.items = arr(o.items); if (!o.id) o.id = id + 'x' + i; if (DEF_SLIDE_CHART[o.id]) o.chart = DEF_SLIDE_CHART[o.id]; return o; });
    a._hidden = Content.isHidden(id); a._disabled = !Content.isEnabled(id);
    return a;
  },
  axisIds() {
    const all = COURSE.axes.map(a => a.id).concat(Object.keys(Store.addedAxes || {}).sort((x, y) => ((Store.addedAxes[x].ts || 0) - (Store.addedAxes[y].ts || 0))));
    const saved = arr(Store.order).filter(id => all.indexOf(id) > -1);
    return saved.concat(all.filter(id => saved.indexOf(id) === -1)); // أي محور جديد يُلحق بالنهاية تلقائيًا
  },
  axes(o = {}) { return Content.axisIds().map(Content.mergeAxis).filter(a => a && (o.all || !a._hidden)); },
  eligibleAxes() { return Content.axes().filter(a => !a._disabled); },
  axis(id) { return Content.mergeAxis(id); },
  mergeEx(id) {
    const def = DEF_EX[id], added = Store.addedEx[id];
    if (!def && !added) return null;
    let e;
    if (def) { const ov = Store.contentEx[id]; e = Object.assign({}, def, ov || {}, { id, _modified: !!ov, _added: false }); }
    else e = Object.assign({ format: 'text', mode: 'individual', steps: [] }, added, { id, _added: true, _modified: false });
    e.steps = arr(e.steps); e.items = arr(e.items).map(it => Object.assign({}, it, it.options ? { options: arr(it.options) } : {}));
    if (FORMAT_MODE[e.format]) e.mode = FORMAT_MODE[e.format];
    e._hidden = Content.isHidden(id);
    return e;
  },
  ex(id) { return Content.mergeEx(id); },
  exIdsOf(axisId) {
    const def = DEF_AXIS[axisId] ? DEF_AXIS[axisId].exercises.map(e => e.id) : [];
    const added = Object.keys(Store.addedEx || {}).filter(k => Store.addedEx[k].axis === axisId).sort((x, y) => (Store.addedEx[x].ts || 0) - (Store.addedEx[y].ts || 0));
    return def.concat(added);
  },
  exercisesOf(axisId, o = {}) { return Content.exIdsOf(axisId).map(Content.mergeEx).filter(e => e && (o.all || !e._hidden)); },
  activities(o = {}) {
    const ids = COURSE.activities.map(a => a.id).concat(Object.keys(Store.addedEx || {}).filter(k => Store.addedEx[k].kind === 'activity').sort((x, y) => (Store.addedEx[x].ts || 0) - (Store.addedEx[y].ts || 0)));
    return ids.map(Content.mergeEx).filter(e => e && (o.all || !e._hidden));
  },
  survey(o = {}) { const s = Content.mergeEx(SURVEY_ID); return (o.all || !s._hidden) ? s : null; },
  axisOfEx(id) { const e = DEF_EX[id]; if (e && e.axis) return e.axis; const a = Store.addedEx[id]; return a && a.axis ? a.axis : null; },
  allExercises() { // كل التمارين في مكان واحد (للتصدير والإشعارات)
    const list = [];
    Content.axes({ all: true }).forEach(a => Content.exercisesOf(a.id, { all: true }).forEach(e => list.push({ e, a, section: a.title })));
    Content.activities({ all: true }).forEach(e => list.push({ e, a: null, section: 'أنشطة' }));
    list.push({ e: Content.survey({ all: true }), a: null, section: 'ختام البرنامج' });
    return list;
  },
  exTitle(id) { const e = Content.ex(id); return e ? e.title : id; }
};

// ---------- المجموعات ----------
const Groups = {
  count() { const n = parseInt(Store.groupCount, 10); return isFinite(n) && n >= 2 ? Math.min(30, n) : DEFAULT_GROUPS; },
  list() { const out = []; for (let i = 1; i <= Groups.count(); i++) out.push(i); return out; },
  label(n) { const nm = Store.groupNames && Store.groupNames[n]; return nm ? 'مجموعة ' + n + ' · ' + nm : 'مجموعة ' + n; },
  assignedOf(uid) { const v = Store.assign && Store.assign[uid]; return v ? +v : null; },
  membersOf(n) { return Object.keys(Store.assign || {}).filter(u => +Store.assign[u] === +n); },
  anyAssign() { return Object.keys(Store.assign || {}).length > 0; }
};

// ---------- الهوية المحلية (طبقات حفظ متعددة) ----------
const Me = {
  data: null, guest: false,
  load() {
    const tryParse = s => { try { const o = JSON.parse(s); return o && o.uid ? o : null; } catch (e) { return null; } };
    let d = tryParse(SafeLS.get('mc_me')) || tryParse(SafeSS.get('mc_me')) || tryParse(Cookie.get('mc_me'));
    const hp = getHashParams();
    if (!d && hp.u) d = { uid: hp.u, name: '', role: '', ts: 0, _fromHash: true };
    Me.data = d;
    Me.guest = !d && (SafeLS.get('mc_guest') === '1' || SafeSS.get('mc_guest') === '1');
    if (d && !d._fromHash) Me.save(d);
    return d;
  },
  save(d) {
    Me.data = d; Me.guest = false; const s = JSON.stringify(d);
    SafeLS.set('mc_me', s); SafeSS.set('mc_me', s); Cookie.set('mc_me', s);
    SafeLS.del('mc_guest'); SafeSS.del('mc_guest');
    Router.syncHash();
  },
  clear() {
    Me.data = null; Me.guest = false;
    SafeLS.del('mc_me'); SafeSS.del('mc_me'); Cookie.del('mc_me'); SafeLS.del('mc_guest'); SafeSS.del('mc_guest');
    Router.syncHash();
  },
  setGuest() { Me.data = null; Me.guest = true; SafeLS.set('mc_guest', '1'); SafeSS.set('mc_guest', '1'); },
  uid() { return Me.data ? Me.data.uid : null; },
  isReg() { return !!(Me.data && Me.data.uid); },
  group() { return Me.data && Me.data.group ? +Me.data.group : null; },
  setGroup(n) { if (!Me.data) return; Me.data.group = n; Me.save(Me.data); DB.set('users/' + Me.data.uid + '/group', n); }
};

// ---------- الإنجاز والأوسمة ----------
const Progress = {
  exDone(e, uid) {
    const ps = Store.posts[e.id]; if (!ps || !uid) return false;
    if (e.mode === 'group') return Object.keys(ps).some(k => ps[k] && ps[k].members && ps[k].members[uid]);
    if (e.format === 'mcq') { const a = ansList(ps[uid] && ps[uid].answers, e.items.length); return !!ps[uid] && a.every(v => v !== null && v !== ''); }
    return !!ps[uid];
  },
  // يستثني تمامًا: المحاور المخفية، المحاور المعطلة، والتمارين المخفية
  forUser(uid) {
    const axes = Content.eligibleAxes().map(a => {
      const exs = Content.exercisesOf(a.id); const done = exs.filter(e => Progress.exDone(e, uid)).length;
      return { a, total: exs.length, done, pct: exs.length ? done / exs.length : 0 };
    });
    const total = axes.reduce((s, x) => s + x.total, 0), done = axes.reduce((s, x) => s + x.done, 0);
    return { axes, total, done, pct: total ? done / total : 0 };
  },
  achievers() { return Object.keys(Store.users || {}).filter(u => Progress.forUser(u).pct >= BADGE_THRESHOLD).map(u => Object.assign({ uid: u }, Store.users[u])); }
};

// ---------- الإعجابات: تخزين مؤقت موحّد + دالة تبديل واحدة لكل السياقات ----------
const Likes = {
  cache: {},
  count(path, likesObj) { const c = Likes.cache[path]; const base = Object.assign({}, likesObj || {}); if (c) Object.keys(c).forEach(u => { if (c[u]) base[u] = true; else delete base[u]; }); return base; },
  toggle(path, likesObj) {
    const uid = Me.uid(); if (!uid) { UI.toast('الإعجاب متاح للمسجلين فقط'); return; }
    const cur = Likes.count(path, likesObj); const on = !cur[uid];
    Likes.cache[path] = Object.assign(Likes.cache[path] || {}, { [uid]: on });
    DB.set(path + '/likes/' + uid, on ? true : null).then(() => { delete Likes.cache[path]; });
    return on;
  },
  btn(path, likesObj) {
    const l = Likes.count(path, likesObj); const n = Object.keys(l).length; const mine = Me.uid() && l[Me.uid()];
    return '<button class="like-btn ' + (mine ? 'on' : '') + '" data-like="' + h(path) + '" ' + (Me.isReg() ? '' : 'disabled title="للمسجلين فقط"') + '>👍 <span class="num">' + n + '</span></button>';
  }
};
