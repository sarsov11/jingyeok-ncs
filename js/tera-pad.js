/* 테라러닝 풀이 창 — 계산이 필요한 문항에서 여는 공용 창 (2026-11-10 허브, 대표님 지시)
 *   빈 종이(손으로 쓰기) · 계산기 · 단계별 풀이(단계마다 고르면서 이어가기)
 * 쓰는 법
 *   <script src="js/tera-pad.js" defer></script>
 *   TERA_PAD.open({ key:"문항 id", title:"감가상각비", steps:[ {q:"…", options:["…","…"], answer:0, why:"…"}, … ], result:"정답 ③" })
 *   TERA_PAD.button(부모요소, 옵션 또는 옵션을 돌려주는 함수)   // 표준 「풀이 창」 단추를 만들어 붙인다
 *   TERA_PAD.pen({ key:"문항 id", onChange(켜짐) })            // 문제 위에 바로 쓰는 펜(다시 부르면 끝). 문항이 바뀌면 penHide() 뒤 새 key
 *   TERA_PAD.isCalc("발문·선지 글")                           // 계산 문항인지 어림(숫자·단위·구하시오 등)
 *   steps 가 없으면 단계별 풀이 칸은 「준비 중」으로 나온다.
 * 색은 앱의 --pt(없으면 --t-app, --cta) 를 따른다. 폰은 아래 판, 폭 1000px 이상은 오른쪽 옆 칸.
 * 글자는 전부 \u 없이 한글 그대로 둔다(일본어·영문 앱에는 싣지 않는다).
 */
(function () {
  if (window.TERA_PAD) return;
  var d = document, root, state = { tab: "paper", key: "", opts: {} }, papers = {}, ctx, cv, strokes, cur, tool = "pen";

  var CSS = [
    "#tpad{--p:var(--pt,var(--t-app,var(--cta,#E5202E)));--ps:color-mix(in srgb,var(--p) 10%,#fff);--pi:color-mix(in srgb,var(--p) 78%,#111419);",
    " position:fixed;left:0;right:0;bottom:0;z-index:2147481000;height:64vh;max-height:calc(100vh - 72px);background:#fff;color:#111419;border-radius:18px 22px 0 0;",
    " box-shadow:0 -18px 44px -18px rgba(17,20,25,.34),0 0 0 1px #E6E8EC;display:none;flex-direction:column;font:500 15px/1.5 'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif;letter-spacing:-.01em}",
    "#tpad.on{display:flex;animation:tpad-up .26s cubic-bezier(.2,.8,.2,1)}#tpad.big{height:calc(100vh - 72px)}",
    "@keyframes tpad-up{from{transform:translateY(36px);opacity:0}}",
    "#tpad,#tpad *,#tpen-cv,#tpen-bar,#tpen-bar *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}",
    "html.tpad-on,html.tpad-on body,html.tpen-on,html.tpen-on body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}",
    "#tpad canvas{-webkit-user-drag:none;touch-action:none}",
    "#tpad *{box-sizing:border-box}#tpad button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    "#tpad .hd{flex:none;display:flex;align-items:center;gap:8px;padding:10px 14px 8px}",
    "#tpad .ttl{flex:1;min-width:0;font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#tpad .ic{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid #D3D7DD;background:#fff;display:grid;place-items:center}",
    "#tpad .ic svg{width:17px;height:17px}",
    "#tpad .tabs{flex:none;display:flex;gap:6px;padding:0 14px 10px;border-bottom:1px solid #E6E8EC}",
    "#tpad .tabs button{flex:1;height:38px;border-radius:12px;border:1.5px solid #D3D7DD;background:#fff;font-weight:700;font-size:14px;color:#4B5563}",
    "#tpad .tabs button.on{background:var(--ps);border-color:var(--p);color:var(--pi)}",
    "#tpad .bd{flex:1;min-height:0;position:relative;overflow:hidden}",
    "#tpad .pane{position:absolute;inset:0;display:none;flex-direction:column}#tpad .pane.on{display:flex}",
    /* 빈 종이 */
    "#tpad .tools{flex:none;display:flex;gap:6px;padding:8px 14px}",
    "#tpad .tools button{height:34px;padding:0 12px;border-radius:999px;border:1px solid #D3D7DD;background:#fff;font-weight:700;font-size:13px;color:#4B5563}",
    "#tpad .tools button.on{background:var(--ps);border-color:transparent;color:var(--pi)}#tpad .tools .sp{flex:1}",
    "#tpad canvas{flex:1;min-height:0;width:100%;touch-action:none;background:#fff;background-image:linear-gradient(#EFF1F4 1px,transparent 1px),linear-gradient(90deg,#EFF1F4 1px,transparent 1px);background-size:24px 24px;cursor:crosshair}",
    /* 계산기 */
    "#tpad .calc{padding:10px 14px 14px;gap:8px;overflow:auto}",
    "#tpad .hist{flex:1;min-height:44px;overflow:auto;font-size:14px;color:#4B5563;display:flex;flex-direction:column;justify-content:flex-end;gap:2px}",
    "#tpad .hist div{display:flex;justify-content:space-between;gap:10px}#tpad .hist b{color:#111419;font-weight:800}",
    "#tpad .disp{flex:none;min-height:54px;border-radius:14px;background:#F6F7F9;padding:8px 14px;text-align:right;font-weight:800;font-size:26px;line-height:1.4;overflow-x:auto;white-space:nowrap}",
    "#tpad .disp small{display:block;font-weight:600;font-size:13px;line-height:1.2;color:#E5322D;min-height:14px}",
    "#tpad .keys{flex:none;display:grid;grid-template-columns:repeat(5,1fr);gap:6px}",
    "#tpad .keys button{height:44px;border-radius:12px;border:1px solid #E6E8EC;background:#fff;font-weight:800;font-size:16px}",
    "#tpad .keys button.f{background:#F6F7F9;font-size:14px;color:#333941}#tpad .keys button.eq{background:var(--p);border-color:var(--p);color:#fff}",
    "#tpad .keys button:active{transform:scale(.96)}",
    /* 단계별 풀이 */
    "#tpad .steps{padding:12px 14px 18px;overflow:auto;gap:10px}",
    "#tpad .bar{flex:none;height:4px;border-radius:0;background:#EFF1F4;overflow:hidden}#tpad .bar i{display:block;height:100%;background:var(--p);transition:width .3s}",
    "#tpad .tpst{border-radius:18px;box-shadow:0 1px 2px rgba(17,20,25,.05),0 0 0 1px #E6E8EC;padding:14px}",
    "#tpad .tpst.done{background:#FAFAFB}#tpad .tpst .n{font-weight:800;font-size:13px;line-height:1;color:var(--pi);margin-bottom:8px}",
    "#tpad .tpst .q{font-weight:700;font-size:16px;line-height:1.5;margin-bottom:10px;white-space:pre-line}",
    "#tpad .tpst .op{display:block;width:100%;min-height:48px;text-align:left;padding:10px 14px;margin-top:6px;border-radius:14px;border:1.5px solid #D3D7DD;background:#fff;font-weight:600;font-size:16px;line-height:1.45}",
    "#tpad .tpst .op.ok{border-color:#16B364;background:rgba(22,179,100,.10)}#tpad .tpst .op.no{border-color:#E5322D;background:rgba(229,50,45,.08)}",
    "#tpad .tpst .op[disabled]{cursor:default}#tpad .tpst .why{margin-top:10px;padding:10px 12px;border-radius:14px;background:rgba(22,179,100,.08);font-size:14px;white-space:pre-line}",
    "#tpad .tpst .hint{margin-top:8px;font-weight:700;font-size:13px;line-height:1.4;color:#E5322D}",
    "#tpad .res{border-radius:18px;background:var(--ps);padding:14px;font-weight:800;color:var(--pi);white-space:pre-line}",
    "#tpad .soon{margin:auto;text-align:center;color:#5F6670;font-weight:600;padding:24px}",
    "#tpad .soon b{display:inline-block;margin-bottom:8px;height:26px;padding:0 10px;border-radius:999px;box-shadow:0 0 0 1px #D3D7DD inset;font-weight:700;font-size:13px;line-height:26px}",
    ".tpad-btn{display:inline-flex;align-items:center;gap:7px;height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #D3D7DD;background:#fff;color:#111419;font:700 14.5px/1 'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif;cursor:pointer}",
    ".tpad-btn svg{width:18px;height:18px;color:var(--pt,var(--t-app,var(--cta,#E5202E)))}",
    "@media(min-width:1000px){#tpad{left:auto;top:72px;bottom:16px;right:16px;width:420px;height:auto;max-height:none;border-radius:18px;box-shadow:0 26px 60px -28px rgba(17,20,25,.34),0 0 0 1px #E6E8EC}#tpad.big{width:640px;height:auto}}",
    ":root[data-skin=night] #tpad{filter:invert(.92) hue-rotate(180deg)}"
  ].join("");

  var I = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    big: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"/></svg>',
    pad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.5 8h7M8.5 12.5h1.500M12 12.5h0M15.5 12.5h0M8.500 16.500h0M12 16.500h0M15.500 16.500h0"/></svg>'
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function build() {
    if (root) return;
    var st = d.createElement("style"); st.textContent = CSS; d.head.appendChild(st);
    root = d.createElement("section"); root.id = "tpad"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "풀이 창");
    root.innerHTML =
      '<div class="hd"><div class="ttl">풀이 창</div><button class="ic" data-a="big" aria-label="크게">' + I.big + '</button><button class="ic" data-a="close" aria-label="닫기">' + I.x + "</button></div>" +
      '<div class="tabs"><button data-t="paper">빈 종이</button><button data-t="calc">계산기</button><button data-t="steps">단계별 풀이</button></div>' +
      '<div class="bd">' +
      '<div class="pane" data-p="paper"><div class="tools"><button data-tool="pen" class="on">펜</button><button data-tool="era">지우개</button><span class="sp"></span><button data-a="undo">한 획 취소</button><button data-a="clear">모두 지우기</button></div><canvas></canvas></div>' +
      '<div class="pane calc" data-p="calc"><div class="hist"></div><div class="disp"><span class="ex">0</span><small></small></div><div class="keys"></div></div>' +
      '<div class="pane steps" data-p="steps"></div>' +
      "</div>";
    d.body.appendChild(root);
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d");
    var K = ["7", "8", "9", "÷", "⌫", "4", "5", "6", "×", "C", "1", "2", "3", "−", "(", "0", ".", "%", "+", ")", "√", "x²", "^", "1/x", "="];
    root.querySelector(".keys").innerHTML = K.map(function (k) {
      var cls = k === "=" ? "eq" : /[0-9.]/.test(k) ? "" : "f";
      return '<button class="' + cls + '" data-k="' + k + '">' + k + "</button>";
    }).join("");
    root.addEventListener("click", click);
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    ["touchstart", "touchmove", "touchend"].forEach(function (n) { cv.addEventListener(n, function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false }); });
    ["contextmenu", "selectstart", "dblclick", "dragstart", "gesturestart"].forEach(function (n) { root.addEventListener(n, noSel); });
    window.addEventListener("resize", function () { if (root.classList.contains("on")) fit(); });
    if (window.ResizeObserver) new ResizeObserver(function () { if (root.classList.contains("on") && state.tab === "paper") fit(); }).observe(cv);   // 종이 크기가 바뀌면(열리는 애니메이션 · 화면 회전 · 크게) 비트맵을 다시 맞춘다
    d.addEventListener("keydown", function (e) {
      if (!root.classList.contains("on")) return;
      if (e.key === "Escape") return close();
      if (state.tab !== "calc" || /input|textarea/i.test((e.target.tagName || ""))) return;
      var m = { "*": "×", "/": "÷", "-": "−", Enter: "=", Backspace: "⌫" }[e.key] || e.key;
      if (/^[0-9.+()%^=]$|^[×÷−⌫]$/.test(m)) { key(m); e.preventDefault(); }
    });
  }

  function click(e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.t) return tab(b.dataset.t);
    if (b.dataset.tool) { tool = b.dataset.tool; root.querySelectorAll("[data-tool]").forEach(function (x) { x.classList.toggle("on", x === b); }); return; }
    if (b.dataset.k) return key(b.dataset.k);
    if (b.dataset.o != null) return pick(+b.dataset.s, +b.dataset.o);
    var a = b.dataset.a;
    if (a === "close") close();
    else if (a === "big") { root.classList.toggle("big"); fit(); }
    else if (a === "undo") { strokes.pop(); paint(); }
    else if (a === "clear") { strokes.length = 0; paint(); }
  }

  function tab(t) {
    state.tab = t;
    root.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x.dataset.t === t); });
    root.querySelectorAll(".pane").forEach(function (x) { x.classList.toggle("on", x.dataset.p === t); });
    if (t === "paper") fit();
    if (t === "steps") drawSteps();
  }

  /* ── 빈 종이 ── */
  function fit() {
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint();
  }
  function paint() {
    var r = cv.getBoundingClientRect(); ctx.clearRect(0, 0, r.width, r.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokes.forEach(function (s) {
      ctx.globalCompositeOperation = s.t === "era" ? "destination-out" : "source-over";
      ctx.strokeStyle = "#111419"; ctx.lineWidth = s.t === "era" ? 22 : 2.4;
      ctx.beginPath();
      s.p.forEach(function (pt, i) { if (i) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); });
      if (s.p.length === 1) ctx.lineTo(s.p[0][0] + .1, s.p[0][1] + .1);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function noSel(e) { e.preventDefault(); }
  function unselect() { try { var g = window.getSelection && getSelection(); if (g && g.rangeCount) g.removeAllRanges(); } catch (x) {} }
  var padPen = false;
  function down(e) {
    unselect(); if (e.pointerType === "pen") padPen = true; else if (e.pointerType === "touch" && padPen) { e.preventDefault(); return; }
    if (cur) return; cur = { t: tool, p: [pos(e)], id: e.pointerId }; strokes.push(cur); try { cv.setPointerCapture(e.pointerId); } catch (x) {} paint(); e.preventDefault(); }
  function move(e) { if (!cur || e.pointerId !== cur.id) return; var L = e.getCoalescedEvents ? e.getCoalescedEvents() : null; (L && L.length ? L : [e]).forEach(function (c) { cur.p.push(pos(c)); }); paint(); e.preventDefault(); }
  function up(e) { if (cur && (!e || e.pointerId === cur.id)) cur = null; }

  /* ── 계산기 ── */
  var expr = "", hist = [];
  function show(err) {
    root.querySelector(".ex").textContent = expr || "0";
    root.querySelector(".disp small").textContent = err || "";
    var h = root.querySelector(".hist");
    h.innerHTML = hist.slice(-6).map(function (x) { return "<div><span>" + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("");
    h.scrollTop = h.scrollHeight;
  }
  function key(k) {
    if (k === "C") expr = "";
    else if (k === "⌫") expr = expr.slice(0, -1);
    else if (k === "x²") expr += "^2";
    else if (k === "1/x") expr = "1÷(" + (expr || "1") + ")";
    else if (k === "=") {
      if (!expr) return;
      try { var v = calc(expr), out = fmt(v); hist.push([expr, out]); expr = out.replace(/,/g, ""); return show(); }
      catch (e) { return show("식을 확인하세요"); }
    } else expr += k;
    show();
  }
  function fmt(v) {
    if (!isFinite(v)) throw 0;
    var r = Math.round(v * 1e10) / 1e10, s = String(r);
    if (/e/.test(s)) return s;
    var p = s.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  // 재귀 하강: 식 = 항 (± 항)*, 항 = 거듭 (×÷ 거듭)*, 거듭 = 단항 (^ 거듭)?, 단항 = −단항 | √단항 | 수% | (식)
  function calc(src) {
    var s = src.replace(/,/g, "").replace(/\s+/g, ""), i = 0;
    function peek() { return s[i]; }
    function E() { var v = T(); while (peek() === "+" || peek() === "−" || peek() === "-") { var o = s[i++]; var r = T(); v = o === "+" ? v + r : v - r; } return v; }
    function T() { var v = P(); for (;;) { var c = peek(); if (c === "×" || c === "*") { i++; v *= P(); } else if (c === "÷" || c === "/") { i++; v /= P(); } else if (c === "(" || c === "√") { v *= P(); } else break; } return v; }
    function P() { var v = U(); if (peek() === "^") { i++; v = Math.pow(v, P()); } return v; }
    function U() {
      var c = peek(), v;
      if (c === "−" || c === "-") { i++; return -U(); }
      if (c === "+") { i++; return U(); }
      if (c === "√") { i++; return Math.sqrt(U()); }
      if (c === "(") { i++; v = E(); if (peek() === ")") i++; }
      else { var m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; v = parseFloat(m[0]); }
      while (peek() === "%") { i++; v /= 100; }
      return v;
    }
    var out = E(); if (i < s.length) throw 0; return out;
  }

  /* ── 단계별 풀이 ── */
  function drawSteps() {
    var box = root.querySelector('[data-p="steps"]'), o = state.opts, steps = o.steps || [];
    if (!steps.length) { box.innerHTML = '<div class="soon"><b>준비 중</b><br>이 문항의 단계별 풀이는 아직 없습니다.<br>빈 종이와 계산기를 쓸 수 있습니다.</div>'; return; }
    var prog = papers[state.key].prog, h = '<div class="bar"><i style="width:' + Math.round(prog.length / steps.length * 100) + '%"></i></div>';
    steps.forEach(function (s, n) {
      if (n > prog.length) return;
      var done = n < prog.length, wrong = papers[state.key].wrong[n] || [];
      h += '<div class="tpst' + (done ? " done" : "") + '"><div class="n">' + (n + 1) + " / " + steps.length + '</div><div class="q">' + esc(s.q) + "</div>";
      (s.options || []).forEach(function (t, k) {
        var cls = done && k === s.answer ? " ok" : wrong.indexOf(k) >= 0 ? " no" : "";
        h += '<button class="op' + cls + '" data-s="' + n + '" data-o="' + k + '"' + (done || cls ? " disabled" : "") + ">" + esc(t) + "</button>";
      });
      if (!done && wrong.length) h += '<div class="hint">' + esc(s.hint || "다시 골라 보세요") + "</div>";
      if (done && s.why) h += '<div class="why">' + esc(s.why) + "</div>";
      h += "</div>";
    });
    if (prog.length === steps.length && o.result) h += '<div class="res">' + esc(o.result) + "</div>";
    box.innerHTML = h; box.scrollTop = box.scrollHeight;
  }
  function pick(n, k) {
    var P = papers[state.key], s = state.opts.steps[n];
    if (k === s.answer) P.prog.push(k); else (P.wrong[n] = P.wrong[n] || []).push(k);
    drawSteps();
    if (typeof state.opts.onStep === "function") try { state.opts.onStep(n, k === s.answer); } catch (e) {}
  }

  function open(o) {
    build(); o = o || {};
    state.opts = o; state.key = o.key || "기본";
    if (!papers[state.key]) papers[state.key] = { strokes: [], prog: [], wrong: {} };
    strokes = papers[state.key].strokes;
    root.querySelector(".ttl").textContent = o.title ? "풀이 창 · " + o.title : "풀이 창";
    root.classList.add("on"); d.documentElement.classList.add("tpad-on"); unselect();
    tab(o.tab || ((o.steps || []).length && o.prefer === "steps" ? "steps" : state.tab || "paper"));
    show();
  }
  function close() { if (root) { root.classList.remove("on"); d.documentElement.classList.remove("tpad-on"); } }

  function button(parent, o) {
    var b = d.createElement("button"); b.type = "button"; b.className = "tpad-btn"; b.innerHTML = I.pad + "풀이 창";
    b.addEventListener("click", function () { open(typeof o === "function" ? o() : o); });
    if (parent) parent.appendChild(b);
    return b;
  }

  function isCalc(t) {
    t = String(t || "");
    // 법령 문항의 기간·인원·비율(3년, 30일, 5명, 과반수 등)은 계산 문항으로 보지 않는다
    if (/(계산하|산정하|구하시오|구하면|구한 값|얼마인가|얼마인지|금액은|값은\?|몇\s?(원|%|m|kg|N|kN|A|V|W)인)/.test(t) && /\d/.test(t)) return true;
    var money = (t.match(/\d[\d,.]*\s?(원|천원|만원|억원)(?![가-힣A-Za-z])/g) || []).length;
    var phys = (t.match(/\d[\d,.]*\s?(㎡|m²|m³|㎥|mm|cm|km|m|kg|kN|N|MPa|kPa|Pa|A|V|kV|W|kW|Ω|℃|L|rpm|Hz)(?![가-힣A-Za-z])/g) || []).length;
    return phys >= 2 || money >= 3;
  }

  /* ── 문제 위에 쓰기(펜) ── 화면 전체에 투명한 지면을 덮고 문제 위에 바로 쓴다. 획은 스크롤 기준(창 또는 안쪽 스크롤 요소)에 붙여 기억해 스크롤해도 제자리에 있다.
     1111: 지면 CSS 크기를 width/height 100% 로 못 박았다(전에는 inset:0 만 써서 canvas 가 비트맵 크기 그대로 그려져, 화면 배율(dpr)이 2인 아이패드에서 획이 손 댄 곳의 두 배 위치에 찍혔다).
     좌표는 지면 자신의 getBoundingClientRect 기준, 지면은 html 직속, 펜이 한 번이라도 들어오면 손가락은 획으로 받지 않는다. */
  var PEN = { on: false, tool: "pen", key: "", store: {}, redo: [], sawPen: false, pid: null }, pcv, pctx, pbar, pcur;
  var PP = "var(--pt,var(--t-app,var(--cta,#E5202E)))";
  var PCSS = "#tpen-cv{position:fixed;left:0;top:0;width:100%;height:100%;margin:0;padding:0;border:0;z-index:2147480500;touch-action:none;cursor:crosshair;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" +
    "html.tpen-on .tq-bar{z-index:2147480550!important}" +                       /* 아래 줄(헷갈림·해설·펜·다음)이 지면 위에서 눌린다 — 문제 화면 공용 부품 .tq-bar 와 맞물림 */
    "#tpen-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:2147480600;display:flex;align-items:center;gap:2px;height:58px;max-width:calc(100vw - 16px);overflow-x:auto;padding:0 8px;border-radius:14px;background:#fff;box-shadow:0 14px 34px -14px rgba(17,20,25,.38),0 0 0 1px #E6E8EC;font-family:'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif}" +
    "@media(min-width:900px){#tpen-bar{left:auto;right:12px;transform:none;height:50px;max-width:min(560px,calc(100vw - 24px))}#tpen-bar button{height:40px!important;font-size:12.5px!important;padding:0 8px!important}}" +
    "#tpen-bar button{flex:none;height:44px;min-width:44px;padding:0 10px;border:0;border-radius:12px;background:none;font-weight:700;font-size:13px;color:#475569;cursor:pointer;white-space:nowrap}" +
    "#tpen-bar button.on{background:color-mix(in srgb," + PP + " 12%,#fff);color:color-mix(in srgb," + PP + " 78%,#111419)}" +
    "#tpen-bar i{flex:none;width:1px;height:26px;background:#E6E8EC;margin:0 4px}#tpen-bar .end{color:" + PP + "}";
  function penRect() { return pcv.getBoundingClientRect(); }
  function penFit() {
    var r = penRect(), dpr = window.devicePixelRatio || 1, w = Math.max(1, r.width), h = Math.max(1, r.height);
    pcv.width = Math.round(w * dpr); pcv.height = Math.round(h * dpr);
    pctx.setTransform(pcv.width / w, 0, 0, pcv.height / h, 0, 0); penPaint();
  }
  /* 획 하나가 붙어 있는 스크롤 기준: el 이 null 이면 창, 아니면 그 요소(좌표는 요소 안쪽 기준). 반환 x,y = 기준 원점의 화면 좌표 */
  function penBase(el) {
    if (!el) return { x: -(window.pageXOffset || 0), y: -(window.pageYOffset || 0) };
    var b = el.getBoundingClientRect(); return { x: b.left - el.scrollLeft, y: b.top - el.scrollTop, gone: !d.documentElement.contains(el) };
  }
  function penScroller(x, y) {
    var L = d.elementsFromPoint ? d.elementsFromPoint(x, y) : [];
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (e === pcv || e === d.documentElement || e === d.body || (e.closest && e.closest("#tpen-bar"))) continue;
      var cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2) return e;
    }
    return null;
  }
  function penPaint() {
    if (!pctx) return; var r = penRect(); pctx.clearRect(0, 0, r.width, r.height); pctx.lineCap = "round"; pctx.lineJoin = "round";
    (PEN.store[PEN.key] || []).forEach(function (s) {
      var o = penBase(s.el); if (o.gone) return; var ox = o.x - r.left, oy = o.y - r.top;
      pctx.globalCompositeOperation = s.t === "era" ? "destination-out" : "source-over";
      pctx.globalAlpha = s.t === "hl" ? .35 : 1; pctx.strokeStyle = s.t === "hl" ? "#FACC15" : "#111419"; pctx.lineWidth = s.t === "era" ? 24 : s.t === "hl" ? 16 : 2.4;
      pctx.beginPath(); s.p.forEach(function (pt, i) { if (i) pctx.lineTo(pt[0] + ox, pt[1] + oy); else pctx.moveTo(pt[0] + ox, pt[1] + oy); });
      if (s.p.length === 1) pctx.lineTo(s.p[0][0] + ox + .1, s.p[0][1] + oy + .1); pctx.stroke();
    });
    pctx.globalAlpha = 1; pctx.globalCompositeOperation = "source-over";
  }
  function penBuild() {
    if (pcv) return;
    var st = d.createElement("style"); st.textContent = PCSS; d.head.appendChild(st);
    pcv = d.createElement("canvas"); pcv.id = "tpen-cv"; pctx = pcv.getContext("2d"); d.documentElement.appendChild(pcv);   // html 직속: body 의 transform·zoom·filter 가 position:fixed 기준을 바꾸지 못하게
    pbar = d.createElement("div"); pbar.id = "tpen-bar";
    pbar.innerHTML = '<button data-t="move">넘기기</button><button data-t="pen" class="on">펜</button><button data-t="hl">형광펜</button><button data-t="era">지우개</button><i></i><button data-a="undo">한 획 취소</button><button data-a="redo">다시 긋기</button><i></i><button data-a="end" class="end">필기 종료</button>';
    d.documentElement.appendChild(pbar);
    ["contextmenu", "selectstart", "dblclick", "dragstart", "gesturestart"].forEach(function (n) { pcv.addEventListener(n, function (e) { e.preventDefault(); }); pbar.addEventListener(n, function (e) { e.preventDefault(); }); });
    ["touchstart", "touchmove"].forEach(function (n) { pcv.addEventListener(n, function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false }); });
    d.addEventListener("selectstart", function (e) { if (PEN.on || d.documentElement.classList.contains("tpad-on")) e.preventDefault(); }, true);
    d.addEventListener("selectionchange", function () { if (PEN.on || d.documentElement.classList.contains("tpad-on")) { var g = getSelection(); if (g && g.rangeCount && !g.isCollapsed) g.removeAllRanges(); } });
    function pt(e, el) { var r = penRect(), o = penBase(el); return [e.clientX - o.x, e.clientY - o.y]; }   // 화면 좌표 − 스크롤 기준 원점 (지면은 화면 전체라 clientX 가 곧 지면 좌표)
    pcv.addEventListener("pointerdown", function (e) {
      try { getSelection().removeAllRanges(); } catch (x) {}
      if (e.pointerType === "pen") PEN.sawPen = true;
      else if (e.pointerType === "touch" && PEN.sawPen) { e.preventDefault(); return; }     // 손바닥: 펜을 쓰는 기기에서는 손가락 획을 받지 않는다
      if (pcur) return;                                                                      // 이미 긋는 중이면 다른 접촉은 무시
      var el = penScroller(e.clientX, e.clientY);
      pcur = { t: PEN.tool, el: el, p: [pt(e, el)] }; PEN.pid = e.pointerId; (PEN.store[PEN.key] = PEN.store[PEN.key] || []).push(pcur); PEN.redo = [];
      try { pcv.setPointerCapture(e.pointerId); } catch (x) {} penPaint(); e.preventDefault();
    });
    pcv.addEventListener("pointermove", function (e) {
      if (!pcur || e.pointerId !== PEN.pid) return;
      var L = e.getCoalescedEvents ? e.getCoalescedEvents() : null; (L && L.length ? L : [e]).forEach(function (c) { pcur.p.push(pt(c, pcur.el)); }); penPaint();
    });
    ["pointerup", "pointercancel"].forEach(function (n) { pcv.addEventListener(n, function (e) { if (e.pointerId === PEN.pid) { pcur = null; PEN.pid = null; } }); });
    pbar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var L = PEN.store[PEN.key] = PEN.store[PEN.key] || [];
      if (b.dataset.t) { PEN.tool = b.dataset.t; pcv.style.pointerEvents = PEN.tool === "move" ? "none" : "auto"; pbar.querySelectorAll("[data-t]").forEach(function (x) { x.classList.toggle("on", x === b); }); }
      else if (b.dataset.a === "undo") { if (L.length) PEN.redo.push(L.pop()); penPaint(); }
      else if (b.dataset.a === "redo") { if (PEN.redo.length) L.push(PEN.redo.pop()); penPaint(); }
      else if (b.dataset.a === "end") penOff();
    });
    var vis = function () { return pcv && pcv.style.display !== "none"; };
    window.addEventListener("scroll", function () { if (vis()) penPaint(); }, { passive: true, capture: true });     // 안쪽 스크롤 요소의 scroll 도 잡는다
    window.addEventListener("resize", function () { if (vis()) penFit(); });
    window.addEventListener("orientationchange", function () { setTimeout(function () { if (vis()) penFit(); }, 250); });
    if (window.visualViewport) { visualViewport.addEventListener("resize", function () { if (vis()) penFit(); }); visualViewport.addEventListener("scroll", function () { if (vis()) penPaint(); }); }
  }
  function pen(o) {
    o = o || {}; if (PEN.on && (o.key || "기본") === PEN.key) return penOff();
    penBuild(); PEN.key = o.key || "기본"; PEN.on = true; PEN.redo = [];
    if (typeof o.onChange === "function") PEN.onChange = o.onChange;
    d.documentElement.classList.add("tpen-on"); pcv.style.display = "block"; pbar.style.display = "flex"; pcv.style.pointerEvents = PEN.tool === "move" ? "none" : "auto"; penFit();
    if (PEN.onChange) PEN.onChange(true);
  }
  function penOff() { if (!pcv) return; PEN.on = false; pcur = null; d.documentElement.classList.remove("tpen-on"); pcv.style.pointerEvents = "none"; pbar.style.display = "none"; if (PEN.onChange) PEN.onChange(false); }   // 쓴 것은 화면에 남는다
  function penHide() { if (pcv) { pcur = null; d.documentElement.classList.remove("tpen-on"); pcv.style.display = "none"; pbar.style.display = "none"; PEN.on = false; } }                                            // 문항이 바뀔 때 지면째 감춘다
  function penClear(key) { delete PEN.store[key || PEN.key]; penPaint(); }

  window.TERA_PAD = { open: open, close: close, button: button, isCalc: isCalc, pen: pen, penOff: penOff, penHide: penHide, penClear: penClear, calc: function (s) { return calc(s); } };
})();
