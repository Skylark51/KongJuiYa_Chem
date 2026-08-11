// Temporary visual fallback until an authored Dolsoe servant asset is available.
// Keep the fallback isolated here so replacing the source art does not affect scene orchestration.
const SERVANT_ASSET = "assets/art/kongjwi/kongjwi-field-work-cutout.png";
const TOOL_ASSETS = Object.freeze({
  wood: "assets/art/kongjwi-tools/wood.png",
  brass: "assets/art/kongjwi-tools/brass.png",
  celadon: "assets/art/kongjwi-tools/celadon.png",
  moon: "assets/art/kongjwi-tools/moon.png"
});

function sceneRoot() {
  return document.querySelector('[data-kongjwi-outfit="night-court"]');
}

function ensureLayer(root) {
  const stack = root?.querySelector("#layeredScene");
  if (!stack) return null;
  let layer = stack.querySelector(".scene-court-servants");
  if (layer) return layer;
  layer = document.createElement("div");
  layer.className = "scene-court-servants";
  layer.setAttribute("aria-hidden", "true");
  for (const side of ["left", "right"]) {
    const servant = document.createElement("div");
    servant.className = `court-servant court-servant-${side}`;
    const character = document.createElement("img");
    character.className = "court-servant-character";
    character.alt = "";
    character.src = SERVANT_ASSET;
    const tool = document.createElement("img");
    tool.className = "court-servant-tool";
    tool.alt = "";
    servant.append(character, tool);
    layer.append(servant);
  }
  stack.append(layer);
  return layer;
}

export function isCourtServantMode() {
  return Boolean(sceneRoot());
}

export function playCourtServantPour() {
  const root = sceneRoot();
  if (!root) return false;
  const layer = ensureLayer(root);
  if (!layer) return false;
  const toolKey = root.dataset.toolSkin || "wood";
  const toolUrl = TOOL_ASSETS[toolKey] || TOOL_ASSETS.wood;
  layer.querySelectorAll(".court-servant-tool").forEach(img => { img.src = toolUrl; });
  layer.classList.remove("is-active");
  void layer.offsetWidth;
  layer.classList.add("is-active");
  return true;
}

export function resetCourtServantPour() {
  document.querySelectorAll(".scene-court-servants.is-active").forEach(node => node.classList.remove("is-active"));
}
