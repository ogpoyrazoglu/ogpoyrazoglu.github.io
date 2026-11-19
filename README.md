# O. Goktug Poyrazoglu’s website

GitHub Pages serves the static files in the root of `main`. For now, `main` publishes only the classic one-page site.

- `index.html` is the classic site: biography and selected publications. The layout adapts [Jon Barron’s personal website template](https://github.com/jonbarron/jonbarron.github.io).
- `classic.html` redirects to the home page, so older links keep working.
- Preview locally with `python -m http.server`, then visit `http://localhost:8000`.

## The 3D site

The 3D version (welcome page with the 3D avatar, the walkable robotics lab, and the blog) lives on the `site-3d` branch. It is not published. To work on it, check out that branch. To publish it again, merge `site-3d` into `main`. Its README describes the pages.

## Credits

The portrait and research figures come from the [C-Uniform project](https://ogpoyrazoglu.github.io/cuniform_sampling/), [C-Free-Uniform project](https://yukang-cao.github.io/C-Free-Uniform/), and the [Neural C-Uniform](https://arxiv.org/abs/2503.05819) and [C-Uniform](https://arxiv.org/abs/2409.12266) papers. The handwritten OGP mark takes its cue from [Scott Yu-Jan’s site](https://syj-links.webflow.io/). The Lato font license is in `assets/`.
