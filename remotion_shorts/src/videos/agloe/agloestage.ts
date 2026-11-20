// THE FAKE TOWN THAT BECAME REAL — who stands where in every shot (pure: no three.js), plus the final camera with
// auto-aim. Positions are set-relative (O()). Talkers flap their mouths on their own voice words.
import { Outfit, Expr, Prop } from "./toon";
import { SHOTS, EV, FPS, V3, O, S, camAt, Cam, OTTO, ERNEST, BOSS, CLERK } from "./agloestory";
import { LINES } from "./timing";

export const OTTO_O: Outfit = { jacket: "#7a5236", pants: "#3a3a46", boots: "#2a2018", hat: "hair", hair: "#d4d0c8", moustache: "#e0dcd4", glasses: true, buttons: "#e8c45a", build: "stout" };
export const ERNEST_O: Outfit = { jacket: "#f3efe4", pants: "#4a5a7a", boots: "#3a2a20", hat: "cap", cap: "#4f6f92", buttons: "#9aa4b8" };
export const BOSS_O: Outfit = { jacket: "#3b3550", pants: "#2a2a36", boots: "#1e1a1a", hat: "bowler", moustache: "#3a2a20", buttons: "#d9b45a", build: "stout" };
export const CLERK_O: Outfit = { jacket: "#7d8f6a", pants: "#3a3a3a", boots: "#2a2020", hat: "hair", hair: "#3a2a1a", glasses: true };
export const KID_A: Outfit = { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", build: "kid" };
export const KID_B: Outfit = { jacket: "#3f8a5a", pants: "#5a4a3a", boots: "#2a2a2a", hat: "cap", cap: "#f0c040", build: "kid" };
export const FARMER_O: Outfit = { jacket: "#4f7a9a", pants: "#3b4a6a", boots: "#3a2a20", hat: "hair", hair: "#bdbdbd", build: "stout", buttons: "#d8c070" };
export const WIFE_O: Outfit = { jacket: "#b8556f", pants: "#3a3a44", boots: "#3a2a20", hat: "hair", hair: "#e0e0e0", dress: "#b8556f" };
export const FISH_A: Outfit = { jacket: "#c0603a", pants: "#4a4a3a", boots: "#2a2a20", hat: "fedora", cap: "#6a5a3a", moustache: "#5a3b2a" };
export const FISH_B: Outfit = { jacket: "#3a6a8a", pants: "#5a4a3a", boots: "#2a2a20", hat: "cap", cap: "#c0353a" };

export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export type Who = { o: Outfit; seed: number; key: string };
const W = (o: Outfit, seed: number, key: string): Who => ({ o, seed, key });
const W_OTTO = W(OTTO_O, 3, "otto"), W_ERN = W(ERNEST_O, 5, "ernest"), W_BOSS = W(BOSS_O, 7, "boss"), W_CLERK = W(CLERK_O, 9, "clerk");
const W_KA = W(KID_A, 11, "kidA"), W_KB = W(KID_B, 13, "kidB"), W_FARM = W(FARMER_O, 15, "farmer"), W_WIFE = W(WIFE_O, 17, "wife");
const W_FA = W(FISH_A, 19, "fishA"), W_FB = W(FISH_B, 21, "fishB");

export type Pose = { who: Who; at: V3; mode?: "stand" | "march" | "stroll" | "sit"; expr?: Expr; prop?: Prop; look?: number; headTilt?: number; tilt?: number;
  side?: { dir: 1 | -1; phase: number; mode: "march" | "stand" }; scale?: number; shadowOff?: boolean };

/** mouth flaps on the speaker's words: open for ~3 f at the start of every syllable-ish beat */
const talkOpen = (f: number, id: string) => {
  const l = LINES.find((x) => x.id === id)!;
  const t = f / FPS;
  if (t < l.s || t > l.e) return false;
  return Math.floor((f - Math.round(l.s * FPS)) / 3) % 2 === 0;
};
/** a small idle head sway (micro animation): +-3 deg over ~2.5 s, different per person */
const sway = (f: number, seed: number, a = 3) => a * Math.sin(f / (11 + seed % 5) + seed);

export const stage = (id: number, f: number): Pose[] => {
  const P: Pose[] = [];
  const add = (who: Who, set: Parameters<typeof O>[0], at: V3, o: Partial<Pose> = {}) => P.push({ who, at: O(set, at), mode: "stand", headTilt: sway(f, who.seed), ...o });
  switch (id) {
    case 3: // office: both at their drafting tables, inking
      add(W_OTTO, "office", OTTO, { expr: f < EV.otto ? "neutral" : "smile_closed", prop: ["hold", "pencil", 0], look: f < EV.otto ? -0.4 : 0.3 });
      add(W_ERN, "office", ERNEST, { expr: f < EV.ernest ? "neutral" : "smile", prop: ["hold", "pencil", 0], look: f < EV.ernest ? 0.5 : -0.3 });
      break;
    case 5: // rival office: the clerk traces, the boss smokes
      add(W_CLERK, "rival", CLERK, { expr: f < EV.swear ? "smile_closed" : "nervous", prop: ["hold", "pencil", 0], look: -0.5, headTilt: 6 + sway(f, 9, 2) });
      add(W_BOSS, "rival", BOSS, { expr: f < EV.swear ? "grin" : "smile_closed", prop: ["hold", "cigar", 0], look: f < EV.swear ? -0.4 : 0.1 });
      break;
    case 6: { // boss CU: "We drew it ourselves!"
      const open = talkOpen(f, "l04");
      add(W_BOSS, "rival", BOSS, { expr: f >= EV.ours ? (open ? "laugh" : "grin") : open ? "relief_open" : "smile", prop: f >= EV.ours ? ["hold", "point", 0] : ["hold", "cigar", 0], look: 0, headTilt: f >= EV.ours ? -6 : sway(f, 7) });
      break;
    }
    case 11: { // classroom: kid A does the homework, kid B copies, then gets caught
      add(W_KA, "class", [-0.46, 0, -0.95], { expr: f < EV.copied ? "neutral" : "stern", prop: ["hold", "pencil", 0], look: f < EV.copied ? 0.2 : 0.8 });
      add(W_KB, "class", [0.46, 0, -0.95], { expr: f < EV.friend ? "smile_closed" : f < EV.copied ? "grin" : "shock", prop: ["hold", "pencil", 0], look: f < EV.friend ? 0 : -0.85, headTilt: f >= EV.friend && f < EV.copied ? -9 : sway(f, 13) });
      break;
    }
    case 13: // "Gotcha!"
      add(W_OTTO, "office", [-0.95, 0, -0.7], { expr: f < EV.gotcha ? "stern" : "laugh", prop: f < EV.gotcha ? ["hold", "map", 0] : ["hold", "point", 0], look: 0, headTilt: f < EV.gotcha ? 0 : -7 });
      add(W_ERN, "office", [-1.95, 0, -0.95], { expr: f < EV.gotcha ? "neutral" : "grin", prop: ["hold", "fist", 0], look: 0.6 });
      break;
    case 14: { // they march over (side view) into the rival office; the boss waits, smug
      const t = f - SHOTS[13].a, x = Math.max(-0.9, 2.9 - t * 0.068);
      P.push({ who: W_OTTO, at: O("rival", [x, 0, -0.55]), side: { dir: -1, phase: (t / FPS) % 1, mode: x > -0.9 ? "march" : "stand" } });
      P.push({ who: W_ERN, at: O("rival", [x + 0.95, 0, -0.3]), side: { dir: -1, phase: ((t / FPS) + 0.5) % 1, mode: x > -0.9 ? "march" : "stand" } });
      add(W_BOSS, "rival", BOSS, { expr: f < EV.red ? "smile_closed" : "grin", prop: ["hold", "cigar", 0], look: 0.6 });
      break;
    }
    case 15: { // "Agloe is real. Check the records!" — the ledger slams on the desk
      const open = talkOpen(f, "l11");
      add(W_BOSS, "rival", BOSS, { expr: open ? "relief_open" : "grin", prop: f < EV.check ? ["hold", "ledger", 0] : ["hold", "point", 0], look: -0.5, headTilt: f >= EV.check ? 5 : sway(f, 7) });
      add(W_OTTO, "rival", [-0.55, 0, -1.25], { expr: f < EV.real2 ? "stern" : "shock", look: 0.7 });
      add(W_ERN, "rival", [-1.45, 0, -0.95], { expr: f < EV.real2 ? "neutral" : "shock", look: 0.7 });
      break;
    }
    case 16: // the fishing lodge: fishermen on the porch and the dock
      add(W_FA, "cross", [-6.9, 0, -4.7], { expr: "smile", prop: ["hold", "rod", (f / 26) % 1], look: 0.4 });
      add(W_FB, "cross", [-10.3, 0, -4.9], { expr: f < EV.sign ? "neutral" : "grin", prop: f < EV.sign ? null : ["hold", "fist", 0], look: 0.6 });
      break;
    case 17: // the two stand at the crossroads, stunned
      add(W_OTTO, "cross", [0.15, 0, 0.55], { expr: f < EV.trapB ? "shock" : "dazed", look: -0.5, headTilt: f < EV.trapB ? sway(f, 3) : 8 });
      add(W_ERN, "cross", [1.25, 0, 0.9], { expr: f < EV.became ? "nervous" : "shock", look: -0.7 });
      break;
    case 18: // kitchen: the old couple behind the table; the buyer is a silhouette card (world)
      add(W_FARM, "kitchen", [-0.75, 0, -0.95], { expr: f < EV.dollar ? "neutral" : f < EV.suspect ? "shock" : "stern", look: f < EV.buyer ? 0.3 : 0.9 });
      add(W_WIFE, "kitchen", [-1.35, 0, -1.2], { expr: f < EV.suspect ? "smile_closed" : "nervous", look: f < EV.buyer ? 0.3 : 0.9 });
      break;
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
  const dx0 = c.look[0] - c.pos[0], dz0 = c.look[2] - c.pos[2], d0 = Math.hypot(dx0, dz0) || 1;
  const dx1 = ax - c.pos[0], dz1 = az - c.pos[2], d1 = Math.hypot(dx1, dz1) || 1;
  const k = 0.85, ux = dx0 / d0 * (1 - k) + dx1 / d1 * k, uz = dz0 / d0 * (1 - k) + dz1 / d1 * k, n = Math.hypot(ux, uz) || 1;
  return { ...c, look: [c.pos[0] + ux / n * d0, c.look[1], c.pos[2] + uz / n * d0] };
};
void S; void ERNEST; void CLERK;
