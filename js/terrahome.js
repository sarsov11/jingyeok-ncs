/* 테라러닝 홈 단추 — 테라러닝 공용 (2026-10-21 대표님 「서비스 안으로 들어오면 테라러닝 홈으로 나갈 방법이 없음」)
 *  앱의 모든 화면에 한 줄로 붙인다. 누르면 https://teralearning.kr 로 간다.
 *
 *  <script src="js/terrahome.js" defer></script>                         화면 왼쪽 위에 작은 단추(기본)
 *  <script src="js/terrahome.js" data-slot="#topbar .left" defer></script>  앱 머리줄의 자리에 넣기(겹침 없음, 권장)
 *  <script src="js/terrahome.js" data-pos="bottom-left" defer></script>  아래 왼쪽(아래 탭 막대가 없는 앱)
 *  data-hide="1" 이면 단추를 그리지 않고 TerraHome.url·TerraHome.go() 만 둔다(앱 메뉴에 직접 넣을 때).
 *  앱 안에서 이미 홈 단추를 그렸으면(.th-home 이 있으면) 아무것도 하지 않는다.
 */
(function () {
  "use strict";
  var D = document, W = window;
  if (W.TerraHome) return;
  var me = D.currentScript, URL_ = "https://teralearning.kr/";
  var LANG = (D.documentElement.getAttribute("lang") || "ko").toLowerCase().slice(0, 2);
  var LABEL = { ko: "테라러닝", ja: "テララーニング", en: "Terra Learning" }[LANG] || "테라러닝";
  var TIP = { ko: "테라러닝 홈으로", ja: "テララーニングのホームへ", en: "Back to Terra Learning" }[LANG] || "테라러닝 홈으로";
  function go() { try { W.location.href = URL_; } catch (e) { } }
  W.TerraHome = { url: URL_, go: go };
  var opt = { slot: me && me.getAttribute("data-slot"), pos: (me && me.getAttribute("data-pos")) || "top-left", hide: me && me.getAttribute("data-hide") === "1" };
  if (opt.hide) return;

  var css = [
    ".th-home{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px 0 7px;border-radius:999px;background:rgba(255,255,255,.92);color:#16181D;",
    " border:1px solid rgba(0,0,0,.12);font:800 12.5px/1 'Pretendard','Noto Sans KR','Noto Sans JP',system-ui,sans-serif;letter-spacing:-.01em;text-decoration:none;",
    " box-shadow:0 2px 8px rgba(0,0,0,.08);-webkit-tap-highlight-color:transparent;white-space:nowrap}",
    ".th-home:hover{background:#fff}.th-home:active{transform:scale(.97)}",
    ".th-home svg{width:15px;height:15px;flex:none}",
    ".th-home.fix{position:fixed;z-index:2147479000}",
    ".th-home.fix.tl{left:max(10px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top))}",
    ".th-home.fix.bl{left:max(12px,env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom,0px))}",
    "@media (prefers-color-scheme:dark){.th-home.auto{background:rgba(30,32,38,.92);color:#F2F4F8;border-color:rgba(255,255,255,.16)}}",
    "@media print{.th-home{display:none!important}}"
  ].join("\n");
  /* 왼쪽 화살표 + 「테라러닝」: 앱 밖 테라러닝 홈으로 나간다 */
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';

  function mount() {
    if (D.querySelector(".th-home")) return;
    if (!D.getElementById("th-style")) { var st = D.createElement("style"); st.id = "th-style"; st.textContent = css; D.head.appendChild(st); }
    var a = D.createElement("a");
    a.className = "th-home auto"; a.href = URL_; a.title = TIP; a.setAttribute("aria-label", TIP);
    a.innerHTML = ICON + "<span>" + LABEL + "</span>";
    var host = opt.slot ? D.querySelector(opt.slot) : null;
    if (host) { host.insertBefore(a, host.firstChild); return; }
    a.className += " fix " + (opt.pos === "bottom-left" ? "bl" : "tl");
    D.body.appendChild(a);
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", mount); else mount();
})();
