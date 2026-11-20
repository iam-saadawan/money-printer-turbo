// THE ARMY MADE OF AIR — who stands where in every shot (pure module: also used by the framing checker) + auto-aim camera.
import { Outfit, Expr, Prop, INK } from "./toon";
import { SHOTS, EV, FPS, V3, camAt, Cam, TANK0, FARM, FOREST, SPEAKER, TENT } from "./ghoststory";

export const FARMER_A: Outfit = { jacket: "#3f5fa8", pants: "#4a3a2a", boots: "#3a2a20", hat: "beret", cap: "#2a2f45", moustache: "#5a3b2a" };
export const FARMER_B: Outfit = { jacket: "#8a9a3a", pants: "#5a4a3a", boots: "#3a2a20", hat: "beret", cap: "#7a2a2a", build: "stout" };
export const GI: Outfit = { jacket: "#6b6a3e", pants: "#5a5638", boots: "#4a3a2a", hat: "helmetUS", cap: "#55593a", buttons: "#3a3a2a", belt: "#b8a878" };
export const ARTIST: Outfit = { ...GI, hat: "hair", hair: "#5a3b2a", glasses: true, belt: null };
export const RADIO: Outfit = { ...GI, hat: "hair", hair: "#2a2420", headset: true, belt: null };
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

export type Who = { o: Outfit; seed: number; key: string };
const W_FA: Who = { o: FARMER_A, seed: 3, key: "farmA" }, W_FB: Who = { o: FARMER_B, seed: 5, key: "farmB" };
const W_GI = [0, 1, 2, 3, 4, 5].map((i): Who => ({ o: GI, seed: 1 + i, key: "gi" + i }));
const W_ART: Who = { o: ARTIST, seed: 7, key: "artist" }, W_RAD: Who = { o: RADIO, seed: 4, key: "radio" };
export type Pose = { who: Who; at: V3; mode?: "stand" | "march" | "stroll" | "sit"; expr?: Expr; prop?: Prop; look?: number; headTilt?: number; tilt?: number;
  side?: { dir: 1 | -1; phase: number; mode: "march" | "stand" }; scale?: number; bike?: boolean };

const [TX, , TZ] = TANK0;
/** the four lifters stand in a row under the tank's long side (meadow) */
export const LIFTERS: V3[] = [[TX - 1.95, 0, TZ + 1.55], [TX - 0.65, 0, TZ + 1.75], [TX + 0.65, 0, TZ + 1.75], [TX + 1.95, 0, TZ + 1.55]];

export const stage = (id: number, f: number): Pose[] => {
  const P: Pose[] = [];
  const lifters = (expr: (i: number) => Expr, lifting: boolean, wave = false) => LIFTERS.forEach((at, i) =>
    P.push({ who: W_GI[i], at, mode: "stand", expr: expr(i), prop: lifting ? ["hold", "lift", 0] : wave ? ["hold", "wave", (f / 20 + i * 0.25) % 1] : null, look: i < 2 ? 0.3 : -0.3 }));
  const farmers = (at: V3, expr: Expr, bike = true) => {
    P.push({ who: W_FA, at, mode: "stand", expr, look: 0.6, bike });
    P.push({ who: W_FB, at: [at[0] + 1.3, 0, at[2] + 0.35], mode: "stand", expr, look: 0.6, bike });
  };
  switch (id) {
    case 1: farmers(FARM, "shock"); lifters(() => "stern", f >= EV.lift0 - 8); break;
    case 2: lifters(() => (f < EV.lift1 ? "pained" : "stern"), true); break;
    case 3: farmers(FARM, "shock", false); break;
    case 5: {
      const u = Math.min(1, (f - SHOTS[4].a) / (SHOTS[4].b - SHOTS[4].a));
      const at: V3 = [4.5 + u * 6.5, 0, 22.5 - u * 5.5];
      if (u < 0.92) { P.push({ who: W_FA, at, side: { dir: 1, phase: (f / FPS) % 1, mode: "march" }, bike: true }); P.push({ who: W_FB, at: [at[0] + 1.3, 0, at[2] + 0.35], side: { dir: 1, phase: ((f / FPS) + 0.5) % 1, mode: "march" }, bike: true }); }
      else farmers(at, "nervous");
      lifters(() => (f >= EV.freeze ? "shock" : "stern"), true);
      break;
    }
    case 6: lifters((i) => (i === 1 && f >= EV.smile ? "grin" : "nervous"), true); break;
    case 8: for (let i = 0; i < 4; i++) { const t = f - SHOTS[7].a; P.push({ who: W_GI[i], at: [-28 + i * 9 + t * 0.03 * (i % 2 ? 1 : -1), 0, -15.8 - (i % 2) * 0.6], side: { dir: i % 2 ? 1 : -1, phase: (t / FPS + i * 0.3) % 1, mode: "march" } }); } break;
    case 13: P.push({ who: W_GI[0], at: [FOREST[0] + 1.2, 0, FOREST[2] + 2.4], mode: "stand", prop: ["hold", "point", 0], expr: f < EV.wobble + 4 ? "stern" : "grin", look: -0.5 }); break;
    case 14: P.push({ who: W_GI[1], at: [FOREST[0] - 1.2, 0, FOREST[2] + 2.0], mode: "stand", prop: ["hold", "fist", 0], expr: f < EV.carry ? "stern" : "grin", look: 0.4 }); break;
    case 15: for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6; P.push({ who: W_GI[i], at: [FOREST[0] + Math.cos(a) * 3.6, 0, FOREST[2] + Math.sin(a) * 2.4 + 0.4], mode: "stand", prop: ["hold", "pump", 0.5 + 0.5 * Math.sin((f + i * 7) * 0.45)], expr: "stern", look: -Math.cos(a) * 0.6 }); } break;
    case 16: P.push({ who: W_GI[2], at: [SPEAKER[0] + 2.2, 0, SPEAKER[2] + 1.6], mode: "stand", expr: "grin", look: -0.4 }); break;
    case 17: P.push({ who: W_RAD, at: [TENT[0], 0, TENT[2] - 1.0], mode: "stand", prop: ["hold", "point", 0], expr: Math.floor(f / 40) % 2 ? "grin" : "smile", look: 0.4 }); break;
    case 19: P.push({ who: W_GI[3], at: [TX - 1.4, 0, TZ + 2.0], mode: "stand", expr: f < EV.droop0 + 10 ? "neutral" : "nervous", look: 0.6 }); break;
    case 23: P.push({ who: W_ART, at: [TENT[0] + 0.35, 0, TENT[2] - 1.15], mode: "stand", prop: f < EV.sketch ? ["hold", "rod", (f / 18) % 1] : null, expr: f < EV.stamp ? "smile" : "grin", look: -0.3 }); break;
    case 24: lifters(() => "laugh", false, true); P.push({ who: W_ART, at: [TX + 3.2, 0, TZ + 1.9], mode: "stand", prop: ["hold", "book", 0], expr: "grin" }); break;
  }
  return P;
};

/** keyed camera + auto-aim (aim >= 0: that pose; -1: everyone; -2: the first two) */
export const camFinal = (id: number, f: number): Cam => {
  const c = camAt(id, f);
  if (c.aim === undefined) return c;
  const P = stage(id, f);
  if (!P.length) return c;
  const pick = c.aim === -1 ? P : c.aim === -2 ? P.slice(0, 2) : P[c.aim] ? [P[c.aim]] : P;
  const ax = pick.reduce((a, p) => a + p.at[0], 0) / pick.length, az = pick.reduce((a, p) => a + p.at[2], 0) / pick.length;
  const dx0 = c.look[0] - c.pos[0], dz0 = c.look[2] - c.pos[2], d0 = Math.hypot(dx0, dz0) || 1;
  const dx1 = ax - c.pos[0], dz1 = az - c.pos[2], d1 = Math.hypot(dx1, dz1) || 1;
  const kk = 0.9, ux = (dx0 / d0) * (1 - kk) + (dx1 / d1) * kk, uz = (dz0 / d0) * (1 - kk) + (dz1 / d1) * kk, n = Math.hypot(ux, uz) || 1;
  return { ...c, look: [c.pos[0] + (ux / n) * d0, c.look[1], c.pos[2] + (uz / n) * d0] };
};
void INK; void SPEAKER;
