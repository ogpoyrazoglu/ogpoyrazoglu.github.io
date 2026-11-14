# O. Goktug Poyrazoglu’s website

GitHub Pages serves the static files in the root of `main`.

- `index.html` is the welcome page with the portrait and links to both versions.
- `classic.html` contains the biography and selected publications. The layout adapts [Jon Barron’s personal website template](https://github.com/jonbarron/jonbarron.github.io).
- `world.html` is the walkable 3D robotics lab. Edit exhibit copy and controls in `world.js` and the room, walking route, and models in `world-scene.js`.
- Preview both pages locally with `python -m http.server`, then visit `http://localhost:8000`.

The 3D lab draws on [Bruno Simon’s explorable portfolio](https://bruno-simon.com/) and uses original models built from geometry. It uses a vendored copy of Three.js (r183), whose MIT license is in `assets/three/`. The handwritten OGP mark takes its cue from [Scott Yu-Jan’s site](https://syj-links.webflow.io/).

The BlueBoat exhibit uses an original visual reconstruction based on [Blue Robotics’ product photos](https://bluerobotics.com/store/boat/blueboat/blueboat/) and [public BR-101447 drawing](https://bluerobotics.com/wp-content/uploads/2023/03/BR-101447_RevA_PUBLIC_DRAWING.pdf).

The F10 exhibit uses original illustrative geometry based on [Skydio’s F10 Lightrunner product images and viewer](https://www.skydio.com/f10).

The F1TENTH exhibit is modeled after the research vehicle in the [C-Uniform project’s experiment footage](https://ogpoyrazoglu.github.io/cuniform_sampling/cuniform.html) and the [paper’s experimental setup figure](https://arxiv.org/html/2409.12266v1).

The lab whiteboard reads its titles, figures, and links from the Research section of `classic.html`.

The portrait and research figures come from the [C-Uniform project](https://ogpoyrazoglu.github.io/cuniform_sampling/), [C-Free-Uniform project](https://yukang-cao.github.io/C-Free-Uniform/), and the [Neural C-Uniform](https://arxiv.org/abs/2503.05819) and [C-Uniform](https://arxiv.org/abs/2409.12266) papers. Font licenses are in `assets/`.
