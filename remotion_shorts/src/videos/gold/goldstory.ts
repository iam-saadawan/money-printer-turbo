// THE GOLD IN THE JAR — story timeline (30 fps). Every beat lands 0-3 f before its word (voice/words.json).
// Camera grammar from the skill: hard cuts on big jumps, smootherstep glides 18-40 f between keys, every hold creeps
// (0.15-0.35 %/f, more on punch words), 4-5 deg rolls, flip kicks decaying over 7 f on impacts, DOF on CU/MS beats.
export const FPS = 30;
export const TOTAL = 2415;
export type V3 = [number, number, number];
export type LightName = "day" | "golden" | "night" | "interior" | "warm";
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const T = (s: number) => Math.round(s * FPS);

// ---------------- set coordinates ----------------
// LAB interior: floor y=0, x -5..5, z -4..4; front wall z=4 has the big window onto the street (z > 4).
export const BENCH = { x0: -0.2, x1: 2.6, z0: -0.55, z1: 0.45, h: 0.95 };
export const JAR_BENCH: V3 = [1.25, BENCH.h, -0.05];
export const SHELF_X = -4.62, JAR_SHELF: V3 = [SHELF_X + 0.05, 1.42, -1.0];
export const DOOR: V3 = [4.98, 0, 1.6];          // right wall door (hinge at z = 1.0)
export const SEE: V3 = [0, 0, -300];             // explanation stage (night-blue void)
export const FORGE: V3 = [80, 0, -300];          // Stockholm mint: crucible + medal mould

// ---------------- shots ----------------
export type Set = "lab" | "street" | "see" | "forge";
export type ShotDef = { id: number; a: number; b: number; light: LightName; set: Set; time?: "day" | "afternoon" | "evening" | "morning" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(3.6), light: "interior", set: "lab" },             // hook: medal into the jar
  { id: 2, a: T(3.6), b: T(5.0), light: "interior", set: "lab" },        // jar on the shelf
  { id: 3, a: T(5.0), b: T(9.3), light: "day", set: "street" },          // 1940 Copenhagen, tanks
  { id: 4, a: T(9.3), b: T(13.9), light: "interior", set: "lab" },       // through the window: George + medals
  { id: 5, a: T(13.9), b: T(19.4), light: "interior", set: "lab" },      // medals CU, engraved names
  { id: 6, a: T(19.4), b: T(24.8), light: "day", set: "street" },        // soldiers outside, look up
  { id: 7, a: T(24.8), b: T(28.2), light: "interior", set: "lab" },      // bury them / soldiers love digging
  { id: 8, a: T(28.2), b: T(33.45), light: "interior", set: "lab" },     // acid, fumes, medals in
  { id: 9, a: T(33.45), b: T(39.15), light: "warm", set: "lab", time: "afternoon" }, // stirring, tank past the window
  { id: 10, a: T(39.15), b: T(43.35), light: "warm", set: "lab", time: "evening" },  // gone / smells
  { id: 11, a: T(43.35), b: T(45.35), light: "interior", set: "lab", time: "morning" },     // door kicked in
  { id: 12, a: T(45.35), b: T(47.45), light: "interior", set: "lab", time: "morning" },     // search
  { id: 13, a: T(47.45), b: T(50.35), light: "interior", set: "lab", time: "morning" },     // stares at the jar, walks past
  { id: 14, a: T(50.35), b: T(54.05), light: "night", set: "see" },      // gold won't rust / burn / dissolve
  { id: 15, a: T(54.05), b: T(58.55), light: "night", set: "see" },      // two acids, alone nothing
  { id: 16, a: T(58.55), b: T(63.75), light: "night", set: "see" },      // together: atom by atom, orange
  { id: 17, a: T(63.75), b: T(67.95), light: "interior", set: "lab", time: "morning" },     // war ends, George returns
  { id: 18, a: T(67.6), b: T(71.75), light: "interior", set: "lab", time: "morning" },     // one more chemical: gold falls like sand
  { id: 19, a: T(71.75), b: T(73.0), light: "interior", set: "lab", time: "morning" },     // filters it: gold powder in the dish
  { id: 20, a: T(73.0), b: T(74.5), light: "interior", set: "lab", time: "morning" },      // parcel for Stockholm
  { id: 21, a: T(74.5), b: T(76.3), light: "golden", set: "forge" },                        // Stockholm: melted, poured into the mould
  { id: 22, a: T(76.3), b: TOTAL, light: "warm", set: "lab", time: "evening" },          // recast medals
];
export const XFADE: Record<number, number> = { 11: 8, 14: 10, 17: 10, 21: 8, 22: 8 };
export const FLASH_AT = T(5.0);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  const s = shotAt(f), xf = XFADE[s.id];
  if (xf && f < s.a + xf && s.id > 1) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - s.a + 1) / (xf + 1) }];
  return [{ id: s.id, alpha: 1 }];
};

// ---------------- story events (frames) ----------------
export const EV = {
  drop1: T(2.55), tankA: T(5.2), peek: T(23.0), whip: T(26.35), pour0: T(28.4), fumes: T(29.9), nose: T(31.0), drop2: T(32.3),
  rumble: T(37.85), gone: T(40.55), smell: T(41.3), kick: T(44.25), stare: T(47.9), walk: T(49.45),
  rust: T(51.15), burn: T(51.75), diss: T(52.5), acidA: T(54.5), acidB: T(55.6), alone1: T(56.6), alone2: T(57.65),
  mix: T(59.1), atoms: T(60.3), orange: T(61.7), enter: T(64.6), dusty: T(66.3), pour3: T(68.5), sand0: T(69.35), sand1: T(71.3),
  dish: T(72.1), parcel: T(73.05), sweden: T(73.95), melt: T(75.3), mould: T(76.0), shine: T(76.4), lump: T(72.1),
};
/** dissolve progress of the medals in the bench jar: 0 whole .. 1 gone */
export const dissolveAt = (f: number) => (f < EV.drop2 ? 0 : f < SHOTS[8].a ? 0 : f >= SHOTS[9].a + 30 ? 1 : smooth((f - SHOTS[8].a) / (SHOTS[9].a + 30 - SHOTS[8].a)) );
/** liquid colour 0 pale green-clear .. 1 deep orange */
export const orangeAt = (f: number) => (f < EV.drop2 ? 0.25 : f >= EV.sand0 ? 1 - 0.8 * smooth((f - EV.sand0) / (EV.sand1 - EV.sand0)) : Math.min(1, 0.25 + 0.75 * smooth((f - EV.drop2) / (SHOTS[9].a + 40 - EV.drop2))));

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number; aim?: number };
export type Key = { f: number; dur?: number; pos: V3; look: V3; fov?: number; roll?: number; creep?: number; aim?: number };
const k = (f: number, pos: V3, look: V3, o: Partial<Key> = {}): Key => ({ f, pos, look, ...o });
const R = (d: number) => (d * Math.PI) / 180;
export const CAMS: Record<number, Key[]> = {
  1: [k(0, [1.55, 1.62, 2.6], [1.15, 1.35, -0.6], { fov: 38, roll: R(-3), creep: 0.0025, aim: 0 }),
      k(T(2.2), [1.7, 1.33, 0.95], [1.3, 1.42, -0.95], { dur: 26, fov: 48, roll: R(2), creep: 0.002 })],
  2: [k(T(3.6), [-2.75, 1.62, 2.1], [-4.0, 1.45, -1.15], { fov: 42, roll: R(3), creep: 0.003 }),
      k(T(3.7), [-2.9, 1.55, 1.75], [-4.05, 1.42, -1.2], { dur: 36, fov: 42, roll: R(-2), creep: 0.003 })],
  3: [k(T(5.0), [-18, 17, 11.2], [14, 2, 11], { fov: 62, roll: R(0) }),
      k(T(5.15), [-6.0, 1.75, 12.6], [8, 2.6, 11], { dur: 75, fov: 56, roll: R(4), creep: 0.0015 })],
  4: [k(T(9.3), [0.35, 1.95, 10.5], [0.35, 1.9, 3.9], { fov: 40, creep: 0.002 }),
      k(T(9.5), [0.95, 1.62, 1.75], [1.05, 1.5, -1.1], { dur: 48, fov: 36, roll: R(-4), creep: 0.0025, aim: 0 })],
  5: [k(T(13.9), [1.15, 1.85, 0.3], [1.15, 0.95, -0.26], { fov: 34, roll: R(3), creep: 0.0012 }),
      k(T(15.9), [0.92, 1.5, 0.25], [1.08, 0.95, -0.25], { dur: 30, fov: 32, roll: R(-2), creep: 0.0012 }),
      k(T(17.8), [1.3, 1.2, 0.0], [1.28, 0.96, -0.25], { dur: 30, fov: 26, roll: R(2), creep: 0.0015 })],
  6: [k(T(19.4), [5.5, 1.1, 13.5], [0.5, 1.3, 8.5], { fov: 40, roll: R(-3), creep: 0.002, aim: 3 }),
      k(T(22.6), [2.4, 1.45, 8.6], [0.35, 1.95, 4.0], { dur: 32, fov: 34, roll: R(4), creep: 0.003, aim: 4 })],
  7: [k(T(24.8), [-0.6, 1.55, 2.2], [-1.25, 1.55, -0.7], { fov: 36, roll: R(-3), creep: 0.0025, aim: 0 }),
      k(EV.whip, [1.7, 1.58, 2.0], [1.3, 1.6, -0.8], { dur: 18, fov: 34, roll: R(4), creep: 0.003, aim: 1 })],
  8: [k(T(28.2), [2.6, 1.7, 2.4], [1.3, 1.35, -0.4], { fov: 40, roll: R(3), creep: 0.002, aim: 0 }),
      k(T(30.6), [1.95, 1.58, 1.85], [1.25, 1.5, -0.8], { dur: 30, fov: 38, roll: R(-2), creep: 0.002, aim: 0 }),
      k(T(32.0), [1.7, 1.33, 0.95], [1.3, 1.42, -0.95], { dur: 18, fov: 50, roll: R(1), creep: 0.002 })],
  9: [k(T(33.45), [1.7, 1.33, 0.95], [1.3, 1.42, -0.95], { fov: 50, roll: R(0), creep: 0.0015 }),
      k(T(35.3), [4.2, 1.75, -3.4], [1.2, 1.5, 0.23], { dur: 34, fov: 50, roll: R(-4), creep: 0.0012, aim: 0 })],
  10: [k(T(39.15), [1.7, 1.33, 0.95], [1.3, 1.42, -0.95], { fov: 50, roll: R(2), creep: 0.0015 }),
       k(EV.smell, [2.3, 1.7, 3.75], [1.9, 1.35, -0.5], { dur: 28, fov: 56, roll: R(-3), creep: 0.0008, aim: -1 })],
  11: [k(T(43.35), [-1.5, 1.6, 0.6], [4.9, 1.5, 1.6], { fov: 42, roll: R(-3), creep: 0.003 })],
  12: [k(T(45.35), [-2.2, 1.7, 2.6], [-4.6, 1.2, 0.0], { fov: 44, roll: R(3) }),
       k(T(45.45), [1.8, 1.7, 2.5], [4.6, 1.3, -2.2], { dur: 40, fov: 42, roll: R(-3), creep: 0.002, aim: 1 })],
  13: [k(T(47.45), [-4.36, 1.52, -2.1], [-4.32, 1.58, 1.4], { fov: 40, roll: R(-2), creep: 0.0012 })],
  14: [k(T(50.35), [SEE[0] + 1.6, 1.35, SEE[2] + 2.3], [SEE[0], 1.05, SEE[2]], { fov: 36, roll: R(-3), creep: 0.002 }),
       k(T(50.5), [SEE[0] - 1.4, 1.25, SEE[2] + 2.0], [SEE[0], 1.05, SEE[2]], { dur: 100, fov: 32, roll: R(3), creep: 0.002 })],
  15: [k(T(54.05), [SEE[0], 1.6, SEE[2] + 4.2], [SEE[0], 1.1, SEE[2]], { fov: 40, roll: R(0), creep: 0.002 }),
       k(T(56.5), [SEE[0] + 0.3, 1.35, SEE[2] + 2.6], [SEE[0], 1.0, SEE[2]], { dur: 30, fov: 36, roll: R(3), creep: 0.003 })],
  16: [k(T(58.55), [SEE[0], 1.5, SEE[2] + 2.9], [SEE[0], 1.05, SEE[2]], { fov: 38, roll: R(-2), creep: 0.003 }),
       k(T(59.9), [SEE[0] + 0.35, 1.08, SEE[2] + 0.75], [SEE[0], 1.02, SEE[2] - 0.2], { dur: 40, fov: 46, roll: R(5), creep: 0.002 }),
       k(T(62.0), [SEE[0] - 0.5, 1.45, SEE[2] + 2.4], [SEE[0], 1.0, SEE[2]], { dur: 34, fov: 38, roll: R(-3), creep: 0.002 })],
  17: [k(T(63.75), [0.9, 1.6, 3.0], [3.6, 1.45, 1.3], { fov: 42, roll: R(3), creep: 0.002, aim: 0 }),
       k(T(65.9), [-2.95, 1.55, 0.2], [-4.55, 1.42, -1.0], { dur: 36, fov: 32, roll: R(-3), creep: 0.003 })],
  18: [k(T(67.6), [2.05, 1.62, 1.95], [1.25, 1.4, -0.8], { fov: 40, roll: R(-2), creep: 0.002, aim: 0 }),
       k(T(69.25), [1.7, 1.33, 0.95], [1.3, 1.42, -0.95], { dur: 30, fov: 50, roll: R(2), creep: 0.0015 })],
  19: [k(T(71.75), [2.6, 1.42, 1.35], [2.1, 1.3, -0.6], { fov: 46, roll: R(3), creep: 0.002 }),
       k(T(71.9), [2.5, 1.3, 1.05], [2.15, 1.25, -0.5], { dur: 26, fov: 44, roll: R(-2), creep: 0.002 })],
  20: [k(T(73.0), [1.35, 1.62, 2.4], [1.25, 1.4, -0.9], { fov: 40, roll: R(-3), creep: 0.003, aim: 0 })],
  21: [k(T(74.5), [FORGE[0] + 1.5, 1.5, FORGE[2] + 2.4], [FORGE[0], 1.15, FORGE[2] - 0.5], { fov: 46, roll: R(-3), creep: 0.002 }),
       k(T(74.65), [FORGE[0] + 0.55, 1.22, FORGE[2] + 1.45], [FORGE[0] - 0.05, 1.15, FORGE[2] - 0.6], { dur: 40, fov: 48, roll: R(3), creep: 0.0015 })],
  22: [k(T(76.3), [1.75, 1.5, 2.9], [1.35, 1.25, -1.0], { fov: 50, roll: R(3), creep: 0.0012, aim: -1 }),
       k(T(76.45), [1.0, 1.48, 2.75], [1.35, 1.25, -1.0], { dur: 80, fov: 50, roll: R(-3), creep: 0.001, aim: -1 })],
};
const KICKS: [number, number][] = [[EV.drop1 + 2, 0.02], [EV.drop2 + 2, 0.025], [EV.rumble, 0.035], [EV.kick, 0.07], [EV.mix, 0.02], [EV.mould, 0.02], [EV.shine, 0.015]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [fk, amp] of KICKS) { const d = f - fk; if (d >= 0 && d < 7) a += amp * (1 - d / 7) * (d % 2 ? -1 : 1); }
  return a;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id];
  let cur = keys[0], pos = cur.pos, look = cur.look, fov = cur.fov ?? 38, roll = cur.roll ?? 0, settled = keys[0].f;
  for (let i = 1; i < keys.length; i++) {
    const kk = keys[i];
    if (f < kk.f) break;
    const u = glide((f - kk.f) / (kk.dur ?? 24));
    pos = lerp3(pos, kk.pos, u); look = lerp3(look, kk.look, u); fov = lerp(fov, kk.fov ?? fov, u); roll = lerp(roll, kk.roll ?? roll, u);
    cur = kk; settled = kk.f + (kk.dur ?? 24);
  }
  // every hold creeps toward its look point (never a static hold >= 4 f)
  const creep = Math.min(0.35, Math.max(0, f - Math.min(settled, f)) * (cur.creep ?? 0.002) + (f - keys[0].f) * 0.0004);
  pos = lerp3(pos, look, creep);
  const kick = kickAt(f);
  return { pos: [pos[0], pos[1] + kick, pos[2]], look, fov, roll: roll + kick * 0.5, aim: cur.aim };
};

// ---------------- depth of field (cInf px at 1080 wide) ----------------
export type Dof = { cInf: number; focus?: V3 };
const DOFS: Record<number, (f: number) => Dof> = {
  1: (f) => ({ cInf: f < T(2.2) ? 10 : 9, focus: [1.25, 1.7, -0.95] }),
  2: () => ({ cInf: 13, focus: JAR_SHELF }),
  3: (f) => ({ cInf: f < T(6.5) ? 0 : 6 }),
  4: (f) => ({ cInf: f < T(10.4) ? 0 : 11, focus: [1.05, 1.55, -0.95] }),
  5: () => ({ cInf: 9, focus: [1.15, 0.97, -0.25] }),
  6: (f) => ({ cInf: f < T(22.6) ? 7 : 11, focus: f < T(22.6) ? [1.5, 1.4, 8.0] : [0.35, 1.95, 3.9] }),
  7: (f) => ({ cInf: 11, focus: f < EV.whip + 8 ? [-1.25, 1.62, -0.7] : [1.3, 1.62, -0.85] }),
  8: () => ({ cInf: 9, focus: [1.25, 1.65, -0.95] }),
  9: (f) => ({ cInf: f < T(35.3) ? 9 : 6, focus: [1.25, 1.65, -0.95] }),
  10: (f) => ({ cInf: f < EV.smell ? 9 : 6, focus: f < EV.smell ? [1.25, 1.65, -0.95] : [1.8, 1.5, -0.5] }),
  11: () => ({ cInf: 5, focus: [4.6, 1.6, 1.6] }),
  12: () => ({ cInf: 4 }),
  13: (f) => ({ cInf: 10, focus: f < EV.walk ? [-4.05, 1.75, 1.4] : JAR_SHELF }),
  14: () => ({ cInf: 9, focus: [SEE[0], 1.05, SEE[2]] }),
  15: () => ({ cInf: 6, focus: [SEE[0], 1.0, SEE[2]] }),
  16: () => ({ cInf: 5, focus: [SEE[0], 1.02, SEE[2]] }),
  17: (f) => ({ cInf: f < T(65.9) ? 6 : 12, focus: f < T(65.9) ? [3.3, 1.6, 1.2] : JAR_SHELF }),
  18: () => ({ cInf: 9, focus: [1.25, 1.65, -0.95] }),
  19: () => ({ cInf: 8, focus: [2.2, 1.2, -0.3] }),
  20: () => ({ cInf: 10, focus: [1.25, 1.5, -0.95] }),
  21: () => ({ cInf: 8, focus: [FORGE[0], 1.1, FORGE[2] - 0.5] }),
  22: () => ({ cInf: 7, focus: [1.35, 1.4, -1.35] }),
};
export const dofAt = (f: number) => DOFS[shotAt(f).id](f);
export const dofFor = (id: number, f: number) => DOFS[id](f);
