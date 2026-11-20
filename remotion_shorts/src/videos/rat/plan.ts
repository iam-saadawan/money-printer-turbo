// RAT TAILS — shot plan. Every visual beat is keyed to a word of the voice (timing.ts, generated) and lands 0-3 frames early.
import { Outfit } from "../ghost/toon";
import { LINES, VOICE_TOTAL } from "./timing";
import { G, char, rat, tails, coin, burst, qmark, stink, poly, P2, rnd, ease, easeIO, lerp, clamp01 } from "./draw";

export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_TOTAL * FPS);
export const BGS = ["street", "bathroom", "office", "sewer", "desk", "nightstreet", "stage", "farm", "plague"];

const line = (id: string) => LINES.find((l) => l.id === id)!;
/** frame where line id starts */
const S = (id: string) => Math.round(line(id).s * FPS);
/** frame of the first word in line id that starts with `w` (case-insensitive), minus `early` frames */
const Wd = (id: string, w: string, early = 2) => {
  const l = line(id), k = l.w.findIndex(([t]) => t.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(w.toLowerCase()));
  return Math.round((k >= 0 ? l.w[k][1] : l.s) * FPS) - early;
};

export type Cam = { f: number; z: number; x: number; y: number; dur?: number; slow?: boolean };
export type Ctx = { img: HTMLImageElement; layer: (par: number) => void; imgs: Record<string, HTMLImageElement> };
export type Shot = { a: number; b: number; bg: string; xf?: boolean; light?: "window" | "day" | "night" | "sewer" | null; cams: Cam[]; kicks?: number[];
  flash?: number[]; draw: (g: G, lf: number, f: number, c: Ctx) => void };

/** camera: holds; each key is an ease-out burst over `dur` frames (or a slow ease-in-out when slow) + a gentle drift */
export const camOf = (s: Shot, lf: number) => {
  const f = lf + s.a, K = s.cams;
  let i = 0; while (i + 1 < K.length && f >= K[i + 1].f) i++;
  let z = K[i].z, x = K[i].x, y = K[i].y;
  if (i > 0) {
    const p = K[i - 1], k = K[i], d = k.dur ?? 10, t = k.slow ? easeIO((f - k.f) / d) : ease((f - k.f) / d);
    z = lerp(p.z, k.z, t); x = lerp(p.x, k.x, t); y = lerp(p.y, k.y, t);
  }
  z += 0.00045 * (f - K[i].f); // slow push during holds
  let kx = 0, ky = 0;
  for (const k of s.kicks ?? []) if (f >= k && f < k + 12) { const t = (f - k) / 12; kx += Math.sin((f - k) * 2.3) * (1 - t) * 18; ky += Math.cos((f - k) * 2.9) * (1 - t) * 10; }
  return { z, x, y, kx, ky };
};

// ---------------- cast ----------------
const OFFICIAL: Outfit = { jacket: "#e9dfc6", pants: "#efe6cf", boots: "#5a3b2a", hat: "helmet", cap: "#f4eedd", moustache: "#6b4a2a", buttons: "#d8b25a", build: "stout" };
const CATCHER: Outfit = { jacket: "#5f8f6a", pants: "#3b3a30", boots: "#3a2a20", hat: "hair", hair: "#1c1a1a" };
const CATCHER2: Outfit = { jacket: "#3f6fa0", pants: "#3a3a40", boots: "#3a2a20", hat: "hair", hair: "#241c18", skin: "#f5c9a0" };
const FARMER: Outfit = { jacket: "#b0703a", pants: "#4a3a2a", boots: "#3a2a20", hat: "hair", hair: "#1c1a1a", build: "stout", skin: "#ecd0b6" };
const blink = (f: number, seed: number) => (f + seed * 37) % 97 < 4;
const NIGHT_T: [string, string] = ["rgba(120,150,255,0.18)", "rgba(20,20,80,0.28)"];
const SEWER_T: [string, string] = ["rgba(255,190,110,0.2)", "rgba(20,70,80,0.3)"];
const DUSK_T: [string, string] = ["rgba(255,110,90,0.2)", "rgba(60,20,70,0.3)"];

/** rats scattering out of a point: n rats, each with its own angle and speed */
const scatter = (g: G, cx: number, cy: number, t: number, n: number, s: number, seed = 1, tailsOn = true, tint?: string) => {
  for (let i = 0; i < n; i++) {
    const a = rnd(i, seed) * Math.PI * 2, sp = 0.5 + rnd(i, seed + 1) * 0.9, d = t * 900 * sp;
    const x = cx + Math.cos(a) * d * 1.1, y = cy + Math.sin(a) * d * 0.55 - Math.abs(Math.sin(t * 9 + i)) * 30;
    if (t < rnd(i, seed + 3) * 0.25) continue;
    rat(g, x, y, s * (0.75 + rnd(i, seed + 4) * 0.4), { dir: Math.cos(a) > 0 ? 1 : -1, phase: (t * 12 + i * 0.3) % 1, tail: tailsOn, stub: !tailsOn, col: tint, expr: rnd(i, 9) < 0.5 ? "happy" : "neutral" });
  }
};
const heart = (g: G, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = "#ff4f7a"; g.strokeStyle = "#241726"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-40, -10, -22, -40, 0, -20); g.bezierCurveTo(22, -40, 40, -10, 0, 18); g.fill(); g.stroke(); g.restore();
};
const sign = (g: G, x: number, y: number, w: number, h: number, txt: string, size: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "#c8955a"; g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.fillRect(-w / 2, -h / 2, w, h); g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = "#3a2214"; g.font = `900 ${size}px Arial Black, Impact, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 4); g.restore();
};
const scissors = (g: G, x: number, y: number, s: number, open: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = "#241726"; g.lineWidth = 7;
  for (const k of [-1, 1]) { g.save(); g.rotate(k * open * 0.35); g.fillStyle = "#d9dde4"; g.beginPath(); g.moveTo(0, 0); g.lineTo(90, -6 * k); g.lineTo(0, 10 * k); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#c0353a"; g.beginPath(); g.ellipse(-30, 14 * k, 20, 13, 0, 0, 6.3); g.fill(); g.stroke(); g.restore(); }
  g.restore();
};

// ---------------- shots ----------------
const mk = (): Shot[] => {
  const MORE = Wd("l01", "more"), L2 = S("l02"), LOVE = Wd("l02", "love"), SEW = Wd("l02", "shiny");
  const L3 = S("l03"), PIPES = Wd("l03", "pipes"), KITCH = Wd("l03", "kitchens"), TOIL = Wd("l03", "toilets", 3);
  const L4 = S("l04"), PLAGUE = Wd("l04", "plague"), L5 = S("l05"), CATCH = Wd("l05", "catchers");
  const L6 = S("l06"), EIGHT = Wd("l06", "eight"), L7 = S("l07"), MAG = Wd("l07", "magnifique", 3), FIN = Wd("l07", "finished");
  const L8 = S("l08"), CENT8 = Wd("l08", "cent"), SO8 = Wd("l08", "so", 1), SMART = Wd("l08", "smarter");
  const L9 = S("l09"), CENT9 = Wd("l09", "cent"), TAIL9 = Wd("l09", "tail"), L10 = S("l10"), POUR = Wd("l10", "pouring"), BUCK = Wd("l10", "buckets");
  const L11 = S("l11"), NOT = Wd("l11", "no"), L12 = S("l12"), WAIT = Wd("l12", "wait"), LOSE = Wd("l12", "lose");
  const L13 = S("l13"), DEAD = Wd("l13", "dead"), CENT13 = Wd("l13", "cent"), ONCE = Wd("l13", "once");
  const L14 = S("l14"), LIVING = Wd("l14", "living"), BABY = Wd("l14", "baby"), EVERY = Wd("l14", "every"), NEWT = Wd("l14", "brandnew");
  const L15 = S("l15"), CUT = Wd("l15", "cut"), LET = Wd("l15", "let"), BREED = Wd("l15", "breeding");
  const L16 = S("l16"), FARMS = Wd("l16", "farms"), L17 = S("l17"), BIZ = Wd("l17", "business"), L18 = S("l18"), ANYWAY = Wd("l18", "anyway");
  const END = TOTAL;
  return [
    // 1a — hook: proud official on the new boulevard; the sewer grate erupts with rats on "MORE"
    { a: 0, b: L2, bg: "street", light: "day", flash: [MORE], kicks: [MORE],
      cams: [{ f: 0, z: 1.18, x: 420, y: 1350 }, { f: MORE, z: 1.3, x: 480, y: 1480, dur: 9 }],
      draw: (g, lf, f) => {
        const walk = clamp01(f / 40), x = lerp(-200, 250, ease(walk));
        const shocked = f >= MORE;
        if (!shocked && walk < 1) char(g, OFFICIAL, x, 1690, 0.95, { side: 1, phase: (f / 18) % 1, mode: "march", blink: blink(f, 3) });
        else char(g, OFFICIAL, 250 - (shocked ? Math.min(1, (f - MORE) / 5) * 40 : 0), 1690 - (shocked && f - MORE < 8 ? Math.sin((f - MORE) / 8 * Math.PI) * 60 : 0), 0.95,
          { expr: shocked ? "shock" : "grin", blink: blink(f, 3), look: 0.5, prop: shocked ? null : ["hold", "point", 0] });
        if (shocked) { const t = (f - MORE) / 45; burst(g, 500, 1700, (f - MORE) / 10, "#fff3b0", 14, 60, 320); scatter(g, 500, 1720, t, 30, 1.1, 3); }
      } },
    // 1b — the new sewers; at "LOVE" a rat peeks out of the grate with hearts
    { a: L2, b: L3, bg: "street", light: "day",
      cams: [{ f: L2, z: 1.08, x: 540, y: 1250 }, { f: SEW, z: 1.22, x: 480, y: 1520, dur: 24, slow: true }, { f: LOVE, z: 1.42, x: 500, y: 1640, dur: 9 }],
      draw: (g, lf, f) => {
        char(g, OFFICIAL, 230, 1690, 0.95, { expr: f >= LOVE ? "grin" : "smile", prop: ["hold", "point", 0], look: 0.5, blink: blink(f, 3) });
        if (f >= LOVE - 6) {
          const t = ease((f - LOVE + 6) / 8);
          g.save(); g.beginPath(); g.rect(0, 0, 1080, 1735); g.clip();
          rat(g, 540, 1735 + (1 - t) * 200 - t * 30, 1.5, { dir: -1, expr: "happy", up: 0.15, shadow: false });
          g.restore();
          for (let i = 0; i < 3; i++) { const ht = (f - LOVE + i * 7) / 30; if (ht > 0 && ht < 1) heart(g, 470 + i * 60 + Math.sin(ht * 6 + i) * 20, 1620 - ht * 220, 0.9 + i * 0.2); }
        }
      } },
    // 2 — rats everywhere: across the bathroom floor on "pipes"/"kitchens", out of the toilet on "toilets!"
    { a: L3, b: L4, bg: "bathroom", xf: true, light: "window", kicks: [TOIL],
      cams: [{ f: L3, z: 1.06, x: 540, y: 1300 }, { f: KITCH, z: 1.14, x: 500, y: 1400, dur: 12 }, { f: TOIL, z: 1.45, x: 450, y: 1250, dur: 8 }],
      draw: (g, lf, f) => {
        if (f >= PIPES) for (let i = 0; i < 3; i++) { const t = (f - PIPES - i * 5) / 30; if (t > 0 && t < 1.2) rat(g, lerp(-250, 1350, t), 1680 + i * 90, 1.0, { dir: 1, phase: (f / 6 + i * 0.3) % 1 }); }
        if (f >= KITCH) for (let i = 0; i < 4; i++) { const t = (f - KITCH - i * 4) / 28; if (t > 0 && t < 1.2) rat(g, lerp(1350, -250, t), 1560 + i * 110, 0.95, { dir: -1, phase: (f / 6 + i * 0.25) % 1, expr: "happy" }); }
        if (f >= TOIL - 2) {
          const t = clamp01((f - TOIL + 2) / 6);
          // lid flips up (painted lid covered by a raised lid card)
          g.save(); g.fillStyle = "#f4f2ee"; g.strokeStyle = "#241726"; g.lineWidth = 7; g.beginPath(); g.ellipse(455, 1345, 150, 62, -0.06, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = "#2a3a4a"; g.beginPath(); g.ellipse(455, 1350, 112, 40, -0.06, 0, Math.PI * 2); g.fill(); g.restore();
          g.save(); g.translate(455, 1290); g.rotate(-0.25 * t); g.fillStyle = "#9a5a2a"; g.strokeStyle = "#241726"; g.lineWidth = 7;
          g.beginPath(); g.ellipse(-20 * t, -170 * t, 150, 62 + 90 * t, -0.2 * t, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
          rat(g, 440, 1400 - ease((f - TOIL) / 7) * 230, 1.6, { dir: 1, expr: "happy", up: 0.9, shadow: false });
          for (let i = 0; i < 9; i++) { const st = (f - TOIL) / 14; if (st > 0 && st < 1) { g.fillStyle = "rgba(170,220,255,0.9)"; g.strokeStyle = "#241726"; g.lineWidth = 4; g.beginPath(); g.arc(455 + Math.cos(i * 0.7 + 3.4) * 260 * st, 1330 - Math.sin(i * 0.7 + 0.3) * 260 * st + st * st * 200, 14 * (1 - st) + 4, 0, 6.3); g.fill(); g.stroke(); } }
        }
      } },
    // 3 — office: plague fumes and a nervous official; on "catchers" he points and a rat catcher steps in
    { a: L4, b: L6, bg: "office", xf: true, light: "window", flash: [],
      cams: [{ f: L4, z: 1.1, x: 560, y: 1150 }, { f: PLAGUE, z: 1.3, x: 520, y: 1050, dur: 10 }, { f: L5, z: 1.1, x: 600, y: 1250, dur: 14 }],
      draw: (g, lf, f, c) => {
        char(g, OFFICIAL, 500, 1330, 0.78, { expr: f >= L5 ? "stern" : f >= PLAGUE ? "nervous" : "neutral", look: 0.3, blink: blink(f, 3), prop: f >= CATCH ? ["hold", "point", 0] : null });
        g.save(); poly(g, DESK); g.clip(); g.drawImage(c.img, 0, 0, 1080, 1920); g.restore();
        if (f >= PLAGUE - 4) { stink(g, 330, 1150, f, "rgba(140,200,90,0.8)"); stink(g, 700, 1100, f + 20, "rgba(140,200,90,0.8)"); rat(g, lerp(250, 760, clamp01((f - PLAGUE) / 40)), 1205, 0.7, { dir: 1, phase: (f / 6) % 1 }); }
        if (f >= CATCH) { const t = ease((f - CATCH) / 10); char(g, CATCHER, lerp(1300, 820, t), 1960, 1.05, { expr: "grin", look: -0.5, blink: blink(f, 8), prop: ["hold", "fist", 0] }); }
      } },
    // 4 — sewer: two catchers chase rats; the basket heap grows and pops on "eight thousand"
    { a: L6, b: L7, bg: "sewer", xf: true, light: "sewer", kicks: [EIGHT],
      cams: [{ f: L6, z: 1.15, x: 540, y: 1350 }, { f: EIGHT, z: 1.3, x: 560, y: 1450, dur: 9 }],
      draw: (g, lf, f) => {
        for (let i = 0; i < 5; i++) { const t = ((f - L6) / 26 + i * 0.37) % 1; rat(g, lerp(900, 180, t), 1500 + (i % 2) * 140, 0.85, { dir: -1, phase: (f / 5 + i * 0.3) % 1 }); }
        char(g, CATCHER, 210, 1640, 0.85, { expr: "stern", blink: blink(f, 8), prop: ["hold", "rod", (f / 14) % 1], tint: SEWER_T });
        char(g, CATCHER2, 880, 1660, 0.85, { expr: "grin", blink: blink(f, 5), prop: ["hold", "lift", 0], tint: SEWER_T });
        // basket in the foreground with a growing pile of caught rats
        const n = Math.min(14, Math.floor((f - L6) / 4) + 2) + (f >= EIGHT ? 6 : 0);
        for (let i = 0; i < n; i++) rat(g, 540 + (rnd(i, 4) - 0.5) * 260, 1800 - Math.floor(i / 5) * 50 - rnd(i, 5) * 20, 0.8, { dir: rnd(i, 6) < 0.5 ? 1 : -1, expr: "shock", shadow: false });
        g.save(); g.fillStyle = "#b07a3a"; g.strokeStyle = "#241726"; g.lineWidth = 8; g.beginPath(); g.moveTo(360, 1790); g.lineTo(720, 1790); g.lineTo(690, 1930); g.lineTo(390, 1930); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = "rgba(60,30,10,0.6)"; g.lineWidth = 4; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(370 + k * 60, 1795); g.lineTo(395 + k * 52, 1925); g.stroke(); } g.restore();
        if (f >= EIGHT) { sign(g, 540, 1080 - ease((f - EIGHT) / 8) * 40, 420, 150, (Math.min(7985, Math.round((f - EIGHT) / 14 * 7985))).toLocaleString("en-US"), 100); burst(g, 540, 1080, (f - EIGHT) / 10); }
      } },
    // 5 — "Magnifique!": official laughs, waves, coins burst
    { a: L7, b: L8, bg: "office", light: "window", flash: [L7], kicks: [MAG],
      cams: [{ f: L7, z: 1.32, x: 520, y: 1000 }, { f: FIN, z: 1.42, x: 510, y: 980, dur: 10 }],
      draw: (g, lf, f, c) => {
        char(g, OFFICIAL, 500, 1330, 0.78, { expr: f >= FIN ? "laugh" : "grin", look: 0.2, blink: false, prop: ["hold", "wave", (f / 10) % 1] });
        g.save(); poly(g, DESK); g.clip(); g.drawImage(c.img, 0, 0, 1080, 1920); g.restore();
        for (let i = 0; i < 10; i++) { const t = (f - MAG - i) / 22; if (t > 0 && t < 1) coin(g, 520 + Math.cos(i * 0.63) * 380 * t, 900 - Math.sin(i * 0.63 + 0.4) * 300 * t + t * t * 500, 26); }
      } },
    // 6a — tired catcher in the sewer (one cent a rat)
    { a: L8, b: SO8, bg: "sewer", xf: true, light: "sewer",
      cams: [{ f: L8, z: 1.2, x: 380, y: 1250 }, { f: CENT8, z: 1.32, x: 400, y: 1200, dur: 10 }],
      draw: (g, lf, f) => {
        char(g, CATCHER, 330, 1750, 1.05, { expr: "dazed", headTilt: 0.12, tint: SEWER_T, blink: blink(f, 8) });
        for (let i = 0; i < 4; i++) { const t = ((f / 40) + i * 0.25) % 1; g.fillStyle = `rgba(150,210,255,${0.9 * (1 - t)})`; g.beginPath(); g.arc(420 + i * 12, 760 + t * 90, 11, 0, 6.3); g.fill(); }
        if (f >= CENT8) { coin(g, 680, 900 - ease((f - CENT8) / 8) * 60, 70); }
      } },
    // 6b — the French try something smarter
    { a: SO8, b: L9, bg: "office", light: "window", flash: [0],
      cams: [{ f: SO8, z: 1.15, x: 540, y: 1150 }, { f: SMART, z: 1.32, x: 510, y: 1000, dur: 9 }],
      draw: (g, lf, f, c) => {
        char(g, OFFICIAL, 500, 1330, 0.78, { expr: f >= SMART ? "grin" : "neutral", look: 0.2, blink: blink(f, 3), prop: f >= SMART ? ["hold", "point", 0] : null });
        g.save(); poly(g, DESK); g.clip(); g.drawImage(c.img, 0, 0, 1080, 1920); g.restore();
        if (f >= SMART) { burst(g, 500, 640, (f - SMART) / 10, "#fff3b0", 10, 70, 220); qmark(g, 520, 600 - ease((f - SMART) / 6) * 30, 1.0, "!", "#ffd84a"); }
      } },
    // 7 — the deal: one cent per rat, tail as proof (desk close-up)
    { a: L9, b: L10, bg: "desk", xf: true, light: "window",
      cams: [{ f: L9, z: 1.05, x: 540, y: 900 }, { f: CENT9, z: 1.18, x: 600, y: 820, dur: 9 }, { f: TAIL9, z: 1.25, x: 520, y: 900, dur: 9 }],
      draw: (g, lf, f) => {
        if (f >= CENT9) { const p = ease((f - CENT9) / 7); coin(g, 640, 760, 80 * p); burst(g, 640, 760, (f - CENT9) / 10, "#fff3b0", 12, 90, 240); }
        if (f >= TAIL9) { const y = lerp(300, 900, ease((f - TAIL9) / 7)); tails(g, 430, y, 30, 1, 7, 2.2); if (f - TAIL9 > 6) burst(g, 430, 900, (f - TAIL9 - 6) / 10, "#ffffff", 8, 40, 160); }
      } },
    // 8 — tails pour into buckets
    { a: L10, b: L11, bg: "desk", light: "window", kicks: [BUCK],
      cams: [{ f: L10, z: 1.08, x: 560, y: 1200 }, { f: BUCK, z: 1.3, x: 600, y: 1520, dur: 9 }],
      draw: (g, lf, f) => {
        const fill = clamp01((f - L10) / ((BUCK + 12) - L10));
        [[325, 1505, 130], [575, 1565, 140], [890, 1455, 130]].forEach(([x, y, w], i) => tails(g, x, y + 30 - fill * 40, w * 1.5, Math.round(6 + fill * 20), 20 + i, 1.1));
        if (f >= POUR - 4) for (let i = 0; i < 18; i++) { const t = ((f - POUR) / 18 + i / 18) % 1; tails(g, 300 + rnd(i, 1) * 600, lerp(-100, 1450, t), 10, 1, 40 + i, 1.4); }
      } },
    // 9 — night: tailless rats; "Wait..." question mark on "lose"
    { a: L11, b: L13, bg: "nightstreet", xf: true, light: "night",
      cams: [{ f: L11, z: 1.08, x: 540, y: 1300 }, { f: NOT, z: 1.3, x: 520, y: 1580, dur: 9 }, { f: WAIT, z: 1.48, x: 520, y: 1640, dur: 9 }],
      draw: (g, lf, f) => {
        for (let i = 0; i < 4; i++) { const t = ((f - L11) / 50 + i * 0.27) % 1; rat(g, lerp(-150, 1250, t), 1450 + i * 80, 0.8, { dir: 1, stub: true, tail: false, phase: (f / 6 + i * 0.3) % 1, col: "#77748a" }); }
        if (f >= NOT - 8) { const t = ease((f - NOT + 8) / 10); rat(g, lerp(1250, 560, t), 1780, 1.8, { dir: -1, stub: true, tail: false, phase: t < 1 ? (f / 5) % 1 : 0, col: "#77748a", expr: f >= LOSE ? "shock" : "neutral" }); }
        if (f >= WAIT) qmark(g, 600, 1330 - ease((f - WAIT) / 6) * 40, 1.6 + (f >= LOSE ? 0.35 : 0), "?");
      } },
    // 10 — explanation stage: dead rat = one coin, once; living rat -> babies with tails; the snip
    { a: L13, b: L16, bg: "stage", xf: true, light: null, kicks: [CUT],
      cams: [{ f: L13, z: 1.12, x: 540, y: 1300 }, { f: ONCE, z: 1.28, x: 540, y: 1250, dur: 9 }, { f: L14, z: 1.08, x: 540, y: 1400, dur: 12 }, { f: L15, z: 1.18, x: 560, y: 1400, dur: 12 }],
      draw: (g, lf, f) => {
        if (f < L14) {
          // dead rat on its back, one coin
          g.save(); g.translate(540, 1500); g.rotate(Math.PI); rat(g, 0, 0, 2.0, { dir: 1, expr: "shock", shadow: false }); g.restore();
          if (f >= CENT13) { coin(g, 540, 1080 - ease((f - CENT13) / 8) * 60, 100); }
          if (f >= ONCE) { g.save(); g.strokeStyle = "#ff4a4a"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.arc(540, 1020, 160, 0, 6.3); g.stroke(); g.restore(); }
        } else if (f < L15) {
          // living rat + babies popping in, every tail sparkles
          rat(g, 540, 1580, 2.0, { dir: 1, expr: "happy", phase: 0 });
          const nb = Math.min(10, Math.max(0, Math.floor((f - BABY + 4) / 3)));
          for (let i = 0; i < nb; i++) { const a = (i / 10) * Math.PI * 2, x = 540 + Math.cos(a) * 380, y = 1560 + Math.sin(a) * 200; rat(g, x, y, 1.5, { baby: true, dir: Math.cos(a) > 0 ? 1 : -1, expr: "happy" }); }
          if (f >= NEWT) for (let i = 0; i < nb; i++) { const a = (i / 10) * Math.PI * 2; burst(g, 540 + Math.cos(a) * 380 - Math.cos(a) * 110, 1540 + Math.sin(a) * 200, ((f - NEWT) / 12 + i * 0.07) % 1, "#fff3b0", 6, 10, 50); }
        } else {
          // the hunter snips the tail and lets the rat go
          char(g, CATCHER, 250, 1700, 1.0, { expr: "grin", blink: blink(f, 8), prop: ["hold", "point", 0], tint: ["rgba(255,220,150,0.2)", "rgba(30,30,90,0.3)"] });
          const cut = f >= CUT, go = f >= LET;
          const rx = go ? lerp(680, 1450, ease((f - LET) / 26)) : 680;
          rat(g, rx, 1600, 1.8, { dir: 1, tail: !cut, stub: cut, phase: go ? (f / 5) % 1 : 0, expr: cut ? "sly" : "neutral" });
          scissors(g, 470, 1500, 1.6, cut ? Math.max(0, 1 - (f - CUT) / 4) : 0.8 + 0.2 * Math.sin(f * 0.6));
          if (cut) { tails(g, 470, lerp(1500, 1250, ease((f - CUT) / 8)), 20, 1, 9, 1.8); burst(g, 520, 1500, (f - CUT) / 8, "#ffffff", 10, 30, 160); coin(g, 360, 1180, 40 * ease((f - CUT - 4) / 6)); }
          if (f >= BREED) for (let i = 0; i < 3; i++) { const ht = (f - BREED + i * 6) / 26; if (ht > 0 && ht < 1) heart(g, 980 + i * 30, 1450 - ht * 200, 0.8); }
        }
      } },
    // 11 — the rat farm outside the city
    { a: L16, b: L18, bg: "farm", xf: true, light: "day", kicks: [FARMS],
      cams: [{ f: L16, z: 1.12, x: 400, y: 1150 }, { f: FARMS, z: 1.25, x: 380, y: 1150, dur: 9 }, { f: L17, z: 1.1, x: 600, y: 1300, dur: 14 }, { f: BIZ, z: 1.28, x: 700, y: 1250, dur: 9 }],
      draw: (g, lf, f) => {
        // rats peeking out of every cage
        const cages: P2[] = [[110, 1000], [230, 980], [130, 1150], [260, 1150], [420, 1150], [360, 1300], [120, 1320]];
        cages.forEach(([x, y], i) => { const b2 = Math.sin(f * 0.3 + i) * 4; rat(g, x, y + b2, 0.6, { dir: i % 2 ? 1 : -1, expr: i % 3 ? "happy" : "neutral", shadow: false }); });
        char(g, FARMER, 760, 1820, 1.05, { expr: f >= BIZ ? "laugh" : "grin", blink: blink(f, 6), prop: f >= L17 ? ["hold", "medals", 0] : ["hold", "point", 0], look: -0.4 });
        if (f >= FARMS) sign(g, 560, 1080 + Math.sin(f * 0.15) * 4, 360, 120, "TAILS 1¢", 72, -0.05);
        if (f >= BIZ) for (let i = 0; i < 8; i++) { const t = (f - BIZ - i * 2) / 20; if (t > 0 && t < 1) coin(g, 760 + Math.cos(i) * 300 * t, 900 - Math.sin(i * 0.7 + 0.6) * 260 * t + t * t * 400, 24); }
      } },
    // 12 — and the plague came anyway
    { a: L18, b: END, bg: "plague", xf: true, light: null,
      cams: [{ f: L18, z: 1.05, x: 540, y: 1250 }, { f: ANYWAY, z: 1.22, x: 560, y: 1380, dur: 30, slow: true }],
      draw: (g, lf, f) => {
        stink(g, 300, 1600, f, "rgba(150,210,90,0.7)"); stink(g, 820, 1500, f + 30, "rgba(150,210,90,0.7)");
        for (let i = 0; i < 6; i++) { const x = 140 + i * 160, y = 1700 + (i % 2) * 70; if (f > L18 + i * 6) rat(g, x, y, 0.75, { dir: i % 2 ? 1 : -1, expr: "sly", col: "#6e6a80", tail: i % 3 !== 0, stub: i % 3 === 0 }); }
      } },
  ];
};
// office desk silhouette (bg pixels) — redrawn over the official so he stands behind the desk
const DESK: P2[] = [[112, 1150], [300, 1118], [600, 1108], [800, 1128], [952, 1176], [952, 1215], [925, 1228], [932, 1560], [900, 1585], [670, 1692],
  [640, 1722], [560, 1795], [497, 1795], [492, 1732], [168, 1565], [132, 1522], [143, 1240], [112, 1200]];
export const SHOTS: Shot[] = mk();
void NIGHT_T; void DUSK_T; void lerp;
