// THE GOLD IN THE JAR — one three.js world posed per frame from goldstory.ts:
// a 1940 Copenhagen street (painted gabled houses from the bridge kit, cobbles, lamps, tanks), the physics institute
// whose ground-floor lab window looks onto that street, the lab interior, and a night-blue explanation stage.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Pen, bodyFront, bodySide, fxSplash, fxPuff, fxStars, fxBurst, fxContact, Expr, INK } from "./toon";
import { Actor, Fx, Pool } from "./cast";
import { lam, kitClone, Kit, Batch, boxGeo, V, house } from "./build";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { LIGHTS, LOOK } from "./lights";
import { NOINK } from "./ink";
import { ctex, rep, stoneHD, cobbleHD, planksHD, cloudHD, facadeHD } from "./paint";
import { SHOTS, EV, FPS, V3, BENCH, JAR_BENCH, JAR_SHELF, SHELF_X, SEE, FORGE, dissolveAt, orangeAt, smooth, clamp01, glide, CAMS } from "./goldstory";
import { stage, camFinal, hh } from "./goldstage";

// ---------------- kit ----------------
const KIT: [string, string][] = [
  ["bridge/kenney", "lantern"], ["bridge/kenney", "tree_default"], ["bridge/kenney", "tree_oak"], ["bridge/kenney", "cart"],
  ["kenney/furniture-kit", "bookcaseOpen"], ["kenney/furniture-kit", "books"], ["kenney/furniture-kit", "desk"], ["kenney/furniture-kit", "chairDesk"],
  ["kenney/furniture-kit", "lampRoundTable"], ["kenney/furniture-kit", "kitchenCabinetDrawer"], ["kenney/furniture-kit", "coatRackStanding"],
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
const plaster = (key: string, col: string, wain: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; g.beginPath(); g.arc(r() * 1024, r() * 1024, 4 + r() * 18, 0, 6.3); g.fill(); }
  g.fillStyle = wain; g.fillRect(0, 700, 1024, 324);                       // wood wainscot (lower 32 %)
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < 1024; x += 128) g.fillRect(x, 700, 5, 324);
  g.fillStyle = "#4a2e1c"; g.fillRect(0, 690, 1024, 16); g.fillRect(0, 1004, 1024, 20);
});
const blackboard = () => ctex("blackboard", 1024, 512, (g) => {
  g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#24332c"; g.fillRect(24, 24, 976, 464);
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.fillStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 5; g.font = "bold 54px serif";
  g.fillText("Au + HNO₃ + 4 HCl", 70, 130); g.fillText("→ HAuCl₄ + NO + 2 H₂O", 150, 220); g.font = "bold 46px serif";
  g.fillText("E = hν", 90, 340); g.fillText("λ = h / p", 380, 340); g.fillText("ψ(x,t)", 690, 330);
  g.beginPath(); g.ellipse(820, 420, 70, 30, 0.3, 0, 6.3); g.stroke(); g.beginPath(); g.arc(820, 420, 9, 0, 6.3); g.fill();
});
const medalTex = (name: string) => ctex("medal" + name, 512, 512, (g) => {
  const gr = g.createRadialGradient(200, 180, 30, 256, 256, 260); gr.addColorStop(0, "#fff0a8"); gr.addColorStop(0.45, "#f2c23a"); gr.addColorStop(1, "#a8761a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#9a6a14"; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 232, 0, 6.3); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(256, 256, 200, 0, 6.3); g.stroke();
  // embossed profile (darker gold) facing left
  g.fillStyle = "#c48e22"; g.beginPath(); g.moveTo(300, 120); g.bezierCurveTo(200, 110, 170, 170, 180, 220); g.lineTo(150, 260); g.lineTo(180, 270);
  g.lineTo(178, 300); g.bezierCurveTo(190, 330, 230, 330, 240, 340); g.lineTo(250, 400); g.lineTo(360, 400); g.bezierCurveTo(350, 330, 380, 260, 370, 200);
  g.bezierCurveTo(365, 150, 340, 125, 300, 120); g.fill();
  g.fillStyle = "#8a5e12"; g.font = "bold 40px serif"; g.textAlign = "center"; g.fillText(name, 256, 462);
});
const labelTex = (txt: string, col: string) => ctex("label" + txt, 512, 256, (g) => {
  g.fillStyle = "#f4ead2"; g.fillRect(0, 0, 512, 256); g.strokeStyle = col; g.lineWidth = 16; g.strokeRect(14, 14, 484, 228);
  g.fillStyle = "#1f2430"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.fillText(txt, 256, 120);
  g.font = "bold 34px sans-serif"; g.fillStyle = col; g.fillText("ACID", 256, 186);
});
const signTex = () => ctex("instsign", 1024, 160, (g) => {
  g.fillStyle = "#1f2b3c"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#d9b45a"; g.lineWidth = 8; g.strokeRect(8, 8, 1008, 144);
  g.fillStyle = "#e9d9a8"; g.font = "bold 58px serif"; g.textAlign = "center"; g.fillText("INSTITUT FOR TEORETISK FYSIK", 512, 102);
});
const velvetTex = () => ctex("velvet", 512, 512, (g, r) => {
  g.fillStyle = "#7a1830"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const flame = (p: Pen, t: number) => {
  const g = p.g, s = 1 + 0.08 * Math.sin(t * 40);
  for (const [c, k] of [["#ff7a1a", 1], ["#ffc23a", 0.68], ["#fff3b0", 0.36]] as const) {
    g.fillStyle = c; g.beginPath(); g.moveTo(150, 290); g.bezierCurveTo(60 + 40 * (1 - k), 230, 90, 120 * k + 60, 150, 20 + 160 * (1 - k) * s);
    g.bezierCurveTo(210, 120 * k + 60, 240 - 40 * (1 - k), 230, 150, 290); g.fill();
  }
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(150, 290); g.bezierCurveTo(60, 230, 90, 180, 150, 20); g.bezierCurveTo(210, 180, 240, 230, 150, 290); g.stroke();
};
const drop = (p: Pen, col: string) => { const g = p.g; g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 10); g.bezierCurveTo(20, 70, 20, 118, 64, 118); g.bezierCurveTo(108, 118, 108, 70, 64, 10); g.fill(); g.stroke(); };
const paper = (p: Pen) => { const g = p.g; g.fillStyle = "#f7f3e8"; g.strokeStyle = INK; g.lineWidth = 7; g.fillRect(10, 10, 108, 140); g.strokeRect(10, 10, 108, 140); g.lineWidth = 4; g.strokeStyle = "#9aa4b8"; for (let y = 40; y < 140; y += 18) { g.beginPath(); g.moveTo(24, y); g.lineTo(104, y); g.stroke(); } };
const cobweb = (p: Pen) => { const g = p.g; g.strokeStyle = "rgba(240,240,240,0.9)"; g.lineWidth = 3; for (let a = 0; a < 5; a++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a * 0.35) * 240, Math.sin(a * 0.35) * 240); g.stroke(); } for (let r = 50; r < 240; r += 45) { g.beginPath(); g.arc(0, 0, r, 0, 1.45); g.stroke(); } };

// ---------------- helpers ----------------
const flat = (key: string, col: string) => lam(key, () => ({ color: col }));
const planeXZ = (x0: number, x1: number, z0: number, z1: number, y: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  return g;
};
/** vertical wall quad facing +n (n = "+z" | "-z" | "+x" | "-x"), spanning u0..u1 along the wall and y0..y1 */
const wallQ = (n: "+z" | "-z" | "+x" | "-x", c: number, u0: number, u1: number, y0: number, y1: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  const m = (u0 + u1) / 2, ym = (y0 + y1) / 2;
  if (n === "+z") g.translate(m, ym, c); else if (n === "-z") { g.rotateY(Math.PI); g.translate(m, ym, c); }
  else if (n === "+x") { g.rotateY(Math.PI / 2); g.translate(c, ym, m); } else { g.rotateY(-Math.PI / 2); g.translate(c, ym, m); }
  return g;
};
const noShadowCast = (o: THREE.Object3D) => o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const LID = [0.5, 1, 1, 0.5];
const lidOf = (f: number, seed: number) => { let s = Math.round(-50 * hh(seed, 9)); for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(seed * 31 + n, 13)); } return 0; };
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const q = (v: number) => Math.round(v * 60) / 60;

// ---------------- tank ----------------
const makeTank = () => {
  const g = new THREE.Group(), hull = flat("tankHull", "#6f7462"), dark = flat("tankDark", "#3c3f36"), wheel = flat("tankWheel", "#2c2e28");
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, 0, rz); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  add(new THREE.BoxGeometry(5.6, 1.0, 2.3), hull, 0, 1.15, 0);
  add(new THREE.BoxGeometry(4.6, 0.5, 2.0), hull, -0.2, 1.85, 0);
  add(new THREE.BoxGeometry(2.0, 0.85, 1.6), hull, 0.1, 2.5, 0);
  add(new THREE.CylinderGeometry(0.09, 0.11, 2.4, 10), dark, 2.3, 2.55, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14), hull, -0.3, 3.05, 0);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(6.0, 0.75, 0.55), dark, 0, 0.5, s * 1.2);
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.33, 0.33, 0.6, 12), wheel, -2.3 + i * 0.92, 0.42, s * 1.2, Math.PI / 2);
  }
  return g;
};

// ---------------- world ----------------
export class GoldWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#c9d8ee", 60, 420);
  private clouds: THREE.Mesh[] = [];
  private tanks: THREE.Group[] = [];
  private door: THREE.Group; private doorOut: THREE.Group;
  private jarB: { g: THREE.Group; liq: THREE.MeshLambertMaterial; medals: THREE.Mesh[] };
  private jarS: { g: THREE.Group; liq: THREE.MeshLambertMaterial };
  private velvet: THREE.Group;
  private seeMedal: THREE.Mesh; private bottles: THREE.Group[] = []; private streams: THREE.Mesh[] = [];
  private beaker: THREE.Group; private beakerLiq: THREE.MeshLambertMaterial;
  private atoms: THREE.InstancedMesh; private atomBase: THREE.Vector3[] = [];
  private orangeCloud: THREE.Mesh;
  private sunCache = new Map<number, THREE.Vector3>();
  private sand!: THREE.InstancedMesh; private filterSet!: THREE.Group; private pile!: THREE.Mesh; private cavities: THREE.Mesh[] = [];
  private crucible!: THREE.Group; private moltenStream!: THREE.Mesh; private forgeLight!: THREE.Group; private stars!: THREE.Points;

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky ----
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
      const a = (i / 9) * Math.PI * 2 + 0.4, d = 640 + (i % 3) * 50;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 35; m.position.set(Math.cos(a) * d, 90 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- STREET (z > 4): cobbles, pavements, houses opposite, institute facade with the lab window ----
    const b = new Batch();
    b.add(planeXZ(-220, 220, 6.4, 15.6, 0, 110, 2.3), lam("cobbleHD", () => ({ map: cobbleHD() })));
    const pave = lam("paveHD", () => ({ map: stoneHD("paveHD", ["#d8cdb9", "#cfc3ae", "#e0d6c3", "#c6baa5"], "#9a8f7c") }));
    b.add(planeXZ(-220, 220, 4.0, 6.4, 0.12, 110, 1), pave); b.add(planeXZ(-220, 220, 15.6, 18, 0.12, 110, 1), pave);
    const kerb = flat("kerb", "#bdb3a2");
    b.add(boxGeo(V(-220, 0, 6.25), V(220, 0.12, 6.4)), kerb); b.add(boxGeo(V(-220, 0, 15.6), V(220, 0.12, 15.75)), kerb);
    b.add(planeXZ(-400, 400, 18, 400, 0, 40, 40), lam("grassFar", () => ({ color: "#7c9a5a" })));
    b.add(planeXZ(-400, 400, -400, -4.2, -0.02, 40, 40), lam("yard", () => ({ color: "#8a8270" })));
    let x = -160, si = 0;
    while (x < 170) { const w = 6 + hh(si) * 3, h = 8 + hh(si, 3) * 4.5; house(b, x + w / 2, 18 + 4, Math.PI, w, 8, h, si, 0); x += w + 0.1; si++; }
    // far rows for depth
    for (let row = 0; row < 2; row++) { let x2 = -170; let s2 = 40 + row * 30; while (x2 < 180) { const w = 7 + hh(s2) * 3, h = 9 + hh(s2, 1) * 6; house(b, x2 + w / 2, 40 + row * 22, Math.PI, w, 9, h, s2, 0); x2 += w + 0.3; s2++; } }
    // institute: one long facade at z = 4 (faces +z), hole for the lab window x -1.6..1.6, y 1.0..3.0 and the door x 5.6..7.0
    const fac = lam("instFacade", () => ({ map: facadeHD("instFacade", 12, 12, { wall: "#d9b07a", shutter: "#2f5f6a", brick: false }) }));
    const nb = new Batch();
    const facPiece = (x0: number, x1: number, y0: number, y1: number) => nb.add(wallQ("+z", 4.02, x0, x1, y0, y1, (x1 - x0) / 12, (y1 - y0) / 12), fac);
    facPiece(-160, -1.6, 0, 12); facPiece(1.6, 5.6, 0, 12); facPiece(7.0, 160, 0, 12); facPiece(-1.6, 1.6, 0, 1.0); facPiece(-1.6, 1.6, 3.0, 12); facPiece(5.6, 7.0, 2.6, 12);
    nb.add(boxGeo(V(-160, 12, 3.2), V(160, 12.5, 4.4)), flat("cornice", "#efe3c8"));
    nb.add(boxGeo(V(-160, 12.5, -4.2), V(160, 12.6, 4.2)), flat("roofFlat", "#6b4a3c"));
    const trim = flat("winTrim", "#f3efe4");
    b.add(boxGeo(V(-1.75, 0.88, 4.0), V(1.75, 1.02, 4.32)), trim); b.add(boxGeo(V(-1.75, 3.0, 4.0), V(1.75, 3.14, 4.2)), trim);
    b.add(boxGeo(V(-1.75, 1.0, 4.0), V(-1.6, 3.0, 4.18)), trim); b.add(boxGeo(V(1.6, 1.0, 4.0), V(1.75, 3.0, 4.18)), trim);
    b.add(boxGeo(V(-0.04, 1.0, 4.02), V(0.04, 3.0, 4.12)), trim); b.add(boxGeo(V(-1.6, 1.98, 4.02), V(1.6, 2.04, 4.12)), trim);
    b.add(boxGeo(V(5.6, 0, 3.9), V(7.0, 2.6, 4.0)), flat("instDoor", "#3d2a1e"));
    b.add(boxGeo(V(5.45, 2.6, 4.0), V(7.15, 2.8, 4.25)), trim);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex() })); sign.position.set(6.3, 3.5, 4.06); R.add(sign);

    // ---- LAB interior: x -5..5, z -4..4, walls 3.4 high (no ceiling; walls never cast shadows so the sun lights the room) ----
    const lab = new Batch();
    lab.add(planeXZ(-5, 5, -4, 4, 0.002, 5, 4), lam("planksHD", () => ({ map: planksHD() })));
    const wallM = lam("labWall", () => ({ map: plaster("labWall", "#d7e3c9", "#7a5034") }));
    lab.add(wallQ("+z", -4, -5, 5, 0, 3.4, 3, 1), wallM);   // back wall (faces +z)
    lab.add(wallQ("+x", -5, -4, 4, 0, 3.4, 2.4, 1), wallM); // left wall faces +x
    lab.add(wallQ("-x", 5, -4, 1.0, 0, 3.4, 1.5, 1), wallM); lab.add(wallQ("-x", 5, 2.2, 4, 0, 3.4, 0.55, 1), wallM); lab.add(wallQ("-x", 5, 1.0, 2.2, 2.2, 3.4, 0.36, 0.35), wallM);
    lab.add(planeXZ(-5, 5, -4, 4, 3.4, 4, 4).rotateX(Math.PI).translate(0, 6.8, 0), new THREE.MeshBasicMaterial({ color: "#efe2c6" }));
    const dtrim = flat("doorTrim", "#5a3a22");
    lab.add(boxGeo(V(4.9, 0, 0.88), V(5.08, 2.32, 1.0)), dtrim); lab.add(boxGeo(V(4.9, 0, 2.2), V(5.08, 2.32, 2.32)), dtrim); lab.add(boxGeo(V(4.9, 2.2, 0.88), V(5.08, 2.36, 2.32)), dtrim);
    for (const [x0, x1, y0, y1] of [[-5, -1.6, 0, 3.4], [1.6, 5, 0, 3.4], [-1.6, 1.6, 0, 1.0], [-1.6, 1.6, 3.0, 3.4]]) lab.add(wallQ("-z", 3.98, x0, x1, y0, y1, (x1 - x0) / 3.3, 1), wallM);
    // bench, shelves, blackboard, cabinet
    const wood = lam("benchWood", () => ({ color: "#9a6a42" })), woodD = lam("benchWoodD", () => ({ color: "#6e4a2e" }));
    lab.add(boxGeo(V(BENCH.x0, BENCH.h - 0.06, BENCH.z0), V(BENCH.x1, BENCH.h, BENCH.z1)), lam("benchTop", () => ({ color: "#3e3a36" })));
    for (const [px, pz] of [[BENCH.x0 + 0.08, BENCH.z0 + 0.08], [BENCH.x1 - 0.08, BENCH.z0 + 0.08], [BENCH.x0 + 0.08, BENCH.z1 - 0.08], [BENCH.x1 - 0.08, BENCH.z1 - 0.08]])
      lab.add(boxGeo(V(px - 0.05, 0, pz - 0.05), V(px + 0.05, BENCH.h - 0.06, pz + 0.05)), woodD);
    lab.add(boxGeo(V(BENCH.x0 + 0.05, 0.2, BENCH.z0 + 0.05), V(BENCH.x1 - 0.05, 0.26, BENCH.z1 - 0.05)), wood);
    for (const y of [0.55, 1.05, 1.42 - 0.02, 1.85, 2.3]) lab.add(boxGeo(V(SHELF_X - 0.36, y - 0.03, -2.6), V(SHELF_X + 0.02, y, 1.4)), wood);
    lab.add(boxGeo(V(SHELF_X - 0.36, 0.0, -2.62), V(SHELF_X + 0.02, 2.36, -2.56)), woodD); lab.add(boxGeo(V(SHELF_X - 0.36, 0, 1.4), V(SHELF_X + 0.02, 2.36, 1.46)), woodD);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), lam("blackboardM", () => ({ map: blackboard() }))); bb.position.set(-0.6, 1.95, -3.97); R.add(bb);
    lab.build(R, false);
    nb.build(R, false);
    b.build(R, true);
    // shelf bottles (instanced-ish small meshes), varied colours; one slot left for the jar at JAR_SHELF
    const glassCols = ["#9fd3b5", "#c9a2d8", "#f0c27a", "#8fb8e8", "#e88f8f", "#bfe39a", "#f2e3a0"];
    for (const y of [0.55, 1.05, 1.42, 1.85]) for (let i = 0; i < 9; i++) {
      const z = -2.4 + i * 0.42 + hh(i, y * 10) * 0.12; if (Math.abs(y - 1.42) < 0.01 && Math.abs(z - JAR_SHELF[2]) < 0.35) continue;
      const h = 0.18 + hh(i, y) * 0.16, r = 0.05 + hh(i + 3, y) * 0.03;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 12), lam("bot" + (i % 7), () => ({ color: glassCols[i % 7] })));
      m.position.set(SHELF_X - 0.17, y + h / 2, z); m.castShadow = true; R.add(m);
    }
    // bench glassware (flasks, rack, burner)
    const flask = (x0: number, z0: number, col: string) => {
      const m1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 14), lam("flask" + col, () => ({ color: col }))); m1.position.set(x0, BENCH.h + 0.08, z0);
      const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10), lam("flaskNeck", () => ({ color: "#dfeff5" }))); m2.position.set(x0, BENCH.h + 0.2, z0);
      R.add(m1, m2);
    };
    flask(0.25, -0.2, "#a8e0c0"); flask(0.55, 0.1, "#f0b8d8"); flask(2.25, -0.25, "#bcd4f4");
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), lam("tube" + (i % 3), () => ({ color: ["#e8a0a0", "#a0d0e8", "#d8e8a0"][i % 3] }))); t.position.set(2.32 + i * 0.05, BENCH.h + 0.09, -0.32); R.add(t); }
    const furn = (name: string, h: number, x0: number, z0: number, yaw: number) => { const o = kitClone(kit, name, h); if (o) { o.position.set(x0, 0, z0); o.rotation.y = yaw; noShadowCast(o); R.add(o); } };
    furn("desk", 0.78, 2.7, -3.35, 0); furn("chairDesk", 0.95, 2.6, -2.6, Math.PI); furn("bookcaseOpen", 2.0, 4.55, -2.3, -Math.PI / 2); furn("lampRoundTable", 0.45, 3.1, -3.4, 0);
    furn("kitchenCabinetDrawer", 0.9, 3.4, -3.6, 0); furn("kitchenCabinetDrawer", 0.9, 4.1, -3.6, 0); furn("coatRackStanding", 1.8, -4.3, 2.8, 0.5);
    // door (right wall, hinge at z = 1.0, swings into the room) + a small corridor behind it
    this.door = new THREE.Group(); this.door.position.set(4.97, 0, 1.0);
    const dp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 1.2), lam("doorWood", () => ({ color: "#7a4e2e" }))); dp.position.set(0, 1.1, 0.6); dp.castShadow = true; this.door.add(dp);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), lam("knob", () => ({ color: "#d8b45a" }))); knob.position.set(-0.06, 1.05, 1.08); this.door.add(knob);
    R.add(this.door);
    this.doorOut = new THREE.Group(); R.add(this.doorOut);
    // jar on the bench + jar on the shelf
    const mkJar = (scale = 1) => {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.28, 24, 1, true), new THREE.MeshPhongMaterial({ color: "#e4f6ff", transparent: true, opacity: 0.3, shininess: 90, side: THREE.DoubleSide, depthWrite: false }));
      glass.position.y = 0.14; glass.renderOrder = 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 6, 24), lam("jarRim", () => ({ color: "#dff2fa" }))); rim.rotation.x = Math.PI / 2; rim.position.y = 0.28;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.012, 24), lam("jarBase", () => ({ color: "#cfe6ee" }))); base.position.y = 0.006;
      const liqM = new THREE.MeshLambertMaterial({ color: "#d6e8b0", emissive: new THREE.Color("#000000") });
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.19, 24), liqM); liq.position.y = 0.105;
      g.add(liq, base, rim, glass); g.scale.setScalar(scale);
      return { g, liq: liqM };
    };
    const jb = mkJar(1.0); jb.g.position.set(...JAR_BENCH); R.add(jb.g);
    const medals: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 20), new THREE.MeshPhongMaterial({ color: "#f2c23a", specular: "#fff0b0", shininess: 70 })); m.rotation.set(Math.PI / 2 - 0.3, 0.4 * i, 0.2); m.position.set(-0.03 + i * 0.05, 0.05 + i * 0.03, 0.01); jb.g.add(m); medals.push(m); }
    this.jarB = { ...jb, medals };
    const js = mkJar(1.0); js.g.position.set(...JAR_SHELF); js.liq.color.set("#e8781e"); js.liq.emissive.set("#3a1200"); R.add(js.g); this.jarS = js;
    // medals on velvet (shots 5 + 19)
    this.velvet = new THREE.Group(); this.velvet.position.set(1.15, BENCH.h + 0.001, -0.25);
    const vel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.42), lam("velvetM", () => ({ map: velvetTex() }))); vel.position.y = 0.01; this.velvet.add(vel);
    for (const [i, nm] of [[0, "M. v. LAUE"], [1, "J. FRANCK"]] as const) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.008, 32), [new THREE.MeshPhongMaterial({ color: "#c99a2a", specular: "#fff0b0", shininess: 60 }), new THREE.MeshPhongMaterial({ map: medalTex(nm), specular: "#fff4c8", shininess: 50 }), new THREE.MeshPhongMaterial({ color: "#c99a2a" })]);
      disc.position.set(-0.13 + i * 0.26, 0.026, 0.0); disc.rotation.y = -0.1 + i * 0.15; this.velvet.add(disc);
    }
    R.add(this.velvet);
    // street furniture: lamps, trees, a cart
    for (let xx = -92; xx <= 92; xx += 13) {
      if (xx < -4 || xx > 9) { const l = kitClone(kit, "lantern", 4.2); if (l) { l.position.set(xx, 0.12, 6.0); R.add(l); } }
      const l2 = kitClone(kit, "lantern", 4.2); if (l2) { l2.position.set(xx + 6, 0.12, 16.1); R.add(l2); }
      if (Math.abs(xx) > 6) { const t = kitClone(kit, xx % 2 ? "tree_oak" : "tree_default", 6.2); if (t) { t.position.set(xx + 3, 0.12, 17.0); R.add(t); } }
    }
    const cart = kitClone(kit, "cart", 1.6); if (cart) { cart.position.set(-9, 0.12, 16.8); cart.rotation.y = 0.3; R.add(cart); }
    for (let i = 0; i < 2; i++) { const t = makeTank(); R.add(t); this.tanks.push(t); }

    // ---- extra lab detail ----
    const deco = new Batch();
    const pic = (key: string, tex: THREE.Texture, w: number, h: number, pos: V3, ry: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(key, () => ({ map: tex }))); m.position.set(...pos); m.rotation.y = ry; R.add(m); };
    pic("clock", ctex("clockT", 256, 256, (g) => { g.fillStyle = "#3a2a1c"; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill(); g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(128, 128, 108, 0, 6.3); g.fill(); g.fillStyle = "#222"; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(128 + Math.cos(a) * 92 - 4, 128 + Math.sin(a) * 92 - 4, 8, 8); } g.strokeStyle = "#222"; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(178, 140); g.stroke(); }), 0.55, 0.55, [2.4, 2.75, -3.96], 0);
    const portrait = (key: string, bg: string, hair: string, beard: boolean) => ctex(key, 256, 320, (g) => { g.fillStyle = "#8a5a2a"; g.fillRect(0, 0, 256, 320); g.fillStyle = bg; g.fillRect(20, 20, 216, 280); g.fillStyle = "#2c3a4a"; g.beginPath(); g.ellipse(128, 300, 90, 70, 0, 0, 6.3); g.fill(); g.fillStyle = "#f3d6b8"; g.beginPath(); g.ellipse(128, 150, 58, 70, 0, 0, 6.3); g.fill(); g.fillStyle = hair; g.beginPath(); g.ellipse(128, 105, 62, 36, 0, Math.PI, 0); g.fill(); if (beard) { g.beginPath(); g.ellipse(128, 200, 44, 30, 0, 0, Math.PI); g.fill(); } g.fillStyle = "#222"; g.fillRect(100, 140, 10, 10); g.fillRect(146, 140, 10, 10); });
    pic("port1", portrait("portA", "#b8c4a0", "#5a4030", true), 0.5, 0.62, [3.9, 2.25, -3.96], 0); pic("port2", portrait("portB", "#c4a8a0", "#d8d8d8", false), 0.5, 0.62, [-2.9, 2.35, -3.96], 0);
    pic("ptable", ctex("ptableT", 512, 320, (g) => { g.fillStyle = "#efe6cc"; g.fillRect(0, 0, 512, 320); const cols = ["#e8a0a0", "#a0c8e8", "#c8e0a0", "#f0d890", "#d0b0e0"]; for (let y = 0; y < 7; y++) for (let x = 0; x < 18; x++) { if (y === 0 && x > 0 && x < 17) continue; if (y < 3 && x > 1 && x < 12) continue; g.fillStyle = cols[(x + y) % 5]; g.fillRect(14 + x * 27, 40 + y * 38, 24, 34); } g.fillStyle = "#222"; g.font = "bold 22px serif"; g.fillText("PERIODISK SYSTEM", 150, 28); }), 1.5, 0.95, [4.97, 2.2, -1.6], -Math.PI / 2);
    for (const lx of [0.3, 1.25, 2.2]) { // pendant lamps over the bench
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), flat("cord", "#222")); cord.position.set(lx, 3.05, -0.05); R.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 20, 1, true), lam("lampShade", () => ({ color: "#2f5f4a", side: THREE.DoubleSide }))); shade.position.set(lx, 2.66, -0.05); R.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.8) })); bulb.position.set(lx, 2.58, -0.05); bulb.layers.set(NOINK); R.add(bulb);
    }
    const curtain = lam("curtainM", () => ({ map: ctex("curtainT", 256, 512, (g) => { for (let x = 0; x < 256; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, "#8a2a2a"); gr.addColorStop(0.5, "#c84a3a"); gr.addColorStop(1, "#8a2a2a"); g.fillStyle = gr; g.fillRect(x, 0, 32, 512); } }), side: THREE.DoubleSide }));
    for (const cx of [-2.05, 2.05]) deco.add(wallQ("-z", 3.9, cx - 0.42, cx + 0.42, 0.6, 3.25), curtain);
    deco.add(boxGeo(V(-1.6, 3.2, 3.86), V(1.6 + 0.9, 3.26, 3.92)), flat("rod", "#5a3a22"));
    for (let i = 0; i < 10; i++) deco.add(boxGeo(V(-1.2 + i * 0.25, 0.15, 3.72), V(-1.08 + i * 0.25, 0.75, 3.9)), flat("radiator", "#e6e0d2"));
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 16), lam("pot", () => ({ color: "#b8603a" }))); pot.position.set(-4.3, 0.16, 3.4); R.add(pot);
    const plant = kitClone(kit, "tree_default", 1.1); if (plant) { plant.position.set(-4.3, 0.3, 3.4); R.add(plant); }
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), lam("globeM", () => ({ map: ctex("globeT", 512, 256, (g, r) => { g.fillStyle = "#4a8ac8"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#7ab05a"; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * 512, 40 + r() * 176, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, 6.3); g.fill(); } }) })));
    globe.position.set(2.15, 0.95, -3.35); R.add(globe);
    const scopeM = flat("scope", "#2a2e36");
    deco.add(boxGeo(V(0.05, BENCH.h, -0.35), V(0.25, BENCH.h + 0.03, -0.2)), scopeM); deco.add(boxGeo(V(0.12, BENCH.h, -0.36), V(0.17, BENCH.h + 0.3, -0.3)), scopeM);
    for (let i = 0; i < 4; i++) deco.add(boxGeo(V(2.9, 0.78 + i * 0.05, -3.5), V(3.25, 0.82 + i * 0.05, -3.25)), flat("bookStack" + (i % 3), ["#7a2a2a", "#2a4a7a", "#3a6a3a"][i % 3]));
    deco.build(R, false);
    // ---- corridor behind the door: floor, walls, window, notice board, lamp ----
    const cb = new Batch();
    const corrWall = lam("corrWallHD", () => ({ map: plaster("corrWallT", "#e8dcc0", "#5a3a22") }));
    cb.add(planeXZ(5, 9, -1, 4, 0.002, 2, 2), lam("planksHD", () => ({ map: planksHD() })));
    cb.add(wallQ("-x", 9, -1, 4, 0, 3.4, 1.5, 1), corrWall); cb.add(wallQ("+z", -1, 5, 9, 0, 3.4, 1.2, 1), corrWall); cb.add(wallQ("-z", 4, 5, 9, 0, 3.4, 1.2, 1), corrWall);
    cb.add(planeXZ(5, 9, -1, 4, 3.4).rotateX(Math.PI).translate(0, 6.8, 0), new THREE.MeshBasicMaterial({ color: "#efe2c6" }));
    cb.build(R, false);
    pic("corrWin", ctex("corrWinT", 256, 384, (g) => { g.fillStyle = "#f3efe4"; g.fillRect(0, 0, 256, 384); const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#6aa0e0"); gr.addColorStop(1, "#cfe2f6"); g.fillStyle = gr; g.fillRect(20, 20, 216, 344); g.fillStyle = "#f3efe4"; g.fillRect(122, 20, 12, 344); g.fillRect(20, 186, 216, 12); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(80, 90, 40, 16, 0, 0, 6.3); g.fill(); }), 1.0, 1.5, [8.97, 1.75, 0.6], -Math.PI / 2);
    pic("notice", ctex("noticeT", 384, 256, (g, r) => { g.fillStyle = "#8a5a3a"; g.fillRect(0, 0, 384, 256); g.fillStyle = "#c8a070"; g.fillRect(14, 14, 356, 228); for (let i = 0; i < 7; i++) { g.fillStyle = ["#f7f3e8", "#f8e8a0", "#d8ecf8"][i % 3]; const x = 24 + r() * 280, y = 24 + r() * 150; g.fillRect(x, y, 70, 60); g.fillStyle = "#c0353a"; g.beginPath(); g.arc(x + 35, y + 5, 5, 0, 6.3); g.fill(); } }), 1.1, 0.75, [8.97, 1.6, 2.7], -Math.PI / 2);
    const wl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.6) })); wl.position.set(8.9, 2.6, 1.6); wl.layers.set(NOINK); R.add(wl);
    // ---- street detail: awnings + shop signs, flower boxes, bikes, flags, spires ----
    const sd = new Batch();
    const SHOPS = ["BAGERI", "CAFÉ", "BOGHANDEL", "APOTEK", "SKOMAGER", "SLAGTER", "BLOMSTER", "URMAGER"];
    const stripe = (key: string, a: string, b2: string) => lam(key, () => ({ map: ctex(key + "T", 256, 128, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? a : b2; g.fillRect(x, 0, 32, 128); } g.fillStyle = a; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.arc(x + 16, 120, 16, 0, Math.PI); g.fill(); } }), side: THREE.DoubleSide }));
    const awn = [stripe("awnR", "#c0353a", "#f4ead2"), stripe("awnG", "#2f6a43", "#f4ead2"), stripe("awnB", "#2f5f8a", "#f4ead2")];
    for (let i = 0; i < 26; i++) {
      const xs = -78 + i * 6.2 + hh(i, 8) * 1.5; if (i % 3 === 2) continue;
      const g2 = new THREE.PlaneGeometry(3.0, 1.1); g2.rotateX(-0.9); g2.translate(xs, 2.75, 17.55); sd.add(g2, awn[i % 3]);
      const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshBasicMaterial({ map: ctex("shop" + (i % 8), 512, 96, (g) => { g.fillStyle = "#1f2b3c"; g.fillRect(0, 0, 512, 96); g.fillStyle = "#e9d9a8"; g.font = "bold 58px serif"; g.textAlign = "center"; g.fillText(SHOPS[i % 8], 256, 70); }) }));
      sign2.position.set(xs, 3.55, 17.95); sign2.rotation.y = Math.PI; R.add(sign2);
      for (let k = 0; k < 2; k++) { const fx2 = xs - 1.2 + k * 2.4; sd.add(boxGeo(V(fx2 - 0.5, 4.3, 17.75), V(fx2 + 0.5, 4.52, 18.0)), flat("fbox", "#7a4a2a")); for (let q2 = 0; q2 < 6; q2++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lam("flw" + (q2 % 3), () => ({ color: ["#e84a6a", "#f0c040", "#f08ac0"][q2 % 3] }))); fl.position.set(fx2 - 0.4 + q2 * 0.16, 4.6, 17.86); R.add(fl); } }
    }
    const dk = lam("dkFlag", () => ({ map: ctex("dkT", 256, 192, (g) => { g.fillStyle = "#c8102e"; g.fillRect(0, 0, 256, 192); g.fillStyle = "#fff"; g.fillRect(72, 0, 28, 192); g.fillRect(0, 82, 256, 28); }), side: THREE.DoubleSide }));
    for (const fxp of [4.4, 8.2]) { sd.add(boxGeo(V(fxp - 0.03, 2.6, 4.05), V(fxp + 0.03, 2.66, 5.6)), flat("pole", "#d8d0c0")); const fl = new THREE.PlaneGeometry(0.9, 0.62); fl.translate(fxp, 2.3, 5.3); sd.add(fl, dk); }
    const bikeM = flat("bike", "#2a2a30");
    for (const [bx, bz] of [[-10, 5.5], [-17, 5.6], [12, 16.4], [19, 16.5], [-26, 16.3]] as const) {
      for (const dx of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 20), bikeM); w.position.set(bx + dx, 0.45, bz); R.add(w); }
      sd.add(boxGeo(V(bx - 0.5, 0.7, bz - 0.02), V(bx + 0.5, 0.74, bz + 0.02)), bikeM); sd.add(boxGeo(V(bx - 0.05, 0.45, bz - 0.02), V(bx + 0.02, 0.98, bz + 0.02)), bikeM); sd.add(boxGeo(V(bx + 0.4, 0.45, bz - 0.02), V(bx + 0.45, 1.05, bz + 0.02)), bikeM);
    }
    const copper = lam("copper", () => ({ color: "#5fa08a" })), spireStone = lam("spireStone", () => ({ color: "#b0603e" }));
    for (const [sx2, sz2, h2] of [[-30, 95, 46], [18, 120, 62], [55, 88, 40], [-70, 130, 55]] as const) {
      sd.add(boxGeo(V(sx2 - 3, 0, sz2 - 3), V(sx2 + 3, h2 * 0.55, sz2 + 3)), spireStone);
      const cone = new THREE.ConeGeometry(3.2, h2 * 0.45, 8); cone.translate(sx2, h2 * 0.55 + h2 * 0.225, sz2); sd.add(cone, copper);
    }
    sd.build(R, true);
    // ---- ending props ----
    const sandGeo = new THREE.SphereGeometry(0.006, 6, 4);
    this.sand = new THREE.InstancedMesh(sandGeo, new THREE.MeshPhongMaterial({ color: "#f2c23a", emissive: new THREE.Color("#4a3000"), shininess: 60 }), 90); this.sand.frustumCulled = false; this.jarB.g.add(this.sand);
    this.filterSet = new THREE.Group(); this.filterSet.position.set(2.42, BENCH.h, 0.05);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), flat("standRod", "#8d949c")); stand.position.set(0.16, 0.21, 0); this.filterSet.add(stand);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 6, 18), flat("standRod", "#8d949c")); ring.rotation.x = Math.PI / 2; ring.position.set(0.08, 0.34, 0); this.filterSet.add(ring);
    const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 20, 1, true), new THREE.MeshPhongMaterial({ color: "#e8f4ff", transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })); funnel.rotation.x = Math.PI; funnel.position.set(0.08, 0.36, 0); this.filterSet.add(funnel);
    const paperC = new THREE.Mesh(new THREE.ConeGeometry(0.066, 0.1, 20, 1, true), lam("filterPaper", () => ({ color: "#f7f3e8", side: THREE.DoubleSide }))); paperC.rotation.x = Math.PI; paperC.position.set(0.08, 0.37, 0); this.filterSet.add(paperC);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.03, 24), lam("dish", () => ({ color: "#f4f0e8" }))); dish.position.set(0.08, 0.015, 0); this.filterSet.add(dish);
    this.pile = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.045, 20), new THREE.MeshPhongMaterial({ color: "#f2c23a", emissive: new THREE.Color("#3a2600"), shininess: 40 })); this.pile.position.set(0.08, 0.05, 0); this.filterSet.add(this.pile);
    R.add(this.filterSet);
    // Stockholm mint (FORGE): stone floor, brick corner, furnace glow, Swedish banner, anvil, mould, crucible + molten stream
    const F = new THREE.Group(); F.position.set(...FORGE); R.add(F);
    const fb = new Batch();
    fb.add(planeXZ(-6, 6, -6, 6, 0, 6, 6), lam("forgeFloor", () => ({ map: stoneHD("forgeFloorT", ["#6a625a", "#5e5650", "#726a60", "#585048"], "#3a342e") })));
    const brk = lam("brickWall", () => ({ map: ctex("brickWallT", 512, 512, (g, r) => { g.fillStyle = "#6a3a2a"; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) { g.fillStyle = ["#a8553a", "#b8603e", "#9a4a34"][Math.floor(r() * 3)]; g.fillRect(x * 64 + (y % 2) * 32 + 3, y * 32 + 3, 58, 26); } }) }));
    fb.add(wallQ("+z", -2.2, -6, 6, 0, 5, 6, 2.5), brk); fb.add(wallQ("+x", -2.6, -6, 6, 0, 5, 6, 2.5), brk);
    fb.add(boxGeo(V(-2.55, 0, -2.15), V(-1.0, 1.6, -1.2)), lam("furnace", () => ({ color: "#4a4440" })));
    fb.add(boxGeo(V(-0.25, 0, -0.25), V(0.25, 0.62, 0.25)), lam("anvilBase", () => ({ color: "#3a3a40" })));
    fb.add(boxGeo(V(-0.3, 0.62, -0.2), V(0.3, 0.72, 0.2)), lam("mould", () => ({ color: "#5a5a62" })));
    fb.build(F, true);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.2, 0.6) })); glow.position.set(-1.78, 0.75, -1.19); glow.layers.set(NOINK); F.add(glow);
    const se = lam("seFlag", () => ({ map: ctex("seT", 256, 160, (g) => { g.fillStyle = "#006aa7"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#fecc00"; g.fillRect(70, 0, 30, 160); g.fillRect(0, 65, 256, 30); }), side: THREE.DoubleSide }));
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), se); ban.position.set(0.6, 2.6, -2.18); F.add(ban);
    pic("mintSign", ctex("mintT", 512, 128, (g) => { g.fillStyle = "#1f2b3c"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#e9d9a8"; g.font = "bold 64px serif"; g.textAlign = "center"; g.fillText("STOCKHOLM", 256, 88); }), 1.8, 0.45, [FORGE[0] + 0.6, 3.5, FORGE[2] - 2.17], 0);
    this.cavities = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 0.13, 0.12) })); m.position.set(-0.12 + i * 0.24, 0.722, 0); F.add(m); return m; });
    this.crucible = new THREE.Group(); const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.18, 18), lam("crucible", () => ({ color: "#7a6a5a" }))); this.crucible.add(cr);
    const melt = new THREE.Mesh(new THREE.CircleGeometry(0.1, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.5) })); melt.rotation.x = -Math.PI / 2; melt.position.y = 0.08; melt.layers.set(NOINK); this.crucible.add(melt);
    F.add(this.crucible);
    this.moltenStream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.5) })); this.moltenStream.layers.set(NOINK); F.add(this.moltenStream);
    this.forgeLight = F;
    // stars over the explanation stage
    const sp2: number[] = []; for (let i = 0; i < 500; i++) { const a = hh(i, 1) * Math.PI * 2, e2 = 0.05 + hh(i, 2) * 1.3; sp2.push(SEE[0] + Math.cos(a) * Math.cos(e2) * 180, Math.sin(e2) * 180, SEE[2] + Math.sin(a) * Math.cos(e2) * 180); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(sp2, 3));
    this.stars = new THREE.Points(pg, new THREE.PointsMaterial({ color: "#dfe8ff", size: 2.2, sizeAttenuation: false, fog: false })); this.stars.layers.set(NOINK); R.add(this.stars);

    // ---- SEE stage (night-blue void) ----
    const S = new THREE.Group(); S.position.set(...SEE); R.add(S);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), lam("seeFloor", () => ({ color: "#1d2a5a" }))); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.82, 32), lam("pedStone", () => ({ map: rep(stoneHD("pedHD"), 1, 1) }))); ped.position.y = 0.41; ped.castShadow = true; ped.receiveShadow = true; S.add(ped);
    this.seeMedal = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 40), [new THREE.MeshPhongMaterial({ color: "#c99a2a", specular: "#fff0b0", shininess: 60 }), new THREE.MeshPhongMaterial({ map: medalTex("AU"), emissive: new THREE.Color("#3a2a00"), specular: "#fff4c8", shininess: 50 }), new THREE.MeshPhongMaterial({ color: "#c99a2a" })]);
    this.seeMedal.position.set(0, 1.03, 0); this.seeMedal.rotation.set(Math.PI / 2, 0, 0); this.seeMedal.castShadow = true; S.add(this.seeMedal);
    for (const [i, nm, col] of [[0, "HCl", "#3fa0d8"], [1, "HNO₃", "#e0a030"]] as const) {
      const g = new THREE.Group(); g.position.set(i ? 0.62 : -0.62, 0.82, 0);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 24), new THREE.MeshPhongMaterial({ color: "#e8f4ff", transparent: true, opacity: 0.45, shininess: 80, depthWrite: false })); body.position.y = 0.21; body.renderOrder = 2;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24), lam("acid" + i, () => ({ color: i ? "#f2d27a" : "#a8e0f0" }))); liq.position.y = 0.16;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.12, 16), lam("bneck", () => ({ color: "#d8eef8" }))); neck.position.y = 0.48;
      const lab2 = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: labelTex(nm, col) })); lab2.position.set(0, 0.2, 0.132);
      g.add(liq, neck, lab2, body); S.add(g); this.bottles.push(g);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 1, 8), lam("stream" + i, () => ({ color: i ? "#f2d27a" : "#a8e0f0" }))); st.visible = false; S.add(st); this.streams.push(st);
    }
    this.beaker = new THREE.Group(); this.beaker.position.set(0, 0.82, 0);
    const bglass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 32, 1, true), new THREE.MeshPhongMaterial({ color: "#e8f4ff", transparent: true, opacity: 0.28, shininess: 90, side: THREE.DoubleSide, depthWrite: false })); bglass.position.y = 0.18; bglass.renderOrder = 2;
    this.beakerLiq = new THREE.MeshLambertMaterial({ color: "#d8e8b8" });
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.26, 32), this.beakerLiq); bl.position.y = 0.13;
    this.beaker.add(bl, bglass); S.add(this.beaker);
    const N = 4, sp = 0.085, atomGeo = new THREE.SphereGeometry(0.032, 16, 12);
    this.atoms = new THREE.InstancedMesh(atomGeo, new THREE.MeshPhongMaterial({ color: "#f2c23a", specular: "#fff4c8", shininess: 80 }), N * N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let kk = 0; kk < N; kk++) this.atomBase.push(new THREE.Vector3((i - 1.5) * sp, 1.02 + (j - 1.5) * sp, (kk - 1.5) * sp));
    this.atoms.frustumCulled = false; S.add(this.atoms);
    this.orangeCloud = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: "#ff8a2a", transparent: true, opacity: 0.0, depthWrite: false })); this.orangeCloud.position.y = 1.02; this.orangeCloud.layers.set(NOINK); S.add(this.orangeCloud);
    void twoTone;
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
    const s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camFinal(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    // light: camera-relative sun frozen per shot (interior: high front-left key, golden: low warm from the window side)
    const az = s.light === "interior" || s.light === "warm" ? 140 : s.light === "golden" ? (s.set === "lab" ? 115 : 150) : s.light === "night" ? 120 : 135;
    const el = s.light === "interior" ? 50 : s.light === "warm" ? 38 : s.light === "golden" ? (s.set === "lab" ? 26 : 16) : s.light === "night" ? 40 : 42;
    const sunDir = this.shotSun(id, az, el), focus = new THREE.Vector3(...c.look);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = s.set === "street" ? 40 : 12;
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    // camera-relative cloud deck, frozen per shot: always some clouds where the lens can see sky
    const kk0 = CAMS[id][0], fwx = kk0.look[0] - kk0.pos[0], fwz = kk0.look[2] - kk0.pos[2], fn = Math.hypot(fwx, fwz) || 1, baseA = Math.atan2(fwz / fn, fwx / fn);
    this.clouds.forEach((m, i) => {
      const a = baseA + (i - 4) * 0.2 + (hh(i, id) - 0.5) * 0.12, el2 = 0.07 + hh(i + 3, id) * 0.22, d = 420;
      m.position.set(cam.position.x + Math.cos(a) * Math.cos(el2) * d, Math.max(40, cam.position.y + Math.sin(el2) * d), cam.position.z + Math.sin(a) * Math.cos(el2) * d);
      const w = 110 + hh(i, id + 7) * 90; m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = s.light !== "night";
      (m.material as THREE.MeshBasicMaterial).map = cloudHD(i % 4, s.light === "golden" ? LOOK.golden.cloud : LOOK.day.cloud);
    });
    this.stars.visible = s.set === "see";

    // ---- props per frame ----
    // tanks: shot 3 (street) and shot 9 (past the window)
    const [ta, tb] = this.tanks;
    ta.visible = tb.visible = false;
    if (id === 3) { const t = f - s.a; ta.visible = tb.visible = true; ta.position.set(26 - t * 0.17, 0, 11.6); tb.position.set(40 - t * 0.17, 0, 9.0); ta.rotation.y = tb.rotation.y = Math.PI; }
    if (id === 9 || id === 8) { const t = f - (EV.rumble - 50); ta.visible = t > -10; ta.position.set(-10 + t * 0.17, 0, 11.4); }
    // tank rumble shakes the bench jar
    const shake = id === 9 && Math.abs(f - EV.rumble) < 30 ? 0.004 * Math.sin(f * 2.1) * (1 - Math.abs(f - EV.rumble) / 30) : 0;
    // door: kicked in (shot 11) / opened by George (17)
    let dAng = 0;
    if (id === 11 && f >= EV.kick) { const u = (f - EV.kick) / 5; dAng = -1.85 * Math.min(1, u) + (u > 1 ? 0.18 * Math.exp(-(u - 1) * 0.6) * Math.sin((u - 1) * 3) : 0); }
    if (id === 12 || id === 13) dAng = -1.75;
    if (id === 17) dAng = -1.6 * smooth((f - (EV.enter - 40)) / 18);
    this.door.rotation.y = dAng;
    // jars
    const dis = dissolveAt(f), org = orangeAt(f);
    const onBench = id === 1 || id === 7 || id === 8 || id === 9 || id === 10 || id === 18 ? true : false;
    this.jarB.g.visible = onBench;
    this.jarB.g.position.set(JAR_BENCH[0] + shake, JAR_BENCH[1], JAR_BENCH[2]);
    const cA = new THREE.Color("#cfe6a8"), cB = new THREE.Color("#e8701a");
    const showMedalsIn = (id === 1 && f >= EV.drop1) || (id === 8 && f >= EV.drop2) || id === 9 || id === 10;
    this.jarB.medals.forEach((m, i) => { m.visible = showMedalsIn && dis < 0.98; const sk = Math.max(0.02, 1 - dis); m.scale.set(sk, 1, sk); m.position.y = 0.05 + i * 0.03 + (id === 1 ? Math.max(0, 0.12 - (f - EV.drop1) * 0.03) : 0); });
    const bOrg = id === 1 ? 0.15 : org;
    this.jarB.liq.color.copy(cA).lerp(cB, bOrg); this.jarB.liq.emissive.set("#000000").lerp(new THREE.Color("#3a1200"), bOrg);
    this.jarS.g.visible = id === 2 || id === 12 || id === 13 || id === 17 || id === 3 || id === 4;
    if (id === 2) { this.jarS.liq.color.set("#cfe6a8").lerp(cB, 0.2); } else this.jarS.liq.color.copy(cB);
    this.velvet.visible = id === 5 || id === 22;
    // gold falling out of the liquid like sand (shot 18), pile in the filter dish (19)
    this.sand.visible = id === 18 && f >= EV.sand0 - 4;
    if (this.sand.visible) {
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 90; i++) {
        const t0 = EV.sand0 + hh(i, 2) * (EV.sand1 - EV.sand0 - 20), u = clamp01((f - t0) / 26);
        const r = Math.sqrt(hh(i, 3)) * 0.09, a = hh(i, 4) * 6.28, yTop = 0.18, yBot = 0.016 + hh(i, 5) * 0.014 * (1 - Math.min(1, r / 0.09));
        m4.makeTranslation(Math.cos(a) * r * (u < 1 ? 1 : 0.8), f < t0 ? -1 : lerp(yTop, yBot, u * u), Math.sin(a) * r * (u < 1 ? 1 : 0.8)); this.sand.setMatrixAt(i, m4);
      }
      this.sand.instanceMatrix.needsUpdate = true;
    }
    this.filterSet.visible = id === 19;
    const pg2 = clamp01((f - SHOTS[18].a) / 30); this.pile.scale.set(0.4 + 0.6 * pg2, 0.3 + 0.7 * pg2, 0.4 + 0.6 * pg2);
    // forge: crucible tips, molten stream, cavities glow then cool to gold
    if (s.set === "forge") {
      const tip = smooth((f - (EV.melt - 20)) / 16) - smooth((f - (EV.mould + 6)) / 10);
      this.crucible.position.set(0.05 + 0.18 * tip, 1.05 + 0.08 * tip, 0); this.crucible.rotation.z = 1.9 * tip;
      this.moltenStream.visible = tip > 0.8; this.moltenStream.position.set(-0.05, 0.88, 0);
      const fill = smooth((f - EV.melt) / 22);
      this.cavities.forEach((c) => { const mm = c.material as THREE.MeshBasicMaterial; c.scale.set(Math.max(0.01, fill), 1, Math.max(0.01, fill)); mm.color.setRGB(lerp(0.15, f < EV.mould + 10 ? 4.5 : 1.3, fill), lerp(0.13, f < EV.mould + 10 ? 2.2 : 0.95, fill), lerp(0.12, f < EV.mould + 10 ? 0.4 : 0.25, fill)); });
    }
    // SEE stage
    if (s.set === "see") {
      this.seeMedal.visible = id === 14 || id === 15 || (id === 16 && f < EV.atoms);
      this.seeMedal.rotation.z = (f - SHOTS[13].a) * 0.006;
      const pop = (f0: number) => glide((f - f0) / 12);
      this.bottles[0].visible = id >= 15; this.bottles[1].visible = id >= 15;
      const sA = id === 15 ? pop(EV.acidA) : 1, sB = id === 15 ? pop(EV.acidB) : 1;
      this.bottles[0].scale.setScalar(Math.max(0.001, sA)); this.bottles[1].scale.setScalar(Math.max(0.001, sB));
      const tilt0 = id === 15 ? smooth((f - EV.alone1) / 8) - smooth((f - EV.alone2 + 4) / 8) : id === 16 ? smooth((f - EV.mix + 10) / 10) - smooth((f - EV.atoms) / 10) : 0;
      const tilt1 = id === 15 ? smooth((f - EV.alone2) / 8) : id === 16 ? smooth((f - EV.mix + 10) / 10) - smooth((f - EV.atoms) / 10) : 0;
      this.bottles[0].rotation.z = -1.9 * tilt0; this.bottles[1].rotation.z = 1.9 * tilt1;
      this.bottles[0].position.set(-0.62 + 0.25 * tilt0, 0.82 + 0.35 * tilt0, 0); this.bottles[1].position.set(0.62 - 0.25 * tilt1, 0.82 + 0.35 * tilt1, 0);
      this.streams.forEach((st, i) => { const tl = i ? tilt1 : tilt0; st.visible = tl > 0.7; st.scale.set(1, 0.45, 1); st.position.set(i ? 0.18 : -0.18, 1.32, 0); st.rotation.z = i ? 0.35 : -0.35; });
      this.beaker.visible = id === 16 && f < EV.atoms + 6;
      this.beakerLiq.color.set("#d8e8b8").lerp(new THREE.Color("#e8701a"), smooth((f - EV.mix) / 30));
      // atoms: lattice appears at EV.atoms, each atom leaves one by one, cloud turns orange
      const showA = id === 16 && f >= EV.atoms - 4;
      this.atoms.visible = showA; this.orangeCloud.visible = showA;
      if (showA) {
        const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sv = new THREE.Vector3();
        const col = new THREE.Color();
        this.atomBase.forEach((p0, i) => {
          const leave = EV.atoms + 6 + Math.floor(hh(i, 4) * (EV.orange + 20 - EV.atoms)), t = Math.max(0, f - leave);
          const dir = new THREE.Vector3(hh(i, 1) - 0.5, hh(i, 2) - 0.35, hh(i, 3) - 0.5).normalize();
          const p = p0.clone().addScaledVector(dir, t * 0.012 + t * t * 0.0002); p.y += Math.sin((f + i * 7) * 0.2) * 0.003;
          const sc2 = t > 0 ? Math.max(0.15, 1 - t * 0.012) : 1;
          m4.compose(p, q4, sv.set(sc2, sc2, sc2)); this.atoms.setMatrixAt(i, m4);
          this.atoms.setColorAt(i, col.set("#f2c23a").lerp(new THREE.Color("#ff8a2a"), Math.min(1, t / 40)));
        });
        this.atoms.instanceMatrix.needsUpdate = true; if (this.atoms.instanceColor) this.atoms.instanceColor.needsUpdate = true;
        const oc = smooth((f - EV.atoms - 10) / 60); this.orangeCloud.scale.setScalar(0.12 + oc * 0.55); (this.orangeCloud.material as THREE.MeshBasicMaterial).opacity = 0.32 * oc;
      }
    }

    // ---- cast ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const lx = sunDir.dot(right), light2 = Math.round(Math.atan2(-sunDir.y, lx) / (Math.PI / 4)) * (Math.PI / 4);
    let ai = 0; const used: Actor[] = [];
    let fi = 0; const fused: Fx[] = [];
    const pushFx = (key: string, cw: number, ch: number, k: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, o: { flat?: boolean; rot?: number; soft?: boolean } = {}) => {
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

    // ---- effects ----
    if (id === 1 && f >= EV.drop1 && f < EV.drop1 + 16) pushFx(`splash|${Math.round((f - EV.drop1) / 2)}`, 600, 600, 0.5, (pp) => fxSplash(pp, (f - EV.drop1) / 16), JAR_BENCH[0], JAR_BENCH[1] + 0.3, JAR_BENCH[2], 0.3, 0.3);
    if (id === 8 && f >= EV.drop2 && f < EV.drop2 + 16) pushFx(`splash|${Math.round((f - EV.drop2) / 2)}`, 600, 600, 0.5, (pp) => fxSplash(pp, (f - EV.drop2) / 16), JAR_BENCH[0], JAR_BENCH[1] + 0.3, JAR_BENCH[2], 0.3, 0.3);
    if ((id === 8 && f >= EV.fumes - 20) || id === 9 || (id === 10 && f >= EV.smell - 10)) for (let i = 0; i < 4; i++) {
      const u = (((f - EV.fumes) / 50 + i / 4) % 1 + 1) % 1, sz = 0.12 + u * 0.35;
      pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), JAR_BENCH[0] + Math.sin(i * 2 + u * 3) * 0.08, JAR_BENCH[1] + 0.32 + u * 0.7, JAR_BENCH[2], sz, sz, { soft: true });
    }
    if (id === 10 && f >= EV.gone - 3 && f < EV.gone + 20) pushFx(`stars|${Math.round((f - EV.gone) / 3)}`, 600, 600, 0.5, (pp) => fxStars(pp, (f - EV.gone + 3) / 23), JAR_BENCH[0], JAR_BENCH[1] + 0.2, JAR_BENCH[2] + 0.05, 0.35, 0.35);
    if (id === 11 && f >= EV.kick && f < EV.kick + 12) pushFx(`burst|${Math.round((f - EV.kick) / 2)}`, 600, 600, 0.5, (pp) => fxBurst(pp, (f - EV.kick) / 12), 4.75, 1.4, 1.7, 1.8, 1.8);
    if (id === 12) for (let i = 0; i < 7; i++) { const t = f - s.a - i * 6; if (t < 0) continue; pushFx("paper", 128, 160, 1, paper, 3.5 + Math.sin(i) * 0.4 + t * 0.01 * (i % 2 ? 1 : -1), 0.9 + t * 0.03 - t * t * 0.0004, -3.3 + t * 0.012, 0.22, 0.28, { rot: t * 0.12 * (i % 2 ? 1 : -1) }); }
    if (id === 14) {
      if (f >= EV.rust && f < EV.burn) for (let i = 0; i < 3; i++) { const t = f - EV.rust - i * 3; if (t < 0) continue; pushFx("drop|blue", 128, 128, 1, (pp) => drop(pp, "#7cc4f0"), SEE[0] - 0.08 + i * 0.08, SEE[1] + 1.45 - t * 0.04, SEE[2] + 0.06, 0.08, 0.08); }
      if (f >= EV.rust + 8 && f < EV.burn) pushFx(`splash|${Math.round((f - EV.rust - 8) / 2)}`, 600, 600, 0.5, (pp) => fxSplash(pp, (f - EV.rust - 8) / 14), SEE[0], SEE[1] + 1.15, SEE[2] + 0.1, 0.35, 0.35);
      if (f >= EV.burn && f < EV.diss) pushFx(`flame|${f % 6}`, 300, 300, 0.5, (pp) => flame(pp, f), SEE[0], SEE[1] + 1.05, SEE[2] + 0.12, 0.42, 0.42);
      if (f >= EV.diss && f < EV.diss + 18) { pushFx("drop|green", 128, 128, 1, (pp) => drop(pp, "#a8e070"), SEE[0], SEE[1] + 1.45 - (f - EV.diss) * 0.03, SEE[2] + 0.06, 0.08, 0.08); }
      if (f >= EV.diss + 12) pushFx(`stars|${Math.round((f - EV.diss - 12) / 3) % 8}`, 600, 600, 0.5, (pp) => fxStars(pp, ((f - EV.diss - 12) % 24) / 24), SEE[0], SEE[1] + 1.05, SEE[2] + 0.15, 0.4, 0.4);
    }
    if (id === 15 && f > EV.alone1 + 10) pushFx(`stars|${Math.round((f - EV.alone1) / 3) % 8}`, 600, 600, 0.5, (pp) => fxStars(pp, ((f - EV.alone1) % 24) / 24), SEE[0], SEE[1] + 1.05, SEE[2] + 0.15, 0.35, 0.35);
    if (id === 17 && f > EV.dusty - 40) pushFx("cobweb", 256, 256, 1, cobweb, JAR_SHELF[0] + 0.02, JAR_SHELF[1] + 0.35, JAR_SHELF[2] - 0.22, 0.35, 0.35, { rot: 0 });
    if (id === 19 && f > EV.dish - 4) pushFx(`stars|${Math.round((f - EV.dish) / 3) % 8}`, 600, 600, 0.5, (pp) => fxStars(pp, ((f - EV.dish) % 24) / 24), 2.5, BENCH.h + 0.12, 0.1, 0.3, 0.3);
    if (id === 21 && f > EV.melt) pushFx(`stars|${Math.round((f - EV.melt) / 3) % 8}`, 600, 600, 0.5, (pp) => fxStars(pp, ((f - EV.melt) % 24) / 24), FORGE[0], 0.85, FORGE[2] + 0.1, 0.45, 0.45);
    if (id === 22) pushFx(`stars|${Math.round((f - EV.shine) / 3) % 8}`, 600, 600, 0.5, (pp) => fxStars(pp, (((f - EV.shine) % 24) + 24) % 24 / 24), 1.15, BENCH.h + 0.12, -0.15, 0.4, 0.4);
    if (s.set === "street" || id === 4 || id === 9) {
      for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { const u = (((f / 70) + k / 3 + hh(i)) % 1), cx = -40 + i * 21 + hh(i, 1) * 6, sz = 1.2 + u * 3;
        pushFx(`puff|${Math.round(u * 10)}`, 300, 300, 0.5, (pp) => fxPuff(pp, u), cx + u * 3, 13.5 + u * 6, 23 + hh(i, 2) * 2, sz, sz, { soft: true }); }
      for (let i = 0; i < 6; i++) { const x = ((f * (0.08 + hh(i, 3) * 0.05) + i * 25) % 140) - 50, flap = Math.sin(f * 0.6 + i) > 0;
        pushFx(`bird|${flap ? 1 : 0}`, 128, 64, 1, (pp) => { const g = pp.g; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(8, flap ? 20 : 44); g.quadraticCurveTo(36, flap ? 44 : 20, 64, 34); g.quadraticCurveTo(92, flap ? 44 : 20, 120, flap ? 20 : 44); g.stroke(); }, x, 22 + hh(i, 4) * 10, 30 + hh(i, 5) * 20, 1.0, 0.5); }
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
void lerp; void clamp01;
