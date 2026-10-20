/* 진격의 NCS — 화면 엔진 (2026-10-20, 자체 문항 글자판)
   자료: data/items.js 의 window.NCS = {items:[...], mocks:[{key,name,form,min,ids}], types:{유형id:이름}}
   문항 {i, a:영역, t:유형id, f:형태, d:난도, g:공통, p:발문, m:[자료 블록], c:[선지 5], x:정답, e:{풀이,선지,함정}}
   저장: localStorage "ncs.v2" = {h:{id:[푼 횟수, 마지막 정답 0/1, 첫 정답 0/1, 시각]}, m:{모의키:{s,t,ans,ts}}} */
(function () {
  "use strict";
  var D = window.NCS || { items: [], mocks: [], types: {} };
  D.mocks = D.mocks || []; D.types = D.types || {};
  var AREAS = ["의사소통", "수리", "문제해결", "자원관리", "조직이해", "정보", "기술", "대인관계", "자기개발", "직업윤리"];
  var BYID = {}; D.items.forEach(function (q) { BYID[q.i] = q; });
  var GROUP = {}; D.items.forEach(function (q) { if (q.g) (GROUP[q.g] = GROUP[q.g] || []).push(q.i); });
  var KEY = "ncs.v2";
  var S = load();
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); s.h = s.h || {}; s.m = s.m || {}; return s; } catch (e) { return { h: {}, m: {} }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function rec(id, ok) {
    var h = S.h[id]; if (!h) h = S.h[id] = [0, 0, ok ? 1 : 0, 0];
    h[0]++; h[1] = ok ? 1 : 0; h[3] = Date.now(); save();
  }
  var $app = document.getElementById("app"), $top = document.getElementById("top");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CIR = ["", "①", "②", "③", "④", "⑤"];
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function typeName(q) { return D.types[q.t] || ""; }

  /* ── 자료 블록 그리기 ── */
  function blocks(m) { return (m || []).map(block).join(""); }
  function title(b) { return b.제목 ? '<div class="bt">' + esc(b.제목) + (b.단위 ? '<span class="un">(단위: ' + esc(b.단위) + ')</span>' : '') + '</div>' : ''; }
  function block(b) {
    switch (b.종류) {
      case "글":
        return '<div class="bk bk-text">' + title(b) + (b.문단 || []).map(function (p, i) { return '<p>' + (b.표지 && b.표지[i] ? '<b class="lb">' + esc(b.표지[i]) + '</b> ' : '') + esc(p) + '</p>'; }).join("") + '</div>';
      case "표":
        return '<div class="bk bk-table">' + title(b) + '<div class="tw"><table><thead><tr>' + (b.열 || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join("") + '</tr></thead><tbody>' +
          (b.행 || []).map(function (r) { return '<tr>' + r.map(function (c, i) { return (i ? '<td>' : '<th scope="row">') + esc(c) + (i ? '</td>' : '</th>'); }).join("") + '</tr>'; }).join("") +
          '</tbody></table></div>' + (b.주 || []).map(function (n) { return '<div class="nt">' + esc(n) + '</div>'; }).join("") + '</div>';
      case "그래프": return '<div class="bk bk-chart">' + title(b) + chart(b) + '</div>';
      case "보기": return '<div class="bk bk-box"><div class="bx">보기</div>' + (b.항목 || []).map(function (r) { return '<div class="br"><b>' + esc(r[0]) + '.</b> ' + esc(r[1]) + '</div>'; }).join("") + '</div>';
      case "조건": return '<div class="bk bk-box"><div class="bx' + ((b.제목 || "").length > 14 ? ' long' : '') + '">' + esc(b.제목 || "조건") + '</div>' + (b.항목 || []).map(function (r) { return '<div class="br">· ' + esc(r) + '</div>'; }).join("") + '</div>';
      case "공문":
        var mh = b.머리 || {};
        return '<div class="bk bk-doc">' + Object.keys(mh).map(function (k) { return '<div class="dh"><b>' + esc(k) + '</b> ' + esc(mh[k]) + '</div>'; }).join("") +
          '<div class="db">' + (b.본문 || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("") + '</div>' +
          ((b.붙임 || []).length ? '<div class="da"><b>붙임</b> ' + b.붙임.map(esc).join(" / ") + '</div>' : '') + '</div>';
      case "그림": return '<div class="bk bk-fig">' + title(b) + (b.svg || "") + (b.설명 ? '<div class="nt">' + esc(b.설명) + '</div>' : '') + '</div>';   // svg 는 가져오기.py 에서 허용 태그만 남긴다
      case "코드": return '<div class="bk bk-code">' + (b.언어 ? '<div class="bt">' + esc(b.언어) + '</div>' : '') + '<pre>' + esc(b.본문) + '</pre></div>';
    }
    return "";
  }
  var PAL = ["#111419", "#E5202E", "#2563EB", "#16B364", "#F59E0B"];
  function chart(b) {
    var W = 340, H = 200, L = 40, B = 28, T = 14, xs = b.x || [], ser = b.계열 || [];
    if (b.모양 === "원") {
      var v = (ser[0] || { 값: [] }).값, tot = v.reduce(function (s, x) { return s + x; }, 0) || 1, a0 = -Math.PI / 2, out = "";
      v.forEach(function (x, i) {
        var a1 = a0 + x / tot * Math.PI * 2, r = 70, cx = 90, cy = 100, big = a1 - a0 > Math.PI ? 1 : 0;
        out += '<path d="M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a0)).toFixed(1) + ' ' + (cy + r * Math.sin(a0)).toFixed(1) + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1) + 'Z" fill="' + PAL[i % 5] + '" stroke="#fff" stroke-width="2"/>';
        out += '<rect x="180" y="' + (24 + i * 24) + '" width="12" height="12" rx="3" fill="' + PAL[i % 5] + '"/><text x="198" y="' + (35 + i * 24) + '" class="ax">' + esc(xs[i]) + ' ' + x + '</text>';
        a0 = a1;
      });
      return '<svg viewBox="0 0 ' + W + ' 200" class="ch">' + out + '</svg>';
    }
    var all = []; ser.forEach(function (s) { all = all.concat(s.값); });
    var mx = Math.max.apply(null, all.concat([0])), mn = Math.min.apply(null, all.concat([0]));
    var step = Math.pow(10, Math.floor(Math.log10((mx - mn) || 1))), top = Math.ceil(mx / step) * step || 1, bot = mn < 0 ? Math.floor(mn / step) * step : 0;
    function y(v) { return T + (top - v) / (top - bot) * (H - T - B); }
    var pw = (W - L - 8) / Math.max(1, xs.length), o = "";
    for (var k = 0; k <= 4; k++) { var gv = bot + (top - bot) * k / 4; o += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(gv).toFixed(1) + '" y2="' + y(gv).toFixed(1) + '" class="gl"/><text x="' + (L - 5) + '" y="' + (y(gv) + 4).toFixed(1) + '" text-anchor="end" class="ax">' + (+gv.toFixed(2)).toLocaleString() + '</text>'; }
    xs.forEach(function (x, i) { o += '<text x="' + (L + pw * (i + .5)).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + esc(x) + '</text>'; });
    ser.forEach(function (s, si) {
      if (b.모양 === "꺾은선") {
        o += '<polyline fill="none" stroke="' + PAL[si % 5] + '" stroke-width="2.5" points="' + s.값.map(function (v, i) { return (L + pw * (i + .5)).toFixed(1) + ',' + y(v).toFixed(1); }).join(" ") + '"/>';
        s.값.forEach(function (v, i) { o += '<circle cx="' + (L + pw * (i + .5)).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.5" fill="' + PAL[si % 5] + '"/><text x="' + (L + pw * (i + .5)).toFixed(1) + '" y="' + (y(v) - 7).toFixed(1) + '" text-anchor="middle" class="vl">' + v.toLocaleString() + '</text>'; });
      } else {
        var bw = pw * .7 / ser.length;
        s.값.forEach(function (v, i) { var x0 = L + pw * i + pw * .15 + bw * si; o += '<rect x="' + x0.toFixed(1) + '" y="' + Math.min(y(v), y(0)).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.abs(y(0) - y(v)).toFixed(1) + '" rx="2" fill="' + PAL[si % 5] + '"/><text x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (y(v) - 4).toFixed(1) + '" text-anchor="middle" class="vl">' + v.toLocaleString() + '</text>'; });
      }
    });
    var lg = ser.length > 1 ? '<div class="lg">' + ser.map(function (s, i) { return '<span><i style="background:' + PAL[i % 5] + '"></i>' + esc(s.이름) + '</span>'; }).join("") + '</div>' : '';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ch">' + o + '</svg>' + lg;
  }
  function qBody(q, no) {
    var lead = q.g && GROUP[q.g] && GROUP[q.g][0] !== q.i ? BYID[GROUP[q.g][0]] : null;   // 공통 지문은 묶음 첫 문항에만 있다
    return '<div class="qcard">' + (lead ? '<div class="shared">' + blocks(lead.m) + '</div>' : '') +
      '<div class="stem">' + (no ? '<b class="qn">' + no + '.</b> ' : '') + esc(q.p) + '</div>' + blocks(q.m) + '</div>';
  }
  /* 연습장(모두의 수학 필기판 ink.js): 계산이 드는 영역에서 선지 위에 펼친다 */
  var PAD_AREAS = ["수리", "자원관리", "문제해결", "정보"], pad = null;
  function padHtml(q) {
    if (PAD_AREAS.indexOf(q.a) < 0 || !window.Ink) return "";
    var open = S.padOpen !== false;
    return '<div class="padbox' + (open ? ' on' : '') + '"><div class="padbar"><button class="padt" data-pt="toggle">연습장 ' + (open ? '접기' : '펴기') + '</button><span class="sp"></span>' +
      '<button class="padt on" data-pt="pen">펜</button><button class="padt" data-pt="eraser">지우개</button><button class="padt" data-pt="undo">되돌리기</button><button class="padt" data-pt="clear">전부 지움</button></div><div class="padcv"></div></div>';
  }
  function padMount() {
    if (pad) { try { pad.destroy(); } catch (e) {} pad = null; }
    var box = $app.querySelector(".padbox"); if (!box) return;
    if (box.classList.contains("on")) pad = new Ink(box.querySelector(".padcv"), { color: "#1F2A55", width: 2.2 });
    box.querySelectorAll("[data-pt]").forEach(function (b) {
      b.onclick = function () {
        var t = b.getAttribute("data-pt");
        if (t === "toggle") { S.padOpen = !box.classList.contains("on"); save(); box.classList.toggle("on"); b.textContent = "연습장 " + (S.padOpen ? "접기" : "펴기"); padMount(); return; }
        if (!pad) return;
        if (t === "undo") pad.undo(); else if (t === "clear") pad.clear();
        else { pad.setTool(t); box.querySelectorAll('[data-pt="pen"],[data-pt="eraser"]').forEach(function (x) { x.classList.toggle("on", x === b); }); }
      };
    });
  }
  function opts(q, picked) {
    return '<div class="opts">' + q.c.map(function (c, i) { var v = i + 1; return '<button class="opt' + (picked === v ? ' pick' : '') + '" data-v="' + v + '"><b>' + CIR[v] + '</b><span>' + esc(c) + '</span></button>'; }).join("") + '</div>';
  }
  function explHtml(q) {
    var e = q.e || {}, h = '<div class="expl"><div class="lab">풀이</div><ol class="steps">' + (e.풀이 || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol>';
    if ((e.선지 || []).length) h += '<div class="lab">선지 분석</div><ul class="why">' + e.선지.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>';
    if (e.함정) h += '<div class="trap"><b>함정</b> ' + esc(e.함정) + '</div>';
    return h + '</div>';
  }

  /* ── 통계 ── */
  function areaStat(a, t) {
    var n = 0, solved = 0, ok = 0;
    D.items.forEach(function (q) { if (q.a !== a || (t && q.t !== t)) return; n++; var h = S.h[q.i]; if (h) { solved++; ok += h[1]; } });
    return { n: n, solved: solved, ok: ok, rate: solved ? ok / solved : 0 };
  }
  function tierOf(st) { if (st.solved < 10) return ""; var r = st.rate; return r >= .9 ? "S" : r >= .75 ? "A" : r >= .6 ? "B" : "C"; }
  function weakest() {
    var best = null, br = 2;
    AREAS.forEach(function (a) { var st = areaStat(a); if (!st.n) return; var r = st.solved < 10 ? -1 + st.solved / 100 : st.rate; if (r < br) { br = r; best = a; } });
    return best;
  }
  function pickSet(filter, n) {
    var pool = D.items.filter(filter);
    var un = shuffle(pool.filter(function (q) { return !S.h[q.i]; })), wr = shuffle(pool.filter(function (q) { return S.h[q.i] && !S.h[q.i][1]; })), rt = shuffle(pool.filter(function (q) { return S.h[q.i] && S.h[q.i][1]; }));
    return un.concat(wr, rt).slice(0, n).map(function (q) { return q.i; });
  }
  function mockBy(key) { if (key === "org") return S.om; return D.mocks.filter(function (x) { return x.key === key; })[0]; }

  /* ── 지원 기관 (data/orgs.js: 채용공고 조사) ── */
  var ORGS = window.NCS_ORGS || [];
  function curJob() { if (!S.org) return null; var o = ORGS.filter(function (x) { return x.n === S.org.o; })[0]; if (!o) return null; var j = o.j.filter(function (x) { return x.n === S.org.j; })[0]; return j ? { o: o, j: j } : null; }
  function orgCard() {
    var c = curJob();
    if (!c) return ORGS.length ? '<h2 class="sec">지원 기관</h2><div class="list"><button class="li" data-go="#/org"><div><div class="t">지원 기관 고르기</div><div class="d">' + ORGS.length + '곳 · 기관별 필기 영역에 맞춰 연습</div></div><div class="r">›</div></button></div>' : '';
    var have = c.j.a.filter(function (a) { return areaStat(a).n; });
    return '<h2 class="sec">지원 기관</h2><div class="card org"><div class="ot">' + esc(c.o.n) + '</div><div class="src">' + esc(c.j.n) + (c.j.q ? ' · NCS ' + c.j.q + '문항' : '') + (c.j.m ? ' · ' + c.j.m + '분' : '') + '</div>' +
      '<div class="chips">' + c.j.a.map(function (a) { return '<span class="chip on">' + esc(a) + '</span>'; }).join("") + '</div>' +
      (c.j.s.length ? '<div class="src">전공: ' + c.j.s.map(esc).join(" · ") + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn red" style="flex:1"' + (have.length ? '' : ' disabled') + ' data-go="#/goorg">맞춤 10문항</button><button class="btn dark" style="flex:1"' + (have.length ? '' : ' disabled') + ' data-go="#/orgmock">기관형 모의고사</button></div>' +
      '<button class="btn line full" style="margin-top:8px;height:42px;font-size:14px" data-go="#/org">기관 바꾸기</button></div>';
  }
  function orgList(q, first) {
    top(first ? {} : { back: "#/" });
    var h = (first ? '<div class="hero" style="margin-bottom:6px"><div class="big" style="font-size:24px">목표 기업과 직렬</div></div>' : '') + '<h2 class="sec">지원 기관</h2><input class="search" id="oq" placeholder="기관 이름" value="' + esc(q || "") + '"><div class="list" id="ol" style="margin-top:10px"></div>' + (first ? '<button class="btn line full" id="skip" style="margin-top:12px">아직 안 정함 · 10영역 전부</button>' : '') + '<div class="foot">기관별 영역은 최근 채용공고 기준 · 공고마다 바뀔 수 있음</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    function draw() {
      var v = document.getElementById("oq").value.trim();
      document.getElementById("ol").innerHTML = ORGS.map(function (o, i) { return [o, i]; }).filter(function (x) { return !v || x[0].n.indexOf(v) >= 0; }).map(function (x) {
        return '<button class="li" data-go="#/org/' + x[1] + '"><div><div class="t">' + esc(x[0].n) + '</div><div class="d">' + esc(x[0].k) + ' · ' + esc(x[0].t) + ' · 직무 ' + x[0].j.length + '</div></div><div class="r">›</div></button>';
      }).join("") || '<div class="empty">없음</div>';
    }
    document.getElementById("oq").oninput = draw; draw();
    var sk = document.getElementById("skip"); if (sk) sk.onclick = function () { S.skipOrg = true; save(); home(); };
  }
  function orgJobs(i) {
    var o = ORGS[i]; if (!o) { location.hash = "#/org"; return; }
    top({ back: "#/org" });
    var h = '<h2 class="sec">' + esc(o.n) + '</h2><div class="src" style="margin-bottom:8px">' + esc(o.t) + ' 공고 기준 · 직무를 고르세요</div><div class="list">';
    o.j.forEach(function (j, k) {
      h += '<button class="li" data-job="' + k + '"><div><div class="t">' + esc(j.n) + '</div><div class="d">' + j.a.map(esc).join(" · ") + (j.q ? ' · ' + j.q + '문항' : '') + (j.m ? ' · ' + j.m + '분' : '') + '</div>' +
        (j.s.length ? '<div class="d">전공 ' + j.s.map(esc).join(", ") + '</div>' : '') + '</div></button>';
    });
    $app.innerHTML = '<div class="wrap">' + h + '</div></div>';
    $app.querySelectorAll("[data-job]").forEach(function (b) { b.onclick = function () { S.org = { o: o.n, j: o.j[+b.getAttribute("data-job")].n }; save(); location.hash = "#/"; }; });
  }
  function orgMock() {
    var c = curJob(); if (!c) { location.hash = "#/org"; return; }
    var ar = c.j.a.filter(function (a) { return areaStat(a).n; }), n = Math.min(c.j.q || 50, 60), per = {}, ids = [];
    ar.forEach(function (a, k) { per[a] = Math.floor(n / ar.length) + (k < n % ar.length ? 1 : 0); });
    ar.forEach(function (a) { ids = ids.concat(pickSet(function (q) { return q.a === a && !q.g; }, per[a])); });
    S.om = { key: "org", name: c.o.n + " " + c.j.n + " 모의고사", form: "기관형", min: c.j.m || ids.length, ids: ids }; save();
    location.hash = "#/mock/org";
  }

  /* ── 머리띠 ── */
  function top(opt) {
    opt = opt || {};
    $top.innerHTML = '<div class="in">' + (opt.back ? '<button class="back" data-go="' + opt.back + '">‹ 뒤로</button>' : '<div class="logo">진격의 <b>NCS</b></div>') + (opt.right || "") + '<div class="sp"></div></div>';
  }
  document.addEventListener("click", function (e) { var g = e.target.closest("[data-go]"); if (g && !g.disabled) { e.preventDefault(); stopTimer(); location.hash = g.getAttribute("data-go"); } });

  /* ── 홈 ── */
  function home() {
    top();
    var tot = D.items.length, solved = 0, ok = 0;
    for (var id in S.h) if (BYID[id]) { solved++; ok += S.h[id][1]; }
    var w = weakest() || AREAS[0];
    var wrongN = D.items.filter(function (q) { return S.h[q.i] && !S.h[q.i][1]; }).length;
    var h = '<div class="hero"><div class="sub">푼 문항</div><div class="big">' + solved.toLocaleString() + ' <span style="font-size:16px;color:#c9ced6">/ ' + tot.toLocaleString() + '</span></div>' +
      '<div class="sub">정답률 ' + (solved ? Math.round(ok / solved * 100) + "%" : "—") + '</div>' +
      '<div class="row"><button class="btn red full" data-go="#/go/' + encodeURIComponent(w) + '">' + esc(w) + ' 10문항</button></div></div>';
    h += orgCard();
    h += '<h2 class="sec">영역별 진단</h2><div class="areas">';
    AREAS.forEach(function (a) {
      var st = areaStat(a); if (!st.n) return; var t = tierOf(st), weak = a === w && st.solved >= 10;
      h += '<button class="area' + (weak ? " weak" : "") + '" data-go="#/area/' + encodeURIComponent(a) + '"><div class="nm">' + esc(a) + '</div><div class="ct">' + st.solved + ' / ' + st.n + (st.solved ? ' · ' + Math.round(st.rate * 100) + '%' : '') + '</div>' +
        '<div class="bar"><i style="width:' + (st.solved ? Math.round(st.rate * 100) : 0) + '%;' + (t ? "background:var(--t-tier-" + t.toLowerCase() + ")" : "") + '"></i></div><span class="tier ' + t + '">' + (t || "–") + '</span>' + (weak ? '<span class="tag">약점</span>' : '') + '</button>';
    });
    h += '</div>';
    if (D.mocks.length) {
      h += '<h2 class="sec">모의고사</h2><div class="list">';
      D.mocks.slice(0, 4).forEach(function (m) { h += mockLi(m); });
      if (D.mocks.length > 4) h += '<button class="btn line full" data-go="#/mocks">모의고사 ' + D.mocks.length + '회 전체</button>';
      h += '</div>';
    }
    h += '<h2 class="sec">복습</h2><div class="list"><button class="li" data-go="#/wrong"' + (wrongN ? '' : ' disabled') + '><div><div class="t">틀린 문항</div><div class="d">마지막에 틀린 것만</div></div><div class="r">' + wrongN + '</div></button></div>';
    h += '<div class="foot">테라러닝 · 진격의 NCS · 전 문항 테라러닝 자체 제작</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
  }
  function mockLi(m) {
    var r = S.m[m.key];
    return '<button class="li" data-go="#/mock/' + encodeURIComponent(m.key) + '"><div><div class="t">' + esc(m.name) + '</div><div class="d">' + esc(m.form) + ' · ' + m.ids.length + '문항 · ' + (m.min || m.ids.length) + '분</div></div><div class="r' + (r ? ' done' : '') + '">' + (r ? r.s + '/' + r.t : '') + '</div></button>';
  }
  function mockList() { top({ back: "#/" }); var h = '<h2 class="sec">모의고사</h2><div class="list">'; D.mocks.forEach(function (m) { h += mockLi(m); }); $app.innerHTML = '<div class="wrap">' + h + '</div></div>'; }

  /* ── 영역 ── */
  var areaSub = {};
  function area(a) {
    top({ back: "#/" });
    var subs = {}; D.items.forEach(function (q) { if (q.a === a && q.t) subs[q.t] = (subs[q.t] || 0) + 1; });
    var cur = areaSub[a] || "", st = areaStat(a, cur);
    var h = '<h2 class="sec">' + esc(a) + '</h2>', ks = Object.keys(subs).sort(function (x, y) { return subs[y] - subs[x]; });
    if (ks.length > 1) {
      h += '<div class="chips"><button class="chip' + (cur ? '' : ' on') + '" data-sub="">전체</button>';
      ks.forEach(function (s) { h += '<button class="chip' + (s === cur ? ' on' : '') + '" data-sub="' + esc(s) + '">' + esc(D.types[s] || s) + ' ' + subs[s] + '</button>'; });
      h += '</div>';
    }
    h += '<div class="card" style="margin-top:12px"><div style="font-weight:900;font-size:22px">' + st.solved + ' / ' + st.n + '</div><div class="src">정답률 ' + (st.solved ? Math.round(st.rate * 100) + '%' : '—') + ' · 틀린 문항 ' + (st.solved - st.ok) + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn red" style="flex:2" data-go="#/go/' + encodeURIComponent(a) + (cur ? '/' + encodeURIComponent(cur) : '') + '">10문항</button>' +
      '<button class="btn line" style="flex:1" data-go="#/wrong/' + encodeURIComponent(a) + '"' + (st.solved - st.ok ? '' : ' disabled') + '>틀린 것</button></div></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    $app.querySelectorAll("[data-sub]").forEach(function (b) { b.onclick = function () { areaSub[a] = b.getAttribute("data-sub"); area(a); }; });
  }

  /* ── 연습 세트 ── */
  var P = null;
  function startPractice(ids, back, title) {
    if (!ids.length) { location.hash = back; return; }
    P = { ids: ids, i: 0, ok: 0, back: back, title: title, done: false };
    history.replaceState(null, "", "#/play"); play();
  }
  function play() {
    if (!P) { location.hash = "#/"; return; }
    if (P.i >= P.ids.length) return playEnd();
    var q = BYID[P.ids[P.i]];
    top({ back: P.back });
    var h = '<div class="qhead"><span class="pill">' + esc(q.a) + '</span>' + esc(typeName(q)) + (q.d >= 3 ? '<span class="hard">고난도</span>' : '') + '<span class="prog">' + (P.i + 1) + ' / ' + P.ids.length + '</span></div>' +
      '<div class="pbar"><i style="width:' + (P.i / P.ids.length * 100) + '%"></i></div>' + qBody(q) + padHtml(q) + opts(q) + '<div id="after"></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>'; scrollTo(0, 0); padMount();
    $app.querySelectorAll(".opt").forEach(function (b) {
      b.onclick = function () {
        if (P.done) return; P.done = true;
        var v = +b.getAttribute("data-v"), ok = v === q.x;
        rec(q.i, ok); if (ok) P.ok++;
        b.setAttribute("data-s", ok ? "ok" : "no");
        if (!ok) $app.querySelector('.opt[data-v="' + q.x + '"]').classList.add("right");
        $app.querySelectorAll(".opt").forEach(function (o) { o.classList.add("locked"); });
        if (window.ZZ) { ok ? ZZ.ok(b) : ZZ.no(b); }
        var a = document.getElementById("after");
        a.innerHTML = '<div class="verdict ' + (ok ? 'good' : 'bad') + '">' + (ok ? '정답 ' + CIR[q.x] : '오답 · 정답 ' + CIR[q.x]) + '</div>' + explHtml(q) +
          '<div class="dock"><button class="btn red full" id="nx">' + (P.i + 1 < P.ids.length ? '다음 문제' : '결과 보기') + '</button></div>';
        document.getElementById("nx").onclick = function () { P.i++; P.done = false; play(); };
        setTimeout(function () { a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 350);
      };
    });
  }
  function playEnd() {
    top({ back: P.back });
    var n = P.ids.length, r = P.ok / n, last = BYID[P.ids[0]];
    $app.innerHTML = '<div class="wrap"><div class="card res" style="margin-top:16px;text-align:center"><div class="src">' + esc(P.title || "") + '</div><div class="score">' + P.ok + ' / ' + n + '</div><div class="src">정답률 ' + Math.round(r * 100) + '%</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><button class="btn red full" data-go="#/go/' + encodeURIComponent(last.a) + '">' + esc(last.a) + ' 10문항 더</button><button class="btn line full" data-go="#/">홈</button></div></div>';
    if (window.ZZ) { var st = r >= 1 ? 3 : r >= .7 ? 2 : r >= .4 ? 1 : 0; if (st) ZZ.stars(st); }
    P = null;
  }

  /* ── 모의고사 ── */
  var M = null, tick = null;
  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }
  function mockIntro(key) {
    var m = mockBy(key); if (!m) { location.hash = "#/"; return; }
    top({ back: "#/" });
    var cnt = {}; m.ids.forEach(function (id) { var a = BYID[id].a; cnt[a] = (cnt[a] || 0) + 1; });
    var r = S.m[key], min = m.min || m.ids.length;
    var h = '<div class="card" style="margin-top:16px"><div style="font-weight:900;font-size:20px">' + esc(m.name) + '</div><div class="src">' + esc(m.form) + ' · ' + m.ids.length + '문항 · 제한 ' + min + '분 · 다 풀고 한 번에 채점</div><table style="width:100%;margin-top:10px;font-size:14px">';
    AREAS.forEach(function (a) { if (cnt[a]) h += '<tr><td>' + a + '</td><td style="text-align:right;font-weight:800">' + cnt[a] + '</td></tr>'; });
    h += '</table>' + (r ? '<div class="src" style="margin-top:8px">지난 점수 ' + r.s + ' / ' + r.t + '</div>' : '') + '</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><button class="btn red full" id="st">시작</button>' +
      (r ? '<button class="btn line full" data-go="#/res/' + encodeURIComponent(key) + '">지난 채점 결과</button>' : '') + '</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    document.getElementById("st").onclick = function () { M = { key: key, m: m, i: 0, ans: {}, end: Date.now() + min * 60000 }; history.replaceState(null, "", "#/exam"); exam(); };
  }
  function fmt(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function exam() {
    if (!M) { location.hash = "#/"; return; }
    var id = M.m.ids[M.i], q = BYID[id];
    top({ back: "#/mock/" + encodeURIComponent(M.key), right: '<span class="timer" id="tm">' + fmt(M.end - Date.now()) + '</span>' });
    var h = '<div class="qhead"><span class="pill">' + (M.i + 1) + '번</span>' + esc(q.a) + '<span class="prog">' + Object.keys(M.ans).length + ' / ' + M.m.ids.length + ' 표기</span></div>' + qBody(q) + padHtml(q) + opts(q, M.ans[id]) +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn line" style="flex:1" id="pv"' + (M.i ? '' : ' disabled') + '>이전</button><button class="btn dark" style="flex:1" id="nx2">' + (M.i + 1 < M.m.ids.length ? '다음' : '마지막') + '</button></div><div style="height:70px"></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>' + omr(); scrollTo(0, 0); padMount();
    $app.querySelectorAll(".opt").forEach(function (b) {
      b.onclick = function () {
        M.ans[id] = +b.getAttribute("data-v");
        $app.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("pick", x === b); });
        if (M.i + 1 < M.m.ids.length) setTimeout(function () { M.i++; exam(); }, 220); else exam();
      };
    });
    document.getElementById("pv").onclick = function () { if (M.i) { M.i--; exam(); } };
    document.getElementById("nx2").onclick = function () { if (M.i + 1 < M.m.ids.length) { M.i++; exam(); } };
    $app.querySelectorAll(".omr .dots button").forEach(function (b) { b.onclick = function () { M.i = +b.getAttribute("data-i"); exam(); }; });
    document.getElementById("sub").onclick = function () { var left = M.m.ids.length - Object.keys(M.ans).length; if (left && !confirm("안 고른 문항 " + left + "개. 이대로 채점할까요?")) return; grade(); };
    var cur = $app.querySelector(".omr .dots .cur"); if (cur) cur.scrollIntoView({ inline: "center", block: "nearest" });
    stopTimer();
    tick = setInterval(function () { var t = document.getElementById("tm"); if (!t || !M) return stopTimer(); var left = M.end - Date.now(); t.textContent = fmt(left); t.classList.toggle("low", left < 300000); if (left <= 0) { stopTimer(); grade(); } }, 1000);
  }
  function omr() {
    var h = '<div class="omr"><div class="in"><div class="dots">';
    M.m.ids.forEach(function (id, i) { h += '<button data-i="' + i + '" class="' + (M.ans[id] ? 'done' : '') + (i === M.i ? ' cur' : '') + '">' + (i + 1) + '</button>'; });
    return h + '</div><button class="btn red" id="sub">채점</button></div></div>';
  }
  function grade() {
    stopTimer();
    var s = 0, t = M.m.ids.length;
    M.m.ids.forEach(function (id) { var ok = M.ans[id] === BYID[id].x; if (ok) s++; if (M.ans[id]) rec(id, ok); });
    S.m[M.key] = { s: s, t: t, ans: M.ans, ts: Date.now() }; save();
    var key = M.key; M = null; history.replaceState(null, "", "#/res/" + encodeURIComponent(key)); result(key, true);
  }
  function result(key, fresh) {
    var r = S.m[key], m = mockBy(key); if (!r || !m) { location.hash = "#/"; return; }
    top({ back: "#/" });
    var by = {}; m.ids.forEach(function (id) { var q = BYID[id], o = by[q.a] = by[q.a] || [0, 0]; o[1]++; if (r.ans[id] === q.x) o[0]++; });
    var h = '<div class="card res" style="margin-top:16px;text-align:center"><div class="src">' + esc(m.name) + '</div><div class="score">' + r.s + ' / ' + r.t + '</div><div class="src">' + Math.round(r.s / r.t * 100) + '점 환산</div></div><h2 class="sec">영역별</h2><div class="card res"><table>';
    AREAS.forEach(function (a) { if (by[a]) h += '<tr><td>' + a + '</td><td>' + by[a][0] + ' / ' + by[a][1] + '</td></tr>'; });
    h += '</table></div><h2 class="sec">문항별 해설</h2><div class="grid">';
    m.ids.forEach(function (id, i) { h += '<button class="' + (r.ans[id] === BYID[id].x ? 'o' : 'x') + '" data-go="#/rev/' + encodeURIComponent(key) + '/' + i + '">' + (i + 1) + '</button>'; });
    h += '</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:16px"><button class="btn red full" data-go="#/mock/' + encodeURIComponent(key) + '">다시 풀기</button><button class="btn line full" data-go="#/">홈</button></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    if (fresh && window.ZZ) { var x = r.s / r.t, st = x >= 1 ? 3 : x >= .7 ? 2 : x >= .4 ? 1 : 0; if (st) ZZ.stars(st); }
  }
  function review(key, i) {
    var r = S.m[key], m = mockBy(key); if (!r || !m) { location.hash = "#/"; return; }
    i = Math.max(0, Math.min(m.ids.length - 1, i));
    var q = BYID[m.ids[i]], a = r.ans[q.i];
    top({ back: "#/res/" + encodeURIComponent(key) });
    var h = '<div class="qhead"><span class="pill">' + (i + 1) + '번</span>' + esc(q.a) + '</div>' + qBody(q) +
      '<div class="opts">' + q.c.map(function (c, k) { var v = k + 1; return '<div class="opt locked' + (v === q.x ? ' right' : '') + (v === a && a !== q.x ? ' wrongpick' : '') + '"><b>' + CIR[v] + '</b><span>' + esc(c) + '</span></div>'; }).join("") + '</div>' +
      '<div class="verdict ' + (a === q.x ? 'good' : 'bad') + '">' + (a === q.x ? '정답 ' + CIR[q.x] : (a ? '고른 답 ' + CIR[a] + ' · ' : '안 고름 · ') + '정답 ' + CIR[q.x]) + '</div>' + explHtml(q) +
      '<div class="dock" style="display:flex;gap:8px"><button class="btn line" style="flex:1" data-go="#/rev/' + encodeURIComponent(key) + '/' + (i - 1) + '"' + (i ? '' : ' disabled') + '>이전</button><button class="btn dark" style="flex:1" data-go="#/rev/' + encodeURIComponent(key) + '/' + (i + 1) + '"' + (i + 1 < m.ids.length ? '' : ' disabled') + '>다음</button></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>'; scrollTo(0, 0);
  }

  /* ── 길잡이 ── */
  function route() {
    var p = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    if (p[0] !== "exam") stopTimer();
    switch (p[0]) {
      case "area": return area(p[1]);
      case "go": return startPractice(pickSet(function (q) { return q.a === p[1] && (!p[2] || q.t === p[2]); }, 10), "#/area/" + encodeURIComponent(p[1]), p[1]);
      case "wrong": return startPractice(shuffle(D.items.filter(function (q) { return S.h[q.i] && !S.h[q.i][1] && (!p[1] || q.a === p[1]); })).slice(0, 10).map(function (q) { return q.i; }), p[1] ? "#/area/" + encodeURIComponent(p[1]) : "#/", "틀린 문항");
      case "org": return p[1] ? orgJobs(+p[1]) : orgList();
      case "goorg": var cj = curJob(); return cj ? startPractice(pickSet(function (q) { return cj.j.a.indexOf(q.a) >= 0; }, 10), "#/", cj.o.n + " 맞춤") : (location.hash = "#/org");
      case "orgmock": return orgMock();
      case "play": return play();
      case "mocks": return mockList();
      case "mock": return mockIntro(p[1]);
      case "exam": return exam();
      case "res": return result(p[1]);
      case "rev": return review(p[1], +p[2]);
      default:
        if (!S.org && !S.skipOrg && ORGS.length) return orgList(null, true);
        return home();
    }
  }
  addEventListener("hashchange", route);
  route();
})();
