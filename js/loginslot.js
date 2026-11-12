/* 설정 화면 맨 아래 「기록 저장」 구역 (2026-11-12, 로그인심기.py 가 전 서비스 settings.html 에 심는다)
   통사는 settings.html 에 저장 구역이 따로 있어 쓰지 않는다. 서버가 꺼져 있으면 아무것도 그리지 않는다. */
(function () {
  if (!window.AUTH || !AUTH.on || !window.LOGINUI) return;
  if (document.getElementById("terraSave")) return;
  var 칸 = document.createElement("section");
  칸.id = "terraSave";
  칸.style.cssText = "max-width:560px;margin:28px auto 96px;padding:0 16px";
  칸.innerHTML = '<h3 style="margin:0 0 4px;font-size:18px">기록 저장</h3>' +
    '<p style="margin:0 0 12px;font-size:14px;opacity:.7">로그인하면 폰을 바꿔도 푼 기록이 그대로 남습니다.</p><div id="terraSaveBox"></div>';
  var 자리 = document.querySelector("main") || document.body;
  자리.appendChild(칸);
  LOGINUI.draw(document.getElementById("terraSaveBox"), { naver: true });
})();
