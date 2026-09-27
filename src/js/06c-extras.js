// ---------------------------------------------------------------------
// صندوق الأدوات، مكتبة القوالب، النقاط ولوحة الصدارة، المتابعة بعد البرنامج
// ---------------------------------------------------------------------

// ================= صندوق الأدوات (حاسبات تُحفظ مدخلاتها على جهاز المتدرب) =================
const TOOLS_KEY = 'ec_tools';
const ToolState = {
  all() { try { return JSON.parse(SafeLS.get(TOOLS_KEY) || '{}') || {}; } catch (e) { return {}; } },
  get(id) { return ToolState.all()[id] || {}; },
  set(id, k, v) { const a = ToolState.all(); a[id] = Object.assign({}, a[id] || {}, { [k]: v }); SafeLS.set(TOOLS_KEY, JSON.stringify(a)); }
};
const n0 = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const fmt = (v, d = 0) => isFinite(v) ? (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('en-US') : '—';
const TOOLS = [
  { id: 'funnel', icon: '🧭', title: 'قمع الرحلة: أين يتسرب المستخدمون؟', desc: 'أدخل أعداد كل مرحلة لتعرف نسب الانتقال وأكبر نقطة فقد تستحق التحقيق أولًا.', axis: 'a9',
    inputs: [['visits', 'الزيارات / فتح التطبيق', 40000], ['views', 'مشاهدة منتج', 18000], ['carts', 'إضافة للسلة', 5200], ['checkout', 'بدء الدفع', 3100], ['orders', 'طلبات مكتملة', 1150]],
    calc: v => { const st = [['الزيارة ← المشاهدة', v.visits, v.views], ['المشاهدة ← السلة', v.views, v.carts], ['السلة ← الدفع', v.carts, v.checkout], ['الدفع ← الإتمام', v.checkout, v.orders]].map(([l, a, b]) => [l, a ? b / a * 100 : 0]); const worst = st.slice().sort((a, b) => a[1] - b[1])[0]; return st.map(([l, r]) => [l, fmt(r, 1) + '%']).concat([['التحويل الكلي', fmt(v.visits ? v.orders / v.visits * 100 : 0, 2) + '%', 1], ['أكبر نقطة فقد', worst ? worst[0] + ' (يعبر ' + fmt(worst[1], 1) + '% فقط)' : '—', 1]]); } },
  { id: 'uplift', icon: '📈', title: 'أثر تحسين التحويل على الإيرادات', desc: 'كم يساوي تحسين بسيط في نسبة الإتمام؟ قبل أن تزيد الإعلانات، احسب قيمة إزالة الاحتكاك.', axis: 'a15',
    inputs: [['sessions', 'الجلسات شهريًا', 60000], ['conv', 'نسبة التحويل الحالية %', 1.8], ['aov', 'متوسط قيمة الطلب (ر.ق)', 180], ['gain', 'التحسين المتوقع في التحويل (نقطة مئوية)', 0.3]],
    calc: v => { const base = v.sessions * v.conv / 100, after = v.sessions * (v.conv + v.gain) / 100; const extra = (after - base) * v.aov; const rel = v.conv ? v.gain / v.conv * 100 : 0; return [['الطلبات شهريًا الآن', fmt(base)], ['الطلبات بعد التحسين', fmt(after)], ['نمو نسبي في الطلبات', fmt(rel, 1) + '%'], ['إيراد إضافي شهريًا', fmt(extra) + ' ر.ق', 1], ['إيراد إضافي سنويًا', fmt(extra * 12) + ' ر.ق', 1]]; } },
  { id: 'inapp', icon: '💬', title: 'أداء رسالة داخل التطبيق', desc: 'الوصول ≠ التفاعل ≠ التحويل: اقرأ الرسالة من الظهور حتى الشراء.', axis: 'a6',
    inputs: [['reach', 'عدد من ظهرت لهم الرسالة', 50000], ['clicks', 'النقرات', 900], ['buyers', 'المشترون بعد النقر', 45], ['rev', 'الإيراد من المشترين (ر.ق)', 8100], ['cost', 'تكلفة الحملة أو الخصم (ر.ق)', 1500]],
    calc: v => { const ctr = v.reach ? v.clicks / v.reach * 100 : 0, cvr = v.clicks ? v.buyers / v.clicks * 100 : 0, all = v.reach ? v.buyers / v.reach * 100 : 0; const roi = v.cost ? (v.rev - v.cost) / v.cost * 100 : 0; return [['نسبة النقر CTR', fmt(ctr, 2) + '%'], ['التحويل بعد النقر', fmt(cvr, 1) + '%'], ['التحويل من إجمالي الوصول', fmt(all, 3) + '%'], ['الإيراد لكل 1000 وصول', fmt(v.reach ? v.rev / v.reach * 1000 : 0, 1) + ' ر.ق', 1], ['العائد على التكلفة', fmt(roi) + '%', 1], ['القراءة', ctr < 1 ? '⚠️ التفاعل ضعيف: راجع ملاءمة الرسالة وتوقيتها' : cvr < 3 ? '⚠️ النقر جيد لكن الوجهة لا تُكمل الوعد' : '✅ الرسالة والوجهة متسقتان', 1]]; } },
  { id: 'gateways', icon: '💳', title: 'مقارنة رسوم بوابتي دفع', desc: 'قارن التكلفة الفعلية على طلبك النموذجي وأثر مدة التسوية على سيولتك.', axis: 'a10',
    inputs: [['aov', 'متوسط قيمة الطلب (ر.ق)', 200], ['orders', 'الطلبات شهريًا', 300], ['pa', 'البوابة (أ): النسبة %', 2.5], ['fa', 'البوابة (أ): رسم ثابت لكل عملية (ر.ق)', 1], ['da', 'البوابة (أ): مدة التسوية (أيام)', 7], ['pb', 'البوابة (ب): النسبة %', 2], ['fb', 'البوابة (ب): رسم ثابت لكل عملية (ر.ق)', 2], ['db', 'البوابة (ب): مدة التسوية (أيام)', 2]],
    calc: v => { const ca = v.aov * v.pa / 100 + v.fa, cb = v.aov * v.pb / 100 + v.fb; const monthly = v.orders * v.aov; const tied = d => monthly / 30 * d; return [['تكلفة الطلب: البوابة (أ)', fmt(ca, 2) + ' ر.ق'], ['تكلفة الطلب: البوابة (ب)', fmt(cb, 2) + ' ر.ق'], ['الفرق الشهري', fmt(Math.abs(ca - cb) * v.orders) + ' ر.ق لصالح ' + (ca <= cb ? '(أ)' : '(ب)'), 1], ['مال محتجز بانتظار التسوية (أ)', fmt(tied(v.da)) + ' ر.ق'], ['مال محتجز بانتظار التسوية (ب)', fmt(tied(v.db)) + ' ر.ق', 1]]; } },
  { id: 'marketing', icon: '📣', title: 'تكلفة الاستحواذ والقيمة الدائمة والعائد', desc: 'هل تربح من إعلاناتك فعلًا على المدى الطويل؟', axis: 'a5',
    inputs: [['spend', 'الإنفاق الإعلاني (ر.ق)', 3000], ['newC', 'العملاء الجدد', 60], ['rev', 'الإيرادات من الحملة (ر.ق)', 12000], ['aov', 'متوسط قيمة الطلب (ر.ق)', 200], ['freq', 'مرات الشراء سنويًا', 4], ['years', 'مدة العلاقة (سنوات)', 2], ['margin', 'هامش الربح %', 30]],
    calc: v => { const cac = v.newC ? v.spend / v.newC : 0; const clv = v.aov * v.freq * v.years * v.margin / 100; const roas = v.spend ? v.rev / v.spend : 0; const ratio = cac ? clv / cac : 0; return [['تكلفة الاستحواذ CAC', fmt(cac, 1) + ' ر.ق'], ['العائد على الإنفاق ROAS', fmt(roas, 2)], ['القيمة الدائمة للعميل CLV', fmt(clv) + ' ر.ق'], ['نسبة CLV إلى CAC', fmt(ratio, 1) + ' : 1', 1], ['الحكم', ratio >= 3 ? '✅ علاقة صحية' : ratio >= 1 ? '⚠️ مقبولة لكن حسّن الاحتفاظ' : '❌ كل عميل جديد يخسرك', 1]]; } },
  { id: 'breakeven', icon: '⚖️', title: 'سعر التعادل وهامش الربح', desc: 'أقل سعر تبيع به دون خسارة، والسعر المطلوب لهامشك المستهدف.', axis: 'a12',
    inputs: [['cost', 'تكلفة المنتج (ر.ق)', 60], ['ship', 'الشحن والتغليف لكل طلب (ر.ق)', 18], ['fees', 'رسوم الدفع والعمولة %', 3], ['mkt', 'التسويق لكل طلب (ر.ق)', 20], ['target', 'هامش الربح الصافي المستهدف %', 20], ['price', 'سعرك الحالي (ر.ق)', 150]],
    calc: v => { const fixed = v.cost + v.ship + v.mkt; const be = fixed / Math.max(0.01, 1 - v.fees / 100); const tgt = fixed / Math.max(0.01, 1 - v.fees / 100 - v.target / 100); const net = v.price - fixed - v.price * v.fees / 100; return [['سعر التعادل', fmt(be, 1) + ' ر.ق', 1], ['السعر لتحقيق الهامش المستهدف', fmt(tgt, 1) + ' ر.ق', 1], ['صافي ربحك بالسعر الحالي', fmt(net, 1) + ' ر.ق (' + fmt(v.price ? net / v.price * 100 : 0, 1) + '%)']]; } }
];
const MATRIX_CRIT = ['قابلية التوسع', 'التكلفة الإجمالية', 'ملاءمة القطاع', 'الوصول للسوق', 'سهولة التشغيل'];
function matrixToolHtml() {
  const s = Object.assign({ names: ['المنصة (أ)', 'المنصة (ب)', 'المنصة (ج)'], w: [25, 25, 20, 20, 10], sc: {} }, ToolState.get('matrix'));
  const tot = s.w.reduce((a, b) => a + n0(b), 0);
  const res = s.names.map((nm, j) => MATRIX_CRIT.reduce((a, c, i) => a + n0(s.w[i]) / 100 * n0((s.sc[i] || {})[j] || 3), 0));
  const best = res.indexOf(Math.max(...res));
  return '<div class="tool-card" id="tool-matrix"><div class="tc-head"><span>🧭</span><div><h3>مصفوفة اختيار المنصة</h3><p>امنح كل معيار وزنًا (المجموع 100%)، وقيّم كل منصة من 1 إلى 5.</p></div></div>' +
    '<div class="table-wrap"><table class="mx-table"><thead><tr><th>المعيار</th><th>الوزن %</th>' + s.names.map((nm, j) => '<th><input data-mx="name" data-j="' + j + '" value="' + h(nm) + '"></th>').join('') + '</tr></thead><tbody>' +
    MATRIX_CRIT.map((c, i) => '<tr><td>' + c + '</td><td><input type="number" min="0" max="100" data-mx="w" data-i="' + i + '" value="' + h(s.w[i]) + '"></td>' + s.names.map((_, j) => '<td><input type="number" min="1" max="5" data-mx="sc" data-i="' + i + '" data-j="' + j + '" value="' + h((s.sc[i] || {})[j] || 3) + '"></td>').join('') + '</tr>').join('') +
    '<tr class="mx-total"><td>النتيجة الموزونة</td><td class="num ' + (tot === 100 ? '' : 'bad') + '">' + tot + '%</td>' + res.map((r, j) => '<td class="num ' + (j === best ? 'best' : '') + '">' + r.toFixed(2) + (j === best ? ' 🏆' : '') + '</td>').join('') + '</tr></tbody></table></div>' + (tot !== 100 ? '<div class="tool-note">⚠️ مجموع الأوزان يجب أن يكون 100%.</div>' : '') + '</div>';
}
function toolCardHtml(t) {
  const st = ToolState.get(t.id); const v = {}; t.inputs.forEach(([k, , d]) => { v[k] = n0(st[k] != null ? st[k] : d); });
  return '<div class="tool-card" id="tool-' + t.id + '"><div class="tc-head"><span>' + t.icon + '</span><div><h3>' + h(t.title) + '</h3><p>' + h(t.desc) + '</p></div></div><div class="tc-grid"><div class="tc-inputs">' +
    t.inputs.map(([k, l, d]) => '<label><span>' + h(l) + '</span><input type="number" step="any" data-tool="' + t.id + '" data-k="' + k + '" value="' + h(st[k] != null ? st[k] : d) + '"></label>').join('') + '</div><div class="tc-out" id="tco-' + t.id + '">' + toolOut(t, v) + '</div></div></div>';
}
function toolOut(t, v) { return t.calc(v).map(([l, val, strong]) => '<div class="tc-row ' + (strong ? 'strong' : '') + '"><span>' + h(l) + '</span><b class="num">' + h(val) + '</b></div>').join(''); }
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.getAttribute) return;
  const tid = t.getAttribute('data-tool');
  if (tid) { const tool = TOOLS.find(x => x.id === tid); ToolState.set(tid, t.getAttribute('data-k'), t.value); const st = ToolState.get(tid); const v = {}; tool.inputs.forEach(([k, , d]) => { v[k] = n0(st[k] != null ? st[k] : d); }); const o = document.getElementById('tco-' + tid); if (o) o.innerHTML = toolOut(tool, v); return; }
  const mx = t.getAttribute('data-mx');
  if (mx) { const s = Object.assign({ names: ['المنصة (أ)', 'المنصة (ب)', 'المنصة (ج)'], w: [25, 25, 20, 20, 10], sc: {} }, ToolState.get('matrix'));
    if (mx === 'name') s.names[+t.getAttribute('data-j')] = t.value; else if (mx === 'w') s.w[+t.getAttribute('data-i')] = t.value; else { const i = t.getAttribute('data-i'); s.sc[i] = Object.assign({}, s.sc[i] || {}, { [t.getAttribute('data-j')]: t.value }); }
    const a = ToolState.all(); a.matrix = s; SafeLS.set(TOOLS_KEY, JSON.stringify(a));
    if (mx !== 'name') { const box = document.getElementById('tool-matrix'); const act = document.activeElement; const sel = act && act.getAttribute('data-mx') ? '[data-mx="' + act.getAttribute('data-mx') + '"][data-i="' + act.getAttribute('data-i') + '"]' + (act.getAttribute('data-j') ? '[data-j="' + act.getAttribute('data-j') + '"]' : '') : null; box.outerHTML = matrixToolHtml(); if (sel) { const el = document.querySelector(sel); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } } } }
});

// ================= مكتبة القوالب القابلة للتحميل =================
const TEMPLATES = [
  { id: 'audit', icon: '🔍', title: 'ورقة تدقيق الاحتكاك في التطبيق', desc: 'امشِ في رحلة المستخدم خطوة بخطوة وسجّل ما يبطئه أو يربكه أو يقلقه، ثم رتّب ما تبدأ به.',
    body: '<h2>تدقيق الاحتكاك: ____________</h2><table><tr><th>البند</th><th>التفاصيل</th></tr><tr><td>التطبيق / المتجر</td><td></td></tr><tr><td>المهمة التي اختبرناها</td><td>مثال: شراء منتج من البحث حتى التأكيد</td></tr><tr><td>الجهاز والمستخدم</td><td></td></tr></table><h3>الرحلة خطوة بخطوة</h3><table><tr><th>#</th><th>الخطوة</th><th>ما لاحظناه</th><th>نوع الاحتكاك (غموض / تعقيد / بطء / عدم ثقة)</th><th>الأثر (1–5)</th></tr>' + [1,2,3,4,5,6,7,8,9,10].map(i => '<tr><td>' + i + '</td><td></td><td></td><td></td><td></td></tr>').join('') + '</table><h3>أعلى ثلاث نقاط أثرًا</h3><ol><li></li><li></li><li></li></ol><p>تذكير: ليست كل خطوة احتكاكًا؛ الخطوة التي تطمئن المستخدم أو تمنع خطأ قد تكون ضرورية.</p>' },
  { id: 'message', icon: '💬', title: 'بطاقة تصميم رسالة داخل التطبيق', desc: 'اربط الرسالة بسلوك محدد ولحظة مناسبة وهدف قابل للقياس — قبل أن تضغط «إرسال».',
    body: '<h2>بطاقة الرسالة داخل التطبيق</h2><table><tr><th>العنصر</th><th>الإجابة</th></tr><tr><td>السلوك الذي نستجيب له</td><td>مثال: أضاف للسلة ولم يكمل خلال 24 ساعة</td></tr><tr><td>المستخدم المستهدف (الشريحة)</td><td></td></tr><tr><td>لحظة الظهور ومكانه</td><td></td></tr><tr><td>نص الرسالة (قصير وواضح)</td><td></td></tr><tr><td>الوجهة بعد النقر</td><td></td></tr><tr><td>الهدف من الرسالة</td><td>☐ توضيح ☐ طمأنة ☐ تذكير ☐ تحفيز</td></tr><tr><td>مؤشر النجاح والرقم المستهدف</td><td></td></tr><tr><td>متى لا تظهر الرسالة؟ (حد التكرار والاستثناءات)</td><td></td></tr></table><h3>قائمة فحص قبل الإرسال</h3><ul><li>☐ الرسالة تجيب عن سؤال لدى المستخدم في هذه اللحظة</li><li>☐ الوجهة تُكمل ما وعدت به الرسالة</li><li>☐ لن تصل للمستخدم نفسه أكثر من المسموح</li><li>☐ نعرف كيف سنقيس الأثر بعد الوصول والنقر</li></ul>' },
  { id: 'improve', icon: '🔁', title: 'بطاقة التحسين: من المشكلة إلى القرار', desc: 'مشكلة واحدة، دليل، فرضية «إذا... فقد...»، تغيير واحد، ومؤشر واضح للقرار.',
    body: '<h2>بطاقة التحسين</h2><table><tr><th>البند</th><th>الإجابة</th></tr><tr><td>المشكلة (في أي مرحلة من الرحلة؟)</td><td></td></tr><tr><td>الدليل (الرقم أو السلوك الذي كشفها)</td><td></td></tr><tr><td>الفرضية: إذا ... فقد ...</td><td></td></tr><tr><td>التغيير الواحد الذي سنختبره</td><td></td></tr><tr><td>المؤشر الرئيسي والرقم الحالي</td><td></td></tr><tr><td>مؤشر حارس (ما يجب ألا يسوء)</td><td></td></tr><tr><td>طريقة الاختبار ومدته</td><td></td></tr><tr><td>معيار النجاح</td><td></td></tr></table><h3>بعد الاختبار</h3><table><tr><th>النتيجة</th><th>ما تعلمناه</th><th>القرار</th></tr><tr><td></td><td></td><td>☐ نعتمد ☐ نعدّل ونعيد ☐ نتراجع</td></tr></table>' },
  { id: 'trust', icon: '🛡️', title: 'قائمة فحص الدفع والثقة', desc: 'راجع المرحلة الأخيرة من منظور المستخدم: وضوح، تحكم، طمأنة، ولا مفاجآت.',
    body: '<h2>قائمة فحص الدفع والثقة</h2>' + [['الوضوح', ['التكلفة الكاملة (المنتج + التوصيل + الرسوم) ظاهرة قبل الخطوة الأخيرة', 'موعد التوصيل المتوقع واضح', 'عدد خطوات الدفع معروف للمستخدم']], ['السهولة', ['الشراء ممكن دون إنشاء حساب إجباري', 'الحقول بالحد الأدنى مع تعبئة تلقائية', 'وسائل الدفع الشائعة متاحة (بطاقة، محافظ رقمية، الدفع عند الاستلام)']], ['الطمأنة', ['سياسة الاسترجاع مختصرة وقريبة من زر الدفع', 'إشارات الأمان في مكانها دون مبالغة', 'وسيلة تواصل واضحة عند المشكلة']], ['التحكم', ['يمكن مراجعة الطلب وتعديله قبل التأكيد', 'رسائل الخطأ تشرح ما حدث وكيف يُصلح', 'لا يضيع ما أدخله المستخدم عند الرجوع']], ['ما بعد الدفع', ['شاشة التأكيد تجيب: هل تم؟ ماذا طلبت؟ متى يصل؟ ماذا بعد؟', 'رسالة تأكيد فورية برقم الطلب', 'تتبع الطلب متاح من داخل التطبيق']]].map(([g, items]) => '<h3>' + g + '</h3><ul>' + items.map(x => '<li>☐ ' + x + '</li>').join('') + '</ul>').join('') }
];

function tplDoc(t) { return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + h(t.title) + '</title><style>body{font-family:Arial,sans-serif;direction:rtl;text-align:right;font-size:12pt;line-height:1.7}h2{color:#0093A8}h3{color:#3B4677;margin-top:14pt}table{border-collapse:collapse;width:100%;margin:6pt 0}td,th{border:1px solid #bbb;padding:6pt;vertical-align:top}th{background:#E6F3F5}</style></head><body dir="rtl">' + t.body + '<p style="color:#888;font-size:9pt">' + h(Content.courseTitle()) + '</p></body></html>'; }
async function tplPdf(t) {
  const pm = progressModal('📄 ' + t.title);
  try { const css = '<style>.tp h2{font-family:Cairo;color:#0093A8;margin:0 0 8px}.tp h3{font-family:Cairo;color:#3B4677;margin:12px 0 4px;font-size:15px}.tp table{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0}.tp td,.tp th{border:1px solid #CFDDE1;padding:6px;text-align:right;vertical-align:top;height:18px}.tp th{background:#E6F3F5}.tp p{font-size:12.5px}</style>';
    const doc = await PDFE.build([css + '<div class="fit tp" style="top:30px;bottom:40px;right:34px;left:34px;line-height:1.7">' + t.body + '</div>' + PP.foot(Content.courseTitle(), 1)], A4P, (i, n) => pm.set(i, n)); doc.save(t.title + '.pdf'); pm.close();
  } catch (e) { pm.close(); UI.alert('تعذر إنشاء الملف: ' + h(e.message || e)); }
}
Views.tools = {
  html() {
    return Layout.crumbs('<span class="crumb-tag">صندوق الأدوات</span>') + '<div class="ex-head"><div class="ico">🧰</div><div><h1>صندوق الأدوات</h1><div class="muted" style="font-family:var(--f-ui)">حاسبات عملية ومكتبة قوالب تبقى معك بعد البرنامج. مدخلاتك تُحفظ على جهازك فقط.</div></div></div>' +
      '<section class="section"><h2 class="sec-title">🧮 الحاسبات</h2><div class="tool-grid">' + matrixToolHtml() + TOOLS.map(toolCardHtml).join('') + '</div></section>' +
      '<section class="section" id="library"><h2 class="sec-title">📚 مكتبة القوالب</h2><div class="tpl-grid">' + TEMPLATES.filter(t => !Content.isHidden('tpl_' + t.id)).map(t => '<div class="tpl-card"><div class="tpl-ico">' + t.icon + '</div><h3>' + h(t.title) + '</h3><p>' + h(t.desc) + '</p><div class="row"><button class="btn btn-primary btn-sm" data-act="tpl-doc" data-id="' + t.id + '">⬇️ Word قابل للتعديل</button><button class="btn btn-soft btn-sm" data-act="tpl-pdf" data-id="' + t.id + '">📄 PDF</button><button class="btn btn-ghost btn-sm" data-act="tpl-view" data-id="' + t.id + '">👁 معاينة</button></div></div>').join('') + '</div></section>';
  }
};

// ================= النقاط ولوحة الصدارة =================
const Points = {
  cfg() { return Object.assign({ enabled: true, names: true }, (Store.site && Store.site.gamify) || {}); },
  // نقاط كل مستخدم مع تفصيلها — تُحسب من البيانات الموجودة أصلًا
  table() {
    if (Points._cache && Points._cache.stamp === Points.stamp()) return Points._cache.data;
    const users = Store.users || {}; const P = {}; Object.keys(users).forEach(u => { P[u] = { uid: u, pts: 0, ex: 0, likes: 0, first: 0, att: 0, as: 0 }; });
    const exs = Content.allExercises().map(x => x.e).filter(Boolean);
    exs.forEach(e => { const ps = Store.posts[e.id] || {}; let firstK = null, firstTs = Infinity;
      Object.keys(ps).forEach(k => { const p = ps[k]; if (!p) return; const who = e.mode === 'group' ? Object.keys(p.members || {}) : [k]; const lk = Object.keys(p.likes || {}).length;
        who.forEach(u => { if (!P[u]) return; P[u].ex++; P[u].pts += e.format === 'sim' ? 15 : 10; P[u].likes += lk; P[u].pts += lk * 2; });
        if ((p.ts || Infinity) < firstTs && e.mode !== 'group') { firstTs = p.ts; firstK = k; } });
      if (firstK && P[firstK]) { P[firstK].first++; P[firstK].pts += 5; } });
    Object.keys(P).forEach(u => { const d = Attend.on() ? Attend.days().filter(x => Attend.hoursOf(u, x) > 0).length : 0; P[u].att = d; P[u].pts += d * 20; ['pre', 'post'].forEach(ph => { const r = Assess.rec(ph, u); if (r && r.done) { P[u].as++; P[u].pts += 15; } }); });
    const list = Object.values(P).sort((a, b) => b.pts - a.pts); const mostLiked = list.slice().sort((a, b) => b.likes - a.likes)[0];
    const data = { map: P, list, mostLiked: mostLiked && mostLiked.likes ? mostLiked.uid : null };
    Points._cache = { stamp: Points.stamp(), data }; return data;
  },
  stamp() { return [Attend.on(), Store.users, Store.posts, Store.attendance, Store.assess].map(x => JSON.stringify(x || {}).length).join('|'); },
  groups() { const t = Points.table(); const G = {}; Groups.list().forEach(g => { G[g] = { g, pts: 0, n: 0 }; }); Object.keys(t.map).forEach(u => { const g = Groups.assignedOf(u) || (Store.users[u] && +Store.users[u].group); if (g && G[g]) { G[g].pts += t.map[u].pts; G[g].n++; } }); return Object.values(G).filter(x => x.n).sort((a, b) => b.pts - a.pts); },
  badges(uid) { const t = Points.table(); const x = t.map[uid]; if (!x) return []; const out = [];
    if (x.first) out.push(['⚡', 'أول مشارك', 'كنت أول من شارك في ' + x.first + ' تمرين']); if (t.mostLiked === uid) out.push(['💖', 'الأكثر إعجابًا', x.likes + ' إعجاب على مشاركاتك']);
    if (Attend.on() && x.att >= Attend.cfg().days) out.push(['📍', 'حضور كامل', 'حضرت كل أيام البرنامج']); if (Progress.forUser(uid).pct >= BADGE_THRESHOLD) out.push(['🏅', 'مشارك نشط', 'أنجزت 80% من التمارين']); if (x.as === 2) out.push(['🧠', 'قياس كامل', 'أكملت التقييمين القبلي والبعدي']);
    const rank = t.list.findIndex(y => y.uid === uid); if (rank > -1 && rank < 3 && x.pts) out.push([['🥇', '🥈', '🥉'][rank], 'من الثلاثة الأوائل', 'المركز ' + (rank + 1) + ' في لوحة الصدارة']); return out; }
};
function leaderboardHtml(limit = 10) {
  const c = Points.cfg(); const t = Points.table(); const gs = Points.groups(); const me = Me.uid();
  const ind = t.list.filter(x => x.pts).slice(0, limit);
  return '<div class="lb-grid"><div class="card pad"><h3>🏆 المتصدرون</h3>' + (ind.length ? ind.map((x, i) => '<div class="lb-row ' + (x.uid === me ? 'mine' : '') + '"><span class="lb-rank num">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><span class="grow">' + (c.names || x.uid === me ? h((Store.users[x.uid] || {}).name || '') : 'مشارك ' + (i + 1)) + '</span><b class="num">' + x.pts + '</b></div>').join('') : '<div class="muted">لا نقاط بعد — شارك في التمارين لتظهر هنا.</div>') + '</div>' +
    '<div class="card pad"><h3>👥 المجموعات</h3>' + (gs.length ? gs.map((x, i) => '<div class="lb-row ' + (Me.group() === x.g ? 'mine' : '') + '"><span class="lb-rank num">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><span class="grow">' + h(Groups.label(x.g)) + ' <span class="muted num">(' + x.n + ')</span></span><b class="num">' + x.pts + '</b></div>').join('') : '<div class="muted">تظهر عند اختيار المتدربين مجموعاتهم.</div>') + '</div></div>' +
    '<div class="muted" style="font-family:var(--f-ui);font-size:12.5px;margin-top:8px">النقاط: 10 لكل تمرين · 15 لكل محاكاة · 2 لكل إعجاب تتلقاه · 5 لأول مشارك في تمرين ' + (Attend.on() ? '· 20 لكل يوم حضور ' : '') + '· 15 لكل تقييم (قبلي/بعدي)</div>';
}

// ================= المتابعة بعد البرنامج (30 / 60 / 90 يومًا) =================
const FU_DAYS = ['30', '60', '90'];
const FU_ACTIONS = ['دقّقت رحلة المستخدم في تطبيق أو متجر وحددت نقاط الاحتكاك', 'أزلت خطوة أو معلومة كانت تربك المستخدم', 'صممت رسالة داخل التطبيق مرتبطة بسلوك وتوقيت محددين', 'حسّنت بنية التطبيق أو صفحة المنتج أو مسار التنقل', 'أزلت مفاجأة من مرحلة الدفع أو أضفت ما يطمئن المستخدم', 'بدأت متابعة مؤشرات الرحلة والتحويل أسبوعيًا', 'اختبرت تغييرًا واحدًا بفرضية ومؤشر واضحين', 'استخدمت الذكاء الاصطناعي في مهمة مع مراجعة بشرية']
const FU_SALES = ['انخفضت', 'لم تتغير', 'زادت حتى 10%', 'زادت 10% – 30%', 'زادت أكثر من 30%', 'لا أستطيع التقدير بعد'];
const Followup = {
  cfg() { return Object.assign({ open: {} }, (Store.site && Store.site.followup) || {}); },
  endDate() { const e = Cohort.cur().end; return e ? new Date(e + 'T00:00:00').getTime() : null; },
  due(n) { const e = Followup.endDate(); return e ? e + (+n) * 86400000 : null; },
  isOpen(n) { const f = Followup.cfg().open[n]; if (f === 'open') return true; if (f === 'closed') return false; const d = Followup.due(n); return !!(d && DB.now() >= d); },
  rec(n, uid) { return (((Store.followups || {})['d' + n]) || {})[uid] || null; },
  list(n) { const o = (Store.followups || {})['d' + n] || {}; return Object.keys(o).map(u => Object.assign({ uid: u }, o[u])); },
  link(n) { return location.origin + location.pathname + '#v=followup&id=' + n; }
};
Views.followup = {
  html() {
    const n = FU_DAYS.indexOf(Router.cur.id) > -1 ? Router.cur.id : '30';
    let out = Layout.crumbs('<span class="crumb-tag">متابعة الأثر</span>') + '<div class="ex-head"><div class="ico">📈</div><div><h1>متابعة ما بعد البرنامج — بعد <span class="num">' + n + '</span> يومًا</h1><div class="muted" style="font-family:var(--f-ui)">دقيقتان تساعدان الجهة المنظمة على قياس أثر البرنامج وتطويره.</div></div></div>';
    if (!Me.isReg()) return out + '<div class="answer-box"><div class="locked-note">🔒 سجّل الدخول برقم العضوية لتعبئة المتابعة.</div><button class="btn btn-mint" data-act="member-login">الدخول برقم العضوية</button></div>';
    if (!Followup.isOpen(n) && !Admin.ctl()) return out + '<div class="empty">⏳ هذه المتابعة تُفتح ' + (Followup.due(n) ? 'في ' + fmtDate(Followup.due(n)) : 'بعد انتهاء البرنامج') + '.</div>';
    const r = Followup.rec(n, Me.uid()) || {}; const acts = arr(r.actions);
    return out + '<div class="answer-box"><div class="field"><label>ما الذي طبقته من البرنامج حتى الآن؟ (اختر كل ما ينطبق)</label><div class="lead-progs">' + FU_ACTIONS.map((a, i) => '<label class="lead-prog"><input type="checkbox" data-fu-a="' + i + '" ' + (acts.indexOf(a) > -1 ? 'checked' : '') + '><span>' + h(a) + '</span></label>').join('') + '</div></div>' +
      '<div class="grid2"><div class="field"><label>تغير المبيعات الإلكترونية منذ البرنامج</label><select id="fuSales"><option value="">— اختر —</option>' + FU_SALES.map(x => '<option ' + (x === r.sales ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div><div class="field"><label>فائدة البرنامج لعملك حتى الآن</label><select id="fuUse"><option value="">— اختر —</option>' + [5, 4, 3, 2, 1].map(x => '<option value="' + x + '" ' + (+r.useful === x ? 'selected' : '') + '>' + '★'.repeat(x) + ' (' + x + ')</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>أهم نتيجة أو قصة نجاح صغيرة حققتها</label><textarea id="fuWin" data-keep="fu-win">' + h(r.win || '') + '</textarea></div><div class="field"><label>ما العقبة التي تحتاج دعمًا فيها؟</label><textarea id="fuNeed" data-keep="fu-need">' + h(r.need || '') + '</textarea></div>' +
      '<div class="save-row"><button class="btn btn-primary" data-act="fu-save" data-n="' + n + '">📤 إرسال المتابعة</button>' + (r.ts ? '<span class="status-note">✅ أُرسلت ' + ago(r.ts) + ' — يمكنك التحديث</span>' : '') + '</div></div>';
  }
};
function followupCardsHtml() {
  if (!Me.isReg()) return '';
  const open = FU_DAYS.filter(n => Followup.isOpen(n)); if (!open.length) return '';
  return '<div class="fu-cards">' + open.map(n => { const r = Followup.rec(n, Me.uid()); return '<button class="act-card" data-go="followup" data-id="' + n + '"><div class="act-ico">📈</div><div class="grow"><h3>متابعة بعد <span class="num">' + n + '</span> يومًا</h3><div class="muted" style="font-size:13px;font-family:var(--f-ui)">' + (r ? '✅ أرسلتها — يمكنك التحديث' : 'دقيقتان لقياس ما طبقته من البرنامج') + '</div></div></button>'; }).join('') + '</div>';
}
function followupMailto(n) {
  const users = Store.users || {}; const done = Followup.list(n).map(x => x.uid);
  const emails = Object.keys(users).filter(u => done.indexOf(u) === -1 && users[u].consent && users[u].consent.followup).map(u => RegFields.val(users[u], 'email')).filter(e => /@/.test(e));
  if (!emails.length) { UI.alert('لا توجد عناوين بريد لمتدربين وافقوا على المتابعة ولم يرسلوها بعد.'); return; }
  const subj = 'متابعة ' + n + ' يومًا — ' + Content.courseTitle();
  const body = 'مرحبًا،\n\nمرّ ' + n + ' يومًا على برنامج «' + Content.courseTitle() + '». يسعدنا معرفة ما طبقته في عملك عبر نموذج قصير (دقيقتان):\n' + Followup.link(n) + '\n\nادخل برقم عضويتك إن طُلب منك.\n\nمع التحية';
  const chunk = emails.slice(0, 45);
  location.href = 'mailto:?bcc=' + encodeURIComponent(chunk.join(',')) + '&subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  if (emails.length > chunk.length) UI.toast('فُتحت رسالة لأول ' + chunk.length + ' عنوانًا — كرر الإرسال بعد تسجيل ردودهم أو صدّر القائمة.', 5000);
}
