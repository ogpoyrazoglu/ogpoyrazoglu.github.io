import * as T from "./assets/three/three.module.min.js";
import { loadAvatar } from "./avatar.js";
import { alphaTruck } from "./alphatruck.js";
import { blueBoat } from "./blueboat.js";
import { f1tenthRacer } from "./f1tenth.js";
import { concrete, lightLab, material, softShadow, wood } from "./lab-materials.js";
import { skydioF10 } from "./skydio-f10.js";
import { whiteboardPapers } from "./publications.js";

export { T };
// The room and exhibits are modelled in lab units and drawn at this scale.
// The trail, stops, and obstacles below are in lab units and scaled to world units here.
// The walker is not scaled, so a smaller lab makes the avatar look bigger.
const labScale = .85;
const avatarHeight = 2.1;
const toWorld = (points) => points.map((point) => point.map((value) => value * labScale));

// Standing points. The first is the entrance; each stop below names the point where
// the walker stands. Walking between them follows routeTo around the furniture.
export const trail = toWorld([
  [0, 4.3], [-1.6, -2.8], [-1.6, .6], [4.3, -3.5], [2.4, -.6], [2.4, 3.25], [-6.1, 3.0]
]);

// The whiteboard stop stands at the board's right end, turned toward it, so the walker
// stays out of the close-up; that camera sits high enough to clear the boat.
// The order matches the exhibits in world.js and the numbered markers.
const stops = [
  { point: 1, facing: .95, marker: [-5.15, 3.82, -5], focus: [-4.9, 2.63, -5], view: [.1, 1.1, 6] },
  { point: 2, facing: Math.PI / 2, marker: [-5.25, 3.3, -.03], focus: [-5.11, 1.65, .6], view: [2.65, 2.05, 3.2] },
  { point: 3, facing: 0, marker: [4.0, 4.0, -5], focus: [4.3, 2.45, -5.05], view: [1.0, 1.0, 5.6] },
  { point: 4, facing: -Math.PI / 2, marker: [5.75, 1.55, -.15], focus: [5.68, .44, -.48], view: [1.52, 2.6, 3.05] },
  { point: 5, facing: -Math.PI / 2, marker: [5.9, 2.1, 3.55], focus: [5.9, .75, 3.25], view: [-1.7, 2.6, 3.4] },
  { point: 6, facing: 2, marker: [-7.6, 2.75, 3.75], focus: [-7.75, 1.8, 3.75], view: [3.0, .75, 1.6] }
].map(({ marker, focus, view, ...stop }) => ({ ...stop, ...Object.fromEntries(
  Object.entries({ marker, focus, view }).map(([key, value]) => [key, value.map((v) => v * labScale)])) }));
const roomWidth = 17;
const roomDepth = 11;
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

const obstacles = toWorld([
  [-7.1, -2.7, -4.9, -3.6],   // Whiteboard cabinet
  [-7.35, -2.85, -.73, 1.93], // Boat bench
  [4.05, 7.75, -2.48, 1.27],  // F1TENTH mat and test course
  [4.05, 7.75, 1.65, 4.85],   // AlphaTruck mat
  [6.55, 8.45, -5.5, -4.05],  // Storage rack
  [-8.3, -6.95, 2.4, 5.1]     // Tool cabinets
]);

const clearance = .39;
export function canWalk(x, z) {
  return Math.abs(x) <= roomWidth * labScale / 2 - clearance && Math.abs(z) <= roomDepth * labScale / 2 - clearance &&
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
  function header(ctx, width, height) {
    ctx.fillStyle = "#f5f2e7";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#245d62";
    ctx.font = "italic 700 37px Georgia";
    ctx.fillText("Selected publications", 26, 53);
    ctx.fillStyle = "#6a9589";
    ctx.fillRect(26, 63, width - 52, 2);
  }
  const board = panel(scene, -7.1, 2.63, -7.101, 6.26, 2.4, header);
  const map = board.material.map;
  const ctx = map.image.getContext("2d");
  const figures = new Map();
  let papers = [];
  let active = null;
  let activePosition;
  function drawFigure(paper, x, y, width, height) {
    ctx.fillStyle = "#e5e9e2";
    ctx.fillRect(x, y, width, height);
    const image = figures.get(paper.figure);
    if (image?.naturalWidth) {
      const scale = Math.min((width - 8) / image.naturalWidth, (height - 8) / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
    }
  }
  function drawTitle(paper, x, baseline, maxWidth, size) {
    ctx.fillStyle = "#293d43";
    ctx.font = `600 ${size}px sans-serif`;
    let line = "";
    for (const word of paper.title.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        ctx.fillText(line, x, baseline);
        baseline += size + 2;
        line = word;
      } else line = next;
    }
    ctx.fillText(line, x, baseline);
  }
  function render() {
    header(ctx, map.image.width, map.image.height);
    ctx.fillStyle = "#28676b";
    if (active) {
      ctx.font = "700 15px sans-serif";
      ctx.fillText(activePosition, 610, 49);
      drawFigure(active, 25, 83, 216, 183);
      ctx.fillStyle = "#28676b";
      ctx.font = "700 20px sans-serif";
      ctx.fillText(active.venue.toUpperCase(), 266, 107);
      drawTitle(active, 266, 146, 475, 31);
    } else {
      for (const [index, paper] of papers.slice(0, 4).entries()) {
        const x = 26 + (index % 2) * 365;
        const y = 81 + Math.floor(index / 2) * 103;
        drawFigure(paper, x, y, 81, 84);
        ctx.fillStyle = "#28676b";
        ctx.font = "700 14px sans-serif";
        ctx.fillText(paper.venue.toUpperCase(), x + 92, y + 12);
        drawTitle(paper, x + 92, y + 32, 251, 16);
      }
    }
    map.needsUpdate = true;
  }
  whiteboardPapers.then((items) => {
    papers = items;
    for (const paper of papers) {
      const image = new Image();
      figures.set(paper.figure, image);
      image.addEventListener("load", render, { once: true });
      image.src = paper.figure;
    }
    render();
  });
  box(scene, 0x6d898d, -7.1, 1.28, -7, 6.4, .08, .29);
  box(scene, teal, -6.14, 1.349, -6.99, .36, .06, .06).rotation.y = -.13;
  box(scene, rust, -6.6, 1.349, -6.99, .31, .06, .05);
  cabinet(scene, -7.1, -6.35, 4.33, .81, 1.05, 0x688b91);
  const closedNotebook = box(scene, 0x465b75, -8.36, .964, -6.33, .55, .088, .68);
  closedNotebook.rotation.y = .18;
  box(scene, cream, -8.35, .964, -6.001, .49, .048, .01).rotation.y = .18;
  return (paper, number, total) => {
    active = paper;
    activePosition = `${number} / ${total}`;
    render();
  };
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

// The F10 hangs flat on the back wall like a museum piece, top side facing the room.
function droneDisplay(scene, x, y) {
  const wall = -roomDepth / 2;
  box(scene, 0x30474e, x, y, wall + .1, 3.85, 2.3, .05);
  box(scene, 0xe4e7dc, x, y, wall + .131, 3.7, 2.15, .012);
  for (const dx of [-.8, .8]) box(scene, darkMetal, x + dx, y - .05, wall + .29, .07, .07, .32);
  const mount = group(scene, x, y, wall + .55);
  skydioF10(mount);
  const craft = mount.children.at(-1);
  craft.position.set(0, 0, 0);
  craft.rotation.set(Math.PI / 2, 0, -.1, "ZYX");
  label(scene, "SKYDIO F10 LIGHTRUNNER", x, y - 1.36, wall + .12, 2.3, .22);
}

// A desktop computer on the left cabinet; its screen faces the room and shows the blog.
function blogComputer(parent, x, z, top) {
  const bezel = 0x1c2328;
  box(parent, darkMetal, x - .15, top + .015, z, .34, .03, .42);
  box(parent, darkMetal, x - .2, top + .26, z, .06, .48, .08);
  box(parent, bezel, x - .14, top + .72, z, .06, .74, 1.24);
  const display = panel(parent, x - .108, top + .72, z, 1.14, .64, (ctx, w, h) => {
    ctx.fillStyle = "#17262b";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#24383e";
    ctx.fillRect(0, 0, w, 44);
    ["#e07a5f", "#e2ad58", "#7fb48a"].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(26 + i * 24, 22, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#9fb7b0";
    ctx.font = "600 20px monospace";
    ctx.fillText("ogpoyrazoglu.github.io/blog", 110, 29);
    ctx.fillStyle = "#f3f1e8";
    ctx.font = "italic 400 58px Georgia, serif";
    ctx.fillText("Thoughts on robotics", 44, 150);
    ctx.fillStyle = "#e2ad58";
    ctx.fillRect(44, 176, 120, 4);
    ctx.fillStyle = "#c9d6d0";
    ctx.font = "400 26px sans-serif";
    ctx.fillText("Notes from the lab, coming soon.", 44, 236);
    for (const [y, width] of [[290, 520], [326, 470], [362, 300]]) {
      ctx.fillStyle = "#2c4248";
      ctx.fillRect(44, y, width, 14);
    }
    ctx.fillStyle = "#f3f1e8";
    ctx.fillRect(44, 392, 16, 28);
  });
  display.rotation.y = Math.PI / 2;
  box(parent, 0xd9dccf, x + .3, top + .02, z, .3, .03, .86);
  box(parent, 0xb2b8ad, x + .3, top + .037, z, .24, .006, .78);
  round(parent, 0xd9dccf, x + .32, top + .03, z + .64, .07, .035, .05);
  cylinder(parent, rust, x + .22, top + .1, z - .8, .16, .2);
  cylinder(parent, 0x3a2a22, x + .22, top + .195, z - .8, .13, .012);
}

function robotMat(scene, x, z, w, d) {
  box(scene, 0x557375, x, .027, z, w, .048, d);
  for (const side of [-1, 1]) {
    box(scene, 0xe5c47c, x + side * (w / 2 - .08), .053, z, .052, .014, d - .18);
    box(scene, 0xe5c47c, x, .053, z + side * (d / 2 - .12), w - .14, .014, .052);
  }
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
  // The block figure is only a fallback: it stays hidden while the avatar loads, so no other
  // character flashes on screen, and appears only if the avatar fails to load.
  body.visible = false;
  let walk = (distance, time, reducedMotion) => {
    stride += distance * 7.4;
    const swing = reducedMotion ? 0 : Math.sin(stride) * Math.min(.48, distance / Math.max(time, .001) * .19);
    body.position.y = swing ? Math.abs(swing) * .09 : 0;
    legs.forEach((leg, i) => { leg.rotation.x = i === 0 ? swing : -swing; });
    arms.forEach((arm, i) => { arm.rotation.x = i === 0 ? -swing * .72 : swing * .72; });
  };
  const shown = loadAvatar(avatarHeight).then((avatar) => {
    avatar.figure.rotation.y = Math.PI; // The avatar faces +z; the walker faces -z at heading 0.
    player.remove(body);
    player.add(avatar.figure);
    walk = avatar.walk;
  }).catch((error) => {
    console.warn("The lab avatar could not load, so the block figure stands in.", error);
    body.visible = true;
  });
  return {
    player,
    shown,
    walk: (distance, time, reducedMotion) => walk(distance, time, reducedMotion)
  };
}

function room(scene) {
  const w = roomWidth;
  const d = roomDepth;
  const back = -d / 2;
  const left = -w / 2;
  box(scene, 0x8a9c98, 0, -.32, 0, w + .42, .64, d + .43);
  box(scene, concrete(), 0, -.022, 0, w, .04, d);
  for (let x = -6; x <= 6; x += 3) box(scene, 0x888f90, x, .002, 0, .018, .005, d);
  for (let z = -3; z <= 3; z += 3) box(scene, 0x888f90, 0, .002, z, w, .005, .018);
  box(scene, 0xd9e3df, 0, 2.3, back - .07, w + .36, 4.6, .28);
  box(scene, 0xb1c3be, left - .08, 2.3, 0, .28, 4.6, d);
  box(scene, 0x657e82, 0, .22, back + .11, w, .42, .08);
  box(scene, 0x657e82, left + .1, .22, 0, .08, .42, d);
  box(scene, teal, 0, 4.47, back - .06, w + .42, .16, .34);
  box(scene, teal, left - .09, 4.47, 0, .34, .16, d + .14);
  box(scene, 0x859997, w / 2 + .02, .25, 0, .17, .5, d + .1);
  // Low front walls leave a doorway between x = -2.6 and 2.6.
  const front = w / 2 + .085 - 2.6;
  for (const side of [-1, 1]) box(scene, 0x859997, side * (2.6 + front / 2), .25, d / 2 + .01, front, .5, .18);

  box(scene, 0x899997, 0, 4.1, back + .153, w - .2, .09, .13);
  for (const x of [-6.6, -2.2, 2.2, 6.6]) {
    box(scene, 0xa8b2af, x, 4.09, back + .261, .14, .22, .19);
  }
  box(scene, 0x909e9c, left + .11, 3.5, 1.2, .12, .065, 8.2);
  box(scene, 0x909e9c, left + .11, 2.04, 4.6, .12, 2.9, .07);
  box(scene, 0x52676b, left + .12, 1.3, 4.6, .15, .28, .21);

  for (const x of [.45]) {
    box(scene, ink, x, 2.91, back + .131, 3.43, 1.7, .09);
    panel(scene, x, 2.91, back + .184, 3.23, 1.51, (ctx, w, h) => {
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
    box(scene, ink, x, 2.91, back + .2, .075, 1.56, .045);
    box(scene, 0xc1d2cb, x, 2.11, back + .22, 3.52, .10, .19);
  }

  label(scene, "OGP  /  ROBOTICS LAB", .45, 1.06, back + .119, 3.1, .38);
  cabinet(scene, -7.62, 3.75, 1.25, .96, 2.6, teal);
  blogComputer(scene, -7.62, 3.75, 1.08);
  const shelf = group(scene, 7.5, 0, -4.74);
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

  const lab = group(scene, 0, 0, 0);
  lab.scale.setScalar(labScale);
  room(lab);
  // The whiteboard and boat were modelled for a larger room, so they shift as groups.
  const showPaper = whiteboard(group(lab, 2.2, 0, 2));
  const worktop = wood();
  const boatBench = workbench(lab, -5.1, .6, 4.45, 2.65, "BLUEBOAT", 0x3c778c, worktop);
  crate(boatBench, 0x739da3, -1.2, .47, .17, .94, .33, .71);
  crate(boatBench, cream, 1.16, .47, .13, .6, .32, .65);
  softShadow(lab, -5.11, .6, 3.8, 2.13, .67, 1.167);
  blueBoat(group(lab, 1.75, 0, -.275));
  droneDisplay(lab, 4.3, 2.5);

  robotMat(lab, 5.9, -.6, 3.7, 3.75);
  f1tenthRacer(lab, 5.68, -.48);
  cylinder(lab, 0x898f90, 7.04, .27, -1.7, .72, .44);
  cylinder(lab, 0xb4b8b5, 7.04, .497, -1.7, .70, .026);
  cylinder(lab, 0x929794, 4.84, .23, -1.97, .55, .35);
  cylinder(lab, 0xb8bdb8, 4.84, .411, -1.97, .53, .026);
  robotMat(lab, 5.9, 3.25, 3.7, 3.2);
  alphaTruck(lab, 5.9, 3.25, -1.2);

  for (const [x, z, w, d] of [[-5.05, .62, 5.7, 3.65], [-4.9, -4.35, 5.5, 1.7], [7.53, -4.75, 2.9, 2.2], [-7.62, 3.75, 2.2, 3.6]]) {
    softShadow(lab, x, z, w, d, .56);
  }
  const beacons = stops.map((stop) => ({ ...stop, position: new T.Vector3(...stop.marker) }));
  const { player, walk, shown } = character(scene);
  player.traverse(part => { part.castShadow = false; });
  const shadow = softShadow(scene, 0, 0, 1.4, 1.16, .72);
  shadow.visible = false; // The walker's floor shadow appears with the walker.
  shown.then(() => { shadow.visible = true; });
  return { scene, player, shadow, walk, beacons, showPaper };
}
