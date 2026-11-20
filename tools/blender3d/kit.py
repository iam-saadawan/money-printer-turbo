"""Another You 3D kit (Blender 5.x, run inside Blender).

Procedural, consistent cast + props + helpers. Characters face -Y at yaw 0; forward = (sin a, -cos a).
Rig: root(loc,yaw) > body(bob) > hips > leg_X(thigh rx) > knee_X(shin rx);  body > chest > arm_X(rx,rz) > elbow_X(rx);
chest > neck(head yaw/pitch).  Angles in radians.  Negative rx on a limb = swing forward.
"""
import math
import os

import bpy
from mathutils import Vector

SC = None
FPS = 24


# ------------------------------------------------------------------ scene
def new_scene(res=(1080, 1920), samples=32):
    global SC
    bpy.ops.wm.read_factory_settings(use_empty=True)
    SC = bpy.context.scene
    SC.render.fps = FPS
    SC.render.resolution_x, SC.render.resolution_y = res
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            SC.render.engine = eng
            break
        except TypeError:
            pass
    try:
        SC.eevee.taa_render_samples = samples
    except Exception:
        pass
    try:
        SC.view_settings.view_transform = "AgX"
        SC.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    return SC


def world(color=(0.02, 0.025, 0.05), strength=0.5):
    w = bpy.data.worlds.new("w")
    SC.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*color, 1)
    bg.inputs[1].default_value = strength


_MATS = {}


def mat(name, rgb, rough=0.6, emit=None, metal=0.0, alpha=None):
    key = (name, tuple(rgb), rough, str(emit), metal, alpha)
    if key in _MATS:
        return _MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit[0], 1)
        b.inputs["Emission Strength"].default_value = emit[1]
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    _MATS[key] = m
    return m


def img_mat(name, path, emit=1.0, rough=0.5):
    """Material showing an image (emissive, e.g. screens and signs)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.abspath(path))
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    if emit:
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit
    b.inputs["Roughness"].default_value = rough
    return m


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def _finish(o, m, parent, name):
    o.name = name
    if m:
        o.data.materials.append(m)
    o.parent = parent
    return o


def box(name, loc, size, m=None, bevel=0.015, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new("bv", "BEVEL")
        bv.width = bevel
        bv.segments = 2
    return _finish(o, m, parent, name)


def sphere(name, loc, r, m=None, scale=(1, 1, 1), parent=None, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.scale = scale
    smooth(o)
    return _finish(o, m, parent, name)


def cyl(name, loc, r, depth, m=None, parent=None, rot=(0, 0, 0), verts=24, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    smooth(o)
    return _finish(o, m, parent, name)


def plane(name, loc, size, m=None, rot=(math.radians(90), 0, 0), parent=None):
    """Vertical plane facing -Y by default (rot x=90)."""
    bpy.ops.mesh.primitive_plane_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, 1)
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, m, parent, name)


def empty(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    SC.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    return o


def light(kind, loc, energy, color=(1, 1, 1), size=0.2, rot=(0, 0, 0), spot=None, name="light"):
    d = bpy.data.lights.new(name, kind)
    d.energy = energy
    d.color = color
    if kind in ("POINT", "SPOT"):
        d.shadow_soft_size = size
    if kind == "AREA":
        d.size = size
    if kind == "SPOT" and spot:
        d.spot_size = spot
        d.spot_blend = 0.4
    o = bpy.data.objects.new(name, d)
    SC.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o


def key(obj, path, frame, value=None):
    if value is not None:
        setattr(obj, path, value)
    obj.keyframe_insert(path, frame=frame)


def camera(name, loc, target, lens=35, frame=1):
    c = bpy.data.cameras.new(name)
    c.lens = lens
    c.sensor_fit = "VERTICAL"
    c.sensor_height = 24
    c.clip_start = 0.02
    o = bpy.data.objects.new(name, c)
    SC.collection.objects.link(o)
    o.location = loc
    tgt = empty(name + "_tgt", target)
    con = o.constraints.new("TRACK_TO")
    con.target = tgt
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    SC.camera = o
    return o, tgt


def cam_move(cam, tgt, f0, f1, loc1=None, target1=None):
    """Smooth camera move from current pose (keyed at f0) to loc1/target1 at f1."""
    key(cam, "location", f0)
    key(tgt, "location", f0)
    if loc1:
        key(cam, "location", f1, Vector(loc1))
    if target1:
        key(tgt, "location", f1, Vector(target1))


# ------------------------------------------------------------------ text textures (PIL is not in Blender: use pre-made PNGs)
def tex(name):
    return os.path.join(os.environ.get("AY_TEX", "."), name)


# ------------------------------------------------------------------ characters
SKIN = (0.96, 0.96, 0.95)
CAST = {
    "you": dict(hair="messy", hair_rgb=(0.03, 0.03, 0.035), top=(0.09, 0.2, 0.55), top_kind="hoodie",
                pants=(0.13, 0.15, 0.22), shoes=(0.92, 0.92, 0.92)),
    "sam": dict(hair="curly", hair_rgb=(0.28, 0.16, 0.08), top=(0.2, 0.5, 0.25), top_kind="tshirt",
                pants=(0.35, 0.35, 0.38), shoes=(0.15, 0.15, 0.15), glasses=True),
    "driver": dict(hair="short", hair_rgb=(0.15, 0.15, 0.15), top=(0.22, 0.2, 0.18), top_kind="jacket",
                   pants=(0.1, 0.1, 0.12), shoes=(0.1, 0.1, 0.1), cap=(0.08, 0.08, 0.1)),
    "man": dict(hair="short", hair_rgb=(0.22, 0.22, 0.23), top=(0.2, 0.21, 0.23), top_kind="coat",
                pants=(0.08, 0.08, 0.09), shoes=(0.05, 0.05, 0.05)),
    "mira": dict(hair="long", hair_rgb=(0.1, 0.06, 0.04), top=(0.85, 0.58, 0.16), top_kind="sweater",
                 pants=(0.15, 0.15, 0.2), shoes=(0.3, 0.2, 0.15), scarf=(0.75, 0.06, 0.06)),
}


class Char:
    def __init__(self, cid, loc=(0, 0, 0), yaw=0.0):
        c = CAST[cid]
        self.cid = cid
        P = lambda n, rgb, r=0.7: mat(f"{cid}_{n}", rgb, r)
        skin, top, pants = mat("skin", SKIN, 0.45), P("top", c["top"], 0.85), P("pants", c["pants"], 0.85)
        dark = mat("ink", (0.02, 0.02, 0.025), 0.3)
        self.root = empty(cid, loc)
        self.root.rotation_euler = (0, 0, yaw)
        self.body = empty(cid + "_body", (0, 0, 0), self.root)
        b = self.body
        # hips + legs (hip height 0.86: thigh 0.43, shin 0.43)
        sphere("hips", (0, 0, 0.88), 0.16, pants, (1.0, 0.72, 0.6), b)
        self.leg, self.knee = {}, {}
        for side, sx in (("R", -1), ("L", 1)):
            lp = empty(f"{cid}_leg{side}", (0.095 * sx, 0, 0.86), b)
            cyl("thigh", (0, 0, -0.21), 0.068, 0.44, pants, lp)
            kp = empty(f"{cid}_knee{side}", (0, 0, -0.43), lp)
            sphere("kneeball", (0, 0, 0), 0.064, pants, parent=kp, seg=16)
            cyl("shin", (0, 0, -0.2), 0.058, 0.42, pants, kp)
            box("shoe", (0, -0.05, -0.41), (0.12, 0.25, 0.08), P("shoe", c["shoes"], 0.5), 0.03, kp)
            self.leg[side], self.knee[side] = lp, kp
        # chest / torso
        self.chest = empty(cid + "_chest", (0, 0, 0.95), b)
        ch = self.chest
        kind = c["top_kind"]
        sphere("torso", (0, 0, 0.19), 0.27, top, (0.64, 0.46, 0.95), ch)
        if kind == "hoodie":
            sphere("hood", (0, 0.08, 0.42), 0.16, top, (1.1, 0.7, 0.42), ch)
            cyl("string", (-0.045, -0.125, 0.3), 0.007, 0.15, mat("str", (0.9, 0.9, 0.9)), ch)
            cyl("string", (0.045, -0.125, 0.3), 0.007, 0.15, mat("str", (0.9, 0.9, 0.9)), ch)
            box("pocket", (0, -0.12, 0.06), (0.2, 0.03, 0.09), top, 0.02, ch)
        if kind == "coat":
            cyl("coat_skirt", (0, 0, -0.15), 0.2, 0.42, top, ch, r2=0.165)
            box("lapel", (0, -0.13, 0.3), (0.12, 0.03, 0.2), mat("shirt", (0.85, 0.85, 0.85)), 0.01, ch)
        if kind == "jacket":
            box("zip", (0, -0.125, 0.18), (0.02, 0.02, 0.4), mat("zip", (0.6, 0.6, 0.6)), 0, ch)
        if c.get("scarf"):
            cyl("scarf", (0, 0, 0.44), 0.13, 0.09, P("scarf", c["scarf"], 0.9), ch)
            box("scarf_tail", (0.05, -0.13, 0.25), (0.07, 0.035, 0.26), P("scarf", c["scarf"], 0.9), 0.02, ch)
        # arms: upper 0.3 + fore 0.28
        sleeve_fore = top if kind in ("hoodie", "coat", "jacket", "sweater") else skin
        self.arm, self.elbow, self.hand = {}, {}, {}
        for side, sx in (("R", -1), ("L", 1)):
            ap = empty(f"{cid}_arm{side}", (0.2 * sx, 0, 0.36), ch)
            sphere("shoulder", (0, 0, 0), 0.056, top, parent=ap, seg=16)
            cyl("upper", (0, 0, -0.15), 0.05, 0.3, top, ap)
            ep = empty(f"{cid}_elbow{side}", (0, 0, -0.3), ap)
            sphere("elbowball", (0, 0, 0), 0.049, sleeve_fore, parent=ep, seg=16)
            cyl("fore", (0, 0, -0.13), 0.044, 0.26, sleeve_fore, ep)
            hp = empty(f"{cid}_hand{side}", (0, 0, -0.3), ep)
            sphere("hand", (0, 0, 0), 0.055, skin, (1, 0.8, 1.15), hp, seg=20)
            self.arm[side], self.elbow[side], self.hand[side] = ap, ep, hp
        # head
        self.neck = empty(cid + "_neck", (0, 0, 0.47), ch)
        n = self.neck
        cyl("neckcyl", (0, 0, 0.03), 0.06, 0.08, skin, n)
        sphere("head", (0, 0, 0.21), 0.21, skin, (1, 0.95, 1.03), n)
        for ex in (-0.07, 0.07):
            sphere("eye", (ex, -0.188, 0.23), 0.027, dark, (1, 0.6, 1.35), n, seg=16)
        self.mouth = box("mouth", (0, -0.198, 0.13), (0.07, 0.01, 0.012), dark, 0.004, n)
        hr = P("hair", c["hair_rgb"], 0.8)
        h = c["hair"]
        if h == "messy":
            for i, (x, y, z, r) in enumerate([(0, 0.02, 0.36, 0.13), (-0.1, 0.0, 0.33, 0.1), (0.1, 0.0, 0.33, 0.1),
                                              (0, -0.1, 0.33, 0.09), (-0.08, -0.11, 0.31, 0.07), (0.08, -0.1, 0.32, 0.07),
                                              (0, 0.12, 0.3, 0.12), (-0.14, 0.06, 0.27, 0.08), (0.14, 0.06, 0.27, 0.08)]):
                sphere("hair", (x * 1.06, y * 1.06, z + 0.03), r * 1.08, hr, (1, 1, 0.75), n, seg=16)
        elif h == "curly":
            import random
            rnd = random.Random(3)
            for i in range(26):
                a = rnd.uniform(0, 2 * math.pi)
                el = rnd.uniform(0.1, 1.2)
                rr = 0.2
                x, y, z = rr * math.cos(a) * math.cos(el), rr * math.sin(a) * math.cos(el) + 0.02, 0.2 + rr * math.sin(el)
                if y < -0.12 and z < 0.3:
                    continue
                sphere("curl", (x * 1.06, y * 1.06, z + 0.05), 0.068, hr, parent=n, seg=12)
        elif h == "short":
            sphere("hair", (0, 0.025, 0.29), 0.215, hr, (1.03, 1.0, 0.72), n)
        elif h == "long":
            sphere("hair", (0, 0.025, 0.29), 0.222, hr, (1.04, 1.02, 0.76), n)
            box("hairback", (0, 0.1, 0.1), (0.42, 0.14, 0.4), hr, 0.06, n)
        if c.get("glasses"):
            gm = mat("glass_frame", (0.02, 0.02, 0.02), 0.3)
            for ex in (-0.075, 0.075):
                bpy.ops.mesh.primitive_torus_add(location=(ex, -0.2, 0.23), rotation=(math.radians(90), 0, 0),
                                                 major_radius=0.052, minor_radius=0.008)
                _finish(bpy.context.object, gm, n, "lens")
            box("bridge", (0, -0.205, 0.235), (0.05, 0.01, 0.01), gm, 0, n)
        if c.get("cap"):
            cm = P("cap", c["cap"], 0.7)
            sphere("cap", (0, 0.0, 0.31), 0.222, cm, (1.02, 1.02, 0.62), n)
            box("brim", (0, -0.215, 0.31), (0.27, 0.17, 0.02), cm, 0.01, n)
        self.pose("stand")

    # ---- poses
    POSES = {
        "stand": dict(legR=0, legL=0, kneeR=0, kneeL=0, armR=(0.0, 0.07), armL=(0.0, -0.07), elbR=-0.15, elbL=-0.15),
        "sit": dict(legR=-1.5, legL=-1.5, kneeR=1.5, kneeL=1.5, armR=(-0.35, 0.1), armL=(-0.35, -0.1), elbR=-0.9, elbL=-0.9),
        "phone_look": dict(armR=(-0.2, 0.08), elbR=-1.75),          # phone in right hand, looking at it
        "phone_ear": dict(armR=(-0.75, 0.5), elbR=-2.6),           # phone to right ear
        "reach_fwd": dict(armR=(-1.25, 0.05), elbR=-0.15),
        "both_look": dict(armR=(-0.2, 0.15), elbR=-1.75, armL=(-0.2, -0.15), elbL=-1.75),
        "key_door": dict(armR=(-1.0, 0.0), elbR=-0.5),
        "curtain": dict(armL=(-1.4, -0.2), elbL=-0.3),
        "press": dict(armR=(-1.3, 0.0), elbR=-0.2),
        "arms_down": dict(armR=(0.0, 0.07), armL=(0.0, -0.07), elbR=-0.15, elbL=-0.15),
    }

    def pose(self, name, frame=None, **over):
        p = dict(self.POSES[name])
        p.update(over)
        self.set(frame, **p)

    def set(self, frame=None, **p):
        m = {"legR": (self.leg["R"], 0), "legL": (self.leg["L"], 0), "kneeR": (self.knee["R"], 0),
             "kneeL": (self.knee["L"], 0), "elbR": (self.elbow["R"], 0), "elbL": (self.elbow["L"], 0)}
        for k, v in p.items():
            if k in m:
                o = m[k][0]
                o.rotation_euler = (v, 0, 0)
                if frame is not None:
                    o.keyframe_insert("rotation_euler", frame=frame)
            elif k in ("armR", "armL"):
                o = self.arm[k[-1]]
                o.rotation_euler = (v[0], v[1], 0)   # (forward swing, abduction: + = outward for R, - for L)
                if frame is not None:
                    o.keyframe_insert("rotation_euler", frame=frame)
            elif k == "head":       # (pitch, yaw)
                self.neck.rotation_euler = (v[0], 0, v[1])
                if frame is not None:
                    self.neck.keyframe_insert("rotation_euler", frame=frame)
            elif k == "lean":
                self.chest.rotation_euler = (v, 0, 0)
                if frame is not None:
                    self.chest.keyframe_insert("rotation_euler", frame=frame)

    def place(self, frame, loc=None, yaw=None, z=None):
        if loc is not None:
            self.root.location = (loc[0], loc[1], self.root.location.z if z is None else z)
        elif z is not None:
            self.root.location.z = z
        if yaw is not None:
            self.root.rotation_euler = (0, 0, yaw)
        self.root.keyframe_insert("location", frame=frame)
        self.root.keyframe_insert("rotation_euler", frame=frame)

    def sit_at(self, frame, loc, yaw, seat_h=0.45):
        """Sitting: hips at seat height (hip pivot 0.86 above root)."""
        self.pose("sit", frame)
        self.place(frame, loc, yaw, z=seat_h - 0.86 + 0.07)

    def walk(self, f0, f1, path, step=0.62, arms=True, face=True, zf=None):
        """Walk along polyline path [(x,y),...] between frames f0..f1 (root z stays)."""
        pts = [Vector((p[0], p[1])) for p in path]
        segl = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
        total = sum(segl) or 1e-6
        for f in range(f0, f1 + 1, 2) if f1 > f0 else [f0]:
            t = (f - f0) / max(1, f1 - f0)
            d = t * total
            acc = 0
            for i, L in enumerate(segl):
                if acc + L >= d or i == len(segl) - 1:
                    u = (d - acc) / L if L else 0
                    pos = pts[i].lerp(pts[i + 1], min(1, u))
                    dirv = pts[i + 1] - pts[i]
                    break
                acc += L
            yaw = math.atan2(dirv.x, -dirv.y) if face else self.root.rotation_euler.z
            self.root.location = (pos.x, pos.y, zf(t) if zf else self.root.location.z)
            self.root.rotation_euler = (0, 0, yaw)
            self.root.keyframe_insert("location", frame=f)
            self.root.keyframe_insert("rotation_euler", frame=f)
            ph = d / step * math.pi
            s = math.sin(ph)
            amp = 0.45 * min(1, t * 6, (1 - t) * 6)
            self.set(f, legR=amp * s, legL=-amp * s, kneeR=max(0, -s) * amp * 1.3, kneeL=max(0, s) * amp * 1.3)
            if arms:
                self.set(f, armL=(amp * 0.7 * s, -0.07), armR=(-amp * 0.7 * s, 0.07))
            self.body.location = (0, 0, 0.025 * abs(math.cos(ph)) * min(1, amp * 3))
            self.body.keyframe_insert("location", frame=f)

    def turn(self, f0, f1, yaw0, yaw1):
        for f in range(f0, f1 + 1, 2):
            t = (f - f0) / max(1, f1 - f0)
            s = t * t * (3 - 2 * t)
            self.root.rotation_euler = (0, 0, yaw0 + (yaw1 - yaw0) * s)
            self.root.keyframe_insert("rotation_euler", frame=f)
            st = math.sin(t * math.pi * 2) * 0.18
            self.set(f, legR=st, legL=-st)
        self.set(f1, legR=0, legL=0)

    def idle(self, f0, f1, amt=0.006):
        """Breathing so still characters never look frozen."""
        for f in range(f0, f1 + 1, 12):
            self.body.location = (0, 0, amt * math.sin(f * 0.25))
            self.body.keyframe_insert("location", frame=f)


def yaw_to(src, dst):
    """Yaw so a character at src faces dst."""
    return math.atan2(dst[0] - src[0], -(dst[1] - src[1]))


# ------------------------------------------------------------------ props
def phone(parent=None, loc=(0, 0, 0), rot=(0, 0, 0), screen=None, name="phone"):
    """Phone 0.075 x 0.15; screen faces local -Y."""
    p = empty(name, loc, parent, rot)
    box(name + "_case", (0, 0, 0), (0.078, 0.012, 0.155), mat("case", (0.03, 0.03, 0.035), 0.4), 0.004, p)
    if screen:
        plane(name + "_screen", (0, -0.0065, 0), (0.07, 0.146), img_mat(name + "_scr", screen, 1.6), parent=p)
    else:
        plane(name + "_screen", (0, -0.0065, 0), (0.07, 0.146), mat("scr_off", (0.01, 0.01, 0.015), 0.15), parent=p)
    return p


def set_screen(phone_obj, path, name):
    scr = [c for c in phone_obj.children if c.name.startswith(phone_obj.name + "_screen")][0]
    scr.data.materials.clear()
    scr.data.materials.append(img_mat(name, path, 1.6))


def door(loc, yaw=0.0, w=0.9, h=2.05, rgb=(0.45, 0.25, 0.12), number_tex=None, name="door", frame_rgb=(0.92, 0.9, 0.85),
         hinge_left=True):
    """Door in the XZ plane (faces -Y at yaw 0). Returns hinge empty; rotate hinge z to open (+ = swings away (+Y))."""
    base = empty(name + "_base", loc, rot=(0, 0, yaw))
    trim = mat("trim", frame_rgb, 0.5)
    for n, x, ww in (("fl", -w / 2 - 0.04, 0.08), ("fr", w / 2 + 0.04, 0.08)):
        box(name + n, (x, -0.01, h / 2), (ww, 0.1, h + 0.04), trim, 0.01, base)
    box(name + "ft", (0, -0.01, h + 0.04), (w + 0.16, 0.1, 0.08), trim, 0.01, base)
    hx = -w / 2 if hinge_left else w / 2
    hinge = empty(name + "_hinge", (hx, 0, 0), base)
    sgn = 1 if hinge_left else -1
    dm = mat(name + "_m", rgb, 0.45)
    box(name + "_panel", (sgn * w / 2, 0, h / 2), (w - 0.02, 0.05, h - 0.02), dm, 0.01, hinge)
    for dz in (0.55, 1.45):
        box(name + "_inset", (sgn * w / 2, -0.03, dz), (w - 0.25, 0.012, 0.6), dm, 0.02, hinge)
    sphere(name + "_knob", (sgn * (w - 0.1), -0.06, 1.0), 0.035, mat("brass", (0.85, 0.65, 0.25), 0.25, metal=1.0),
           parent=hinge, seg=16)
    sphere(name + "_knob2", (sgn * (w - 0.1), 0.06, 1.0), 0.035, mat("brass", (0.85, 0.65, 0.25), 0.25, metal=1.0),
           parent=hinge, seg=16)
    if number_tex:
        plane(name + "_num", (sgn * w / 2, -0.032, 1.65), (0.16, 0.1), img_mat(name + "_n", number_tex, 0.3), parent=hinge)
    return hinge


def taxi(loc, yaw=0.0, name="taxi"):
    """Simple taxi; front points to local -Y at yaw 0. Returns root empty and a dict of parts."""
    r = empty(name, loc, rot=(0, 0, yaw))
    paint = mat("taxi_paint", (0.95, 0.72, 0.05), 0.25, metal=0.2)
    glass = mat("glass_dark", (0.02, 0.025, 0.03), 0.05)
    black = mat("tyre", (0.02, 0.02, 0.02), 0.8)
    box("body", (0, 0, 0.55), (1.8, 4.4, 0.6), paint, 0.12, r)
    box("cabin", (0, 0.25, 1.08), (1.6, 2.3, 0.55), paint, 0.15, r)
    box("win_side_l", (-0.805, 0.25, 1.1), (0.02, 2.0, 0.42), glass, 0.02, r)
    box("win_side_r", (0.805, 0.25, 1.1), (0.02, 2.0, 0.42), glass, 0.02, r)
    box("win_front", (0, -0.92, 1.08), (1.45, 0.05, 0.42), glass, 0.02, r, rot=(math.radians(-25), 0, 0))
    box("win_back", (0, 1.42, 1.08), (1.45, 0.05, 0.42), glass, 0.02, r, rot=(math.radians(25), 0, 0))
    box("sign", (0, 0.2, 1.45), (0.45, 0.14, 0.14), mat("taxisign", (1, 0.95, 0.7), 0.3, emit=((1, 0.85, 0.4), 3.0)), 0.02, r)
    for x in (-0.85, 0.85):
        for y in (-1.35, 1.35):
            cyl("wheel", (x, y, 0.33), 0.33, 0.24, black, r, rot=(0, math.radians(90), 0))
            cyl("hub", (x * 1.07, y, 0.33), 0.16, 0.02, mat("hub", (0.7, 0.7, 0.72), 0.3, metal=1), r, rot=(0, math.radians(90), 0))
    for x in (-0.6, 0.6):
        box("headlight", (x, -2.21, 0.62), (0.3, 0.02, 0.12), mat("hl", (1, 1, 0.9), 0.2, emit=((1, 0.95, 0.8), 6)), 0.01, r)
        box("taillight", (x, 2.21, 0.62), (0.3, 0.02, 0.1), mat("tl", (0.9, 0.05, 0.05), 0.2, emit=((1, 0.05, 0.03), 4)), 0.01, r)
    box("line", (0, 0, 0.62), (1.82, 4.2, 0.06), mat("check", (0.05, 0.05, 0.05), 0.5), 0, r)
    return r


def van(loc, yaw=0.0, name="van", lights_on=True):
    r = empty(name, loc, rot=(0, 0, yaw))
    paint = mat("van_paint", (0.38, 0.4, 0.42), 0.35, metal=0.3)
    glass = mat("glass_dark", (0.02, 0.025, 0.03), 0.05)
    black = mat("tyre", (0.02, 0.02, 0.02), 0.8)
    box("body", (0, 0.3, 1.15), (1.95, 4.2, 1.7), paint, 0.12, r)
    box("nose", (0, -2.05, 0.75), (1.95, 0.7, 0.9), paint, 0.15, r)
    box("windscreen", (0, -1.78, 1.45), (1.7, 0.05, 0.6), glass, 0.02, r, rot=(math.radians(-20), 0, 0))
    box("side_win", (-0.98, -1.25, 1.45), (0.02, 0.8, 0.5), glass, 0.02, r)
    for x in (-0.88, 0.88):
        for y in (-1.5, 1.6):
            cyl("wheel", (x, y, 0.36), 0.36, 0.26, black, r, rot=(0, math.radians(90), 0))
    hls = []
    for x in (-0.65, 0.65):
        hls.append(box("headlight", (x, -2.41, 0.85), (0.32, 0.02, 0.14),
                       mat("van_hl", (1, 1, 0.9), 0.2, emit=((1, 0.95, 0.8), 8 if lights_on else 0)), 0.01, r))
    return r


def streetlight(loc, h=4.5, name="streetlight", energy=600):
    pole = mat("pole", (0.15, 0.16, 0.17), 0.4, metal=0.6)
    cyl(name + "_pole", (loc[0], loc[1], h / 2), 0.06, h, pole)
    box(name + "_arm", (loc[0], loc[1] - 0.4, h), (0.08, 0.8, 0.06), pole, 0.01)
    box(name + "_head", (loc[0], loc[1] - 0.8, h - 0.05), (0.3, 0.45, 0.1),
        mat("lamp_head", (1, 0.85, 0.6), 0.3, emit=((1, 0.75, 0.45), 6)), 0.02)
    return light("SPOT", (loc[0], loc[1] - 0.8, h - 0.15), energy, (1, 0.72, 0.42), 0.3, spot=math.radians(110),
                 name=name + "_l")


def ground_wet(size=(60, 60), rgb=(0.05, 0.05, 0.06)):
    return box("road", (0, 0, -0.05), (size[0], size[1], 0.1), mat("asphalt_wet", rgb, 0.12), 0)


def render(out_dir, f0, f1, still=None):
    os.makedirs(out_dir, exist_ok=True)
    SC.frame_start, SC.frame_end = f0, f1
    SC.render.image_settings.file_format = "PNG"
    if still is not None:
        SC.frame_set(still)
        SC.render.filepath = os.path.join(out_dir, f"still_{still:04d}.png")
        bpy.ops.render.render(write_still=True)
    else:
        SC.render.filepath = os.path.join(out_dir, "f_")
        bpy.ops.render.render(animation=True)
