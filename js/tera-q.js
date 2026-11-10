/* 테라러닝 문제 화면 공용 부품 (2026-11-10 허브) — 크기 감각은 마이메르시 문풀 화면을 참고했다(대표님 「눈에 피로감 없이 확 들어온다」)
 *   그대로 베끼지 않는다(대표님 「완전 모방은 안 됨. 기능은 다 있되 명칭 · 디자인은 다르게」): 이름 · 밑줄 모양 · 말풍선 · 단추 모양은 우리 것. 색은 앱의 --pt.
 *
 *   TERA_Q.terms({ "낱말": "뜻" | { d: "뜻" } })       개념어 뜻 자료를 더한다(DIAGRAM.terms 와 같은 꼴도 받는다)
 *   TERA_Q.annotate(요소 | 선택자)                     그 안 글자에서 개념어를 찾아 물결 밑줄을 긋는다(누르면 뜻 말풍선)
 *   TERA_Q.toggle(부모)                                「개념어 켜기 / 끄기」 동그란 단추(상태 기억)
 *   TERA_Q.badge(부모, {stars: 1~3} | {tier: "S"})     문제 번호 옆 중요도 표시(대입·공무원·전문직은 별, 기술·NCS·자격은 등급)
 *   TERA_Q.jump(부모, { count, onClick })              「안 푼 문항으로」 단추(남은 수)
 *   TERA_Q.coach(대상 요소, { key, title, text })      안내 말풍선 하나(「다시 안 보기」 · 「확인」). key 마다 한 번
 *   TERA_Q.ask(부모, { questions: [..3개], onAsk(q) })  「테라에게 묻기」 → 테라에이전트 질문 제안 세 개
 *   화면 틀 클래스(tq-*)는 tera-q.css. 견본은 같은 폴더 견본.html.
 */
(function () {
  if (window.TERA_Q) return;
  var d = document, T = {}, keys = [], bubble, K_OFF = "tera_q_terms_off", K_COACH = "tera_q_coach_off";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var I = {
    term: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.500 8.500h7M8.500 12h7M8.500 15.500h4"/></svg>',
    fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.6 2.500c.5 3.300-1.300 5-2.900 6.800C8.100 11 6.500 12.700 6.500 15.300A5.500 5.500 0 0 0 12 21a5.500 5.500 0 0 0 5.500-5.600c0-2-.9-3.500-1.900-4.700-.3 1.300-.9 2.200-1.900 2.700.4-3.800-.3-7.900-1.100-10.900z"/></svg>',
    agent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.500A2.500 2.500 0 0 1 7.500 4h9A2.500 2.500 0 0 1 19 6.500v7a2.500 2.500 0 0 1-2.500 2.500H12l-4 3.500V16H7.500A2.500 2.500 0 0 1 5 13.500z"/><path d="M9.500 9.500h.01M14.500 9.500h.01"/></svg>'
  };
  if (get(K_OFF) === "1") d.documentElement.classList.add("tq-terms-off");

  function terms(o) {
    Object.keys(o || {}).forEach(function (k) { var v = o[k]; var t = typeof v === "string" ? v : v && (v.d || v.def || v.뜻); if (k && t && k.length >= 2) T[k] = t; });
    keys = Object.keys(T).sort(function (a, b) { return b.length - a.length; });
  }

  function annotate(target) {
    var hosts = typeof target === "string" ? d.querySelectorAll(target) : target && target.length != null && !target.nodeType ? target : [target];
    if (!keys.length) return 0;
    var n = 0;
    Array.prototype.forEach.call(hosts, function (host) {
      if (!host) return;
      var used = {}, w = d.createTreeWalker(host, NodeFilter.SHOW_TEXT, null), nodes = [], x;
      while ((x = w.nextNode())) { if (x.nodeValue.trim() && !x.parentNode.closest(".tq-term,.tn-t,.dg,a,button,script,style,input,textarea")) nodes.push(x); }
      nodes.forEach(function (node) {
        var s = node.nodeValue, hits = [];
        keys.forEach(function (k) {
          if (used[k]) return; var i = s.indexOf(k); if (i < 0) return;
          if (hits.some(function (h) { return i < h.e && i + k.length > h.s; })) return;
          hits.push({ s: i, e: i + k.length, k: k }); used[k] = 1;
        });
        if (!hits.length) return;
        hits.sort(function (a, b) { return a.s - b.s; });
        var frag = d.createDocumentFragment(), pos = 0;
        hits.forEach(function (h) {
          if (h.s > pos) frag.appendChild(d.createTextNode(s.slice(pos, h.s)));
          var sp = el("span", "tq-term"); sp.tabIndex = 0; sp.setAttribute("data-d", T[h.k]); sp.textContent = s.slice(h.s, h.e); frag.appendChild(sp); pos = h.e; n++;
        });
        if (pos < s.length) frag.appendChild(d.createTextNode(s.slice(pos)));
        node.parentNode.replaceChild(frag, node);
      });
    });
    return n;
  }

  function show(sp) {
    hide(); if (d.documentElement.classList.contains("tq-terms-off")) return;
    bubble = el("div", "tq-bubble", esc(sp.getAttribute("data-d"))); d.body.appendChild(bubble);
    var r = sp.getBoundingClientRect(), b = bubble.getBoundingClientRect();
    var left = Math.max(8, Math.min(window.innerWidth - b.width - 8, r.left + r.width / 2 - b.width / 2)), below = r.top < b.height + 16;
    bubble.style.left = left + "px"; bubble.style.top = (below ? r.bottom + 10 : r.top - b.height - 10) + "px";
    bubble.style.setProperty("--tail", (r.left + r.width / 2 - left) + "px"); if (below) bubble.classList.add("is-below");
    sp.classList.add("is-on");
  }
  function hide() { if (bubble) { bubble.remove(); bubble = null; } var o = d.querySelector(".tq-term.is-on"); if (o) o.classList.remove("is-on"); }
  d.addEventListener("click", function (e) { var sp = e.target.closest && e.target.closest(".tq-term"); if (sp) { e.stopPropagation(); e.preventDefault(); if (sp.classList.contains("is-on") && "ontouchstart" in window) hide(); else show(sp); } else hide(); }, true);
  d.addEventListener("mouseover", function (e) { var sp = e.target.closest && e.target.closest(".tq-term"); if (sp && !("ontouchstart" in window)) show(sp); });
  d.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(".tq-term") && !("ontouchstart" in window)) hide(); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); if (e.key === "Enter" && d.activeElement && d.activeElement.classList.contains("tq-term")) show(d.activeElement); });
  window.addEventListener("scroll", hide, { passive: true });

  function toggle(parent) {
    var b = el("button", "tq-icon tq-toggle", I.term); b.type = "button";
    function paint() { var off = d.documentElement.classList.contains("tq-terms-off"); b.classList.toggle("is-on", !off); b.setAttribute("aria-pressed", String(!off)); b.title = off ? "개념어 켜기" : "개념어 끄기"; b.setAttribute("aria-label", b.title); }
    b.addEventListener("click", function () { var off = d.documentElement.classList.toggle("tq-terms-off"); set(K_OFF, off ? "1" : "0"); hide(); paint(); });
    paint(); if (parent) parent.appendChild(b); return b;
  }

  // 중요도 표시: badge(부모, {stars: 1~3}) 대입·공무원·전문직 / badge(부모, {tier: "S|A|B|C"}) 기술·NCS·자격·중개사
  function badge(parent, o) {
    o = typeof o === "object" && o ? o : {}; var s;
    if (o.tier) s = el("span", "tq-tier tq-tier-" + o.tier, esc(o.tier));
    else { var n = Math.max(1, Math.min(3, o.stars || 1)); s = el("span", "tq-stars", "<b>" + "★★★".slice(0, n) + "</b><i>" + "★★★".slice(n) + "</i>"); s.setAttribute("aria-label", "중요도 " + n + " / 3"); }
    if (parent) parent.appendChild(s); return s;
  }

  function jump(parent, o) {
    o = o || {}; var b = el("button", "tq-jump", "<span>안 푼 문항으로</span><b>" + (o.count || 0) + "</b>"); b.type = "button";
    b.addEventListener("click", function () { if (typeof o.onClick === "function") o.onClick(); });
    b.setCount = function (n) { b.querySelector("b").textContent = n; b.hidden = !(n > 0); }; b.setCount(o.count || 0);
    if (parent) parent.appendChild(b); return b;
  }

  function coach(target, o) {
    o = o || {}; if (!target || get(K_COACH) === "1" || (o.key && get("tera_q_coach_" + o.key) === "1")) return null;
    var old = d.querySelector(".tq-coach"); if (old) old.remove();
    var c = el("div", "tq-coach", "<b>" + esc(o.title) + "</b><p>" + esc(o.text) + '</p><div><button type="button" class="tq-coach-off">다시 안 보기</button><button type="button" class="tq-coach-ok">확인</button></div>');
    d.body.appendChild(c);
    var r = target.getBoundingClientRect(), b = c.getBoundingClientRect(), below = r.bottom + b.height + 14 < window.innerHeight;
    c.style.left = Math.max(12, Math.min(window.innerWidth - b.width - 12, r.left)) + "px";
    c.style.top = (window.scrollY + (below ? r.bottom + 10 : r.top - b.height - 10)) + "px";
    function done(all) { if (o.key) set("tera_q_coach_" + o.key, "1"); if (all) set(K_COACH, "1"); c.remove(); if (typeof o.onDone === "function") o.onDone(); }
    c.querySelector(".tq-coach-ok").onclick = function () { done(false); }; c.querySelector(".tq-coach-off").onclick = function () { done(true); };
    return c;
  }

  function ask(parent, o) {
    o = o || {}; var wrap = el("div", "tq-ask"), pill = el("button", "tq-ask-pill", I.agent + "<span>테라에게 묻기</span>"); pill.type = "button";
    var pan = el("div", "tq-ask-pan", '<div class="tq-ask-h"><b>테라에이전트</b><button type="button" aria-label="닫기">×</button></div><div class="tq-ask-q">' +
      (o.questions || []).slice(0, 3).map(function (q, i) { return '<button type="button" data-i="' + i + '">' + esc(q) + "</button>"; }).join("") +
      '</div><form><input type="text" placeholder="질문 입력" aria-label="질문 입력"><button type="submit" aria-label="보내기">↑</button></form>');
    pan.hidden = true; wrap.appendChild(pill); wrap.appendChild(pan);
    function send(q) { if (q && typeof o.onAsk === "function") o.onAsk(q); }
    pill.onclick = function () { pan.hidden = !pan.hidden; };
    pan.querySelector(".tq-ask-h button").onclick = function () { pan.hidden = true; };
    pan.querySelector(".tq-ask-q").onclick = function (e) { var b = e.target.closest("button"); if (b) send((o.questions || [])[+b.dataset.i]); };
    pan.querySelector("form").onsubmit = function (e) { e.preventDefault(); var i = pan.querySelector("input"); send(i.value.trim()); i.value = ""; };
    if (parent) parent.appendChild(wrap); return wrap;
  }

  window.TERA_Q = { terms: terms, annotate: annotate, toggle: toggle, badge: badge, jump: jump, coach: coach, ask: ask, hide: hide };
  // 개념어 창의 자료: window.TNQ 는 [{terms, notes}, …] 배열(먼저 실린 파일)이거나 옛 꼴 {terms}
  if (window.TNQ) { if (Array.isArray(window.TNQ)) window.TNQ.forEach(function (x) { if (x && x.terms) terms(x.terms); }); else if (window.TNQ.terms) terms(window.TNQ.terms); }
})();
