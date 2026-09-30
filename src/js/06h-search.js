// ---------------------------------------------------------------------
// البحث في الصفحة الرئيسية: أسماء المحاور والتمارين (والأنشطة وتقييم الختام) مع الدخول المباشر
// - يتجاهل التشكيل واختلاف الهمزات والياء/الألف المقصورة والتاء المربوطة، ويطابق كل كلمة يكتبها المستخدم.
// - نص البحث يُحفظ في UIState فتُعاد النتائج تلقائيًا عند تحديث الصفحة بالبيانات الحية.
// ---------------------------------------------------------------------
const HomeSearch = {
  norm(s) {
    return String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ي')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  },
  index() {
    const list = []; const add = (kind, e, axis, section) => list.push({ kind, id: e.id, title: e.title, icon: e.icon, axis, section, mode: e.mode, format: e.format, n: HomeSearch.norm(e.title), h: '' }); // التمارين تُطابَق بعنوانها هي فقط (اسم المحور يُعرض تحتها للسياق)
    Content.axes().forEach(a => { list.push({ kind: 'axis', id: a.id, title: a.title, icon: null, aicon: a.icon, color: Content.color(a), unit: Content.unitName(a.unit), soon: !!a._disabled, sub: a.classic || '', n: HomeSearch.norm(a.title), h: HomeSearch.norm(a.classic || '') }); if (!a._disabled) Content.exercisesOf(a.id).forEach(e => add('ex', e, a)); });
    Content.activities().forEach(e => add('ex', e, null, 'أنشطة'));
    const sv = Content.survey(); if (sv) add('ex', sv, null, 'ختام البرنامج');
    return list;
  },
  run(q) {
    const toks = HomeSearch.norm(q).split(' ').filter(Boolean); if (!toks.length) return [];
    const res = [];
    HomeSearch.index().forEach(it => {
      const all = it.n + ' ' + it.h; if (!toks.every(t => all.indexOf(t) > -1)) return;
      let score = it.kind === 'axis' ? 10 : 0; const full = toks.join(' ');
      if (it.n === full) score += 100; else if (it.n.indexOf(full) === 0) score += 60; else if (it.n.indexOf(full) > -1) score += 40; else if (toks.every(t => it.n.indexOf(t) > -1)) score += 25;
      res.push({ it, score });
    });
    return res.sort((a, b) => b.score - a.score).map(x => x.it);
  },
  mark(text, q) { // إبراز الكلمات المطابقة في العنوان
    const toks = HomeSearch.norm(q).split(' ').filter(Boolean); const raw = String(text || ''); if (!toks.length) return h(raw);
    const nr = HomeSearch.norm(raw); if (nr.length !== raw.length) return h(raw); // اختلاف الطول = تطبيع غيّر المواضع، نتخلى عن الإبراز
    const mask = new Array(raw.length).fill(false); toks.forEach(t => { let i = -1; while ((i = nr.indexOf(t, i + 1)) > -1) for (let k = i; k < i + t.length; k++) mask[k] = true; });
    let out = '', open = false; for (let i = 0; i < raw.length; i++) { if (mask[i] && !open) { out += '<mark>'; open = true; } if (!mask[i] && open) { out += '</mark>'; open = false; } out += h(raw[i]); } return out + (open ? '</mark>' : '');
  },
  item(it, q) {
    const go = it.kind === 'axis' ? 'data-act="open-axis" data-id="' + h(it.id) + '"' : 'data-go="ex" data-id="' + h(it.id) + '"';
    const ico = it.kind === 'axis' ? '<span class="hs-ico" style="background:' + it.color + '">' + iconSvg(it.aicon || 'star', 18, '#fff') + '</span>' : '<span class="hs-ico ex">' + h(it.icon || '✍️') + '</span>';
    const sub = it.kind === 'axis' ? 'محور' + (it.unit ? ' · ' + h(it.unit) : '') + (it.soon ? ' · قريبًا' : '') : (it.axis ? 'تمرين · ' + h(it.axis.title) : h(it.section || 'تمرين'));
    const tag = it.kind === 'ex' ? '<span class="hs-tag">' + (it.mode === 'group' ? '👥' : '👤') + ' ' + h(FORMATS[it.format] || 'نصية') + '</span>' : '';
    return '<button class="hs-item" role="option" ' + go + '>' + ico + '<span class="hs-txt"><b>' + HomeSearch.mark(it.title, q) + '</b><small>' + sub + '</small></span>' + tag + '<span class="hs-go">←</span></button>';
  },
  results(q) {
    if (!HomeSearch.norm(q)) return '';
    const r = HomeSearch.run(q); if (!r.length) return '<div class="hs-empty">لا نتائج لـ «' + h(q.trim()) + '» — جرّب كلمة أقصر أو جزءًا من العنوان.</div>';
    const axes = r.filter(x => x.kind === 'axis'), exs = r.filter(x => x.kind === 'ex'); const LIM = 8;
    let out = '<div class="hs-count">' + r.length + ' نتيجة</div>';
    if (axes.length) out += '<div class="hs-group">المحاور</div>' + axes.slice(0, LIM).map(x => HomeSearch.item(x, q)).join('') + (axes.length > LIM ? '<div class="hs-more">و<span class="num">' + (axes.length - LIM) + '</span> محاور أخرى — أضف كلمة لتضييق البحث</div>' : '');
    if (exs.length) out += '<div class="hs-group">التمارين والأنشطة</div>' + exs.slice(0, LIM + 4).map(x => HomeSearch.item(x, q)).join('') + (exs.length > LIM + 4 ? '<div class="hs-more">و<span class="num">' + (exs.length - LIM - 4) + '</span> نتيجة أخرى — أضف كلمة لتضييق البحث</div>' : '');
    return out;
  },
  html() {
    const q = UIState.homeQ || '';
    return '<section class="home-search"><div class="hs-box"><span class="hs-lens">' + iconSvg('search', 18) + '</span><input type="search" id="homeSearch" data-keep="home-search" data-home-search autocomplete="off" enterkeyhint="search" placeholder="ابحث في المحاور والتمارين… مثال: احتكاك، دفع، ثقة" aria-label="بحث في المحاور والتمارين" value="' + h(q) + '"><button class="hs-clear" data-act="hs-clear" aria-label="مسح البحث" ' + (q ? '' : 'hidden') + '>✕</button></div>' +
      '<div class="hs-results" id="homeSearchRes" role="listbox" aria-live="polite">' + HomeSearch.results(q) + '</div></section>';
  },
  update(val) {
    UIState.homeQ = val; const box = document.getElementById('homeSearchRes'); if (box) box.innerHTML = HomeSearch.results(val);
    const c = document.querySelector('.hs-clear'); if (c) c.hidden = !val;
  }
};
document.addEventListener('input', ev => { const t = ev.target; if (t && t.hasAttribute && t.hasAttribute('data-home-search')) HomeSearch.update(t.value); });
document.addEventListener('keydown', ev => {
  const t = ev.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-home-search')) {
    if (t && t.classList && t.classList.contains('hs-item') && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) { ev.preventDefault(); const all = [...document.querySelectorAll('.hs-item')]; const i = all.indexOf(t); const n = all[i + (ev.key === 'ArrowDown' ? 1 : -1)]; if (n) n.focus(); else if (ev.key === 'ArrowUp') document.getElementById('homeSearch').focus(); }
    return;
  }
  if (ev.key === 'Enter') { const f = document.querySelector('.hs-item'); if (f) { ev.preventDefault(); f.click(); } }
  else if (ev.key === 'Escape') { t.value = ''; HomeSearch.update(''); }
  else if (ev.key === 'ArrowDown') { const f = document.querySelector('.hs-item'); if (f) { ev.preventDefault(); f.focus(); } }
});
