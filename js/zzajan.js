/* 짜잔 층 3판 (테라러닝 공용 · 2026-10-09)
 *  1판 「개 짜침」, 2판 「전혀 마음에 안 듦 → 폰게임·롤 조사」. 조사 종합: 보고서\게임연출조사\0_종합_연출안.md
 *  원칙: 크기 3단. 평소 정답은 버튼 안에서 작고 빠르게, 연속 문턱은 위쪽 이름 배너, 레벨업·승급만 화면 전체.
 *        순서는 소리 → 0.02초 번쩍 → 0.05초 입자 → 0.1초 글자. 정답 소리는 연속마다 반음 위.
 *  붙이기: <script src="js/zzsfx.js" defer></script><script src="js/zzajan.js" defer></script>  화면 코드는 안 고친다.
 *  정답·오답 표시: [data-s=ok|no], .verdict.good|ok, .verdict.warn|bad|no, .msg.ok|no  (누른 직후 한 번만 판정)
 *  소리 끄기 localStorage terra.cheer.sound="0" · 효과 끄기 terra.zz="0"
 *  window.ZZ: ok(el) no(el) levelUp(n) promote(from,to) stars(n) setCombo(c) combo()
 */
(function () {
  "use strict";
  if (window.ZZ) return;
  var D = document, W = window;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  if (lsGet("terra.zz") === "0") return;
  var RM = false; try { RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }

  /* ══════════ 소리: 녹음 효과음(zzsfx.js)을 Web Audio 로 재생, 음높이 바꿈 ══════════ */
  var AC = null, BUF = {}, OUT = null;
  function soundOn() { return lsGet("terra.cheer.sound") !== "0"; }
  function ctx() {
    var C = W.AudioContext || W.webkitAudioContext; if (!C) return null;
    if (!AC) {
      AC = new C(); OUT = AC.createDynamicsCompressor(); OUT.threshold.value = -10; OUT.connect(AC.destination);
      var S = W.ZZ_SFX || {};
      Object.keys(S).forEach(function (k) {
        try {
          var bin = atob(S[k].split(",")[1]), u = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          AC.decodeAudioData(u.buffer, function (b) { BUF[k] = b; }, function () { });
        } catch (e) { }
      });
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function play(name, o) {
    o = o || {};
    try { W.dispatchEvent(new CustomEvent("zz:sfx", { detail: { name: name, semi: o.semi || 0, delay: o.delay || 0, vol: o.vol == null ? .8 : o.vol } })); } catch (e) { }
    if (!soundOn()) return null;
    var c = ctx(); if (!c || !BUF[name]) return null;
    var s = c.createBufferSource(), g = c.createGain();
    s.buffer = BUF[name]; s.playbackRate.value = Math.pow(2, (o.semi || 0) / 12);
    g.gain.value = o.vol == null ? .8 : o.vol;
    s.connect(g); g.connect(OUT); s.start(c.currentTime + (o.delay || 0) / 1000);
    return s;
  }
  D.addEventListener("pointerdown", function () { ctx(); }, { capture: true, once: true });

  W.ZZ = { play: play };
  if (!D.body) D.addEventListener("DOMContentLoaded", start); else start();

  function start() {
  function cssv(n) { try { return getComputedStyle(D.documentElement).getPropertyValue(n).trim(); } catch (e) { return ""; } }
  var ACC = cssv("--accent") || cssv("--red") || "#E3242B";
  var GREEN = "#16B364", RED = "#E5383B";
  var FONT = "'Pretendard','Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif";
  /* 연속 단계: 처음 닿을 때만 큰 배너, 이름은 칭호와 같은 말맛 */
  /* 언어: <html lang> 이 ja·en 이면 그 말로(テラ資格·Terra Prep). 나머지는 한국어 */
  var LANG = (function () { var l = (D.documentElement.getAttribute("lang") || "ko").toLowerCase(); return l.indexOf("ja") === 0 ? "ja" : l.indexOf("en") === 0 ? "en" : "ko"; })();
  var TXT = {
    ko: { names: ["어? 좀 치네", "손이 풀렸다", "아무도 날 못 막아", "전설이 되었다", "출제위원 긴장 중", "신(神)"], run: function (n) { return n + "연속"; },
          lvT: "LEVEL UP", lvS: function (n) { return "레벨 " + n + " 달성"; }, prT: function (g) { return g + " 등급 승급"; } },
    ja: { names: ["お、やるじゃん", "手が温まってきた", "誰にも止められない", "伝説になった", "出題者が震えてる", "神"], run: function (n) { return n + "連続"; },
          lvT: "LEVEL UP", lvS: function (n) { return "レベル " + n; }, prT: function (g) { return g + " ランク昇格"; } },
    en: { names: ["Oh, you're good", "Warming up", "Unstoppable", "Legendary", "Examiners nervous", "GODLIKE"], run: function (n) { return n + " in a row"; },
          lvT: "LEVEL UP", lvS: function (n) { return "Level " + n; }, prT: function (g) { return "Rank " + g; } }
  }[LANG];
  var TIERS = [
    { n: 3, name: TXT.names[0], c1: "#2F80FF", c2: "#6FB1FF" },
    { n: 5, name: TXT.names[1], c1: "#7B3FF2", c2: "#B58CFF" },
    { n: 7, name: TXT.names[2], c1: "#FF7A00", c2: "#FFC14D" },
    { n: 10, name: TXT.names[3], c1: "#E3242B", c2: "#FF8A3D" },
    { n: 15, name: TXT.names[4], c1: "#C9A100", c2: "#FFE36B" },
    { n: 20, name: TXT.names[5], c1: "#111827", c2: "#FFD54A" }
  ];

  var st = D.createElement("style"); st.id = "zz-style";
  st.textContent = [
    "#zz-fx{position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden}",
    "#zz-cv{position:absolute;inset:0;width:100%;height:100%}",
    ".zz-chk{position:absolute;width:var(--s);height:var(--s);transform:translate(-50%,-50%) scale(.3);opacity:0;animation:zzChk .9s cubic-bezier(.2,1.6,.35,1) forwards}",
    ".zz-chk svg{width:100%;height:100%;overflow:visible}.zz-chk circle{fill:" + GREEN + "}",
    ".zz-chk path{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:zzDraw .22s .1s ease-out forwards}",
    "@keyframes zzChk{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}32%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1)}}",
    "@keyframes zzDraw{to{stroke-dashoffset:0}}",
    ".zz-xp{position:absolute;left:0;top:0;font:900 17px/1 " + FONT + ";color:#fff;background:linear-gradient(180deg,#FFCB3D,#F59E0B);padding:6px 10px;border-radius:999px;",
    " box-shadow:0 0 0 2px #fff,0 4px 10px rgba(0,0,0,.25);white-space:nowrap;will-change:transform}",
    "#zz-hud{position:absolute;right:14px;top:12px;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 8px;border-radius:999px;background:#fff;",
    " box-shadow:0 6px 18px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.06);font:800 13px/1 " + FONT + ";color:#111;transform:translateY(-70px);transition:transform .35s cubic-bezier(.2,1.4,.4,1)}",
    "@media (min-width:700px){#zz-hud{top:64px}}",
    "#zz-hud.on{transform:none}#zz-hud .lv{background:#111;color:#FFD54A;border-radius:999px;padding:5px 8px;font-weight:900}",
    "#zz-hud .bar{width:96px;height:9px;border-radius:9px;background:#EEF0F3;overflow:hidden}#zz-hud .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#FFCB3D,#F59E0B);transition:width .45s cubic-bezier(.2,1,.3,1)}",
    "#zz-hud.hit{animation:zzHit .35s cubic-bezier(.2,1.8,.4,1)}@keyframes zzHit{40%{transform:scale(1.14)}}",
    ".zz-ban{position:absolute;left:0;right:0;top:13%;height:96px;display:flex;align-items:center;justify-content:center;pointer-events:none}",
    ".zz-ban .bg{position:absolute;left:-10%;right:-10%;top:0;bottom:0;transform:skewY(-4deg) scaleX(0);transform-origin:left;",
    " background:linear-gradient(90deg,transparent 0%,var(--c1) 18%,var(--c2) 50%,var(--c1) 82%,transparent 100%);box-shadow:0 0 40px var(--c1);animation:zzBanBg 1.6s cubic-bezier(.7,0,.2,1) forwards}",
    "@keyframes zzBanBg{0%{transform:skewY(-4deg) scaleX(0)}16%{transform:skewY(-4deg) scaleX(1);transform-origin:left}84%{transform:skewY(-4deg) scaleX(1);transform-origin:right;opacity:1}100%{transform:skewY(-4deg) scaleX(0);transform-origin:right;opacity:.6}}",
    ".zz-ban .tx{position:relative;display:flex;align-items:baseline;gap:14px;transform:skewY(-4deg);color:#fff;font:900 44px/1 " + FONT + ";letter-spacing:-.03em;",
    " text-shadow:0 3px 0 rgba(0,0,0,.25);animation:zzBanTx 1.6s cubic-bezier(.2,1.3,.3,1) forwards;white-space:nowrap}",
    ".zz-ban .tx small{font-size:22px;font-weight:900;background:#fff;color:var(--c1);padding:5px 10px;border-radius:8px;text-shadow:none}",
    "@keyframes zzBanTx{0%{opacity:0;transform:skewY(-4deg) translateX(-160px) scale(1.4)}14%{opacity:0}22%{opacity:1;transform:skewY(-4deg) translateX(0) scale(1.12)}",
    " 30%{transform:skewY(-4deg) scale(1)}80%{opacity:1;transform:skewY(-4deg) translateX(10px)}100%{opacity:0;transform:skewY(-4deg) translateX(160px)}}",
    "@media(max-width:560px){.zz-ban .tx{font-size:30px}.zz-ban .tx small{font-size:16px}.zz-ban{height:76px}}",
    ".zz-dim{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(20,14,40,.55),rgba(8,6,18,.88));animation:zzDim 2.6s ease forwards}",
    "@keyframes zzDim{0%{opacity:0}10%{opacity:1}85%{opacity:1}100%{opacity:0}}",
    ".zz-emb{position:absolute;left:50%;top:44%;width:210px;height:210px;margin:-105px 0 0 -105px;display:grid;place-items:center;transform:scale(0);animation:zzEmb 2.6s cubic-bezier(.2,1.5,.3,1) forwards}",
    ".zz-emb .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,var(--c2),var(--c1),var(--c2),var(--c1),var(--c2));animation:zzSpin 2.6s linear}",
    ".zz-emb .core{position:absolute;inset:12px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#fff,var(--c2) 45%,var(--c1));box-shadow:inset 0 -10px 20px rgba(0,0,0,.25)}",
    ".zz-emb b{position:relative;font:900 92px/1 " + FONT + ";color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.3),0 0 30px var(--c2)}",
    "@keyframes zzSpin{to{transform:rotate(360deg)}}",
    "@keyframes zzEmb{0%{transform:scale(0) rotate(-90deg)}33%{transform:scale(0) rotate(-90deg)}42%{transform:scale(1.25) rotate(8deg)}50%{transform:scale(.95) rotate(-2deg)}57%{transform:scale(1)}85%{transform:scale(1);opacity:1}100%{transform:scale(1.1);opacity:0}}",
    ".zz-big{position:absolute;left:0;right:0;top:calc(44% + 130px);text-align:center;color:#fff;font:900 54px/1 " + FONT + ";letter-spacing:.04em;",
    " text-shadow:0 0 24px var(--c2),0 4px 0 rgba(0,0,0,.35);opacity:0;animation:zzBig 2.6s ease forwards}",
    ".zz-big small{display:block;margin-top:12px;font-size:20px;letter-spacing:0;font-weight:800;opacity:.9}",
    "@keyframes zzBig{0%,40%{opacity:0;transform:translateY(20px)}50%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}",
    ".zz-peek{position:absolute;left:50%;top:44%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:#fff;border:6px solid " + ACC + ";animation:zzPeek .9s ease-in forwards}",
    "@keyframes zzPeek{0%{transform:scale(.6);opacity:0}25%{transform:scale(1);opacity:1;box-shadow:0 0 0 0 var(--c2)}40%{transform:translateX(-4px) rotate(-2deg)}50%{transform:translateX(4px) rotate(2deg)}",
    " 60%{transform:translateX(-5px);box-shadow:0 0 30px 10px var(--c2)}70%{transform:translateX(5px)}80%{transform:translateX(-6px);box-shadow:0 0 60px 26px var(--c2)}90%{transform:translateX(6px)}100%{transform:scale(1.08);box-shadow:0 0 90px 50px var(--c2);opacity:1}}",
    ".zz-stars{position:absolute;left:50%;top:30%;transform:translateX(-50%);display:flex;gap:18px}",
    ".zz-star{width:84px;height:84px;transform:scale(0) rotate(-40deg);animation:zzStar .55s cubic-bezier(.2,1.7,.35,1) forwards}",
    ".zz-star svg{width:100%;height:100%;filter:drop-shadow(0 6px 0 rgba(0,0,0,.18)) drop-shadow(0 0 14px #FFC93C)}",
    "@keyframes zzStar{0%{transform:scale(2.4) rotate(-40deg);opacity:0}60%{transform:scale(.92) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}",
    "@keyframes zzOut{to{opacity:0;transform:translateX(-50%) translateY(-14px)}}",
    ".zz-in{animation:zzIn .55s cubic-bezier(.2,1.3,.35,1) both}@keyframes zzIn{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:none}}"
  ].join("\n");
  D.head.appendChild(st);

  var FX = null;
  function layer() { if (FX && FX.isConnected) return FX;
    FX = D.createElement("div"); FX.id = "zz-fx"; FX.setAttribute("aria-hidden", "true"); D.body.appendChild(FX); return FX; }
  function add(cls, css, html, life) { var n = D.createElement("div"); if (cls) n.className = cls; if (css) n.style.cssText = css; if (html) n.innerHTML = html;
    layer().appendChild(n); if (life) setTimeout(function () { n.remove(); }, life); return n; }
  function rect(el) { try { var r = el.getBoundingClientRect(); return r.width ? r : null; } catch (e) { return null; } }

  /* ── 캔버스 입자 ── */
  var CV = null, CX = null, DPR = 1, items = [], raf = 0, last = 0, freezeUntil = 0;
  function cv() { if (CV && CV.isConnected) return; CV = D.createElement("canvas"); CV.id = "zz-cv"; layer().appendChild(CV); CX = CV.getContext("2d"); size(); }
  function size() { if (!CV) return; DPR = Math.min(2, W.devicePixelRatio || 1); CV.width = innerWidth * DPR; CV.height = innerHeight * DPR; }
  W.addEventListener("resize", size);
  function go() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    /* rAF 시각이 go() 의 performance.now() 보다 앞설 수 있다 — 음수 dt 로 원 반지름이 음수가 되어 arc 가 예외를 던지고 애니메이션이 멈췄다(2026-10-09 통사 실측) */
    var dt = now < freezeUntil ? 0 : Math.max(0, Math.min(40, now - last)) / 16.67; last = now;   /* 히트스톱: 입자도 멈춤 */
    CX.setTransform(DPR, 0, 0, DPR, 0, 0); CX.clearRect(0, 0, innerWidth, innerHeight);
    items = items.filter(function (it) { it.t += dt; return it.t < it.life; });
    items.forEach(function (it) { CX.save(); try { it.draw(it, dt); } catch (e) { it.t = it.life; } CX.restore(); });
    if (items.length) raf = requestAnimationFrame(frame); else raf = 0;
  }
  function burst(x, y, cols, n, spd, life, grav, sz) {
    cv();
    for (var i = 0; i < n; i++) (function (i) {
      var a = Math.random() * Math.PI * 2, v = spd * (.4 + Math.random() * .8);
      var p = { x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .3, s: (sz || 4) * (.6 + Math.random() * .8), c: cols[i % cols.length], sq: i % 3 === 0, r: Math.random() * 6 };
      items.push({ t: 0, life: life * (.75 + Math.random() * .5), draw: function (it, dt) {
        p.vx *= Math.pow(.93, dt); p.vy = p.vy * Math.pow(.93, dt) + (grav || .25) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += .2 * dt;
        CX.globalAlpha = Math.max(0, 1 - it.t / it.life); CX.fillStyle = p.c; CX.translate(p.x, p.y); CX.rotate(p.r);
        if (p.sq) CX.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); else { CX.beginPath(); CX.arc(0, 0, p.s * .7, 0, 6.283); CX.fill(); }
      } });
    })(i);
    go();
  }
  function ring(x, y, col, r, life, w) {
    cv(); items.push({ t: 0, life: life, draw: function (it) { var k = 1 - Math.pow(1 - it.t / it.life, 3);
      CX.strokeStyle = col; CX.globalAlpha = 1 - it.t / it.life; CX.lineWidth = w * (1 - k) + .5; CX.beginPath(); CX.arc(x, y, r * k, 0, 6.283); CX.stroke(); } }); go();
  }
  function pillar(x, col, life) {
    cv(); items.push({ t: 0, life: life, draw: function (it) { var k = it.t / it.life, a = k < .15 ? k / .15 : 1 - (k - .15) / .85;
      var w = 140 * (1 - k * .5), g = CX.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, col); g.addColorStop(1, "rgba(255,255,255,0)");
      CX.globalCompositeOperation = "lighter"; CX.globalAlpha = a * .8; CX.fillStyle = g; CX.fillRect(x - w, 0, w * 2, innerHeight); } }); go();
  }
  function shake(px, ms) {
    if (RM) return; var root = D.querySelector("main") || D.body; if (!root.animate) return;
    var f = []; for (var i = 0; i < 6; i++) { var d = px * (1 - i / 6); f.push({ transform: "translate(" + (i % 2 ? d : -d) + "px," + (i % 3 - 1) * d * .4 + "px)" }); }
    f.push({ transform: "none" }); root.animate(f, { duration: ms, easing: "ease-out" });
  }
  function hitstop(ms) { freezeUntil = performance.now() + ms; }

  /* ── HUD 와 XP ── */
  var XP = parseInt(lsGet("terra.zz.xp") || "0", 10) || 0, PER = 100, HUD = null, hudT = 0;
  function hud() {
    if (HUD && HUD.isConnected) return HUD;
    HUD = add("", "", "", 0); HUD.id = "zz-hud"; HUD.innerHTML = '<span class="lv"></span><span class="bar"><i></i></span><span class="pt"></span>';
    paintHud(); return HUD;
  }
  function paintHud() { if (!HUD) return; HUD.querySelector(".lv").textContent = "LV " + (Math.floor(XP / PER) + 1);
    HUD.querySelector("i").style.width = (XP % PER) + "%"; HUD.querySelector(".pt").textContent = (XP % PER) + "/" + PER; }
  /* 맨 위에 붙은 머리줄(fixed·sticky, 높이 140px 이하)이 있으면 그 아래로 내린다 — 폰에서 XP 표시줄이 머리줄 제목·단추를 1~2초 가렸다(2026-10-13) */
  function placeHud(h) { var top = 12; try { [.25, .5, .75].map(function (r) { return W.innerWidth * r; }).concat([W.innerWidth - 20]).forEach(function (x) {
    var e = D.elementFromPoint(x, 2); while (e && e !== D.body && e !== D.documentElement) { var p = getComputedStyle(e).position;
      if (p === "fixed" || p === "sticky") { var r = e.getBoundingClientRect(); if (r.height <= 140 && r.bottom > 0) top = Math.max(top, Math.round(r.bottom + 6)); break; }
      e = e.parentElement; } }); } catch (e) { } h.style.top = top + "px"; }
  function showHud() { var h = hud(); placeHud(h); void h.offsetWidth; h.classList.add("on"); clearTimeout(hudT); hudT = setTimeout(function () { h.classList.remove("on"); }, 2600); return h; }
  function flyXp(from, amount, done) {
    var h = showHud(), to = h.getBoundingClientRect(), tx = to.left + 30, ty = (parseFloat(h.style.top) || 12) + to.height / 2;
    var x0 = from.left + from.width / 2, y0 = from.top + from.height * .3;
    var chip = add("zz-xp", "", "+" + amount + " XP", 1200);
    var cx1 = x0 + (tx - x0) * .2, cy1 = Math.min(y0, ty) - 140;
    var t0 = performance.now(), dur = RM ? 1 : 620;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = k < .2 ? 0 : (k - .2) / .8; e = e * e * (3 - 2 * e);
      var pop = k < .2 ? 1 + Math.sin(k / .2 * Math.PI) * .35 : 1 - e * .35;
      var x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx1 + e * e * tx, y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy1 + e * e * ty - (k < .2 ? k / .2 * 26 : 26 * (1 - e));
      chip.style.transform = "translate(" + (x - 36) + "px," + (y - 14) + "px) scale(" + pop + ")";
      if (k < 1) requestAnimationFrame(step); else { chip.remove(); if (done) done(); }
    })(t0);
  }
  function gainXp(n, from) {
    var lvBefore = Math.floor(XP / PER);
    flyXp(from, n, function () {
      XP += n; lsSet("terra.zz.xp", String(XP)); paintHud(); play("coin", { vol: .5 });
      HUD.classList.remove("hit"); void HUD.offsetWidth; HUD.classList.add("hit");
      var r = HUD.getBoundingClientRect(); burst(r.left + 40, r.top + r.height / 2, ["#FFCB3D", "#F59E0B", "#fff"], 10, 5, 22, .15, 3);
      if (Math.floor(XP / PER) > lvBefore) setTimeout(function () { levelUp(Math.floor(XP / PER) + 1); }, 250);
    });
  }

  /* ══════════ 장면 ══════════ */
  var combo = 0; try { combo = parseInt(sessionStorage.getItem("terra.zz.combo") || "0", 10) || 0; } catch (e) { }
  var seenTier = {}; try { seenTier = JSON.parse(sessionStorage.getItem("terra.zz.tiers") || "{}"); } catch (e) { }
  function saveCombo() { try { sessionStorage.setItem("terra.zz.combo", String(combo)); sessionStorage.setItem("terra.zz.tiers", JSON.stringify(seenTier)); } catch (e) { } }

  function okScene(src) {
    combo++; saveCombo();
    play("ok", { semi: Math.min(combo - 1, 12), vol: .9 }); if (combo === 1) play("okTail", { vol: .35, delay: 60 });
    var r = rect(src) || { left: innerWidth / 2 - 60, top: innerHeight / 2 - 30, width: 120, height: 60, right: innerWidth / 2 + 60, bottom: innerHeight / 2 + 30 };
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (src && src.animate) {
      src.animate([{ boxShadow: "0 0 0 0 " + GREEN + "00" }, { boxShadow: "0 0 0 6px " + GREEN + "AA, 0 0 26px 6px " + GREEN + "66", offset: .25 }, { boxShadow: "0 0 0 0 " + GREEN + "00" }],
        { duration: 650, delay: 20, easing: "ease-out" });
      src.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: .3 }, { transform: "scale(.99)", offset: .6 }, { transform: "scale(1)" }],
        { duration: 420, delay: 20, easing: "cubic-bezier(.2,1.5,.4,1)" });
    }
    if (!RM) setTimeout(function () { burst(cx, cy, [GREEN, "#7CF5B5", "#FFD54A", "#fff"], 16, 7, 34, .3, 4); ring(cx, cy, GREEN, Math.max(r.width, r.height) * .75, 22, 5); }, 50);
    var s = Math.max(30, Math.min(54, r.height * .55));
    setTimeout(function () { add("zz-chk", "left:" + (r.right - s * .75) + "px;top:" + (r.top + r.height / 2) + "px;--s:" + s + "px",
      '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19"/><path d="M11 21 L17.5 27 L29 14"/></svg>', 950); }, 100);
    setTimeout(function () { gainXp(10, r); }, 160);
    var T = null; for (var i = TIERS.length - 1; i >= 0; i--) if (combo === TIERS[i].n) { T = TIERS[i]; break; }
    if (T) setTimeout(function () { tierBanner(T); }, 260);
  }
  function tierBanner(T) {
    var first = !seenTier[T.n]; seenTier[T.n] = 1; saveCombo(); bannerUntil = Date.now() + 1650;
    play(T.n >= 10 ? "tierBig" : "tier", { vol: first ? .8 : .45 });
    play("ok", { semi: Math.min(T.n - 1, 12) + 7, vol: .35, delay: 120 });
    if (!first) { add("zz-ban", "--c1:" + T.c1 + ";--c2:" + T.c2 + ";transform:scale(.7);top:6%", '<div class="bg"></div><div class="tx">' + TXT.run(T.n) + "</div>", 1650); return; }
    hitstop(70); shake(T.n >= 10 ? 8 : 4, 380);
    add("zz-ban", "--c1:" + T.c1 + ";--c2:" + T.c2, '<div class="bg"></div><div class="tx">' + T.name + "<small>" + TXT.run(T.n) + "</small></div>", 1650);
    if (!RM) burst(innerWidth / 2, innerHeight * .13 + 48, [T.c1, T.c2, "#fff", "#FFD54A"], T.n >= 10 ? 60 : 34, 12, 46, .22, 5);
  }
  function noScene(src) {
    var had = combo; combo = 0; saveCombo();
    play("no", { vol: .7 });
    if (had >= 3) play("ok", { semi: -5, vol: .25, delay: 90 });
    if (src && src.animate) {
      src.animate([{ transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "none" }],
        { duration: 380, easing: "ease-out" });
      src.animate([{ boxShadow: "0 0 0 0 " + RED + "00" }, { boxShadow: "0 0 0 5px " + RED + "99", offset: .3 }, { boxShadow: "0 0 0 0 " + RED + "00" }], { duration: 600 });
    }
  }
  var bannerUntil = 0, bigUntil = 0;
  function bigScene(c1, c2, emblemText, title, sub, sound) {
    var wait = Math.max(bannerUntil, bigUntil) - Date.now();   /* 배너·다른 큰 장면과 겹치지 않게 줄 세움 */
    if (wait > 0) { setTimeout(function () { bigScene(c1, c2, emblemText, title, sub, sound); }, wait + 60); return; }
    bigUntil = Date.now() + 2700;
    play("whoosh", { vol: .6 });
    add("zz-dim", "", "", 2600);
    add("zz-peek", "--c2:" + c2, "", 900);
    setTimeout(function () {
      hitstop(90); play("slam", { vol: .9 }); play(sound, { vol: .9, delay: 60 }); shake(9, 450);
      var x = innerWidth / 2, y = innerHeight * .44;
      if (!RM) { pillar(x, c2, 110); ring(x, y, "#fff", Math.max(innerWidth, innerHeight) * .6, 40, 14); ring(x, y, c2, Math.max(innerWidth, innerHeight) * .45, 52, 8);
        burst(x, y, [c1, c2, "#fff", "#FFD54A"], 90, 16, 80, .2, 6); }
    }, 880);
    add("zz-emb", "--c1:" + c1 + ";--c2:" + c2, '<div class="ring"></div><div class="core"></div><b>' + emblemText + "</b>", 2600);
    add("zz-big", "--c2:" + c2, title + (sub ? "<small>" + sub + "</small>" : ""), 2600);
  }
  function levelUp(n) { bigScene("#7B3FF2", "#FFD54A", String(n), TXT.lvT, TXT.lvS(n), "levelup"); }
  var GRADE = { C: ["#6B7280", "#D1D5DB"], B: ["#1D4ED8", "#7CB4FF"], A: ["#C81E1E", "#FF8A8A"], S: ["#B88A00", "#FFE066"] };
  function promote(from, to) { var g = GRADE[to] || GRADE.S; bigScene(g[0], g[1], to, TXT.prT(to), from ? from + " → " + to : "", to === "S" ? "fanfare" : "levelup"); }
  function stars(n) {
    if (!(n >= 1)) return;   /* 별 0개는 부르지 않는다(40% 미만) */
    var wait = Math.max(bannerUntil, bigUntil) - Date.now();
    if (wait > 0) { setTimeout(function () { stars(n); }, wait + 60); return; }
    bigUntil = Date.now() + 2500;
    var box = add("zz-stars", "", "", 2600);
    for (var i = 0; i < 3; i++) (function (i) {
      setTimeout(function () {
        var on = i < n, d = D.createElement("div"); d.className = "zz-star";
        d.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.6 7.1.8-5.3 4.9 1.5 7.1L12 17.6 5.6 21.2l1.5-7.1L1.8 9.2l7.1-.8z" fill="' + (on ? "#FFC93C" : "#D9DCE1") + '" stroke="#fff" stroke-width="1.4"/></svg>';
        box.appendChild(d);
        if (on) { play("star", { semi: i * 4, vol: .8 });
          setTimeout(function () { var rr = d.getBoundingClientRect(); burst(rr.left + 42, rr.top + 42, ["#FFC93C", "#FFF3B0", "#fff"], i === 2 ? 40 : 14, i === 2 ? 11 : 6, 36, .25, 4);
            if (i === 2) { shake(6, 320); hitstop(60); } }, 300); }
      }, 350 * i);
    })(i);
    setTimeout(function () { box.style.animation = "zzOut .4s ease forwards"; }, 2100);
  }

  /* ══════════ 누름·고름 ══════════ */
  var TAP = "button,a.btn,a.b,a.row,a.card,a.subj,a.topic,[role=button],.opt,.choice,label,summary,.seg,.chip,.it";
  function tapEl(t) { var el = t && t.closest ? t.closest(TAP) : null; return el && !el.disabled && !el.closest("#zz-fx") ? el : null; }
  var lastTapEl = null, lastTapAt = 0;
  D.addEventListener("pointerdown", function (e) {
    var el = tapEl(e.target); if (!el || !el.animate) return;
    if (el.__zzA) el.__zzA.cancel();
    el.__zzA = el.animate([{ transform: "none", filter: "brightness(1)" }, { transform: "translateY(3px) scale(.985)", filter: "brightness(.94)" }],
      { duration: 70, fill: "forwards", easing: "ease-out" });
  }, true);
  function release(e) {
    var el = tapEl(e.target); if (!el || !el.__zzA) return; el.__zzA.cancel(); el.__zzA = null;
    el.animate([{ transform: "translateY(3px) scale(.985)" }, { transform: "translateY(-2px) scale(1.01)", offset: .45 }, { transform: "none" }],
      { duration: 260, easing: "cubic-bezier(.2,1.4,.4,1)" });
  }
  D.addEventListener("pointerup", release, true); D.addEventListener("pointercancel", release, true);
  D.addEventListener("click", function (e) { var el = tapEl(e.target); if (!el) return; lastTapEl = el; lastTapAt = Date.now(); play("tap", { vol: .55 }); }, true);

  function isSel(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true" || el.checked) return true;
    var c = el.classList; return !!c && (c.contains("on") || c.contains("pick") || c.contains("sel") || c.contains("active"));
  }
  var was = new WeakMap();
  var OKS = '[data-s="ok"],.verdict.good,.verdict.ok,.msg.ok', NOS = '[data-s="no"],.verdict.warn,.verdict.bad,.verdict.no,.msg.no';
  function pickScene(el) {
    var r = rect(el); if (!r || r.width > innerWidth * .9 || el.closest("nav,header,.tabbar,.nav,.bottom")) return;
    if (el.matches(OKS + "," + NOS) || el.hasAttribute("data-s")) return;   /* 답을 낸 뒤 정답 칸에 다는 data-s="ans" 도 「고름」 으로 세지 않는다(중개사 2026-10-09) */
    play("pick", { vol: .7 });
    if (el.animate) el.animate([{ boxShadow: "inset 0 0 0 0 " + ACC + "00" }, { boxShadow: "inset 0 0 0 3px " + ACC + ", 0 0 0 4px " + ACC + "33", offset: .3 }, { boxShadow: "inset 0 0 0 0 " + ACC + "00" }],
      { duration: 520, easing: "ease-out" });
    if (!RM) burst(r.left + r.width / 2, r.top + r.height / 2, [ACC, "#FFD54A", "#fff"], 8, 4.5, 22, .18, 3);
  }

  /* ══════════ 감시 ══════════ */
  var lastJudge = 0, judgedTap = -1, ready = false;
  /* 판정: 누른 뒤 첫 신호에서 40ms 기다렸다가 한 번 정한다. 화면은 오답 때도 「정답 단추」에 ok 표시를 달기 때문에
     ① 내가 누른 단추의 표시 ② 판정 상자(.verdict) ③ 첫 신호 순으로 본다. */
  var pend = 0, quietUntil = 0;   /* ZZ.quiet(ms): 화면을 다시 그리며 옛 답 표시가 새로 생길 때 자동 판정을 잠시 끈다(문항 넘김·채점 때 헛 소리 방지) */
  function judge(ok, el, forced) {
    var now = Date.now();
    /* 화면이 직접 부른 판정(ZZ.ok/no, CHEER 위임)이 먼저면 같은 누름의 자동 판정은 건너뛴다 — 개념어 판정 상자(.verdict.good)가 한 번 더 터뜨렸다(2026-10-09) */
    if (forced) { lastJudge = now; judgedTap = lastTapAt; if (pend) { clearTimeout(pend); pend = 0; } (ok ? okScene : noScene)(el); return; }
    if (now < quietUntil || now - lastTapAt > 1500 || judgedTap === lastTapAt || pend) return;
    var tap = lastTapAt, first = ok;
    pend = setTimeout(function () {
      pend = 0; if (judgedTap === tap) return; judgedTap = tap; lastJudge = Date.now();
      var t = lastTapEl, res = first;
      if (t && (t.matches(NOS) || t.closest(NOS))) res = false;
      else if (t && (t.matches(OKS) || t.closest(OKS))) res = true;
      /* 「고른 뒤 다음」 으로 확정하는 화면(통사 진단)은 누른 것이 「다음」 이다. 앱은 고른 오답에만 no 를 다니 no 가 있으면 오답(2026-10-09) */
      else if (D.querySelector('[data-s="no"]')) res = false;
      else if (D.querySelector('[data-s="ok"]')) res = true;
      else if (D.querySelector(".verdict.warn,.verdict.bad,.verdict.no,.msg.no")) res = false;
      else if (D.querySelector(".verdict.good,.verdict.ok,.msg.ok")) res = true;
      (res ? okScene : noScene)(t || el);
    }, 40);
  }
  new MutationObserver(function (ms) {
    var added = [];
    ms.forEach(function (m) {
      if (m.type === "childList") [].forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1 || (n.closest && n.closest("#zz-fx"))) return; added.push(n); if (!ready) return;
        if (n.matches(OKS) || n.querySelector(OKS)) judge(true, n); else if (n.matches(NOS) || n.querySelector(NOS)) judge(false, n);
      });
      else { var t = m.target; if (!t.matches || t.closest("#zz-fx")) return;
        if (ready && (m.attributeName === "data-s" || m.attributeName === "class")) { if (t.matches(OKS)) judge(true, t); else if (t.matches(NOS)) judge(false, t); }
        var now = isSel(t), before = was.get(t); if (ready && now && !before && Date.now() - lastTapAt < 900) pickScene(t); was.set(t, now); }
    });
    if (ready && added.length && !RM) enter(added);
  }).observe(D.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected", "aria-checked", "class", "data-s"] });
  var ENTER = ".card,.row,.it,li,.subj,.stat,.mrow,.panel,article,.q,.box";
  function enter(nodes) { var i = 0; nodes.forEach(function (n) {
    if (n.nodeType !== 1 || n.closest("#zz-fx")) return;
    (n.matches(ENTER) ? [n] : [].slice.call(n.querySelectorAll(ENTER), 0, 20)).forEach(function (el) {
      var r = el.getBoundingClientRect(); if (!r.height || r.top > innerHeight || el.classList.contains("zz-in")) return;
      el.style.animationDelay = Math.min(i++ * 40, 480) + "ms"; el.classList.add("zz-in");
      setTimeout(function () { el.classList.remove("zz-in"); el.style.animationDelay = ""; }, 1100); }); }); }
  [].forEach.call(D.querySelectorAll(TAP), function (el) { was.set(el, isSel(el)); });
  if (!RM) enter([D.querySelector("main") || D.body]);
  setTimeout(function () { ready = true; }, 350);

  W.ZZ.ok = function (el) { lastJudge = 0; judge(true, el, true); };
  W.ZZ.no = function (el) { lastJudge = 0; judge(false, el, true); };
  W.ZZ.levelUp = levelUp; W.ZZ.promote = promote; W.ZZ.stars = stars;
  W.ZZ.quiet = function (ms) { quietUntil = Date.now() + (ms || 600); if (pend) { clearTimeout(pend); pend = 0; } };
  W.ZZ.setCombo = function (c) { combo = c | 0; seenTier = {}; saveCombo(); };
  W.ZZ.combo = function () { return combo; };
  }
})();
