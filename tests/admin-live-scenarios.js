// دخول المدرب من صفحة الدخول، أزرار الشريط العلوي حسب الدور، مشاركة الإدارة، الحضور الحي، الدعوة، والحذف
// على محاكاة Firebase تطبّق database.rules.json فعليًا — دون أي اتصال حقيقي
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'); const path = require('path');
const MOCK = fs.readFileSync(path.join(__dirname, 'fbmock.js'), 'utf8');
const RULES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'database.rules.json'), 'utf8'));
const U = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SEED = { admins: { adm1: true }, meta: { memberCounter: 1000 }, stats: { registered: 0 } };
let browser; const master = { tree: null }; const pages = [];
async function visitor(o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await ctx.exposeBinding('__srvPush', (src, json) => { master.tree = JSON.parse(json); pages.forEach(o => { if (o !== src.page) o.evaluate(j => window.__mock && __mock.replace(j), json).catch(() => {}); }); });
  pages.push(p);
  await ctx.route(/firebaseio\.com|identitytoolkit|securetoken|googleapis\.com\/identity/, r => r.abort());
  await ctx.route(/firebase-app-compat\.js/, r => r.fulfill({ body: MOCK, contentType: 'application/javascript' }));
  await ctx.route(/firebase-(database|auth|app-check)-compat\.js/, r => r.fulfill({ body: '', contentType: 'application/javascript' }));
  await ctx.route(/fonts\.|cdnjs|translate\.google/, r => r.abort());
  await p.addInitScript(([rules, server, x]) => {
    window.__FB_TEST_CONFIG = { apiKey: 'test-key', authDomain: 'test.firebaseapp.com', projectId: 'test' };
    window.__MOCKCFG = Object.assign({ data: server, rules, delayFirst: 120 }, x || {});
  }, [RULES, master.tree || SEED, o.cfg]);
  await p.goto(U); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const server = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__mock.server)));
const at = (t, pth) => pth.split('/').reduce((n, s) => (n == null ? null : n[s]), t);
const topbar = p => p.$$eval('.top-actions > *', els => els.map(e => (e.getAttribute('data-act') || e.getAttribute('data-go') || e.className.split(' ')[0]) + (e.querySelector('.lbl') ? ':' + e.querySelector('.lbl').textContent : '')));
const okModal = async p => { const b = await p.$('.modal-back [data-ok]'); if (b) { await b.click(); await p.waitForTimeout(250); } };
async function register(p, name) { await p.fill('#reg_name', name); await p.fill('#reg_role', 'مؤسس'); const c = await p.$('#regConsent'); if (c) await c.check(); await p.click('[data-act="register"]'); await p.waitForTimeout(800); const x = await p.$('.modal-back [data-close]'); if (x) await x.click(); return p.evaluate(() => Me.data && Me.data.uid); }
(async () => {
  browser = await chromium.launch(); const R = {}; const fail = [];
  const check = (k, v) => { R[k] = v; if (v !== true) fail.push(k); };

  // 1) صفحة الدخول: ترجمة + Aa فقط، وأيقونة المدرب في الأسفل
  const A = await visitor();
  R.loginTop = await topbar(A.p);
  check('loginTopHasNoGear', R.loginTop.join(',') === 'translate,prefs');
  check('trainerIconOnLogin', !!(await A.p.$('.login-page .trainer-btn[data-act="admin-enter"]')));
  // 2) الزائر: ترجمة + Aa + تسجيل دخول، والتمارين مغلقة، وزر الدخول يعيده لصفحة الدخول
  await A.p.click('[data-act="guest"]'); await A.p.waitForTimeout(300);
  R.guestTop = await topbar(A.p); check('guestTop', R.guestTop.join(',') === 'translate,prefs,guest-login:تسجيل دخول');
  await A.p.evaluate(() => Router.go('ex', { id: 'a1e1' })); await A.p.waitForTimeout(400);
  check('guestLocked', !!(await A.p.$('.locked-note')));
  let t = await server(A.p); check('guestPresence', Object.values(at(t, 'presence/a1e1') || {}).some(x => x.g === true));
  await A.p.click('[data-act="guest-login"]'); await A.p.waitForTimeout(400);
  check('guestBackToLogin', !!(await A.p.$('.login-page #reg_name')));
  t = await server(A.p); check('guestPresenceCleared', !Object.keys(at(t, 'presence/a1e1') || {}).length);
  // 3) المتدرب أ: حسابي + ترجمة + Aa + خروج (أيقونات بلا نص)
  const uidA = await register(A.p, 'سارة المتدربة');
  R.traineeTop = await topbar(A.p); check('traineeTop', R.traineeTop.join(',') === 'account,translate,prefs,logout');
  await A.p.evaluate(() => Router.go('ex', { id: 'a1e1' })); await A.p.waitForTimeout(500);
  // 4) زائر آخر على نفس التمرين
  const G = await visitor(); await G.p.click('[data-act="guest"]'); await G.p.waitForTimeout(300); await G.p.evaluate(() => Router.go('ex', { id: 'a1e1' })); await G.p.waitForTimeout(500);
  t = await server(A.p); const pr = Object.values(at(t, 'presence/a1e1') || {}); R.presence = pr.map(x => (x.g ? 'guest' : x.n));
  check('presenceBoth', pr.length === 2 && pr.some(x => x.n === 'سارة المتدربة' && x.u === uidA) && pr.some(x => x.g));
  const tw = (p, src) => p.evaluate(async src => { try { await (new Function('return (' + src + ')()'))(); return 'allowed'; } catch (e) { return 'denied'; } }, src);
  R.traineeWrites = { invite: await tw(A.p, "() => DB.set('invite', { id: 'x', ex: 'a1e1', title: 't', ts: 1 })"), removed: await tw(A.p, "() => DB.set('removed/axes/a1', true)"), othersPresence: await tw(A.p, "() => DB.set('presence/a1e1/someoneElse', { n: 'مزيف', u: 'x', g: false, ts: 1 })"), junkPresence: await tw(A.p, "() => DB.set('presence/a1e1/' + authUid(), { n: 'x', ts: 1, evil: 'y' })") };
  check('traineeWritesDenied', Object.values(R.traineeWrites).every(v => v === 'denied'));
  check('traineeCannotReadPresence', await A.p.evaluate(async () => { try { await DB.get('presence'); return false; } catch (e) { return true; } }));
  // 5) المدرب: الدخول من أيقونة صفحة الدخول بحساب Google ثم الواجهة التعليمية أولًا
  const D = await visitor({ cfg: { googleUser: { uid: 'adm1', email: 'trainer@x.com' } } });
  await D.p.click('.trainer-btn'); await D.p.waitForTimeout(300); await D.p.click('[data-google]'); await D.p.waitForTimeout(1000);
  R.adminView = await D.p.evaluate(() => Router.cur.view); check('adminLandsOnPlatform', R.adminView === 'home');
  R.adminTop = await topbar(D.p); check('adminTop', R.adminTop.join(',') === 'admin:لوحة التحكم,translate,prefs,admin-exit');
  await D.p.evaluate(() => Router.go('ex', { id: 'a1e1' })); await D.p.waitForTimeout(500);
  check('adminNotLocked', !(await D.p.$('.locked-note')) && !!(await D.p.$('#ans-a1e1')));
  await D.p.waitForTimeout(900); R.chip = await D.p.$eval('.ex-live .live-chip', e => e.innerText.replace(/\s+/g, ' ').trim()); check('chipCount2', /^2 /.test(R.chip));
  await D.p.click('.ex-live .live-chip'); await D.p.waitForTimeout(300);
  R.presenceModal = await D.p.$eval('.modal', e => e.innerText.replace(/\s+/g, ' ')); check('presenceNames', /سارة المتدربة/.test(R.presenceModal) && /\(1\) زائر/.test(R.presenceModal));
  await D.p.click('.modal [data-x]'); await D.p.waitForTimeout(200);
  t = await server(D.p); check('adminNotInPresence', !Object.values(at(t, 'presence/a1e1') || {}).some(x => x.u === 'admin' || x.n === 'الإدارة'));
  // 6) مشاركة الإدارة: نصي فردي + جماعي دون مجموعة
  await D.p.fill('#ans-a1e1', 'إجابة تجريبية من المدرب'); await D.p.click('[data-act="save-text"]'); await D.p.waitForTimeout(500);
  await D.p.evaluate(() => Router.go('ex', { id: 'a2e1' })); await D.p.waitForTimeout(400);
  check('adminNoGroupPicker', !(await D.p.$('.group-btn')));
  await D.p.fill('#ans-a2e1', 'إجابة الإدارة الجماعية'); await D.p.click('[data-act="save-text"]'); await D.p.waitForTimeout(500);
  t = await server(D.p); check('adminPostIndividual', at(t, 'posts/a1e1/admin/name') === 'الإدارة'); check('adminPostGroupNoGroupKey', at(t, 'posts/a2e1/admin/name') === 'الإدارة' && !Object.keys(at(t, 'posts/a2e1') || {}).some(k => /^g\d/.test(k)));
  R.groupFeedLabel = await D.p.$eval('#feedZone', e => /الإدارة/.test(e.innerText)); check('groupFeedShowsAdmin', R.groupFeedLabel);
  // 7) الدعوة: تظهر للمتدرب، والدعوة الجديدة تحل محل السابقة
  await A.p.evaluate(() => Router.go('home')); await A.p.waitForTimeout(300);
  await D.p.evaluate(() => Router.go('ex', { id: 'a1e4' })); await D.p.waitForTimeout(300); await D.p.click('.ex-live [data-act="invite-send"]'); await D.p.waitForTimeout(700);
  R.invite1 = await A.p.$eval('.invite-pop', e => e.innerText.replace(/\s+/g, ' ')).catch(() => null); check('inviteShown', /عين المستخدم/.test(R.invite1 || ''));
  await D.p.evaluate(() => Router.go('ex', { id: 'a1e5' })); await D.p.waitForTimeout(300); await D.p.click('.ex-live [data-act="invite-send"]'); await D.p.waitForTimeout(700);
  R.invite2 = await A.p.$$eval('.invite-pop', els => els.map(e => e.innerText.replace(/\s+/g, ' '))); check('inviteReplaced', R.invite2.length === 1 && /ماذا يحتاج المستخدم/.test(R.invite2[0]));
  check('guestNoInvite', !(await G.p.$('.invite-pop')));
  await A.p.click('[data-go-inv]'); await A.p.waitForTimeout(500); check('inviteGoes', await A.p.evaluate(() => Router.cur.view === 'ex' && Router.cur.id === 'a1e5'));
  R.inviteBtnState = await D.p.$eval('.ex-live [data-act="invite-cancel"]', e => e.innerText).catch(() => null); check('inviteCancelBtn', !!R.inviteBtnState);
  // 7b) كشف الإجابات: زر للمدرب في صفحة كل تمرين (نصي وتفاعلي ومحاكاة) وبجانب الدعوة، ولا يظهر أي زر كشف/تحقق للمتدرب
  const vis = async (p, id) => { await p.evaluate(id => Router.go('ex', { id }), id); await p.waitForTimeout(450); };
  for (const id of ['a1e1', 'a1e2', 'a1e3', 'a3e9', 'a1e8']) { await vis(D.p, id); R['revealBtn_' + id] = !!(await D.p.$('.ex-live [data-act="reveal"]')) && !!(await D.p.$('.ex-live [data-act^="invite-"]')); check('revealBtn_' + id, R['revealBtn_' + id]); }
  await vis(G.p, 'a3e9'); await vis(A.p, 'a3e9');
  check('traineeNoRevealOrCheck', !(await A.p.$('[data-act="reveal"],[data-act="sim-check"]')));
  // محاكاة التصنيف (صيد الاحتكاك): قبل الكشف لا تصحيح ولا نتيجة، وبعده يظهر التصحيح وتُقفل
  await D.p.evaluate(() => Router.go('ex', { id: 'a3e9' })); await D.p.waitForTimeout(400);
  check('classifyHiddenBefore', await D.p.evaluate(() => !document.querySelector('.cls-why,.hs em')));
  await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(700);
  check('revealSavedAsTrue', at(await server(D.p), 'reveal/a3e9') === true);
  check('classifyShownAfter', await D.p.evaluate(() => !!document.querySelector('.hs em')) );
  check('classifyLockedAfter', await D.p.evaluate(() => [...document.querySelectorAll('#simZone [data-sim-f]')].every(i => i.disabled)));
  await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(500);
  // محاكاة إعدادات (صبر المستخدم): بعد الكشف يظهر الحل النموذجي
  await vis(D.p, 'a1e8'); check('bestHiddenBefore', !(await D.p.$('.sim-best')));
  await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(700);
  check('bestShownAfter', !!(await D.p.$('.sim-best .gauge')) && /88/.test(await D.p.$eval('.sim-best', e => e.innerText)));
  await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(400);
  // 7c) الإجابة الصحيحة تظهر مع كل فقرة (لكل المتدربين، أجابوا أم لم يجيبوا) بعد كشف المدرب
  const notes = async (p, id) => { await vis(p, id); return p.$$eval('.reveal-note', e => e.length); };
  const itemsN = id => A.p.evaluate(id => Content.ex(id).items.length, id);
  for (const id of ['a1e3', 'a1e6', 'a1e2', 'a2e2']) {
    const n = await itemsN(id); const before = await notes(A.p, id); await D.p.evaluate(id => Router.go('ex', { id }), id); await D.p.waitForTimeout(300); await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(800);
    const after = await A.p.evaluate(() => document.querySelectorAll('.reveal-note').length); check('revealNotes_' + id, before === 0 && after === n && n >= 10);
    await D.p.click('.ex-live [data-act="reveal"]'); await D.p.waitForTimeout(500);
  }
  // 7d) تعطيل وضع المجموعات: تمارين المجموعات تصير فردية بلا اشتراط اختيار مجموعة
  await vis(A.p, 'a1e2'); check('groupPickerBefore', !!(await A.p.$('.group-btn')));
  await D.p.click('[data-go="admin"]'); await D.p.waitForTimeout(400);
  await D.p.evaluate(() => { for (const g of ['g_users', 'g_content', 'g_home']) { UIState.adminGrp = g; App.render(); if (document.querySelector('[data-act="groups-toggle"]')) break; } });
  check('groupsSwitchOn', await D.p.$eval('[data-act="groups-toggle"]', e => e.classList.contains('on')));
  await D.p.click('[data-act="groups-toggle"]'); await D.p.waitForTimeout(250); await okModal(D.p); await D.p.waitForTimeout(700);
  t = await server(D.p); check('groupsDisabledSaved', at(t, 'settings/groups/enabled') === false);
  await vis(A.p, 'a1e2');
  R.pillOff = await A.p.$eval('.ex-head .pill', e => e.innerText); check('modeIndividualLabel', /فردي/.test(R.pillOff) && !/جماعي/.test(R.pillOff));
  check('noGroupPickerWhenOff', !(await A.p.$('.group-btn')) && !(await A.p.$('.locked-note')));
  await A.p.evaluate(() => { const e = Content.ex('a1e2'); UIState.draft['a1e2'] = e.items.map(i => i.answer); }); await A.p.evaluate(() => App.render()); await A.p.click('[data-act="save-inter"]'); await A.p.waitForTimeout(700);
  t = await server(A.p); check('individualPostSaved', !!at(t, 'posts/a1e2/' + uidA + '/answers') && !Object.keys(at(t, 'posts/a1e2') || {}).some(k => /^g\d/.test(k)));
  check('doneCountsWhenOff', await A.p.evaluate((u) => Progress.exDone(Content.ex('a1e2'), u), uidA));
  await D.p.click('[data-act="groups-toggle"]'); await D.p.waitForTimeout(700);
  check('groupsReEnabled', at(await server(D.p), 'settings/groups/enabled') === true);
  await vis(A.p, 'a2e2'); check('groupPickerBack', !!(await A.p.$('.group-btn')));
  // 8) لوحة التحكم: لا «معاينة كمتدرب»، وزر «عرض المنصة»، وعداد + دعوة في صف التمرين
  await D.p.click('[data-go="admin"]'); await D.p.waitForTimeout(500);
  check('noPreviewTool', !(await D.p.$('[data-tool="preview"]')) && !(await D.p.$('[data-act="preview"]')));
  check('viewPlatformBtn', await D.p.$$eval('.admin-top button', b => b.some(x => /عرض المنصة/.test(x.innerText))));
  await D.p.evaluate(() => { UIState.adminGrp = 'g_content'; for (const g of ['g_content', 'g_axes', 'g_course']) { UIState.adminGrp = g; App.render(); if (document.querySelector('#axisAcc')) break; } UIState.openAcc.add('a1'); App.render(); });
  await D.p.waitForTimeout(300);
  check('exRowLive', !!(await D.p.$('.ex-row .live-row .live-chip')) && !!(await D.p.$('.ex-row .live-row [data-act^="invite-"]')));
  // 9) حذف محور وتمرين أصليين ثم الاسترجاع
  D.p.once('dialog', d => d.accept());
  await D.p.click('[data-act="delete-axis"][data-id="a2"]'); await D.p.waitForTimeout(200); await okModal(D.p); await D.p.waitForTimeout(500);
  t = await server(D.p); check('axisRemoved', at(t, 'removed/axes/a2') === true && !at(t, 'posts/a2e1'));
  check('axisGoneForTrainee', await A.p.evaluate(() => !Content.axes().some(a => a.id === 'a2') && !Content.ex('a2e1')));
  await D.p.click('[data-act="delete-ex"][data-id="a1e3"]'); await D.p.waitForTimeout(200); await okModal(D.p); await D.p.waitForTimeout(500);
  t = await server(D.p); check('exRemoved', at(t, 'removed/ex/a1e3') === true); check('exGoneForTrainee', await A.p.evaluate(() => !Content.exercisesOf('a1').some(e => e.id === 'a1e3')));
  await D.p.evaluate(() => UIState.openDrop.add('removed')); await D.p.evaluate(() => App.render());
  await D.p.click('[data-act="restore-removed"][data-id="a2"]'); await D.p.waitForTimeout(500);
  check('axisRestored', await A.p.evaluate(() => Content.axes().some(a => a.id === 'a2')));
  // 10) حذف متدرب مع كل مشاركاته
  await A.p.evaluate(() => Router.go('ex', { id: 'a1e1' })); await A.p.waitForTimeout(300);
  await A.p.fill('#ans-a1e1', 'مشاركة سارة'); await A.p.click('[data-act="save-text"]'); await A.p.waitForTimeout(500);
  t = await server(A.p); check('traineePostSaved', !!at(t, 'posts/a1e1/' + uidA));
  await D.p.evaluate(() => { UIState.adminGrp = 'g_users'; UIState.openDrop.add('users'); App.render(); }); await D.p.waitForTimeout(300);
  await D.p.click('[data-act="del-user"][data-uid="' + uidA + '"]'); await D.p.waitForTimeout(200); await okModal(D.p); await D.p.waitForTimeout(700);
  t = await server(D.p); check('userDeleted', !at(t, 'users/' + uidA) && !at(t, 'posts/a1e1/' + uidA) && !at(t, 'devices/' + uidA) && !at(t, 'secrets/' + uidA) && at(t, 'posts/a1e1/admin/name') === 'الإدارة');
  await A.p.waitForTimeout(2500); check('deletedTraineeSignedOut', await A.p.evaluate(() => !Me.data));
  // 11) خروج المدرب
  await D.p.click('.top-actions [data-act="admin-exit"]'); await D.p.waitForTimeout(200); await okModal(D.p); await D.p.waitForTimeout(700);
  check('adminLoggedOut', await D.p.evaluate(() => !Admin.ok()) && !!(await D.p.$('.login-page')));
  R.errors = [A, G, D].map(x => x.errs).flat(); check('noPageErrors', !R.errors.length);
  console.log(JSON.stringify(R, null, 1)); console.log(fail.length ? 'FAIL ' + fail.join(', ') : 'PASS admin/live scenarios');
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
