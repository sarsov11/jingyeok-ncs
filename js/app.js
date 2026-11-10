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
  try { history.scrollRestoration = "manual"; } catch (e) {}
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
    window.NCS_CUR = q; window.NCS_PICK = null;   /* 학습 비서(assist.js)가 지금 문항을 알아본다 */
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
      '<button class="padt on" data-pt="pen">펜</button><button class="padt" data-pt="eraser">지우개</button><button class="padt" data-pt="undo">한 획 취소</button><button class="padt" data-pt="clear">전부 지움</button></div><div class="padcv"></div></div>';
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
  /* ── 풀이 창(공용 tera-pad.js, 화면표준 8절) ── */
  function isCalcQ(q) {
    if (!window.TERA_PAD) return false;
    return q.a === "수리" || /^JW-(time|cost)/.test(q.t || "") || /자료|도표|그래프/.test(typeName(q)) || TERA_PAD.isCalc(q.p + " " + (q.c || []).join(" "));
  }
  function padRow(q) { return isCalcQ(q) ? '<div class="tpadrow" id="tpr"></div>' : ""; }
  function padBtn(q) {
    var row = document.getElementById("tpr"); if (!row) return;
    var b = TERA_PAD.button(row, { key: String(q.i), title: q.a + " · " + (typeName(q) || q.a) });
    b.addEventListener("click", function () {
      var qc = document.querySelector(".qcard"); if (qc) scrollTo(0, Math.max(0, qc.getBoundingClientRect().top + scrollY - 70));
      setTimeout(function () {
        var t = document.getElementById("tpad"); if (!t) return;
        if (!t._o) { t._o = new MutationObserver(function () { document.body.classList.toggle("padopen", t.classList.contains("on")); }); t._o.observe(t, { attributes: true, attributeFilter: ["class"] }); }
        document.body.classList.toggle("padopen", t.classList.contains("on"));
      }, 60);
    });
  }
  /* ── 문제 화면 공용 부품(tera-q.js · 화면표준 12절) ── */
  var SV_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6.500C10.200 5 7.600 4.500 4.500 4.800v13c3.100-.300 5.700.200 7.500 1.700 1.800-1.500 4.400-2 7.500-1.700v-13c-3.100-.300-5.700.200-7.500 1.700zM12 6.500v13"/></svg>';
  var SV_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.500 19.500l1-4L16 5l3 3L8.500 18.500z"/></svg>';
  if (window.TERA_Q && window.DIAGRAM && DIAGRAM.terms && typeof DIAGRAM.terms === "object") { try { TERA_Q.terms(DIAGRAM.terms); } catch (e) {} }
  function penOff() { try { if (window.TERA_PAD && TERA_PAD.penHide) TERA_PAD.penHide(); } catch (e) {} }
  function askAgent(t) {
    var fab = document.querySelector(".as-fab"), f = document.querySelector(".as-sheet form"); if (!fab || !f) return;
    fab.click(); var inp = f.querySelector("input"); inp.value = t; f.dispatchEvent(new Event("submit", { cancelable: true }));
  }
  function tqAsk(q) {
    var host = document.getElementById("tqak"); if (!host || !window.TERA_Q) return;
    var qs = []; try { qs = (window.Assist && Assist.chips({ q: q, solved: false, pick: null, mySec: null })) || []; } catch (e) {}
    if (!qs.length) qs = [(typeName(q) || q.a) + "이란"];
    TERA_Q.ask(host, { questions: qs.slice(0, 3), onAsk: askAgent });
  }
  function tqTools(q) {
    if (window.TERA_Q) TERA_Q.annotate($app.querySelectorAll(".stem, .tq-t"));
    var pb = document.getElementById("tqpen"); if (!pb) return;
    pb.onclick = function () { if (window.TERA_PAD && TERA_PAD.pen) TERA_PAD.pen({ key: String(q.i), onChange: function (on) { pb.classList.toggle("is-on", !!on); } }); };
    if (window.TERA_Q) TERA_Q.coach(pb, { key: "ncs_pen", title: "펜", text: "아래 줄의 펜을 누르면 문제 위에 바로 쓸 수 있어요." });
  }
  function opts(q, picked, tq) {
    if (tq) return '<ul class="opts tqo tq-choices">' + q.c.map(function (c, i) { var v = i + 1; return '<li><button class="opt tq-choice" data-v="' + v + '"><span class="tq-n">' + v + '</span><span class="tq-t">' + esc(c) + '</span></button></li>'; }).join("") + '</ul>';
    return '<div class="opts">' + q.c.map(function (c, i) { var v = i + 1; return '<button class="opt' + (picked === v ? ' pick' : '') + '" data-v="' + v + '"><b>' + CIR[v] + '</b><span>' + esc(c) + '</span></button>'; }).join("") + '</div>';
  }
  function explHtml(q) {
    /* 풀이 단계는 화살표로 잇는 순서 도식으로(2026-10-27 대표님 「모든 과목 개념을 도식으로」) — 데이터 그대로, js/diagram.js */
    var e = q.e || {}, st = e.풀이 || [];
    var h = '<div class="tq-exp"><div class="tq-tabs"><button class="is-on" type="button">해설</button></div><div class="tq-exp-box expl"><div class="lab">풀이</div>' + (window.DIAGRAM && st.length >= 2 ? DIAGRAM.html({ t: "flow", steps: st }) : '<ol class="steps">' + st.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol>');
    if ((e.선지 || []).length) h += '<div class="lab">선지 분석</div><ul class="why">' + e.선지.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ul>';
    if (e.함정) h += '<div class="trap"><b>함정</b> ' + esc(e.함정) + '</div>';
    return h + '<span class="tq-ans">정답 : ' + q.x + '번</span></div></div>';
  }

  /* ── 통계 ── */
  function tierOf(st) { if (st.solved < 10) return ""; var r = st.rate; return r >= .9 ? "S" : r >= .75 ? "A" : r >= .6 ? "B" : "C"; }
  function areaStat(a, t) {
    var n = 0, solved = 0, ok = 0;
    D.items.forEach(function (q) { if (q.a !== a || (t && q.t !== t)) return; n++; var h = S.h[q.i]; if (h) { solved++; ok += h[1]; } });
    return { n: n, solved: solved, ok: ok, rate: solved ? ok / solved : 0 };
  }
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
    if (!c) return ORGS.length ? '<h2 class="sec">지원 기관</h2><div class="list"><button class="li" data-go="#/org"><div><div class="t">지원 기관 고르기</div><div class="d">' + ORGS.length + '곳 · 기관별 필기 영역에 맞춰 연습</div></div></button></div>' : '';
    var have = c.j.a.filter(function (a) { return areaStat(a).n; });
    return '<h2 class="sec">지원 기관</h2><div class="card org"><div class="ot">' + esc(c.o.n) + '</div><div class="src">' + esc(c.j.n) + (c.j.q ? ' · NCS ' + c.j.q + '문항' : '') + (c.j.m ? ' · ' + c.j.m + '분' : '') + '</div>' +
      '<div class="chips">' + c.j.a.map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join("") + '</div>' +
      (c.j.s.length ? '<div class="src">전공: ' + c.j.s.map(esc).join(" · ") + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn red" style="flex:1"' + (have.length ? '' : ' disabled') + ' data-go="#/goorg">맞춤 10문항</button><button class="btn line" style="flex:1"' + (have.length ? '' : ' disabled') + ' data-go="#/orgmock">기관형 모의고사</button></div>' +
      '<button class="btn line full" style="margin-top:8px;height:44px;font-size:14px;border-radius:12px" data-go="#/org">기관 바꾸기</button></div>';
  }
  function orgList(q, first) {
    top(first ? { tab: "home" } : { tab: "home", back: "#/", title: "지원 기관" });
    var h = (first ? '<div class="hero" style="margin-bottom:6px"><div class="big" style="font-size:24px">목표 기업과 직렬</div></div>' : '') + '<h2 class="sec">지원 기관</h2><input class="search" id="oq" placeholder="기관 이름" value="' + esc(q || "") + '"><div class="list" id="ol" style="margin-top:10px"></div>' + (first ? '<button class="btn line full" id="skip" style="margin-top:12px">아직 안 정함 · 10영역 전부</button>' : '') + '<div class="foot">기관별 영역은 최근 채용공고 기준 · 공고마다 바뀔 수 있음</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    function draw() {
      var v = document.getElementById("oq").value.trim();
      var curI = -1; ORGS.forEach(function (o, i) { if (S.org && o.n === S.org.o) curI = i; });
      var rows = ORGS.map(function (o, i) { return [o, i]; }).filter(function (x) { return !v || x[0].n.indexOf(v) >= 0; });
      document.getElementById("ol").innerHTML = rows.map(function (x, ri) {
        return '<button class="li" data-go="#/org/' + x[1] + '"><div><div class="t">' + esc(x[0].n) + ((curI >= 0 ? x[1] === curI : ri === 0) ? ' <i class="rcm">추천</i>' : '') + '</div><div class="d">' + esc(x[0].k) + ' · ' + esc(x[0].t) + ' · 직무 ' + x[0].j.length + '</div></div></button>';
      }).join("") || '<div class="empty">없음</div>';
    }
    document.getElementById("oq").oninput = draw; draw();
    var sk = document.getElementById("skip"); if (sk) sk.onclick = function () { S.skipOrg = true; save(); home(); };
  }
  function orgJobs(i) {
    var o = ORGS[i]; if (!o) { location.hash = "#/org"; return; }
    top({ tab: "home", back: "#/org", title: o.n });
    var h = '<h2 class="sec">' + esc(o.n) + '</h2><div class="src" style="margin-bottom:8px">' + esc(o.t) + ' 공고 기준 · 직무를 고르세요</div><div class="list">';
    o.j.forEach(function (j, k) {
      h += '<button class="li" data-job="' + k + '"><div><div class="t">' + esc(j.n) + ((S.org && S.org.o === o.n ? S.org.j === j.n : k === 0) ? ' <i class="rcm">추천</i>' : '') + '</div><div class="d">' + j.a.map(esc).join(" · ") + (j.q ? ' · ' + j.q + '문항' : '') + (j.m ? ' · ' + j.m + '분' : '') + '</div>' +
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

  /* ── 머리띠 · 아래 탭 (화면표준_1110 1·2절) ── */
  var SVG = function (b) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + b + '</svg>'; };
  var GRID = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>';
  var TABS = [
    { k: "home", n: "오늘", go: "#/", i: SVG('<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>') },
    { k: "map", n: "합격 지도", go: "#/map", i: SVG('<rect x="3.5" y="4" width="6" height="6" rx="1.6"/><rect x="14.5" y="4" width="6" height="6" rx="1.6"/><rect x="9" y="14.5" width="6" height="6" rx="1.6"/><path d="M6.5 10v2.2h11V10M12 12.2v2.3"/>') },
    { k: "mock", n: "모의고사", go: "#/mocks", i: SVG('<path d="M7 3.5h8l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M15 3.5v4h4M9 12h6M9 16h6"/>') },
    { k: "wrong", n: "복습", go: "#/wrong", i: SVG('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.6h-4.6"/>') },
    { k: "set", n: "설정", go: "#/set", i: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>') }
  ];
  function top(opt) {
    opt = opt || {};
    document.body.classList.toggle("notab", !!opt.notab); document.body.classList.remove("mapscr");
    var c = curJob(), sub = c ? c.o.n : "공기업 필기", h;
    if (opt.back) h = '<button class="back" data-go="' + opt.back + '" aria-label="뒤로">‹</button><div class="ttl">' + esc(opt.title || "") + '</div><div class="sp"></div>' + (opt.right || "") + (opt.close ? '<button class="xb" data-go="' + opt.back + '" aria-label="닫기">✕</button>' : "");
    else h = '<span class="mark">N</span><div class="logo">진격의 <b>NCS</b></div><div class="sub">' + esc(opt.sub || sub) + '</div><div class="sp"></div>' +
      '<nav class="hnav">' + TABS.map(function (t) { return '<a href="' + (t.go || "#/") + '"' + (t.k === "area" ? ' data-areas="1"' : "") + '>' + t.n + '</a>'; }).join("") + '</nav>' + (opt.right || "") +
      '<a class="gridb" href="https://teralearning.kr/" aria-label="테라러닝 전체 서비스">' + GRID + '</a>';
    var fb = document.querySelector(".as-fab"); if (fb && fb.parentNode !== document.body) document.body.appendChild(fb);
    $top.innerHTML = '<div class="in">' + h + '</div>';
    var tb = document.getElementById("tab");
    if (!tb) { tb = document.createElement("nav"); tb.id = "tab"; tb.className = "tab"; document.body.appendChild(tb); }
    tb.innerHTML = TABS.map(function (t) { return '<button type="button" class="' + (t.k === opt.tab ? "on" : "") + '"' + (t.k === "area" ? ' data-areas="1"' : ' data-go="' + t.go + '"') + '>' + t.i + '<span>' + t.n + '</span></button>'; }).join("");
    placeFab();
  }
  /* 질문하기 알약: 문제 풀이·응시·해설 화면에서는 머리띠 오른쪽(진행 숫자 왼쪽)으로 옮긴다(화면표준: 선지·아래 단추를 가리지 않게) */
  function placeFab() {
    var f = document.querySelector(".as-fab"), inn = $top.querySelector(".in"); if (!f || !inn) return;
    if (!document.body.classList.contains("notab")) { if (f.parentNode !== document.body) document.body.appendChild(f); return; }
    var at = inn.querySelector(".timer") || inn.querySelector(".hprog") || inn.querySelector(".xb");
    if (at) inn.insertBefore(f, at); else inn.appendChild(f);
  }
  function jumpAreas() { var el = document.getElementById("areas"); if (el) el.scrollIntoView({ block: "start" }); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-areas]"); if (!a) return; e.preventDefault(); stopTimer();
    if (document.getElementById("areas")) jumpAreas(); else { window.NCS_JUMP = 1; if (location.hash === "#/" || !location.hash) route(); else location.hash = "#/"; }
  });
  document.addEventListener("click", function (e) { var g = e.target.closest("[data-go]"); if (g && !g.disabled) { e.preventDefault(); stopTimer(); location.hash = g.getAttribute("data-go"); } });

  /* ── 하루 공부 시간 (화면표준 7절: NCS 30분~4시간) ── */
  var MINS = [[30, "30분"], [60, "1시간"], [90, "1시간 30분"], [120, "2시간"], [180, "3시간"], [240, "4시간"]];
  function dayMin() { var m = +S.min || 0; return m ? Math.min(240, m) : 0; }
  function minLabel(m) { for (var i = 0; i < MINS.length; i++) if (MINS[i][0] === m) return MINS[i][1]; return m + "분"; }
  function avgTarget() {
    var cj = curJob(), set = cj ? cj.j.a : AREAS, n = 0, sum = 0;
    D.items.forEach(function (q) { if (set.indexOf(q.a) >= 0) { n++; sum += target(q); } });
    return n ? sum / n : 90;
  }
  function areaSplit(set, N) {
    var as = set.filter(function (a) { return areaStat(a).n; }), k = Math.max(1, as.length), base = Math.floor(N / k), rem = N - base * k;
    return as.map(function (a, i) { return [a, base + (i < rem ? 1 : 0)]; });
  }
  function dayCount() { var m = dayMin(); if (!m) return 10; return Math.max(10, Math.round(m * 60 / avgTarget() / 10) * 10); }
  window.NCS_SET_MIN = function (m) { S.min = Math.min(240, +m || 0); save(); };
  /* ── 홈 ── */
  function home() {
    top({ tab: "home" });
    var tot = D.items.length, solved = 0, ok = 0;
    for (var id in S.h) if (BYID[id]) { solved++; ok += S.h[id][1]; }
    var w = weakest() || AREAS[0];
    var wrongN = D.items.filter(function (q) { return S.h[q.i] && !S.h[q.i][1]; }).length;
    var cj = curJob(), have = cj ? cj.j.a.filter(function (a) { return areaStat(a).n; }) : [], today = new Date().toDateString(), todayN = 0;
    for (var tid in S.h) if (BYID[tid] && S.h[tid][3] && new Date(S.h[tid][3]).toDateString() === today) todayN++;
    var h = cj ? '<div class="chips homechips">' + cj.j.a.map(function (a) { return '<span class="chip">' + esc(a) + '</span>'; }).join("") + '</div>' : "";
    h += '<div class="dline"><span>' + (cj ? esc(cj.o.n) + ' · ' + esc(cj.j.n) : '공기업 NCS 필기') + '</span><button class="lk" data-go="#/org">' + (cj ? '기관 바꾸기' : '지원 기관 고르기') + '</button></div>' +
      '<div class="dbig">' + solved.toLocaleString() + ' <small>/ ' + tot.toLocaleString() + ' 푼 문항</small></div>';
    var steps = [], nT = dayCount();
    if (nT > 10) {
      areaSplit(cj && have.length ? have : AREAS, nT).forEach(function (x) { var st0 = areaStat(x[0]); steps.push([x[0], '푼 문항 ' + st0.solved + ' / ' + st0.n, x[1] + '문항', '#/go/' + encodeURIComponent(x[0])]); });
    } else {
      if (cj && have.length) steps.push(['맞춤 10문항', '지원 기관 출제 영역 · ' + have.join(", "), '10문항', '#/goorg']);
      else steps.push([w + ' 10문항', '가장 약한 영역부터', '10문항', '#/go/' + encodeURIComponent(w)]);
      if (cj && have.length) steps.push(['기관형 모의고사', (cj.j.q ? 'NCS ' + cj.j.q + '문항' : '기관 출제 영역으로 구성') + (cj.j.m ? ' · ' + cj.j.m + '분' : ''), (Math.min(cj.j.q || 50, 60)) + '문항', '#/orgmock']);
      else if (D.mocks.length) steps.push(['모의고사', D.mocks[0].name, (D.mocks[0].min || D.mocks[0].ids.length) + '분', '#/mocks']);
      if (wrongN) steps.push(['복습', '마지막에 틀린 것만 다시', wrongN + '문항', '#/wrong']);
    }
    h += '<section class="today"><h3>오늘 ' + dayCount() + '문항</h3><p class="tsum">' + (dayMin() ? '하루 ' + minLabel(dayMin()) + ' · 문항당 평균 ' + Math.round(avgTarget()) + '초 기준' : esc(w) + ' 영역부터 · ' + (solved ? '지금까지 정답률 ' + Math.round(ok / solved * 100) + '%' : '아직 푼 문항이 없어요')) + '</p>' +
      steps.map(function (x, k) { return '<button class="stp' + (k ? '' : ' now') + '" data-go="' + x[3] + '"><span class="n">' + (k + 1) + '</span><span class="tx"><b>' + esc(x[0]) + (k ? '' : ' <i class="rcm">추천</i>') + '</b><span>' + esc(x[1]) + '</span></span><span class="m">' + x[2] + '</span></button>'; }).join("") +
      '<button class="btn red full" data-go="#/today">시작</button></section>' +
      '<div class="stat2"><div class="card"><b>' + (solved ? Math.round(ok / solved * 100) + '%' : '—') + '</b><span>정답률</span></div><div class="card"><b>' + todayN + '</b><span>오늘 푼 문항</span></div></div>';
    h += timeWeakHtml();
    h += '<h2 class="sec" id="areas">영역별 진단</h2><div class="areas">';
    AREAS.forEach(function (a) {
      var st = areaStat(a); if (!st.n) return; var t = tierOf(st), weak = a === w && st.solved >= 10;
      h += '<button class="area' + (weak ? " weak" : "") + '" data-go="#/area/' + encodeURIComponent(a) + '"><div class="nm">' + esc(a) + '</div><div class="ct">' + st.solved + ' / ' + st.n + (st.solved ? ' · ' + Math.round(st.rate * 100) + '%' : '') + '</div>' +
        '<div class="bar"><i style="width:' + (st.solved ? Math.round(st.rate * 100) : 0) + '%;' + (t ? "background:var(--t-tier-" + t.toLowerCase() + ")" : "") + '"></i></div>' + (t ? '<span class="tier ' + t + '">' + t + '</span>' : '<span class="go">›</span>') + (weak ? '<span class="tag">약점</span>' : '') + '</button>';
    });
    h += '</div>';
    if (D.mocks.length) {
      h += '<h2 class="sec">모의고사</h2><div class="list">';
      D.mocks.slice(0, 4).forEach(function (m) { h += mockLi(m); });
      if (D.mocks.length > 4) h += '<button class="btn line full" data-go="#/mocks">모의고사 ' + D.mocks.length + '회 전체</button>';
      h += '</div>';
    }
    h += '<h2 class="sec">복습</h2><div class="list"><button class="li" data-go="#/wrong"' + (wrongN ? '' : ' disabled') + '><div><div class="t">복습</div><div class="d">마지막에 틀린 것만</div></div><div class="r">' + wrongN + '</div></button></div>';
    h += '<div class="foot">테라러닝 · 진격의 NCS · 전 문항 테라러닝 자체 제작</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    if (window.NCS_JUMP) { window.NCS_JUMP = 0; jumpAreas(); } else scrollTo(0, 0);
  }
  function recMock() { var m = D.mocks.filter(function (x) { return !S.m[x.key]; })[0] || D.mocks[0]; return m ? m.key : ""; }
  function mockLi(m, rec) {
    var r = S.m[m.key];
    return '<button class="li" data-go="#/mock/' + encodeURIComponent(m.key) + '"><div><div class="t">' + esc(m.name) + (rec && m.key === recMock() ? ' <i class="rcm">추천</i>' : '') + '</div><div class="d">' + esc(m.form) + ' · ' + m.ids.length + '문항 · ' + (m.min || m.ids.length) + '분</div></div><div class="r' + (r ? ' done' : '') + '">' + (r ? r.s + '/' + r.t : '') + '</div></button>';
  }
  function mockList() { top({ tab: "mock", back: "#/", title: "모의고사" }); var h = '<h2 class="sec">모의고사</h2><div class="list">'; D.mocks.forEach(function (m) { h += mockLi(m, true); }); $app.innerHTML = '<div class="wrap">' + h + '</div></div>'; }

  /* ── 영역 ── */
  var areaSub = {};
  function area(a) {
    top({ tab: "map", back: "#/", title: a });
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
      '<button class="btn line" style="flex:1" data-go="#/wrong/' + encodeURIComponent(a) + '"' + (st.solved - st.ok ? '' : ' disabled') + '>복습</button></div></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    $app.querySelectorAll("[data-sub]").forEach(function (b) { b.onclick = function () { areaSub[a] = b.getAttribute("data-sub"); area(a); }; });
  }

  /* ── 연습 세트 ── */
  /* ── 시간: 유형별 목표 시간(data tips.s), 맞혀도 목표의 1.3배를 넘기면 「느린 정답」 ── */
  var TIPS = D.tips || {}, DEF_S = { "의사소통": 90, "수리": 90, "문제해결": 100, "자원관리": 110 };
  function target(q) { return (TIPS[q.t] && TIPS[q.t].s) || DEF_S[q.a] || 45; }
  function ms2(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2); }
  function isSlow(q, sec) { return sec > target(q) * 1.3; }
  function skillBox(q, title) {
    var t = TIPS[q.t]; if (!t || !(t.k || []).length) return "";
    return '<div class="skill"><div class="sk-t">' + esc(title) + '</div><ul>' + t.k.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join("") + '</ul></div>';
  }
  S.tm = S.tm || {};
  function timeWeak() {   // 유형별 평균 시간이 목표를 넘는 것
    var by = {};
    Object.keys(S.tm).forEach(function (id) { var q = BYID[id]; if (!q || !q.t) return; var o = by[q.t] = by[q.t] || { q: q, n: 0, sum: 0 }; o.n++; o.sum += S.tm[id][0]; });
    return Object.keys(by).map(function (k) { var o = by[k]; o.avg = o.sum / o.n; o.ratio = o.avg / target(o.q); return o; })
      .filter(function (o) { return o.n >= 3 && o.ratio > 1.25; }).sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 3);
  }
  function timeWeakHtml() {
    var w = timeWeak(); if (!w.length) return "";
    return '<h2 class="sec">시간 약점</h2><div class="list">' + w.map(function (o) {
      var t = TIPS[o.q.t] || {};
      return '<div class="card tw"><div class="tw-h"><b>' + esc(typeName(o.q) || o.q.a) + '</b><span>평균 ' + ms2(o.avg) + ' · 목표 ' + ms2(target(o.q)) + '</span></div>' +
        ((t.k || [])[0] ? '<div class="tw-k">' + esc(t.k[0]) + '</div>' : '') +
        '<button class="btn line full" style="height:44px;font-size:14px;border-radius:12px;margin-top:8px" data-go="#/go/' + encodeURIComponent(o.q.a) + '/' + encodeURIComponent(o.q.t) + '">이 유형 10문항</button></div>';
    }).join("") + '</div>';
  }

  /* ── 연습 세트 (0초부터 올라가는 시계) ── */
  var P = null;
  /* 비서(coach.js)가 같은 유형 문항 하나를 지금 세트의 다음 차례에 끼워 넣는다 */
  window.NCS_APP = { insertNext: function (id) { if (!P || P.i >= P.ids.length || !BYID[id]) return false; P.ids.splice(P.i + 1, 0, id); return true; } };
  function startPractice(ids, back, title) {
    if (!ids.length) { location.hash = back; return; }
    P = { ids: ids, i: 0, ok: 0, back: back, title: title, done: false, res: [] };
    history.replaceState(null, "", "#/play"); play();
  }
  function play() {
    if (!P) { location.hash = "#/"; return; }
    if (P.i >= P.ids.length) return playEnd();
    var q = BYID[P.ids[P.i]];
    penOff();
    top({ notab: 1, back: P.back, title: P.title || q.a, right: '<span class="timer up" id="tm">0:00</span>' });
    var np = P.ids.length, h = '<div class="tq-prog"><i><u style="width:' + ((P.i + 1) / np * 100) + '%"></u></i><span><b>' + (np - P.i - 1) + '</b>문제 남았어요</span></div>' +
      '<div class="tq-meta qhead"><span class="tq-no">' + (P.i + 1) + '번 문제</span><span class="pill">' + esc(q.a) + '</span><span class="pill">' + esc(typeName(q)) + '</span>' + (q.d >= 3 ? '<span class="hard">고난도</span>' : '') + '<span class="tq-sp"></span><span id="tqak"></span></div>' +
      qBody(q) + padRow(q) + (isCalcQ(q) ? '' : padHtml(q)) + opts(q, undefined, true) + '<div id="after"></div>';
    $app.innerHTML = '<div class="wrap tqp">' + h + '</div><div class="tq-bar"><button class="tq-tool" id="tqexp" type="button">' + SV_BOOK + '해설</button><button class="tq-tool" id="tqpen" type="button">' + SV_PEN + '펜</button><span class="tq-sp"></span><button class="tq-nav" type="button" disabled aria-label="이전">‹</button><span class="tq-pos">' + (P.i + 1) + ' <small>/ ' + np + '</small></span><button class="tq-nav is-next" id="nx" type="button" disabled aria-label="다음">다음 ›</button></div>';
    scrollTo(0, 0); padMount(); padBtn(q); tqAsk(q); tqTools(q);
    document.getElementById("tqexp").onclick = function () { var a0 = document.getElementById("after"); if (a0 && a0.firstChild) a0.scrollIntoView({ behavior: "smooth", block: "start" }); };
    var t0 = Date.now(); stopTimer();
    tick = setInterval(function () { var t = document.getElementById("tm"); if (!t) return stopTimer(); var sec = (Date.now() - t0) / 1000; t.textContent = ms2(sec); t.classList.toggle("low", sec > target(q)); }, 1000);
    window.NCS_LAST_SHOW = { q: q, mode: "practice", t0: t0, i: P.i, n: P.ids.length }; document.dispatchEvent(new CustomEvent("ncs:show", { detail: window.NCS_LAST_SHOW })); placeFab();   /* 선제안 비서(coach.js) */
    $app.querySelectorAll(".opt").forEach(function (b) {
      b.onclick = function () {
        if (P.done) return; P.done = true; stopTimer();
        var v = +b.getAttribute("data-v"), ok = v === q.x, sec = Math.round((Date.now() - t0) / 1000), slow = isSlow(q, sec);
        rec(q.i, ok); if (ok) P.ok++; window.NCS_PICK = v;
        S.tm[q.i] = [sec, ok ? 1 : 0]; save(); P.res.push({ id: q.i, ok: ok, sec: sec });
        var tm = document.getElementById("tm"); if (tm) tm.textContent = ms2(sec);
        b.setAttribute("data-s", ok ? "ok" : "no"); b.classList.add(ok ? "is-ok" : "is-no");
        if (!ok) { var rt = $app.querySelector('.opt[data-v="' + q.x + '"]'); rt.classList.add("right"); rt.classList.add("is-ok"); }
        $app.querySelectorAll(".opt").forEach(function (o) { o.classList.add("locked"); });
        if (window.ZZ) { ok ? ZZ.ok(b) : ZZ.no(b); }
        var a = document.getElementById("after");
        a.innerHTML = '<div class="verdict ' + (ok ? (slow ? 'slow' : 'good') : 'bad') + '">' + (ok ? '정답 ' + CIR[q.x] : '오답 · 정답 ' + CIR[q.x]) +
          (ok && slow ? '<span class="vtag">느린 정답</span>' : '') + '<small>걸린 시간 ' + ms2(sec) + ' · 목표 ' + ms2(target(q)) + '</small></div>' +
          (slow || !ok ? skillBox(q, ok ? "목표 시간 안에 푸는 법" : "이 유형 푸는 순서") : '') + explHtml(q) +
          '';
        var nxb = document.getElementById("nx"); nxb.disabled = false; nxb.setAttribute("aria-label", P.i + 1 < P.ids.length ? "다음" : "결과 보기");
        document.getElementById("nx").onclick = function () { P.i++; P.done = false; play(); };
        document.dispatchEvent(new CustomEvent("ncs:answer", { detail: { q: q, v: v, ok: ok, sec: sec, i: P.i, n: P.ids.length, pok: P.ok } }));
        setTimeout(function () { a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 350);
      };
    });
  }
  function playEnd() {
    top({ tab: "home", back: P.back, title: "결과" });
    var n = P.ids.length, r = P.ok / n, last = BYID[P.ids[0]], tot = 0, slowN = 0, weak = {};
    var rows = P.res.map(function (x, k) {
      var q = BYID[x.id], sl = isSlow(q, x.sec); tot += x.sec; if (x.ok && sl) slowN++;
      if (!x.ok || sl) weak[q.t] = q;
      return '<tr><td>' + (k + 1) + '</td><td class="' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? 'O' : 'X') + '</td><td>' + esc(typeName(q) || q.a) + '</td><td class="' + (sl ? 'sl' : '') + '">' + ms2(x.sec) + '<small> / ' + ms2(target(q)) + '</small></td></tr>';
    }).join("");
    var wk = Object.keys(weak).slice(0, 3).map(function (t) { var q = weak[t]; return '<div class="card tw"><div class="tw-h"><b>' + esc(typeName(q) || q.a) + '</b></div>' + skillBox(q, "다음에 쓸 손 기술") + '<button class="btn line full" style="height:44px;font-size:14px;border-radius:12px;margin-top:8px" data-go="#/go/' + encodeURIComponent(q.a) + '/' + encodeURIComponent(q.t) + '">이 유형 10문항</button></div>'; }).join("");
    $app.innerHTML = '<div class="wrap"><div class="card res" style="margin-top:16px;text-align:center"><div class="src">' + esc(P.title || "") + '</div><div class="score">' + P.ok + ' / ' + n + '</div>' +
      '<div class="src">정답률 ' + Math.round(r * 100) + '% · 평균 ' + ms2(tot / Math.max(1, P.res.length)) + ' · 느린 정답 ' + slowN + '</div></div>' +
      '<div class="card res" style="margin-top:10px"><table class="tt"><tr><th>#</th><th></th><th>유형</th><th>시간 / 목표</th></tr>' + rows + '</table></div>' +
      (wk ? '<h2 class="sec">이번 세트 약점</h2><div class="list">' + wk + '</div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><button class="btn red full" data-go="#/go/' + encodeURIComponent(last.a) + '">' + esc(last.a) + ' 10문항 더</button><button class="btn line full" data-go="#/">오늘</button></div></div>';
    if (window.ZZ) { var st = r >= 1 ? 3 : r >= .7 ? 2 : r >= .4 ? 1 : 0; if (st) ZZ.stars(st); }
    P = null;
  }

  /* ── 모의고사: 실제 필기시험 문제지 꼴 ── */
  var M = null, tick = null;
  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }
  function examYear() { var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1; return m >= 7 ? (y + 1) + "년 상반기" : y + "년 하반기"; }
  function examOrg() { var c = curJob(); return c ? { o: c.o.n, j: c.j.n } : { o: "공기업", j: "" }; }
  function mockIntro(key) {
    var m = mockBy(key); if (!m) { location.hash = "#/"; return; }
    top({ tab: "mock", back: "#/mocks", title: "모의고사" });
    var cnt = {}; m.ids.forEach(function (id) { var a = BYID[id].a; cnt[a] = (cnt[a] || 0) + 1; });
    var r = S.m[key], min = m.min || m.ids.length, eo = examOrg();
    var h = '<div class="paper cover"><div class="cv-y">' + examYear() + '</div><div class="cv-o">' + esc(eo.o) + '</div><div class="cv-s">신입사원 채용 필기시험</div>' +
      '<div class="cv-t">문 제 지</div><div class="cv-k">직업기초능력평가' + (eo.j ? ' · ' + esc(eo.j) : '') + '</div><div class="cv-f">' + esc(m.name) + ' (' + esc(m.form) + ')</div>' +
      '<table class="cv-tb"><tr><th>문항 수</th><td>' + m.ids.length + '문항</td><th>시험 시간</th><td>' + min + '분</td></tr></table>' +
      '<table class="cv-tb ar">' + AREAS.filter(function (a) { return cnt[a]; }).map(function (a) { return '<tr><th>' + a + '</th><td>' + cnt[a] + '문항</td></tr>'; }).join("") + '</table>' +
      '<div class="cv-id"><span>수험번호</span><i></i><span>성 명</span><i></i></div>' +
      '<div class="cv-rule"><b>응시자 유의사항</b><ol><li>답은 화면 아래 답안 표기란에 고르고, 다 푼 뒤 「채점」을 누른다.</li><li>시험 시간이 끝나면 고른 답까지만 자동으로 채점된다.</li><li>계산기는 쓸 수 없다. 계산은 문항 밑 연습장에 한다.</li><li>문항마다 머문 시간이 기록되어 해설지에 나온다.</li></ol></div></div>' +
      (r ? '<div class="src" style="margin-top:8px;text-align:center">지난 점수 ' + r.s + ' / ' + r.t + '</div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><button class="btn red full" id="st">시작</button>' +
      (r ? '<button class="btn line full" data-go="#/res/' + encodeURIComponent(key) + '">지난 해설지</button>' : '') + '</div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    document.getElementById("st").onclick = function () { M = { key: key, m: m, i: 0, ans: {}, dw: {}, end: Date.now() + min * 60000 }; history.replaceState(null, "", "#/exam"); exam(); };
  }
  function fmt(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function leave() { if (M && M.enter) { var id = M.m.ids[M.i]; M.dw[id] = (M.dw[id] || 0) + (Date.now() - M.enter) / 1000; M.enter = 0; } }
  function go(i) { leave(); M.i = i; exam(); }
  function exam() {
    if (!M) { location.hash = "#/"; return; }
    var id = M.m.ids[M.i], q = BYID[id], eo = examOrg(); M.enter = Date.now();
    penOff();
    var nA = Object.keys(M.ans).length, nT = M.m.ids.length, firstTodo = -1; M.m.ids.forEach(function (x, k) { if (firstTodo < 0 && !M.ans[x]) firstTodo = k; });
    top({ notab: 1, back: "#/mock/" + encodeURIComponent(M.key), title: "모의고사 응시", right: '<span class="timer" id="tm">' + fmt(M.end - Date.now()) + '</span><button class="hsub" id="sub" type="button">채점</button>' });
    var no = ("0" + (M.i + 1)).slice(-2);
    var h = '<div class="tq-prog"><i><u style="width:' + (nA / nT * 100) + '%"></u></i><span><b>' + (nT - nA) + '</b>문제 남았어요</span></div>' +
      '<div class="paper"><div class="run"><span>' + examYear() + ' ' + esc(eo.o) + ' 필기시험</span><span>직업기초능력평가</span></div>' +
      '<div class="qhead"><span class="pill">' + esc(q.a) + '</span><span class="prog">' + nA + ' / ' + nT + ' 표기</span></div>' +
      qBody(q, no) + padRow(q) + (isCalcQ(q) ? '' : padHtml(q)) + opts(q, M.ans[id]) + '</div>';
    var rows = M.m.ids.map(function (x, k) { var qq = BYID[x], c = ''; for (var v = 1; v <= qq.c.length; v++) c += '<i' + (M.ans[x] === v ? ' class="is-on"' : '') + '>' + v + '</i>'; return '<div class="tq-omr-row' + (k === M.i ? ' is-now' : '') + (M.ans[x] ? '' : ' is-todo') + '" data-i="' + k + '"><span class="tq-qn">' + (k + 1) + '번</span>' + c + '</div>'; }).join("");
    $app.innerHTML = '<div class="tq-wrap has-omr tqe"><main>' + h + '</main><aside class="tq-omr" id="tqomr"><span id="tqjp"></span>' + rows + '</aside></div>' +
      '<div class="tq-bar"><button class="tq-tool" id="tqpen" type="button">' + SV_PEN + '펜</button><span class="tq-sp"></span><button class="tq-nav" id="pv" type="button"' + (M.i ? '' : ' disabled') + ' aria-label="이전">‹</button><button class="tq-pos" id="tqpos" type="button">' + (M.i + 1) + ' <small>/ ' + nT + '</small></button><button class="tq-nav is-next" id="nx2" type="button"' + (M.i + 1 < nT ? '' : ' disabled') + ' aria-label="다음">다음 ›</button></div>';
    scrollTo(0, 0); padMount(); padBtn(q);
    if (window.TERA_Q) TERA_Q.jump(document.getElementById("tqjp"), { count: nT - nA, onClick: function () { if (firstTodo >= 0) go(firstTodo); } });
    tqTools(q);
    document.getElementById("tqpos").onclick = function () { document.getElementById("tqomr").classList.toggle("is-open"); };
    $app.querySelectorAll(".tq-omr-row").forEach(function (rw) { rw.onclick = function () { go(+rw.getAttribute("data-i")); }; });
    document.dispatchEvent(new CustomEvent("ncs:show", { detail: { q: q, mode: "mock" } })); placeFab();
    $app.querySelectorAll(".opt").forEach(function (b) {
      b.onclick = function () {
        M.ans[id] = +b.getAttribute("data-v");
        $app.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("pick", x === b); });
        if (M.i + 1 < M.m.ids.length) setTimeout(function () { go(M.i + 1); }, 220); else { leave(); exam(); }
      };
    });
    document.getElementById("pv").onclick = function () { if (M.i) go(M.i - 1); };
    document.getElementById("nx2").onclick = function () { if (M.i + 1 < M.m.ids.length) go(M.i + 1); };
    document.getElementById("sub").onclick = function () { var left = M.m.ids.length - Object.keys(M.ans).length; if (left && !confirm("안 고른 문항 " + left + "개. 이대로 채점할까요?")) return; grade(); };
    stopTimer();
    tick = setInterval(function () { var t = document.getElementById("tm"); if (!t || !M) return stopTimer(); var left = M.end - Date.now(); t.textContent = fmt(left); t.classList.toggle("low", left < 300000); if (left <= 0) { stopTimer(); grade(); } }, 1000);
  }
  function omr() {
    var h = '<div class="omr"><div class="in"><div class="dots">';
    M.m.ids.forEach(function (id, i) { h += '<button data-i="' + i + '" class="' + (M.ans[id] ? 'done' : '') + (i === M.i ? ' cur' : '') + '">' + (i + 1) + '</button>'; });
    return h + '</div><button class="btn red" id="sub">채점</button></div></div>';
  }
  function grade() {
    stopTimer(); leave();
    var s = 0, t = M.m.ids.length, dw = {};
    M.m.ids.forEach(function (id) { var ok = M.ans[id] === BYID[id].x; if (ok) s++; if (M.ans[id]) { rec(id, ok); S.tm[id] = [Math.round(M.dw[id] || 0), ok ? 1 : 0]; } dw[id] = Math.round(M.dw[id] || 0); });
    S.m[M.key] = { s: s, t: t, ans: M.ans, dw: dw, ts: Date.now() }; save();
    var key = M.key; M = null; history.replaceState(null, "", "#/res/" + encodeURIComponent(key)); result(key, true);
  }
  function mockLevel(m) { var n = m.ids.length, d = 0, hard = 0; m.ids.forEach(function (id) { var q = BYID[id]; d += q.d || 2; if ((q.d || 2) >= 3) hard++; }); return { avg: d / n, hard: hard, n: n }; }
  function levelName(avg) { return avg >= 2.75 ? "상" : avg >= 2.5 ? "중상" : avg >= 2.2 ? "중" : "중하"; }
  function result(key, fresh) {
    var r = S.m[key], m = mockBy(key); if (!r || !m) { location.hash = "#/"; return; }
    top({ tab: "mock", back: "#/mocks", title: "해설지" });
    var dw = r.dw || {}, by = {}, eo = examOrg();
    m.ids.forEach(function (id) { var q = BYID[id], o = by[q.a] = by[q.a] || { n: 0, ok: 0, hard: 0, types: {} }; o.n++; if (r.ans[id] === q.x) o.ok++; if ((q.d || 2) >= 3) o.hard++; o.types[q.t] = (o.types[q.t] || 0) + 1; });
    var lv = mockLevel(m), used = m.ids.reduce(function (s, id) { return s + (dw[id] || 0); }, 0);
    var killer = m.ids.map(function (id, i) { return [i, BYID[id]]; }).filter(function (x) { return (x[1].d || 2) >= 3 && r.ans[x[1].i] !== x[1].x; }).slice(0, 8);
    var longQ = m.ids.map(function (id, i) { var q = BYID[id]; return [i, q, (dw[id] || 0) / target(q)]; }).filter(function (x) { return x[2] > 1.3; }).sort(function (a, b) { return b[2] - a[2]; }).slice(0, 5);
    var h = '<div class="paper cover small"><div class="cv-y">' + examYear() + ' ' + esc(eo.o) + '</div><div class="cv-t" style="margin:6px 0">해 설 지</div><div class="cv-f">' + esc(m.name) + ' (' + esc(m.form) + ')</div>' +
      '<div class="score" style="text-align:center">' + r.s + ' / ' + r.t + '</div><div class="src" style="text-align:center">' + Math.round(r.s / r.t * 100) + '점 환산 · 쓴 시간 ' + ms2(used) + ' / ' + (m.min || m.ids.length) + '분</div></div>';
    h += '<h2 class="sec">시험 총평</h2><div class="card review-sum">' +
      '<div class="rs-row"><b>난이도</b><span class="lv">' + levelName(lv.avg) + '</span><span>고난도 ' + lv.hard + '문항 / ' + lv.n + '문항</span></div>' +
      '<table class="tt"><tr><th>영역</th><th>맞힘</th><th>고난도</th></tr>' + AREAS.filter(function (a) { return by[a]; }).map(function (a) { return '<tr><td>' + a + '</td><td>' + by[a].ok + ' / ' + by[a].n + '</td><td>' + by[a].hard + '</td></tr>'; }).join("") + '</table>' +
      '<div class="rs-sub">영역별 강조 포인트</div><ul class="rs-pt">' + AREAS.filter(function (a) { return by[a]; }).map(function (a) {
        var ts = Object.keys(by[a].types).sort(function (x, y) { return by[a].types[y] - by[a].types[x]; }), t = TIPS[ts[0]];
        return t && t.p ? '<li><b>' + a + '</b> ' + esc(t.p) + '</li>' : '';
      }).join("") + '</ul>' +
      (killer.length ? '<div class="rs-sub">놓친 고난도 문항</div><div class="rs-chips">' + killer.map(function (x) { return '<button class="chip" data-go="#/rev/' + encodeURIComponent(key) + '/' + x[0] + '">' + (x[0] + 1) + '번 ' + esc(typeName(x[1]) || x[1].a) + '</button>'; }).join("") + '</div>' : '') +
      (longQ.length ? '<div class="rs-sub">시간을 많이 쓴 문항</div><div class="rs-chips">' + longQ.map(function (x) { return '<button class="chip" data-go="#/rev/' + encodeURIComponent(key) + '/' + x[0] + '">' + (x[0] + 1) + '번 ' + ms2(dw[x[1].i] || 0) + ' / ' + ms2(target(x[1])) + '</button>'; }).join("") + '</div>' : '') +
      '</div>';
    h += '<h2 class="sec">문항별 해설</h2><div class="grid">';
    m.ids.forEach(function (id, i) { h += '<button class="' + (r.ans[id] === BYID[id].x ? 'o' : 'x') + '" data-go="#/rev/' + encodeURIComponent(key) + '/' + i + '">' + (i + 1) + '</button>'; });
    h += '</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:16px"><button class="btn red full" data-go="#/mock/' + encodeURIComponent(key) + '">다시 풀기</button><button class="btn line full" data-go="#/">오늘</button></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    if (fresh && window.ZZ) { var x = r.s / r.t, st = x >= 1 ? 3 : x >= .7 ? 2 : x >= .4 ? 1 : 0; if (st) ZZ.stars(st); }
  }
  function review(key, i) {
    var r = S.m[key], m = mockBy(key); if (!r || !m) { location.hash = "#/"; return; }
    i = Math.max(0, Math.min(m.ids.length - 1, i));
    var q = BYID[m.ids[i]], a = r.ans[q.i], sec = (r.dw || {})[q.i], tp = TIPS[q.t] || {};
    top({ notab: 1, back: "#/res/" + encodeURIComponent(key), title: (i + 1) + "번 해설" });
    var h = '<div class="qhead"><span class="pill">' + (i + 1) + '번</span>' + esc(q.a) + ' · ' + esc(typeName(q)) + ((q.d || 2) >= 3 ? '<span class="hard">고난도</span>' : '') + '</div>' + qBody(q) +
      '<div class="opts">' + q.c.map(function (c, k) { var v = k + 1; return '<div class="opt locked' + (v === q.x ? ' right' : '') + (v === a && a !== q.x ? ' wrongpick' : '') + '"><b>' + CIR[v] + '</b><span>' + esc(c) + '</span></div>'; }).join("") + '</div>' +
      '<div class="verdict ' + (a === q.x ? 'rv-good' : 'rv-bad') + '">' + (a === q.x ? '정답 ' + CIR[q.x] : (a ? '고른 답 ' + CIR[a] + ' · ' : '안 고름 · ') + '정답 ' + CIR[q.x]) +
      (sec != null ? '<small>머문 시간 ' + ms2(sec) + ' · 목표 ' + ms2(target(q)) + '</small>' : '') + '</div>' +
      (tp.p ? '<div class="point"><b>출제 포인트</b> ' + esc(tp.p) + '</div>' : '') + explHtml(q) + skillBox(q, "시간 줄이는 손 기술") +
      '<div class="dock" style="display:flex;gap:8px"><button class="btn line" style="flex:1" data-go="#/rev/' + encodeURIComponent(key) + '/' + (i - 1) + '"' + (i ? '' : ' disabled') + '>이전</button><button class="btn red" style="flex:1" data-go="#/rev/' + encodeURIComponent(key) + '/' + (i + 1) + '"' + (i + 1 < m.ids.length ? '' : ' disabled') + '>다음</button></div>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>'; scrollTo(0, 0);
  }

  /* ── 설정 (화면표준 5·7절) ── */
  function settings() {
    top({ tab: "set", back: "#/", title: "설정" });
    var c = curJob(), m = dayMin();
    var h = '<h2 class="sec">설정</h2><section class="card setc"><h3>공부</h3>' +
      '<div class="srow"><div><b>지원 기관 · 직무</b><span>' + (c ? esc(c.o.n) + ' · ' + esc(c.j.n) : '아직 안 정했어요') + '</span></div><button class="sbtn" data-go="#/org">바꾸기</button></div>' +
      '<div class="slab">하루 공부 시간</div><div class="sgrid">' + MINS.map(function (x) { return '<button class="sopt' + (m === x[0] ? ' on' : '') + '" data-min="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      '<p class="shelp">' + (m ? '오늘 카드가 ' + dayCount() + '문항으로 나와요. 문항당 평균 목표 시간 ' + Math.round(avgTarget()) + '초로 나눈 값이에요.' : '시간을 고르면 오늘 카드 문항 수가 맞춰져요. 지금은 10문항이에요.') + '</p></section>';
    h += '<button class="btn red full" style="margin-top:14px" data-go="#/today">시작</button>';
    $app.innerHTML = '<div class="wrap">' + h + '</div>';
    $app.querySelectorAll("[data-min]").forEach(function (b) { b.onclick = function () { window.NCS_SET_MIN(+b.getAttribute("data-min")); settings(); }; });
  }
  /* ── 합격 지도 (공용 tera-map.js, 화면표준 11절) — 줄 = 영역(지원 기관 출제 영역을 위에), 칸 = 영역별 유형 ── */
  function mapScreen() {
    top({ tab: "map", back: "#/", title: "합격 지도" });
    document.body.classList.add("mapscr");
    var cj = curJob(), org = cj ? cj.j.a : [];
    var areas = AREAS.filter(function (a) { return areaStat(a).n; });
    areas = areas.filter(function (a) { return org.indexOf(a) >= 0; }).concat(areas.filter(function (a) { return org.indexOf(a) < 0; }));
    var cand = [], tS = 0, tN = 0;
    var groups = areas.map(function (a) {
      var subs = {}; D.items.forEach(function (q) { if (q.a === a && q.t) subs[q.t] = (subs[q.t] || 0) + 1; });
      var ks = Object.keys(subs).sort(function (x, y) { return subs[y] - subs[x]; }), sa = areaStat(a); tS += sa.solved; tN += sa.n;
      var nodes = ks.map(function (t) {
        var st = areaStat(a, t), pct = Math.round(st.solved / st.n * 100);
        var nd = { id: a + "|" + t, t: t, name: D.types[t] || t, pct: pct, leaves: [{ name: "푼 문항 " + st.solved + " / " + st.n, pct: pct }, { name: "정답률", pct: Math.round(st.rate * 100) }] };
        cand.push(nd); return nd;
      });
      return { name: a, pct: Math.round(sa.solved / sa.n * 100), nodes: nodes };
    });
    cand.slice().sort(function (x, y) { return x.pct - y.pct || cand.indexOf(x) - cand.indexOf(y); }).slice(0, 5).forEach(function (nd, i) { nd.order = i + 1; });
    $app.innerHTML = '<div class="wrap wide"><div id="tmap"></div></div>';
    var host = document.getElementById("tmap");
    TERA_MAP.mount(host, { mark: "tier", title: cj ? cj.o.n : "공기업 NCS", sub: cj ? cj.j.n : "", unit: "문항", groups: groups, recommend: 5,
      onStart: function (n, g) { location.hash = "#/go/" + encodeURIComponent(g.name) + "/" + encodeURIComponent(n.t); } });
  }
  /* ── 길잡이 ── */
  function route() {
    penOff();
    if (window.TERA_PAD && document.body.classList.contains("padopen")) { TERA_PAD.close(); document.body.classList.remove("padopen"); }
    var p = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    if (p[0] !== "exam") stopTimer();
    switch (p[0]) {
      case "map": return mapScreen();
      case "set": return settings();
      case "today": var tn = dayCount(), tw = weakest() || AREAS[0], tc = curJob(), tset = tc ? tc.j.a : AREAS;
        return tn <= 10 ? startPractice(pickSet(function (q) { return q.a === tw; }, 10), "#/area/" + encodeURIComponent(tw), tw) : (function () { var ids = []; areaSplit(tset, tn).forEach(function (x) { ids = ids.concat(pickSet(function (q) { return q.a === x[0]; }, x[1])); }); return startPractice(ids, "#/", "오늘 " + tn + "문항"); })();
      case "area": return area(p[1]);
      case "go": return startPractice(pickSet(function (q) { return q.a === p[1] && (!p[2] || q.t === p[2]); }, 10), "#/area/" + encodeURIComponent(p[1]), p[1]);
      case "wrong": return startPractice(shuffle(D.items.filter(function (q) { return S.h[q.i] && !S.h[q.i][1] && (!p[1] || q.a === p[1]); })).slice(0, 10).map(function (q) { return q.i; }), p[1] ? "#/area/" + encodeURIComponent(p[1]) : "#/", "복습");
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
        /* 11-05: 첫 방문 기관 고르기는 첫 설정(zzsetup, KB식 질문)이 맡는다. 첫 설정을 못 불러오면 옛 목록 */
        if (!S.org && !S.skipOrg && ORGS.length && !window.NCS_SETUP_ON) return orgList(null, true);
        return home();
    }
  }
  window.NCS_SET_ORG = function (o, j) { if (o && j) { S.org = { o: o, j: j }; S.skipOrg = false; } else S.skipOrg = true; save(); route(); };
  window.NCS_HAS_ORG = function () { return !!(S.org || S.skipOrg); };
  addEventListener("hashchange", route);
  route();
})();
