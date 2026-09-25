// ---------------------------------------------------------------------
// لوحة الأدمن — شاشة واحدة متصلة + نماذج الإنشاء/التعديل
// ---------------------------------------------------------------------
const Bell = {
  events() {
    const ev = [];
    Object.keys(Store.users || {}).forEach(u => { const x = Store.users[u]; if (x && x.ts) ev.push({ ts: x.ts, html: '🆕 <b>' + h(x.name) + '</b> سجّل في البرنامج' }); });
    Object.keys(Store.posts || {}).forEach(exId => { const ps = Store.posts[exId] || {}; const t = Content.exTitle(exId); Object.keys(ps).forEach(k => { const p = ps[k]; if (p && p.ts) ev.push({ ts: p.ts, html: '✍️ <b>' + h(k.charAt(0) === 'g' && p.group ? Groups.label(p.group) + ' (' + (p.name || '') + ')' : (p.name || 'مشارك')) + '</b> شارك في «' + h(t) + '»' }); }); });
    Object.keys(Store.labAnswers || {}).forEach(g => { const ga = Store.labAnswers[g] || {}; Object.keys(ga).forEach(s => { const a = ga[s]; if (a && a.ts) ev.push({ ts: a.ts, html: '🧪 <b>' + h(Groups.label(+g.slice(1))) + '</b> حفظت مرحلة في المختبر الختامي' }); }); });
    return ev.sort((a, b) => b.ts - a.ts).slice(0, 80);
  },
  seen() { return +(SafeLS.get('mc_bell_seen') || 0); }, // تفضيل عرض محلي على جهاز المدرّب فقط
  html() {
    const ev = Bell.events(); const seen = Bell.seen(); const unread = ev.filter(e => e.ts > seen).length;
    return '<div class="bell-wrap"><button class="icon-btn" data-act="bell" title="الإشعارات">' + iconSvg('bell', 19) + (unread ? '<span class="bell-dot num">' + (unread > 99 ? '99+' : unread) + '</span>' : '') + '</button>' +
      (UIState.bellOpen ? '<div class="bell-menu">' + (ev.length ? ev.map(e => '<div class="bell-item ' + (e.ts > seen ? 'unread' : '') + '"><div class="grow">' + e.html + '<div class="t">' + ago(e.ts) + '</div></div></div>').join('') : '<div class="empty">لا توجد إشعارات بعد.</div>') + '</div>' : '') + '</div>';
  }
};
function adminHeader(title) {
  return '<div class="admin-top"><h1>' + h(title) + '</h1>' + Bell.html() + '<button class="btn btn-ghost btn-sm" data-go="home">🌐 عرض الموقع</button><button class="btn btn-danger btn-sm" data-act="admin-exit">خروج من الإدارة</button></div>';
}
function band(title, color, extra = '') { return '<div class="admin-band" style="--bc:' + color + '"><span class="bar"></span><h2>' + h(title) + '</h2><span class="grow"></span>' + extra + '</div>'; }
function tool(key, icon, color, title, body, foot, cls = '') {
  return '<div class="tool ' + cls + '" data-tool="' + key + '"><div class="th"><span class="ti" style="background:' + tint(color, .14) + ';color:' + color + '">' + icon + '</span><h4>' + h(title) + '</h4></div><div class="tb">' + body + '</div><div class="tf">' + foot + '</div></div>';
}
function drop(key, inner) { return UIState.openDrop.has(key) ? '<div class="tool-drop" data-drop="' + key + '">' + inner + '</div>' : ''; }
function tags(x) { return (x._added ? '<span class="tag added">مضاف</span> ' : '') + (x._modified ? '<span class="tag mod">معدَّل</span> ' : '') + (x._hidden ? '<span class="tag hid">مخفي</span> ' : '') + (x._disabled ? '<span class="tag off">معطّل</span> ' : ''); }

function exSummary(e) {
  const ps = Store.posts[e.id] || {}; const keys = Object.keys(ps).filter(k => ps[k]).sort((a, b) => (ps[b].ts || 0) - (ps[a].ts || 0));
  if (!keys.length) return '<div class="summary">لا مشاركات بعد.</div>';
  const reveal = isRevealed(e);
  return '<div class="summary"><b class="num">' + keys.length + '</b> مشاركة' + (e.format !== 'text' ? ' · ' + (reveal ? '🔓 مكشوفة' : '🔒 غير مكشوفة') : '') +
    keys.slice(0, 30).map(k => { const p = ps[k]; const who = k.charAt(0) === 'g' && e.mode === 'group' ? Groups.label(+k.slice(1)) : (p.name || 'مشارك');
      let brief = '';
      if (e.format === 'text') brief = h(String(p.text || '').slice(0, 140)) + (String(p.text || '').length > 140 ? '…' : '');
      else { const a = ansList(p.answers, e.items.length); let sc = 0; e.items.forEach((it, i) => { const v = a[i]; if (v == null) return; if (e.format === 'mcq' ? +v === +it.answer : e.format === 'truefalse' ? ((v === true || v === 'true') === !!it.answer) : v === it.answer) sc++; }); brief = 'الصحيح: ' + sc + ' من ' + e.items.length; }
      return '<div class="it"><b>' + h(who) + ':</b><span class="grow">' + brief + '</span><button class="del-btn" data-act="del-post" data-ex="' + h(e.id) + '" data-k="' + h(k) + '" title="حذف هذه المشاركة وحدها">🗑</button></div>'; }).join('') + '</div>';
}
function exRow(e, o = {}) {
  const isDef = !!DEF_EX[e.id];
  return '<div class="ex-row"><div class="top"><span style="font-size:18px">' + h(e.icon || '✍️') + '</span><span class="nm">' + h(e.title) + ' ' + tags(e) + '<span class="tag fmt">' + h(FORMATS[e.format] || '') + ' · ' + (e.mode === 'group' ? 'جماعي' : 'فردي') + '</span></span>' +
    '<button class="btn btn-soft btn-xs" data-go="' + (o.kind === 'activity' || o.kind === 'survey' ? 'actEdit' : 'exEdit') + '" data-id="' + h(e.id) + '"' + (o.axis ? ' data-axis="' + h(o.axis) + '"' : '') + '>✏️ تعديل</button>' +
    '<button class="btn btn-ghost btn-xs" data-act="toggle-vis" data-id="' + h(e.id) + '">' + (e._hidden ? '👁 إظهار' : '🙈 إخفاء') + '</button>' +
    (o.kind !== 'survey' ? '<button class="btn btn-ghost btn-xs" data-act="copy-ex" data-id="' + h(e.id) + '">🧬 نسخ</button>' : '') +
    (isDef ? (e._modified ? '<button class="btn btn-ghost btn-xs" data-act="reset-ex" data-id="' + h(e.id) + '">↺ استرجاع الافتراضي</button>' : '') : '<button class="btn btn-danger btn-xs" data-act="delete-ex" data-id="' + h(e.id) + '">🗑 حذف نهائي</button>') +
    '<button class="btn btn-danger btn-xs" data-act="clear-posts" data-id="' + h(e.id) + '">🧹 مسح المشاركات</button>' +
    (e.format !== 'text' ? '<button class="btn btn-mint btn-xs" data-act="reveal" data-id="' + h(e.id) + '">' + (isRevealed(e) ? '🔒 إخفاء الإجابات' : '🔓 كشف الإجابات الصحيحة') + '</button>' : '') +
    '</div>' + exSummary(e) + '</div>';
}

Views.admin = {
  html() {
    const users = Store.users || {}; const uids = Object.keys(users).sort((a, b) => (users[a].ts || 0) - (users[b].ts || 0));
    const ach = Progress.achievers(); const s = Content.site(); const pdf = Content.pdf();
    let out = adminHeader('لوحة الإدارة');
    // ---- إدارة المسجلين ----
    out += band('إدارة المسجلين', '#0093A8') + '<div class="tools-grid">';
    out += tool('users', '👥', '#0093A8', 'المسجّلون', '<div class="bigno num">' + uids.length + '</div>اسم مسجّل في قاعدة البيانات', '<button class="btn btn-soft btn-xs" data-act="drop" data-k="users">' + (UIState.openDrop.has('users') ? 'إخفاء' : 'عرض') + ' القائمة</button><button class="btn btn-danger btn-xs" data-act="clear-names">مسح أسماء المسجّلين فقط</button>');
    out += drop('users', '<div class="field"><input data-keep="users-search" data-filter=".person" placeholder="🔍 بحث بالاسم…"></div><div class="people-list">' + (uids.length ? uids.map(u => '<div class="person" data-name="' + h((users[u].name || '').toLowerCase()) + '"><span class="nm">' + h(users[u].name) + '</span><span class="muted">' + h(users[u].role || '') + '</span><span class="pill num">#' + pad4(users[u].member || 0) + '</span><span class="muted">' + fmtDate(users[u].ts) + '</span></div>').join('') : '<div class="empty">لا يوجد مسجّلون.</div>') + '</div>');
    out += tool('groups', '🧩', '#00A653', 'إدارة المجموعات', '<div class="row"><input type="number" min="2" max="30" id="grpCount" data-keep="grp-count" value="' + Groups.count() + '" style="width:80px;border:1px solid var(--line);border-radius:10px;padding:6px 8px"><button class="btn btn-soft btn-xs" data-act="save-groups">حفظ العدد</button></div><div style="margin-top:6px">عدد المجموعات (2–30). التوزيع اليدوي إرشادي لا إلزامي.</div>', '<button class="btn btn-primary btn-xs" data-act="assign-open">🧭 توزيع</button>');
    out += tool('preview', '👀', '#3B4677', 'معاينة كمتدرب', 'اعرض الصفحة الرئيسية تمامًا كما يراها المتدرب، مع زر عائم للعودة.', '<button class="btn btn-soft btn-xs" data-act="preview">فتح المعاينة</button>');
    out += tool('congrats', '🏆', '#F58220', 'تهنئة الإنجاز', '<div class="bigno num">' + ach.length + '</div>متدرب بلغ <span class="num">80%</span> إجمالًا', '<button class="btn btn-soft btn-xs" data-act="drop" data-k="ach">الأسماء</button><button class="btn btn-soft btn-xs" data-act="congrats-preview">معاينة</button><button class="btn btn-ghost btn-xs" data-act="drop" data-k="congEdit">تعديل المحتوى</button>');
    out += drop('ach', ach.length ? '<div class="people-list">' + ach.map(u => '<div class="person"><span class="nm">🏆 ' + h(u.name) + '</span><span class="muted">' + h(u.role || '') + '</span></div>').join('') + '</div>' : '<div class="empty">لم يبلغ أحد 80% بعد.</div>');
    out += drop('congEdit', Views.admin.congratsEditor());
    out += tool('broadcast', '📣', '#F58220', 'بث رسالة مباشرة', '<textarea id="bcText" data-keep="bc-text" rows="2" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-family:var(--f-body)" placeholder="رسالة تظهر كشريط أعلى الصفحة لكل المتصفحين الآن"></textarea>' + (Store.broadcast && Store.broadcast.text ? '<div class="muted" style="margin-top:4px">الحالية: ' + h(Store.broadcast.text) + '</div>' : ''), '<button class="btn btn-primary btn-xs" data-act="bc-send">إرسال</button>' + (Store.broadcast && Store.broadcast.text ? '<button class="btn btn-ghost btn-xs" data-act="bc-stop">إيقاف البث</button>' : ''));
    out += '</div>';
    // ---- التصدير والنسخ ----
    out += band('التصدير والنسخ', '#00A653') + '<div class="tools-grid">';
    out += tool('pdf', '📄', '#00827F', 'ملف المحتوى PDF', 'A5 مصمَّم: أغلفة، فهرس، وشرائح كل محور. ' + (pdf.enabled === false ? '<span class="tag off">معطّل للمتدربين</span>' : '<span class="tag added">متاح للمتدربين</span>'), '<button class="btn btn-soft btn-xs" data-act="drop" data-k="pdfEdit">بيانات الملف</button><button class="btn btn-primary btn-xs" data-act="content-pdf">معاينة الآن</button>');
    out += drop('pdfEdit', Views.admin.pdfEditor());
    out += tool('csv', '📊', '#00A653', 'تصدير المشاركات', 'كل إجابات المحاور والأنشطة والاستطلاع والمختبر في ملف CSV واحد يفتح في Excel.', '<button class="btn btn-primary btn-xs" data-act="export-csv">⬇️ تصدير CSV</button>');
    out += tool('person', '🗂️', '#3B4677', 'مشاركات فردية', 'ملف PDF وCSV لمشاركات كل متدرب على حدة، أو للجميع في ملف ZIP.', '<button class="btn btn-soft btn-xs" data-act="drop" data-k="persons">' + (UIState.openDrop.has('persons') ? 'إخفاء' : 'فتح') + ' القائمة</button>');
    out += drop('persons', '<div class="row" style="margin-bottom:10px"><input data-keep="persons-search" data-filter=".person" placeholder="🔍 بحث بالاسم…" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:10px;padding:8px 10px"><button class="btn btn-primary btn-xs" data-act="export-all-pdf">📦 تصدير الكل PDF</button><button class="btn btn-soft btn-xs" data-act="export-all-csv">📦 تصدير الكل CSV</button></div><div class="people-list">' + (uids.length ? uids.map(u => '<div class="person" data-name="' + h((users[u].name || '').toLowerCase()) + '"><span class="nm">' + h(users[u].name) + '</span><button class="btn btn-soft btn-xs" data-act="person-pdf" data-uid="' + h(u) + '">PDF</button><button class="btn btn-ghost btn-xs" data-act="person-csv" data-uid="' + h(u) + '">CSV</button></div>').join('') : '<div class="empty">لا يوجد مسجّلون.</div>') + '</div>');
    out += tool('backup', '💾', '#E8960C', 'النسخة الاحتياطية', 'كل تعديلات وإضافات المحتوى (بلا مشاركات المتدربين) في ملف JSON.', '<button class="btn btn-soft btn-xs" data-act="backup">⬇️ تنزيل</button><label class="btn btn-ghost btn-xs">⬆️ استيراد<input type="file" accept="application/json,.json" hidden data-act-change="import-backup"></label>');
    out += '</div>';
    // ---- واجهة الصفحة الرئيسية (أكورديون مضمَّن) ----
    out += band('واجهة الصفحة الرئيسية', '#F58220');
    const accH = UIState.openAcc.has('home-ui');
    out += '<div class="acc ' + (accH ? 'open' : '') + '" style="--ac:#F58220;--acg:' + tint('#F58220', .08) + '"><div class="acc-head" data-act="acc" data-k="home-ui"><span class="aico">' + iconSvg('home', 20, '#fff') + '</span><h3>تعديل الشريط العلوي والقسم البارز والتذييل وعدد المسجّلين</h3><span class="arrow">◀</span></div><div class="acc-body">' + (accH ? Views.admin.homeEditor() : '') + '</div></div>';
    // ---- المحاور والتمارين ----
    out += band('المحاور والتمارين', '#F58220', '<button class="btn btn-primary btn-sm" data-go="axisEdit" data-id="new">➕ إضافة محور جديد</button><button class="btn btn-soft btn-sm" data-go="actEdit" data-id="new">➕ إضافة نشاط جديد</button>');
    out += '<p class="muted" style="font-family:var(--f-ui);font-size:13px;margin:-4px 0 10px">اسحب المحاور من المقبض ⠿ لإعادة ترتيبها. اضغط عنوان المحور لعرض تمارينه.</p><div id="axisAcc">';
    Content.axes({ all: true }).forEach(a => {
      const col = Content.color(a); const open = UIState.openAcc.has(a.id); const isDef = !!DEF_AXIS[a.id];
      const exs = Content.exercisesOf(a.id, { all: true });
      out += '<div class="acc ' + (open ? 'open' : '') + '" draggable="true" data-axis-drag="' + h(a.id) + '" style="--ac:' + col + ';--acg:' + tint(col, .08) + '"><div class="acc-head" data-act="acc" data-k="' + h(a.id) + '"><span class="drag-handle" title="اسحب لإعادة الترتيب">⠿</span><span class="aico">' + iconSvg(a.icon || 'star', 20, '#fff') + '</span><h3>' + h(a.title) + ' <span class="muted" style="font-weight:500;font-size:12.5px">· ' + h(UNIT_NAMES[a.unit] || 'محور مضاف') + ' · <span class="num">' + exs.length + '</span> تمرين</span> ' + tags(a) + '</h3>' +
        '<div class="acc-actions"><button class="btn btn-soft btn-xs" data-go="axisEdit" data-id="' + h(a.id) + '">✏️ تعديل</button><button class="btn btn-ghost btn-xs" data-act="toggle-vis" data-id="' + h(a.id) + '">' + (a._hidden ? '👁 إظهار' : '🙈 إخفاء') + '</button><button class="btn btn-ghost btn-xs" data-act="toggle-en" data-id="' + h(a.id) + '">' + (a._disabled ? '⏸ معطّل ⇄ تفعيل' : '✅ مفعّل ⇄ تعطيل') + '</button><button class="btn btn-ghost btn-xs" data-act="copy-axis" data-id="' + h(a.id) + '">🧬 نسخ</button>' +
        (isDef ? (a._modified ? '<button class="btn btn-ghost btn-xs" data-act="reset-axis" data-id="' + h(a.id) + '">↺ استرجاع الافتراضي</button>' : '') : '<button class="btn btn-danger btn-xs" data-act="delete-axis" data-id="' + h(a.id) + '">🗑 حذف نهائي</button>') + '</div><span class="arrow">◀</span></div>' +
        '<div class="acc-body">' + (open ? (exs.length ? exs.map(e => exRow(e, { axis: a.id })).join('') : '<div class="empty">لا توجد تمارين.</div>') + '<div style="margin-top:10px"><button class="btn btn-soft btn-sm" data-go="exEdit" data-id="new" data-axis="' + h(a.id) + '">➕ أضف تمرينًا لهذا المحور</button></div>' : '') + '</div></div>';
    });
    out += '</div>';
    // ---- الأنشطة والاستطلاع الختامي ----
    out += band('الأنشطة والاستطلاع الختامي', '#3B4677');
    const openAct = UIState.openAcc.has('acts');
    out += '<div class="acc ' + (openAct ? 'open' : '') + '" style="--ac:#3B4677;--acg:' + tint('#3B4677', .08) + '"><div class="acc-head" data-act="acc" data-k="acts"><span class="aico">⚡</span><h3>قسم «أنشطة» <span class="muted num" style="font-size:12.5px">(' + Content.activities({ all: true }).length + ')</span></h3><span class="arrow">◀</span></div><div class="acc-body">' + (openAct ? Content.activities({ all: true }).map(e => exRow(e, { kind: 'activity' })).join('') : '') + '</div></div>';
    const sv = Content.survey({ all: true }); const openSv = UIState.openAcc.has('survey');
    out += '<div class="acc ' + (openSv ? 'open' : '') + '" style="--ac:#F58220;--acg:' + tint('#F58220', .08) + '"><div class="acc-head" data-act="acc" data-k="survey"><span class="aico">🎓</span><h3>ختام البرنامج — ' + h(sv.title) + ' ' + tags(sv) + '</h3><span class="arrow">◀</span></div><div class="acc-body">' + (openSv ? exRow(sv, { kind: 'survey' }) : '') + '</div></div>';
    // ---- إجراء إتلافي مستقل ----
    out += '<div class="tool danger-tool" style="margin-top:34px;min-height:0"><div class="th"><span class="ti" style="background:#FDECEC;color:#C62F35">⚠️</span><h4>إعادة ضبط شاملة — مسح جميع المدخلات من السيرفر</h4></div><div class="tb">يمسح كل مشاركات التمارين والأنشطة (عدا الاستطلاع الختامي)، ومؤقتات وإجابات المختبر، وقائمة المسجّلين والتعيينات، ويُلزم كل متصفح قديم بتسجيل اسم جديد. لا يمس المحتوى وتعديلاته.</div><div class="tf"><button class="btn btn-danger btn-sm" data-act="global-reset">مسح جميع المدخلات من السيرفر</button></div></div>';
    return out;
  },
  homeEditor() {
    const s = Content.site();
    const f = (k, label, ph = '') => '<div class="field"><label>' + label + '</label><input data-home="' + k + '" data-keep="home-' + k + '" value="' + h(s[k] || '') + '" placeholder="' + h(ph) + '"></div>';
    return '<div class="grid2">' + f('headerTitle', 'عنوان الشريط العلوي') + f('headerSub', 'الوصف الفرعي للشريط العلوي') + '</div>' + f('heroTitle', 'العنوان الرئيسي للقسم البارز') +
      '<div class="field"><label>وصف القسم البارز</label>' + RTE.html('heroDesc', s.heroDesc) + '</div>' +
      '<div class="field"><label>صورة الغلاف (اختيارية — تركها فارغة يُبقي الرسم التوليدي)</label>' + ImgPick.html('heroImage', s.heroImage) + '</div>' +
      '<div class="field"><label>عدد المسجّلين المعروض في «مسجّل حتى الآن»</label><div class="row"><input type="number" min="0" data-keep="home-reg" id="regCountIn" value="' + (Number(Store.registered) || 0) + '" style="width:140px;border:1px solid var(--line);border-radius:10px;padding:8px"><button class="btn btn-soft btn-xs" data-act="reg-set">حفظ الرقم</button><button class="btn btn-danger btn-xs" data-act="reg-zero">تصفير</button></div><span class="help">عدّاد مستقل يزيد تلقائيًا مع كل تسجيل جديد، ولا يتأثر بمسح قائمة الأسماء.</span></div>' +
      '<h4 style="margin:10px 0">التذييل (يظهر في كل الصفحات)</h4><div class="grid2">' + f('footerName', 'الاسم') + f('footerUrl', 'الرابط الشخصي') + '</div>' + f('footerBio', 'التعريف') +
      '<div class="grid2">' + f('linkedin', 'LinkedIn', 'رابط الحساب') + f('x', 'X / تويتر', 'رابط الحساب') + f('instagram', 'Instagram', 'رابط الحساب') + f('whatsapp', 'واتساب', 'رقم دولي مثل 9665xxxxxxxx') + f('email', 'البريد الإلكتروني', 'name@example.com') + '</div>' +
      '<div class="row"><button class="btn btn-primary btn-sm" data-act="home-save">💾 حفظ الواجهة</button><button class="btn btn-ghost btn-sm" data-act="home-reset">↺ استرجاع الافتراضي</button></div>';
  },
  congratsEditor() {
    const c = Content.congrats();
    return '<p class="help muted" style="font-family:var(--f-ui);font-size:12.5px">رموز الاستبدال المتاحة داخل أي فقرة: {{name}} و{{courseTitle}} و{{date}}</p><div class="grid2"><div class="field"><label>العنوان</label><input id="cgTitle" data-keep="cg-title" value="' + h(c.title) + '"></div><div class="field"><label>الرمز / الإيموجي</label><input id="cgEmoji" data-keep="cg-emoji" value="' + h(c.emoji) + '"></div></div>' +
      '<div class="field"><label>الفقرات</label><div id="cgParas">' + c.paragraphs.map((p, i) => '<div class="row" style="margin-bottom:6px"><textarea data-cg-para rows="2" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-family:var(--f-body)">' + h(p) + '</textarea><button class="btn btn-danger btn-xs" data-act="cg-del-para" data-i="' + i + '">🗑</button></div>').join('') + '</div><button class="btn btn-soft btn-xs" data-act="cg-add-para">➕ فقرة</button></div>' +
      '<div class="grid2"><div class="field"><label>تذييل يمين</label><input id="cgFR" data-keep="cg-fr" value="' + h(c.footerRight) + '"></div><div class="field"><label>تذييل يسار</label><input id="cgFL" data-keep="cg-fl" value="' + h(c.footerLeft) + '"></div></div>' +
      '<div class="field"><label>نص الإشعار أسفل التهنئة</label><textarea id="cgNotice" data-keep="cg-notice" rows="2">' + h(c.notice) + '</textarea></div><div class="row"><button class="btn btn-primary btn-sm" data-act="cg-save">💾 حفظ</button><button class="btn btn-ghost btn-sm" data-act="cg-reset">↺ استرجاع الافتراضي</button></div>';
  },
  pdfEditor() {
    const p = Content.pdf();
    const f = (k, l, ph = '') => '<div class="field"><label>' + l + '</label><input data-pdf="' + k + '" data-keep="pdf-' + k + '" value="' + h(p[k] || '') + '" placeholder="' + h(ph) + '"></div>';
    return '<label class="row" style="font-family:var(--f-ui);font-weight:700;margin-bottom:10px"><input type="checkbox" id="pdfEnabled" ' + (p.enabled !== false ? 'checked' : '') + '> إتاحة زر «استخراج المحتوى» للمتدربين</label>' +
      '<div class="grid2">' + f('coverTitle', 'عنوان الغلاف الأمامي', 'يُقرأ من عنوان الدورة إن تُرك فارغًا') + f('coverSub', 'وصف الغلاف الأمامي') + f('trainerName', 'اسم المدرّب (الغلاف الخلفي)') + f('trainerRole', 'المسمى') + '</div>' + f('trainerBio', 'نبذة') + f('trainerContact', 'وسيلة تواصل (اختيارية)') +
      '<button class="btn btn-primary btn-sm" data-act="pdf-save">💾 حفظ بيانات الملف</button>';
  },
  after(root) {
    RTE.mount(root); ImgPick.mount(root);
    // السحب والإفلات لترتيب المحاور
    let dragId = null;
    $$('[data-axis-drag]', root).forEach(el => {
      el.addEventListener('dragstart', e => { dragId = el.getAttribute('data-axis-drag'); el.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (er) {} });
      el.addEventListener('dragend', () => { el.classList.remove('dragging'); $$('.drop-target', root).forEach(x => x.classList.remove('drop-target')); });
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drop-target'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
      el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drop-target'); const target = el.getAttribute('data-axis-drag'); if (!dragId || dragId === target) return; const ids = Content.axisIds().filter(x => x !== dragId); ids.splice(ids.indexOf(target), 0, dragId); DB.set('order/axes', ids); UI.toast('تم حفظ الترتيب الجديد'); });
    });
    // أزرار ↑↓ بديلة للّمس
  }
};

// ============ نموذج المحور ============
const FormState = { slides: [], items: [], axisId: null, exId: null, format: 'text' };
function slideEditorHtml(s, i, n) {
  const k = 's' + i; const t = s.type || 'principle';
  let f = '<div class="slide-editor" data-se="' + i + '"><div class="se-head"><span class="pill num">' + (i + 1) + '</span><select data-sf="type" style="border:1px solid var(--line);border-radius:10px;padding:6px">' + Object.keys(SLIDE_TYPES).map(x => '<option value="' + x + '" ' + (x === t ? 'selected' : '') + '>' + SLIDE_TYPES[x] + '</option>').join('') + '</select><span class="grow"></span>' +
    '<button type="button" class="btn btn-ghost btn-xs" data-act="se-up" data-i="' + i + '" ' + (i === 0 ? 'disabled' : '') + '>↑</button><button type="button" class="btn btn-ghost btn-xs" data-act="se-down" data-i="' + i + '" ' + (i === n - 1 ? 'disabled' : '') + '>↓</button><button type="button" class="btn btn-danger btn-xs" data-act="se-del" data-i="' + i + '">🗑 حذف الشريحة</button></div>' +
    '<div class="field"><label>عنوان الشريحة</label><input data-sf="title" value="' + h(s.title || '') + '"></div>';
  if (t === 'opening' || t === 'summary') f += '<div class="field"><label>النص الرئيسي</label>' + RTE.html(k + 'text', s.text) + '</div><div class="field"><label>قاعدة تذكّرها</label>' + RTE.html(k + 'rule', s.rule) + '</div>';
  else if (t === 'principle') f += '<div class="field"><label>مقدمة المبدأ العلمي</label>' + RTE.html(k + 'intro', s.intro) + '</div><div class="field"><label>النقاط (سطر لكل نقطة)</label><textarea data-sf="points" rows="5">' + h(arr(s.points).join('\n')) + '</textarea><span class="help">المصطلح قبل «:» أو «—» يُبرز تلقائيًا.</span></div><div class="field"><label>جملة الربط / الرسالة</label>' + RTE.html(k + 'rule', s.rule) + '</div>';
  else f += '<div class="field"><label>' + (t === 'mistakes' ? 'الأخطاء وتصحيحاتها' : t === 'tools' ? 'الأدوات واستخداماتها' : 'الأمثلة') + ' (سطر لكل عنصر، بصيغة: العنوان :: التفصيل)</label><textarea data-sf="items" rows="5">' + h(arr(s.items).map(x => String(x).replace('::', ' :: ')).join('\n')) + '</textarea></div><div class="field"><label>الرسالة (اختيارية)</label>' + RTE.html(k + 'rule', s.rule) + '</div>';
  f += '<div class="field"><label>صورة الشريحة (اختيارية، تظهر أعلى محتواها)</label>' + ImgPick.html(k + 'img', s.image) + '</div>' +
    '<div class="grid2"><div class="field"><label>رابط مصدر للتوسع (اختياري)</label><input data-sf="srcUrl" value="' + h(s.srcUrl || '') + '" placeholder="https://"></div><div class="field"><label>نص الرابط</label><input data-sf="srcLabel" value="' + h(s.srcLabel || '') + '" placeholder="مصدر للتوسع"></div></div>' +
    '<div class="field"><label>رابط فيديو (يوتيوب أو Google Drive)</label><input data-sf="videoUrl" value="' + h(s.videoUrl || '') + '" placeholder="الصق رابط المشاركة كما هو"></div>' +
    (s.chart ? '<div class="notice" style="margin-top:0">📊 لهذه الشريحة رسم بياني مبني في الكود؛ يبقى كما هو ولا يُعدَّل من هنا.</div>' : '') + '</div>';
  return f;
}
function collectSlides(root) {
  return $$('[data-se]', root).map(box => {
    const i = +box.getAttribute('data-se'); const k = 's' + i; const old = FormState.slides[i] || {};
    const g = n => { const el = $('[data-sf="' + n + '"]', box); return el ? el.value : ''; };
    const t = g('type') || old.type; const s = { id: old.id || genId('sl'), type: t, title: g('title').trim() };
    if (t === 'opening' || t === 'summary') { s.text = RTE.val(box, k + 'text'); s.rule = RTE.val(box, k + 'rule'); }
    else if (t === 'principle') { s.intro = RTE.val(box, k + 'intro'); s.points = g('points').split('\n').map(x => x.trim()).filter(Boolean); s.rule = RTE.val(box, k + 'rule'); }
    else { s.items = g('items').split('\n').map(x => x.trim()).filter(Boolean).map(x => x.replace(/\s*::\s*/, '::')); s.rule = RTE.val(box, k + 'rule'); }
    // الحقول الخاصة بالأنواع الأخرى تُحفظ من الحالة القديمة عند تبديل النوع حتى لا تضيع
    ['text', 'intro', 'points', 'items', 'rule'].forEach(x => { if (s[x] === undefined && old[x] !== undefined) s[x] = old[x]; });
    s.image = ImgPick.val(k + 'img'); s.srcUrl = g('srcUrl').trim(); s.srcLabel = g('srcLabel').trim(); s.videoUrl = g('videoUrl').trim();
    if (old.chart) s.chart = old.chart;
    return s;
  });
}
Views.axisEdit = {
  html() {
    const id = Router.cur.id; const isNew = id === 'new'; const a = isNew ? { title: '', classic: '', desc: '', duration: '', highlights: [], icon: 'star', slides: [], unit: 0 } : Content.axis(id);
    if (!a) return adminHeader('تعديل محور') + '<div class="empty">المحور غير موجود.</div>';
    if (FormState.axisId !== id) { FormState.axisId = id; FormState.slides = isNew ? ['opening', 'principle', 'examples', 'mistakes', 'tools', 'summary'].map(t => ({ type: t, title: '' })) : a.slides.map(s => Object.assign({}, s)); }
    const col = isNew ? AXIS_COLORS[Content.axisIds().length % AXIS_COLORS.length] : Content.color(a);
    let out = adminHeader(isNew ? '➕ محور جديد' : '✏️ تعديل المحور') + Layout.crumbs() + '<div class="form-page" style="--ac:' + col + '">' +
      '<div class="card pad"><div class="grid2"><div class="field"><label>العنوان (الإبداعي)</label><input id="axTitle" data-keep="ax-title" value="' + h(a.title) + '"></div><div class="field"><label>العنوان التقليدي (اختياري)</label><input id="axClassic" data-keep="ax-classic" value="' + h(a.classic || '') + '"></div></div>' +
      '<div class="field"><label>الوصف</label>' + RTE.html('axDesc', a.desc) + '</div>' +
      '<div class="grid2"><div class="field"><label>المدة</label><input id="axDur" data-keep="ax-dur" value="' + h(a.duration || '') + '" placeholder="مثال: 90 دقيقة"></div><div class="field"><label>الأيقونة</label><select id="axIcon">' + AXIS_ICON_CHOICES.map(x => '<option value="' + x + '" ' + (x === a.icon ? 'selected' : '') + '>' + x + '</option>').join('') + '</select><span id="axIconPrev" style="display:inline-flex;margin-top:6px;width:44px;height:44px;border-radius:12px;background:' + col + ';align-items:center;justify-content:center">' + iconSvg(a.icon || 'star', 24, '#fff') + '</span></div></div>' +
      '<div class="field"><label>أبرز النقاط (سطر لكل نقطة)</label><textarea id="axHl" data-keep="ax-hl" rows="4">' + h(arr(a.highlights).join('\n')) + '</textarea></div>' +
      '<div class="field"><label>صورة المحور (اختيارية — تظهر في بطاقته بالرئيسية بدل الرسم التلقائي)</label>' + ImgPick.html('axImg', a.image) + '</div>' +
      '<div class="notice">⚠️ تُحفظ الصور كنص Base64 داخل قاعدة البيانات نفسها (حد أقصى 5 ميجابايت للصورة)؛ هذا يُكبّر حجم قاعدة البيانات تدريجيًا مع كل صورة، وربط Firebase Storage خطوة منفصلة يمكن إضافتها لاحقًا عند الحاجة.<br>📊 الرسوم البيانية داخل الشرائح ليست جزءًا من هذا التعديل في هذه النسخة، وتبقى قابلة للتعديل عبر الكود فقط.</div></div>' +
      '<h3 style="margin:22px 0 10px">🎞️ الشرائح <span class="pill num">' + FormState.slides.length + '</span></h3><div id="slidesEd">' + FormState.slides.map((s, i) => slideEditorHtml(s, i, FormState.slides.length)).join('') + '</div>' +
      '<div class="row"><select id="newSlideType" style="border:1px solid var(--line);border-radius:10px;padding:8px">' + Object.keys(SLIDE_TYPES).map(x => '<option value="' + x + '">' + SLIDE_TYPES[x] + '</option>').join('') + '</select><button class="btn btn-soft btn-sm" data-act="se-add">➕ إضافة شريحة</button></div>';
    if (!isNew) {
      const exs = Content.exercisesOf(id, { all: true });
      out += '<h3 style="margin:26px 0 10px">✍️ تمارين هذا المحور <span class="pill num">' + exs.length + '</span></h3><div class="card pad">' + (exs.length ? exs.map(e => exRow(e, { axis: id })).join('') : '<div class="empty">لا توجد تمارين بعد.</div>') + '<div style="margin-top:10px"><button class="btn btn-primary btn-sm" data-go="exEdit" data-id="new" data-axis="' + h(id) + '" data-from="axisEdit">➕ أضف تمرينًا لهذا المحور</button></div></div>';
    }
    out += '<div class="sticky-actions"><button class="btn btn-primary" data-act="axis-save">💾 حفظ المحور</button><button class="btn btn-ghost" data-act="form-cancel">إلغاء</button></div></div>';
    return out;
  },
  after(root) {
    RTE.mount(root); ImgPick.mount(root);
    const sel = $('#axIcon', root); if (sel) sel.addEventListener('change', () => { $('#axIconPrev', root).innerHTML = iconSvg(sel.value, 24, '#fff'); });
    $$('[data-sf="type"]', root).forEach(s => s.addEventListener('change', () => { FormState.slides = collectSlides(root); Views.axisEdit.reslides(root); }));
  },
  reslides(root) {
    const box = $('#slidesEd', root); box.innerHTML = FormState.slides.map((s, i) => slideEditorHtml(s, i, FormState.slides.length)).join('');
    RTE.mount(box); ImgPick.mount(box);
    $$('[data-sf="type"]', box).forEach(s => s.addEventListener('change', () => { FormState.slides = collectSlides(root); Views.axisEdit.reslides(root); }));
  },
  async save(root) {
    const id = Router.cur.id; const isNew = id === 'new';
    const slides = collectSlides(root).map(s => { const o = Object.assign({}, s); delete o.chart; return o; });
    const data = { title: $('#axTitle', root).value.trim(), classic: $('#axClassic', root).value.trim(), desc: RTE.val(root, 'axDesc'), duration: $('#axDur', root).value.trim(), icon: $('#axIcon', root).value, highlights: $('#axHl', root).value.split('\n').map(x => x.trim()).filter(Boolean), image: ImgPick.val('axImg'), slides };
    if (!data.title) { UI.alert('اكتب عنوان المحور أولًا.'); return; }
    if (isNew) {
      const nid = 'x' + genId(); data.ts = DB.now(); data.color = Content.axisIds().length % AXIS_COLORS.length; data.unit = 0; data.scene = 'idea';
      await DB.set('added/axes/' + nid, data); UI.toast('✅ تم إنشاء المحور — أضف تمارينه الآن');
      FormState.axisId = null; Router.go('axisEdit', { id: nid }, { replace: true });
    } else if (DEF_AXIS[id]) { await DB.set('content/axes/' + id, data); UI.toast('✅ حُفظ التعديل ونُشر حيًا'); FormState.axisId = null; Router.go('admin'); }
    else { const cur = Store.addedAxes[id] || {}; await DB.set('added/axes/' + id, Object.assign({}, cur, data)); UI.toast('✅ حُفظ التعديل ونُشر حيًا'); FormState.axisId = null; Router.go('admin'); }
  }
};

// ============ نموذج التمرين / النشاط ============
function itemsEditorHtml(fmt, items) {
  if (fmt === 'text') return '';
  const row = (i, inner) => '<div class="item-editor" data-it="' + i + '"><div class="row" style="margin-bottom:6px"><span class="pill num">' + (i + 1) + '</span><span class="grow"></span><button type="button" class="btn btn-danger btn-xs" data-act="it-del" data-i="' + i + '">🗑 حذف</button></div>' + inner + '</div>';
  let out = '<h4 style="margin:14px 0 8px">عناصر النموذج التفاعلي</h4>';
  out += items.map((it, i) => {
    if (fmt === 'mcq') return row(i, '<div class="field"><label>السؤال</label><input data-if="q" value="' + h(it.q || '') + '"></div><div class="field"><label>الخيارات (سطر لكل خيار)</label><textarea data-if="options" rows="4">' + h(arr(it.options).join('\n')) + '</textarea></div><div class="field"><label>رقم الخيار الصحيح (1، 2، 3...)</label><input type="number" min="1" data-if="answer" value="' + ((+it.answer || 0) + 1) + '"></div>');
    if (fmt === 'truefalse') return row(i, '<div class="field"><label>العبارة</label><input data-if="q" value="' + h(it.q || '') + '"></div><div class="field"><label>الإجابة الصحيحة</label><select data-if="answer"><option value="true" ' + (it.answer ? 'selected' : '') + '>صح</option><option value="false" ' + (!it.answer ? 'selected' : '') + '>خطأ</option></select></div>');
    if (fmt === 'fillblank') return row(i, '<div class="field"><label>الجملة (ضع ___ مكان الفراغ)</label><input data-if="text" value="' + h(it.text || '') + '"></div><div class="field"><label>الكلمة الصحيحة (تُضاف إلى بنك الكلمات)</label><input data-if="answer" value="' + h(it.answer || '') + '"></div>');
    if (fmt === 'comparePairs') return row(i, '<div class="grid2"><div class="field"><label>العبارة (أ)</label><textarea data-if="a" rows="2">' + h(it.a || '') + '</textarea></div><div class="field"><label>العبارة (ب)</label><textarea data-if="b" rows="2">' + h(it.b || '') + '</textarea></div></div><div class="field"><label>الأدق</label><select data-if="answer"><option value="a" ' + (it.answer === 'a' ? 'selected' : '') + '>(أ)</option><option value="b" ' + (it.answer !== 'a' ? 'selected' : '') + '>(ب)</option></select></div>');
    return '';
  }).join('');
  return out + '<button type="button" class="btn btn-soft btn-sm" data-act="it-add">➕ أضف عنصرًا جديدًا</button>';
}
function collectItems(root, fmt) {
  return $$('[data-it]', root).map(box => {
    const g = n => { const el = $('[data-if="' + n + '"]', box); return el ? el.value : ''; };
    if (fmt === 'mcq') { const opts = g('options').split('\n').map(x => x.trim()).filter(Boolean); return { q: g('q').trim(), options: opts, answer: Math.max(0, Math.min(opts.length - 1, (parseInt(g('answer'), 10) || 1) - 1)) }; }
    if (fmt === 'truefalse') return { q: g('q').trim(), answer: g('answer') === 'true' };
    if (fmt === 'fillblank') { let t = g('text').trim(); if (t.indexOf('___') === -1) t += ' ___'; return { text: t, answer: g('answer').trim() }; }
    if (fmt === 'comparePairs') return { a: g('a').trim(), b: g('b').trim(), answer: g('answer') === 'a' ? 'a' : 'b' };
    return {};
  });
}
function exFormHtml(kind) {
  const id = Router.cur.id; const isNew = id === 'new';
  const e = isNew ? { title: '', icon: kind === 'activity' ? '⚡' : '✍️', mode: 'individual', format: 'text', scenario: '', principle: '', steps: [], task: '', hint: '', why: '', model: '', items: [] } : Content.ex(id);
  if (!e) return adminHeader('تعديل') + '<div class="empty">غير موجود.</div>';
  const isSurvey = e.kind === 'survey'; const isAct = kind === 'activity' || e.kind === 'activity';
  if (FormState.exId !== id) { FormState.exId = id; FormState.format = e.format || 'text'; FormState.items = arr(e.items).map(x => Object.assign({}, x)); }
  const fmt = FormState.format; const locked = FORMAT_MODE[fmt];
  const axId = isNew ? Router.cur.axis : Content.axisOfEx(id);
  let out = adminHeader(isNew ? (isAct ? '➕ نشاط جديد' : '➕ تمرين جديد') : (isSurvey ? '✏️ تعديل الاستطلاع الختامي' : isAct ? '✏️ تعديل النشاط' : '✏️ تعديل التمرين')) + Layout.crumbs(axId ? '<span class="crumb-tag">' + h(Content.axis(axId) ? Content.axis(axId).title : '') + '</span>' : '') + '<div class="form-page"><div class="card pad">' +
    '<div class="grid2"><div class="field"><label>العنوان</label><input id="exTitle" data-keep="ex-title" value="' + h(e.title) + '"></div><div class="field"><label>الأيقونة (إيموجي)</label><input id="exIcon" data-keep="ex-icon" value="' + h(e.icon || '') + '"></div></div>';
  if (!isSurvey) {
    out += '<div class="grid2"><div class="field"><label>نموذج الإجابة</label><select id="exFormat">' + Object.keys(FORMATS).map(x => '<option value="' + x + '" ' + (x === fmt ? 'selected' : '') + '>' + FORMATS[x] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>نوع العمل</label><select id="exMode" ' + (locked ? 'disabled' : '') + '><option value="individual" ' + ((locked || e.mode) === 'individual' ? 'selected' : '') + '>فردي</option><option value="group" ' + ((locked || e.mode) === 'group' ? 'selected' : '') + '>جماعي</option></select>' + (locked ? '<span class="help">🔒 مقفل تلقائيًا على «' + (locked === 'group' ? 'جماعي' : 'فردي') + '» ليتوافق مع آلية هذا النموذج.</span>' : '') + '</div></div>';
    out += '<div class="field"><label>السيناريو / الموقف' + (isAct ? ' (اختياري)' : '') + '</label>' + RTE.html('exScenario', e.scenario) + '</div>';
    if (!isAct) out += '<div class="field"><label>المبدأ العلمي باختصار</label><textarea id="exPrinciple" data-keep="ex-pr" rows="2">' + h(stripHtml(e.principle || '')) + '</textarea></div><div class="field"><label>خطوات «كيف تنجز التمرين؟» (سطر لكل خطوة)</label><textarea id="exSteps" data-keep="ex-steps" rows="4">' + h(arr(e.steps).join('\n')) + '</textarea></div>';
  }
  out += '<div class="field"><label>📝 المطلوب منك</label>' + RTE.html('exTask', e.task) + '</div>';
  if (!isSurvey) {
    out += '<div class="field" id="hintField" ' + (fmt === 'text' ? 'style="display:none"' : '') + '><label>💡 تلميح عام (يحل محل «المطلوب» في النماذج التفاعلية)</label>' + RTE.html('exHint', e.hint) + '</div>';
    if (!isAct) out += '<div class="field"><label>🎯 لماذا هذا النشاط؟</label><textarea id="exWhy" data-keep="ex-why" rows="2">' + h(stripHtml(e.why || '')) + '</textarea></div>';
    out += '<div class="field" id="modelField" ' + (fmt !== 'text' ? 'style="display:none"' : '') + '><label>🧩 النموذج المساعد' + (isAct ? ' (اختياري)' : '') + '</label>' + RTE.html('exModel', e.model) + '<span class="help">مثال موجز يقرّب الفكرة دون أن يعطي الإجابة. لا يظهر في النماذج التفاعلية.</span></div>';
    out += '<div class="field"><label>صورة (اختيارية — تظهر أعلى صفحته)</label>' + ImgPick.html('exImg', e.image) + '</div>';
    out += '<div id="itemsEd">' + itemsEditorHtml(fmt, FormState.items) + '</div>';
  }
  out += '</div><div class="sticky-actions"><button class="btn btn-primary" data-act="ex-save" data-kind="' + (isSurvey ? 'survey' : isAct ? 'activity' : 'ex') + '">💾 حفظ</button><button class="btn btn-ghost" data-act="form-cancel">إلغاء</button></div></div>';
  return out;
}
function exFormAfter(root) {
  RTE.mount(root); ImgPick.mount(root);
  const f = $('#exFormat', root);
  if (f) f.addEventListener('change', () => {
    FormState.items = FormState.format === f.value ? collectItems(root, FormState.format) : [];
    FormState.format = f.value;
    const m = $('#exMode', root); const lk = FORMAT_MODE[f.value];
    if (lk) { m.value = lk; m.disabled = true; } else m.disabled = false;
    const hf = $('#hintField', root); if (hf) hf.style.display = f.value === 'text' ? 'none' : '';
    const mf = $('#modelField', root); if (mf) mf.style.display = f.value === 'text' ? '' : 'none';
    if (!FormState.items.length && f.value !== 'text') FormState.items = [{}];
    $('#itemsEd', root).innerHTML = itemsEditorHtml(f.value, FormState.items);
    const help = m.parentNode.querySelector('.help'); if (help) help.remove();
    if (lk) m.insertAdjacentHTML('afterend', '<span class="help">🔒 مقفل تلقائيًا على «' + (lk === 'group' ? 'جماعي' : 'فردي') + '» ليتوافق مع آلية هذا النموذج.</span>');
  });
}
async function exFormSave(root, kind) {
  const id = Router.cur.id; const isNew = id === 'new';
  const fmt = kind === 'survey' ? 'text' : ($('#exFormat', root) ? $('#exFormat', root).value : 'text');
  const data = { title: $('#exTitle', root).value.trim(), icon: $('#exIcon', root).value.trim(), task: RTE.val(root, 'exTask') };
  if (!data.title) { UI.alert('اكتب عنوانًا أولًا.'); return; }
  if (kind !== 'survey') {
    data.format = fmt; data.mode = FORMAT_MODE[fmt] || $('#exMode', root).value;
    data.scenario = RTE.val(root, 'exScenario'); data.hint = RTE.val(root, 'exHint'); data.model = fmt === 'text' ? RTE.val(root, 'exModel') : ''; data.image = ImgPick.val('exImg');
    if ($('#exPrinciple', root)) { data.principle = $('#exPrinciple', root).value.trim(); data.steps = $('#exSteps', root).value.split('\n').map(x => x.trim()).filter(Boolean); data.why = $('#exWhy', root).value.trim(); }
    data.items = fmt === 'text' ? [] : collectItems(root, fmt).filter(it => it.q || it.text || it.a);
    if (fmt !== 'text' && !data.items.length) { UI.alert('أضف عنصرًا واحدًا على الأقل للنموذج التفاعلي.'); return; }
    if (fmt === 'fillblank') { const ans = data.items.map(i => i.answer); if (ans.some(x => !x)) { UI.alert('اكتب الكلمة الصحيحة لكل فراغ.'); return; } }
  }
  if (isNew) {
    const nid = 'n' + genId(); data.ts = DB.now();
    if (kind === 'activity') data.kind = 'activity'; else data.axis = Router.cur.axis;
    await DB.set('added/ex/' + nid, data);
  } else if (DEF_EX[id]) await DB.set('content/ex/' + id, data);
  else await DB.set('added/ex/' + id, Object.assign({}, Store.addedEx[id] || {}, data));
  UI.toast('✅ تم الحفظ ونُشر حيًا'); FormState.exId = null;
  const back = Router.backOf(Router.cur); Router.go(back.view, back.id ? { id: back.id } : {});
}
Views.exEdit = { html() { return exFormHtml('ex'); }, after: exFormAfter };
Views.actEdit = { html() { const e = Router.cur.id !== 'new' ? Content.ex(Router.cur.id) : null; return exFormHtml(e && e.kind === 'survey' ? 'survey' : 'activity'); }, after: exFormAfter };

// ============ نافذة توزيع المجموعات (تعيين يدوي إرشادي) ============
const Assign = {
  modal: null, open: new Set(),
  show() { Assign.modal = UI.modal('<div data-assign></div>', { wide: true, onClose: () => { Assign.modal = null; } }); Assign.render(); },
  render() {
    if (!Assign.modal) return; const box = $('[data-assign]', Assign.modal.el);
    const users = Store.users || {}; const assigned = Store.assign || {};
    const free = Object.keys(users).filter(u => !assigned[u]).sort((a, b) => (users[a].name || '').localeCompare(users[b].name || '', 'ar'));
    const html = '<h3>🧭 توزيع المجموعات</h3><p class="muted" style="font-family:var(--f-ui);font-size:13.5px">التعيين إرشادي: يرى المتدرب تنبيهًا باسم مجموعته، دون منعه من اختيار غيرها.</p>' +
      Groups.list().map(n => { const mem = Groups.membersOf(n); const op = Assign.open.has(n);
        return '<div class="assign-group ' + (op ? 'open' : '') + '"><div class="ag-head" data-act="ag-toggle" data-g="' + n + '"><span>👥</span><b class="grow">' + h(Groups.label(n)) + '</b><span class="pill num">' + mem.length + ' عضو</span><span>' + (op ? '▼' : '◀') + '</span></div><div class="ag-body">' + (op ? '<div class="field"><label>اسم مخصّص لهذه المجموعة (اختياري)</label><input data-gname="' + n + '" data-keep="gname-' + n + '" value="' + h((Store.groupNames || {})[n] || '') + '" placeholder="اتركه فارغًا لعرض الرقم وحده"></div>' +
          '<div class="field"><input data-keep="gsearch-' + n + '" data-filter-list="' + n + '" placeholder="🔍 بحث بالاسم…"></div><div class="chk-list" data-list="' + n + '">' + (free.length ? free.map(u => '<label data-name="' + h((users[u].name || '').toLowerCase()) + '"><input type="checkbox" data-assign-u="' + h(u) + '" data-g="' + n + '"> ' + h(users[u].name) + ' <span class="muted">' + h(users[u].role || '') + '</span></label>').join('') : '<div class="muted" style="padding:6px">كل المسجّلين معيَّنون.</div>') + '</div>' +
          '<div class="member-box"><b style="font-family:var(--f-ui);font-size:13px">أعضاء المجموعة:</b> ' + (mem.length ? mem.map(u => '<span class="m">' + h(users[u] ? users[u].name : '(محذوف)') + '<button class="btn btn-danger btn-xs" data-act="unassign" data-uid="' + h(u) + '">✕</button></span>').join('') : '<span class="muted">لا أعضاء بعد.</span>') + '</div>' : '') + '</div></div>'; }).join('') +
      '<div class="actions"><button class="btn btn-danger btn-sm" data-act="unassign-all">إلغاء كل التعيينات</button><button class="btn btn-ghost btn-sm" data-act="assign-close">إغلاق</button></div>';
    preserveRender(box, html);
    $$('[data-filter-list]', box).forEach(inp => { const apply = () => { const q = inp.value.trim().toLowerCase(); $$('[data-list="' + inp.getAttribute('data-filter-list') + '"] label', box).forEach(l => { l.style.display = !q || (l.getAttribute('data-name') || '').indexOf(q) > -1 ? '' : 'none'; }); }; inp.addEventListener('input', apply); apply(); });
    $$('[data-gname]', box).forEach(inp => inp.addEventListener('change', () => { const v = inp.value.trim(); DB.set('settings/groupNames/' + inp.getAttribute('data-gname'), v || null); }));
    $$('[data-assign-u]', box).forEach(cb => cb.addEventListener('change', () => { if (cb.checked) DB.set('assign/' + cb.getAttribute('data-assign-u'), +cb.getAttribute('data-g')); }));
  }
};
