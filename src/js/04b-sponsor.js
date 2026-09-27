// ---------------------------------------------------------------------
// ميزات الجهة الراعية: الاهتمام ببرامج الدعم، رابط المشرف، الدفعات، والتسميات الإنجليزية للتقرير
// ---------------------------------------------------------------------
// لا جهة راعية افتراضيًا في هذا المشروع: نموذج الاهتمام ببرامج الدعم يظهر فقط إذا أضاف المدرب برامج من لوحة الإدارة
const DEFAULT_LEADS = {
  axis: '',
  intro: 'هل ترغب في أن يتواصل معك فريق الجهة الراعية بخصوص برنامج دعم يناسب احتياجك؟ اختر ما يهمك، وسنرفع اهتمامك إلى الجهة المنظمة.',
  consent: 'أوافق على مشاركة بياناتي واهتماماتي مع الجهة الراعية للتواصل معي بخصوص البرامج المختارة',
  programs: []
};
const Leads = {
  on() { return Leads.cfg().programs.length > 0; },
  cfg() { const c = Object.assign({}, DEFAULT_LEADS, (Store.site && Store.site.leads) || {}); c.programs = arr(c.programs); return c; },
  list() { const o = Store.leads || {}; return Object.keys(o).filter(u => o[u] && arr(o[u].programs).length).map(u => Object.assign({ uid: u }, o[u], { programs: arr(o[u].programs) })); },
  byProgram(list) { const c = {}; (list || Leads.list()).forEach(l => l.programs.forEach(p => { c[p] = (c[p] || 0) + 1; })); return c; }
};
function leadFormHtml(where) {
  const c = Leads.cfg(); if (!c.programs.length) return '';
  const head = '<div class="lead-box"><div class="lead-head"><span class="lead-ico">🤝</span><div><h3>مهتم ببرامج الدعم؟</h3><p>' + h(c.intro) + '</p></div></div>';
  if (!Me.isReg()) return head + '<div class="locked-note">🔒 للمسجلين فقط</div></div>';
  const cur = (Store.leads || {})[Me.uid()]; const editing = UIState.editing['lead'];
  if (cur && arr(cur.programs).length && !editing) return head + '<div class="lead-done">✅ سُجّل اهتمامك بـ: <b>' + arr(cur.programs).map(h).join('، ') + '</b><div class="muted" style="font-size:12.5px">' + ago(cur.ts || 0) + ' · وسيلة التواصل: ' + h(cur.method || '') + ' ' + h(cur.contact || '') + '</div><div class="row" style="margin-top:8px"><button class="btn btn-soft btn-xs" data-act="lead-edit">✏️ تعديل</button><button class="btn btn-ghost btn-xs" data-act="lead-withdraw">سحب الاهتمام</button></div></div></div>';
  const u = Store.users[Me.uid()] || {}; const email = RegFields.val(u, 'email'), phone = RegFields.val(u, 'phone');
  const sel = arr(cur && cur.programs);
  return head + '<div class="lead-progs">' + c.programs.map((p, i) => '<label class="lead-prog"><input type="checkbox" data-lead-p="' + i + '" ' + (sel.indexOf(p) > -1 ? 'checked' : '') + '><span>' + h(p) + '</span></label>').join('') + '</div>' +
    '<div class="field"><label>ما احتياجك باختصار؟ (اختياري)</label><textarea id="leadNeed_' + where + '" data-keep="lead-need-' + where + '" rows="2" placeholder="مثال: تمويل مخزون موسم رمضان، أو دخول السوق السعودي">' + h((cur && cur.need) || '') + '</textarea></div>' +
    '<div class="grid2"><div class="field"><label>وسيلة التواصل المفضلة</label><select id="leadMethod_' + where + '"><option>هاتف</option><option ' + ((cur && cur.method) === 'واتساب' ? 'selected' : '') + '>واتساب</option><option ' + ((cur && cur.method) === 'بريد إلكتروني' ? 'selected' : '') + '>بريد إلكتروني</option></select></div><div class="field"><label>رقم الهاتف أو البريد</label><input id="leadContact_' + where + '" data-keep="lead-contact-' + where + '" value="' + h((cur && cur.contact) || phone || email || '') + '"></div></div>' +
    '<label class="consent"><input type="checkbox" id="leadConsent_' + where + '"> <span>' + h(c.consent) + '</span></label><button class="btn btn-primary btn-sm" data-act="lead-save" data-w="' + where + '">🤝 أرسل اهتمامي</button></div>';
}

// ---------- رابط المشرف (قراءة فقط) ----------
// الرمز محفوظ في عقدة secure (للمدرب فقط). المشرف لا يقرأ البيانات الخام؛ يقرأ لقطة جاهزة ينشرها المدرب في monitorData/<الرمز>
const Monitor = {
  cfg() { return Object.assign({ enabled: false, token: '' }, (Store.secure && Store.secure.monitor) || {}); },
  _last: '',
  async publish(force) {
    const c = Monitor.cfg(); if (!Admin.ok() || !c.enabled || !c.token || !App.dataReady) return;
    let html = ''; try { html = monitorBody(); } catch (e) { console.warn(e); return; }
    if (!force && html === Monitor._last) return; Monitor._last = html;
    try { await DB.set('monitorData/' + c.token, { html, ts: DB.now() }, { quiet: true }); } catch (e) { console.warn('monitor publish', e); }
  }, url() { const c = Monitor.cfg(); return location.origin + location.pathname + '#v=monitor&id=' + encodeURIComponent(c.token); } };

// ---------- الدفعات ----------
const Cohort = {
  cur() { return Object.assign({ name: 'الدفعة الأولى', start: '', end: '' }, Store.cohortCfg || {}); },
  list() { const o = Store.cohortIndex || {}; return Object.keys(o).map(k => Object.assign({ id: k }, o[k])).sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0)); }
};

// ---------- ربط أسئلة التقييم بالمحاور (للتوصيات الآلية) ----------
const ASSESS_AXIS = ['a1', 'a4', 'a6', 'a7', 'a9', 'a12', 'a11', 'a13', 'a15', 'a16'];

// ---------- تسميات إنجليزية للتقرير المؤسسي ----------
const EN = {
  course: 'Mobile Commerce Transformation',
  axes: {}, // تُعرض العناوين العربية في التقرير الإنجليزي ما لم تُضف ترجمة هنا (a1: '...')
  assess: ['Why interested users leave', 'Timing of in-app messages', 'Reach vs engagement vs conversion', 'App structure vs visual design', 'Reading the funnel drop-off', 'Last-minute checkout surprises', 'Ease of use vs trust', 'Reading metrics in context', 'One change at a time', 'Human review of AI output'],
  rates: ['Trainer knowledge & delivery', 'Content clarity & structure', 'Practical value for my work', 'Exercises & interactive activities', 'Relevance to mobile apps & stores', 'Interactive platform & usability', 'Organisation & time management'],
  fields: { sector: 'Business sector', stage: 'Business stage', hasStore: 'Online sales channel', onlineSales: 'Share of online sales' },
  programs: []
};
const EN_OPTIONS = {
  'تجزئة ومنتجات استهلاكية': 'Retail & consumer goods', 'أغذية ومشروبات': 'Food & beverage', 'أزياء وعطور ومستحضرات': 'Fashion, fragrance & cosmetics', 'خدمات وحجوزات': 'Services & bookings', 'تقنية ومنتجات رقمية': 'Tech & digital products', 'صناعة وتوريد (B2B)': 'Manufacturing & supply (B2B)', 'أخرى': 'Other',
  'فكرة لم تنطلق بعد': 'Idea stage', 'مشروع قائم دون بيع إلكتروني': 'Operating, no online sales', 'بدأت البيع إلكترونيًا منذ أقل من سنة': 'Selling online < 1 year', 'متجر إلكتروني قائم يسعى للتوسع': 'Established store seeking scale',
  'متجر إلكتروني خاص': 'Own online store', 'سوق إلكتروني (مثل Noon أو سنونو)': 'Marketplace (e.g. Noon, Snoonu)', 'وسائل التواصل وواتساب فقط': 'Social media & WhatsApp only', 'أكثر من قناة': 'Multiple channels', 'لا يوجد بعد': 'None yet',
  'لا توجد مبيعات إلكترونية': 'No online sales', 'أقل من 10%': '< 10%', '10% – 30%': '10% – 30%', '30% – 60%': '30% – 60%', 'أكثر من 60%': '> 60%'
};
function enOpt(v) { return EN_OPTIONS[v] || v; }
