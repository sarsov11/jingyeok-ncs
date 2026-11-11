/* 학습 비서 시범판 2단계 (2026-11-01) — 먼저 말 거는 비서(선제안) + 성향별 응원. LLM 을 부르지 않는다.
 * 문장은 data/coach_msgs.js(작업/비서/문장틀.json)에만 있다. 이 파일에는 문장이 없고 규칙(언제·무엇을)만 있다.
 * 말풍선은 문항 화면 안에 끼워 넣는다(고정 위치로 띄우지 않아 선지·단추를 가리지 않는다).
 * app.js 가 보내는 이벤트: ncs:show(문항이 뜸) · ncs:answer(답을 고름). 모의고사는 mode:"mock" 이라 아무 말도 하지 않는다.
 * 저장: localStorage "ncs.coach.v1" (읽고 쓸 때 try/catch). */
(function (root) {
  "use strict";
  var D = root.NCS, MSG = root.NCS_MSG, A = root.Assist;
  if (!D || !D.items || !MSG || !A || typeof document === "undefined") return;
  var $app = document.getElementById("app"), TIPS = D.tips || {}, TYPES = D.types || {}, BYID = {};
  D.items.forEach(function (q) { BYID[q.i] = q; });
  var CIR = ["", "①", "②", "③", "④", "⑤"], STYLES = ["승부", "성장", "짧게", "위로"], KEY = "ncs.coach.v1";
  var DEF_S = { "의사소통": 90, "수리": 90, "문제해결": 100, "자원관리": 110 };
  var PAD_AREAS = ["수리", "자원관리", "문제해결", "정보"];
  var ETC = MSG["기타"];

  /* ───────── 저장 ───────── */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function fresh() { return { v: 1, on: true, style: "", src: "", manual: false, sc: { 승부: 0, 성장: 0, 짧게: 0, 위로: 0 }, asked: 0, decl: 0, halved: false, tick: 0, mclose: 0, mdone: 0, sample: [], lastVar: {}, ev: { 거리: 0, 비교: 0, 쉼: 0, 닫기: 0 } }; }
  function loadST() {
    var s = fresh(), r; try { r = JSON.parse(lsGet(KEY) || "null"); } catch (e) { r = null; }
    if (r && typeof r === "object") { Object.keys(r).forEach(function (k) { s[k] = r[k]; }); s.sc = Object.assign({ 승부: 0, 성장: 0, 짧게: 0, 위로: 0 }, r.sc || {}); s.ev = Object.assign({ 거리: 0, 비교: 0, 쉼: 0, 닫기: 0 }, r.ev || {}); }
    return s;
  }
  var ST = loadST();
  function save() { lsSet(KEY, JSON.stringify(ST)); }
  function readS() { try { var s = JSON.parse(lsGet("ncs.v2") || "{}"); s.h = s.h || {}; s.tm = s.tm || {}; return s; } catch (e) { return { h: {}, tm: {} }; } }
  function readXP() { return parseInt(lsGet("terra.zz.xp") || "0", 10) || 0; }

  /* ───────── 글 다루기 ───────── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fill(t, v) { return t.replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? "" : v[k]; }); }
  function need(t) { return (t.match(/\{(\w+)\}/g) || []).map(function (x) { return x.slice(1, -1); }); }
  function ok(t, v) { return need(t).every(function (k) { return v[k] != null && v[k] !== ""; }); }
  /* 변형 고르기: 자리표시가 다 찬 문장만, 지난번과 다른 것을 먼저. 쓸 문장이 없으면 null(말하지 않는다). */
  function pick(key, list, v) {
    var okI = []; list.forEach(function (t, i) { if (ok(t, v)) okI.push(i); });
    if (!okI.length) return null;
    var last = ST.lastVar[key], c = okI.filter(function (i) { return i !== last; });
    var i = (c.length ? c : okI)[0]; ST.lastVar[key] = i;
    return { text: fill(list[i], v), idx: i, raw: list[i] };
  }
  function target(q) { return (TIPS[q.t] && TIPS[q.t].s) || DEF_S[q.a] || 45; }
  function typeName(q) { return TYPES[q.t] || q.a; }

  /* ───────── 이번 접속(세션) 상태 ───────── */
  var S0 = readS(), nowTs = Date.now(), base = { n: 0, ok: 0 }, lastTs = 0, hist = [];
  Object.keys(S0.h).forEach(function (id) { var h = S0.h[id]; if (!h || !h[0]) return; base.n++; base.ok += h[1] ? 1 : 0; if (h[3] > lastTs) lastTs = h[3]; hist.push(h); });
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function dayStart(ts) { var d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  var back = null;   // 오랜만에 돌아왔을 때 마지막 날의 기록
  (function () {
    if (!lastTs) return;
    var gap = Math.round((dayStart(nowTs) - dayStart(lastTs)) / 86400000);
    if (gap < 3) return;
    var dk = dayStart(lastTs), n = 0, k = 0;
    hist.forEach(function (h) { if (dayStart(h[3]) === dk) { n++; k += h[1] ? 1 : 0; } });
    back = { days: gap, n: n, k: k };
  })();
  var SS = { ans: [], streak: 0, best: 0, wrongRun: 0, typeWrong: {}, sinceMot: 99, start: 0, xp0: readXP(), muted: {}, watch: null, backDone: false, askShown: false, fatigueAt: 0, wrongMsgAt: -1, setEnd: {}, off3: {}, yqUsed: {}, yqOk: 0 };
  var cur = null, tickId = 0, act = 0, optIn = false;

  /* ───────── 성향 ───────── */
  function sampling() { return !ST.style; }
  function styleNow() { return ST.style || STYLES[ST.sample.length % 4]; }
  function why() {
    var o = [], n = MSG["성향"];
    if (ST.manual) o.push(ETC["직접"]);
    else if (ST.src === "고름") o.push(ETC["고름"]);
    else if (ST.src === "행동") o.push(ETC["고름"] + ", " + ETC["행동"]);
    else o.push(ETC["체험중"]);
    var e = ST.ev, bits = [];
    if (e.거리) bits.push("레벨·등급 문구 뒤 이어 푼 횟수 " + e.거리 + "회");
    if (e.비교) bits.push("지난 기록 비교 문구 뒤 이어 푼 횟수 " + e.비교 + "회");
    if (e.쉼) bits.push("쉬어 가기를 누른 횟수 " + e.쉼 + "회");
    if (e.닫기) bits.push("응원을 연달아 닫은 횟수 " + e.닫기 + "회");
    return { head: o[0], bits: bits, sc: STYLES.map(function (s) { return n[s]["이름"] + " " + ST.sc[s]; }).join(" · ") };
  }
  function reselect() {
    if (ST.manual || !ST.style) return;
    var best = ST.style;
    STYLES.forEach(function (s) { if (ST.sc[s] > ST.sc[best]) best = s; });
    if (best !== ST.style && ST.sc[best] - ST.sc[ST.style] >= 2) { ST.style = best; ST.src = "행동"; }
  }
  function endSample() {
    if (ST.style || ST.sample.length < 4) return;
    var best = "성장"; STYLES.forEach(function (s) { if (ST.sc[s] > ST.sc[best]) best = s; });
    ST.style = best; ST.src = "행동";
  }
  function bump(s, d) { ST.sc[s] = (ST.sc[s] || 0) + d; reselect(); endSample(); save(); }

  /* ───────── 말풍선 그리기 ───────── */
  function slot() {
    var s = $app.querySelector(".cb-slot");
    if (s) return s;
    s = document.createElement("div"); s.className = "cb-slot";
    var v = $app.querySelector(".verdict");
    if (v && v.parentNode) v.parentNode.insertBefore(s, v.nextSibling);
    else { var an = $app.querySelector(".padbox") || $app.querySelector(".opts"); if (!an) return null; an.parentNode.insertBefore(s, an); }
    return s;
  }
  function cardEl(kind, text, body, btns) {
    var d = document.createElement("div"); d.className = "cb cb-" + kind; d.setAttribute("role", "status");
    d.innerHTML = '<div class="cb-who">' + esc(ETC["비서"]) + '</div>' + (text ? '<div class="cb-t">' + esc(text) + '</div>' : '') + (body ? '<div class="cb-body">' + body + '</div>' : '') +
      (btns && btns.length ? '<div class="cb-bt">' + btns.map(function (b) { return '<button type="button" class="cb-b ' + (b.cls || "") + '" data-a="' + b.a + '">' + esc(b.t) + '</button>'; }).join("") + '</div>' : '');
    return d;
  }
  function put(d, replace) {
    var s = slot(); if (!s) return null;
    if (replace) Array.prototype.forEach.call(s.querySelectorAll(".cb.live"), function (x) { x.remove(); });
    s.appendChild(d); return d;
  }
  function clearLive() { Array.prototype.forEach.call($app.querySelectorAll(".cb.live"), function (x) { x.remove(); }); }
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  function reveal(el) { try { if (!inView(el)) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  function partsHtml(parts) {
    return parts.map(function (p) {
      var src = p.src ? '<span class="cb-src">근거: ' + esc(p.src) + '</span>' : '';
      if (p.k === "quote") return '<blockquote class="cb-q">' + esc(p.t) + src + '</blockquote>';
      if (p.k === "list") return '<ol class="cb-l">' + p.a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ol>' + src;
      return p.t ? '<p class="cb-p">' + esc(p.t) + src + '</p>' : '';
    }).join("");
  }

  /* ───────── 제안 (학습 내용) ───────── */
  function propAllowed() {
    if (!ST.on || !cur || SS.muted[cur.q.i]) return false;
    if (ST.halved) { ST.tick++; save(); if (ST.tick % 2 === 0) return false; }   // 연속 3번 거절 뒤에는 두 번에 한 번만
    return true;
  }
  function showProp(key, vars, then) {
    var P = MSG["제안"][key], pk = pick("p." + key, P["말"], vars);
    if (!pk) return null;
    var d = cardEl("prop", pk.text, "", [{ a: "y", t: P["예"], cls: "y" }, { a: "n", t: ETC["괜찮아요"], cls: "n" }]);
    d.classList.add("live"); d.setAttribute("data-key", key);
    d._yes = then; d._q = cur.q;
    return put(d, true);
  }
  function declined(d) {
    if (cur) SS.muted[cur.q.i] = true;
    ST.decl++; if (ST.decl >= 3) ST.halved = true; save();
    d.remove();
  }
  function accepted() { ST.decl = 0; ST.halved = false; save(); }

  /* ───────── 예상질문표 (11-05) ─────────
   * data/yesang.js 의 문항별 질문(때·수준·막힘·선지·제안·답)을 학생 수준에 맞춰 먼저 꺼낸다.
   * 수준: 그 영역에서 푼 문항 5개 이상일 때 정답률 50% 미만 기초, 80% 이하 보통, 넘으면 심화. 연속 오답 2개 이상이면 기초.
   * 표에 맞는 질문이 없으면 기존 일반 제안(멍·틀림 등)으로 넘어간다. */
  var YQ = root.NCS_YQ || {};
  var LV_ORDER = { 기초: ["기초", "보통", "심화"], 보통: ["보통", "기초", "심화"], 심화: ["심화", "보통", "기초"] };
  function level(a) {
    if (SS.wrongRun >= 2) return "기초";
    var S = readS(), n = 0, k = 0;
    Object.keys(S.h).forEach(function (id) { var x = BYID[id], h = S.h[id]; if (!x || x.a !== a || !h || !h[0]) return; n++; k += h[1] ? 1 : 0; });
    if (n < 5) return "보통";
    var r = k / n; return r < .5 ? "기초" : r <= .8 ? "보통" : "심화";
  }
  function yqPick(q, when, opt) {
    var list = (YQ[q.i] || []).filter(function (y) { return y["때"] === when && !SS.yqUsed[q.i + "#" + y.k]; });
    if (!list.length) return null;
    opt = opt || {};
    if (opt.pick) { var hit = list.filter(function (y) { return (y["선지"] || []).indexOf(opt.pick) >= 0; }); if (hit.length) return hit[0]; if (when === "오답후") return null; }
    var order = LV_ORDER[opt.lv || level(q.a)];
    for (var i = 0; i < order.length; i++) {
      if (opt.only && order[i] !== opt.only) continue;
      var m = list.filter(function (y) { return y["수준"] === order[i]; });
      if (m.length) return m[0];
      if (opt.strict) return null;
    }
    return null;
  }
  function showYQ(y, q, after) {
    SS.yqUsed[q.i + "#" + y.k] = 1;
    var d = cardEl("prop", y["제안"], "", [{ a: "y", t: ETC["볼게요"] || "볼게요", cls: "y" }, { a: "n", t: ETC["괜찮아요"], cls: "n" }]);
    d.classList.add("live"); d.setAttribute("data-key", "yq"); d.setAttribute("data-yq", q.i + "#" + y.k);
    d._q = q;
    d._yes = function (c) {
      accepted();
      var r = cardEl("res", y["말"], '<p class="cb-p">' + esc(y["답"]) + '</p>', []); r.classList.add("live"); r.setAttribute("data-yq", q.i + "#" + y.k);
      c.replaceWith(r); reveal(r);
      if (after) setTimeout(function () { if (cur && cur.q === q) after(); }, 900);
    };
    return put(d, true);
  }

  /* ───────── 오답 패턴 비교표 (11-11) ─────────
   * data/oxtable.js 의 표(버튼·열·행·근거·연결·선지연결·우선)를 문항에 붙인다.
   * 오답 직후: 고른 선지가 선지연결에 있는 표 → 그 문항의 오답후 표 순서로 버튼 최대 3개.
   * 맞혔지만 오래 걸림: 언제가 오래걸림인 표. 누르면 표가 그 자리에 펼쳐진다. */
  var OXT = root.NCS_OXT || [], OXQ = {};
  OXT.forEach(function (t) { (t["연결"] || []).forEach(function (id) { (OXQ[id] = OXQ[id] || []).push(t); }); });
  function oxtPick(q, pick, when) {
    var L = (OXQ[q.i] || []).filter(function (t) { return !SS.yqUsed["oxt#" + t.id]; });
    var sl = function (t) { return ((t["선지연결"] || {})[q.i] || []); };
    var hit = when === "오답후" ? L.filter(function (t) { return sl(t).indexOf(pick) >= 0; }) : [];
    var rest = L.filter(function (t) { return hit.indexOf(t) < 0 && (t["언제"] === when || (when === "오답후" && t["유형"] === "근거문장")) && (when !== "오답후" || !sl(t).length); });
    var by = function (a, b) { return (a["우선"] || 9) - (b["우선"] || 9); };
    return hit.sort(by).concat(rest.sort(by)).slice(0, 3);
  }
  function oxtHtml(t) {
    var h = '<div class="cb-oxt"><table><tr>' + (t["열"] || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join("") + '</tr>';
    (t["행"] || []).forEach(function (r) { h += '<tr>' + (r["칸"] || []).map(function (c) { return '<td>' + esc(c) + '</td>'; }).join("") + '</tr>'; });
    h += '</table>';
    var g = []; (t["행"] || []).forEach(function (r) { (r["근거"] || []).forEach(function (x) { g.push(x); }); });
    if (g.length) h += '<details class="cb-oxg"><summary>기출 근거 ' + g.length + '개</summary><ul>' + g.map(function (x) { return '<li><b>' + esc(x["판정"]) + '</b> ' + esc(x["문장"]) + (x["출처"] ? ' <i>' + esc(x["출처"]) + '</i>' : '') + '</li>'; }).join("") + '</ul></details>';
    return h + '</div>';
  }
  function showOxt(ts, q, after) {
    if (!ts.length) return null;
    var d = cardEl("prop", "", "", ts.map(function (t, n) { return { a: "oxt:" + n, t: t["버튼"], cls: "y" }; }).concat([{ a: "n", t: ETC["괜찮아요"], cls: "n" }]));
    d.classList.add("live"); d.setAttribute("data-key", "oxt"); d._q = q; d._oxt = ts; d._after = after;
    return put(d, true);
  }
  function openOxt(d, n) {
    var t = d._oxt[n], q = d._q; if (!t) return;
    accepted(); SS.yqUsed["oxt#" + t.id] = 1;
    /* 표는 읽을 시간이 필요해서 live 로 두지 않고(다음 제안이 지우지 않게), 이어지는 제안도 붙이지 않는다 */
    var r = cardEl("res", t["버튼"], oxtHtml(t), []); r.setAttribute("data-oxt", t.id);
    d.replaceWith(r); reveal(r);
  }

  /* 빠르게 푸는 법 / 유형 핵심: 유형팁을 그 자리에 펼친다 */
  function speedBody(q, mySec) {
    var r = A.answer("더 빨리 푸는 법", { q: q, solved: !!(cur && cur.answered), mySec: mySec });
    return partsHtml(r.parts);
  }
  function stepsCard(q) {   // 멍: 첫 단계만. 다음 단계는 누를 때마다 하나씩.
    var ks = (TIPS[q.t] || {}).k || [];
    if (!ks.length) return null;
    var d = cardEl("res", fill(ETC["첫단계머리"], { type: typeName(q), i: 1, total: ks.length }), '<p class="cb-p">' + esc(ks[0]) + '</p>', ks.length > 1 ? [{ a: "next", t: ETC["다음단계"], cls: "y" }] : []);
    d.classList.add("live"); d._i = 1; d._ks = ks; d._q = q; return d;
  }
  function openSteps(d, q) {
    var c = stepsCard(q); if (!c) { d.remove(); return; }
    d.replaceWith(c); reveal(c);
  }

  function wrongBody(q, v) {
    var r = A.answer(CIR[v] + "번이 왜 틀려요?", { q: q, solved: true, pick: v });
    return partsHtml(r.parts);
  }
  /* 지문에서 근거 문장을 실제로 칠한다 */
  function norm(s) { return String(s || "").replace(/[\s,:：.'"‘’“”「」]/g, ""); }
  function clearHl() {
    Array.prototype.forEach.call($app.querySelectorAll("mark.cb-hl"), function (m) { var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
    Array.prototype.forEach.call($app.querySelectorAll(".cb-hlrow"), function (r) { r.classList.remove("cb-hlrow"); });
  }
  function highlight(ev) {
    clearHl();
    var box = $app.querySelector(".qcard"); if (!box || !ev) return null;
    var tr = /^지문 표 (?:'[^']*' )?(.+) 행$/.exec(ev.label);
    if (tr) {
      var rows = box.querySelectorAll("tbody tr"), hit = null;
      Array.prototype.forEach.call(rows, function (r) { var c = r.cells && r.cells[0]; if (!hit && c && norm(c.textContent) === norm(tr[1])) hit = r; });
      if (hit) { hit.classList.add("cb-hlrow"); return hit; }
    }
    /* 글이 아닌 자료(그래프·그림·공문·코드·보기 상자)는 칸 전체를 칠한다 */
    if (/^지문 (그래프|그림|코드|공문)/.test(ev.label)) {
      var tt = /'([^']+)'/.exec(ev.label), blk = null;
      Array.prototype.forEach.call(box.querySelectorAll(".bk"), function (k) {
        if (blk) return;
        var bt = k.querySelector(".bt");
        if (tt && bt && norm(bt.textContent).indexOf(norm(tt[1])) === 0) blk = k;
      });
      if (!blk) { var kind = ev.label.indexOf("그래프") >= 0 ? "svg.ch" : ev.label.indexOf("공문") >= 0 ? ".bk-doc" : ev.label.indexOf("코드") >= 0 ? ".bk-code" : ev.label.indexOf("그림") >= 0 ? ".bk-fig" : null; if (kind) { var f = box.querySelector(kind); blk = f && (f.closest(".bk") || f); } }
      if (blk) { blk.classList.add("cb-hlrow"); return blk; }
    }
    if (ev.label === "지문 표 주석") {
      var nts = box.querySelectorAll(".bk-table .nt"); if (nts.length) { Array.prototype.forEach.call(nts, function (n) { n.classList.add("cb-hlrow"); }); return nts[0]; }
    }
    var tg = norm(ev.text), found = null;
    Array.prototype.forEach.call(box.querySelectorAll("p, .br, li, .dh, .nt, .bk-doc .db"), function (el) {
      if (found || el.querySelector("p, .br, li")) return;
      if (norm(el.textContent).indexOf(tg) >= 0) found = el;
    });
    if (!found) return null;
    var w = document.createTreeWalker(found, NodeFilter.SHOW_TEXT, null), nd, one = null;
    while ((nd = w.nextNode())) { var i = nd.nodeValue.indexOf(ev.text.replace(/\s+/g, " ")); if (i >= 0) { one = [nd, i]; break; } }
    if (one) {
      var r = document.createRange(); r.setStart(one[0], one[1]); r.setEnd(one[0], one[1] + ev.text.length);
      var m = document.createElement("mark"); m.className = "cb-hl"; try { r.surroundContents(m); return m; } catch (e) {}
    }
    found.classList.add("cb-hlrow"); return found;
  }
  function evidenceOf(q) {
    var e = q.e || {};
    return A.evidenceFor(q, q.c[q.x - 1] + " " + ((e.풀이 || [])[0] || ""), .25) || A.evidenceFor(q, q.c[q.x - 1], .25);
  }
  function evidenceCard(q) {
    var ev = evidenceOf(q), el = ev ? highlight(ev) : null, d;
    if (ev) {
      d = cardEl("res", ETC["근거표시"], '<blockquote class="cb-q">' + esc(ev.text) + '<span class="cb-src">' + esc(ev.label) + '</span></blockquote>', el ? [{ a: "see", t: ETC["지문에서보기"], cls: "n" }] : []);
      d._hl = el;
    } else {
      var r = A.answer("정답 근거가 어디예요?", { q: q, solved: true, pick: cur && cur.v });
      d = cardEl("res", ETC["근거없음"], partsHtml(r.parts.slice(2)), []);
    }
    return d;
  }

  function similar(q, easy) {
    var S = readS(), pool = D.items.filter(function (x) { return x.t === q.t && x.i !== q.i && !x.g; });
    if (!pool.length) pool = D.items.filter(function (x) { return x.t === q.t && x.i !== q.i; });
    if (!pool.length) return null;
    pool.sort(function (a, b) {
      var ua = S.h[a.i] ? 1 : 0, ub = S.h[b.i] ? 1 : 0; if (ua !== ub) return ua - ub;
      var da = easy ? a.d : Math.abs(a.d - q.d), db = easy ? b.d : Math.abs(b.d - q.d); if (da !== db) return da - db;
      return a.i < b.i ? -1 : 1;
    });
    return pool[0];
  }
  function playNext(id) {
    var app = root.NCS_APP;
    if (app && app.insertNext(id)) { var nx = document.getElementById("nx"); if (nx) { nx.click(); return true; } }
    return false;
  }

  /* 오답 확인 사슬: 고른 선지 → 정답 근거 → 같은 유형 한 문제 더 */
  function stepWhy(ctx) {
    var q = ctx.q, v = ctx.v;
    showProp("틀림", { opt: v }, function (d) {
      accepted(); var c = cardEl("res", "", wrongBody(q, v), []); d.replaceWith(c);
      setTimeout(function () { if (cur && cur.q === q) stepEvidence(ctx); }, 500);
    });
  }
  function stepEvidence(ctx) {
    var q = ctx.q;
    if (!propAllowed()) return;
    showProp("근거", { ans: q.x }, function (d) {
      accepted(); var c = evidenceCard(q); d.replaceWith(c);
      if (c._hl) { try { c._hl.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} }
      setTimeout(function () { if (cur && cur.q === q) stepMore(ctx); }, 900);
    });
  }
  function stepMore(ctx) {
    var q = ctx.q, nx = similar(q, false);
    if (!nx || !propAllowed()) return;
    showProp("한문제더", { type: typeName(q) }, function (d) { accepted(); d.remove(); playNext(nx.i); });
  }

  /* ───────── 응원 (성향별) ───────── */
  var CH = { 승부: ["레벨근접", "등급근접", "연속정답", "끝가까움", "연속풀이"], 성장: ["연속정답", "연속풀이", "레벨근접", "끝가까움", "등급근접"], 짧게: ["끝가까움", "레벨근접", "연속정답", "연속풀이", "등급근접"], 위로: ["연속풀이", "연속정답", "레벨근접", "끝가까움", "등급근접"] };
  function canMot() {
    endSample();
    var q = ST.mclose >= 3 ? ((ST.style === "위로" || ST.style === "짧게") ? 3 : 2) : 1;
    var gap = { 승부: 3, 성장: 4, 짧게: 5, 위로: 5 }[styleNow()] * q;
    return ST.on && SS.sinceMot >= gap;
  }
  function stats() {
    var m = SS.ans.length, k = SS.ans.filter(function (a) { return a.ok; }).length, p = {};
    p.n = m; p.m = m; p.k = k; p.pct = m ? Math.round(k / m * 100) : null;
    if (m) p.avg = Math.round(SS.ans.reduce(function (s, a) { return s + a.sec; }, 0) / m);
    p.mins = SS.start ? Math.max(1, Math.round((Date.now() - SS.start) / 60000)) : null;
    p.best = SS.best;
    var prevRate = base.n >= 10 ? Math.round(base.ok / base.n * 100) : null;
    if (prevRate != null && m >= 5 && p.pct > prevRate) { p.today = p.pct; p.prev = prevRate; }
    var xp = readXP(), per = 100, remain = per - xp % per, left = Math.ceil(remain / 10);
    if (left >= 1 && left <= 3) { p.left_lv = left; p.lv = Math.floor(xp / per) + 2; p.cur = Math.floor(xp / per) + 1; }
    if (xp > SS.xp0) p.gain = xp - SS.xp0;
    return p;
  }
  function tierNear(q) {
    var S = readS(), n = 0, ok = 0;
    D.items.forEach(function (x) { if (x.a !== q.a) return; var h = S.h[x.i]; if (h) { n++; ok += h[1] ? 1 : 0; } });
    if (n < 10) return null;
    var r = ok / n, nxt = r >= .9 ? null : r >= .75 ? ["S", .9] : r >= .6 ? ["A", .75] : ["B", .6];
    if (!nxt) return null;
    var k = Math.ceil((nxt[1] * n - ok) / (1 - nxt[1]));
    if (k < 1 || k > 3) return null;
    return { area: q.a, tier: nxt[0], k: k, pct: Math.round(r * 100), need: Math.round(nxt[1] * 100) };
  }
  function fatigue() {
    var a = SS.ans, n = a.length;
    if (n < 10 || n - SS.fatigueAt < 10) return null;
    var last = a.slice(-5), prior = a.slice(0, -5);
    if (prior.length < 5) return null;
    var rl = last.filter(function (x) { return x.ok; }).length / 5, rp = prior.filter(function (x) { return x.ok; }).length / prior.length;
    if (rl <= .4 && rp - rl >= .3) return { kind: "피로정답", v: { n: n, a: Math.round(rp * 100), b: Math.round(rl * 100) } };
    function mr(l) { return l.reduce(function (s, x) { return s + x.ratio; }, 0) / l.length; }
    function ms(l) { return Math.round(l.reduce(function (s, x) { return s + x.sec; }, 0) / l.length); }
    if (mr(last) >= 1 && mr(last) >= mr(prior) * 1.3) return { kind: "피로시간", v: { n: n, x: ms(last), y: ms(prior) } };
    return null;
  }
  function motiv(kind, vars, ctx) {
    var sty = styleNow(), L = (MSG["응원"][kind] || {})[sty]; if (!L) return false;
    var pk = pick("m." + kind + "." + sty, L, vars); if (!pk) return false;
    var tired = kind.indexOf("피로") === 0;
    var d = cardEl("mot", pk.text, "", tired ? [{ a: "rest", t: ETC["쉬어갈게요"], cls: "y" }, { a: "more", t: ETC["더풀게요"], cls: "n" }] : [{ a: "x", t: ETC["닫기"], cls: "n" }]);
    d.classList.add("live"); d._mot = { kind: kind, style: sty, cmp: /\{prev\}/.test(pk.raw), dist: kind === "레벨근접" || kind === "등급근접" };
    if (!put(d, false)) return false;
    SS.sinceMot = 0; SS.watch = { style: sty, kind: d._mot.dist ? "거리" : d._mot.cmp ? "비교" : "", n: 0, el: d, sampled: sampling() };
    if (sampling()) ST.sample.push({ s: sty });
    save(); return true;
  }
  function trySet(order, p, ctx, tier) {
    for (var i = 0; i < order.length; i++) {
      var kind = order[i], v = Object.assign({}, p), q = ctx.q;
      if (kind === "연속정답") { if ([3, 5, 7, 10, 15, 20, 30].indexOf(SS.streak) < 0) continue; v.n = SS.streak; v.left = ctx.left; }
      else if (kind === "연속풀이") { if (p.n < 5 || p.n % 5) continue; v.left = ctx.left; }
      else if (kind === "레벨근접") { if (!p.left_lv) continue; v.left = p.left_lv; }
      else if (kind === "등급근접") { if (!tier) continue; Object.assign(v, tier); }
      else if (kind === "끝가까움") { if (ctx.left !== 2) continue; v.left = ctx.left; v.done = ctx.i + 1; v.k = ctx.pok; v.pct = p.pct; }
      if (motiv(kind, v, ctx)) return true;
    }
    return false;
  }

  /* ───────── 이벤트 ───────── */
  function onShow(e) {
    var d = e.detail || {};
    stopTick(); clearHl();
    if (d.mode !== "practice") { cur = null; return; }
    var q = d.q, t0 = d.t0 || Date.now();
    if (!SS.start) SS.start = t0;
    cur = { q: q, t0: t0, target: target(q), i: d.i, n: d.n, answered: false, fired: {}, pad: PAD_AREAS.indexOf(q.a) >= 0 && !!document.querySelector(".padbox") };
    act = 0; if (SS.watch && SS.watch.el && !document.body.contains(SS.watch.el)) SS.watch.el = null;
    /* 문항이 뜰 때 먼저 하는 말: 첫 질문 → 복귀 → 연속 오답 (한 번에 한 마디) */
    setTimeout(function () {
      if (!cur || cur.q !== q || cur.answered) return;
      if (!ST.style && !SS.askShown && ST.asked < 2 && SS.ans.length >= 1 && ST.src !== "체험") { askStyle(); return; }
      var p = stats();
      if (back && !SS.backDone) {
        SS.backDone = true;
        if (ST.on) { var sty = styleNow(), pk = (MSG["응원"]["복귀"] || {})[sty]; if (pk && motiv("복귀", { days: back.days, n: back.n, k: back.k }, {})) return; }
      }
      if (SS.wrongRun >= 2 && SS.wrongMsgAt !== SS.ans.length && canMot()) {
        SS.wrongMsgAt = SS.ans.length;
        motiv("연속오답", { n: SS.wrongRun, k: p.k > 0 ? p.k : null }, {});
      }
    }, 120);
    startTick();
  }
  function startTick() { stopTick(); tickId = setInterval(tick, 1000); }
  function stopTick() { if (tickId) { clearInterval(tickId); tickId = 0; } }
  function tick() {
    if (!cur || cur.answered) return stopTick();
    if (!$app.querySelector(".qcard") || $app.querySelector(".verdict") || $app.querySelector(".paper") || !document.getElementById("tm")) { cur = null; return stopTick(); }
    if (document.querySelector(".as-sheet.on")) return;
    var el = (Date.now() - cur.t0) / 1000, q = cur.q;
    if (SS.muted[q.i]) return;
    /* 예상질문표: 기초 수준이면 풀기 전 낱말·개념 질문을 먼저(입력이 없을 때 8초 뒤) */
    if (el > 8 && !act && !cur.fired.pre && !cur.fired.idle && !cur.fired.slow) {
      cur.fired.pre = 1;
      var yp = level(q.a) === "기초" ? yqPick(q, "풀기전", { lv: "기초", strict: true }) : null;
      if (yp && propAllowed()) { var dp = showYQ(yp, q); if (dp) { reveal(dp); return; } }
    }
    if (el > cur.target / 2 && !act && !cur.fired.idle && !cur.fired.slow && !cur.fired.yqIdle) {
      var yi = yqPick(q, "풀이중");
      if (yi) {
        cur.fired.yqIdle = 1; cur.fired.idle = 1;
        if (propAllowed()) { var di = showYQ(yi, q); if (di) reveal(di); }
        return;
      }
    }
    if (el > cur.target && !cur.fired.slow) {
      cur.fired.slow = 1;
      if (!(TIPS[q.t] && (TIPS[q.t].k || []).length)) return;
      if (!propAllowed()) return;
      var d = showProp("느림", { goal: cur.target, over: Math.round(el - cur.target) }, function (c) {
        accepted(); var r = cardEl("res", "", speedBody(q, null), []); r.classList.add("live"); c.replaceWith(r); reveal(r);
      });
      if (d) reveal(d);
    } else if (el > cur.target / 2 && !act && !cur.fired.idle && !cur.fired.slow) {
      cur.fired.idle = 1;
      if (!(TIPS[q.t] && (TIPS[q.t].k || []).length)) return;
      if (!propAllowed()) return;
      var d2 = showProp("멍", { sec: Math.round(el) }, function (c) { accepted(); openSteps(c, q); });
      if (d2) reveal(d2);
    }
  }
  /* 입력 감지: 연습장이 있는 문항은 연습장 입력만, 없는 문항은 화면 만지기·스크롤도 입력으로 본다(지문을 읽는 중일 수 있다) */
  function onAct(e) {
    if (!cur || cur.answered) return;
    var t = e.target;
    if (cur.pad) { if (t.closest && t.closest(".padcv")) act++; }
    else if (t.closest && t.closest("#app")) act++;
  }
  document.addEventListener("pointerdown", onAct, true);
  document.addEventListener("keydown", function () { if (cur && !cur.answered && !cur.pad) act++; }, true);
  window.addEventListener("scroll", function () { if (cur && !cur.answered && !cur.pad) act++; }, { passive: true, capture: true });

  function onAnswer(e) {
    var d = e.detail || {}, q = d.q; if (!cur || cur.q !== q) return;
    stopTick(); cur.answered = true; cur.v = d.v; clearLive();
    var oldSlot = $app.querySelector(".cb-slot"); if (oldSlot) oldSlot.remove();
    var sec = d.sec, ratio = sec / cur.target;
    SS.ans.push({ id: q.i, ok: d.ok, sec: sec, ratio: ratio, t: q.t });
    SS.sinceMot++;
    if (d.ok) { SS.streak++; if (SS.streak > SS.best) SS.best = SS.streak; SS.wrongRun = 0; SS.typeWrong[q.t] = 0; }
    else { SS.streak = 0; SS.wrongRun++; SS.typeWrong[q.t] = (SS.typeWrong[q.t] || 0) + 1; }
    /* 응원 뒤 3문항 이어 풀면 그 응원이 통한 것으로 본다 */
    var w = SS.watch;
    if (w) {
      w.n++;
      if (w.n >= 3 && !w.done) {
        w.done = true; ST.mclose = 0;
        if (w.kind === "거리") { ST.ev.거리++; bump("승부", 1); }
        else if (w.kind === "비교") { ST.ev.비교++; bump("성장", 1); }
        else if (w.sampled) bump(w.style, 1);
        save();
      }
    }
    var ctx = { q: q, v: d.v, left: d.n - d.i - 1 >= 1 ? d.n - d.i - 1 : null, i: d.i, pok: d.pok, mySec: sec };
    var ivDelay = d.ok ? 1700 : 750;
    setTimeout(function () {
      if (!cur || cur.q !== q || !cur.answered) return;
      if (!slot()) return;
      if (d.ok) {
        if (ratio > 1.3 && !SS.muted[q.i] && propAllowed() && showOxt(oxtPick(q, 0, "오래걸림"), q)) return;
        if (ratio > 1.3 && !SS.muted[q.i] && TIPS[q.t] && (TIPS[q.t].k || []).length && propAllowed()) {
          showProp("느린정답", { sec: sec, goal: cur.target, over: Math.round(sec - cur.target) }, function (c) { accepted(); var r = cardEl("res", "", speedBody(q, sec), []); c.replaceWith(r); reveal(r); });
          return;
        }
        if (!ST.on) return;
        /* 예상질문표: 심화 수준 학생이 목표 시간 안에 맞히면 세 번에 한 번 지름길·확장 질문 */
        if (ratio <= 1 && !SS.muted[q.i] && level(q.a) === "심화") {
          var yo = yqPick(q, "정답후", { only: "심화", lv: "심화" });
          if (yo && (SS.yqOk++ % 3 === 0) && propAllowed()) { showYQ(yo, q); return; }
        }
        var f = fatigue();   // 쉬어 가자는 말은 간격 제한을 받지 않는다(열 문항에 한 번만 나온다)
        if (f) { SS.fatigueAt = SS.ans.length; if (motiv(f.kind, f.v, ctx)) return; }
        if (!canMot()) return;
        trySet(CH[styleNow()], stats(), ctx, tierNear(q));
        return;
      }
      if (SS.muted[q.i]) return;
      if (SS.typeWrong[q.t] >= 3 && TIPS[q.t] && (TIPS[q.t].k || []).length && propAllowed()) {
        SS.typeWrong[q.t] = 0;
        showProp("삼연속", { type: typeName(q) }, function (c) {
          accepted();
          var ks = TIPS[q.t].k, ez = similar(q, true);
          var body = '<ol class="cb-l">' + ks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ol>';
          var r = cardEl("res", fill(ETC["핵심머리"], { type: typeName(q) }), body, ez ? [{ a: "easy", t: ETC["쉬운문항"], cls: "y" }] : []);
          r._easy = ez; c.replaceWith(r); reveal(r);
        });
        return;
      }
      if (sec < cur.target * .2 && propAllowed()) {
        showProp("찍기", { sec: sec, goal: cur.target }, function (c) { accepted(); c.remove(); delete SS.muted[q.i]; playNext(q.i); });
        return;
      }
      if (propAllowed()) {
        /* 예상질문표: 고른 오답 선지에 붙은 질문이 있으면 그 학생 생각을 짚는 말이 먼저, 이어서 근거 → 한 문제 더 */
        /* 오답 패턴 비교표(11-11): 고른 오답에 맞춘 버튼이 먼저 */
        if (showOxt(oxtPick(q, d.v, "오답후"), q)) return;
        var yw = yqPick(q, "오답후", { pick: d.v });
        if (yw && showYQ(yw, q, function () { stepEvidence(ctx); })) return;
        stepWhy(ctx);
      }
    }, ivDelay);
  }

  /* 첫 질문 */
  function askStyle() {
    SS.askShown = true; ST.asked++; save();
    var Q = MSG["성향질문"];
    var d = cardEl("ask", Q["묻기"], "", Q["보기"].map(function (b) { return { a: "s:" + b["성향"], t: b["글"], cls: "ch" }; }).concat([{ a: "later", t: Q["나중에"], cls: "n" }]));
    d.classList.add("live"); put(d, true);
  }

  /* 단추 */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".cb-b"); if (!b) return;
    var d = b.closest(".cb"), a = b.getAttribute("data-a");
    if (a === "y") { if (d._yes) d._yes(d); return; }
    if (a === "n") { declined(d); return; }
    if (a.indexOf("oxt:") === 0) { openOxt(d, +a.slice(4)); return; }
    if (a === "x") { closeMot(d); return; }
    if (a === "rest") { ST.ev.쉼++; bump("위로", 1); closeMot(d, true); return; }
    if (a === "more") { closeMot(d, true); return; }
    if (a === "next") {
      var i = d._i, ks = d._ks, t = fill(ETC["첫단계머리"], { type: typeName(d._q), i: i + 1, total: ks.length });
      d.querySelector(".cb-t").textContent = t;
      d.querySelector(".cb-body").innerHTML = '<p class="cb-p">' + esc(ks[i]) + '</p>'; d._i = i + 1;
      if (d._i >= ks.length) { var bt = d.querySelector(".cb-bt"); if (bt) bt.remove(); }
      return;
    }
    if (a === "see") { if (d._hl && document.body.contains(d._hl)) d._hl.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (a === "easy") { if (d._easy) { var id = d._easy.i; d.remove(); playNext(id); } return; }
    if (a === "later") { d.remove(); return; }
    if (a.indexOf("s:") === 0) {
      var s = a.slice(2);
      if (s === "미정") { ST.src = "체험"; ST.style = ""; }
      else { ST.style = s; ST.src = "고름"; ST.sc[s] = Math.max(ST.sc[s], 3); }
      save(); d.remove(); return;
    }
  });
  function closeMot(d, quiet) {
    if (!quiet) {
      ST.mclose++;
      if (ST.mclose % 3 === 0) { ST.ev.닫기++; bump("짧게", 1); }
      if (sampling() && d._mot) bump(d._mot.style, -1);
      if (SS.watch && SS.watch.el === d) SS.watch.closed = true;
    }
    save(); d.remove();
  }

  /* ───────── 설정 ───────── */
  var modal = null;
  function drawSettings() {
    var n = MSG["성향"], w = why(), cs = styleNow();
    modal.querySelector(".cs-body").innerHTML =
      '<div class="cs-row"><b>' + esc(ETC["지금성향"]) + '</b><span class="cs-now">' + (ST.style ? esc(n[ST.style]["이름"]) : esc(ETC["체험중"])) + '</span></div>' +
      (ST.style ? '<p class="cs-d">' + esc(n[ST.style]["뜻"]) + '</p>' : '') +
      '<div class="cs-row"><b>' + esc(ETC["정한이유"]) + '</b></div><p class="cs-d">' + esc(w.head) + '</p>' +
      (w.bits.length ? '<ul class="cs-u">' + w.bits.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' : '') +
      '<p class="cs-s">점수 ' + esc(w.sc) + '</p>' +
      '<div class="cs-row"><b>' + esc(ETC["직접바꾸기"]) + '</b></div><div class="cs-ch">' + STYLES.map(function (s) { return '<button type="button" class="cs-b' + (ST.style === s ? ' on' : '') + '" data-st="' + s + '">' + esc(n[s]["이름"]) + '</button>'; }).join("") +
      '<button type="button" class="cs-b" data-st="auto">' + esc(ETC["자동으로"]) + '</button></div>' +
      '<div class="cs-row"><button type="button" class="cs-b tg' + (ST.on ? ' on' : '') + '" data-st="tog">' + esc(ST.on ? ETC["말걸기켜짐"] : ETC["말걸기꺼짐"]) + '</button></div>';
  }
  function openSettings() {
    if (!modal) {
      modal = document.createElement("div"); modal.className = "cs"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-label", ETC["설정머리"]);
      modal.innerHTML = '<div class="cs-box"><div class="cs-top"><b>' + esc(ETC["설정머리"]) + '</b><button type="button" class="cs-x">' + esc(ETC["닫기"]) + '</button></div><div class="cs-body"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest(".cs-x")) { modal.classList.remove("on"); return; }
        var b = e.target.closest("[data-st]"); if (!b) return;
        var s = b.getAttribute("data-st");
        if (s === "tog") ST.on = !ST.on;
        else if (s === "auto") { ST.manual = false; if (ST.src === "직접") ST.src = "행동"; }
        else { ST.style = s; ST.manual = true; ST.src = "직접"; ST.sc[s] = Math.max(ST.sc[s], 3); }
        save(); drawSettings();
      });
    }
    drawSettings(); modal.classList.add("on");
  }

  document.addEventListener("ncs:show", onShow);
  document.addEventListener("ncs:answer", onAnswer);
  /* 첫 화면이 비서보다 먼저 그려졌으면(주소에 #/go/ 가 있는 채로 열었을 때) 그 문항을 지금 알린다 */
  if (root.NCS_LAST_SHOW && $app.querySelector(".qcard") && !$app.querySelector(".verdict")) onShow({ detail: root.NCS_LAST_SHOW });
  root.NCS_COACH = { state: function () { return ST; }, session: function () { return SS; }, openSettings: openSettings, back: function () { return back; }, stats: stats, tierNear: tierNear, fatigue: fatigue, canMot: canMot, hl: function (q) { var ev = evidenceOf(q); if (!ev) return null; var el = highlight(ev); clearHl(); return !!el; } };
})(window);
