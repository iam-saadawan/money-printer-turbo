// THE GOLD IN THE JAR — who stands where in every shot (pure: no three.js / remotion, so the framing checker can use it),
// plus the final camera: goldstory's keyed camera with auto-aim (keys with `aim` pan to keep that person centred).
import { townsfolk, Outfit, Expr, Prop, INK } from "./toon";
import { SHOTS, EV, FPS, V3, camAt, Cam } from "./goldstory";

export const GEORGE: Outfit = { jacket: "#f3f1ea", pants: "#3a3f4a", boots: "#3a2a20", hat: "hair", hair: "#2a2420", glasses: true, buttons: "#c9ccd2" };
export const COLLEAGUE: Outfit = { jacket: "#8a5a3c", pants: "#4a4038", boots: "#3a2a20", hat: "hair", hair: "#a8a8a8", moustache: "#8a8a8a", build: "stout" };
export const SOLDIER: Outfit = { jacket: "#5f6650", pants: "#4c5244", boots: INK, hat: "helmet", cap: "#4f5545", belt: "#2a2a24", buttons: "#9aa090", rifle: true };
export const OFFICER: Outfit = { ...SOLDIER, rifle: false, buttons: "#d8c070" };
export const SMITH: Outfit = { jacket: "#4a5a7a", pants: "#3a3a44", boots: "#2a2420", hat: "cap", cap: "#2f3a52", moustache: "#5a3b2a", build: "stout" };
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

export type Who = { o: Outfit; seed: number; key: string };
const W_GEORGE: Who = { o: GEORGE, seed: 3, key: "george" }, W_COL: Who = { o: COLLEAGUE, seed: 5, key: "col" };
const W_SOL = [0, 1, 2].map((i): Who => ({ o: SOLDIER, seed: 2 + i, key: "sol" + i })), W_OFF: Who = { o: OFFICER, seed: 6, key: "off" };
const W_SMITH: Who = { o: SMITH, seed: 7, key: "smith" };
export type Pose = { who: Who; at: V3; mode?: "stand" | "march" | "stroll" | "sit"; expr?: Expr; prop?: Prop; look?: number; headTilt?: number; tilt?: number;
  side?: { dir: 1 | -1; phase: number; mode: "march" | "stand" }; scale?: number; shadowOff?: boolean };

export const stage = (id: number, f: number): Pose[] => {
  const P: Pose[] = [];
  const G = (at: V3, o: Partial<Pose> = {}) => P.push({ who: W_GEORGE, at, mode: "stand", ...o });
  switch (id) {
    case 1: G([1.25, 0, -0.95], { prop: f < EV.drop1 ? ["hold", "medal", 0] : null, expr: f < EV.drop1 ? "stern" : "smile", look: f < EV.drop1 ? 0.5 : 0 }); break;
    case 2: G([-3.75, 0, -1.25], { expr: "grin", look: -0.7, headTilt: -5 }); break;
    case 3: for (let i = 0; i < 6; i++) P.push({ who: { o: FOLK[i], seed: 1 + i, key: "folk" + i }, at: [-6 + i * 3.1 + hh(i) * 1.2, 0, 5.2 + hh(i, 2) * 0.7], mode: "stand", expr: i % 2 ? "nervous" : "shock", look: 0.6 });
      for (let i = 0; i < 4; i++) P.push({ who: { o: FOLK[(i + 3) % 6], seed: 9 + i, key: "folkB" + i }, at: [-2 + i * 4.5, 0, 16.6 + hh(i, 5) * 0.6], mode: "stand", expr: "nervous", look: -0.4 }); break;
    case 4: G([1.2, 0, -1.0], { prop: ["hold", "medals", 0], expr: f < Math.round(13.15 * FPS) ? "neutral" : "nervous", look: f < Math.round(13.15 * FPS) ? 0 : -0.8 }); break;
    case 6: {
      const t = f - SHOTS[5].a;
      for (let i = 0; i < 3; i++) { const x = -6 + t * 0.06 + i * 1.5; P.push({ who: W_SOL[i], at: [x, 0, 9.6 - i * 0.05], side: { dir: 1, phase: (t / FPS) % 1, mode: "march" } }); }
      P.push({ who: W_OFF, at: [1.4, 0, 7.6], mode: "stand", expr: "stern", headTilt: f > EV.peek - 30 ? -8 : 0, look: f > EV.peek - 30 ? -0.4 : 0.5 });
      P.push({ who: W_GEORGE, at: [0.35, 0, 3.45], mode: "stand", expr: f >= EV.peek ? "shock" : "nervous", look: 0.3 });
      break;
    }
    case 7:
      P.push({ who: W_COL, at: [-1.25, 0, -0.75], mode: "stand", prop: ["hold", "shovel", 0], expr: "stern", look: 0.6 });
      G([1.3, 0, -0.85], { expr: f < EV.whip ? "neutral" : "stern", look: f < EV.whip ? -0.7 : 0, headTilt: f < EV.whip ? 0 : 4 }); break;
    case 8: G([1.25, 0, -0.95], {
      prop: f < EV.fumes + 20 ? ["hold", "bottles", 0] : f < EV.drop2 - 10 ? ["hold", "nose", 0] : f < EV.drop2 ? ["hold", "medals", 0] : null,
      expr: f < EV.fumes ? "neutral" : f < EV.drop2 - 10 ? "pained" : "stern", look: f < EV.fumes ? 0.4 : 0 }); break;
    case 9: G([1.25, 0, -0.95], { prop: ["hold", "rod", (f / 22) % 1], expr: f > EV.rumble ? "nervous" : "dazed", look: f > EV.rumble ? 0.7 : 0.2 }); break;
    case 10:
      G([1.25, 0, -0.95], { prop: f < EV.smell ? null : ["hold", "nose", 0], expr: f < EV.smell ? "relief" : "pained" });
      if (f >= EV.smell - 6) P.push({ who: W_COL, at: [3.4 - Math.min(1, (f - EV.smell + 6) / 30) * 0.5, 0, 1.0], mode: "stand", prop: ["hold", "nose", 0], expr: "pained" });
      break;
    case 11:
      G([-0.6, 0, -2.4], { expr: f < EV.kick ? "neutral" : "shock", look: 0.8 });
      if (f >= EV.kick) { P.push({ who: W_SOL[0], at: [4.35, 0, 1.6], mode: "stand", expr: "stern" }); P.push({ who: W_SOL[1], at: [5.6, 0, 2.0], mode: "stand", expr: "stern" }); }
      break;
    case 12:
      G([-0.6, 0, -2.4], { expr: "nervous", look: 0.7 });
      P.push({ who: W_SOL[0], at: [3.3, 0, -2.9], mode: "stand", expr: "stern", look: -0.5 });
      P.push({ who: W_SOL[1], at: [4.3, 0, 0.3], mode: "stand", prop: ["hold", "fist", 0], expr: "stern", look: 0.7 });
      break;
    case 13: {
      if (f < EV.walk) P.push({ who: W_SOL[2], at: [-4.05, 0, 1.4], mode: "stand", expr: "stern", look: -0.2, headTilt: -6 });
      else { const t = f - EV.walk; P.push({ who: W_SOL[2], at: [-4.05 + t * 0.05, 0, 1.4 + t * 0.01], side: { dir: 1, phase: (t / FPS) % 1, mode: "march" } }); }
      break;
    }
    case 17: {
      const t = f - EV.enter + 30;
      if (t < 0) break;
      if (t < 64) P.push({ who: W_GEORGE, at: [6.0 - t * 0.05, 0, 1.6 - t * 0.009], side: { dir: -1, phase: (t / FPS) % 1, mode: "march" } });
      else G([2.84, 0, 1.02], { expr: f > Math.round(66.4 * FPS) ? "grin" : "neutral", look: -0.8 });
      break;
    }
    case 18: G([1.25, 0, -0.95], { prop: f < EV.pour3 + 30 ? ["hold", "bottle", 0] : null, expr: f < EV.sand0 ? "stern" : "grin", look: 0.3 }); break;
    case 19: G([1.95, 0, -0.95], { prop: ["hold", "rod", 0], expr: "smile" }); break;
    case 20: G([1.25, 0, -0.95], { prop: ["hold", "parcel", 0], expr: f < EV.sweden ? "smile_closed" : "grin" }); break;
    case 21: P.push({ who: W_SMITH, at: [80 - 0.05, 0, -300 - 0.75], mode: "stand", expr: f < EV.mould ? "stern" : "grin", look: 0.6 }); break;
    case 22: G([0.85, 0, -1.4], { expr: "laugh" }); P.push({ who: W_COL, at: [1.85, 0, -1.45], mode: "stand", expr: "grin" }); break;
  }
  return P;
};

/** the final camera: keyed camera + auto-aim (pan so the aimed person / group centre sits mid-frame) */
export const camFinal = (id: number, f: number): Cam => {
  const c = camAt(id, f);
  if (c.aim === undefined) return c;
  const P = stage(id, f);
  if (!P.length) return c;
  const pick = c.aim < 0 ? P : P[c.aim] ? [P[c.aim]] : P;
  const ax = pick.reduce((a, p) => a + p.at[0], 0) / pick.length, az = pick.reduce((a, p) => a + p.at[2], 0) / pick.length;
  // keep the look distance, swing its direction toward the subject (horizontal pan only; height stays as keyed)
  const dx0 = c.look[0] - c.pos[0], dz0 = c.look[2] - c.pos[2], d0 = Math.hypot(dx0, dz0) || 1;
  const dx1 = ax - c.pos[0], dz1 = az - c.pos[2], d1 = Math.hypot(dx1, dz1) || 1;
  const k = 0.92, ux = dx0 / d0 * (1 - k) + dx1 / d1 * k, uz = dz0 / d0 * (1 - k) + dz1 / d1 * k, n = Math.hypot(ux, uz) || 1;
  return { ...c, look: [c.pos[0] + ux / n * d0, c.look[1], c.pos[2] + uz / n * d0] };
};
