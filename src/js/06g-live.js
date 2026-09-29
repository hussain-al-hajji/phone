// ---------------------------------------------------------------------
// الحضور الحي على صفحات التمارين + دعوة المتدربين إلى تمرين
// - كل متصفح (متدرب أو زائر) يسجل وجوده في presence/<التمرين>/<معرّف جلسته> ما دام على صفحة التمرين،
//   ويُحذف السجل تلقائيًا عند مغادرة الصفحة أو إغلاقها أو انقطاع الاتصال (onDisconnect). لا يُحفظ أي عدد تراكمي.
// - المدرب وحده يقرأ هذه العقدة، ويرى العدد في صفحة التمرين وفي لوحة التحكم، وبالضغط تظهر الأسماء.
// - الدعوة: عقدة واحدة invite يكتبها المدرب؛ الدعوة الجديدة تحل محل السابقة تلقائيًا.
// ---------------------------------------------------------------------
const PRESENCE_STALE = 6 * 3600000; // سجل أقدم من 6 ساعات يُعد متروكًا (احتياط إن لم يعمل الحذف التلقائي)
const Presence = {
  cur: null, curSid: null, curSig: '',
  sid() {
    const a = typeof authUid === 'function' ? authUid() : null; if (a) return a;
    let s = SafeSS.get('ec_psid'); if (!s) { s = genId('s'); SafeSS.set('ec_psid', s); } return s;
  },
  target() { return App.dataReady && Router.cur.view === 'ex' && !Admin.ok() && (Me.isReg() || Me.guest) && Content.ex(Router.cur.id) ? Router.cur.id : null; },
  payload() { const reg = Me.isReg(); return { n: reg ? String(Me.data.name || '').slice(0, 80) : '', u: reg ? String(Me.uid()).slice(0, 40) : '', g: !reg, ts: DB.now() }; },
  path() { return 'presence/' + Presence.cur + '/' + Presence.curSid; },
  update() {
    const t = Presence.target(); const sid = Presence.sid(); const pl = Presence.payload(); const sig = t + '|' + sid + '|' + pl.u + '|' + pl.n;
    if (sig === Presence.curSig) return;
    if (Presence.cur && (Presence.cur !== t || Presence.curSid !== sid)) Presence.leave();
    Presence.curSig = sig; if (!t) return;
    Presence.cur = t; Presence.curSid = sid;
    DB.presence(Presence.path(), pl).catch(() => {});
  },
  leave() {
    if (!Presence.cur) { Presence.curSig = ''; return; }
    const p = Presence.path(); Presence.cur = null; Presence.curSid = null; Presence.curSig = '';
    DB.unpresence(p).catch(() => {});
  },
  // إعادة التسجيل بعد عودة الاتصال (الخادم يحذف السجل عند الانقطاع)
  resync() { if (Presence.cur) DB.presence(Presence.path(), Presence.payload()).catch(() => {}); },
  // تفسير رفض قاعدة البيانات: الغالب أن قواعد Firebase المنشورة لا تحوي العقد الجديدة (presence / invite / removed)
  rulesHint(err) { return /permission/i.test(String((err && (err.code || err.message)) || '')) ? 'رفضت قاعدة البيانات الكتابة لأن <b>قواعد الأمان المنشورة في Firebase قديمة</b> ولا تحتوي العقد الجديدة (<span class="num" dir="ltr">presence</span> و<span class="num" dir="ltr">invite</span> و<span class="num" dir="ltr">removed</span>).<br><br>الحل: افتح Firebase Console ← Realtime Database ← <b>Rules</b>، والصق محتوى ملف <span class="num" dir="ltr">database.rules.json</span> المحدّث من المستودع، ثم اضغط <b>Publish</b>.' : 'تعذّر الحفظ: ' + h((err && err.message) || err); },
  denied() { return !!(Watch.denied && Watch.denied['presence']); },
  list(ex) { const pr = (Store.presence || {})[ex] || {}; const now = DB.now(); return Object.keys(pr).map(k => pr[k]).filter(p => p && typeof p === 'object' && now - (+p.ts || 0) < PRESENCE_STALE); },
  counts(ex) { const l = Presence.list(ex); const names = []; const seen = {}; let guests = 0; l.forEach(p => { if (p.g || !p.u) guests++; else if (!seen[p.u]) { seen[p.u] = 1; names.push(p.n || 'متدرب'); } }); return { total: names.length + guests, names, guests }; },
  chip(ex) {
    if (!Admin.ok()) return ''; const c = Presence.counts(ex);
    if (Presence.denied()) return '<button class="live-chip warn" data-act="presence-rules" title="قواعد Firebase المنشورة قديمة">⚠️ العداد معطّل — انشر قواعد Firebase المحدّثة</button>';
    return '<button class="live-chip ' + (c.total ? 'on' : '') + '" data-act="presence-show" data-ex="' + h(ex) + '" title="من على صفحة هذا التمرين الآن"><span class="live-dot"></span><b class="num">' + c.total + '</b><span>على الصفحة الآن</span></button>';
  },
  show(ex) {
    const body = () => { const c = Presence.counts(ex);
      return '<h3>👥 على صفحة «' + h(Content.exTitle(ex)) + '» الآن</h3>' + (c.total ? '<div class="people-list">' + c.names.sort((a, b) => a.localeCompare(b, 'ar')).map(n => '<div class="person"><span class="live-dot"></span><span class="nm">' + h(n) + '</span></div>').join('') + (c.guests ? '<div class="person muted"><span class="nm">(<span class="num">' + c.guests + '</span>) زائر</span></div>' : '') + '</div>' : '<div class="empty">لا أحد على هذه الصفحة الآن.</div>') +
        '<p class="muted" style="font-family:var(--f-ui);font-size:12.5px">العدد الحالي فقط، ويتحدث تلقائيًا.</p><div class="actions">' + Invite.btn(Content.ex(ex) || { id: ex }) + '<button class="btn btn-ghost" data-x>إغلاق</button></div>'; };
    const m = UI.modal(body(), { onClose: () => { Presence._modal = null; } }); Presence._modal = { m, ex, body };
    m.el.addEventListener('click', ev => { if (ev.target.closest('[data-x]')) m.close(); });
  },
  refreshModal() { const pm = Presence._modal; if (pm && pm.m.el.isConnected) pm.m.el.innerHTML = pm.body(); }
};

// زر كشف الإجابات: للمدرب فقط، في صفحة التمرين وفي صف التمرين بلوحة التحكم (لكل أنواع التمارين بما فيها المحاكاة)
const Reveal = {
  btn(e) {
    if (!Admin.ok() || !e || e.kind === 'survey') return ''; const on = isRevealed(e);
    return '<button class="btn btn-xs btn-mint" data-act="reveal" data-id="' + h(e.id) + '" title="' + (on ? 'الإجابات ظاهرة للمتدربين — اضغط لإخفائها' : 'يكشف الإجابات الصحيحة والتصحيح لكل المتدربين') + '">' + (on ? '🔒 إخفاء الإجابات' : '🔓 كشف الإجابات') + '</button>';
  }
};
const INVITE_TTL = 3 * 3600000; // لا تظهر دعوة أقدم من 3 ساعات لمن يفتح المنصة لاحقًا
const Invite = {
  m: null, shownId: null,
  active(exId) { const iv = Store.invite; return !!(iv && iv.id && iv.ex === exId); },
  btn(e) {
    if (!Admin.ok() || !e) return ''; const on = Invite.active(e.id);
    return '<button class="btn btn-xs ' + (on ? 'btn-mint' : 'btn-primary') + '" data-act="' + (on ? 'invite-cancel' : 'invite-send') + '" data-id="' + h(e.id) + '" title="' + (on ? 'الدعوة ظاهرة للمتدربين الآن — اضغط لإلغائها' : 'نافذة تدعو المتدربين إلى هذا التمرين (تحل محل أي دعوة سابقة)') + '">📣 ' + (on ? 'مدعوون الآن · إلغاء' : 'دعوة') + '</button>';
  },
  async send(exId) {
    const e = Content.ex(exId); if (!e) return;
    try { await DB.set('invite', { id: genId('i'), ex: exId, title: String(e.title || '').slice(0, 200), ts: DB.now() }, { quiet: true }); }
    catch (err) { UI.alert(Presence.rulesHint(err), 'تعذّر إرسال الدعوة'); return; }
    UI.toast('📣 أُرسلت الدعوة إلى «' + e.title + '»');
  },
  async cancel() { try { await DB.remove('invite', { quiet: true }); UI.toast('أُلغيت الدعوة'); } catch (err) { UI.alert(Presence.rulesHint(err), 'تعذّر إلغاء الدعوة'); } },
  close() { if (Invite.m) { const m = Invite.m; Invite.m = null; m.close(); } },
  seen(id) { SafeLS.set('ec_inv_seen', id); },
  check() {
    if (!App.dataReady) return;
    const iv = Store.invite;
    if (!iv || !iv.id || Admin.ok() || !Me.isReg() || Me.isAdmin() || !Content.ex(iv.ex) || DB.now() - (+iv.ts || 0) > INVITE_TTL || SafeLS.get('ec_inv_seen') === iv.id) { Invite.close(); return; }
    if (Router.cur.view === 'ex' && Router.cur.id === iv.ex) { Invite.seen(iv.id); Invite.close(); return; }
    if (Invite.shownId === iv.id && Invite.m) return;
    Invite.close(); Invite.shownId = iv.id;
    const e = Content.ex(iv.ex); const ax = Content.axisOfEx(iv.ex); const a = ax ? Content.axis(ax) : null;
    const m = Invite.m = UI.modal('<div class="center invite-pop"><div style="font-size:46px">📣</div><h3>دعوة من المدرّب</h3><p class="muted" style="font-family:var(--f-ui);margin:0">انضم الآن إلى</p><div class="invite-title">' + h(e.icon || '✍️') + ' ' + h(e.title) + '</div>' + (a ? '<div class="muted" style="font-family:var(--f-ui);font-size:13px">' + h(a.title) + '</div>' : '') + '</div><div class="actions" style="justify-content:center"><button class="btn btn-primary" data-go-inv>انتقل إلى التمرين ←</button><button class="btn btn-ghost" data-x>إغلاق</button></div>',
      { onClose: () => { if (Invite.m === m) { Invite.m = null; Invite.seen(iv.id); } } });
    $('[data-go-inv]', m.el).onclick = () => { Invite.seen(iv.id); Invite.close(); Router.go('ex', { id: iv.ex }); };
    $('[data-x]', m.el).onclick = () => { Invite.seen(iv.id); Invite.close(); };
  }
};
