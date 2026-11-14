import * as T from "./assets/three/three.module.min.js";
import { material } from "./lab-materials.js";

// Visual reference: the UT AlphaTruck photos on AMRL's OptCar project page.
// The truck is a 1/5-scale Traxxas X-Maxx; scene units are about 3.3 times its real size.
// Its front faces +z.
const chassis = material(0x232629, .55, .2);
const plastic = material(0x353a3d, .62, .08);
const rubber = material(0x2b2c2e, .9);
const tread = material(0x3b3c3d, .86);
const anodized = material(0x76cf2a, .3, .55);
const beadlock = material(0xbd2637, .36, .5);
const silver = material(0xbcc0ba, .3, .65);
const fitting = material(0x1d1f21, .55);
const printed = material(0xf1f0ea, .6);
const imu = material(0xb5212d, .4, .3);
const lens = material(0x101418, .15, .5);
const dome = material(0x1a3a5a, .08, .35);
const orange = material(0xe07a2c, .5);
const yellow = material(0xe9b52b, .5);
const circuit = material(0x2a5246, .6);
const acrylic = new T.MeshStandardMaterial({ color: 0xe2ecec, roughness: .08, transparent: true, opacity: .38 });
const boxShape = new T.BoxGeometry();
const tubeShape = new T.CylinderGeometry(1, 1, 1, 22);
const upright = new T.Vector3(0, 1, 0);
const radius = .35;

function mesh(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1) {
  const result = new T.Mesh(geometry, finish);
  result.position.set(x, y, z);
  result.scale.set(sx, sy, sz);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

const box = (parent, finish, x, y, z, w, h, d) => mesh(parent, boxShape, finish, x, y, z, w, h, d);
const tube = (parent, finish, x, y, z, r, h) => mesh(parent, tubeShape, finish, x, y, z, r, h, r);

function bar(parent, finish, from, to, r) {
  const start = new T.Vector3(...from);
  const axis = new T.Vector3(...to).sub(start);
  const joint = tube(parent, finish, ...start.addScaledVector(axis, .5).toArray(), r, axis.length());
  joint.quaternion.setFromUnitVectors(upright, axis.normalize());
  return joint;
}

function wire(parent, finish, points, r) {
  const curve = new T.CatmullRomCurve3(points.map((point) => new T.Vector3(...point)));
  mesh(parent, new T.TubeGeometry(curve, 24, r, 7), finish, 0, 0, 0);
}

function wheel(parent, x, z) {
  const out = Math.sign(x);
  const hub = new T.Group();
  hub.position.set(x, radius, z);
  if (z > 0) hub.rotation.y = .12;
  parent.add(hub);
  mesh(hub, new T.CylinderGeometry(.325, .325, .36, 40), rubber, 0, 0, 0).rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    mesh(hub, new T.TorusGeometry(.29, .05, 10, 36), rubber, side * .155, 0, 0).rotation.y = Math.PI / 2;
  }
  tube(hub, plastic, out * .172, 0, 0, .205, .03).rotation.z = Math.PI / 2;
  mesh(hub, new T.TorusGeometry(.198, .028, 10, 40), beadlock, out * .19, 0, 0).rotation.y = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    box(hub, chassis, out * .19, Math.cos(angle) * .095, Math.sin(angle) * .095, .03, .16, .05).rotation.x = angle;
  }
  tube(hub, silver, out * .2, 0, 0, .045, .035).rotation.z = Math.PI / 2;
  const lugs = new T.InstancedMesh(boxShape, tread, 84);
  const lug = new T.Object3D();
  for (let i = 0; i < 84; i++) {
    const row = i % 4;
    const angle = (Math.floor(i / 4) + (row % 2) * .5) * Math.PI * 2 / 21;
    lug.position.set((row - 1.5) * .088, Math.cos(angle) * .338, Math.sin(angle) * .338);
    lug.rotation.set(angle, 0, 0);
    lug.scale.set(.074, .042, .082);
    lug.updateMatrix();
    lugs.setMatrixAt(i, lug.matrix);
  }
  lugs.castShadow = true;
  lugs.receiveShadow = true;
  hub.add(lugs);
}

function suspension(parent, side, z) {
  const hub = [side * .64, .36, z];
  for (const offset of [-.15, .15]) bar(parent, chassis, [side * .3, .31, z + offset], hub, .028);
  for (const offset of [-.09, .09]) bar(parent, chassis, [side * .3, .52, z + offset], [side * .62, .47, z], .022);
  box(parent, plastic, side * .63, .41, z, .07, .22, .12);
  // Lime shock body on top, black coil spring below.
  const low = new T.Vector3(side * .56, .36, z * .86);
  const high = new T.Vector3(side * .34, 1.0, z * .8);
  const axis = high.clone().sub(low);
  const shock = new T.Group();
  shock.position.copy(low);
  shock.quaternion.setFromUnitVectors(upright, axis.clone().normalize());
  parent.add(shock);
  const length = axis.length();
  tube(shock, silver, 0, length * .3, 0, .017, length * .6);
  tube(shock, anodized, 0, length * .72, 0, .048, length * .5);
  tube(shock, anodized, 0, length * .47, 0, .062, .03);
  const coil = Array.from({ length: 46 }, (_, i) => {
    const t = i / 45;
    return [.07 * Math.cos(t * Math.PI * 11), .04 + length * .42 * t, .07 * Math.sin(t * Math.PI * 11)];
  });
  wire(shock, fitting, coil, .012);
}

export function alphaTruck(scene, x, z, heading) {
  const truck = new T.Group();
  truck.position.set(x, .052, z);
  truck.rotation.y = heading;
  scene.add(truck);

  // Chassis tub, battery trays, and bumpers.
  box(truck, chassis, 0, .36, 0, .62, .16, 1.9);
  for (const side of [-1, 1]) {
    box(truck, plastic, side * .46, .43, -.05, .3, .19, 1.02);
    box(truck, chassis, side * .46, .535, -.05, .32, .025, 1.06);
  }
  box(truck, chassis, 0, .44, 1.2, .96, .17, .2);
  for (const side of [-1, 1]) box(truck, chassis, side * .42, .45, 1.06, .16, .2, .3).rotation.y = side * .5;
  box(truck, plastic, 0, .3, 1.04, .5, .07, .34).rotation.x = .38;
  box(truck, chassis, 0, .46, -1.15, .78, .14, .16);
  for (const z of [.62, -.62]) {
    box(truck, chassis, 0, .78, z, .82, .4, .07);
    box(truck, plastic, 0, 1.0, z, .86, .06, .1);
  }
  for (const side of [-1, 1]) {
    for (const z of [-.8, .8]) {
      wheel(truck, side * .8, z);
      suspension(truck, side, z);
    }
  }

  // Electronics deck: clear plate, IMU, power board, and compute.
  box(truck, acrylic, 0, .58, .14, .62, .025, .7);
  box(truck, imu, .13, .62, .3, .13, .05, .11);
  box(truck, circuit, -.12, .605, .3, .26, .02, .22);
  box(truck, plastic, -.18, .5, -.48, .16, .09, .2);
  box(truck, yellow, -.05, .55, -.42, .07, .05, .06);
  wire(truck, orange, [[-.12, .52, -.46], [-.04, .6, -.36], [.06, .6, -.3], [.12, .59, -.18]], .016);
  wire(truck, orange, [[-.12, .5, -.5], [.0, .57, -.52], [.1, .6, -.46], [.16, .6, -.3]], .016);
  box(truck, plastic, 0, .82, -.12, .5, .38, .46);
  for (let i = 0; i < 9; i++) box(truck, chassis, -.2 + i * .05, .84, .12, .018, .3, .035);

  // Sensor head: white bracket, stereo camera, and Livox Mid-360 lidar.
  box(truck, chassis, 0, 1.05, -.06, .44, .08, .44);
  box(truck, printed, 0, .99, .16, .56, .09, .1);
  box(truck, chassis, 0, 1.0, .24, .46, .085, .09);
  for (const x of [-.15, -.05, .05, .15]) tube(truck, lens, x, 1.0, .29, .026, .02).rotation.x = Math.PI / 2;
  box(truck, plastic, 0, 1.2, -.05, .38, .22, .38);
  for (const y of [1.13, 1.18, 1.23, 1.28]) box(truck, silver, 0, y, -.05, .39, .014, .39);
  tube(truck, silver, 0, 1.325, -.05, .16, .03);
  mesh(truck, new T.SphereGeometry(.15, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 1.34, -.05);
  wire(truck, fitting, [[-.2, .95, -.3], [-.26, 1.05, -.2], [-.2, 1.16, -.12]], .014);
  wire(truck, fitting, [[.2, .7, .1], [.27, .86, .18], [.21, .98, .24]], .012);
  return truck;
}
