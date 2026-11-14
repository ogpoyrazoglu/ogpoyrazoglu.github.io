import * as T from "./assets/three/three.module.min.js";
import { material } from "./lab-materials.js";

// Visual reconstruction from Blue Robotics’ public BR-101447 drawing and product photos.
// Dimensions are illustrative and enlarged for the lab exhibit.
const hullFinish = new T.MeshPhysicalMaterial({ color: 0x2958b6, roughness: .3, clearcoat: .31, clearcoatRoughness: .39 });
const rubber = material(0x171d23, .68);
const nylon = material(0x262e32, .47);
const aluminum = material(0x838d94, .35, .8);
const stainless = material(0xb9c0c0, .22, .85);
const flagColor = new T.MeshStandardMaterial({ color: 0xec6433, roughness: .9, side: T.DoubleSide });
const boxGeometry = new T.BoxGeometry();
const tubeGeometry = new T.CylinderGeometry(.5, .5, 1, 20);
const screwGeometry = new T.CylinderGeometry(.5, .5, 1, 6);

function part(group, shape, finish, x, y, z, w, h, d) {
  const model = new T.Mesh(shape, finish);
  model.position.set(x, y, z);
  model.scale.set(w, h, d);
  model.castShadow = true;
  model.receiveShadow = true;
  group.add(model);
  return model;
}

function box(group, finish, x, y, z, w, h, d) {
  return part(group, boxGeometry, finish, x, y, z, w, h, d);
}

function tube(group, finish, x, y, z, width, height) {
  return part(group, tubeGeometry, finish, x, y, z, width, height, width);
}

function formedSurface(sections, profile, lengthSteps, ringSteps) {
  const position = [];
  const index = [];
  for (let row = 0; row <= lengthSteps; row++) {
    const u = row / lengthSteps * (sections.length - 1);
    const i = Math.min(Math.floor(u), sections.length - 2);
    const t = u - i;
    const [z, width, bottom, deck] = sections[i].map((a, col) => {
      const b = sections[i + 1][col];
      if (col === 0) return T.MathUtils.lerp(a, b, t);
      const prev = sections[Math.max(0, i - 1)][col];
      const next = sections[Math.min(sections.length - 1, i + 2)][col];
      return a + .5 * t * ((b - prev) + t * ((2 * prev - 5 * a + 4 * b - next) + t * (3 * a - 3 * b + next - prev)));
    });
    for (let step = 0; step < ringSteps; step++) {
      const [x, y] = profile(step * Math.PI * 2 / ringSteps);
      position.push(x * width, T.MathUtils.lerp(bottom, deck, y), z);
      if (row === 0) continue;
      const a = (row - 1) * ringSteps + step;
      const b = (row - 1) * ringSteps + (step + 1) % ringSteps;
      index.push(a, a + ringSteps, b, b, a + ringSteps, b + ringSteps);
    }
  }
  for (let i = 1; i < ringSteps - 1; i++) {
    const end = lengthSteps * ringSteps;
    index.push(0, i + 1, i, end, end + i, end + i + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const hullGeometry = formedSurface([
  [-1.38, .025, .44, .55], [-1.24, .174, .23, .54], [-1.04, .239, .105, .51],
  [-.73, .279, .051, .503], [-.35, .292, .033, .493], [.22, .286, .034, .49],
  [.69, .27, .058, .49], [1.08, .235, .107, .476], [1.27, .15, .208, .442], [1.31, .055, .297, .41]
], (angle) => {
  const s = Math.sin(angle);
  return [Math.cos(angle) * (s < 0 ? .78 + .22 * (1 + s) : 1), s < 0 ? .72 * (1 + s) : .72 + .28 * Math.pow(s, .45)];
}, 70, 44);

function roundedLid(w, d, radius) {
  const x = w / 2;
  const y = d / 2;
  const outline = new T.Shape();
  outline.moveTo(-x + radius, -y);
  outline.lineTo(x - radius, -y);
  outline.quadraticCurveTo(x, -y, x, -y + radius);
  outline.lineTo(x, y - radius);
  outline.quadraticCurveTo(x, y, x - radius, y);
  outline.lineTo(-x + radius, y);
  outline.quadraticCurveTo(-x, y, -x, y - radius);
  outline.lineTo(-x, -y + radius);
  outline.quadraticCurveTo(-x, -y, -x + radius, -y);
  const shape = new T.ExtrudeGeometry(outline, { depth: .03, bevelSize: .014, bevelThickness: .012, bevelSegments: 2, curveSegments: 8 });
  shape.rotateX(-Math.PI / 2);
  return shape;
}

const gasket = roundedLid(.49, .90, .11);
const deckLid = roundedLid(.44, .84, .082);

export function blueBoat(scene) {
  const boat = new T.Group();
  boat.position.set(-6.83, 1.22, .9);
  boat.rotation.y = 1.28;
  for (const x of [-.69, .69]) {
    part(boat, hullGeometry, hullFinish, x, 0, 0, 1, 1, 1);
    part(boat, gasket, rubber, x, .5, .39, 1, 1, 1);
    part(boat, deckLid, nylon, x, .53, .39, 1, 1, 1);
    for (const z of [.087, .68]) {
      box(boat, rubber, x + Math.sign(x) * .225, .558, z, .112, .046, .116);
      box(boat, aluminum, x + Math.sign(x) * .246, .583, z, .067, .012, .065);
    }
    for (const z of [.15, .66]) for (const offset of [-.157, .157]) {
      part(boat, screwGeometry, stainless, x + offset, .574, z, .033, .012, .033);
    }
    for (const z of [-.63, .75]) box(boat, rubber, x, .033, z, .38, .085, .14);
    box(boat, rubber, x, .31, 1.188, .09, .25, .22);
    tube(boat, nylon, x, .17, 1.285, .171, .19).rotation.x = Math.PI / 2;
    const prop = new T.Group();
    prop.position.set(x, .17, 1.388);
    boat.add(prop);
    for (let i = 0; i < 3; i++) {
      const blade = new T.Mesh(new T.CapsuleGeometry(.026, .08, 3, 7), rubber);
      blade.rotation.z = i * Math.PI * 2 / 3 - .34;
      blade.position.set(-Math.sin(i * Math.PI * 2 / 3) * .07, Math.cos(i * Math.PI * 2 / 3) * .07, .014);
      prop.add(blade);
    }
    tube(boat, aluminum, x, .17, 1.414, .06, .049).rotation.x = Math.PI / 2;
  }
  for (const z of [-.67, .58]) {
    box(boat, nylon, 0, .484, z, 1.57, .086, .125);
    box(boat, aluminum, 0, .528, z, 1.37, .014, .088);
    for (const x of [-.61, -.47, -.18, 0, .18, .47, .61]) {
      tube(boat, rubber, x, .539, z, .037, .009);
      if (Math.abs(x) > .4) part(boat, screwGeometry, stainless, x, .549, z, .024, .009, .024);
    }
    for (const x of [-.45, .45]) box(boat, rubber, x, .419, z, .075, .21, .149);
  }
  box(boat, nylon, 0, .57, .58, .42, .064, .21);
  tube(boat, aluminum, .1, .917, .58, .025, .62);
  const pennant = new T.BufferGeometry();
  pennant.setAttribute("position", new T.Float32BufferAttribute([.104, 1.219, .58, .54, 1.11, .604, .104, 1.035, .58], 3));
  pennant.computeVertexNormals();
  boat.add(new T.Mesh(pennant, flagColor));
  tube(boat, rubber, -.61, .66, .74, .1, .17);
  tube(boat, nylon, -.61, .875, .74, .024, .36).rotation.z = -.075;
  scene.add(boat);
}
