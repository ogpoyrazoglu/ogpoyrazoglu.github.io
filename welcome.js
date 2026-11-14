import { publications } from "./publications.js";

// Drives the welcome page's scroll story. The scene crossing the middle of the screen is
// "active": its text slides in from its side, and body[data-side] tells the avatar where to look.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scenes = [...document.querySelectorAll(".scene")];
const bar = document.querySelector(".progress span");
const body = document.body;

function activate(scene) {
  for (const other of scenes) other.classList.toggle("is-active", other === scene);
  body.dataset.side = scene.dataset.side ?? "center";
  body.dataset.scene = scene.classList.contains("scene-doors") ? "doors" : "story";
}

if (reducedMotion || !("IntersectionObserver" in window)) {
  for (const scene of scenes) scene.classList.add("is-active");
  body.classList.add("greeted");
} else {
  const middle = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) activate(entry.target);
  }, { rootMargin: "-48% 0px -48% 0px" });
  for (const scene of scenes) middle.observe(scene);
  // The avatar adds .greeted when it starts to wave; show the welcome anyway if it is slow.
  setTimeout(() => body.classList.add("greeted"), 7000);
}

// At the end, the avatar looks at whichever door the visitor points at.
for (const door of document.querySelectorAll("[data-look]")) {
  const look = () => { body.dataset.look = door.dataset.look; };
  const away = () => { delete body.dataset.look; };
  door.addEventListener("pointerenter", look);
  door.addEventListener("focus", look);
  door.addEventListener("pointerleave", away);
  door.addEventListener("blur", away);
}

let queued = false;
function updateProgress() {
  queued = false;
  const range = document.documentElement.scrollHeight - innerHeight;
  bar.style.setProperty("--progress", range > 0 ? Math.min(1, scrollY / range) : 0);
}
addEventListener("scroll", () => {
  if (!queued) requestAnimationFrame(updateProgress);
  queued = true;
}, { passive: true });
updateProgress();

// Selected work comes from the Research section of classic.html.
publications.then((papers) => {
  const list = document.querySelector("#selected-work");
  papers.forEach((paper, i) => {
    const item = document.createElement("li");
    item.style.setProperty("--i", i);
    const link = document.createElement("a");
    link.href = paper.href;
    const venue = document.createElement("span");
    venue.className = "venue";
    venue.textContent = paper.venue;
    const title = document.createElement("span");
    title.textContent = paper.title;
    link.append(venue, title);
    item.append(link);
    list.append(item);
  });
  if (papers.length) list.closest(".work").hidden = false;
});
