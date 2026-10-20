/* 필기판 — 펜·형광펜·지우개·되돌리기. 벤치마킹: Apple 수학 메모·Goodnotes.
   - 필압(pressure) 반영, getCoalescedEvents 로 빠른 획도 매끈하게
   - 펜이 한 번이라도 닿으면 그다음부터 손가락·손바닥 터치는 그리지 않는다(손바닥 무시)
   - 획 지우개: 닿은 획 전체를 지운다(학생 필기에선 부분 지우개보다 빠르다)
   - 휘갈기기(좌우로 빠르게 여러 번) 로 그 획들 지우기 — Goodnotes 제스처 */
(function () {
  function Ink(host, opts = {}) {
    this.host = host;
    this.opts = Object.assign({ color: null, width: 2.4, onChange: null, penOnly: "auto" }, opts);
    this.canvas = document.createElement("canvas");
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.strokes = [];
    this.redo = [];
    this.tool = "pen";
    this.sawPen = false;
    this.cur = null;
    this._bind();
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
  }
  Ink.prototype.inkColor = function () {
    return this.opts.color || getComputedStyle(this.host).getPropertyValue("--pad-ink").trim() || "#1F2A55";
  };
  Ink.prototype.resize = function () {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.redraw();
  };
  Ink.prototype._pt = function (e) {
    const r = this.canvas.getBoundingClientRect();
    const p = e.pressure && e.pointerType === "pen" ? e.pressure : 0.5;
    return [e.clientX - r.left, e.clientY - r.top, p, e.timeStamp];
  };
  Ink.prototype._bind = function () {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "pen") this.sawPen = true;
      if (this.sawPen && e.pointerType === "touch" && this.opts.penOnly !== false) return; // 손바닥 무시
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
      const eraser = this.tool === "eraser" || e.button === 5 || (e.buttons & 32);
      this.cur = { tool: eraser ? "eraser" : this.tool, pts: [this._pt(e)], id: e.pointerId };
      if (this.cur.tool === "eraser") this._eraseAt(this.cur.pts[0]);
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.cur || e.pointerId !== this.cur.id) return;
      let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!evs || !evs.length) evs = [e];
      for (const ev of evs) {
        const p = this._pt(ev);
        if (this.cur.tool === "eraser") { this._eraseAt(p); continue; }
        const last = this.cur.pts[this.cur.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.6) continue;
        this.cur.pts.push(p);
        this._drawSegment(this.cur, this.cur.pts.length - 1);
      }
    });
    const end = (e) => {
      if (!this.cur || e.pointerId !== this.cur.id) return;
      const s = this.cur; this.cur = null;
      if (s.tool === "eraser") { this._emit(); return; }
      if (this._isScribble(s)) { this._scribbleErase(s); this.redraw(); this._emit(); return; }
      if (s.pts.length === 1) s.pts.push([s.pts[0][0] + 0.1, s.pts[0][1] + 0.1, s.pts[0][2], s.pts[0][3]]);
      this.strokes.push(s); this.redo = [];
      this.redraw();
      this._emit();
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  };
  Ink.prototype._emit = function () { this.opts.onChange && this.opts.onChange(this); };
  Ink.prototype._width = function (s, p) {
    const base = s.tool === "hl" ? 16 : this.opts.width;
    return s.tool === "hl" ? base : base * (0.55 + p * 1.1);
  };
  Ink.prototype._style = function (ctx, s) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (s.tool === "hl") { ctx.globalAlpha = 0.28; ctx.strokeStyle = getComputedStyle(this.host).getPropertyValue("--hl").trim() || "#FFD84D"; }
    else { ctx.globalAlpha = 1; ctx.strokeStyle = this.inkColor(); }
  };
  Ink.prototype._drawSegment = function (s, i) {
    if (s.tool === "hl") { this.redraw(s); return; }
    const ctx = this.ctx, d = this.dpr, P = s.pts;
    ctx.save(); ctx.scale(d, d); this._style(ctx, s);
    const a = P[Math.max(0, i - 2)], b = P[i - 1], c = P[i];
    ctx.lineWidth = this._width(s, c[2]);
    ctx.beginPath();
    ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    ctx.quadraticCurveTo(b[0], b[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2);
    ctx.stroke(); ctx.restore();
  };
  Ink.prototype._drawStroke = function (ctx, s) {
    const P = s.pts;
    this._style(ctx, s);
    if (s.tool === "hl") {
      ctx.lineWidth = this._width(s, 0.5);
      ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
      ctx.stroke(); return;
    }
    for (let i = 1; i < P.length; i++) {
      const a = P[Math.max(0, i - 2)], b = P[i - 1], c = P[i];
      ctx.lineWidth = this._width(s, c[2]);
      ctx.beginPath();
      ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      ctx.quadraticCurveTo(b[0], b[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2);
      ctx.stroke();
    }
  };
  Ink.prototype.redraw = function (extra) {
    const ctx = this.ctx, d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save(); ctx.scale(d, d);
    for (const s of this.strokes.filter((s) => s.tool === "hl")) this._drawStroke(ctx, s);
    for (const s of this.strokes.filter((s) => s.tool !== "hl")) this._drawStroke(ctx, s);
    if (extra) this._drawStroke(ctx, extra);
    ctx.restore();
  };
  Ink.prototype._hit = function (s, p, r) {
    for (const q of s.pts) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < r) return true;
    return false;
  };
  Ink.prototype._eraseAt = function (p) {
    const before = this.strokes.length;
    const removed = this.strokes.filter((s) => this._hit(s, p, 12));
    if (!removed.length) return;
    this.strokes = this.strokes.filter((s) => !removed.includes(s));
    this.redo.push({ type: "erase", strokes: removed });
    if (this.strokes.length !== before) this.redraw();
  };
  // 휘갈기기: 짧은 시간에 x 방향이 4번 이상 뒤집히고 폭이 좁은 획
  Ink.prototype._isScribble = function (s) {
    if (s.pts.length < 16 || s.tool !== "pen") return false;
    let flips = 0, dir = 0;
    for (let i = 2; i < s.pts.length; i++) {
      const dx = s.pts[i][0] - s.pts[i - 2][0];
      if (Math.abs(dx) < 3) continue;
      const nd = Math.sign(dx);
      if (dir && nd !== dir) flips++;
      dir = nd;
    }
    const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    const dur = s.pts[s.pts.length - 1][3] - s.pts[0][3];
    return flips >= 5 && w > 30 && h < w * 0.9 && dur < 1400;
  };
  Ink.prototype._scribbleErase = function (s) {
    const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const inside = (st) => st.pts.filter((p) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] - 6 && p[1] <= box[3] + 6).length > st.pts.length * 0.5;
    const removed = this.strokes.filter(inside);
    if (!removed.length) return;
    this.strokes = this.strokes.filter((x) => !removed.includes(x));
    this.redo = [];
    this._lastErase = removed;
  };
  Ink.prototype.undo = function () {
    const s = this.strokes.pop();
    if (s) { this.redo.push({ type: "add", strokes: [s] }); this.redraw(); this._emit(); }
  };
  Ink.prototype.redoOne = function () {
    const r = this.redo.pop();
    if (!r) return;
    if (r.type === "add") this.strokes.push(...r.strokes);
    else this.strokes = this.strokes.filter((s) => !r.strokes.includes(s));
    this.redraw(); this._emit();
  };
  Ink.prototype.clear = function () { this.strokes = []; this.redo = []; this.redraw(); this._emit(); };
  Ink.prototype.setTool = function (t) { this.tool = t; };
  Ink.prototype.destroy = function () { this._ro.disconnect(); this.canvas.remove(); };
  Ink.prototype.toJSON = function () { return this.strokes.map((s) => ({ t: s.tool, p: s.pts.map((q) => [Math.round(q[0]), Math.round(q[1]), +q[2].toFixed(2)]) })); };
  Ink.prototype.load = function (arr) {
    this.strokes = (arr || []).map((s) => ({ tool: s.t, pts: s.p.map((q) => [q[0], q[1], q[2], 0]) }));
    this.redraw();
  };
  window.Ink = Ink;
})();
