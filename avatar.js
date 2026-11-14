import * as T from "./assets/three/three.module.min.js";
import { GLTFLoader } from "./assets/three/loaders/GLTFLoader.js";

// Loads the avatar exported from assets/ogp-avatar.glb, lowers its T-pose arms,
// and returns a figure that stands on y = 0 and faces +z.
// The figure has no animation clips, so it jogs, waves, and looks around by turning its bones.
const source = new URL("./assets/ogp-avatar.glb", import.meta.url).href;
const side = new T.Vector3(1, 0, 0);    // The figure's left
const up = new T.Vector3(0, 1, 0);
const forward = new T.Vector3(0, 0, 1); // The way the figure faces
const WAVE_TWIST = 1.45; // Forearm twist that turns the waving palm toward the viewer
const from = new T.Vector3();
const to = new T.Vector3();
const turn = new T.Quaternion();
const world = new T.Quaternion();
const parentWorld = new T.Quaternion();

function bones(model) {
  const found = {};
  model.traverse((part) => { if (part.isBone) found[part.name] = part; });
  return found;
}

// Turns a bone so the direction to its child points along `direction` in model space.
function aim(bone, child, direction) {
  child.getWorldPosition(from).sub(bone.getWorldPosition(to)).normalize();
  turn.setFromUnitVectors(from, to.copy(direction).normalize());
  bone.getWorldQuaternion(world).premultiply(turn);
  bone.parent.getWorldQuaternion(parentWorld).invert();
  bone.quaternion.copy(parentWorld.multiply(world));
  bone.updateMatrixWorld(true);
}

// A joint turns its bone about one model-space axis, written in the parent's rest frame.
// About `side`, positive angles move a limb that hangs down toward the figure's back.
// One bone takes one joint at a time; the last `set` wins.
function joint(bone, axis = side) {
  if (!bone) return { set() {} };
  const rest = bone.quaternion.clone();
  const local = axis.clone().applyQuaternion(bone.parent.getWorldQuaternion(new T.Quaternion()).invert());
  const swing = new T.Quaternion();
  return {
    set(angle) {
      bone.quaternion.copy(swing.setFromAxisAngle(local, angle).multiply(rest));
    }
  };
}

// A rotator combines several model-space turns, applied in order in the parent's rest frame,
// with an optional twist about the bone's own length.
function rotator(bone) {
  if (!bone) return { set() {} };
  const rest = bone.quaternion.clone();
  const parentRest = bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
  const axes = new Map([side, up, forward].map((axis) => [axis, axis.clone().applyQuaternion(parentRest)]));
  const along = (bone.children.find((child) => child.isBone)?.position.clone() ?? up.clone()).normalize();
  const total = new T.Quaternion();
  const step = new T.Quaternion();
  return {
    set(turns, twist = 0) {
      total.identity();
      for (const [axis, angle] of turns) total.premultiply(step.setFromAxisAngle(axes.get(axis), angle));
      bone.quaternion.copy(total).multiply(rest).multiply(step.setFromAxisAngle(along, twist));
    }
  };
}

export async function loadAvatar(height = 1.8) {
  const loader = new GLTFLoader();
  // Retry once: a dropped connection should not cost the visitor the avatar.
  const { scene: model } = await loader.loadAsync(source).catch(() => loader.loadAsync(source));
  model.updateMatrixWorld(true);
  const rig = bones(model);
  for (const [name, x] of [["Left", 1], ["Right", -1]]) {
    const arm = rig[`${name}Arm`];
    const forearm = rig[`${name}ForeArm`];
    const hand = rig[`${name}Hand`];
    if (arm && forearm) aim(arm, forearm, new T.Vector3(x * .2, -1, -.02));
    if (forearm && hand) aim(forearm, hand, new T.Vector3(x * .1, -1, .17));
  }
  model.traverse((part) => {
    if (part.isSkinnedMesh) part.frustumCulled = false;
  });

  const original = new T.Box3().setFromObject(model, true);
  const size = original.getSize(new T.Vector3()).y;
  if (!Number.isFinite(size) || size <= 0) throw new Error("Empty avatar geometry");
  model.scale.multiplyScalar(height / size);
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model, true);
  const center = bounds.getCenter(new T.Vector3());
  model.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
  const restY = model.position.y;
  const figure = new T.Group();
  figure.add(model);

  const legs = ["Left", "Right"].map((name) => ({
    hip: joint(rig[`${name}UpLeg`]),
    knee: joint(rig[`${name}Leg`])
  }));
  const arms = ["Left", "Right"].map((name) => ({
    shoulder: joint(rig[`${name}Arm`]),
    elbow: joint(rig[`${name}ForeArm`])
  }));
  const spine = joint(rig.Spine1);
  const pelvis = rotator(rig.Hips);
  const chest = joint(rig.Spine2, up);
  const upperArm = rotator(rig.RightArm);
  const forearm = rotator(rig.RightForeArm);
  const leftUpperArm = rotator(rig.LeftArm);
  const leftForearm = rotator(rig.LeftForeArm);
  const yaw = joint(rig.Neck, up);
  const nod = joint(rig.Head, side);
  const gait = 1.8 / height; // Taller figures take longer strides.
  const scale = height / 1.8;
  let stride = 0;
  let effort = 0;

  return {
    figure,
    // A walk cycle for `distance` units travelled over `time` seconds. One stride (two steps)
    // covers about 0.95 body heights. Each leg's phase runs from 0 (passing under the body
    // while swinging forward) through π/2 (planted in front) to 3π/2 (pushing off behind).
    walk(distance, time, reducedMotion) {
      const speed = distance / Math.max(time, .001);
      const goal = reducedMotion ? 0 : Math.min(1, speed / 1.6);
      effort += (goal - effort) * (time ? 1 - Math.exp(-time * 10) : 1);
      if (effort < .002) effort = 0;
      stride += distance * 3.67 * gait;
      legs.forEach(({ hip, knee }, i) => {
        const phase = stride + i * Math.PI;
        const swing = Math.max(0, Math.cos(phase));
        hip.set(-Math.sin(phase) * .46 * effort);
        knee.set((.06 + Math.pow(swing, 1.4) * .72) * effort);
      });
      arms.forEach(({ shoulder, elbow }, i) => {
        const phase = stride + i * Math.PI;
        shoulder.set(Math.sin(phase) * .3 * effort);
        elbow.set(-(.18 + Math.max(0, -Math.sin(phase)) * .3) * effort);
      });
      // The pelvis turns with the forward leg and dips on the swinging side; the chest turns back.
      pelvis.set([[up, -Math.sin(stride) * .09 * effort], [forward, Math.cos(stride) * .035 * effort]]);
      chest.set(Math.sin(stride) * .13 * effort);
      spine.set(.03 * effort); // About the side axis, positive tips the chest forward.
      model.position.y = restY + (Math.cos(stride * 2) - 1) * .018 * scale * effort;
    },
    // Upper-body gestures for the welcome page; each amount runs from 0 (rest) to 1.
    // wave: the right upper arm swings forward and out, the forearm stands up, palm out, and rocks.
    // point: -1 points an arm out toward the viewer's left, +1 toward the viewer's right.
    // lookLeft turns the head toward the figure's left; lookDown tips it down (radians).
    pose({ wave = 0, point = 0, time = 0, lookLeft = 0, lookDown = 0 }) {
      const rock = Math.sin(time * 12.5) * .3;
      // Facing the viewer, the figure's right arm is on the viewer's left.
      const pointRight = Math.max(0, -point);
      const pointLeft = Math.max(0, point);
      upperArm.set([[side, -.35 * wave - .4 * pointRight], [forward, -1.25 * wave - 1.4 * pointRight]]);
      forearm.set([[forward, (-1.5 + rock) * wave - .2 * pointRight]], WAVE_TWIST * wave);
      leftUpperArm.set([[side, -.4 * pointLeft], [forward, 1.4 * pointLeft]]);
      leftForearm.set([[forward, .2 * pointLeft]]);
      yaw.set(lookLeft);
      nod.set(lookDown);
    }
  };
}
