import * as T from "./assets/three/three.module.min.js";

export { T };
export const trail = [
  [-13, 20], [-15, 10], [-24, 6], [-15, 10], [-7, 7], [0, 0],
  [8, -3], [15, -8], [22, -11], [29, -17]
];

const stops = [2, 5, 7, 9];
const ink = 0x273d38;
const cream = 0xf9e4af;
const teal = 0x448c7e;
const yellow = 0xe4ae4d;
const rust = 0xe58053;
const materials = new Map();
const boxGeometry = new T.BoxGeometry();
const ballGeometry = new T.IcosahedronGeometry(1, 0);
const cylinderGeometry = new T.CylinderGeometry(.5, .5, 1, 12);

function mesh(parent, geometry, color, x, y, z, sx, sy, sz) {
  if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .88, flatShading: true }));
  const part = new T.Mesh(geometry, materials.get(color));
  part.position.set(x, y, z);
  part.scale.set(sx, sy, sz);
  parent.add(part);
  return part;
}

const box = (parent, color, x, y, z, w, h, d) => mesh(parent, boxGeometry, color, x, y, z, w, h, d);
const rock = (parent, color, x, y, z, w, h, d) => mesh(parent, ballGeometry, color, x, y, z, w, h, d);
const cylinder = (parent, color, x, y, z, w, h) => mesh(parent, cylinderGeometry, color, x, y, z, w, h, w);

function group(parent, x, y, z) {
  const object = new T.Group();
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function sign(parent, text, x, y, z, w, h, size, colors = ["#27483f", "#fcf2cd"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round(512 * h / w);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = 6;
  ctx.strokeRect(11, 11, canvas.width - 22, canvas.height - 22);
  ctx.fillStyle = colors[1];
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, canvas.height / 2 + 2, 470);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const panel = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: texture }));
  panel.position.set(x, y, z);
  parent.add(panel);
}

function building(scene, x, z, w, d, roof, label) {
  const house = group(scene, x, 0, z);
  box(house, 0xd1bb8e, 0, 1.7, 0, w, 3.4, d);
  box(house, 0xab9b78, 0, .2, 0, w + .35, .4, d + .35);
  box(house, roof, 0, 3.55, 0, w + .55, .45, d + .55);
  const cap = box(house, roof, 0, 3.85, 0, w * .85, .32, d * .88);
  cap.rotation.z = -.025;
  box(house, ink, w * .16, 1.08, d / 2 + .025, w * .38, 2.15, .09);
  for (let i = 0; i < 5; i++) box(house, 0x557872, w * .16, .33 + i * .33, d / 2 + .08, w * .34, .045, .035);
  box(house, ink, -w * .29, 1.93, d / 2 + .035, 1.42, 1, .07);
  box(house, 0x9ad4cc, -w * .29, 1.93, d / 2 + .081, 1.24, .8, .04);
  sign(house, label, 0, 2.88, d / 2 + .08, w * .7, .65, 60);
  return house;
}

function wheels(parent, x, z) {
  const axle = group(parent, x, .39, z);
  axle.rotation.z = Math.PI / 2;
  const tire = cylinder(axle, ink, 0, 0, 0, .78, .38);
  cylinder(tire, 0xb3bca2, 0, x < 0 ? .54 : -.54, 0, .47, .075);
  return axle;
}

function rover(parent, color, label) {
  const car = group(parent, 0, 0, 0);
  box(car, ink, 0, .52, 0, 1.43, .23, 2.35);
  box(car, color, 0, .82, 0, 1.42, .48, 2.12);
  box(car, color, 0, 1.22, .13, 1.15, .52, 1.17);
  box(car, 0x93ccc5, 0, 1.29, -.465, .91, .25, .055);
  box(car, 0x759e91, .583, 1.28, .03, .055, .23, .67);
  box(car, 0xb6d1b5, -.583, 1.28, .03, .055, .23, .67);
  box(car, cream, 0, 1.5, .13, 1.2, .095, 1.25);
  for (const x of [-.81, .81]) {
    wheels(car, x, -.71);
    wheels(car, x, .73);
    box(car, 0xfff2bb, x * .7, .84, -1.08, .25, .14, .05);
    box(car, 0xb34e39, x * .7, .84, 1.08, .22, .13, .05);
  }
  if (label) {
    box(car, cream, 0, .85, 1.093, .62, .28, .03);
    const mark = new T.TextureLoader().load(new URL("./assets/ogp-mark.svg", import.meta.url).href);
    mark.colorSpace = T.SRGBColorSpace;
    const decal = new T.Mesh(new T.PlaneGeometry(.53, .255), new T.MeshBasicMaterial({ map: mark, transparent: true }));
    decal.position.set(0, .85, 1.11);
    car.add(decal);
  }
  return car;
}

function boat(scene) {
  const vessel = group(scene, -32, -.26, 5);
  vessel.rotation.y = -.28;
  const hull = new T.Shape();
  hull.moveTo(-1.25, 2.4);
  hull.lineTo(-1.35, -1.35);
  hull.lineTo(0, -2.7);
  hull.lineTo(1.35, -1.35);
  hull.lineTo(1.25, 2.4);
  hull.closePath();
  const body = new T.ExtrudeGeometry(hull, { depth: .62, bevelEnabled: false });
  body.rotateX(Math.PI / 2);
  mesh(vessel, body, cream, 0, .69, 0, 1, 1, 1);
  box(vessel, rust, 0, .91, -.04, 1.75, .55, 1.95);
  box(vessel, teal, 0, 1.02, -.98, 1.42, .25, .055);
  box(vessel, ink, 0, 1.5, .2, .07, .6, .07);
  box(vessel, cream, 0, 1.8, .2, .49, .075, .26);
  return vessel;
}

function drone(scene) {
  const craft = group(scene, 15, 2.55, -15);
  box(craft, rust, 0, 0, 0, 1.6, .48, 1.1);
  box(craft, cream, 0, .26, 0, 1.15, .13, .88);
  box(craft, ink, 0, -.23, -.45, .45, .26, .35);
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    box(craft, ink, 0, .01, 0, .16, .14, 3.2).rotation.y = angle;
  }
  const rotors = [];
  for (const x of [-1.17, 1.17]) for (const z of [-1.17, 1.17]) {
    cylinder(craft, ink, x, .12, z, .37, .27);
    rotors.push(box(craft, cream, x, .31, z, 1.18, .045, .12));
  }
  return { craft, rotors };
}

function quadruped(scene) {
  const dog = group(scene, 32, 0, -19);
  dog.rotation.y = -.8;
  box(dog, yellow, 0, 1.05, 0, .94, .46, 1.8);
  box(dog, cream, 0, 1.31, 0, .72, .09, 1.25);
  box(dog, ink, 0, 1.05, -.92, .66, .38, .35);
  box(dog, teal, 0, 1.08, -1.11, .47, .16, .07);
  for (const x of [-.46, .46]) for (const z of [-.65, .65]) {
    const leg = group(dog, x, .8, z);
    box(leg, ink, 0, -.23, 0, .18, .65, .19).rotation.x = z * .47;
    box(leg, yellow, 0, -.4, z * .23, .145, .53, .155).rotation.x = -z * .63;
    box(leg, ink, 0, -.73, z * .35, .23, .11, .24);
  }
}

export const bounds = [
  [-25, -5, 3, 3.8], [-4.5, -8, 4.1, 3.3], [6, -13, 3, 2.8], [29, -24, 4, 2.7],
  [-4, -3, 1.1, 1.2], [32, -19, 1.2, 1.2]
];

export function canDrive(x, z) {
  return x >= -25.2 && x <= 40 && z >= -34 && z <= 27 &&
    !bounds.some(([cx, cz, w, d]) => Math.abs(cx - x) < w + .65 && Math.abs(cz - z) < d + .65);
}

function road(scene) {
  const segments = trail.slice(1).map(([x, z], i) => {
    const [ox, oz] = trail[i];
    return { x, z, ox, oz, angle: Math.atan2(x - ox, z - oz), length: Math.hypot(x - ox, z - oz) };
  });
  for (const [x, z] of trail) cylinder(scene, 0xc6ad7a, x, .014, z, 4.4, .04);
  segments.forEach(({ x, z, ox, oz, angle, length }, index) => {
    if (index === 2) return;
    box(scene, 0xc6ad7a, (x + ox) / 2, .018, (z + oz) / 2, 4.4, .04, length).rotation.y = angle;
    for (let distance = 1; distance < length - .5; distance += 2.6) {
      const t = distance / length;
      box(scene, 0xe6cf9d, T.MathUtils.lerp(ox, x, t), .05, T.MathUtils.lerp(oz, z, t), .14, .02, 1.05).rotation.y = angle;
    }
  });
}

function pine(scene, x, z, s, color) {
  cylinder(scene, 0x7f6447, x, s * .5, z, s * .24, s);
  const leaves = new T.ConeGeometry(1, 1, 6);
  mesh(scene, leaves, color, x, s * 1.05, z, s * .65, s * 1.5, s * .65);
  mesh(scene, leaves, color, x, s * 1.64, z, s * .48, s * 1.35, s * .48);
}

export function buildWorld() {
  const scene = new T.Scene();
  scene.background = new T.Color(0xd5e5d6);
  scene.fog = new T.Fog(0xd5e5d6, 85, 160);
  scene.add(new T.HemisphereLight(0xffefd3, 0x88a58c, 2.05));
  const sun = new T.DirectionalLight(0xffe5ae, 2.6);
  sun.position.set(-25, 39, 18);
  scene.add(sun);

  box(scene, 0x4a9f9b, -15, -.62, 0, 195, .24, 195);
  box(scene, 0xb8a37a, 8, -.49, -4, 71, .65, 67);
  box(scene, 0x88a874, 8, -.22, -4, 67, .42, 64);
  box(scene, 0xab8e62, -27.5, -.02, 6, 7, .24, 5.7);
  for (let x = -31; x <= -24; x += .55) box(scene, 0xc3a77b, x, .12, 6, .48, .06, 5.5);
  for (const x of [-30.4, -27.6, -25]) for (const z of [3.45, 8.55]) {
    box(scene, 0x846c50, x, .22, z, .27, .8, .28);
    box(scene, yellow, x, .66, z, .31, .075, .31);
  }
  for (let i = 0; i < 43; i++) {
    const x = -29 - (i * 73 % 410) / 10;
    const z = -38 + (i * 31 % 700) / 10;
    box(scene, i % 3 ? 0x66b1ac : 0x82bfb0, x, -.485, z, 1 + (i % 5) * .38, .013, .065);
  }
  road(scene);

  building(scene, -25, -5, 5.1, 5.5, teal, "MARINE LAB");
  building(scene, -4.5, -8, 8.1, 6.2, rust, "ROVER WORKSHOP");
  building(scene, 6, -13, 5.3, 5, teal, "FLIGHT SHED");
  building(scene, 29, -24, 6.1, 4.1, 0x698878, "TRAIL HUT");
  box(scene, 0x687a71, -3.8, .018, -2.7, 5.6, .04, 4.1);
  const testRover = rover(scene, yellow);
  testRover.position.set(-4, .05, -3);
  testRover.rotation.y = -.55;
  cylinder(scene, cream, 15, .014, -15, 8.4, .045);
  cylinder(scene, 0x697f76, 15, .045, -15, 7.85, .04);
  box(scene, cream, 14.15, .08, -15, .28, .02, 2.6);
  box(scene, cream, 15.85, .08, -15, .28, .02, 2.6);
  box(scene, cream, 15, .08, -15, 1.65, .02, .28);
  quadruped(scene);

  const treeRows = [
    [-20, -23, 2], [-17, -19, 2.2], [-23, -15, 2.4], [-14, -14, 1.7], [-11, -24, 2.7],
    [2, -23, 2.6], [6, -25, 2.1], [10, -21, 1.8], [18, -24, 2.7], [23, -25, 2.2],
    [28, -32, 2.8], [36, -28, 2.5], [37, -18, 2.2], [39, -13, 2], [34, -9, 1.6],
    [26, -6, 2], [23, -2, 2.3], [19, 2, 2], [15, 6, 1.8], [13, 13, 2.3], [5, 15, 2.7],
    [0, 20, 2.1], [-4, 24, 2.5], [-19, 23, 2.5], [-22, 17, 2.1], [-23, 12, 1.8]
  ];
  treeRows.forEach(([x, z, s], i) => {
    rock(scene, 0x80966a, x + .5, .01, z - .5, s * .55, .045, s * .47);
    pine(scene, x, z, s, i % 3 ? 0x4e8064 : 0x659673);
  });
  for (let i = 0; i < 16; i++) {
    const x = 19 + (i * 23 % 210) / 10;
    const z = -26 - (i * 19 % 86) / 10;
    rock(scene, i % 3 ? 0x7f9483 : 0xa0ad91, x, .9, z, 1.4 + (i % 4) * .42, 1.7 + (i % 6) * .35, 2);
  }
  for (const [x, z, s] of [[-21, -2, .7], [-18, -6, .5], [-9, 2, .7], [10, 5, .8], [32, -10, .8], [36, -16, .58]]) {
    rock(scene, 0x889382, x, .26, z, s, s, s);
  }

  const entry = group(scene, -10, 0, 18);
  box(entry, ink, -.73, .85, 0, .12, 1.7, .13);
  box(entry, ink, .73, .85, 0, .12, 1.7, .13);
  sign(entry, "OGP FIELD STATION", 0, 1.55, .09, 2.82, .63, 49);
  const beacons = stops.map((point, index) => {
    const [x, z] = trail[point];
    const color = [0x61c1b8, yellow, rust, 0x9ac070][index];
    const base = group(scene, x + 2.75, 0, z - .2);
    cylinder(base, ink, 0, .1, 0, .9, .2);
    cylinder(base, color, 0, .17, 0, .74, .12);
    box(base, ink, 0, .88, 0, .12, 1.4, .12);
    const lamp = rock(base, color, 0, 1.64, 0, .3, .32, .3);
    return { point, base, lamp };
  });
  const player = rover(scene, rust, "OGP");
  const shadow = cylinder(scene, 0x687e54, 0, .043, 0, 1.38, .014);
  shadow.scale.z = 2.1;
  const vessel = boat(scene);
  const aircraft = drone(scene);
  return { scene, player, shadow, vessel, aircraft, beacons };
}
