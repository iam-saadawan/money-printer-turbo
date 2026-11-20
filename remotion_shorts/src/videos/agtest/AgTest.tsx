// AGLOE TEST SCENE (lines l02-l04, ~10.6 s): painted 3D plates (soft, parallax) + crisp full-res Ricks-style characters
// that act on every word. One 2D canvas at the true output size (1440 x 2560).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { drawChar, Look, Pose, V2, Expr, HandK, steam, sparkle, mixc } from "./rig";
import { LINES } from "../agloe/timing";

const W = 1440, H = 2560, FPS = 30;
export const T0 = 3.45, T1 = 14.05;
export const AGTEST_FRAMES = Math.round((T1 - T0) * FPS);
const tf = (t: number) => Math.round((t - T0) * FPS);
const INK = "#151316";

// ---------------- easing + keyframe tracks (voice time, seconds) ----------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const backOut = (u: number) => { const c = 1.9; const x = clamp01(u) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
type KN = [number, number, number?][];
type KV = [number, V2, number?][];
const tr = (t: number, v0: number, keys: KN) => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; v = v + (vk - v) * backOut((t - tk) / d); } return v; };
const trv = (t: number, v0: V2, keys: KV): V2 => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; const u = backOut((t - tk) / d); v = [v[0] + (vk[0] - v[0]) * u, v[1] + (vk[1] - v[1]) * u]; } return v; };
const step = <T,>(t: number, v0: T, keys: [number, T][]) => { let v = v0; for (const [tk, vk] of keys) if (t >= tk - 0.066) v = vk; return v; };
const W_ = (id: string, word: string, nth = 0) => {
  const l = LINES.find((x) => x.id === id)!; const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hits = l.w.filter((w) => n(w[0]).startsWith(n(word))); return (hits[Math.min(nth, hits.length - 1)] ?? [0, l.s])[1] as number;
};
const hsh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** blink 0..1: 4-frame blinks every 1.2-3.2 s */
export const blinkAt = (t: number, seed: number) => {
  let s = -hsh(seed, 1) * 2; const f = t * FPS;
  for (let n = 0; n < 60; n++) { const k = f - s * FPS; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][Math.floor(k)]; s += 1.2 + 2 * hsh(seed * 7 + n, 3); if (s * FPS > f) break; }
  return 0;
};
/** lip flap for a spoken line: open/close per syllable-ish beat */
const mouthAt = (t: number, id: string) => {
  const l = LINES.find((x) => x.id === id)!; if (t < l.s || t > l.e) return 0;
  for (let i = 0; i < l.w.length; i++) {
    const ws = l.w[i][1], we = i + 1 < l.w.length ? l.w[i + 1][1] : l.e;
    if (t >= ws && t < we) { const syl = Math.max(1, (l.w[i][0].toLowerCase().match(/[aeiouy]+/g) ?? []).length); return 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * syl * (t - ws) / Math.max(0.08, we - ws))); }
  }
  return 0;
};
export const idle = (t: number, seed: number) => ({ squash: 1 + 0.03 * Math.sin(t * 3.1 + seed), tilt: 4.5 * Math.sin(t * 1.9 + seed * 2) + 1.5 * Math.sin(t * 4.3 + seed), bob: 0, lean: 2.5 * Math.sin(t * 1.3 + seed * 3) });

// ---------------- cast ----------------
const OTTO: Look = { body: "#6e5a44", shirt: "#f4f1e8", tie: "#2f5a4a", tieKind: "bow", buttons: "#d8b25a", hair: "tufts", hairCol: "#dcdad4", glasses: true, tash: "walrus", tashCol: "#e4e1da", wide: 1.14, tall: 0.96, shoe: "#3a2a20" };
const ERNEST: Look = { body: "#f1eee6", vest: "#3d5872", suspenders: undefined, tie: "#a8443c", tieKind: "long", hat: "cap", hatCol: "#8a7252", hatCol2: "#76603f", buttons: "#d8d2c0", earPencil: true, wide: 0.92, tall: 1.06 };
const CLERK: Look = { body: "#7d7a5c", shirt: "#ecebe2", tie: "#5a2c3a", tieKind: "long", hat: "visor", hair: "slick", hairCol: "#2a2422", tash: "pencil", tashCol: "#2a2422", wide: 0.9, tall: 1.04, skin: "#eef0f6" };
const BOSS: Look = { body: "#5a2a38", stripes: "rgba(255,240,230,0.13)", shirt: "#efeee8", tie: "#c9a43a", tieKind: "long", chain: true, buttons: "#d9b44a", hat: "bowler", hatCol: "#22202a", tash: "handlebar", tashCol: "#1e1a1a", wide: 1.3, tall: 0.98, skin: "#eef0f6" };

// ---------------- props ----------------
const roads = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, D: number, prog = 1, seed = 1) => {
  // a cream map sheet seen from above at a slant; roads grow with prog
  g.save();
  g.beginPath(); g.moveTo(x - w / 2, y + h); g.lineTo(x + w / 2, y + h); g.lineTo(x + w * 0.42, y); g.lineTo(x - w * 0.42, y); g.closePath();
  g.fillStyle = "#f3ead2"; g.fill(); g.lineWidth = 0.014 * D; g.strokeStyle = INK; g.stroke(); g.clip();
  const L = (pts: V2[], col: string, lw: number, p: number) => {
    const n = Math.max(2, Math.ceil(pts.length * clamp01(p)));
    g.beginPath(); pts.slice(0, n).forEach((q, i) => (i ? g.lineTo(x + q[0] * w, y + q[1] * h) : g.moveTo(x + q[0] * w, y + q[1] * h)));
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
  };
  const river: V2[] = Array.from({ length: 20 }, (_, i) => [-0.5 + i / 19, 0.75 - 0.3 * Math.sin(i * 0.5 + seed)]);
  const r1: V2[] = Array.from({ length: 24 }, (_, i) => [-0.45 + (i / 23) * 0.9, 0.2 + 0.25 * Math.sin(i * 0.35 + seed * 2) + i * 0.015]);
  const r2: V2[] = Array.from({ length: 18 }, (_, i) => [0.1 + 0.08 * Math.sin(i * 0.6), i / 17]);
  L(river, "#7fa9cf", 0.04 * D, 1);
  L(r1, "#c0504a", 0.022 * D, prog);
  L(r2, "#3a3030", 0.014 * D, clamp01(prog * 1.6 - 0.3));
  g.restore();
};
const desk = (g: CanvasRenderingContext2D, x: number, gy: number, D: number, opt: { prog?: number; lamp?: boolean; glow?: boolean; seed?: number; t?: number } = {}) => {
  const top = gy - 1.38 * D, dep = 0.3 * D, w = 1.7 * D, bot = gy + 0.18 * D, lw = 0.024 * D;
  // legs
  g.fillStyle = "#4a2f20"; for (const s of [-1, 1]) { g.beginPath(); g.rect(x + s * w * 0.44 - 0.05 * D, top + dep, 0.1 * D, bot - top - dep); g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
  // front apron
  g.beginPath(); g.rect(x - w / 2, top + dep, w, 0.26 * D); g.fillStyle = opt.glow ? "#3a4656" : "#7a4e32"; g.fill(); g.stroke();
  g.beginPath(); g.rect(x - 0.18 * D, top + dep + 0.07 * D, 0.36 * D, 0.12 * D); g.fillStyle = opt.glow ? "#2c3644" : "#6a4128"; g.fill(); g.stroke();
  ellipse(g, x, top + dep + 0.13 * D, 0.025 * D, 0.025 * D, "#d9b44a", lw * 0.6);
  // top board (slanted toward the camera)
  g.beginPath(); g.moveTo(x - w / 2, top + dep); g.lineTo(x + w / 2, top + dep); g.lineTo(x + w * 0.44, top); g.lineTo(x - w * 0.44, top); g.closePath();
  g.fillStyle = opt.glow ? "#cfe8ff" : "#9a6a44"; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
  if (opt.glow) {
    g.save(); g.globalCompositeOperation = "screen";
    const gr = g.createRadialGradient(x, top, 0.1 * D, x, top - 0.4 * D, 1.4 * D); gr.addColorStop(0, "rgba(150,210,255,0.28)"); gr.addColorStop(1, "rgba(150,210,255,0)");
    g.fillStyle = gr; g.fillRect(x - 1.6 * D, top - 1.8 * D, 3.2 * D, 2.2 * D); g.restore();
  }
  roads(g, x - 0.05 * D, top + 0.03 * D, w * 0.62, dep * 0.85, D, opt.prog ?? 1, opt.seed ?? 1);
  // ink pot + ruler
  ellipse(g, x + w * 0.36, top + dep * 0.55, 0.06 * D, 0.03 * D, "#1d2a3a", lw * 0.7);
  g.beginPath(); g.rect(x + w * 0.32, top + dep * 0.3 - 0.07 * D, 0.08 * D, 0.08 * D); g.fillStyle = "#24364c"; g.fill(); g.lineWidth = lw * 0.7; g.stroke();
  if (opt.lamp) { // green banker lamp on the left corner
    const lx = x - w * 0.36, ly = top + dep * 0.4;
    g.beginPath(); g.rect(lx - 0.012 * D, ly - 0.32 * D, 0.024 * D, 0.32 * D); g.fillStyle = "#c9a43a"; g.fill(); g.lineWidth = lw * 0.7; g.stroke();
    ellipse(g, lx, ly, 0.11 * D, 0.035 * D, "#c9a43a", lw * 0.7);
    g.beginPath(); g.moveTo(lx - 0.2 * D, ly - 0.3 * D); g.quadraticCurveTo(lx, ly - 0.46 * D, lx + 0.2 * D, ly - 0.3 * D); g.closePath(); g.fillStyle = "#2f7a52"; g.fill(); g.lineWidth = lw * 0.8; g.stroke();
    g.save(); g.globalCompositeOperation = "screen";
    const gr = g.createRadialGradient(lx, ly - 0.2 * D, 0.02 * D, lx, ly - 0.1 * D, 0.9 * D); gr.addColorStop(0, "rgba(255,214,140,0.5)"); gr.addColorStop(1, "rgba(255,214,140,0)");
    g.fillStyle = gr; g.fillRect(lx - D, ly - D, 2 * D, 1.6 * D); g.restore();
  }
};
const ellipse = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, lw = 0) => {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
};
/** map sheet held up in two hands */
export const sheet = (g: CanvasRenderingContext2D, a: V2, b: V2, D: number) => {
  const cx = (a[0] + b[0]) / 2, w = Math.abs(b[0] - a[0]) + 0.16 * D, h = 0.55 * D, y = Math.min(a[1], b[1]) - h * 0.3;
  g.save(); g.translate(cx, y + h / 2); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) * 0.5); g.translate(-cx, -(y + h / 2));
  g.beginPath(); g.rect(cx - w / 2, y, w, h); g.fillStyle = "#f3ead2"; g.fill(); g.lineWidth = 0.02 * D; g.strokeStyle = INK; g.stroke();
  g.save(); g.clip();
  g.strokeStyle = "#7fa9cf"; g.lineWidth = 0.05 * D; g.beginPath(); g.moveTo(cx - w / 2, y + h * 0.8); g.bezierCurveTo(cx - w * 0.1, y + h * 0.5, cx + w * 0.1, y + h, cx + w / 2, y + h * 0.7); g.stroke();
  g.strokeStyle = "#c0504a"; g.lineWidth = 0.03 * D; g.beginPath(); g.moveTo(cx - w / 2, y + h * 0.3); g.bezierCurveTo(cx - w * 0.2, y + h * 0.1, cx + w * 0.2, y + h * 0.6, cx + w / 2, y + h * 0.25); g.stroke();
  g.strokeStyle = "#3a3030"; g.lineWidth = 0.018 * D; g.beginPath(); g.moveTo(cx + w * 0.08, y); g.lineTo(cx - w * 0.04, y + h); g.stroke();
  g.restore(); g.restore();
};
/** pop-in thought bubble with a gas pump */
export const pumpBubble = (g: CanvasRenderingContext2D, x: number, y: number, R: number, k: number) => {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = R * 0.05;
  g.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.moveTo(Math.cos(a) * R * 0.78 + R * 0.26, Math.sin(a) * R * 0.66); g.arc(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.66, R * 0.26, 0, Math.PI * 2); } g.fill();
  g.beginPath(); g.ellipse(0, 0, R * 0.95, R * 0.8, 0, 0, Math.PI * 2); g.fill();
  // pump
  g.fillStyle = "#c8453c"; g.beginPath(); g.roundRect(-R * 0.28, -R * 0.5, R * 0.5, R * 0.95, R * 0.08); g.fill(); g.stroke();
  g.fillStyle = "#f3ead2"; g.beginPath(); g.roundRect(-R * 0.18, -R * 0.38, R * 0.3, R * 0.24, R * 0.04); g.fill(); g.stroke();
  g.fillStyle = "#f2c23a"; g.beginPath(); g.arc(-R * 0.03, -R * 0.62, R * 0.15, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(R * 0.22, -R * 0.2); g.quadraticCurveTo(R * 0.55, -R * 0.1, R * 0.42, R * 0.3); g.lineWidth = R * 0.06; g.stroke();
  g.restore();
};

// ---------------- camera ----------------
type Cam = { x: number; y: number; z: number };
type CK = [number, Cam, number?];
const camTrack = (t: number, keys: CK[], creep = 0.03): Cam => {
  let c = keys[0][1], settle = keys[0][0];
  for (let i = 1; i < keys.length; i++) { const [tk, ck, d = 0.6] = keys[i]; if (t < tk) break; const u = glide((t - tk) / d); c = { x: c.x + (ck.x - c.x) * u, y: c.y + (ck.y - c.y) * u, z: c.z + (ck.z - c.z) * u }; settle = tk; }
  return { ...c, z: c.z * (1 + creep * (t - settle)) };
};
const KICKS = [W_("l02", "hand"), W_("l03", "swear"), W_("l04", "ourselves")];
const kick = (t: number) => { let a = 0; for (const k of KICKS) { const d = Math.round((t - k + 0.066) * FPS); if (d >= 0 && d < 8) a += 14 * (1 - d / 8) ** 1.4 * (d % 2 ? -1 : 1); } return a; };

// ---------------- shots ----------------
type Ctx = { g: CanvasRenderingContext2D; t: number; plate: (name: string, blur: number, c: Cam) => void; world: (c: Cam, par?: number) => void };
type Shot = { a: number; b: number; draw: (x: Ctx) => void };
const OX = 430, EX = 1030, OGY = 2250, OD = 380, ED = 360;
const CX0 = 560, CGY = 2230, CD = 360, BX = 1120, BGY = 1820, BD = 225;

const ottoAt = (t: number, close: boolean): Pose => {
  const iO = idle(t, 3), tO = W_("l02", "Otto"), tMaps = W_("l02", "road"), tEvery = W_("l02", "Every"), tHand = W_("l02", "by");
  const drawing = (t < tO - 0.05) || (t > tMaps + 1.0 && t < tHand - 0.05) || (t >= tEvery - 0.1 && t < tHand - 0.05);
  const fast = t >= tEvery - 0.1 ? 1 : 0.5;
  const sc = drawing ? [0.13 * fast * Math.sin(t * 15), 0.05 * fast * Math.sin(t * 30 + 1)] : [0, 0];
  const holdUp = t >= tMaps - 0.05 && t < tMaps + 1.0;
  let armR: V2 = trv(t, [-0.12, 0.84], [[tO - 0.05, [-0.24, -0.3], 0.18], [tO + 0.45, [-0.12, 0.84]], [tMaps - 0.05, [0.06, 0.3]], [tMaps + 1.0, [-0.12, 0.84]], [tHand - 0.05, [0.32, -0.95], 0.25]]);
  let armL: V2 = trv(t, [-0.05, 0.86], [[tMaps - 0.05, [0.06, 0.3]], [tMaps + 1.0, [-0.05, 0.86]], [tHand - 0.05, [0.0, 0.84]]]);
  armR = [armR[0] + sc[0], armR[1] + sc[1]];
  const lean = tr(t, close ? 0 : 4, [[tO - 0.05, -3], [tMaps + 1.0, 5], [tEvery - 0.1, 10, 0.3], [tHand - 0.05, -6, 0.25]]);
  const expr: Expr = step(t, "focus", [[tO, "smug"], [tMaps, "happy"], [tMaps + 1.0, "focus"], [tHand, "proud"]]);
  const bendTilt = t > W_("l02", "bend") - 0.1 && t < tHand ? 9 * Math.sin((t - W_("l02", "bend")) * 7) : 0;
  return { x: OX, y: OGY, D: OD, ...iO, lean, tilt: iO.tilt + bendTilt + tr(t, 0, [[tO, -6], [tO + 0.5, 0], [tHand, 7]]),
    nod: tr(t, 0.03, [[tO - 0.05, -0.02, 0.15], [tMaps + 1.0, 0.03], [tHand, -0.03]]), bob: tr(t, 0, [[tO - 0.05, 22, 0.12], [tO + 0.25, 0, 0.3], [tHand - 0.05, 30, 0.12], [tHand + 0.3, 6]]),
    armR: { hand: armR, k: holdUp ? "open" : "pencil" }, armL: { hand: armL, k: "open" },
    expr, blink: blinkAt(t, 3), look: drawing ? [0.3, 0.9] : [0, 0], tongue: drawing && t > tEvery, glint: t > tO && t < tO + 0.5 ? 1 - (t - tO) / 0.5 : 0, facing: drawing ? 0.35 : 0 };
};
const ernestAt = (t: number): Pose => {
  const iE = idle(t, 5), tE = W_("l02", "Ernest"), tMaps = W_("l02", "road"), tGas = W_("l02", "gas");
  const drawing = t < tE - 0.05 || t > tMaps + 1.0;
  const sc = drawing ? [0.03 * Math.sin(t * 24 + 2), 0.025 * Math.sin(t * 17)] : [0, 0];
  let armR: V2 = trv(t, [-0.1, 0.84], [[tE - 0.05, [0.0, -0.78], 0.2], [tE + 0.28, [-0.1, 0.84], 0.18], [tMaps - 0.05, [0.06, 0.3]], [tGas - 0.05, [0.1, 0.8]], [tMaps + 1.0, [-0.1, 0.84]]]);
  const armL: V2 = trv(t, [-0.04, 0.86], [[tMaps - 0.05, [0.06, 0.3]], [tGas - 0.05, [0.35, -0.6]], [tMaps + 1.0, [-0.04, 0.86]]]);
  armR = [armR[0] + sc[0], armR[1] + sc[1]];
  return { x: EX, y: OGY, D: ED, ...iE, lean: tr(t, -4, [[tE - 0.05, 3], [tMaps + 1.0, -4]]), bob: tr(t, 0, [[tE - 0.05, 30, 0.12], [tE + 0.3, 0, 0.3]]),
    tilt: iE.tilt + tr(t, 0, [[tE, 8], [tE + 0.6, 0], [tGas, -6]]),
    armR: { hand: armR, k: t >= tE - 0.05 && t < tE + 0.28 ? "open" : t >= tMaps - 0.05 && t < tMaps + 1.0 ? "open" : "pencil" },
    armL: { hand: armL, k: t >= tGas - 0.05 && t < tMaps + 1.0 ? "point" : "open" },
    expr: step(t, "focus", [[tE, "grin"], [tMaps, "happy"], [tGas, "grin"], [tMaps + 1.0, "focus"]]), blink: blinkAt(t, 5), look: drawing ? [-0.3, 0.9] : t > tGas ? [-0.6, -0.6] : [0, 0], facing: drawing ? -0.35 : t > tGas - 0.05 ? -0.3 : 0 };
};

const SHOTS: Shot[] = [
  { // 1 "New York, the 1920s." establishing: tilt down from the skyline to the two at work
    a: 0, b: tf(4.85), draw: ({ g, t, plate, world }) => {
      const c = camTrack(t, [[T0, { x: 720, y: 980, z: 1.08 }], [T0 + 0.15, { x: 730, y: 1700, z: 1.3 }, 1.15]], 0.02);
      plate("office", 3, c); world(c);
      drawChar(g, OTTO, ottoAt(t, false), t, "body"); desk(g, OX + 40, OGY, OD, { lamp: true, seed: 1, prog: 0.5 }); drawChar(g, OTTO, ottoAt(t, false), t, "arms");
      drawChar(g, ERNEST, ernestAt(t), t, "body"); desk(g, EX - 30, OGY, ED, { seed: 2, prog: 0.7 }); drawChar(g, ERNEST, ernestAt(t), t, "arms");
    } },
  { // 2 "Otto and Ernest draw road maps for gas stations." two-shot; each pops on his name
    a: tf(4.85), b: tf(6.88), draw: ({ g, t, plate, world }) => {
      const tO = W_("l02", "Otto"), tE = W_("l02", "Ernest");
      const c = camTrack(t, [[4.85, { x: 640, y: 1640, z: 1.42 }], [tE - 0.05, { x: 800, y: 1640, z: 1.42 }, 0.5], [W_("l02", "road"), { x: 730, y: 1600, z: 1.36 }, 0.5]], 0.025);
      plate("office", 5, c); world(c);
      const o = ottoAt(t, false), e = ernestAt(t), tM = W_("l02", "road");
      drawChar(g, OTTO, o, t, "body"); desk(g, OX + 40, OGY, OD, { lamp: true, seed: 1, prog: 0.6 });
      drawChar(g, ERNEST, e, t, "body"); desk(g, EX - 30, OGY, ED, { seed: 2, prog: 0.8 });
      const up = t >= tM - 0.02 && t < tM + 1.0;
      drawChar(g, OTTO, o, t, "arms"); drawChar(g, ERNEST, e, t, "arms");
      if (up) {
        // the sheets ride between the two hands (re-solve hand points like the rig: shoulder + hand*D)
        const hp = (p: Pose, L: Look, s: number, hd: V2): V2 => { const tw = 0.6 * p.D * (L.wide ?? 1); const top = p.y - 0.98 * p.D - (p.bob ?? 0) - 1.42 * p.D * (L.tall ?? 1) * (p.squash ?? 1); return [p.x + s * (tw / 2 - 0.035 * p.D) + s * hd[0] * p.D, top + 0.24 * p.D + hd[1] * p.D]; };
        sheet(g, hp(o, OTTO, -1, o.armL.hand), hp(o, OTTO, 1, o.armR.hand), o.D);
        if (t < W_("l02", "gas") - 0.05) sheet(g, hp(e, ERNEST, -1, e.armL.hand), hp(e, ERNEST, 1, e.armR.hand), e.D);
        drawChar(g, OTTO, { ...o, armL: { ...o.armL }, armR: { ...o.armR } }, t, "arms"); drawChar(g, ERNEST, e, t, "arms");
      }
      void tO;
      const tg = W_("l02", "gas");
      pumpBubble(g, 735, 1060, 150, t < tg - 0.05 ? 0 : backOut((t - tg + 0.05) / 0.25) * (t > 6.85 ? 0 : 1));
    } },
  { // 3 "Every road, every bend... by hand." Otto close: drawing furiously, then holds the pencil up
    a: tf(6.88), b: tf(9.08), draw: ({ g, t, plate, world }) => {
      const tH = W_("l02", "by");
      const c = camTrack(t, [[6.88, { x: 470, y: 1560, z: 2.05 }], [tH - 0.05, { x: 500, y: 1430, z: 2.0 }, 0.35]], 0.03);
      plate("office", 10, c); world(c);
      const o = ottoAt(t, true);
      drawChar(g, OTTO, o, t, "body");
      desk(g, OX + 40, OGY, OD, { lamp: true, seed: 1, prog: clamp01((t - 6.9) / 1.4) });
      drawChar(g, OTTO, o, t, "arms");
      // sparkle on the raised pencil
      if (t > tH) { const top = OGY - 0.98 * OD - (o.bob ?? 0) - 1.42 * OD * 0.96 * (o.squash ?? 1); sparkle(g, OX + (0.6 * OD * 1.14 / 2) + 0.32 * OD + 0.05 * OD, top + 0.24 * OD - 0.95 * OD - 0.45 * OD, 80 * (1 + 0.2 * Math.sin(t * 20)), clamp01((t - tH) / 0.12)); }
    } },
  { // 4 "But rival companies can just trace a finished map..." the clerk traces on the light table; the boss smokes
    a: tf(9.08), b: tf(11.4), draw: ({ g, t, plate, world }) => {
      const tT = W_("l03", "trace"), tF = W_("l03", "finished");
      const c = camTrack(t, [[9.08, { x: 760, y: 1720, z: 1.18 }], [tT - 0.05, { x: 700, y: 1820, z: 1.32 }, 0.8]], 0.02);
      plate("rival", 4, c); world(c);
      const iB = idle(t, 7);
      drawChar(g, BOSS, { x: BX, y: BGY, D: BD, ...iB, bob: 4 * Math.abs(Math.sin(t * 3)), armL: { hand: [0.32, 0.5] }, armR: { hand: [-0.12, -0.18], k: "cigar" }, expr: "smug", blink: blinkAt(t, 7), look: [-0.7, 0.2], facing: -0.3 }, t);
      const dart = Math.sin(t * 4.2) > 0 ? -0.9 : 0.9; // shifty eyes
      const traceX = t < tT ? 0.03 * Math.sin(t * 9) : -0.25 + 0.5 * clamp01((t - tT) / 0.9);
      const cl: Pose = { x: CX0, y: CGY, D: CD, ...idle(t, 9), lean: 6, nod: 0.02,
        armR: { hand: [-0.12 + traceX, 0.86 + 0.03 * Math.sin(t * 13)], k: "pencil" }, armL: { hand: trv(t, [-0.02, 0.88], [[tF, [0.1, 0.62]]]), k: "open" },
        expr: "sneaky", blink: blinkAt(t, 9), look: [dart, 0.3], facing: 0 };
      drawChar(g, CLERK, cl, t, "body"); desk(g, CX0, CGY, CD, { glow: true, seed: 3, prog: 1 }); drawChar(g, CLERK, cl, t, "arms");
    } },
  { // 5 "...and swear they didn't." the clerk snaps to camera, hands up, innocent whistle
    a: tf(11.4), b: tf(12.4), draw: ({ g, t, plate, world }) => {
      const tS = W_("l03", "swear"), tD = W_("l03", "didn");
      const c = camTrack(t, [[11.4, { x: 640, y: 1560, z: 1.95 }]], 0.04);
      plate("rival", 9, c); world(c);
      const cl: Pose = { x: CX0, y: CGY, D: CD, ...idle(t, 9), lean: tr(t, 6, [[tS - 0.05, -5, 0.2]]), bob: tr(t, 0, [[tS - 0.05, 26, 0.1], [tS + 0.2, 0, 0.3]]),
        tilt: t > tD ? 8 * Math.sin((t - tD) * 16) : tr(t, 0, [[tS, -8]]),
        armR: { hand: trv(t, [-0.12, 0.86], [[tS - 0.05, [0.42, -0.62], 0.18]]), k: "open" }, armL: { hand: trv(t, [-0.02, 0.88], [[tS - 0.05, [0.42, -0.62], 0.18]]), k: "open" },
        expr: step(t, "sneaky", [[tS, "whistle"]]), blink: blinkAt(t, 9), look: t > tS ? [0.8, -0.6] : [0, 0], sweat: clamp01((t - tS) / 0.3), facing: 0 };
      drawChar(g, CLERK, cl, t, "body"); desk(g, CX0, CGY, CD, { glow: true, seed: 3, prog: 1 }); drawChar(g, CLERK, cl, t, "arms");
    } },
  { // 6 "We drew it ourselves!" boss close-up: thumbs to chest, chest out, grin
    a: tf(12.4), b: AGTEST_FRAMES, draw: ({ g, t, plate, world }) => {
      const tWe = W_("l04", "We"), tO = W_("l04", "ourselves");
      const c = camTrack(t, [[12.4, { x: BX, y: 1350, z: 2.6 }], [tO - 0.05, { x: BX, y: 1330, z: 2.75 }, 0.25]], 0.02);
      plate("rival", 14, c); world(c);
      const m = mouthAt(t, "l04"), i = idle(t, 7);
      const b: Pose = { x: BX, y: BGY, D: BD, ...i, squash: i.squash * tr(t, 1, [[tO - 0.05, 1.07, 0.2], [tO + 0.6, 1.0, 0.4]]), lean: tr(t, 0, [[tWe, -3], [tO - 0.05, -9, 0.2]]),
        bob: t > tO + 0.5 ? 10 * Math.abs(Math.sin((t - tO) * 9)) : 0, tilt: i.tilt + tr(t, 0, [[tO, -8]]),
        armR: { hand: trv(t, [-0.12, -0.18], [[tO - 0.05, [0.02, 0.5], 0.2]]), k: t >= tO - 0.05 ? "thumb" : "cigar", rot: t >= tO - 0.05 ? -1.05 : 0 },
        armL: { hand: trv(t, [0.32, 0.5], [[tWe, [-0.08, 0.5], 0.2], [tO - 0.05, [0.02, 0.5], 0.2]]), k: t >= tO - 0.05 ? "thumb" : "open", rot: t >= tO - 0.05 ? 1.05 : 0 },
        expr: t > 13.85 ? "grin" : step(t, "smug", [[tWe, "proud"]]), mouth: m, blink: blinkAt(t, 7), look: [0, 0], facing: 0 };
      drawChar(g, BOSS, b, t);
      sparkle(g, BX + 0.5 * BD, BGY - 3.2 * BD, 30, t > tO ? clamp01((t - tO) / 0.1) * (0.6 + 0.4 * Math.sin(t * 25)) : 0);
      void steam;
    } },
];

// ---------------- light + atmosphere (screen space) ----------------
const atmos = (g: CanvasRenderingContext2D, scene: string, t: number) => {
  g.save(); g.globalCompositeOperation = "screen";
  if (scene === "office") {
    const gr = g.createLinearGradient(300, 0, 1100, 2000); gr.addColorStop(0, "rgba(190,215,255,0.0)"); gr.addColorStop(0.35, "rgba(190,215,255,0.07)"); gr.addColorStop(1, "rgba(190,215,255,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(380, 0); g.lineTo(1060, 0); g.lineTo(1440, 2200); g.lineTo(300, 2200); g.closePath(); g.fill();
  } else {
    for (let i = 0; i < 5; i++) { // moonlight blind stripes
      g.fillStyle = "rgba(140,170,255,0.06)"; g.beginPath(); const y = 500 + i * 160 + 10 * Math.sin(t); g.moveTo(0, y); g.lineTo(1440, y + 500); g.lineTo(1440, y + 560); g.lineTo(0, y + 60); g.closePath(); g.fill();
    }
  }
  // dust motes
  for (let i = 0; i < 40; i++) {
    const x = (hsh(i, 1) * 1440 + t * 12 * (hsh(i, 2) - 0.3)) % 1440, y = (hsh(i, 3) * 2560 - t * 18 * hsh(i, 4) + 2560) % 2560;
    g.fillStyle = `rgba(255,240,210,${0.18 + 0.15 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(x, y, 2 + 3 * hsh(i, 5), 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // vignette
  const v = g.createRadialGradient(720, 1280, 700, 720, 1280, 1650); v.addColorStop(0, "rgba(10,8,20,0)"); v.addColorStop(1, "rgba(10,8,20,0.24)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
};

// ---------------- captions (Ricks: 1-2 words, white, heavy black edge, ~70 % down) ----------------
const WORDS = LINES.filter((l) => ["l02", "l03", "l04"].includes(l.id)).flatMap((l) => l.w.map((w, i) => ({ w: w[0], s: w[1], e: i + 1 < l.w.length ? l.w[i + 1][1] : l.e, lid: l.id })));
const chunks = (() => {
  const out: { txt: string; s: number; e: number }[] = []; let cur: typeof WORDS = [];
  for (const w of WORDS) { cur.push(w); if (cur.length >= 2 || /[.,!?]$/.test(w.w) || w.w.length > 7) { out.push({ txt: cur.map((x) => x.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } }
  if (cur.length) out.push({ txt: cur.map((x) => x.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e });
  return out;
})();
const caption = (g: CanvasRenderingContext2D, t: number) => {
  const c = chunks.find((x) => t >= x.s - 0.03 && t < x.e + 0.1); if (!c) return;
  const pop = backOut((t - c.s + 0.03) / 0.12), txt = c.txt.replace(/\.\.\.$/, "...");
  g.save(); g.translate(720, 1800); g.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  g.font = '900 118px "Arial Black", "Helvetica Neue", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = 26; g.strokeStyle = "#0d0c10"; g.strokeText(txt, 0, 0);
  g.fillStyle = "#ffffff"; g.fillText(txt, 0, 0);
  g.restore();
};

// ---------------- composition ----------------
const PLATES = { office: "agtest/office.jpg", rival: "agtest/rival.jpg" };
type Prep = Record<string, { img: HTMLImageElement; blur: Map<number, HTMLCanvasElement> }>;
const blurred = (P: Prep, name: string, b: number) => {
  const e = P[name]; let c = e.blur.get(b);
  if (!c) {
    c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d")!; g.imageSmoothingQuality = "high";
    g.filter = `blur(${b}px) saturate(1.02) brightness(1.16) contrast(1.03)`; g.drawImage(e.img, -2 * b, -2 * b, W + 4 * b, H + 4 * b); e.blur.set(b, c);
  }
  return c;
};

export const AgTest: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [handle] = useState(() => delayRender("agtest plates"));
  useEffect(() => {
    const P: Prep = {}; let n = 0;
    for (const [k, src] of Object.entries(PLATES)) {
      const img = new Image(); img.src = staticFile(src);
      img.onload = () => { P[k] = { img, blur: new Map() }; if (++n === Object.keys(PLATES).length) { setPrep(P); continueRender(handle); } };
    }
  }, [handle]);
  useLayoutEffect(() => {
    if (!prep || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    const t = T0 + f / FPS;
    const s = SHOTS.find((x) => f >= x.a && f < x.b) ?? SHOTS[SHOTS.length - 1];
    let scene = "office";
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const kk = kick(t);
    const ctx: Ctx = {
      g, t,
      plate: (name, b, c) => {
        scene = name;
        const z = 1 + (c.z - 1) * 0.78, vw = W / z, vh = H / z;
        const cx = Math.min(W - vw / 2, Math.max(vw / 2, W / 2 + (c.x - W / 2) * 0.88)), cy = Math.min(H - vh / 2, Math.max(vh / 2, H / 2 + (c.y - H / 2) * 0.88));
        g.setTransform(z, 0, 0, z, W / 2 - cx * z + kk * 0.6, H / 2 - cy * z + kk * 0.4);
        g.drawImage(blurred(prep, name, b), 0, 0);
      },
      world: (c) => { g.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z + kk, H / 2 - c.y * c.z + kk * 0.7); },
    };
    s.draw(ctx);
    g.setTransform(1, 0, 0, 1, 0, 0);
    atmos(g, scene, t);
    caption(g, t);
  }, [f, prep]);
  return (
    <AbsoluteFill style={{ background: "#101018" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
void mixc; void (null as unknown as HandK);
