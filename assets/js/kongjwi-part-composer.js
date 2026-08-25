/**
 * Pixel-preserving Kongjwi outfit-part composer.
 *
 * Runtime parts live under the Korean canonical asset tree. This module only
 * swaps authored layers and applies DOM transforms; it never regenerates art.
 */

export const KONGJWI_ASSET_ROOT = "assets/그림/공용/콩쥐/파츠/";
const ASSET_VERSION = "20260821-korean-assets1";

export const KONGJWI_RIGS = Object.freeze({
  "classic-red": Object.freeze({ root: "고전-홍색-한복/" }),
  "blue-scholar": Object.freeze({ root: "청색-학자복/" }),
  "field-green": Object.freeze({ root: "농사일-작업복/" }),
  "royal-night": Object.freeze({ root: "야간-궁중복/" })
});

export const KONGJWI_PARTS = Object.freeze({
  torso: "torso.png",
  lowerBody: "lower-body.png",
  armLeft: "arm-left.png",
  armRight: "arm-right.png",
  hairNeck: "head-hair-neck.png"
});

const EXPRESSION_FILES = Object.freeze({
  neutral: "face-neutral.png",
  focused: "face-focused.png",
  correct: "face-correct.png",
  wrong: "face-wrong.png",
  timeout: "face-timeout.png",
  celebrate: "face-celebrate.png"
});

const TOOL_ROWS = Object.freeze({ wood: 0, brass: 1, celadon: 2, moon: 3 });
const TOOL_FILES = Object.freeze({
  wood: "assets/그림/공용/원본/바가지/나무-바가지.png",
  brass: "assets/그림/공용/원본/바가지/놋쇠-바가지.png",
  celadon: "assets/그림/공용/원본/바가지/청자-바가지.png",
  moon: "assets/그림/공용/원본/바가지/월광-바가지.png"
});

const PART_ORDER = Object.freeze([
  ["torso", KONGJWI_PARTS.torso],
  ["lower-body", KONGJWI_PARTS.lowerBody],
  ["arm-left", KONGJWI_PARTS.armLeft],
  ["arm-right", KONGJWI_PARTS.armRight],
  ["head-hair-neck", KONGJWI_PARTS.hairNeck],
  ["face", EXPRESSION_FILES.neutral]
]);

const POSES = Object.freeze({
  standing: Object.freeze({
    canvas: "translate3d(0, 0, 0) rotate(0deg)", torso: "translate3d(0, 0, 0) rotate(0deg)",
    lowerBody: "translate3d(0, 0, 0) rotate(0deg)", armLeft: "translate3d(0, 0, 0) rotate(0deg)",
    armRight: "translate3d(0, 0, 0) rotate(0deg)", hairNeck: "translate3d(0, 0, 0) rotate(0deg)",
    face: "translate3d(0, 0, 0) rotate(0deg)", tool: "translate3d(0, 0, 0) rotate(0deg)"
  }),
  pour: Object.freeze({
    canvas: "translate3d(0, -1.2%, 0) rotate(-2deg)", torso: "translate3d(0, 0, 0) rotate(-1deg)",
    lowerBody: "translate3d(0, 0, 0) rotate(0deg)", armLeft: "translate3d(-1.5%, -2.4%, 0) rotate(-13deg)",
    armRight: "translate3d(1.4%, -1.2%, 0) rotate(18deg)", hairNeck: "translate3d(-1%, -1.2%, 0) rotate(-4deg)",
    face: "translate3d(-1%, -1.2%, 0) rotate(-4deg)", tool: "translate3d(65%, -18%, 0) rotate(-38deg)"
  }),
  wrong: Object.freeze({
    canvas: "translate3d(1.2%, 0, 0) rotate(3deg)", torso: "translate3d(0, 0, 0) rotate(2deg)",
    lowerBody: "translate3d(0, 0, 0) rotate(1deg)", armLeft: "translate3d(-2%, 1%, 0) rotate(8deg)",
    armRight: "translate3d(2%, 1%, 0) rotate(-9deg)", hairNeck: "translate3d(1.5%, 0, 0) rotate(7deg)",
    face: "translate3d(1.5%, 0, 0) rotate(7deg)", tool: "translate3d(-8%, 7%, 0) rotate(14deg)"
  }),
  timeout: Object.freeze({
    canvas: "translate3d(0.8%, 1%, 0) rotate(2deg)", torso: "translate3d(0, 1%, 0) rotate(1deg)",
    lowerBody: "translate3d(0, 1%, 0) rotate(1deg)", armLeft: "translate3d(-1%, 2%, 0) rotate(6deg)",
    armRight: "translate3d(1%, 2%, 0) rotate(-5deg)", hairNeck: "translate3d(0, 2%, 0) rotate(5deg)",
    face: "translate3d(0, 2%, 0) rotate(5deg)", tool: "translate3d(-6%, 8%, 0) rotate(10deg)"
  }),
  celebrate: Object.freeze({
    canvas: "translate3d(0, -1.8%, 0) rotate(-1deg)", torso: "translate3d(0, -1%, 0) rotate(-1deg)",
    lowerBody: "translate3d(0, 0, 0) rotate(0deg)", armLeft: "translate3d(-2%, -3%, 0) rotate(-18deg)",
    armRight: "translate3d(2%, -3%, 0) rotate(18deg)", hairNeck: "translate3d(0, -2%, 0) rotate(-2deg)",
    face: "translate3d(0, -2%, 0) rotate(-2deg)", tool: "translate3d(55%, -20%, 0) rotate(-34deg)"
  })
});

const EXPRESSION_TO_POSE = Object.freeze({ neutral: "standing", focused: "standing", correct: "pour", wrong: "wrong", timeout: "timeout", celebrate: "celebrate" });
const VALID_EXPRESSIONS = new Set(Object.keys(EXPRESSION_TO_POSE));

function setStyle(element, property, value) { element?.style?.setProperty(property, value); }
function rigFor(outfit) { return KONGJWI_RIGS[outfit] ? outfit : "classic-red"; }
function assetUrl(outfit, file) {
  const key = rigFor(outfit);
  return `${KONGJWI_ASSET_ROOT}${KONGJWI_RIGS[key].root}${file}?v=${ASSET_VERSION}`;
}
function createPart(name, file, outfit = "classic-red") {
  const image = document.createElement("img");
  image.className = "kongjwi-part kongjwi-part-image";
  image.dataset.part = name;
  image.src = assetUrl(outfit, file);
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  return image;
}
function createTool() {
  const tool = document.createElement("span");
  tool.className = "kongjwi-part kongjwi-tool-part";
  tool.dataset.part = "tool";
  tool.setAttribute("aria-hidden", "true");
  return tool;
}
function createImpactLayer() {
  const layer = document.createElement("span");
  layer.className = "kongjwi-impact-layer";
  layer.setAttribute("aria-hidden", "true");
  for (const name of ["one", "two", "three"]) {
    const stone = document.createElement("i");
    stone.className = "kongjwi-stone";
    stone.dataset.stone = name;
    layer.append(stone);
  }
  return layer;
}

export function mountKongjwiComposer(host, { root = document.documentElement, dashboard = false } = {}) {
  if (!host) return null;
  if (host.__kongjwiPartComposer) return host.__kongjwiPartComposer;
  host.classList.add("kongjwi-part-host");
  host.dataset.kongjwiParts = "loading";
  const canvas = document.createElement("div");
  canvas.className = "kongjwi-part-canvas";
  canvas.dataset.character = "kongjwi";
  canvas.dataset.canvas = "256x384";
  canvas.dataset.dashboard = dashboard ? "true" : "false";
  canvas.setAttribute("aria-hidden", "true");

  const layers = new Map();
  for (const [name, file] of PART_ORDER) {
    const layer = createPart(name, file);
    canvas.append(layer);
    layers.set(name, layer);
  }
  const tool = createTool();
  const impact = createImpactLayer();
  canvas.append(tool, impact);
  host.replaceChildren(canvas);

  let pose = "standing";
  let expression = "neutral";
  let outfit = "classic-red";
  let resetTimer = 0;
  let hitTimer = 0;
  let destroyed = false;
  const removers = [];

  function listen(type, handler) { globalThis.addEventListener(type, handler); removers.push(() => globalThis.removeEventListener(type, handler)); }
  function setFace(nextExpression = expression) {
    const next = VALID_EXPRESSIONS.has(nextExpression) ? nextExpression : "neutral";
    const face = layers.get("face");
    if (face) face.src = assetUrl(outfit, EXPRESSION_FILES[next]);
  }
  function setOutfit(visualKey = root?.dataset?.kongjwiOutfit || "classic-red") {
    if (destroyed) return;
    outfit = rigFor(visualKey);
    for (const [name, file] of PART_ORDER) {
      if (name === "face") continue;
      const layer = layers.get(name);
      if (layer) layer.src = assetUrl(outfit, file);
    }
    setFace(expression);
    canvas.dataset.outfit = outfit;
    root?.setAttribute?.("data-kongjwi-rig", outfit);
  }
  function setTool(visualKey = root?.dataset?.toolSkin || "wood") {
    const key = Object.hasOwn(TOOL_ROWS, visualKey) ? visualKey : "wood";
    tool.dataset.toolSkin = key;
    tool.style.backgroundImage = `url("${TOOL_FILES[key]}?v=${ASSET_VERSION}")`;
    root?.setAttribute?.("data-kongjwi-tool", key);
  }
  function setPose(nextPose = "standing", { retrigger = true } = {}) {
    if (destroyed) return;
    const next = POSES[nextPose] ? nextPose : "standing";
    pose = next;
    const plan = POSES[next];
    canvas.dataset.pose = next;
    canvas.dataset.pouring = next === "pour" ? "true" : "false";
    root?.setAttribute?.("data-kongjwi-pouring", canvas.dataset.pouring);
    setStyle(canvas, "--kongjwi-canvas-transform", plan.canvas);
    setStyle(layers.get("torso"), "--kongjwi-part-transform", plan.torso);
    setStyle(layers.get("lower-body"), "--kongjwi-part-transform", plan.lowerBody);
    setStyle(layers.get("arm-left"), "--kongjwi-part-transform", plan.armLeft);
    setStyle(layers.get("arm-right"), "--kongjwi-part-transform", plan.armRight);
    setStyle(layers.get("head-hair-neck"), "--kongjwi-part-transform", plan.hairNeck);
    setStyle(layers.get("face"), "--kongjwi-part-transform", plan.face);
    setStyle(tool, "--kongjwi-part-transform", plan.tool);
    if (retrigger) { canvas.classList.remove("is-moving"); void canvas.offsetWidth; canvas.classList.add("is-moving"); }
  }
  function clearResetTimer() { globalThis.clearTimeout(resetTimer); resetTimer = 0; }
  function clearHitTimer() { globalThis.clearTimeout(hitTimer); hitTimer = 0; }
  function triggerHit() {
    if (destroyed) return;
    clearHitTimer();
    canvas.dataset.hit = "true";
    canvas.classList.remove("is-hit");
    void canvas.offsetWidth;
    canvas.classList.add("is-hit");
    hitTimer = globalThis.setTimeout(() => { canvas.classList.remove("is-hit"); canvas.dataset.hit = "false"; }, 760);
  }
  function setExpression(nextExpression = "neutral", { duration = 1120, persistent = false } = {}) {
    if (destroyed) return;
    const next = VALID_EXPRESSIONS.has(nextExpression) ? nextExpression : "neutral";
    expression = next;
    clearResetTimer();
    canvas.dataset.expression = next;
    setFace(next);
    setPose(EXPRESSION_TO_POSE[next], { retrigger: next !== "neutral" });
    if (!persistent && next !== "neutral") {
      resetTimer = globalThis.setTimeout(() => {
        if (destroyed) return;
        expression = "neutral";
        canvas.dataset.expression = "neutral";
        setFace("neutral");
        setPose("standing", { retrigger: false });
      }, Math.max(720, Number(duration) || 1120));
    }
  }
  function syncCosmetics() {
    if (destroyed) return;
    setOutfit(root?.dataset?.kongjwiOutfit || "classic-red");
    setTool(root?.dataset?.toolSkin || "wood");
    host.dataset.kongjwiParts = "ready";
  }

  listen("answer:correct", event => { const combo = Number(event?.detail?.combo) || 0; setExpression("correct", { duration: combo >= 3 ? 1320 : 1120 }); });
  listen("answer:wrong", () => { setExpression("wrong", { duration: 1180 }); triggerHit(); });
  listen("answer:timeout", () => { setExpression("timeout", { duration: 1350 }); triggerHit(); });
  listen("game:clear", () => setExpression("celebrate", { persistent: true }));
  listen("game:over", () => { setExpression("wrong", { persistent: true }); triggerHit(); });
  listen("game:pause", () => setPose("standing", { retrigger: false }));
  listen("game:resume", () => setExpression("neutral"));

  const observer = root && typeof MutationObserver === "function" ? new MutationObserver(syncCosmetics) : null;
  observer?.observe(root, { attributes: true, attributeFilter: ["data-kongjwi-outfit", "data-tool-skin"] });

  const composer = {
    host, canvas, layers, tool, impact,
    get pose() { return pose; }, get expression() { return expression; }, get outfit() { return outfit; },
    setPose, setExpression, setOutfit, setTool, syncCosmetics, triggerHit,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearResetTimer();
      clearHitTimer();
      canvas.classList.remove("is-hit");
      observer?.disconnect();
      removers.splice(0).forEach(remove => remove());
      host.__kongjwiPartComposer = null;
      host.removeAttribute("data-kongjwi-parts");
    }
  };

  host.__kongjwiPartComposer = composer;
  syncCosmetics();
  setPose("standing", { retrigger: false });
  globalThis.__KONGJWI_PART_COMPOSER__ = composer;
  return composer;
}

export { EXPRESSION_FILES, EXPRESSION_TO_POSE, POSES, TOOL_ROWS };
