// Framing check: for every 3rd frame, project each character's head/chest/hips into the 1080x1920 frame and report
// anyone cut by the left/right/top edge, cut through the chest at the bottom, or (main subject) far off centre.
import * as THREE from "three";
import { SHOTS, TOTAL, shotAt } from "../src/videos/gold/goldstory";
import { stage, camFinal } from "../src/videos/gold/goldstage";
const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 1500);
const v = new THREE.Vector3();
const proj = (x: number, y: number, z: number) => v.set(x, y, z).project(cam).clone();
const issues: Record<string, number[]> = {};
const add = (k: string, f: number) => { (issues[k] ??= []).push(f); };
for (let f = 0; f < TOTAL; f += 3) {
  const id = shotAt(f).id, c = camFinal(id, f);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const P = stage(id, f);
  P.forEach((p, i) => {
    const [x, y, z] = p.at, s = p.scale ?? 1;
    const head = proj(x, y + 1.98 * s, z), chest = proj(x, y + 1.25 * s, z), hips = proj(x, y + 0.85 * s, z);
    const L = proj(x - right.x * 0.33, y + 1.3, z - right.z * 0.33), R = proj(x + right.x * 0.33, y + 1.3, z + right.z * 0.33);
    if (head.z > 1 || chest.z > 1) return;                                   // behind the camera
    const visible = Math.abs(chest.x) < 1.2 && chest.y < 1.2 && chest.y > -1.3;
    if (!visible) return;                                                     // walking in/out of frame is fine
    if (p.who.key.startsWith("folk") || p.side) return;                     // extras and people walking in/out
    const who = `${id}:${p.who.key}`;
    if (Math.min(L.x, R.x) < -1.0 || Math.max(L.x, R.x) > 1.0) add(`${who} cut at side`, f);
    if (head.y > 0.97) add(`${who} head cut at top`, f);
    if (hips.y < -1.0 && chest.y < -0.55) add(`${who} cut through chest (bottom)`, f);
    if (i === 0 && P.length <= 2 && Math.abs(chest.x) > 0.45) add(`${who} off centre (${chest.x.toFixed(2)})`, f);
  });
}
for (const [k, fs] of Object.entries(issues)) if (!k.includes("off centre") || fs.length > 3) console.log(k.padEnd(42), fs.length, "frames", `${fs[0]}-${fs[fs.length - 1]}`);
console.log("checked", Math.ceil(TOTAL / 3), "frames,", Object.keys(issues).length, "issue groups", SHOTS.length, "shots");
