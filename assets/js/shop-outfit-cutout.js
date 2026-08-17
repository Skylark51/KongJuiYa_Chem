const MASKS = Object.freeze({
  "kongjwi-classic-red.webp": "assets/그림/공용/콩쥐/마스크/고전-홍색-한복/씨앗.png?v=20260805-outfit-cutout2",
  "kongjwi-blue-scholar.webp": "assets/그림/공용/콩쥐/마스크/청색-학자복/씨앗.png?v=20260805-outfit-cutout2",
  "kongjwi-field-work.webp": "assets/그림/공용/콩쥐/마스크/농사일-작업복/씨앗.png?v=20260805-outfit-cutout2",
  "kongjwi-night-court.webp": "assets/그림/공용/콩쥐/마스크/야간-궁중복/씨앗.png?v=20260805-outfit-cutout2"
});
const cache = new Map();
const px = i => i * 4;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function mountStyle() {
  if (document.querySelector("[data-shop-outfit-cutout]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/shop-outfit-cutout.css?v=20260805-outfit-cutout2";
  link.dataset.shopOutfitCutout = "true";
  document.head.append(link);
}

function load(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function filename(src) {
  try { return new URL(src, location.href).pathname.split("/").pop(); }
  catch { return String(src).split("?")[0].split("/").pop(); }
}

function edgeModel(data, width, height) {
  const strip = clamp(Math.round(width * .025), 3, 8);
  const left = new Float32Array(height * 3);
  const right = new Float32Array(height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < strip; x += 1) {
      let a = px(y * width + x);
      let b = px(y * width + width - 1 - x);
      for (let c = 0; c < 3; c += 1) {
        left[y * 3 + c] += data[a + c] / strip;
        right[y * 3 + c] += data[b + c] / strip;
      }
    }
  }
  return { strip, left, right };
}

function distance(data, index, reference) {
  const o = px(index);
  const dr = data[o] - reference[0];
  const dg = data[o + 1] - reference[1];
  const db = data[o + 2] - reference[2];
  return Math.sqrt(dr * dr * .28 + dg * dg * .55 + db * db * .17);
}

function stepDistance(data, a, b) {
  const x = px(a), y = px(b);
  const dr = data[x] - data[y], dg = data[x + 1] - data[y + 1], db = data[x + 2] - data[y + 2];
  return Math.sqrt(dr * dr * .28 + dg * dg * .55 + db * db * .17);
}

function reference(model, x, y, width) {
  const t = width > 1 ? x / (width - 1) : 0;
  const i = y * 3;
  return [
    model.left[i] + (model.right[i] - model.left[i]) * t,
    model.left[i + 1] + (model.right[i + 1] - model.left[i + 1]) * t,
    model.left[i + 2] + (model.right[i + 2] - model.left[i + 2]) * t
  ];
}

function dilate(seed, width, height, radius = 2) {
  const out = new Uint8Array(seed.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!seed[y * width + x]) continue;
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) out[ny * width + nx] = 1;
    }
  }
  return out;
}

function recoverSeed(seed, width, height) {
  let protectedPixels = dilate(seed, width, height, 2);
  closeGaps(protectedPixels, width, height);

  let x1 = width, y1 = height, x2 = -1, y2 = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!seed[y * width + x]) continue;
    x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  }
  if (x2 < 0) return protectedPixels;

  const bodyLeft = x1 + (x2 - x1) * .2;
  const bodyRight = x2 - (x2 - x1) * .2;
  const rowGap = clamp(Math.round(width * .24), 24, 62);
  const columnGap = clamp(Math.round(height * .16), 24, 68);

  for (let y = y1; y <= y2; y += 1) {
    const runs = [];
    let start = -1;
    for (let x = x1; x <= x2 + 1; x += 1) {
      const active = x <= x2 && protectedPixels[y * width + x];
      if (active && start < 0) start = x;
      if (!active && start >= 0) { runs.push([start, x - 1]); start = -1; }
    }
    for (let r = 1; r < runs.length; r += 1) {
      const left = runs[r - 1][1], right = runs[r][0];
      const gap = right - left - 1, middle = (left + right) / 2;
      if (gap > 0 && gap <= rowGap && middle >= bodyLeft && middle <= bodyRight) {
        for (let x = left + 1; x < right; x += 1) protectedPixels[y * width + x] = 1;
      }
    }
  }

  for (let x = Math.floor(bodyLeft); x <= Math.ceil(bodyRight); x += 1) {
    let previous = -1;
    for (let y = y1; y <= y2; y += 1) if (protectedPixels[y * width + x]) {
      const gap = y - previous - 1;
      if (previous >= 0 && gap > 0 && gap <= columnGap) {
        for (let n = previous + 1; n < y; n += 1) protectedPixels[n * width + x] = 1;
      }
      previous = y;
    }
  }

  protectedPixels = dilate(protectedPixels, width, height, 1);
  closeGaps(protectedPixels, width, height);
  return protectedPixels;
}

function floodBackground(data, seed, width, height) {
  const model = edgeModel(data, width, height);
  const protectedPixels = recoverSeed(seed, width, height);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const add = index => {
    if (background[index] || protectedPixels[index]) return;
    background[index] = 1;
    queue[tail++] = index;
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < model.strip; x += 1) {
    add(y * width + x);
    add(y * width + width - 1 - x);
  }
  for (let x = 0; x < width; x += 1) for (const y of [0, height - 1]) {
    const i = y * width + x;
    if (distance(data, i, reference(model, x, y, width)) < 28) add(i);
  }
  const visit = (next, current, x, y) => {
    if (next < 0 || next >= background.length || background[next] || protectedPixels[next]) return;
    const center = x > width * .16 && x < width * .84 && y > height * .04 && y < height * .98;
    const modelDistance = distance(data, next, reference(model, x, y, width));
    if (modelDistance < 18 || (modelDistance < (center ? 52 : 64) && stepDistance(data, next, current) < (center ? 22 : 29))) add(next);
  };
  while (head < tail) {
    const current = queue[head++], x = current % width, y = Math.floor(current / width);
    if (x) visit(current - 1, current, x - 1, y);
    if (x + 1 < width) visit(current + 1, current, x + 1, y);
    if (y) visit(current - width, current, x, y - 1);
    if (y + 1 < height) visit(current + width, current, x, y + 1);
  }
  return { background, protectedPixels };
}

function componentOverlapsSeed(foreground, seed, width, height) {
  const seen = new Uint8Array(foreground.length);
  const keep = new Uint8Array(foreground.length);
  const queue = new Int32Array(foreground.length);
  for (let start = 0; start < foreground.length; start += 1) {
    if (!foreground[start] || seen[start]) continue;
    let head = 0, tail = 0, seedCount = 0;
    const members = [];
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      members.push(i);
      seedCount += seed[i];
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const n = ny * width + nx;
        if (foreground[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; }
      }
    }
    if (seedCount >= 2 && members.length >= 6) for (const i of members) keep[i] = 1;
  }
  for (let i = 0; i < seed.length; i += 1) if (seed[i]) keep[i] = 1;
  return keep;
}

function closeGaps(mask, width, height) {
  const hGap = clamp(Math.round(width * .065), 10, 18);
  const vGap = clamp(Math.round(height * .04), 10, 18);
  for (let y = 0; y < height; y += 1) {
    let previous = -1;
    for (let x = 0; x < width; x += 1) if (mask[y * width + x]) {
      const gap = x - previous - 1;
      if (previous >= 0 && gap > 0 && gap <= hGap && (x + previous) / 2 > width * .2 && (x + previous) / 2 < width * .8)
        for (let n = previous + 1; n < x; n += 1) mask[y * width + n] = 1;
      previous = x;
    }
  }
  for (let x = 0; x < width; x += 1) {
    let previous = -1;
    for (let y = 0; y < height; y += 1) if (mask[y * width + x]) {
      const gap = y - previous - 1;
      if (previous >= 0 && gap > 0 && gap <= vGap && x > width * .2 && x < width * .8)
        for (let n = previous + 1; n < y; n += 1) mask[n * width + x] = 1;
      previous = y;
    }
  }
}

function bounds(mask, width, height) {
  let x1 = width, y1 = height, x2 = -1, y2 = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (mask[y * width + x]) {
    x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  }
  if (x2 < 0) return { x: 0, y: 0, width, height };
  const p = clamp(Math.round(Math.min(width, height) * .025), 4, 9);
  x1 = Math.max(0, x1 - p); y1 = Math.max(0, y1 - p); x2 = Math.min(width - 1, x2 + p); y2 = Math.min(height - 1, y2 + p);
  return { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
}

async function buildCutout(sourceUrl, maskUrl) {
  const [source, maskImage] = await Promise.all([load(sourceUrl), load(maskUrl)]);
  const width = source.naturalWidth, height = source.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width; maskCanvas.height = height;
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  maskContext.drawImage(maskImage, 0, 0, width, height);
  const maskData = maskContext.getImageData(0, 0, width, height).data;
  const seed = new Uint8Array(width * height);
  for (let i = 0; i < seed.length; i += 1) seed[i] = maskData[px(i) + 3] >= 10 ? 1 : 0;
  const { background, protectedPixels } = floodBackground(image.data, seed, width, height);
  const foreground = new Uint8Array(background.length);
  for (let i = 0; i < foreground.length; i += 1) foreground[i] = background[i] ? 0 : 1;
  const retained = componentOverlapsSeed(foreground, protectedPixels, width, height);
  for (let i = 0; i < retained.length; i += 1) if (protectedPixels[i]) retained[i] = 1;
  closeGaps(retained, width, height);
  const crop = bounds(retained, width, height);
  const output = document.createElement("canvas");
  output.width = crop.width; output.height = crop.height;
  const outputContext = output.getContext("2d");
  const pixels = outputContext.createImageData(crop.width, crop.height);
  for (let y = 0; y < crop.height; y += 1) for (let x = 0; x < crop.width; x += 1) {
    const from = (crop.y + y) * width + crop.x + x, to = y * crop.width + x;
    pixels.data.set(image.data.subarray(px(from), px(from) + 3), px(to));
    if (retained[from]) {
      let neighbors = 0, samples = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = crop.x + x + dx, ny = crop.y + y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        samples += 1; neighbors += retained[ny * width + nx];
      }
      pixels.data[px(to) + 3] = neighbors === samples ? 255 : Math.round(128 + 127 * neighbors / samples);
    }
  }
  outputContext.putImageData(pixels, 0, 0);
  return { src: output.toDataURL("image/png"), width: crop.width, height: crop.height };
}

function taskFor(src) {
  const name = filename(src), mask = MASKS[name];
  if (!mask) return null;
  if (!cache.has(name)) cache.set(name, buildCutout(src, mask));
  return cache.get(name);
}

async function upgrade(image) {
  if (!(image instanceof HTMLImageElement) || image.dataset.cutoutState) return;
  const task = taskFor(image.currentSrc || image.src);
  if (!task) return;
  image.dataset.cutoutState = "processing";
  const asset = image.closest(".shop-asset-outfit");
  try {
    const result = await task;
    if (!image.isConnected) return;
    image.width = result.width; image.height = result.height; image.src = result.src;
    image.dataset.cutoutState = "ready";
    if (asset) asset.dataset.assetState = "ready";
  } catch (error) {
    image.dataset.cutoutState = "fallback";
    if (asset) asset.dataset.assetState = "ready";
    console.error("[콩 상점] 콩쥐 의상 배경 제거 실패", error);
  }
}

function scan(root = document) {
  if (root instanceof HTMLImageElement && root.matches(".shop-asset-outfit .shop-kongjwi-image")) return upgrade(root);
  root.querySelectorAll?.(".shop-asset-outfit .shop-kongjwi-image").forEach(upgrade);
}

mountStyle();
scan();
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node instanceof Element) scan(node);
}))).observe(document.body, { childList: true, subtree: true });
