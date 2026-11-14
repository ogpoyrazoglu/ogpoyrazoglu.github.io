import * as T from "./assets/three/three.module.min.js";
import { blueBoat } from "./blueboat.js";
import { f1tenthRacer } from "./f1tenth.js";
import { concrete, lightLab, material, softShadow, wood } from "./lab-materials.js";
import { skydioF10 } from "./skydio-f10.js";
import { publications } from "./publications.js";

export { T };
export const trail = [
  [0, 5.2], [-3.65, 4.3], [-3.65, -4.7], [-5.8, -4.7], [-3.65, -4.7],
  [-3.65, .9], [0, -.65], [3.1, -3.9], [3.1, 2.05]
];

const stops = [
  { point: 3, facing: 0, marker: [-7.35, 3.82, -7], focus: [-7.1, 2.63, -7], view: [.2, .6, 9.5] },
  { point: 5, facing: Math.PI / 2, marker: [-7, 3.3, .25], focus: [-6.86, 1.65, .87], view: [2.65, 2.05, 3.2] },
  { point: 7, facing: -Math.PI / 2, marker: [6.4, 3.37, -4.35], focus: [6.42, 1.47, -4.36], view: [1.9, 3.25, 2.9] },
  { point: 8, facing: -Math.PI / 2, marker: [6.8, 2.9, 1.8], focus: [6.73, .44, 2.05], view: [1.52, 2.6, 3.05] }
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
const darkMetal = material(0x252c33, .43, .58);

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
  if (typeof color === "number" && !materials.has(color)) materials.set(color, material(color));
  const part = new T.Mesh(geometry, materials.get(color) ?? color);
  part.position.set(x, y, z);
  part.scale.set(sx, sy, sz);
  part.castShadow = y >= .08;
  part.receiveShadow = true;
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
  const board = panel(scene, -7.1, 2.63, -7.101, 6.26, 2.4, (ctx, width, height) => {
    ctx.fillStyle = "#f5f2e7";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#245d62";
    ctx.font = "italic 700 37px Georgia";
    ctx.fillText("Selected publications", 26, 53);
    ctx.fillStyle = "#6a9589";
    ctx.fillRect(26, 63, width - 52, 2);
  });
  const map = board.material.map;
  const ctx = map.image.getContext("2d");
  publications.then((papers) => {
    if (!papers.length) {
      ctx.font = "20px sans-serif";
      ctx.fillText("Browse the papers from the lab guide.", 26, 107);
      map.needsUpdate = true;
      return;
    }
    for (const [index, paper] of papers.slice(0, 4).entries()) {
      const x = 26 + (index % 2) * 365;
      const y = 81 + Math.floor(index / 2) * 103;
      ctx.fillStyle = "#e5e9e2";
      ctx.fillRect(x, y, 81, 84);
      ctx.fillStyle = "#28676b";
      ctx.font = "700 14px sans-serif";
      ctx.fillText(paper.venue.toUpperCase(), x + 92, y + 12);
      ctx.fillStyle = "#293d43";
      ctx.font = "600 16px sans-serif";
      let line = "";
      let baseline = y + 34;
      for (const word of paper.title.split(/\s+/)) {
        const next = [line, word].filter(Boolean).join(" ");
        if (line && ctx.measureText(next).width > 251) {
          ctx.fillText(line, x + 92, baseline);
          baseline += 16;
          line = word;
        } else line = next;
      }
      ctx.fillText(line, x + 92, baseline);
      const image = new Image();
      image.addEventListener("load", () => {
        const ratio = Math.min(73 / image.width, 76 / image.height);
        const w = image.width * ratio;
        const h = image.height * ratio;
        ctx.drawImage(image, x + (81 - w) / 2, y + (84 - h) / 2, w, h);
        map.needsUpdate = true;
      }, { once: true });
      image.src = paper.figure;
    }
    map.needsUpdate = true;
  });
  box(scene, 0x6d898d, -7.1, 1.28, -7, 6.4, .08, .29);
  box(scene, teal, -6.14, 1.349, -6.99, .36, .06, .06).rotation.y = -.13;
  box(scene, rust, -6.6, 1.349, -6.99, .31, .06, .05);
  cabinet(scene, -7.1, -6.35, 4.33, .81, 1.05, 0x688b91);
  const closedNotebook = box(scene, 0x465b75, -8.36, .964, -6.33, .55, .088, .68);
  closedNotebook.rotation.y = .18;
  box(scene, cream, -8.35, .964, -6.001, .49, .048, .01).rotation.y = .18;
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

function workbench(scene, x, z, w, d, tag, color, worktop) {
  const bench = group(scene, x, 0, z);
  box(bench, worktop, 0, 1.075, 0, w, .17, d);
  box(bench, 0x918571, 0, 1.027, d / 2 + .001, w, .019, .013);
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
  box(scene, concrete(), 0, -.022, 0, 22, .04, 15);
  for (let x = -9; x <= 9; x += 3) box(scene, 0x888f90, x, .002, 0, .018, .005, 15);
  for (let z = -6; z <= 6; z += 3) box(scene, 0x888f90, 0, .002, z, 22, .005, .018);
  box(scene, 0xd9e3df, 0, 2.3, -7.57, 22.36, 4.6, .28);
  box(scene, 0xb1c3be, -11.08, 2.3, 0, .28, 4.6, 15);
  box(scene, 0x657e82, 0, .22, -7.39, 22, .42, .08);
  box(scene, 0x657e82, -10.9, .22, 0, .08, .42, 15);
  box(scene, teal, 0, 4.47, -7.56, 22.42, .16, .34);
  box(scene, teal, -11.09, 4.47, 0, .34, .16, 15.14);
  box(scene, 0x859997, 11.02, .25, 0, .17, .5, 15.1);
  for (const x of [-6.82, 6.82]) box(scene, 0x859997, x, .25, 7.51, 8.47, .5, .18);

  box(scene, 0x899997, 0, 4.1, -7.347, 21.8, .09, .13);
  for (const x of [-9.9, -4.1, .7, 5.6, 9.9]) {
    box(scene, 0xa8b2af, x, 4.09, -7.239, .14, .22, .19);
  }
  box(scene, 0x909e9c, -10.89, 3.5, 2.55, .12, .065, 9.5);
  box(scene, 0x909e9c, -10.89, 2.04, 5.79, .12, 2.9, .07);
  box(scene, 0x52676b, -10.88, .99, 5.79, .15, .28, .21);

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

export function buildWorld(renderer) {
  const scene = new T.Scene();
  scene.background = new T.Color(0xcfdad4);
  scene.add(new T.HemisphereLight(0xe6edf7, 0xa7a599, 1.05));
  lightLab(scene, renderer);

  room(scene);
  whiteboard(scene);
  const worktop = wood();
  const boatBench = workbench(scene, -6.85, .875, 4.45, 2.65, "BLUEBOAT", 0x3c778c, worktop);
  crate(boatBench, 0x739da3, -1.2, .47, .17, .94, .33, .71);
  crate(boatBench, cream, 1.16, .47, .13, .6, .32, .65);
  softShadow(scene, -6.86, .87, 3.8, 2.13, .67, 1.167);
  blueBoat(scene);
  const flightBench = workbench(scene, 6.55, -4.32, 4.2, 2.85, "F10 LIGHTRUNNER", 0x426b83, worktop);
  crate(flightBench, teal, 1.28, .47, .32, .9, .34, .73);
  box(flightBench, darkMetal, -.13, 1.192, -.04, 3.56, .064, 2.04);
  for (const z of [-.425, .33]) {
    box(flightBench, darkMetal, -.13 - z * .24, 1.31, -.04 + z, .33, .17, .18).rotation.y = -.24;
    box(flightBench, ink, -.13 - z * .24, 1.405, -.04 + z, .26, .037, .15).rotation.y = -.24;
  }
  skydioF10(flightBench);

  box(scene, 0x557375, 6.95, .027, 1.93, 3.7, .048, 3.75);
  for (const x of [5.18, 8.72]) box(scene, 0xe5c47c, x, .053, 1.93, .052, .014, 3.57);
  for (const z of [.19, 3.67]) box(scene, 0xe5c47c, 6.95, .053, z, 3.56, .014, .052);
  f1tenthRacer(scene, 6.73, 2.05);
  cylinder(scene, 0x898f90, 8.09, .27, .83, .72, .44);
  cylinder(scene, 0xb4b8b5, 8.09, .497, .83, .70, .026);
  cylinder(scene, 0x929794, 5.89, .23, .56, .55, .35);
  cylinder(scene, 0xb8bdb8, 5.89, .411, .56, .53, .026);

  for (const [x, z, w, d] of [[-6.8, .9, 5.7, 3.65], [6.5, -4.3, 5.6, 3.7], [-7.1, -6.35, 5.5, 1.7], [9.6, -6.5, 2.9, 2.2], [-10.1, 5.1, 2.2, 4.6]]) {
    softShadow(scene, x, z, w, d, .56);
  }
  const beacons = stops.map((stop) => ({ ...stop, position: new T.Vector3(...stop.marker) }));
  const { player, walk } = character(scene);
  player.traverse(part => { part.castShadow = false; });
  const shadow = softShadow(scene, 0, 0, 1.4, 1.16, .72);
  return { scene, player, shadow, walk, beacons };
}
