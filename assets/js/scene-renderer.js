import { createSceneStateController } from "./scene-state-machine.js";
import { resolveSceneCosmeticEffects } from "./scene-cosmetic-effects.js";

const MANIFEST_URL = new URL("../그림/게임-장면/manifest.json?v=20260815-blue-scholar-motionfix2", import.meta.url).href;
const RUNTIME_STYLE_ID = "layered-scene-animation-runtime";
const RUNTIME_STYLE_URL = new URL("../css/game-asset-animation.css?v=20260815-blue-scholar-motionfix2", import.meta.url).href;
const SITE_ROOT_URL = new URL("../../", import.meta.url);
const ORDER = [
  "scene-background", "scene-kongjwi", "scene-tool", "scene-water-stream",
  "scene-jar-back", "scene-water-fill", "scene-toad-skin", "scene-toad-expression",
  "scene-jar-front", "scene-water-splash", "scene-water-leak", "scene-foreground", "scene-ui"
];
const ALIAS = {
  outfit: { classic: "classic-red", scholar: "blue-scholar", "field-green": "field-work", "royal-night": "night-court" },
  jar: { clay: "onggi", moon: "moon-white", lacquer: "night-lacquer" },
  toad: { brown: "field-brown", gold: "gold-worker", jade: "jade-guard", star: "star-night" }
};

const key = (value, aliases, fallback) => aliases?.[String(value || "").trim()] || String(value || "").trim() || fallback;
const layer = (stack, name) => stack?.querySelector(`.${name}`) || null;
const versionedAssetUrl = (url, version) => {
  if (!url) return "";
  const resolved = new URL(url, SITE_ROOT_URL);
  resolved.searchParams.set("scene", version || "unversioned");
  return resolved.href;
};
const target = (manifest, primary, fallback = null) => manifest.availability?.[primary] === true
  ? { url: versionedAssetUrl(primary, manifest.version), authored: true }
  : fallback ? { url: versionedAssetUrl(fallback, manifest.version), authored: false } : { url: "", authored: false };
const emptyAsset = () => ({ url: "", authored: false });

function ensureRuntimeStylesheet() {
  const existing = document.getElementById(RUNTIME_STYLE_ID);
  if (existing?.sheet) return Promise.resolve();

  const link = existing || document.createElement("link");
  return new Promise((resolve, reject) => {
    const done = () => {
      link.dataset.loaded = "true";
      resolve();
    };
    const fail = () => reject(new Error("레이어 장면 런타임 CSS를 불러오지 못했습니다."));
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", fail, { once: true });
    if (!existing) {
      link.id = RUNTIME_STYLE_ID;
      link.rel = "stylesheet";
      link.href = RUNTIME_STYLE_URL;
      document.head.append(link);
    }
    if (link.sheet) done();
  });
}

function box(element, value, logical) {
  if (!element || !value) return;
  element.style.setProperty("--scene-x", `${value.x / logical.width * 100}%`);
  element.style.setProperty("--scene-y", `${value.y / logical.height * 100}%`);
  element.style.setProperty("--scene-width", `${value.width / logical.width * 100}%`);
  element.style.setProperty("--scene-height", `${value.height / logical.height * 100}%`);
}

function fitStackToHost(host, stack, logical) {
  if (!host || !stack || !logical?.width || !logical?.height) return;
  const hostWidth = Math.max(1, host.clientWidth || host.getBoundingClientRect().width || 1);
  const hostHeight = Math.max(1, host.clientHeight || host.getBoundingClientRect().height || 1);
  const scale = Math.min(hostWidth / logical.width, hostHeight / logical.height);
  const renderWidth = logical.width * scale;
  const renderHeight = logical.height * scale;
  stack.style.setProperty("--scene-render-width", `${renderWidth}px`);
  stack.style.setProperty("--scene-render-height", `${renderHeight}px`);
  stack.style.setProperty("--scene-uniform-scale", String(scale));
  stack.dataset.scaleMode = "uniform-contain";
  stack.dataset.logicalAspect = `${logical.width}:${logical.height}`;
}

function createStack(host, manifest) {
  let stack = host.querySelector("#layeredScene");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "layeredScene";
    stack.className = "scene-layer-stack";
    stack.setAttribute("aria-hidden", "true");
    host.prepend(stack);
  }

  stack.replaceChildren(...ORDER.map(name => {
    const node = document.createElement("div");
    node.className = `scene-layer ${name}`;
    node.style.zIndex = String(manifest.layers[name] ?? 0);
    return node;
  }));
  return stack;
}

function clearLayer(node) {
  if (!node) return;
  node.replaceChildren();
  node.hidden = true;
  node.dataset.authored = "false";
  node.dataset.spriteMode = "none";
}

function image(node, asset, cover = false) {
  if (!node) return;
  node.replaceChildren();
  node.dataset.authored = String(asset.authored);
  node.dataset.spriteMode = "static";
  if (!asset.url) {
    node.hidden = true;
    return;
  }

  const img = document.createElement("img");
  img.className = `scene-layer-image${cover ? " is-cover" : ""}`;
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.src = asset.url;
  node.hidden = false;
  node.append(img);
}

function sprite(node, asset, spec, frame = 0) {
  if (!node) return;
  node.replaceChildren();
  node.dataset.authored = String(asset.authored);
  if (!asset.url) {
    node.hidden = true;
    node.dataset.spriteMode = "none";
    return;
  }
  if (!asset.authored) {
    image(node, asset);
    return;
  }

  const span = document.createElement("span");
  span.className = "scene-sprite";
  const count = Math.max(1, Number(spec.frames || 1));
  const columns = Math.max(1, Number(spec.columns || count));
  const rows = Math.max(1, Number(spec.rows || 1));
  span.style.setProperty("--scene-frame-count", String(count));
  span.style.setProperty("--scene-frame-columns", String(columns));
  span.style.setProperty("--scene-frame-rows", String(rows));

  if (rows > 1) {
    // A multi-row sheet is one oversized image clipped by one frame-sized
    // viewport. Avoid background-position rounding on mobile Safari.
    span.classList.add("scene-sprite-grid");
    const sheet = document.createElement("img");
    sheet.className = "scene-sprite-sheet-image";
    sheet.alt = "";
    sheet.draggable = false;
    sheet.decoding = "async";
    sheet.src = asset.url;
    sheet.style.width = `${columns * 100}%`;
    sheet.style.height = `${rows * 100}%`;
    span.append(sheet);
  } else {
    span.style.backgroundImage = `url("${asset.url}")`;
  }

  node.dataset.spriteColumns = String(columns);
  node.dataset.spriteRows = String(rows);
  node.dataset.spriteMode = "sheet";
  node.hidden = false;
  node.append(span);
  frameOf(node, frame);
}
function fallbackWaterArc(node) {
  if (!node) return;
  node.replaceChildren();
  node.dataset.authored = "false";
  node.dataset.spriteMode = "fallback-arc";
  node.hidden = false;
  const arc = document.createElement("span");
  arc.className = "scene-fallback-water-arc";
  arc.append(document.createElement("i"), document.createElement("i"));
  node.append(arc);
}

function frameOf(node, frame) {
  const spriteNode = node?.querySelector(".scene-sprite");
  if (!spriteNode || node.dataset.spriteMode !== "sheet") return;
  const count = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-count")) || 1);
  const columns = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-columns")) || count);
  const rows = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-rows")) || 1);
  const next = Math.max(0, Math.min(count - 1, Number(frame) || 0));

  if (rows > 1) {
    const column = next % columns;
    const row = Math.floor(next / columns);
    const sheet = spriteNode.querySelector(".scene-sprite-sheet-image");
    if (!sheet) return;
    // transform percentages are relative to the oversized image. Moving by
    // 100/columns% or 100/rows% therefore advances exactly one frame cell.
    const x = -(column / columns) * 100;
    const y = -(row / rows) * 100;
    sheet.style.transform = `translate3d(${x}%, ${y}%, 0)`;
  } else {
    spriteNode.style.backgroundPosition = `${count <= 1 ? 0 : next / (count - 1) * 100}% center`;
  }
  node.dataset.frame = String(next);
}
function preload(urls) {
  for (const url of new Set(urls.filter(Boolean))) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

function applyJarOffset(stack, manifest, jarKey) {
  const offset = manifest.jarOffsets?.[jarKey] || { x: 0, y: 0, scale: 1 };
  for (const name of ["scene-jar-back", "scene-jar-front"]) {
    const node = layer(stack, name);
    node?.style.setProperty("--jar-offset-x", String(offset.x || 0));
    node?.style.setProperty("--jar-offset-y", String(offset.y || 0));
    node?.style.setProperty("--jar-offset-scale", String(offset.scale || 1));
  }
}

export function mountSceneRenderer(root, { cosmetics = {} } = {}) {
  if (!root) throw new Error("장면 렌더러 루트가 없습니다.");
  if (root.__layeredSceneRenderer) return root.__layeredSceneRenderer;

  const host = root.querySelector(".scene-animation-zone") || root.querySelector("#visualStage") || root;
  let manifest;
  let stack;
  let controller;
  let resizeObserver;
  let disposed = false;
  let current = { ...cosmetics };
  let expression = "default";
  let expressionMode = "none";
  let water = 70;
  let revision = 0;

  const renderer = {
    ready: null,
    setCosmetics(next = {}) {
      current = { ...current, ...next };
      if (manifest) load();
    },
    getKongjwiOutfit() {
      return key(current.kongjwiOutfit || current.outfit || root.dataset.kongjwiOutfit, ALIAS.outfit, "underlayer");
    },
    setFrame(name, frame) {
      const map = {
        kongjwi: "scene-kongjwi",
        tool: "scene-tool",
        waterStream: "scene-water-stream",
        waterSplash: "scene-water-splash",
        waterLeak: "scene-water-leak"
      };
      frameOf(layer(stack, name.startsWith("scene-") ? name : map[name]), frame);
    },
    setExpression(next = "default") {
      expression = manifest?.frames?.toadExpression?.[next] == null ? "default" : next;
      const node = layer(stack, "scene-toad-expression");
      if (expressionMode === "overlay") {
        frameOf(node, manifest.frames.toadExpression[expression]);
      } else if (expressionMode === "full-fallback") {
        const img = node?.querySelector("img");
        if (img) img.src = versionedAssetUrl(
          manifest.assets.toadFallback[expression] || manifest.assets.toadFallback.default,
          manifest.version
        );
      }
      if (stack) stack.dataset.toadExpression = expression;
    },
    setWaterLevel(value) {
      water = Math.max(0, Math.min(100, Number(value) || 0));
      stack?.style.setProperty("--scene-water-level", `${water}%`);
      stack?.setAttribute("data-water-level", String(Math.round(water)));
    },
    setFlowPhase(next = "idle") {
      if (stack) stack.dataset.waterFlow = next;
      root.dataset.waterFlow = next;
    },
    setState(next = "idle") {
      if (stack) stack.dataset.sceneState = next;
      root.dataset.sceneState = next;
    },
    destroy() {
      disposed = true;
      revision += 1;
      resizeObserver?.disconnect();
      resizeObserver = null;
      controller?.destroy();
      root.__layeredSceneRenderer = null;
    }
  };

  async function load() {
    const token = ++revision;
    const a = manifest.assets;
    const s = manifest.sprites;
    const logical = manifest.logicalSize;
    const outfit = key(current.kongjwiOutfit || current.outfit || root.dataset.kongjwiOutfit, ALIAS.outfit, "underlayer");
    const toolKey = key(current.toolSkin || current.tool || root.dataset.toolSkin, null, "wood");
    const jarKey = key(current.jarSkin || current.jar || root.dataset.jarSkin, ALIAS.jar, "onggi");
    const toadKey = key(current.toadSkin || current.toad || root.dataset.toadSkin, ALIAS.toad, "field-brown");
    const toolAsset = a.tools[toolKey] || a.tools.wood;
    const jarAsset = a.jars[jarKey] || a.jars.onggi;
    const toadAsset = a.toads[toadKey] || a.toads["field-brown"];
    const expressionDefinition = a.effects.toadExpression;
    const expressionPath = typeof expressionDefinition === "string"
      ? expressionDefinition
      : expressionDefinition?.enabled === true
        ? expressionDefinition.path
        : null;

    const outfitAsset = a.kongjwi[outfit] || a.kongjwi.underlayer;
    const authoredKongjwi = target(manifest, outfitAsset.sheet, outfitAsset.fallback);
    const authoredTool = target(manifest, toolAsset.sheet, toolAsset.fallback);
    const motionRig = authoredKongjwi.authored && authoredTool.authored;
    const chosen = {
      background: target(manifest, a.background.path, a.background.fallback),
      foreground: target(manifest, a.foreground.path, a.foreground.fallback),
      kongjwi: authoredKongjwi,
      tool: motionRig ? authoredTool : { url: toolAsset.fallback, authored: false },
      jar: target(manifest, jarAsset.layers, jarAsset.fallback),
      toad: target(manifest, toadAsset.skin),
      expression: target(manifest, expressionPath),
      stream: motionRig ? target(manifest, a.effects.waterStream) : emptyAsset(),
      splash: motionRig ? target(manifest, a.effects.waterSplash) : emptyAsset(),
      leak: target(manifest, a.effects.waterLeak),
      surface: target(manifest, a.effects.waterSurface)
    };

    const preloadUrls = Object.values(chosen).map(item => item.url);
    if (!chosen.toad.authored) preloadUrls.push(versionedAssetUrl(
      a.toadFallback[expression] || a.toadFallback.default,
      manifest.version
    ));
    preload(preloadUrls);
    if (disposed || token !== revision) return;

    image(layer(stack, "scene-background"), chosen.background, true);
    image(layer(stack, "scene-foreground"), chosen.foreground, true);
    const kongjwiSpriteSpec = outfitAsset.sprite || s.kongjwi;
    const isBlueScholar30f = outfit === "blue-scholar" && Number(kongjwiSpriteSpec.frames) === 30;
    sprite(layer(stack, "scene-kongjwi"), chosen.kongjwi, kongjwiSpriteSpec);
    if (isBlueScholar30f) clearLayer(layer(stack, "scene-tool"));
    else sprite(layer(stack, "scene-tool"), chosen.tool, s.tool);

    if (motionRig && chosen.stream.url) sprite(layer(stack, "scene-water-stream"), chosen.stream, s.waterStream);
    else fallbackWaterArc(layer(stack, "scene-water-stream"));

    if (chosen.jar.authored) {
      sprite(layer(stack, "scene-jar-back"), chosen.jar, s.jar, 0);
      sprite(layer(stack, "scene-jar-front"), chosen.jar, s.jar, 1);
    } else {
      image(layer(stack, "scene-jar-back"), chosen.jar);
      clearLayer(layer(stack, "scene-jar-front"));
    }

    if (chosen.toad.authored) {
      image(layer(stack, "scene-toad-skin"), chosen.toad);
      if (chosen.expression.authored) {
        sprite(layer(stack, "scene-toad-expression"), chosen.expression, s.toadExpression);
        expressionMode = "overlay";
      } else {
        clearLayer(layer(stack, "scene-toad-expression"));
        expressionMode = "skin-only";
      }
    } else {
      clearLayer(layer(stack, "scene-toad-skin"));
      image(layer(stack, "scene-toad-expression"), {
        url: versionedAssetUrl(a.toadFallback[expression] || a.toadFallback.default, manifest.version),
        authored: false
      });
      expressionMode = "full-fallback";
    }

    if (motionRig && chosen.splash.url) sprite(layer(stack, "scene-water-splash"), chosen.splash, s.waterSplash);
    else clearLayer(layer(stack, "scene-water-splash"));
    sprite(layer(stack, "scene-water-leak"), chosen.leak, s.waterLeak);

    const fill = layer(stack, "scene-water-fill");
    fill.replaceChildren();
    if (chosen.jar.authored) {
      const texture = document.createElement("span");
      texture.className = "scene-water-fill-texture";
      if (chosen.surface.url) texture.style.backgroundImage = `url("${chosen.surface.url}")`;
      fill.append(texture);
      fill.hidden = false;
    } else {
      fill.hidden = true;
    }

    const placements = manifest.placements;
    const fallback = manifest.fallbackPlacements || placements;
    const kongjwiPlacement = outfitAsset.placement || (motionRig ? placements.kongjwi : fallback.kongjwi);
    box(layer(stack, "scene-kongjwi"), kongjwiPlacement, logical);
    box(layer(stack, "scene-tool"), motionRig ? placements.tool : fallback.tool, logical);
    box(layer(stack, "scene-water-stream"), motionRig ? placements.waterStream : fallback.waterStream, logical);
    for (const name of ["scene-jar-back", "scene-jar-front"]) box(layer(stack, name), placements.jar, logical);
    box(fill, placements.waterFill, logical);
    const composedToad = manifest.jarCompositions?.[jarKey]?.toad || placements.toad;
    const toadPlacement = expressionMode === "full-fallback" ? (manifest.jarCompositions?.[jarKey]?.toad || fallback.toad) : composedToad;
    for (const name of ["scene-toad-skin", "scene-toad-expression"]) box(layer(stack, name), toadPlacement, logical);
    box(layer(stack, "scene-water-splash"), placements.waterSplash, logical);
    box(layer(stack, "scene-water-leak"), placements.waterLeak, logical);
    applyJarOffset(stack, manifest, jarKey);

    const effects = resolveSceneCosmeticEffects({ outfit, tool: toolKey });
    root.dataset.kongjwiOutfit = outfit;
    root.dataset.toolSkin = toolKey;
    root.dataset.jarSkin = jarKey;
    root.dataset.toadSkin = toadKey;
    root.dataset.outfitFx = effects.outfitFx;
    root.dataset.toolFx = effects.toolFx;
    root.dataset.sceneAssetVersion = manifest.version;
    stack.dataset.kongjwiOutfit = outfit;
    stack.dataset.toolSkin = toolKey;
    stack.dataset.jarSkin = jarKey;
    stack.dataset.toadSkin = toadKey;
    stack.dataset.outfitFx = effects.outfitFx;
    stack.dataset.toolFx = effects.toolFx;
    stack.dataset.assetVersion = manifest.version;
    stack.dataset.kongjwiMode = motionRig ? "sheet" : "static";
    stack.dataset.toolRig = motionRig ? "co-registered" : "static";
    root.dataset.toolRig = stack.dataset.toolRig;
    stack.dataset.jarMode = chosen.jar.authored ? "layers" : "static";
    stack.dataset.toadMode = expressionMode;
    stack.dataset.toadExpressionAsset = expressionDefinition?.validation || (expressionPath ? "enabled" : "none");
    stack.dataset.assetMode = motionRig && chosen.jar.authored && expressionMode === "overlay"
      ? "authored"
      : "coherent-fallback";
    fitStackToHost(host, stack, logical);
    renderer.setWaterLevel(water);
    renderer.setExpression(expression);
    renderer.setFlowPhase(stack.dataset.waterFlow || "idle");
  }

  renderer.ready = (async () => {
    await ensureRuntimeStylesheet();
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`장면 매니페스트 로드 실패 (${response.status})`);
    manifest = await response.json();
    if (manifest.logicalSize?.width !== 2048 || manifest.logicalSize?.height !== 1152) {
      throw new Error("장면 논리 해상도 불일치");
    }
    stack = createStack(host, manifest);
    fitStackToHost(host, stack, manifest.logicalSize);
    if (globalThis.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => fitStackToHost(host, stack, manifest.logicalSize));
      resizeObserver.observe(host);
    } else {
      const resizeHandler = () => fitStackToHost(host, stack, manifest.logicalSize);
      globalThis.addEventListener("resize", resizeHandler);
      resizeObserver = { disconnect: () => globalThis.removeEventListener("resize", resizeHandler) };
    }
    await load();
    if (disposed) return renderer;
    controller = createSceneStateController(renderer, manifest);
    root.dataset.sceneRenderer = "layered-png";
    return renderer;
  })().catch(error => {
    root.dataset.sceneRenderer = "error";
    console.error("레이어 기반 장면 렌더러 초기화 실패", error);
    throw error;
  });

  root.__layeredSceneRenderer = renderer;
  return renderer;
}
