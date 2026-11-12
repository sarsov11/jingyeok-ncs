/* Supabase 연결 스위치 (2026-11-06)
   url·anon 을 채우면 전 화면이 연결되고, 비우면 서버를 한 번도 부르지 않는다(로그인·저장 칸도 안 나온다).
   라이브러리는 js/supabase.min.js(@supabase/supabase-js 2.119.0)를 이 파일이 url 이 있을 때만 싣는다.
   화면마다 script 를 넣고 빼지 않는다.

   정본 = 서울 프로젝트 fqxouxunoiwoezlkorva(2026-11-06, 조직 테라러닝).
   off = 옛 프로젝트(시드니, sarsov11 조직, 2026-10-04부터 쉬는 중). 학생 기록 유무를 복구해 확인한 뒤 지운다. */
window.SUPA = {
  url: "https://fqxouxunoiwoezlkorva.supabase.co",
  anon: "sb_publishable_Je1KMwQzq1rbzY42ZhOjOQ_TdSNBTYA",
  vapid: "BFh3VUZQlO_eMJcumm898UvbxY-trWxDIoV_MbIUHqkktYfhxDkBXL7av9RBuwcV-1d-z1790UzaMySd7AEN9Ro",
  /* 연구 수집 스위치. 서버 연결(url)과 따로 둔다. IRB 승인 전에는 false: 동의해도 연구 기록이 서버로 나가지 않는다.
     승인 뒤 대표님 확인을 받고 true 로 바꾼다. */
  research: false,
  off: {
    url: "https://oeiebutgervwbljpqxum.supabase.co",
    anon: "sb_publishable_NFpZLgSRWrkyXEZbjKYUfw_ni8Wrn7A",
    vapid: "BFh3VUZQlO_eMJcumm898UvbxY-trWxDIoV_MbIUHqkktYfhxDkBXL7av9RBuwcV-1d-z1790UzaMySd7AEN9Ro"
  },
  /* auth.js 와 research.js 가 같은 연결 하나를 쓴다. 따로 만들면 로그인 세션이 서로 부딪힌다. */
  client: function () {
    if (!this._c && this.url && this.anon && window.supabase) this._c = window.supabase.createClient(this.url, this.anon);
    return this._c || null;
  }
};
if (window.SUPA.url && window.SUPA.anon) {
  /* 뒤따르는 auth.js·research.js 가 바로 쓰므로 동기 로드가 필요하다 */
  document.write('<script src="js/supabase.min.js"><\/script>');
}
