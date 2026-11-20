// THE FAKE TOWN THAT BECAME REAL - stills pipeline (2026-11-19). Each shot = one Blender still (bg / desks fg / pop-in
// layers, rendered once) + a 2D camera (glides, creeping push, kicks, lens blur on close-ups) + crisp 2D Ricks-style
// characters placed in the 3D set with the still's camera matrix. EVERY action is keyed to a word of voice B (timingB.ts).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { drawChar, Look, Pose, V2, Expr, HandK, sparkle, steam } from "./rig";
import { backOut, sheet, pumpBubble, blinkAt, idle } from "./AgTest";
import { LINES, VOICE_TOTAL } from "./timingB";
import { STILLS } from "./stillsB";

const W = 1440, H = 2560, FPS = 30;
export const AGLOEB_FRAMES = Math.round((VOICE_TOTAL + 0.6) * FPS);
const INK = "#151316";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------------- voice anchors ----------------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** start time (s) of the n-th occurrence of word in line id */
const T = (id: string, word: string, nth = 0) => {
  const l = LINES.find((x) => x.id === id)!; const h = l.w.filter((w) => norm(w[0]).startsWith(norm(word)));
  return (h[Math.min(nth, h.length - 1)] ?? [0, l.s])[1];
};
const S = (id: string) => LINES.find((x) => x.id === id)!.s;
const E = (id: string) => LINES.find((x) => x.id === id)!.e;
const mouthAt = (t: number, id: string) => {
  const l = LINES.find((x) => x.id === id)!; if (t < l.s || t > l.e + 0.05) return 0;
  for (let i = 0; i < l.w.length; i++) {
    const ws = l.w[i][1], we = i + 1 < l.w.length ? l.w[i + 1][1] : l.e;
    if (t >= ws && t < we) { const syl = Math.max(1, (l.w[i][0].toLowerCase().match(/[aeiouy]+/g) ?? []).length); return 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * syl * (t - ws) / Math.max(0.08, we - ws))); }
  }
  return 0;
};

// ---------------- tracks ----------------
type KN = [number, number, number?][];
type KV = [number, V2, number?][];
const tr = (t: number, v0: number, keys: KN) => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; v = v + (vk - v) * backOut((t - tk) / d); } return v; };
const trv = (t: number, v0: V2, keys: KV): V2 => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; const u = backOut((t - tk) / d); v = [v[0] + (vk[0] - v[0]) * u, v[1] + (vk[1] - v[1]) * u]; } return v; };
const step = <X,>(t: number, v0: X, keys: [number, X][]) => { let v = v0; for (const [tk, vk] of keys) if (t >= tk - 0.066) v = vk; return v; };
const sc2 = (t: number, on: boolean, a = 0.12, f = 15): V2 => on ? [a * Math.sin(t * f), 0.4 * a * Math.sin(t * f * 2 + 1)] : [0, 0];

// ---------------- projection ----------------
type V3 = [number, number, number];
const proj = (still: string, p: V3): [number, number, number] => {
  const P = STILLS[still].P, x = p[0], y = p[1], z = p[2];
  const cx = P[0] * x + P[1] * y + P[2] * z + P[3], cy = P[4] * x + P[5] * y + P[6] * z + P[7], cw = P[12] * x + P[13] * y + P[14] * z + P[15];
  return [(cx / cw * 0.5 + 0.5) * W, (1 - (cy / cw * 0.5 + 0.5)) * H, cw];
};
/** screen ground point + head diameter (px) for a character standing at world (x, y) */
const place = (still: string, x: number, y: number, dm = 0.52) => {
  const a = proj(still, [x, y, 0]), b = proj(still, [x, y, 1]);
  return { x: a[0], y: a[1], D: dm * (a[1] - b[1]) };
};

// ---------------- cast ----------------
const OTTO: Look = { body: "#6e5a44", shirt: "#f4f1e8", tie: "#2f5a4a", tieKind: "bow", buttons: "#d8b25a", hair: "tufts", hairCol: "#dcdad4", glasses: true, tash: "walrus", tashCol: "#e4e1da", wide: 1.14, tall: 0.96, shoe: "#3a2a20" };
const ERNEST: Look = { body: "#f1eee6", vest: "#3d5872", tie: "#a8443c", tieKind: "long", hat: "cap", hatCol: "#8a7252", hatCol2: "#76603f", buttons: "#d8d2c0", earPencil: true, wide: 0.92, tall: 1.06 };
const CLERK: Look = { body: "#7d7a5c", shirt: "#ecebe2", tie: "#5a2c3a", tieKind: "long", hat: "visor", hair: "slick", hairCol: "#2a2422", tash: "pencil", tashCol: "#2a2422", wide: 0.9, tall: 1.04, skin: "#eef0f6" };
const BOSS: Look = { body: "#5a2a38", stripes: "rgba(255,240,230,0.13)", shirt: "#efeee8", tie: "#c9a43a", tieKind: "long", chain: true, buttons: "#d9b44a", hat: "bowler", hatCol: "#22202a", tash: "handlebar", tashCol: "#1e1a1a", wide: 1.3, tall: 0.98, skin: "#eef0f6" };
const KIDA: Look = { body: "#c8453c", shirt: "#f4f1e8", hair: "mop", hairCol: "#5a3b2a", wide: 0.95, tall: 0.82, buttons: "#f4f1e8" };
const KIDB: Look = { body: "#3f8a5a", hat: "cap", hatCol: "#e0a83a", hatCol2: "#c58e2a", wide: 0.95, tall: 0.82, buttons: "#e8e2c8" };
const FARMER: Look = { body: "#4f6f8a", shirt: "#ece6d6", hair: "tufts", hairCol: "#d0cdc4", suspenders: "#7a4a2a", tash: "walrus", tashCol: "#d6d2c8", wide: 1.12, tall: 0.95, glasses: true };
const WIFE: Look = { body: "#a0506a", shirt: "#f2e8e0", hair: "mop", hairCol: "#dcdad6", wide: 1.0, tall: 0.98, glasses: true, buttons: "#f2e8e0" };
const SHADOW: Look = { body: "#14121a", hat: "bowler", hatCol: "#0c0a10", hatCol2: "#0c0a10", tash: "handlebar", tashCol: "#0c0a10", wide: 1.3, tall: 0.98, skin: "#1c1a22" };

type Actor = { L: Look; p: Pose; front?: boolean };
/** standard pose builder: rest arms on a desk (or hanging), idle life on top */
const base = (t: number, seed: number, at: { x: number; y: number; D: number }, desk: boolean): Pose => {
  const i = idle(t, seed);
  return { ...at, ...i, armL: { hand: desk ? [-0.05, 0.86] : [0.12, 0.95] }, armR: { hand: desk ? [-0.1, 0.84] : [0.12, 0.95] }, expr: "neutral", blink: blinkAt(t, seed), look: [0, 0], facing: 0 };
};

// ---------------- 2D camera ----------------
type Cam = { x: number; y: number; z: number };
type CK = [number, Cam, number?];
const camTrack = (t: number, keys: CK[], creep = 0.045): Cam => {
  let c = keys[0][1], settle = keys[0][0];
  for (let i = 1; i < keys.length; i++) { const [tk, ck, d = 0.5] = keys[i]; if (t < tk) break; const u = glide((t - tk) / d); c = { x: lerp(c.x, ck.x, u), y: lerp(c.y, ck.y, u), z: lerp(c.z, ck.z, u) }; settle = tk; }
  return { x: c.x + 6 * Math.sin(t * 0.9), y: c.y + 4 * Math.sin(t * 0.7 + 1), z: c.z * (1 + creep * Math.max(0, t - settle)) };
};
const KICKS: number[] = [];
const kick = (t: number) => { let a = 0; for (const k of KICKS) { const d = Math.round((t - k + 0.066) * FPS); if (d >= 0 && d < 8) a += 16 * (1 - d / 8) ** 1.4 * (d % 2 ? -1 : 1); } return a; };
/** camera centred on a world point of a still at zoom z */
const on = (still: string, p: V3, z: number): Cam => { const s = proj(still, p); return { x: s[0], y: s[1], z }; };

// ---------------- effects ----------------
const tiles = (g: CanvasRenderingContext2D, letters: string, cx: number, cy: number, sz: number, a = 1, col = "#f3ead2") => {
  g.save(); g.globalAlpha = a;
  [...letters].forEach((ch, i) => {
    const x = cx + (i - (letters.length - 1) / 2) * sz * 1.12;
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = sz * 0.07;
    g.beginPath(); g.roundRect(x - sz / 2, cy - sz / 2, sz, sz, sz * 0.12); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = `900 ${sz * 0.7}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, x, cy + sz * 0.04);
  });
  g.restore();
};
const tile1 = (g: CanvasRenderingContext2D, ch: string, x: number, y: number, sz: number) => tiles(g, ch, x, y, sz);
const qmark = (g: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) => {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `900 ${s}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = s * 0.12; g.strokeStyle = INK; g.strokeText("?", x, y); g.fillStyle = "#fff3b0"; g.fillText("?", x, y); g.restore();
};
const stamp = (g: CanvasRenderingContext2D, txt: string, x: number, y: number, s: number, u: number, col = "#c8302c") => {
  if (u <= 0) return; const k = 1 + 1.4 * (1 - backOut(u));
  g.save(); g.translate(x, y); g.rotate(-0.18); g.scale(k, k); g.globalAlpha = clamp01(u * 3);
  g.strokeStyle = col; g.lineWidth = s * 0.09; g.beginPath(); g.roundRect(-s * 2.2, -s * 0.55, s * 4.4, s * 1.1, s * 0.15); g.stroke();
  g.fillStyle = col; g.font = `900 ${s * 0.62}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, s * 0.03);
  g.restore();
};
const card = (g: CanvasRenderingContext2D, x: number, y: number, w: h, h: number, rot: number, draw: () => void) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.roundRect(-w / 2 + 14, -h / 2 + 18, w, h, 18); g.fill();
  g.fillStyle = "#f3ead2"; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 18); g.fill(); g.stroke();
  draw(); g.restore();
};
type h = number;
const mapLines = (g: CanvasRenderingContext2D, w: number, hh: number, prog = 1) => {
  g.save(); g.beginPath(); g.rect(-w / 2 + 10, -hh / 2 + 10, w - 20, hh - 20); g.clip();
  g.strokeStyle = "#7fa9cf"; g.lineWidth = 26; g.beginPath(); g.moveTo(-w / 2, hh * 0.3); g.bezierCurveTo(-w * 0.1, hh * 0.05, w * 0.1, hh * 0.45, w / 2, hh * 0.2); g.stroke();
  g.strokeStyle = "#c0504a"; g.lineWidth = 14; g.beginPath(); g.moveTo(-w / 2, -hh * 0.05); g.lineTo(-w / 2 + w * prog, -hh * 0.05 + 0.05 * hh * Math.sin(prog * 3)); g.stroke();
  g.strokeStyle = "#3a3030"; g.lineWidth = 9; g.beginPath(); g.moveTo(w * 0.02, -hh / 2); g.lineTo(w * 0.02, -hh / 2 + hh * prog); g.stroke();
  g.restore();
};
const dollar = (g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "#9cc48a"; g.strokeStyle = INK; g.lineWidth = s * 0.05; g.beginPath(); g.roundRect(-s, -s * 0.45, 2 * s, 0.9 * s, s * 0.08); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0, s * 0.3, s * 0.32, 0, 0, Math.PI * 2); g.fillStyle = "#cfe3c0"; g.fill(); g.stroke();
  g.fillStyle = "#2f5a34"; g.font = `900 ${s * 0.5}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$1", 0, s * 0.02);
  g.restore();
};
const phone = (g: CanvasRenderingContext2D, x: number, y: number, s: number, pin: number) => {
  g.save(); g.translate(x, y);
  g.fillStyle = "#1d1f27"; g.strokeStyle = INK; g.lineWidth = s * 0.03; g.beginPath(); g.roundRect(-s * 0.55, -s, s * 1.1, s * 2, s * 0.14); g.fill(); g.stroke();
  g.fillStyle = "#eef2e6"; g.beginPath(); g.roundRect(-s * 0.48, -s * 0.88, s * 0.96, s * 1.76, s * 0.06); g.fill();
  g.save(); g.beginPath(); g.rect(-s * 0.48, -s * 0.88, s * 0.96, s * 1.76); g.clip();
  g.fillStyle = "#cfe3c0"; g.fillRect(-s * 0.48, -s * 0.88, s * 0.96, s * 1.76);
  g.strokeStyle = "#ffffff"; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(-s * 0.6, s * 0.1); g.lineTo(s * 0.6, 0); g.moveTo(0, -s); g.lineTo(s * 0.05, s); g.stroke();
  g.strokeStyle = "#8fb4dd"; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(-s * 0.6, s * 0.6); g.bezierCurveTo(-s * 0.2, s * 0.4, s * 0.2, s * 0.8, s * 0.6, s * 0.55); g.stroke();
  g.restore();
  if (pin > 0) { const k = backOut(pin); g.save(); g.translate(s * 0.02, -s * 0.02 - s * 0.25 * k); g.scale(k, k);
    g.fillStyle = "#e0453a"; g.beginPath(); g.arc(0, -s * 0.12, s * 0.13, Math.PI, 0); g.lineTo(0, s * 0.12); g.closePath(); g.fill(); g.lineWidth = s * 0.02; g.stroke();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0, -s * 0.12, s * 0.05, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = INK; g.font = `900 ${s * 0.16}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.fillText("Agloe", s * 0.02, s * 0.32); }
  g.restore();
};
/** hand point in screen px, re-solved like the rig */
const handPt = (p: Pose, L: Look, s: number, hd: V2): V2 => {
  const tw = 0.6 * p.D * (L.wide ?? 1), top = p.y - 0.98 * p.D - (p.bob ?? 0) - 1.42 * p.D * (L.tall ?? 1) * (p.squash ?? 1);
  return [p.x + s * (tw / 2 - 0.035 * p.D) + s * hd[0] * p.D, top + 0.24 * p.D + hd[1] * p.D];
};
const headPt = (p: Pose, L: Look): V2 => [p.x, p.y - 0.98 * p.D - (p.bob ?? 0) - 1.42 * p.D * (L.tall ?? 1) * (p.squash ?? 1) - 0.42 * p.D];
const ledger = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.rotate(-0.1);
  g.fillStyle = "#6a2a2a"; g.strokeStyle = INK; g.lineWidth = s * 0.05; g.beginPath(); g.roundRect(-s * 0.6, -s * 0.8, s * 1.2, s * 1.6, s * 0.06); g.fill(); g.stroke();
  g.fillStyle = "#d9b44a"; g.fillRect(-s * 0.35, -s * 0.45, s * 0.7, s * 0.18); g.restore();
};
const walkPos = (t: number, t0: number, t1: number, a: [number, number], b: [number, number]) => { const u = clamp01((t - t0) / (t1 - t0)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), u] as const; };

// ---------------- shots ----------------
type Ctx = { t: number; fx: CanvasRenderingContext2D; under: CanvasRenderingContext2D };
type Shot = { a: number; b: number; still: string; cam: (t: number) => Cam; blur?: (t: number) => number; actors: (t: number) => Actor[]; fx?: (c: Ctx, A: Actor[], cam: Cam) => void; pop?: (t: number) => number };
// world spots per still
const OF = { otto: [-0.63, 3.35], ern: [0.63, 3.5] } as const;
const RV = { clerk: [-0.6, 2.95], boss: [0.85, 4.35] } as const;
const CL = { a: [-0.55, 2.95], b: [0.55, 2.95] } as const;
const KT = { farm: [-0.38, 3.25], wife: [0.38, 3.32], buyer: [1.05, 4.7] } as const;
const CR = { otto: [-0.45, 0.4], ern: [0.75, 0.6] } as const;
const atO = (s: string, w: readonly [number, number], dm = 0.52) => place(s, w[0], w[1], dm);

// office pair at desks: shared acting helper
const officePair = (t: number, o: Partial<Pose>, e: Partial<Pose>): Actor[] => [
  { L: OTTO, p: { ...base(t, 3, atO("office", OF.otto), true), facing: 0.3, ...o } },
  { L: ERNEST, p: { ...base(t, 5, atO("office", OF.ern), true), facing: -0.3, ...e } },
];
const drawArm = (t: number, on: boolean, hd: V2, f = 15, a = 0.12): V2 => { const s = sc2(t, on, a, f); return [hd[0] + s[0], hd[1] + s[1]]; };

const SH: Shot[] = [];
const add = (s: Shot) => SH.push(s);

// 1 HOOK - the crossroads; the lodge pops into existence on "real"
{
  const tInv = T("l01", "invented"), tEx = T("l01", "exist"), tReal = T("l01", "real");
  KICKS.push(tReal);
  add({ a: 0, b: S("l02") - 0.35, still: "cross_day", pop: (t) => (t < tReal - 0.05 ? 0 : backOut((t - tReal + 0.05) / 0.3)),
    cam: (t) => camTrack(t, [[0, on("cross_day", [0.15, 0.5, 1.05], 1.9)], [tReal - 0.05, on("cross_day", [-1.6, 7, 1.7], 1.15), 0.35]], 0.03),
    actors: (t) => {
      const shock = t >= tReal - 0.05;
      return [
        { L: OTTO, p: { ...base(t, 3, atO("cross_day", CR.otto), false), facing: 0.25, expr: shock ? "shock" : t > tInv ? "smug" : "neutral",
          armR: { hand: trv(t, [0.12, 0.95], [[tInv - 0.05, [0.3, -0.5]], [tEx, [0.12, 0.95]], [tReal - 0.05, [0.45, -0.7], 0.15]]), k: t > tInv - 0.05 && t < tEx ? "point" : "open" },
          armL: { hand: shock ? [0.45, -0.7] : [0.12, 0.95] }, bob: shock ? 30 * Math.max(0, 1 - (t - tReal) * 3) : 0, look: shock ? [-0.8, -0.5] : [0.4, 0] } },
        { L: ERNEST, p: { ...base(t, 5, atO("cross_day", CR.ern), false), facing: -0.25, expr: shock ? "shock" : t > tEx ? "worried" : "neutral",
          armR: { hand: trv(t, [0.12, 0.95], [[tEx - 0.05, [0.4, 0.2]], [tReal - 0.05, [0.45, -0.7], 0.15]]) }, armL: { hand: trv(t, [0.12, 0.95], [[tEx - 0.05, [0.4, 0.2]], [tReal - 0.05, [0.45, -0.7], 0.15]]) },
          bob: shock ? 34 * Math.max(0, 1 - (t - tReal) * 3) : 0, look: shock ? [-0.9, -0.5] : [-0.4, 0] } },
      ];
    },
  });
}
// 2 "New York, the 1920s." office, tilt down from the skyline
add({ a: S("l02") - 0.35, b: T("l02", "Otto") - 0.12, still: "office",
  cam: (t) => camTrack(t, [[S("l02") - 0.35, on("office", [0, 5.5, 2.4], 1.45)], [S("l02") + 0.1, on("office", [0, 3.4, 1.3], 1.05), 1.3]], 0.02),
  actors: (t) => officePair(t, { armR: { hand: drawArm(t, true, [-0.12, 0.84], 13, 0.07), k: "pencil" }, expr: "focus", look: [0.3, 0.9], lean: 5 },
    { armR: { hand: drawArm(t + 1, true, [-0.1, 0.84], 11, 0.07), k: "pencil" }, expr: "focus", look: [-0.3, 0.9], lean: -5 }) });
// 3 "Otto and Ernest draw road maps for gas stations."
{
  const tO = T("l02", "Otto"), tE = T("l02", "Ernest"), tM = T("l02", "road"), tG = T("l02", "gas"), tEnd = T("l02", "Every") - 0.12;
  add({ a: tO - 0.12, b: tEnd, still: "office",
    cam: (t) => camTrack(t, [[tO - 0.12, on("office", [-0.12, 3.4, 1.35], 1.1)], [tE - 0.05, on("office", [0.12, 3.4, 1.35], 1.1), 0.4], [tM, on("office", [0, 3.4, 1.3], 1.04), 0.4]], 0.02),
    actors: (t) => {
      const up = t >= tM - 0.05;
      return officePair(t,
        { armR: { hand: trv(t, [-0.12, 0.84], [[tO - 0.05, [-0.24, -0.3], 0.18], [tO + 0.45, [-0.12, 0.84]], [tM - 0.05, [0.06, 0.3]]]), k: up ? "open" : t < tO + 0.45 && t > tO ? "open" : "pencil" },
          armL: { hand: up ? [0.06, 0.3] : [-0.05, 0.86] }, expr: step<Expr>(t, "focus", [[tO, "smug"], [tM, "happy"]]), glint: t > tO && t < tO + 0.5 ? 1 - (t - tO) / 0.5 : 0,
          bob: 60 * tr(t, 0, [[tO - 0.05, 0.3, 0.12], [tO + 0.25, 0, 0.3]]), tilt: tr(t, 0, [[tO, -6], [tO + 0.5, 0]]), facing: up ? 0 : 0.3 },
        { armR: { hand: trv(t, [-0.1, 0.84], [[tE - 0.05, [0.0, -0.78], 0.2], [tE + 0.3, [-0.1, 0.84], 0.18], [tM - 0.05, [0.06, 0.3]], [tG - 0.05, [0.1, 0.8]]]), k: (t >= tE - 0.05 && t < tE + 0.3) || up ? "open" : "pencil" },
          armL: { hand: trv(t, [-0.04, 0.86], [[tM - 0.05, [0.06, 0.3]], [tG - 0.05, [0.35, -0.6]]]), k: t >= tG - 0.05 ? "point" : "open" },
          expr: step<Expr>(t, "focus", [[tE, "grin"], [tM, "happy"], [tG, "grin"]]), bob: 60 * tr(t, 0, [[tE - 0.05, 0.3, 0.12], [tE + 0.3, 0, 0.3]]),
          tilt: tr(t, 0, [[tE, 8], [tE + 0.6, 0], [tG, -6]]), look: t > tG ? [-0.6, -0.6] : [0, 0], facing: t > tG - 0.05 ? -0.3 : 0 });
    },
    fx: ({ t, fx }, A) => {
      const [o, e] = A;
      if (t >= tM - 0.02) { sheet(fx, handPt(o.p, OTTO, -1, o.p.armL.hand), handPt(o.p, OTTO, 1, o.p.armR.hand), o.p.D); if (t < tG - 0.05) sheet(fx, handPt(e.p, ERNEST, -1, e.p.armL.hand), handPt(e.p, ERNEST, 1, e.p.armR.hand), e.p.D); }
      const hO = headPt(o.p, OTTO), hE = headPt(e.p, ERNEST);
      pumpBubble(fx, (hO[0] + hE[0]) / 2, Math.min(hO[1], hE[1]) - 0.5 * o.p.D, 0.42 * o.p.D, t < tG - 0.05 ? 0 : backOut((t - tG + 0.05) / 0.25));
    },
  });
}
// 4 "Every road, every bend, by hand." Otto close-up
{
  const tEv = T("l02", "Every"), tB = T("l02", "bend"), tH = T("l02", "by");
  KICKS.push(tH);
  add({ a: tEv - 0.12, b: S("l03") - 0.1, still: "office", blur: () => 7,
    cam: (t) => camTrack(t, [[tEv - 0.12, on("office", [-0.63, 3.35, 1.2], 2.05)], [tH - 0.05, on("office", [-0.6, 3.35, 1.35], 1.95), 0.3]], 0.035),
    actors: (t) => {
      const drawing = t < tH - 0.05;
      return officePair(t, { armR: { hand: drawing ? drawArm(t, true, [-0.12, 0.84], 15, 0.13) : [0.32, -0.95], k: "pencil" }, armL: { hand: [-0.05, 0.86] },
        expr: drawing ? "focus" : "proud", tongue: drawing, look: drawing ? [0.3, 0.9] : [0, 0], lean: drawing ? 10 : -6,
        tilt: (t > tB - 0.1 && drawing ? 9 * Math.sin((t - tB) * 7) : 0) + (drawing ? 0 : 7), bob: drawing ? 0 : 70 * tr(t, 0, [[tH - 0.05, 0.25, 0.12], [tH + 0.3, 0.04]]), facing: drawing ? 0.35 : 0 },
        { armR: { hand: drawArm(t + 2, true, [-0.1, 0.84], 12, 0.08), k: "pencil" }, expr: "focus", look: [-0.3, 0.9] });
    },
    fx: ({ t, fx }, A) => { if (t > tH) { const o = A[0].p, hp = handPt(o, OTTO, 1, o.armR.hand); sparkle(fx, hp[0] + 0.15 * o.D, hp[1] - 0.5 * o.D, 0.22 * o.D * (1 + 0.2 * Math.sin(t * 20)), clamp01((t - tH) / 0.12)); } },
  });
}
// 5 "But rival companies can just trace a finished map," rival wide
{
  const tTr = T("l03", "trace"), tF = T("l03", "finished"), tA = T("l03", "and");
  add({ a: S("l03") - 0.1, b: tA - 0.1, still: "rival",
    cam: (t) => camTrack(t, [[S("l03") - 0.1, on("rival", [0.1, 3.4, 1.3], 1.12)], [tTr - 0.05, on("rival", [-0.3, 3.1, 1.25], 1.3), 0.8]], 0.02),
    actors: (t) => {
      const dart = Math.sin(t * 4.2) > 0 ? -0.9 : 0.9, trX = t < tTr ? 0.03 * Math.sin(t * 9) : -0.25 + 0.5 * clamp01((t - tTr) / 0.9);
      return [
        { L: BOSS, p: { ...base(t, 7, atO("rival", RV.boss), true), armR: { hand: [-0.12, -0.18], k: "cigar" }, armL: { hand: [-0.05, 0.86] }, expr: "smug", look: [-0.7, 0.2], facing: -0.3, bob: 4 * Math.abs(Math.sin(t * 3)) } },
        { L: CLERK, p: { ...base(t, 9, atO("rival", RV.clerk), true), lean: 6, armR: { hand: [-0.12 + trX, 0.86 + 0.03 * Math.sin(t * 13)], k: "pencil" }, armL: { hand: trv(t, [-0.02, 0.88], [[tF, [0.1, 0.62]]]) }, expr: "sneaky", look: [dart, 0.3] } },
      ];
    } });
}
// 6 "and swear they didn't." clerk close
{
  const tSw = T("l03", "swear"), tD = T("l03", "didn");
  add({ a: T("l03", "and") - 0.1, b: S("l04") - 0.1, still: "rival", blur: () => 7,
    cam: (t) => camTrack(t, [[0, on("rival", [-0.6, 2.95, 1.25], 2.0)]], 0.04),
    actors: (t) => [{ L: CLERK, p: { ...base(t, 9, atO("rival", RV.clerk), true), lean: tr(t, 6, [[tSw - 0.05, -5, 0.2]]), bob: 60 * tr(t, 0, [[tSw - 0.05, 0.4, 0.1], [tSw + 0.2, 0, 0.3]]),
      tilt: t > tD ? 8 * Math.sin((t - tD) * 16) : tr(t, 0, [[tSw, -8]]),
      armR: { hand: trv(t, [-0.12, 0.86], [[tSw - 0.05, [0.42, -0.62], 0.18]]) }, armL: { hand: trv(t, [-0.02, 0.88], [[tSw - 0.05, [0.42, -0.62], 0.18]]) },
      expr: step<Expr>(t, "sneaky", [[tSw, "whistle"]]), look: t > tSw ? [0.8, -0.6] : [0, 0], sweat: clamp01((t - tSw) / 0.3) } }] });
}
// 7 BOSS: "We drew it ourselves!"
{
  const tWe = T("l04", "We"), tOu = T("l04", "ourselves");
  KICKS.push(tOu);
  add({ a: S("l04") - 0.1, b: S("l05") - 0.12, still: "rival", blur: () => 9,
    cam: (t) => camTrack(t, [[0, on("rival", [0.85, 4.35, 1.3], 2.5)], [tOu - 0.05, on("rival", [0.85, 4.35, 1.38], 2.65), 0.25]], 0.02),
    actors: (t) => { const i = idle(t, 7); return [{ L: BOSS, p: { ...base(t, 7, atO("rival", RV.boss), true), squash: i.squash * tr(t, 1, [[tOu - 0.05, 1.07, 0.2], [tOu + 0.6, 1.0, 0.4]]),
      lean: tr(t, 0, [[tWe, -3], [tOu - 0.05, -9, 0.2]]), tilt: i.tilt + tr(t, 0, [[tOu, -8]]), mouth: mouthAt(t, "l04"),
      armR: { hand: trv(t, [-0.12, -0.18], [[tOu - 0.05, [0.02, 0.5], 0.2]]), k: t >= tOu - 0.05 ? "thumb" : "cigar", rot: t >= tOu - 0.05 ? -1.05 : 0 },
      armL: { hand: trv(t, [0.32, 0.5], [[tWe, [-0.08, 0.5], 0.2], [tOu - 0.05, [0.02, 0.5], 0.2]]), k: t >= tOu - 0.05 ? "thumb" : "open", rot: t >= tOu - 0.05 ? 1.05 : 0 },
      expr: t > E("l04") ? "grin" : step<Expr>(t, "smug", [[tWe, "proud"]]) } }]; } });
}
// 8 "So how do you prove it? A road is a road. A river is a river."
{
  const tP = T("l05", "prove"), tR = T("l05", "road"), tRv = T("l05", "river");
  add({ a: S("l05") - 0.12, b: S("l06") - 0.12, still: "office",
    cam: (t) => camTrack(t, [[S("l05") - 0.12, on("office", [0, 3.4, 1.3], 1.14)], [tR - 0.05, on("office", [0, 3.4, 1.3], 1.04), 0.35]], 0.025),
    actors: (t) => officePair(t,
      { armR: { hand: trv(t, [-0.12, 0.84], [[tP - 0.1, [-0.1, -0.55], 0.2], [tR - 0.05, [0.06, 0.3]]]), k: "open" }, armL: { hand: t >= tR - 0.05 ? [0.06, 0.3] : [-0.05, 0.86] },
        expr: step<Expr>(t, "worried", [[tR, "neutral"], [tRv, "worried"]]), tilt: t > tP && t < tR ? 6 * Math.sin((t - tP) * 10) : 0, look: t > tRv ? [0.8, 0] : [0, 0], facing: t > tRv ? 0.5 : 0.2 },
      { armR: { hand: trv(t, [-0.1, 0.84], [[tR - 0.05, [0.06, 0.3]]]), k: "open" }, armL: { hand: trv(t, [-0.04, 0.86], [[tR - 0.05, [0.06, 0.3]]]) },
        expr: step<Expr>(t, "neutral", [[tP, "worried"], [tR, "neutral"], [tRv, "worried"]]), look: t > tRv ? [-0.8, 0] : [0, 0], facing: t > tRv ? -0.5 : -0.2,
        lean: t > tRv ? -4 : 0, bob: t > tRv ? 10 * Math.abs(Math.sin((t - tRv) * 6)) : 0 }),
    fx: ({ t, fx }, A) => { const [o, e] = A; if (t >= tR - 0.02) { sheet(fx, handPt(o.p, OTTO, -1, o.p.armL.hand), handPt(o.p, OTTO, 1, o.p.armR.hand), o.p.D); sheet(fx, handPt(e.p, ERNEST, -1, e.p.armL.hand), handPt(e.p, ERNEST, 1, e.p.armR.hand), e.p.D); }
      if (t > tRv) { const hO = headPt(o.p, OTTO); qmark(fx, (hO[0] + headPt(e.p, ERNEST)[0]) / 2, hO[1] - 0.6 * o.p.D, 0.7 * o.p.D, clamp01((t - tRv) / 0.15)); } },
  });
}
// 9 "So the two men find an empty dirt crossroads up in the mountains," they walk in
{
  const t0 = S("l06") - 0.12, tM = T("l06", "mountains"), tEnd = T("l06", "and") - 0.1;
  add({ a: t0, b: tEnd, still: "cross_day",
    cam: (t) => camTrack(t, [[t0, on("cross_day", [1.6, 0.5, 1.2], 1.5)], [t0 + 0.2, on("cross_day", [0.3, 0.5, 1.05], 1.75), 1.8]], 0.02),
    actors: (t) => {
      const [ox, oy, u] = walkPos(t, t0, tM - 0.1, [3.3, -0.1], CR.otto as unknown as [number, number]);
      const [ex, ey] = walkPos(t, t0 + 0.15, tM, [4.6, 0.2], CR.ern as unknown as [number, number]);
      const walking = u < 1, ph = (t - t0) * 2.1;
      return [
        { L: OTTO, p: { ...base(t, 3, place("cross_day", ox, oy), false), walk: walking ? ph : undefined, facing: walking ? -0.5 : 0, lean: walking ? -3 : 0, bob: walking ? 6 * Math.abs(Math.sin(ph * Math.PI * 2)) : 0,
          armL: { hand: walking ? [0.1 + 0.1 * Math.sin(ph * 6.28), 0.9] : [0.12, 0.95] }, armR: { hand: walking ? [0.1 - 0.1 * Math.sin(ph * 6.28), 0.9] : [0.35, 0.35] },
          expr: t > tM ? "happy" : "neutral", look: t > tM ? [-0.6, -0.3] : [-0.6, 0] } },
        { L: ERNEST, p: { ...base(t, 5, place("cross_day", ex, ey), false), walk: t < tM ? ph + 0.5 : undefined, facing: t < tM ? -0.5 : 0, lean: t < tM ? -3 : 0,
          armL: { hand: t < tM ? [0.1 - 0.1 * Math.sin(ph * 6.28), 0.9] : [0.4, -0.05] }, armR: { hand: [0.1 + 0.1 * Math.sin(ph * 6.28), 0.9] }, expr: t > tM ? "grin" : "neutral", look: t > tM ? [-0.7, -0.2] : [-0.6, 0] } },
      ];
    } });
}
// 10 "and draw a tiny town that isn't there." insert: the map card, a dot pings into existence
{
  const t0 = T("l06", "and") - 0.1, tT = T("l06", "tiny"), tIs = T("l06", "isn"), tEnd = T("l06", "They") - 0.1;
  add({ a: t0, b: tEnd, still: "office", blur: () => 12,
    cam: (t) => camTrack(t, [[0, on("office", [-0.63, 3.0, 0.9], 1.6)]], 0.03),
    actors: (t) => officePair(t, { armR: { hand: drawArm(t, t < tT, [-0.12, 0.84], 15, 0.1), k: "pencil" }, expr: t > tIs ? "smug" : "focus", look: [0.3, 0.9] }, { armR: { hand: drawArm(t, true, [-0.1, 0.84], 12, 0.06), k: "pencil" }, expr: "focus", look: [-0.3, 0.9] }),
    fx: ({ t, fx }) => {
      fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0);
      const k = backOut((t - t0) / 0.25), x = 720, y = 1250;
      card(fx, x, y + (1 - k) * 900, 1100, 800, -0.04, () => {
        mapLines(fx, 1100, 800, 1);
        if (t > tT - 0.05) { const u = backOut((t - tT + 0.05) / 0.25); fx.fillStyle = INK; fx.beginPath(); fx.arc(40, -60, 22 * u, 0, Math.PI * 2); fx.fill();
          const r = ((t - tT) * 1.6) % 1; fx.strokeStyle = `rgba(200,48,44,${1 - r})`; fx.lineWidth = 8; fx.beginPath(); fx.arc(40, -60, 30 + 120 * r, 0, Math.PI * 2); fx.stroke(); }
        if (t > tIs) qmark(fx, 150, -170, 140, clamp01((t - tIs) / 0.12));
      });
      fx.restore();
    } });
}
// 11 "They call it Agloe. Their initials, scrambled." letter tiles fly together
{
  const t0 = T("l06", "They") - 0.1, tA = T("l06", "Agloe"), tIn = T("l06", "initials"), tSc = T("l06", "scrambled");
  add({ a: t0, b: S("l07") - 0.15, still: "office",
    cam: (t) => camTrack(t, [[t0, on("office", [0, 3.4, 1.35], 1.0)]], 0.02),
    actors: (t) => officePair(t, { armR: { hand: trv(t, [-0.12, 0.84], [[tIn - 0.05, [0.3, -0.85], 0.2]]), k: t > tIn - 0.05 ? "point" : "pencil" }, expr: step<Expr>(t, "smug", [[tSc, "grin"]]), look: t > tSc ? [0.5, -0.8] : [0, -0.6] },
      { armR: { hand: trv(t, [-0.1, 0.84], [[tIn + 0.1, [0.3, -0.85], 0.2]]), k: t > tIn + 0.05 ? "point" : "pencil" }, expr: step<Expr>(t, "neutral", [[tA, "happy"], [tSc, "grin"]]), look: t > tSc ? [-0.5, -0.8] : [0, -0.6] }),
    fx: ({ t, fx }, A) => {
      if (t < tA - 0.05) return;
      const [o, e] = A, hO = headPt(o.p, OTTO), hE = headPt(e.p, ERNEST), sz = 0.42 * o.p.D;
      const from: [string, number, number][] = [["O", hO[0] - sz * 1.15, hO[1] - 0.95 * o.p.D], ["G", hO[0], hO[1] - 0.95 * o.p.D], ["L", hO[0] + sz * 1.15, hO[1] - 0.95 * o.p.D], ["E", hE[0] - sz * 0.6, hE[1] - 0.95 * o.p.D], ["A", hE[0] + sz * 0.6, hE[1] - 0.95 * o.p.D]];
      const order = "AGLOE", cx = 720, cy = Math.min(hO[1], hE[1]) - 1.5 * o.p.D;
      const k = backOut((t - tA + 0.05) / 0.2), u = glide((t - tSc) / 0.45);
      from.forEach(([ch, x, y], i) => { const j = order.indexOf(ch); const tx = cx + (j - 2) * sz * 1.15; tile1(fx, ch, Math.max(sz * 0.8, Math.min(W - sz * 0.8, lerp(x, tx, u))), lerp(y, cy, u) - Math.sin(u * Math.PI) * 120 * (i % 2 ? 1 : -0.6), sz * k); });
      if (t > tSc + 0.45) sparkle(fx, cx + 3.2 * sz, cy - 0.8 * sz, 0.5 * sz, clamp01((t - tSc - 0.45) / 0.1));
    } });
}
// 12 "Wait. Why put a fake town on a real map?" Ernest close, confused
{
  const tW = T("l07", "Wait"), tWhy = T("l07", "Why"), tR = T("l07", "real");
  add({ a: S("l07") - 0.15, b: S("l08") - 0.12, still: "office", blur: () => 8,
    cam: (t) => camTrack(t, [[0, on("office", [0.63, 3.5, 1.2], 2.0)]], 0.03),
    actors: (t) => officePair(t, { expr: "focus", armR: { hand: drawArm(t, true, [-0.12, 0.84], 15, 0.08), k: "pencil" } },
      { armL: { hand: trv(t, [-0.04, 0.86], [[tW - 0.05, [0.35, -0.55], 0.15], [tWhy, [-0.1, -0.5], 0.25]]), k: t > tW - 0.05 && t < tWhy ? "wave" : "open" },
        armR: { hand: trv(t, [-0.1, 0.84], [[tR - 0.05, [0.3, 0.2]]]), k: "open" }, expr: step<Expr>(t, "neutral", [[tW, "shock"], [tWhy, "worried"]]),
        tilt: t > tWhy ? 8 * Math.sin((t - tWhy) * 3) : 0, look: t > tWhy ? [0.3, -0.6] : [0, 0], bob: 50 * tr(t, 0, [[tW - 0.05, 0.3, 0.1], [tW + 0.2, 0, 0.3]]) }),
    fx: ({ t, fx }, A) => { const e = A[1].p, h = headPt(e, ERNEST); qmark(fx, h[0] + 0.55 * e.D, h[1] - 0.55 * e.D, 0.6 * e.D, clamp01((t - tWhy) / 0.12)); qmark(fx, h[0] - 0.6 * e.D, h[1] - 0.7 * e.D, 0.42 * e.D, clamp01((t - tR) / 0.12)); } });
}
// 13 "You see, it's a trap. Like slipping a fake word into your homework." classroom
{
  const tT = T("l08", "trap"), tF = T("l08", "fake"), tHw = T("l08", "homework"), tIf = T("l08", "If");
  KICKS.push(tT);
  add({ a: S("l08") - 0.12, b: tIf - 0.1, still: "class",
    cam: (t) => camTrack(t, [[S("l08") - 0.12, on("class", [0, 3.0, 1.0], 1.12)], [tF - 0.05, on("class", [-0.55, 2.95, 0.95], 1.55), 0.45]], 0.025),
    actors: (t) => [
      { L: KIDA, p: { ...base(t, 11, atO("class", CL.a, 0.42), true), armR: { hand: drawArm(t, true, [-0.12, 0.84], 15, t > tF ? 0.12 : 0.06), k: "pencil" }, expr: step<Expr>(t, "focus", [[tF, "smug"]]), look: [0.3, 0.9], tongue: t > tF, facing: 0.3 } },
      { L: KIDB, p: { ...base(t, 13, atO("class", CL.b, 0.42), true), armR: { hand: [-0.1, 0.84], k: "pencil" }, expr: step<Expr>(t, "neutral", [[tT, "sneaky"]]), look: t > tT ? [-0.9, 0.4] : [0, 0], lean: t > tT ? -6 : 0, facing: -0.3 } },
    ],
    fx: ({ t, fx }, A) => { if (t > tF) { const a = A[0].p, hp = handPt(a, KIDA, 1, a.armR.hand); sparkle(fx, hp[0] + 0.3 * a.D, hp[1] - 0.2 * a.D, 0.25 * a.D, clamp01((t - tF) / 0.1) * (0.6 + 0.4 * Math.sin(t * 20))); } void tHw; } });
}
// 14 "If your friend's copy has the same fake word, you know who copied." the copier gets caught
{
  const t0 = T("l08", "If") - 0.1, tCo = T("l08", "copy"), tSa = T("l08", "same"), tK = T("l08", "know"), tC = T("l08", "copied");
  KICKS.push(tK);
  add({ a: t0, b: S("l09") - 0.12, still: "class",
    cam: (t) => camTrack(t, [[t0, on("class", [0.55, 2.95, 0.95], 1.55)], [tK - 0.05, on("class", [0, 2.95, 1.0], 1.3), 0.3]], 0.025),
    actors: (t) => {
      const caught = t >= tK - 0.05;
      return [
        { L: KIDA, p: { ...base(t, 11, atO("class", CL.a, 0.42), true), armR: { hand: caught ? [0.45, -0.25] : [-0.12, 0.84], k: caught ? "point" : "pencil" }, expr: caught ? "angry" : "focus", look: caught ? [0.9, 0] : [0.3, 0.9], facing: caught ? 0.5 : 0.3 } },
        { L: KIDB, p: { ...base(t, 13, atO("class", CL.b, 0.42), true), armR: { hand: drawArm(t, t > tCo && !caught, [-0.1, 0.84], 15, 0.12), k: "pencil" }, expr: caught ? "shock" : t > tSa ? "grin" : "sneaky",
          look: caught ? [-0.6, -0.3] : t > tCo ? [-0.9, 0.5] : [-0.6, 0.6], lean: caught ? 4 : -7, sweat: clamp01((t - tC) / 0.3), bob: 60 * tr(t, 0, [[tK - 0.05, 0.35, 0.1], [tK + 0.25, 0, 0.3]]) } },
      ];
    } });
}
// 15 "Years later, a rival map comes out." Otto unfolds the rival map
{
  const t0 = S("l09") - 0.12, tR = T("l09", "rival"), tAnd = T("l09", "And");
  add({ a: t0, b: tAnd - 0.1, still: "office",
    cam: (t) => camTrack(t, [[t0, on("office", [0, 3.4, 1.3], 1.05)], [tR, on("office", [-0.25, 3.4, 1.3], 1.3), 0.6]], 0.02),
    actors: (t) => officePair(t, { armR: { hand: trv(t, [-0.12, 0.84], [[tR - 0.05, [0.06, 0.3]]]) }, armL: { hand: trv(t, [-0.05, 0.86], [[tR - 0.05, [0.06, 0.3]]]) }, expr: t > tR ? "focus" : "neutral", look: [0.2, 0.6] },
      { armL: { hand: [0.1, 0.4] }, expr: t > tR ? "focus" : "neutral", look: [-0.8, 0.6], lean: t > tR ? -8 : 0, facing: -0.5 }),
    fx: ({ t, fx }, A) => { const o = A[0].p; if (t > tR - 0.02) sheet(fx, handPt(o, OTTO, -1, o.armL.hand), handPt(o, OTTO, 1, o.armR.hand), o.D); } });
}
// 16 "And right there, on that empty crossroads... Agloe. Gotcha!"
{
  const t0 = T("l09", "And") - 0.1, tAg = T("l09", "Agloe"), tG = T("l09", "Gotcha");
  KICKS.push(tG);
  add({ a: t0, b: S("l10") - 0.12, still: "office", blur: () => 7,
    cam: (t) => camTrack(t, [[t0, on("office", [-0.63, 3.35, 1.15], 1.8)], [tAg - 0.05, on("office", [-0.63, 3.35, 1.25], 2.1), 0.25], [tG - 0.05, on("office", [-0.4, 3.35, 1.25], 1.9), 0.2]], 0.03),
    actors: (t) => {
      const got = t >= tG - 0.05;
      return officePair(t, { armR: { hand: got ? [0.25, -0.55] : [0.06, 0.3], k: got ? "point" : "open" }, armL: { hand: got ? [0.12, 0.95] : [0.06, 0.3] },
        expr: step<Expr>(t, "focus", [[tAg, "shock"], [tG, "grin"]]), look: got ? [0, 0] : [0.2, 0.7], bob: 60 * tr(t, 0, [[tG - 0.05, 0.35, 0.1], [tG + 0.25, 0.05, 0.3]]), lean: got ? -6 : 3, tilt: got ? -7 : 0 },
        { expr: step<Expr>(t, "focus", [[tAg, "shock"], [tG, "grin"]]), armL: { hand: got ? [0.45, -0.7] : [0.1, 0.4] }, look: [-0.8, 0.5], facing: -0.5 });
    },
    fx: ({ t, fx }, A) => { const o = A[0].p; if (t < tG - 0.05) sheet(fx, handPt(o, OTTO, -1, o.armL.hand), handPt(o, OTTO, 1, o.armR.hand), o.D);
      if (t > tAg && t < tG) { const h = headPt(o, OTTO); fx.save(); fx.strokeStyle = "#fff3b0"; fx.lineWidth = 10; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.35; fx.beginPath(); fx.moveTo(h[0] + Math.cos(a) * 0.62 * o.D, h[1] + Math.sin(a) * 0.62 * o.D); fx.lineTo(h[0] + Math.cos(a) * 0.85 * o.D, h[1] + Math.sin(a) * 0.85 * o.D); fx.stroke(); } fx.restore(); } } });
}
// 17 "They march over to catch the copycats red-handed." into the rival office
{
  const t0 = S("l10") - 0.12, tC = T("l10", "copycats"), tRH = T("l10", "red");
  add({ a: t0, b: S("l11") - 0.08, still: "rival",
    cam: (t) => camTrack(t, [[t0, on("rival", [0.25, 3.0, 1.3], 1.0)]], 0.03),
    actors: (t) => {
      const [ox, oy, u] = walkPos(t, t0, tC, [2.4, 2.65], [0.5, 2.7]);
      const [ex, ey] = walkPos(t, t0 + 0.12, tC + 0.12, [3.1, 2.85], [1.25, 2.95]);
      const walking = u < 1, ph = (t - t0) * 2.3;
      const spot = t >= tRH - 0.05;
      return [
        { L: BOSS, p: { ...base(t, 7, atO("rival", RV.boss), true), armR: { hand: [-0.12, -0.18], k: "cigar" }, expr: spot ? "smug" : "neutral", look: [0.6, 0.2] } },
        { L: CLERK, p: { ...base(t, 9, atO("rival", RV.clerk), true), armR: { hand: [-0.12, 0.86], k: "pencil" }, expr: spot ? "shock" : "sneaky", look: [0.9, 0.2], sweat: clamp01((t - tRH) / 0.3), bob: 40 * tr(t, 0, [[tRH - 0.05, 0.3, 0.1], [tRH + 0.2, 0, 0.3]]) } },
        { L: OTTO, front: true, p: { ...base(t, 3, place("rival", ox, oy), false), walk: walking ? ph : undefined, facing: walking ? -0.55 : -0.2, lean: walking ? -5 : 0, expr: "angry",
          armL: { hand: walking ? [0.1 + 0.12 * Math.sin(ph * 6.28), 0.9] : [0.12, 0.95] }, armR: { hand: spot ? [0.2, -0.55] : walking ? [0.1 - 0.12 * Math.sin(ph * 6.28), 0.9] : [0.12, 0.95], k: spot ? "point" : "fist" }, look: [-0.7, -0.2] } },
        { L: ERNEST, front: true, p: { ...base(t, 5, place("rival", ex, ey), false), walk: t < tC + 0.12 ? ph + 0.5 : undefined, facing: -0.55, lean: t < tC + 0.12 ? -5 : 0, expr: "angry",
          armL: { hand: [0.1 - 0.12 * Math.sin(ph * 6.28), 0.9], k: "fist" }, armR: { hand: [0.1 + 0.12 * Math.sin(ph * 6.28), 0.9], k: "fist" }, look: [-0.7, -0.2] } },
      ];
    } });
}
// 18 BOSS: "Agloe is real. Check the records!" ledger slam
{
  const tR = T("l11", "real"), tC = T("l11", "Check");
  KICKS.push(tC);
  add({ a: S("l11") - 0.08, b: S("l12") - 0.12, still: "rival", blur: () => 9,
    cam: (t) => camTrack(t, [[0, on("rival", [0.85, 4.35, 1.3], 2.4)], [tC - 0.05, on("rival", [0.85, 4.35, 1.2], 2.6), 0.2]], 0.02),
    actors: (t) => [{ L: BOSS, p: { ...base(t, 7, atO("rival", RV.boss), true), mouth: mouthAt(t, "l11"), expr: t > E("l11") ? "grin" : step<Expr>(t, "smug", [[tR, "proud"]]),
      armR: { hand: trv(t, [-0.12, -0.18], [[tC - 0.25, [0.1, -0.45], 0.15], [tC - 0.05, [0.0, 0.8], 0.1]]), k: "open" }, armL: { hand: [-0.05, 0.86] }, lean: tr(t, 0, [[tC - 0.05, 8, 0.12]]), tilt: tr(t, 0, [[tR, -6], [tC, 5]]) } }],
    fx: ({ t, fx }, A) => { const b = A[0].p, hp = handPt(b, BOSS, 1, b.armR.hand); if (t > tC - 0.3) ledger(fx, hp[0] - 0.1 * b.D, hp[1] - 0.25 * b.D, 0.45 * b.D);
      if (t > tC) { const r = clamp01((t - tC) / 0.3); fx.save(); fx.globalAlpha = 1 - r; fx.strokeStyle = "#fff3b0"; fx.lineWidth = 9; for (let i = 0; i < 8; i++) { const a = Math.PI + i * Math.PI / 7; fx.beginPath(); fx.moveTo(hp[0] + Math.cos(a) * 0.5 * b.D, hp[1] + Math.sin(a) * 0.3 * b.D); fx.lineTo(hp[0] + Math.cos(a) * (0.6 + r * 0.5) * b.D, hp[1] + Math.sin(a) * (0.36 + r * 0.3) * b.D); fx.stroke(); } fx.restore(); } } });
}
// 19 "And the records were right. At that exact crossroads, a fishing lodge had renamed itself... Agloe Lodge."
{
  const t0 = S("l12") - 0.12, tEx = T("l12", "exact"), tF = T("l12", "fishing"), tAL = T("l12", "Agloe");
  add({ a: t0, b: S("l13") - 0.12, still: "cross_golden",
    cam: (t) => camTrack(t, [[t0, on("cross_golden", [0.15, 0.5, 1.1], 1.6)], [tF - 0.1, on("cross_golden", [-2.5, 12, 2.0], 1.25), 0.8], [tAL - 0.05, on("cross_golden", [-4.6, 17.4, 3.3], 1.75), 0.45]], 0.02),
    actors: (t) => t > tF + 0.5 ? [] : [
      { L: OTTO, p: { ...base(t, 3, atO("cross_golden", CR.otto), false), expr: t > tAL ? "shock" : "worried", look: [-0.6, -0.4], facing: -0.3, armL: { hand: [0.12, 0.95] }, armR: { hand: t > tEx ? [0.3, 0.3] : [0.12, 0.95] } } },
      { L: ERNEST, p: { ...base(t, 5, atO("cross_golden", CR.ern), false), expr: t > tAL ? "shock" : "worried", look: [-0.8, -0.4], facing: -0.4, armR: { hand: t > tF ? [0.4, -0.5] : [0.12, 0.95], k: t > tF ? "point" : "open" } } },
    ] });
}
// 20 "The fake town had become real, because of the trap built to catch fakes."
{
  const t0 = S("l13") - 0.12, tR = T("l13", "real"), tTr = T("l13", "trap");
  add({ a: t0, b: S("l14") - 0.12, still: "cross_golden", blur: () => 6,
    cam: (t) => camTrack(t, [[t0, on("cross_golden", [0.15, 0.5, 1.05], 2.1)]], 0.03),
    actors: (t) => [
      { L: OTTO, p: { ...base(t, 3, atO("cross_golden", CR.otto), false), expr: step<Expr>(t, "shock", [[tR, "worried"], [tTr, "neutral"]]), look: [0, 0],
        armR: { hand: trv(t, [0.12, 0.95], [[tTr - 0.05, [-0.18, -0.28], 0.2]]), k: "open" }, tilt: t > tTr ? 6 : 0, nod: t > tTr ? 0.03 : 0 } },
      { L: ERNEST, p: { ...base(t, 5, atO("cross_golden", CR.ern), false), expr: step<Expr>(t, "shock", [[tTr, "grin"]]), look: t > tTr ? [-0.8, 0] : [0, 0], armL: { hand: t > tTr ? [0.3, 0.3] : [0.12, 0.95] }, bob: t > tTr ? 8 * Math.abs(Math.sin((t - tTr) * 8)) : 0 } },
    ],
    fx: ({ t, fx }, A) => { const o = A[0].p, h = headPt(o, OTTO); if (t > tR && t < tTr) { fx.save(); fx.globalAlpha = 0.9; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; sparkle(fx, h[0] + Math.cos(a) * 0.55 * o.D, h[1] - 0.45 * o.D + Math.sin(a) * 0.15 * o.D, 0.12 * o.D, 1); } fx.restore(); } } });
}
// 21-22 "And the strangest part? The family who sold that land says it went for one dollar,"  /  "and they still suspect the buyer was secretly the rival map company."
{
  const t0 = S("l14") - 0.12, tFam = T("l14", "family"), tD = T("l14", "dollar"), tAnd = T("l14", "and", 1), tSus = T("l14", "suspect"), tB = T("l14", "buyer"), tRv = T("l14", "rival");
  const couple = (t: number): Actor[] => [
    { L: FARMER, p: { ...base(t, 15, atO("kitchen", KT.farm), true), expr: step<Expr>(t, "neutral", [[tD, "happy"], [tSus, "sneaky"]]), look: t > tB ? [0.9, 0] : [0, 0],
      armR: { hand: trv(t, [-0.1, 0.84], [[tD - 0.05, [0.2, -0.3], 0.18], [tAnd, [-0.1, 0.84]]]), k: "open" }, facing: t > tB ? 0.4 : 0.2 } },
    { L: WIFE, p: { ...base(t, 17, atO("kitchen", KT.wife), true), expr: step<Expr>(t, "neutral", [[tD, "happy"], [tSus, "sneaky"]]), look: t > tB ? [0.9, 0] : [0, 0], facing: t > tB ? 0.4 : -0.2 } },
  ];
  add({ a: t0, b: tAnd - 0.1, still: "kitchen",
    cam: (t) => camTrack(t, [[t0, on("kitchen", [0, 3.3, 1.2], 1.1)], [tFam - 0.05, on("kitchen", [0, 3.3, 1.2], 1.25), 0.6]], 0.025),
    actors: couple,
    fx: ({ t, fx }, A) => { if (t > tD - 0.05) { const f = A[0].p, hp = handPt(f, FARMER, 1, f.armR.hand); dollar(fx, hp[0] + 0.1 * f.D, hp[1] - 0.25 * f.D, 0.42 * f.D * backOut((t - tD + 0.05) / 0.25), -0.15 + 0.08 * Math.sin(t * 6)); } } });
  KICKS.push(tRv);
  add({ a: tAnd - 0.1, b: S("l15") - 0.12, still: "kitchen", blur: (t) => (t > tB ? 4 : 0),
    cam: (t) => camTrack(t, [[tAnd - 0.1, on("kitchen", [0, 3.3, 1.2], 1.25)], [tB - 0.05, on("kitchen", [0.75, 4.2, 1.4], 1.7), 0.5]], 0.03),
    actors: (t) => [...couple(t), { L: SHADOW, p: { ...base(t, 19, atO("kitchen", KT.buyer), false), armR: { hand: [-0.12, -0.18], k: "cigar" }, expr: "sneaky", look: [-0.8, 0.1], facing: -0.4 } }],
    fx: ({ t, fx }, A) => { const s = A[2].p, h = headPt(s, SHADOW); if (t > tRv) { fx.save(); fx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 12); fx.fillStyle = "#fff3b0"; for (const sx of [-1, 1]) { fx.beginPath(); fx.ellipse(h[0] + sx * 0.13 * s.D, h[1] - 0.02 * s.D, 0.05 * s.D, 0.035 * s.D, 0, 0, Math.PI * 2); fx.fill(); } fx.restore(); } } });
}
// 23 "Agloe stayed on maps for decades. It even showed up on Google Maps."
{
  const t0 = S("l15") - 0.12, tDec = T("l15", "decades"), tG = T("l15", "Google");
  add({ a: t0, b: S("l16") - 0.12, still: "office",
    cam: (t) => camTrack(t, [[t0, on("office", [0, 3.4, 1.3], 1.04)], [tG - 0.05, on("office", [0, 3.4, 1.2], 1.14), 0.4]], 0.02),
    actors: (t) => officePair(t, { expr: t > tG ? "shock" : "happy", armR: { hand: drawArm(t, t < tDec, [-0.12, 0.84], 15, 0.08), k: "pencil" }, look: t > tG ? [0.5, 0.4] : [0, 0.6] },
      { expr: t > tG ? "shock" : "happy", look: t > tG ? [-0.5, 0.4] : [0, 0.6], bob: t > tG ? 40 * tr(t, 0, [[tG, 0.3, 0.1], [tG + 0.25, 0, 0.3]]) : 0 }),
    fx: ({ t, fx }) => {
      // the years flip by on a calendar card, then a phone slides up with the pin
      fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0);
      if (t < tG) { const yr = Math.round(lerp(1930, 2010, clamp01((t - t0) / (tG - t0)))); card(fx, 720, 760, 420, 240, 0.04, () => { fx.fillStyle = INK; fx.font = '900 140px "Arial Black", Arial, sans-serif'; fx.textAlign = "center"; fx.textBaseline = "middle"; fx.fillText(String(yr), 0, 8); }); }
      else { const k = backOut((t - tG + 0.05) / 0.3); phone(fx, 720, 1250 + (1 - k) * 1600, 420, clamp01((t - tG - 0.25) / 0.25)); }
      fx.restore();
    } });
}
// 24 "And in twenty fourteen, the US government finally listed the town that never existed, as Agloe. Not official."
{
  const t0 = S("l16") - 0.12, tY = T("l16", "twenty"), tGov = T("l16", "government"), tL = T("l16", "listed"), tAg = T("l16", "Agloe"), tN = T("l16", "Not");
  KICKS.push(tN);
  add({ a: t0, b: AGLOEB_FRAMES / FPS + 1, still: "cross_dusk",
    cam: (t) => camTrack(t, [[t0, on("cross_dusk", [0.15, 0.5, 0.95], 2.0)], [tN + 0.7, on("cross_dusk", [-1, 6, 2.0], 1.2), 1.4]], 0.015),
    actors: (t) => [
      { L: OTTO, p: { ...base(t, 3, atO("cross_dusk", CR.otto), false), expr: step<Expr>(t, "neutral", [[tGov, "shock"], [tN, "grin"]]), look: [0.3, -0.5], armR: { hand: t > tN ? [0.4, -0.45] : [0.12, 0.95], k: t > tN ? "thumb" : "open" } } },
      { L: ERNEST, p: { ...base(t, 5, atO("cross_dusk", CR.ern), false), expr: step<Expr>(t, "neutral", [[tGov, "shock"], [tN, "happy"]]), look: [-0.3, -0.5], armL: { hand: t > tN ? [0.45, -0.1] : [0.12, 0.95] }, armR: { hand: t > tN ? [0.45, -0.1] : [0.12, 0.95] }, bob: t > tN ? 10 * Math.abs(Math.sin((t - tN) * 7)) : 0 } },
    ],
    fx: ({ t, fx }) => {
      fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0);
      if (t > tY - 0.05) { const k = backOut((t - tY + 0.05) / 0.3), x = 720, y = 560 + (1 - k) * 1700;
        fx.translate(x, y); fx.scale(0.8, 0.8); fx.translate(-x, -y);
        card(fx, x, y, 760, 520, -0.05, () => {
          fx.fillStyle = INK; fx.textAlign = "center"; fx.font = '900 46px "Arial Black", Arial, sans-serif'; fx.fillText("U.S. GEOLOGICAL SURVEY", 0, -170);
          fx.font = '700 34px Arial, sans-serif'; fx.fillText("Official place names - 2014", 0, -115);
          fx.fillStyle = "rgba(20,20,20,0.25)"; for (let i = 0; i < 3; i++) fx.fillRect(-300, -60 + i * 50, 600, 16);
          if (t > tAg - 0.05) { fx.fillStyle = INK; fx.font = '900 92px "Arial Black", Arial, sans-serif'; fx.fillText("AGLOE", 0, 75); }
          stamp(fx, "NOT OFFICIAL", 30, 175, 100, clamp01((t - tN + 0.05) / 0.2));
        }); }
      fx.restore();
      void tL;
    } });
}

// ---------------- captions ----------------
const CHUNKS = (() => {
  const all = LINES.flatMap((l) => l.w.map((w, i) => ({ w: w[0], s: w[1], e: i + 1 < l.w.length ? l.w[i + 1][1] : l.e })));
  const out: { txt: string; s: number; e: number }[] = []; let cur: typeof all = [];
  all.forEach((w, i) => { cur.push(w); const nx = all[i + 1]; if (cur.length >= 2 || /[.,!?]$/.test(w.w) || w.w.length > 7 || !nx) { out.push({ txt: cur.map((c) => c.w).join(" ").replace("nineteen-twenties", "1920s").replace("twenty fourteen", "2014"), s: cur[0].s, e: Math.min(cur[cur.length - 1].e + 0.25, nx ? nx.s : 99) }); cur = []; } });
  return out;
})();
const caption = (g: CanvasRenderingContext2D, t: number) => {
  const c = CHUNKS.find((x) => t >= x.s - 0.03 && t < x.e); if (!c) return;
  const pop = backOut((t - c.s + 0.03) / 0.12);
  g.save(); g.translate(720, 1840); g.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  g.font = '900 118px "Arial Black", "Helvetica Neue", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = 26; g.strokeStyle = "#0d0c10"; g.strokeText(c.txt, 0, 0); g.fillStyle = "#ffffff"; g.fillText(c.txt, 0, 0);
  g.restore();
};

// ---------------- composition ----------------
const LIFT: Record<string, string> = { cross_dusk: "brightness(1.35) saturate(1.05)", cross_golden: "brightness(1.12)" };
export const AgloeB: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const shot = SH.find((s) => t >= s.a && t < s.b) ?? SH[SH.length - 1];
  const c0 = shot.cam(t), kk = kick(t);
  const cz = Math.max(1, c0.z), cam = { z: cz, x: Math.min(W - W / (2 * cz), Math.max(W / (2 * cz), c0.x)), y: Math.min(H - H / (2 * cz), Math.max(H / (2 * cz), c0.y)) };
  const A = shot.actors(t);
  const st = STILLS[shot.still];
  const mid = useRef<HTMLCanvasElement>(null), front = useRef<HTMLCanvasElement>(null);
  const tx = (z: number) => `translate(${W / 2 - cam.x * z + kk}px, ${H / 2 - cam.y * z + kk * 0.6}px) scale(${z})`;
  const blur = shot.blur ? shot.blur(t) : 0;
  const popK = shot.pop ? shot.pop(t) : 0;
  const popBase = shot.still === "cross_day" ? proj("cross_day", [-4.8, 21, 0]) : [0, 0, 0];
  useLayoutEffect(() => {
    const gm = mid.current!.getContext("2d")!, gf = front.current!.getContext("2d")!;
    for (const g of [gm, gf]) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z + kk, H / 2 - cam.y * cam.z + kk * 0.6); }
    for (const a of A) if (!a.front) drawChar(gm, a.L, a.p, t, "body");
    for (const a of A) if (!a.front) drawChar(gf, a.L, a.p, t, "arms");
    for (const a of A) if (a.front) drawChar(gf, a.L, a.p, t, "all");
    if (shot.fx) {
      const worldFx = gf; // effects tied to characters live in camera space
      shot.fx({ t, fx: worldFx, under: gm }, A, cam);
      for (const a of A) if (!a.front && (a.p.armR.k === "open" || a.p.armL.k === "open")) { /* hands over held sheets */ }
    }
    // re-draw arms over any held sheets so hands grip the paper
    for (const a of A) if (!a.front) drawChar(gf, a.L, { ...a.p }, t, "arms");
    gf.setTransform(1, 0, 0, 1, 0, 0);
    caption(gf, t);
  });
  const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0" };
  const still = (name: string) => staticFile(`agloeB/${name}`);
  return (
    <AbsoluteFill style={{ background: "#101018", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: "scale(0.75)", transformOrigin: "0 0", overflow: "hidden" }}>
        <Img src={still(`${shot.still}_bg.jpg`)} style={{ ...layer, transform: tx(cam.z), filter: `${blur ? `blur(${blur}px) ` : ""}${LIFT[shot.still] ?? ""}` || undefined }} />
        {st.pop && <Img src={still(`${shot.still}_pop.png`)} style={{ ...layer, transform: `${tx(cam.z)} translate(${popBase[0]}px, ${popBase[1]}px) scale(${Math.max(0.001, popK)}) translate(${-popBase[0]}px, ${-popBase[1]}px)`, filter: blur ? `blur(${blur}px)` : undefined }} />}
        <canvas ref={mid} width={W} height={H} style={{ ...layer }} />
        {st.fg && <Img src={still(`${shot.still}_fg.png`)} style={{ ...layer, transform: tx(cam.z * 1.0) }} />}
        <canvas ref={front} width={W} height={H} style={{ ...layer }} />
        <div style={{ ...layer, background: "radial-gradient(ellipse at 50% 50%, rgba(10,8,20,0) 55%, rgba(10,8,20,0.28) 100%)" }} />
      </div>
      <Audio src={staticFile("agloeB/voice.wav")} />
    </AbsoluteFill>
  );
};
void steam; void (null as unknown as HandK);
