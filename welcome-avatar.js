import * as T from "./assets/three/three.module.min.js";
import { loadAvatar } from "./avatar.js";
import { lightLab } from "./lab-materials.js";

// The welcome page avatar stands in the middle of the screen, facing the visitor. It opens
// with a wave; then it turns toward whichever side the
// story text comes from (body[data-side], or body[data-look] over a door). Dragging turns it.
const stage = document.querySelector(".stage");
const canvas = stage.querySelector("canvas");
const body = document.body;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const phone = matchMedia("(max-width: 760px)");
const smooth = (t, from, to) => T.MathUtils.smoothstep(t, from, to);

// For checking poses: index.html?t=1.9 freezes the opening at 1.9 seconds.
const frozenParam = new URLSearchParams(location.search).get("t");
const frozen = frozenParam === null || Number.isNaN(Number(frozenParam)) ? null : Number(frozenParam);
if (frozen !== null) {
  const note = document.createElement("p");
  note.className = "freeze-note";
  note.textContent = `Opening paused at ${frozen} s for pose checks. Remove ?t= from the address to play it.`;
  document.body.append(note);
}

// Opening timeline, in seconds after the avatar appears.
const WAVE = [.4, 3.05]; // Wave, then the welcome text and scroll cue appear

async function mount() {
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!context) throw new Error("WebGL 2 is unavailable");
  const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new T.Scene();
  let avatar;
  try {
    avatar = await loadAvatar(1.8);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  lightLab(scene, renderer);
  scene.add(new T.HemisphereLight(0xfff3e5, 0xb2c2bf, 1.55));
  const fill = new T.DirectionalLight(0xfff0dc, 1.35);
  fill.position.set(1.1, 2.5, 3.6);
  scene.add(fill);
  const pivot = new T.Group();
  scene.add(pivot);
  pivot.add(avatar.figure);

  // Frame the whole figure: head near the top, feet above the welcome line and scroll cue.
  const camera = new T.PerspectiveCamera(30, 1, .05, 40);
  const halfView = Math.tan(T.MathUtils.degToRad(15));
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    const [top, bottom] = phone.matches ? [.05, .97] : [.13, .8];
    const span = Math.max(1.8 / (bottom - top), 1.3 / camera.aspect); // Keep raised hands in view
    const center = span * bottom - span / 2;
    camera.position.set(0, center, span / 2 / halfView);
    camera.lookAt(0, center, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const pointer = { left: 0, down: 0 };
  addEventListener("pointermove", (event) => {
    pointer.left = T.MathUtils.clamp((event.clientX / innerWidth - .5) * 1.1, -.45, .45);
    pointer.down = T.MathUtils.clamp((event.clientY / innerHeight - .3) * .5, -.2, .3);
  }, { passive: true });

  let drag = null;
  let spun = 0;
  canvas.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, from: spun };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drag) spun = drag.from + (event.clientX - drag.x) * .012;
  });
  const release = () => { drag = null; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // Choosing the lab: the avatar turns away and walks into the distance as the page fades to the
  // lab's colour; world.html then walks it in through the lab door (see the "ogp:enter-lab" flag).
  let exit = null;
  const labDoor = document.querySelector(".door-lab");
  labDoor.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
    event.preventDefault();
    if (exit) return;
    exit = { start: performance.now(), from: pivot.rotation.y, href: labDoor.href, gone: false };
    try { sessionStorage.setItem("ogp:enter-lab", "1"); } catch {}
    body.classList.add("leaving");
  });
  addEventListener("pageshow", (event) => {
    if (!event.persisted || !exit) return; // Coming back from the lab via the back button
    exit = null;
    body.classList.remove("leaving");
    stage.style.opacity = "";
    avatar.figure.position.set(0, 0, 0);
  });

  const start = performance.now();
  const gaze = { turn: 0, left: 0, down: 0 };
  let point = 0;
  let last = start;
  function frame(now) {
    const dt = T.MathUtils.clamp((now - last) / 1000, 0, .05); // Never negative on the first frame
    last = now;
    const still = reducedMotion.matches;
    const t = still ? 99 : frozen ?? (now - start) / 1000;
    const wave = smooth(t, WAVE[0], WAVE[0] + .3) * (1 - smooth(t, WAVE[1] - .4, WAVE[1]));
    if (t >= WAVE[0]) body.classList.add("greeted");

    // At the doors, point at one choice and then the other until the visitor picks a door.
    if (body.dataset.scene === "doors" && !exit && !still) {
      const choice = body.dataset.look ?? (Math.sin(now / 1000) > 0 ? "left" : "right");
      if (body.dataset.point !== choice) body.dataset.point = choice;
    } else if (body.dataset.point) {
      delete body.dataset.point;
    }
    const pointGoal = body.dataset.point === "left" ? -1 : body.dataset.point === "right" ? 1 : 0;
    point += (pointGoal - point) * (1 - Math.exp(-dt * 5));

    // After the greeting, turn toward the story text; with no text to the side, follow the pointer.
    const side = body.dataset.look ?? body.dataset.point ?? body.dataset.side;
    const direction = side === "left" ? -1 : side === "right" ? 1 : 0;
    const settled = smooth(t, WAVE[0], WAVE[1]);
    const goal = {
      turn: direction * .4 * settled,
      left: (direction ? direction * .45 : pointer.left) * settled,
      down: (direction ? .05 : pointer.down) * settled
    };
    const ease = still ? 1 : 1 - Math.exp(-dt * 4.5);
    for (const key of Object.keys(gaze)) gaze[key] += (goal[key] - gaze[key]) * ease;
    if (!drag) spun *= still ? 0 : Math.exp(-dt * 2.2); // A drag springs back once released.

    pivot.rotation.y = gaze.turn + spun + (still ? 0 : Math.sin(now / 1500) * .025 * settled);
    avatar.pose({ wave, point, time: t, lookLeft: gaze.left, lookDown: gaze.down });
    if (exit) {
      const e = (now - exit.start) / 1000;
      const away = Math.PI * Math.round(exit.from / (Math.PI * 2)) * 2 + Math.PI; // Nearest back-turned angle
      pivot.rotation.y = T.MathUtils.lerp(exit.from, away, T.MathUtils.smootherstep(e, 0, .4));
      const step = e > .2 ? 1.6 * dt : 0; // Walking pace, in metres per second
      avatar.figure.position.z += step;
      avatar.pose({});
      avatar.walk(step, dt, false);
      stage.style.opacity = String(1 - smooth(e, .85, 1.35));
      if (e > 1.4 && !exit.gone) {
        exit.gone = true;
        location.href = exit.href;
      }
    }
    renderer.render(scene, camera);
  }

  stage.dataset.state = "ready";
  renderer.setAnimationLoop(frame);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    stage.dataset.state = "fallback";
  });
}

mount().catch((error) => {
  console.warn("The welcome avatar could not load.", error);
  stage.dataset.state = "fallback";
  body.classList.add("greeted");
});
