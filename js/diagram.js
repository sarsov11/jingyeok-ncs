/* 개념 도식 — 카드의 줄글을 구조로 보여 주는 블록 그리개 (2026-10-25 대표님
   「개념카드가 줄글로만 줄줄 써 있으니 공부하기 싫어진다, 구조화할 수 있는 건 다이어그램으로」).
   모든 과목 사이트가 이 파일과 css/diagram.css 를 그대로 복사해 쓴다. 색은 CSS 변수만 쓴다.

   블록 꼴 (t 로 가른다, 글 안의 **굵게** 는 <b>)
     def   {term, text, ex:[...]}                         개념어 정의 상자
     flow  {title, steps:[...]}                           차례·단계 (↓ 화살표)
     cause {title, causes:[...], result, effects:[...]}   원인 → 현상 → 결과
     tree  {title, root, branches:[[이름, 설명], ...]}     갈래 나누기
     vs    {title, cols:[{name, items:[...]}, ...]}        둘·셋 견주기
     venn  {title, a:{name, items}, b:{name, items}, both:[...]}  공통점·차이점
     cycle {title, steps:[...]}                           되풀이 고리
     axis  {title, left, right, marks:[{at:0~100, name, text}]}   양 끝 사이 위치
     table {title, head:[...], rows:[[...]]}              표
*/
(function(){
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  /* 사이트가 글꼴 함수를 주면(수학 $…$ 수식 등) 그것으로 그린다 — 함수는 이스케이프까지 맡는다 */
  function b(t){ if(window.DIAGRAM&&window.DIAGRAM.글꼴) return window.DIAGRAM.글꼴(String(t==null?"":t)).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>"); return esc(t).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>"); }
  /* 가운뎃점으로 이은 칸은 줄을 바꾼다(통사 0915 규칙). 줄이 여럿이면 줄마다 점을 찍어 사실 하나씩 보이게(1028 「너저분한 것은 용납 안 됨」) */
  function 칸(t){ var 줄=b(t).split(" · "); return 줄.length>1 ? 줄.map(function(l){ return '<span class="dg-ln">'+l+'</span>'; }).join("") : 줄[0]; }
  function 제목(t){ return t ? '<div class="dg-t">'+b(t).split(" · ").join(", ")+'</div>' : ""; }
  function 목록(xs){ return (xs&&xs.length) ? '<ul>'+xs.map(function(x){ return '<li>'+b(x)+'</li>'; }).join("")+'</ul>' : ""; }
  function 맨글(t){ return String(t||"").replace(/\*\*/g,""); }

  var 그리개 = {
    def: function(x){
      return '<div class="dg dg-def"><div class="dg-term">'+b(x.term)+'</div>'+
        '<div class="dg-dtext">'+칸(x.text)+'</div>'+
        /* 예가 짧으면 알약, 문장이면 목록 */
        ((x.ex&&x.ex.length)?(x.ex.some(function(e){ return 맨글(e).length>18; })
          ? '<div class="dg-exl"><span>예</span>'+목록(x.ex)+'</div>'
          : '<div class="dg-ex"><span>예</span>'+x.ex.map(function(e){ return '<i>'+b(e)+'</i>'; }).join("")+'</div>'):'')+
      '</div>';
    },
    flow: function(x){
      return '<div class="dg dg-flow">'+제목(x.title)+'<ol>'+(x.steps||[]).map(function(s,n){
        var 쪽=String(s).split(" · ");   /* 「이름 · 설명」 이면 이름을 굵게 */
        return '<li><span class="dg-n">'+(n+1)+'</span><span class="dg-s">'+(쪽.length>1?'<b>'+b(쪽[0])+'</b><br>'+쪽.slice(1).map(b).join("<br>"):b(s))+'</span></li>';
      }).join('<li class="dg-arr" aria-hidden="true">↓</li>')+'</ol></div>';
    },
    cause: function(x){
      var 위 = (x.causes||[]).map(function(c){ return '<div class="dg-box">'+칸(c)+'</div>'; }).join("");
      var 아래 = (x.effects||[]).map(function(c){ return '<div class="dg-box dg-eff">'+칸(c)+'</div>'; }).join("");
      return '<div class="dg dg-cause">'+제목(x.title)+
        '<div class="dg-lab">원인</div><div class="dg-row">'+위+'</div>'+
        '<div class="dg-arr" aria-hidden="true">↓</div>'+
        '<div class="dg-core">'+칸(x.result)+'</div>'+
        (아래?'<div class="dg-arr" aria-hidden="true">↓</div><div class="dg-lab">결과</div><div class="dg-row">'+아래+'</div>':'')+
      '</div>';
    },
    tree: function(x){
      var 가지 = x.branches||[];
      return '<div class="dg dg-tree">'+제목(x.title)+
        '<div class="dg-root">'+b(x.root)+'</div>'+
        '<div class="dg-kids" style="--n:'+Math.min(가지.length,4)+'">'+가지.map(function(g){
          return '<div class="dg-kid"><b class="dg-kn">'+b(g[0])+'</b>'+(g[1]?'<span>'+칸(g[1])+'</span>':'')+'</div>';
        }).join("")+'</div></div>';
    },
    vs: function(x){
      var cols = x.cols||[];
      return '<div class="dg dg-vs">'+제목(x.title)+'<div class="dg-cols" style="--n:'+cols.length+'">'+
        cols.map(function(c,n){
          return (n?'<div class="dg-vsb" aria-hidden="true">vs</div>':'')+
            '<div class="dg-col dg-c'+n+'"><div class="dg-ch">'+b(c.name)+'</div>'+목록(c.items)+'</div>';
        }).join("")+'</div></div>';
    },
    venn: function(x){
      var a=x.a||{}, c=x.b||{};
      return '<div class="dg dg-venn">'+제목(x.title)+
        '<svg class="dg-vsvg" viewBox="0 0 200 64" aria-hidden="true"><circle cx="80" cy="32" r="29"/><circle cx="120" cy="32" r="29"/></svg>'+
        '<div class="dg-vcols"><div class="dg-col dg-c0"><div class="dg-ch">'+b(a.name)+'만</div>'+목록(a.items)+'</div>'+
        '<div class="dg-col dg-both"><div class="dg-ch">둘 다</div>'+목록(x.both)+'</div>'+
        '<div class="dg-col dg-c1"><div class="dg-ch">'+b(c.name)+'만</div>'+목록(c.items)+'</div></div></div>';
    },
    cycle: function(x){
      var s=x.steps||[], n=s.length, R=36, 점=[];
      for(var k=0;k<n;k++){ var a=-Math.PI/2+2*Math.PI*k/n; 점.push([50+R*Math.cos(a), 50+R*Math.sin(a)]); }
      var 고리 = '<svg class="dg-ring" viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="dgA" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6z"/></marker></defs>'+
        점.map(function(p,k){ var q=점[(k+1)%n], a1=-Math.PI/2+2*Math.PI*(k+.28)/n, a2=-Math.PI/2+2*Math.PI*(k+.72)/n;
          return '<path d="M'+(50+R*Math.cos(a1)).toFixed(1)+' '+(50+R*Math.sin(a1)).toFixed(1)+' A'+R+' '+R+' 0 0 1 '+(50+R*Math.cos(a2)).toFixed(1)+' '+(50+R*Math.sin(a2)).toFixed(1)+'" marker-end="url(#dgA)"/>'; }).join("")+'</svg>';
      var 마디 = s.map(function(t,k){ return '<div class="dg-node" style="left:'+점[k][0]+'%;top:'+점[k][1]+'%"><span>'+(k+1)+'</span>'+b(t)+'</div>'; }).join("");
      return '<div class="dg dg-cycle">'+제목(x.title)+'<div class="dg-cwrap">'+고리+마디+'</div>'+
        '<ol class="dg-clist">'+s.map(function(t){ return '<li>'+b(t)+'</li>'; }).join("")+'</ol></div>';
    },
    axis: function(x){
      var m=(x.marks||[]).slice().sort(function(p,q){ return p.at-q.at; });
      return '<div class="dg dg-axis">'+제목(x.title)+
        '<div class="dg-ends"><span>'+b(x.left)+'</span><span>'+b(x.right)+'</span></div>'+
        '<div class="dg-line">'+m.map(function(k,n){ return '<i style="left:'+Math.max(3,Math.min(97,k.at))+'%">'+(n+1)+'</i>'; }).join("")+'</div>'+
        '<ul class="dg-marks">'+m.map(function(k,n){ return '<li><span class="dg-mn">'+(n+1)+'</span><b>'+b(k.name)+'</b>'+(k.text?'<span>'+b(k.text)+'</span>':'')+'</li>'; }).join("")+'</ul></div>';
    },
    table: function(x){
      /* 두 칸 표(이름 | 내용)는 좁은 칸에 글이 끼므로 줄 카드로 그린다(1028) */
      var 칸수=(x.head&&x.head.length)||((x.rows||[])[0]||[]).length;
      if(칸수===2) return '<div class="dg dg-rl">'+제목(x.title)+(x.rows||[]).map(function(r){
          return '<div class="dg-ri"><div class="dg-rn">'+b(r[0])+'</div><div class="dg-rv">'+칸(r[1])+'</div></div>'; }).join("")+'</div>';
      return '<div class="dg dg-table">'+제목(x.title)+'<div class="dg-tw"><table>'+
        ((x.head&&x.head.length)?'<thead><tr>'+x.head.map(function(h){ return '<th>'+칸(h)+'</th>'; }).join("")+'</tr></thead>':'')+
        '<tbody>'+(x.rows||[]).map(function(r){ return '<tr>'+r.map(function(c,n){ return (n===0&&x.head&&x.head.length?'<th>':'<td>')+칸(c)+(n===0&&x.head&&x.head.length?'</th>':'</td>'); }).join("")+'</tr>'; }).join("")+'</tbody></table></div></div>';
    }
  };

  /* 검사·개념어 문항이 카드 글을 읽을 때 쓰는 맨 글 */
  function 글(x){
    if(!x) return "";
    var 모음=[x.title,x.term,x.text,x.root,x.result,x.left,x.right];
    (x.ex||[]).concat(x.steps||[],x.causes||[],x.effects||[],x.both||[],x.head||[]).forEach(function(s){ 모음.push(s); });
    (x.branches||[]).forEach(function(g){ 모음.push(g.join(" ")); });
    (x.cols||[]).forEach(function(c){ 모음.push(c.name); 모음=모음.concat(c.items||[]); });
    [x.a,x.b].forEach(function(c){ if(c){ 모음.push(c.name); 모음=모음.concat(c.items||[]); } });
    (x.marks||[]).forEach(function(k){ 모음.push(k.name, k.text); });
    (x.rows||[]).forEach(function(r){ 모음=모음.concat(r); });
    return 맨글(모음.filter(Boolean).join(" "));
  }

  window.DIAGRAM = {
    글꼴: null,
    has: function(t){ return !!그리개[t]; },
    html: function(x){ var f=그리개[x&&x.t]; return f ? f(x) : ""; },
    text: 글
  };
})();
