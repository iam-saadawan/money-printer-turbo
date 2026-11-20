// THE FAKE TOWN THAT BECAME REAL — one three.js world posed per frame from agloestory.ts. Six sets far apart:
// the 1920s drafting office, the rival map company, the map desk (inserts), the Catskill crossroads with the
// fishing lodge, the night classroom (the explanation) and the farmhouse kitchen. Dense set dressing on purpose:
// every frame should have something to look at, and something moving (dust in the light shafts, smoke, birds,
// blinks, head sways, flapping mouths).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Pen, bodyFront, bodySide, fxPuff, fxStars, fxBurst, fxContact, fxRing, Expr, INK } from "./toon";
import { Actor, Fx, Pool } from "./cast";
import { lam, kitClone, Kit, Batch, boxGeo, V } from "./build";
import { TONE, CHAR, untone } from "./shade";
import { LIGHTS, LOOK } from "./lights";
import { NOINK } from "./ink";
import { ctex, stoneHD, planksHD, grassHD, roofHD, facadeHD, cloudHD, rng } from "./paint";
import { SHOTS, EV, V3, O, ORG, CAMS, Set, OTTO_T, ERN_T, LIGHTTAB, BOSS, MAP_Y, MAP_W, MAP_H, MAP_X, LODGE, SIGN, smooth, clamp01, spring, easeOut } from "./agloestory";
import { stage, camFinal, hh } from "./agloestage";

// ---------------- kit ----------------
const KIT: [string, string][] = [
  ["bridge/kenney", "tree_default"], ["bridge/kenney", "tree_oak"], ["bridge/kenney", "tree_cone"], ["bridge/kenney", "tree_detailed"], ["bridge/kenney", "tree_fat"],
  ["bridge/kenney", "lantern"], ["bridge/kenney", "canoe"], ["bridge/kenney", "plant_bushDetailed"],
  ["kenney/furniture-kit", "bookcaseOpen"], ["kenney/furniture-kit", "bookcaseClosedWide"], ["kenney/furniture-kit", "books"], ["kenney/furniture-kit", "desk"],
  ["kenney/furniture-kit", "chairDesk"], ["kenney/furniture-kit", "chair"], ["kenney/furniture-kit", "coatRackStanding"], ["kenney/furniture-kit", "rugRectangle"],
  ["kenney/furniture-kit", "pottedPlant"], ["kenney/furniture-kit", "kitchenStove"], ["kenney/furniture-kit", "kitchenCabinetUpper"], ["kenney/furniture-kit", "kitchenCabinet"],
  ["kenney/furniture-kit", "radio"], ["kenney/furniture-kit", "lampRoundFloor"], ["kenney/furniture-kit", "cardboardBoxClosed"], ["kenney/furniture-kit", "sideTable"],
  ["kenney/nature-kit", "fence_simple"], ["kenney/nature-kit", "rock_largeA"], ["kenney/nature-kit", "rock_smallB"], ["kenney/nature-kit", "stump_round"], ["kenney/nature-kit", "log_large"],
];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KIT.map(([d, n]) => loader.loadAsync(staticFile(`${d}/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- painted textures ----------------
const MAP_PX = 2048, MAP_PY = Math.round(2048 * MAP_H / MAP_W);
/** map pixel for a set-relative desk position */
const mapPx = (x: number, z: number): [number, number] => [((x + MAP_W / 2) / MAP_W) * MAP_PX, ((z + MAP_H / 2) / MAP_H) * MAP_PY];
const CX = mapPx(MAP_X[0], MAP_X[2]);
const roadMap = (key: string, o: { paper: string; title: string; agloe: boolean; circle?: boolean }) => ctex(key, MAP_PX, MAP_PY, (g, r) => {
  g.fillStyle = o.paper; g.fillRect(0, 0, MAP_PX, MAP_PY);
  for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,90,40,0.035)" : "rgba(255,255,255,0.05)"; g.beginPath(); g.arc(r() * MAP_PX, r() * MAP_PY, 6 + r() * 30, 0, 6.3); g.fill(); }
  // hills: soft green relief blobs + brown contour rings
  const R2 = rng(7);
  for (let i = 0; i < 46; i++) {
    const x = R2() * MAP_PX, y = R2() * MAP_PY, rr = 60 + R2() * 170;
    if (Math.hypot(x - CX[0], y - CX[1]) < 90) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(120,160,90,0.32)"); gr.addColorStop(1, "rgba(120,160,90,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(150,110,60,0.35)"; g.lineWidth = 2.5;
    for (let c = 0.35; c < 1; c += 0.22) { g.beginPath(); g.ellipse(x, y, rr * c, rr * c * (0.7 + R2() * 0.3), R2() * 3, 0, 6.3); g.stroke(); }
  }
  // forest symbols
  for (let i = 0; i < 260; i++) {
    const x = R2() * MAP_PX, y = R2() * MAP_PY; if (Math.hypot(x - CX[0], y - CX[1]) < 120) continue;
    g.fillStyle = "rgba(70,120,70,0.55)"; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x - 8, y + 6); g.lineTo(x + 8, y + 6); g.fill();
  }
  // lakes + the river
  g.fillStyle = "#8fbfe0"; g.strokeStyle = "#3f7fb8"; g.lineWidth = 4;
  for (const [x, y, a, b] of [[300, 260, 110, 60], [1680, 1060, 140, 70], [820, 1100, 70, 40]]) { g.beginPath(); g.ellipse(x, y, a, b, 0.4, 0, 6.3); g.fill(); g.stroke(); }
  g.strokeStyle = "#3f7fd0"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(-20, 980);
  g.bezierCurveTo(400, 900, 600, 1180, 980, 1020); g.bezierCurveTo(1300, 880, 1500, 1200, 2070, 1150); g.stroke();
  // county roads (thin black), the highway NY 206 (red, double-cased) through the crossroads, a dirt road crossing it
  g.strokeStyle = "#3a3026"; g.lineWidth = 5;
  for (let i = 0; i < 14; i++) { g.beginPath(); const x0 = R2() * MAP_PX, y0 = R2() * MAP_PY; g.moveTo(x0, y0); g.quadraticCurveTo(R2() * MAP_PX, R2() * MAP_PY, R2() * MAP_PX, R2() * MAP_PY); g.stroke(); }
  g.strokeStyle = "#2a1e16"; g.lineWidth = 26; g.beginPath(); g.moveTo(-20, 420); g.bezierCurveTo(500, 520, 900, 780, CX[0], CX[1]); g.bezierCurveTo(1500, 720, 1800, 560, 2070, 600); g.stroke();
  g.strokeStyle = "#d8402e"; g.lineWidth = 16; g.stroke();
  g.strokeStyle = "#5a4636"; g.lineWidth = 8; g.setLineDash([22, 12]); g.beginPath(); g.moveTo(CX[0] - 60, -20); g.bezierCurveTo(CX[0] - 40, 300, CX[0] + 20, 500, CX[0], CX[1]); g.bezierCurveTo(CX[0] - 20, 1000, CX[0] + 60, 1200, CX[0] + 30, MAP_PY + 20); g.stroke(); g.setLineDash([]);
  // shield "206"
  g.fillStyle = "#f7f1e2"; g.strokeStyle = "#2a1e16"; g.lineWidth = 4; g.beginPath(); g.arc(760, 690, 30, 0, 6.3); g.fill(); g.stroke();
  g.fillStyle = "#2a1e16"; g.font = "bold 28px serif"; g.textAlign = "center"; g.fillText("206", 760, 700);
  // towns: dot + name
  const towns: [string, number, number][] = [["ROSCOE", 980, 1300], ["DOWNSVILLE", 520, 330], ["WALTON", 1500, 210], ["HANCOCK", 220, 1130], ["LIVINGSTON MANOR", 1560, 1290], ["COLCHESTER", 1780, 760], ["MARGARETVILLE", 1180, 160]];
  for (const [n, x, y] of towns) { g.fillStyle = "#2a1e16"; g.beginPath(); g.arc(x, y, 11, 0, 6.3); g.fill(); g.font = "bold 34px serif"; g.textAlign = "left"; g.fillText(n, x + 18, y + 11); }
  if (o.agloe) { g.fillStyle = "#2a1e16"; g.beginPath(); g.arc(CX[0], CX[1], 11, 0, 6.3); g.fill(); g.font = "italic bold 36px serif"; g.textAlign = "left"; g.fillText("Agloe", CX[0] + 18, CX[1] - 16); }
  if (o.circle) { g.strokeStyle = "#d8202e"; g.lineWidth = 10; g.beginPath(); g.ellipse(CX[0] + 60, CX[1] - 26, 120, 58, -0.1, 0, 6.3); g.stroke(); }
  // title cartouche, compass rose, border, grid
  g.fillStyle = "rgba(255,250,235,0.9)"; g.fillRect(60, MAP_PY - 230, 640, 170); g.strokeStyle = "#2a1e16"; g.lineWidth = 6; g.strokeRect(60, MAP_PY - 230, 640, 170);
  g.fillStyle = "#2a1e16"; g.font = "bold 58px serif"; g.textAlign = "center"; g.fillText(o.title, 380, MAP_PY - 150); g.font = "bold 30px serif"; g.fillText("ROAD MAP  ·  CATSKILL MOUNTAINS", 380, MAP_PY - 100);
  const rx = MAP_PX - 200, ry = 200; g.fillStyle = "#c0353a"; g.beginPath(); g.moveTo(rx, ry - 110); g.lineTo(rx + 26, ry); g.lineTo(rx, ry + 110); g.lineTo(rx - 26, ry); g.fill();
  g.fillStyle = "#2a1e16"; g.beginPath(); g.moveTo(rx - 110, ry); g.lineTo(rx, ry + 26); g.lineTo(rx + 110, ry); g.lineTo(rx, ry - 26); g.fill(); g.font = "bold 40px serif"; g.fillText("N", rx, ry - 124);
  g.strokeStyle = "rgba(60,40,20,0.18)"; g.lineWidth = 2; for (let x = 0; x < MAP_PX; x += 256) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MAP_PY); g.stroke(); } for (let y = 0; y < MAP_PY; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(MAP_PX, y); g.stroke(); }
  g.strokeStyle = "#2a1e16"; g.lineWidth = 14; g.strokeRect(14, 14, MAP_PX - 28, MAP_PY - 28); g.lineWidth = 4; g.strokeRect(36, 36, MAP_PX - 72, MAP_PY - 72);
});
const plaster = (key: string, col: string, wain: string, stripes = false) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 1024, 1024);
  if (stripes) for (let x = 0; x < 1024; x += 64) { g.fillStyle = "rgba(255,255,255,0.07)"; g.fillRect(x, 0, 24, 700); }
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; g.beginPath(); g.arc(r() * 1024, r() * 1024, 4 + r() * 18, 0, 6.3); g.fill(); }
  g.fillStyle = wain; g.fillRect(0, 700, 1024, 324);
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < 1024; x += 128) g.fillRect(x, 700, 5, 324);
  g.fillStyle = "rgba(255,255,255,0.08)"; for (let x = 0; x < 1024; x += 128) g.fillRect(x + 12, 740, 100, 250);
  g.fillStyle = "#3e2616"; g.fillRect(0, 690, 1024, 16); g.fillRect(0, 1004, 1024, 20);
});
const panel = (key: string, col: string) => ctex(key, 1024, 1024, (g, r) => { // dark wood paneling
  g.fillStyle = col; g.fillRect(0, 0, 1024, 1024);
  for (let x = 0; x < 1024; x += 170) { g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x, 0, 8, 1024); g.fillStyle = "rgba(255,220,170,0.06)"; g.fillRect(x + 16, 60, 138, 560); g.fillRect(x + 16, 680, 138, 300); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 4; g.strokeRect(x + 16, 60, 138, 560); g.strokeRect(x + 16, 680, 138, 300); }
  for (let i = 0; i < 500; i++) { g.strokeStyle = "rgba(0,0,0,0.06)"; g.lineWidth = 2; const x = r() * 1024; g.beginPath(); g.moveTo(x, r() * 1024); g.lineTo(x + r() * 6, r() * 1024); g.stroke(); }
});
const logTex = () => ctex("logBark", 512, 256, (g, r) => {
  g.fillStyle = "#8a5a36"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 140; i++) { g.strokeStyle = r() < 0.5 ? "rgba(60,30,15,0.5)" : "rgba(200,150,100,0.25)"; g.lineWidth = 2 + r() * 4; const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 20 - 10, 340, y + r() * 20 - 10, 512, y + r() * 10 - 5); g.stroke(); }
  g.fillStyle = "rgba(40,20,10,0.5)"; g.fillRect(0, 0, 512, 18); g.fillRect(0, 238, 512, 18);
});
const signBoard = (key: string, txt: string, sub = "", w = 1024, h = 256, bg = "#5a3a22", fg = "#f3e2b8") => ctex(key, w, h, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 2; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + r() * 8); g.stroke(); }
  g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32);
  g.fillStyle = fg; g.textAlign = "center"; g.font = `bold ${Math.round(h * (sub ? 0.42 : 0.55))}px serif`; g.fillText(txt, w / 2, sub ? h * 0.55 : h * 0.68);
  if (sub) { g.font = `bold ${Math.round(h * 0.18)}px serif`; g.fillText(sub, w / 2, h * 0.84); }
});
const cityBackdrop = () => ctex("cityBack", 2048, 1024, (g, r) => { // 1920s New York through the office windows
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#6fa2dc"); gr.addColorStop(1, "#d8e6f4"); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 40; i++) {
    const x = i * 56 + r() * 30, w = 70 + r() * 120, h = 260 + r() * 640, cols = ["#c9a27a", "#b88a66", "#d8c0a0", "#a8826a", "#cdb38f"];
    g.fillStyle = cols[i % 5]; g.fillRect(x, 1024 - h, w, h); g.strokeStyle = "#2a1e16"; g.lineWidth = 4; g.strokeRect(x, 1024 - h, w, h);
    g.fillStyle = "rgba(40,50,70,0.55)"; for (let yy = 1024 - h + 20; yy < 1000; yy += 34) for (let xx = x + 10; xx < x + w - 14; xx += 22) g.fillRect(xx, yy, 12, 18);
    if (r() < 0.25) { g.fillStyle = cols[(i + 2) % 5]; g.beginPath(); g.moveTo(x + w * 0.2, 1024 - h); g.lineTo(x + w / 2, 1024 - h - 90); g.lineTo(x + w * 0.8, 1024 - h); g.fill(); g.stroke(); }
    if (r() < 0.3) { g.fillStyle = "#6a4a3a"; g.fillRect(x + w * 0.6, 1024 - h - 40, 18, 40); }
  }
});
const blackboard = () => ctex("blackboardA", 1024, 512, (g) => {
  g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#24332c"; g.fillRect(24, 24, 976, 464);
  g.fillStyle = "rgba(240,240,230,0.85)"; g.font = "bold 58px serif"; g.fillText("Spelling test", 70, 110); g.font = "bold 44px serif";
  ["1. bridge", "2. river", "3. mountain", "4. village"].forEach((t, i) => g.fillText(t, 90, 190 + i * 70)); g.fillText("No copying!", 620, 330);
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 5; g.beginPath(); g.moveTo(620, 345); g.lineTo(890, 345); g.stroke();
});
const homework = (key: string, glow: boolean) => ctex(key, 512, 640, (g) => {
  g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "#9ab8e0"; g.lineWidth = 3;
  for (let y = 90; y < 640; y += 56) { g.beginPath(); g.moveTo(20, y); g.lineTo(492, y); g.stroke(); }
  g.strokeStyle = "#e08a8a"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, 640); g.stroke();
  g.fillStyle = "#2a3a6a"; g.font = "italic bold 40px serif";
  ["bridge", "river", "mountain", "zorble", "village"].forEach((t, i) => {
    if (t === "zorble" && glow) { g.fillStyle = "#ffe25a"; g.fillRect(84, 136 + i * 56 + 10, 190, 50); g.fillStyle = "#2a3a6a"; }
    g.fillText(`${i + 1}. ${t}`, 90, 176 + i * 56);
  });
  g.font = "bold 34px sans-serif"; g.fillText("Name: ______", 90, 60);
});
const deedTex = () => ctex("deed", 512, 384, (g) => {
  g.fillStyle = "#efe4c4"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#5a4630"; g.lineWidth = 8; g.strokeRect(14, 14, 484, 356);
  g.fillStyle = "#3a2a1a"; g.textAlign = "center"; g.font = "bold 52px serif"; g.fillText("DEED", 256, 86); g.font = "bold 24px serif"; g.fillText("Land at the crossroads", 256, 130);
  g.font = "22px serif"; for (let i = 0; i < 4; i++) g.fillText("~~~~~~~~~~~~~~~~~~~~~~~", 256, 175 + i * 34); g.font = "bold 40px serif"; g.fillStyle = "#a02020"; g.fillText("PRICE: $1", 256, 340);
});
const wallpaper = () => ctex("wallpaperK", 512, 512, (g) => {
  g.fillStyle = "#b9a37a"; g.fillRect(0, 0, 512, 512); g.fillStyle = "rgba(120,70,50,0.35)";
  for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < 512; x += 64) { g.beginPath(); g.arc(x, y, 9, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(x, y + 18, 4, 9, 0, 0, 6.3); g.fill(); }
  g.fillStyle = "rgba(90,60,40,0.25)"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 6, 512);
});
const dirt = () => ctex("dirtRoad", 512, 512, (g, r) => {
  g.fillStyle = "#a8865c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { g.fillStyle = ["rgba(90,60,30,0.25)", "rgba(220,190,140,0.25)", "rgba(120,90,60,0.3)"][Math.floor(r() * 3)]; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 7, 0, 6.3); g.fill(); }
  g.strokeStyle = "rgba(80,55,30,0.35)"; g.lineWidth = 16; for (const x of [150, 362]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, 512); g.stroke(); } // wheel ruts
});

// ---------------- helpers ----------------
const flat = (key: string, col: string) => lam(key, () => ({ color: col }));
const planeXZ = (x0: number, x1: number, z0: number, z1: number, y: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  return g;
};
const wallQ = (n: "+z" | "-z" | "+x" | "-x", c: number, u0: number, u1: number, y0: number, y1: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  const m = (u0 + u1) / 2, ym = (y0 + y1) / 2;
  if (n === "+z") g.translate(m, ym, c); else if (n === "-z") { g.rotateY(Math.PI); g.translate(m, ym, c); }
  else if (n === "+x") { g.rotateY(Math.PI / 2); g.translate(c, ym, m); } else { g.rotateY(-Math.PI / 2); g.translate(c, ym, m); }
  return g;
};
const noShadowCast = (o: THREE.Object3D) => o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
const emissive = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const LID = [0.5, 1, 1, 0.5];
const lidOf = (f: number, seed: number) => { let s = Math.round(-50 * hh(seed, 9)); for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(seed * 31 + n, 13)); } return 0; };
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const q = (v: number) => Math.round(v * 60) / 60;
const AUTUMN = ["#e07a2e", "#e8a83a", "#c8452f", "#a8b03a", "#d8602a", "#6f9a3f"];
/** a Kenney tree with its leaves recoloured to an autumn tone */
const autumnTree = (kit: Kit, name: string, h: number, ci: number) => {
  const t = kitClone(kit, name, h); if (!t) return null;
  const box = new THREE.Box3().setFromObject(t), H = box.max.y - box.min.y;
  t.traverse((c) => { const m = c as THREE.Mesh; if (!m.isMesh) return; m.geometry.computeBoundingBox(); const bb = new THREE.Box3().copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
    if (bb.min.y - box.min.y > H * 0.18 || (bb.max.y - box.min.y) > H * 0.55 && (bb.max.x - bb.min.x) > H * 0.25) m.material = lam("autumn" + (ci % AUTUMN.length), () => ({ color: AUTUMN[ci % AUTUMN.length] })); });
  return t;
};

// ---------------- letters / cards drawn with the Pen ----------------
const letterCard = (ch: string, col = "#1f1a2e") => (p: Pen) => { const g = p.g; g.font = "italic bold 220px serif"; g.textAlign = "center"; g.lineWidth = 16; g.strokeStyle = "#fbf3dc"; g.strokeText(ch, 128, 200); g.fillStyle = col; g.fillText(ch, 128, 200); };
const qmark = (p: Pen) => { const g = p.g; g.font = "bold 230px sans-serif"; g.textAlign = "center"; g.lineWidth = 22; g.strokeStyle = INK; g.strokeText("?", 128, 210); g.fillStyle = "#ffd23a"; g.fillText("?", 128, 210); };
const stampCard = (txt: string, sub: string) => (p: Pen) => {
  const g = p.g; g.save(); g.translate(256, 128); g.rotate(-0.12); g.strokeStyle = "#d8202e"; g.lineWidth = 16; g.strokeRect(-230, -90, 460, 180); g.lineWidth = 5; g.strokeRect(-210, -72, 420, 144);
  g.fillStyle = "#d8202e"; g.textAlign = "center"; g.font = `bold ${sub ? 76 : 96}px sans-serif`; g.fillText(txt, 0, sub ? 10 : 34); if (sub) { g.font = "bold 40px sans-serif"; g.fillText(sub, 0, 60); } g.restore();
};
const handPencil = (p: Pen) => { // a cartoon hand holding a pencil (top-down card), pencil tip at canvas (60, 250)
  const g = p.g;
  g.save(); g.translate(60, 250); g.rotate(-0.75);
  g.fillStyle = "#f2c23a"; g.strokeStyle = INK; g.lineWidth = 6; g.fillRect(14, -9, 190, 18); g.strokeRect(14, -9, 190, 18);
  g.fillStyle = "#f3d9b0"; g.beginPath(); g.moveTo(14, -9); g.lineTo(-10, 0); g.lineTo(14, 9); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#2a2a2a"; g.beginPath(); g.moveTo(-2, -3); g.lineTo(-10, 0); g.lineTo(-2, 3); g.fill();
  g.fillStyle = "#e88aa0"; g.fillRect(204, -9, 22, 18); g.strokeRect(204, -9, 22, 18); g.restore();
  g.fillStyle = "#ffe2c2"; g.strokeStyle = INK; g.lineWidth = 7;
  g.beginPath(); g.ellipse(170, 150, 62, 50, -0.6, 0, 6.3); g.fill(); g.stroke();
  for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(118 + i * 10, 116 + i * 24, 22, 14, -0.7, 0, 6.3); g.fill(); g.stroke(); }
  g.fillStyle = "#4f6f92"; g.beginPath(); g.moveTo(205, 180); g.lineTo(256, 230); g.lineTo(256, 256); g.lineTo(190, 256); g.lineTo(160, 200); g.closePath(); g.fill(); g.stroke();
};
const mapCover = (year: string, col: string) => (p: Pen) => {
  const g = p.g; g.fillStyle = col; g.fillRect(8, 8, 240, 328); g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(8, 8, 240, 328);
  g.fillStyle = "#fbf3dc"; g.fillRect(28, 40, 200, 150); g.strokeStyle = "#d8402e"; g.lineWidth = 7; g.beginPath(); g.moveTo(40, 160); g.bezierCurveTo(90, 80, 150, 160, 216, 70); g.stroke();
  g.fillStyle = "#fbf3dc"; g.textAlign = "center"; g.font = "bold 34px serif"; g.fillText("ROAD MAP", 128, 240); g.font = "bold 26px serif"; g.fillText("NEW YORK", 128, 274); g.font = "bold 40px serif"; g.fillText(year, 128, 320);
};
const phoneCard = (p: Pen) => {
  const g = p.g; g.fillStyle = "#1c1c22"; g.beginPath(); g.roundRect(10, 10, 236, 476, 34); g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  g.save(); g.beginPath(); g.roundRect(24, 34, 208, 428, 18); g.clip();
  g.fillStyle = "#e8eedf"; g.fillRect(0, 0, 256, 512); g.fillStyle = "#b8d8a0"; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(40 + i * 40, 90 + (i % 3) * 120, 50, 30, 0.5, 0, 6.3); g.fill(); }
  g.strokeStyle = "#f4c25a"; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 300); g.bezierCurveTo(80, 270, 160, 250, 256, 210); g.stroke();
  g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 34); g.lineTo(118, 462); g.stroke();
  g.fillStyle = "#e8402e"; g.beginPath(); g.arc(124, 230, 26, Math.PI, 0); g.lineTo(124, 290); g.closePath(); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(124, 230, 10, 0, 6.3); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(56, 300, 140, 44); g.fillStyle = "#222"; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.fillText("Agloe", 126, 332); g.restore();
};
const gnisDoc = (stamped: boolean) => (p: Pen) => {
  const g = p.g; g.fillStyle = "#f6f1e2"; g.fillRect(6, 6, 500, 660); g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(6, 6, 500, 660);
  g.fillStyle = "#1f2b3c"; g.textAlign = "center"; g.font = "bold 30px serif"; g.fillText("U.S. GEOLOGICAL SURVEY", 256, 66); g.font = "bold 22px serif"; g.fillText("Geographic Names Information System", 256, 100);
  g.strokeStyle = "#1f2b3c"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 120); g.lineTo(472, 120); g.stroke();
  g.textAlign = "left"; g.font = "24px serif"; const rows = [["Feature name:", "Agloe"], ["Class:", "Populated place"], ["County:", "Delaware, NY"], ["Entered:", "Feb 25, 2014"]];
  rows.forEach(([a, b], i) => { g.fillText(a, 50, 180 + i * 56); g.font = "bold 26px serif"; g.fillText(b, 240, 180 + i * 56); g.font = "24px serif"; });
  g.fillStyle = "rgba(31,43,60,0.25)"; for (let i = 0; i < 5; i++) g.fillRect(50, 420 + i * 30, 400 - (i % 2) * 120, 10);
  if (stamped) { g.save(); g.translate(256, 520); g.rotate(-0.16); g.strokeStyle = "#d8202e"; g.lineWidth = 12; g.strokeRect(-200, -70, 400, 140); g.fillStyle = "#d8202e"; g.textAlign = "center"; g.font = "bold 50px sans-serif"; g.fillText("NOT", 0, -8); g.fillText("OFFICIAL", 0, 46); g.restore(); }
};
const buyerCard = (p: Pen) => { // the shadowy buyer: navy silhouette, fedora, long coat, briefcase, no face
  const g = p.g, c = "#141a2c";
  g.fillStyle = c; g.strokeStyle = "#6a7aa8"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(180, 330); g.bezierCurveTo(150, 600, 140, 860, 160, 975); g.lineTo(440, 975); g.bezierCurveTo(460, 860, 450, 600, 420, 330); g.bezierCurveTo(380, 280, 220, 280, 180, 330); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(300, 230, 88, 96, 0, 0, 6.3); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(300, 175, 165, 26, 0, 0, 6.3); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(215, 175); g.bezierCurveTo(220, 70, 380, 70, 385, 175); g.fill(); g.stroke();
  g.fillStyle = "#5a3a22"; g.fillRect(400, 640, 120, 90); g.strokeStyle = INK; g.strokeRect(400, 640, 120, 90); g.fillRect(440, 620, 40, 20);
  g.fillStyle = "#e8c45a"; g.font = "bold 40px serif"; g.textAlign = "center"; g.fillText("M", 460, 700);
};
const dollarCard = (p: Pen) => { const g = p.g; g.fillStyle = "#a8cc92"; g.fillRect(6, 6, 244, 108); g.strokeStyle = "#2f5a2a"; g.lineWidth = 6; g.strokeRect(6, 6, 244, 108); g.strokeRect(20, 18, 216, 84); g.fillStyle = "#2f5a2a"; g.beginPath(); g.ellipse(128, 60, 28, 34, 0, 0, 6.3); g.fill(); g.font = "bold 40px serif"; g.textAlign = "center"; g.fillText("1", 40, 54); g.fillText("1", 216, 100); g.fillStyle = "#dcefcf"; g.fillText("$", 128, 74); };
const inkRoad = (u: number) => (p: Pen) => { // the road being inked, progress u (0..1) along a curve
  const g = p.g; g.strokeStyle = "#1f1a2e"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath();
  for (let i = 0; i <= 40 * u; i++) { const t = i / 40, x = 30 + t * 460, y = 380 - Math.sin(t * 3.2) * 120 - t * 120; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
};
const inkEnd = (u: number): [number, number] => { const t = u; return [30 + t * 460, 380 - Math.sin(t * 3.2) * 120 - t * 120]; };
const glowLine = (col: string, kind: "road" | "river") => (p: Pen) => { const g = p.g; g.strokeStyle = col; g.lineWidth = 26; g.lineCap = "round"; g.globalAlpha = 0.85; g.beginPath(); if (kind === "road") { g.moveTo(10, 200); g.bezierCurveTo(150, 120, 330, 160, 500, 90); } else { g.moveTo(10, 120); g.bezierCurveTo(160, 240, 330, 60, 500, 180); } g.stroke(); };

// ---------------- world ----------------
export class AgloeWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#c9d8ee", 60, 420);
  private clouds: THREE.Mesh[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private mapA!: THREE.Mesh; private mapB!: THREE.Mesh; private mapL!: THREE.Mesh; private mapR!: THREE.Mesh;
  private lodge!: THREE.Group; private smoke = new THREE.Vector3();
  private shafts: THREE.Mesh[] = []; private dust!: THREE.Points;
  private lightTop!: THREE.MeshBasicMaterial; private lampGlows: THREE.Mesh[] = [];
  private stars!: THREE.Points; private nightDesk!: THREE.Group;

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky, lights, clouds ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    const furn = (parent: THREE.Object3D, name: string, h: number, p: V3, yaw = 0) => { const o = kitClone(kit, name, h); if (o) { o.position.set(...p); o.rotation.y = yaw; noShadowCast(o); parent.add(o); } return o; };
    const pic = (key: string, tex: THREE.Texture, w: number, h: number, pos: V3, ry: number, basic = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex }) : lam(key, () => ({ map: tex }))); m.position.set(...pos); m.rotation.y = ry; R.add(m); return m; };
    const mapTexA = roadMap("mapA", { paper: "#efe2c2", title: "NEW YORK", agloe: false });
    const mapTexB = roadMap("mapB", { paper: "#e6e2d0", title: "STATE ROADS", agloe: true, circle: false });

    // ================= OFFICE (1920s drafting room) =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.office); R.add(S);
      const b = new Batch();
      b.add(planeXZ(-6, 6, -5, 5, 0.002, 6, 5), lam("planksHD", () => ({ map: planksHD() })));
      const wallM = lam("officeWall", () => ({ map: plaster("officeWallT", "#e9dcb8", "#6e4428", true) }));
      // back wall z = -5 with three tall windows (x = -3.6, 0, 3.6; 1.6 wide, y 0.9..3.1)
      const WX = [-3.6, 0, 3.6], WW = 0.8;
      let x0 = -6; for (const wx of WX) { b.add(wallQ("+z", -5, x0, wx - WW, 0, 3.6, (wx - WW - x0) / 3.6, 1), wallM); b.add(wallQ("+z", -5, wx - WW, wx + WW, 0, 0.9, 0.44, 0.25), wallM); b.add(wallQ("+z", -5, wx - WW, wx + WW, 3.1, 3.6, 0.44, 0.14), wallM); x0 = wx + WW; }
      b.add(wallQ("+z", -5, x0, 6, 0, 3.6, (6 - x0) / 3.6, 1), wallM);
      b.add(wallQ("+x", -6, -5, 5, 0, 3.6, 2.8, 1), wallM); b.add(wallQ("-x", 6, -5, 5, 0, 3.6, 2.8, 1), wallM);
      const trim = flat("winTrimO", "#f3efe4");
      for (const wx of WX) {
        b.add(boxGeo(V(wx - WW - 0.12, 0.8, -5.05), V(wx + WW + 0.12, 0.92, -4.82)), trim); b.add(boxGeo(V(wx - WW - 0.1, 3.1, -5.05), V(wx + WW + 0.1, 3.2, -4.92)), trim);
        b.add(boxGeo(V(wx - 0.03, 0.9, -5.02), V(wx + 0.03, 3.1, -4.96)), trim); b.add(boxGeo(V(wx - WW, 2.0, -5.02), V(wx + WW, 2.05, -4.96)), trim);
      }
      // ceiling + beams + skirting
      b.add(planeXZ(-6, 6, -5, 5, 3.6).rotateX(Math.PI).translate(0, 7.2, 0), flat("ceilO", "#efe2c6"));
      for (let z = -4; z <= 4; z += 2) b.add(boxGeo(V(-6, 3.4, z - 0.12), V(6, 3.6, z + 0.12)), flat("beamO", "#6e4428"));
      // drafting tables: tilted board on an A-frame, with paper, ruler, ink bottle, a lamp clamped to each
      const wood = flat("draftWood", "#9a6a42"), woodD = flat("draftWoodD", "#5e3e26");
      for (const t of [OTTO_T, ERN_T]) {
        const top = new THREE.BoxGeometry(1.7, 0.05, 1.05); top.rotateX(0.42); top.translate(t[0], 1.02, t[2]); b.add(top, wood);
        const sheet = new THREE.PlaneGeometry(1.35, 0.85); sheet.rotateX(-Math.PI / 2 + 0.42); sheet.translate(t[0], 1.055, t[2] + 0.01); b.add(sheet, lam("mapSheetO", () => ({ map: mapTexA })));
        for (const sx of [-0.7, 0.7]) { b.add(boxGeo(V(t[0] + sx - 0.04, 0, t[2] - 0.35), V(t[0] + sx + 0.04, 0.95, t[2] - 0.27)), woodD); b.add(boxGeo(V(t[0] + sx - 0.04, 0, t[2] + 0.27), V(t[0] + sx + 0.04, 0.85, t[2] + 0.35)), woodD); }
        b.add(boxGeo(V(t[0] - 0.7, 0.3, t[2] - 0.04), V(t[0] + 0.7, 0.36, t[2] + 0.04)), woodD);
        b.add(boxGeo(V(t[0] - 0.75, 0.86, t[2] + 0.42), V(t[0] + 0.75, 0.9, t[2] + 0.5)), flat("ledge", "#7a4e2e"));
        const bottle = new THREE.CylinderGeometry(0.04, 0.05, 0.08, 12); bottle.translate(t[0] + 0.55, 0.94, t[2] + 0.46); b.add(bottle, flat("inkBottle", "#1c2440"));
        const ruler = new THREE.BoxGeometry(0.9, 0.012, 0.06); ruler.rotateX(0.42); ruler.rotateY(0.25); ruler.translate(t[0] - 0.1, 1.08, t[2] - 0.1); b.add(ruler, flat("rulerY", "#e8c45a"));
      }
      b.build(S, false);
      // pinned maps + charts on the left wall, plans on the right wall
      const mapPin = (tex: THREE.Texture, w: number, h: number, p: V3, ry: number) => { const m = pic("pin" + p.join(), tex, w, h, [p[0] + ORG.office[0], p[1], p[2] + ORG.office[2]], ry); return m; };
      mapPin(mapTexA, 2.1, 1.4, [-5.97, 2.15, -1.6], Math.PI / 2); mapPin(mapTexB, 1.5, 1.0, [-5.97, 2.0, 1.4], Math.PI / 2);
      mapPin(ctex("chartO", 512, 512, (g, r) => { g.fillStyle = "#e9e1c8"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "#5a4636"; g.lineWidth = 3; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(256, 256, 20 + i * 8, 14 + i * 6, 0.3, 0, 6.3); g.stroke(); } g.fillStyle = "#c0353a"; g.beginPath(); g.arc(250 + r() * 10, 250, 10, 0, 6.3); g.fill(); }), 1.0, 1.0, [5.97, 2.2, -2.6], -Math.PI / 2);
      mapPin(cityBackdrop(), 9, 4.5, [0, 2.2, -8.5], 0); // the city outside the windows
      // shelves of rolled maps (right wall), bookcases, coat rack, globe, clock, plant, filing boxes, rug, chairs
      const sh = new Batch();
      for (const y of [0.5, 1.1, 1.7, 2.3]) sh.add(boxGeo(V(5.45, y - 0.04, 0.2), V(5.98, y, 3.4)), wood);
      sh.add(boxGeo(V(5.45, 0, 0.16), V(5.98, 2.4, 0.22)), woodD); sh.add(boxGeo(V(5.45, 0, 3.4), V(5.98, 2.4, 3.46)), woodD);
      sh.build(S, false);
      const rollCols = ["#efe2c2", "#e6dcc8", "#f3e9d2", "#dccfae"];
      for (const y of [0.5, 1.1, 1.7]) for (let i = 0; i < 9; i++) { const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), lam("roll" + (i % 4), () => ({ color: rollCols[i % 4] }))); roll.rotation.z = Math.PI / 2; roll.position.set(5.72, y + 0.07 + (i % 2) * 0.09, 0.4 + i * 0.33); S.add(roll); }
      furn(S, "bookcaseClosedWide", 2.2, [-3.6, 0, 4.55], Math.PI); furn(S, "bookcaseOpen", 2.0, [-5.5, 0, 3.6], Math.PI / 2); furn(S, "coatRackStanding", 1.85, [4.9, 0, 4.2], 0.4);
      { const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), lam("rugO", () => ({ map: ctex("rugT", 512, 320, (g) => { g.fillStyle = "#7a2a2a"; g.fillRect(0, 0, 512, 320); g.strokeStyle = "#e0b060"; g.lineWidth = 10; g.strokeRect(20, 20, 472, 280); g.strokeStyle = "#2f4a6a"; g.lineWidth = 6; g.strokeRect(44, 44, 424, 232); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#e0b060" : "#2f4a6a"; g.beginPath(); g.arc(106 + i * 60, 160, 16, 0, 6.3); g.fill(); } }) }))); rug.rotation.x = -Math.PI / 2; rug.position.set(0.1, 0.006, 0.6); S.add(rug); } furn(S, "chairDesk", 0.95, [-0.6, 0, 1.4], 2.5); furn(S, "pottedPlant", 1.3, [-5.3, 0, -4.4], 0); furn(S, "pottedPlant", 1.1, [5.3, 0, -4.4], 1);
      furn(S, "cardboardBoxClosed", 0.45, [4.6, 0, -3.9], 0.3); furn(S, "cardboardBoxClosed", 0.4, [4.7, 0.45, -3.85], 0.9); furn(S, "radio", 0.4, [-5.4, 0.98, 3.6], Math.PI / 2);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), lam("globeM", () => ({ map: ctex("globeT", 512, 256, (g, r) => { g.fillStyle = "#4a8ac8"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#c8b06a"; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * 512, 40 + r() * 176, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, 6.3); g.fill(); } }) })));
      globe.position.set(3.9, 1.32, -3.6); S.add(globe);
      const gst = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.2, 1.1, 10), flat("globeStand", "#5e3e26")); gst.position.set(3.9, 0.55, -3.6); S.add(gst);
      pic("clockO", ctex("clockT", 256, 256, (g) => { g.fillStyle = "#3a2a1c"; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill(); g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(128, 128, 108, 0, 6.3); g.fill(); g.fillStyle = "#222"; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(128 + Math.cos(a) * 92 - 4, 128 + Math.sin(a) * 92 - 4, 8, 8); } g.strokeStyle = "#222"; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(178, 140); g.stroke(); }), 0.6, 0.6, [ORG.office[0] + 1.8, 3.05, ORG.office[2] - 4.97], 0);
      pic("signO", signBoard("officeSign", "GENERAL MAPS", "DRAFTING ROOM", 1024, 256, "#1f2b3c", "#e9d9a8"), 2.2, 0.55, [ORG.office[0] - 1.8, 3.2, ORG.office[2] - 4.97], 0, true);
      // green banker lamps clamped over the tables (emissive bulbs bloom)
      for (const t of [OTTO_T, ERN_T]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), flat("lampArm", "#2a2a2a")); arm.position.set(t[0] + 0.75, 1.45, t[2] - 0.2); arm.rotation.z = 0.5; S.add(arm);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 20, 1, true), lam("lampShadeG", () => ({ color: "#2f6a4a", side: THREE.DoubleSide }))); shade.position.set(t[0] + 0.5, 1.82, t[2] - 0.05); S.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), emissive(3.2, 2.7, 1.8)); bulb.position.set(t[0] + 0.5, 1.74, t[2] - 0.05); bulb.layers.set(NOINK); S.add(bulb);
      }
      // window light shafts (additive, NOINK) + dust motes drifting through them
      const shaftTex = ctex("shaftT", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,240,200,0.55)"); gr.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
      for (const wx of WX) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4.2), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        m.position.set(ORG.office[0] + wx + 0.5, 1.6, ORG.office[2] - 3.4); m.rotation.set(-0.85, 0.15, 0); m.layers.set(NOINK); this.shafts.push(m); R.add(m);
      }
      const dp: number[] = []; for (let i = 0; i < 260; i++) dp.push(0, 0, 0);
      const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
      this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#fff4d6", size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.dust.layers.set(NOINK); this.dust.frustumCulled = false; R.add(this.dust);
    }

    // ================= RIVAL OFFICE (darker, wood panels, light table, smoke) =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.rival); R.add(S);
      const b = new Batch();
      b.add(planeXZ(-6, 6, -5, 5, 0.002, 6, 5), lam("rivalFloor", () => ({ map: stoneHD("rivalFloorT", ["#6a4a3a", "#5e4234", "#74503e", "#563c30"], "#2e2018") })));
      const pan = lam("rivalPanel", () => ({ map: panel("rivalPanelT", "#5a3424") }));
      b.add(wallQ("+z", -5, -6, 6, 0, 3.6, 3, 1), pan); b.add(wallQ("+x", -6, -5, 5, 0, 3.6, 2.6, 1), pan);
      b.add(wallQ("-x", 6, -5, 0.8, 0, 3.6, 1.5, 1), pan); b.add(wallQ("-x", 6, 2.2, 5, 0, 3.6, 0.7, 1), pan); b.add(wallQ("-x", 6, 0.8, 2.2, 2.4, 3.6, 0.35, 0.33), pan);
      b.add(planeXZ(-6, 6, -5, 5, 3.6).rotateX(Math.PI).translate(0, 7.2, 0), flat("ceilR", "#3a2a22"));
      // light table: frame + glowing glass top (the clerk traces through it)
      const L = LIGHTTAB;
      b.add(boxGeo(V(L[0] - 0.8, 0.82, L[2] - 0.45), V(L[0] + 0.8, 0.95, L[2] + 0.45)), flat("lightTabFrame", "#6a5a4a"));
      for (const [dx, dz] of [[-0.74, -0.39], [0.74, -0.39], [-0.74, 0.39], [0.74, 0.39]]) b.add(boxGeo(V(L[0] + dx - 0.04, 0, L[2] + dz - 0.04), V(L[0] + dx + 0.04, 0.82, L[2] + dz + 0.04)), flat("lightTabLeg", "#4a3e34"));
      // boss desk (big), filing cabinets, safe
      b.add(boxGeo(V(BOSS[0] - 1.1, 0, BOSS[2] + 0.55), V(BOSS[0] + 1.1, 0.8, BOSS[2] + 1.35)), flat("bossDesk", "#6a3a22"));
      b.add(boxGeo(V(BOSS[0] - 1.15, 0.8, BOSS[2] + 0.5), V(BOSS[0] + 1.15, 0.86, BOSS[2] + 1.4)), flat("bossDeskTop", "#2a3a2e"));
      const cab = flat("filing", "#6c7a6a"), cabD = flat("filingD", "#3c463c");
      for (let i = 0; i < 4; i++) { const x = -5.6 + i * 0.62; b.add(boxGeo(V(x, 0, -4.95), V(x + 0.56, 1.45, -4.3)), cab); for (let d = 0; d < 4; d++) b.add(boxGeo(V(x + 0.18, 0.3 + d * 0.33, -4.3), V(x + 0.38, 0.34 + d * 0.33, -4.26)), cabD); }
      b.add(boxGeo(V(4.6, 0, -4.9), V(5.7, 1.2, -3.9)), flat("safe", "#2e3238")); b.add(boxGeo(V(4.75, 0.15, -3.9), V(5.55, 1.05, -3.86)), flat("safeDoor", "#3e444c"));
      b.build(S, false);
      const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.1) }); this.lightTop = glass;
      const gt = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.82), glass); gt.rotation.x = -Math.PI / 2; gt.position.set(L[0], 0.955, L[2]); gt.layers.set(NOINK); S.add(gt);
      const traced = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.72), new THREE.MeshBasicMaterial({ map: mapTexA, transparent: true, opacity: 0.55, color: new THREE.Color(1.6, 1.6, 1.5) })); traced.rotation.x = -Math.PI / 2; traced.position.set(L[0], 0.96, L[2]); traced.layers.set(NOINK); S.add(traced);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20), flat("dial", "#c9b06a")); dial.rotation.x = Math.PI / 2; dial.position.set(5.15, 0.75, -3.84); S.add(dial);
      // desk things: lamp, phone, cigar box, ledger stack, nameplate
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), flat("lampArmR", "#c9a24a")); lamp.position.set(BOSS[0] - 0.7, 1.06, BOSS[2] + 0.75); S.add(lamp);
      const lshade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), lam("lampShadeR", () => ({ color: "#2f6a4a" }))); lshade.position.set(BOSS[0] - 0.6, 1.28, BOSS[2] + 0.8); S.add(lshade);
      const lglow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.14), emissive(3.4, 2.8, 1.6)); lglow.position.set(BOSS[0] - 0.6, 1.215, BOSS[2] + 0.8); lglow.layers.set(NOINK); S.add(lglow); this.lampGlows.push(lglow);
      const phone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 12), flat("phoneR", "#1a1a1a")); phone.position.set(BOSS[0] + 0.75, 0.97, BOSS[2] + 0.8); S.add(phone);
      for (let i = 0; i < 5; i++) { const led = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), flat("ledgerR" + (i % 2), i % 2 ? "#7a2a2a" : "#2a3a6a")); led.position.set(BOSS[0] + 0.3, 0.9 + i * 0.06, BOSS[2] + 1.1); led.rotation.y = hh(i) * 0.4; S.add(led); }
      pic("plateR", signBoard("bossPlate", "THE BOSS", "", 512, 128, "#1a1a1a", "#e8c45a"), 0.5, 0.12, [ORG.rival[0] + BOSS[0], 0.92, ORG.rival[2] + BOSS[2] + 1.41], 0, true);
      pic("rivalSign", signBoard("rivalSignT", "STATE ROAD MAPS INC.", "", 1024, 160, "#141414", "#e8c45a"), 3.0, 0.48, [ORG.rival[0], 3.05, ORG.rival[2] - 4.96], 0, true);
      pic("rivalPortrait", ctex("bossPortrait", 256, 320, (g) => { g.fillStyle = "#b8862a"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#3a5a4a"; g.fillRect(18, 18, 220, 284); g.fillStyle = "#3b3550"; g.beginPath(); g.ellipse(128, 300, 96, 76, 0, 0, 6.3); g.fill(); g.fillStyle = "#ffe2c2"; g.beginPath(); g.ellipse(128, 160, 62, 72, 0, 0, 6.3); g.fill(); g.fillStyle = "#2e2a30"; g.fillRect(70, 70, 116, 44); g.fillRect(50, 110, 156, 10); g.fillStyle = "#3a2a20"; g.beginPath(); g.ellipse(128, 196, 44, 12, 0, 0, 6.3); g.fill(); }), 0.9, 1.12, [ORG.rival[0] + 1.6, 2.1, ORG.rival[2] - 4.96], 0);
      const blinds = ctex("blindsT", 256, 512, (g) => { for (let y = 0; y < 512; y += 24) { g.fillStyle = "#e8d8a8"; g.fillRect(0, y, 256, 15); g.fillStyle = "#ffe9a8"; g.fillRect(0, y + 15, 256, 9); } });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshBasicMaterial({ map: blinds, color: new THREE.Color(1.5, 1.35, 1.0) })); win.position.set(ORG.rival[0] - 5.97, 2.0, ORG.rival[2] - 1.5); win.rotation.y = Math.PI / 2; win.layers.set(NOINK); R.add(win);
      furn(S, "chairDesk", 1.05, [BOSS[0], 0, BOSS[2] - 0.35], 0); furn(S, "coatRackStanding", 1.85, [-5.3, 0, 3.8], 0.6); furn(S, "lampRoundFloor", 1.7, [-5.2, 0, -2.9], 0); furn(S, "pottedPlant", 1.2, [5.3, 0, 3.6], 0);
      furn(S, "bookcaseClosedWide", 2.2, [-2.2, 0, -4.55], 0); furn(S, "chair", 0.95, [L[0] + 0.1, 0, L[2] - 0.75], 0);
      // the door (right wall) the two march in through
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 1.3), lam("doorR", () => ({ color: "#4a2a18" }))); door.position.set(5.6, 1.15, 0.85); door.rotation.y = 1.0; S.add(door);
    }

    // ================= DESK (inserts): big desk, maps, tools =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.desk); R.add(S);
      const b = new Batch();
      b.add(planeXZ(-3, 3, -2, 2, 0.9, 3, 2), lam("deskTop", () => ({ map: planksHD() })));
      b.add(boxGeo(V(-3, 0, -2), V(3, 0.9, 2)), flat("deskBody", "#5e3e26"));
      b.add(planeXZ(-20, 20, -20, 20, 0, 10, 10), flat("deskFloor", "#4a3426"));
      b.build(S, false);
      const mapMesh = (tex: THREE.Texture, w: number, h: number, p: V3, key: string) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(key, () => ({ map: tex }))); m.rotation.x = -Math.PI / 2; m.position.set(...p); m.receiveShadow = true; S.add(m); return m; };
      this.mapA = mapMesh(mapTexA, MAP_W, MAP_H, [0, MAP_Y, 0], "mapAm");
      this.mapB = mapMesh(roadMap("mapBc", { paper: "#e6e2d0", title: "STATE ROADS", agloe: true, circle: true }), MAP_W, MAP_H, [0, MAP_Y + 0.004, 0], "mapBm");
      this.mapL = mapMesh(mapTexA, 1.15, 0.77, [-0.62, MAP_Y + 0.002, 0], "mapLm");
      this.mapR = mapMesh(mapTexB, 1.15, 0.77, [0.62, MAP_Y + 0.002, 0], "mapRm");
      // tools around the sheet: inkwell, ruler, compass, magnifier, coffee mug, pipe, lamp, paper stack, pins
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, rot: V3 = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
      add(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 16), flat("inkwell", "#1c2440"), [1.45, 0.95, -0.55]); add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), flat("inkCap", "#c9a24a"), [1.45, 1.01, -0.55]);
      add(new THREE.BoxGeometry(1.0, 0.012, 0.07), flat("rulerD", "#e8c45a"), [-1.35, 0.91, 0.62], [0, 0.35, 0]);
      add(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), flat("mug", "#e8e2d4"), [1.5, 0.99, 0.6]); add(new THREE.TorusGeometry(0.06, 0.015, 8, 16), flat("mug", "#e8e2d4"), [1.63, 0.99, 0.6], [0, 0, Math.PI / 2]);
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), flat("coffee", "#4a2a18"), [1.5, 1.075, 0.6]);
      add(new THREE.TorusGeometry(0.1, 0.014, 8, 24), flat("magRim", "#c9a24a"), [-1.45, 0.92, -0.35], [Math.PI / 2, 0, 0]); add(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), flat("magHandle", "#5a3a22"), [-1.3, 0.92, -0.2], [Math.PI / 2, 0, 0.8]);
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), flat("compass", "#9aa0a8"), [1.35, 0.92, 0.1], [0.2, 0, 1.4]); add(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), flat("compass", "#9aa0a8"), [1.38, 0.92, 0.18], [-0.2, 0, 1.3]);
      for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.6, 0.008, 0.8), flat("paperStack" + (i % 2), i % 2 ? "#f3ecd8" : "#ebe2c8"), [-1.95, 0.905 + i * 0.008, -0.6 + hh(i) * 0.05], [0, hh(i, 2) * 0.2, 0]);
      for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.012, 8, 6), flat("pin" + (i % 3), ["#d8202e", "#2a6ad8", "#f0c040"][i % 3]), [-1.1 + i * 0.55, MAP_Y + 0.012, -0.72 + (i % 2) * 1.44]);
      const lampB = add(new THREE.CylinderGeometry(0.03, 0.12, 0.5, 12), flat("lampBase", "#c9a24a"), [-1.6, 1.15, -1.3]);
      const lshade = add(new THREE.CylinderGeometry(0.1, 0.32, 0.18, 20, 1, true), lam("lampShadeD", () => ({ color: "#2f6a4a", side: THREE.DoubleSide })), [-1.6, 1.45, -1.3]);
      const lbulb = add(new THREE.SphereGeometry(0.07, 12, 10), emissive(3.5, 2.9, 1.8), [-1.6, 1.38, -1.3]); lbulb.layers.set(NOINK); this.lampGlows.push(lbulb);
      void lampB; void lshade;
      this.nightDesk = new THREE.Group(); S.add(this.nightDesk);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshBasicMaterial({ map: ctex("glowT", 128, 64, (g) => { const gr = g.createRadialGradient(64, 32, 0, 64, 32, 64); gr.addColorStop(0, "rgba(255,230,140,1)"); gr.addColorStop(1, "rgba(255,230,140,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); }), color: new THREE.Color(2.5, 2.2, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(MAP_X[0] + 0.0, MAP_Y + 0.006, MAP_X[2] - 0.04); glow.layers.set(NOINK); this.nightDesk.add(glow);
    }

    // ================= CROSSROADS (Catskills, autumn) + the fishing lodge =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.cross); R.add(S);
      // terrain: flat valley floor around the crossroads, rolling hills rising to mountains
      const tg = new THREE.PlaneGeometry(600, 600, 180, 180); tg.rotateX(-Math.PI / 2);
      const pa = tg.attributes.position as THREE.BufferAttribute;
      const hill = (x: number, z: number) => {
        const r = Math.hypot(x, z), road = Math.min(Math.abs(x), Math.abs(z));
        let h = 1.2 * Math.sin(x * 0.07) * Math.cos(z * 0.06) + 0.8 * Math.sin(x * 0.13 + z * 0.09);
        h += Math.max(0, (r - 30) / 50) ** 1.7 * (14 + 8 * Math.sin(x * 0.02 + 1) * Math.cos(z * 0.025));
        const flatK = smooth((road - 3) / 6) * smooth((r - 6) / 14); // roads and the crossroads stay flat
        return Math.max(-0.05, h * flatK);
      };
      for (let i = 0; i < pa.count; i++) pa.setY(i, hill(pa.getX(i), pa.getZ(i)));
      tg.computeVertexNormals();
      const uv = tg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 60);
      const terr = new THREE.Mesh(tg, lam("grassAut", () => ({ map: grassHD(), color: "#b8985a" }))); terr.receiveShadow = true; S.add(terr);
      const b = new Batch();
      const dirtM = lam("dirtRoadM", () => ({ map: dirt() }));
      b.add(planeXZ(-1.7, 1.7, -300, 300, 0.03, 1, 180), dirtM); b.add(planeXZ(-300, -1.7, -1.7, 1.7, 0.03, 180, 1).rotateY(0), dirtM); b.add(planeXZ(1.7, 300, -1.7, 1.7, 0.03, 180, 1), dirtM);
      b.add(planeXZ(-2.2, 2.2, -2.2, 2.2, 0.035, 1, 1), dirtM);
      // lake behind the lodge
      const lake = new THREE.Mesh(new THREE.CircleGeometry(16, 48), lam("lakeM", () => ({ color: "#4f8fc0" }))); lake.rotation.x = -Math.PI / 2; lake.position.set(-14, 0.06, -26); S.add(lake);
      // split-rail fences along the roads, mailbox, rocks, stumps, hay bales
      b.build(S, false);
      for (let i = 0; i < 16; i++) { furn(S, "fence_simple", 0.9, [4 + i * 2.0, 0, -2.6], 0); furn(S, "fence_simple", 0.9, [-4 - i * 2.0, 0, 2.6], 0); }
      for (let i = 0; i < 8; i++) furn(S, "fence_simple", 0.9, [2.6, 0, 13 + i * 2.0], Math.PI / 2);
      furn(S, "rock_largeA", 1.0, [5.5, 0, 4.2], 0.4); furn(S, "rock_smallB", 0.5, [-3.6, 0, 4.5], 1); furn(S, "stump_round", 0.5, [4.2, 0, -4.4], 0); furn(S, "log_large", 0.6, [-4.5, 0, -3.4], 0.6);
      furn(S, "rock_largeA", 1.6, [-20, hill(-20, 18), 18], 2); furn(S, "rock_largeA", 1.3, [24, hill(24, -16), -16], 1);
      for (const [x, z] of [[6.5, -5.5], [7.8, -4.6]]) { const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 16), lam("hay", () => ({ color: "#e0b85a" }))); bale.rotation.z = Math.PI / 2; bale.position.set(x, 0.6, z); bale.castShadow = true; S.add(bale); }
      // trees: autumn colours, dense on the hills, kept off the roads, the lodge clearing and the camera corner
      const TREES = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone"];
      const R3 = rng(31);
      for (let i = 0; i < 420; i++) {
        const x = (R3() - 0.5) * 220, z = (R3() - 0.5) * 220;
        if (Math.min(Math.abs(x), Math.abs(z)) < 4.5) continue;
        if (x > -3 && x < 20 && z > -3 && z < 36) continue;          // camera corner
        if (x > -18 && x < -1 && z > -16 && z < -1) continue;        // lodge clearing
        if (Math.hypot(x + 14, z + 26) < 17) continue;               // lake
        const t = autumnTree(kit, TREES[i % 5], 4 + R3() * 5, i); if (!t) continue;
        t.position.set(x, hill(x, z) - 0.05, z); t.rotation.y = R3() * 6; S.add(t);
      }
      // a few framing trees at the lodge clearing edge
      for (const [x, z, h] of [[-17, -4, 7], [-2.5, -15, 6.5], [-16.5, -14, 8]]) { const t = autumnTree(kit, "tree_oak", h, x * 3); if (t) { t.position.set(x, 0, z); S.add(t); } }
      // far mountains (low cones, fogged)
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, d = 260 + (i % 3) * 30, hm = 50 + (i % 4) * 18; const mtn = new THREE.Mesh(new THREE.ConeGeometry(70 + (i % 3) * 20, hm, 7), lam("mtn" + (i % 3), () => ({ color: ["#7a8a5a", "#8a7a5a", "#6a7a62"][i % 3] }))); mtn.position.set(Math.cos(a) * d, hm / 2 - 4, Math.sin(a) * d); S.add(mtn); }
      // road sign (just the county crossroads post; no town name — there is no town)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 8), flat("signPost", "#6a4a2a")); post.position.set(SIGN[0], 1.2, SIGN[2]); S.add(post);
      const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: signBoard("roscoeSign", "ROSCOE  6 →", "", 1024, 236, "#f3efe4", "#1f1a2e"), side: THREE.DoubleSide })); arrow.position.set(SIGN[0] + 0.45, 2.1, SIGN[2]); S.add(arrow);
      const arrow2 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: signBoard("downsSign", "← DOWNSVILLE 12", "", 1024, 236, "#f3efe4", "#1f1a2e"), side: THREE.DoubleSide })); arrow2.position.set(SIGN[0], 1.75, SIGN[2] - 0.45); arrow2.rotation.y = Math.PI / 2; S.add(arrow2);
      // ---- the lodge: log cabin, porch, sign, chimney, glowing windows, dock, canoe, rods, firewood ----
      const Lg = new THREE.Group(); Lg.position.set(...LODGE); S.add(Lg); this.lodge = Lg;
      const logM = lam("logM", () => ({ map: logTex() })), endM = flat("logEnd", "#d8b07a"), gableM = lam("gableM", () => ({ color: "#9a6440", side: THREE.DoubleSide }));
      const lb = new Batch();
      const W2 = 3.6, D2 = 2.6, Hh = 2.8;
      for (let y = 0.16; y < Hh; y += 0.3) {
        for (const zz of [-D2, D2]) { const c = new THREE.CylinderGeometry(0.16, 0.16, 2 * W2 + 0.5, 10); c.rotateZ(Math.PI / 2); c.translate(0, y, zz); lb.add(c, logM); }
        for (const xx of [-W2, W2]) { const c = new THREE.CylinderGeometry(0.16, 0.16, 2 * D2 + 0.5, 10); c.rotateX(Math.PI / 2); c.translate(xx, y + 0.15, 0); lb.add(c, logM); }
      }
      // gable ends + roof
      for (const xx of [-W2, W2]) { const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute([xx, Hh, -D2, xx, Hh, D2, xx, Hh + 1.8, 0], 3)); g2.computeVertexNormals(); lb.add(g2, gableM); }
      const roofM = lam("lodgeRoof", () => ({ map: planksHD(), color: "#b8643e", side: THREE.DoubleSide }));
      for (const s of [-1, 1]) { const rg = new THREE.PlaneGeometry(2 * W2 + 1.2, Math.hypot(D2 + 0.6, 1.95)); rg.rotateX(-Math.PI / 2 + s * Math.atan2(1.95, D2 + 0.6)); rg.translate(0, Hh + 0.92, s * (D2 + 0.6) / 2); lb.add(rg, roofM); }
      // porch: deck, posts, little roof
      lb.add(boxGeo(V(-W2 - 0.3, 0, D2 + 0.2), V(W2 + 0.3, 0.3, D2 + 2.2)), flat("porchDeck", "#9a6a42"));
      for (const xx of [-W2, -1.2, 1.2, W2]) lb.add(boxGeo(V(xx - 0.09, 0.3, D2 + 2.0), V(xx + 0.09, 2.5, D2 + 2.18)), logM);
      const pr = new THREE.PlaneGeometry(2 * W2 + 0.8, 2.4); pr.rotateX(-Math.PI / 2 + 0.25); pr.translate(0, 2.65, D2 + 1.2); lb.add(pr, roofM);
      lb.add(boxGeo(V(-0.55, 0.3, D2 + 0.1), V(0.55, 2.2, D2 + 0.18)), flat("lodgeDoor", "#5a3a22"));
      // chimney
      lb.add(boxGeo(V(W2 - 1.4, 0, -0.5), V(W2 - 0.6, Hh + 2.6, 0.3)), lam("chimneyStone", () => ({ map: stoneHD("chimT", ["#9a948a", "#8a847a", "#aaa49a", "#7e786e"], "#4a463e") })));
      lb.build(Lg, true);
      void endM;
      for (const xx of [-2.2, 2.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), emissive(2.6, 1.9, 0.9)); w.position.set(xx, 1.5, D2 + 0.17); w.layers.set(NOINK); Lg.add(w); const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.04), flat("winFrameL", "#3a2414")); fr.position.set(xx, 1.5, D2 + 0.15); Lg.add(fr); }
      const sb = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.75), new THREE.MeshBasicMaterial({ map: signBoard("agloeLodge", "AGLOE LODGE", "FISHING · ROOMS", 1024, 256, "#5a3a22", "#f3e2b8") })); sb.position.set(0, 3.25, D2 + 2.3); Lg.add(sb);
      const canoe = kitClone(kit, "canoe", 0.5); if (canoe) { canoe.position.set(-2.5, 0.1, -12); canoe.rotation.y = 0.6; Lg.add(canoe); }
      const dock = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 6), flat("dock", "#8a5a36")); dock.position.set(-4.5, 0.2, -10.5); Lg.add(dock);
      for (let i = 0; i < 3; i++) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 2.4, 6), flat("rod", "#6a4a2a")); rod.position.set(W2 + 0.5 + i * 0.18, 1.2, D2 + 0.6); rod.rotation.z = -0.25; Lg.add(rod); }
      for (let i = 0; i < 9; i++) { const lg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 10), logM); lg2.rotation.x = Math.PI / 2; lg2.position.set(-W2 - 0.8 + (i % 3) * 0.21, 0.1 + Math.floor(i / 3) * 0.19, 0.4); Lg.add(lg2); }
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 14), flat("barrel", "#7a4a2a")); barrel.position.set(W2 + 0.7, 0.4, D2 + 2.6); Lg.add(barrel);
      const lantern = kitClone(kit, "lantern", 1.6); if (lantern) { lantern.position.set(1.6, 0.3, D2 + 2.6); Lg.add(lantern); }
      this.smoke.set(LODGE[0] + W2 - 1.0, Hh + 2.8, LODGE[2] - 0.1);
    }

    // ================= CLASSROOM (night, the explanation) =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.class); R.add(S);
      const b = new Batch();
      b.add(planeXZ(-5, 5, -4, 5, 0.002, 5, 4), lam("planksHD", () => ({ map: planksHD() })));
      const wallC = lam("classWall", () => ({ map: plaster("classWallT", "#c9d8b8", "#6a4a2e") }));
      b.add(wallQ("+z", -4, -5, 5, 0, 3.4, 3, 1), wallC); b.add(wallQ("+x", -5, -4, 5, 0, 3.4, 2.4, 1), wallC); b.add(wallQ("-x", 5, -4, 5, 0, 3.4, 2.4, 1), wallC);
      b.add(planeXZ(-5, 5, -4, 5, 3.4).rotateX(Math.PI).translate(0, 6.8, 0), flat("ceilC", "#d8d0b8"));
      // school desks: slanted tops on legs
      for (const sx of [-0.46, 0.46]) {
        const top = new THREE.BoxGeometry(0.82, 0.04, 0.6); top.rotateX(0.12); top.translate(sx, 0.78, -0.4); b.add(top, flat("schoolDesk", "#a8723e"));
        for (const [dx, dz] of [[-0.36, -0.65], [0.36, -0.65], [-0.36, -0.15], [0.36, -0.15]]) b.add(boxGeo(V(sx + dx - 0.025, 0, dz - 0.025), V(sx + dx + 0.025, 0.76, dz + 0.025)), flat("deskLeg", "#3a3a40"));
      }
      b.build(S, false);
      pic("bbC", blackboard(), 3.0, 1.5, [ORG.class[0], 1.85, ORG.class[2] - 3.97], 0);
      for (const sx of [-0.46, 0.46]) { const hw = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ map: homework("hwA", false) })); hw.name = "hw" + sx; hw.rotation.set(-Math.PI / 2 + 0.12, 0, sx < 0 ? 0.1 : -0.12); hw.position.set(sx, 0.805, -0.38); S.add(hw); }
      // night windows (moon), desk lamp pools, alphabet strip, globe, apple
      const nightWin = ctex("nightWinT", 256, 384, (g) => { g.fillStyle = "#f3efe4"; g.fillRect(0, 0, 256, 384); const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#0e1a44"); gr.addColorStop(1, "#2a4a8c"); g.fillStyle = gr; g.fillRect(18, 18, 220, 348); g.fillStyle = "#f6f0c8"; g.beginPath(); g.arc(170, 90, 34, 0, 6.3); g.fill(); g.fillStyle = "#fff"; for (let i = 0; i < 20; i++) g.fillRect((i * 53) % 220 + 18, (i * 97) % 340 + 18, 3, 3); g.fillStyle = "#f3efe4"; g.fillRect(122, 18, 12, 348); g.fillRect(18, 186, 220, 12); });
      for (const z of [-2.2, 1.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), new THREE.MeshBasicMaterial({ map: nightWin })); w.position.set(ORG.class[0] - 4.97, 1.9, ORG.class[2] + z); w.rotation.y = Math.PI / 2; R.add(w); }
      pic("abcC", ctex("abcT", 1024, 96, (g) => { g.fillStyle = "#f3efe4"; g.fillRect(0, 0, 1024, 96); g.font = "bold 64px serif"; "AaBbCcDdEeFfGg".split("").forEach((c, i) => { g.fillStyle = ["#c0353a", "#2f6a43", "#2f5f8a"][i % 3]; g.fillText(c, 20 + i * 72, 72); }); }), 4.0, 0.38, [ORG.class[0], 2.95, ORG.class[2] - 3.96], 0);
      for (const sx of [-1.7, 1.7]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), emissive(3.2, 2.6, 1.6)); bulb.position.set(sx, 2.7, -0.4); bulb.layers.set(NOINK); S.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), flat("cordC", "#222")); cord.position.set(sx, 3.05, -0.4); S.add(cord); }
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), flat("apple", "#d8302e")); apple.position.set(-1.6, 0.86, -3.2); S.add(apple);
      const tdesk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7), flat("teacherDesk", "#7a4a2a")); tdesk.position.set(-1.6, 0.4, -3.2); S.add(tdesk);
      furn(S, "bookcaseOpen", 1.9, [4.5, 0, -2.6], -Math.PI / 2); furn(S, "pottedPlant", 1.1, [4.4, 0, 1.8], 0); 
    }

    // ================= KITCHEN (night farmhouse: the one-dollar sale) =================
    {
      const S = new THREE.Group(); S.position.set(...ORG.kitchen); R.add(S);
      const b = new Batch();
      b.add(planeXZ(-5, 5, -4, 5, 0.002, 5, 4), lam("planksHD", () => ({ map: planksHD() })));
      const wallK = lam("kitchenWall", () => ({ map: wallpaper() }));
      b.add(wallQ("+z", -4, -5, 1.0, 0, 3.2, 2.5, 1.3), wallK); b.add(wallQ("+z", -4, 2.4, 5, 0, 3.2, 1.1, 1.3), wallK); b.add(wallQ("+z", -4, 1.0, 2.4, 2.4, 3.2, 0.55, 0.33), wallK);
      b.add(wallQ("+x", -5, -4, 5, 0, 3.2, 3.5, 1.3), wallK); b.add(wallQ("-x", 5, -4, 5, 0, 3.2, 3.5, 1.3), wallK);
      b.add(planeXZ(-5, 5, -4, 5, 3.2).rotateX(Math.PI).translate(0, 6.4, 0), flat("ceilK", "#5a4030"));
      for (let x = -4; x <= 4; x += 2) b.add(boxGeo(V(x - 0.1, 3.0, -4), V(x + 0.1, 3.2, 5)), flat("beamK", "#4a3020"));
      // table with cloth, the deed, oil lamp; door frame (back right) with moonlight behind
      b.add(boxGeo(V(-1.25, 0.76, -0.75), V(1.0, 0.8, 0.25)), flat("tableTop", "#8a5a36"));
      for (const [dx, dz] of [[-1.15, -0.65], [0.9, -0.65], [-1.15, 0.15], [0.9, 0.15]]) b.add(boxGeo(V(dx - 0.04, 0, dz - 0.04), V(dx + 0.04, 0.76, dz + 0.04)), flat("tableLeg", "#5a3a22"));
      b.add(boxGeo(V(-1.0, 0.8, -0.6), V(0.75, 0.805, 0.1)), flat("tableCloth", "#e8d8c0"));
      b.add(boxGeo(V(0.9, 0, -4.05), V(1.0, 2.4, -3.85)), flat("doorFrameK", "#4a2a18")); b.add(boxGeo(V(2.4, 0, -4.05), V(2.5, 2.4, -3.85)), flat("doorFrameK", "#4a2a18")); b.add(boxGeo(V(0.9, 2.4, -4.05), V(2.5, 2.5, -3.85)), flat("doorFrameK", "#4a2a18"));
      b.build(S, false);
      const moon = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ map: ctex("moonDoor", 128, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#1a2a5a"); gr.addColorStop(1, "#4a6aa8"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.fillStyle = "#2a3a2a"; g.fillRect(0, 200, 128, 56); }), color: new THREE.Color(1.3, 1.3, 1.5) })); moon.position.set(1.7, 1.2, -4.3); moon.layers.set(NOINK); S.add(moon);
      const deed = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshBasicMaterial({ map: deedTex() })); deed.rotation.set(-Math.PI / 2, 0, 0.08); deed.position.set(-0.25, 0.81, -0.28); S.add(deed);
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 14), flat("oilLamp", "#c9a24a")); lampBase.position.set(-0.85, 0.87, -0.45); S.add(lampBase);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.24, 14, 1, true), new THREE.MeshPhongMaterial({ color: "#f4f0e0", transparent: true, opacity: 0.5, depthWrite: false })); chimney.position.set(-0.85, 1.05, -0.45); S.add(chimney);
      const flameM = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), emissive(4.5, 3.0, 1.2)); flameM.position.set(-0.85, 1.0, -0.45); flameM.scale.set(1, 1.6, 1); flameM.layers.set(NOINK); S.add(flameM); this.lampGlows.push(flameM);
      furn(S, "kitchenStove", 1.0, [-3.2, 0, -3.55], 0); furn(S, "kitchenCabinet", 0.9, [-4.2, 0, -3.55], 0); furn(S, "kitchenCabinetUpper", 0.7, [-3.7, 1.7, -3.75], 0);
      furn(S, "chair", 0.95, [-0.75, 0, -1.25], 0); furn(S, "chair", 0.95, [0.6, 0, 0.6], Math.PI); furn(S, "sideTable", 0.7, [3.8, 0, 2.5], 0);
      for (let i = 0; i < 6; i++) { const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), lam("jarK" + (i % 3), () => ({ color: ["#e0a040", "#c84a3a", "#7aa04a"][i % 3] }))); jar.position.set(-4.6 + i * 0.24, 2.35, -3.8); S.add(jar); }
      const shelfK = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.25), flat("shelfK", "#5a3a22")); shelfK.position.set(-4.0, 2.25, -3.85); S.add(shelfK);
      pic("calK", ctex("calT", 256, 320, (g) => { g.fillStyle = "#f3efe4"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#c0353a"; g.fillRect(0, 0, 256, 70); g.fillStyle = "#fff"; g.font = "bold 44px serif"; g.textAlign = "center"; g.fillText("1930", 128, 52); g.fillStyle = "#333"; g.font = "20px sans-serif"; for (let i = 0; i < 30; i++) g.fillText(String(i + 1), 26 + (i % 7) * 34, 110 + Math.floor(i / 7) * 40); }), 0.5, 0.62, [ORG.kitchen[0] - 4.97, 1.8, ORG.kitchen[2] + 0.6], Math.PI / 2);
    }

    // stars for the night shots (desk/kitchen windows are painted; this is for the class/kitchen sky through doors)
    const sp: number[] = []; for (let i = 0; i < 400; i++) { const a = hh(i, 1) * Math.PI * 2, e2 = 0.05 + hh(i, 2) * 1.3; sp.push(Math.cos(a) * Math.cos(e2) * 600, Math.sin(e2) * 600, Math.sin(a) * Math.cos(e2) * 600); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(pg, new THREE.PointsMaterial({ color: "#dfe8ff", size: 2.0, sizeAttenuation: false, fog: false })); this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars);
    void facadeHD; void LIGHTTAB; void roofHD;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  private shotSun(id: number, az0: number, el0: number) {
    let v = this.sunCache.get(id); if (v) return v;
    const kk = CAMS[id][CAMS[id].length - 1], fx0 = kk.look[0] - kk.pos[0], fz0 = kk.look[2] - kk.pos[2], n = Math.hypot(fx0, fz0) || 1, fx = fx0 / n, fz = fz0 / n;
    const az = THREE.MathUtils.degToRad(az0), el = THREE.MathUtils.degToRad(el0);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize(); this.sunCache.set(id, v); return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light], set: Set = s.set;
    const c = camFinal(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = set === "desk" ? 0.02 : 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    // camera-relative sun frozen per shot; interiors: high key from the window side
    const az = s.light === "interior" || s.light === "warm" ? 140 : s.light === "golden" ? 150 : s.light === "night" ? 120 : 130;
    const el = s.light === "interior" ? 50 : s.light === "warm" ? 38 : s.light === "golden" ? 18 : s.light === "night" ? 40 : 44;
    const sunDir = this.shotSun(id, az, el), focus = new THREE.Vector3(...c.look);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = set === "cross" ? 45 : set === "desk" ? 4 : 12;
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = set === "cross" ? L.fogNear : 200; this.fog.far = set === "cross" ? L.fogFar : 900; scene.fog = this.fog; scene.background = null;
    const kk0 = CAMS[id][0], fwx = kk0.look[0] - kk0.pos[0], fwz = kk0.look[2] - kk0.pos[2], fn = Math.hypot(fwx, fwz) || 1, baseA = Math.atan2(fwz / fn, fwx / fn);
    this.clouds.forEach((m, i) => {
      const a = baseA + (i - 4) * 0.22 + (hh(i, id) - 0.5) * 0.12 + f * 0.00004, el2 = 0.06 + hh(i + 3, id) * 0.2, d = 420;
      m.position.set(cam.position.x + Math.cos(a) * Math.cos(el2) * d, Math.max(40, cam.position.y + Math.sin(el2) * d), cam.position.z + Math.sin(a) * Math.cos(el2) * d);
      const w = 110 + hh(i, id + 7) * 90; m.scale.set(w, w / 2, 1); m.lookAt(cam.position.x, m.position.y, cam.position.z);
      m.visible = set === "cross" && s.light !== "night";
      (m.material as THREE.MeshBasicMaterial).map = cloudHD(i % 4, s.light === "golden" ? LOOK.golden.cloud : LOOK.day.cloud);
    });
    this.stars.position.copy(cam.position); this.stars.visible = s.light === "night";

    // ---- per-frame props ----
    const lodgeOn = set === "cross" && (id === 16 || id === 17 || (id === 2 && f >= EV.real));
    this.lodge.visible = lodgeOn;
    const pop = id === 2 ? spring((f - EV.real) / 18) : 1;
    this.lodge.scale.set(Math.max(0.001, pop), Math.max(0.001, pop), Math.max(0.001, pop));
    this.mapA.visible = id !== 7; this.mapB.visible = id === 12; this.mapL.visible = this.mapR.visible = id === 7;
    if (id === 12) { const u = easeOut((f - SHOTS[11].a) / 20); this.mapB.position.set(0.04, MAP_Y + 0.004, -1.9 + 1.9 * u); this.mapB.rotation.z = 0.08 * (1 - u) + 0.03; }
    this.nightDesk.visible = id === 10;
    const glass = this.lightTop.color; const flick = 2.2 + 0.08 * Math.sin(f * 1.7) + 0.05 * Math.sin(f * 4.1); glass.setRGB(flick, flick * 1.08, flick * 0.95);
    for (const m of this.lampGlows) { const k2 = 1 + 0.04 * Math.sin(f * 0.9 + m.id); (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(1).setRGB(3.4 * k2, 2.8 * k2, 1.7 * k2); }
    for (const sh of this.shafts) { sh.visible = set === "office"; (sh.material as THREE.MeshBasicMaterial).opacity = s.light === "golden" ? 1 : 0.75; (sh.material as THREE.MeshBasicMaterial).color.set(s.light === "golden" ? "#ffb070" : "#fff0d0"); }
    // dust motes drift through the office shafts (micro motion every frame)
    this.dust.visible = set === "office";
    if (this.dust.visible) {
      const pa = this.dust.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) {
        const wx = [-3.6, 0, 3.6][i % 3], t = f * 0.004 + hh(i, 1) * 10;
        pa.setXYZ(i, ORG.office[0] + wx + 0.5 + (hh(i, 2) - 0.5) * 1.2 + Math.sin(t * 1.3 + i) * 0.15, 0.4 + ((hh(i, 3) * 2.8 + t * 0.35) % 2.8), ORG.office[2] - 4.5 + hh(i, 4) * 3.4 + Math.cos(t + i) * 0.1);
      }
      pa.needsUpdate = true;
    }

    // ---- cast ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const lx = sunDir.dot(right), light2 = Math.round(Math.atan2(-sunDir.y, lx) / (Math.PI / 4)) * (Math.PI / 4);
    let ai = 0; const used: Actor[] = [];
    let fi = 0; const fused: Fx[] = [];
    const pushFx = (key: string, cw: number, ch: number, k: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, o: { flat?: boolean; rot?: number; soft?: boolean; face?: boolean } = {}) => {
      const e = this.fx(fi++); e.r = this.pool.req(key, cw, ch, k, draw); e.use(!!o.soft); e.mesh.visible = true; e.mesh.position.set(x, y, z);
      if (o.flat) e.mesh.rotation.set(-Math.PI / 2, 0, o.rot ?? 0); else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(o.rot ?? 0); }
      e.mesh.scale.set(w, h, 1); fused.push(e);
    };
    for (const p of stage(id, f)) {
      const a = this.actor(ai++);
      const d = cam.position.distanceTo(new THREE.Vector3(p.at[0], p.at[1] + 1.2, p.at[2]));
      const [w, h, kq] = tier(d), blink = lidOf(f, p.who.seed);
      let key: string, draw: (pp: Pen) => void, mirror = false;
      if (p.side) {
        mirror = p.side.dir * right.x < 0;
        const so = { phase: q(p.side.phase), expr: "stern" as Expr, mode: p.side.mode, light: light2, seed: p.who.seed, stride: 0.9, blink };
        key = `S|${p.who.key}|${JSON.stringify(so)}`; draw = (pp) => bodySide(pp, p.who.o, so);
      } else {
        const fo = { mode: p.mode ?? "stand", expr: p.expr ?? "neutral", prop: p.prop ?? null, look: p.look ?? 0, headTilt: p.headTilt ?? 0, tilt: p.tilt ?? 0, blink, light: light2, facing: 0 as const, seed: p.who.seed };
        key = `F|${p.who.key}|${JSON.stringify(fo, (_k, v) => (typeof v === "number" ? q(v) : v))}`; draw = (pp) => bodyFront(pp, p.who.o, fo);
      }
      a.r = this.pool.req(key, w, h, kq, draw);
      a.mesh.visible = true; a.mesh.position.set(...p.at);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.at[0], cam.position.z - p.at[2]), 0);
      const scl = p.scale ?? 1; a.mesh.scale.set(mirror ? -scl : scl, scl, scl); a.mesh.castShadow = L.actorShadow && !p.shadowOff; used.push(a);
      pushFx("blob|contact|#3d3354", 128, 128, 1, (pp) => fxContact(pp, "#3d3354"), p.at[0], p.at[1] + 0.02, p.at[2], 0.55, 0.42, { flat: true });
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;

    // ---- effects (per shot) ----
    const D = (p: V3): V3 => O("desk", p), Mx = MAP_X;
    const hand = (tip: V3, lift: number) => { // hand card flat on the map, pencil tip at `tip`; shadow blob under it
      pushFx("handPencil", 256, 256, 1, handPencil, tip[0] + 0.075, tip[1] + 0.012 + lift, tip[2] - 0.055, 0.2, 0.2, { flat: true, rot: 0 });
      pushFx("blob|contact|#3d3354", 128, 128, 1, (pp) => fxContact(pp, "#3d3354"), tip[0] + 0.07 + lift * 0.4, tip[1] + 0.003, tip[2] - 0.04 + lift * 0.4, 0.16, 0.12, { flat: true });
    };
    const tapLift = (f0: number) => { const d = f - f0; return d < -8 ? 0.05 : d < 0 ? 0.05 * (-d / 8) : d < 6 ? 0.03 * (d / 6) : 0.03; };
    if (id === 1) {
      const lift = Math.min(tapLift(EV.tap), f < EV.tap2 - 10 ? 1 : tapLift(EV.tap2));
      hand(D([Mx[0], Mx[1], Mx[2]]), lift);
      for (const f0 of [EV.tap, EV.tap2]) if (f >= f0 && f < f0 + 14) pushFx(`ring|${Math.round((f - f0) / 2)}`, 300, 300, 0.5, (pp) => fxRing(pp, (f - f0) / 14), ...D([Mx[0], Mx[1] + 0.004, Mx[2]]), 0.12, 0.12, { flat: true });
    }
    if (id === 2) {
      if (f >= EV.real && f < EV.real + 14) pushFx(`burst|${Math.round((f - EV.real) / 2)}`, 600, 600, 0.5, (pp) => fxBurst(pp, (f - EV.real) / 14), ...O("cross", [LODGE[0], 3.5, LODGE[2] + 3]), 9, 9);
      for (let i = 0; i < 6; i++) { const u = clamp01((f - EV.real - i * 2) / 24); if (u <= 0 || u >= 1) continue; pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), ...O("cross", [LODGE[0] + Math.cos(i) * (3 + u * 4), 0.6 + u, LODGE[2] + 3 + Math.sin(i) * (2 + u * 3)]), 1.5 + u * 2, 1.5 + u * 2, { soft: true }); }
    }
    if (id === 4) { // the road being inked + the hand riding its end
      const u = clamp01((f - SHOTS[3].a) / (SHOTS[3].b - SHOTS[3].a - 6)), cx = -0.12, cz = 0.0, W4 = 0.5;
      pushFx(`inkroad|${Math.round(u * 40)}`, 512, 512, 1, inkRoad(u), ...D([cx, MAP_Y + 0.002, cz]), W4, W4, { flat: true });
      const [ex, ey] = inkEnd(u); hand(D([cx - W4 / 2 + (ex / 512) * W4, MAP_Y, cz - W4 / 2 + (ey / 512) * W4]), 0.004 * Math.abs(Math.sin(f * 0.8)));
    }
    if (id === 7) { // a road is a road, a river is a river: the same line lights up on both maps
      for (const sx of [-0.62, 0.62]) {
        if (f >= EV.road) pushFx("glow|road", 512, 256, 1, glowLine("#ff5a3a", "road"), ...D([sx, MAP_Y + 0.004, -0.05]), 0.8, 0.4, { flat: true, soft: true });
        if (f >= EV.river) pushFx("glow|river", 512, 256, 1, glowLine("#4ab0ff", "river"), ...D([sx, MAP_Y + 0.005, 0.12]), 0.8, 0.4, { flat: true, soft: true });
      }
    }
    if (id === 9 || id === 10 || id === 12) { // the dot + the letters AGLOE (scramble on "initials" .. "scrambled")
      const base = D([Mx[0], Mx[1] + 0.003, Mx[2]]);
      if (id === 9 && f < EV.name + 10) hand(D([Mx[0] + (f < EV.draw ? 0.06 : 0), Mx[1], Mx[2]]), f < EV.draw ? 0.04 : tapLift(EV.draw));
      if ((id === 9 && f >= EV.draw) || id === 10) {
        pushFx("dot", 64, 64, 1, (pp) => { pp.g.fillStyle = "#1f1a2e"; pp.g.beginPath(); pp.g.arc(32, 32, 26, 0, 6.3); pp.g.fill(); }, base[0], base[1], base[2], 0.012, 0.012, { flat: true });
        if (id === 9 && f < EV.draw + 14) pushFx(`ring|${Math.round((f - EV.draw) / 2)}`, 300, 300, 0.5, (pp) => fxRing(pp, (f - EV.draw) / 14), base[0], base[1] + 0.001, base[2], 0.06, 0.06, { flat: true });
      }
      if (id === 9 && f >= EV.name || id === 10) {
        const word = ["A", "G", "L", "O", "E"], ini = ["O", "G", "L", "E", "A"]; // initials order: O G L . E A
        for (let i = 0; i < 5; i++) {
          const appear = spring((f - EV.name - i * 2) / 10);
          const fin: [number, number] = [-0.032 + i * 0.016, -0.02];
          const j = ini.indexOf(word[i]); const spl: [number, number] = [-0.05 + j * 0.02 + (j >= 3 ? 0.012 : 0), -0.035];
          const toS = id === 9 ? smooth((f - EV.initials) / 8) - smooth((f - EV.scram) / 10) : 0;
          const hop = id === 9 && f >= EV.scram && f < EV.scram + 12 ? Math.sin(((f - EV.scram) / 12) * Math.PI) * (0.012 + 0.006 * (i % 2)) : 0;
          const x = fin[0] + (spl[0] - fin[0]) * toS, z = fin[1] + (spl[1] - fin[1]) * toS + hop * (i % 2 ? 1 : -1);
          const sc = 0.02 * appear;
          if (sc > 0.0005) pushFx(`let|${word[i]}`, 256, 256, 1, letterCard(word[i]), base[0] + x, base[1] + 0.001 + i * 0.0002, base[2] + z, sc, sc, { flat: true });
        }
        if (id === 9 && f >= EV.initials && f < EV.scram) for (const [ch, xx] of [[".", 0.0], [".", 0.02]] as const) pushFx("let|.", 256, 256, 1, letterCard(ch), base[0] - 0.05 + xx + 0.02 * 2.6, base[1] + 0.001, base[2] - 0.035, 0.012, 0.012, { flat: true });
      }
      if (id === 10 && f >= EV.wait) { const u = spring((f - EV.wait) / 12), bob = Math.sin((f - EV.wait) * 0.25) * 0.006; pushFx("qmark", 256, 256, 1, qmark, base[0] + 0.03, base[1] + 0.09 + bob, base[2] - 0.02, 0.08 * u, 0.08 * u, { rot: Math.sin(f * 0.2) * 0.12 }); }
      if (id === 12 && f >= EV.find) { // red pencil circle around Agloe on the rival map (drawn on)
        const u = clamp01((f - EV.find) / 10);
        pushFx(`circ|${Math.round(u * 10)}`, 512, 256, 1, (pp) => { const g = pp.g; g.strokeStyle = "#d8202e"; g.lineWidth = 18; g.beginPath(); g.ellipse(256, 128, 220, 92, -0.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2.1 * u); g.stroke(); }, base[0] + 0.05, base[1] + 0.006, base[2] - 0.014, 0.14, 0.065, { flat: true });
      }
    }
    if (id === 11) { // homework: the fake word glows on both sheets, CAUGHT stamp
      if (f >= EV.word) for (const sx of [-0.46, 0.46]) { if (sx > 0 && f < EV.same) continue; pushFx("glow|hw", 256, 128, 1, (pp) => { const g = pp.g; const gr = g.createRadialGradient(128, 64, 0, 128, 64, 128); gr.addColorStop(0, "rgba(255,230,90,0.9)"); gr.addColorStop(1, "rgba(255,230,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }, ...O("class", [sx - 0.03, 0.815, -0.4]), 0.22, 0.09, { flat: true, soft: true }); }
      if (f >= EV.copied) { const u = spring((f - EV.copied) / 10); pushFx("stamp|caught", 512, 256, 1, stampCard("CAUGHT!", ""), ...O("class", [0.0, 1.7, -0.3]), 0.62 * u, 0.31 * u); }
      if (f >= EV.friend && f < EV.copied) pushFx(`eyes|${Math.floor(f / 4) % 2}`, 128, 64, 1, (pp) => { const g = pp.g; g.strokeStyle = INK; g.lineWidth = 6; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(120, 40); g.quadraticCurveTo(64, 0, 8, 40); g.stroke(); }, ...O("class", [0.0, 1.62, -0.7]), 0.45, 0.22);
    }
    if (id === 13 && f >= EV.gotcha && f < EV.gotcha + 14) pushFx(`burst|${Math.round((f - EV.gotcha) / 2)}`, 600, 600, 0.5, (pp) => fxBurst(pp, (f - EV.gotcha) / 14), ...O("office", [-0.95, 2.1, -0.75]), 1.6, 1.6);
    if (id === 15 && f >= EV.check && f < EV.check + 18) { const u = (f - EV.check) / 18; for (let i = 0; i < 4; i++) pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), ...O("rival", [BOSS[0] - 0.4 + i * 0.3, 0.95 + u * 0.2, BOSS[2] + 0.9]), 0.4 + u * 0.4, 0.4 + u * 0.4, { soft: true }); }
    if (set === "rival") for (let i = 0; i < 5; i++) { // cigar smoke curling up from the boss
      const u = (((f / 60) + i / 5) % 1), sz = 0.12 + u * 0.4;
      pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), ...O("rival", [BOSS[0] + 0.35 + Math.sin(u * 5 + i) * 0.12, 1.75 + u * 1.3, BOSS[2] + 0.1]), sz, sz, { soft: true });
    }
    if (set === "cross") {
      if (this.lodge.visible) for (let i = 0; i < 5; i++) { const u = (((f / 70) + i / 5) % 1), sz = 0.6 + u * 1.8; pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), this.smoke.x + u * 1.5 + ORG.cross[0], this.smoke.y + u * 3.5, this.smoke.z + ORG.cross[2], sz * pop, sz * pop, { soft: true }); }
      for (let i = 0; i < 7; i++) { const x = ((f * (0.06 + hh(i, 3) * 0.05) + i * 25) % 120) - 60, flap = Math.sin(f * 0.6 + i) > 0;
        pushFx(`bird|${flap ? 1 : 0}`, 128, 64, 1, (pp) => { const g = pp.g; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(8, flap ? 20 : 44); g.quadraticCurveTo(36, flap ? 44 : 20, 64, 34); g.quadraticCurveTo(92, flap ? 44 : 20, 120, flap ? 20 : 44); g.stroke(); }, ...O("cross", [x, 16 + hh(i, 4) * 8, -30 - hh(i, 5) * 25]), 1.0, 0.5); }
      if (id === 17 && f >= EV.fakes && f < EV.fakes + 24) pushFx(`stars|${Math.round((f - EV.fakes) / 3)}`, 600, 600, 0.5, (pp) => fxStars(pp, (f - EV.fakes) / 24), ...O("cross", [0.15, 2.4, 0.55]), 0.9, 0.9);
      if (id === 20) { // the GNIS paper slides up in front of the lens, the stamp slams, then it drops away for the crane
        const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
        const inU = easeOut((f - (EV.gov - 6)) / 16), outU = smooth((f - (EV.notOff + 8)) / 14);
        if (inU > 0 && outU < 1) {
          const p = cam.position.clone().addScaledVector(fwd, 1.25).addScaledVector(up, -0.95 * (1 - inU) - 1.2 * outU);
          pushFx(`gnis|${f >= EV.notOff ? 1 : 0}`, 512, 672, 1, gnisDoc(f >= EV.notOff), p.x, p.y, p.z, 0.52, 0.68, { rot: -0.05 });
          if (f >= EV.notOff - 8 && f < EV.notOff) { const u2 = clamp01((EV.notOff - f) / 8); const p2 = p.clone().addScaledVector(fwd, -0.05 - u2 * 0.25); pushFx("stamp|rubber", 256, 256, 1, (pp) => { const g = pp.g; g.fillStyle = "#5a3a22"; g.fillRect(100, 10, 56, 150); g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(100, 10, 56, 150); g.fillStyle = "#3a2a20"; g.fillRect(40, 150, 176, 70); g.strokeRect(40, 150, 176, 70); g.fillStyle = "#d8202e"; g.fillRect(40, 220, 176, 16); }, p2.x, p2.y + 0.05 + u2 * 0.2, p2.z, 0.3, 0.3); }
        }
      }
    }
    if (id === 18) { // the buyer (silhouette card in the doorway) and the dollar sliding across the table
      if (f >= EV.family) { const u = smooth((f - EV.family) / 12); pushFx("buyer", 600, 1000, 1, buyerCard, ...O("kitchen", [1.7, 0, -3.7]).map((v, i) => (i === 1 ? 1.05 : v)) as V3, 1.3 * u + 0.001, 2.16); }
      const u = easeOut((f - EV.dollar + 6) / 14); if (f >= EV.dollar - 6) pushFx("dollar", 256, 128, 1, dollarCard, ...O("kitchen", [0.65 - 0.55 * u, 0.812, -0.15]), 0.24, 0.12, { flat: true, rot: 0.1 - 0.1 * u });
      if (f >= EV.dollar + 8 && f < EV.dollar + 30) pushFx(`stars|${Math.round((f - EV.dollar - 8) / 3)}`, 600, 600, 0.5, (pp) => fxStars(pp, (f - EV.dollar - 8) / 22), ...O("kitchen", [0.1, 0.95, -0.15]), 0.35, 0.35);
    }
    if (id === 19) { // decades of road maps flip by on the desk, then the phone with the pin
      const covers: [string, string][] = [["1930", "#c0353a"], ["1950", "#2f5f8a"], ["1970", "#e0a030"], ["1990", "#2f6a43"]];
      covers.forEach(([y, col], i) => {
        const f0 = SHOTS[18].a + 4 + i * 11, u = i === 3 ? 0 : smooth((f - f0) / 9);
        const p = D([-0.25 + i * 0.012, MAP_Y + 0.01 + (3 - i) * 0.006, 0.0]);
        if (u < 1 || i === 3) pushFx(`cover|${y}`, 256, 344, 1, mapCover(y, col), p[0], p[1] + 0.12 * Math.sin(u * Math.PI), p[2] - 0.1 * u, 0.32, 0.43 * Math.cos(u * Math.PI * 0.5) + 0.001, { flat: true, rot: 0.05 * i });
      });
      if (f >= EV.google - 8) { const u = easeOut((f - EV.google + 8) / 14); pushFx("phone", 256, 512, 1, phoneCard, ...D([0.62 + 0.5 * (1 - u), MAP_Y + 0.02, 0.05]), 0.2, 0.4, { flat: true, rot: -0.08 }); }
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
