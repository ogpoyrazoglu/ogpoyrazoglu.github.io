import * as T from "./assets/three/three.module.min.js";

export const material = (color, roughness = .7, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });

function randomSource(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(width, height, draw, colorSpace = T.SRGBColorSpace) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = colorSpace;
  return map;
}

export function concrete() {
  const map = texture(512, 512, (ctx, w, h) => {
    const random = randomSource(24);
    const image = ctx.createImageData(w, h);
    const grains = Array.from({ length: 17 * 17 }, () => random());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = x / 32;
      const v = y / 32;
      const ix = Math.floor(u);
      const iy = Math.floor(v);
      const blend = (a, b, t) => T.MathUtils.lerp(a, b, t * t * (3 - 2 * t));
      const row = iy * 17 + ix;
      const cloud = blend(blend(grains[row], grains[row + 1], u - ix),
        blend(grains[row + 17], grains[row + 18], u - ix), v - iy);
      const tone = 179 + cloud * 26 + random() * 11 - (random() < .018 ? 29 : 0);
      image.data.set([tone, tone + 2, tone + 1, 255], i);
    }
    ctx.putImageData(image, 0, 0);
    for (let i = 0; i < 1700; i++) {
      ctx.fillStyle = random() < .75 ? "#474e4b16" : "#ffffff27";
      const size = .5 + random() * 1.9;
      ctx.fillRect(random() * w, random() * h, size * (1 + random()), size);
    }
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(5, 3.4);
  map.anisotropy = 8;
  return new T.MeshStandardMaterial({ map, roughness: .76, bumpMap: map, bumpScale: .037 });
}

export function wood() {
  const map = texture(768, 448, (ctx, w, h) => {
    const random = randomSource(713);
    for (let slat = 0; slat < 14; slat++) {
      const y = slat * 32;
      const tint = 172 + random() * 24;
      ctx.fillStyle = `rgb(${tint + 24},${tint - 6},${tint - 37})`;
      ctx.fillRect(0, y, w, 32);
      ctx.fillStyle = "#51422f25";
      ctx.fillRect(0, y, w, 1);
      for (let j = 0; j < 90; j++) {
        const startX = random() * w;
        const startY = y + 1 + random() * 30;
        const length = 25 + random() * 430;
        ctx.strokeStyle = random() < .25 ? "#fff6d330" : "#62401c25";
        ctx.lineWidth = .4 + random() * 1.1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + length * .35, startY - random() * 3,
          startX + length * .65, startY + random() * 2, startX + length, startY);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = random() * w;
      const y = random() * h;
      for (let line = 1; line <= 4; line++) {
        ctx.strokeStyle = "#60432522";
        ctx.beginPath();
        ctx.ellipse(x, y, line * 7, line * 1.4, .035, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
  map.anisotropy = 8;
  return new T.MeshStandardMaterial({ map, roughness: .54, bumpMap: map, bumpScale: .014 });
}

export function carbonFiber() {
  const map = texture(128, 128, (ctx) => {
    ctx.fillStyle = "#1f2225";
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) {
      const horizontal = (x / 8 + y / 8) % 4 < 2;
      ctx.fillStyle = horizontal ? "#2b2e32" : "#24262a";
      ctx.fillRect(x, y, 8, 8);
      ctx.fillStyle = "#16191a";
      for (let offset = 1; offset < 8; offset += 2) {
        ctx.fillRect(x + (horizontal ? 0 : offset), y + (horizontal ? offset : 0),
          horizontal ? 8 : 1, horizontal ? 1 : 8);
      }
    }
  });
  return new T.MeshStandardMaterial({ map, roughness: .36, metalness: .26 });
}

export function softShadow(parent, x, z, width, depth, opacity, y = .022) {
  const shadowMap = softShadow.map ??= texture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 7, 64, 64, 63);
    gradient.addColorStop(0, "#253134e8");
    gradient.addColorStop(.48, "#25313492");
    gradient.addColorStop(1, "#25313400");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
  const shadow = new T.Mesh(new T.PlaneGeometry(width, depth),
    new T.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, y, z);
  parent.add(shadow);
  return shadow;
}

export function lightLab(scene, renderer) {
  const lightMap = texture(512, 256, (ctx, w, h) => {
    const ceiling = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of [[0, "#bac4ca"], [.27, "#788588"], [.5, "#4b5153"], [.78, "#4c4944"], [1, "#3e3732"]]) {
      ceiling.addColorStop(at, color);
    }
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d7eaff";
    ctx.fillRect(99, 40, 106, 70);
    ctx.fillStyle = "#f4eee2";
    ctx.fillRect(324, 26, 103, 17);
    ctx.fillRect(372, 65, 77, 7);
  });
  const generator = new T.PMREMGenerator(renderer);
  scene.environment = generator.fromEquirectangular(lightMap).texture;
  scene.environmentIntensity = .76;
  generator.dispose();
  lightMap.dispose();

  const key = new T.DirectionalLight(0xffe4c0, 2.45);
  key.position.set(-7.8, 12.5, 8);
  key.castShadow = true;
  const shadowResolution = window.matchMedia("(max-width: 800px)").matches ? 1024 : 2048;
  key.shadow.mapSize.set(shadowResolution, shadowResolution);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, far: 34 });
  key.shadow.normalBias = .035;
  key.shadow.bias = -.00018;
  scene.add(key);

  const fill = new T.DirectionalLight(0xc6ddff, .95);
  fill.position.set(8, 5, -6);
  scene.add(fill);
}
