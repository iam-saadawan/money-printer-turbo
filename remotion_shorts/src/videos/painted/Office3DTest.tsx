// Style test A: upgraded 3D look — prop-packed toon office (Kenney CC0 + custom props), ink outlines (OutlineEffect),
// window light pool + shafts, close framing, ease-out camera bursts, our toon characters as lit billboards.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Pen, bodyFront, Outfit, Expr, INK } from "../ghost/toon";

export const OFFICE3D_FRAMES = 150;
const NAMES = ["desk", "chairDesk", "bookcaseOpen", "bookcaseClosedWide", "books", "ceilingFan", "coatRackStanding", "pottedPlant",
  "lampRoundTable", "cardboardBoxClosed", "radio", "sideTableDrawers", "rugRectangle", "plantSmall2"];
type Kit = Record<string, THREE.Object3D>;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (o: { color?: THREE.ColorRepresentation; map?: THREE.Texture | null }) => new THREE.MeshToonMaterial({ gradientMap: grad, ...o });
const ctex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const tiles = () => { const t = ctex(512, 512, (g) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? "#e9dcc4" : "#d9c9ad"; g.fillRect(x * 128, y * 128, 128, 128);
    g.strokeStyle = "#5b6c9a"; g.lineWidth = 6; g.beginPath(); g.arc(x * 128 + 64, y * 128 + 64, 34, 0, 6.3); g.stroke();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x * 128 + 64, y * 128 + 64); g.lineTo(x * 128 + 64 + Math.cos(k * 1.57 + 0.78) * 60, y * 128 + 64 + Math.sin(k * 1.57 + 0.78) * 60); g.stroke(); }
    g.strokeStyle = "#3a2a3a"; g.lineWidth = 3; g.strokeRect(x * 128, y * 128, 128, 128);
  } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; };
const plaster = () => ctex(1024, 1024, (g) => {
  g.fillStyle = "#e6dccd"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 700; i++) { g.fillStyle = rnd(i, 1) < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(80,40,30,0.05)"; g.beginPath(); g.arc(rnd(i, 2) * 1024, rnd(i, 3) * 1024, 6 + rnd(i, 4) * 22, 0, 6.3); g.fill(); }
  g.fillStyle = "#6e4026"; g.fillRect(0, 700, 1024, 324); g.fillStyle = "rgba(0,0,0,0.3)"; for (let x = 0; x < 1024; x += 128) g.fillRect(x, 700, 6, 324);
  g.fillStyle = "#3e2414"; g.fillRect(0, 688, 1024, 18); g.fillRect(0, 1000, 1024, 24);
});
const mapTex = () => ctex(512, 360, (g) => {
  g.fillStyle = "#6b4426"; g.fillRect(0, 0, 512, 360); g.fillStyle = "#efe2bd"; g.fillRect(22, 22, 468, 316);
  g.fillStyle = "#9cc3d6"; g.fillRect(30, 30, 452, 300); g.fillStyle = "#c9b36e";
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(80 + rnd(i, 1) * 360, 70 + rnd(i, 2) * 220, 30 + rnd(i, 3) * 60, 20 + rnd(i, 4) * 40, rnd(i, 5) * 3, 0, 6.3); g.fill(); }
  g.fillStyle = "#c0353a"; g.beginPath(); g.arc(330, 170, 8, 0, 6.3); g.fill(); g.fillStyle = "#3a2a1c"; g.font = "bold 26px serif"; g.fillText("INDOCHINE 1902", 150, 320);
});
const clockTex = () => ctex(256, 256, (g) => {
  g.fillStyle = "#3a2a1c"; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill(); g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(128, 128, 106, 0, 6.3); g.fill();
  g.fillStyle = "#222"; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(128 + Math.cos(a) * 90 - 4, 128 + Math.sin(a) * 90 - 4, 8, 8); }
  g.strokeStyle = "#222"; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 58); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 150); g.stroke();
});
const ledger = () => ctex(512, 340, (g) => {
  g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 512, 340); g.fillStyle = "#c8b48a"; g.fillRect(250, 0, 12, 340);
  g.strokeStyle = "#7a8aa8"; g.lineWidth = 3; for (let y = 40; y < 330; y += 22) { g.beginPath(); g.moveTo(20, y); g.lineTo(240, y); g.moveTo(272, y); g.lineTo(492, y); g.stroke(); }
  g.fillStyle = "#2a2a3a"; g.font = "italic 18px serif"; for (let i = 0; i < 11; i++) g.fillText(`${20 + i * 7} queues ... ${(i + 1) * 3} c`, 28, 58 + i * 22);
});

const OFFICIAL: Outfit = { jacket: "#d8c08a", pants: "#efe6cf", boots: "#5a3b2a", hat: "helmet", cap: "#f1ead6", moustache: "#6b4a2a", buttons: "#d8b25a", build: "stout" };
const VILLAGER: Outfit = { jacket: "#5f8f6a", pants: "#3b3a30", boots: "#3a2a20", hat: "hair", hair: "#1c1a1a" };

class Card {
  cv = document.createElement("canvas"); tex: THREE.CanvasTexture; mesh: THREE.Mesh; key = "";
  constructor(h: number) {
    this.cv.width = 600; this.cv.height = 1000; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshLambertMaterial({ map: this.tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    m.userData.outlineParameters = { visible: false };
    const geo = new THREE.PlaneGeometry(h * 0.6, h); geo.translate(0, h * 0.5 - h * 0.025, 0);
    this.mesh = new THREE.Mesh(geo, m); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
  }
  draw(o: Outfit, expr: Expr, blink: boolean, seed: number, prop: any, look: number) {
    const k = `${expr}${blink}`; if (k === this.key) return; this.key = k;
    const g = this.cv.getContext("2d")!; g.clearRect(0, 0, 600, 1000);
    bodyFront(new Pen(g), o, { mode: "stand", expr, blink, seed, prop, look, light: (-150 * Math.PI) / 180 });
    this.tex.needsUpdate = true;
  }
}

const HULL = new THREE.MeshBasicMaterial({ color: "#241726", side: THREE.BackSide });
HULL.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normalize(normal) * 0.012 / max(0.2, length((modelMatrix * vec4(1.0,0.0,0.0,0.0)).xyz));"); };
const inkAll = (root: THREE.Object3D) => {
  const list: THREE.Mesh[] = [];
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material instanceof THREE.MeshToonMaterial && !m.userData.noInk) list.push(m); });
  for (const m of list) { const h = new THREE.Mesh(m.geometry, HULL); h.userData.noInk = true; m.add(h); }
};
class Office {
  root = new THREE.Group(); fan: THREE.Object3D | null = null; off = new Card(1.85); vil = new Card(1.75); motes: THREE.Points;
  constructor(kit: Kit) {
    const R = this.root;
    const put = (n: string, h: number, x: number, z: number, ry = 0, y = 0) => {
      const src = kit[n]; if (!src) return null;
      const box = new THREE.Box3().setFromObject(src), s = h / Math.max(0.01, box.max.y - box.min.y), c = src.clone(true);
      c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const om = m.material as THREE.MeshStandardMaterial; m.material = toon({ color: om.color, map: om.map }); m.castShadow = true; m.receiveShadow = true; } });
      const cx = (box.min.x + box.max.x) / 2 * s, cz = (box.min.z + box.max.z) / 2 * s; const wrap = new THREE.Group(); c.scale.setScalar(s); c.position.set(-cx, -box.min.y * s, -cz); wrap.add(c); wrap.position.set(x, y, z); wrap.rotation.y = ry; R.add(wrap); return wrap;
    };
    // room: x -3..3, z -2.6..3.5, h 3.3 (no front wall)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.1), toon({ map: tiles() })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.45); floor.receiveShadow = true; R.add(floor);
    const wm = toon({ map: plaster() });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.3), wm); back.position.set(0, 1.65, -2.6); back.receiveShadow = true; R.add(back);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 3.3), wm); right.rotation.y = -Math.PI / 2; right.position.set(3, 1.65, 0.45); right.receiveShadow = true; R.add(right);
    // left wall with a tall window (x = -3), shutters open; wall pieces around the opening
    const lwall = (z0: number, z1: number, y0: number, y1: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), wm); m.rotation.y = Math.PI / 2; m.position.set(-3, (y0 + y1) / 2, (z0 + z1) / 2); m.receiveShadow = true; R.add(m); };
    lwall(-2.6, -1.4, 0, 3.3); lwall(0.0, 3.5, 0, 3.3); lwall(-1.4, 0.0, 0, 0.8); lwall(-1.4, 0.0, 2.7, 3.3);
    const green = toon({ color: "#2f7a5a" }), trim = toon({ color: "#f3ead8" });
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = true; b.receiveShadow = true; R.add(b); return b; };
    box(0.12, 0.08, 1.5, trim, -2.97, 0.78, -0.7); box(0.12, 0.08, 1.5, trim, -2.97, 2.72, -0.7); box(0.1, 1.94, 0.06, trim, -2.97, 1.75, -0.7);
    for (const [z, s] of [[-1.62, -1], [0.22, 1]] as const) for (let k = 0; k < 9; k++) box(0.03, 0.06, 0.42, green, -2.75 + s * 0.0, 0.95 + k * 0.2, z + s * 0.02, s * 0.9);
    box(0.06, 1.95, 0.46, green, -2.8, 1.75, -1.65, -0.9); box(0.06, 1.95, 0.46, green, -2.8, 1.75, 0.25, 0.9);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.5) })); sky.rotation.y = Math.PI / 2; sky.position.set(-3.3, 1.75, -0.7); (sky.material as any).userData.outlineParameters = { visible: false }; R.add(sky);
    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.1), toon({ color: "#efe3cb" })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.3, 0.45); R.add(ceil);
    // wall art
    const pic = (t: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon({ map: t })); m.position.set(x, y, z); m.rotation.y = ry; R.add(m); };
    pic(mapTex(), 1.1, 0.78, -0.35, 2.05, -2.58); pic(clockTex(), 0.42, 0.42, 0.75, 2.45, -2.58);
    // furniture (Kenney CC0), dense like the reference
    put("desk", 0.8, 0, 0.1, 0); put("chairDesk", 1.0, 0.05, -0.85, 0);
    put("bookcaseOpen", 2.1, 1.7, -2.35, 0); put("bookcaseClosedWide", 2.0, -1.85, -2.35, 0); put("books", 0.25, 1.7, -2.3, 0, 1.25); put("books", 0.25, 1.95, -2.3, 0, 0.82);
    put("coatRackStanding", 1.85, 2.55, -1.6, 0.4); put("pottedPlant", 1.1, -2.55, 1.6, 0); put("plantSmall2", 0.5, 2.6, -0.2, 0, 0); put("sideTableDrawers", 0.7, 2.62, -0.2, -Math.PI / 2);
    put("cardboardBoxClosed", 0.45, -2.4, -1.95, 0.3); put("cardboardBoxClosed", 0.35, -2.35, -1.95, 0.9, 0.45); put("radio", 0.28, 2.6, -0.25, -1.2, 0.7);
    put("lampRoundTable", 0.5, 0.75, -0.05, 0, 0.8); put("books", 0.12, -0.6, 0.0, 0.4, 0.8);
    this.fan = put("ceilingFan", 0.45, 0, -0.2, 0, 2.85);
    // desk props: ledger, coin stacks, brass scale, inkwell, rat-tail pile
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.36), toon({ map: ledger() })); led.rotation.x = -Math.PI / 2; led.rotation.z = 0.15; led.position.set(-0.25, 0.805, 0.25); R.add(led);
    const gold = toon({ color: "#e8b83a" });
    for (let s = 0; s < 4; s++) { const n = 5 + Math.floor(rnd(s, 1) * 8); for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), gold); c.position.set(0.3 + s * 0.075, 0.805 + i * 0.0105, 0.3 - (s % 2) * 0.08); c.castShadow = true; R.add(c); } }
    const brass = toon({ color: "#c99a3a" });
    box(0.03, 0.32, 0.03, brass, -0.62, 0.96, 0.15); box(0.36, 0.02, 0.02, brass, -0.62, 1.12, 0.15);
    for (const dx of [-0.17, 0.17]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.04, 18), brass); p.position.set(-0.62 + dx, 1.0, 0.15); p.castShadow = true; R.add(p); }
    const ink = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), toon({ color: "#1e2234" })); ink.position.set(0.05, 0.84, 0.32); R.add(ink);
    const tailM = toon({ color: "#9a7468" });
    for (let i = 0; i < 26; i++) {
      const x0 = -0.1 + rnd(i, 1) * 0.35, z0 = 0.05 + rnd(i, 2) * 0.28, a = rnd(i, 3) * 6.28, L = 0.18 + rnd(i, 4) * 0.12;
      const crv = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, 0.815 + i * 0.002, z0), new THREE.Vector3(x0 + Math.cos(a + 0.7) * L * 0.5, 0.83 + i * 0.002, z0 + Math.sin(a + 0.7) * L * 0.5), new THREE.Vector3(x0 + Math.cos(a) * L, 0.815, z0 + Math.sin(a) * L)]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(crv, 12, 0.009, 6), tailM); m.castShadow = true; R.add(m);
    }
    // characters
    this.off.mesh.position.set(-0.05, 0, -0.45); R.add(this.off.mesh);
    this.vil.mesh.position.set(0.72, 0, 1.75); R.add(this.vil.mesh);
    // light shafts from the window (additive, no outline)
    const shaftM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.55), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    (shaftM as any).userData.outlineParameters = { visible: false };
    for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(0.3, 4.2); const m = new THREE.Mesh(g, shaftM); m.position.set(-1.6, 1.25, -0.95 + k * 0.5); m.rotation.set(0, 0, -0.95); R.add(m); }
    // dust motes
    const pts = new Float32Array(240 * 3); for (let i = 0; i < 240; i++) { pts[i * 3] = -2.6 + rnd(i, 1) * 3.2; pts[i * 3 + 1] = 0.3 + rnd(i, 2) * 2.6; pts[i * 3 + 2] = -1.6 + rnd(i, 3) * 2.6; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const pm = new THREE.PointsMaterial({ color: "#fff2c8", size: 0.018, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    this.motes = new THREE.Points(pg, pm); R.add(this.motes);
    // lights: warm sun through the window (shadows) + window spill, cool fill
    const hemi = new THREE.HemisphereLight("#bcd0ff", "#7a5a6a", 0.9); R.add(hemi);
    const sun = new THREE.DirectionalLight("#ffd9a0", 3.2); sun.position.set(-7, 5.2, -0.7); sun.target.position.set(0.3, 0, 0.2);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.bias = -0.0008;
    R.add(sun, sun.target);
    const lamp = new THREE.PointLight("#ffc070", 1.2, 3.5, 2); lamp.position.set(0.75, 1.25, -0.05); R.add(lamp);
    for (const o of R.children) if ((o as THREE.Mesh).isMesh && [back, right, ceil].includes(o as THREE.Mesh)) (o as THREE.Mesh).castShadow = false;
    floor.userData.noInk = back.userData.noInk = right.userData.noInk = ceil.userData.noInk = true;
    inkAll(R);
  }
  pose(f: number) {
    if (this.fan) this.fan.rotation.y = f * 0.12;
    const blinkO = (f + 11) % 97 < 4, blinkV = (f + 53) % 89 < 4;
    this.off.draw(OFFICIAL, f < 73 ? "stern" : "shock", blinkO, 3, null, 0.3);
    this.vil.draw(VILLAGER, f < 73 ? "grin" : "laugh", blinkV, 8, ["hold", "point", 0], -0.5);
    this.vil.mesh.position.y = Math.abs(Math.sin(f * 0.25)) * 0.015;
    const p = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, 0.3 + ((rnd(i, 2) * 2.6 + f * 0.002 * (1 + rnd(i, 4))) % 2.6));
    p.needsUpdate = true;
  }
}

const camAt = (f: number) => {
  // slow push-in, then an ease-out punch to the official's face on the shock beat (f 75) with a decaying shake
  let pos = new THREE.Vector3(lerp(0.35, 0.3, f / 75), 1.45, lerp(4.7, 4.35, f / 75)), look = new THREE.Vector3(0.0, 1.15, -0.3), fov = 42;
  if (f >= 75) { const t = ease((f - 75) / 9); pos = new THREE.Vector3(lerp(0.3, 0.15, t), lerp(1.45, 1.6, t), lerp(4.35, 2.6, t) - Math.max(0, f - 84) * 0.002); look = new THREE.Vector3(lerp(0.0, -0.05, t), lerp(1.15, 1.45, t), -0.45); }
  const k = f >= 75 && f < 87 ? Math.sin((f - 75) * 2.2) * (1 - (f - 75) / 12) * 0.025 : 0;
  return { pos, look, fov, roll: k };
};

const Inner: React.FC<{ kit: Kit }> = ({ kit }) => {
  const f = useCurrentFrame();
  const { gl, scene, camera } = useThree();
  const world = useMemo(() => new Office(kit), [kit]);
  gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; scene.background = new THREE.Color("#1a1220");
  world.pose(f);
  const c = camAt(f), cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(c.pos); cam.lookAt(c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.updateProjectionMatrix();
  // face the cards toward the camera (yaw only)
  for (const card of [world.off, world.vil]) { const m = card.mesh; m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z); }
  return <primitive object={world.root} dispose={null} />;
};

export const Office3DTest: React.FC = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [h] = useState(() => delayRender("kit"));
  useEffect(() => {
    const L = new GLTFLoader();
    Promise.all(NAMES.map((n) => L.loadAsync(staticFile(`kenney/furniture-kit/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => { setKit(Object.fromEntries(list.filter((e) => e[1])) as Kit); continueRender(h); });
  }, [h]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {kit && <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: 42, near: 0.05, far: 60 }} gl={{ antialias: true }}><Inner kit={kit} /></ThreeCanvas>}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(20,8,30,0.45) 100%)" }} />
    </AbsoluteFill>
  );
};
void INK;
