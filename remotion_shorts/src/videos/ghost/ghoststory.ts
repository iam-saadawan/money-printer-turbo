// THE ARMY MADE OF AIR — story timeline (30 fps), beats land 0-3 f before their word (voice/words.json).
// Camera grammar (skill): cuts on big jumps, smootherstep glides, every hold creeps, rolls, flip kicks on impacts, DOF on CU/MS.
export const FPS = 30;
export const TOTAL = 2106;
export type V3 = [number, number, number];
export type LightName = "day" | "golden" | "night" | "interior" | "warm";
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const T = (s: number) => Math.round(s * FPS);

// ---------------- places ----------------
export const TANK0: V3 = [20, 0, 6];          // the hook tank in the meadow (lifted, later drooping)
export const FARM: V3 = [12, 0, 16];          // where the farmers watch from
export const FOREST: V3 = [-200, 0, 0];       // night clearing: poke, lift, pump-up
export const SPEAKER: V3 = [14, 0, -8];       // speaker truck on the road by the field
export const TENT: V3 = [250, 0, 0];          // canvas tent interior (radio, sketchbook)
export const RIVER_Z = -430;                  // Rhine centre line (runs along x), 80 m wide
export const DECOY: V3 = [300, 0, -368];      // rubber army on the near bank, "miles" downstream
export const FIELD_ROWS = { x0: -35, x1: 35, dx: 10, z0: -20, z1: -60, dz: 10 };

export type Set = "meadow" | "field" | "forest" | "tent" | "river" | "sky";
export type ShotDef = { id: number; a: number; b: number; light: LightName; set: Set; pov?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(2.2), light: "golden", set: "meadow" },          // farmers watch: soldiers + tank
  { id: 2, a: T(2.2), b: T(4.3), light: "golden", set: "meadow" },     // low angle: the tank goes up
  { id: 3, a: T(4.3), b: T(5.65), light: "golden", set: "meadow" },    // dolly zoom on the farmers
  { id: 4, a: T(5.65), b: T(8.2), light: "golden", set: "sky" },       // drone through clouds: northern France
  { id: 5, a: T(8.2), b: T(11.4), light: "golden", set: "meadow" },    // farmers walk their bikes closer; soldiers freeze
  { id: 6, a: T(11.4), b: T(14.4), light: "golden", set: "meadow" },   // "Americans are very strong"
  { id: 7, a: T(14.4), b: T(17.5), light: "day", set: "field" },       // crane reveal: a whole division
  { id: 8, a: T(17.5), b: T(20.0), light: "day", set: "field" },       // dolly along the rows
  { id: 9, a: T(20.0), b: T(21.4), light: "day", set: "field" },       // German plane overhead
  { id: 10, a: T(21.4), b: T(22.85), light: "day", set: "field", pov: true }, // POV from the plane
  { id: 11, a: T(22.85), b: T(24.8), light: "night", set: "field" },   // the division drives away at night
  { id: 12, a: T(24.8), b: T(27.15), light: "golden", set: "field" },  // next morning: tanks still there
  { id: 13, a: T(27.15), b: T(28.85), light: "night", set: "forest" }, // You see: rubber (poke -> wobble)
  { id: 14, a: T(28.85), b: T(30.85), light: "night", set: "forest" }, // light as a bicycle
  { id: 15, a: T(30.85), b: T(33.45), light: "night", set: "forest" }, // four men pump one up
  { id: 16, a: T(33.45), b: T(37.9), light: "night", set: "field" },   // speaker truck, sound for miles
  { id: 17, a: T(37.9), b: T(41.5), light: "warm", set: "tent" },      // fake radio chatter
  { id: 18, a: T(41.5), b: T(45.8), light: "day", set: "field", pov: true }, // from 10,000 ft it looks real
  { id: 19, a: T(45.8), b: T(48.4), light: "day", set: "meadow" },     // hot afternoon: it droops
  { id: 20, a: T(48.4), b: T(53.7), light: "night", set: "river" },    // March 1945, the Rhine
  { id: 21, a: T(53.7), b: T(60.0), light: "night", set: "river" },    // decoy site, Germans aim the wrong way
  { id: 22, a: T(60.0), b: T(61.8), light: "night", set: "river" },    // the real army crosses
  { id: 23, a: T(61.8), b: T(66.35), light: "warm", set: "tent" },     // artists: sketchbook, TOP SECRET
  { id: 24, a: T(66.35), b: TOTAL, light: "golden", set: "meadow" },   // the "strongest soldiers" wave
];
export const XFADE: Record<number, number> = { 4: 8, 11: 8, 12: 8, 13: 10, 17: 8, 20: 10, 23: 10, 24: 8 };
export const FLASH_AT = T(5.65);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  const s = shotAt(f), xf = XFADE[s.id];
  if (xf && f < s.a + xf && s.id > 1) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - s.a + 1) / (xf + 1) }];
  return [{ id: s.id, alpha: 1 }];
};

// ---------------- story events (frames) ----------------
export const EV = {
  lift0: T(2.3), lift1: T(3.5), freeze: T(10.45), smile: T(12.05), plane: T(20.1), poke: T(27.6), wobble: T(27.7),
  carry: T(29.4), pump0: T(31.0), pump1: T(33.2), blast: T(34.05), droop0: T(46.6), droop1: T(48.0),
  sweep: T(56.2), guns: T(58.0), cross: T(60.1), sketch: T(64.5), stamp: T(66.2), wave: T(67.0),
};
/** height of the hook tank above the ground (the lift) */
export const liftY = (f: number) => 2.05 * smooth((f - EV.lift0) / (EV.lift1 - EV.lift0));

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number; aim?: number };
export type Key = { f: number; dur?: number; pos: V3; look: V3; fov?: number; roll?: number; creep?: number; aim?: number };
const k = (f: number, pos: V3, look: V3, o: Partial<Key> = {}): Key => ({ f, pos, look, ...o });
const R = (d: number) => (d * Math.PI) / 180;
const [TX, , TZ] = TANK0, [FX, , FZ] = FOREST, [DX, , DZ] = DECOY, [EX, , EZ] = TENT;
export const CAMS: Record<number, Key[]> = {
  1: [k(0, [8.0, 1.8, 23.5], [17.0, 1.9, 8.0], { fov: 50, roll: R(-3), creep: 0.002, aim: -1 })],
  2: [k(T(2.2), [19.6, 0.45, 14.4], [20, 2.4, 6.4], { fov: 60, roll: R(4), creep: 0.0012 }),
      k(T(2.5), [20.4, 0.4, 14.8], [20, 3.4, 6.4], { dur: 40, fov: 60, roll: R(-3), creep: 0.0012 })],
  3: [k(T(4.3), [13.35, 1.7, 18.4], [13.35, 1.62, 16.3], { fov: 60, roll: R(0) }),
      k(T(4.32), [13.35, 1.72, 21.8], [13.35, 1.62, 16.3], { dur: 36, fov: 36, roll: R(2) })],
  4: [k(T(5.65), [-70, 95, 85], [10, 0, -60], { fov: 58, roll: R(-6) }),
      k(T(5.7), [-18, 10, 42], [12, 1.5, -10], { dur: 72, fov: 54, roll: R(3), creep: 0.001 })],
  5: [k(T(8.2), [0.0, 1.6, 30.5], [7.5, 1.6, 18.5], { fov: 54, roll: R(3), creep: 0.001, aim: -1 }),
      k(T(8.3), [6.0, 1.6, 29.0], [13, 1.6, 14.5], { dur: 85, fov: 54, roll: R(-2), creep: 0.001, aim: -1 })],
  6: [k(T(11.4), [19.0, 1.6, 18.5], [20, 2.4, 6.5], { fov: 52, roll: R(-3), creep: 0.0012, aim: -1 }),
      k(EV.smile, [19.6, 1.65, 17.2], [20, 2.3, 6.8], { dur: 24, fov: 52, roll: R(3), creep: 0.0012, aim: -1 })],
  7: [k(T(14.4), [6, 1.8, 6], [0, 1.6, -22], { fov: 50, roll: R(0) }),
      k(T(14.55), [32, 26, 30], [0, 0, -42], { dur: 80, fov: 52, roll: R(-4), creep: 0.0008 })],
  8: [k(T(17.5), [-32, 1.7, -14.2], [-26, 1.6, -21], { fov: 46, roll: R(3) }),
      k(T(17.55), [8, 1.7, -14.2], [14, 1.6, -21], { dur: 74, fov: 46, roll: R(-2) })],
  9: [k(T(20.0), [6.0, 1.4, -6.0], [14, 30, -70], { fov: 58, roll: R(-6), creep: 0.001 })],
  10: [k(T(21.4), [-40, 160, 70], [0, 0, -40], { fov: 38, roll: R(8) }),
       k(T(21.45), [10, 158, 45], [0, 0, -40], { dur: 44, fov: 36, roll: R(4) })],
  11: [k(T(22.85), [30, 1.7, -1.5], [0, 1.4, -6], { fov: 48, roll: R(-3), creep: 0.0015 })],
  12: [k(T(24.8), [-3.5, 22, 9], [0, 0, -40], { fov: 50, roll: R(2), creep: 0.0012 }),
       k(T(25.0), [2.5, 20, 4], [2, 0, -42], { dur: 60, fov: 48, roll: R(-2), creep: 0.001 })],
  13: [k(T(27.15), [FX + 4.2, 1.45, 6.8], [FX + 0.6, 1.3, 0.6], { fov: 46, roll: R(-3), creep: 0.003 })],
  14: [k(T(28.85), [FX - 4.6, 1.5, 6.2], [FX - 0.6, 1.25, 0.4], { fov: 46, roll: R(3), creep: 0.0025 })],
  15: [k(T(30.85), [FX + 12, 3.2, 13], [FX, 0.9, 0], { fov: 56, roll: R(-2), creep: 0.0008 }),
       k(T(31.0), [FX - 10.5, 2.8, 12.5], [FX, 1.0, 0], { dur: 72, fov: 56, roll: R(3), creep: 0.0008 })],
  16: [k(T(33.45), [SPEAKER[0] + 5, 2.2, SPEAKER[2] + 7], [SPEAKER[0], 2.4, SPEAKER[2]], { fov: 46, roll: R(-3) }),
       k(T(34.6), [SPEAKER[0] + 48, 28, SPEAKER[2] + 52], [SPEAKER[0] - 10, 0, SPEAKER[2] - 30], { dur: 70, fov: 54, roll: R(4), creep: 0.0008 })],
  17: [k(T(37.9), [EX + 1.9, 1.5, EZ + 1.9], [EX, 1.25, EZ - 0.8], { fov: 46, roll: R(3), creep: 0.002, aim: 0 })],
  18: [k(T(41.5), [-20, 190, 80], [0, 0, -40], { fov: 34, roll: R(-6) }),
       k(T(41.55), [20, 186, 50], [0, 0, -40], { dur: 120, fov: 30, roll: R(-2) })],
  19: [k(T(45.8), [TX - 4.6, 1.5, TZ + 7.0], [TX - 0.4, 1.2, TZ], { fov: 52, roll: R(-3), creep: 0.0015 }),
       k(EV.droop0, [TX - 3.4, 1.3, TZ + 6.2], [TX - 0.2, 1.15, TZ], { dur: 30, fov: 50, roll: R(3), creep: 0.0015 })],
  20: [k(T(48.4), [0, 38, -320], [0, 0, RIVER_Z - 20], { fov: 52, roll: R(-3) }),
       k(T(48.5), [-6, 9, -372], [10, 1.5, RIVER_Z - 25], { dur: 100, fov: 50, roll: R(3), creep: 0.0008 })],
  21: [k(T(53.7), [DX - 70, 14, DZ + 18], [DX, 2, DZ - 6], { fov: 50, roll: R(-3) }),
       k(T(53.8), [DX - 12, 4, DZ + 14], [DX + 4, 2, DZ - 4], { dur: 60, fov: 48, roll: R(3), creep: 0.001 }),
       k(T(56.0), [DX - 8, 6, DZ + 12], [DX + 30, 8, RIVER_Z - 70], { dur: 40, fov: 50, roll: R(-3), creep: 0.001 })],
  22: [k(T(60.0), [34, 5, -366], [12, 0.5, RIVER_Z], { fov: 48, roll: R(3), creep: 0.0015 })],
  23: [k(T(61.8), [EX + 0.3, 1.75, EZ + 1.4], [EX + 0.3, 1.3, EZ - 0.9], { fov: 50, roll: R(-2), creep: 0.0012 }),
       k(EV.sketch, [EX + 1.0, 1.7, EZ + 1.9], [EX + 0.35, 1.35, EZ - 0.9], { dur: 34, fov: 48, roll: R(3), creep: 0.0012 }),
       k(EV.stamp - 8, [EX + 0.3, 1.6, EZ + 0.9], [EX + 0.28, 0.9, EZ - 0.55], { dur: 10, fov: 48, roll: R(-2), creep: 0.001 })],
  24: [k(T(66.35), [TX + 0.3, 1.7, TZ + 13.0], [TX + 0.6, 2.1, TZ + 1.5], { fov: 56, roll: R(-2), creep: 0.001, aim: -1 }),
       k(T(66.5), [TX + 1.8, 1.8, TZ + 13.5], [TX + 0.6, 2.2, TZ + 1.5], { dur: 90, fov: 56, roll: R(2), creep: 0.0008, aim: -1 })],
};
const KICKS: [number, number][] = [[EV.lift1, 0.02], [EV.freeze, 0.02], [EV.wobble, 0.02], [EV.blast, 0.03], [EV.guns, 0.03], [EV.stamp, 0.05]];
export const kickAt = (f: number) => { let a = 0; for (const [fk, amp] of KICKS) { const d = f - fk; if (d >= 0 && d < 7) a += amp * (1 - d / 7) * (d % 2 ? -1 : 1); } return a; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id];
  let cur = keys[0], pos = cur.pos, look = cur.look, fov = cur.fov ?? 40, roll = cur.roll ?? 0, settled = keys[0].f;
  for (let i = 1; i < keys.length; i++) {
    const kk = keys[i]; if (f < kk.f) break;
    const u = glide((f - kk.f) / (kk.dur ?? 24));
    pos = lerp3(pos, kk.pos, u); look = lerp3(look, kk.look, u); fov = lerp(fov, kk.fov ?? fov, u); roll = lerp(roll, kk.roll ?? roll, u);
    cur = kk; settled = kk.f + (kk.dur ?? 24);
  }
  const creep = Math.min(0.3, Math.max(0, f - Math.min(settled, f)) * (cur.creep ?? 0.0015) + (f - keys[0].f) * 0.0003);
  pos = lerp3(pos, look, creep);
  const kick = kickAt(f);
  return { pos: [pos[0], pos[1] + kick, pos[2]], look, fov, roll: roll + kick * 0.5, aim: cur.aim };
};

// ---------------- depth of field ----------------
export type Dof = { cInf: number; focus?: V3 };
const DOFS: Record<number, (f: number) => Dof> = {
  1: () => ({ cInf: 6, focus: [20, 1.8, 7.6] }), 2: () => ({ cInf: 5, focus: [20, 2.5, 7.0] }), 3: () => ({ cInf: 12, focus: [12.6, 1.75, 16.1] }),
  4: () => ({ cInf: 0 }), 5: () => ({ cInf: 6, focus: [9, 1.6, 18.5] }), 6: () => ({ cInf: 10, focus: [19.4, 1.75, 7.8] }),
  7: () => ({ cInf: 0 }), 8: () => ({ cInf: 4, focus: [0, 1.5, -20] }), 9: () => ({ cInf: 0 }), 10: () => ({ cInf: 0 }),
  11: () => ({ cInf: 4, focus: [8, 1.2, -5] }), 12: () => ({ cInf: 0 }),
  13: () => ({ cInf: 10, focus: [FX + 1.2, 1.5, 2.6] }), 14: () => ({ cInf: 10, focus: [FX - 1.2, 1.5, 2.2] }), 15: () => ({ cInf: 5, focus: [FX, 1.0, 0] }),
  16: (f) => ({ cInf: f < T(34.6) ? 8 : 0, focus: [SPEAKER[0], 2.4, SPEAKER[2]] }), 17: () => ({ cInf: 9, focus: [EX, 1.6, EZ - 0.8] }),
  18: () => ({ cInf: 0 }), 19: () => ({ cInf: 9, focus: [TX, 1.2, TZ] }), 20: () => ({ cInf: 0 }), 21: () => ({ cInf: 2 }), 22: () => ({ cInf: 3 }),
  23: () => ({ cInf: 9, focus: [EX + 0.2, 0.85, EZ - 0.45] }), 24: () => ({ cInf: 6, focus: [TX, 1.7, TZ + 1.6] }),
};
export const dofFor = (id: number, f: number) => DOFS[id](f);
