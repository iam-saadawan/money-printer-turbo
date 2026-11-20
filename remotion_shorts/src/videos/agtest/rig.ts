// Ricks-style character rig, drawn fresh every frame on the full-resolution canvas (never a cached texture, never blurred).
// Construction (measured from the study): round white head with a thin black line, a tall rounded "bottle" body that
// carries all the clothing detail, thin black stick arms + legs, small white round hands, black shoes.
// Units: D = head diameter in px. Ground point (x, y) = between the feet.
export type V2 = [number, number];
export type Expr = "neutral" | "smug" | "happy" | "grin" | "focus" | "shock" | "worried" | "angry" | "sneaky" | "whistle" | "proud";
export type HandK = "open" | "point" | "thumb" | "fist" | "pencil" | "cigar" | "wave";
export type Look = {
  skin?: string; body: string; body2?: string; shirt?: string; tie?: string; tieKind?: "bow" | "long";
  vest?: string; buttons?: string; belt?: string; stripes?: string; chain?: boolean; suspenders?: string;
  hat?: "none" | "cap" | "bowler" | "visor"; hatCol?: string; hatCol2?: string;
  hair?: "none" | "tufts" | "slick" | "mop"; hairCol?: string; glasses?: boolean; tash?: "walrus" | "handlebar" | "pencil"; tashCol?: string;
  shoe?: string; wide?: number; tall?: number; earPencil?: boolean;
};
export type Arm = { hand: V2; k?: HandK; rot?: number };
export type Pose = {
  x: number; y: number; D: number;
  facing?: number;          // -1 .. 1: turns face + front detail
  lean?: number;            // deg, upper body about the hips
  bob?: number;             // px up
  squash?: number;          // 1 = normal, >1 taller/thinner
  tilt?: number;            // head tilt deg
  nod?: number;             // head drop px (D units)
  armL: Arm; armR: Arm;     // hand target relative to the shoulder, in D units (+x = outward for each side, +y = down)
  walk?: number;            // walk phase (undefined = standing)
  stance?: number;          // feet spread (D units)
  expr?: Expr; mouth?: number; look?: V2; blink?: number; faceCol?: string; tongue?: boolean;
  sweat?: number; glint?: number;
};

const INK = "#151316";
const rad = (d: number) => (d * Math.PI) / 180;
export const mixc = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

/** two-bone IK: shoulder S to target T, elbow bends outward/down on side s */
const ik = (S: V2, T: V2, l1: number, l2: number, s: number): [V2, V2] => {
  let dx = T[0] - S[0], dy = T[1] - S[1];
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.995;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
  const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  // two elbow solutions: keep the one that sits outward + down (natural, never folded across the chest)
  const E1: V2 = [S[0] + Math.cos(a + c) * l1, S[1] + Math.sin(a + c) * l1], E2: V2 = [S[0] + Math.cos(a - c) * l1, S[1] + Math.sin(a - c) * l1];
  const sc = (E: V2) => s * (E[0] - S[0]) + 0.6 * (E[1] - S[1]);
  return [sc(E1) >= sc(E2) ? E1 : E2, [S[0] + dx, S[1] + dy]];
};

const bodyPath = (g: CanvasRenderingContext2D, cx: number, top: number, bot: number, tw: number, bw: number, D: number) => {
  const rt = Math.min(tw * 0.5, 0.3 * D), rb = 0.11 * D, bul = 0.05 * D;
  g.beginPath();
  g.moveTo(cx - tw / 2 + rt, top);
  g.lineTo(cx + tw / 2 - rt, top);
  g.quadraticCurveTo(cx + tw / 2, top, cx + tw / 2, top + rt);
  g.quadraticCurveTo(cx + bw / 2 + bul, (top + bot) / 2 + 0.2 * D, cx + bw / 2, bot - rb);
  g.quadraticCurveTo(cx + bw / 2, bot, cx + bw / 2 - rb, bot);
  g.lineTo(cx - bw / 2 + rb, bot);
  g.quadraticCurveTo(cx - bw / 2, bot, cx - bw / 2, bot - rb);
  g.quadraticCurveTo(cx - bw / 2 - bul, (top + bot) / 2 + 0.2 * D, cx - tw / 2, top + rt);
  g.quadraticCurveTo(cx - tw / 2, top, cx - tw / 2 + rt, top);
  g.closePath();
};

const limb = (g: CanvasRenderingContext2D, a: V2, m: V2, b: V2, w: number) => {
  // soft rubber-hose bend through m
  const c: V2 = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  g.strokeStyle = INK; g.lineWidth = w; g.lineCap = "round"; g.stroke();
};

const ell = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0, rot = 0) => {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
};

const pencil = (g: CanvasRenderingContext2D, x: number, y: number, D: number, ang: number) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  const L = 0.42 * D, w = 0.055 * D, lw = 0.016 * D;
  g.beginPath(); g.rect(-w / 2, -L * 0.75, w, L * 0.75); g.fillStyle = "#e8b83a"; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.rect(-w / 2, -L * 0.85, w, L * 0.1); g.fillStyle = "#d98a8a"; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(0, L * 0.2); g.closePath(); g.fillStyle = "#f1d7a8"; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-w * 0.18, L * 0.14); g.lineTo(w * 0.18, L * 0.14); g.lineTo(0, L * 0.2); g.closePath(); g.fillStyle = INK; g.fill();
  g.restore();
};

const cigar = (g: CanvasRenderingContext2D, x: number, y: number, D: number, ang: number, t: number) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  const L = 0.32 * D, w = 0.07 * D;
  g.beginPath(); g.roundRect(-L * 0.1, -w / 2, L, w, w / 2); g.fillStyle = "#6b4228"; g.fill(); g.lineWidth = 0.016 * D; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.rect(L * 0.12, -w / 2, L * 0.12, w); g.fillStyle = "#c9a23a"; g.fill(); g.stroke();
  ell(g, L * 0.9, 0, w * 0.18, w * 0.42, "#ff8a3a");
  g.restore();
  // smoke curl
  g.save(); g.globalAlpha = 0.5; g.strokeStyle = "#e8e6ee"; g.lineWidth = 0.025 * D; g.lineCap = "round";
  const ex = x + Math.cos(ang) * L * 0.9, ey = y + Math.sin(ang) * L * 0.9;
  g.beginPath(); g.moveTo(ex, ey);
  for (let i = 1; i <= 12; i++) g.lineTo(ex + Math.sin(i * 0.7 + t * 3) * 0.04 * D * (i / 6), ey - i * 0.035 * D);
  g.stroke(); g.restore();
};

const hand = (g: CanvasRenderingContext2D, H: V2, E: V2, D: number, k: HandK, s: number, t: number, rot = 0) => {
  const r = 0.068 * D, lw = 0.022 * D, skin = "#fbfaf6";
  const ang = Math.atan2(H[1] - E[1], H[0] - E[0]);
  if (k === "pencil") pencil(g, H[0] + Math.cos(ang) * r * 0.2, H[1] + Math.sin(ang) * r * 0.2, D, rad(-25 * s) + rot);
  if (k === "cigar") cigar(g, H[0], H[1] - r * 0.3, D, rad(s > 0 ? -20 : 200) + rot, t);
  if (k === "point" || k === "thumb" || k === "wave") {
    // finger/thumb stub: point = along the forearm; thumb = up; wave = spread fingers
    const fa = k === "point" ? ang : k === "thumb" ? rad(-90) + rot : ang;
    const n = k === "wave" ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const a2 = fa + (n > 1 ? (i - 1) * 0.45 : 0);
      g.beginPath(); g.moveTo(H[0], H[1]); g.lineTo(H[0] + Math.cos(a2) * r * 2.0, H[1] + Math.sin(a2) * r * 2.0);
      g.strokeStyle = INK; g.lineWidth = r * 0.95 + lw * 2; g.lineCap = "round"; g.stroke();
      g.strokeStyle = skin; g.lineWidth = r * 0.95; g.stroke();
    }
  }
  ell(g, H[0], H[1], r, r, skin, lw);
  if (k === "fist") { g.beginPath(); g.moveTo(H[0] - r * 0.4, H[1] - r * 0.2); g.lineTo(H[0] + r * 0.4, H[1] - r * 0.2); g.strokeStyle = INK; g.lineWidth = lw * 0.8; g.stroke(); }
};

// ---------------- face ----------------
const BROWS: Record<Expr, [number, number, number]> = { // [angle deg (+ = inner end down), raise (D), asym]
  neutral: [0, 0, 0], smug: [6, 0.0, 1], happy: [-6, 0.02, 0], grin: [-4, 0.02, 0], focus: [14, -0.01, 0], shock: [-14, 0.06, 0],
  worried: [-18, 0.03, 0], angry: [24, -0.02, 0], sneaky: [12, -0.01, 1], whistle: [-10, 0.04, 0], proud: [-8, 0.03, 0],
};
const face = (g: CanvasRenderingContext2D, L: Look, p: Pose, D: number, t: number) => {
  const e = p.expr ?? "neutral", fac = p.facing ?? 0, lk = p.look ?? [0, 0];
  const fx = fac * 0.12 * D, ex = 0.13 * D, ey = -0.02 * D, lw = 0.026 * D;
  const blink = p.blink ?? 0;
  // eyes
  for (const s of [-1, 1]) {
    const x = fx + s * ex * (1 - 0.25 * Math.abs(fac) * (s === Math.sign(fac) ? 1 : 0)), y = ey;
    const px = lk[0] * 0.035 * D, py = lk[1] * 0.03 * D;
    if (blink > 0.7) { g.beginPath(); g.moveTo(x - 0.05 * D, y); g.lineTo(x + 0.05 * D, y); g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = "round"; g.stroke(); continue; }
    if (e === "shock") {
      ell(g, x, y, 0.085 * D, 0.095 * D * (1 - blink), "#ffffff", lw * 0.8);
      ell(g, x + px, y + py, 0.03 * D, 0.034 * D * (1 - blink), INK);
    } else if (e === "happy" || e === "grin" && false) {
      g.beginPath(); g.arc(x, y + 0.02 * D, 0.05 * D, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = INK; g.lineWidth = lw * 1.1; g.lineCap = "round"; g.stroke();
    } else {
      const ry = 0.064 * D * (1 - blink);
      ell(g, x + px, y + py, 0.044 * D, ry, INK);
      if (e === "smug" || e === "sneaky" || e === "focus") {
        // heavy upper lid: flat line through the top of the eye
        const ly = y + py - ry * (e === "focus" ? 0.1 : 0.25);
        g.save(); g.beginPath(); g.rect(x + px - 0.07 * D, ly - 0.1 * D, 0.14 * D, 0.1 * D); g.fillStyle = p.faceCol ?? L.skin ?? "#fbfaf6"; g.fill(); g.restore();
        g.beginPath(); g.moveTo(x + px - 0.06 * D, ly); g.lineTo(x + px + 0.06 * D, ly); g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = "round"; g.stroke();
      }
    }
  }
  // brows
  const [ba, br, asym] = BROWS[e];
  for (const s of [-1, 1]) {
    const x = fx + s * ex, y = ey - 0.13 * D - br * D - (asym && s > 0 ? 0.035 * D : 0);
    const a = rad(ba) * s * (asym && s > 0 ? -0.6 : 1);
    const h = 0.065 * D;
    g.beginPath(); g.moveTo(x - Math.cos(a) * h, y - Math.sin(a) * h); g.lineTo(x + Math.cos(a) * h, y + Math.sin(a) * h);
    g.strokeStyle = INK; g.lineWidth = 0.034 * D; g.lineCap = "round"; g.stroke();
  }
  // glasses
  if (L.glasses) {
    for (const s of [-1, 1]) ell(g, fx + s * ex, ey, 0.092 * D, 0.088 * D, null, 0.016 * D);
    g.beginPath(); g.moveTo(fx - ex + 0.092 * D, ey); g.lineTo(fx + ex - 0.092 * D, ey); g.strokeStyle = INK; g.lineWidth = 0.016 * D; g.stroke();
    if (p.glint) { g.save(); g.globalAlpha = p.glint; g.fillStyle = "#ffffff"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * ex - 0.03 * D, ey - 0.03 * D, 0.035 * D, 0.06 * D, 0.6, 0, Math.PI * 2); g.fill(); } g.restore(); }
  }
  // mouth
  const mx = fx * 1.1, my = 0.17 * D, m = Math.max(0, Math.min(1, p.mouth ?? 0));
  g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = lw;
  const openMouth = (w: number, h: number) => {
    g.beginPath(); g.ellipse(mx, my + h * 0.3, w, h, 0, 0, Math.PI * 2); g.fillStyle = "#4a1820"; g.fill(); g.stroke();
    g.save(); g.clip(); ell(g, mx, my + h * 1.05, w * 0.6, h * 0.55, "#e0707a"); g.restore();
  };
  if (m > 0.05) openMouth(0.055 * D + 0.02 * D * m, 0.012 * D + 0.07 * D * m);
  else if (e === "grin" || e === "proud") {
    g.beginPath(); g.moveTo(mx - 0.1 * D, my - 0.01 * D); g.quadraticCurveTo(mx, my + 0.02 * D, mx + 0.1 * D, my - 0.01 * D);
    g.quadraticCurveTo(mx, my + 0.13 * D, mx - 0.1 * D, my - 0.01 * D); g.closePath(); g.fillStyle = "#ffffff"; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(mx - 0.085 * D, my + 0.02 * D); g.quadraticCurveTo(mx, my + 0.045 * D, mx + 0.085 * D, my + 0.02 * D); g.lineWidth = lw * 0.6; g.stroke();
  } else if (e === "happy") { g.beginPath(); g.arc(mx, my - 0.03 * D, 0.07 * D, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
  else if (e === "smug" || e === "sneaky") { g.beginPath(); g.moveTo(mx - 0.06 * D, my + 0.01 * D); g.quadraticCurveTo(mx + 0.02 * D, my + 0.025 * D, mx + 0.075 * D, my - 0.02 * D); g.stroke(); }
  else if (e === "shock") { ell(g, mx, my + 0.01 * D, 0.03 * D, 0.04 * D, "#4a1820", lw); }
  else if (e === "worried") { g.beginPath(); g.moveTo(mx - 0.06 * D, my + 0.02 * D); g.quadraticCurveTo(mx - 0.03 * D, my - 0.01 * D, mx, my + 0.02 * D); g.quadraticCurveTo(mx + 0.03 * D, my + 0.05 * D, mx + 0.06 * D, my + 0.02 * D); g.stroke(); }
  else if (e === "angry") { g.beginPath(); g.rect(mx - 0.08 * D, my - 0.015 * D, 0.16 * D, 0.06 * D); g.fillStyle = "#ffffff"; g.fill(); g.stroke(); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(mx - 0.08 * D + i * 0.04 * D, my - 0.015 * D); g.lineTo(mx - 0.08 * D + i * 0.04 * D, my + 0.045 * D); g.lineWidth = lw * 0.6; g.stroke(); } }
  else if (e === "whistle") { ell(g, mx + 0.03 * D, my + 0.01 * D, 0.022 * D, 0.022 * D, "#4a1820", lw); }
  else if (e === "focus") {
    g.beginPath(); g.moveTo(mx - 0.05 * D, my + 0.01 * D); g.lineTo(mx + 0.05 * D, my + 0.005 * D); g.stroke();
    if (p.tongue) { g.beginPath(); g.ellipse(mx + 0.04 * D, my + 0.03 * D, 0.025 * D, 0.03 * D, 0.3, 0, Math.PI); g.fillStyle = "#e0707a"; g.fill(); g.stroke(); }
  } else { g.beginPath(); g.moveTo(mx - 0.045 * D, my + 0.01 * D); g.quadraticCurveTo(mx, my + 0.02 * D, mx + 0.045 * D, my + 0.01 * D); g.stroke(); }
  // moustache over the mouth
  if (L.tash) {
    const c = L.tashCol ?? "#3a2a20", y = my - 0.05 * D;
    g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 0.016 * D;
    if (L.tash === "walrus") {
      g.beginPath(); g.moveTo(mx, y - 0.02 * D);
      g.bezierCurveTo(mx + 0.07 * D, y - 0.05 * D, mx + 0.15 * D, y + 0.0 * D, mx + 0.13 * D, y + 0.06 * D);
      g.bezierCurveTo(mx + 0.08 * D, y + 0.03 * D, mx + 0.04 * D, y + 0.05 * D, mx, y + 0.03 * D);
      g.bezierCurveTo(mx - 0.04 * D, y + 0.05 * D, mx - 0.08 * D, y + 0.03 * D, mx - 0.13 * D, y + 0.06 * D);
      g.bezierCurveTo(mx - 0.15 * D, y + 0.0 * D, mx - 0.07 * D, y - 0.05 * D, mx, y - 0.02 * D);
      g.closePath(); g.fill(); g.stroke();
    } else if (L.tash === "handlebar") {
      g.beginPath(); g.moveTo(mx, y);
      g.bezierCurveTo(mx + 0.08 * D, y - 0.04 * D, mx + 0.12 * D, y + 0.04 * D, mx + 0.17 * D, y - 0.04 * D);
      g.bezierCurveTo(mx + 0.15 * D, y + 0.05 * D, mx + 0.06 * D, y + 0.05 * D, mx, y + 0.025 * D);
      g.bezierCurveTo(mx - 0.06 * D, y + 0.05 * D, mx - 0.15 * D, y + 0.05 * D, mx - 0.17 * D, y - 0.04 * D);
      g.bezierCurveTo(mx - 0.12 * D, y + 0.04 * D, mx - 0.08 * D, y - 0.04 * D, mx, y);
      g.closePath(); g.fill(); g.stroke();
    } else {
      g.beginPath(); g.moveTo(mx - 0.08 * D, y + 0.02 * D); g.quadraticCurveTo(mx, y - 0.015 * D, mx + 0.08 * D, y + 0.02 * D); g.lineWidth = 0.02 * D; g.strokeStyle = c; g.stroke();
    }
  }
  // sweat drop
  if (p.sweat) {
    g.save(); g.globalAlpha = Math.min(1, p.sweat);
    const sx = 0.33 * D, sy = -0.22 * D + (1 - p.sweat) * -0.05 * D;
    g.beginPath(); g.moveTo(sx, sy - 0.08 * D); g.quadraticCurveTo(sx + 0.05 * D, sy, sx, sy + 0.035 * D); g.quadraticCurveTo(sx - 0.05 * D, sy, sx, sy - 0.08 * D);
    g.fillStyle = "#9fd2ff"; g.fill(); g.lineWidth = 0.014 * D; g.strokeStyle = INK; g.stroke(); g.restore();
  }
};

// ---------------- hats + hair (head local, centre 0,0) ----------------
const hatBack = (g: CanvasRenderingContext2D, L: Look, D: number, fac: number) => {
  const lw = 0.024 * D;
  if (L.hair === "tufts") for (const s of [-1, 1]) {
    const x = s * 0.47 * D, y = 0.0 * D, c = L.hairCol ?? "#d8d6d0";
    g.beginPath(); g.moveTo(x - s * 0.04 * D, y - 0.14 * D);
    g.quadraticCurveTo(x + s * 0.1 * D, y - 0.12 * D, x + s * 0.07 * D, y - 0.03 * D);
    g.quadraticCurveTo(x + s * 0.12 * D, y + 0.03 * D, x + s * 0.05 * D, y + 0.1 * D);
    g.quadraticCurveTo(x, y + 0.06 * D, x - s * 0.04 * D, y + 0.08 * D); g.closePath();
    g.fillStyle = c; g.fill(); g.lineWidth = lw * 0.8; g.strokeStyle = INK; g.stroke();
  }
  void fac;
};
const hatFront = (g: CanvasRenderingContext2D, L: Look, D: number, fac: number) => {
  const lw = 0.026 * D, R = 0.5 * D, c = L.hatCol ?? "#333", c2 = L.hatCol2 ?? mixc(c, "#000000", 0.3);
  g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round";
  if (L.hair === "slick") {
    g.beginPath(); g.arc(0, 0, R, Math.PI * 1.06, Math.PI * 1.94); g.quadraticCurveTo(0.15 * D, -0.36 * D, -0.05 * D + fac * 0.05 * D, -0.25 * D);
    g.quadraticCurveTo(-0.3 * D, -0.3 * D, -R * 0.99, -0.1 * D); g.closePath(); g.fillStyle = L.hairCol ?? "#2a2220"; g.fill(); g.lineWidth = lw; g.stroke();
    g.beginPath(); g.moveTo(-0.1 * D, -0.46 * D); g.quadraticCurveTo(0.05 * D, -0.4 * D, 0.2 * D, -0.43 * D); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 0.02 * D; g.stroke();
  }
  if (L.hat === "cap") { // newsboy cap: soft dome + a brim to the facing side
    g.save();
    g.beginPath(); g.moveTo(-0.53 * D, -0.12 * D);
    g.bezierCurveTo(-0.6 * D, -0.6 * D, 0.55 * D, -0.72 * D, 0.56 * D, -0.14 * D);
    g.quadraticCurveTo(0, -0.24 * D, -0.53 * D, -0.12 * D); g.closePath();
    g.fillStyle = c; g.fill();
    g.clip();
    if (L.hatCol2) { g.strokeStyle = L.hatCol2; g.lineWidth = 0.035 * D; for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * 0.09 * D, -0.8 * D); g.lineTo(i * 0.09 * D + 0.12 * D, 0); g.stroke(); } }
    g.fillStyle = "rgba(0,0,20,0.18)"; g.fillRect(0.1 * D, -0.8 * D, 0.6 * D, 0.8 * D);
    g.restore();
    g.beginPath(); g.moveTo(-0.53 * D, -0.12 * D); g.bezierCurveTo(-0.6 * D, -0.6 * D, 0.55 * D, -0.72 * D, 0.56 * D, -0.14 * D); g.quadraticCurveTo(0, -0.24 * D, -0.53 * D, -0.12 * D); g.closePath();
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    ell(g, 0.02 * D, -0.6 * D, 0.045 * D, 0.03 * D, c2, lw * 0.7);
    const bx = fac * 0.15 * D;
    g.beginPath(); g.ellipse(bx, -0.16 * D, 0.33 * D, 0.07 * D, 0, 0, Math.PI); g.fillStyle = c2; g.fill(); g.lineWidth = lw; g.stroke();
  } else if (L.hat === "bowler") {
    g.beginPath(); g.ellipse(0, -0.36 * D, 0.62 * D, 0.1 * D, 0, 0, Math.PI * 2); g.fillStyle = c2; g.fill(); g.lineWidth = lw; g.stroke();
    g.beginPath(); g.moveTo(-0.4 * D, -0.38 * D); g.bezierCurveTo(-0.42 * D, -0.92 * D, 0.42 * D, -0.92 * D, 0.4 * D, -0.38 * D); g.closePath();
    g.fillStyle = c; g.fill(); g.lineWidth = lw; g.stroke();
    g.save(); g.clip(); g.fillStyle = "#6a2130"; g.fillRect(-0.5 * D, -0.5 * D, D, 0.09 * D); g.fillStyle = "rgba(255,255,255,0.16)"; g.beginPath(); g.ellipse(-0.14 * D, -0.7 * D, 0.1 * D, 0.06 * D, -0.5, 0, Math.PI * 2); g.fill(); g.restore();
    g.beginPath(); g.moveTo(-0.4 * D, -0.38 * D); g.bezierCurveTo(-0.42 * D, -0.92 * D, 0.42 * D, -0.92 * D, 0.4 * D, -0.38 * D); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
  } else if (L.hat === "visor") {
    g.beginPath(); g.moveTo(-0.5 * D, -0.22 * D); g.quadraticCurveTo(0, -0.34 * D, 0.5 * D, -0.22 * D); g.lineWidth = 0.05 * D; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(-0.38 * D + fac * 0.1 * D, -0.27 * D); g.quadraticCurveTo(fac * 0.1 * D, -0.35 * D, 0.38 * D + fac * 0.1 * D, -0.27 * D);
    g.lineTo(0.48 * D + fac * 0.1 * D, -0.13 * D); g.quadraticCurveTo(fac * 0.1 * D, -0.2 * D, -0.48 * D + fac * 0.1 * D, -0.13 * D); g.closePath();
    g.fillStyle = "rgba(60,170,110,0.82)"; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
  }
};

// ---------------- the whole character ----------------
export type Part = "all" | "body" | "arms";
export const drawChar = (g: CanvasRenderingContext2D, L: Look, p: Pose, t: number, part: Part = "all") => {
  const D = p.D, wide = L.wide ?? 1, tallK = (L.tall ?? 1) * (p.squash ?? 1);
  const fac = p.facing ?? 0, lean = p.lean ?? 0;
  const legH = 0.98 * D, bodyH = 1.42 * D * tallK, tw = 0.6 * D * wide / Math.sqrt(p.squash ?? 1), bw = 0.76 * D * wide / Math.sqrt(p.squash ?? 1);
  const gx = p.x, gy = p.y, bob = p.bob ?? 0;
  const hipY = gy - legH - bob, top = hipY - bodyH, cx = gx;
  const lwB = 0.028 * D, lwL = 0.045 * D, lwA = 0.04 * D;
  const shoe = L.shoe ?? "#1d1a1a";
  const showBody = part !== "arms", showArms = part !== "body";
  // ---- contact shadow + legs ----
  if (showBody) {
    g.save(); g.globalAlpha = 0.28; ell(g, gx, gy + 0.02 * D, 0.62 * D * wide, 0.08 * D, "#1a1430"); g.restore();
    const st = p.stance ?? 0.2;
    for (const s of [-1, 1]) {
      const hx = cx + s * 0.15 * D * wide;
      let fx = gx + s * st * D, fy = gy, lift = 0;
      if (p.walk !== undefined) {
        const ph = p.walk * Math.PI * 2 + (s > 0 ? Math.PI : 0);
        fx = gx + s * 0.12 * D + Math.sin(ph) * 0.2 * D;
        lift = Math.max(0, Math.cos(ph)) * 0.13 * D; fy = gy - lift;
      }
      const knee: V2 = [(hx + fx) / 2 + s * 0.025 * D, (hipY + fy) / 2];
      limb(g, [hx, hipY - 0.04 * D], knee, [fx, fy - 0.03 * D], lwL);
      const sx = fx + s * 0.06 * D + fac * 0.05 * D;
      ell(g, sx, fy - 0.035 * D, 0.13 * D, 0.065 * D, shoe, lwB * 0.8, s * 0.12);
      g.save(); g.globalAlpha = 0.25; ell(g, sx - s * 0.02 * D, fy - 0.06 * D, 0.06 * D, 0.02 * D, "#ffffff"); g.restore();
    }
  }
  g.save();
  if (lean) { g.translate(cx, hipY); g.rotate(rad(lean)); g.translate(-cx, -hipY); }
  // shoulders + arm solve (in the leaned frame)
  const shY = top + 0.24 * D;
  const arms = ([[-1, p.armL], [1, p.armR]] as [number, Arm][]).map(([s, a]) => {
    const S: V2 = [cx + s * (tw / 2 - 0.035 * D), shY];
    const T: V2 = [S[0] + s * a.hand[0] * D, S[1] + a.hand[1] * D];
    const [E, H] = ik(S, T, 0.47 * D, 0.45 * D, s);
    return { s, a, S, E, H };
  });
  if (showBody) {
    // ---- body ----
    bodyPath(g, cx, top, hipY, tw, bw, D);
    g.fillStyle = L.body; g.fill();
    g.save(); g.clip();
    const dx = fac * 0.08 * D;
    if (L.stripes) { g.strokeStyle = L.stripes; g.lineWidth = 0.012 * D; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * 0.075 * D + dx, top); g.lineTo(cx + i * 0.075 * D * 1.12 + dx, hipY); g.stroke(); } }
    if (L.vest) { g.fillStyle = L.vest; g.beginPath(); g.roundRect(cx - tw * 0.36 + dx, top + 0.16 * D, tw * 0.72, bodyH * 0.72, 0.06 * D); g.fill(); g.lineWidth = lwB * 0.6; g.strokeStyle = INK; g.stroke(); }
    if (L.suspenders) { g.strokeStyle = L.suspenders; g.lineWidth = 0.05 * D; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 0.2 * D + dx, top); g.lineTo(cx + s * 0.16 * D + dx, hipY); g.stroke(); } }
    if (L.shirt) { // white shirt V under the coat
      g.beginPath(); g.moveTo(cx - 0.17 * D + dx, top - 0.01 * D); g.lineTo(cx + 0.17 * D + dx, top - 0.01 * D); g.lineTo(cx + dx, top + 0.42 * D); g.closePath();
      g.fillStyle = L.shirt; g.fill(); g.lineWidth = lwB * 0.6; g.strokeStyle = INK; g.stroke();
      // lapels
      g.fillStyle = mixc(L.body, "#000000", 0.18);
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 0.17 * D + dx, top); g.lineTo(cx + s * 0.05 * D + dx, top + 0.3 * D); g.lineTo(cx + s * 0.24 * D + dx, top + 0.12 * D); g.closePath(); g.fill(); g.stroke(); }
    }
    if (L.tie) {
      if (L.tieKind === "long") { g.beginPath(); g.moveTo(cx - 0.035 * D + dx, top + 0.05 * D); g.lineTo(cx + 0.035 * D + dx, top + 0.05 * D); g.lineTo(cx + 0.05 * D + dx, top + 0.34 * D); g.lineTo(cx + dx, top + 0.4 * D); g.lineTo(cx - 0.05 * D + dx, top + 0.34 * D); g.closePath(); }
      else { g.beginPath(); g.moveTo(cx + dx, top + 0.07 * D); g.lineTo(cx - 0.1 * D + dx, top + 0.02 * D); g.lineTo(cx - 0.1 * D + dx, top + 0.13 * D); g.closePath(); g.moveTo(cx + dx, top + 0.07 * D); g.lineTo(cx + 0.1 * D + dx, top + 0.02 * D); g.lineTo(cx + 0.1 * D + dx, top + 0.13 * D); g.closePath(); }
      g.fillStyle = L.tie; g.fill(); g.lineWidth = lwB * 0.6; g.strokeStyle = INK; g.stroke();
    }
    if (L.belt) {
      const by = hipY - 0.26 * D;
      g.fillStyle = L.belt; g.fillRect(cx - D, by, 2 * D, 0.085 * D); g.lineWidth = lwB * 0.6; g.strokeStyle = INK; g.strokeRect(cx - D, by, 2 * D, 0.085 * D);
      g.beginPath(); g.rect(cx - 0.05 * D + dx, by - 0.008 * D, 0.1 * D, 0.1 * D); g.fillStyle = "#d9b44a"; g.fill(); g.stroke();
    }
    if (L.buttons) for (let i = 0; i < 4; i++) { const y = top + 0.5 * D + i * 0.2 * D; if (y > hipY - 0.12 * D) break; ell(g, cx + dx + (L.shirt ? 0 : 0), y, 0.028 * D, 0.028 * D, L.buttons, 0.012 * D); }
    if (L.chain) { g.beginPath(); g.moveTo(cx + 0.03 * D + dx, hipY - 0.62 * D); g.quadraticCurveTo(cx + 0.1 * D + dx, hipY - 0.42 * D, cx + 0.27 * D + dx, hipY - 0.5 * D); g.strokeStyle = "#e1bd4a"; g.lineWidth = 0.022 * D; g.setLineDash([0.02 * D, 0.014 * D]); g.stroke(); g.setLineDash([]); }
    // soft form shading: light from upper left, cool shade on the right + bottom
    const gr = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    gr.addColorStop(0, "rgba(255,248,230,0.10)"); gr.addColorStop(0.45, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,24,60,0.30)");
    g.fillStyle = gr; g.fillRect(cx - D, top - D, 2 * D, bodyH + 2 * D);
    g.restore();
    bodyPath(g, cx, top, hipY, tw, bw, D);
    g.lineWidth = lwB; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke();
    // ---- head ----
    const hy = top - 0.42 * D + (p.nod ?? 0) * D;
    g.save();
    g.translate(cx, hy); g.rotate(rad(p.tilt ?? 0));
    hatBack(g, L, D, fac);
    const skin = p.faceCol ?? L.skin ?? "#fbfaf6";
    g.beginPath(); g.arc(0, 0, 0.5 * D, 0, Math.PI * 2);
    const rg = g.createRadialGradient(-0.16 * D, -0.2 * D, 0.05 * D, 0, 0, 0.56 * D);
    rg.addColorStop(0, skin); rg.addColorStop(0.62, skin); rg.addColorStop(1, mixc(skin, "#8a90b8", 0.28));
    g.fillStyle = rg; g.fill(); g.lineWidth = lwB; g.strokeStyle = INK; g.stroke();
    if (L.earPencil) pencil(g, 0.5 * D, -0.05 * D, D * 0.8, rad(-70));
    face(g, L, p, D, t);
    hatFront(g, L, D, fac);
    g.restore();
  }
  if (showArms) for (const A of arms) {
    limb(g, A.S, A.E, A.H, lwA);
    hand(g, A.H, A.E, D, A.a.k ?? "open", A.s, t, A.a.rot ?? 0);
  }
  g.restore();
};

/** steam puffs either side of the head (anger) */
export const steam = (g: CanvasRenderingContext2D, x: number, y: number, D: number, t: number, k: number) => {
  if (k <= 0) return;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const u = ((t * 1.6 + i / 3) % 1), px = x + s * (0.55 + u * 0.35) * D, py = y - (0.1 + u * 0.4) * D, r = (0.06 + u * 0.1) * D;
    g.save(); g.globalAlpha = k * (1 - u); ell(g, px, py, r, r, "#ffffff", 0.014 * D); g.restore();
  }
};
/** 4-point sparkle */
export const sparkle = (g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) => {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(x, y);
  g.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.22 : r, an = (i * Math.PI) / 4; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  g.closePath(); g.fillStyle = "#fff6c8"; g.fill(); g.lineWidth = r * 0.08; g.strokeStyle = INK; g.stroke(); g.restore();
};
