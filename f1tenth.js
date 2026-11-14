import * as T from "./assets/three/three.module.min.js";
import { material } from "./lab-materials.js";

// Visual reference: the open-chassis racer in the C-Uniform paper's setup photo.
const frame = material(0x23282b, .48, .24);
const rubber = material(0x25262a, .86);
const tread = material(0x363839, .82);
const metal = material(0x8a9190, .33, .63);
const plywood = material(0xd9ae66, .65);
const circuit = material(0x294f43, .62);
const red = material(0xc24c31, .53);
const blue = material(0x365b91, .57);
const silver = material(0xced0c1, .34, .39);
const yellow = material(0xe8a226, .57);
const boxShape = new T.BoxGeometry();
const tubeShape = new T.CylinderGeometry(1, 1, 1, 24);
const upright = new T.Vector3(0, 1, 0);

function mesh(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1) {
  const result = new T.Mesh(geometry, finish);
  result.position.set(x, y, z);
  result.scale.set(sx, sy, sz);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function box(parent, finish, x, y, z, w, h, d) {
  return mesh(parent, boxShape, finish, x, y, z, w, h, d);
}

function tube(parent, finish, x, y, z, radius, height) {
  return mesh(parent, tubeShape, finish, x, y, z, radius, height, radius);
}

function wire(parent, finish, points, radius) {
  const curve = new T.CatmullRomCurve3(points.map((point) => new T.Vector3(...point)));
  mesh(parent, new T.TubeGeometry(curve, 20, radius, 7), finish, 0, 0, 0);
}

function bar(parent, finish, from, to, radius) {
  const start = new T.Vector3(...from);
  const axis = new T.Vector3(...to).sub(start);
  const midpoint = start.addScaledVector(axis, .5);
  const joint = tube(parent, finish, ...midpoint.toArray(), radius, axis.length());
  joint.quaternion.setFromUnitVectors(upright, axis.normalize());
}

function tire(parent, x, z) {
  const tire = new T.Group();
  tire.position.set(x, .295, z);
  if (z < 0) tire.rotation.y = -.105;
  parent.add(tire);
  const shoulder = new T.CylinderGeometry(.279, .279, .223, 42);
  mesh(tire, shoulder, rubber, 0, 0, 0).rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    mesh(tire, new T.TorusGeometry(.238, .037, 10, 34), rubber, side * .106, 0, 0).rotation.y = Math.PI / 2;
    tube(tire, frame, side * .127, 0, 0, .171, .022).rotation.z = Math.PI / 2;
    tube(tire, metal, side * .143, 0, 0, .051, .027).rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    const spoke = box(tire, metal, Math.sign(x) * .143, Math.cos(angle) * .103, Math.sin(angle) * .103, .016, .109, .022);
    spoke.rotation.x = angle;
  }
  const lugs = new T.InstancedMesh(boxShape, tread, 54);
  const lug = new T.Object3D();
  for (let i = 0; i < 54; i++) {
    const row = i % 3 - 1;
    const angle = (Math.floor(i / 3) + row * .33) * Math.PI / 9;
    lug.position.set(row * .071, Math.cos(angle) * .28, Math.sin(angle) * .28);
    lug.rotation.set(angle, row * .26, 0);
    lug.scale.set(.059, .026, .057);
    lug.updateMatrix();
    lugs.setMatrixAt(i, lug.matrix);
  }
  lugs.castShadow = true;
  lugs.receiveShadow = true;
  tire.add(lugs);
}

function suspension(parent, side, z) {
  const low = [side * .545, .28, z + .015];
  const high = [side * .282, .665, z + .015];
  bar(parent, frame, [side * .18, .27, z - .14], low, .036);
  bar(parent, frame, [side * .22, .31, z + .17], low, .033);
  bar(parent, blue, low, high, .037);
  const direction = new T.Vector3(...high).sub(new T.Vector3(...low));
  const turn = new T.Quaternion().setFromUnitVectors(upright, direction.clone().normalize());
  const spring = new T.Group();
  spring.position.set(...low);
  spring.quaternion.copy(turn);
  parent.add(spring);
  const coil = Array.from({ length: 55 }, (_, i) => {
    const t = i / 54;
    return [.054 * Math.cos(t * Math.PI * 13), .04 + direction.length() * .82 * t, .054 * Math.sin(t * Math.PI * 13)];
  });
  wire(spring, silver, coil, .011);
}

export function f1tenthRacer(scene, x, z) {
  const car = new T.Group();
  car.position.set(x, .052, z);
  car.rotation.y = -.39;
  scene.add(car);
  box(car, frame, 0, .246, 0, .89, .125, 2.24);
  box(car, plywood, 0, .555, .01, .83, .055, 1.52);
  for (const side of [-1, 1]) {
    bar(car, frame, [side * .4, .36, -1.11], [side * .4, .36, 1.12], .047);
    for (const z of [-.69, .70]) {
      tire(car, side * .645, z);
      suspension(car, side, z);
      bar(car, metal, [side * .34, .31, z], [side * .34, .543, z], .031);
    }
  }
  for (const side of [-1, 1]) {
    const rear = side < 0;
    const z = side * 1.105;
    wire(car, frame, [[-.52, .37, z], [-.45, .61, z * 1.02], [.45, .61, z * 1.02], [.52, .37, z]], .036);
    bar(car, frame, [-.48, .39, z * 1.058], [.48, .39, z * 1.058], .053);
    for (const edge of [-1, 1]) {
      bar(car, frame, [edge * .15, .39, z * 1.058], [edge * .4, .57, z], .026);
      if (!rear) box(car, red, edge * .43, .594, z * 1.028, .105, .073, .048);
    }
  }
  box(car, circuit, .04, .609, -.21, .53, .026, .68);
  box(car, metal, .04, .644, -.24, .161, .025, .18);
  for (const side of [-1, 1]) {
    for (let pin = 0; pin < 8; pin++) box(car, silver, side * .161 + .04, .635, -.438 + pin * .051, .035, .023, .022);
  }
  box(car, blue, -.19, .656, .353, .26, .132, .39);
  box(car, frame, .21, .68, .39, .21, .188, .32);
  tube(car, frame, .02, .706, -.57, .157, .274);
  tube(car, yellow, .02, .856, -.57, .153, .029);
  tube(car, silver, -.3, .746, .52, .015, .356);
  box(car, yellow, .33, .64, .08, .15, .075, .1);
  const leads = [
    [red, [[.3, .66, .42], [.36, .835, .30], [.24, .82, .06], [.31, .66, .1]]],
    [frame, [[.23, .70, .47], [.37, .76, .38], [.37, .74, -.21], [.16, .63, -.25]]],
    [silver, [[-.18, .658, -.42], [-.285, .72, -.24], [-.29, .74, .09], [-.19, .71, .25]]],
    [blue, [[-.06, .65, .48], [-.015, .77, .25], [.05, .738, .10], [.095, .63, .08]]]
  ];
  for (const [finish, points] of leads) wire(car, finish, points, .014);
}
