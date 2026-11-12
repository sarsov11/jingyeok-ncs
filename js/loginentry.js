/* 설정 화면이 없는 서비스의 로그인 자리 (2026-11-12 시안)
   <script src="js/loginentry.js" data-mode="corner|band|after"></script>  — auth.js 뒤에 둔다.
   corner : 오른쪽 아래 떠 있는 「기록 저장」 단추 → 아래에서 올라오는 로그인 판
   band   : 화면 맨 위 얇은 띠 「로그인하면 기록이 남아요」 · 닫으면 7일 뒤 다시
   after  : 몇 문제 풀고 나서 한 번 올라오는 로그인 판(통사 방식) + 작은 단추
   로그인한 사람에게는 띠·판을 띄우지 않고, 단추는 계정 첫 글자로 바뀐다. 서버가 꺼져 있으면 아무것도 안 그린다. */
(function () {
  if (!window.AUTH || !AUTH.on) return;
  var me = document.currentScript;
  var 방식 = (me && me.getAttribute("data-mode")) || "corner";
  var 몇문제 = +((me && me.getAttribute("data-after")) || 5);
  var 기본 = (me && me.src || "").replace(/js\/loginentry\.js.*$/, "");
  /* 여러 서비스가 한 주소(github.io)를 같이 써서 기기 저장소도 같다 → 「한 번 물었음」은 서비스(폴더)마다 따로 */
  var 물음키 = "terra.sync.asked." + 기본.replace(/^https?:\/\/[^/]+/, "");

  function 싣기(src, css) {
    return new Promise(function (ok) {
      var e = document.createElement(css ? "link" : "script");
      if (css) { e.rel = "stylesheet"; e.href = 기본 + src; } else { e.src = 기본 + src; }
      e.onload = e.onerror = function () { ok(); };
      document.head.appendChild(e);
    });
  }
  var 준비 = window.LOGINUI ? Promise.resolve() : Promise.all([싣기("js/loginui.js"), 싣기("css/login.css", true)]);

  var st = document.createElement("style");
  st.textContent =
    ".tle-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9000;display:flex;align-items:center;gap:6px;height:44px;padding:0 16px 0 12px;border:0;border-radius:22px;background:#1b2330;color:#fff;font:600 14px/1 inherit;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer}" +
    ".tle-fab.in{width:44px;padding:0;justify-content:center;font-size:17px;background:#fff;color:#1b2330;border:1.5px solid #1b2330}" +
    ".tle-fab svg{width:18px;height:18px}" +
    ".tle-band{position:sticky;top:0;z-index:9000;display:flex;align-items:center;gap:10px;padding:9px 14px;background:#1b2330;color:#fff;font-size:14px}" +
    ".tle-band b{font-weight:600}.tle-band span{flex:1}" +
    ".tle-band .go{border:0;border-radius:16px;padding:7px 14px;background:#fff;color:#1b2330;font:600 13px/1 inherit;cursor:pointer}" +
    ".tle-band .x{border:0;background:none;color:#fff;opacity:.6;font-size:18px;cursor:pointer;padding:0 2px}" +
    ".tle-dim{position:fixed;inset:0;z-index:9500;background:rgba(10,14,20,.45);display:flex;align-items:flex-end;justify-content:center}" +
    ".tle-sheet{width:100%;max-width:480px;background:#fff;color:#1b2330;border-radius:18px 18px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.2)}" +
    ".tle-sheet h3{margin:0 0 6px;font-size:19px}.tle-sheet p{margin:0 0 16px;font-size:14px;opacity:.75;line-height:1.5}" +
    ".tle-sheet .later{display:block;margin:12px auto 0;border:0;background:none;color:#6b7380;font-size:14px;cursor:pointer}";
  document.head.appendChild(st);

  function 판열기(제목, 말) {
    준비.then(function () {
      if (document.querySelector(".tle-dim")) return;
      var dim = document.createElement("div"); dim.className = "tle-dim";
      dim.innerHTML = '<div class="tle-sheet" role="dialog" aria-label="기록 저장"><h3>' + 제목 + "</h3><p>" + 말 +
        '</p><div class="tle-box"></div><button class="later" type="button">나중에</button></div>';
      dim.onclick = function (e) { if (e.target === dim || e.target.className === "later") dim.remove(); };
      document.body.appendChild(dim);
      if (window.LOGINUI) LOGINUI.draw(dim.querySelector(".tle-box"), { naver: true });
    });
  }
  var 사람 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.5 19a4.5 4.5 0 0 0 0-9h-.6A7 7 0 1 0 5 16.3"/><path d="M12 12v8m-3-3 3 3 3-3"/></svg>';

  /* 아래 탭 막대(고정)가 있으면 그 위로 띄운다 — 중개사·국어 폰 화면에서 탭 막대를 덮던 것.
     탭 막대는 첫 화면(소개)이 끝난 뒤에 생기기도 해서 1초마다 화면 맨 아래 한 점만 본다(가볍다). */
  function 바닥높이() {
    var H = innerHeight, 점 = document.elementsFromPoint ? document.elementsFromPoint(innerWidth / 2, H - 3) : [];
    for (var i = 0; i < 점.length; i++) {
      for (var e = 점[i]; e && e !== document.body; e = e.parentElement) {
        if (e.classList && (e.classList.contains("tle-fab") || e.classList.contains("tle-dim"))) break;
        var p = getComputedStyle(e).position; if (p !== "fixed" && p !== "sticky") continue;
        var r = e.getBoundingClientRect();
        if (r.height < H * 0.3 && r.width > innerWidth * 0.6 && Math.abs(r.bottom - H) < 4) return r.height;
        break;
      }
    }
    return 0;
  }
  function 자리잡기() { var b = document.querySelector(".tle-fab"); if (!b) return; var h = 바닥높이(); b.style.bottom = h ? (h + 12) + "px" : ""; }
  setInterval(자리잡기, 1000); addEventListener("resize", 자리잡기);
  function 단추(u) {
    var b = document.querySelector(".tle-fab");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "tle-fab"; document.body.appendChild(b); }
    자리잡기();
    if (u) {
      var 이름 = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email || "나";
      b.className = "tle-fab in"; b.textContent = 이름.charAt(0); b.setAttribute("aria-label", "내 계정");
      b.onclick = function () { 판열기("내 계정", "기록이 이 계정에 저장되고 있습니다."); };
    } else {
      b.className = "tle-fab"; b.innerHTML = 사람 + "<span>기록 저장</span>"; b.setAttribute("aria-label", "기록 저장");
      b.onclick = function () { 판열기("기록 저장", "로그인하면 폰을 바꿔도 푼 기록이 그대로 남습니다."); };
    }
  }
  function 띠() {
    var 닫음 = +(localStorage.getItem("terra.sync.bandoff") || 0);
    if (Date.now() - 닫음 < 7 * 864e5 || document.querySelector(".tle-band")) return;
    var d = document.createElement("div"); d.className = "tle-band";
    d.innerHTML = '<span>폰을 바꿔도 <b>기록이 남게</b></span><button class="go" type="button">로그인</button><button class="x" type="button" aria-label="닫기">×</button>';
    d.querySelector(".go").onclick = function () { 판열기("기록 저장", "로그인하면 폰을 바꿔도 푼 기록이 그대로 남습니다."); };
    d.querySelector(".x").onclick = function () { try { localStorage.setItem("terra.sync.bandoff", Date.now()); } catch (e) {} d.remove(); };
    document.body.insertBefore(d, document.body.firstChild);
  }
  /* 풀이 수는 서비스마다 저장 모양이 달라 「기록 내용이 바뀐 횟수」로 센다(답할 때마다 바뀐다) */
  function 지켜보기() {
    if (localStorage.getItem(물음키)) return;
    var 전 = null, 번 = 0;
    var t = setInterval(function () {
      var s = ""; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (!/^(terra\.sync|terra\.rs|sb-)/.test(k)) s += k + (localStorage.getItem(k) || "").length; } } catch (e) {}
      if (전 !== null && s !== 전) 번++;
      전 = s;
      if (번 >= 몇문제) {
        clearInterval(t); try { localStorage.setItem(물음키, "1"); } catch (e) {}
        판열기("푼 기록이 쌓이고 있습니다", "로그인해 두면 이 기록이 폰을 바꿔도 남습니다.");
      }
    }, 1500);
  }

  function 그리기(u) {
    var 들어옴 = u && !u.is_anonymous;
    if (방식 === "band") { if (!들어옴) 띠(); else { var b = document.querySelector(".tle-band"); if (b) b.remove(); } 단추(들어옴 ? u : null); if (!들어옴) document.querySelector(".tle-fab").style.display = "none"; }
    else { 단추(들어옴 ? u : null); if (방식 === "after" && !들어옴) 지켜보기(); }
  }
  function 시작() {
    var c = window.SUPA && SUPA.client && SUPA.client();
    if (!c) return 그리기(null);
    c.auth.getSession().then(function (r) { 그리기(r && r.data && r.data.session && r.data.session.user); });
    c.auth.onAuthStateChange(function (ev, s) { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") 그리기(s && s.user); });
  }
  if (document.body) 시작(); else document.addEventListener("DOMContentLoaded", 시작);
})();
