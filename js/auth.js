/* 회원 · 기록 동기화 · 푸시 구독 — Supabase 하나로 (2026-09-15 대표님 지시)
 *
 * ★ 키는 js/supa.config.js 에 둔다 (배포꾸리기.py 가 같이 싣는다).
 *      window.SUPA = { url: "https://xxxx.supabase.co", anon: "eyJ...", vapid: "B..." };
 *   이 파일이 없거나 비어 있으면 **아무 일도 안 한다** — 사이트는 지금처럼 기기 안에서만 돈다.
 *
 * 무엇을 하나
 *   로그인   구글 · 카카오 (Supabase Auth 내장). 네이버는 내장이 없어 2단계.
 *   동기화   localStorage 의 학습 키 다섯을 `records` 표에 통째로 올리고 내려받는다.
 *            충돌은 「최근에 저장한 쪽」이 이긴다 — 기기 둘을 번갈아 쓰는 학생이 있다.
 *   푸시     서비스워커 pushManager 구독을 `push_subs` 표에 적는다. 보내는 쪽은 Edge Function
 *            (supabase/functions/push-daily) 이 정한 시각에 돈다.
 *
 * ★ 학생 화면에 "계정·동기화·서버" 라는 말을 쓰지 않는다 — "저장" 하나로 말한다.
 */
(function () {
  var C = window.SUPA;
  var ON = !!(C && C.url && C.anon && window.supabase);
  /* ★ 학습 기록 본체는 "terra.tree.v1"(js/store.js 의 KEY)이다. 옛 이름 "terra.state" 만 올리고 있어서
       답·확신도·사건 기록이 서버에 한 번도 안 올라갔다(2026-10-27 발견). 옛 이름은 옛 기기 복원용으로 남긴다. */
  /* ── 서비스 구분 (2026-11-10 전 서비스 연결) ─────────────────────
     13개 서비스가 한 서버·한 계정을 쓰고, 대부분 같은 주소(github.io) 아래라 기기 저장 공간도 같이 쓴다.
     그래서 서버 기록은 (계정, 서비스) 한 줄씩, 맞춤 표시는 서비스마다 따로 둔다.
     서비스 이름·올릴 키는 화면이 정한다: <script src="js/auth.js" data-service="gisa" data-keys="키1,키2">
     또는 <meta name="terra-service" content="gisa">. 없으면 통사(지금 이 사이트) 값. */
  var 내스크립트 = document.currentScript;
  var 서비스 = (내스크립트 && 내스크립트.getAttribute("data-service")) ||
    ((document.querySelector('meta[name="terra-service"]') || {}).content) || "tongsa";
  var 키들 = (내스크립트 && 내스크립트.getAttribute("data-keys")) ?
    내스크립트.getAttribute("data-keys").split(",").map(function (s) { return s.trim(); }).filter(Boolean) :
    서비스 !== "tongsa" ? [] :   /* 통사 키 목록이 다른 서비스 줄에 섞여 올라가던 것(1112 NCS 시험에서 발견) */
    ["terra.tree.v1", "terra.exam.log", "terra.goalmin", "terra.state", "terra.scope", "terra.snap", "terra.cards", "terra.axis", "terra.onboarded"];
  var 맞춤키 = "terra.sync." + 서비스;
  var sb = ON ? C.client() : null;

  /* ── 서버가 살아 있는지 ──────────────────────────────────
     무료 플랜 프로젝트는 쉬는 동안 도메인이 사라진다(2026-10-04 실측: DNS 조회 실패).
     그 상태에서 로그인 단추를 보이면 눌러도 아무 일이 없다 — 먼저 건강 확인(auth health)을 하고,
     실패하면 단추를 감춘다. 서버가 살아나면 다음에 그릴 때 다시 보인다. */
  var 살아있음 = null;
  function 서버확인(다시) {
    if (!ON) return Promise.resolve(false);
    if (다시) 살아있음 = null;
    if (!살아있음) 살아있음 = new Promise(function (res) {
      var 끝 = false;
      function fin(v) { if (!끝) { 끝 = true; clearTimeout(t); res(v); } }
      var t = setTimeout(function () { fin(false); }, 5000);
      try {
        fetch(C.url + "/auth/v1/health", { headers: { apikey: C.anon } })
          .then(function (r) { fin(r.ok); }).catch(function () { fin(false); });
      } catch (e) { fin(false); }
    });
    return 살아있음;
  }

  function 사용자() {
    if (!ON) return Promise.resolve(null);
    return 서버확인().then(function (ok) { return ok ? sb.auth.getUser() : { data: null }; }).then(function (r) { return (r.data && r.data.user) || null; })
      .catch(function () { return null; });
  }

  /* ── 로그인 ────────────────────────────────────────────── */
  function 로그인(어디) {              // "google" | "kakao"
    if (!ON) return Promise.resolve(false);
    return sb.auth.signInWithOAuth({
      provider: 어디,
      /* login.html 로 돌아온다 — 첫 실행 가드(start.html)에 안 걸리는 화면이고, 내려받기가 끝나면 거기서 갈 곳을 정한다 */
      /* 통사는 login.html 로 돌아와 갈 곳을 정한다(data-return). 다른 서비스는 누른 화면 그대로 돌아온다 */
      options: { redirectTo: (내스크립트 && 내스크립트.getAttribute("data-return")) ?
        location.origin + location.pathname.replace(/[^/]*$/, "") + 내스크립트.getAttribute("data-return") :
        location.href.split("#")[0] }
    }).then(function () { return true; });
  }
  /* 기기의 학습 기록 지우기 — 로그아웃·다른 계정 로그인 때. 화면이 메모리에 든 기록을 곧바로 다시 써넣을 수 있어
     한 번 더 지운 뒤 새로 연다(1110 검수: 지운 직후 옛 기록이 되살아나 새 계정에 올라갔다) */
  function 기기비우기() {
    function 지우기() {
      var 목록 = 키들.concat([맞춤키, "terra.sync", "terra.sync.uid"]);
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (우리키(k)) 목록.push(k); } } catch (e) {}
      목록.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    }
    지우기();
    return new Promise(function (res) { setTimeout(function () { 지우기(); res(); }, 400); });
  }
  /* 로그아웃: 먼저 마지막 기록을 올리고, 이 기기에서 지운다. 같은 PC 를 쓰는 다음 학생에게 기록이 넘어가지 않게 */
  function 로그아웃() {
    if (!ON) return Promise.resolve();
    return 올리기(true).catch(function () {}).then(function () { return sb.auth.signOut(); })
      .then(기기비우기).then(function () { location.replace("index.html"); });
  }

  /* ── 기록 동기화 ────────────────────────────────────────── */
  /* 앞글자로 고르는 키(다른 서비스는 키 이름이 정해져 있지 않다: mj.단원 같은 식). data-prefixes="mj.,stree." */
  var 앞글자들 = (내스크립트 && 내스크립트.getAttribute("data-prefixes")) ?
    내스크립트.getAttribute("data-prefixes").split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [];
  var 빼기 = /^(terra\.rs|terra\.sync|sb-)/;   // 연구 대기열·맞춤 표시·로그인 세션은 기록이 아니다
  function 우리키(k) {
    if (!k || 빼기.test(k)) return false;
    if (키들.indexOf(k) >= 0) return true;
    for (var i = 0; i < 앞글자들.length; i++) if (k.indexOf(앞글자들[i]) === 0) return true;
    return false;
  }
  function 꾸러미() {
    var o = {};
    키들.forEach(function (k) { try { o[k] = localStorage.getItem(k); } catch (e) {} });
    if (앞글자들.length) try {
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (우리키(k)) o[k] = localStorage.getItem(k); }
    } catch (e) {}
    return o;
  }
  function 풀기(o) {
    Object.keys(o || {}).forEach(function (k) {
      if (!우리키(k) || o[k] == null) return;
      try { localStorage.setItem(k, o[k]); } catch (e) {}
    });
  }
  /* ── 무엇이 바뀌었는지는 「내용」으로 본다 (2026-11-09 실사용 검수) ─────────
     첫 설정(이름·시험·범위)은 savedAt 을 건드리지 않고, 올리기는 답할 때만 불렸다.
     그래서 새 계정의 설정이 첫 답을 하기 전까지 서버에 없었다.
     → 마지막으로 서버와 맞춘 내용의 지문(sig)과 그때 서버 시각(at)을 기기에 적고,
       지문이 달라지면 올리고, 서버 시각이 앞서 가면(다른 기기가 올림) 내려받는다. */
  function 지문(o) {
    var s = JSON.stringify(o), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + ":" + s.length;
  }
  /* 두 기기 기록 합치기 — 문항 답은 문항마다 나중 것, 사건 기록은 합집합(시각순), 나머지는 이 기기 것 */
  function 합치기(여기, 서버) {
    var o = {}; Object.keys(여기).forEach(function (k) { o[k] = 여기[k]; });
    Object.keys(서버 || {}).forEach(function (k) { if (o[k] == null && 서버[k] != null && 키들.indexOf(k) >= 0) o[k] = 서버[k]; });
    var a = 기록읽기(여기["terra.tree.v1"]), b = 기록읽기(서버 && 서버["terra.tree.v1"]);
    if (!b.ans) return o;
    a.ans = a.ans || {};
    Object.keys(b.ans).forEach(function (q) {
      var x = a.ans[q], y = b.ans[q];
      if (!x || ((y && y.at) || 0) > ((x && x.at) || 0)) a.ans[q] = y;
    });
    var 본 = {}, ev = [];
    (a.ev || []).concat(b.ev || []).forEach(function (e) {
      var 열쇠 = (e && e.k) + "|" + (e && e.q) + "|" + (e && e.at);
      if (!본[열쇠]) { 본[열쇠] = 1; ev.push(e); }
    });
    ev.sort(function (p, q) { return ((p && p.at) || 0) - ((q && q.at) || 0); });
    a.ev = ev;
    a.savedAt = Math.max(a.savedAt || 0, b.savedAt || 0);
    o["terra.tree.v1"] = JSON.stringify(a);
    return o;
  }
  function 맞춤읽기() { try { return JSON.parse(localStorage.getItem(맞춤키) || "null") || {}; } catch (e) { return {}; } }
  function 맞춤적기(uid, at) { try { localStorage.setItem(맞춤키, JSON.stringify({ uid: uid, at: at, sig: 지문(꾸러미()) })); } catch (e) {} }
  function 바뀜() { var m = 맞춤읽기(); return m.sig !== 지문(꾸러미()); }

  var 마지막올림 = 0, 올림예약 = null, 올리는중 = null, 로그인됨 = false;
  function 올리기(강제) {
    if (!ON) return Promise.resolve(false);
    if (올리는중) return 올리는중;
    return 사용자().then(function (u) {
      if (!u) return false;
      if (!강제 && !바뀜()) return false;                    // 바뀐 게 없으면 부르지 않는다
      var now = Date.now();
      if (now - 마지막올림 < 4000) {                      // 답할 때마다 부르므로 묶어서
        /* 묶인 답도 4초 뒤 올린다. 그냥 버리면 마지막 답이 다음 답 때까지 서버에 없다 */
        if (!올림예약) 올림예약 = setTimeout(function () { 올림예약 = null; 올리기(); }, 4000 - (now - 마지막올림));
        return false;
      }
      마지막올림 = now;
      var 보낼것 = 꾸러미(), m = 맞춤읽기();
      /* 폰과 PC 를 둘 다 열어 둔 학생: 그 사이 다른 기기가 올렸으면 덮지 말고 합친다(1109 검수에서 찾은 구멍) */
      올리는중 = sb.from("records").select("saved_at").eq("user_id", u.id).eq("service", 서비스).maybeSingle().then(function (r0) {
        var 서버시각 = r0 && r0.data ? Date.parse(r0.data.saved_at) : 0;
        if (!서버시각 || m.uid !== u.id || 서버시각 <= (m.at || 0)) return null;
        return sb.from("records").select("data").eq("user_id", u.id).eq("service", 서비스).maybeSingle().then(function (r1) { return r1 && r1.data ? r1.data.data : null; });
      }).then(function (서버것) {
        var 여기것 = 보낼것;
        if (서버것) 보낼것 = 합치기(보낼것, 서버것);
        var 시각 = new Date().toISOString();
        return sb.from("records").upsert({ user_id: u.id, service: 서비스, data: 보낼것, saved_at: 시각 }, { onConflict: "user_id,service" })
          .then(function (r) { r.시각 = 시각; r.합침 = !!서버것; r.여기것 = 여기것; return r; });
      }).then(function (r) {
          올리는중 = null;
          if (r.error) return false;                       // 실패하면 지문을 안 바꿔 다음에 다시 올린다
          /* 지문은 이 기기 내용으로 적는다. 합쳤으면 서버가 더 많이 가진 것이므로 시각을 한 칸 뒤로 두어
             다음에 화면을 열 때 합친 기록을 내려받게 한다 */
          var at = Date.parse(r.시각) - (r.합침 ? 1 : 0);
          try { localStorage.setItem(맞춤키, JSON.stringify({ uid: u.id, at: at, sig: 지문(r.여기것) })); } catch (e) {}
          리포트올리기(u); return true;
        }, function () { 올리는중 = null; return false; });
      return 올리는중;
    }).catch(function () { return false; });
  }
  function 기록읽기(글) { try { return JSON.parse(글 || "{}") || {}; } catch (e) { return {}; } }
  function 답수(t) { return Object.keys((t && t.ans) || {}).length; }
  function 내려받기() {
    if (!ON) return Promise.resolve(false);
    return 사용자().then(function (u) {
      if (!u) return false;
      return sb.from("records").select("data,saved_at").eq("user_id", u.id).eq("service", 서비스).maybeSingle()
        .then(function (r) {
          if (r.error) return false;                       // 읽기 실패를 「서버가 비었다」로 보면 서버 기록을 덮어쓴다
          var row = r.data, m = 맞춤읽기();
          /* 이 기기 기록이 다른 계정 것이면 절대 올리지 않는다(1110 검수: 카카오 계정 기록 14문항이 새 구글 계정으로 올라갔다).
             기기를 비우고, 이 계정 기록이 서버에 있으면 그것을 받는다 */
          if (m.uid && m.uid !== u.id) {
            return 기기비우기().then(function () {
              if (row) { 풀기(row.data); 맞춤적기(u.id, Date.parse(row.saved_at)); }
              return "내려받음";
            });
          }
          if (!row) return 올리기(true);                    // 서버가 비었으면 이 기기 것을 올린다
          var 서버시각 = Date.parse(row.saved_at), 처음 = m.uid !== u.id;
          var 서버기록 = 기록읽기(row.data && row.data["terra.tree.v1"]), 여기기록 = 기록읽기(localStorage.getItem("terra.tree.v1"));
          var 받을까;
          if (처음) {
            /* 이 계정과 처음 맞추는 기기: 새 기기에서 몇 문제 풀고 로그인해도 쌓인 기록을 덮어쓰지 않게 답 수로 정한다 */
            /* 답 수가 같으면(둘 다 0 포함) 첫 설정을 마친 쪽을 남긴다 — 1109 검수: 빈 서버 기록이 방금 마친 설정을 덮었다 */
            var 서버답 = 답수(서버기록), 여기답 = 답수(여기기록);
            var 서버설정 = row.data && row.data["terra.onboarded"] === "1", 여기설정 = localStorage.getItem("terra.onboarded") === "1";
            받을까 = 서버답 > 여기답 || (서버답 === 여기답 && (서버설정 || !여기설정));
          } else if (서버시각 > (m.at || 0)) {
            /* 다른 기기가 그 뒤에 올렸다. 이 기기도 그 사이 바뀌었으면 학생이 마지막으로 한 쪽을 남긴다 */
            받을까 = !바뀜() || (서버기록.savedAt || 서버시각) >= (여기기록.savedAt || 0);
          } else {
            return 올리기();                                // 서버는 그대로 — 이 기기에서 바뀐 게 있으면 올린다
          }
          if (받을까) { 풀기(row.data); 맞춤적기(u.id, 서버시각); return "내려받음"; }
          return 올리기(true);
        });
    }).catch(function () { return false; });
  }

  /* ── 학부모 리포트 (2026-10-04) ──────────────────────────────
     일간·주간 리포트 자료(js/parent.js)를 parent_reports 에 올린다. 마감 뒤 사건은 다음 날로 가므로
     마지막으로 올린 값이 그날의 최종값이다. 발송은 Edge Function parent-report.
     parent.js 가 안 실린 화면에서는 한 번 불러온다. */
  var 엔진약속 = null;
  function 엔진() {
    if (window.PARENT && window.PARENT.스냅샷) return Promise.resolve(window.PARENT);
    if (!엔진약속) 엔진약속 = new Promise(function (res) {
      var s = document.createElement("script");
      s.src = "js/parent.js"; s.onload = function () { res(window.PARENT || null); }; s.onerror = function () { res(null); };
      document.head.appendChild(s);
    });
    return 엔진약속;
  }
  function 리포트올리기(u) {
    if (!window.TERRA) return Promise.resolve(false);
    return 엔진().then(function (P) {
      if (!P || !P.스냅샷) return false;
      var rows = P.스냅샷().map(function (r) {
        r.line = P.한줄(r);
        return { user_id: u.id, kind: r.kind, key: r.kind === "week" ? r.from : r.day, data: r, saved_at: new Date().toISOString() };
      });
      return sb.from("parent_reports").upsert(rows, { onConflict: "user_id,kind,key" }).then(function () { return true; });
    }).catch(function () { return false; });
  }
  function 토큰새로() {
    var a = new Uint8Array(18); crypto.getRandomValues(a);
    return btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function 링크주소(t) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "parent.html?k=" + t; }
  /* 학생 기기: 학부모 링크를 읽고(만들기=true 면 없을 때 만든다) 주소를 돌려준다 */
  function 학부모링크(만들기) {
    if (!ON) return Promise.resolve(null);
    return 사용자().then(function (u) {
      if (!u) return null;
      return sb.from("parent_links").select("token").eq("user_id", u.id).maybeSingle().then(function (r) {
        if (r.data && r.data.token) return 링크주소(r.data.token);
        if (!만들기) return null;
        var c = window.PARENT ? window.PARENT.설정() : { cut: 24, send: "07:30" }, t = 토큰새로();
        return sb.from("parent_links").insert({ token: t, user_id: u.id, cut: c.cut,
          send_h: +c.send.split(":")[0], send_m: +c.send.split(":")[1] })
          .then(function (w) { if (w.error) return null; 리포트올리기(u); return 링크주소(t); });
      });
    }).catch(function () { return null; });
  }
  function 학부모설정(c) {
    if (!ON) return Promise.resolve(false);
    return 사용자().then(function (u) {
      if (!u) return false;
      return sb.from("parent_links").update({ cut: c.cut, send_h: +c.send.split(":")[0], send_m: +c.send.split(":")[1] })
        .eq("user_id", u.id).then(function () { 마지막올림 = 0; return 올리기(); });
    }).catch(function () { return false; });
  }
  /* 학부모 폰: 토큰으로 읽기·알림 받기 (로그인 없음 — security definer 함수만 부른다) */
  function 학부모목록(t) {
    if (!ON) return Promise.resolve(null);
    return 서버확인().then(function (ok) {
      if (!ok) return null;
      return sb.rpc("parent_report_list", { p_token: t }).then(function (r) { return r.data || null; });
    }).catch(function () { return null; });
  }
  function 학부모리포트(t, kind, key) {
    if (!ON) return Promise.resolve(null);
    return sb.rpc("parent_report_get", { p_token: t, p_kind: kind, p_key: key })
      .then(function (r) { return r.data || null; }).catch(function () { return null; });
  }
  function 학부모알림(t) {
    if (!ON || !C.vapid || !("serviceWorker" in navigator) || !("PushManager" in window)) return Promise.resolve(false);
    return navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(C.vapid) }); })
      .then(function (sub) {
        var j = sub.toJSON();
        return sb.rpc("parent_sub_add", { p_token: t, p_endpoint: j.endpoint, p_keys: j.keys }).then(function (r) { return !!r.data; });
      }).catch(function () { return false; });
  }

  /* ── 푸시 구독 ─────────────────────────────────────────── */
  function b64(s) {
    var p = "=".repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(b), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }
  function 푸시켜기(시각) {              // "19:30"
    if (!ON || !C.vapid || !("serviceWorker" in navigator) || !("PushManager" in window))
      return Promise.resolve(false);
    return 사용자().then(function (u) {
      if (!u) return false;
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(C.vapid) });
      }).then(function (sub) {
        var j = sub.toJSON();
        return sb.from("push_subs").upsert({
          user_id: u.id, endpoint: j.endpoint, keys: j.keys,
          hour: parseInt((시각 || "19:30").split(":")[0], 10),
          minute: parseInt((시각 || "19:30").split(":")[1], 10),
          tz: "Asia/Seoul"
        }, { onConflict: "endpoint" }).then(function () { return true; });
      });
    }).catch(function () { return false; });
  }

  /* 답할 때마다 올린다 — store.js 가 쏘는 사건 */
  window.addEventListener("terra:ev", function () { if (로그인됨) 올리기(); });
  /* 답 말고 설정·시험·범위만 바꿔도 올라가게: 20초마다 지문만 견주고(기기 안 계산), 화면을 떠날 때도 한 번 */
  if (ON) {
    setInterval(function () { if (로그인됨 && 바뀜()) 올리기(); }, 20000);   // 로그인 안 한 학생은 서버를 부르지 않는다
    document.addEventListener("visibilitychange", function () { if (로그인됨 && document.visibilityState === "hidden" && 바뀜()) 올리기(); });
  }
  /* INITIAL_SESSION = 로그인한 채 화면을 연 때. 앞 화면에서 못 올린 마지막 답을 여기서 맞춘다.
     콜백 안에서 Supabase 를 바로 부르면 멈출 수 있어(공식 문서 경고) setTimeout 으로 빼낸다.
     다른 기기 기록을 받으면 메모리의 옛 기록이 덮어쓰지 않도록 화면을 다시 연다. login.html 은 terra:synced 로 스스로 옮겨 간다. */
  if (ON) sb.auth.onAuthStateChange(function (ev, session) {
    로그인됨 = !!(session && session.user && !session.user.is_anonymous);
    if (ev !== "SIGNED_IN" && !(ev === "INITIAL_SESSION" && session)) return;
    setTimeout(function () {
      내려받기().then(function (결과) {
        window.dispatchEvent(new CustomEvent("terra:synced"));
        if (결과 === "내려받음" && !/login\.html$/.test(location.pathname)) location.reload();
      });
    }, 0);
  });

  window.AUTH = { on: ON, 서버확인: 서버확인, 사용자: 사용자, 로그인: 로그인, 로그아웃: 로그아웃,
                  올리기: 올리기, 내려받기: 내려받기, 푸시켜기: 푸시켜기,
                  학부모링크: 학부모링크, 학부모설정: 학부모설정, 학부모목록: 학부모목록, 학부모리포트: 학부모리포트, 학부모알림: 학부모알림 };
})();
