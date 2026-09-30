// ---------------------------------------------------------------------
// محاكيات المحاور: محاكاة تفاعلية مصمَّمة لكل محور من محاور الدورة.
// نماذج تعليمية تقريبية تُظهر اتجاه الأثر لا أرقامًا دقيقة.
// ثلاثة قوالب: محاكي عوامل (إعدادات ← نتيجة فورية)، محاكي تصنيف (تحقّق ثم تصحيح)، ومحاكيات خاصة.
// ---------------------------------------------------------------------
const SimKit = {
  get(s, path) { const [a, b] = path.split('.'); return b ? (s[a] || {})[b] : s[a]; },
  cb(s, id, dis, path, l) { return '<label class="sim-cb"><input type="checkbox" data-sim-f="' + path + '" data-ex="' + h(id) + '" ' + (SimKit.get(s, path) ? 'checked' : '') + ' ' + dis + '> ' + l + '</label>'; },
  seg(s, id, dis, path, opts) { const v = String(SimKit.get(s, path)); return '<div class="sim-seg">' + opts.map(([k, l]) => '<label class="' + (v === k ? 'on' : '') + '"><input type="radio" name="' + h(id + '-' + path) + '" data-sim-f="' + path + '" data-ex="' + h(id) + '" value="' + h(k) + '" ' + (v === k ? 'checked' : '') + ' ' + dis + '>' + l + '</label>').join('') + '</div>'; },
  range(s, id, dis, path, min, max, step) { return '<input type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" data-sim-f="' + path + '" data-ex="' + h(id) + '" value="' + h(SimKit.get(s, path)) + '" ' + dis + '>'; },
  out(path, v) { return '<b class="num" data-sim-out="' + path + '">' + h(v) + '</b>'; },
  field(label, inner) { return '<div class="field"><label>' + label + '</label>' + inner + '</div>'; },
  gauge(v, title, note, unit) { return '<div class="sim-score"><div class="gauge" style="--p:' + Math.max(0, Math.min(100, v)) + '"><b class="num">' + v + (unit == null ? '%' : unit) + '</b></div><div><b>' + title + '</b>' + (note ? '<div class="muted" style="font-size:13px">' + note + '</div>' : '') + '</div></div>'; },
  factors(fs) { fs = fs.filter(f => Math.abs(f.v) >= 0.1).sort((a, b) => b.v - a.v); return fs.length ? '<ul class="sim-factors">' + fs.map(f => '<li class="' + (f.v > 0 ? 'up' : 'down') + '"><span class="num">' + (f.v > 0 ? '+' : '') + (Math.round(f.v * 10) / 10) + '</span>' + h(f.t) + '</li>').join('') + '</ul>' : ''; },
  meter(label, v, max, cls) { const p = Math.max(0, Math.min(100, v / max * 100)); return '<div class="sim-meter ' + (cls || '') + '"><span>' + label + '</span><i><em style="width:' + p + '%"></em></i><b class="num">' + Math.round(v) + '</b></div>'; },
  note(t) { return '<div class="muted" style="font-size:12px">' + t + '</div>'; },
  clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
};

// قالب محاكي العوامل: كل إعداد يضيف أو يطرح من نتيجة أساسية، وتظهر المعاينة والعوامل فورًا
function factorSim(c) {
  const S = {
    def: c.def,
    factors: c.factors,
    score(s) { return SimKit.clamp(c.base + c.factors(s).reduce((t, f) => t + f.v, 0), c.min == null ? 5 : c.min, c.max == null ? 95 : c.max); },
    form: c.form,
    live(s) { const sc = S.score(s); return '<div class="sim-live">' + SimKit.gauge(sc, c.label, c.verdict ? c.verdict(sc, s) : '') + (c.mock ? c.mock(s, sc) : '') + SimKit.factors(c.factors(s)) + (c.note ? SimKit.note(c.note) : '') + '</div>'; },
    summary(s) { return c.label + ' ' + S.score(s) + '%' + (c.extra ? ' · ' + c.extra(s) : ''); },
    metric(s) { return S.score(s); }
  };
  if (c.onSet) S.onSet = c.onSet;
  return S;
}

// قالب محاكي التصنيف: يضع المتدرب كل عنصر في خانة، ثم يضغط «تحقّق» فيظهر التصحيح وتُقفل الإجابات
function classifySim(c) {
  const pts = (it, v) => v === it.k ? 1 : (it.alt && it.alt.indexOf(v) > -1 ? 0.5 : 0);
  const S = {
    hidden: true, // النتيجة والتصحيح لا يظهران للمتدرب إلا بعد أن يكشف المدرب الإجابات (s.done تُضبط وقت العرض)
    def() { return { m: {}, done: false }; },
    answered(s) { return c.items.filter((_, i) => (s.m || {})[i] != null && (s.m || {})[i] !== '').length; },
    score(s) { return Math.round(c.items.reduce((t, it, i) => t + pts(it, (s.m || {})[i]), 0) / c.items.length * 100); },
    form(s, id, dis) {
      const d = s.done ? 'disabled' : dis; const lbl = v => (c.opts.find(o => o[0] === v) || [])[1] || '';
      return (c.intro ? '<div class="sim-intro">' + c.intro + '</div>' : '') + (c.board ? c.board(s, id, d) :
        '<div class="cls-list">' + c.items.map((it, i) => { const v = (s.m || {})[i]; const p = s.done ? pts(it, v) : -1;
          return '<div class="cls-row ' + (p === 1 ? 'ok' : p === 0.5 ? 'half' : p === 0 ? 'bad' : '') + '"><div class="cls-t"><span class="num">' + (i + 1) + '</span>' + h(it.t) + '</div>' + SimKit.seg(s, id, d, 'm.' + i, c.opts) +
            (s.done ? '<div class="cls-why">' + (p === 1 ? '✅ ' : p === 0.5 ? '🟡 مقبول، والأدق: «' + h(lbl(it.k)) + '». ' : '❌ الأنسب: «' + h(lbl(it.k)) + '». ') + h(it.why || '') + '</div>' : '') + '</div>'; }).join('') + '</div>') +
        (s.done ? '<div class="status-note" style="margin-top:8px">🔓 كشف المدرب الإجابات: هذا التصحيح لإجاباتك المحفوظة.</div>' : '');
    },
    live(s) {
      const n = S.answered(s), N = c.items.length;
      const top = s.done ? SimKit.gauge(S.score(s), c.label, S.score(s) >= 80 ? 'قراءة ممتازة 👏' : S.score(s) >= 55 ? 'قريب، راجع البنود المصححة' : 'راجع التصحيح') : SimKit.gauge(Math.round(n / N * 100), 'أنجزت ' + n + ' من ' + N, 'يكشف المدرب الإجابات والتصحيح لاحقًا.');
      return '<div class="sim-live">' + top + (c.mock ? c.mock(s) : '') + (c.note ? SimKit.note(c.note) : '') + '</div>';
    },
    summary(s) { return 'أجاب على ' + S.answered(s) + ' من ' + c.items.length; },
    metric(s) { return S.score(s); }
  };
  return S;
}

// ================= المحور 1: صبر المستخدم =================
const PatienceSim = factorSim({
  base: 62, label: 'يكمل التصفح من المهتمين',
  def() { return { load: 4, popup: 'rate', price: false, size: 'next', taps: 4, text: 'long', imgs: 'one' }; },
  factors(s) {
    const f = [];
    f.push(+s.load <= 2 ? { v: 4, t: 'تحميل سريع (' + s.load + ' ث)', k: 'p' } : { v: -(+s.load - 2) * 4, t: 'انتظار التحميل ' + s.load + ' ث', k: 'p' });
    if (s.popup === 'news') f.push({ v: -6, t: 'نافذة اشتراك تقطع الطريق', k: 'p' }); else if (s.popup === 'rate') f.push({ v: -8, t: 'طلب تقييم التطبيق قبل أي تجربة', k: 'p' }); else f.push({ v: 2, t: 'لا نوافذ منبثقة', k: 'p' });
    f.push(s.price ? { v: 5, t: 'السعر النهائي واضح', k: 'm' } : { v: -8, t: 'السعر «يبدأ من…» يثير الشك', k: 'm' });
    f.push({ inline: { v: 4, t: 'المقاسات أزرار ظاهرة', k: 'p' }, drop: { v: -2, t: 'المقاس في قائمة منسدلة', k: 'p' }, next: { v: -7, t: 'المقاس لا يظهر إلا في صفحة لاحقة', k: 'm' } }[s.size]);
    f.push(+s.taps <= 2 ? { v: 3, t: 'نقرتان تكفيان للوصول إلى السلة', k: 'p' } : { v: -(+s.taps - 2) * 3, t: s.taps + ' نقرات للوصول إلى السلة', k: 'p' });
    f.push(s.text === 'bullets' ? { v: 4, t: 'نقاط مختصرة سهلة المسح', k: 'm' } : { v: -5, t: 'فقرة طويلة تتطلب قراءة', k: 'm' });
    f.push(s.imgs === 'many' ? { v: 4, t: 'صور متعددة مع تكبير', k: 'm' } : { v: -4, t: 'صورة واحدة لا تجيب عن الأسئلة', k: 'm' });
    return f;
  },
  form(s, id, d) {
    return SimKit.field('زمن تحميل صفحة المنتج: ' + SimKit.out('load', s.load) + ' ثانية', SimKit.range(s, id, d, 'load', 1, 8)) +
      SimKit.field('عند فتح التطبيق', SimKit.seg(s, id, d, 'popup', [['none', 'لا شيء'], ['news', 'نافذة اشتراك'], ['rate', 'قيّم التطبيق']])) +
      SimKit.field('اختيار المقاس', SimKit.seg(s, id, d, 'size', [['inline', 'أزرار ظاهرة'], ['drop', 'قائمة منسدلة'], ['next', 'في الصفحة التالية']])) +
      SimKit.field('عدد النقرات حتى السلة: ' + SimKit.out('taps', s.taps), SimKit.range(s, id, d, 'taps', 1, 7)) +
      SimKit.field('وصف المنتج', SimKit.seg(s, id, d, 'text', [['long', 'فقرة طويلة'], ['bullets', 'نقاط مختصرة']])) +
      SimKit.field('الصور', SimKit.seg(s, id, d, 'imgs', [['one', 'صورة واحدة'], ['many', 'عدة صور + تكبير']])) +
      SimKit.field('السعر', SimKit.cb(s, id, d, 'price', 'السعر النهائي ظاهر (شامل الضريبة)'));
  },
  mock(s, sc) {
    const fs = PatienceSim.factors(s); const m = -fs.filter(f => f.k === 'm' && f.v < 0).reduce((t, f) => t + f.v, 0), p = -fs.filter(f => f.k === 'p' && f.v < 0).reduce((t, f) => t + f.v, 0);
    const worst = fs.filter(f => f.v < 0).sort((a, b) => a.v - b.v)[0];
    return '<div class="sim-meters">' + SimKit.meter('🧠 جهد ذهني', m, 40, 'warm') + SimKit.meter('👆 جهد عملي', p, 50, 'warm') + '</div>' +
      '<div class="thought ' + (sc >= 60 ? 'ok' : '') + '">' + (worst ? '💭 «' + h(worst.t) + '… لماذا كل هذا؟»' : '💭 «سهل! لنكمل.»') + '</div>';
  },
  verdict: sc => sc >= 70 ? 'تجربة مريحة تبقي المهتمين' : sc >= 45 ? 'بعضهم يصبر، وكثيرون يغادرون' : 'الصبر ينفد سريعًا',
  note: 'كل ثانية وكل نقرة وكل سؤال بلا إجابة يستهلك من رصيد صبر المستخدم.'
});

// ================= المحور 2: من «أعجبني» إلى «اشتريت» =================
const GAP_FIXES = [
  { k: 'photos', t: 'صور أوضح ودليل مقاسات', st: 0, v: 0.06 },
  { k: 'sticky', t: 'زر «أضف للسلة» ثابت', st: 0, v: 0.03 },
  { k: 'remind', t: 'حفظ السلة وتذكير لطيف', st: 1, v: 0.10 },
  { k: 'shipEarly', t: 'إظهار الشحن في السلة', st: 1, v: 0.08 },
  { k: 'guest', t: 'الشراء كضيف', st: 2, v: 0.12 },
  { k: 'wallet', t: 'Apple Pay ومدى', st: 2, v: 0.09 },
  { k: 'ads', t: 'مضاعفة الإعلانات', st: -1, v: 0 },
  { k: 'logo', t: 'تحديث شعار التطبيق', st: -2, v: 0 }
];
const GAP_STAGES = ['شاهد المنتج', 'أضاف للسلة', 'بدأ الدفع', 'اشترى'], GAP_BASE = [0.2, 0.4, 0.45];
const GapSim = {
  def() { return { fx: {} }; },
  picked(s) { return GAP_FIXES.filter(f => (s.fx || {})[f.k]); },
  calc(s) {
    const pk = GapSim.picked(s); const r = GAP_BASE.slice(); pk.forEach(f => { if (f.st >= 0) r[f.st] += f.v; });
    const top = pk.some(f => f.k === 'ads') ? 10800 : 10000; const n = [top]; r.forEach((x, i) => n.push(Math.round(n[i] * x)));
    return { n, r, cost: pk.some(f => f.k === 'ads') ? 12000 : 0 };
  },
  onSet(s, path, val) { if (val && GapSim.picked(s).length > 3) { s.fx[path.split('.')[1]] = false; UI.toast('لديكم 3 بطاقات إصلاح فقط'); return 'rerender'; } },
  form(s, id, d) {
    const n = GapSim.picked(s).length;
    return '<div class="budget-left ' + (n === 3 ? 'done' : '') + '">بطاقات الإصلاح المستخدمة: <b class="num">' + n + '</b> من <span class="num">3</span></div><div class="fix-cards">' +
      GAP_FIXES.map(f => '<label class="fix-card"><input type="checkbox" data-sim-f="fx.' + f.k + '" data-ex="' + h(id) + '" ' + ((s.fx || {})[f.k] ? 'checked' : '') + ' ' + d + '><b>' + h(f.t) + '</b></label>').join('') + '</div>' +
      SimKit.note('ابدؤوا بتحديد أكبر تسرّب في المسار، ثم اختاروا الإصلاح الذي يعالجه.');
  },
  live(s) {
    const c = GapSim.calc(s); const mx = c.n[0]; const leaks = c.r.map((x, i) => ({ i, lost: c.n[i] - c.n[i + 1] })); const big = leaks.slice().sort((a, b) => b.lost - a.lost)[0];
    return '<div class="sim-live"><div class="kpi-grid"><div><span>مهتمون</span><b class="num">' + QAR(c.n[0]) + '</b></div><div><span>مشترون</span><b class="num">' + QAR(c.n[3]) + '</b></div><div><span>تحويل كلي</span><b class="num">' + (c.n[3] / c.n[0] * 100).toFixed(1) + '%</b></div></div>' +
      '<div class="funnel">' + c.n.map((v, i) => '<div class="fn-row"><span>' + GAP_STAGES[i] + '</span><i style="width:' + Math.max(4, v / mx * 100) + '%"></i><b class="num">' + QAR(v) + '</b></div>' + (i < 3 ? '<div class="fn-leak ' + (i === big.i ? 'big' : '') + '">↓ <span class="num">' + Math.round(c.r[i] * 100) + '%</span> يكملون · يتسرّب <span class="num">' + QAR(leaks[i].lost) + '</span>' + (i === big.i ? ' — أكبر تسرّب' : '') + '</div>' : '')).join('') + '</div>' +
      (c.cost ? '<div class="bud-score">💸 مضاعفة الإعلانات كلّفت <span class="num">12,000</span> ر.س وزادت المهتمين <span class="num">8%</span> فقط، وأدخلتهم إلى المسار نفسه المثقوب.</div>' : '') + SimKit.note('المشكلة ليست في جذب الاهتمام؛ بل في المكان الذي ينقطع فيه المسار.') + '</div>';
  },
  summary(s) { const c = GapSim.calc(s); return QAR(c.n[3]) + ' مشترٍ · ' + GapSim.picked(s).map(f => f.t).join('، '); },
  metric(s) { return GapSim.calc(s).n[3]; }, unit: '',
  best: { fx: { photos: true, guest: true, remind: true } }
};

// ================= المحور 3: صيد الاحتكاك =================
const HUNT_SPOTS = [
  { t: 'نافذة «قيّم التطبيق» فور الدخول', f: 1, why: 'تقطع المهمة قبل أن يرى المستخدم أي قيمة.' },
  { t: 'شريط إعلاني متحرك فوق الصورة', f: 1, why: 'يشتت الانتباه ويغطي جزءًا من المنتج.' },
  { t: 'صور متعددة مع تكبير', f: 0, why: 'تجيب عن أسئلة الشكل والخامة.' },
  { t: 'السعر: «يبدأ من 99 ر.س»', f: 1, why: 'غموض السعر النهائي يؤجل القرار.' },
  { t: 'تقييم 4.6 من 312 مراجعة', f: 0, why: 'دليل اجتماعي يطمئن ويختصر التفكير.' },
  { t: 'سجّل دخولك لرؤية المقاسات', f: 1, why: 'عائق قبل أن يقرر المستخدم أصلًا.' },
  { t: 'وصف طويل في كتلة واحدة', f: 1, why: 'يرفع الجهد الذهني؛ النقاط المختصرة أسهل.' },
  { t: 'التوصيل: غدًا إلى الرياض', f: 0, why: 'معلومة حاسمة في وقتها.' },
  { t: 'مقاس في قائمة منسدلة من 14 خيارًا', f: 1, why: 'نقرات إضافية وخيارات مخفية.' },
  { t: 'زر مشاركة المنتج', f: 0, why: 'عنصر ثانوي لا يعيق المسار.' },
  { t: 'أيقونات سفلية بلا تسميات', f: 1, why: 'تجبر المستخدم على التخمين.' },
  { t: 'زر «أضف للسلة» ثابت أسفل الشاشة', f: 0, why: 'يبقي الإجراء الرئيسي في متناول الإبهام.' }
];
const HuntSim = classifySim({
  label: 'دقة الصيد',
  items: HUNT_SPOTS.map(x => ({ t: x.t, k: x.f ? 'f' : 'n', why: x.why })),
  opts: [['f', '🎯 احتكاك'], ['n', '✔ ضروري/مفيد']],
  intro: 'هذه صفحة منتج حقيقية الطابع. اضغط كل عنصر تراه احتكاكًا في المعاينة، واترك العناصر الضرورية.',
  board(s, id, d) {
    return '<div class="hunt-phone">' + HUNT_SPOTS.map((x, i) => { const on = (s.m || {})[i] === 'f'; const res = s.done ? ((on ? 'f' : 'n') === (x.f ? 'f' : 'n') ? 'ok' : 'bad') : '';
      return '<label class="hs ' + res + '"><input type="checkbox" data-sim-f="hunt.' + i + '" data-ex="' + h(id) + '" ' + (on ? 'checked' : '') + ' ' + d + '><span class="num">' + (i + 1) + '</span>' + h(x.t) + (s.done ? '<em>' + (res === 'ok' ? '✅ ' : '❌ ') + (on ? 'علّمته احتكاكًا' : 'تركته') + ' — ' + (x.f ? 'احتكاك: ' : 'ضروري: ') + h(x.why) + '</em>' : '') + '</label>'; }).join('') + '</div>';
  },
  mock(s) { const n = HUNT_SPOTS.filter((_, i) => (s.m || {})[i] === 'f').length; return '<div class="bud-score">🎯 علّمت <b class="num">' + n + '</b> عنصرًا كاحتكاك.' + (s.done ? ' الاحتكاكات الفعلية: <b class="num">' + HUNT_SPOTS.filter(x => x.f).length + '</b>.' : '') + '</div>'; },
  note: 'ليس كل عنصر إضافي احتكاكًا؛ الاحتكاك هو ما يزيد الجهد دون أن يخدم القرار.'
});
HuntSim.onSet = (s, path, val) => { if (path.indexOf('hunt.') === 0) { s.m = Object.assign({}, s.m); s.m[path.split('.')[1]] = val ? 'f' : 'n'; } };
HuntSim.answered = () => HUNT_SPOTS.length;
HuntSim.def = () => ({ m: Object.fromEntries(HUNT_SPOTS.map((_, i) => [i, 'n'])), done: false });

// ================= المحور 4: توقيت الرسالة =================
const TimingSim = factorSim({
  base: 18, max: 70, min: 2, label: 'احتمال العودة وإتمام الشراء',
  def() { return { when: 'now', ch: 'sms', msg: 'generic', freq: 6, quiet: false, dest: 'home' }; },
  factors(s) {
    const f = [];
    f.push({ now: { v: -3, t: 'فورًا بعد دقيقة: يبدو مراقبة' }, hour: { v: 8, t: 'بعد ساعة: والنية ما زالت حاضرة' }, day: { v: 3, t: 'بعد يوم: ما زال مقبولًا' }, week: { v: -6, t: 'بعد 3 أيام: فاتت اللحظة' } }[s.when]);
    f.push({ push: { v: 3, t: 'إشعار داخل الجوال' }, inapp: { v: 4, t: 'رسالة داخل التطبيق عند العودة' }, email: { v: 0, t: 'بريد إلكتروني' }, sms: { v: -2, t: 'رسالة نصية تسويقية' } }[s.ch]);
    f.push({ generic: { v: -6, t: '«لدينا عروض رائعة!» رسالة عامة' }, item: { v: 5, t: 'تذكّر بالمنتج المتروك نفسه' }, itemSize: { v: 9, t: 'المنتج + «مقاسك ما زال متوفرًا»' } }[s.msg]);
    f.push(+s.freq > 3 ? { v: -(+s.freq - 3) * 2.5, t: s.freq + ' رسائل أسبوعيًا: إزعاج' } : { v: 2, t: 'تكرار معتدل (' + s.freq + ' أسبوعيًا)' });
    f.push(s.quiet ? { v: 3, t: 'تحترم ساعات الراحة' } : { v: -6, t: 'قد تصل في الثانية فجرًا' });
    f.push(s.dest === 'cart' ? { v: 6, t: 'الضغط يفتح السلة مباشرة' } : { v: -5, t: 'الضغط يفتح الصفحة الرئيسية' });
    return f;
  },
  form(s, id, d) {
    return '<div class="sim-intro">نورة أضافت عباية مقاس M إلى السلة الساعة 9 مساءً ثم خرجت. متى وكيف تذكّرها؟</div>' +
      SimKit.field('التوقيت', SimKit.seg(s, id, d, 'when', [['now', 'بعد دقيقة'], ['hour', 'بعد ساعة'], ['day', 'بعد يوم'], ['week', 'بعد 3 أيام']])) +
      SimKit.field('القناة', SimKit.seg(s, id, d, 'ch', [['push', 'إشعار'], ['inapp', 'داخل التطبيق'], ['email', 'بريد'], ['sms', 'SMS']])) +
      SimKit.field('المحتوى', SimKit.seg(s, id, d, 'msg', [['generic', 'عرض عام'], ['item', 'المنتج المتروك'], ['itemSize', 'المنتج + توفر المقاس']])) +
      SimKit.field('عدد الرسائل أسبوعيًا: ' + SimKit.out('freq', s.freq), SimKit.range(s, id, d, 'freq', 1, 10)) +
      SimKit.field('عند الضغط على الرسالة', SimKit.seg(s, id, d, 'dest', [['home', 'الرئيسية'], ['cart', 'السلة مباشرة']])) +
      SimKit.cb(s, id, d, 'quiet', 'لا ترسل بين 11 مساءً و8 صباحًا');
  },
  mock(s) {
    const txt = { generic: 'لدينا عروض رائعة بانتظارك! 🔥', item: 'عبايتك ما زالت في السلة 🛍️', itemSize: 'مقاس M من عبايتك ما زال متوفرًا — أكملي طلبك' }[s.msg];
    const tm = { now: '9:01 م', hour: '10:00 م', day: s.quiet ? '9:00 م غدًا' : '2:14 ص', week: 'بعد 3 أيام' }[s.when];
    const unsub = SimKit.clamp(2 + Math.max(0, +s.freq - 3) * 1.6 + (s.quiet ? 0 : 3) + (s.msg === 'generic' ? 3 : 0), 1, 30);
    return '<div class="lock"><div class="lock-t num">' + tm + '</div><div class="lock-n"><b>متجرك</b><span>' + h(txt) + '</span></div></div>' + SimKit.meter('🔕 احتمال إلغاء الإشعارات', unsub, 30, 'warm');
  },
  verdict: sc => sc >= 40 ? 'رسالة في لحظتها' : sc >= 20 ? 'مقبولة وتحتاج ضبطًا' : 'رسالة عشوائية التوقيت',
  note: 'الرسالة نفسها قد تنجح أو تزعج؛ الفرق في التوقيت والسياق والوجهة.'
});

// ================= المحور 5: عمق التخصيص =================
const PERS_SIG = [
  ['name', 'اسمها', 2, 0, 'نورة'], ['cat', 'الفئة التي تصفحتها', 6, 0, 'العبايات الكاجوال'], ['item', 'المنتج المتروك في السلة', 8, 0, 'عباية الكتان الرمادية'],
  ['size', 'توفر مقاسها M', 7, 0, 'مقاسك M متوفر'], ['city', 'موعد التوصيل لمدينتها', 5, 0, 'تصلك غدًا في الرياض'], ['match', 'قطعة تكمل مشترياتها السابقة', 4, 0, 'تنسجم مع الشيلة التي اشتريتِها'],
  ['views', '«شاهدتِ هذا المنتج 7 مرات»', 0, 8, 'شاهدتِه 7 مرات!'], ['hood', 'اسم حيّها بالتحديد', 0, 9, 'في حي الملقا'], ['age', 'عمرها', 0, 7, 'لمن هنّ في الثلاثين']
];
const PersSim = factorSim({
  base: 20, min: 0, max: 98, label: 'ملاءمة الرسالة',
  def() { return { sig: { name: true, views: true } }; },
  factors(s) { const g = s.sig || {}; const f = []; PERS_SIG.forEach(([k, t, rel, creep]) => { if (g[k]) { if (rel) f.push({ v: rel * 1.8, t: t }); if (creep) f.push({ v: -creep * 2.2, t: t + ' (تطفّل)' }); } }); return f; },
  form(s, id, d) {
    return '<div class="persona"><b>👤 نورة، 30 عامًا، الرياض</b><span>تصفحت العبايات الكاجوال 7 مرات · تركت عباية الكتان الرمادية مقاس M في السلة · اشترت شيلة قبل شهر · نشطة مساءً</span></div>' +
      SimKit.field('ما الإشارات التي تستخدمها في رسالتك؟', '<div class="sim-cbs col">' + PERS_SIG.map(([k, t]) => SimKit.cb(s, id, d, 'sig.' + k, h(t))).join('') + '</div>');
  },
  mock(s) {
    const g = s.sig || {}; const creep = PERS_SIG.filter(x => g[x[0]]).reduce((t, x) => t + x[3], 0);
    const parts = PERS_SIG.filter(x => g[x[0]] && x[0] !== 'name').map(x => x[4]);
    return '<div class="lock"><div class="lock-n"><b>متجرك</b><span>' + (g.name ? 'مرحبًا نورة، ' : 'مرحبًا، ') + (parts.length ? h(parts.join(' · ')) : 'لدينا منتجات جديدة قد تعجبك') + '</span></div></div>' + SimKit.meter('😬 الإحساس بالتطفّل', creep, 24, 'warm');
  },
  verdict: sc => sc >= 60 ? 'تخصيص يخدم قرارها' : sc >= 30 ? 'تخصيص سطحي' : 'اسم فقط أو تطفّل مزعج',
  note: 'التخصيص الحقيقي يستخدم ما يساعد على القرار الآن، لا كل ما نعرفه عن العميل.'
});

// ================= المحور 7: الجمال مقابل السهولة =================
const BeautySim = {
  def() { return { banner: 65, anim: 'heavy', contrast: 'low', btn: 32, labels: false, tabs: 7, colors: 6 }; },
  calc(s) {
    const aes = SimKit.clamp(40 + Math.min(+s.banner, 55) * 0.4 + { none: 0, light: 8, heavy: 12 }[s.anim] + (s.contrast === 'low' ? 8 : 2) + (s.labels ? -2 : 3) - Math.abs(+s.colors - 4) * 3, 0, 100);
    const f = [];
    f.push(+s.banner > 45 ? { v: -(+s.banner - 45) * 0.5, t: 'بانر يأخذ ' + s.banner + '% من الشاشة' } : { v: 4, t: 'البانر لا يزاحم المحتوى' });
    f.push({ none: { v: 2, t: 'بلا حركة مشتتة' }, light: { v: 1, t: 'حركة خفيفة' }, heavy: { v: -8, t: 'حركات ثقيلة تبطئ وتشتت' } }[s.anim]);
    f.push(s.contrast === 'low' ? { v: -9, t: 'نص رمادي فاتح صعب القراءة' } : { v: 6, t: 'تباين واضح للنص' });
    f.push(+s.btn < 44 ? { v: -(44 - s.btn) * 0.6, t: 'أزرار ' + s.btn + 'px أصغر من الإبهام' } : { v: 5, t: 'أزرار بحجم مريح (' + s.btn + 'px)' });
    f.push(s.labels ? { v: 6, t: 'أيقونات مع تسميات' } : { v: -6, t: 'أيقونات بلا تسميات' });
    f.push(+s.tabs > 5 ? { v: -(+s.tabs - 5) * 3, t: s.tabs + ' عناصر في القائمة السفلية' } : { v: 3, t: 'قائمة سفلية مركّزة' });
    f.push(+s.colors > 4 ? { v: -(+s.colors - 4) * 2, t: s.colors + ' ألوان متنافسة' } : { v: 2, t: 'لوحة ألوان منضبطة' });
    const usa = SimKit.clamp(58 + f.reduce((t, x) => t + x.v, 0), 5, 98);
    return { aes, usa, f, eff: Math.round(usa * 0.75 + aes * 0.25) };
  },
  form(s, id, d) {
    return SimKit.field('مساحة البانر الرئيسي: ' + SimKit.out('banner', s.banner) + '%', SimKit.range(s, id, d, 'banner', 20, 80, 5)) +
      SimKit.field('الحركة', SimKit.seg(s, id, d, 'anim', [['none', 'بلا'], ['light', 'خفيفة'], ['heavy', 'كثيفة']])) +
      SimKit.field('تباين النص', SimKit.seg(s, id, d, 'contrast', [['low', 'رمادي أنيق'], ['high', 'واضح']])) +
      SimKit.field('ارتفاع الأزرار: ' + SimKit.out('btn', s.btn) + 'px', SimKit.range(s, id, d, 'btn', 28, 56, 2)) +
      SimKit.field('عناصر القائمة السفلية: ' + SimKit.out('tabs', s.tabs), SimKit.range(s, id, d, 'tabs', 3, 8)) +
      SimKit.field('عدد الألوان: ' + SimKit.out('colors', s.colors), SimKit.range(s, id, d, 'colors', 2, 7)) +
      SimKit.cb(s, id, d, 'labels', 'إضافة تسميات تحت الأيقونات');
  },
  live(s) {
    const c = BeautySim.calc(s); const pal = ['#0093A8', '#F58220', '#00A653', '#3B4677', '#E8960C', '#D14D72', '#7B61FF'];
    const mock = '<div class="bx-phone"><div class="bx-banner ' + (s.anim === 'heavy' ? 'anim' : '') + '" style="height:' + (s.banner * 1.6) + 'px;background:linear-gradient(135deg,' + pal.slice(0, s.colors).join(',') + ')">✨ تخفيضات الموسم</div>' +
      '<div class="bx-body" style="color:' + (s.contrast === 'low' ? '#B5BCC6' : '#1C2340') + '">عباية كتان · <span class="num">249</span> ر.س</div><div class="bx-btn" style="height:' + s.btn * 0.8 + 'px">أضف للسلة</div>' +
      '<div class="bx-tabs">' + Array.from({ length: +s.tabs }).map((_, i) => '<span>' + ['🏠', '🔍', '🛍', '❤', '👤', '🎁', '📦', '⚙'][i] + (s.labels ? '<small>' + ['الرئيسية', 'بحث', 'السلة', 'المفضلة', 'حسابي', 'عروض', 'طلباتي', 'إعدادات'][i] + '</small>' : '') + '</span>').join('') + '</div></div>';
    return '<div class="sim-live">' + SimKit.gauge(c.eff, 'فعالية التصميم', 'السهولة تزن ثلاثة أضعاف الجمال') + '<div class="sim-meters">' + SimKit.meter('🎨 الجاذبية البصرية', c.aes, 100) + SimKit.meter('🧭 سهولة الاستخدام', c.usa, 100) + '</div>' + mock + SimKit.factors(c.f) + '</div>';
  },
  summary(s) { const c = BeautySim.calc(s); return 'فعالية ' + c.eff + '% · سهولة ' + c.usa + ' · جاذبية ' + c.aes; },
  metric(s) { return BeautySim.calc(s).eff; }
};

// ================= المحور 8: المعلومة في وقتها =================
const PLACE_ITEMS = [
  { t: 'السعر النهائي', k: 'top', why: 'أول ما يحتاجه القرار.' },
  { t: 'صور المنتج', k: 'top', why: 'تجيب عن الشكل قبل أي نص.' },
  { t: 'المقاسات المتوفرة', k: 'top', why: 'سؤال حاسم قبل الإضافة للسلة.' },
  { t: 'متوسط التقييم وعدد المراجعات', k: 'top', alt: ['fold'], why: 'طمأنة سريعة بسطر واحد.' },
  { t: 'موعد التوصيل المتوقع', k: 'top', alt: ['fold'], why: 'يحسم تردد «متى يصلني؟».' },
  { t: 'دليل المقاسات التفصيلي', k: 'fold', why: 'مهم لمن يحتاجه فقط، برابط قريب من المقاس.' },
  { t: 'سياسة الاسترجاع', k: 'fold', alt: ['top'], why: 'سطر مختصر ظاهر وتفاصيلها عند الطلب.' },
  { t: 'نصوص التقييمات كاملة', k: 'fold', why: 'للمتردد الذي يريد التعمق.' },
  { t: 'المواصفات الكاملة والخامة', k: 'fold', why: 'تفاصيل مفيدة لكنها ليست أول ما يُقرأ.' },
  { t: 'قصة العلامة التجارية', k: 'fold', alt: ['none'], why: 'تبني الانتماء لكنها لا تسبق القرار.' },
  { t: 'أخبار الشركة والوظائف', k: 'none', why: 'لا مكان لها في صفحة المنتج.' },
  { t: 'رمز المخزون الداخلي SKU', k: 'none', alt: ['fold'], why: 'يخدم الفريق لا العميل.' }
];
const PlaceSim = classifySim({
  label: 'دقة ترتيب المعلومات',
  items: PLACE_ITEMS, opts: [['top', '⬆ أعلى الصفحة'], ['fold', '▾ عند الحاجة'], ['none', '✕ لا حاجة']],
  intro: 'أعد بناء صفحة منتج «عباية كتان»: أين تضع كل معلومة؟ راقب شكل الصفحة يتغير في المعاينة.',
  mock(s) {
    const m = s.m || {}; const at = k => PLACE_ITEMS.map((x, i) => [x, i]).filter(([, i]) => m[i] === k);
    return '<div class="pl-mock"><div class="pl-top">' + (at('top').map(([x]) => '<span>' + h(x.t) + '</span>').join('') || '<em>أعلى الصفحة فارغ</em>') + '<div class="pp-btn">أضف للسلة</div></div>' +
      (at('fold').length ? '<div class="pl-fold">' + at('fold').map(([x]) => '<div>▾ ' + h(x.t) + '</div>').join('') + '</div>' : '') + (at('top').length > 6 ? '<div class="co-block warn">⚠️ أعلى الصفحة مزدحم: ' + at('top').length + ' عناصر قبل زر الشراء</div>' : '') + '</div>';
  },
  note: 'المعلومة الصحيحة في المكان الخطأ تتحول إلى ضجيج.'
});

// ================= المحور 9: أقصر طريق إلى الشراء =================
const PATH_STEPS = [
  ['splash', 'شاشة ترحيب', 0], ['login', 'تسجيل دخول إجباري', 0], ['tour', 'جولة تعريفية (4 شاشات)', 0], ['home', 'الصفحة الرئيسية', 2],
  ['cat', 'قائمة الفئات', 1], ['sub', 'فئة فرعية', 0], ['pdp', 'صفحة المنتج', 2], ['sizePop', 'نافذة اختيار المقاس', 0],
  ['cart', 'السلة', 2], ['upsell', 'صفحة عروض قبل الدفع', 0], ['pay', 'الدفع', 2]
];
const PathSim = {
  def() { const k = {}; PATH_STEPS.forEach(([x]) => { k[x] = true; }); return { keep: k, search: false }; },
  calc(s) {
    const k = s.keep || {}; const missing = PATH_STEPS.filter(x => x[2] === 2 && !k[x[0]]).map(x => x[1]);
    let taps = PATH_STEPS.filter(x => k[x[0]]).reduce((t, x) => t + (x[0] === 'tour' ? 4 : 1), 0); if (s.search) taps += 1 - (k.cat ? 1 : 0) - (k.sub ? 1 : 0);
    const extra = Math.max(0, taps - 5); const comp = missing.length ? 0 : SimKit.clamp(78 - extra * 4.5 + (s.search ? 3 : 0) - (k.login ? 8 : 0), 5, 90);
    return { taps, secs: taps * 6, comp, missing };
  },
  form(s, id, d) {
    return '<div class="sim-intro">هذا هو المسار الحالي من فتح التطبيق حتى الدفع. احذف ما لا يلزم، واحتفظ بما لا يتم الشراء بدونه.</div><div class="sim-cbs col">' +
      PATH_STEPS.map(([k, t]) => SimKit.cb(s, id, d, 'keep.' + k, h(t))).join('') + '</div>' + SimKit.field('اختصار', SimKit.cb(s, id, d, 'search', 'بحث بارز يوصل مباشرة إلى المنتج'));
  },
  live(s) {
    const c = PathSim.calc(s); const k = s.keep || {};
    const chain = []; let searched = false;
    PATH_STEPS.forEach(x => { if (s.search && (x[0] === 'cat' || x[0] === 'sub' || (x[0] === 'pdp' && !searched))) { if (!searched) { chain.push('<span class="must">🔍 بحث</span>'); searched = true; } if (x[0] !== 'pdp') return; } if (k[x[0]]) chain.push('<span class="' + (x[2] === 2 ? 'must' : '') + '">' + h(x[1]) + '</span>'); });
    return '<div class="sim-live">' + (c.missing.length ? '<div class="co-block warn">⛔ لا يمكن الشراء بدون: ' + h(c.missing.join('، ')) + '</div>' : '') + SimKit.gauge(c.comp, 'يصل إلى الدفع ويكمل', 'التحويل المتوقع لمن بدأ الرحلة') +
      '<div class="kpi-grid"><div><span>النقرات</span><b class="num">' + c.taps + '</b></div><div><span>الوقت التقريبي</span><b class="num">' + c.secs + ' ث</b></div><div><span>الخطوات</span><b class="num">' + chain.length + '</b></div></div>' +
      '<div class="path-chain">' + chain.join('<i>←</i>') + '</div>' + SimKit.note('كل خطوة لا تخدم القرار تكلّف نسبة من المستخدمين. التسجيل يمكن تأجيله إلى ما بعد الشراء.') + '</div>';
  },
  summary(s) { const c = PathSim.calc(s); return 'إتمام ' + c.comp + '% · ' + c.taps + ' نقرة'; },
  metric(s) { return PathSim.calc(s).comp; }
};

// ================= المحور 11: مختبر الثقة =================
const TRUST_ITEMS = [
  ['total', 'المجموع شامل الضريبة والشحن', 8], ['logos', 'شعارات مدى وApple Pay والدفع الآمن', 5], ['returns', 'سياسة الاسترجاع بجانب زر الدفع', 6],
  ['reviews', 'تقييمات بصور عملاء حقيقيين', 7], ['contact', 'تواصل واتساب ظاهر', 4], ['verified', 'توثيق المتجر (المركز السعودي للأعمال)', 5], ['eta', 'تاريخ توصيل متوقع', 5],
  ['timer', 'عدّاد تنازلي «ينتهي العرض خلال 04:59»', -8], ['prechecked', 'تغليف هدية وتأمين محددان مسبقًا', -9], ['lateFee', 'رسوم خدمة تظهر في الخطوة الأخيرة', -12], ['perms', 'طلب الوصول إلى جهات الاتصال', -6]
];
const TrustSim = factorSim({
  base: 45, label: 'مستوى الطمأنينة',
  def() { return { t: { logos: true, timer: true, prechecked: true, lateFee: true } }; },
  factors(s) { const g = s.t || {}; return TRUST_ITEMS.filter(x => g[x[0]]).map(x => ({ v: x[2], t: x[1] })); },
  form(s, id, d) {
    return SimKit.field('✅ إشارات تطمئن', '<div class="sim-cbs col">' + TRUST_ITEMS.filter(x => x[2] > 0).map(x => SimKit.cb(s, id, d, 't.' + x[0], h(x[1]))).join('') + '</div>') +
      SimKit.field('⚠️ ممارسات موجودة حاليًا (أزلها إن كانت تضر)', '<div class="sim-cbs col">' + TRUST_ITEMS.filter(x => x[2] < 0).map(x => SimKit.cb(s, id, d, 't.' + x[0], h(x[1]))).join('') + '</div>');
  },
  mock(s) {
    const g = s.t || {};
    return '<div class="co-mock">' + (g.timer ? '<div class="co-block warn">⏰ ينتهي العرض خلال <span class="num">04:59</span></div>' : '') + '<div class="co-block">🧾 المجموع: <b class="num">' + (g.lateFee ? '249' : '276') + '</b> ر.س' + (g.total ? ' شامل الضريبة والشحن' : '') + '</div>' +
      (g.prechecked ? '<div class="co-block warn">☑ تغليف هدية +15 · ☑ تأمين +9</div>' : '') + (g.lateFee ? '<div class="co-block warn">+ رسوم خدمة <span class="num">27</span> ر.س (ظهرت الآن)</div>' : '') +
      (g.eta ? '<div class="co-note">🚚 يصلك الخميس 2 أكتوبر</div>' : '') + (g.logos ? '<div class="co-pay"><span>مدى</span><span>Apple Pay</span><span>🔒 آمن</span></div>' : '') + '<div class="co-btn">ادفع الآن</div>' +
      (g.returns ? '<div class="co-note">↩ استرجاع مجاني خلال 14 يومًا</div>' : '') + (g.reviews ? '<div class="co-note">⭐ 4.7 · صور من عملاء حقيقيين</div>' : '') + (g.contact ? '<div class="co-note">💬 تواصل معنا واتساب</div>' : '') + (g.verified ? '<div class="co-note">✔ متجر موثّق</div>' : '') + (g.perms ? '<div class="co-pop">📇 التطبيق يطلب الوصول إلى جهات الاتصال</div>' : '') + '</div>';
  },
  verdict: sc => sc >= 75 ? 'يدفع وهو مطمئن' : sc >= 45 ? 'متردد ويبحث عن ضمانات' : 'يشعر بأنه مستدرَج',
  note: 'الثقة تُبنى بإشارات صادقة، وتنهار بمفاجأة واحدة أو ضغط مصطنع.'
});

// ================= المحور 12: آخر عشر ثوانٍ =================
const LastSim = factorSim({
  base: 64, label: 'يكمل الدفع حتى التأكيد',
  def() { return { btn: 'same', otp: 'manual', timeout: 'short', err: 'vague', fee: true, confirm: 'bare', msg: false, spinner: true }; },
  factors(s) {
    const f = [];
    f.push(s.btn === 'lock' ? { v: 6, t: 'الزر يتحول إلى «جارٍ الدفع…» ويُقفل' } : { v: -9, t: 'الزر لا يتغير: خوف من الدفع مرتين' });
    f.push(s.otp === 'auto' ? { v: 4, t: 'تعبئة رمز التحقق تلقائيًا' } : { v: -4, t: 'نسخ رمز التحقق يدويًا من الرسائل' });
    f.push(s.timeout === 'long' ? { v: 2, t: 'مهلة كافية للجلسة' } : { v: -6, t: 'انتهاء الجلسة بعد دقيقتين' });
    f.push(s.err === 'clear' ? { v: 8, t: 'رفض البطاقة: سبب واضح + بديل دفع + السلة محفوظة' } : { v: -9, t: 'رسالة «حدث خطأ» فقط' });
    if (s.fee) f.push({ v: -12, t: 'رسوم إضافية تظهر في الخطوة الأخيرة' });
    if (s.spinner) f.push({ v: -6, t: 'تحميل أكثر من 5 ثوانٍ بلا أي رسالة' });
    f.push(s.confirm === 'full' ? { v: 5, t: 'تأكيد برقم الطلب وموعد التوصيل والتتبع' } : { v: -3, t: 'صفحة «تم» فقط' });
    if (s.msg) f.push({ v: 3, t: 'رسالة تأكيد عبر واتساب أو البريد' });
    return f;
  },
  form(s, id, d) {
    return SimKit.field('بعد الضغط على «ادفع»', SimKit.seg(s, id, d, 'btn', [['same', 'الزر كما هو'], ['lock', '«جارٍ الدفع…» ومقفل']])) +
      SimKit.field('رمز التحقق OTP', SimKit.seg(s, id, d, 'otp', [['manual', 'يدوي'], ['auto', 'تعبئة تلقائية']])) +
      SimKit.field('مهلة الجلسة', SimKit.seg(s, id, d, 'timeout', [['short', 'دقيقتان'], ['long', '10 دقائق']])) +
      SimKit.field('إذا رُفضت البطاقة', SimKit.seg(s, id, d, 'err', [['vague', '«حدث خطأ»'], ['clear', 'سبب + بديل + السلة محفوظة']])) +
      SimKit.field('صفحة ما بعد الدفع', SimKit.seg(s, id, d, 'confirm', [['bare', '«تم» فقط'], ['full', 'رقم الطلب + الموعد + التتبع']])) +
      '<div class="sim-cbs col">' + SimKit.cb(s, id, d, 'fee', 'رسوم خدمة تظهر في الخطوة الأخيرة') + SimKit.cb(s, id, d, 'spinner', 'تحميل طويل بلا رسالة') + SimKit.cb(s, id, d, 'msg', 'إرسال تأكيد عبر واتساب/البريد') + '</div>';
  },
  mock(s) {
    const ev = [[1, s.fee ? '😳 رسوم جديدة؟' : '🧾 المجموع كما توقعت', !s.fee], [3, s.btn === 'lock' ? '⏳ جارٍ الدفع…' : '🤔 هل ضغطت؟ أضغط مجددًا؟', s.btn === 'lock'], [5, s.otp === 'auto' ? '🔑 الرمز تعبّأ' : '📋 أبحث عن الرمز…', s.otp === 'auto'], [7, s.spinner ? '🌀 تحميل… هل عُلّق؟' : '✔ تمت المعالجة', !s.spinner], [9, s.confirm === 'full' ? '📦 طلب #48213 يصل الخميس' : '❓ «تم»… تم ماذا؟', s.confirm === 'full']];
    return '<div class="tl10">' + ev.map(([t, l, ok]) => '<div class="' + (ok ? 'ok' : 'bad') + '"><b class="num">' + t + 'ث</b><span>' + l + '</span></div>').join('') + '</div>';
  },
  verdict: sc => sc >= 75 ? 'ثوانٍ واثقة حتى التأكيد' : sc >= 50 ? 'بعضهم ينسحب قبل التأكيد' : 'الخوف يغلب في اللحظة الأخيرة',
  note: 'في الثواني الأخيرة يكون المستخدم أكثر حساسية لأي غموض يمس ماله.'
});

// ================= المحور 13: لوحة المؤشرات =================
const KPI_OPTS = [
  ['conv', 'معدل التحويل من الزيارة إلى الشراء', 1], ['cartAb', 'معدل التخلي عن السلة', 1], ['payDone', 'معدل إتمام الدفع', 1], ['aov', 'متوسط قيمة الطلب', 1], ['ret', 'نسبة العملاء العائدين', 1], ['device', 'التحويل حسب نوع الجهاز', 1],
  ['downloads', 'إجمالي التنزيلات منذ الإطلاق', 0], ['followers', 'عدد المتابعين في المنصات', 0], ['pushViews', 'مرات مشاهدة الإشعارات', 0], ['visits', 'إجمالي الزيارات دون تقسيم', 0], ['likes', 'عدد الإعجابات', 0], ['skus', 'عدد المنتجات في المتجر', 0]
];
const KPI_VALS = { conv: ['1.8%', '▼ 0.6'], cartAb: ['74%', '▲ 9'], payDone: ['51%', '▼ 14'], aov: ['212 ر.س', '▲ 3'], ret: ['28%', '— 0'], device: ['أندرويد 1.1% · iOS 2.6%', '▼ أندرويد'], downloads: ['184,000', '▲'], followers: ['52,300', '▲'], pushViews: ['410,000', '▲'], visits: ['96,000', '▲ 2'], likes: ['8,900', '▲'], skus: ['1,240', '—'] };
const KpiSim = factorSim({
  base: 0, min: 0, max: 100, label: 'جودة لوحة التشخيص',
  def() { return { k: { downloads: true, followers: true, visits: true }, split: 'none', period: 'day' }; },
  factors(s) {
    const g = s.k || {}; const f = KPI_OPTS.filter(x => g[x[0]]).map(x => x[2] ? { v: 14, t: x[1] } : { v: -10, t: x[1] + ' (مؤشر مظهري)' });
    f.push(s.split === 'none' ? { v: -5, t: 'بلا تقسيم' } : { v: 15, t: 'تقسيم حسب ' + (s.split === 'device' ? 'الجهاز' : 'العميل الجديد والعائد') });
    f.push(s.period === 'day' ? { v: -5, t: 'مقارنة اليوم بالأمس (تذبذب طبيعي)' } : { v: 15, t: 'مقارنة الفترة بمثيلتها السابقة' });
    return f;
  },
  onSet(s, path, val) { if (val && path.indexOf('k.') === 0 && Object.keys(s.k).filter(k => s.k[k]).length > 5) { s.k[path.split('.')[1]] = false; UI.toast('اللوحة تتسع لخمسة مؤشرات فقط'); return 'rerender'; } },
  form(s, id, d) {
    const n = Object.keys(s.k || {}).filter(k => s.k[k]).length;
    return '<div class="sim-intro">المبيعات انخفضت 18% هذا الشهر، والمدير يطلب لوحة من <b>5 مؤشرات فقط</b> تكشف السبب.</div><div class="budget-left ' + (n === 5 ? 'done' : '') + '">المؤشرات المختارة: <b class="num">' + n + '</b> من <span class="num">5</span></div>' +
      '<div class="sim-cbs col">' + KPI_OPTS.map(x => SimKit.cb(s, id, d, 'k.' + x[0], h(x[1]))).join('') + '</div>' +
      SimKit.field('التقسيم', SimKit.seg(s, id, d, 'split', [['none', 'بلا'], ['device', 'حسب الجهاز'], ['cust', 'جديد/عائد']])) + SimKit.field('المقارنة', SimKit.seg(s, id, d, 'period', [['day', 'اليوم بالأمس'], ['month', 'الشهر بالشهر السابق']]));
  },
  mock(s) { const g = s.k || {}; const sel = KPI_OPTS.filter(x => g[x[0]]); return '<div class="kpi-grid">' + (sel.length ? sel.map(x => '<div><span>' + h(x[1]) + '</span><b class="num ' + (/▼/.test(KPI_VALS[x[0]][1]) ? 'neg' : '') + '">' + h(KPI_VALS[x[0]][0]) + '</b><small class="num">' + h(KPI_VALS[x[0]][1]) + '</small></div>').join('') : '<div><span>اختر مؤشرات</span></div>') + '</div>'; },
  verdict: sc => sc >= 80 ? 'لوحة تكشف أين انكسر المسار' : sc >= 45 ? 'بعض المؤشرات مفيدة وبعضها ضجيج' : 'أرقام كبيرة لا تفسّر شيئًا',
  note: 'المؤشر المفيد يرتبط بقرار: إذا تغيّر، تعرف ماذا تفعل.'
});

// ================= المحور 14: رادار الانحرافات =================
const RADAR = (() => { // 30 يومًا ببيانات ثابتة: عطلة الجمعة والسبت تخفض الزيارات، وعطل في أندرويد يخفض التحويل في الأيام 22–24
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const seg = { android: [5200, 0.026], ios: [3800, 0.031], web: [1500, 0.018] }; const days = [];
  for (let d = 0; d < 30; d++) { const wk = d % 7 >= 5 ? 0.75 : 1; const o = {}; Object.keys(seg).forEach(k => { const ses = Math.round(seg[k][0] * wk * (0.96 + rnd() * 0.08)); const cr = seg[k][1] * (0.95 + rnd() * 0.1) * (k === 'android' && d >= 22 && d <= 24 ? 0.45 : 1); o[k] = { ses, ord: Math.round(ses * cr) }; }); days.push(o); }
  return days;
})();
const RadarSim = {
  def() { return { metric: 'ses', seg: 'all', base: 'avg7', thr: 10 }; },
  series(s) { return RADAR.map(o => { const ks = s.seg === 'all' ? Object.keys(o) : [s.seg]; const ses = ks.reduce((t, k) => t + o[k].ses, 0), ord = ks.reduce((t, k) => t + o[k].ord, 0); return s.metric === 'ses' ? ses : ord / ses * 100; }); },
  calc(s) {
    const v = RadarSim.series(s); const alerts = [];
    const base = v.map((x, d) => d < 7 ? null : s.base === 'avg7' ? v.slice(d - 7, d).reduce((a, b) => a + b, 0) / 7 : v[d - 7]);
    v.forEach((x, d) => { if (base[d] != null && Math.abs(x - base[d]) / base[d] * 100 > +s.thr) alerts.push(d); });
    const truth = alerts.filter(d => d >= 22 && d <= 24).length, echo = s.base === 'wk' ? alerts.filter(d => d >= 29).length : 0, fa = alerts.length - truth - echo;
    const score = (truth ? 40 : 0) + (truth && s.seg === 'android' ? 25 : 0) + (truth ? Math.max(0, 25 - fa * 6) : 0) + (s.base === 'wk' ? 10 : 0);
    return { v, base, alerts, truth, echo, fa, score };
  },
  form(s, id, d) {
    return '<div class="sim-intro">لديك بيانات 30 يومًا. اضبط الرادار ليلتقط المشكلة الحقيقية دون إنذارات كاذبة، ثم اعزلها في شريحتها.</div>' +
      SimKit.field('المؤشر المراقَب', SimKit.seg(s, id, d, 'metric', [['ses', 'الزيارات'], ['cr', 'معدل التحويل']])) +
      SimKit.field('الشريحة', SimKit.seg(s, id, d, 'seg', [['all', 'الكل'], ['android', 'أندرويد'], ['ios', 'iOS'], ['web', 'الويب']])) +
      SimKit.field('المقارنة مع', SimKit.seg(s, id, d, 'base', [['avg7', 'متوسط آخر 7 أيام'], ['wk', 'اليوم نفسه من الأسبوع الماضي']])) +
      SimKit.field('حد الإنذار: انحراف أكبر من ' + SimKit.out('thr', s.thr) + '%', SimKit.range(s, id, d, 'thr', 5, 50));
  },
  live(s) {
    const c = RadarSim.calc(s); const W = 520, H = 170, P = 26; const all = c.v.concat(c.base.filter(x => x != null)); const mn = Math.min(...all) * 0.9, mx = Math.max(...all) * 1.05;
    const X = d => P + d * (W - 2 * P) / 29, Y = v => H - 18 - (v - mn) / (mx - mn) * (H - 34);
    const line = c.v.map((v, d) => (d ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const bl = c.base.map((v, d) => v == null ? '' : (d === 7 ? 'M' : 'L') + X(d).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar-svg" direction="ltr">' + [5, 6, 12, 13, 19, 20, 26, 27].map(d => '<rect x="' + (X(d) - 7) + '" y="4" width="14" height="' + (H - 22) + '" fill="#F2F4F6"/>').join('') +
      '<path d="' + bl + '" fill="none" stroke="#9AA3B2" stroke-dasharray="4 4" stroke-width="1.5"/><path d="' + line + '" fill="none" stroke="var(--ac)" stroke-width="2.5"/>' +
      c.alerts.map(d => '<circle cx="' + X(d) + '" cy="' + Y(c.v[d]) + '" r="6" fill="' + (d >= 22 && d <= 24 ? '#E0413A' : s.base === 'wk' && d >= 29 ? '#9AA3B2' : '#FAB20B') + '" stroke="#fff" stroke-width="2"/>').join('') +
      [0, 7, 14, 21, 29].map(d => '<text x="' + X(d) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="11" fill="#7D879C" font-family="' + "IBM Plex Sans Arabic, sans-serif" + '">' + (d + 1) + '</text>').join('') + '</svg>';
    return '<div class="sim-live">' + SimKit.gauge(c.score, 'دقة الرادار', c.truth ? (s.seg === 'android' ? '🎯 التقطت المشكلة وعزلتها' : 'التقطت إشارة؛ اعزل الشريحة المسببة') : 'لم تلتقط المشكلة بعد') +
      '<div class="kpi-grid"><div><span>إنذارات</span><b class="num">' + c.alerts.length + '</b></div><div><span>في أيام المشكلة</span><b class="num">' + c.truth + '</b></div><div><span>إنذارات كاذبة</span><b class="num ' + (c.fa ? 'neg' : '') + '">' + c.fa + '</b></div></div>' + svg +
      SimKit.note('الأعمدة الرمادية: عطلة نهاية الأسبوع. الخط المتقطع: خط المقارنة. 🔴 إنذار في أيام المشكلة، 🟡 إنذار كاذب' + (c.echo ? '، ⚪ صدى: ارتفاع ظاهري لأن يوم المقارنة نفسه كان يوم المشكلة' : '') + '.') + '</div>';
  },
  summary(s) { const c = RadarSim.calc(s); return 'دقة ' + c.score + '% · ' + c.alerts.length + ' إنذار (' + c.fa + ' كاذب)'; },
  metric(s) { return RadarSim.calc(s).score; }
};

// ================= المحور 15: مدير التحسين =================
const IMP_LIST = [
  ['bug', 'إصلاح عطل الدفع في أندرويد', 2, 0.30, 0.9], ['guest', 'الشراء كضيف', 3, 0.22, 0.8], ['ship', 'إظهار الشحن في السلة', 2, 0.15, 0.8], ['search', 'تحسين نتائج البحث', 5, 0.18, 0.6],
  ['redesign', 'إعادة تصميم التطبيق بالكامل', 8, 0.45, 0.25], ['reviews', 'تقييمات بالصور', 3, 0.10, 0.7], ['dark', 'الوضع الداكن', 3, 0.02, 0.9], ['loyal', 'برنامج نقاط الولاء', 6, 0.12, 0.5]
];
const IMP_CAP = 8, IMP_SES = 100000, IMP_BASE = 2.0;
const ImproveSim = {
  def() { return { a: {} }; },
  load(s, k) { return IMP_LIST.filter(x => +(s.a || {})[x[0]] === k).reduce((t, x) => t + x[2], 0); },
  calc(s) {
    const a = s.a || {}; const months = [1, 2, 3, 4].map(m => { const lift = IMP_LIST.filter(x => +a[x[0]] && +a[x[0]] < m).reduce((t, x) => t + x[3] * x[4], 0); return IMP_SES * (IMP_BASE + lift) / 100; });
    const extra = Math.round(months.reduce((t, v) => t + v - IMP_SES * IMP_BASE / 100, 0)); return { months, extra, conv: IMP_BASE + IMP_LIST.filter(x => +a[x[0]]).reduce((t, x) => t + x[3] * x[4], 0) };
  },
  onSet(s, path, val) { const k = path.split('.')[1]; if (+val && ImproveSim.load(s, +val) > IMP_CAP) { s.a[k] = '0'; UI.toast('سعة الدورة ' + IMP_CAP + ' نقاط جهد فقط'); } return 'rerender'; },
  form(s, id, d) {
    return '<div class="sim-intro">لديكم 3 دورات تحسين، في كل دورة <b class="num">' + IMP_CAP + '</b> نقاط جهد. وزّعوا التحسينات: الأثر × الثقة ÷ الجهد.</div><div class="sprint-cap">' + [1, 2, 3].map(k => '<span class="' + (ImproveSim.load(s, k) === IMP_CAP ? 'full' : '') + '">الدورة ' + k + ': <b class="num">' + ImproveSim.load(s, k) + '/' + IMP_CAP + '</b></span>').join('') + '</div>' +
      '<div class="imp-list">' + IMP_LIST.map(x => '<div class="imp-row"><div><b>' + h(x[1]) + '</b><small>جهد <span class="num">' + x[2] + '</span> · أثر متوقع <span class="num">+' + x[3] + '</span> نقطة · ثقة <span class="num">' + Math.round(x[4] * 100) + '%</span></small></div>' + SimKit.seg(s, id, d, 'a.' + x[0], [['0', '—'], ['1', '1'], ['2', '2'], ['3', '3']]) + '</div>').join('') + '</div>';
  },
  live(s) {
    const c = ImproveSim.calc(s); const mx = Math.max(...c.months, IMP_SES * 3.2 / 100);
    return '<div class="sim-live"><div class="kpi-grid"><div><span>طلبات إضافية في 4 أشهر</span><b class="num">' + QAR(c.extra) + '</b></div><div><span>التحويل النهائي</span><b class="num">' + c.conv.toFixed(2) + '%</b></div><div><span>البداية</span><b class="num">' + IMP_BASE.toFixed(1) + '%</b></div></div>' +
      '<div class="bud-bars">' + c.months.map((v, i) => '<div class="bud-bar"><span>الشهر ' + (i + 1) + '</span><i style="width:' + (v / mx * 100) + '%"></i><b class="num">' + QAR(v) + '</b></div>').join('') + '</div>' +
      SimKit.note('التحسين المنجز في الدورة 1 يبدأ أثره من الشهر 2. المكاسب السريعة المبكرة تتراكم أطول.') + '</div>';
  },
  summary(s) { const c = ImproveSim.calc(s); return QAR(c.extra) + ' طلب إضافي · تحويل ' + c.conv.toFixed(2) + '%'; },
  metric(s) { return ImproveSim.calc(s).extra; }, unit: ''
};

// ================= المحور 16: الإنسان والآلة =================
const AiSim = classifySim({
  label: 'حكمة توزيع المهام',
  items: [
    { t: 'كتابة مسودات أوصاف 500 منتج', k: 'mix', alt: ['ai'], why: 'سرعة الآلة مع مراجعة بشرية للدقة والنبرة.' },
    { t: 'تلخيص آلاف التقييمات إلى أبرز الشكاوى', k: 'ai', alt: ['mix'], why: 'مهمة تحليل نصوص كبيرة منخفضة المخاطر.' },
    { t: 'الرد على أسئلة الشحن المتكررة', k: 'ai', alt: ['mix'], why: 'أسئلة متكررة بإجابات ثابتة، مع تحويل للإنسان عند الحاجة.' },
    { t: 'اقتراح منتجات مكملة في السلة', k: 'ai', why: 'تخصيص على نطاق واسع هو قوة الآلة.' },
    { t: 'ترجمة واجهة التطبيق', k: 'mix', why: 'الآلة تترجم، والإنسان يراجع المصطلحات والسياق.' },
    { t: 'رصد الطلبات المشبوهة بالاحتيال', k: 'mix', why: 'الآلة ترصد الأنماط، والإنسان يقرر في الحالات الحدية.' },
    { t: 'تعديل الأسعار آليًا حسب الطلب', k: 'mix', why: 'بحدود وضوابط بشرية حتى لا تضر بالثقة.' },
    { t: 'قرار استرجاع مبلغ لعميل في حالة استثنائية', k: 'human', alt: ['mix'], why: 'حكم وتقدير وتعاطف يتجاوز القواعد.' },
    { t: 'الرد على شكوى منتشرة في وسائل التواصل', k: 'human', why: 'سمعة العلامة تحتاج صوتًا بشريًا مسؤولًا.' },
    { t: 'تحديد استراتيجية المتجر للعام القادم', k: 'human', alt: ['mix'], why: 'الآلة تساعد بالتحليل، والقرار للإنسان.' }
  ],
  opts: [['ai', '🤖 الآلة'], ['mix', '🤝 الآلة + مراجعة'], ['human', '🧑 الإنسان']],
  intro: 'أنت مدير العمليات في متجر إلكتروني. لمن تسند كل مهمة؟',
  mock(s) { const m = s.m || {}; const cnt = k => Object.keys(m).filter(i => m[i] === k).length; return '<div class="sim-meters">' + SimKit.meter('🤖 الآلة وحدها', cnt('ai'), 10) + SimKit.meter('🤝 بمراجعة بشرية', cnt('mix'), 10) + SimKit.meter('🧑 الإنسان', cnt('human'), 10) + '</div>'; },
  note: 'الذكاء الاصطناعي يسرّع وينفّذ على نطاق واسع؛ والإنسان يحكم ويتحمل المسؤولية.'
});

// الحل النموذجي لكل محاكاة (يظهر للمتدربين بعد أن يكشف المدرب الإجابات)
PatienceSim.best = { load: 1, popup: 'none', price: true, size: 'inline', taps: 2, text: 'bullets', imgs: 'many' };
TimingSim.best = { when: 'hour', ch: 'inapp', msg: 'itemSize', freq: 2, quiet: true, dest: 'cart' };
PersSim.best = { sig: { name: true, cat: true, item: true, size: true, city: true, match: true } };
BeautySim.best = { banner: 40, anim: 'light', contrast: 'high', btn: 48, labels: true, tabs: 4, colors: 4 };
PathSim.best = { keep: { home: true, pdp: true, cart: true, pay: true }, search: true };
TrustSim.best = { t: { total: true, logos: true, returns: true, reviews: true, contact: true, verified: true, eta: true } };
LastSim.best = { btn: 'lock', otp: 'auto', timeout: 'long', err: 'clear', fee: false, confirm: 'full', msg: true, spinner: false };
KpiSim.best = { k: { conv: true, cartAb: true, payDone: true, aov: true, device: true }, split: 'device', period: 'month' };
RadarSim.best = { metric: 'cr', seg: 'android', base: 'wk', thr: 10 };
ImproveSim.best = { a: { bug: '1', guest: '1', ship: '1', search: '2', reviews: '2', redesign: '3' } };
CheckoutSim.best = { account: 'guest', fields: 7, ship: 'early', pay: { card: true, debit: true, wallet: true, cod: true, bnpl: true }, trust: { badges: true, returns: true, contact: true }, progress: true, autofill: true, summary: true, inlineErr: true, coupon: 'collapsed', upsell: false };
BudgetSim.best = { alloc: { meta: 1000, google: 1500, tiktok: 1000, influ: 750, market: 2750, crm: 1000, content: 0 } };
StoreSim.best = { name: 'دار المسك', cat: 'عطور وبخور', lang: 'both', cur2: true, title: 'عطر عود طبيعي للرجال، ثبات طويل، 100 مل', price: 249, compare: 299, sku: 'MSK-OUD-100', variants: '50 مل، 100 مل', bullets: 'ثبات يدوم طوال اليوم\nعود طبيعي بدون كحول\nعبوة هدية جاهزة', img: 'both', zones: { doha: true, qatar: true, gcc: true }, shipShow: 'early', freeFrom: 300, pay: { debit: true, card: true, wallet: true, cod: true }, returns: 14, privacy: true, domain: true, licence: true, tracking: true, testOrder: true };

Object.assign(SIM_TYPES, { patience: 'صبر المستخدم', gap: 'من الإعجاب إلى الشراء', hunt: 'صيد الاحتكاك', timing: 'توقيت الرسالة', pers: 'عمق التخصيص', beauty: 'الجمال مقابل السهولة', place: 'ترتيب صفحة المنتج', path: 'أقصر طريق للشراء', trust: 'مختبر الثقة', last: 'آخر عشر ثوانٍ', kpi: 'لوحة المؤشرات', radar: 'رادار الانحرافات', improve: 'مدير التحسين', ai: 'الإنسان والآلة' });
Object.assign(SIMS, { patience: PatienceSim, gap: GapSim, hunt: HuntSim, timing: TimingSim, pers: PersSim, beauty: BeautySim, place: PlaceSim, path: PathSim, trust: TrustSim, last: LastSim, kpi: KpiSim, radar: RadarSim, improve: ImproveSim, ai: AiSim });

// فلسفة حل كل محاكاة: تظهر مع الحل النموذجي بعد أن يكشف المدرب الإجابات
const SIM_WHY = {
 "store": {
  "idea": "متجر جاهز للإطلاق ليس متجرًا جميلًا فقط؛ هو متجر يجيب عن أسئلة العميل ويزيل مخاوفه قبل أن يسأل عنها.",
  "points": [
   "هوية واضحة وبلغتين: تخدم المقيمين والزوار وتبدو احترافية من أول لحظة.",
   "عنوان منتج بمعادلة (نوع + خاصية + حجم) وثلاث نقاط بيع تبدأ بالفائدة: يفهم العميل المنتج ويجده في البحث.",
   "الشحن والتوصيل ظاهران مبكرًا: التكاليف المفاجئة أكبر أسباب هجر السلة.",
   "أكثر من وسيلة دفع مع مدى: تغطي عادات الدفع المحلية فلا يخسر المتجر عميلًا بسبب وسيلة ناقصة.",
   "سياسة استرجاع وخصوصية وتوثيق للمتجر: هذه إشارات ثقة قبل أن تكون متطلبات قانونية.",
   "طلب تجريبي كامل قبل الإطلاق: لا تُطلق رحلة لم تجرّبها بنفسك."
  ],
  "trap": "الاهتمام بالمظهر وحده وإطلاق المتجر قبل تجربة رحلة الشراء كاملة من الجوال."
 },
 "checkout": {
  "idea": "كل حقل وكل مفاجأة في صفحة الدفع تكلّفك نسبة من العملاء؛ الحل الأمثل يقلّل الجهد ويزيل المفاجآت ويطمئن العميل.",
  "points": [
   "الشراء كضيف: إجبار إنشاء حساب هو من أكثر أسباب الانسحاب، والحساب يمكن عرضه بعد الشراء.",
   "حقول قليلة (نحو 7) مع إكمال تلقائي للعنوان: كل حقل زائد جهد عملي لا يخدم الدفع.",
   "تكلفة الشحن ظاهرة في السلة: يعرف العميل المبلغ النهائي قبل أن يصل إلى الخطوة الأخيرة.",
   "مدى والمحافظ الرقمية وغيرها: غياب وسيلة الدفع المعتادة يعني عميلًا يغادر.",
   "شعارات الحماية وسياسة الاسترجاع وبيانات التواصل قرب زر الدفع: تطمئن في لحظة القرار.",
   "مؤشر خطوات وملخص طلب وأخطاء بجانب الحقل: يعرف العميل أين هو وماذا سيدفع وما الذي أخطأ فيه."
  ],
  "trap": "حقل كوبون بارز ونافذة عروض قبل الدفع: تدفعان العميل لمغادرة الصفحة للبحث عن كوبونات أو تشتّتانه عن الإتمام."
 },
 "budget": {
  "idea": "مضاعفة الإنفاق على قناة واحدة لا تضاعف نتائجها؛ أفضل توزيع يمزج قنوات التحويل العالي وقنوات جلب العملاء الجدد ويستثمر في العملاء الحاليين.",
  "points": [
   "عوائد متناقصة: كل ريال إضافي في القناة نفسها يجلب أقل من سابقه، فالتنويع يرفع العائد الكلي.",
   "السوق الإلكتروني وإعلانات البحث لها تحويل أعلى لأن المستخدم يبحث عن الشراء فعلًا.",
   "رسائل العملاء الحاليين أرخص القنوات وأعلاها تحويلًا، لكن سقفها محدود بحجم قائمتك (800 عميل)، فلا تُنفق فوق قدرتها.",
   "قنوات الاكتشاف (تيك توك وميتا والمؤثرون) تجلب عملاء جددًا، وقيمتهم تتحقق على مدى شهور لا في شهر واحد.",
   "نقاط الفريق = ربح الشهر + نصف قيمة العملاء الجدد: توازن بين الربح الآن والنمو لاحقًا."
  ],
  "trap": "وضع الميزانية كلها في القناة الأرخص نقرة، أو تجاهل قناة العملاء الحاليين لأنها «لا تجلب جددًا»."
 },
 "patience": {
  "idea": "صبر المستخدم رصيد محدود: كل ثانية تحميل، وكل نقرة، وكل سؤال بلا إجابة يستهلك منه.",
  "points": [
   "الجهد الذهني (ما لا يعرفه: السعر النهائي، المقاس، شكل المنتج) والجهد العملي (ما يفعله: انتظار ونقرات) يجتمعان على العميل نفسه.",
   "تحميل سريع (ثانية أو ثانيتان) لأن الانتظار يبدأ قبل أن يرى أي قيمة.",
   "لا نوافذ اشتراك أو طلب تقييم قبل أي تجربة: لم يمنحك العميل شيئًا بعد ليقيّمه.",
   "السعر النهائي والمقاسات والصور المتعددة ظاهرة في الصفحة: تُغلق الأسئلة قبل أن يفكر فيها.",
   "نقرتان حتى السلة ونقاط وصف مختصرة: يقلّل الجهد العملي ويسهّل المسح السريع للمعلومات."
  ],
  "trap": "الظن أن المستخدم المهتم «سيتحمل» لأنه مهتم؛ الاهتمام لا يعني الإتمام."
 },
 "gap": {
  "idea": "الفجوة بين «أعجبني» و«اشتريت» تُسدّ بإصلاح النقطة التي ينقطع عندها المسار، لا بإدخال مزيد من المهتمين إلى مسار مثقوب.",
  "points": [
   "اقرأ المسار كمراحل (مشاهدة ← سلة ← دفع ← شراء) وحدد أكبر تسرّب: هناك يذهب الجهد أولًا.",
   "الشراء كضيف يعالج تسرّب مرحلة الدفع، وهو من أعلى الإصلاحات أثرًا.",
   "حفظ السلة والتذكير اللطيف يعيد من غادر بعد أن أضاف المنتج، ونيّته ما زالت حاضرة.",
   "الصور الأوضح ودليل المقاسات يرفعان نسبة من ينتقل من المشاهدة إلى السلة.",
   "مضاعفة الإعلانات ترفع عدد المهتمين قليلًا وبتكلفة عالية، ثم تدخلهم إلى المسار المثقوب نفسه."
  ],
  "trap": "أن يكون رد الفعل الأول على ضعف المبيعات «نزيد الإعلانات» قبل قياس أين ينقطع المسار."
 },
 "hunt": {
  "idea": "الاحتكاك ليس كل عنصر إضافي، بل ما يزيد الجهد دون أن يخدم قرار المستخدم.",
  "points": [
   "احتكاك: نافذة تقييم فور الدخول، وإعلان يغطي المنتج، وسعر «يبدأ من»، وتسجيل قبل رؤية المقاسات، ونص طويل في كتلة، وقائمة مقاسات طويلة، وأيقونات بلا تسميات.",
   "ليس احتكاكًا: صور متعددة، وتقييمات العملاء، وموعد التوصيل، وزر «أضف للسلة» الثابت، وزر المشاركة؛ لأنها تجيب أسئلة القرار أو لا تعيق المسار.",
   "السؤال الذي تفرز به: هل هذا العنصر يقرّب المستخدم من القرار أم يبعده أو يشتّته؟"
  ],
  "trap": "حذف كل عنصر «زائد» بلا تمييز، فتحذف معه ما يطمئن المستخدم ويجيب أسئلته."
 },
 "timing": {
  "idea": "التدخل الجيد يرتبط بسلوك محدد وبلحظة ما زالت النية فيها حاضرة، ويحترم المستخدم.",
  "points": [
   "التوقيت: بعد نحو ساعة؛ فورًا يبدو مراقبة، وبعد أيام تكون اللحظة قد فاتت.",
   "القناة والمحتوى: إشعار أو رسالة داخل التطبيق عن المنتج المتروك نفسه وتوفر مقاسه؛ الرسالة العامة تُهمل.",
   "التكرار: رسالتان أسبوعيًا؛ الإكثار يرفع إلغاء الإشعارات فيخسر المتجر قناة كاملة.",
   "احترام ساعات الراحة، وفتح السلة مباشرة عند الضغط: كل خطوة تُزال بين الرسالة والشراء ترفع الإتمام."
  ],
  "trap": "رسالة عامة كثيرة التكرار في وقت عشوائي تُوصف بأنها «تسويق نشط» وهي في الواقع إزعاج."
 },
 "pers": {
  "idea": "التخصيص الحقيقي يستخدم ما يساعد على القرار الآن، لا كل ما نعرفه عن العميل.",
  "points": [
   "الإشارات المفيدة: المنتج المتروك في السلة، والفئة التي تصفحتها، وتوفر مقاسها، وموعد التوصيل لمدينتها، وقطعة تكمل مشترياتها.",
   "الاسم وحده تخصيص سطحي؛ يرفع الإحساس بالاهتمام قليلًا دون أن يخدم القرار.",
   "«شاهدتِه 7 مرات» واسم الحي والعمر تُشعر العميل بأنه مراقَب، فتنقلب الفائدة إلى انزعاج.",
   "ميزان التخصيص: ارفع الملاءمة ما دام العميل يرى الفائدة، وتوقف قبل أن يرى التطفل."
  ],
  "trap": "استعراض حجم ما نعرفه عن العميل بدل تقديم ما يخدمه."
 },
 "beauty": {
  "idea": "السهولة تسبق الجمال؛ الجمال الذي يخدم السهولة قيمة، والذي يزاحمها عبء.",
  "points": [
   "بانر لا يتجاوز نحو نصف الشاشة: يبقى المحتوى والإجراء الرئيسي في الأعلى.",
   "حركة خفيفة فقط: الحركة الكثيفة تبطئ وتشتّت الانتباه.",
   "تباين واضح للنص: الرمادي الأنيق الفاتح يصعب قراءته في الشمس وعلى الشاشات الصغيرة.",
   "أزرار بارتفاع 44 بكسل فأكثر: مقاس الإبهام لا مقاس الفأرة.",
   "أيقونات بتسميات، وقائمة سفلية من أربعة أو خمسة عناصر، ولوحة ألوان مضبوطة: يفهم المستخدم أين يضغط دون تخمين."
  ],
  "trap": "قياس نجاح التصميم بمقدار الإعجاب به بدل قدرة المستخدم على إنجاز مهمته."
 },
 "place": {
  "idea": "ما يحتاجه القرار أولًا يظهر أولًا، وما يحتاجه بعض المستخدمين يظهر عند الحاجة، وما لا يخدم العميل لا مكان له.",
  "points": [
   "أعلى الصفحة: السعر والصور والمقاسات ووعد التقييم والتوصيل؛ لأنها أسئلة يطرحها كل مستخدم قبل «أضف للسلة».",
   "عند الحاجة: دليل المقاسات التفصيلي، ونصوص التقييمات، والمواصفات، وقصة العلامة؛ متاحة لمن يبحث عنها دون أن تزدحم بها الصفحة.",
   "لا مكان لها: أخبار الشركة والوظائف ورمز المخزون الداخلي؛ تخدم الفريق لا العميل.",
   "المعلومة الصحيحة في المكان الخطأ تتحول إلى ضجيج."
  ],
  "trap": "تكديس كل ما لدينا أعلى الصفحة، فيفصل العميلَ عن زر الشراء عدد كبير من العناصر."
 },
 "path": {
  "idea": "أقصر طريق منطقي: احتفظ بما يلزم للشراء فقط، وأجّل كل ما يمكن تأجيله إلى ما بعد الشراء.",
  "points": [
   "المسار الأساسي: الرئيسية ← المنتج ← السلة ← الدفع؛ لا شراء بدون هذه الخطوات.",
   "بحث بارز يختصر المرور عبر الفئات والفئات الفرعية للمستخدم الذي يعرف ما يريد.",
   "احذف: شاشة الترحيب، والجولة التعريفية، وتسجيل الدخول الإجباري (يُعرض بعد الشراء)، ونوافذ اختيار المقاس المنفصلة، وصفحة العروض قبل الدفع.",
   "كل خطوة لا تخدم القرار تكلّف نسبة من المستخدمين، لكن لا تحذف خطوة لا يتم الشراء بدونها."
  ],
  "trap": "الخلط بين الخطوة المعتادة والخطوة الضرورية، أو حذف المنتج أو السلة أو الدفع."
 },
 "trust": {
  "idea": "الثقة تُبنى بإشارات صادقة وواضحة، وتنهار بمفاجأة واحدة أو ضغط مصطنع.",
  "points": [
   "إشارات تطمئن: مجموع شامل للضريبة والشحن، وشعارات مدى والدفع الآمن، وسياسة الاسترجاع بجانب زر الدفع، وتقييمات حقيقية، وتواصل واتساب، وتوثيق المتجر، وموعد توصيل.",
   "أزل: عدّاد تنازلي مصطنع، وخيارات (تغليف، تأمين) محددة مسبقًا، ورسوم تظهر في الخطوة الأخيرة، وطلب صلاحيات غير لازمة.",
   "السهولة وحدها لا تكفي؛ العميل يدفع حين يشعر بالأمان لا حين يُدفَع دفعًا."
  ],
  "trap": "حيل ترفع التحويل اليوم وتضر السمعة والثقة على المدى الطويل."
 },
 "last": {
  "idea": "في آخر عشر ثوانٍ يصبح المستخدم شديد الحساسية لأي غموض يمس ماله؛ اجعل كل ثانية تطمئنه.",
  "points": [
   "زر يتحول إلى «جارٍ الدفع…» ويُقفل: يعرف أن الضغطة وصلت ولا يخشى الدفع مرتين.",
   "تعبئة تلقائية لرمز التحقق ومهلة جلسة كافية: لا يغادر ليبحث عن رسالة فتنتهي جلسته.",
   "رفض البطاقة بسبب واضح وبديل دفع وسلة محفوظة: الفشل لا ينهي الرحلة.",
   "لا رسوم متأخرة ولا تحميل صامت طويل: المفاجأة في هذه اللحظة أشد أثرًا من أي وقت.",
   "تأكيد برقم الطلب وموعد التوصيل والتتبع مع رسالة تأكيد: تُختم الرحلة بيقين."
  ],
  "trap": "اعتبار الدفع انتهى بمجرد ضغط الزر، وإهمال ما يشعر به العميل في الثواني التي تليه."
 },
 "kpi": {
  "idea": "المؤشر المفيد يرتبط بقرار: إذا تغيّر عرفت ماذا تفعل.",
  "points": [
   "مؤشرات مسار الشراء (التحويل، التخلي عن السلة، إتمام الدفع، متوسط الطلب) تكشف أين انكسر المسار.",
   "التقسيم (حسب الجهاز أو جديد/عائد) يحوّل رقمًا عامًا إلى موضع محدد للمشكلة.",
   "المقارنة بالشهر السابق تتجاوز التذبذب اليومي الطبيعي وتعطي قراءة أصدق.",
   "استبعد المؤشرات المظهرية: التنزيلات والمتابعون والإعجابات وعدد المنتجات ترتفع والمبيعات تنخفض."
  ],
  "trap": "لوحة أرقام كبيرة تجمّل الصورة ولا تفسّر لماذا انخفضت المبيعات."
 },
 "radar": {
  "idea": "الانحراف الحقيقي يُقرأ بالمقارنة الصحيحة وبالمؤشر المناسب، ثم يُعزل في الشريحة التي تسببه.",
  "points": [
   "راقب معدل التحويل لا عدد الزيارات: المشكلة كانت في جودة الرحلة لا في حجم الزوار.",
   "قارن باليوم نفسه من الأسبوع الماضي: يحيّد أثر عطلة نهاية الأسبوع فلا تُطلق إنذارات كاذبة كل جمعة وسبت.",
   "اعزل الشريحة (أندرويد): ينخفض التحويل فيها وحدها، فيتضح أن العطل في نسخة أندرويد لا في المتجر كله.",
   "حد إنذار متوازن: ضيّق جدًا يغرقك بالإنذارات الكاذبة، وواسع جدًا يفوّت المشكلة."
  ],
  "trap": "مراقبة إجمالي الزيارات بمتوسط عام، فتضيع المشكلة داخل المتوسط."
 },
 "improve": {
  "idea": "الأولوية = الأثر × الثقة ÷ الجهد؛ ابدأ بالمكاسب السريعة المؤكدة لأن أثرها يتراكم أطول.",
  "points": [
   "الدورة الأولى: إصلاح عطل الدفع، والشراء كضيف، وإظهار الشحن في السلة؛ جهد قليل وثقة عالية وأثر مباشر.",
   "التحسينات المتوسطة (تحسين البحث، تقييمات بالصور) بعدها.",
   "إعادة التصميم الكاملة أثرها كبير لكن ثقتها ضعيفة وجهدها يستهلك دورة كاملة، فتأتي في النهاية.",
   "ما يُنجز مبكرًا يبدأ أثره في الشهر التالي ويتراكم، لذلك ترتيب الدورات جزء من قيمة الخطة."
  ],
  "trap": "البدء بالمشروع الكبير الأكثر بريقًا وترك المكاسب السريعة المؤكدة."
 },
 "ai": {
  "idea": "الآلة تسرّع وتنفّذ على نطاق واسع، والإنسان يحكم ويتعاطف ويتحمل المسؤولية؛ أفضل النتائج من تعاونهما.",
  "points": [
   "للآلة وحدها: تلخيص آلاف التقييمات، والرد على أسئلة الشحن المتكررة، واقتراح المنتجات المكملة؛ مهام كبيرة الحجم منخفضة المخاطر.",
   "للآلة مع مراجعة بشرية: مسودات أوصاف المنتجات، والترجمة، ورصد الاحتيال، وتعديل الأسعار بحدود؛ السرعة من الآلة والدقة والنبرة من الإنسان.",
   "للإنسان: الاسترداد في حالة استثنائية، والرد على شكوى منتشرة، واستراتيجية المتجر؛ فيها حكم وتعاطف ومسؤولية."
  ],
  "trap": "تسليم قرارات السمعة والحكم للآلة، أو رفض الآلة حتى في المهام المتكررة."
 }
};
