import * as T from "./assets/three/three.module.min.js";
import { material } from "./lab-materials.js";

// Illustrative geometry based on the F10 images and viewer on skydio.com/f10.
const shell = new T.MeshPhysicalMaterial({ color: 0x9ea8ad, roughness: .34, metalness: .12, clearcoat: .3 });
const blue = new T.MeshPhysicalMaterial({ color: 0x1870cc, roughness: .37, clearcoat: .32 });
const seams = material(0x58646c, .59);
const black = material(0x222932, .43, .17);
const alloy = material(0x88949c, .34, .5);
const glass = new T.MeshPhysicalMaterial({ color: 0x122d52, metalness: .34, roughness: .14, clearcoat: .8 });
const ball = new T.SphereGeometry(1, 24, 16);
const box = new T.BoxGeometry();
const cylinder = new T.CylinderGeometry(1, 1, 1, 24);

function part(parent, geometry, finish, x = 0, y = 0, z = 0, w = 1, h = 1, d = 1) {
  const mesh = new T.Mesh(geometry, finish);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function loft(rings, segments, reverse = false, finishAt = () => 0) {
  const positions = [];
  const geometry = new T.BufferGeometry();
  const indices = [];
  function triangle(a, b, c) {
    indices.push(a, reverse ? c : b, reverse ? b : c);
  }
  for (const ring of rings) positions.push(...ring.flat());
  const end = (rings.length - 1) * segments;
  for (let band = 0; band < segments; band++) {
    const start = indices.length;
    const next = (band + 1) % segments;
    for (let row = 0; row < rings.length - 1; row++) {
      const a = row * segments + band;
      const b = row * segments + next;
      triangle(a, b, a + segments);
      triangle(b, b + segments, a + segments);
    }
    const finish = finishAt(band);
    const previous = geometry.groups.at(-1);
    if (previous?.materialIndex === finish) previous.count += indices.length - start;
    else geometry.addGroup(start, indices.length - start, finish);
  }
  const capStart = indices.length;
  for (let i = 1; i < segments - 1; i++) {
    triangle(0, i + 1, i);
    triangle(end, end + i, end + i + 1);
  }
  geometry.addGroup(capStart, indices.length - capStart, 0);
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function pod(sections, steps = 38, segments = 32) {
  const rings = [];
  for (let row = 0; row <= steps; row++) {
    const u = row / steps * (sections.length - 1);
    const i = Math.min(Math.floor(u), sections.length - 2);
    const t = u - i;
    const [z, width, height, center] = sections[i].map((a, col) => {
      const b = sections[i + 1][col];
      if (col === 0) return T.MathUtils.lerp(a, b, t);
      const before = sections[Math.max(0, i - 1)][col];
      const after = sections[Math.min(i + 2, sections.length - 1)][col];
      return a + .5 * t * ((b - before) + t * ((2 * before - 5 * a + 4 * b - after) + t * (3 * a - 3 * b + after - before)));
    });
    rings.push(Array.from({ length: segments }, (_, index) => {
      const angle = index / segments * 2 * Math.PI;
      return [Math.cos(angle) * width, center + Math.sin(angle) * height, z];
    }));
  }
  const geometry = loft(rings, segments);
  geometry.clearGroups();
  return geometry;
}

const fuselage = pod([
  [-.985, .006, .01, .073], [-.89, .055, .047, .053], [-.65, .125, .085, .013],
  [-.29, .174, .115, 0], [.16, .166, .103, .004], [.55, .148, .089, .003],
  [.8, .114, .068, .003], [.895, .059, .042, .01], [.916, .008, .012, .01]
]);
const nacelle = pod([
  [-.25, .006, .009, .019], [-.14, .065, .049, .036], [.05, .097, .075, .046],
  [.21, .098, .086, .05], [.28, .079, .071, .05]
], 23, 24);

function wing(parent, side, tip) {
  const sections = [
    [.11, .34, -.34, .073], [.33, .25, -.325, .059], [.66, .211, -.348, .044],
    [tip * .76, .178, -.435, .034], [tip - .12, .132, -.485, .025], [tip, .111, -.47, .018]
  ];
  const bands = 48;
  const rings = sections.map(([span, leading, trailing, thickness]) =>
    Array.from({ length: bands }, (_, i) => {
      const angle = i * Math.PI * 2 / bands;
      const chord = .5 - .5 * Math.cos(angle);
      const y = Math.sin(angle) * thickness * (.65 + .35 * (1 - chord));
      return [span * side, y + span * .014, T.MathUtils.lerp(leading, trailing, chord)];
    }));
  const geometry = loft(rings, bands, side > 0, (band) => band >= 17 && band < 31 ? 1 : 0);
  part(parent, geometry, [shell, blue]);
  const line = new T.Line(
    new T.BufferGeometry().setFromPoints(sections.slice(1).map(([x, front, rear, height]) =>
      new T.Vector3(x * side, height * .64 + x * .014 + .004, T.MathUtils.lerp(front, rear, .71)))),
    new T.LineBasicMaterial({ color: 0x4c575e, transparent: true, opacity: .68 })
  );
  parent.add(line);
}

function motor(parent, x, z, angle) {
  part(parent, nacelle, shell, x, .014, z);
  part(parent, cylinder, alloy, x, .063, z + .285, .082, .075, .082).rotation.x = Math.PI / 2;
  part(parent, ball, black, x, .063, z + .343, .073, .074, .105);
  const propeller = new T.Group();
  propeller.position.set(x, .063, z + .327);
  propeller.rotation.z = angle;
  parent.add(propeller);
  for (const side of [-1, 1]) {
    const blade = part(propeller, ball, black, side * .176, side * .02, 0, .145, .022, .013);
    blade.rotation.z = .13;
  }
}

function tipCamera(parent) {
  const x = 1.915;
  part(parent, ball, shell, x - .027, .067, -.16, .065, .089, .329);
  part(parent, ball, alloy, x + .003, -.016, .086, .092, .088, .12);
  part(parent, ball, shell, x + .018, -.07, .156, .097, .105, .101);
  for (const [dx, dy, radius] of [[-.028, -.02, .022], [.031, -.017, .019], [.004, .029, .022]]) {
    const lens = part(parent, cylinder, glass, x + dx + .019, -.064 + dy, .245, radius, .019, radius);
    lens.rotation.x = Math.PI / 2;
  }
}

export function skydioF10(parent) {
  const craft = new T.Group();
  craft.position.set(-.13, 1.48, -.04);
  craft.rotation.y = -.24;
  craft.scale.setScalar(.9);
  parent.add(craft);

  part(craft, fuselage, shell);
  wing(craft, 1, 1.91);
  wing(craft, -1, 1.54);
  motor(craft, -.995, .128, -.13);
  motor(craft, 1.245, .095, .18);
  tipCamera(craft);
  for (const side of [-1, 1]) {
    const sensor = part(craft, ball, black, side * .09, .024, .804, .043, .03, .07);
    sensor.rotation.y = -side * .21;
    part(craft, ball, glass, side * .09, .027, .86, .019, .019, .018);
  }
  part(craft, box, seams, 0, .106, -.49, .10, .013, .046);
  part(craft, box, blue, -.015, .117, -.5, .015, .01, .025);
}
