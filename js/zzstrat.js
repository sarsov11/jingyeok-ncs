/* 합격전략 브리핑 — 테라러닝 공용 (2026-10-20, 10-21 개편)
 *  시험을 처음 시작할 때 게임 튜토리얼처럼: 브리핑 화면을 띄우고, 짚을 곳만 비추며 한 줄씩 설명한다.
 *  끝난 뒤에는 화면 구석 「합격전략」 버튼으로 언제든 다시 연다.
 *
 *  10-21 대표님 지적 반영: 검은 화면 → 앱 위로 올라오는 밝은 종이 화면 / 단계마다 음이 올라가던 소리 → 같은 높이 작은 소리 /
 *  학생이 목표를 고른다(선택: 커트만 넘기기·여유 있게 등) → 과목 목표와 S·A·B·C 공부 범위(전부·간단히·찍기)가 바뀐다.
 *
 *  데이터: 전략/<id>.js 가 ZZSTRAT.add({...}) 로 넣는다. 형식은 전략/_형식.md
 *  ZZSTRAT.auto(id)            처음 한 번 튜토리얼 + 구석 버튼
 *  ZZSTRAT.open(id, {tour})    언제든 열기(tour:true 면 튜토리얼까지)
 *  ZZSTRAT.button(id, 요소)     앱이 정한 자리에 「합격전략」 버튼을 넣는다
 *  ZZSTRAT.goal(id)            학생이 고른 목표 id(없으면 null)
 *  튜토리얼 문장은 데이터에서 만든다.
 */
(function () {
  "use strict";
  if (window.ZZSTRAT) return;
  var D = document, W = window, KEY = "terra.strat.", GKEY = "terra.strat.goal.";
  var DB = {}, cur = null, SR = null;
  var RM = false; try { RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }
  var LANG = (function () { var l = (D.documentElement.getAttribute("lang") || "ko").toLowerCase(); return l.indexOf("ja") === 0 ? "ja" : l.indexOf("en") === 0 ? "en" : "ko"; })();
  var L = {
    ko: { btn: "합격전략", next: "다음", end: "닫기", skip: "건너뛰기", close: "닫기", tour: "짚어 보기", abs: "절대평가", rel: "상대평가",
      line: "합격선", goal: "목표", cut: "최근 합격선", bonus: "가산점", fail: "과락", sum: "과목 목표를 더하면", subj: "과목", strat: "전략", def: "방어", base: "기본",
      why: "왜", hold: "여기까지는 맞힌다", drop: "버려도 되는 문항", ex: "기출로 보기", must: "필수", fight: "승부", skipq: "버림", ans: "정답", order: "시험장에서",
      rate: "합격률", writ: "필기", prac: "실기", src: "출처", rep: "반복 출제", newq: "신출", range: "범위", start: "시작",
      pick: "목표 고르기", gcut: "등급컷", passz: "합격", failz: "불합격", tiers: "공부 범위", m_all: "공부", m_lite: "간단히", m_guess: "찍기", pt: "점" },
    ja: { btn: "合格戦略", next: "次へ", end: "閉じる", skip: "スキップ", close: "閉じる", tour: "ガイドを見る", abs: "絶対評価", rel: "相対評価",
      line: "合格ライン", goal: "目標", cut: "最近の合格ライン", bonus: "加点", fail: "足切り", sum: "科目目標の合計", subj: "科目", strat: "得点源", def: "守り", base: "基本",
      why: "理由", hold: "ここまでは必ず取る", drop: "捨ててよい問題", ex: "過去問で見る", must: "必須", fight: "勝負", skipq: "捨て", ans: "正解", order: "試験当日",
      rate: "合格率", writ: "筆記", prac: "実技", src: "出典", rep: "再出題", newq: "新出", range: "範囲", start: "はじめる",
      pick: "目標を選ぶ", gcut: "等級ライン", passz: "合格", failz: "不合格", tiers: "学習範囲", m_all: "学習", m_lite: "軽く", m_guess: "勘で", pt: "点" },
    en: { btn: "Pass plan", next: "Next", end: "Close", skip: "Skip", close: "Close", tour: "Guided tour", abs: "Fixed cutoff", rel: "Curved / ranked",
      line: "Pass line", goal: "Target", cut: "Recent cutoffs", bonus: "Bonus points", fail: "Minimum per section", sum: "Section targets add up to", subj: "Sections", strat: "Score", def: "Defend", base: "Core",
      why: "Why", hold: "Must-get level", drop: "Questions to skip", ex: "From past exams", must: "Must", fight: "Decider", skipq: "Skip", ans: "Answer", order: "On exam day",
      rate: "Pass rate", writ: "Written", prac: "Practical", src: "Sources", rep: "Repeat rate", newq: "New", range: "Scope", start: "Start",
      pick: "Pick your target", gcut: "Grade cuts", passz: "Pass", failz: "Fail", tiers: "Study scope", m_all: "Study", m_lite: "Skim", m_guess: "Guess", pt: "" }
  }[LANG];
  var ROLE = { "전략": "s", "방어": "d", "기본": "b" }, VERD = { "필수": "m", "승부": "f", "버림": "x" };
  var MODE = { "전부": "a", "공부": "a", "간단": "l", "간단히": "l", "찍기": "g", "버림": "g" };
  var TIERS = ["S", "A", "B", "C"];

  function seen(id) { try { return localStorage.getItem(KEY + id) === "1"; } catch (e) { return false; } }
  function mark(id) { try { localStorage.setItem(KEY + id, "1"); } catch (e) { } }
  function reset(id) { try { localStorage.removeItem(KEY + id); localStorage.removeItem(GKEY + id); } catch (e) { } }
  function getGoal(id) { try { return localStorage.getItem(GKEY + id); } catch (e) { return null; } }
  function setGoal(id, g) { try { localStorage.setItem(GKEY + id, g); } catch (e) { } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { if (typeof v === "number") return v; var m = String(v || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
  function first(s) { s = String(s || ""); var m = s.match(/^(?:[^.!?。]|\.(?=\d))*[.!?。]/);   /* 73.5 의 점은 문장 끝이 아니다 */ return (m ? m[0] : s).trim(); }
  /* 말풍선용: 첫 문장이 짧으면(「14문항(70점).」) 다음 문장까지 */
  function lead(s) { s = String(s || "").trim(); var a = first(s); if (a.length >= 28 || a.length >= s.length) return a; var b = first(s.slice(a.length).trim()); return (a + " " + b).trim(); }
  function role(s) { return ROLE[s.역할] || "b"; }

  /* ── 고른 목표에 따라 바뀌는 값 ── */
  function choice(d, g) { var c = d.선택 || []; for (var i = 0; i < c.length; i++) if (c[i].id === g) return c[i]; return null; }
  function totalGoal(d, g) { var c = choice(d, g); return c && num(c.목표) > 0 ? num(c.목표) : num((d.합격선 || {}).목표); }
  function subGoal(s, g) { var v = s.목표선택 && g != null ? s.목표선택[g] : undefined; return v != null ? num(v) : num(s.목표); }
  function subQ(s, g) { var v = s.목표문항선택 && g != null ? s.목표문항선택[g] : undefined; return v != null ? v : s.목표문항; }
  function subTip(s, g) { return s.조언선택 && g != null ? s.조언선택[g] : ""; }
  function tierMode(d, s, g, t) {
    var o = s.범위선택 && g != null && s.범위선택[g] ? s.범위선택[g][t] : undefined;
    if (o == null) { var c = choice(d, g); o = c && c.범위 ? c.범위[t] : undefined; }
    return o == null ? "" : (MODE[o] || "a");
  }
  function modeName(m) { return { a: L.m_all, l: L.m_lite, g: L.m_guess }[m] || ""; }

  var css = [
    "#zs,#zst{--zs-bg:#F6F4EF;--zs-card:#FFFFFF;--zs-line:#E5E2DA;--zs-tx:#16181D;--zs-sub:#6B7080;--zs-red:#E1101C;--zs-blue:#2563EB;--zs-gold:#B7791F;--zs-soft:#F1EFE9}",
    "#zs{position:fixed;inset:0;z-index:2147481000;background:var(--zs-bg);color:var(--zs-tx);overflow-y:auto;-webkit-overflow-scrolling:touch;",
    " font:500 15.5px/1.6 'Pretendard','Noto Sans KR','Noto Sans JP','Apple SD Gothic Neo',system-ui,sans-serif;letter-spacing:-.01em;animation:zsIn .3s ease-out}",
    "@keyframes zsIn{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:none}}",
    "#zs.out{animation:zsOut .2s ease-in forwards}@keyframes zsOut{100%{opacity:0;transform:translateY(14px)}}",
    "#zs *{box-sizing:border-box}#zs .in{max-width:760px;margin:0 auto;padding:12px 16px 96px}",
    "#zs .top{display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:2;background:linear-gradient(var(--zs-bg) 72%,rgba(246,244,239,0));padding:10px 0 14px}",
    "#zs .top .t{font:800 13px/1 system-ui,sans-serif;letter-spacing:.1em;color:var(--zs-red)}",
    "#zs .top button{margin-left:auto;background:var(--zs-card);border:1px solid var(--zs-line);color:var(--zs-sub);border-radius:10px;padding:8px 12px;font:700 13.5px/1 inherit;cursor:pointer}",
    "#zs .top .x{margin-left:6px}",
    "#zs .hero{padding:4px 0 18px}#zs .hero .nm{font:700 14px/1.3 inherit;color:var(--zs-sub)}",
    "#zs .hero h1{font:900 clamp(23px,5.4vw,32px)/1.35 inherit;margin:8px 0 12px;letter-spacing:-.03em;word-break:keep-all}",
    "#zs .chip{display:inline-block;font:800 12px/1.3 system-ui,sans-serif;padding:5px 9px;border-radius:8px;margin:0 6px 6px 0;background:var(--zs-soft);color:#4A4F5C;max-width:100%;white-space:normal}",
    "#zs .chip.r{background:rgba(225,16,28,.09);color:var(--zs-red)}",
    "#zs section{background:var(--zs-card);border:1px solid var(--zs-line);border-radius:18px;padding:18px 16px;margin:0 0 14px;box-shadow:0 1px 2px rgba(20,20,30,.04)}",
    "#zs h2{font:800 13px/1 system-ui,sans-serif;letter-spacing:.06em;color:var(--zs-sub);margin:0 0 14px}",
    "#zs .desc{color:#3A3E48;margin:0 0 12px;word-break:keep-all}",
    /* 목표 고르기 */
    "#zs .picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}",
    "#zs .pk{position:relative;text-align:left;background:var(--zs-bg);border:2px solid var(--zs-line);border-radius:16px;padding:14px;cursor:pointer;color:inherit;font:inherit;width:100%}",
    "#zs .pk.on{border-color:var(--zs-red);background:#FFF5F5;box-shadow:0 0 0 3px rgba(225,16,28,.12)}",
    "#zs .pk .pn{font:900 17px/1.3 inherit}#zs .pk .pg{font:900 28px/1 system-ui,sans-serif;margin:10px 0 8px}#zs .pk .pg small{font:700 13px/1 inherit;color:var(--zs-sub)}",
    "#zs .pk .pd{font-size:14px;color:#3A3E48;word-break:keep-all;margin:0 0 8px}",
    "#zs .pk .ck{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;border:2px solid var(--zs-line);background:#fff}",
    "#zs .pk.on .ck{border-color:var(--zs-red);background:var(--zs-red);box-shadow:inset 0 0 0 4px #fff}",
    "#zs .tm{display:flex;flex-wrap:wrap;gap:5px}",
    "#zs .tg{display:inline-flex;align-items:center;gap:4px;font:800 12px/1 system-ui,sans-serif;padding:5px 7px;border-radius:7px}",
    "#zs .tg b{font-weight:900}#zs .tg.a{background:var(--zs-tx);color:#fff}#zs .tg.l{background:#fff;color:var(--zs-tx);border:1.5px solid var(--zs-tx)}",
    "#zs .tg.g{background:transparent;color:#9A9EA8;border:1.5px dashed #C9C6BE}",
    /* 게이지 */
    "#zs .gw{padding:34px 4px 32px;margin:6px 0 4px}#zs .gauge{position:relative;height:16px;border-radius:9px;background:#ECE9E2}",
    "#zs .gauge .fl{position:absolute;left:0;top:0;bottom:0;border-radius:9px 0 0 9px;background:repeating-linear-gradient(45deg,#F3D9DA 0 6px,#FBEDEE 6px 12px)}",
    "#zs .gauge .rg{position:absolute;top:0;bottom:0;background:rgba(183,121,31,.28)}",
    "#zs .gauge .rl{position:absolute;bottom:calc(100% + 10px);transform:translateX(-50%);white-space:nowrap;font:800 12px/1 system-ui,sans-serif;color:var(--zs-gold)}",
    "#zs .gauge .ax{position:absolute;top:calc(100% + 8px);font:700 11px/1 system-ui,sans-serif;color:#A0A4AE}",
    "#zs .gauge .mk{position:absolute;top:-6px;bottom:-6px;width:2px;background:#9EA3AD}",
    "#zs .gauge .gl{position:absolute;top:-10px;bottom:-10px;width:4px;margin-left:-2px;background:var(--zs-red);border-radius:3px;box-shadow:0 0 0 4px rgba(225,16,28,.15);transition:left .4s cubic-bezier(.2,1,.3,1)}",
    "#zs .gauge .gl span{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;font:900 14px/1 system-ui,sans-serif;color:var(--zs-red);background:var(--zs-card);padding:0 4px}",
    "#zs .big{font:900 34px/1 system-ui,sans-serif;color:var(--zs-tx)}#zs .big small{font:700 15px/1 inherit;color:var(--zs-sub);margin-left:4px}",
    "#zs table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}#zs td,#zs th{padding:8px 6px;border-top:1px solid var(--zs-line);text-align:left;vertical-align:top}",
    "#zs th{color:var(--zs-sub);font-weight:700;font-size:12.5px}#zs td.n{font-weight:800;white-space:nowrap}#zs td .mu{color:#8A8F9A}",
    "#zs .stack{display:flex;height:30px;border-radius:9px;overflow:hidden;margin:10px 0 6px;background:#ECE9E2}",
    "#zs .stack i{display:flex;align-items:center;justify-content:center;font:800 11.5px/1 system-ui,sans-serif;color:#fff;font-style:normal;border-right:2px solid var(--zs-card);overflow:hidden;white-space:nowrap;min-width:0;transition:width .4s}",
    "#zs .stack i.s{background:var(--zs-red)}#zs .stack i.d{background:var(--zs-blue)}#zs .stack i.b{background:#8A8F9A}",
    /* 점수 그래프 A·B·C */
    "#zs .gw{padding:6px 0 0;margin:10px 0 6px}",
    "#zs .ga{position:relative;padding:40px 2px 0}#zs .ga .bar{position:relative;height:40px;border-radius:12px;overflow:hidden;background:#EFECE5}",
    "#zs .ga .z{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center}#zs .ga .z.rest{background:#E7E3DA}",
    "#zs .ga .z em{font:900 13px/1 system-ui,sans-serif;color:#fff;font-style:normal;white-space:nowrap}#zs .ga .z.rest em{color:#8A8F9A}",
    "#zs .ga .f{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(-45deg,var(--c) 0 3px,transparent 3px 8px);opacity:.55}",
    "#zs .ga .ticks{position:relative;height:58px}",
    "#zs .ga .tk{position:absolute;top:8px;transform:translateX(-50%);font:800 12px/1 system-ui,sans-serif;white-space:nowrap}#zs .ga .tk.dn{top:26px}",
    "#zs .ga .ax{position:absolute;top:44px;font:700 11px/1 system-ui,sans-serif;color:#A0A4AE}#zs .ga .ax.l{left:0}#zs .ga .ax.r{right:0}",
    "#zs .gp{position:absolute;top:0;transform:translateX(-50%);z-index:2;transition:left .4s cubic-bezier(.2,1,.3,1)}",
    "#zs .gp b{display:block;background:var(--zs-tx);color:#fff;font:900 12.5px/1 system-ui,sans-serif;padding:7px 9px;border-radius:8px;white-space:nowrap}",
    "#zs .gp::after{content:'';position:absolute;left:50%;top:100%;margin-left:-1.5px;width:3px;height:52px;background:var(--zs-tx)}",
    "#zs .gb{--lw:92px;position:relative;padding-top:30px}",
    "#zs .gb .rw{display:flex;align-items:center;min-height:38px;padding:3px 0}#zs .gb .rn{flex:none;width:var(--lw);font-weight:700;font-size:12px;line-height:1.25;color:#4A4F5C;padding-right:8px;word-break:keep-all}",
    "#zs .gb .tr{position:relative;flex:1;align-self:stretch;min-height:32px}#zs .gb .ln{position:absolute;left:0;right:0;top:50%;height:2px;background:#E5E2DA}",
    "#zs .gb .dt{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.08)}",
    "#zs .gb .dt s{position:absolute;bottom:13px;left:50%;transform:translateX(-50%);text-decoration:none;font:800 11px/1 system-ui,sans-serif;color:#4A4F5C;white-space:nowrap}",
    "#zs .gb .rw.ax{height:18px}#zs .gb .rw.ax s{position:absolute;top:0;text-decoration:none;font:700 11px/1 system-ui,sans-serif;color:#A0A4AE}",
    "#zs .gb .gline{position:absolute;top:0;bottom:46px;width:0;border-left:2.5px dashed var(--zs-red);z-index:1}",
    "#zs .gb .gline b{position:absolute;top:0;left:50%;transform:translate(-50%,-2px);background:var(--zs-red);color:#fff;font:900 12px/1 system-ui,sans-serif;padding:6px 8px;border-radius:7px;white-space:nowrap}",
    "#zs .gb .lg{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font:700 12px/1 system-ui,sans-serif;color:#4A4F5C}#zs .gb .lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}",
    "#zs .gc{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}",
    "#zs .gc .cd{border:2px solid var(--zs-line);border-radius:14px;padding:12px;background:#fff}#zs .gc .cd.on{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 18%,transparent)}",
    "#zs .gc .cn{font:900 13px/1 system-ui,sans-serif;color:var(--c)}#zs .gc .cv{font:900 26px/1.1 system-ui,sans-serif;margin:8px 0 4px}#zs .gc .cv small{font-size:13px;color:var(--zs-sub);margin-left:2px}",
    "#zs .gc .cs{font:700 12px/1.3 inherit;color:var(--zs-sub)}#zs .gc .cg{margin-top:8px;display:inline-block;background:var(--c);color:#fff;font:900 12px/1 system-ui,sans-serif;padding:5px 8px;border-radius:7px}",
    "#zs .hit{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--zs-soft);font:800 14px/1.45 inherit;word-break:keep-all}",
    /* 과목 카드 */
    "#zs .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}",
    "#zs .sc{position:relative;background:var(--zs-card);border:2px solid var(--zs-line);border-radius:16px;padding:14px 14px 12px;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%}",
    "#zs .sc.s{border-color:rgba(225,16,28,.45)}#zs .sc.d{border-color:rgba(37,99,235,.45)}#zs .sc.on{background:#FBFAF7}",
    "#zs .sc .rb{position:absolute;top:12px;right:12px;font:900 11.5px/1 system-ui,sans-serif;padding:5px 8px;border-radius:7px}",
    "#zs .sc.s .rb{background:var(--zs-red);color:#fff}#zs .sc.d .rb{background:var(--zs-blue);color:#fff}#zs .sc.b .rb{background:var(--zs-soft);color:#4A4F5C}",
    "#zs .sc .sn{font:800 16.5px/1.3 inherit;padding-right:56px;word-break:keep-all}",
    "#zs .sc .sg{font:900 26px/1 system-ui,sans-serif;margin:12px 0 4px}#zs .sc .sg small{font:700 13px/1 inherit;color:var(--zs-sub)}",
    "#zs .sc .sq{font-size:13.5px;color:#4A4F5C;margin-bottom:8px}",
    "#zs .sc .bar{height:6px;border-radius:4px;background:#ECE9E2;margin:2px 0 10px;overflow:hidden}#zs .sc .bar b{display:block;height:100%;transition:width .4s}",
    "#zs .sc.s .bar b{background:var(--zs-red)}#zs .sc.d .bar b{background:var(--zs-blue)}#zs .sc.b .bar b{background:#8A8F9A}",
    "#zs .det{display:none;grid-column:1/-1;background:var(--zs-bg);border:1px solid var(--zs-line);border-radius:16px;padding:16px 14px}#zs .det.on{display:block}",
    "#zs .det h3{font:900 19px/1.3 inherit;margin:0 0 12px}",
    "#zs .kv{margin:0 0 12px}#zs .kv b{display:block;font:800 12.5px/1.2 system-ui,sans-serif;letter-spacing:.03em;margin-bottom:4px;color:var(--zs-sub)}",
    "#zs .kv.hold b{color:var(--zs-blue)}#zs .kv.tip b{color:var(--zs-red)}#zs .kv p{margin:0;word-break:keep-all}",
    "#zs .tl{list-style:none;margin:0;padding:0}#zs .tl li{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px dashed var(--zs-line)}#zs .tl li:first-child{border-top:0}",
    "#zs .tl li .tg{flex:none;margin-top:2px}#zs .tl li.g span.tx{color:#8A8F9A}",
    "#zs .ind{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}",
    /* 기출 카드 */
    "#zs .q{position:relative;background:#fff;color:#16181D;border:1px solid var(--zs-line);border-radius:14px;padding:16px 14px 14px;margin:12px 0 0;font-weight:500}",
    "#zs .q .qs{font:700 12px/1.3 system-ui,sans-serif;color:#7A7F8A;margin-bottom:8px;padding-right:72px}",
    "#zs .q .qt{font-weight:700;margin:0 0 8px;word-break:keep-all}#zs .q ol{margin:0;padding-left:0;list-style:none;counter-reset:o}",
    "#zs .q li{counter-increment:o;padding:3px 0 3px 26px;position:relative;font-size:14.5px}",
    "#zs .q li::before{content:counter(o);position:absolute;left:0;top:5px;width:18px;height:18px;border-radius:50%;border:1.5px solid #8A8F98;font:700 11px/16px system-ui;text-align:center}",
    "#zs .q li.a::before{background:#16181D;color:#fff;border-color:#16181D}",
    "#zs .q .st{position:absolute;top:12px;right:12px;font:900 14px/1 inherit;padding:7px 10px;border-radius:8px;border:2.5px solid;transform:rotate(-4deg)}",
    "#zs .q .st.m{color:#0E8F57;border-color:#0E8F57}#zs .q .st.f{color:#C47A00;border-color:#C47A00}#zs .q .st.x{color:#8A8F98;border-color:#8A8F98}",
    "#zs .q.x .qt,#zs .q.x ol{opacity:.55}",
    "#zs .q .qe{margin:10px 0 0;padding:10px 0 0;border-top:1px dashed #D9D5CB;font-size:14px;word-break:keep-all}",
    "#zs ol.ord{margin:0;padding-left:20px}#zs ol.ord li{margin:0 0 6px}",
    "#zs .src{font-size:12px;color:#8A8F9A;margin-top:18px;word-break:break-all}",
    "#zs .go{display:block;width:100%;margin:22px 0 0;background:var(--zs-red);color:#fff;border:0;border-radius:14px;padding:16px;font:900 17px/1 inherit;cursor:pointer}",
    /* 스포트라이트 */
    "#zst{position:fixed;inset:0;z-index:2147482000}#zst.pass{pointer-events:none}#zst.pass .bub{pointer-events:auto}",
    "#zst .hole{position:fixed;border-radius:16px;box-shadow:0 0 0 200vmax rgba(22,24,30,.5);pointer-events:none;transition:all .42s cubic-bezier(.2,1,.3,1)}",
    "#zst .hole::after{content:'';position:absolute;inset:-5px;border-radius:20px;border:3px solid var(--zs-red);animation:zstP 1.6s ease-out infinite}",
    "@keyframes zstP{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.05)}}",
    "#zst .bub{position:fixed;left:16px;right:16px;max-width:440px;margin:0 auto;background:#fff;color:#111;border-radius:16px;padding:16px 16px 12px;",
    " box-shadow:0 14px 34px rgba(0,0,0,.22);font:600 16px/1.55 'Pretendard','Noto Sans KR','Noto Sans JP',system-ui,sans-serif;letter-spacing:-.01em;word-break:keep-all}",
    "#zst .bub .h{font:900 12.5px/1.3 system-ui,sans-serif;color:var(--zs-red);letter-spacing:.04em;margin-bottom:8px}",
    "#zst .bub.in{animation:zstIn .3s ease-out}@keyframes zstIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}",
    "#zst .row{display:flex;align-items:center;gap:10px;margin-top:12px;padding:0;background:none;border:0;border-radius:0;box-shadow:none}",
    "#zst .dots{display:flex;gap:5px;min-width:0;flex:1 1 auto;overflow:hidden}#zst .dots .cnt{font:800 13px/1 system-ui,sans-serif;color:#8A8F98;white-space:nowrap}",
    "#zst .dots i{flex:none}#zst .dots i{width:7px;height:7px;border-radius:9px;background:#DADDE2}#zst .dots i.on{background:var(--zs-red);width:18px}",
    "#zst .sk{margin-left:auto;background:none;border:0;color:#8A8F98;font:700 14px/1 inherit;padding:8px 6px;cursor:pointer;white-space:nowrap;flex:none}",
    "#zst .nx{background:var(--zs-red);color:#fff;border:0;border-radius:12px;padding:11px 18px;font:800 15px/1 inherit;cursor:pointer;white-space:nowrap;flex:none}",
    "#zst .nx[hidden]{display:none}",
    "@media (prefers-reduced-motion:reduce){#zs,#zs.out,#zst .bub.in{animation:none}}"
  ].join("\n");
  /* 앱 문서에 들어가는 것은 구석 버튼뿐. 브리핑·튜토리얼은 Shadow DOM 안이라 앱 CSS(.row .chip .q 등)가 섞이지 않는다 */
  var docCss = [
    ".zs-fab{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147480000;display:flex;align-items:center;gap:6px;",
    " background:#fff;color:#16181D;border:2px solid #E1101C;border-radius:999px;padding:9px 13px 9px 10px;font:800 13.5px/1 'Pretendard','Noto Sans KR',system-ui,sans-serif;",
    " box-shadow:0 6px 18px rgba(0,0,0,.14);cursor:pointer}",
    ".zs-fab svg,.zs-btn svg{width:18px;height:18px;flex:none;color:#E1101C}",
    ".zs-btn{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#16181D;border:2px solid #E1101C;border-radius:12px;padding:9px 13px;font:800 14px/1 'Pretendard','Noto Sans KR',system-ui,sans-serif;cursor:pointer}",
    "@media print{#zs-host,.zs-fab{display:none!important}}"
  ].join("\n");
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>';
  function style() { if (D.getElementById("zs-style")) return; var st = D.createElement("style"); st.id = "zs-style"; st.textContent = docCss; D.head.appendChild(st); }

  /* ── 브리핑 화면 ── */
  /* ── 점수 그래프 (10-21 대표님 「점수 구간 그래프 너무 별로」 → 세 안: A 구간 막대 · B 회차별 점 · C 등급 카드) ──
   *  대입처럼 등급으로 끊는 시험은 데이터 `등급컷: [{이름:"2026.6 학평", 컷:{1:50, 2:46, 3:41}, 비고}]`.
   *  합불 시험은 기존 `합격선.커트` 를 한 줄씩 행으로 쓴다. 안 고르기: 데이터 `그래프:"A|B|C"` > ZZSTRAT.graph > 주소 ?zsg=B > A */
  var GCOL = { "1": "#E1101C", "2": "#2563EB", "3": "#0E8F57", "4": "#B7791F", "5": "#7C3AED", P: "#0E8F57" };
  function isGrade(d) { return !!(d.등급컷 && d.등급컷.length); }
  function gName(k) { return k === "P" ? L.passz : LANG === "ko" ? k + "등급" : LANG === "ja" ? k + "等級" : "Grade " + k; }
  function cName(k) { return k === "P" ? L.line : LANG === "ko" ? k + "컷" : LANG === "ja" ? k + "等級ライン" : "Grade " + k + " cut"; }
  function rowsOf(d) {
    var max = num((d.합격선 || {}).만점);
    if (isGrade(d)) {
      var ks = {};
      var rows = d.등급컷.map(function (r) { var c = {}; Object.keys(r.컷 || {}).forEach(function (k) { var v = num(r.컷[k]); if (v > 0 && !(v > max)) { c[k] = v; ks[k] = 1; } }); return { name: r.이름 || "", cuts: c, note: r.비고 || "" }; });
      return { grade: true, keys: Object.keys(ks).sort(function (a, b) { return num(a) - num(b); }), rows: rows };
    }
    var cs = ((d.합격선 || {}).커트 || []).filter(function (c) { var v = num(c.점수); return v > 0 && !(v > max); });
    if (!cs.length) return null;
    return { grade: false, keys: ["P"], rows: cs.map(function (c) { return { name: ((c.연도 || "") + " " + (c.구분 || "")).trim(), cuts: { P: num(c.점수) }, note: c.비고 || "" }; }) };
  }
  function span(R, k) { var v = R.rows.map(function (r) { return r.cuts[k]; }).filter(function (x) { return x > 0; }); return v.length ? { lo: Math.min.apply(null, v), hi: Math.max.apply(null, v), n: v.length } : null; }
  function fmt(a, b) { return a === b ? String(a) : a + "~" + b; }
  /* 목표 점수면 최근 회차에서 몇 번 몇 등급인가 — 데이터에서 센 사실 */
  function hitText(d, R, G) {
    if (!(G > 0) || !R) return "";
    var n = R.rows.length;
    if (!R.grade) {
      /* 커트가 하나로 고정된 시험(절대평가)은 「몇 개 중 몇 개 위」가 아니라 선과의 차이만 (10-21 NCS 창) */
      var uniq = R.rows.map(function (r) { return r.cuts.P; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (uniq.length === 1 || d.방식 === "절대") {
        var line = Math.max.apply(null, uniq), gap = Math.round((G - line) * 10) / 10, u = (d.합격선 || {}).단위 != null ? d.합격선.단위 : L.pt, up = gap >= 0;
        return LANG === "ko" ? L.goal + " " + G + u + " → " + L.line + " " + line + u + "보다 " + Math.abs(gap) + u + " " + (up ? "위" : "아래")
          : LANG === "ja" ? L.goal + " " + G + " → " + L.line + line + "より" + Math.abs(gap) + u + (up ? "上" : "下")
          : "Target " + G + " is " + Math.abs(gap) + (up ? " above" : " below") + " the pass line " + line;
      }
      var ok = R.rows.filter(function (r) { return G >= r.cuts.P; }).length;
      return LANG === "ko" ? L.goal + " " + G + " → 최근 커트 " + n + "개 중 " + ok + "개 위" : LANG === "ja" ? L.goal + " " + G + " → 直近" + n + "回中" + ok + "回合格ライン以上" : "Target " + G + " clears " + ok + " of " + n + " recent cutoffs";
    }
    var cnt = {}, below = 0;
    R.rows.forEach(function (r) { var got = null; R.keys.forEach(function (k) { if (got == null && r.cuts[k] > 0 && G >= r.cuts[k]) got = k; }); if (got == null) below++; else cnt[got] = (cnt[got] || 0) + 1; });
    var parts = R.keys.filter(function (k) { return cnt[k]; }).map(function (k) { return LANG === "ko" ? gName(k) + " " + cnt[k] + "회" : gName(k) + " " + cnt[k]; });
    if (below) parts.push(LANG === "ko" ? "그 아래 " + below + "회" : "below " + below);
    return LANG === "ko" ? L.goal + " " + G + "점이면 최근 " + n + "회 중 " + parts.join(" · ") : L.goal + " " + G + " → " + parts.join(" · ");
  }
  function scale(d, R, goal) {
    var max = num((d.합격선 || {}).만점), lows = [goal > 0 ? goal : max];
    if (R) R.keys.forEach(function (k) { var s = span(R, k); if (s) lows.push(s.lo); });
    (d.선택 || []).forEach(function (c) { if (num(c.목표) > 0) lows.push(num(c.목표)); });
    var a0 = Math.max(0, Math.floor((Math.min.apply(null, lows) - max * .12) / 5) * 5);
    return { a0: a0, max: max, pct: function (v) { return Math.max(0, Math.min(100, (v - a0) / (max - a0) * 100)); } };
  }
  function graphKind(d) {
    var q = ""; try { q = (location.search.match(/[?&]zsg=([ABC])/) || [])[1] || ""; } catch (e) { }
    if (d.그래프 || W.ZZSTRAT_GRAPH || q) return d.그래프 || W.ZZSTRAT_GRAPH || q;
    /* 10-21 대표님: 등급컷은 C(등급 카드), 소방처럼 지역·연도별 커트가 여럿이면 B(회차별 점), 커트가 하나뿐이면 A(구간 막대) */
    if (isGrade(d)) return "C";
    var R = rowsOf(d);
    return R && R.rows.length >= 3 ? "B" : "A";
  }
  function goalPin(S, goal) { return goal > 0 ? '<div class="gp" data-zs="goal" style="left:' + S.pct(goal) + '%"><b>' + L.goal + ' ' + goal + '</b></div>' : ""; }
  /* A — 구간 막대: 등급(또는 합격) 구역을 색으로 칠하고, 회차마다 흔들린 컷 범위는 빗금, 목표는 위에 깃발 */
  function graphA(d, R, S, goal) {
    var o = '<div class="ga">' + goalPin(S, goal) + '<div class="bar">';
    var ks = R.keys.slice(), top = S.max;
    ks.forEach(function (k, i) {
      var s = span(R, k); if (!s) return; var col = GCOL[k] || "#555";
      var w = S.pct(top) - S.pct(s.hi);
      if (w > 0) o += '<i class="z" style="left:' + S.pct(s.hi) + '%;width:' + w + '%;background:' + col + '">' + (w > 13 ? '<em>' + gName(k) + '</em>' : '') + '</i>';
      if (s.hi > s.lo) o += '<i class="f" style="left:' + S.pct(s.lo) + '%;width:' + (S.pct(s.hi) - S.pct(s.lo)) + '%;--c:' + col + '"></i>';
      top = s.lo;
    });
    o += '<i class="z rest" style="left:0;width:' + S.pct(top) + '%">' + (S.pct(top) > 18 ? '<em>' + (R.grade ? (LANG === "ko" ? "그 아래" : "below") : L.failz) + '</em>' : '') + '</i></div><div class="ticks">';
    ks.forEach(function (k, i) {
      var s = span(R, k); if (!s) return;
      /* 막대 끝 가까이면 가운데 맞춤 대신 끝 맞춤 — 375px 에서 첫 글자가 잘리던 것(10-21 자격 창) */
      var x = S.pct((s.lo + s.hi) / 2), pos = x < 18 ? 'left:0;transform:none' : x > 82 ? 'left:auto;right:0;transform:none' : 'left:' + x + '%';
      o += '<span class="tk' + (i % 2 ? ' dn' : '') + '" style="' + pos + ';color:' + (GCOL[k] || "#555") + '">' + cName(k) + ' ' + fmt(s.lo, s.hi) + '</span>';
    });
    return o + '<span class="ax l">' + S.a0 + '</span><span class="ax r">' + S.max + '</span></div></div>';
  }
  /* B — 회차별 점: 회차(또는 연도·구분)마다 한 줄, 컷을 점으로 찍고 목표를 세로선으로 내리긋는다 */
  function graphB(d, R, S, goal) {
    var o = '<div class="gb">' + (goal > 0 ? '<div class="gline" style="left:calc(var(--lw) + (100% - var(--lw)) * ' + (S.pct(goal) / 100) + ')"><b>' + L.goal + ' ' + goal + '</b></div>' : '');
    R.rows.forEach(function (r) {
      o += '<div class="rw"><span class="rn">' + esc(r.name) + '</span><span class="tr"><i class="ln"></i>';
      R.keys.forEach(function (k) { var v = r.cuts[k]; if (v > 0) o += '<i class="dt" style="left:' + S.pct(v) + '%;background:' + (GCOL[k] || "#555") + '"><s>' + v + '</s></i>'; });
      o += '</span></div>';
    });
    o += '<div class="rw ax"><span class="rn"></span><span class="tr"><s style="left:0">' + S.a0 + '</s><s style="right:0">' + S.max + '</s></span></div>';
    o += '<div class="lg">' + R.keys.map(function (k) { return '<span><i style="background:' + (GCOL[k] || "#555") + '"></i>' + cName(k) + '</span>'; }).join("") + '</div>';
    return o + '</div>';
  }
  /* C — 등급 카드: 등급(또는 합격선)마다 카드 한 장, 컷 범위 숫자를 크게. 목표가 든 카드에 테 */
  function graphC(d, R, S, goal) {
    var o = '<div class="gc">', top = S.max;
    R.keys.forEach(function (k) {
      var s = span(R, k); if (!s) return; var col = GCOL[k] || "#555";
      var mine = goal > 0 && goal >= s.lo && goal <= top;
      o += '<div class="cd' + (mine ? ' on' : '') + '" style="--c:' + col + '"><div class="cn">' + gName(k) + '</div><div class="cv">' + fmt(s.lo, s.hi) + '<small>' + (LANG === "ko" ? "점" : "") + '</small></div><div class="cs">' + cName(k) + ' · ' + s.n + (LANG === "ko" ? "회" : "") + '</div>' + (mine ? '<div class="cg">' + L.goal + ' ' + goal + '</div>' : '') + '</div>';
      top = s.lo;
    });
    return o + '</div>';
  }
  function gaugeHTML(d, g) {
    var max = num((d.합격선 || {}).만점), goal = totalGoal(d, g), R = rowsOf(d);
    if (!(max > 0) || !R) return "";
    var all = []; R.keys.forEach(function (k) { var s = span(R, k); if (s) all.push(s); });
    d._hi = all.length ? all[0].hi : NaN; d._lo = all.length ? all[0].lo : NaN;   /* 가장 높은 등급(1컷) 또는 합격선 */
    var S = scale(d, R, goal), kind = graphKind(d);
    var body = kind === "B" ? graphB(d, R, S, goal) : kind === "C" ? graphC(d, R, S, goal) : graphA(d, R, S, goal);
    var ht = hitText(d, R, goal);
    return '<div class="gw" data-zs="gauge">' + body + (ht ? '<div class="hit" data-zs="hit">' + esc(ht) + '</div>' : '') + '</div>';
  }
  function cutTable(d) {
    var R = rowsOf(d); if (!R || !R.grade) return "";
    return '<table data-zs="cuts"><tr><th></th>' + R.keys.map(function (k) { return '<th style="color:' + (GCOL[k] || "") + '">' + cName(k) + '</th>'; }).join("") + '</tr>' +
      R.rows.map(function (r) { return '<tr><td>' + esc(r.name) + (r.note ? ' <span class="mu">' + esc(r.note) + '</span>' : '') + '</td>' + R.keys.map(function (k) { return '<td class="n">' + (r.cuts[k] > 0 ? r.cuts[k] : "–") + '</td>'; }).join("") + '</tr>'; }).join("") + '</table>';
  }
  function stackHTML(d, g) {
    var sub = d.과목 || [], h = d.합격선 || {}, max = num(h.만점);
    var tot = sub.reduce(function (a, s) { return a + (num(s.배점) || 0); }, 0);
    if (!(max > 0) || Math.abs(tot - max) > 0.5 || sub.some(function (s) { return !(subGoal(s, g) >= 0); })) return "";
    var sum = sub.reduce(function (a, s) { return a + subGoal(s, g); }, 0);
    var o = '<div data-zs="stack"><div class="desc" style="margin:14px 0 0">' + L.sum + ' <b>' + Math.round(sum * 10) / 10 + '</b> / ' + max + '</div><div class="stack">';
    sub.forEach(function (s) { o += '<i class="' + role(s) + '" style="width:' + (subGoal(s, g) / max * 100) + '%" title="' + esc(s.이름) + '">' + esc(s.이름) + '</i>'; });
    return o + '</div></div>';
  }
  function tierTags(d, s, g) {
    if (!s.등급) return "";
    var o = "";
    TIERS.forEach(function (t) { if (!s.등급[t]) return; var m = tierMode(d, s, g, t); o += '<span class="tg ' + (m || "a") + '"><b>' + t + '</b>' + (m ? modeName(m) : "") + '</span>'; });
    return o ? '<div class="tm">' + o + '</div>' : "";
  }
  function pickHTML(d, g) {
    var c = d.선택 || []; if (!c.length) return "";
    var max = num((d.합격선 || {}).만점);
    var o = '<section data-zs="pick"><h2>' + L.pick + '</h2><div class="picks">';
    c.forEach(function (x) {
      o += '<button type="button" class="pk' + (x.id === g ? ' on' : '') + '" data-g="' + esc(x.id) + '"><span class="ck"></span><div class="pn">' + esc(x.이름) + '</div>';
      if (num(x.목표) > 0) o += '<div class="pg">' + num(x.목표) + '<small> / ' + (max || "") + '</small></div>';
      if (x.설명) o += '<p class="pd">' + esc(x.설명) + '</p>';
      if (x.범위) { o += '<div class="tm">'; TIERS.forEach(function (t) { if (x.범위[t] == null) return; var m = MODE[x.범위[t]] || "a"; o += '<span class="tg ' + m + '"><b>' + t + '</b>' + modeName(m) + '</span>'; }); o += '</div>'; }
      o += '</button>';
    });
    return o + '</div></section>';
  }
  function qHTML(q) {
    var v = VERD[q.판정] || "f", ans = num(q.정답);
    var o = '<div class="q ' + v + '" data-zs="q-' + v + '"><div class="st ' + v + '">' + ({ m: L.must, f: L.fight, x: L.skipq })[v] + '</div>';
    if (q.출처) o += '<div class="qs">' + esc(q.출처) + '</div>';
    o += '<p class="qt">' + esc(q.발문) + '</p>';
    if (q.선지 && q.선지.length) o += '<ol>' + q.선지.map(function (t, i) { return '<li' + (i + 1 === ans ? ' class="a"' : '') + '>' + esc(t) + '</li>'; }).join("") + '</ol>';
    else if (q.정답 != null) o += '<div style="font-size:14px"><b>' + L.ans + '</b> ' + esc(q.정답) + '</div>';
    if (q.설명) o += '<p class="qe">' + esc(q.설명) + '</p>';
    return o + '</div>';
  }
  function detHTML(d, s, i, g) {
    var o = '<div class="det" id="zs-det-' + i + '"><h3>' + esc(s.이름) + '</h3>';
    var gi = s.지표 || {}, ch = [];
    if (gi.반복출제) ch.push(L.rep + ' ' + gi.반복출제); if (gi.신출) ch.push(L.newq + ' ' + gi.신출); if (gi.범위) ch.push(L.range + ' ' + gi.범위);
    if (ch.length) o += '<div class="ind">' + ch.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join("") + '</div>';
    var tip = subTip(s, g);
    if (tip) o += '<div class="kv tip" data-zs="tip-' + i + '"><b>' + esc((choice(d, g) || {}).이름 || L.goal) + '</b><p>' + esc(tip) + '</p></div>';
    if (s.등급) {
      o += '<div class="kv" data-zs="tiers-' + i + '"><b>' + L.tiers + '</b><ul class="tl">';
      TIERS.forEach(function (t) { if (!s.등급[t]) return; var m = tierMode(d, s, g, t) || "a"; o += '<li class="' + m + '"><span class="tg ' + m + '"><b>' + t + '</b>' + modeName(m) + '</span><span class="tx">' + esc(s.등급[t]) + '</span></li>'; });
      o += '</ul></div>';
    }
    if (s.이유) o += '<div class="kv" data-zs="why-' + i + '"><b>' + L.why + '</b><p>' + esc(s.이유) + '</p></div>';
    if (s.선) o += '<div class="kv hold" data-zs="hold-' + i + '"><b>' + L.hold + '</b><p>' + esc(s.선) + '</p></div>';
    if (s.버림) o += '<div class="kv"><b>' + L.drop + '</b><p>' + esc(s.버림) + '</p></div>';
    if (s.예시 && s.예시.length) o += '<div class="kv" style="margin:0"><b>' + L.ex + '</b></div>' + s.예시.map(qHTML).join("");
    return o + '</div>';
  }
  function build(d, g) {
    var h = d.합격선 || {}, sub = d.과목 || [], tg = totalGoal(d, g);
    var o = '<div class="in"><div class="top"><span class="t">' + L.btn + '</span><button type="button" class="tr">' + L.tour + '</button><button type="button" class="x" aria-label="' + L.close + '">✕</button></div>';
    o += '<div class="hero" data-zs="hero"><div class="nm">' + esc(d.이름) + (d.기준 ? ' · ' + esc(d.기준) : '') + '</div><h1>' + esc(d.한줄 || "") + '</h1>';
    o += '<span class="chip r">' + (d.방식 === "상대" ? L.rel : L.abs) + '</span>' + (h.과락 ? '<span class="chip">' + L.fail + ' · ' + esc(h.과락) + '</span>' : '') + '</div>';
    o += pickHTML(d, g);
    /* 합격선 */
    o += '<section data-zs="line"><h2>' + (isGrade(d) ? L.gcut : L.line) + '</h2>';
    if (tg > 0) o += '<div class="big">' + tg + '<small>/ ' + (num(h.만점) || "") + ' ' + L.goal + '</small></div>';
    if (h.설명) o += '<p class="desc" style="margin-top:10px">' + esc(h.설명) + '</p>';
    o += gaugeHTML(d, g);
    var c = choice(d, g);
    if (c && c.근거) o += '<p class="desc" data-zs="goalwhy">' + esc(c.근거) + '</p>';
    else if (h.목표근거) o += '<p class="desc" data-zs="goalwhy">' + esc(h.목표근거) + '</p>';
    o += stackHTML(d, g);
    if (isGrade(d)) o += cutTable(d);
    else if (h.커트 && h.커트.length) o += '<table data-zs="cuts"><tr><th>' + (d.방식 === "상대" ? L.cut : L.line) + '</th><th></th><th></th></tr>' + h.커트.map(function (x) { return '<tr><td>' + esc(x.연도 || "") + '</td><td>' + esc(x.구분 || "") + (x.비고 ? ' <span class="mu">' + esc(x.비고) + '</span>' : '') + '</td><td class="n">' + esc(x.점수) + '</td></tr>'; }).join("") + '</table>';
    if (h.가산점 && h.가산점.length) o += '<table data-zs="bonus" style="margin-top:14px"><tr><th>' + L.bonus + '</th><th></th><th></th></tr>' + h.가산점.map(function (x) { return '<tr><td>' + esc(x.항목) + '</td><td class="n">' + esc(x.점수) + '</td><td class="mu">' + esc(x.비고 || "") + '</td></tr>'; }).join("") + '</table>';
    var pr = d.합격률 || h.합격률;
    if (pr && pr.length) o += '<table data-zs="rate" style="margin-top:14px"><tr><th>' + L.rate + '</th><th>' + L.writ + '</th><th>' + L.prac + '</th></tr>' + pr.map(function (x) { return '<tr><td>' + esc(x.연도 || "") + (x.비고 ? ' <span class="mu">' + esc(x.비고) + '</span>' : '') + '</td><td class="n">' + esc(x.필기 || "") + '</td><td class="n">' + esc(x.실기 || "") + '</td></tr>'; }).join("") + '</table>';
    o += '</section>';
    /* 과목 */
    o += '<section><h2>' + L.subj + '</h2><div class="cards">';
    sub.forEach(function (s, i) {
      var r = role(s), bs = num(s.배점), gs = subGoal(s, g), q = subQ(s, g);
      o += '<button type="button" class="sc ' + r + '" data-i="' + i + '" data-zs="sc-' + i + '"><span class="rb">' + ({ s: L.strat, d: L.def, b: L.base })[r] + '</span><div class="sn">' + esc(s.이름) + '</div>';
      o += '<div class="sg">' + (gs >= 0 ? gs : "–") + (bs > 0 ? '<small> / ' + bs + '</small>' : '') + '</div>';
      if (q) o += '<div class="sq">' + esc(q) + '</div>';
      if (bs > 0 && gs >= 0) o += '<div class="bar"><b style="width:' + Math.min(100, gs / bs * 100) + '%"></b></div>';
      o += tierTags(d, s, g) + '</button>' + detHTML(d, s, i, g);
    });
    o += '</div></section>';
    var pk = d.실기;
    if (pk) {
      o += '<section data-zs="prac"><h2>' + L.prac + (pk.이름 ? ' · ' + esc(pk.이름) : '') + '</h2>';
      if (pk.방식) o += '<span class="chip r">' + esc(pk.방식) + '</span>';
      if (pk.목표) o += '<div class="big" style="font-size:24px;margin:10px 0 6px">' + esc(pk.목표) + '</div>';
      if (pk.설명) o += '<p class="desc">' + esc(pk.설명) + '</p>';
      if (pk.선) o += '<div class="kv hold"><b>' + L.hold + '</b><p>' + esc(pk.선) + '</p></div>';
      if (pk.버림) o += '<div class="kv"><b>' + L.drop + '</b><p>' + esc(pk.버림) + '</p></div>';
      if (pk.예시 && pk.예시.length) o += pk.예시.map(qHTML).join("");
      o += '</section>';
    }
    if (d.순서 && d.순서.length) o += '<section><h2>' + L.order + '</h2><ol class="ord">' + d.순서.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ol></section>';
    o += '<button type="button" class="go">' + L.start + '</button>';
    if (d.출처 && d.출처.length) o += '<div class="src">' + L.src + ' · ' + d.출처.map(esc).join(" · ") + '</div>';
    return o + '</div>';
  }
  function openDet(box, i, on) {
    var c = box.querySelector('.sc[data-i="' + i + '"]'), dt = box.querySelector("#zs-det-" + i);
    if (!c || !dt) return;
    var want = on == null ? !dt.classList.contains("on") : on;
    /* 세부 칸이 카드 줄 바로 아래 오도록: 같은 줄 마지막 카드 뒤로 옮긴다 */
    if (want) {
      var cards = [].slice.call(box.querySelectorAll(".sc")), top = c.offsetTop, last = c;
      cards.forEach(function (x) { if (x.offsetTop === top) last = x; });
      last.parentNode.insertBefore(dt, last.nextSibling);
    }
    box.querySelectorAll(".det.on").forEach(function (x) { if (x !== dt) x.classList.remove("on"); });
    box.querySelectorAll(".sc.on").forEach(function (x) { if (x !== c) x.classList.remove("on"); });
    dt.classList.toggle("on", want); c.classList.toggle("on", want);
  }
  function tourOn() { return !!(SR && SR.getElementById("zst")); }
  function close() {
    var b = D.getElementById("zs-host"); if (!b) return;
    var box = SR && SR.getElementById("zs");
    var done = function () { b.remove(); if (SR && !D.getElementById("zs-host")) SR = null; };
    try { D.documentElement.style.overflow = cur && cur.ov || ""; } catch (e) { }
    if (box && !RM) { box.classList.add("out"); setTimeout(done, 190); } else done();
  }
  function rerender(id, box) {
    var d = DB[id], g = getGoal(id), y = box.scrollTop, opened = box.querySelector(".det.on");
    var oi = opened ? opened.id.replace("zs-det-", "") : null;
    box.innerHTML = build(d, g); box.scrollTop = y;
    if (oi != null) openDet(box, +oi, true);
  }
  function open(id, opt) {
    opt = opt || {};
    var d = DB[id]; if (!d) { try { console.warn("ZZSTRAT: 데이터 없음", id); } catch (e) { } return false; }
    style();
    var old = D.getElementById("zs-host"); if (old) old.remove();
    var host = D.createElement("div"); host.id = "zs-host"; host.style.cssText = "all:initial"; D.body.appendChild(host);
    SR = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var sst = D.createElement("style"); sst.textContent = css +
      (LANG === "ja" ? "\n#zs,#zs *,#zst,#zst *{word-break:normal!important;line-break:strict;overflow-wrap:anywhere}" : ""); SR.appendChild(sst);
    var box = D.createElement("div"); box.id = "zs"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", L.btn);
    var g = getGoal(id); if (g && !choice(d, g)) g = null;
    box.innerHTML = build(d, g); SR.appendChild(box);
    cur = { id: id, ov: D.documentElement.style.overflow }; D.documentElement.style.overflow = "hidden";
    box.addEventListener("click", function (e) {
      var pk = e.target.closest(".pk");
      if (pk) { setGoal(id, pk.getAttribute("data-g")); rerender(id, box); box.dispatchEvent(new CustomEvent("zsgoal")); try { if (opt.onGoal) opt.onGoal(pk.getAttribute("data-g")); } catch (x) { } return; }
      var sc = e.target.closest(".sc"); if (sc) return openDet(box, +sc.getAttribute("data-i"));
      if (e.target.closest(".x") || e.target.closest(".go")) { mark(id); close(); if (opt.onClose) try { opt.onClose(); } catch (x) { } return; }
      if (e.target.closest(".tr")) tour(id, box);
    });
    D.addEventListener("keydown", function k(e) { if (e.key === "Escape" && !tourOn()) { close(); D.removeEventListener("keydown", k); } });
    if (opt.tour) setTimeout(function () { tour(id, box); }, RM ? 50 : 380);
    return true;
  }

  /* ── 튜토리얼: 문장은 전부 데이터에서 ── */
  function steps(d, box, g) {
    var h = d.합격선 || {}, sub = d.과목 || [], st = [], c = choice(d, g);
    var q = function (s) { return function () { return box.querySelector('[data-zs="' + s + '"]'); }; };
    if (d.한줄) st.push({ el: q("hero"), h: d.이름, t: d.한줄 });
    if ((d.선택 || []).length) st.push({ el: q("pick"), h: L.pick, pick: true, t: d.선택.map(function (x) { return x.이름 + (num(x.목표) > 0 ? " " + num(x.목표) + (h.단위 != null ? h.단위 : L.pt) : ""); }).join(" / ") });   /* 만점이 문항 수인 시험은 합격선.단위:"개" */
    var tg = totalGoal(d, g);
    if (tg > 0) {
      var R = rowsOf(d), ht = hitText(d, R, tg);
      var t = ht ? ht + "." : (d._hi > 0 ? (d.방식 === "상대" ? L.cut : L.line) + " " + fmt(d._lo, d._hi) + ". " : "") + L.goal + " " + tg + " / " + num(h.만점) + ".";
      var why = c && c.근거 ? c.근거 : h.목표근거;
      st.push({ el: q("gauge"), h: isGrade(d) ? L.gcut : L.line, t: t + (why ? " " + lead(why) : "") });
    } else if (h.설명) st.push({ el: q("line"), h: L.line, t: lead(h.설명) });
    if (h.가산점 && h.가산점.length) st.push({ el: q("bonus"), h: L.bonus, t: h.가산점.slice(0, 2).map(function (x) { return x.항목 + " " + x.점수; }).join(" · ") });
    if (box.querySelector('[data-zs="stack"]')) st.push({ el: q("stack"), h: L.sum, t: sub.map(function (s) { return s.이름 + " " + subGoal(s, g); }).join(" + ") });
    var si = -1, di = -1;
    sub.forEach(function (s, i) { if (role(s) === "s" && si < 0) si = i; if (role(s) === "d" && di < 0) di = i; });
    [[si, L.strat], [di, L.def]].forEach(function (p) {
      var i = p[0]; if (i < 0) return; var s = sub[i], qq = subQ(s, g);
      st.push({ el: q("sc-" + i), h: p[1] + " · " + s.이름, t: (qq ? qq + ". " : "") + lead(subTip(s, g) || s.이유) });
      if (s.등급 && c) st.push({ el: q("tiers-" + i), before: function () { openDet(box, i, true); }, h: L.tiers + " · " + c.이름,
        t: TIERS.filter(function (x) { return s.등급[x]; }).map(function (x) { return x + " " + modeName(tierMode(d, s, g, x) || "a"); }).join(" · ") });
      if (s.선) st.push({ el: q("hold-" + i), before: function () { openDet(box, i, true); }, h: L.hold, t: lead(s.선) });
      var ex = (s.예시 || []);
      var em = ex.filter(function (x) { return x.판정 === "필수"; })[0], ex2 = ex.filter(function (x) { return x.판정 === "버림"; })[0] || ex.filter(function (x) { return x.판정 === "승부"; })[0];
      [em, ex2].forEach(function (x) {
        if (!x) return; var v = VERD[x.판정];
        st.push({ el: function () { return box.querySelector("#zs-det-" + i + " .q." + v); }, before: function () { openDet(box, i, true); }, h: ({ m: L.must, f: L.fight, x: L.skipq })[v] + (x.출처 ? " · " + x.출처 : ""), t: lead(x.설명) });
      });
    });
    if (d.실기 && (d.실기.설명 || d.실기.목표)) st.push({ el: q("prac"), h: L.prac + (d.실기.이름 ? " · " + d.실기.이름 : ""), t: (d.실기.목표 ? d.실기.목표 + ". " : "") + lead(d.실기.설명) });
    st.push({ el: function () { return D.querySelector(".zs-fab") || box.querySelector(".tr"); }, h: L.btn, t: LANG === "ko" ? "목표를 바꾸거나 다시 볼 때는 이 버튼." : LANG === "ja" ? "目標の変更・見直しはこのボタンから。" : "Change your target or review here." });
    return st.filter(function (s) { return s.t; });
  }
  function tour(id, box) {
    var d = DB[id]; if (!d || tourOn()) return;
    var list = steps(d, box, getGoal(id)), i = 0;
    var tb = D.createElement("div"); tb.id = "zst";
    tb.innerHTML = '<div class="hole"></div><div class="bub" aria-live="polite"><div class="h"></div><div class="tx"></div><div class="row"><span class="dots"></span><button type="button" class="sk">' + L.skip + '</button><button type="button" class="nx">' + L.next + '</button></div></div>';
    (SR || D.body).appendChild(tb);
    var hole = tb.querySelector(".hole"), bub = tb.querySelector(".bub"), nx = bub.querySelector(".nx");
    if (RM) hole.style.transition = "none";
    function el() { try { return list[i].el(); } catch (e) { return null; } }
    function ok(e) { if (!e) return false; var r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }
    function place() {
      var e = el(); if (!ok(e)) return;
      var r = e.getBoundingClientRect(), pad = 8, vh = innerHeight, hh = Math.min(r.height + pad * 2, vh * .55);
      hole.style.left = (r.left - pad) + "px"; hole.style.top = (r.top - pad) + "px"; hole.style.width = (r.width + pad * 2) + "px"; hole.style.height = hh + "px";
      var below = r.top - pad + hh + 14, bh = bub.offsetHeight || 140;
      if (below + bh < vh - 12) { bub.style.top = below + "px"; bub.style.bottom = ""; }
      else if (r.top - pad - 14 - bh > 12) { bub.style.top = (r.top - pad - 14 - bh) + "px"; bub.style.bottom = ""; }
      else { bub.style.top = ""; bub.style.bottom = "16px"; }
    }
    function end() { tb.remove(); W.removeEventListener("resize", place); box.removeEventListener("scroll", place); box.removeEventListener("zsgoal", picked); mark(id); }
    /* 목표를 고르면: 화면이 새로 그려지니 남은 단계를 고른 목표로 다시 만든다 */
    function picked() {
      if (!list[i] || !list[i].pick) return;
      var rest = steps(d, box, getGoal(id)), k = 0;
      while (k < rest.length && !rest[k].pick) k++;
      list = list.slice(0, i + 1).concat(rest.slice(k + 1));
      next();
    }
    box.addEventListener("zsgoal", picked);
    function show() {
      if (list[i].before) try { list[i].before(); } catch (e) { }
      var e = el();
      if (!ok(e)) { if (++i < list.length) return show(); return end(); }
      var fixed = getComputedStyle(e).position === "fixed";
      if (!fixed) try { e.scrollIntoView({ block: e.offsetHeight > innerHeight * .5 ? "start" : "center", behavior: RM ? "auto" : "smooth" }); } catch (x) { }
      var pk = !!list[i].pick && !getGoal(id);
      tb.classList.toggle("pass", pk); nx.hidden = pk;   /* 고르기 단계: 카드를 직접 눌러야 넘어간다 */
      bub.querySelector(".h").textContent = list[i].h || "";
      bub.querySelector(".tx").textContent = list[i].t;
      /* 단계가 9개를 넘으면 점 대신 「4 / 15」 — 점이 많으면 다음 버튼이 말풍선 밖으로 밀린다 */
      bub.querySelector(".dots").innerHTML = list.length > 9 ? '<span class="cnt">' + (i + 1) + ' / ' + list.length + '</span>' : list.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join("");
      nx.textContent = i === list.length - 1 ? L.end : L.next;
      bub.classList.remove("in"); void bub.offsetWidth; bub.classList.add("in");
      place(); setTimeout(place, RM ? 0 : 380);
      try { if (W.ZZ && W.ZZ.play) W.ZZ.play("pick", { vol: .3 }); } catch (x) { }   /* 음 높이는 고정(단계마다 올리지 않는다) */
    }
    function next() { if (++i >= list.length) return end(); show(); }
    nx.onclick = function (e) { e.stopPropagation(); next(); };
    bub.querySelector(".sk").onclick = function (e) { e.stopPropagation(); end(); };
    tb.addEventListener("click", function (e) { if (tb.classList.contains("pass")) return; if (!bub.contains(e.target)) next(); });
    W.addEventListener("resize", place); box.addEventListener("scroll", place);
    show();
  }

  /* ── 버튼 ── */
  function fab(id) {
    if (!DB[id]) return null; style();
    var b = D.querySelector(".zs-fab");
    if (!b) { b = D.createElement("button"); b.type = "button"; b.className = "zs-fab"; b.innerHTML = ICON + '<span>' + L.btn + '</span>'; D.body.appendChild(b); }
    b.onclick = function () { open(b.getAttribute("data-id")); };
    b.setAttribute("data-id", id);
    return b;
  }
  function button(id, host) {
    if (!DB[id]) return null; style();
    var h = typeof host === "string" ? D.querySelector(host) : host; if (!h) return null;
    var b = D.createElement("button"); b.type = "button"; b.className = "zs-btn"; b.innerHTML = ICON + '<span>' + L.btn + '</span>';
    b.onclick = function () { open(id); }; h.appendChild(b); return b;
  }
  function auto(id, opt) {
    opt = opt || {};
    function go() {
      if (!DB[id]) return;
      if (opt.fab !== false) fab(id);
      if (!seen(id)) setTimeout(function () { open(id, { tour: true }); }, opt.delay == null ? 500 : opt.delay);
    }
    if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", go); else go();
  }
  function add(d) { if (d && d.id) DB[d.id] = d; }
  W.ZZSTRAT = { add: add, open: open, auto: auto, fab: fab, button: button, reset: reset, seen: seen, close: close, goal: getGoal, data: DB };
})();
