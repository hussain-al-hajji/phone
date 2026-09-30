// البحث في الصفحة الرئيسية: المطابقة، تطبيع العربية، الدخول المباشر، بقاء النتائج عند التحديث الحي — وضع المحاكاة المحلي
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path'); const U = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?demo=1';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.route(/fonts\.|cdnjs|gstatic|firebaseio|translate/, r => r.abort());
  await p.goto(U); await p.waitForTimeout(1200);
  await p.fill('#reg_name', 'سارة'); await p.fill('#reg_role', 'تسويق'); const c = await p.$('#regConsent'); if (c) await c.check(); await p.click('[data-act="register"]'); await p.waitForTimeout(600); const x = await p.$('[data-close]'); if (x) await x.click(); await p.waitForTimeout(300);
  const R = {}; const fail = []; const check = (k, v) => { R[k] = v; if (v !== true) fail.push(k); };
  const q = async t => { await p.fill('#homeSearch', t); await p.waitForTimeout(120); return p.$$eval('.hs-item', els => els.map(e => e.querySelector('b').innerText + ' | ' + e.querySelector('small').innerText)); };
  check('boxBelowHeroAboveNav', await p.evaluate(() => { const h = document.querySelector('.hero'), s = document.querySelector('.home-search'), n = document.querySelector('.home-shell'); return !!(h && s && n && (h.compareDocumentPosition(s) & 4) && (s.compareDocumentPosition(n) & 4)); }));
  R.axisHit = await q('صياد'); check('findsAxis', R.axisHit.some(r => /صيّاد الاحتكاك/.test(r) && /محور/.test(r)));
  R.exHit = await q('محكمة الاحتكاك'); check('findsExercise', R.exHit[0] && /محكمة الاحتكاك/.test(R.exHit[0]) && /تمرين/.test(R.exHit[0]));
  R.norm = await q('احتكاك'); const R2 = await q('إحتكاك'); check('hamzaNormalised', R.norm.length > 3 && R.norm.length === R2.length);
  R.taa = await q('الاحتكاك'); check('multiWordAnd', (await q('صيد الاحتكاك')).length >= 1 && (await q('صيد zzz')).length === 0);
  check('emptyMessage', /لا نتائج/.test(await (async () => { await q('zzzzq'); return p.$eval('#homeSearchRes', e => e.innerText); })()));
  R.act = await q('أغلقت فيها تطبيقا'); check('activityFound', R.act.length === 1 && /أنشطة/.test(R.act[0])); // ي/ى وهمزات: «تطبيقًا» تُطابق «تطبيقا»
  check('exercisesNotMatchedViaAxisName', (await q('احتكاك')).filter(r => /^غرفة التشخيص/.test(r)).length === 0);
  await q('صيد الاحتكاك'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  check('enterOpensTop', await p.evaluate(() => Router.cur.view === 'ex'));
  await p.evaluate(() => Router.go('home')); await p.waitForTimeout(400);
  check('queryRestoredOnReturn', (await p.inputValue('#homeSearch')) === 'صيد الاحتكاك' && (await p.$$('.hs-item')).length >= 1);
  await q('صياد'); await p.click('.hs-item[data-act="open-axis"]'); await p.waitForTimeout(500);
  check('clickAxisOpens', await p.evaluate(() => Router.cur.view === 'axis' && Router.cur.id === 'a3'));
  await p.evaluate(() => Router.go('home')); await p.waitForTimeout(400);
  await q('دفع'); await p.evaluate(() => { Store.stats = 1; App.render(); }); await p.waitForTimeout(200);
  check('survivesLiveRender', (await p.inputValue('#homeSearch')) === 'دفع' && (await p.$$('.hs-item')).length >= 1);
  await p.click('[data-act="hs-clear"]'); await p.waitForTimeout(150);
  check('clearWorks', (await p.inputValue('#homeSearch')) === '' && (await p.$$('.hs-item')).length === 0);
  // محور مخفي لا يظهر في البحث
  await p.evaluate(() => { Store.visibility = Object.assign({}, Store.visibility, { a3: false }); }); check('hiddenAxisNotIndexed', !(await q('صياد')).some(r => /محور/.test(r)));
  await p.evaluate(() => { Store.visibility = {}; });
  await p.setViewportSize({ width: 390, height: 800 }); await q('ثقة'); check('mobileNoOverflow', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  R.errors = errs; check('noPageErrors', !errs.length);
  console.log(JSON.stringify(R, null, 1)); console.log(fail.length ? 'FAIL ' + fail.join(', ') : 'PASS search scenarios'); await b.close(); process.exit(fail.length ? 1 : 0);
})();
