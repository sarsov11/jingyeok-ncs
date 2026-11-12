/* 로그인 단추 — 일반 앱 로그인 화면 그대로 (대표님 2026-09-15 "일반 어플에서 하는 UI 그대로 모방")
 *
 *   카카오  #FEE500 바탕 · #191919 글자 · 말풍선 심벌 왼쪽 · "카카오로 시작하기"   (카카오 디자인 가이드)
 *   구글    흰 바탕 · #DADCE0 테두리 · 4색 G 로고 · "Google 계정으로 계속하기"   (구글 브랜딩 가이드)
 *   네이버  #03C75A 바탕 · 흰 N · "네이버로 시작하기"  — 2단계라 지금은 "준비 중" 으로 흐리게
 *
 *   단추는 폭을 꽉 채우고 세로로 쌓는다. 높이 52px. 사이에 다른 말 없음.
 *   글자는 브랜드 문구 그대로 두고, 우리 말투 규칙(가운뎃점·카드 금지)은 그 밖의 문장에만 적용한다.
 */
(function () {
  var K = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.31 4.66 6.73-.2.72-.74 2.64-.85 3.05-.13.5.18.49.39.36.16-.1 2.58-1.75 3.62-2.46.7.1 1.43.16 2.18.16 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>';
  var G = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  var N = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M16.27 3v9.31L7.83 3H3v18h4.73v-9.31L16.17 21H21V3z"/></svg>';

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* host 에 그린다. opt.naver 를 true 로 주면 네이버 단추도 그린다(2단계 전에는 흐리게) */
  function draw(host, opt) {
    opt = opt || {};
    var A = window.AUTH;
    if (!host) return;
    function 준비중() {
      host.innerHTML = '<div class="lgbox">' + (opt.title ? '<h3 class="lgtitle">' + esc(opt.title) + '</h3>' : '') + '<p class="lgnote">로그인 준비 중. 기록은 이 기기에 저장되고, <a href="settings.html#savesec">기록 옮기기</a>로 백업할 수 있습니다</p></div>';
    }
    if (!A || !A.on) { host.innerHTML = ""; host.hidden = true; return; }   /* 서버 연결이 꺼져 있으면 로그인 칸을 만들지 않는다 */
    /* 서버 건강 확인이 실패하면 단추를 감춘다. 30초마다 다시 확인해 살아나면 단추가 나온다. */
    A.서버확인().then(function (ok) {
      if (!ok) {
        준비중();
        if (!host._lgRetry) host._lgRetry = setTimeout(function () {
          host._lgRetry = null;
          A.서버확인(true).then(function () { draw(host, opt); });
        }, 30000);
        return;
      }
      그리기();
    });
    function 그리기() {
    A.사용자().then(function (u) {
      if (u && !u.is_anonymous) {   /* 연구 수집용 익명 계정은 로그인으로 치지 않는다 */
        var nm = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name || u.user_metadata.preferred_username)) || u.email || "로그인됨";
        host.innerHTML = '<div class="lgbox"><p class="lgwho"><b>' + esc(nm) + '</b> 계정에 저장 중</p>' +
          '<button type="button" class="lgout" id="lgOut">로그아웃</button></div>';
        host.querySelector("#lgOut").onclick = function () { A.로그아웃().then(function () { draw(host, opt); }); };
        return;
      }
      host.innerHTML = '<div class="lgbox">' +
        (opt.title ? '<h3 class="lgtitle">' + esc(opt.title) + '</h3>' : '') +
        (opt.sub ? '<p class="lgsub">' + esc(opt.sub) + '</p>' : '') +
        '<button type="button" class="lgbtn kakao" id="lgKakao">' + K + '<span>카카오로 시작</span></button>' +
        '<button type="button" class="lgbtn google" id="lgGoogle">' + G + '<span>Google 계정으로 계속하기</span></button>' +
        (opt.naver === false ? '' :
          '<button type="button" class="lgbtn naver" disabled aria-disabled="true">' + N + '<span>네이버로 시작</span><em>준비 중</em></button>') +
        (opt.skip ? '<a class="lgskip" href="' + esc(opt.skip) + '">나중에</a>' : '') +
        '</div>';
      host.querySelector("#lgKakao").onclick = function () { A.로그인("kakao"); };
      host.querySelector("#lgGoogle").onclick = function () { A.로그인("google"); };
    });
    }
  }

  window.LOGINUI = { draw: draw };
})();
