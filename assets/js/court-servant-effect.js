// Authored night-court servant assets promoted into the canonical Korean runtime tree.
const ASSET_VERSION = "20260821-korean-assets1";
const DOLSOE_SHEET = "assets/그림/게임-장면/효과/궁중복-하인/돌쇠-동작.png";
const WATER_DROPLETS_SHEET = "assets/그림/게임-장면/효과/궁중복-하인/물방울-동작.png";

function assetUrl(pathname) {
  const url = new URL(pathname, document.baseURI);
  url.searchParams.set("v", ASSET_VERSION);
  return url.href;
}
function sceneRoot() { return document.querySelector('[data-kongjwi-outfit="night-court"]'); }
function ensureLayer(root) {
  const stack = root?.querySelector("#layeredScene");
  if (!stack) return null;
  let layer = stack.querySelector(".scene-court-servants");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.className = "scene-court-servants";
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.assetMode = "authored-dolsoe";
  const servant = document.createElement("div");
  servant.className = "court-servant court-servant-authored";
  servant.style.setProperty("--dolsoe-sheet", `url("${assetUrl(DOLSOE_SHEET)}")`);
  const droplets = document.createElement("div");
  droplets.className = "court-servant-water-droplets";
  droplets.style.setProperty("--court-water-sheet", `url("${assetUrl(WATER_DROPLETS_SHEET)}")`);
  layer.append(servant, droplets);
  stack.append(layer);
  return layer;
}
export function isCourtServantMode() { return Boolean(sceneRoot()); }
export function playCourtServantPour() {
  const root = sceneRoot();
  if (!root) return false;
  const layer = ensureLayer(root);
  if (!layer) return false;
  layer.classList.remove("is-active");
  void layer.offsetWidth;
  layer.classList.add("is-active");
  return true;
}
export function resetCourtServantPour() {
  document.querySelectorAll(".scene-court-servants.is-active").forEach(node => node.classList.remove("is-active"));
}
