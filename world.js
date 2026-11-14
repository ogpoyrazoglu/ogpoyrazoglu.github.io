import { whiteboardPapers } from "./publications.js";

const exhibits = [
  {
    title: "Whiteboard", type: "Selected publications",
    text: "Selected papers on trajectory sampling and model predictive control.",
    link: ["Browse all selected research", "classic.html#research"]
  },
  {
    title: "BlueBoat", type: "Marine robotics",
    text: "This model is based on Blue Robotics’ twin-hull BlueBoat. Its two propellers steer by pushing with different amounts of thrust.",
    link: ["See the BlueBoat", "https://bluerobotics.com/store/boat/blueboat/blueboat/"]
  },
  {
    title: "Skydio F10 Lightrunner", type: "Aerial robotics",
    text: "This model depicts Skydio’s fixed-wing F10 Lightrunner. Its SideEye camera sits at the wingtip to keep the airframe out of the shot during turns.",
    link: ["See the Skydio F10", "https://www.skydio.com/f10"]
  },
  {
    title: "F1TENTH racer", type: "Ground robotics",
    text: "This open-chassis, one-tenth-scale racer is modeled after the car we used to test C-Uniform motion planning around indoor obstacles.",
    link: ["See the C-Uniform experiments", "https://ogpoyrazoglu.github.io/cuniform_sampling/cuniform.html"]
  },
  {
    title: "UT AlphaTruck", type: "Off-road robotics",
    text: "This model is based on UT Austin AMRL’s AlphaTruck, a 1/5-scale Traxxas X-Maxx built for high-speed off-road autonomy. It carries a Livox Mid-360 lidar, a VectorNav VN-100 IMU, and an NVIDIA Jetson Orin AGX.",
    link: ["See the OptCar project", "https://amrl.cs.utexas.edu/optcar/"]
  },
  {
    title: "Blog", type: "Writing",
    text: "My thoughts on robotics. The first posts are on the way.",
    link: ["Open the blog", "blog.html"]
  }
];
const home = {
  title: "Lab entrance", type: "Lab tour",
  text: "Start at the publications whiteboard, then visit the BlueBoat, Skydio F10, F1TENTH racer, and AlphaTruck.",
  link: ["See my research", "classic.html#research"]
};
const canvas = document.querySelector("#map");
const frame = document.querySelector(".map-frame");
const status = document.querySelector("#scene-status");
const locationLabel = document.querySelector("#map-location");
const title = document.querySelector("#exhibit-title");
const type = document.querySelector("#exhibit-type");
const copy = document.querySelector("#exhibit-copy");
const link = document.querySelector("#exhibit-link");
const paperViewer = document.querySelector("#paper-viewer");
const paperPosition = document.querySelector("#paper-position");
const paperDetail = document.querySelector("#paper-detail");
const paperPrev = document.querySelector("#paper-prev");
const paperNext = document.querySelector("#paper-next");
const cameraButton = document.querySelector("#camera");
const resetButton = document.querySelector("#reset");
const inspectButton = document.querySelector("#inspect-exhibit");
const card = document.querySelector(".exhibit");
const pad = [...document.querySelectorAll("[data-direction]")];
let current = -1;
let walkToStop = () => {};
let markers = [];
let sceneReady = false;
let papers = [];
let paperIndex = 0;
let readingWhiteboard = false;
let drawPaper = () => {};
// Walking speeds in world units per second: arrow keys and the guided tour.
const walkSpeed = 3;
const tourSpeed = 3.4;

whiteboardPapers.then((items) => {
  papers = items;
  refreshPapers();
});

// The whiteboard shows each paper's title and figure, so the close-up bar only steps through them.
function refreshPapers() {
  const paper = papers[paperIndex];
  const single = readingWhiteboard && Boolean(paper);
  paperViewer.hidden = !single;
  if (!single) return;
  paperPosition.textContent = `Paper ${paperIndex + 1} of ${papers.length}`;
  paperDetail.href = paper.href;
  paperDetail.setAttribute("aria-label", `Open paper: ${paper.title}`);
  paperPrev.disabled = paperIndex === 0;
  paperNext.disabled = paperIndex === papers.length - 1;
  drawPaper(paper, paperIndex + 1, papers.length);
}

function changePaper(step) {
  const next = paperIndex + step;
  if (!readingWhiteboard || next < 0 || next >= papers.length) return;
  paperIndex = next;
  refreshPapers();
}

paperPrev.addEventListener("click", () => changePaper(-1));
paperNext.addEventListener("click", () => changePaper(1));

// The exhibit card, with its close-up button, shows only while the walker stands at an exhibit.
function showExhibit(index) {
  if (current === index) return;
  current = index;
  const item = exhibits[index] ?? home;
  title.textContent = item.title;
  type.textContent = item.type;
  copy.textContent = item.text;
  link.firstChild.textContent = item.link[0] + " ";
  link.href = item.link[1];
  refreshPapers();
  card.hidden = index < 0;
  inspectButton.hidden = !sceneReady || index < 0;
  markers.forEach((marker, i) => {
    if (i === index) marker.setAttribute("aria-current", "location");
    else marker.removeAttribute("aria-current");
  });
}

async function start() {
  try {
    const world = await import("./world-scene.js");
    const context = canvas.getContext("webgl2", { antialias: true });
    if (!context) throw new Error("WebGL 2 is unavailable");
    startLab(world, context);
    sceneReady = true;
    status.hidden = true;
    for (const button of [cameraButton, resetButton, ...pad]) button.disabled = false;
  } catch (error) {
    console.warn("3D robotics lab unavailable", error);
    status.innerHTML = "The 3D scene couldn’t load in this browser. The <a href=\"classic.html\">classic site</a> has the same research.";
  }
}

function startLab({ T, trail, buildWorld, canWalk, routeTo }, context) {
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const { scene, player, shadow, walk, beacons, showPaper } = buildWorld(renderer);
  drawPaper = showPaper;
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
  let overview = true;
  let inspecting = -1;
  let heading = 0;
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
    marker.addEventListener("click", () => walkToStop(i));
    document.querySelector("#map-markers").append(marker);
    return marker;
  });

  function setPosition(x, z) {
    const dx = x - player.position.x;
    const dz = z - player.position.z;
    if (Math.hypot(dx, dz) > .001) heading = Math.atan2(-dx, -dz);
    player.position.set(x, 0, z);
  }

  // Walks the shortest clear route to an exhibit's standing point, then turns to face it.
  walkToStop = (i) => {
    stopInspecting();
    const goal = trail[beacons[i].point];
    const route = routeTo([player.position.x, player.position.z], goal);
    if (!route.length) return;
    held.clear();
    selectedStop = i;
    approach = route;
    touring = true;
    if (reducedMotion.matches) {
      setPosition(...goal);
      heading = beacons[i].facing;
      approach = [];
      touring = false;
    }
  };

  function move(direction, key) {
    stopInspecting();
    held.set(key, direction);
    touring = false;
    approach = [];
    selectedStop = -1;
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && inspecting >= 0) {
      stopInspecting();
      return;
    }
    // Arrow keys still turn papers after clicking a paper button, which keeps focus.
    if (readingWhiteboard && !event.target.closest?.("input, textarea, select, [contenteditable]") &&
        !event.altKey && !event.ctrlKey && !event.metaKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      changePaper(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    // Lab keys work anywhere on the page except while typing in a text field.
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const key = event.key.toLowerCase();
    if (key === "e" && !event.repeat && !inspectButton.hidden) {
      event.preventDefault();
      inspectButton.click();
      return;
    }
    if (!keyDirection[key] || interrupted) return;
    event.preventDefault();
    move(keyDirection[key], key);
  });
  window.addEventListener("keyup", (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => held.clear());
  canvas.addEventListener("blur", () => {
    for (const key of Object.keys(keyDirection)) held.delete(key);
  });
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

  function stopInspecting() {
    if (inspecting < 0) return;
    inspecting = -1;
    readingWhiteboard = false;
    drawPaper();
    refreshPapers();
    setCloseUp(false);
  }

  // In a close-up the card folds into a slim bar so it does not cover the exhibit.
  function setCloseUp(on) {
    card.classList.toggle("is-closeup", on);
    document.body.classList.toggle("is-inspecting", on);
    inspectButton.setAttribute("aria-pressed", String(on));
    inspectButton.setAttribute("aria-keyshortcuts", on ? "Escape" : "E");
    inspectButton.querySelector(".label").textContent = on ? "Exit close-up" : "Close-up view";
    inspectButton.querySelector("kbd").textContent = on ? "Esc" : "E";
    cameraButton.textContent = on ? "Exit close-up" : overview ? "Follow camera" : "Lab overview";
  }

  inspectButton.addEventListener("click", () => {
    if (inspecting >= 0) {
      stopInspecting();
      return;
    }
    walkToStop(current);
    inspecting = current;
    readingWhiteboard = current === 0;
    paperIndex = 0;
    refreshPapers();
    setCloseUp(true);
  });

  cameraButton.addEventListener("click", () => {
    if (inspecting >= 0) {
      stopInspecting();
      return;
    }
    overview = !overview;
    cameraButton.setAttribute("aria-pressed", String(!overview));
    cameraButton.textContent = overview ? "Follow camera" : "Lab overview";
  });
  function reset() {
    stopInspecting();
    held.clear();
    heading = 0;
    touring = false;
    approach = [];
    selectedStop = -1;
    player.position.set(trail[0][0], 0, trail[0][1]);
    showExhibit(-1);
  }
  resetButton.addEventListener("click", reset);
  reset();

  // Arriving from the welcome page's lab door: walk in through the front doorway while the
  // camera pulls back from just behind the walker to the lab overview.
  let introEnd = 0;
  let fromWelcome = false;
  try {
    fromWelcome = sessionStorage.getItem("ogp:enter-lab") === "1";
    sessionStorage.removeItem("ogp:enter-lab");
  } catch {}
  if (fromWelcome && !reducedMotion.matches) {
    // Start just inside the front doorway (the floor ends at the wall) and walk a few steps in.
    const [x, z] = trail[0];
    const doorway = z + .8;
    player.position.set(x, 0, doorway);
    approach = [[x, z - .8]];
    touring = true;
    // Start where the welcome page left off: the avatar seen from behind, about half the screen tall.
    camera.position.set(x, 1.5, doorway + 5.1);
    gaze.set(x, 1.05, doorway);
    introEnd = performance.now() + 2800;
  }

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
      const t = remaining ? Math.min(1, dt * tourSpeed / remaining) : 1;
      setPosition(T.MathUtils.lerp(player.position.x, x, t), T.MathUtils.lerp(player.position.z, z, t));
      if (t === 1) approach.shift();
      return;
    }
    if (touring) {
      touring = false;
      if (selectedStop >= 0) heading = beacons[selectedStop].facing;
      return;
    }
    const pressed = [...held.values()];
    const horizontal = Number(pressed.includes("right")) - Number(pressed.includes("left"));
    const vertical = Number(pressed.includes("down")) - Number(pressed.includes("up"));
    if (!horizontal && !vertical) return;
    const step = walkSpeed * dt / Math.hypot(horizontal, vertical);
    const dx = (horizontal * screenRight.x + vertical * screenDown.x) * step;
    const dz = (horizontal * screenRight.y + vertical * screenDown.y) * step;
    heading = Math.atan2(-dx, -dz);
    if (canWalk(player.position.x + dx, player.position.z)) player.position.x += dx;
    if (canWalk(player.position.x, player.position.z + dz)) player.position.z += dz;
  }

  function aimCamera(dt) {
    if (inspecting >= 0) {
      const { focus, view } = beacons[inspecting];
      const distance = Math.max(1, 1.17 / camera.aspect);
      gazeGoal.set(...focus);
      cameraGoal.set(focus[0] + view[0] * distance, focus[1] + view[1] * distance, focus[2] + view[2] * distance);
    } else if (overview) {
      const distance = Math.max(.82, 1.3 / camera.aspect);
      cameraGoal.set(6.1 * distance, 12.2 * distance, 16.3 * distance);
      gazeGoal.set(0, .6, -.2);
    } else {
      const x = player.position.x;
      const z = player.position.z;
      cameraGoal.set(x + 2.3, 6.3, z + 6.1);
      gazeGoal.set(x, 1.1, z - .4);
    }
    const intro = performance.now() < introEnd;
    const rate = intro ? 1.3 : overview ? 4.8 : 5.2;
    const blend = (dt === 0 && !intro) || reducedMotion.matches ? 1 : 1 - Math.exp(-dt * rate);
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
      const visible = inspecting < 0 && projection.z > -1 && projection.z < 1 && left > 21 && left < w - 21 && top > 21 && top < h - 21;
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
    // While walking to a chosen stop, exhibits passed on the way stay closed.
    if (inspecting < 0) showExhibit(nearby >= 0 && (selectedStop < 0 || nearby === selectedStop) ? nearby : -1);
    const atStart = Math.hypot(player.position.x - trail[0][0], player.position.z - trail[0][1]) < 1.5;
    const place = exhibits[inspecting]?.title ?? exhibits[nearby]?.title ?? (atStart ? "Lab entrance" : "Inside the lab");
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
    renderer.shadowMap.needsUpdate = true;
    interrupted = false;
    status.hidden = true;
  });

  if (new URLSearchParams(location.search).has("debug")) window.labDebug = { camera, gaze, player };
  let lastFrame = performance.now();
  render(0);
  renderer.setAnimationLoop((now) => {
    // The first frame's timestamp can come before lastFrame; a negative step would run motion backwards.
    const dt = T.MathUtils.clamp((now - lastFrame) / 1000, 0, .04);
    lastFrame = now;
    if (!interrupted) render(dt);
  });
}

start();
