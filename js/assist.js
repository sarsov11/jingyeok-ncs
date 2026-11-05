/* 학습 비서 시범판 (2026-11-01) — 1단계: 미리 만든 답변 체계. LLM 을 부르지 않는다.
 * 답의 재료는 전부 data/items.js 안에 있다: 지문(m)·선지(c)·정답(x)·해설(e.풀이/선지/함정)·유형팁(tips).
 * 판별이 안 되는 질문은 2단계 꾸러미(질문·문항 id·검색으로 고른 근거 조각)로 만든다. 시범판은 꾸러미까지만 보여 준다.
 * 같은 파일을 노드에서도 불러 쓴다(작업/비서/1단계.js) — 화면 코드는 document 가 있을 때만 돈다. */
(function (root) {
  "use strict";
  var D = root.NCS; if (!D || !D.items) return;
  var BYID = {}, GROUP = {};
  D.items.forEach(function (q) { BYID[q.i] = q; if (q.g) (GROUP[q.g] = GROUP[q.g] || []).push(q.i); });
  var TIPS = D.tips || {}, TYPES = D.types || {};
  var CIR = ["", "①", "②", "③", "④", "⑤"];
  var DEF_S = { "의사소통": 90, "수리": 90, "문제해결": 100, "자원관리": 110 };

  /* ───────── 글 다루기 ───────── */
  function one(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""); }
  function stripNo(s) { return one(s).replace(/^[①②③④⑤]\s*/, ""); }
  function splitSent(text) {
    var t = one(text), out = [], st = 0, i, c, n;
    for (i = 0; i < t.length; i++) {
      c = t.charAt(i);
      if (c === "." || c === "!" || c === "?") {
        n = t.charAt(i + 1);
        while (n === "\"" || n === "'" || n === "”" || n === "’" || n === "」" || n === ")") { i++; n = t.charAt(i + 1); }
        if (n === "" || n === " ") { out.push(t.slice(st, i + 1)); st = i + 2; }
      }
    }
    if (st < t.length) out.push(t.slice(st));
    return out.filter(function (x) { return one(x).length > 1; });
  }
  function grams(s) {
    var out = [], runs = String(s || "").toLowerCase().match(/[가-힣]+|[a-z0-9]+/g) || [];
    runs.forEach(function (r) {
      if (/[가-힣]/.test(r.charAt(0))) { for (var n = 2; n <= 3; n++) for (var i = 0; i + n <= r.length; i++) out.push(r.substr(i, n)); }
      else if (r.length >= 2) out.push(r);
    });
    (String(s || "").toLowerCase().match(/[0-9]+[가-힣]/g) || []).forEach(function (x) { out.push(x); });   // 5곳, 31일, 70퍼 처럼 숫자+단위
    return out;
  }
  var QSTOP = /어떻게|얼마나|정해져|되는 거|알려\s*주세요|알려\s*줘|알려\s*주|설명해\s*(줘|주세요)|궁금|무엇|뭐예요|뭔가요|인가요|하나요|해요|있나요|나요|주세요|거예요|건가요|이에요|예요|인지|해 줘|말해 줘/g;

  /* ───────── 조각 만들기 (색인.py 와 같은 규칙) ───────── */
  function blockChunks(it, tag, m) {
    var out = [], nb = 0;
    (m || []).forEach(function (b, bi) {
      var k = b.종류, ti = b.제목 ? b.제목 + " " : "";
      if (k === "글") {
        (b.문단 || []).forEach(function (p, i) { out.push({ id: it.i + "#" + tag + bi + "p" + i, item: it.i, kind: "pass", label: "지문 " + ti + (i + 1) + "문단", text: one(p) }); });
      } else if (k === "표") {
        var th = b.열 || [];
        (b.행 || []).forEach(function (r, i) {
          var cells = r.map(function (c, j) { return j ? one(th[j]) + " " + one(c) : one(c); });
          out.push({ id: it.i + "#" + tag + bi + "r" + i, item: it.i, kind: "pass", label: "지문 표 " + (b.제목 ? "'" + b.제목 + "' " : "") + one(r[0]) + " 행", text: (b.제목 ? one(b.제목) + ": " : "") + cells.join(", ") });
        });
        if ((b.주 || []).length) out.push({ id: it.i + "#" + tag + bi + "n", item: it.i, kind: "pass", label: "지문 표 주석", text: one((b.주 || []).join(" ")) });
      } else if (k === "보기") {
        (b.항목 || []).forEach(function (r, i) { out.push({ id: it.i + "#" + tag + bi + "b" + i, item: it.i, kind: "pass", label: "지문 보기 " + one(r[0]), text: one(r[0]) + ". " + one(r[1]) }); });
      } else if (k === "조건") {
        (b.항목 || []).forEach(function (r, i) { out.push({ id: it.i + "#" + tag + bi + "c" + i, item: it.i, kind: "pass", label: "지문 " + (b.제목 || "조건") + " " + (i + 1) + "째", text: one(r) }); });
      } else if (k === "공문") {
        var mh = b.머리 || {}, hd = Object.keys(mh).map(function (x) { return x + " " + mh[x]; }).join(", ");
        out.push({ id: it.i + "#" + tag + bi + "h", item: it.i, kind: "pass", label: "지문 공문 머리", text: one(hd) });
        (b.본문 || []).forEach(function (p, i) { out.push({ id: it.i + "#" + tag + bi + "p" + i, item: it.i, kind: "pass", label: "지문 공문 " + (i + 1) + "째 줄", text: one(p) }); });
        if (b.붙임) out.push({ id: it.i + "#" + tag + bi + "a", item: it.i, kind: "pass", label: "지문 공문 붙임", text: one(typeof b.붙임 === "string" ? b.붙임 : JSON.stringify(b.붙임)) });
      } else if (k === "코드") {
        out.push({ id: it.i + "#" + tag + bi + "k", item: it.i, kind: "pass", label: "지문 코드", text: one(Array.isArray(b.본문) ? b.본문.join(" ") : b.본문) });
      } else if (k === "그래프") {
        var se = (b.계열 || []).map(function (s) { return s.이름 + " " + (s.값 || []).join(", "); }).join(" / ");
        out.push({ id: it.i + "#" + tag + bi + "g", item: it.i, kind: "pass", label: "지문 그래프 " + (b.제목 ? "'" + b.제목 + "'" : ""), text: one((b.제목 || "") + " " + (b.x || []).join(", ") + " " + se) });
      } else if (k === "그림") {
        if (b.설명) out.push({ id: it.i + "#" + tag + bi + "f", item: it.i, kind: "pass", label: "지문 그림 " + (b.제목 ? "'" + b.제목 + "'" : ""), text: one((b.제목 || "") + " " + b.설명) });
      }
    });
    return out;
  }
  function itemChunks(q) {
    var e = q.e || {}, out = [{ id: q.i + "#q", item: q.i, kind: "stem", label: "발문", text: one(q.p) }];
    out = out.concat(blockChunks(q, "m", q.m));
    q.c.forEach(function (c, k) { out.push({ id: q.i + "#o" + (k + 1), item: q.i, kind: "opt", label: "선지 " + CIR[k + 1], text: one(c) }); });
    (e.풀이 || []).forEach(function (s, k) { out.push({ id: q.i + "#s" + (k + 1), item: q.i, kind: "sol", label: "해설 풀이 " + (k + 1) + "째 줄", text: one(s) }); });
    (e.선지 || []).forEach(function (s, k) { out.push({ id: q.i + "#w" + (k + 1), item: q.i, kind: "why", label: "해설 선지 분석 " + CIR[k + 1], text: one(s) }); });
    if (e.함정) out.push({ id: q.i + "#t", item: q.i, kind: "trap", label: "해설 함정", text: one(e.함정) });
    return out;
  }
  function tipChunks(t) {
    var x = TIPS[t]; if (!x) return [];
    var nm = TYPES[t] || t, out = [];
    (x.k || []).forEach(function (s, i) { out.push({ id: "tip:" + t + "#k" + (i + 1), item: null, type: t, kind: "tip", label: "유형팁 " + nm, text: one(s) }); });
    if (x.p) out.push({ id: "tip:" + t + "#p", item: null, type: t, kind: "tip", label: "유형팁 " + nm + " 출제 포인트", text: one(x.p) });
    if (x.s) out.push({ id: "tip:" + t + "#s", item: null, type: t, kind: "tip", label: "유형팁 " + nm + " 목표 시간", text: nm + " 목표 시간 " + x.s + "초" });
    return out;
  }

  /* ───────── 색인 (BM25, 글자 2~3-gram) ───────── */
  var IDX = null;
  function build() {
    if (IDX) return IDX;
    var ch = [];
    D.items.forEach(function (q) { ch = ch.concat(itemChunks(q)); });
    Object.keys(TIPS).forEach(function (t) { ch = ch.concat(tipChunks(t)); });
    var df = {}, tot = 0;
    ch.forEach(function (c) {
      var tf = {}, g = grams(c.text + " " + c.label.replace(/^(지문|해설|선지|유형팁)\s*/, ""));
      g.forEach(function (x) { tf[x] = (tf[x] || 0) + 1; });
      c.tf = tf; c.len = g.length; tot += g.length;
      Object.keys(tf).forEach(function (x) { df[x] = (df[x] || 0) + 1; });
    });
    var byId = {}; ch.forEach(function (c) { byId[c.id] = c; });
    IDX = { ch: ch, df: df, avg: tot / ch.length, N: ch.length, byId: byId };
    return IDX;
  }
  function idf(g) { var I = build(), d = I.df[g] || 0; return Math.log(1 + (I.N - d + .5) / (d + .5)); }
  function qgrams(text) {
    var seen = {}, out = [];
    grams(String(text || "").replace(QSTOP, " ")).forEach(function (g) { if (!seen[g]) { seen[g] = 1; out.push(g); } });
    return out;
  }
  /* cur: 지금 문항(과 묶음 첫 문항) id 목록 — 이 문항 조각에 가산점. */
  function search(query, o) {
    o = o || {}; var I = build(), qg = qgrams(query), k1 = 1.2, b = .75, res = [];
    if (!qg.length) return res;
    var tableQ = /표|증가|감소|값|비율|율|합계|평균/.test(String(query)), den = 0; qg.forEach(function (g) { den += idf(g); });
    I.ch.forEach(function (c) {
      if (o.kinds && o.kinds.indexOf(c.kind) < 0) return;
      var s = 0, hit = 0;
      qg.forEach(function (g) { var f = c.tf[g]; if (!f) return; var w = idf(g); s += w * f * (k1 + 1) / (f + k1 * (1 - b + b * c.len / I.avg)); hit += w; });
      var mine = o.cur && o.cur.indexOf(c.item) >= 0, mineT = o.type && c.type === o.type, floor = false;
      if (!s) { if (mine && tableQ && c.label.indexOf("지문 표") === 0) { s = .01; floor = true; } else return; }   // 표 질문은 낱말이 안 겹쳐도 현재 문항 표 행을 후보에 둔다
      if (mine && tableQ && c.label.indexOf("지문 표") === 0) s *= 1.5;   // 표·증가·값 같은 질문은 지문 표 행을 앞에
      res.push({ id: c.id, item: c.item, kind: c.kind, label: c.label, text: c.text, score: s * (mine ? 1.6 : mineT ? 1.3 : 1), cover: hit / den, mine: !!(mine || mineT), floor: floor, tier: mine ? 0 : mineT ? 1 : 2 });
    });
    /* 현재 문항 → 같은 유형 팁 → 다른 문항. 현재 문항에서 겹침 .2 이상인 조각이 있으면 다른 문항 조각은 뺀다. */
    res.sort(function (a, b) { return b.score - a.score; });
    var cur = res.filter(function (r) { return r.tier === 0 && (r.cover >= .12 || r.floor); }), tips = res.filter(function (r) { return r.tier === 1; }), rest = res.filter(function (r) { return r.tier === 2; });
    var strong = cur.some(function (r) { return r.cover >= .2; });
    return cur.concat(tips, strong ? [] : rest).slice(0, o.k || 5);
  }

  /* ───────── 문항 도우미 ───────── */
  function ids(q) { var l = [q.i]; if (q.g && GROUP[q.g] && GROUP[q.g][0] !== q.i) l.push(GROUP[q.g][0]); return l; }
  function target(q) { return (TIPS[q.t] && TIPS[q.t].s) || DEF_S[q.a] || 45; }
  function passChunks(q) {   // 공통 지문(묶음 첫 문항)까지
    var I = build(), l = ids(q);
    return I.ch.filter(function (c) { return c.kind === "pass" && l.indexOf(c.item) >= 0; });
  }
  /* 선지(또는 아무 글)와 가장 많이 겹치는 지문 문장 — 낱말 겹침으로 고른 것이라 근거 후보다. */
  function evidenceFor(q, text, min) {
    var qg = qgrams(text), den = 0, best = null;
    if (!qg.length) return null;
    qg.forEach(function (g) { den += idf(g); });
    passChunks(q).forEach(function (c) {
      splitSent(c.text).concat(c.text.length > 120 ? [] : [c.text]).forEach(function (sn) {
        var set = {}; grams(sn).forEach(function (g) { set[g] = 1; });
        var hit = 0; qg.forEach(function (g) { if (set[g]) hit += idf(g); });
        var sc = hit / den;
        if (!best || sc > best.score) best = { text: sn, label: c.label, score: sc };
      });
    });
    return best && best.score >= (min == null ? .3 : min) ? best : null;
  }

  /* ───────── 의도 판별 (규칙, LLM 없음) ───────── */
  var CIRN = { "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5 }, ORDN = { "첫": 1, "두": 2, "세": 3, "네": 4, "다섯": 5, "둘": 2, "셋": 3, "넷": 4 };
  function optsOf(text, q) {
    var t = String(text || ""), out = [], m, re;
    function add(n) { if (n >= 1 && n <= 5 && out.indexOf(n) < 0) out.push(n); }
    re = /[①②③④⑤]/g; while ((m = re.exec(t))) add(CIRN[m[0]]);
    re = /(?:^|[^0-9])([1-5])\s*번(?!\s*째)(?!\s*(?:문제|문항))/g; while ((m = re.exec(t))) add(+m[1]);
    re = /([1-5])\s*번\s*째/g; while ((m = re.exec(t))) add(+m[1]);
    re = /(첫|두|세|네|다섯)\s*번\s*째|(첫|둘|셋|넷|다섯)째/g; while ((m = re.exec(t))) add(ORDN[m[1] || m[2]]);
    re = /(?:^|[^0-9])\(([1-5])\)|(?:^|\s)([1-5])\)/g; while ((m = re.exec(t))) add(+(m[1] || m[2]));
    re = /(삼|사|오)\s*번\s*(?:선지|보기)/g; while ((m = re.exec(t))) add({ "삼": 3, "사": 4, "오": 5 }[m[1]]);
    if (/마지막\s*(선지|보기|번호|항|답)?/.test(t) && q && q.c.length === 5) add(5);
    if (q && q.c.every(function (c) { return one(c).length <= 2; })) {
      re = /(?:^|[^A-Za-z])([A-E])(?![A-Za-z])/g; while ((m = re.exec(t))) add("ABCDE".indexOf(m[1]) + 1);
    }
    return out.slice(0, 2);
  }
  var OUT = /면접|연봉|채용\s*공고|자소서|서류\s*전형|합격\s*(률|선|컷)|경쟁률|복지|학원|강의\s*추천|인강/;
  var RULES = [
    ["SIMILAR", /비슷한|유사한|같은\s*(유형|종류)|다른\s*문제|이런\s*(종류|유형|문제)|또\s*(풀|있)|더\s*(풀어|풀고|연습)|연습\s*문제/],
    ["SPEED", /빨리|빠르게|빨라지|단축|시간\s*(을\s*)?(줄|아끼|단축)|오래\s*걸|느려|속도|전략|꿀팁|요령|손\s*기술|스킬|목표\s*시간|제한\s*시간|시간\s*(안|내)에|시간이?\s*(부족|모자|없)/],
    ["EVIDENCE", /근거|어디(에|서|를|가|야|예요)?\s*(나와|있|써|적|보|찾|봐)|어느\s*(문단|부분|줄|문장)|출처|지문.*어디|어디.*지문/],
    ["WHY_WRONG", /(왜|어째서).*(틀|아니|아님|오답|안\s*(돼|되|맞)|못)|(탈락|제외|빠지|떨어지).*(이유|왜|까닭)|틀린\s*(이유|까닭|건|것)|오답.*(이유|왜)|어디가\s*틀|뭐가\s*틀|무엇이\s*틀|왜\s*안\s*(돼|되)/],
    ["WHY_RIGHT", /(왜|어째서).*(맞|정답|답이|옳|답인)|정답.*(이유|까닭)|맞는\s*(이유|까닭)|답이\s*왜/],
    ["TRAP", /함정|헷갈|헛갈|자주\s*(틀|하는\s*실수)|실수|낚이|속기\s*쉬|주의할/],
    ["STEPS", /풀이|어떻게\s*(풀|구|계산|접근|해결)|푸는\s*(법|방법|순서|과정)|풀어\s*(줘|주|야|봐)|계산\s*(과정|방법)|과정|접근|해법/],
    ["ANSWER", /정답.*(뭐|뭔|무엇|알려|몇)|답.*(뭐|알려|몇\s*번)|몇\s*번이/],
    ["TERM", /(뜻|의미|무슨\s*(말|소리)|이란|란\s*(뭐|무엇)|정의|개념|(이|가|은|는)\s*뭐|뭔가요|뭐예요)/]
  ];
  function parse(text, q) {
    var t = one(text), intent = "OTHER";
    if (!OUT.test(t)) for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(t)) { intent = RULES[i][0]; break; }
    var op = optsOf(t, q);
    /* 선지 번호만 찍고 「설명해줘·이유·뭐가 달라요」처럼 묻는 말 = 그 선지의 해설 */
    if (intent === "OTHER" && op.length && !OUT.test(t) && /설명|해설|분석|알려|보여|이유|까닭|달라|차이|비교|뭐가|어떻게|왜/.test(t)) intent = "WHY_WRONG";
    return { intent: intent, opts: op, text: t };
  }
  var NOTERM = /^(이거|이것|그거|그것|저거|이게|이건|그게|뭐|이|그|저|이유|답|정답|문제|지문|값|결과|내용|부분|문장|선지|보기)$/;
  function termOf(t) {
    var m = t.match(/['"‘“「『]([^'"’”」』]{1,20})['"’”」』]/), w;
    if (!m) m = t.match(/([가-힣A-Za-z0-9·]{2,14}?)(?:이란|란|이?라는\s*(?:게|것|말)|의\s*(?:뜻|의미)|(?:이|가|은|는)?\s*(?:무슨\s*(?:뜻|말|의미)|뭐|무엇|뜻|의미|정의))/);
    if (!m) return null;
    w = m[1].replace(/(은|는|이|가|을|를|의)$/, "");
    return w.length < 2 || NOTERM.test(w) ? null : w;
  }

  /* ───────── 답 조립 ───────── */
  function say(t, src) { return { k: "say", t: t, src: src || "" }; }
  function quote(t, src) { return { k: "quote", t: t, src: src || "" }; }
  function list(a, src) { return { k: "list", a: a, src: src || "" }; }
  function typeLink(q) { return { href: "#/go/" + encodeURIComponent(q.a) + "/" + encodeURIComponent(q.t), label: "이 유형 10문항 풀기" }; }
  function gatedAns(intent) {
    return { stage: 1, intent: intent, gated: true, head: "푼 다음에 볼 수 있어요",
      parts: [say("정답과 선지별 해설은 문제를 푼 뒤에 보여 드립니다. 지금은 푸는 순서, 시간 줄이는 법, 같은 유형 문제를 물어볼 수 있습니다.")] };
  }
  function whyOpt(q, k) {
    var e = q.e || {}, w = (e.선지 || [])[k - 1];
    if (!w) return null;
    return { text: stripNo(w), src: "해설 선지 분석 " + CIR[k] };
  }
  /* 예상질문표(11-05): 학생이 친 말이 그 문항 표의 말과 글자 조각으로 60% 넘게 겹치면 표의 답을 먼저 낸다.
   * 풀기 전에는 오답후·정답후 질문을 쓰지 않는다(정답이 샐 수 있다). */
  function bi(s) { s = String(s || "").replace(/[\s?!.,~'"“”‘’]/g, ""); var o = {}; for (var i = 0; i < s.length - 1; i++) o[s.substr(i, 2)] = 1; return o; }
  function yqMatch(text, q, solved) {
    var list = (root.NCS_YQ || {})[q.i]; if (!list) return null;
    var A0 = bi(text), na = Object.keys(A0).length, best = null, bs = 0;
    if (na < 3) return null;
    list.forEach(function (y) {
      if (!solved && (y["때"] === "오답후" || y["때"] === "정답후")) return;
      var B = bi(y["말"]), nb = Object.keys(B).length, c = 0;
      Object.keys(A0).forEach(function (g) { if (B[g]) c++; });
      var r = c / Math.max(1, Math.min(na, nb)); if (r > bs) { bs = r; best = y; }
    });
    return bs >= .6 ? best : null;
  }
  function answer(text, ctx) {
    ctx = ctx || {}; var q = ctx.q, solved = !!ctx.solved, p = parse(text, q), e = q.e || {}, tp = TIPS[q.t] || {}, parts = [], k, w, ev, pk = ctx.pick, I = p.intent;
    var yq = yqMatch(text, q, solved);
    if (yq) return { stage: 1, intent: "YQ", head: yq["말"], parts: [say(yq["답"], "예상질문표")] };
    if (I === "OTHER") return packet(text, q, "의도 규칙에 걸리지 않음");
    var needSolved = { WHY_WRONG: 1, WHY_RIGHT: 1, EVIDENCE: 1, TRAP: 1, ANSWER: 1 };
    if (needSolved[I] && !solved) return gatedAns(I);

    if (I === "WHY_WRONG" || I === "WHY_RIGHT") {
      var ks = p.opts.slice();
      if (!ks.length && I === "WHY_WRONG" && pk && pk !== q.x) ks = [pk];
      if (!ks.length && I === "WHY_RIGHT") ks = [q.x];
      if (!ks.length) return { stage: 1, intent: I, ask: true, head: "몇 번 선지가 궁금한가요?", parts: [say("번호를 눌러 주세요.")], choices: [1, 2, 3, 4, 5].map(function (n) { return { n: n, text: CIR[n] + "번이 왜 " + (n === q.x ? "맞아요?" : "틀려요?") }; }) };
      ks.forEach(function (n) {
        w = whyOpt(q, n); if (!w) return;
        var isRight = n === q.x;
        parts.push(say(CIR[n] + "번은 " + (isRight ? "정답입니다." : "정답이 아닙니다. 정답은 " + CIR[q.x] + "번입니다.")));
        parts.push(say(w.text, w.src));
        ev = evidenceFor(q, q.c[n - 1]);
        if (ev) parts.push(quote(ev.text, ev.label + " · 선지와 겹치는 낱말이 가장 많은 문장"));
      });
      if (!parts.length) return packet(text, q, "해설에 그 선지 분석이 없음");
      return { stage: 1, intent: I, opts: ks, head: ks.map(function (n) { return CIR[n] + "번"; }).join("·") + (I === "WHY_RIGHT" && ks[0] === q.x ? " 정답 이유" : " 해설"), parts: parts };
    }
    if (I === "EVIDENCE") {
      k = p.opts[0] || q.x; w = whyOpt(q, k);
      ev = evidenceFor(q, q.c[k - 1] + " " + ((e.풀이 || [])[0] || ""), .25) || evidenceFor(q, q.c[k - 1], .25);
      parts.push(say(CIR[k] + "번" + (k === q.x ? "(정답)" : "") + "의 근거를 찾았습니다."));
      if (ev) parts.push(quote(ev.text, ev.label + " · 선지와 겹치는 낱말이 가장 많은 문장"));
      else parts.push(say("지문에서 선지와 겹치는 문장을 찾지 못했습니다. 이 문항은 계산이나 조건 대입으로 풀리는 유형일 수 있어 해설 풀이를 대신 보여 드립니다."));
      if (w) parts.push(say(w.text, w.src));
      (e.풀이 || []).slice(0, ev ? 2 : 4).forEach(function (s, i) { parts.push(say(s, "해설 풀이 " + (i + 1) + "째 줄")); });
      return { stage: 1, intent: I, opts: [k], head: "근거 위치", parts: parts };
    }
    if (I === "STEPS") {
      if (solved && (e.풀이 || []).length) return { stage: 1, intent: I, head: "풀이 순서", parts: [list(e.풀이, "해설 풀이")] };
      if ((tp.k || []).length) return { stage: 1, intent: I, head: "이 유형 푸는 순서", parts: [list(tp.k, "유형팁 " + (TYPES[q.t] || q.t)), say("이 문항의 풀이는 푼 다음에 볼 수 있습니다.")] };
      return packet(text, q, "풀이·유형팁 없음");
    }
    if (I === "SPEED") {
      var tt = target(q);
      parts.push(say("이 유형의 목표 시간은 " + tt + "초입니다." + (ctx.mySec ? " 이 문항에 걸린 시간은 " + ctx.mySec + "초입니다." : ""), "유형팁 " + (TYPES[q.t] || q.t) + " 목표 시간"));
      if ((tp.k || []).length) parts.push(list(tp.k, "유형팁 " + (TYPES[q.t] || q.t)));
      if (tp.p) parts.push(say(tp.p, "유형팁 출제 포인트"));
      return { stage: 1, intent: I, head: "시간 줄이는 법", parts: parts };
    }
    if (I === "TRAP") {
      var tk = p.opts;
      if (e.함정) parts.push(say(e.함정, "해설 함정"));
      else if (tp.p) parts.push(say(tp.p, "유형팁 출제 포인트"));
      tk.forEach(function (n) { var x = whyOpt(q, n); if (x) parts.push(say(CIR[n] + "번: " + x.text, x.src)); });
      if (!parts.length) return packet(text, q, "함정 설명 없음");
      return { stage: 1, intent: I, opts: tk, head: "자주 걸리는 함정", parts: parts };
    }
    if (I === "ANSWER") {
      w = whyOpt(q, q.x);
      return { stage: 1, intent: I, head: "정답", parts: [say("정답은 " + CIR[q.x] + "번입니다."), w ? say(w.text, w.src) : say("")] };
    }
    if (I === "SIMILAR") {
      var same = D.items.filter(function (x) { return x.t === q.t && x.i !== q.i; }), dif = {};
      same.forEach(function (x) { dif[x.d] = (dif[x.d] || 0) + 1; });
      if (!same.length) return { stage: 1, intent: I, head: "같은 유형", parts: [say("'" + (TYPES[q.t] || q.t) + "' 유형은 지금 이 문항 하나뿐입니다. 같은 영역(" + q.a + ")의 다른 유형을 풀어 볼 수 있습니다.", "문항 데이터")], link: { href: "#/area/" + encodeURIComponent(q.a), label: q.a + " 영역 보기" } };
      return { stage: 1, intent: I, head: "같은 유형", parts: [say("'" + (TYPES[q.t] || q.t) + "' 유형이 이 문항 말고 " + same.length + "개 더 있습니다. 난이도는 " + Object.keys(dif).sort().map(function (d) { return d + "단계 " + dif[d] + "개"; }).join(", ") + "입니다.", "문항 데이터")], link: typeLink(q) };
    }
    if (I === "TERM") {
      var term = p.text.length <= 28 ? termOf(p.text) : null;   // 용어 질문은 짧다. 긴 질문은 2단계로
      if (!term) return packet(text, q, "용어를 못 뽑음");
      var tl = term.toLowerCase(), found = [], defRe = new RegExp(tl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^.]{0,6}\\s*[:：은는이]");
      var cur = ids(q), I2 = build();
      var pools = [function (c) { return cur.indexOf(c.item) >= 0; }, function (c) { return c.item && BYID[c.item].t === q.t; }, function (c) { return true; }];
      var okKind = solved ? ["pass", "stem", "sol", "why", "trap", "tip", "opt"] : ["pass", "stem", "opt", "tip"];
      pools.forEach(function (pf, pi) {
        if (found.length >= 2) return;
        I2.ch.forEach(function (c) {
          if (found.length >= 3 || okKind.indexOf(c.kind) < 0 || !pf(c)) return;
          if (pi === 2 && c.kind !== "sol" && c.kind !== "why") return;
          splitSent(c.text).forEach(function (sn) {
            if (found.length >= 3 || sn.toLowerCase().indexOf(tl) < 0) return;
            if (found.some(function (f) { return f.text === sn; })) return;
            found.push({ text: sn, label: (pi === 0 ? "" : pi === 1 ? "같은 유형 다른 문항 " : "다른 문항 ") + c.label, def: defRe.test(sn.toLowerCase()), pi: pi });
          });
        });
      });
      found.sort(function (a, b) { return (b.def - a.def) || (a.pi - b.pi); });
      if (!found.length) return packet(text, q, "'" + term + "' 가 자료에 나오는 곳이 없음");
      return { stage: 1, intent: I, head: "'" + term + "' 이(가) 쓰인 문장", parts: [say("뜻풀이 사전은 없습니다. 이 앱의 문항 자료에서 이 말이 쓰인 문장을 보여 드립니다.")].concat(found.slice(0, 2).map(function (f) { return quote(f.text, f.label); })) };
    }
    return packet(text, q, "처리 안 된 의도");
  }

  /* 2단계로 넘길 꾸러미: 질문·문항 id·검색으로 고른 근거 조각 상위 k개. */
  function packet(text, q, why) {
    var hits = search(text, { cur: ids(q), type: q.t, k: 5 });
    var best = 0; hits.forEach(function (h) { if (h.cover > best) best = h.cover; if (h.floor) best = Math.max(best, .12); });   // 표 질문의 현재 문항 표 행은 근거 후보로 친다
    var out = OUT.test(one(text));   // 이 앱 자료 밖의 주제(연봉·면접 등)는 검색 없이 「자료에 없음」
    return { stage: 2, intent: "OTHER", reason: why, question: one(text), item: q.i, hits: out ? [] : hits, found: !out && best >= .12, scope: out ? "out" : "in" };
  }
  function chips(ctx) {
    var q = ctx.q, out = [];
    if (ctx.solved) {
      var w = ctx.pick && ctx.pick !== q.x ? ctx.pick : [1, 2, 3, 4, 5].filter(function (n) { return n !== q.x; })[0];
      out.push(CIR[w] + "번이 왜 틀려요?", "정답 근거가 어디예요?", "더 빨리 푸는 법", "이 유형 다른 문제");
      if ((q.e || {}).함정) out.push("함정이 뭐예요?");
    } else out.push("이 유형 푸는 순서", "더 빨리 푸는 법", "이 유형 다른 문제");
    return out;
  }

  root.Assist = { answer: answer, parse: parse, chips: chips, search: search, build: build, packet: packet, itemChunks: itemChunks, tipChunks: tipChunks, evidenceFor: evidenceFor, termOf: termOf };

  /* ───────── 화면 ───────── */
  if (typeof document === "undefined") return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var app = document.getElementById("app"), fab = null, sheet = null, curId = null;
  function ctxNow() {
    var q = root.NCS_CUR; if (!q) return null;
    var solved = !!app.querySelector(".verdict"), mySec = null;
    try { var s = JSON.parse(localStorage.getItem("ncs.v2") || "{}"); if (s.tm && s.tm[q.i] && solved) mySec = s.tm[q.i][0]; } catch (e) {}
    return { q: q, solved: solved, pick: root.NCS_PICK || null, mySec: mySec };
  }
  function partHtml(p) {
    var src = p.src ? '<span class="as-src">근거: ' + esc(p.src) + '</span>' : '';
    if (p.k === "quote") return '<blockquote class="as-q">' + esc(p.t) + src + '</blockquote>';
    if (p.k === "list") return '<ol class="as-l">' + p.a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ol>' + src;
    return p.t ? '<p class="as-p">' + esc(p.t) + src + '</p>' : '';
  }
  function resHtml(r) {
    if (r.stage === 1) {
      var h = '<div class="as-a"><div class="as-h">' + esc(r.head) + '</div>' + r.parts.map(partHtml).join("");
      if (r.choices) h += '<div class="as-ch">' + r.choices.map(function (c) { return '<button class="as-chip" data-ask="' + esc(c.text) + '">' + CIR[c.n] + '</button>'; }).join("") + '</div>';
      if (r.link) h += '<button class="as-go" data-go="' + esc(r.link.href) + '">' + esc(r.link.label) + '</button>';
      return h + '<div class="as-tag">미리 만든 답변 · 이 앱의 문항 자료만 사용</div></div>';
    }
    var h2 = '<div class="as-a two"><div class="as-h">' + (r.found ? '자료 안에서 찾은 근거 후보' : '자료에 없음') + '</div>';
    if (r.found) {
      h2 += r.hits.slice(0, 3).map(function (x) { return '<blockquote class="as-q">' + esc(x.text.length > 150 ? x.text.slice(0, 150) + "…" : x.text) + '<span class="as-src">근거: ' + esc((x.mine ? "" : "다른 문항 ") + x.label) + '</span></blockquote>'; }).join("");
      h2 += '<p class="as-p">이 질문은 미리 만든 답으로 못 풀어서 AI 에게 보낼 대상입니다. AI 답변은 서버를 연결한 뒤에 나옵니다. 위 근거 문장 안에서만 답하게 만듭니다.</p>';
    } else h2 += '<p class="as-p">이 질문과 맞는 문장이 문항 자료에 없습니다. 선생님께 질문을 남겨 주세요.</p>';
    return h2 + '<button class="as-copy" data-copy="1">질문 복사</button><div class="as-tag">시범판 · AI 답변은 서버 연결 뒤</div></div>';
  }
  function say2(who, html) { var l = sheet.querySelector(".as-log"); var d = document.createElement("div"); d.className = "as-m " + who; d.innerHTML = html; l.appendChild(d); l.scrollTop = l.scrollHeight; return d; }
  function drawChips() {
    var c = ctxNow(); if (!c) return;
    sheet.querySelector(".as-chips").innerHTML = chips(c).map(function (t) { return '<button class="as-chip" data-ask="' + esc(t) + '">' + esc(t) + '</button>'; }).join("");
  }
  function ask(t) {
    t = one(t); if (!t) return;
    var c = ctxNow(); if (!c) return;
    say2("me", esc(t));
    var r = answer(t, c), d = say2("bot", resHtml(r));
    var cp = d.querySelector("[data-copy]");
    if (cp) cp.onclick = function () {
      var s = JSON.stringify({ 질문: r.question, 문항: r.item, 근거: r.hits.slice(0, 5).map(function (x) { return x.id; }) });
      try { navigator.clipboard.writeText(s); cp.textContent = "복사했어요"; } catch (e) { cp.textContent = "복사 안 됨"; }
    };
    root.NCS_LAST = r;
  }
  function open() {
    var c = ctxNow(); if (!c) return;
    if (curId !== c.q.i) { sheet.querySelector(".as-log").innerHTML = ""; curId = c.q.i; }
    drawChips(); sheet.classList.add("on"); fab.classList.add("hide");
    if (!sheet.querySelector(".as-m")) say2("bot", '<div class="as-a"><div class="as-h">이 문항에 대해 물어보세요</div><p class="as-p">' + (c.solved ? "선지가 왜 틀렸는지, 정답 근거가 어디인지, 더 빨리 푸는 법을 바로 알려 드립니다." : "푸는 순서와 시간 줄이는 법을 먼저 볼 수 있습니다. 선지 해설은 푼 뒤에 열립니다.") + '</p></div>');
  }
  function close() { if (sheet) sheet.classList.remove("on"); if (fab) fab.classList.remove("hide"); }
  function mount() {
    fab = document.createElement("button"); fab.className = "as-fab"; fab.type = "button"; fab.textContent = "질문하기"; fab.hidden = true;
    sheet = document.createElement("div"); sheet.className = "as-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", "학습 비서");
    sheet.innerHTML = '<div class="as-top"><b>질문하기</b><span class="as-sp"></span><button type="button" class="as-set">설정</button><button type="button" class="as-x" aria-label="닫기">닫기</button></div><div class="as-log"></div><div class="as-chips"></div>' +
      '<form class="as-in"><input type="text" maxlength="120" placeholder="예: ③번이 왜 틀려요?" autocomplete="off" enterkeyhint="send"><button type="submit">보내기</button></form>';
    document.body.appendChild(fab); document.body.appendChild(sheet);
    fab.onclick = open; sheet.querySelector(".as-x").onclick = close;
    sheet.querySelector(".as-set").onclick = function () { if (root.NCS_COACH) root.NCS_COACH.openSettings(); };
    sheet.querySelector("form").onsubmit = function (e) { e.preventDefault(); var i = sheet.querySelector("input"); ask(i.value); i.value = ""; };
    sheet.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ask]"); if (b) { ask(b.getAttribute("data-ask")); return; }
      if (e.target.closest("[data-go]")) close();
    });
  }
  function sync() {
    if (!fab) mount();
    var show = !!app.querySelector(".qcard") && !app.querySelector(".paper") && !!root.NCS_CUR;   // 모의고사 응시 중에는 숨김
    fab.hidden = !show;
    if (!show) { close(); return; }
    if (curId && curId !== root.NCS_CUR.i) { close(); sheet.querySelector(".as-log").innerHTML = ""; curId = null; }
    if (sheet.classList.contains("on")) drawChips();
  }
  var pend = 0;
  new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; sync(); }, 60); }).observe(app, { childList: true, subtree: true });
  sync();
})(typeof window !== "undefined" ? window : globalThis);
