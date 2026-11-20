// THE ARMY MADE OF AIR — one three.js world posed per frame from ghoststory.ts / ghoststage.ts.
// Northern-France countryside (hills, patchwork fields, poplar road, hedgerows, village + church + windmill, haystacks,
// cows, mist), the decoy tank field (Shermans, tents, trucks, guns), a night forest clearing, a canvas tent interior,
// the Rhine at night (searchlights, decoy site, crossing), and a German recon plane.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Pen, bodyFront, bodySide, fxPuff, fxStars, fxBurst, fxRing, fxContact, Expr, INK } from "./toon";
import { Actor, Fx, Pool } from "./cast";
import { lam, kitClone, Kit, Batch, boxGeo, V, house, prop } from "./build";
import { TONE, CHAR, untone } from "./shade";
import { LIGHTS, LOOK } from "./lights";
import { NOINK } from "./ink";
import { ctex, rep, stoneHD, cloudHD, grassHD, waterNear } from "./paint";
import { SHOTS, EV, FPS, V3, TANK0, FARM, FOREST, SPEAKER, TENT, RIVER_Z, DECOY, FIELD_ROWS, smooth, clamp01, glide, CAMS, liftY } from "./ghoststory";
import { stage, camFinal, hh, LIFTERS } from "./ghoststage";

// ---------------- kit ----------------
const KIT: [string, string][] = [["bridge/kenney", "windmill"], ["bridge/kenney", "cart"], ["bridge/kenney", "lantern"], ["kenney/nature-kit", "fence_simple"],
  ["kenney/furniture-kit", "chairDesk"]];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KIT.map(([d, n]) => loader.loadAsync(staticFile(`${d}/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- terrain ----------------
/** ground height: flat around the farm/field, rolling hills beyond, the Rhine valley dips to the water */
export const ht = (x: number, z: number) => {
  const d = Math.hypot(x * 0.8, (z + 40) * 0.9);
  let h = smooth((d - 120) / 260) * (10 + 9 * Math.sin(x * 0.011 + 1.3) + 7 * Math.cos(z * 0.009 + 0.4) + 6 * Math.sin((x + z) * 0.02));
  const r = Math.abs(z - RIVER_Z);
  h *= smooth((r - 70) / 120);                                     // keep the river valley low
  if (r < 60) h = Math.min(h, -1.5 * smooth((60 - r) / 25));       // banks slope into the water
  if (Math.hypot(x - 250, z) < 20) h = 0;                          // tent pad
  h *= smooth((Math.hypot(x - FOREST[0], z - FOREST[2]) - 30) / 40); // forest clearing stays level
  return h;
};
const fieldsTex = () => ctex("fieldsT", 1024, 1024, (g, r) => {
  const cols = ["#7fae4a", "#94b84e", "#c9b45a", "#6c9a3e", "#a8c060", "#b89a4a", "#86a84a", "#d0be6a"];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x * 256, y * 256, 256, 256);
    g.strokeStyle = "rgba(0,0,0,0.07)"; g.lineWidth = 3; const ang = r() < 0.5;
    for (let k = 0; k < 256; k += 14) { g.beginPath(); if (ang) { g.moveTo(x * 256 + k, y * 256); g.lineTo(x * 256 + k, y * 256 + 256); } else { g.moveTo(x * 256, y * 256 + k); g.lineTo(x * 256 + 256, y * 256 + k); } g.stroke(); }
  }
  g.strokeStyle = "#3f6a2c"; g.lineWidth = 14; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(1024, i * 256); g.stroke(); }
});
const dirtTex = () => ctex("dirtT", 512, 512, (g, r) => { g.fillStyle = "#b8935e"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,210,0.12)" : "rgba(80,50,20,0.12)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 5, 2 + r() * 5); } g.strokeStyle = "rgba(90,60,30,0.35)"; g.lineWidth = 10; for (const x of [150, 362]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } });
const starTex = () => ctex("usStar", 256, 256, (g) => { g.fillStyle = "#f4f1e6"; g.beginPath(); g.arc(128, 128, 120, 0, 6.3); g.lineWidth = 16; g.strokeStyle = "#f4f1e6"; g.stroke(); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 42 : 100; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } g.fill(); });
const canvasTex = (key: string, col: string) => ctex(key, 512, 512, (g, r) => { g.fillStyle = col; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 2000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 512, r() * 512, 3, 3); } g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 4; for (let x = 0; x < 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } });
const mistTex = () => ctex("mistT", 256, 128, (g) => { const gr = g.createRadialGradient(128, 64, 4, 128, 64, 128); gr.addColorStop(0, "rgba(255,248,240,0.55)"); gr.addColorStop(0.6, "rgba(255,248,240,0.2)"); gr.addColorStop(1, "rgba(255,248,240,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); });
const beamTex = () => ctex("beamT", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,250,220,0.0)"); gr.addColorStop(1, "rgba(255,250,220,0.22)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
const sketchTex = () => ctex("sketchT", 1024, 768, (g) => {
  g.fillStyle = "#f7f1df"; g.fillRect(0, 0, 1024, 768); g.strokeStyle = "rgba(60,60,80,0.15)"; g.lineWidth = 2; for (let y = 60; y < 768; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.fillStyle = "#c9c2a8"; g.fillRect(508, 0, 8, 768);
  g.strokeStyle = "#2a2a35"; g.lineWidth = 6; g.lineJoin = "round";
  const tank = (ox: number, oy: number, s: number) => { g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 360 * s, oy); g.lineTo(ox + 330 * s, oy - 70 * s); g.lineTo(ox + 40 * s, oy - 70 * s); g.closePath(); g.stroke();
    g.strokeRect(ox + 110 * s, oy - 130 * s, 140 * s, 60 * s); g.beginPath(); g.moveTo(ox + 250 * s, oy - 105 * s); g.lineTo(ox + 420 * s, oy - 115 * s); g.stroke();
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(ox + 40 * s + i * 56 * s, oy + 24 * s, 22 * s, 0, 6.3); g.stroke(); } };
  tank(60, 360, 1.0); g.font = "italic 34px serif"; g.fillStyle = "#2a2a35"; g.fillText("M4 decoy, inflatable — 93 lb", 70, 470); g.fillText("valve here →", 280, 560);
  tank(560, 330, 0.85); g.fillText("drooping at 2 pm ☹", 600, 450); g.fillText("re-pump!", 640, 520);
});
const stampTex = () => ctex("stampT", 512, 200, (g) => { g.strokeStyle = "#c0262c"; g.lineWidth = 16; g.strokeRect(14, 14, 484, 172); g.fillStyle = "#c0262c"; g.font = "bold 92px sans-serif"; g.textAlign = "center"; g.fillText("TOP SECRET", 256, 132); });
const mapTex = () => ctex("mapT", 512, 384, (g, r) => { g.fillStyle = "#e8dcb8"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#5a7ab8"; g.lineWidth = 14; g.beginPath(); g.moveTo(0, 160); g.bezierCurveTo(150, 120, 300, 240, 512, 190); g.stroke(); g.fillStyle = "#c0262c"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(60 + r() * 400, 40 + r() * 300, 7, 0, 6.3); g.fill(); } g.strokeStyle = "#2a2a35"; g.lineWidth = 3; g.strokeRect(6, 6, 500, 372); g.fillStyle = "#2a2a35"; g.font = "bold 30px serif"; g.fillText("RHEIN", 330, 170); });
const radioTex = () => ctex("radioT", 512, 256, (g) => { g.fillStyle = "#4a4e3a"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#1f2218"; g.fillRect(20, 20, 300, 120); g.fillStyle = "#e8d890"; g.fillRect(36, 40, 268, 24); for (let i = 0; i < 5; i++) { g.fillStyle = "#c8c8b8"; g.beginPath(); g.arc(60 + i * 60, 190, 22, 0, 6.3); g.fill(); g.fillStyle = "#222"; g.fillRect(57 + i * 60, 170, 6, 20); } g.fillStyle = "#c0262c"; g.beginPath(); g.arc(420, 70, 14, 0, 6.3); g.fill(); });
const cow = (p: Pen) => { const g = p.g; g.lineWidth = 9; g.strokeStyle = INK;
  g.fillStyle = "#f4f1ea"; g.beginPath(); g.ellipse(300, 600, 210, 110, 0, 0, 6.3); g.fill(); g.stroke();
  g.fillStyle = "#2a2626"; for (const [x, y, rx, ry] of [[230, 570, 60, 40], [360, 630, 50, 35], [320, 540, 30, 22]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 6.3); g.fill(); }
  for (const x of [150, 210, 380, 440]) { g.beginPath(); g.moveTo(x, 680); g.lineTo(x, 900); g.lineWidth = 20; g.stroke(); g.lineWidth = 9; }
  g.fillStyle = "#f4f1ea"; g.beginPath(); g.ellipse(520, 520, 80, 66, 0.2, 0, 6.3); g.fill(); g.stroke();
  g.fillStyle = "#f2b8b0"; g.beginPath(); g.ellipse(570, 560, 40, 28, 0.2, 0, 6.3); g.fill(); g.stroke(); g.fillStyle = "#222"; g.beginPath(); g.arc(520, 500, 9, 0, 6.3); g.fill(); };

// ---------------- helpers ----------------
const flat = (key: string, col: string) => lam(key, () => ({ color: col }));
const planeXZ = (x0: number, x1: number, z0: number, z1: number, y: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); return g;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LID = [0.5, 1, 1, 0.5];
const lidOf = (f: number, seed: number) => { let s = Math.round(-50 * hh(seed, 9)); for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(seed * 31 + n, 13)); } return 0; };
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const q = (v: number) => Math.round(v * 60) / 60;

// ---------------- vehicles ----------------
type TankRig = { g: THREE.Group; body: THREE.Group; turret: THREE.Group; barrel: THREE.Mesh };
const makeSherman = (): TankRig => {
  const g = new THREE.Group(), body = new THREE.Group(), turret = new THREE.Group();
  const od = flat("odGreen", "#5b6236"), dark = flat("odDark", "#3a3e26"), wheel = flat("tankWheel2", "#2c2e24");
  const m = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, r: V3 = [0, 0, 0], parent: THREE.Object3D = body) => { const me = new THREE.Mesh(geo, mat); me.position.set(...p); me.rotation.set(...r); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; };
  // hull with a sloped glacis
  const hull = new THREE.Shape(); hull.moveTo(-2.9, 0); hull.lineTo(2.6, 0); hull.lineTo(3.0, 0.45); hull.lineTo(2.1, 1.25); hull.lineTo(-2.7, 1.25); hull.lineTo(-2.95, 0.6); hull.closePath();
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 2.2, bevelEnabled: false }); hg.translate(0, 0.55, -1.1); m(hg, od, [0, 0, 0]);
  for (const s of [-1, 1]) { m(new THREE.BoxGeometry(6.0, 0.75, 0.55), dark, [0, 0.5, s * 1.32]); for (let i = 0; i < 6; i++) m(new THREE.CylinderGeometry(0.32, 0.32, 0.58, 12), wheel, [-2.3 + i * 0.92, 0.42, s * 1.32], [Math.PI / 2, 0, 0]); }
  const star = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, depthWrite: false })); star.position.set(-0.6, 1.2, 1.115); body.add(star);
  const star2 = star.clone(); star2.position.z = -1.115; star2.rotation.y = Math.PI; body.add(star2);
  m(new THREE.CylinderGeometry(0.95, 1.05, 0.75, 18), od, [0, 0, 0], [0, 0, 0], turret); turret.position.set(-0.2, 2.15, 0);
  m(new THREE.CylinderGeometry(0.45, 0.5, 0.25, 12), dark, [-0.2, 0.48, 0.3], [0, 0, 0], turret);
  const barrel = m(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 10), dark, [1.25, 0.05, 0], [0, 0, Math.PI / 2], turret) as THREE.Mesh;
  barrel.geometry.translate(0, -1.25, 0); barrel.position.set(0.95, 0.05, 0);
  body.add(turret); g.add(body);
  return { g, body, turret, barrel };
};
const makeTruck = (speaker = false) => {
  const g = new THREE.Group(), od = flat("odGreen", "#5b6236"), cv = lam("canvasOD", () => ({ map: canvasTex("canvasODT", "#6f6e48") })), wheel = flat("tankWheel2", "#2c2e24");
  const m = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, r: V3 = [0, 0, 0]) => { const me = new THREE.Mesh(geo, mat); me.position.set(...p); me.rotation.set(...r); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  m(new THREE.BoxGeometry(1.6, 1.4, 2.1), od, [2.0, 1.3, 0]); m(new THREE.BoxGeometry(1.2, 0.8, 1.9), od, [3.2, 1.0, 0]);
  m(new THREE.BoxGeometry(3.6, 0.4, 2.2), od, [-0.6, 0.9, 0]);
  const cover = new THREE.CylinderGeometry(1.1, 1.1, 3.6, 16, 1, false, 0, Math.PI); cover.rotateZ(Math.PI / 2); cover.rotateX(Math.PI / 2);
  m(cover, cv, [-0.6, 1.1, 0], [0, 0, 0]);
  for (const x of [-1.6, 0.2, 2.6]) for (const s of [-1, 1]) m(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14), wheel, [x, 0.45, s * 1.05], [Math.PI / 2, 0, 0]);
  if (speaker) for (const s of [-1, 1]) { const horn = new THREE.ConeGeometry(0.55, 1.3, 16, 1, true); horn.rotateZ(Math.PI / 2); m(horn, flat("hornM", "#8a8f7a"), [-1.0, 2.75, s * 0.5]); m(new THREE.BoxGeometry(0.3, 0.6, 0.3), od, [-0.4, 2.3, s * 0.5]); }
  return g;
};
const makeGun = () => { const g = new THREE.Group(), od = flat("odGreen", "#5b6236"), wheel = flat("tankWheel2", "#2c2e24");
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 10), od); b.rotation.z = Math.PI / 2 - 0.35; b.position.set(0.8, 1.3, 0); g.add(b);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.4), od); sh.position.set(-0.1, 0.9, 0); g.add(sh);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16), wheel); w.rotation.x = Math.PI / 2; w.position.set(-0.1, 0.55, s * 0.85); g.add(w); }
  const tr = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.2), od); tr.position.set(-1.4, 0.3, 0); g.add(tr);
  g.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.receiveShadow = true; } }); return g; };
const makeTent = (w = 3.2, d = 4.2, h = 2.2) => { const g = new THREE.Group(), cv = lam("canvasOD", () => ({ map: canvasTex("canvasODT", "#6f6e48") }));
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
  const me = new THREE.Mesh(geo, cv); me.castShadow = true; me.receiveShadow = true; g.add(me); return g; };
const makeBike = () => { const g = new THREE.Group(), m = flat("bike", "#2a2a30");
  for (const dx of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 20), m); w.position.set(dx, 0.36, 0); g.add(w); }
  const bar = (a: V3, b: V3) => { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), l = v.length(); const me = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, l, 6), m); me.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(me); };
  bar([-0.5, 0.36, 0], [0, 0.36, 0]); bar([0, 0.36, 0], [-0.1, 0.85, 0]); bar([-0.5, 0.36, 0], [-0.1, 0.85, 0]); bar([0, 0.36, 0], [0.4, 0.82, 0]); bar([0.5, 0.36, 0], [0.42, 0.95, 0]); bar([0.3, 0.98, -0.25], [0.3, 0.98, 0.25]);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.3), flat("basket", "#b8864a")); basket.position.set(0.62, 0.92, 0); g.add(basket); return g; };
const makePlane = () => { const g = new THREE.Group(), gr = flat("lwGrey", "#7a8270"), dk = flat("lwDark", "#3a3e36");
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 9, 12), gr); f.rotation.z = Math.PI / 2; g.add(f);
  const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 14), gr); w.position.set(0.8, 0, 0); g.add(w);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 4), gr); tw.position.set(-4.0, 0.1, 0); g.add(tw);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.12), gr); fin.position.set(-4.1, 0.8, 0); g.add(fin);
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, 6.3, 0, 1.4), flat("glass", "#a8c8d8")); can.position.set(1.8, 0.45, 0); g.add(can);
  const prop2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 0.25), dk); prop2.position.set(4.6, 0, 0); prop2.name = "prop"; g.add(prop2);
  g.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) me.castShadow = true; }); return g; };

// ---------------- world ----------------
export class GhostWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial; private fog = new THREE.Fog("#c9d8ee", 60, 420);
  private clouds: THREE.Mesh[] = []; private stars: THREE.Points; private moon: THREE.Sprite; private sunDisc: THREE.Sprite;
  private hero: TankRig; private convoy: THREE.Group[] = []; private forestTank: TankRig; private plane: THREE.Group;
  private bikes: THREE.Group[] = []; private speakerTruck: THREE.Group; private mist: THREE.Mesh[] = []; private beams: THREE.Mesh[] = [];
  private book: THREE.Mesh; private stamp: THREE.Mesh; private sunCache = new Map<number, THREE.Vector3>();
  private cows: V3[] = [];

  constructor(kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat); this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false })); m.layers.set(NOINK); this.clouds.push(m); R.add(m); }
    const sp: number[] = []; for (let i = 0; i < 900; i++) { const a = hh(i, 1) * 6.283, e2 = 0.04 + hh(i, 2) * 1.4; sp.push(Math.cos(a) * Math.cos(e2) * 900, Math.sin(e2) * 900, Math.sin(a) * Math.cos(e2) * 900); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(pg, new THREE.PointsMaterial({ color: "#e8eeff", size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false })); this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars);
    const disc = ctex("discT", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(2.4, 2.5, 2.8), fog: false, depthWrite: false })); this.moon.layers.set(NOINK); this.moon.frustumCulled = false; R.add(this.moon);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6, 4.2, 2.4), fog: false, depthWrite: false })); this.sunDisc.layers.set(NOINK); this.sunDisc.frustumCulled = false; R.add(this.sunDisc);

    // ---- terrain: rolling hills + patchwork fields; detailed grass + dirt road near the action ----
    const tg = new THREE.PlaneGeometry(1600, 1600, 200, 200); tg.rotateX(-Math.PI / 2); tg.translate(100, 0, -200);
    const pos = tg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pos.count; i++) pos.setY(i, ht(pos.getX(i), pos.getZ(i)));
    const uv = tg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 16, uv.getY(i) * 16);
    tg.computeVertexNormals();
    const terr = new THREE.Mesh(tg, lam("fieldsM", () => ({ map: fieldsTex() }))); terr.receiveShadow = true; R.add(terr);
    const b = new Batch();
    b.add(planeXZ(-90, 90, -95, 45, 0.03, 12, 9), lam("grassHD", () => ({ map: grassHD() })));
    b.add(planeXZ(-400, 400, -7, -3, 0.06, 100, 1), lam("dirtM", () => ({ map: dirtTex() })));
    b.add(planeXZ(9.5, 12.5, -3, 30, 0.05, 1, 8), lam("dirtM", () => ({ map: dirtTex() })));
    // poplars along the road, hedgerows around fields, scattered trees
    for (let x = -260; x <= 260; x += 9) { if (Math.abs(x - 14) > 7) prop(b, kit, "tree_cone", x, 0, -10.5, 13 + hh(x) * 4); }
    for (let i = 0; i < 70; i++) { const x = -150 + (i % 14) * 22 + hh(i) * 6, z = 35 + Math.floor(i / 14) * 18; if (Math.abs(x - 15) < 22 && z < 60) continue; prop(b, kit, "hedge", x, ht(x, z), z, 1.6, hh(i, 3) * 3); }
    for (let i = 0; i < 60; i++) { const a = hh(i, 4) * 6.28, d = 90 + hh(i, 5) * 220, x = Math.cos(a) * d, z = -40 + Math.sin(a) * d; if (Math.abs(z - RIVER_Z) < 70) continue; prop(b, kit, hh(i) < 0.5 ? "tree_oak" : "tree_fat", x, ht(x, z), z, 8 + hh(i, 6) * 6); }
    for (const [x, z] of [[30, 20], [36, 26], [-8, 22], [4, 34], [45, 12]] as const) prop(b, kit, "tree_oak", x, 0, z, 9);
    // village behind the field: houses, church with steeple, windmill on a hill
    for (let i = 0; i < 14; i++) { const x = -70 + i * 11 + hh(i) * 3, z = -150 - (i % 3) * 10; house(b, x, z, (hh(i, 2) - 0.5) * 0.6, 7 + hh(i, 3) * 3, 7, 6 + hh(i, 4) * 3, i, ht(x, z)); }
    const chS = stoneHD("churchHD", ["#d8cdb8", "#cfc3ae", "#e0d6c3", "#c6baa5"], "#9a8f7c"), ch = lam("churchM", () => ({ map: rep(chS, 1, 2) }));
    b.add(boxGeo(V(-22, 0, -178), V(-10, 9, -160), 2), ch); b.add(boxGeo(V(-12, 0, -176), V(-6, 22, -170), 2), ch);
    const spire = new THREE.ConeGeometry(4.2, 14, 4); spire.rotateY(Math.PI / 4); spire.translate(-9, 29, -173); b.add(spire, flat("slateRoof", "#4a5266"));
    const roofP = new THREE.ConeGeometry(9, 5, 4); roofP.rotateY(Math.PI / 4); roofP.scale(1, 1, 1.4); roofP.translate(-16, 11.5, -169); b.add(roofP, flat("tileRoof", "#b8604a"));
    b.build(R, true);
    const wm = kitClone(kit, "windmill", 16); if (wm) { wm.position.set(70, ht(70, -175), -175); wm.rotation.y = 0.6; R.add(wm); }
    const cart = kitClone(kit, "cart", 1.8); if (cart) { cart.position.set(26, 0, 22); cart.rotation.y = 1.2; R.add(cart); }
    // haystacks + fences near the meadow; cows
    const hay = flat("hay", "#e0b85a");
    for (const [x, z] of [[34, 30], [40, 34], [28, 40], [-6, 32], [-14, 40], [52, 24]] as const) { const hs = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 2.2, 14), hay); hs.position.set(x, 1.1, z); hs.castShadow = true; R.add(hs); const top = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 14), hay); top.position.set(x, 2.9, z); top.castShadow = true; R.add(top); }
    const fw = flat("fenceWood", "#8a6440"); for (let i = 0; i < 16; i++) { const px = -6 + i * 2.6; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), fw); post.position.set(px, 0.55, 30); post.castShadow = true; R.add(post); } for (const y of [0.45, 0.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(39, 0.08, 0.06), fw); rail.position.set(13.5, y, 30); rail.castShadow = true; R.add(rail); }
    this.cows = [[32, 0, 36], [38, 0, 40], [44, 0, 33], [-10, 0, 46], [24, 0, 48]];
    // mist banks (dawn)
    const mm = new THREE.MeshBasicMaterial({ map: mistTex(), transparent: true, depthWrite: false, fog: false });
    for (let i = 0; i < 26; i++) { const me = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mm); const a3 = hh(i) * 6.28, d3 = 110 + hh(i, 2) * 160, x = Math.cos(a3) * d3, z = -40 + Math.sin(a3) * d3; me.position.set(x, ht(x, z) + 2 + hh(i, 3) * 3, z); me.scale.set(60 + hh(i, 4) * 50, 9, 1); me.layers.set(NOINK); this.mist.push(me); R.add(me); }

    // ---- the decoy field: rows of Shermans, tents, trucks, guns, camo nets ----
    const { x0, x1, dx, z0, z1, dz } = FIELD_ROWS;
    for (let x = x0; x <= x1; x += dx) for (let z = z0; z >= z1; z -= dz) { const t = makeSherman(); t.g.position.set(x + (hh(x, z) - 0.5) * 2, 0, z); t.g.rotation.y = -Math.PI / 2 + (hh(z, x) - 0.5) * 0.15; t.turret.rotation.y = (hh(x + 3, z) - 0.5) * 0.6; R.add(t.g); }
    for (let i = 0; i < 8; i++) { const tr = makeTruck(); tr.position.set(-45 + i * 12, 0, -70); tr.rotation.y = Math.PI / 2; R.add(tr); }
    for (let i = 0; i < 6; i++) { const gn = makeGun(); gn.position.set(-44 + i * 16, 0, -82); gn.rotation.y = -Math.PI / 2; R.add(gn); }
    for (let i = 0; i < 10; i++) { const tn = makeTent(); tn.position.set(-50 + i * 11, 0, -95); R.add(tn); }
    const net = lam("camoNet", () => ({ map: ctex("netT", 256, 256, (g, r) => { g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = ["#4a5a2a", "#6a6a3a", "#3a4a26"][i % 3]; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 10, 3 + r() * 6, r() * 3, 0, 6.3); g.fill(); } }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    for (let i = 0; i < 4; i++) { const ng = new THREE.PlaneGeometry(9, 7, 6, 6); const pp = ng.attributes.position as THREE.BufferAttribute; for (let k = 0; k < pp.count; k++) pp.setZ(k, 0.6 * Math.sin(pp.getX(k)) * Math.cos(pp.getY(k))); ng.rotateX(-Math.PI / 2); ng.translate(-30 + i * 20, 3.2, -64); const me = new THREE.Mesh(ng, net); R.add(me); }
    // the hook tank, the night convoy, the speaker truck, the forest tank
    this.hero = makeSherman(); this.hero.g.position.set(...TANK0); R.add(this.hero.g);
    for (let i = 0; i < 6; i++) { const v = i % 2 ? makeTruck() : makeSherman().g; R.add(v); this.convoy.push(v); }
    this.speakerTruck = makeTruck(true); this.speakerTruck.position.set(...SPEAKER); this.speakerTruck.rotation.y = 0.3; R.add(this.speakerTruck);
    for (let i = 0; i < 2; i++) { const bk = makeBike(); R.add(bk); this.bikes.push(bk); }

    // ---- night forest clearing ----
    const fb = new Batch();
    for (let i = 0; i < 70; i++) { const a = hh(i, 7) * 6.28, d = 19 + hh(i, 8) * 30, x = FOREST[0] + Math.cos(a) * d, z = FOREST[2] + Math.sin(a) * d; prop(fb, kit, hh(i) < 0.5 ? "tree_oak" : "tree_cone", x, 0, z, 9 + hh(i, 9) * 7); }
    for (let i = 0; i < 18; i++) { const a = hh(i, 10) * 6.28, d = 14 + hh(i, 11) * 4; prop(fb, kit, "plant_bushLarge", FOREST[0] + Math.cos(a) * d, 0, FOREST[2] + Math.sin(a) * d, 1.4); }
    fb.build(R, true);
    this.forestTank = makeSherman(); this.forestTank.g.position.set(...FOREST); this.forestTank.g.rotation.y = -0.4; R.add(this.forestTank.g);
    const bk2 = makeBike(); bk2.position.set(FOREST[0] - 2.4, 0, FOREST[2] + 2.6); bk2.rotation.y = 0.3; R.add(bk2);
    for (const [x, z] of [[-3.5, 3.5], [3.8, 2.8], [0.5, -3.6]] as const) { const lt = kitClone(kit, "lantern", 1.2); if (lt) { lt.position.set(FOREST[0] + x, 0, FOREST[2] + z); R.add(lt); } const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) })); glow.position.set(FOREST[0] + x, 0.95, FOREST[2] + z); glow.layers.set(NOINK); R.add(glow); }
    const ftr = makeTruck(true); ftr.position.set(FOREST[0] + 10, 0, FOREST[2] - 8); ftr.rotation.y = 0.8; R.add(ftr);

    // ---- tent interior (TENT): canvas walls, table, radio, lantern, map, sketchbook ----
    const tb = new Batch(), cvIn = lam("canvasIn", () => ({ map: canvasTex("canvasInT", "#8a8660"), side: THREE.DoubleSide }));
    const [EX, , EZ] = TENT;
    const tentShape = new THREE.Shape(); tentShape.moveTo(-3.2, 0); tentShape.lineTo(3.2, 0); tentShape.lineTo(3.2, 1.8); tentShape.lineTo(0, 3.4); tentShape.lineTo(-3.2, 1.8); tentShape.closePath();
    const back = new THREE.ShapeGeometry(tentShape); back.translate(EX, 0, EZ - 2.6); tb.add(back, cvIn);
    const sideL = new THREE.PlaneGeometry(5.4, 1.8); sideL.rotateY(Math.PI / 2); sideL.translate(EX - 3.2, 0.9, EZ); tb.add(sideL, cvIn);
    const sideR = sideL.clone(); sideR.translate(6.4, 0, 0); tb.add(sideR, cvIn);
    for (const s of [-1, 1]) { const roof = new THREE.PlaneGeometry(5.4, 3.6); roof.rotateY(Math.PI / 2); roof.rotateZ(s * (Math.PI / 2 - 0.46)); roof.translate(EX + s * 1.6, 2.6, EZ); tb.add(roof, cvIn); }
    tb.add(planeXZ(EX - 3.2, EX + 3.2, EZ - 2.7, EZ + 2.7, 0.02, 3, 3), lam("planksHD", () => ({ map: canvasTex("floorT", "#7a6040") })));
    tb.add(boxGeo(V(EX - 1.1, 0.74, EZ - 0.9), V(EX + 1.1, 0.8, EZ - 0.1)), flat("tableWood", "#8a5a34"));
    for (const [x, z] of [[-1.0, -0.8], [1.0, -0.8], [-1.0, -0.2], [1.0, -0.2]] as const) tb.add(boxGeo(V(EX + x - 0.04, 0, EZ + z - 0.04), V(EX + x + 0.04, 0.74, EZ + z + 0.04)), flat("tableWood", "#8a5a34"));
    tb.add(boxGeo(V(EX - 0.9, 0.8, EZ - 0.85), V(EX - 0.2, 1.15, EZ - 0.55)), flat("radioBox", "#4a4e3a"));
    tb.build(R, false);
    const rf = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: radioTex() })); rf.position.set(EX - 0.55, 0.975, EZ - 0.545); R.add(rf);
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), lam("mapM", () => ({ map: mapTex() }))); mp.position.set(EX + 0.6, 1.6, EZ - 2.58); R.add(mp);
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.8, 1.4) })); tl.position.set(EX + 0.8, 1.05, EZ - 0.6); tl.layers.set(NOINK); R.add(tl);
    const lantern = kitClone(kit, "lantern", 0.35); if (lantern) { lantern.position.set(EX + 0.8, 0.8, EZ - 0.6); R.add(lantern); }
    this.book = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), lam("sketchM", () => ({ map: sketchTex() }))); this.book.rotation.x = -Math.PI / 2; this.book.position.set(EX + 0.2, 0.805, EZ - 0.45); R.add(this.book);
    this.stamp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ map: stampTex(), transparent: true, depthWrite: false })); this.stamp.rotation.set(-Math.PI / 2, 0, 0.18); this.stamp.position.set(EX + 0.32, 0.81, EZ - 0.42); this.stamp.layers.set(NOINK); R.add(this.stamp);

    // ---- the Rhine at night: water, banks, far-bank hills + searchlights, decoy site, crossing ----
    const waterTex = ctex("rhineT", 512, 512, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#27447e"); gr.addColorStop(0.5, "#2f5294"); gr.addColorStop(1, "#27447e"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = "rgba(170,200,255,0.55)"; g.lineWidth = 4; for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, w2 = 20 + r() * 50; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w2 / 2, y - 6, x + w2, y); g.stroke(); } });
    const water = new THREE.Mesh(planeXZ(-600, 900, RIVER_Z - 42, RIVER_Z + 42, -0.6, 70, 5), new THREE.MeshBasicMaterial({ map: waterTex })); R.add(water);
    const moonPath = new THREE.Mesh(planeXZ(-6, 6, RIVER_Z - 40, RIVER_Z + 40, -0.55), new THREE.MeshBasicMaterial({ map: mistTex(), color: new THREE.Color(1.4, 1.5, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); moonPath.position.x = 40; moonPath.layers.set(NOINK); R.add(moonPath);
    const rb = new Batch();
    for (let x = -80; x <= 380; x += 7) { prop(rb, kit, hh(x) < 0.5 ? "tree_oak" : "tree_cone", x + hh(x, 1) * 3, ht(x, RIVER_Z + 84), RIVER_Z + 84 + hh(x, 2) * 8, 8 + hh(x, 3) * 6); prop(rb, kit, "tree_oak", x + 2, ht(x, RIVER_Z - 62), RIVER_Z - 62 - hh(x, 4) * 6, 9 + hh(x, 5) * 5); }
    rb.build(R, true);
    for (let i = 0; i < 8; i++) { const t = makeSherman(); t.g.position.set(DECOY[0] - 16 + (i % 4) * 9, ht(DECOY[0], DECOY[2]), DECOY[2] - Math.floor(i / 4) * 9); t.g.rotation.y = Math.PI / 2 + 0.2; R.add(t.g); }
    for (let i = 0; i < 2; i++) { const tr = makeTruck(true); tr.position.set(DECOY[0] + 22 + i * 8, 0, DECOY[2] + 4); tr.rotation.y = -Math.PI / 2; R.add(tr); }
    const beamM = new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 6; i++) { const cone = new THREE.ConeGeometry(3.5, 95, 20, 1, true); cone.translate(0, -47.5, 0); const me = new THREE.Mesh(cone, beamM); me.position.set(-40 + i * 70, 6, RIVER_Z - 70); me.layers.set(NOINK); this.beams.push(me); R.add(me); }
    for (let i = 0; i < 4; i++) { const boat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2), flat("boatM", "#3a3e2a")); boat.position.set(-12 + i * 8, -0.3, RIVER_Z + 20 - i * 10); boat.name = "boat" + i; R.add(boat); }
    // pontoon bridge with tanks rolling over at the real crossing
    const pb = new Batch(); for (let z = RIVER_Z - 42; z < RIVER_Z + 42; z += 3) pb.add(boxGeo(V(18, -0.7, z), V(22, -0.2, z + 2.6)), flat("pontoon", "#4a4e3a")); pb.build(R, true);
    this.plane = makePlane(); R.add(this.plane);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  private shotSun(id: number, az0: number, el0: number) {
    let v = this.sunCache.get(id); if (v) return v;
    const kk = CAMS[id][CAMS[id].length - 1], fx0 = kk.look[0] - kk.pos[0], fz0 = kk.look[2] - kk.pos[2], n = Math.hypot(fx0, fz0) || 1, fx = fx0 / n, fz = fz0 / n;
    const az = THREE.MathUtils.degToRad(az0), el = THREE.MathUtils.degToRad(el0);
    v = new THREE.Vector3((fx * Math.cos(az) - fz * Math.sin(az)) * Math.cos(el), Math.sin(el), (fz * Math.cos(az) + fx * Math.sin(az)) * Math.cos(el)).normalize(); this.sunCache.set(id, v); return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camFinal(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 2000; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    const az = s.light === "golden" ? 130 : s.light === "night" ? 120 : s.light === "warm" ? 140 : 135, el = s.light === "golden" ? 18 : s.light === "night" ? 40 : s.light === "warm" ? 38 : 52;
    const sunDir = this.shotSun(id, az, el), focus = new THREE.Vector3(...c.look);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = s.pov ? 140 : s.set === "field" || s.set === "river" || s.set === "sky" ? 70 : 18;
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value)); const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = s.pov ? 300 : L.fogNear * 1.6; this.fog.far = s.pov ? 1400 : L.fogFar * 1.8; scene.fog = this.fog; scene.background = null;
    const night = s.light === "night";
    const kk0 = CAMS[id][0], fwx = kk0.look[0] - kk0.pos[0], fwz = kk0.look[2] - kk0.pos[2], fn = Math.hypot(fwx, fwz) || 1, baseA = Math.atan2(fwz / fn, fwx / fn);
    this.clouds.forEach((m, i) => {
      const a = baseA + (i - 5) * 0.17 + (hh(i, id) - 0.5) * 0.1, el2 = 0.05 + hh(i + 3, id) * 0.25, d = 480;
      m.position.set(cam.position.x + Math.cos(a) * Math.cos(el2) * d, Math.max(60, cam.position.y + Math.sin(el2) * d), cam.position.z + Math.sin(a) * Math.cos(el2) * d);
      const w = 120 + hh(i, id + 7) * 110; m.scale.set(w, w / 2, 1); m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = cloudHD(i % 4, s.light === "golden" ? LOOK.golden.cloud : night ? LOOK.night.cloud : LOOK.day.cloud);
      (m.material as THREE.MeshBasicMaterial).opacity = night ? 0.45 : 1; m.visible = s.set !== "tent";
    });
    this.stars.visible = night; this.stars.position.copy(cam.position);
    this.moon.visible = night; this.moon.position.copy(cam.position).add(new THREE.Vector3(Math.cos(baseA + 0.25) * 800, 260, Math.sin(baseA + 0.25) * 800)); this.moon.scale.setScalar(50);
    this.sunDisc.visible = s.light === "golden" && s.set !== "tent"; this.sunDisc.position.copy(cam.position).add(new THREE.Vector3(Math.cos(baseA - 0.35) * 900, 70, Math.sin(baseA - 0.35) * 900)); this.sunDisc.scale.setScalar(55);
    for (const m of this.mist) { m.visible = s.light === "golden" || id === 4; m.lookAt(cam.position.x, m.position.y, cam.position.z); }

    // ---- props per frame ----
    const hr = this.hero;
    hr.g.position.set(TANK0[0], (id <= 6 || id === 24) ? liftY(id === 24 ? EV.lift1 + 30 : f) + (id === 6 || id === 24 ? 0.04 * Math.sin(f * 0.3) : 0) : 0, TANK0[2]);
    hr.g.rotation.set(0, 0, (id === 5 && f >= EV.freeze) ? 0.04 * Math.sin((f - EV.freeze) * 0.5) * Math.exp(-(f - EV.freeze) / 20) : 0);
    const dr = id === 19 ? smooth((f - EV.droop0) / (EV.droop1 - EV.droop0)) : 0;
    hr.barrel.rotation.z = Math.PI / 2 - 0.55 * dr; hr.turret.scale.set(1, 1 - 0.28 * dr, 1); hr.turret.rotation.z = -0.12 * dr; hr.body.scale.set(1, 1 - 0.12 * dr, 1);
    // convoy drives away at night (shot 11)
    this.convoy.forEach((v, i) => {
      v.visible = id === 11 || id === 22;
      if (id === 11) { const t = f - SHOTS[10].a; v.position.set(30 - t * 0.35 - i * 9, 0, -5); v.rotation.y = Math.PI; }
      else { const t = f - SHOTS[21].a; v.position.set(20, -0.2, RIVER_Z + 30 - t * 0.25 - i * 9); v.rotation.y = Math.PI / 2; }
    });
    for (let i = 0; i < 4; i++) { const bt = this.root.getObjectByName("boat" + i); if (bt) bt.position.z = RIVER_Z + 20 - i * 10 - (id === 22 ? (f - SHOTS[21].a) * 0.15 : 0); }
    // forest tank: poke wobble (13), lifted corner (14), inflating (15)
    const ft = this.forestTank;
    ft.g.scale.set(1, 1, 1); ft.g.rotation.set(0, -0.4, 0); ft.body.scale.set(1, 1, 1);
    if (id === 13 && f >= EV.wobble) { const t = f - EV.wobble, w = Math.exp(-t / 12) * Math.sin(t * 0.9); ft.g.scale.set(1 + 0.05 * w, 1 - 0.07 * w, 1 + 0.05 * w); }
    if (id === 14) { const u = smooth((f - EV.carry) / 14); ft.g.rotation.set(0.0, -0.4, -0.32 * u); ft.g.position.set(FOREST[0] + 0.0, 0.5 * u, FOREST[2]); } else ft.g.position.set(...FOREST);
    if (id === 15) { const u = smooth((f - EV.pump0) / (EV.pump1 - EV.pump0)), wob = (1 - u) * 0.06 * Math.sin(f * 0.6); ft.g.scale.set(1.04 - 0.04 * u + wob, Math.max(0.06, u), 1.04 - 0.04 * u - wob); }
    // bikes beside the farmers
    const P = stage(id, f);
    let bi = 0; for (const p of P) if (p.bike && bi < 2) { const bk = this.bikes[bi++]; bk.visible = true; bk.position.set(p.at[0] + 0.55, 0, p.at[2] + 0.25); bk.rotation.y = id === 5 ? 0.6 : 0.9; }
    for (let i = bi; i < 2; i++) this.bikes[i].visible = false;
    // plane: crosses the sky in 9, hidden in POV shots
    const pl = this.plane; pl.visible = id === 9; if (id === 9) { const t = f - SHOTS[8].a; pl.position.set(-120 + t * 5.5, 55, -75); pl.rotation.set(0.08, 0, 0.05); }
    const pp = pl.getObjectByName("prop"); if (pp) pp.rotation.x = f * 1.3;
    // searchlights sweep; swing toward the decoy site in 21
    this.beams.forEach((bm, i) => {
      const base = Math.sin(f * 0.02 + i * 1.7) * 0.5, toward = id === 21 ? smooth((f - EV.sweep) / 30) : id === 22 ? 1 : 0;
      const tx = lerp(bm.position.x + base * 60, DECOY[0] + (i - 2.5) * 6, toward), tz = lerp(RIVER_Z - 10, DECOY[2], toward);
      bm.lookAt(tx, 0, tz); bm.rotateX(-Math.PI / 2); bm.visible = s.set === "river";
    });
    // sketchbook stamp
    this.stamp.visible = id === 23 && f >= EV.stamp - 4;
    if (this.stamp.visible) { const u = clamp01((f - (EV.stamp - 4)) / 4), sc2 = lerp(3, 1, u); this.stamp.scale.set(sc2, sc2, 1); }

    // ---- cast + effects ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const lx = sunDir.dot(right), light2 = Math.round(Math.atan2(-sunDir.y, lx) / (Math.PI / 4)) * (Math.PI / 4);
    let ai = 0; const used: Actor[] = []; let fi = 0; const fused: Fx[] = [];
    const pushFx = (key: string, cw: number, ch: number, k: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, o: { flat?: boolean; rot?: number; soft?: boolean } = {}) => {
      const e2 = this.fx(fi++); e2.r = this.pool.req(key, cw, ch, k, draw); e2.use(!!o.soft); e2.mesh.visible = true; e2.mesh.position.set(x, y, z);
      if (o.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, o.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(o.rot ?? 0); }
      e2.mesh.scale.set(w, h, 1); fused.push(e2);
    };
    for (const p of P) {
      const a = this.actor(ai++);
      const d = cam.position.distanceTo(new THREE.Vector3(p.at[0], p.at[1] + 1.2, p.at[2]));
      const [w, h, kq] = tier(d), blink = lidOf(f, p.who.seed);
      let key: string, draw: (pp2: Pen) => void, mirror = false;
      if (p.side) { mirror = p.side.dir * right.x < 0; const so = { phase: q(p.side.phase), expr: "neutral" as Expr, mode: p.side.mode, light: light2, seed: p.who.seed, stride: 0.8, blink };
        key = `S|${p.who.key}|${JSON.stringify(so)}`; draw = (pp2) => bodySide(pp2, p.who.o, so); }
      else { const fo = { mode: p.mode ?? "stand", expr: p.expr ?? "neutral", prop: p.prop ?? null, look: p.look ?? 0, headTilt: p.headTilt ?? 0, tilt: p.tilt ?? 0, blink, light: light2, facing: 0 as const, seed: p.who.seed };
        key = `F|${p.who.key}|${JSON.stringify(fo, (_k, v) => (typeof v === "number" ? q(v) : v))}`; draw = (pp2) => bodyFront(pp2, p.who.o, fo); }
      a.r = this.pool.req(key, w, h, kq, draw); a.mesh.visible = true; a.mesh.position.set(p.at[0], p.at[1] + ht(p.at[0], p.at[2]) * 0, p.at[2]);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.at[0], cam.position.z - p.at[2]), 0);
      const scl = p.scale ?? 1; a.mesh.scale.set(mirror ? -scl : scl, scl, scl); a.mesh.castShadow = L.actorShadow; used.push(a);
      pushFx("blob|contact|#3d3354", 128, 128, 1, (pp2) => fxContact(pp2, "#3d3354"), p.at[0], p.at[1] + 0.04, p.at[2], 0.55, 0.42, { flat: true });
    }
    // cows (lit cards) in the meadow and field shots
    if (s.set === "meadow" || s.set === "field" || s.set === "sky") for (const cw of this.cows) {
      const a = this.actor(ai++), d = cam.position.distanceTo(new THREE.Vector3(...cw)); const [w, h, kq] = tier(d * 0.6);
      a.r = this.pool.req("cow", w, h, kq, cow); a.mesh.visible = true; a.mesh.position.set(...cw); a.mesh.rotation.set(0, Math.atan2(cam.position.x - cw[0], cam.position.z - cw[2]), 0); a.mesh.scale.set(1.1, 1.1, 1.1); a.mesh.castShadow = false; used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    // effects
    if (id === 2 && f >= EV.lift1 - 2 && f < EV.lift1 + 14) pushFx(`stars|${Math.round((f - EV.lift1) / 3)}`, 600, 600, 0.5, (p) => fxStars(p, (f - EV.lift1 + 2) / 16), TANK0[0], 4.6, TANK0[2] + 1.5, 1.6, 1.6);
    if (id === 13 && f >= EV.poke && f < EV.poke + 14) pushFx(`ring|${Math.round((f - EV.poke) / 2)}`, 300, 300, 0.5, (p) => fxRing(p, (f - EV.poke) / 14), FOREST[0] + 0.9, 1.4, FOREST[2] + 1.3, 0.8, 0.8);
    if (id === 15) for (let i = 0; i < 4; i++) { const u = (((f / 12) + i / 4) % 1); const a2 = (i / 4) * Math.PI * 2 + 0.6; pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (p) => fxPuff(p, u), FOREST[0] + Math.cos(a2) * 2.6, 0.3 + u * 0.8, FOREST[2] + Math.sin(a2) * 1.8, 0.4 + u * 0.4, 0.4 + u * 0.4, { soft: true }); }
    if (id === 16 && f >= EV.blast) for (let i = 0; i < 4; i++) { const u = (((f - EV.blast) / 30 + i / 4) % 1); const r2 = 2 + u * 60; pushFx(`ring|${Math.round(u * 12)}`, 300, 300, 0.5, (p) => fxRing(p, 0.35 + u * 0.3), SPEAKER[0] - 4 - u * 30, 3 + u * 4, SPEAKER[2] - u * 8, r2, r2); }
    if (id === 21 && f >= EV.blast) for (let i = 0; i < 3; i++) { const u = (((f - SHOTS[20].a) / 30 + i / 3) % 1); const r2 = 3 + u * 40; pushFx(`ring|${Math.round(u * 12)}`, 300, 300, 0.5, (p) => fxRing(p, 0.35 + u * 0.3), DECOY[0] + 26, 4 + u * 3, DECOY[2] + 4, r2, r2); }
    if (id === 21 && f >= EV.guns) for (let i = 0; i < 6; i++) { const t = (f - EV.guns + i * 9) % 26; if (t < 10) pushFx(`burst|${t}`, 600, 600, 0.5, (p) => fxBurst(p, t / 10, "#ffd27a"), DECOY[0] - 10 + i * 12, 3, RIVER_Z - 66, 6, 6); }
    if (id === 24 || (id === 1 && f > 30)) for (let i = 0; i < 6; i++) { const x = ((f * 0.25 + i * 13) % 70) - 15, flap = Math.sin(f * 0.6 + i) > 0; pushFx(`bird|${flap ? 1 : 0}`, 128, 64, 1, (p) => { const g = p.g; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(8, flap ? 20 : 44); g.quadraticCurveTo(36, flap ? 44 : 20, 64, 34); g.quadraticCurveTo(92, flap ? 44 : 20, 120, flap ? 20 : 44); g.stroke(); }, x, 22 + hh(i, 4) * 8, -20 - hh(i, 5) * 20, 1.2, 0.6); }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush(); for (const a of used) a.bind(); for (const e2 of fused) e2.bind();
    return focus;
  }
}
void glide; void FARM; void LIFTERS; void FPS; void TENT;
