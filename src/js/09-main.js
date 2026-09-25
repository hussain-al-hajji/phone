// ---------------------------------------------------------------------
// التطبيق: الرسم، المراقبات الحية، والتفاعلات
// ---------------------------------------------------------------------
const FORM_VIEWS = ['axisEdit', 'exEdit', 'actEdit'];
const ADMIN_VIEWS = ['admin'].concat(FORM_VIEWS);
const App = {
  inIframe: (() => { try { return window.self !== window.top; } catch (e) { return true; } })(),
  render() {
    const root = document.getElementById('app'); if (!root) return;
    let v = Router.cur.view;
    if (ADMIN_VIEWS.indexOf(v) > -1 && !Admin.ok()) { Router.cur = { view: 'home' }; v = 'home'; }
    const needLogin = !Me.isReg() && !Me.guest && ADMIN_VIEWS.indexOf(v) === -1;
    const view = needLogin ? Views.login : (Views[v] || Views.home);
    let body = '';
    try { body = view.html(); } catch (e) { console.error(e); body = '<div class="empty" style="margin-top:24px">حدث خطأ في عرض هذه الصفحة. <button class="btn btn-soft btn-sm" data-go="home">الرئيسية</button></div>'; }
    const html = Layout.banners() + Layout.topbar() + '<main class="wrap">' + body + '</main>' + Layout.footer() +
      (Admin.ok() && Admin.preview() ? '<button class="float-badge" data-act="preview-exit">↩ العودة للوحة الإدارة</button>' : '');
    preserveRender(root, html);
    if (view.after) try { view.after(root); } catch (e) { console.error(e); }
    $$('[data-filter]', root).forEach(applyFilter);
    document.title = (Content.site().headerTitle || 'الدورة');
  },
  onData: debounce(() => {
    if (FORM_VIEWS.indexOf(Router.cur.view) > -1) return; // لا نعيد رسم نماذج التحرير أثناء الكتابة
    App.render(); if (Assign.modal) Assign.render();
  }, 60)
};
function applyFilter(inp) { const q = inp.value.trim().toLowerCase(); const scope = inp.closest('.tool-drop') || document; $$(inp.getAttribute('data-filter'), scope).forEach(x => { x.style.display = !q || (x.getAttribute('data-name') || '').indexOf(q) > -1 ? '' : 'none'; }); }

// ---------- المراقبات الحية ----------
function watchAll() {
  const W = (path, fn) => DB.watch(path, v => { fn(v); App.onData(); });
  W('content', v => { v = v || {}; Store.contentAxes = v.axes || {}; Store.contentEx = v.ex || {}; });
  W('added', v => { v = v || {}; Store.addedAxes = v.axes || {}; Store.addedEx = v.ex || {}; });
  W('visibility', v => { Store.visibility = v || {}; });
  W('enabled', v => { Store.enabled = v || {}; });
  W('order/axes', v => { Store.order = arr(v); });
  W('site', v => { Store.site = v || {}; });
  W('settings', v => { v = v || {}; Store.groupCount = v.groups && v.groups.count ? v.groups.count : DEFAULT_GROUPS; Store.groupNames = v.groupNames || {}; });
  W('assign', v => { Store.assign = v || {}; });
  W('users', v => { Store.users = v || {}; });
  W('posts', v => { Store.posts = v || {}; });
  W('reveal', v => { Store.reveal = v || {}; });
  W('lab', v => { v = v || {}; Store.labTimers = v.timers || {}; Store.labAnswers = v.answers || {}; });
  W('broadcast', v => { Store.broadcast = v; });
  W('stats/registered', v => { Store.registered = Number(v) || 0; });
  W('meta/resetStamp', v => {
    Store.resetStamp = Number(v) || 0;
    if (Me.data && Store.resetStamp && (Me.data.ts || 0) < Store.resetStamp) { Me.clear(); UIState.draft = {}; UIState.editing = {}; setTimeout(() => UI.toast('تمت إعادة ضبط البرنامج — سجّل اسمك من جديد'), 300); }
  });
}
function getByPath(path) { const seg = path.split('/'); let n = seg[0] === 'posts' ? Store.posts : seg[0] === 'lab' ? Store.labAnswers : null; const rest = seg[0] === 'lab' ? seg.slice(2) : seg.slice(1); for (const s of rest) { if (!n) return null; n = n[s]; } return n; }

// ---------- التسجيل والدخول ----------
async function doRegister() {
  const name = ($('#regName') || {}).value ? $('#regName').value.trim() : ''; const role = ($('#regRole') || {}).value ? $('#regRole').value.trim() : '';
  if (name.length < 2) { UI.alert('اكتب اسمك الكامل أولًا.'); return; }
  if (!role) { UI.alert('اكتب مجالك أو مسماك الوظيفي.'); return; }
  const btn = $('[data-act="register"]'); if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التسجيل…'; }
  try {
    const uid = genId('u');
    // رقم عضوية تسلسلي عبر عملية ذرّية مع حماية دنيا صريحة
    const member = await DB.transaction('meta/memberCounter', cur => Math.max(Number(cur) || 0, MEMBER_NO_FLOOR) + 1);
    const ts = DB.now();
    await DB.set('users/' + uid, { name, role, member, ts });
    DB.transaction('stats/registered', c => (Number(c) || 0) + 1);
    const me = { uid, name, role, member, ts }; Me.save(me);
    App.render(); welcomeModal(me);
  } catch (e) { UI.alert('تعذر التسجيل: ' + h(e.message || e)); if (btn) { btn.disabled = false; btn.textContent = 'ابدأ 🚀'; } }
}
function welcomeModal(me) {
  const m = UI.modal('<div class="center"><div style="font-size:48px">🎉</div><h3>أهلًا ' + h(me.name) + '!</h3><p class="muted" style="font-family:var(--f-ui)">تم تسجيلك بنجاح. هذا رقم عضويتك — احتفظ به للدخول من أي جهاز آخر دون كلمة مرور.</p><div class="num" style="font-family:var(--f-display);font-size:52px;font-weight:800;letter-spacing:4px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block">' + pad4(me.member) + '</div></div><div class="actions" style="justify-content:center"><button class="btn btn-primary" data-save-card>💾 حفظ رقم العضوية</button><button class="btn btn-ghost" data-close>ابدأ الجولة</button></div>');
  $('[data-save-card]', m.el).onclick = () => saveMemberCard(me);
  $('[data-close]', m.el).onclick = () => m.close();
}
async function memberLogin() {
  const v = await UI.prompt('أدخل رقم عضويتك (مثال: 0058)', { title: 'الدخول برقم العضوية', type: 'text', inputmode: 'numeric', placeholder: '0000', ok: 'دخول' });
  if (v == null) return; const num = parseInt(String(v).replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10);
  if (!num) { UI.alert('اكتب رقم عضوية صحيحًا.'); return; }
  const users = await DB.get('users') || {}; // قراءة لمرة واحدة لكامل السجل
  const uid = Object.keys(users).find(u => +users[u].member === num);
  if (!uid) { UI.alert('لم نجد حسابًا بهذا الرقم (ربما حُذف لاحقًا). يُرجى التسجيل من جديد باسمك.', 'رقم غير مطابق'); return; }
  const u = users[uid]; Me.save({ uid, name: u.name, role: u.role || '', member: u.member, ts: u.ts || DB.now(), group: u.group || null });
  UI.toast('مرحبًا بعودتك يا ' + u.name + ' 👋'); App.render();
}

// ---------- حفظ الإجابات ----------
async function saveText(exId) {
  const e = Content.ex(exId); const ta = $('#ans-' + CSS.escape(exId)); const text = ta ? ta.value.trim() : '';
  if (!text) { UI.alert('اكتب إجابتك أولًا.'); return; }
  const key = postKey(e); if (!key) return;
  const me = Me.data; const upd = { text, name: me.name, role: me.role || '', ts: DB.now() };
  if (e.mode === 'group') { upd.group = Me.group(); upd.by = me.uid; upd['members/' + me.uid] = true; } else upd.uid = me.uid;
  await DB.update('posts/' + exId + '/' + key, upd);
  if (ta) ta.value = ''; UIState.editing[exId] = false; UI.toast('✅ تم الحفظ'); App.render();
}
async function saveInter(exId) {
  const e = Content.ex(exId); const d = UIState.draft[exId] || [];
  const missing = e.items.some((_, i) => d[i] === null || d[i] === undefined || d[i] === '');
  if (missing) { UI.alert(e.format === 'fillblank' ? 'املأ كل الفراغات قبل الإرسال.' : 'أجب عن كل الأسئلة قبل الحفظ.'); return; }
  const key = postKey(e); if (!key) return; const me = Me.data;
  const upd = { answers: e.items.map((_, i) => d[i]), name: me.name, role: me.role || '', ts: DB.now() };
  if (e.mode === 'group') { upd.group = Me.group(); upd.by = me.uid; upd['members/' + me.uid] = true; } else upd.uid = me.uid;
  await DB.update('posts/' + exId + '/' + key, upd);
  UIState.editing[exId] = false; UIState.draft[exId] = upd.answers.slice(); UI.toast(e.mode === 'group' ? '📤 أُرسلت إجابات المجموعة' : '✅ تم حفظ إجاباتك'); App.render();
}

// ---------- أدوات الأدمن ----------
function stripFlags(o) { const c = JSON.parse(JSON.stringify(o)); Object.keys(c).forEach(k => { if (k.charAt(0) === '_') delete c[k]; }); delete c.exercises; return c; }
async function copyAxis(id) {
  const a = Content.axis(id); if (!a) return;
  const nid = 'x' + genId(); const data = stripFlags(a); data.title = a.title + ' (نسخة)'; data.ts = DB.now(); data.slides = a.slides.map(s => { const o = stripFlags(s); delete o.chart; o.id = genId('sl'); return o; }); data.color = Content.axisIds().length % AXIS_COLORS.length; delete data.id;
  const upd = {}; upd['added/axes/' + nid] = data;
  Content.exercisesOf(id, { all: true }).forEach((e, i) => { const ne = stripFlags(e); delete ne.id; ne.axis = nid; ne.ts = DB.now() + i; upd['added/ex/n' + genId()] = ne; });
  await DB.update('', upd); UI.toast('🧬 تم نسخ المحور مع شرائحه وتمارينه'); Router.go('axisEdit', { id: nid });
}
async function copyEx(id) {
  const e = Content.ex(id); if (!e) return; const ne = stripFlags(e); delete ne.id; ne.title = e.title + ' (نسخة)'; ne.ts = DB.now();
  const ax = Content.axisOfEx(id); if (ax) ne.axis = ax; else ne.kind = 'activity';
  await DB.set('added/ex/n' + genId(), ne); UI.toast('🧬 تم نسخ التمرين');
}
function backupData() {
  return { app: 'mcomm', version: 1, exportedAt: new Date().toISOString(), data: { content: { axes: Store.contentAxes, ex: Store.contentEx }, added: { axes: Store.addedAxes, ex: Store.addedEx }, visibility: Store.visibility, enabled: Store.enabled, order: { axes: Store.order }, site: Store.site, settings: { groups: { count: Groups.count() }, groupNames: Store.groupNames } } };
}
async function importBackup(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || obj.app !== 'mcomm' || !obj.data) { UI.alert('الملف ليس نسخة احتياطية صالحة لهذا الموقع.'); return; }
    const ok = await UI.confirm('سيستبدل الاستيراد كل تعديلات وإضافات المحتوى الحالية بما في الملف (' + h(obj.exportedAt || '') + '). مشاركات المتدربين لن تتأثر. متابعة؟', { danger: true, ok: 'استبدال المحتوى' });
    if (!ok) return; const d = obj.data;
    await DB.update('', { content: d.content || null, added: d.added || null, visibility: d.visibility || null, enabled: d.enabled || null, order: d.order || null, site: d.site || null, settings: d.settings || null });
    UI.toast('✅ تم استيراد المحتوى');
  } catch (e) { UI.alert('تعذر قراءة الملف: ' + h(e.message || e)); }
}
async function globalReset() {
  const ok = await UI.confirm('<b>تحذير:</b> سيُمسح نهائيًا كل ما أدخله المتدربون (المشاركات، المختبر، المؤقتات، قائمة المسجّلين، التعيينات)، ما عدا الاستطلاع الختامي، وسيُطلب من كل متصفح تسجيل اسم جديد. لا يمكن التراجع.', { danger: true, ok: 'نعم، امسح كل المدخلات', title: 'إعادة ضبط شاملة' });
  if (!ok) return;
  const posts = await DB.get('posts') || {}; const upd = {};
  Object.keys(posts).forEach(k => { if (k !== SURVEY_ID) upd['posts/' + k] = null; }); // استثناء صريح للاستطلاع الختامي
  upd.lab = null; upd.users = null; upd.assign = null; upd['meta/resetStamp'] = DB.now();
  await DB.update('', upd); UI.toast('تمت إعادة الضبط الشاملة');
}

// ---------- التفاعلات (تفويض أحداث واحد) ----------
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act],[data-go],[data-back],[data-like],[data-deck-go],[data-slide]'); if (!t || t.disabled) return;
  if (t.hasAttribute('data-go')) { ev.preventDefault(); const p = {}; ['id', 'axis', 'from'].forEach(k => { if (t.getAttribute('data-' + k)) p[k] = t.getAttribute('data-' + k); }); if (t.getAttribute('data-go') === 'axisEdit' || t.getAttribute('data-go') === 'exEdit' || t.getAttribute('data-go') === 'actEdit') { FormState.axisId = null; FormState.exId = null; } Router.go(t.getAttribute('data-go'), p); return; }
  if (t.hasAttribute('data-back')) { const b = Router.backOf(Router.cur) || { view: 'home' }; Router.go(b.view, b.id ? { id: b.id } : {}); return; }
  if (t.hasAttribute('data-like')) { const p = t.getAttribute('data-like'); const cur = getByPath(p); Likes.toggle(p, cur && cur.likes); App.render(); return; }
  if (t.hasAttribute('data-deck-go')) { Deck.move(Router.cur.id, +t.getAttribute('data-deck-go')); return; }
  if (t.hasAttribute('data-slide')) { Deck.to(Router.cur.id, +t.getAttribute('data-slide')); return; }
  const act = t.getAttribute('data-act'); const id = t.getAttribute('data-id'); const exId = t.getAttribute('data-ex');
  const root = document.getElementById('app');
  switch (act) {
    // ----- عام -----
    case 'switch-user': { const ok = await UI.confirm('سيُمسح تسجيلك من هذا الجهاز فقط (لن يُحذف أي شيء من السيرفر)، ويمكنك تسجيل مستخدم جديد أو الدخول برقم العضوية.', { ok: 'تبديل المستخدم' }); if (ok) { Me.clear(); UIState.draft = {}; UIState.editing = {}; Router.go('home'); } break; }
    case 'admin-enter': {
      if (Admin.ok()) { SafeSS.del('mc_preview'); Router.go('admin'); break; }
      const v = await UI.prompt('أدخل الرمز السري للوحة الإدارة', { title: '🔐 لوحة الإدارة', type: 'password', inputmode: 'numeric', ok: 'دخول' });
      if (v == null) break; if (v.trim() === ADMIN_PASS) { SafeSS.set('mc_admin', '1'); SafeSS.del('mc_preview'); Router.go('admin'); } else UI.alert('الرمز غير صحيح.');
      break;
    }
    case 'admin-exit': SafeSS.del('mc_admin'); SafeSS.del('mc_preview'); Router.go('home'); break;
    case 'preview': SafeSS.set('mc_preview', '1'); Router.go('home'); break;
    case 'preview-exit': SafeSS.del('mc_preview'); Router.go('admin'); break;
    case 'bc-close': SafeLS.set('mc_bc_closed', t.getAttribute('data-id')); App.render(); break;
    case 'register': doRegister(); break;
    case 'member-login': memberLogin(); break;
    case 'guest': Me.setGuest(); App.render(); break;
    case 'open-axis': { const a = Content.axis(id); if (a && a._disabled && !Admin.ctl()) UI.alert('هذا المحور غير متاح بعد — سيُفتح قريبًا.', '⏳ قريبًا'); else Router.go('axis', { id }); break; }
    // ----- التمارين -----
    case 'pick-group': { const g = +t.getAttribute('data-g'); Me.setGroup(g); Object.keys(UIState.draft).forEach(k => { const e = Content.ex(k); if (e && e.mode === 'group') delete UIState.draft[k]; }); UIState.editing = {}; App.render(); break; }
    case 'pick-opt': { const d = UIState.draft[exId]; const e = Content.ex(exId); const v = t.getAttribute('data-v'); d[+t.getAttribute('data-i')] = e.format === 'mcq' ? +v : v === 'true'; App.render(); break; }
    case 'pick-cmp': { UIState.draft[exId][+t.getAttribute('data-i')] = t.getAttribute('data-v'); App.render(); break; }
    case 'fb-word': { const w = t.getAttribute('data-w'); UIState.fbSel[exId] = UIState.fbSel[exId] === w ? null : w; App.render(); break; }
    case 'fb-blank': {
      const d = UIState.draft[exId]; const i = +t.getAttribute('data-i'); const sel = UIState.fbSel[exId];
      if (sel) { d[i] = sel; UIState.fbSel[exId] = null; } else if (d[i]) d[i] = null; // الضغط على فراغ ممتلئ دون تحديد كلمة يُفرغه ويعيد كلمته للبنك
      else UI.toast('اختر كلمة من البنك أولًا');
      App.render(); break;
    }
    case 'save-inter': saveInter(exId); break;
    case 'save-text': saveText(exId); break;
    case 'edit-ans': { UIState.editing[exId] = true; const e = Content.ex(exId); if (e) { const p = (Store.posts[exId] || {})[postKey(e)]; if (p && p.answers) UIState.draft[exId] = arr(p.answers).slice(); } App.render(); break; }
    case 'cancel-edit': UIState.editing[exId] = false; delete UIState.draft[exId]; App.render(); break;
    case 'show-model': UIState.modelShown[exId] = true; App.render(); break;
    case 'del-post': { if (await UI.confirm('حذف هذه المشاركة وحدها؟ لن تتأثر بقية المشاركات.', { danger: true, ok: 'حذف' })) DB.remove('posts/' + exId + '/' + t.getAttribute('data-k')); break; }
    // ----- المختبر -----
    case 'lab-start': { const g = Me.group(); if (g) DB.set('lab/timers/g' + g, { start: DB.now(), pausedTotal: 0 }); break; }
    case 'lab-pause': { const g = Me.group(); DB.update('lab/timers/g' + g, { pausedAt: DB.now() }); break; }
    case 'lab-resume': { const g = Me.group(); const tm = Store.labTimers['g' + g] || {}; DB.update('lab/timers/g' + g, { pausedTotal: (tm.pausedTotal || 0) + (DB.now() - (tm.pausedAt || DB.now())), pausedAt: null }); break; }
    case 'lab-reset': { if (await UI.confirm('إعادة الوقت إلى الصفر لمجموعتك؟ الإجابات المحفوظة لن تُحذف.', { ok: 'إعادة ضبط الوقت' })) DB.remove('lab/timers/g' + Me.group()); break; }
    case 'lab-save': { const i = t.getAttribute('data-i'); const ta = $('#labAns' + i); const txt = ta ? ta.value.trim() : ''; if (!txt) { UI.alert('اكتبوا مخرج المرحلة أولًا.'); break; } await DB.update('lab/answers/g' + Me.group() + '/s' + i, { text: txt, name: Me.data.name, uid: Me.uid(), ts: DB.now() }); UIState.editing['lab' + i] = false; if (ta) ta.value = ''; UI.toast('✅ حُفظت المرحلة'); App.render(); break; }
    case 'del-lab': { if (await UI.confirm('حذف إجابة هذه المرحلة؟', { danger: true, ok: 'حذف' })) DB.remove('lab/answers/' + t.getAttribute('data-k') + '/s' + t.getAttribute('data-i')); break; }
    // ----- حسابي -----
    case 'acc-save': { const n = $('#accName').value.trim(), r = $('#accRole').value.trim(); if (n.length < 2) { UI.alert('الاسم قصير جدًا.'); break; } const me = Object.assign({}, Me.data, { name: n, role: r }); Me.save(me); await DB.update('users/' + me.uid, { name: n, role: r }); UI.toast('✅ تم تحديث بياناتك'); App.render(); break; }
    case 'congrats-pdf': buildCongratsPdf(Me.data.name); break;
    case 'congrats-mail': {
      const subj = 'تهنئة إنجاز — ' + Content.courseTitle();
      const body = 'مرحبًا،\n\nأحتفظ بهذه الرسالة كنسخة من تهنئة الإنجاز الخاصة بي في برنامج «' + Content.courseTitle() + '».\nالاسم: ' + Me.data.name + '\nالتاريخ: ' + fmtDate(Date.now()) + '\n\nتنبيه مهم: صفحة الويب لا تستطيع إرفاق الملف تلقائيًا (لا يوجد خادم بريد). يُرجى إرفاق ملف PDF الذي حمّلته من زر «تحميل / حفظ كـ PDF» يدويًا قبل الإرسال.';
      location.href = 'mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body); break;
    }
    case 'content-pdf': buildContentPdf(); break;
    // ----- لوحة الأدمن -----
    case 'bell': UIState.bellOpen = !UIState.bellOpen; App.render(); if (UIState.bellOpen) setTimeout(() => { SafeLS.set('mc_bell_seen', String(Date.now())); if (UIState.bellOpen) App.render(); }, 1800); break;
    case 'drop': { const k = t.getAttribute('data-k'); UIState.openDrop.has(k) ? UIState.openDrop.delete(k) : UIState.openDrop.add(k); App.render(); break; }
    case 'acc': { if (ev.target.closest('.acc-actions') || ev.target.closest('.drag-handle')) break; const k = t.getAttribute('data-k'); UIState.openAcc.has(k) ? UIState.openAcc.delete(k) : UIState.openAcc.add(k); App.render(); break; }
    case 'clear-names': { if (await UI.confirm('مسح أسماء المسجّلين فقط من السيرفر؟ لن تتأثر الإجابات أو المؤقتات، ولن يُطلب من أي متدرب حالي إعادة التسجيل.', { danger: true, ok: 'مسح الأسماء' })) { await DB.remove('users'); UI.toast('تم مسح قائمة الأسماء'); } break; }
    case 'save-groups': { const n = parseInt($('#grpCount').value, 10); if (!(n >= 2 && n <= 30)) { UI.alert('اختر عددًا بين 2 و30.'); break; } await DB.set('settings/groups/count', n); UI.toast('✅ عدد المجموعات: ' + n); break; }
    case 'assign-open': Assign.show(); break;
    case 'assign-close': if (Assign.modal) Assign.modal.close(); break;
    case 'ag-toggle': { const g = +t.getAttribute('data-g'); Assign.open.has(g) ? Assign.open.delete(g) : Assign.open.add(g); Assign.render(); break; }
    case 'unassign': DB.remove('assign/' + t.getAttribute('data-uid')); break;
    case 'unassign-all': { if (await UI.confirm('إلغاء كل التعيينات وإعادة الجميع للاختيار الحر؟', { danger: true, ok: 'إلغاء الكل' })) DB.remove('assign'); break; }
    case 'congrats-preview': UI.modal('<div class="congrats-card">' + congratsInner((Me.data && Me.data.name) || 'اسم المتدرب') + '</div><div class="notice">⏳ ' + h(Content.congrats().notice) + '</div><div class="actions"><button class="btn btn-primary btn-sm" onclick="buildCongratsPdf(\'' + h(((Me.data && Me.data.name) || 'اسم المتدرب').replace(/'/g, '')) + '\')">📥 معاينة PDF</button></div>', { wide: true }); break;
    case 'bc-send': { const txt = $('#bcText').value.trim(); if (!txt) { UI.alert('اكتب نص الرسالة.'); break; } await DB.set('broadcast', { text: txt, id: genId('b'), ts: DB.now() }); $('#bcText').value = ''; UI.toast('📣 تم البث'); break; }
    case 'bc-stop': DB.remove('broadcast'); break;
    case 'export-csv': exportAllCsv(); break;
    case 'person-pdf': { const u = t.getAttribute('data-uid'); const pm = progressModal('📄 ملف ' + ((Store.users[u] || {}).name || '')); try { const doc = await personPdfDoc(u, pm); doc.save('مشاركات - ' + safeName((Store.users[u] || {}).name) + '.pdf'); } catch (e) { UI.alert('تعذر إنشاء الملف: ' + h(e.message || e)); } pm.close(); break; }
    case 'person-csv': { const u = t.getAttribute('data-uid'); downloadBlob(personCsvBlob(u), 'مشاركات - ' + safeName((Store.users[u] || {}).name) + '.csv'); break; }
    case 'export-all-pdf': exportAllPersons('pdf'); break;
    case 'export-all-csv': exportAllPersons('csv'); break;
    case 'backup': downloadBlob(new Blob([JSON.stringify(backupData(), null, 2)], { type: 'application/json' }), 'نسخة احتياطية للمحتوى ' + fmtDate(Date.now()).replace(/\//g, '-') + '.json'); break;
    case 'home-save': { const o = {}; $$('[data-home]', root).forEach(i => { o[i.getAttribute('data-home')] = i.value.trim(); }); o.heroDesc = RTE.val(root, 'heroDesc'); o.heroImage = ImgPick.val('heroImage'); await DB.set('site/home', o); UI.toast('✅ حُفظت الواجهة ونُشرت حيًا'); break; }
    case 'home-reset': { if (await UI.confirm('استرجاع كل عناصر الواجهة لنصوصها ورسمها الأصلي؟', { ok: 'استرجاع' })) { await DB.remove('site/home'); UI.toast('تم الاسترجاع'); } break; }
    case 'reg-set': { const n = parseInt($('#regCountIn').value, 10); if (!(n >= 0)) break; await DB.set('stats/registered', n); UI.toast('✅ تم تحديث الرقم'); break; }
    case 'reg-zero': { if (await UI.confirm('تصفير عدد المسجّلين المعروض؟', { ok: 'تصفير' })) DB.set('stats/registered', 0); break; }
    case 'cg-add-para': $('#cgParas').insertAdjacentHTML('beforeend', '<div class="row" style="margin-bottom:6px"><textarea data-cg-para rows="2" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-family:var(--f-body)"></textarea><button class="btn btn-danger btn-xs" data-act="cg-del-para">🗑</button></div>'); break;
    case 'cg-del-para': t.closest('.row').remove(); break;
    case 'cg-save': { const paras = $$('[data-cg-para]', root).map(x => x.value.trim()).filter(Boolean); await DB.set('site/congrats', { title: $('#cgTitle').value.trim(), emoji: $('#cgEmoji').value.trim(), paragraphs: paras, footerRight: $('#cgFR').value.trim(), footerLeft: $('#cgFL').value.trim(), notice: $('#cgNotice').value.trim() }); UI.toast('✅ حُفظ محتوى التهنئة'); break; }
    case 'cg-reset': { if (await UI.confirm('استرجاع المحتوى الافتراضي للتهنئة؟', { ok: 'استرجاع' })) DB.remove('site/congrats'); break; }
    case 'pdf-save': { const o = { enabled: $('#pdfEnabled').checked }; $$('[data-pdf]', root).forEach(i => { o[i.getAttribute('data-pdf')] = i.value.trim(); }); await DB.set('site/pdf', o); UI.toast('✅ حُفظت بيانات الملف'); break; }
    case 'toggle-vis': DB.set('visibility/' + id, Content.isHidden(id) ? null : false); break; // مسار مستقل عن المحتوى
    case 'toggle-en': DB.set('enabled/' + id, Content.isEnabled(id) ? false : null); break;     // مسار مستقل ثالث
    case 'copy-axis': copyAxis(id); break;
    case 'copy-ex': copyEx(id); break;
    case 'reset-axis': { if (await UI.confirm('استرجاع المحتوى الأصلي لهذا المحور؟ سيُحذف التراكب فقط (حالة الإظهار والتفعيل لا تتأثر).', { ok: 'استرجاع الافتراضي' })) DB.remove('content/axes/' + id); break; }
    case 'reset-ex': { if (await UI.confirm('استرجاع المحتوى الأصلي لهذا التمرين؟', { ok: 'استرجاع الافتراضي' })) DB.remove('content/ex/' + id); break; }
    case 'delete-axis': {
      if (!(await UI.confirm('حذف نهائي لهذا المحور المُضاف وكل تمارينه المُضافة التابعة له؟ <b>لا رجعة في هذا الحذف.</b>', { danger: true, ok: 'حذف نهائي' }))) break;
      const upd = { ['added/axes/' + id]: null, ['visibility/' + id]: null, ['enabled/' + id]: null };
      Object.keys(Store.addedEx || {}).forEach(k => { if (Store.addedEx[k].axis === id) { upd['added/ex/' + k] = null; upd['posts/' + k] = null; upd['visibility/' + k] = null; } });
      await DB.update('', upd); DB.set('order/axes', arr(Store.order).filter(x => x !== id)); UI.toast('تم الحذف'); break;
    }
    case 'delete-ex': { if (await UI.confirm('حذف نهائي لهذا العنصر المُضاف ومشاركاته؟ <b>لا رجعة في هذا الحذف.</b>', { danger: true, ok: 'حذف نهائي' })) DB.update('', { ['added/ex/' + id]: null, ['posts/' + id]: null, ['visibility/' + id]: null, ['reveal/' + id]: null }); break; }
    case 'clear-posts': { if (await UI.confirm('مسح كل مشاركات «' + h(Content.exTitle(id)) + '»؟', { danger: true, ok: 'مسح المشاركات' })) DB.remove('posts/' + id); break; }
    case 'reveal': { const cur = await DB.get('reveal/' + id); await DB.set('reveal/' + id, cur ? null : true); UI.toast(cur ? '🔒 أُخفيت الإجابات' : '🔓 كُشفت الإجابات الصحيحة لكل المتدربين'); break; } // قراءة الحالة الفعلية من القاعدة قبل التبديل
    case 'global-reset': globalReset(); break;
    // ----- نموذج المحور -----
    case 'se-add': FormState.slides = collectSlides(root); FormState.slides.push({ type: $('#newSlideType').value, title: '' }); Views.axisEdit.reslides(root); break;
    case 'se-del': { FormState.slides = collectSlides(root); FormState.slides.splice(+t.getAttribute('data-i'), 1); Views.axisEdit.reslides(root); break; }
    case 'se-up': case 'se-down': { FormState.slides = collectSlides(root); const i = +t.getAttribute('data-i'), j = act === 'se-up' ? i - 1 : i + 1; const s = FormState.slides; [s[i], s[j]] = [s[j], s[i]]; const k = ['text', 'rule', 'intro', 'img']; Views.axisEdit.reslides(root); break; }
    case 'axis-save': Views.axisEdit.save(root); break;
    case 'form-cancel': { FormState.axisId = null; FormState.exId = null; const b = Router.backOf(Router.cur); Router.go(b.view, b.id ? { id: b.id } : {}); break; }
    case 'it-add': FormState.items = collectItems(root, FormState.format); FormState.items.push({}); $('#itemsEd').innerHTML = itemsEditorHtml(FormState.format, FormState.items); break;
    case 'it-del': FormState.items = collectItems(root, FormState.format); FormState.items.splice(+t.getAttribute('data-i'), 1); $('#itemsEd').innerHTML = itemsEditorHtml(FormState.format, FormState.items); break;
    case 'ex-save': exFormSave(root, t.getAttribute('data-kind')); break;
  }
});
document.addEventListener('change', ev => { const t = ev.target; if (t.getAttribute && t.getAttribute('data-act-change') === 'import-backup' && t.files && t.files[0]) { importBackup(t.files[0]); t.value = ''; } });
document.addEventListener('input', ev => { const t = ev.target; if (t.hasAttribute && t.hasAttribute('data-filter')) applyFilter(t); });
document.addEventListener('click', ev => { if (UIState.bellOpen && !ev.target.closest('.bell-wrap')) { UIState.bellOpen = false; App.render(); } });

// ---------- مؤقت المختبر ----------
function labTick() {
  if (Router.cur.view !== 'lab') return; const g = Me.group(); if (!g) return; const tm = Store.labTimers['g' + g]; if (!tm || !tm.start) return;
  const el = labElapsed(tm); const total = COURSE.lab.stages.length * LAB_STAGE_MIN * 60000; const c = $('#labClock'); if (c) c.textContent = mmss(total - el);
  let rerender = false; $$('[data-lock-at]').forEach(n => { const at = +n.getAttribute('data-lock-at'); if (el >= at) rerender = true; else { const s = n.querySelector('.num'); if (s) s.textContent = mmss(at - el); } });
  if (rerender) App.render();
}

// ---------- الإقلاع ----------
function boot() {
  Me.load();
  Router.cur = Router.parse();
  SafeHist.replace(Router.cur, Router.url(Router.cur));
  watchAll();
  if (Me.data && Me.data._fromHash) DB.get('users/' + Me.data.uid).then(u => { if (u) Me.save({ uid: Me.data.uid, name: u.name, role: u.role || '', member: u.member, ts: u.ts || 0, group: u.group || null }); else Me.clear(); App.render(); });
  App.render();
  setInterval(labTick, 1000);
}
boot();
