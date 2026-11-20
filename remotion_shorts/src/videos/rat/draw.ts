// Drawing helpers for painted-background shorts: toon characters on a painted plate, cartoon rats, effects.
import { Pen, bodyFront, bodySide, Outfit, Expr, Prop, INK } from "../ghost/toon";

export type G = CanvasRenderingContext2D;
export type P2 = [number, number];
export const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIO = (t: number) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 -> 1 pop with overshoot over n frames starting at f0 */
export const pop = (f: number, f0: number, n = 8) => { const t = clamp01((f - f0) / n); return t <= 0 ? 0 : 1 + Math.sin(t * Math.PI) * 0.18 * (1 - t) - (1 - t) * (1 - t) * (1 - t) * 0; };

const cache = new Map<string, HTMLCanvasElement>();
/** toon character (600x1000 design canvas, soles at 975) drawn at screen x, sole y, scale s; lit warm/cool */
export const char = (g: G, o: Outfit, x: number, sole: number, s: number, opts: {
  expr?: Expr; blink?: boolean; prop?: Prop; look?: number; seed?: number; side?: 1 | -1; phase?: number; mode?: "stand" | "march" | "stroll";
  tint?: [string, string]; shadow?: boolean; tilt?: number; headTilt?: number; flipX?: boolean;
}) => {
  const { expr = "neutral", blink = false, prop = null, look = 0, seed = 1, side, phase = 0, mode = "stand", tint = ["rgba(255,190,110,0.16)", "rgba(70,60,140,0.16)"],
    shadow = true, tilt = 0, headTilt = 0, flipX = false } = opts;
  const key = JSON.stringify([o, expr, blink, prop, Math.round(look * 10), seed, side, Math.round(phase * 24), mode, tint, tilt, headTilt]);
  let off = cache.get(key);
  if (!off) {
    off = document.createElement("canvas"); off.width = 600; off.height = 1000;
    const og = off.getContext("2d")!;
    const L = (-150 * Math.PI) / 180;
    if (side) bodySide(new Pen(og), o, { dir: side, phase, mode: mode === "stand" ? "stand" : "march", expr, blink, prop, light: L, seed } as any);
    else bodyFront(new Pen(og), o, { mode, phase, expr, blink, prop, look, seed, light: L, tilt, headTilt });
    og.globalCompositeOperation = "source-atop";
    const gr = og.createLinearGradient(0, 0, 600, 0); gr.addColorStop(0, tint[0]); gr.addColorStop(1, tint[1]);
    og.fillStyle = gr; og.fillRect(0, 0, 600, 1000);
    if (cache.size > 400) cache.clear();
    cache.set(key, off);
  }
  if (shadow) { g.save(); g.fillStyle = "rgba(30,15,45,0.35)"; g.beginPath(); g.ellipse(x + 30 * s, sole, 180 * s, 30 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.save(); g.translate(x, sole); if (flipX) g.scale(-1, 1);
  g.drawImage(off, -300 * s, -975 * s, 600 * s, 1000 * s); g.restore();
};

/** cartoon rat, side view, facing dir (+1 right). (x, y) = feet centre. s = scale (1 ~ 160 px long body). phase = run cycle 0..1 */
export const rat = (g: G, x: number, y: number, s: number, o: { dir?: 1 | -1; phase?: number; tail?: boolean; stub?: boolean; expr?: "happy" | "shock" | "neutral" | "sly";
  col?: string; up?: number; baby?: boolean; shadow?: boolean } = {}) => {
  const { dir = 1, phase = 0, tail = true, stub = false, expr = "neutral", col = "#8f8aa0", up = 0, baby = false, shadow = true } = o;
  const k = baby ? 0.55 : 1, S = s * k, run = Math.sin(phase * Math.PI * 2), bob = Math.abs(run) * 6 * S;
  const ol = 7 * S + 1.5;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  if (shadow) { g.fillStyle = "rgba(30,15,45,0.3)"; g.beginPath(); g.ellipse(0, 0, 80 * S, 13 * S, 0, 0, Math.PI * 2); g.fill(); }
  g.translate(0, -bob); g.rotate(-up);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK;
  // tail (behind body)
  if (tail || stub) {
    const L = stub ? 0.18 : 1, w = Math.sin(phase * Math.PI * 4) * 14 * S;
    g.beginPath(); g.moveTo(-62 * S, -30 * S);
    g.bezierCurveTo(-110 * S, -20 * S + w, -140 * S * L - 20 * S, -70 * S * L, -170 * S * L - 8 * S, -60 * S * L + w * L);
    g.lineWidth = 14 * S + ol * 1.6; g.stroke(); g.strokeStyle = "#e7a7a8"; g.lineWidth = 12 * S; g.stroke();
    if (stub) { g.fillStyle = "#c0353a"; g.beginPath(); g.arc(-170 * S * L - 8 * S, -60 * S * L + w * L, 6 * S, 0, 6.3); g.fill(); }
    g.strokeStyle = INK;
  }
  // legs
  const leg = (lx: number, ph: number) => { const a = Math.sin((phase + ph) * Math.PI * 2) * 0.6; g.beginPath(); g.moveTo(lx * S, -18 * S); g.lineTo(lx * S + Math.sin(a) * 22 * S, 0); g.lineWidth = 9 * S + ol; g.stroke(); g.strokeStyle = "#e7a7a8"; g.lineWidth = 9 * S; g.stroke(); g.strokeStyle = INK; };
  leg(-40, 0.5); leg(34, 0); leg(-30, 0); leg(44, 0.5);
  // body
  g.fillStyle = col; g.beginPath(); g.ellipse(-8 * S, -44 * S, 70 * S, 40 * S, -0.08, 0, Math.PI * 2); g.fill(); g.lineWidth = ol; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.ellipse(-4 * S, -26 * S, 48 * S, 14 * S, -0.05, 0, Math.PI * 2); g.fill();
  // head (pointy)
  g.fillStyle = col; g.beginPath(); g.moveTo(40 * S, -78 * S); g.quadraticCurveTo(105 * S, -60 * S, 112 * S, -38 * S); g.quadraticCurveTo(80 * S, -16 * S, 36 * S, -24 * S); g.closePath(); g.fill(); g.stroke();
  // ear
  g.fillStyle = col; g.beginPath(); g.ellipse(46 * S, -82 * S, 20 * S, 24 * S, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#e7a7a8"; g.beginPath(); g.ellipse(47 * S, -81 * S, 11 * S, 14 * S, -0.3, 0, Math.PI * 2); g.fill();
  // nose + whiskers
  g.fillStyle = "#e86e78"; g.beginPath(); g.arc(112 * S, -39 * S, 8 * S, 0, 6.3); g.fill(); g.lineWidth = ol * 0.6; g.stroke();
  g.lineWidth = 2.5 * S + 0.8; for (const d of [-8, 0, 8]) { g.beginPath(); g.moveTo(100 * S, -36 * S); g.lineTo(140 * S, (-36 + d * 1.6) * S); g.stroke(); }
  // eye
  const ey = -56 * S, ex = 76 * S;
  if (expr === "happy") { g.lineWidth = 4 * S + 1; g.beginPath(); g.arc(ex, ey + 4 * S, 8 * S, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else if (expr === "sly") { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(ex, ey, 10 * S, 7 * S, 0, 0, 6.3); g.fill(); g.lineWidth = 3 * S + 1; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(ex + 3 * S, ey + 1 * S, 4 * S, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(ex - 12 * S, ey - 10 * S); g.lineTo(ex + 12 * S, ey - 5 * S); g.stroke(); }
  else { const r = expr === "shock" ? 13 : 10; g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, r * S, 0, 6.3); g.fill(); g.lineWidth = 3 * S + 1; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(ex + 3 * S, ey, (expr === "shock" ? 3.5 : 5) * S, 0, 6.3); g.fill(); }
  // mouth / teeth
  g.fillStyle = "#fff"; g.fillRect(98 * S, -30 * S, 8 * S, 9 * S); g.lineWidth = 2 * S + 0.6; g.strokeRect(98 * S, -30 * S, 8 * S, 9 * S);
  g.restore();
};

/** bundle of loose rat tails (pile) centred at x, y, w wide; n tails */
export const tails = (g: G, x: number, y: number, w: number, n: number, seed = 1, s = 1) => {
  g.save(); g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x0 = x - w / 2 + rnd(i, seed) * w, y0 = y - rnd(i, seed + 1) * w * 0.18, a = rnd(i, seed + 2) * Math.PI * 2, L = (60 + rnd(i, seed + 3) * 50) * s;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(a + 0.8) * L * 0.6, y0 + Math.sin(a + 0.8) * L * 0.25, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L * 0.35);
    g.strokeStyle = INK; g.lineWidth = 11 * s; g.stroke(); g.strokeStyle = i % 3 ? "#d99a9a" : "#c08080"; g.lineWidth = 6 * s; g.stroke();
  }
  g.restore();
};

export const coin = (g: G, x: number, y: number, r: number) => {
  g.save(); g.fillStyle = "#f2c23a"; g.strokeStyle = INK; g.lineWidth = r * 0.22; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); g.stroke();
  g.fillStyle = "#fff0a8"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, 6.3); g.fill();
  g.fillStyle = "#a8761a"; g.font = `bold ${r}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("1", x + r * 0.05, y + r * 0.08); g.restore();
};

/** radial burst / sparkle / speed lines */
export const burst = (g: G, x: number, y: number, t: number, col = "#fff3b0", rays = 12, r0 = 40, r1 = 200) => {
  if (t <= 0 || t >= 1) return; g.save(); g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = 12 * (1 - t) + 2;
  for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2; const a0 = r0 + (r1 - r0) * t * 0.6, a1 = r0 + (r1 - r0) * t; g.beginPath(); g.moveTo(x + Math.cos(a) * a0, y + Math.sin(a) * a0); g.lineTo(x + Math.cos(a) * a1, y + Math.sin(a) * a1); g.stroke(); }
  g.restore();
};
export const qmark = (g: G, x: number, y: number, s: number, txt = "?", col = "#ffffff") => {
  g.save(); g.font = `900 ${120 * s}px Arial Black, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = 16 * s; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); g.restore();
};
export const stink = (g: G, x: number, y: number, f: number, col = "rgba(140,200,90,0.75)") => {
  g.save(); g.strokeStyle = col; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 3; i++) { const yy = y - ((f * 2 + i * 30) % 90); g.globalAlpha = 1 - ((f * 2 + i * 30) % 90) / 90; g.beginPath(); for (let k = 0; k < 6; k++) { const px = x + (i - 1) * 34 + Math.sin(k * 1.4 + f * 0.2) * 10; const py = yy - k * 12; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
  g.restore();
};
export const poly = (g: G, pts: P2[]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
