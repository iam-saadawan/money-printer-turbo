// ESCAPE FROM THE ROCK — shot plan (style B). Every beat keyed to a word of the voice (timing.ts, generated), landing 0-3 frames early.
import { Outfit, INK } from "../ghost/toon";
import { LINES, VOICE_TOTAL } from "./timing";
import { G, char, burst, qmark, poly, P2, rnd, ease, easeIO, lerp, clamp01 } from "../rat/draw";

export const FPS = 30;
export const TOTAL = Math.ceil(VOICE_TOTAL * FPS);
export const BGS = ["island", "corridor", "cell", "workshop", "roof", "bay", "shore"];

const line = (id: string) => LINES.find((l) => l.id === id)!;
const S = (id: string) => Math.round(line(id).s * FPS);
const Wd = (id: string, w: string, early = 2) => {
  const l = line(id), k = l.w.findIndex(([t]) => t.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(w.toLowerCase()));
  return Math.round((k >= 0 ? l.w[k][1] : l.s) * FPS) - early;
};

export type Cam = { f: number; z: number; x: number; y: number; dur?: number; slow?: boolean };
export type Ctx = { img: HTMLImageElement; layer: (par: number) => void; imgs: Record<string, HTMLImageElement> };
export type Shot = { a: number; b: number; bg: string; xf?: boolean; light?: "window" | "day" | "night" | "sewer" | null; cams: Cam[]; kicks?: number[];
  flash?: number[]; draw: (g: G, lf: number, f: number, c: Ctx) => void };

export const camOf = (s: Shot, lf: number) => {
  const f = lf + s.a, K = s.cams;
  let i = 0; while (i + 1 < K.length && f >= K[i + 1].f) i++;
  let z = K[i].z, x = K[i].x, y = K[i].y;
  if (i > 0) { const p = K[i - 1], k = K[i], d = k.dur ?? 10, t = k.slow ? easeIO((f - k.f) / d) : ease((f - k.f) / d); z = lerp(p.z, k.z, t); x = lerp(p.x, k.x, t); y = lerp(p.y, k.y, t); }
  z += 0.00045 * (f - K[i].f);
  let kx = 0, ky = 0;
  for (const k of s.kicks ?? []) if (f >= k && f < k + 12) { const t = (f - k) / 12; kx += Math.sin((f - k) * 2.3) * (1 - t) * 18; ky += Math.cos((f - k) * 2.9) * (1 - t) * 10; }
  return { z, x, y, kx, ky };
};

// ---------------- cast (prison blues) ----------------
const MORRIS: Outfit = { jacket: "#7f9fca", pants: "#3b4f6e", boots: "#2a2420", hat: "hair", hair: "#2a2018", buttons: "#e8e4dc" };
const JOHN: Outfit = { ...MORRIS, hair: "#6a4428", skin: "#f5c9a0" };
const CLARENCE: Outfit = { ...MORRIS, hair: "#4a3020", skin: "#ecd0b6" };
const WEST: Outfit = { ...MORRIS, hair: "#d8b45a" };
const GUARD: Outfit = { jacket: "#2c3a5a", pants: "#26304a", boots: "#1c1c22", hat: "cap", cap: "#222c44", buttons: "#e8c45a", belt: "#1c1c22", moustache: "#5a3b2a", build: "stout" };
const blink = (f: number, seed: number) => (f + seed * 37) % 97 < 4;
const NIGHT: [string, string] = ["rgba(120,150,255,0.2)", "rgba(20,20,80,0.32)"];
const CELL_T: [string, string] = ["rgba(255,210,140,0.16)", "rgba(40,60,60,0.22)"];

// ---------------- props ----------------
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
const spoon = (g: G, x: number, y: number, s: number, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); ink(g, 8);
  g.fillStyle = "#c9d0d8"; g.beginPath(); g.ellipse(0, -70, 34, 48, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-9, -24); g.lineTo(-7, 110); g.lineTo(7, 110); g.lineTo(9, -24); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.ellipse(-10, -84, 9, 18, 0.2, 0, Math.PI * 2); g.fill(); g.restore();
};
const soap = (g: G, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); ink(g, 8); g.fillStyle = "#f4efe2";
  g.beginPath(); g.roundRect(-80, -45, 160, 90, 28); g.fill(); g.stroke();
  g.fillStyle = "#c8e6f5"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-60 + i * 40, -60 - (i % 2) * 18, 14 - i * 2, 0, 6.3); g.fill(); g.lineWidth = 4; g.stroke(); }
  g.restore();
};
const raincoat = (g: G, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); ink(g, 8); g.fillStyle = "#5d6a5a";
  g.beginPath(); g.moveTo(-40, -110); g.lineTo(40, -110); g.lineTo(90, -60); g.lineTo(70, 120); g.lineTo(-70, 120); g.lineTo(-90, -60); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, -110); g.lineTo(0, 120); g.stroke(); g.fillStyle = "#e8c45a"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(12, -60 + i * 45, 7, 0, 6.3); g.fill(); g.lineWidth = 3; g.stroke(); }
  g.restore();
};
const tp = (g: G, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); ink(g, 7); g.fillStyle = "#ffffff";
  g.fillRect(-55, -60, 110, 120); g.strokeRect(-55, -60, 110, 120); g.beginPath(); g.ellipse(0, -60, 55, 18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#c8b49a"; g.beginPath(); g.ellipse(0, -60, 16, 6, 0, 0, Math.PI * 2); g.fill(); g.restore();
};
const accordion = (g: G, x: number, y: number, s: number, t: number) => {
  const w = 150 + Math.sin(t) * 55;
  g.save(); g.translate(x, y); g.scale(s, s); ink(g, 7);
  g.fillStyle = "#c0353a"; g.fillRect(-w / 2 - 50, -80, 50, 160); g.strokeRect(-w / 2 - 50, -80, 50, 160); g.fillRect(w / 2, -80, 50, 160); g.strokeRect(w / 2, -80, 50, 160);
  g.fillStyle = "#f2efe6"; for (let i = 0; i < 8; i++) { g.fillRect(w / 2 + 8, -70 + i * 18, 34, 12); }
  const n = 9; for (let i = 0; i < n; i++) { const x0 = -w / 2 + (i * w) / n; g.fillStyle = i % 2 ? "#2a2230" : "#4a3a50"; g.beginPath(); g.moveTo(x0, -70); g.lineTo(x0 + w / n, -80); g.lineTo(x0 + w / n, 80); g.lineTo(x0, 70); g.closePath(); g.fill(); g.lineWidth = 3; g.stroke(); }
  g.restore();
};
const note = (g: G, x: number, y: number, s: number, k: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = k % 2 ? "#ffd84a" : "#ffffff"; ink(g, 6);
  g.beginPath(); g.ellipse(0, 0, 22, 16, -0.4, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(18, -6); g.lineTo(18, -80); g.lineTo(46, -64); g.stroke(); g.restore();
};
const raft = (g: G, x: number, y: number, s: number, inflate = 1, rock = 0) => {
  g.save(); g.translate(x, y); g.rotate(rock); g.scale(s, s * (0.35 + 0.65 * inflate)); ink(g, 9);
  g.fillStyle = "#4e5a52"; g.beginPath(); g.ellipse(0, 0, 260, 90, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#2c3430"; g.beginPath(); g.ellipse(0, -6, 190, 52, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.stroke();
  g.strokeStyle = "rgba(20,20,20,0.6)"; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 70, -86); g.lineTo(i * 70 + 10, 86); g.stroke(); }
  g.restore();
};
const paddle = (g: G, x: number, y: number, s: number, rot: number) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); ink(g, 8); g.fillStyle = "#a8783a";
  g.fillRect(-8, -160, 16, 260); g.strokeRect(-8, -160, 16, 260); g.beginPath(); g.ellipse(0, 150, 42, 80, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
};
const lifevest = (g: G, x: number, y: number, s: number, rot: number) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); ink(g, 7); g.fillStyle = "#5d6a5a";
  g.beginPath(); g.roundRect(-90, -50, 180, 100, 30); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, -50); g.lineTo(0, 50); g.stroke(); g.restore();
};
/** dummy head on a pillow: skin ball, painted face (closed eyes), real hair on top */
const dummy = (g: G, x: number, y: number, s: number, rot = 0, hair = "#2a2018", paint = 1) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); ink(g, 8);
  g.fillStyle = paint > 0.5 ? "#f2d2b0" : "#e8e4dc"; g.beginPath(); g.ellipse(0, 0, 70, 80, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  if (paint > 0.5) { g.lineWidth = 6; g.beginPath(); g.arc(-24, 4, 12, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(24, 4, 12, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.moveTo(-14, 40); g.lineTo(14, 40); g.stroke(); g.fillStyle = "rgba(230,120,120,0.35)"; g.beginPath(); g.arc(-40, 26, 12, 0, 6.3); g.arc(40, 26, 12, 0, 6.3); g.fill(); }
  g.fillStyle = hair; g.beginPath(); g.ellipse(0, -52, 74, 40, 0, Math.PI, 0); g.fill(); g.lineWidth = 7; g.stroke();
  g.strokeStyle = hair; g.lineWidth = 5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-60 + i * 15, -60); g.lineTo(-64 + i * 15 + rnd(i, 3) * 10, -36); g.stroke(); }
  g.restore();
};
const caseFile = (g: G, x: number, y: number, s: number, stamp: number) => {
  g.save(); g.translate(x, y); g.rotate(-0.06); g.scale(s, s); ink(g, 9);
  g.fillStyle = "#d8b878"; g.beginPath(); g.moveTo(-220, -150); g.lineTo(-80, -150); g.lineTo(-50, -120); g.lineTo(220, -120); g.lineTo(220, 160); g.lineTo(-220, 160); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#3a2a1a"; g.font = "900 40px Arial Black, Impact, sans-serif"; g.textAlign = "center"; g.fillText("ALCATRAZ 1962", 0, -50);
  g.font = "700 30px Arial, sans-serif"; g.fillText("MORRIS · J. ANGLIN · C. ANGLIN", 0, 0);
  if (stamp > 0) { g.save(); g.rotate(-0.25); g.scale(1 + (1 - stamp) * 1.5, 1 + (1 - stamp) * 1.5); g.globalAlpha = Math.min(1, stamp * 1.5);
    g.strokeStyle = "#c0353a"; g.lineWidth = 12; g.strokeRect(-150, 40, 300, 100); g.fillStyle = "#c0353a"; g.font = "900 78px Arial Black, Impact, sans-serif"; g.fillText("OPEN", 0, 118); g.restore(); }
  g.restore();
};
const beam = (g: G, x: number, y: number, ang: number, len: number, w: number, a = 0.22) => {
  g.save(); g.globalCompositeOperation = "screen"; g.translate(x, y); g.rotate(ang);
  const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, `rgba(230,240,255,${a})`); gr.addColorStop(1, "rgba(230,240,255,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -10); g.lineTo(len, -w); g.lineTo(len, w); g.lineTo(0, 10); g.closePath(); g.fill(); g.restore();
};
const dust = (g: G, x: number, y: number, f: number, n = 10) => {
  for (let i = 0; i < n; i++) { const t = ((f / 14) + i / n) % 1; g.fillStyle = `rgba(200,195,180,${0.8 * (1 - t)})`; g.beginPath(); g.arc(x + (rnd(i, 1) - 0.5) * 80 * t * 2, y + t * 120 - 20, 6 + rnd(i, 2) * 6, 0, 6.3); g.fill(); }
};
const nightTint = (g: G, a = 0.45) => { g.save(); g.fillStyle = `rgba(16,24,70,${a})`; g.fillRect(0, 0, 1080, 1920); g.restore(); };
// the painted cell bars (bg pixels), redrawn over the actors so they stand INSIDE the cell
const BARS: [number, number, number, number][] = [[133, 0, 30, 1920], [386, 0, 30, 1920], [936, 0, 30, 1920], [10, 446, 960, 30], [10, 871, 960, 30]];
const bars = (g: G, img: HTMLImageElement, tint = 0) => {
  g.save(); g.beginPath(); for (const [x, y, w, h] of BARS) g.rect(x, y, w, h); g.clip(); g.drawImage(img, 0, 0, 1080, 1920);
  if (tint) { g.fillStyle = `rgba(16,24,70,${tint})`; g.fillRect(0, 0, 1080, 1920); } g.restore();
};
const VENT: P2 = [557, 1238];

// ---------------- shots ----------------
const mk = (): Shot[] => {
  const SPOON = Wd("l01", "spoons"), SOAP = Wd("l01", "soap"), COATS = Wd("l01", "raincoats");
  const L2 = S("l02"), EVERY = Wd("l02", "every"), L3 = S("l03"), L4 = S("l04"), DIG = Wd("l04", "digging"), SP4 = Wd("l04", "spoons"), VENTS = Wd("l04", "vents");
  const L5 = S("l05"), ACC = Wd("l05", "accordion"), OTHERS = Wd("l05", "others"), L6 = S("l06"), DRILL = Wd("l06", "drill"), RAFT = Wd("l06", "raft"), COATS6 = Wd("l06", "raincoats");
  const L7 = S("l07"), EMPTY = Wd("l07", "empty"), L8 = S("l08"), HEADS = Wd("l08", "heads"), SOAP8 = Wd("l08", "soap"), TP8 = Wd("l08", "toilet"), DUST8 = Wd("l08", "concrete"), PAINT = Wd("l08", "painted"), HAIR = Wd("l08", "hair");
  const L9 = S("l09"), CLIMB = Wd("l09", "real"), ROOF = Wd("l09", "roof"), BAY = Math.min(Wd("l09", "bay", 6), ROOF + 10);
  const L10 = S("l10"), STUCK = Wd("l10", "stuck"), LEFT = Wd("l10", "left"), L11 = S("l11"), SHAKE = Wd("l11", "shakes"), ROLL = Wd("l11", "head", 3);
  const L12 = S("l12"), PAD = Wd("l12", "paddle"), VEST = Wd("l12", "life"), NEVER = Wd("l12", "never"), L13 = S("l13"), OPEN = Wd("l13", "open", 3);
  return [
    // 1 — hook: the Rock at dusk; spoons / soap / raincoats pop up as the three tools
    { a: 0, b: L2, bg: "island", light: null, kicks: [SPOON, SOAP, COATS],
      cams: [{ f: 0, z: 1.05, x: 540, y: 900 }, { f: SPOON, z: 1.18, x: 540, y: 1000, dur: 40, slow: true }],
      draw: (g, lf, f) => {
        const items: [number, (s: number) => void][] = [[SPOON, (s) => spoon(g, 230, 1300, s, -0.4)], [SOAP, (s) => soap(g, 540, 1400, s)], [COATS, (s) => raincoat(g, 850, 1290, s)]];
        items.forEach(([t, fn]) => { if (f >= t) { const p = ease((f - t) / 7), bob = Math.sin((f - t) * 0.15) * 10; g.save(); g.translate(0, bob); fn(2.1 * p); g.restore(); burst(g, [230, 540, 850][items.findIndex((x) => x[0] === t)], 1380, (f - t) / 10, "#fff3b0", 10, 80, 220); } });
      } },
    // 2 — the cell block: a guard counts every prisoner; then "Nobody escapes the Rock" in close-up
    { a: L2, b: L4, bg: "corridor", xf: true, light: null, kicks: [L3],
      cams: [{ f: L2, z: 1.05, x: 540, y: 1100 }, { f: EVERY, z: 1.15, x: 540, y: 1200, dur: 14 }, { f: L3, z: 1.5, x: 540, y: 1050, dur: 8 }],
      draw: (g, lf, f) => {
        const walk = clamp01((f - L2) / ((L3 - L2) * 0.9)), sole = lerp(1300, 1880, ease(walk)), s = lerp(0.55, 1.15, ease(walk));
        char(g, GUARD, 540, sole, s, { expr: f >= L3 ? "stern" : "neutral", blink: blink(f, 2), prop: f >= L3 ? ["hold", "point", 0] : ["hold", "book", 0], look: f >= L3 ? 0 : 0.3, mode: f >= L3 ? "stand" : "march", phase: (f / 18) % 1 });
      } },
    // 3 — digging with spoons through the crumbling concrete round the vent
    { a: L4, b: L5, bg: "cell", xf: true, light: null,
      cams: [{ f: L4, z: 1.1, x: 500, y: 1250 }, { f: SP4, z: 1.32, x: 520, y: 1300, dur: 10 }, { f: VENTS, z: 1.45, x: 560, y: 1260, dur: 10 }],
      draw: (g, lf, f, c) => {
        const prog = clamp01((f - DIG) / (L5 - DIG));
        g.save(); g.fillStyle = "#1a1a1e"; g.globalAlpha = 0.25 + prog * 0.65; g.beginPath(); g.roundRect(VENT[0] - 95, VENT[1] - 120, 190, 240, 10); g.fill(); g.restore();
        char(g, MORRIS, 330, 1720, 1.1, { side: 1, expr: "stern", blink: blink(f, 4), tint: CELL_T, phase: 0 });
        if (f >= SP4) { const k = Math.sin(f * 0.9) * 22; spoon(g, 480 + k, 1250, 0.9, 1.3); dust(g, 500, 1300, f, 12); }
        bars(g, c.img);
      } },
    // 4 — music hour: Morris plays the accordion; on "others" the scraping shows in the next cell
    { a: L5, b: L6, bg: "corridor", xf: true, light: null,
      cams: [{ f: L5, z: 1.12, x: 540, y: 1250 }, { f: ACC, z: 1.3, x: 520, y: 1200, dur: 9 }, { f: OTHERS, z: 1.15, x: 600, y: 1300, dur: 12 }],
      draw: (g, lf, f) => {
        char(g, MORRIS, 420, 1880, 1.05, { expr: "grin", blink: blink(f, 4), prop: ["hold", "book", 0], look: 0.2 });
        if (f >= ACC - 4) { accordion(g, 440, 1880 - 330 * 1.05, 1.05, f * 0.35); for (let i = 0; i < 5; i++) { const t = ((f - ACC) / 24 + i * 0.2) % 1; note(g, 420 + Math.sin(t * 6 + i) * 120, 1300 - t * 520, 1.0, i); } }
        if (f >= OTHERS) { char(g, JOHN, 860, 1500, 0.6, { side: 1, flipX: true, expr: "stern", blink: blink(f, 6), tint: CELL_T }); dust(g, 790, 1380, f, 8); }
      } },
    // 5 — the drill and the raincoat raft
    { a: L6, b: L7, bg: "workshop", xf: true, light: null, kicks: [RAFT],
      cams: [{ f: L6, z: 1.12, x: 400, y: 1250 }, { f: DRILL, z: 1.35, x: 380, y: 1200, dur: 9 }, { f: COATS6, z: 1.1, x: 560, y: 1450, dur: 12 }],
      draw: (g, lf, f) => {
        if (f >= DRILL) { for (let i = 0; i < 8; i++) { const a = f * 0.9 + i * 0.8; g.strokeStyle = i % 2 ? "#ffe27a" : "#ffffff"; g.lineWidth = 5; g.beginPath(); g.moveTo(560 + Math.cos(a) * 20, 1180 + Math.sin(a) * 20); g.lineTo(560 + Math.cos(a) * 70, 1180 + Math.sin(a) * 70); g.stroke(); } }
        if (f >= COATS6) for (let i = 0; i < 6; i++) { const t = clamp01((f - COATS6 - i * 3) / 10); if (t > 0 && f < RAFT + 4) raincoat(g, 200 + i * 140, lerp(900, 1500, ease(t)), 0.8); }
        if (f >= RAFT) { raft(g, 540, 1560, 1.6, ease((f - RAFT) / 10)); burst(g, 540, 1600, (f - RAFT) / 10, "#fff3b0", 12, 120, 360); }
      } },
    // 6 — night: the empty bed problem, then the fake head is built from soap, paper, dust, paint and hair
    { a: L7, b: L9, bg: "cell", xf: true, light: "night",
      cams: [{ f: L7, z: 1.15, x: 300, y: 1200 }, { f: EMPTY, z: 1.3, x: 260, y: 1180, dur: 10 }, { f: HEADS, z: 1.45, x: 280, y: 1100, dur: 10 }],
      draw: (g, lf, f, c) => {
        nightTint(g, 0.42);
        if (f < L8) { if (f >= EMPTY) qmark(g, 260, 950 - ease((f - EMPTY) / 6) * 30, 1.4, "?"); }
        else {
          if (f >= SOAP8 && f < PAINT) soap(g, 480, 1010, 0.9 * ease((f - SOAP8) / 6));
          if (f >= TP8 && f < PAINT) tp(g, 480, 1300, 0.9 * ease((f - TP8) / 6));
          if (f >= DUST8 && f < PAINT) dust(g, 360, 1150, f, 14);
          if (f >= HEADS) dummy(g, 235, 1120, 1.15 * ease((f - HEADS) / 7), 0.05, f >= HAIR ? "#2a2018" : "rgba(0,0,0,0)", f >= PAINT ? 1 : 0);
          if (f >= PAINT && f < PAINT + 12) burst(g, 235, 1120, (f - PAINT) / 12, "#ffffff", 10, 60, 200);
          if (f >= HAIR && f < HAIR + 12) burst(g, 235, 1040, (f - HAIR) / 12, "#ffd84a", 8, 40, 160);
        }
        bars(g, c.img, 0.42);
      } },
    // 7a — three dummies asleep (split: three pillows), then the climb across the roof under the searchlight
    { a: L9, b: CLIMB, bg: "cell", light: "night",
      cams: [{ f: L9, z: 1.3, x: 270, y: 1150 }],
      draw: (g, lf, f, c) => { nightTint(g, 0.42); dummy(g, 235, 1120, 1.15, 0.05, "#2a2018"); g.fillStyle = "rgba(255,255,255,0.9)"; g.font = "900 60px Arial Black, sans-serif"; g.fillText("z", 330, 1000 - (lf % 30)); g.fillText("Z", 380, 940 - (lf % 30)); bars(g, c.img, 0.42); } },
    { a: CLIMB, b: BAY, bg: "roof", light: "night",
      cams: [{ f: CLIMB, z: 1.15, x: 540, y: 1250 }, { f: ROOF, z: 1.3, x: 600, y: 1300, dur: 12 }],
      draw: (g, lf, f) => {
        const sw = Math.sin(f * 0.04) * 0.25; beam(g, 1000, 60, 2.3 + sw, 1800, 220, 0.18);
        [MORRIS, JOHN, CLARENCE].forEach((o, i) => { const t = clamp01((f - CLIMB - i * 6) / (BAY - CLIMB)); char(g, o, lerp(60, 1000, t) - i * 190, 1400 + i * 20, 0.8, { side: 1, mode: "march", phase: (f / 12 + i * 0.3) % 1, expr: "nervous", tint: NIGHT, blink: blink(f, i) }); });
      } },
    // 7b — into the bay on the raincoat raft
    { a: BAY, b: L10, bg: "bay", xf: true, light: "night",
      cams: [{ f: BAY, z: 1.1, x: 540, y: 1300 }, { f: BAY + 20, z: 1.22, x: 560, y: 1450, dur: 30, slow: true }],
      draw: (g, lf, f) => {
        const rock = Math.sin(f * 0.12) * 0.06, x = lerp(420, 640, clamp01(lf / 60)), y = 1520 + Math.sin(f * 0.15) * 12;
        g.save(); g.beginPath(); g.rect(0, 0, 1080, y + 60); g.clip(); [MORRIS, JOHN, CLARENCE].forEach((o, i) => char(g, o, x - 190 + i * 190, y + 200, 0.82, { expr: i === 1 ? "nervous" : "stern", tint: NIGHT, blink: blink(f, i), shadow: false, prop: ["hold", "rod", ((f / 16) + i * 0.3) % 1] })); g.restore();
        raft(g, x, y + 40, 1.55, 1, rock);
        g.save(); g.strokeStyle = "rgba(220,235,255,0.7)"; g.lineWidth = 5; for (let i = 0; i < 6; i++) { const t = ((f / 20) + i / 6) % 1; g.beginPath(); g.ellipse(x, y + 60, 280 + t * 160, 60 + t * 40, 0, 0.2, Math.PI - 0.2); g.globalAlpha = 1 - t; g.stroke(); } g.restore();
      } },
    // 8 — Allen West: his grille won't budge
    { a: L10, b: L11, bg: "cell", xf: true, light: "night", kicks: [STUCK],
      cams: [{ f: L10, z: 1.2, x: 520, y: 1250 }, { f: STUCK, z: 1.42, x: 560, y: 1250, dur: 8 }, { f: LEFT, z: 1.25, x: 520, y: 1200, dur: 14 }],
      draw: (g, lf, f, c) => {
        nightTint(g, 0.42);
        const shake = f >= STUCK && f < LEFT ? Math.sin(f * 2.4) * 8 : 0;
        char(g, WEST, 380 + shake, 1560, 0.95, { side: 1, expr: f >= LEFT ? "pained" : f >= STUCK ? "nervous" : "stern", tint: NIGHT, blink: blink(f, 9) });
        if (f >= STUCK) for (let i = 0; i < 3; i++) { const t = ((f - STUCK) / 20 + i / 3) % 1; g.fillStyle = `rgba(150,210,255,${1 - t})`; g.beginPath(); g.arc(300 + i * 40, 880 + t * 80, 10, 0, 6.3); g.fill(); }
        bars(g, c.img, 0.42);
      } },
    // 9 — 7 a.m.: the guard shakes "Clarence"... and the head rolls onto the floor
    { a: L11, b: L12, bg: "cell", xf: true, light: null, kicks: [ROLL], flash: [ROLL - L11],
      cams: [{ f: L11, z: 1.12, x: 460, y: 1250 }, { f: SHAKE, z: 1.25, x: 380, y: 1200, dur: 10 }, { f: ROLL, z: 1.45, x: 330, y: 1400, dur: 8 }],
      draw: (g, lf, f, c) => {
        char(g, GUARD, 640, 1700, 1.0, { flipX: true, expr: f >= ROLL ? "shock" : "neutral", blink: blink(f, 2), prop: ["hold", "point", 0], look: -0.6 });
        if (f < ROLL) { const sh = f >= SHAKE ? Math.sin(f * 1.8) * 6 : 0; dummy(g, 235 + sh, 1120, 1.15, 0.05, "#4a3020"); }
        else { const t = clamp01((f - ROLL) / 14), x = lerp(235, 470, t), y = t < 1 ? lerp(1120, 1720, t * t) - Math.sin(t * Math.PI) * 120 : 1720 + Math.abs(Math.sin((f - ROLL - 14) * 0.4)) * 30 * Math.max(0, 1 - (f - ROLL - 14) / 20); dummy(g, x, y, 1.15, t * 6 + (f - ROLL) * 0.05, "#4a3020"); }
        bars(g, c.img);
      } },
    // 10 — a paddle and life vests on the foggy shore; the men never found
    { a: L12, b: L13, bg: "shore", xf: true, light: "night",
      cams: [{ f: L12, z: 1.08, x: 540, y: 1300 }, { f: PAD, z: 1.25, x: 500, y: 1500, dur: 10 }, { f: NEVER, z: 1.12, x: 540, y: 1350, dur: 20, slow: true }],
      draw: (g, lf, f) => {
        if (f >= PAD) paddle(g, 470, 1560, 1.7 * ease((f - PAD) / 6), 1.2);
        if (f >= VEST) { lifevest(g, 780, 1700, 1.4 * ease((f - VEST) / 6), 0.3); lifevest(g, 250, 1760, 1.3 * ease((f - VEST - 4) / 6), -0.4); }
        if (f >= NEVER) { g.save(); g.fillStyle = `rgba(210,220,235,${0.35 * clamp01((f - NEVER) / 20)})`; g.fillRect(0, 0, 1080, 1920); g.restore(); qmark(g, 540, 1150, 1.4, "?"); }
      } },
    // 11 — the case is still open
    { a: L13, b: TOTAL, bg: "island", xf: true, light: null, kicks: [OPEN],
      cams: [{ f: L13, z: 1.1, x: 540, y: 950 }, { f: OPEN, z: 1.2, x: 540, y: 1050, dur: 9 }],
      draw: (g, lf, f) => { nightTint(g, 0.25); caseFile(g, 540, 1400, 1.5 * ease((f - L13) / 8), f >= OPEN ? ease((f - OPEN) / 6) : 0); } },
  ];
};
export const SHOTS: Shot[] = mk();
void poly; void JOHN;
