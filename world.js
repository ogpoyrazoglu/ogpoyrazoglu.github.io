const exhibits = [
  {
    title: "Whiteboard", type: "Motion planning",
    text: "The sketch shows a robot sampling paths around obstacles. It checks which paths have enough clearance, starts along one, and replans as it moves.",
    link: ["See the C-Uniform project", "https://ogpoyrazoglu.github.io/cuniform_sampling/"]
  },
  {
    title: "Autonomous boat", type: "Marine robotics",
    text: "The boat on the bench represents an autonomous surface vessel. On the water it follows waypoints while accounting for wind, currents, and room to turn.",
    link: ["Browse motion-planning research", "./#research"]
  },
  {
    title: "Drone", type: "Aerial robotics",
    text: "This quadrotor has four rotors. Its planner looks for a clear path in three dimensions while its controller keeps the aircraft stable.",
    link: ["Browse motion-planning research", "./#research"]
  },
  {
    title: "Mobile land robots", type: "Ground robotics",
    text: "A wheeled rover and a tracked robot sit in the test area. Each platform can make different turns and needs a planner that samples motions it can actually execute.",
    link: ["Explore C-Uniform sampling", "https://ogpoyrazoglu.github.io/cuniform_sampling/"]
  }
];
const home = {
  title: "Lab entrance", type: "Lab tour",
  text: "Start at the whiteboard, then visit the boat bench, the drone, and the mobile robot test area.",
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
let walkToStop = () => {};
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
    walkToStop(index);
  });
});

async function start() {
  try {
    const world = await import("./world-scene.js");
    const context = canvas.getContext("webgl2", { antialias: true });
    if (!context) throw new Error("WebGL 2 is unavailable");
    startLab(world, context);
    status.hidden = true;
    for (const button of [cameraButton, resetButton, ...pad]) button.disabled = false;
  } catch (error) {
    console.warn("3D robotics lab unavailable", error);
    status.textContent = "The 3D scene couldn’t load. You can still browse the exhibits using the stop list.";
  }
}

function startLab({ T, trail, buildWorld, canWalk, routeTo }, context) {
  const { scene, player, shadow, walk, beacons } = buildWorld();
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const camera = new T.PerspectiveCamera(39, 1, .1, 100);
  const cameraGoal = new T.Vector3();
  const gaze = new T.Vector3();
  const gazeGoal = new T.Vector3();
  const projection = new T.Vector3();
  const screenRight = new T.Vector2(.937, -.349).normalize();
  const screenDown = new T.Vector2(-screenRight.y, screenRight.x);
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
  let overview = true;
  let heading = 0;
  let progress = 0;
  let target = 0;
  let touring = false;
  let approach = [];
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

  function nearestTrail() {
    let closest = Infinity;
    let trailPosition = progress;
    for (let i = 1; i < trail.length; i++) {
      const [x, z] = trail[i - 1];
      const dx = trail[i][0] - x;
      const dz = trail[i][1] - z;
      const fraction = T.MathUtils.clamp(((player.position.x - x) * dx + (player.position.z - z) * dz) / (dx * dx + dz * dz), 0, 1);
      const separation = Math.hypot(player.position.x - x - dx * fraction, player.position.z - z - dz * fraction);
      const candidate = T.MathUtils.lerp(lengths[i - 1], lengths[i], fraction);
      if (separation + .001 < closest || (Math.abs(separation - closest) < .001 && Math.abs(candidate - progress) < Math.abs(trailPosition - progress))) {
        closest = separation;
        trailPosition = candidate;
      }
    }
    return trailPosition;
  }

  function setPosition(x, z) {
    const dx = x - player.position.x;
    const dz = z - player.position.z;
    if (Math.hypot(dx, dz) > .001) heading = Math.atan2(-dx, -dz);
    player.position.set(x, 0, z);
  }

  function tourTo(distance) {
    if (!touring) {
      progress = nearestTrail();
      approach = routeTo([player.position.x, player.position.z], pointAt(progress));
      if (!approach.length) return;
    }
    held.clear();
    target = distance;
    touring = true;
    if (reducedMotion.matches) {
      setPosition(...pointAt(distance));
      progress = distance;
      approach = [];
    }
  }

  walkToStop = (i) => {
    selectedStop = i;
    tourTo(lengths[beacons[i].point]);
  };

  function move(direction, key) {
    held.set(key, direction);
    touring = false;
    approach = [];
    selectedStop = -1;
  }

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || ![canvas, document.body].includes(event.target)) return;
    const key = event.key.toLowerCase();
    if (!keyDirection[key] || interrupted) return;
    event.preventDefault();
    move(keyDirection[key], key);
  });
  window.addEventListener("keyup", (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => held.clear());
  canvas.addEventListener("blur", () => {
    for (const key of Object.keys(keyDirection)) held.delete(key);
  });
  frame.addEventListener("wheel", (event) => {
    if (interrupted || event.ctrlKey || event.metaKey) return;
    const delta = event.deltaY || event.deltaX;
    const base = touring ? target : nearestTrail();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
    const destination = T.MathUtils.clamp(base + delta * scale * .05, 0, end);
    if (base === destination) return;
    event.preventDefault();
    selectedStop = -1;
    tourTo(destination);
  }, { passive: false });
  for (const button of pad) {
    const direction = button.dataset.direction;
    const key = `touch-${direction}`;
    let started = 0;
    let releaseTimer;
    button.addEventListener("pointerdown", (event) => {
      window.clearTimeout(releaseTimer);
      started = performance.now();
      button.setPointerCapture(event.pointerId);
      move(direction, key);
    });
    button.addEventListener("lostpointercapture", () => held.delete(key));
    button.addEventListener("click", (event) => {
      if (event.detail !== 0 && performance.now() - started > 130) return;
      window.clearTimeout(releaseTimer);
      move(direction, key);
      releaseTimer = window.setTimeout(() => held.delete(key), 145);
    });
  }

  cameraButton.addEventListener("click", () => {
    overview = !overview;
    cameraButton.setAttribute("aria-pressed", String(!overview));
    cameraButton.textContent = overview ? "Follow camera" : "Lab overview";
  });
  function reset() {
    held.clear();
    heading = 0;
    target = 0;
    progress = 0;
    touring = false;
    approach = [];
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

  function animateWalk(dt) {
    if (touring && approach.length) {
      const [x, z] = approach[0];
      const remaining = Math.hypot(x - player.position.x, z - player.position.z);
      const t = remaining ? Math.min(1, dt * 4.8 / remaining) : 1;
      setPosition(T.MathUtils.lerp(player.position.x, x, t), T.MathUtils.lerp(player.position.z, z, t));
      if (t === 1) approach.shift();
      return;
    }
    if (touring) {
      progress += T.MathUtils.clamp(target - progress, -dt * 4.8, dt * 4.8);
      setPosition(...pointAt(progress));
      if (progress === target && selectedStop >= 0) heading = beacons[selectedStop].facing;
      return;
    }
    const pressed = [...held.values()];
    const horizontal = Number(pressed.includes("right")) - Number(pressed.includes("left"));
    const vertical = Number(pressed.includes("down")) - Number(pressed.includes("up"));
    if (!horizontal && !vertical) return;
    const step = 4.5 * dt / Math.hypot(horizontal, vertical);
    const dx = (horizontal * screenRight.x + vertical * screenDown.x) * step;
    const dz = (horizontal * screenRight.y + vertical * screenDown.y) * step;
    heading = Math.atan2(-dx, -dz);
    if (canWalk(player.position.x + dx, player.position.z)) player.position.x += dx;
    if (canWalk(player.position.x, player.position.z + dz)) player.position.z += dz;
  }

  function aimCamera(dt) {
    if (overview) {
      const distance = Math.max(1, 1.39 / camera.aspect);
      cameraGoal.set(9.2 * distance, 18.5 * distance, 24.7 * distance);
      gazeGoal.set(0, .8, -.2);
    } else {
      const x = player.position.x;
      const z = player.position.z;
      cameraGoal.set(x + 2.65, 7.4, z + 7.11);
      gazeGoal.set(x, 1, z - .5);
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
    beacons.forEach(({ position }, i) => {
      projection.copy(position);
      projection.project(camera);
      const left = (projection.x + 1) * w / 2;
      const top = (1 - projection.y) * h / 2;
      const visible = projection.z > -1 && projection.z < 1 && left > 21 && left < w - 21 && top > 21 && top < h - 21;
      markers[i].hidden = !visible;
      if (visible) markers[i].style.transform = `translate(${left - 22}px, ${top - 22}px)`;
    });
  }

  function render(dt) {
    const oldX = player.position.x;
    const oldZ = player.position.z;
    animateWalk(dt);
    const nearby = beacons.findIndex(({ point }) => {
      const [x, z] = trail[point];
      return Math.hypot(x - player.position.x, z - player.position.z) < 1.45;
    });
    if (nearby >= 0 && (selectedStop < 0 || nearby === selectedStop)) showExhibit(nearby);
    const atStart = Math.hypot(player.position.x - trail[0][0], player.position.z - trail[0][1]) < 1.5;
    const place = exhibits[nearby]?.title ?? (atStart ? "Lab entrance" : "Inside the lab");
    if (locationLabel.textContent !== place) locationLabel.textContent = place;
    player.rotation.y = heading;
    shadow.position.x = player.position.x;
    shadow.position.z = player.position.z;
    walk(Math.hypot(player.position.x - oldX, player.position.z - oldZ), dt, reducedMotion.matches);
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
  render(0);
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(.04, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!interrupted) render(dt);
  });
}

start();
