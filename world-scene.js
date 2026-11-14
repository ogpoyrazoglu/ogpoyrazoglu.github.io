import * as T from "./assets/three/three.module.min.js";

export { T };
export const trail = [
  [0, 5.2], [-3.65, 4.3], [-3.65, -4.7], [-5.8, -4.7], [-3.65, -4.7],
  [-3.65, .9], [0, -.65], [3.1, -3.9], [3.1, 2.05]
];

const stops = [
  { point: 3, facing: 0, marker: [-7.35, 3.82, -7] },
  { point: 5, facing: Math.PI / 2, marker: [-7, 3.3, .25] },
  { point: 7, facing: -Math.PI / 2, marker: [6.4, 3.37, -4.35] },
  { point: 8, facing: -Math.PI / 2, marker: [6.8, 2.9, 1.8] }
];
const roomWidth = 22;
const roomDepth = 15;
const ink = 0x263943;
const cream = 0xf1e4c9;
const teal = 0x356d71;
const blue = 0x5e9bab;
const yellow = 0xe2ad58;
const rust = 0xda6d4b;
const materials = new Map();
const boxGeometry = new T.BoxGeometry();
const cylinderGeometry = new T.CylinderGeometry(.5, .5, 1, 20);
const sphereGeometry = new T.SphereGeometry(1, 12, 9);

const obstacles = [
  [-9.3, -4.9, -6.9, -5.6],  // Whiteboard cabinet
  [-9.1, -4.6, -.45, 2.2],  // Boat bench
  [4.4, 8.7, -5.75, -2.9],   // Drone bench
  [5.1, 8.8, .05, 3.8],     // Robots and test course
  [8.7, 10.6, -7.25, -5.8], // Storage rack
  [-10.8, -9.45, 3.3, 7.1]  // Tool cabinets
];

const clearance = .39;
export function canWalk(x, z) {
  return Math.abs(x) <= roomWidth / 2 - clearance && Math.abs(z) <= roomDepth / 2 - clearance &&
    !obstacles.some(([left, right, back, front]) =>
      x > left - clearance && x < right + clearance && z > back - clearance && z < front + clearance);
}

function clearSegment(from, to) {
  const [x, z] = from;
  const dx = to[0] - x;
  const dz = to[1] - z;
  const samples = Math.ceil(Math.hypot(dx, dz) / .12);
  for (let i = 1; i <= samples; i++) {
    if (!canWalk(x + dx * i / samples, z + dz * i / samples)) return false;
  }
  return true;
}

export function routeTo(from, to) {
  if (clearSegment(from, to)) return [to];
  const gap = clearance + .14;
  // Visible corners give the shortest collision-free route around the benches.
  const corners = obstacles.flatMap(([left, right, back, front]) => [
    [left - gap, back - gap], [left - gap, front + gap],
    [right + gap, back - gap], [right + gap, front + gap]
  ]).filter(([x, z]) => canWalk(x, z));
  const nodes = [from, to, ...corners];
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const remaining = new Set(nodes.keys());
  costs[0] = 0;
  while (remaining.size) {
    let current = -1;
    for (const index of remaining) {
      if (costs[index] < (costs[current] ?? Infinity)) current = index;
    }
    if (current < 0) return [];
    if (current === 1) {
      const path = [];
      for (let index = 1; index !== 0; index = previous[index]) path.unshift(nodes[index]);
      return path;
    }
    remaining.delete(current);
    for (const index of remaining) {
      const cost = costs[current] + Math.hypot(nodes[index][0] - nodes[current][0], nodes[index][1] - nodes[current][1]);
      if (cost < costs[index] && clearSegment(nodes[current], nodes[index])) {
        costs[index] = cost;
        previous[index] = current;
      }
    }
  }
  return [];
}

function mesh(parent, geometry, color, x, y, z, sx, sy, sz) {
  if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .83 }));
  const part = new T.Mesh(geometry, materials.get(color));
  part.position.set(x, y, z);
  part.scale.set(sx, sy, sz);
  parent.add(part);
  return part;
}

const box = (parent, color, x, y, z, w, h, d) => mesh(parent, boxGeometry, color, x, y, z, w, h, d);
const cylinder = (parent, color, x, y, z, w, h) => mesh(parent, cylinderGeometry, color, x, y, z, w, h, w);
const round = (parent, color, x, y, z, w, h, d) => mesh(parent, sphereGeometry, color, x, y, z, w, h, d);

function group(parent, x, y, z) {
  const object = new T.Group();
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function panel(parent, x, y, z, w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.round(768 * h / w);
  draw(canvas.getContext("2d"), canvas.width, canvas.height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const plane = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: texture }));
  plane.position.set(x, y, z);
  parent.add(plane);
  return plane;
}

function label(parent, text, x, y, z, w, h, color = "#324951") {
  return panel(parent, x, y, z, w, h, (ctx, width, height) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f5efe0";
    ctx.font = `600 ${height * .48}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2 + 2, width * .9);
  });
}

function whiteboard(scene) {
  box(scene, ink, -7.1, 2.63, -7.19, 6.5, 2.62, .15);
  panel(scene, -7.1, 2.63, -7.101, 6.26, 2.4, (ctx, width, height) => {
    ctx.fillStyle = "#f5f2e7";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#245d62";
    ctx.font = "italic 600 42px Georgia";
    ctx.fillText("Motion planning", 42, 62);
    ctx.strokeStyle = "#64a39a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(45, 76);
    ctx.quadraticCurveTo(184, 70, 347, 77);
    ctx.stroke();
    ctx.strokeStyle = "#b2bfc0";
    ctx.strokeRect(65, 116, 378, 132);
    ctx.fillStyle = "#83a6a4";
    ctx.fillRect(192, 116, 52, 77);
    ctx.fillRect(308, 186, 45, 62);
    for (const [i, color] of ["#376d85", "#cc7556", "#76a99f", "#879c8f"].entries()) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(87, 223);
      ctx.bezierCurveTo(167, 249 - i * 18, 270, 177 + i * 6, 404, 140 + i * 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#294e5c";
    ctx.font = "italic 27px Georgia";
    ctx.fillText("sample paths", 490, 131);
    ctx.fillText("check clearance", 490, 174);
    ctx.fillText("apply & replan", 490, 217);
    ctx.fillStyle = "#eac37d";
    ctx.fillRect(677, 42, 49, 48);
  });
  box(scene, 0x6d898d, -7.1, 1.28, -7, 6.4, .08, .29);
  box(scene, teal, -6.14, 1.349, -6.99, .36, .06, .06).rotation.y = -.13;
  box(scene, rust, -6.6, 1.349, -6.99, .31, .06, .05);
  cabinet(scene, -7.1, -6.35, 4.33, .81, 1.05, 0x688b91);
}

function cabinet(scene, x, z, w, h, d, color) {
  box(scene, ink, x, .07, z, w - .14, .14, d - .15);
  box(scene, color, x, h / 2 + .08, z, w, h, d);
  box(scene, 0xbc9b71, x, h + .08, z, w + .12, .08, d + .08);
  for (const offset of [-.3, 0, .3]) {
    box(scene, ink, x, h * (.46 + offset) + .15, z + d / 2 + .012, w - .21, .026, .024);
    box(scene, cream, x, h * (.46 + offset) + .24, z + d / 2 + .032, Math.min(.44, w / 2), .043, .06);
  }
}

function workbench(scene, x, z, w, d, tag, color) {
  const bench = group(scene, x, 0, z);
  box(bench, 0xc6aa83, 0, 1.075, 0, w, .17, d);
  box(bench, ink, 0, .39, 0, w - .18, .11, d - .18);
  box(bench, color, 0, .89, 0, w - .14, .19, d - .08);
  for (const dx of [-w / 2 + .16, w / 2 - .16]) {
    for (const dz of [-d / 2 + .15, d / 2 - .15]) box(bench, ink, dx, .51, dz, .13, 1.02, .13);
  }
  label(bench, tag, .38, .89, d / 2 + .006, 1.7, .2);
  return bench;
}

function crate(parent, color, x, y, z, w, h, d) {
  box(parent, color, x, y + h / 2, z, w, h, d);
  box(parent, ink, x, y + h * .75, z + d / 2 + .005, w * .35, .05, .015);
}

function boat(scene) {
  const vessel = group(scene, -6.86, 1.21, .87);
  vessel.rotation.y = Math.PI / 2;
  const hull = new T.Shape();
  hull.moveTo(-.62, 1.63);
  hull.lineTo(-.68, -.76);
  hull.quadraticCurveTo(-.52, -1.45, 0, -1.91);
  hull.quadraticCurveTo(.52, -1.45, .68, -.76);
  hull.lineTo(.62, 1.63);
  hull.closePath();
  const geometry = new T.ExtrudeGeometry(hull, { depth: .28, bevelEnabled: true, bevelSize: .09, bevelThickness: .06, bevelSegments: 1 });
  geometry.rotateX(Math.PI / 2);
  mesh(vessel, geometry, 0xf0e1bc, 0, .44, 0, 1, 1, 1);
  box(vessel, ink, 0, .055, .92, 1.22, .11, .18);
  box(vessel, ink, 0, .055, -.82, 1.22, .11, .18);
  box(vessel, 0x396f88, 0, .51, -.12, .89, .23, 1.21);
  box(vessel, 0x9cc8ce, 0, .55, -.74, .76, .12, .055);
  box(vessel, rust, 0, .665, -.04, .81, .11, .99);
  cylinder(vessel, ink, 0, .91, .14, .037, .4);
  cylinder(vessel, cream, 0, 1.1, .14, .24, .08);
  box(vessel, ink, -.31, .28, 1.7, .25, .26, .15);
  box(vessel, ink, .31, .28, 1.7, .25, .26, .15);
}

function drone(scene) {
  const craft = group(scene, 6.23, 1.6, -4.42);
  craft.rotation.y = -.15;
  box(craft, rust, 0, 0, 0, .87, .27, .64);
  box(craft, cream, 0, .15, 0, .63, .08, .53);
  box(craft, ink, 0, -.155, -.27, .32, .2, .2);
  for (const angle of [-Math.PI / 4, Math.PI / 4]) box(craft, ink, 0, 0, 0, .105, .095, 2.65).rotation.y = angle;
  for (const x of [-.9, .9]) for (const z of [-.9, .9]) {
    cylinder(craft, ink, x, .07, z, .26, .2);
    box(craft, z > 0 ? cream : blue, x, .19, z, .86, .044, .095).rotation.y = x * z * .6;
  }
  for (const x of [-.32, .32]) {
    box(craft, ink, x, -.23, 0, .08, .19, .36);
    box(craft, ink, x, -.34, 0, .08, .06, .57);
  }
  cylinder(scene, ink, 6.23, 1.22, -4.42, 2.8, .11);
  const ring = new T.Mesh(new T.RingGeometry(1.18, 1.24, 40), new T.MeshBasicMaterial({ color: 0xeee2bd }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(6.23, 1.28, -4.42);
  scene.add(ring);
}

function mobileRobot(scene, x, z, color, angle, wide = false) {
  const robot = group(scene, x, 0, z);
  robot.rotation.y = angle;
  box(robot, ink, 0, .27, 0, 1.05, .24, 1.65);
  box(robot, color, 0, .45, 0, 1.05, .17, 1.58);
  box(robot, 0x9cb3b1, 0, .66, .17, .68, .25, .68);
  box(robot, ink, 0, .81, -.05, .08, .24, .075);
  cylinder(robot, teal, 0, .96, -.05, .37, .14);
  cylinder(robot, cream, 0, 1.045, -.05, .29, .035);
  box(robot, 0xa1d4c6, 0, .43, -.799, .55, .09, .045);
  for (const dx of [-.56, .56]) {
    for (const dz of [-.55, .56]) {
      cylinder(robot, ink, dx, .24, dz, .48, wide ? .28 : .2).rotation.z = Math.PI / 2;
      cylinder(robot, 0x95a4a2, dx * 1.25, .24, dz, .22, .07).rotation.z = Math.PI / 2;
    }
    if (wide) box(robot, ink, dx, .22, 0, .29, .33, 1);
  }
}

function character(scene) {
  const player = group(scene, 0, 0, 0);
  const body = group(player, 0, 0, 0);
  const skin = 0xc98a64;
  const hair = 0x302d2b;
  const trousers = 0x354b5a;
  round(body, rust, 0, 1.23, 0, .33, .37, .19);
  box(body, rust, 0, 1.14, 0, .49, .38, .26);
  cylinder(body, skin, 0, 1.61, 0, .18, .21);
  round(body, skin, 0, 1.8, -.02, .215, .253, .198);
  round(body, hair, 0, 1.91, .025, .225, .18, .195);
  round(body, hair, 0, 1.85, .104, .22, .20, .123);
  for (const x of [-.18, .18]) round(body, skin, x, 1.78, -.02, .057, .076, .051);
  for (const x of [-.086, .086]) round(body, hair, x, 1.81, -.197, .025, .025, .022);
  round(body, skin, 0, 1.76, -.21, .048, .052, .044);
  box(body, cream, 0, 1.33, .196, .36, .195, .025);
  const mark = new T.TextureLoader().load(new URL("./assets/ogp-mark.svg", import.meta.url).href);
  mark.colorSpace = T.SRGBColorSpace;
  const decal = new T.Mesh(new T.PlaneGeometry(.33, .172), new T.MeshBasicMaterial({ map: mark, transparent: true }));
  decal.position.set(0, 1.33, .211);
  body.add(decal);
  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const leg = group(body, side * .145, .98, 0);
    box(leg, trousers, 0, -.39, 0, .211, .8, .211);
    box(leg, ink, 0, -.878, -.053, .24, .18, .37);
    box(leg, cream, 0, -.951, -.055, .245, .053, .376);
    legs.push(leg);
    const arm = group(body, side * .317, 1.47, -.008);
    arm.rotation.z = side * .105;
    round(arm, rust, side * .024, -.205, 0, .108, .27, .108);
    round(arm, skin, side * .042, -.496, -.005, .089, .145, .078);
    arms.push(arm);
  }
  let stride = 0;
  return {
    player,
    walk(distance, time, reducedMotion) {
      stride += distance * 7.4;
      const swing = reducedMotion ? 0 : Math.sin(stride) * Math.min(.48, distance / Math.max(time, .001) * .19);
      body.position.y = swing ? Math.abs(swing) * .09 : 0;
      legs.forEach((leg, i) => { leg.rotation.x = i === 0 ? swing : -swing; });
      arms.forEach((arm, i) => { arm.rotation.x = i === 0 ? -swing * .72 : swing * .72; });
    }
  };
}

function room(scene) {
  box(scene, 0x8a9c98, 0, -.32, 0, 22.42, .64, 15.43);
  box(scene, 0xc2caca, 0, -.022, 0, 22, .04, 15);
  for (let x = -10; x <= 10; x += 2) box(scene, 0xa8b7b7, x, .006, 0, .015, .01, 15);
  for (let z = -6; z <= 6; z += 2) box(scene, 0xa8b7b7, 0, .006, z, 22, .01, .015);
  box(scene, 0xd9e3df, 0, 2.3, -7.57, 22.36, 4.6, .28);
  box(scene, 0xb1c3be, -11.08, 2.3, 0, .28, 4.6, 15);
  box(scene, 0x657e82, 0, .22, -7.39, 22, .42, .08);
  box(scene, 0x657e82, -10.9, .22, 0, .08, .42, 15);
  box(scene, teal, 0, 4.47, -7.56, 22.42, .16, .34);
  box(scene, teal, -11.09, 4.47, 0, .34, .16, 15.14);
  box(scene, 0x859997, 11.02, .25, 0, .17, .5, 15.1);
  for (const x of [-6.82, 6.82]) box(scene, 0x859997, x, .25, 7.51, 8.47, .5, .18);

  for (const x of [-.4, 3.5, 7.4]) {
    box(scene, ink, x, 2.91, -7.369, 3.43, 1.7, .09);
    panel(scene, x, 2.91, -7.316, 3.23, 1.51, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#9fc3cb");
      sky.addColorStop(1, "#ecedd8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#a1bbae";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * .79);
      ctx.lineTo(w * .24, h * .59);
      ctx.lineTo(w * .61, h * .77);
      ctx.lineTo(w, h * .53);
      ctx.lineTo(w, h);
      ctx.fill();
    });
    box(scene, ink, x, 2.91, -7.30, .075, 1.56, .045);
    box(scene, 0xc1d2cb, x, 2.11, -7.28, 3.52, .10, .19);
  }

  label(scene, "OGP  /  ROBOTICS LAB", -1.7, 1.06, -7.381, 3.1, .38);
  cabinet(scene, -10.12, 5.15, 1.25, .96, 3.36, teal);
  const shelf = group(scene, 9.57, 0, -6.49);
  for (const x of [-.88, .88]) for (const z of [-.58, .58]) box(shelf, ink, x, 1.56, z, .075, 3.12, .08);
  for (const y of [.27, 1.17, 2.1, 3.03]) box(shelf, teal, 0, y, 0, 1.82, .12, 1.24);
  crate(shelf, yellow, -.43, .35, 0, .72, .58, .88);
  crate(shelf, blue, .44, 1.25, 0, .72, .58, .88);
  crate(shelf, rust, -.37, 2.17, 0, .8, .44, .82);
  crate(shelf, cream, .46, 2.17, -.15, .52, .49, .53);
}

export function buildWorld() {
  const scene = new T.Scene();
  scene.background = new T.Color(0xcfdad4);
  scene.add(new T.HemisphereLight(0xfff0da, 0x9aaeb4, 2.15));
  const light = new T.DirectionalLight(0xffedce, 2.35);
  light.position.set(-6, 14, 8);
  scene.add(light);

  room(scene);
  whiteboard(scene);
  const boatBench = workbench(scene, -6.85, .875, 4.45, 2.65, "MARINE", 0x3c778c);
  crate(boatBench, 0x739da3, -1.2, .47, .17, .94, .33, .71);
  crate(boatBench, cream, 1.16, .47, .13, .6, .32, .65);
  boat(scene);
  const flightBench = workbench(scene, 6.55, -4.32, 4.2, 2.85, "AERIAL", 0xb86652);
  crate(flightBench, teal, 1.28, .47, .32, .9, .34, .73);
  drone(scene);

  box(scene, 0x557375, 6.95, .027, 1.93, 3.7, .048, 3.75);
  for (const x of [5.18, 8.72]) box(scene, 0xe5c47c, x, .053, 1.93, .052, .014, 3.57);
  for (const z of [.19, 3.67]) box(scene, 0xe5c47c, 6.95, .053, z, 3.56, .014, .052);
  mobileRobot(scene, 6.03, 1.1, yellow, -.53);
  mobileRobot(scene, 7.82, 2.63, rust, -2.17, true);
  box(scene, cream, 8.24, .12, .61, .57, .17, .34);

  const beacons = stops.map((stop) => ({ ...stop, position: new T.Vector3(...stop.marker) }));
  const { player, walk } = character(scene);
  const shadow = new T.Mesh(
    new T.CircleGeometry(.45, 28),
    new T.MeshBasicMaterial({ color: 0x50626a, transparent: true, opacity: .25, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .022;
  scene.add(shadow);
  return { scene, player, shadow, walk, beacons };
}
