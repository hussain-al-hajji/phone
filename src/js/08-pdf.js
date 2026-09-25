// ---------------------------------------------------------------------
// محرّك PDF موحّد (html2canvas + jsPDF) — يُحمَّل عند الحاجة فقط
// يُعاد استخدامه لكل المستندات: المحتوى A5، تهنئة الإنجاز A4 أفقي، مشاركات المتدرب A5
// ---------------------------------------------------------------------
const CDN = {
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
};
const PDF_CSS = `
.pp{position:relative;overflow:hidden;background:#fff;font-size:14px;font-family:'Noto Sans Arabic','IBM Plex Sans Arabic',sans-serif;color:#15122B;direction:rtl;box-sizing:border-box}
.pp *{box-sizing:border-box}
.pp h1,.pp h2,.pp h3{font-family:'Cairo',sans-serif;margin:0;line-height:1.35}
.pp .j{text-align:justify;text-justify:inter-word}
.pp .fit{position:absolute;overflow:hidden}
.pp .num{direction:ltr;unicode-bidi:isolate}
.pp .nl{display:flex;flex-direction:column;gap:7px;margin-top:8px}
.pp .nl .it{display:flex;gap:9px;align-items:flex-start}
.pp .nl .b{width:24px;height:24px;border-radius:8px;color:#fff;font-family:Arial,sans-serif;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex:none;margin-top:3px}
.pp .pair{border-radius:12px;overflow:hidden;margin-top:8px;border:1px solid #E7E3F3}
.pp .pair .h{padding:6px 12px;font-weight:700;font-family:'IBM Plex Sans Arabic',sans-serif}
.pp .pair .b{padding:7px 12px;background:#fff}
.pp .rule{margin-top:12px;padding:10px 12px;border-radius:12px;font-weight:600}
.pp .foot{position:absolute;bottom:14px;left:28px;right:28px;display:flex;justify-content:space-between;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:10.5px;color:#8A85A3}
.pp p{margin:0 0 6px}
.pp ul,.pp ol{margin:4px 0;padding-right:18px}
`;
const PDFE = {
  async libs(zip) {
    await loadScript(CDN.h2c); await loadScript(CDN.jspdf); if (zip) await loadScript(CDN.jszip);
    if (!window.html2canvas || !window.jspdf) throw new Error('تعذر تحميل مكتبات PDF');
  },
  host() { let h0 = document.getElementById('pdfHost'); if (!h0) { h0 = document.createElement('div'); h0.id = 'pdfHost'; h0.style.cssText = 'position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none'; h0.innerHTML = '<style>' + PDF_CSS + '</style>'; document.body.appendChild(h0); } return h0; },
  fit(page) { // تصغير تدريجي لحجم خط الحاوية حتى يتسع المحتوى داخل صفحة واحدة
    $$('.fit', page).forEach(box => { let pct = 100; box.style.fontSize = pct + '%'; while (box.scrollHeight > box.clientHeight + 1 && pct > 58) { pct -= 4; box.style.fontSize = pct + '%'; } });
  },
  // pages: مصفوفة HTML لكل صفحة — size: {w,h (px), mmW, mmH, orientation, format}
  async build(pages, size, progress) {
    await PDFE.libs(); const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: size.format, orientation: size.orientation, compress: true });
    const host = PDFE.host();
    for (let i = 0; i < pages.length; i++) {
      const el = document.createElement('div'); el.className = 'pp'; el.style.width = size.w + 'px'; el.style.height = size.h + 'px';
      el.innerHTML = pages[i]; host.appendChild(el); PDFE.fit(el);
      await document.fonts.ready; // ضروري قبل كل استدعاء لـ html2canvas لتفادي تشوّه الحروف العربية
      const canvas = await window.html2canvas(el, { scale: 1.6, backgroundColor: '#ffffff', useCORS: true, logging: false, ignoreElements: n => n.id === 'app' || (n.classList && n.classList.contains('modal-back')) });
      const img = canvas.toDataURL('image/jpeg', 0.84);
      if (i > 0) doc.addPage(size.format, size.orientation);
      doc.addImage(img, 'JPEG', 0, 0, size.mmW, size.mmH);
      el.remove(); if (progress) progress(i + 1, pages.length);
    }
    return doc;
  }
};
const A5 = { w: 559, h: 794, mmW: 148, mmH: 210, format: 'a5', orientation: 'portrait' };
const A4L = { w: 1123, h: 794, mmW: 297, mmH: 210, format: 'a4', orientation: 'landscape' };
function progressModal(title) {
  const m = UI.modal('<h3>' + h(title) + '</h3><p class="muted" data-pm-txt>جارٍ التحضير…</p><div class="progress" style="margin-top:10px"><i data-pm-bar style="width:2%"></i></div>', { sticky: true });
  return { set(i, n, txt) { const b = $('[data-pm-bar]', m.el); if (b) b.style.width = Math.round(i / n * 100) + '%'; const t = $('[data-pm-txt]', m.el); if (t) t.textContent = txt || ('صفحة ' + i + ' من ' + n); }, close: m.close };
}

// ---------- قطع تصميم مشتركة لصفحات PDF ----------
const PP = {
  multiBg() { return '<div style="position:absolute;inset:0;background:#FBFAFF"></div><div style="position:absolute;inset:0;background:radial-gradient(circle at 12% 10%,rgba(109,74,255,.20),transparent 38%),radial-gradient(circle at 90% 18%,rgba(15,181,166,.20),transparent 36%),radial-gradient(circle at 85% 88%,rgba(255,122,26,.18),transparent 40%),radial-gradient(circle at 10% 90%,rgba(255,61,139,.18),transparent 40%),radial-gradient(circle at 50% 55%,rgba(47,123,255,.10),transparent 45%)"></div>'; },
  scatter(axes, variant) {
    const spots = variant ? [[30, 60], [470, 40], [20, 330], [490, 300], [60, 680], [440, 700], [250, 30], [240, 730]] : [[40, 40], [480, 70], [30, 400], [480, 420], [90, 700], [420, 690], [260, 740], [250, 20]];
    return spots.map((p, i) => { const a = axes[i % Math.max(1, axes.length)]; if (!a) return ''; const col = Content.color(a); const sz = 34 + (i % 3) * 8; return '<div style="position:absolute;left:' + p[0] + 'px;top:' + p[1] + 'px;width:' + (sz + 16) + 'px;height:' + (sz + 16) + 'px;border-radius:' + (i % 2 ? '50%' : '16px') + ';background:' + tint(col, .14) + ';display:flex;align-items:center;justify-content:center;transform:rotate(' + ((i * 17) % 30 - 15) + 'deg)">' + iconSvg(a.icon || 'star', sz, col, 2) + '</div>'; }).join('');
  },
  decor(seed, op = .14) { return '<div style="position:absolute;inset:0">' + decorShapes(seed, op) + '</div>'; },
  numbered(list, col) { return '<div class="nl">' + list.map((t, i) => '<div class="it"><span class="b" style="background:' + col + '">' + (i + 1) + '</span><div class="j" style="flex:1">' + t + '</div></div>').join('') + '</div>'; },
  foot(left, n) { return '<div class="foot"><span>' + h(left) + '</span><span class="num">' + n + '</span></div>'; }
};
function frontCover(title, sub, axes, extraLine) {
  return PP.multiBg() + PP.scatter(axes, 0) +
    '<div style="position:absolute;left:52px;right:52px;top:210px;background:#fff;border-radius:28px;box-shadow:0 20px 50px rgba(40,25,110,.16);padding:38px 30px;text-align:center">' +
    '<div style="width:74px;height:74px;margin:0 auto 14px;border-radius:22px;background:linear-gradient(120deg,#5B3DF5,#B23CF0 45%,#FF3D8B 75%,#FFB23F);display:flex;align-items:center;justify-content:center">' + iconSvg('cart', 38, '#fff', 2) + '</div>' +
    '<h1 style="font-size:30px;font-weight:800">' + h(title) + '</h1>' + (extraLine ? '<div style="margin-top:10px;font-family:Cairo;font-weight:800;font-size:22px;color:#5B3DF5">' + h(extraLine) + '</div>' : '') +
    '<p style="margin-top:12px;color:#4A4566;font-size:15px">' + h(sub) + '</p><div style="margin-top:16px;font-family:IBM Plex Sans Arabic;font-size:12px;color:#8A85A3" class="num">' + fmtDate(Date.now()) + '</div></div>';
}
function backCover(axes) {
  const p = Content.pdf();
  return PP.multiBg() + PP.scatter(axes.slice().reverse(), 1) +
    '<div style="position:absolute;left:60px;right:60px;top:250px;background:#fff;border-radius:28px;box-shadow:0 20px 50px rgba(40,25,110,.16);padding:34px 28px;text-align:center">' +
    '<div style="font-family:IBM Plex Sans Arabic;font-size:12px;font-weight:700;color:#FF3D8B;letter-spacing:.5px">المدرّب</div>' +
    '<h1 style="font-size:28px;font-weight:800;margin-top:6px">' + h(p.trainerName) + '</h1><div style="margin-top:6px;color:#5B3DF5;font-weight:700;font-family:IBM Plex Sans Arabic">' + h(p.trainerRole) + '</div>' +
    '<p class="j" style="margin-top:14px;color:#4A4566;font-size:14px">' + h(p.trainerBio) + '</p>' + (p.trainerContact ? '<div style="margin-top:12px;font-family:IBM Plex Sans Arabic;font-weight:700;color:#15122B;direction:ltr">' + h(p.trainerContact) + '</div>' : '') + '</div>';
}
function tocPages(axes, title) { // توزيع متساوٍ للمحاور على صفحات الفهرس دون قطع أي بطاقة
  const MAX = 5; const pagesN = Math.max(1, Math.ceil(axes.length / MAX)); const base = Math.floor(axes.length / pagesN), extra = axes.length % pagesN;
  const out = []; let k = 0;
  for (let p = 0; p < pagesN; p++) {
    const cnt = base + (p < extra ? 1 : 0); const list = axes.slice(k, k + cnt); k += cnt;
    out.push('<div style="position:absolute;inset:0;background:#FBFAFF"></div><div style="position:absolute;top:34px;right:34px;left:34px"><div style="font-family:IBM Plex Sans Arabic;font-size:12px;font-weight:700;color:#5B3DF5">' + h(title) + '</div><h2 style="font-size:24px;font-weight:800">فهرس المحتوى' + (pagesN > 1 ? ' <span class="num" style="font-size:14px;color:#8A85A3">(' + (p + 1) + '/' + pagesN + ')</span>' : '') + '</h2></div>' +
      '<div style="position:absolute;top:104px;right:34px;left:34px;display:flex;flex-direction:column;gap:12px">' + list.map(a => { const col = Content.color(a); return '<div style="display:flex;gap:12px;align-items:flex-start;background:' + tint(col, .08) + ';border-radius:18px;padding:12px 14px;border-right:6px solid ' + col + '"><div style="width:48px;height:48px;border-radius:14px;background:' + col + ';display:flex;align-items:center;justify-content:center;flex:none">' + iconSvg(a.icon || 'star', 26, '#fff') + '</div><div style="flex:1"><div style="font-family:Cairo;font-weight:800;font-size:15.5px">' + h(a.title) + '</div>' + (a.classic ? '<div style="font-family:IBM Plex Sans Arabic;font-size:11.5px;color:#8A85A3">' + h(a.classic) + '</div>' : '') + '<div class="j" style="font-size:11.5px;color:#4A4566;margin-top:3px;max-height:54px;overflow:hidden">' + h(stripHtml(a.desc)) + '</div></div></div>'; }).join('') + '</div>');
  }
  return out;
}
function axisCover(a, sub) {
  const col = Content.color(a);
  return '<div style="position:absolute;inset:0;background:linear-gradient(150deg,' + shade(col, .1) + ',' + shade(col, -.45) + ')"></div>' + PP.decor(a.id + 'pdf', .16) +
    '<div style="position:absolute;top:210px;left:40px;right:40px;text-align:center;color:#fff">' +
    '<div style="width:110px;height:110px;margin:0 auto 20px;border-radius:32px;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center">' + iconSvg(a.icon || 'star', 60, '#fff', 1.7) + '</div>' +
    '<div style="font-family:IBM Plex Sans Arabic;font-weight:700;font-size:13px;opacity:.9">' + h(sub || UNIT_NAMES[a.unit] || '') + '</div>' +
    '<h1 style="color:#fff;font-size:30px;font-weight:800;margin-top:6px">' + h(a.title) + '</h1>' + (a.classic ? '<div style="margin-top:8px;font-family:IBM Plex Sans Arabic;font-size:14px;opacity:.92">' + h(a.classic) + '</div>' : '') +
    '<p class="j" style="margin-top:18px;font-size:13.5px;line-height:1.9;opacity:.95">' + h(stripHtml(a.desc)) + '</p></div>';
}
function pageHeader(a, label) {
  const col = Content.color(a);
  return '<div style="position:absolute;top:0;left:0;right:0;height:92px;background:linear-gradient(120deg,' + col + ',' + shade(col, -.4) + ');overflow:hidden">' + PP.decor(a.id + 'hd', .14) +
    '<div style="position:absolute;top:22px;right:26px;left:26px;display:flex;gap:12px;align-items:center;color:#fff"><div style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex:none">' + iconSvg(a.icon || 'star', 26, '#fff') + '</div><div style="flex:1;min-width:0"><div style="font-family:Cairo;font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + h(a.title) + '</div><div style="font-family:IBM Plex Sans Arabic;font-size:11px;opacity:.9">' + label + '</div></div></div></div>';
}
function slidePage(a, s, i, n, pageNo) {
  const col = Content.color(a); const t = SLIDE_TYPES[s.type] ? s.type : 'principle';
  let body = '<div style="display:inline-block;padding:3px 12px;border-radius:999px;background:' + tint(col, .14) + ';color:' + shade(col, -.3) + ';font-family:IBM Plex Sans Arabic;font-weight:700;font-size:11.5px">' + h(SLIDE_TYPES[t]) + '</div>' +
    (s.image ? '<img src="' + s.image + '" style="width:100%;max-height:190px;object-fit:cover;border-radius:14px;margin-top:10px;display:block">' : '') +
    '<h2 style="font-size:1.45em;font-weight:800;margin:10px 0 8px">' + h(s.title) + '</h2>';
  const rule = s.rule ? '<div class="rule j" style="background:' + tint(col, .1) + ';border-right:4px solid ' + col + '">' + sanitize(richHtml(s.rule)) + '</div>' : '';
  if (t === 'opening' || t === 'summary') body += '<div class="j">' + withLede(richHtml(s.text)) + '</div>' + rule;
  else if (t === 'principle') body += '<div class="j">' + richHtml(s.intro) + '</div>' + (s.points && s.points.length ? PP.numbered(s.points.map(p => boldTerm(p)), col) : '') + rule;
  else body += (s.items || []).map(it => { const k = String(it).indexOf('::'); const hd = k > -1 ? it.slice(0, k) : it, bd = k > -1 ? it.slice(k + 2) : ''; return '<div class="pair"><div class="h" style="background:' + (t === 'mistakes' ? '#FDECEC;color:#A12A2E' : tint(col, .12)) + '">' + h(hd.trim()) + '</div>' + (bd ? '<div class="b j" style="' + (t === 'mistakes' ? 'background:#EEFAF3;color:#146B40' : '') + '">' + (t === 'mistakes' ? '<b>✓ التصحيح: </b>' : '') + h(bd.trim()) + '</div>' : '') + '</div>'; }).join('') + rule;
  return pageHeader(a, 'الشريحة <span class="num">' + (i + 1) + ' / ' + n + '</span>') + '<div class="fit" style="top:110px;bottom:44px;right:30px;left:30px;line-height:1.85">' + body + '</div>' + PP.foot(Content.courseTitle(), pageNo);
}

// ---------- ملف المحتوى ----------
async function buildContentPdf() {
  const pm = progressModal('📄 استخراج المحتوى');
  try {
    const p = Content.pdf(); const axes = Content.eligibleAxes(); const title = p.coverTitle || Content.courseTitle();
    const pages = [frontCover(title, p.coverSub, axes)];
    tocPages(axes, title).forEach(x => pages.push(x));
    axes.forEach(a => { pages.push(axisCover(a)); a.slides.forEach((s, i) => pages.push(slidePage(a, s, i, a.slides.length, pages.length + 1))); });
    pages.push(backCover(axes));
    const doc = await PDFE.build(pages, A5, (i, n) => pm.set(i, n));
    doc.save((title || 'content').replace(/[\\/:*?"<>|]/g, '') + '.pdf'); pm.close(); UI.toast('✅ تم إنشاء ملف المحتوى');
  } catch (e) { pm.close(); UI.alert('تعذر إنشاء الملف: ' + h(e.message || e)); }
}

// ---------- تهنئة الإنجاز: صفحة A4 أفقية مستقلة تمامًا ----------
async function buildCongratsPdf(name) {
  const pm = progressModal('🏆 تهنئة الإنجاز');
  try {
    const c = Content.congrats(); const rep = s => String(s || '').replace(/\{\{name\}\}/g, name).replace(/\{\{courseTitle\}\}/g, Content.courseTitle()).replace(/\{\{date\}\}/g, fmtDate(Date.now()));
    const axes = Content.eligibleAxes();
    const page = PP.multiBg() + '<div style="position:absolute;inset:26px;border-radius:30px;border:3px solid rgba(91,61,245,.25)"></div>' +
      axes.slice(0, 8).map((a, i) => { const pos = [[60, 60], [1010, 60], [60, 660], [1010, 660], [300, 40], [770, 690], [40, 360], [1030, 360]][i]; const col = Content.color(a); return '<div style="position:absolute;left:' + pos[0] + 'px;top:' + pos[1] + 'px;width:56px;height:56px;border-radius:18px;background:' + tint(col, .15) + ';display:flex;align-items:center;justify-content:center">' + iconSvg(a.icon, 30, col) + '</div>'; }).join('') +
      '<div style="position:absolute;left:150px;right:150px;top:100px;bottom:100px;background:#fff;border-radius:30px;box-shadow:0 24px 60px rgba(40,25,110,.16);padding:40px 60px;text-align:center">' +
      '<div style="font-size:60px;line-height:1.1">' + h(c.emoji) + '</div><h1 style="font-size:34px;font-weight:800;margin-top:6px">' + h(rep(c.title)) + '</h1>' +
      '<div style="font-family:Cairo;font-size:42px;font-weight:800;color:#5B3DF5;margin:14px 0 6px">' + h(name) + '</div>' +
      c.paragraphs.map(p => '<p style="font-size:18px;color:#4A4566;margin-top:8px;line-height:1.8">' + h(rep(p)) + '</p>').join('') +
      '<div style="position:absolute;bottom:28px;left:60px;right:60px;display:flex;justify-content:space-between;font-family:IBM Plex Sans Arabic;font-size:15px;color:#4A4566"><span>' + h(rep(c.footerRight)) + '</span><span>' + h(rep(c.footerLeft)) + '</span></div></div>';
    const doc = await PDFE.build([page], A4L, (i, n) => pm.set(i, n));
    doc.save('تهنئة إنجاز - ' + name + '.pdf'); pm.close();
  } catch (e) { pm.close(); UI.alert('تعذر إنشاء الملف: ' + h(e.message || e)); }
}

// ---------- مشاركات متدرب محدد ----------
function exCorrectness(e, answers) { const a = arr(answers); let sc = 0; e.items.forEach((it, i) => { const v = a[i]; if (v == null || v === '') return; if (e.format === 'mcq' ? +v === +it.answer : e.format === 'truefalse' ? ((v === true || v === 'true') === !!it.answer) : v === it.answer) sc++; }); return sc; }
function participationOf(uid) {
  const g = Groups.assignedOf(uid); const sections = [];
  const pick = e => { const ps = Store.posts[e.id] || {}; if (e.mode === 'group') { if (!g) return null; const p = ps['g' + g]; return p ? { p, group: g } : null; } const p = ps[uid]; return p ? { p } : null; };
  Content.eligibleAxes().forEach(a => { const list = Content.exercisesOf(a.id).map(e => ({ e, r: pick(e) })).filter(x => x.r); if (list.length) sections.push({ a, list }); });
  const acts = Content.activities().map(e => ({ e, r: pick(e) })).filter(x => x.r); if (acts.length) sections.push({ a: { id: 'acts', title: 'الأنشطة العامة', classic: '', desc: '', icon: 'bolt', color: 2 }, list: acts, sub: 'أنشطة' });
  const sv = Content.survey(); if (sv) { const r = pick(sv); if (r) sections.push({ a: { id: 'sv', title: 'ختام البرنامج', classic: '', desc: '', icon: 'trophy', color: 3 }, list: [{ e: sv, r }], sub: 'الاستطلاع الختامي' }); }
  return sections;
}
function answerPdfHtml(e, p) {
  if (e.format === 'text') return '<div class="j" style="white-space:pre-wrap;background:#FAF9FE;border:1px solid #E7E3F3;border-radius:12px;padding:10px 12px">' + h(p.text || '') + '</div>';
  const a = arr(p.answers);
  return '<div class="nl">' + e.items.map((it, i) => {
    const v = a[i]; let q = '', ans = '', ok = false, corr = '';
    if (e.format === 'mcq') { q = it.q; ans = v != null ? LETTERS[v] + ') ' + (it.options[v] || '') : '—'; ok = v != null && +v === +it.answer; corr = LETTERS[it.answer] + ') ' + it.options[it.answer]; }
    else if (e.format === 'truefalse') { q = it.q; ans = v == null ? '—' : ((v === true || v === 'true') ? 'صح' : 'خطأ'); ok = v != null && ((v === true || v === 'true') === !!it.answer); corr = it.answer ? 'صح' : 'خطأ'; }
    else if (e.format === 'fillblank') { q = it.text.replace('___', '____'); ans = v || '—'; ok = v === it.answer; corr = it.answer; }
    else { q = '(أ) ' + it.a + ' — (ب) ' + it.b; ans = v ? '(' + (v === 'a' ? 'أ' : 'ب') + ') ' + it[v] : '—'; ok = v === it.answer; corr = '(' + (it.answer === 'a' ? 'أ' : 'ب') + ') ' + it[it.answer]; }
    return '<div class="it"><span class="b" style="background:' + (ok ? '#17A864' : '#E5484D') + '">' + (i + 1) + '</span><div style="flex:1"><div style="font-size:.92em;color:#4A4566">' + h(q) + '</div><div style="font-weight:700;color:' + (ok ? '#10573A' : '#A12A2E') + '">' + (ok ? '✓ ' : '✗ ') + h(ans) + (ok ? '' : ' <span style="font-weight:500;color:#10573A">— الصحيح: ' + h(corr) + '</span>') + '</div></div></div>';
  }).join('') + '</div><div style="margin-top:8px;font-family:IBM Plex Sans Arabic;font-weight:700">النتيجة: ' + exCorrectness(e, a) + ' من ' + e.items.length + '</div>';
}
function personPages(uid) {
  const u = Store.users[uid] || {}; const axes = Content.eligibleAxes(); const secs = participationOf(uid);
  const pages = [frontCover(Content.courseTitle(), 'سجل مشاركات المتدرب في تمارين وأنشطة البرنامج', axes, (u.name || '') + ' · سجل مشاركات')];
  if (!secs.length) { pages.push(PP.multiBg() + '<div style="position:absolute;left:50px;right:50px;top:280px;background:#fff;border-radius:24px;padding:30px;text-align:center;box-shadow:0 16px 40px rgba(40,25,110,.12)"><div style="font-size:40px">🗒️</div><h2 style="margin-top:8px">لا توجد مشاركات مسجلة</h2><p style="margin-top:8px;color:#4A4566">لم يشارك ' + h(u.name || 'هذا المتدرب') + ' في أي تمرين أو نشاط حتى تاريخ إنشاء هذا الملف (' + fmtDate(Date.now()) + ').</p></div>'); return pages; }
  secs.forEach(sec => {
    pages.push(axisCover(sec.a, sec.sub));
    sec.list.forEach(({ e, r }) => {
      const col = Content.color(sec.a);
      const body = '<div style="display:flex;gap:10px;align-items:center"><span style="font-size:26px">' + h(e.icon || '✍️') + '</span><h2 style="font-size:1.35em;font-weight:800">' + h(e.title) + '</h2></div>' +
        '<div style="margin-top:6px;font-family:IBM Plex Sans Arabic;font-size:11.5px;color:#8A85A3">' + (e.mode === 'group' ? '👥 جماعي' : '👤 فردي') + ' · ' + h(FORMATS[e.format] || '') + ' · ' + fmtDate(r.p.ts) + '</div>' +
        (e.scenario ? '<div class="j" style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#FFFBF4;border:1px solid #F4E3EA;font-size:.95em"><b>الموقف: </b>' + stripHtml(e.scenario) + '</div>' : '') +
        (e.task && e.format === 'text' ? '<div class="j" style="margin-top:8px;font-size:.95em"><b>المطلوب: </b>' + h(stripHtml(e.task)) + '</div>' : '') +
        (r.group ? '<div style="margin-top:10px;display:inline-block;padding:2px 10px;border-radius:999px;background:' + tint(col, .14) + ';font-family:IBM Plex Sans Arabic;font-size:11.5px;font-weight:700">(ضمن ' + h(Groups.label(r.group)) + ')</div>' : '') +
        '<div style="margin-top:10px;font-family:Cairo;font-weight:700;color:' + col + '">إجابة المتدرب</div>' + answerPdfHtml(e, r.p);
      pages.push(pageHeader(sec.a, h(u.name || '') + ' · سجل مشاركات') + '<div class="fit" style="top:110px;bottom:44px;right:30px;left:30px;line-height:1.8">' + body + '</div>' + PP.foot(Content.courseTitle(), pages.length + 1));
    });
  });
  pages.push(backCover(axes));
  return pages;
}
async function personPdfDoc(uid, pm) { return PDFE.build(personPages(uid), A5, pm ? (i, n) => pm.set(i, n) : null); }
function safeName(s) { return String(s || 'متدرب').replace(/[\\/:*?"<>|]/g, '').trim() || 'متدرب'; }

// ---------- CSV ----------
function csvEsc(v) { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function csvBlob(rows) { return new Blob(['﻿' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); }
function answerText(e, p) {
  if (e.format === 'text') return p.text || '';
  const a = arr(p.answers);
  return e.items.map((it, i) => { const v = a[i]; let t = '—'; if (v != null && v !== '') { if (e.format === 'mcq') t = LETTERS[v] + ') ' + (it.options[v] || ''); else if (e.format === 'truefalse') t = (v === true || v === 'true') ? 'صح' : 'خطأ'; else if (e.format === 'fillblank') t = v; else t = '(' + (v === 'a' ? 'أ' : 'ب') + ') ' + it[v]; } return (i + 1) + ': ' + t; }).join(' | ');
}
function exportAllCsv() {
  const rows = [['القسم', 'التمرين', 'النموذج', 'النوع', 'المشارك / المجموعة', 'المسمى', 'الإجابة', 'النتيجة', 'الإعجابات', 'التاريخ']];
  Content.allExercises().forEach(({ e, section }) => {
    const ps = Store.posts[e.id] || {};
    Object.keys(ps).forEach(k => { const p = ps[k]; if (!p) return; const isG = k.charAt(0) === 'g' && e.mode === 'group';
      rows.push([section, e.title, FORMATS[e.format] || '', e.mode === 'group' ? 'جماعي' : 'فردي', isG ? Groups.label(+k.slice(1)) + ' (' + (p.name || '') + ')' : (p.name || ''), isG ? '' : (p.role || ''), answerText(e, p), e.format === 'text' ? '' : exCorrectness(e, p.answers) + ' من ' + e.items.length, Object.keys(p.likes || {}).length, p.ts ? fmtTime(p.ts) : '']); });
  });
  Object.keys(Store.labAnswers || {}).forEach(g => { const ga = Store.labAnswers[g] || {}; COURSE.lab.stages.forEach((s, i) => { const a = ga['s' + i]; if (a) rows.push(['المختبر الختامي', (i + 1) + '. ' + s.title, 'نصية حرة', 'جماعي', Groups.label(+g.slice(1)) + ' (' + (a.name || '') + ')', '', a.text || '', '', Object.keys(a.likes || {}).length, a.ts ? fmtTime(a.ts) : '']); }); });
  downloadBlob(csvBlob(rows), 'مشاركات البرنامج.csv'); UI.toast('✅ تم تصدير ' + (rows.length - 1) + ' مشاركة');
}
function personCsvBlob(uid) {
  const u = Store.users[uid] || {}; const rows = [['المتدرب', 'القسم', 'التمرين', 'النموذج', 'السياق', 'الإجابة', 'النتيجة', 'التاريخ']];
  participationOf(uid).forEach(sec => sec.list.forEach(({ e, r }) => rows.push([u.name || '', sec.a.title, e.title, FORMATS[e.format] || '', r.group ? 'ضمن ' + Groups.label(r.group) : 'فردي', answerText(e, r.p), e.format === 'text' ? '' : exCorrectness(e, r.p.answers) + ' من ' + e.items.length, r.p.ts ? fmtTime(r.p.ts) : ''])));
  if (rows.length === 1) rows.push([u.name || '', '—', '—', '—', '—', 'لا توجد مشاركات مسجلة لهذا المتدرب حتى الآن', '', fmtDate(Date.now())]);
  return csvBlob(rows);
}
async function exportAllPersons(kind) {
  const uids = Object.keys(Store.users || {}); if (!uids.length) { UI.alert('لا يوجد مسجّلون.'); return; }
  const pm = progressModal(kind === 'pdf' ? '📦 تصدير كل الملفات PDF' : '📦 تصدير كل الملفات CSV');
  try {
    await PDFE.libs(true); const zip = new window.JSZip(); const used = {};
    for (let i = 0; i < uids.length; i++) {
      const u = Store.users[uids[i]]; let nm = safeName(u.name); if (used[nm]) nm += ' (' + (++used[nm]) + ')'; else used[nm] = 1;
      pm.set(i, uids.length, 'المتدرب ' + (i + 1) + ' من ' + uids.length + ': ' + (u.name || ''));
      if (kind === 'pdf') { const doc = await personPdfDoc(uids[i]); zip.file(nm + '.pdf', doc.output('blob')); }
      else zip.file(nm + '.csv', personCsvBlob(uids[i]));
    }
    pm.set(1, 1, 'جارٍ ضغط الملفات…');
    const blob = await zip.generateAsync({ type: 'blob' }); downloadBlob(blob, kind === 'pdf' ? 'مشاركات المتدربين PDF.zip' : 'مشاركات المتدربين CSV.zip'); pm.close();
  } catch (e) { pm.close(); UI.alert('تعذر التصدير: ' + h(e.message || e)); }
}

// ---------- بطاقة رقم العضوية PNG ----------
async function saveMemberCard(me) {
  try {
    await document.fonts.ready;
    const W = 1000, H = 600; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5B3DF5'); g.addColorStop(.5, '#B23CF0'); g.addColorStop(.78, '#FF3D8B'); g.addColorStop(1, '#FFB23F');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.12)'; [[880, 90, 150], [120, 540, 190], [540, 20, 80]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = '#fff'; const rr = (x, y, w, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    rr(60, 70, W - 120, H - 140, 36); c.fill();
    c.direction = 'rtl'; c.textAlign = 'right'; c.fillStyle = '#5B3DF5'; c.font = '700 26px "IBM Plex Sans Arabic", sans-serif'; c.fillText(Content.courseTitle(), W - 110, 140);
    c.fillStyle = '#15122B'; c.font = '800 54px Cairo, sans-serif'; c.fillText(me.name, W - 110, 250);
    c.fillStyle = '#4A4566'; c.font = '500 28px "IBM Plex Sans Arabic", sans-serif'; c.fillText(me.role || '', W - 110, 305);
    c.fillStyle = '#8A85A3'; c.font = '700 22px "IBM Plex Sans Arabic", sans-serif'; c.fillText('رقم العضوية', W - 110, 400);
    c.direction = 'ltr'; c.textAlign = 'right'; c.fillStyle = '#15122B'; c.font = '800 76px Cairo, sans-serif'; c.fillText(pad4(me.member || 0), W - 110, 480);
    c.textAlign = 'left'; c.direction = 'rtl'; c.fillStyle = '#8A85A3'; c.font = '500 20px "IBM Plex Sans Arabic", sans-serif'; c.fillText('ادخل به من أي جهاز: «مسجّل مسبقًا؟ الدخول برقم العضوية»', 110, 480);
    await new Promise(res => cv.toBlob(b => { downloadBlob(b, 'رقم العضوية ' + pad4(me.member || 0) + '.png'); res(); }, 'image/png'));
    UI.toast('✅ تم حفظ بطاقة رقم العضوية على جهازك');
  } catch (e) { UI.alert('تعذر حفظ البطاقة: ' + h(e.message || e)); }
}
