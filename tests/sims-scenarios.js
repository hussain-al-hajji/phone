// محاكيات المحاور: فتح كل محاكاة، التفاعل معها، التحقق، الحفظ، وظهور النتيجة في لوحة النتائج — محاكاة دون اتصال حقيقي
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'); const path = require('path');
const MOCK = fs.readFileSync(path.join(__dirname, 'fbmock.js'), 'utf8');
const RULES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'database.rules.json'), 'utf8'));
const U = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SHOTS = process.env.SHOTS;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await ctx.route(/firebaseio\.com|identitytoolkit|securetoken/, r => r.abort());
  await ctx.route(/firebase-app-compat\.js/, r => r.fulfill({ body: MOCK, contentType: 'application/javascript' }));
  await ctx.route(/firebase-(database|auth|app-check)-compat\.js/, r => r.fulfill({ body: '', contentType: 'application/javascript' }));
  await ctx.route(/fonts\.|cdnjs|translate\.google/, r => r.abort());
  const me = { uid: 'u1', name: 'سارة أحمد', member: 1001, ts: 1, code: 'ABCDEF' };
  await p.addInitScript(([r, me]) => { window.__MOCKCFG = { data: { users: { u1: { name: me.name, member: 1001, ts: 1 } }, devices: { u1: {} } }, rules: r, delayFirst: 50 }; window.__FB_TEST_CONFIG = { apiKey: 'k', authDomain: 't', projectId: 't' };
    localStorage.setItem('ec_me', JSON.stringify(me)); localStorage.setItem('__mock_auth', JSON.stringify({ uid: me.uid, isAnonymous: true })); }, [RULES, me]);
  await p.goto(U); await p.waitForTimeout(900);
  const list = await p.evaluate(() => Content.allExercises().map(x => x.e).filter(e => e && e.format === 'sim').map(e => ({ id: e.id, sim: e.sim, mode: e.mode })));
  const R = [];
  for (const e of list) {
    await p.evaluate(id => Router.go('ex', { id }), e.id); await p.waitForTimeout(250);
    if (e.mode === 'group') { await p.click('[data-act="pick-group"][data-g="1"]').catch(() => {}); await p.waitForTimeout(250); }
    const before = await p.$eval('#simLive-' + e.id, x => x.innerText).catch(() => 'NO LIVE');
    // تفاعل: أول 4 مدخلات مختلفة (خانة، خيار، شريط)
    const inputs = await p.$$('#simZone [data-sim-f]:not([disabled])');
    let n = 0; for (const inp of inputs) { if (n >= 6) break; const t = await inp.getAttribute('type'); const vis = await inp.evaluate(x => { const l = x.closest('label'); const el = x.offsetParent ? x : l; return !!(el && el.offsetParent); });
      if (!vis || (t === 'radio' && (await inp.getAttribute('value')) === '0')) continue; try { if (t === 'range') { await inp.evaluate(x => { x.value = x.max; x.dispatchEvent(new Event('input', { bubbles: true })); }); } else if (t === 'checkbox' || t === 'radio') { await inp.evaluate(x => { const l = x.closest('label'); (l || x).click(); }); } n++; } catch (err) {} await p.waitForTimeout(60); }
    const after = await p.$eval('#simLive-' + e.id, x => x.innerText).catch(() => 'NO LIVE');
    const chk = await p.$('[data-act="sim-check"]'); if (chk) { await chk.click(); await p.waitForTimeout(250); }
    if (SHOTS) await (await p.$('#simZone')).screenshot({ path: SHOTS + '/' + e.id + '.png' }).catch(err => console.log('shot', err.message));
    await p.click('[data-act="sim-save"]'); await p.waitForTimeout(350);
    const ok = await p.$('.modal-back [data-ok]'); if (ok) { await ok.click(); await p.waitForTimeout(300); }
    const saved = await p.evaluate(id => { const ps = (window.__mock.server.posts || {})[id] || {}; const k = Object.keys(ps)[0]; return k ? ps[k].summary : null; }, e.id);
    const feed = await p.$eval('#feedZone', x => x.innerText.slice(0, 80)).catch(() => '');
    R.push({ id: e.id, sim: e.sim, changed: before !== after, checked: !!chk, saved, feedHasResult: !/لا توجد نتائج/.test(feed) });
  }
  console.log(JSON.stringify(R, null, 1)); console.log('errors:', errs);
  const bad = R.filter(r => !r.changed || !r.saved || !r.feedHasResult);
  console.log(bad.length || errs.length ? 'FAIL ' + JSON.stringify(bad.map(r => r.id)) : 'PASS ' + R.length + ' sims');
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
