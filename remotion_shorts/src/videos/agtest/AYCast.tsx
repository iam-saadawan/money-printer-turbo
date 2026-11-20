// Cast portraits for the Cortex HQ dashboard: one frame per character (drawn with the real rig).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawChar, Look, Expr } from "./rig";
const L: Record<string, Look> = {
  OTTO: { body: "#6e5a44", shirt: "#f4f1e8", tie: "#2f5a4a", tieKind: "bow", buttons: "#d8b25a", hair: "tufts", hairCol: "#dcdad4", glasses: true, tash: "walrus", tashCol: "#e4e1da", wide: 1.14, tall: 0.96, shoe: "#3a2a20" },
  ERNEST: { body: "#f1eee6", vest: "#3d5872", tie: "#a8443c", tieKind: "long", hat: "cap", hatCol: "#8a7252", hatCol2: "#76603f", buttons: "#d8d2c0", earPencil: true, wide: 0.92, tall: 1.06 },
  CLERK: { body: "#7d7a5c", shirt: "#ecebe2", tie: "#5a2c3a", tieKind: "long", hat: "visor", hair: "slick", hairCol: "#2a2422", tash: "pencil", tashCol: "#2a2422", wide: 0.9, tall: 1.04, skin: "#eef0f6" },
  BOSS: { body: "#5a2a38", stripes: "rgba(255,240,230,0.13)", shirt: "#efeee8", tie: "#c9a43a", tieKind: "long", chain: true, buttons: "#d9b44a", hat: "bowler", hatCol: "#22202a", tash: "handlebar", tashCol: "#1e1a1a", wide: 1.3, tall: 0.98, skin: "#eef0f6" },
  KIDA: { body: "#c8453c", shirt: "#f4f1e8", hair: "mop", hairCol: "#5a3b2a", wide: 0.95, tall: 0.82, buttons: "#f4f1e8" },
  KIDB: { body: "#3f8a5a", hat: "cap", hatCol: "#e0a83a", hatCol2: "#c58e2a", wide: 0.95, tall: 0.82, buttons: "#e8e2c8" },
  FARMER: { body: "#4f6f8a", shirt: "#ece6d6", hair: "tufts", hairCol: "#d0cdc4", suspenders: "#7a4a2a", tash: "walrus", tashCol: "#d6d2c8", wide: 1.12, tall: 0.95, glasses: true },
  WIFE: { body: "#a0506a", shirt: "#f2e8e0", hair: "mop", hairCol: "#dcdad6", wide: 1.0, tall: 0.98, glasses: true, buttons: "#f2e8e0" },
};
export const CAST = Object.keys(L);
const EX: Expr[] = ["smug", "grin", "sneaky", "proud", "happy", "grin", "neutral", "happy"];
export const AYCast: React.FC = () => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null), name = CAST[Math.min(f, CAST.length - 1)];
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!; g.clearRect(0, 0, 600, 900);
    const gr = g.createRadialGradient(300, 380, 40, 300, 420, 520); gr.addColorStop(0, "#2a2440"); gr.addColorStop(1, "#12101c"); g.fillStyle = gr; g.fillRect(0, 0, 600, 900);
    const D = name.startsWith("KID") ? 190 : 200;
    drawChar(g, L[name], { x: 300, y: 860, D, armL: { hand: [0.12, 0.95] }, armR: { hand: [0.12, 0.95] }, expr: EX[CAST.indexOf(name)], facing: 0, look: [0, 0] }, 0);
  });
  return <AbsoluteFill style={{ background: "#12101c" }}><canvas ref={ref} width={600} height={900} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
