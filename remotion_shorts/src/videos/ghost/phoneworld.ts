// THE PHONE — test shot world: a sunset city street (Kenney CC0 city kits + cartoon trees), our cast as lit flat cards.
// Reuses the bridge look machinery: two-tone shading (shade.ts), card shading (cast.ts/cardshade.ts), sky stops (lights.ts).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Pen, bodyFront, fxRing, fxContact, Outfit, Expr, INK } from "./toon";
import { Actor, Fx, Pool } from "./cast";
import { lam, kitClone, Kit, Batch, boxGeo, V } from "./build";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { LIGHTS, LOOK } from "./lights";
import { NOINK } from "./ink";
import { ctex, rep, stoneHD, cloudHD } from "./paint";

export const FPS = 30;
export const TOTAL = 150;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t)) as [number, number, number];

// ---------------- cast ----------------
export const YOU: Outfit = { jacket: "#2f6fd6", pants: "#2c3348", boots: "#f4f1ea", hat: "hair", hair: "#1c1a22", hood: true };
export const SAM: Outfit = { jacket: "#3f9a55", pants: "#4a4a58", boots: "#5a3b2a", hat: "hair", hair: "#8a4a22", glasses: true };

// ---------------- kit ----------------
const KIT: [string, string][] = [
  ...["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"].map((c) => ["city-kit-commercial", `building-${c}`] as [string, string]),
  ...["a", "b", "c", "d", "e"].map((c) => ["city-kit-commercial", `building-skyscraper-${c}`] as [string, string]),
  ["city-kit-commercial", "detail-awning-wide"], ["city-kit-commercial", "detail-parasol-a"],
  ["city-kit-roads", "light-square"], ["city-kit-roads", "light-curved"], ["city-kit-roads", "road-sign-street"],
  ["car-kit", "taxi"], ["car-kit", "sedan"], ["car-kit", "suv"], ["car-kit", "van"], ["car-kit", "hatchback-sports"], ["car-kit", "delivery"],
  ["city-kit-suburban", "planter"],
];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KIT.map(([pack, n]) => loader.loadAsync(staticFile(`kenney/${pack}/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- painted textures ----------------
const asphalt = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a4e5e"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; const s = 2 + r() * 5; g.fillRect(r() * 1024, r() * 1024, s, s); }
  for (let i = 0; i < 7; i++) { g.strokeStyle = "rgba(20,20,30,0.35)"; g.lineWidth = 3; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 140; y += r() * 90; g.lineTo(x, y); } g.stroke(); }
});
const paving = () => ctex("paving", 1024, 1024, (g, r) => {
  const cols = ["#c9b9a4", "#bfae98", "#d2c3ae", "#b8a690"];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = cols[Math.floor(r() * 4)]; g.fillRect(x * 128, y * 128, 128, 128); }
  g.strokeStyle = "#7d6e5e"; g.lineWidth = 6;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(1024, i * 128); g.stroke(); }
});
const flat = (key: string, col: string) => lam(key, () => ({ color: col }));
const planeXZ = (x0: number, x1: number, z0: number, z1: number, y: number, ru = 1, rv = 1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  return g;
};

// ---------------- camera / story ----------------
export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number; roll: number };
const YOU_AT: [number, number, number] = [6.0, 0.16, -7.2];
export const RING_AT = 52, SHOCK_AT = 84;
export const camAt = (f: number): Cam => {
  const g = glide(f / 70);
  const pos = lerp3([1.2, 1.9, 16], [4.75, 1.6, -3.0], g), look = lerp3([3.0, 2.2, -30], [6.0, 1.75, -7.2], g);
  // after the glide every hold creeps in (0.25 %/f), a punch on the shock beat
  const creep = Math.max(0, f - 70), push = creep * 0.0025 + (f > SHOCK_AT ? Math.min(1, (f - SHOCK_AT) / 10) * 0.08 : 0);
  for (let i = 0; i < 3; i++) pos[i] = lerp(pos[i], look[i], Math.min(0.35, push));
  let roll = THREE.MathUtils.degToRad(lerp(0, 4.2, g));
  const k = f - SHOCK_AT; // flip kick decaying over 7 f
  if (k >= 0 && k < 7) { const a = 0.06 * (1 - k / 7) * (k % 2 ? -1 : 1); pos[1] += a; roll += a * 0.4; }
  return { pos, look, fov: lerp(42, 38, g), roll };
};
export const dofAt = (f: number) => ({ cInf: lerp(0, 13, glide((f - 40) / 40)), focus: [YOU_AT[0], YOU_AT[1] + 1.75, YOU_AT[2]] as [number, number, number] });

// ---------------- world ----------------
export class PhoneWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private you: Actor;
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#efb489", 50, 380);
  private sunDisc: THREE.Sprite;
  private clouds: THREE.Mesh[] = [];

  constructor(kit: Kit) {
    const R = this.root;
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
    const disc = ctex("sundisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.layers.set(NOINK); this.sunDisc.frustumCulled = false; R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.28, d = 640 + (i % 3) * 50;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4, LOOK.golden.cloud), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 35; m.position.set(Math.cos(a) * d, 70 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- street: asphalt, lane dashes, kerbs, pavements ----
    const b = new Batch();
    const road = lam("asphalt", () => ({ map: rep(asphalt(), 1, 1) }));
    const pave = lam("paving", () => ({ map: rep(paving(), 1, 1) }));
    const kerb = lam("kerbHD", () => ({ map: stoneHD("kerbHD", ["#d8d2c6", "#cfc8bb", "#e0dacf", "#c6bfb1"], "#9a9284") }));
    const white = flat("lane", "#f1ece0"), yellow = flat("laneY", "#f2c14a");
    b.add(planeXZ(-6, 6, -420, 40, 0, 3, 115), road);
    for (const s of [-1, 1]) {
      b.add(planeXZ(s < 0 ? -11 : 6.3, s < 0 ? -6.3 : 11, -420, 40, 0.16, 1.2, 115), pave);
      b.add(boxGeo(V(s < 0 ? -6.3 : 6, 0, -420), V(s < 0 ? -6 : 6.3, 0.16, 40), 2), kerb);
      b.add(planeXZ(s * 5.6 - 0.07, s * 5.6 + 0.07, -420, 40, 0.012), white);
    }
    for (let z = 36; z > -420; z -= 9) b.add(planeXZ(-0.09, 0.09, z - 4.5, z, 0.012), yellow);
    b.build(R, true);

    // ---- buildings: both sides, facades on the pavement line, skyscrapers behind ----
    const place = (name: string, x: number, z: number, h: number, yaw: number) => {
      const o = kitClone(kit, name, h); if (!o) return 0;
      o.rotation.y = yaw; o.position.set(x, 0.16, z); o.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(o);
      o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      R.add(o); return box;
    };
    const rnd = (i: number) => { const v = Math.sin(i * 91.7 + 13.1) * 43758.5; return v - Math.floor(v); };
    const names = "abcdefghijklmn".split("").map((c) => `building-${c}`);
    for (const s of [-1, 1]) {
      let z = 30, i = s > 0 ? 0 : 50;
      while (z > -330) {
        const n = names[Math.floor(rnd(i) * names.length)], h = 11 + rnd(i + 7) * 13;
        const o = kitClone(kit, n, h); i++;
        if (!o) { z -= 10; continue; }
        o.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; o.updateMatrixWorld(true);
        const bx = new THREE.Box3().setFromObject(o), dz = bx.max.z - bx.min.z, dx = bx.max.x - bx.min.x;
        o.position.set(s * 11.2 - (s > 0 ? bx.min.x : bx.max.x), 0.16, z - bx.max.z);
        o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        R.add(o); z -= dz + 0.15; void dx;
      }
    }
    for (let k = 0; k < 9; k++) place(`building-skyscraper-${"abcde"[k % 5]}`, (k % 2 ? 1 : -1) * (22 + rnd(k) * 40), -220 - k * 28, 60 + rnd(k + 3) * 55, rnd(k + 9) * 6);

    // ---- street furniture: lamps, trees, cars ----
    for (let z = 22; z > -300; z -= 20) for (const s of [-1, 1]) {
      const l = kitClone(kit, "light-square", 6.4); if (l) { l.position.set(s * 6.75, 0.16, z + (s > 0 ? 0 : 10)); l.rotation.y = s > 0 ? Math.PI : 0; R.add(l); }
      const tz = z - 10 + (s > 0 ? 0 : 10); const t = Math.abs(tz - YOU_AT[2]) < 9 && s > 0 ? null : kitClone(kit, ["tree_oak", "tree_default", "tree_fat"][Math.abs(Math.round(z)) % 3], 6.5); if (t) { t.position.set(s * 8.3, 0.16, z - 10 + (s > 0 ? 0 : 10)); R.add(t); }
    }
    const car = (name: string, x: number, z: number, yaw: number, h = 1.55) => { const c = kitClone(kit, name, h); if (c) { c.position.set(x, 0, z); c.rotation.y = yaw; c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; }); R.add(c); } };
    car("taxi", 4.1, -9.4, Math.PI);
    car("sedan", 4.1, -24, Math.PI); car("van", 4.1, -40, Math.PI, 2.1); car("suv", -4.1, -16, 0, 1.75); car("hatchback-sports", -4.1, -33, 0, 1.35);
    car("delivery", 4.1, -62, Math.PI, 2.4); car("sedan", -1.8, -80, 0); car("taxi", 1.8, -110, Math.PI);

    this.you = new Actor(R);
  }

  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const L = LIGHTS.golden, K = LOOK.golden;
    const c = camAt(f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    // sun: low, straight down the street ahead (backlit), slightly right
    const az = THREE.MathUtils.degToRad(-128), el = THREE.MathUtils.degToRad(34);
    const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    const focus = new THREE.Vector3(...c.look);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = 34;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.9)));
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);

    // ---- You: front card facing the camera, phone in hand; ring then shock ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const lx = sunDir.dot(right), light = Math.round(Math.atan2(-sunDir.y, lx) / (Math.PI / 4)) * (Math.PI / 4);
    const shock = f >= SHOCK_AT - 2, blink = f >= SHOCK_AT - 2 && f < SHOCK_AT + 2 ? [0.5, 1, 1, 0.5][f - SHOCK_AT + 2] : (f % 47 < 4 ? [0.5, 1, 1, 0.5][f % 47] : 0);
    const expr: Expr = shock ? "shock" : "neutral";
    const d = cam.position.distanceTo(new THREE.Vector3(YOU_AT[0], YOU_AT[1] + 1.2, YOU_AT[2]));
    const [w, h, k] = d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : [480, 800, 0.8];
    const look = shock ? 0 : -0.6;
    const opts = { mode: "stand" as const, expr, prop: "phone" as const, light, facing: 0 as const, seed: 3, blink, look, headTilt: shock ? 0 : 6 };
    this.you.r = this.pool.req(`you|${expr}|${blink}|${look}|${light}|${w}`, w, h, k, (p: Pen) => bodyFront(p, YOU, opts));
    this.you.mesh.visible = true; this.you.mesh.position.set(...YOU_AT);
    this.you.mesh.rotation.set(0, Math.atan2(cam.position.x - YOU_AT[0], cam.position.z - YOU_AT[2]), 0);
    this.you.mesh.scale.setScalar(1); this.you.mesh.castShadow = true;
    // ---- effects: contact blob, phone ring waves ----
    let fi = 0;
    const blobFx = this.fx(fi++);
    blobFx.r = this.pool.req("blob|contact|#3d3354", 128, 128, 1, (p) => fxContact(p, "#3d3354"));
    blobFx.use(false); blobFx.mesh.visible = true; blobFx.mesh.position.set(YOU_AT[0], YOU_AT[1] + 0.02, YOU_AT[2]);
    blobFx.mesh.rotation.set(-Math.PI / 2, 0, 0); blobFx.mesh.scale.set(0.6, 0.45, 1);
    if (f >= RING_AT) {
      const ph = ((f - RING_AT) % 18) / 18, ring = this.fx(fi++);
      ring.r = this.pool.req(`ring|${Math.round(ph * 18)}`, 300, 300, 0.5, (p) => fxRing(p, ph));
      ring.use(false); ring.mesh.visible = true;
      const ph3 = new THREE.Vector3(YOU_AT[0], YOU_AT[1] + 1.02, YOU_AT[2]).addScaledVector(right, 0.06);
      ring.mesh.position.copy(ph3); ring.mesh.quaternion.copy(cam.quaternion); ring.mesh.scale.set(0.42, 0.42, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    this.you.bind(); for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}
void INK; void twoTone;
