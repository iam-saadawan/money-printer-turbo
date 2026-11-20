// BLENDER TEST: Blender-rendered 1920s office (camera crane, real light, parallax skyline) + crisp 2D Ricks-style
// characters placed from the Blender camera projection. Layers: bg render -> character bodies -> desks (fg render, alpha)
// -> arms/hands + props -> captions. Voice: B (calm Chatterbox, chosen 2026-11-19).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { drawChar, Look, Pose, V2, Expr, sparkle } from "./rig";
import { backOut, sheet, pumpBubble, blinkAt, idle } from "./AgTest";
import { ANCH } from "./anchors";
import { BW } from "./blendwords";

const W = 1440, H = 2560, FPS = 30, NB = 150, D_M = 0.52;
export const BLENDTEST_FRAMES = 177;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
type KV = [number, V2, number?][];
const tr = (t: number, v0: number, keys: [number, number, number?][]) => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; v = v + (vk - v) * backOut((t - tk) / d); } return v; };
const trv = (t: number, v0: V2, keys: KV): V2 => { let v = v0; for (const [tk, vk, d = 0.22] of keys) { if (t < tk) break; const u = backOut((t - tk) / d); v = [v[0] + (vk[0] - v[0]) * u, v[1] + (vk[1] - v[1]) * u]; } return v; };
const step = <T,>(t: number, v0: T, keys: [number, T][]) => { let v = v0; for (const [tk, vk] of keys) if (t >= tk - 0.066) v = vk; return v; };
const wt = (word: string, nth = 0) => { const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); const h = BW.filter((w) => n(w[0]).startsWith(n(word))); return (h[Math.min(nth, h.length - 1)] ?? [0, 99])[1]; };

const OTTO: Look = { body: "#6e5a44", shirt: "#f4f1e8", tie: "#2f5a4a", tieKind: "bow", buttons: "#d8b25a", hair: "tufts", hairCol: "#dcdad4", glasses: true, tash: "walrus", tashCol: "#e4e1da", wide: 1.14, tall: 0.96, shoe: "#3a2a20" };
const ERNEST: Look = { body: "#f1eee6", vest: "#3d5872", tie: "#a8443c", tieKind: "long", hat: "cap", hatCol: "#8a7252", hatCol2: "#76603f", buttons: "#d8d2c0", earPencil: true, wide: 0.92, tall: 1.06 };

const tO = wt("Otto"), tE = wt("Ernest"), tMaps = wt("road"), tGas = wt("gas"), tEvery = wt("Every"), tBend = wt("bend"), tHand = wt("by");
const ottoAt = (t: number, x: number, y: number, D: number): Pose => {
  const i = idle(t, 3);
  const drawing = t < tO - 0.05 || (t > tMaps + 1.1 && t < tHand - 0.05);
  const fast = t >= tEvery - 0.1 ? 1 : 0.5;
  const sc = drawing ? [0.13 * fast * Math.sin(t * 15), 0.05 * fast * Math.sin(t * 30 + 1)] : [0, 0];
  const up = t >= tMaps - 0.05 && t < tMaps + 1.1;
  let armR: V2 = trv(t, [-0.12, 0.84], [[tO - 0.05, [-0.24, -0.3], 0.18], [tO + 0.45, [-0.12, 0.84]], [tMaps - 0.05, [0.06, 0.3]], [tMaps + 1.1, [-0.12, 0.84]], [tHand - 0.05, [0.32, -0.95], 0.25]]);
  const armL: V2 = trv(t, [-0.05, 0.86], [[tMaps - 0.05, [0.06, 0.3]], [tMaps + 1.1, [-0.05, 0.86]], [tHand - 0.05, [0.0, 0.84]]]);
  armR = [armR[0] + sc[0], armR[1] + sc[1]];
  return { x, y, D, ...i, lean: tr(t, 5, [[tO - 0.05, -3], [tMaps + 1.1, 6], [tEvery - 0.1, 10, 0.3], [tHand - 0.05, -6, 0.25]]),
    tilt: i.tilt + tr(t, 0, [[tO, -6], [tO + 0.5, 0], [tHand, 7]]) + (t > tBend - 0.1 && t < tHand ? 9 * Math.sin((t - tBend) * 7) : 0),
    nod: tr(t, 0.03, [[tO - 0.05, -0.02, 0.15], [tMaps + 1.1, 0.03], [tHand, -0.03]]), bob: D * tr(t, 0, [[tO - 0.05, 0.06, 0.12], [tO + 0.25, 0, 0.3], [tHand - 0.05, 0.08, 0.12], [tHand + 0.3, 0.015]]),
    armR: { hand: armR, k: up ? "open" : "pencil" }, armL: { hand: armL, k: "open" },
    expr: step<Expr>(t, "focus", [[tO, "smug"], [tMaps, "happy"], [tMaps + 1.1, "focus"], [tHand, "proud"]]), blink: blinkAt(t, 3),
    look: drawing ? [0.3, 0.9] : [0, 0], tongue: drawing && t > tEvery, glint: t > tO && t < tO + 0.5 ? 1 - (t - tO) / 0.5 : 0, facing: drawing ? 0.35 : 0 };
};
const ernestAt = (t: number, x: number, y: number, D: number): Pose => {
  const i = idle(t, 5);
  const drawing = t < tE - 0.05 || t > tMaps + 1.1;
  const sc = drawing ? [0.1 * Math.sin(t * 13 + 2), 0.04 * Math.sin(t * 26)] : [0, 0];
  let armR: V2 = trv(t, [-0.1, 0.84], [[tE - 0.05, [0.0, -0.78], 0.2], [tE + 0.3, [-0.1, 0.84], 0.18], [tMaps - 0.05, [0.06, 0.3]], [tGas - 0.05, [0.1, 0.8]], [tMaps + 1.1, [-0.1, 0.84]]]);
  const armL: V2 = trv(t, [-0.04, 0.86], [[tMaps - 0.05, [0.06, 0.3]], [tGas - 0.05, [0.35, -0.6]], [tMaps + 1.1, [-0.04, 0.86]]]);
  armR = [armR[0] + sc[0], armR[1] + sc[1]];
  return { x, y, D, ...i, lean: tr(t, -5, [[tE - 0.05, 3], [tMaps + 1.1, -5]]), bob: D * tr(t, 0, [[tE - 0.05, 0.08, 0.12], [tE + 0.3, 0, 0.3]]),
    tilt: i.tilt + tr(t, 0, [[tE, 8], [tE + 0.6, 0], [tGas, -6]]),
    armR: { hand: armR, k: (t >= tE - 0.05 && t < tE + 0.3) || (t >= tMaps - 0.05 && t < tMaps + 1.1) ? "open" : "pencil" },
    armL: { hand: armL, k: t >= tGas - 0.05 && t < tMaps + 1.1 ? "point" : "open" },
    expr: step<Expr>(t, "focus", [[tE, "grin"], [tMaps, "happy"], [tGas, "grin"], [tMaps + 1.1, "focus"]]), blink: blinkAt(t, 5),
    look: drawing ? [-0.3, 0.9] : t > tGas ? [-0.6, -0.6] : [0, 0], facing: drawing ? -0.35 : t > tGas - 0.05 ? -0.3 : 0 };
};
/** hand point in screen px, re-solved like the rig (shoulder + hand*D) */
const handPt = (p: Pose, L: Look, s: number, hd: V2): V2 => {
  const tw = 0.6 * p.D * (L.wide ?? 1), top = p.y - 0.98 * p.D - (p.bob ?? 0) - 1.42 * p.D * (L.tall ?? 1) * (p.squash ?? 1);
  return [p.x + s * (tw / 2 - 0.035 * p.D) + s * hd[0] * p.D, top + 0.24 * p.D + hd[1] * p.D];
};

// captions: 1-2 words, white with a heavy black edge, ~70 % down
const CH = (() => {
  const out: { txt: string; s: number; e: number }[] = []; let cur: typeof BW = [];
  BW.forEach((w, i) => { cur.push(w); const nx = BW[i + 1]; if (cur.length >= 2 || /[.,!?]$/.test(w[0]) || w[0].length > 7 || !nx) { out.push({ txt: cur.map((c) => c[0]).join(" "), s: cur[0][1], e: nx ? nx[1] : w[2] }); cur = []; } });
  return out;
})();
const caption = (g: CanvasRenderingContext2D, t: number) => {
  const c = CH.find((x) => t >= x.s - 0.03 && t < x.e); if (!c) return;
  const pop = backOut((t - c.s + 0.03) / 0.12);
  g.save(); g.translate(720, 1800); g.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  g.font = '900 118px "Arial Black", "Helvetica Neue", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = 26; g.strokeStyle = "#0d0c10"; g.strokeText(c.txt, 0, 0); g.fillStyle = "#ffffff"; g.fillText(c.txt, 0, 0);
  g.restore();
};

export const BlendTest: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const fi = Math.min(NB, f + 1);              // Blender frames are 1-based
  const hold = Math.max(0, f + 1 - NB);         // after the crane: a slow 2D push on the last frame
  const push = 1 + 0.0018 * hold;
  const body = useRef<HTMLCanvasElement>(null), front = useRef<HTMLCanvasElement>(null);
  const A = ANCH[fi - 1];
  const o = ottoAt(t, A.otto.x, A.otto.y, D_M * A.otto.ppm), e = ernestAt(t, A.ernest.x, A.ernest.y, D_M * A.ernest.ppm);
  useLayoutEffect(() => {
    const gb = body.current!.getContext("2d")!, gf = front.current!.getContext("2d")!;
    gb.clearRect(0, 0, W, H); gf.clearRect(0, 0, W, H);
    drawChar(gb, OTTO, o, t, "body"); drawChar(gb, ERNEST, e, t, "body");
    drawChar(gf, OTTO, o, t, "arms"); drawChar(gf, ERNEST, e, t, "arms");
    if (t >= tMaps - 0.02 && t < tMaps + 1.1) { // map sheets between the hands
      sheet(gf, handPt(o, OTTO, -1, o.armL.hand), handPt(o, OTTO, 1, o.armR.hand), o.D);
      if (t < tGas - 0.05) sheet(gf, handPt(e, ERNEST, -1, e.armL.hand), handPt(e, ERNEST, 1, e.armR.hand), e.D);
      drawChar(gf, OTTO, o, t, "arms"); drawChar(gf, ERNEST, e, t, "arms");
    }
    const bx = (o.x + e.x) / 2, by = Math.min(o.y, e.y) - 3.75 * o.D;
    pumpBubble(gf, bx, by, 0.42 * o.D, t < tGas - 0.05 ? 0 : backOut((t - tGas + 0.05) / 0.25) * (t > tMaps + 1.1 ? Math.max(0, 1 - (t - tMaps - 1.1) / 0.15) : 1));
    if (t > tHand) { const hp = handPt(o, OTTO, 1, o.armR.hand); sparkle(gf, hp[0] + 0.15 * o.D, hp[1] - 0.5 * o.D, 0.22 * o.D * (1 + 0.2 * Math.sin(t * 20)), clamp01((t - tHand) / 0.12)); }
    caption(gf, t);
  });
  const pad = (n: number) => String(n).padStart(4, "0");
  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
  return (
    <AbsoluteFill style={{ background: "#101018", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 55%" }}>
        <Img src={staticFile(`blendtest/bg/${pad(fi)}.jpg`)} style={layer} />
        <canvas ref={body} width={W} height={H} style={layer} />
        <Img src={staticFile(`blendtest/fg/${pad(fi)}.png`)} style={layer} />
        <canvas ref={front} width={W} height={H} style={layer} />
      </AbsoluteFill>
      <Audio src={staticFile("blendtest/voice.mp3")} endAt={BLENDTEST_FRAMES} />
    </AbsoluteFill>
  );
};
