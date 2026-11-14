# O. Goktug Poyrazoglu’s website

GitHub Pages serves the static files in the root of `main`.

- `index.html` is the welcome page. The 3D avatar stands in the middle of the screen: it faces you and waves. As you scroll, each part of the story slides in from the left or right and the avatar looks that way. At the end it points between two doors, the robotics lab and the classic site. Choosing the lab walks the avatar into the lab. Edit the text in `index.html`; `welcome.js` runs the scroll story and `welcome-avatar.js` runs the avatar. Add `?t=1.9` to the address to freeze the opening at 1.9 seconds when you adjust a pose.
- `classic.html` contains the biography and selected publications. The layout adapts [Jon Barron’s personal website template](https://github.com/jonbarron/jonbarron.github.io).
- `world.html` is the walkable 3D robotics lab, full page. Edit exhibit copy and controls in `world.js` and the room, standing points, and models in `world-scene.js`. Clicking a numbered marker walks straight to that exhibit. An exhibit card with a close-up button (or the E key) appears when the walker stands at an exhibit. Add `?debug` to the address to reach the camera and walker as `window.labDebug` in the browser console.
- `blog.html` is the blog, reached from the computer on the lab's left desk. Add each post as a list item in `blog.html` (there is a template in a comment); the "No posts yet" note hides itself once a post is listed.
- `assets/door-lab.jpg` and `assets/door-classic.jpg` are screenshots of the two pages for the welcome page doors. Retake them after big visual changes.
- Preview the pages locally with `python -m http.server`, then visit `http://localhost:8000`.

The 3D lab draws on [Bruno Simon’s explorable portfolio](https://bruno-simon.com/) and uses original models built from geometry. It uses a vendored copy of Three.js (r183), whose MIT license is in `assets/three/`. The handwritten OGP mark takes its cue from [Scott Yu-Jan’s site](https://syj-links.webflow.io/).

The BlueBoat exhibit uses an original visual reconstruction based on [Blue Robotics’ product photos](https://bluerobotics.com/store/boat/blueboat/blueboat/) and [public BR-101447 drawing](https://bluerobotics.com/wp-content/uploads/2023/03/BR-101447_RevA_PUBLIC_DRAWING.pdf).

The F10 exhibit uses original illustrative geometry based on [Skydio’s F10 Lightrunner product images and viewer](https://www.skydio.com/f10).

The F1TENTH exhibit is modeled after the research vehicle in the [C-Uniform project’s experiment footage](https://ogpoyrazoglu.github.io/cuniform_sampling/cuniform.html) and the [paper’s experimental setup figure](https://arxiv.org/html/2409.12266v1).

The AlphaTruck exhibit uses original illustrative geometry based on the platform photos on [UT Austin AMRL’s OptCar project page](https://amrl.cs.utexas.edu/optcar/).

The welcome page and the lab walker use the 3D avatar in `assets/ogp-avatar.glb`. The model has no animation clips, so `avatar.js` lowers its arms from the T-pose and animates the walk, the wave, and the head turn by rotating its bones.

The lab whiteboard reads its titles, figures, and links from the Research section of `classic.html`.

The portrait and research figures come from the [C-Uniform project](https://ogpoyrazoglu.github.io/cuniform_sampling/), [C-Free-Uniform project](https://yukang-cao.github.io/C-Free-Uniform/), and the [Neural C-Uniform](https://arxiv.org/abs/2503.05819) and [C-Uniform](https://arxiv.org/abs/2409.12266) papers. Font licenses are in `assets/`.
