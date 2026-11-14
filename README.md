# O. Goktug Poyrazoglu’s website

GitHub Pages serves the static files in the root of `main`.

- `index.html` contains the biography and selected publications. The layout adapts [Jon Barron’s personal website template](https://github.com/jonbarron/jonbarron.github.io).
- `world.html` is the walkable 3D robotics lab. Edit exhibit copy and controls in `world.js` and the room, walking route, and models in `world-scene.js`.
- Preview both pages locally with `python -m http.server`, then visit `http://localhost:8000`.

The 3D lab draws on [Bruno Simon’s explorable portfolio](https://bruno-simon.com/) and uses original models built from geometry. It uses a vendored copy of Three.js (r183), whose MIT license is in `assets/three/`. The handwritten OGP mark takes its cue from [Scott Yu-Jan’s site](https://syj-links.webflow.io/).

The portrait and research figures come from the [C-Uniform project](https://ogpoyrazoglu.github.io/cuniform_sampling/), [C-Free-Uniform project](https://yukang-cao.github.io/C-Free-Uniform/), and the [Neural C-Uniform](https://arxiv.org/abs/2503.05819) and [C-Uniform](https://arxiv.org/abs/2409.12266) papers. Font licenses are in `assets/`.
