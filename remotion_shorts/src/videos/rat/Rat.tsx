// RAT TAILS — painted-background short (style B). Engine: one 2D canvas; per shot a painted plate + a camera
// (zoom/pan with ease-out bursts) + a draw() that stages toon characters, rats and effects; 6-frame dissolves.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SHOTS, TOTAL, BGS, Shot, camOf } from "./plan";

export const RAT_FRAMES = TOTAL;
const W = 1080, H = 1920, XF = 6;

const light = (g: CanvasRenderingContext2D, f: number, kind: Shot["light"]) => {
  if (!kind) return;
  g.save(); g.globalCompositeOperation = "screen";
  if (kind === "window") {
    [[40, 330, 0.2], [170, 300, 0.14], [280, 360, 0.1]].forEach(([x, w, a], i) => {
      const fl = a * (0.85 + 0.15 * Math.sin(f * 0.07 + i * 2)), gr = g.createLinearGradient(x, 380, x + 700, 1700);
      gr.addColorStop(0, `rgba(255,214,150,${fl})`); gr.addColorStop(1, "rgba(255,214,150,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, 380); g.lineTo(x + w * 0.35, 380); g.lineTo(x + w + 700, 1750); g.lineTo(x + 520, 1750); g.closePath(); g.fill();
    });
  }
  const n = kind === "night" ? 26 : 44, col = kind === "night" ? "200,220,255" : kind === "sewer" ? "255,220,150" : "255,236,190";
  for (let i = 0; i < n; i++) {
    const r = (k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const px = (r(5) * 900 + f * (0.4 + r(6) * 0.6)) % 1000 + 40, py = 300 + ((r(7) * 1500 - f * (0.2 + r(8) * 0.4)) % 1500 + 1500) % 1500;
    g.fillStyle = `rgba(${col},${0.3 + 0.3 * Math.sin(f * 0.1 + i)})`; g.beginPath(); g.arc(px, py, 2 + r(9) * 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};

const drawShot = (g: CanvasRenderingContext2D, imgs: Record<string, HTMLImageElement>, s: Shot, f: number) => {
  const lf = f - s.a, c = camOf(s, lf);
  const layer = (par: number) => {
    const zz = 1 + (c.z - 1) * par;
    const tx = Math.min(0, Math.max(W - W * zz, W / 2 - c.x * zz)), ty = Math.min(0, Math.max(H - H * zz, H / 2 - c.y * zz));
    g.setTransform(zz, 0, 0, zz, tx + c.kx * par, ty + c.ky * par);
  };
  layer(1);
  g.drawImage(imgs[s.bg], 0, 0, W, H);
  s.draw(g, lf, f, { img: imgs[s.bg], layer, imgs });
  g.setTransform(1, 0, 0, 1, 0, 0);
  light(g, f, s.light);
};

export const RatShort: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement> | null>(null);
  const [handle] = useState(() => delayRender("rat bgs"));
  useEffect(() => {
    Promise.all(BGS.map((n) => new Promise<[string, HTMLImageElement]>((res) => { const im = new Image(); im.onload = () => res([n, im]); im.src = staticFile(`rat/${n}.jpg`); })))
      .then((l) => { setImgs(Object.fromEntries(l)); continueRender(handle); });
  }, [handle]);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !imgs) return;
    const g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H);
    const i = Math.max(0, SHOTS.findIndex((s) => f >= s.a && f < s.b));
    const s = SHOTS[i];
    drawShot(g, imgs, s, f);
    // dissolve from the previous shot over the first XF frames when the place changes
    if (i > 0 && s.xf && f - s.a < XF) {
      const off = document.createElement("canvas"); off.width = W; off.height = H;
      const og = off.getContext("2d")!; drawShot(og, imgs, SHOTS[i - 1], f);
      g.globalAlpha = 1 - (f - s.a) / XF; g.drawImage(off, 0, 0); g.globalAlpha = 1;
    }
    // grade: vignette + optional flash
    const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,8,30,0.42)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const fl = s.flash?.find((x) => f - s.a >= x && f - s.a < x + 4);
    if (fl !== undefined) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - (f - s.a - fl) / 4)})`; g.fillRect(0, 0, W, H); }
  }, [f, imgs]);
  return <AbsoluteFill style={{ background: "#000" }}><canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
