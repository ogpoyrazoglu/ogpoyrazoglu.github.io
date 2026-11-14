const exhibits = [
  {
    title: "Harbor", type: "Marine robotics",
    text: "An autonomous surface vessel follows waypoints with wind and currents pushing it off course. Paths need room for safe turns and clearance around the dock.",
    link: ["Browse motion-planning research", "./#research"]
  },
  {
    title: "Rover yard", type: "Mobile land robotics",
    text: "A wheeled rover has to plan paths it can actually drive. My C-Uniform research explores how to sample the rover’s reachable configurations, including paths around obstacles.",
    link: ["Explore C-Uniform sampling", "https://ogpoyrazoglu.github.io/cuniform_sampling/"]
  },
  {
    title: "Drone pad", type: "Aerial robotics",
    text: "A quadrotor can route above or around an obstacle. Its planner needs clearance in three dimensions while the controller keeps the aircraft stable.",
    link: ["Browse motion-planning research", "./#research"]
  },
  {
    title: "Legged-robot trail", type: "Legged robotics",
    text: "On uneven terrain, a legged robot plans both where to go and where to put its feet. A clear route still needs stable footholds.",
    link: ["Browse motion-planning research", "./#research"]
  }
];
const home = {
  title: "Trailhead", type: "Field guide",
  text: "Follow the road from the harbor to the foothills. Each stop introduces a different kind of robot.",
  link: ["See my research", "./#research"]
};
const canvas = document.querySelector("#map");
const frame = document.querySelector(".map-frame");
const status = document.querySelector("#scene-status");
const locationLabel = document.querySelector("#map-location");
const title = document.querySelector("#exhibit-title");
const type = document.querySelector("#exhibit-type");
const copy = document.querySelector("#exhibit-copy");
const link = document.querySelector("#exhibit-link");
const cameraButton = document.querySelector("#camera");
const resetButton = document.querySelector("#reset");
const pad = [...document.querySelectorAll("[data-direction]")];
const stops = [...document.querySelectorAll("[data-stop]")];
let current = -1;
let driveToStop = () => {};
let markers = [];

function showExhibit(index) {
  if (current === index) return;
  current = index;
  const item = exhibits[index] ?? home;
  title.textContent = item.title;
  type.textContent = item.type;
  copy.textContent = item.text;
  link.firstChild.textContent = item.link[0] + " ";
  link.href = item.link[1];
  stops.forEach((button, i) => {
    for (const control of [button, markers[i]].filter(Boolean)) {
      if (i === index) control.setAttribute("aria-current", "location");
      else control.removeAttribute("aria-current");
    }
  });
}

stops.forEach((button, index) => {
  button.addEventListener("click", () => {
    showExhibit(index);
    driveToStop(index);
  });
});

async function start() {
  try {
    const world = await import("./world-scene.js");
    const context = canvas.getContext("webgl2", { antialias: true });
    if (!context) throw new Error("WebGL 2 is unavailable");
    startDriving(world, context);
    status.hidden = true;
    for (const button of [cameraButton, resetButton, ...pad]) button.disabled = false;
  } catch (error) {
    console.warn("3D field station unavailable", error);
    status.textContent = "The 3D scene couldn’t load. You can still browse the exhibits using the stop list.";
  }
}

function startDriving({ T, trail, buildWorld, canDrive }, context) {
  const { scene, player, shadow, vessel, aircraft, beacons } = buildWorld();
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const camera = new T.PerspectiveCamera(44, 1, .1, 180);
  const cameraGoal = new T.Vector3();
  const gaze = new T.Vector3();
  const gazeGoal = new T.Vector3();
  const projection = new T.Vector3();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const held = new Map();
  const keyDirection = {
    w: "up", arrowup: "up", a: "left", arrowleft: "left",
    s: "down", arrowdown: "down", d: "right", arrowright: "right"
  };
  const lengths = [0];
  for (let i = 1; i < trail.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]));
  }
  const end = lengths.at(-1);
  let overview = false;
  let heading = 0;
  let speed = 0;
  let progress = 0;
  let target = 0;
  let touring = false;
  let approach = null;
  let selectedStop = -1;
  let interrupted = false;

  markers = beacons.map((_, i) => {
    const marker = document.createElement("button");
    marker.className = `map-marker stop-${i}`;
    marker.type = "button";
    marker.setAttribute("aria-label", `Visit ${exhibits[i].title}`);
    const number = document.createElement("span");
    number.textContent = i + 1;
    marker.append(number);
    marker.addEventListener("click", () => stops[i].click());
    document.querySelector("#map-markers").append(marker);
    return marker;
  });

  function pointAt(distance) {
    const next = lengths.findIndex((value, i) => i > 0 && value >= distance);
    if (next < 0) return trail.at(-1);
    const fraction = (distance - lengths[next - 1]) / (lengths[next] - lengths[next - 1]);
    const [x, z] = trail[next - 1];
    return [T.MathUtils.lerp(x, trail[next][0], fraction), T.MathUtils.lerp(z, trail[next][1], fraction)];
  }

  function nearestRoad() {
    let closest = Infinity;
    let roadPosition = progress;
    for (let i = 1; i < trail.length; i++) {
      const [x, z] = trail[i - 1];
      const dx = trail[i][0] - x;
      const dz = trail[i][1] - z;
      const fraction = T.MathUtils.clamp(((player.position.x - x) * dx + (player.position.z - z) * dz) / (dx * dx + dz * dz), 0, 1);
      const separation = Math.hypot(player.position.x - x - dx * fraction, player.position.z - z - dz * fraction);
      const candidate = T.MathUtils.lerp(lengths[i - 1], lengths[i], fraction);
      if (separation + .001 < closest || (Math.abs(separation - closest) < .001 && Math.abs(candidate - progress) < Math.abs(roadPosition - progress))) {
        closest = separation;
        roadPosition = candidate;
      }
    }
    return roadPosition;
  }

  function setPosition(x, z) {
    const dx = x - player.position.x;
    const dz = z - player.position.z;
    if (Math.hypot(dx, dz) > .001) heading = Math.atan2(-dx, -dz);
    player.position.set(x, 0, z);
  }

  function tourTo(distance) {
    if (!touring) {
      progress = nearestRoad();
      approach = pointAt(progress);
    }
    held.clear();
    speed = 0;
    target = distance;
    touring = true;
    if (reducedMotion.matches) {
      setPosition(...pointAt(distance));
      progress = distance;
      approach = null;
    }
  }

  driveToStop = (i) => {
    selectedStop = i;
    tourTo(lengths[beacons[i].point]);
  };

  function steer(direction, key) {
    held.set(key, direction);
    touring = false;
    approach = null;
    selectedStop = -1;
  }

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || ![canvas, document.body].includes(event.target)) return;
    const key = event.key.toLowerCase();
    if (!keyDirection[key] || interrupted) return;
    event.preventDefault();
    steer(keyDirection[key], key);
  });
  window.addEventListener("keyup", (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => held.clear());
  canvas.addEventListener("blur", () => {
    for (const key of Object.keys(keyDirection)) held.delete(key);
  });
  frame.addEventListener("wheel", (event) => {
    if (interrupted || event.ctrlKey || event.metaKey) return;
    const delta = event.deltaY || event.deltaX;
    const base = touring ? target : nearestRoad();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
    const destination = T.MathUtils.clamp(base + delta * scale * .095, 0, end);
    if (base === destination) return;
    event.preventDefault();
    selectedStop = -1;
    tourTo(destination);
  }, { passive: false });
  for (const button of pad) {
    const direction = button.dataset.direction;
    const key = `touch-${direction}`;
    button.addEventListener("pointerdown", (event) => {
      button.setPointerCapture(event.pointerId);
      steer(direction, key);
    });
    button.addEventListener("lostpointercapture", () => held.delete(key));
    button.addEventListener("click", (event) => {
      if (event.detail !== 0) return;
      steer(direction, key);
      window.setTimeout(() => held.delete(key), 155);
    });
  }

  cameraButton.addEventListener("click", () => {
    overview = !overview;
    cameraButton.setAttribute("aria-pressed", String(overview));
    cameraButton.textContent = overview ? "Chase camera" : "Overview";
  });
  function reset() {
    held.clear();
    speed = 0;
    heading = 0;
    target = 0;
    progress = 0;
    touring = false;
    approach = null;
    selectedStop = -1;
    player.position.set(trail[0][0], 0, trail[0][1]);
    showExhibit(-1);
  }
  resetButton.addEventListener("click", reset);
  reset();

  function resize() {
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(frame);
  resize();

  function animateDrive(dt) {
    if (touring && approach) {
      const [x, z] = approach;
      const remaining = Math.hypot(x - player.position.x, z - player.position.z);
      const t = remaining ? Math.min(1, dt * 13 / remaining) : 1;
      const nextX = T.MathUtils.lerp(player.position.x, x, t);
      const nextZ = T.MathUtils.lerp(player.position.z, z, t);
      if (!canDrive(nextX, nextZ)) {
        setPosition(x, z);
        approach = null;
        return;
      }
      setPosition(nextX, nextZ);
      if (t === 1) approach = null;
      return;
    }
    if (touring) {
      progress += T.MathUtils.clamp(target - progress, -dt * 19, dt * 19);
      setPosition(...pointAt(progress));
      return;
    }
    const pressed = [...held.values()];
    const throttle = Number(pressed.includes("up")) - Number(pressed.includes("down"));
    const turn = Number(pressed.includes("left")) - Number(pressed.includes("right"));
    speed = T.MathUtils.damp(speed, throttle * (throttle < 0 ? 5.5 : 12.5), throttle ? 4.8 : 7, dt);
    if (Math.abs(speed) < .012) speed = 0;
    heading += turn * dt * 1.75 * (speed < -.05 ? -1 : 1);
    const dx = -Math.sin(heading) * speed * dt;
    const dz = -Math.cos(heading) * speed * dt;
    if (canDrive(player.position.x + dx, player.position.z)) player.position.x += dx;
    if (canDrive(player.position.x, player.position.z + dz)) player.position.z += dz;
  }

  function aimCamera(dt) {
    if (overview) {
      const distance = Math.max(1, 1.35 / camera.aspect);
      cameraGoal.set(25 * distance, 59 * distance, 51 * distance);
      gazeGoal.set(0, 0, -4);
    } else {
      const x = player.position.x;
      const z = player.position.z;
      const backX = Math.sin(heading);
      const backZ = Math.cos(heading);
      const side = backZ * 3.25;
      cameraGoal.set(x + backX * 9.4 + side, 6.7, z + backZ * 9.4 - backX * 3.25);
      gazeGoal.set(x - backX * 4.7, .7, z - backZ * 4.7);
    }
    const blend = dt === 0 || reducedMotion.matches ? 1 : 1 - Math.exp(-dt * (overview ? 4.8 : 5.2));
    camera.position.lerp(cameraGoal, blend);
    gaze.lerp(gazeGoal, blend);
    camera.lookAt(gaze);
    camera.updateMatrixWorld();
  }

  function updateMarkers() {
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    beacons.forEach(({ base }, i) => {
      projection.copy(base.position);
      projection.y = 2.7;
      projection.project(camera);
      const left = (projection.x + 1) * w / 2;
      const top = (1 - projection.y) * h / 2;
      const visible = projection.z > -1 && projection.z < 1 && left > 21 && left < w - 21 && top > 21 && top < h - 21;
      markers[i].hidden = !visible;
      if (visible) markers[i].style.transform = `translate(${left - 22}px, ${top - 22}px)`;
    });
  }

  function render(now, dt) {
    animateDrive(dt);
    const nearby = beacons.findIndex(({ point }) => {
      const [x, z] = trail[point];
      return Math.hypot(x - player.position.x, z - player.position.z) < 3;
    });
    if (nearby >= 0 && (selectedStop < 0 || nearby === selectedStop)) showExhibit(nearby);
    const atStart = Math.hypot(player.position.x - trail[0][0], player.position.z - trail[0][1]) < 3;
    const place = exhibits[nearby]?.title ?? (atStart ? "Trailhead" : "On the road");
    if (locationLabel.textContent !== place) locationLabel.textContent = place;
    player.rotation.y = heading;
    shadow.position.x = player.position.x;
    shadow.position.z = player.position.z;
    shadow.rotation.y = heading;
    const time = reducedMotion.matches ? 0 : now / 1000;
    vessel.position.y = -.26 + Math.sin(time * 1.4) * .09;
    vessel.rotation.z = Math.sin(time * 1.2) * .035;
    aircraft.craft.position.y = 2.55 + Math.sin(time * 1.4) * .22;
    aircraft.rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i % 2 ? 19 : -19); });
    aimCamera(dt);
    updateMarkers();
    renderer.render(scene, camera);
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    interrupted = true;
    held.clear();
    status.textContent = "The 3D scene paused while the browser reconnects to graphics.";
    status.hidden = false;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    interrupted = false;
    status.hidden = true;
  });

  let lastFrame = performance.now();
  render(lastFrame, 0);
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(.04, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!interrupted) render(now, dt);
  });
}

start();
