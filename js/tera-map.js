/* 테라러닝 합격 지도 2판 — 시험 한 개의 전체 구조·진척·중요도·추천 순서를 한 장에 (2026-11-10 허브)
 *   1판(고리 칸 + 범례 줄 + 추천 띠)은 대표님 「직관적으로 눈에 안 들어옴. 조잡해 보임」 → 표시를 덜어 냄.
 *   타일 크기는 전부 같다(대표님 「타일이 넓을수록은 안 됨. 디자인 통일성 위배」).
 *   타일이 채워진 만큼 = 내 진척. 지금 할 것 세 개에만 번호, 1번에만 「추천」.
 *   중요도 표시(대표님 11-10 최종): 대입·공무원·전문직 = 별 1~3개(mark:"star") · 기사·NCS·기타 자격·중개사 = S·A·B·C(mark:"tier").
 *
 * 쓰는 법(공용 스킬트리 STREE.mount 와 같은 자료)
 *   TERA_MAP.mount(host, {
 *     title: "소방 공채", sub: "합격 지도", dday: "D-116", unit: "문제",
 *     mark: "star",            // 중요도 표시. "star" 별 1~3개(대입·공무원·전문직) · "tier" S·A·B·C(기술·NCS·자격·중개사). 옛 tiers:true 는 "tier" 와 같다
 *     look: "grid",            // "grid" 가안: 과목이 줄, 같은 크기 타일 격자 · "board" 나안: 과목이 세로 칸
 *     groups: [{ name, nodes: [{ id, name, avg(해마다 몇 문제), pct(0~100), tier, order, dim(범위 밖은 흐리게),
 *        leaves: [{ name, avg, pct }] }] }],
 *     recommend: 3, onNode(node, group), onLeaf(leaf, node, group), onStart(node, group)
 *   })
 *   줄 = groups(시험의 과목. 과목이 하나면 대단원), 타일 = nodes(핵심 파트). 추천 순서 = 중요도 × 남은 정도가 큰 차례.
 * 색: 앱의 --pt(없으면 --t-app, --cta). 클래스는 전부 tm- 로 시작한다(앱 css 와 겹치지 않게).
 */
(function () {
  if (window.TERA_MAP && window.TERA_MAP.version >= 2) return;
  var d = document, styled = false;
  var CSS = [
    ".tm{--p:var(--pt,var(--t-app,var(--cta,#E5202E)));--pi:color-mix(in srgb,var(--p) 80%,#111419);--pf:color-mix(in srgb,var(--p) 20%,#fff);",
    " color:#111419;font:500 15px/1.35 'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif;letter-spacing:-.02em;position:relative;max-width:1180px;margin:0 auto}",
    ".tm *{box-sizing:border-box}.tm i,.tm em,.tm s{font-style:normal;text-decoration:none}.tm button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    /* 머리 한 줄: 제목 · D-day · 전체 진척 · 다음 세 개 */
    ".tm-top{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-bottom:18px}",
    ".tm-top h2{margin:0;font-weight:900;font-size:26px;line-height:1.2;letter-spacing:-.04em}.tm-top h2 small{font-weight:700;font-size:14px;line-height:1;color:#5F6670;margin-left:8px;letter-spacing:-.02em}",
    ".tm-dd{font-weight:900;font-size:20px;line-height:1;letter-spacing:-.04em;color:var(--pi)}",
    ".tm-all{display:flex;align-items:center;gap:8px;flex:1;min-width:150px;max-width:280px}",
    ".tm-all i{flex:1;height:10px;border-radius:10px;background:#EFF1F4;overflow:hidden}.tm-all i u{display:block;height:100%;border-radius:10px;background:var(--p)}",
    ".tm-all b{font-weight:900;font-size:18px;line-height:1}",
    ".tm-next{display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap}",
    ".tm-next button{display:flex;align-items:center;gap:7px;height:38px;padding:0 13px 0 6px;border-radius:999px;border:0;background:#F1F3F6;font-weight:700;font-size:14px}",
    ".tm-next button:first-child{background:var(--p);color:#fff}.tm-next button:first-child .tm-no{background:#fff;color:var(--pi)}",
    ".tm-next s{color:#B4BAC3;font-weight:800}",
    ".tm-no{flex:none;display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--p);color:#fff;font-weight:900;font-size:13px;line-height:1}",
    /* 가안: 과목이 줄 */
    ".tm-lanes{display:grid;gap:16px}",
    ".tm-lane{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start}",
    ".tm-lh{padding-top:6px}.tm-lh b{display:block;font-weight:800;font-size:17px;line-height:1.25;letter-spacing:-.03em;word-break:keep-all}",
    ".tm-lh span{display:block;font-weight:700;font-size:12.5px;line-height:1;color:#5F6670;margin-top:8px}",
    ".tm-lh i{display:block;height:6px;border-radius:6px;background:#EFF1F4;overflow:hidden;margin-top:8px}.tm-lh i u{display:block;height:100%;border-radius:6px;background:var(--p)}",
    ".tm-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(156px,1fr));gap:6px}",
    /* 타일: 크기는 전부 같다. 채움 = 진척 */
    ".tm-t{position:relative;min-width:0;height:60px;padding:0 10px 0 12px;border:0;border-radius:14px;overflow:hidden;text-align:left;",
    " background:linear-gradient(90deg,var(--pf) calc(var(--v)*1%),#F1F3F6 0);display:flex;align-items:center;gap:8px;transition:transform .12s,box-shadow .15s}",
    ".tm-t:hover{transform:translateY(-1px);box-shadow:0 6px 16px -8px rgba(17,20,25,.3)}",
    ".tm-tx{flex:1;min-width:0}",
    ".tm-nm{display:block;font-weight:700;font-size:14px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".tm-av{display:block;font-weight:600;font-size:11.5px;line-height:1.2;color:#5F6670;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tm-first .tm-av{display:none}",
    ".tm-two .tm-nm,.tm-first .tm-nm{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13.5px;line-height:1.22;word-break:keep-all;overflow-wrap:anywhere}",
    ".tm-st{display:block;font-size:11px;line-height:1;letter-spacing:1px;color:#E2E8F0;margin-top:4px}.tm-st b{color:#F59E0B;font-weight:400}.tm-done .tm-st{color:rgba(255,255,255,.35)}.tm-done .tm-st b{color:#fff}",
    ".tm-pc{flex:none;font-weight:800;font-size:12.5px;line-height:1;color:var(--pi)}",
    ".tm-tier{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:7px;font-weight:900;font-size:12px;line-height:1;color:#fff}",
    ".tm-S{background:#FACC15;color:#111419}.tm-A{background:#E5202E}.tm-B{background:#2563EB}.tm-C{background:#4B5563}",
    ".tm-t.tm-done{background:var(--p);color:#fff}.tm-t.tm-done .tm-pc{color:#fff;font-size:16px}.tm-t.tm-done .tm-av{color:rgba(255,255,255,.85)}",
    ".tm-t.tm-dim{opacity:.42}",
    ".tm-t.tm-rec{box-shadow:0 0 0 2px var(--p) inset}",
    ".tm-t.tm-first{box-shadow:0 0 0 3px var(--p) inset,0 10px 22px -12px var(--p)}",
    ".tm-t.tm-on{box-shadow:0 0 0 3px #111419 inset}",
    ".tm-tag{flex:none;height:22px;padding:0 8px;border-radius:999px;background:var(--p);color:#fff;font-weight:800;font-size:11.5px;line-height:22px}",
    /* 나안: 과목이 세로 칸 */
    ".tm-board .tm-lanes{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:start}",
    ".tm-board .tm-lane{display:block;border-radius:18px;background:#FAFAFB;box-shadow:0 0 0 1px #E6E8EC;padding:14px 10px 10px}",
    ".tm-board .tm-lh{padding:0 4px 10px}.tm-board .tm-row{grid-template-columns:1fr;gap:5px}",
    ".tm-board .tm-t{height:46px;border-radius:12px;background:linear-gradient(90deg,var(--pf) calc(var(--v)*1%),#fff 0);box-shadow:0 0 0 1px #E6E8EC inset}",
    ".tm-board .tm-t.tm-done{background:var(--p);box-shadow:none}.tm-board .tm-t.tm-rec{box-shadow:0 0 0 2px var(--p) inset}.tm-board .tm-t.tm-first{box-shadow:0 0 0 3px var(--p) inset}",
    ".tm-board .tm-av{display:none}",
    /* 고른 타일 판 */
    ".tm-pv{position:fixed;z-index:2147480000;right:16px;top:76px;bottom:16px;width:340px;border-radius:22px;background:#fff;box-shadow:0 26px 60px -28px rgba(17,20,25,.34),0 0 0 1px #E6E8EC;padding:18px;display:none;flex-direction:column;gap:12px}",
    ".tm-pv.tm-open{display:flex}",
    ".tm-h{display:flex;align-items:center;gap:8px}.tm-h b{flex:1;font-weight:900;font-size:20px;line-height:1.25;letter-spacing:-.03em}",
    ".tm-x{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid #D3D7DD;background:#fff;font-size:18px;line-height:1}",
    ".tm-k{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px}.tm-k div{border-radius:14px;background:#F6F7F9;padding:10px}",
    ".tm-k b{display:block;font-weight:900;font-size:20px;line-height:1}.tm-k span{font-weight:600;font-size:11.5px;line-height:1;color:#5F6670}",
    ".tm-ls{flex:1;min-height:0;overflow:auto;display:grid;gap:6px;align-content:start}",
    ".tm-lf{position:relative;width:100%;min-height:44px;text-align:left;padding:8px 46px 8px 12px;border:0;border-radius:12px;overflow:hidden;background:linear-gradient(90deg,var(--pf) calc(var(--v)*1%),#F1F3F6 0);font-weight:700;font-size:14px;line-height:1.3}",
    ".tm-lf em{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-weight:800;font-size:12.5px;line-height:1;color:var(--pi)}",
    ".tm-go{flex:none;height:54px;border-radius:16px;border:0;background:var(--p);color:#fff;font-weight:800;font-size:16.5px}",
    "@media(max-width:959px){.tm-top h2{font-size:22px}.tm-next{margin-left:0;width:100%}.tm-all{max-width:none}",
    " .tm-lane{grid-template-columns:1fr;gap:8px}.tm-lh{display:flex;align-items:center;gap:10px;padding:0}.tm-lh b{font-size:16px}.tm-lh span{margin:0;white-space:nowrap}.tm-lh i{flex:1;margin:0}",
    " .tm-row{grid-template-columns:1fr 1fr}.tm-t{height:54px}.tm-board .tm-lh{padding:0 4px 10px}",
    " .tm-pv{left:0;right:0;top:auto;bottom:0;width:auto;max-height:70vh;border-radius:22px 22px 0 0}}"
  ].join("");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(x) { x = Math.round((x || 0) * 10) / 10; return x % 1 ? x.toFixed(1) : String(x); }

  function mount(host, o) {
    if (!styled) { var st = d.createElement("style"); st.textContent = CSS; d.head.appendChild(st); styled = true; }
    var G = (o.groups || []).map(function (g) { return { src: g, name: g.name, nodes: (g.nodes || []).slice() }; });
    var all = [], unit = o.unit || "문제";
    G.forEach(function (g) { g.nodes.forEach(function (n) { all.push({ n: n, g: g }); }); });
    var noAvg = !all.some(function (x) { return x.n.avg > 0; });
    var mark = noAvg ? "" : o.mark || (o.tiers ? "tier" : "");   // "tier" = S·A·B·C(기술·NCS·자격·중개사) · "star" = 별 1~3개(대입·공무원·전문직)
    var tiers = mark === "tier", stars = mark === "star";
    function W(n) { return noAvg ? 1 : (n.avg || 0); }
    // 등급: 준 값이 없으면 중요도 순위로 S 20% · A 30% · B 30% · C 나머지 (tiers 일 때만 그린다)
    all.slice().sort(function (a, b) { return W(b.n) - W(a.n); }).forEach(function (x, i, arr) {
      var r = i / Math.max(1, arr.length); x.tier = x.n.tier || (!(x.n.avg > 0) ? "C" : r < .2 ? "S" : r < .5 ? "A" : r < .8 ? "B" : "C");
      x.star = x.n.star || (!(x.n.avg > 0) ? 1 : r < .2 ? 3 : r < .5 ? 2 : 1);
    });
    var R = Math.max(1, Math.min(3, o.recommend || 3));   // 번호는 세 개까지(앱이 더 달라고 해도)
    var given = all.filter(function (x) { return x.n.order > 0; }).sort(function (a, b) { return a.n.order - b.n.order; });
    var rec = (given.length ? given : all.filter(function (x) { return (x.n.pct || 0) < 80 && W(x.n) > 0 && !x.n.dim; })
      .sort(function (a, b) { return W(b.n) * (1 - (b.n.pct || 0) / 100) - W(a.n) * (1 - (a.n.pct || 0) / 100); })).slice(0, R);
    rec.forEach(function (x, i) { x.order = i + 1; });
    var tot = 0, got = 0;
    all.forEach(function (x) { var a = W(x.n); tot += a; got += a * (x.n.pct || 0) / 100; });
    var whole = tot ? Math.round(got / tot * 100) : 0;

    var h = '<div class="tm-top"><h2>' + esc(o.title || "합격 지도") + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</h2>" +
      (o.dday ? '<span class="tm-dd">' + esc(o.dday) + "</span>" : "") +
      '<span class="tm-all"><i><u style="width:' + whole + '%"></u></i><b>' + whole + "%</b></span>" +
      (rec.length ? '<span class="tm-next">' + rec.map(function (x, i) {
        return (i ? "<s>›</s>" : "") + '<button data-id="' + all.indexOf(x) + '"><i class="tm-no">' + (i + 1) + "</i>" + esc(x.n.name) + "</button>";
      }).join("") + "</span>" : "") + "</div>";
    h += '<div class="tm-lanes">';
    G.forEach(function (g) {
      var ga = g.nodes.reduce(function (s, n) { return s + W(n); }, 0);
      var gp = ga ? g.nodes.reduce(function (s, n) { return s + W(n) * (n.pct || 0); }, 0) / ga : 0;
      var share = tot ? Math.round(ga / tot * 100) : 0;
      h += '<section class="tm-lane"><div class="tm-lh"><b>' + esc(g.name) + "</b><span>" +
        (noAvg ? "" : "출제 " + share + "% · ") + "진척 " + Math.round(gp) + '%</span><i><u style="width:' + Math.round(gp) + '%"></u></i></div><div class="tm-row">';
      g.nodes.forEach(function (n) {
        var x = all.filter(function (y) { return y.n === n; })[0], p = Math.round(n.pct || 0);
        var cls = "tm-t" + (p >= 80 ? " tm-done" : "") + (n.dim ? " tm-dim" : "") + (x.order ? " tm-rec" : "") + (x.order === 1 ? " tm-first" : "");
        h += '<button class="' + cls + '" data-id="' + all.indexOf(x) + '" style="--v:' + (p >= 80 ? 100 : p) + '"' +
          ' title="' + esc(n.name) + (noAvg ? "" : " · 해마다 " + num(n.avg) + esc(unit)) + " · 진척 " + p + '%">' +
          (x.order ? '<i class="tm-no">' + x.order + "</i>" : tiers ? '<i class="tm-tier tm-' + x.tier + '">' + x.tier + "</i>" : "") +
          '<span class="tm-tx"><span class="tm-nm">' + esc(n.name) + "</span>" +
          (stars ? '<span class="tm-st"><b>' + "★★★".slice(0, x.star) + "</b>" + "★★★".slice(x.star) + "</span>" : "") + "</span>" +
          (x.order === 1 ? '<i class="tm-tag">추천</i>' : p >= 80 ? '<span class="tm-pc">✓</span>' : p ? '<span class="tm-pc">' + p + "%</span>" : "") + "</button>";
      });
      h += "</div></section>";
    });
    h += '</div><aside class="tm-pv"></aside>';
    host.className = host.className.replace(/\btmap\b|\btm-board\b|\btm-two\b/g, "").trim();
    host.classList.add("tm"); if (o.look === "board") host.classList.add("tm-board"); host.classList.toggle("tm-two", tiers || noAvg);
    host.innerHTML = h;

    var pv = host.querySelector(".tm-pv"), cur = null;
    function show(x) {
      cur = x; var n = x.n, L = n.leaves || [];
      host.querySelectorAll(".tm-t").forEach(function (b) { b.classList.toggle("tm-on", all[+b.dataset.id] === x); });
      pv.innerHTML = '<div class="tm-h">' + (tiers ? '<i class="tm-tier tm-' + x.tier + '">' + x.tier + "</i>" : "") + "<b>" + esc(n.name) + '</b><button class="tm-x" aria-label="닫기">×</button></div>' +
        '<div class="tm-k"><div><b>' + Math.round(n.pct || 0) + "%</b><span>진척</span></div>" +
        (noAvg ? "" : "<div><b>" + (n.avg > 0 ? num(n.avg) : "–") + "</b><span>해마다 " + esc(unit) + "</span></div>") +
        (x.order ? "<div><b>" + x.order + "</b><span>추천 순서</span></div>" : "") + "</div>" +
        '<div class="tm-ls">' + L.map(function (l, i) { var q = Math.round(l.pct || 0); return '<button class="tm-lf" data-l="' + i + '" style="--v:' + q + '">' + esc(l.name) + "<em>" + q + "%</em></button>"; }).join("") + "</div>" +
        '<button class="tm-go">시작</button>';
      pv.classList.add("tm-open");
      if (typeof o.onNode === "function") o.onNode(n, x.g.src);
    }
    host.onclick = function (e) {
      var b = e.target.closest("[data-id]");
      if (b) { var x = all[+b.dataset.id]; show(x); if (b.closest(".tm-next")) { var el = host.querySelector('.tm-t[data-id="' + b.dataset.id + '"]'); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); } return; }
      if (e.target.closest(".tm-x")) { pv.classList.remove("tm-open"); host.querySelectorAll(".tm-on").forEach(function (q) { q.classList.remove("tm-on"); }); return; }
      var lf = e.target.closest(".tm-lf");
      if (lf && cur && typeof o.onLeaf === "function") return o.onLeaf(cur.n.leaves[+lf.dataset.l], cur.n, cur.g.src);
      if (e.target.closest(".tm-go") && cur && typeof o.onStart === "function") o.onStart(cur.n, cur.g.src);
    };
    return { recommend: rec.map(function (x) { return x.n; }), whole: whole };
  }

  window.TERA_MAP = { mount: mount, version: 2 };
})();
