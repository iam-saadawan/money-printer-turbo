// Style test B: painted (klein) background + our toon characters, 2.5D camera, light shafts, dust.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Pen, bodyFront, Outfit, Expr, Prop, INK } from "../ghost/toon";

export const PAINTED_FRAMES = 150;
const W = 1080, H = 1920;
type P2 = [number, number];

const OFFICIAL: Outfit = { jacket: "#d8c08a", pants: "#efe6cf", boots: "#5a3b2a", hat: "helmet", cap: "#f1ead6", moustache: "#6b4a2a", buttons: "#d8b25a", build: "stout" };
const VILLAGER: Outfit = { jacket: "#5f8f6a", pants: "#3b3a30", boots: "#3a2a20", hat: "hair", hair: "#1c1a1a" };
// desk silhouette (bg pixels) — redrawn over the official so he stands behind the desk
const DESK: P2[] = [[112, 1150], [300, 1118], [600, 1108], [800, 1128], [952, 1176], [952, 1215], [925, 1228], [932, 1560], [900, 1585], [670, 1692],
  [640, 1722], [560, 1795], [497, 1795], [492, 1732], [168, 1565], [132, 1522], [143, 1240], [112, 1200]];

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** camera = zoom about a focus point; ease-out bursts like the reference (fast start, ~10 frame decay) */
const cam = (f: number) => {
  let z = lerp(1.06, 1.12, f / 75), fx = 560, fy = 1200;
  if (f >= 75) { const t = ease((f - 75) / 9); z = lerp(1.12, 1.26, t) + (f - 84) * 0.0006 * (f > 84 ? 1 : 0); fx = lerp(560, 520, t); fy = lerp(1200, 1000, t); }
  const kick = f >= 75 && f < 87 ? Math.sin((f - 75) * 2.2) * (1 - (f - 75) / 12) * 14 : 0;
  return { z, fx, fy, kick };
};

const drawChar = (g: CanvasRenderingContext2D, o: Outfit, x: number, sole: number, s: number, expr: Expr, f: number, seed: number,
  prop: Prop = null, look = 0) => {
  const off = document.createElement("canvas"); off.width = 600; off.height = 1000;
  const og = off.getContext("2d")!;
  const blink = (f + seed * 37) % 97 < 4;
  bodyFront(new Pen(og), o, { mode: "stand", expr, blink, prop, look, seed, phase: (f / 30) % 1, light: (-150 * Math.PI) / 180 });
  // warm window light tint on the lit side, cool on the far side (characters are lit by the room)
  og.globalCompositeOperation = "source-atop";
  const gr = og.createLinearGradient(0, 0, 600, 0);
  gr.addColorStop(0, "rgba(255,190,110,0.18)"); gr.addColorStop(1, "rgba(70,60,140,0.16)");
  og.fillStyle = gr; og.fillRect(0, 0, 600, 1000);
  // ground shadow first
  g.save(); g.fillStyle = "rgba(40,20,50,0.35)"; g.beginPath(); g.ellipse(x + 40 * s, sole, 190 * s, 34 * s, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.drawImage(off, x - 300 * s, sole - 975 * s, 600 * s, 1000 * s);
};

const drawTails = (g: CanvasRenderingContext2D, f: number) => {
  for (let i = 0; i < 22; i++) {
    const x0 = 470 + rnd(i, 1) * 170, y0 = 1180 + rnd(i, 2) * 50, a = rnd(i, 3) * Math.PI * 2, L = 70 + rnd(i, 4) * 50;
    const wig = Math.sin(f * 0.0 + i) * 6;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(a + 0.8) * L * 0.6 + wig, y0 + Math.sin(a + 0.8) * L * 0.25, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L * 0.35);
    g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 11 - i * 0.15; g.stroke();
    g.strokeStyle = i % 3 ? "#9a7468" : "#7d5a52"; g.lineWidth = 6 - i * 0.1; g.stroke();
  }
};

const drawLight = (g: CanvasRenderingContext2D, f: number) => {
  g.save(); g.globalCompositeOperation = "screen";
  const shafts: [number, number, number][] = [[60, 330, 0.22], [175, 300, 0.16], [280, 360, 0.12]];
  shafts.forEach(([x, w, a], i) => {
    const fl = a * (0.85 + 0.15 * Math.sin(f * 0.07 + i * 2));
    const gr = g.createLinearGradient(x, 380, x + 700, 1700);
    gr.addColorStop(0, `rgba(255,214,150,${fl})`); gr.addColorStop(1, "rgba(255,214,150,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, 380); g.lineTo(x + w * 0.35, 380); g.lineTo(x + w + 700, 1750); g.lineTo(x + 520, 1750); g.closePath(); g.fill();
  });
  for (let i = 0; i < 46; i++) { // dust motes drifting in the beams
    const px = (rnd(i, 5) * 760 + f * (0.4 + rnd(i, 6) * 0.6)) % 900 + 40, py = 450 + ((rnd(i, 7) * 1200 - f * (0.2 + rnd(i, 8) * 0.4)) % 1200 + 1200) % 1200;
    const r = 2 + rnd(i, 9) * 3, al = 0.35 + 0.35 * Math.sin(f * 0.1 + i);
    g.fillStyle = `rgba(255,236,190,${al})`; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};

export const PaintedTest: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender("bg"));
  useEffect(() => { const im = new Image(); im.onload = () => { setImg(im); continueRender(handle); }; im.src = staticFile("style_tests/office.jpg"); }, [handle]);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !img) return;
    const g = cv.getContext("2d")!; const { z, fx, fy, kick } = cam(f);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const layer = (par: number) => { // par > 1 = nearer the lens (moves/zooms more)
      const zz = 1 + (z - 1) * par;
      const tx = Math.min(0, Math.max(W - W * zz, W / 2 - fx * zz)), ty = Math.min(0, Math.max(H - H * zz, H / 2 - fy * zz));
      g.setTransform(zz, 0, 0, zz, tx + kick * par, ty + kick * 0.4 * par);
    };
    layer(1); g.drawImage(img, 0, 0, W, H);
    // official behind the desk: stern, then the shock reaction lands on frame 73 (2 frames before the punch-in)
    const offExpr: Expr = f < 73 ? "stern" : "shock";
    const lean = f >= 73 ? Math.min(1, (f - 73) / 5) * -18 : 0;
    drawChar(g, OFFICIAL, 500 + lean, 1330, 0.78, offExpr, f, 3, null, 0.4);
    g.save(); g.beginPath(); DESK.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    g.drawImage(img, 0, 0, W, H); g.restore();
    drawTails(g, f);
    // villager in front (nearer layer): proud grin, points at his pile
    layer(1.18);
    const bob = Math.sin(f * 0.25) * 4;
    drawChar(g, VILLAGER, 730, 1905 + bob * 0.2, 0.92, f < 73 ? "grin" : "laugh", f, 8, ["hold", "point", 0], -0.5);
    g.setTransform(1, 0, 0, 1, 0, 0);
    drawLight(g, f);
    // vignette + white impact flash (4 frames)
    const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,8,30,0.45)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (f >= 75 && f < 79) { g.fillStyle = `rgba(255,255,255,${0.5 * (1 - (f - 75) / 4)})`; g.fillRect(0, 0, W, H); }
  }, [f, img]);
  return <AbsoluteFill style={{ background: "#000" }}><canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
