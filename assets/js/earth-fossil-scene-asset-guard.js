const params = new URLSearchParams(location.search);
const ACTIVE = params.get("subject") === "earth-science"
  && params.get("training") === "earth-fossil-type";

const DEFAULT_TOAD = "assets/그림/공용/두꺼비/표정/기본.png";
const DEFAULT_TOOL = "assets/art/kongjwi-tools/wood.png";

function migratedToadPath(image) {
  try {
    const source = new URL(image.currentSrc || image.src, document.baseURI);
    if (!source.pathname.includes("/assets/images/toad-expressions/")) return DEFAULT_TOAD;
    const filename = decodeURIComponent(source.pathname.split("/").pop() || "기본.png");
    return `assets/그림/공용/두꺼비/표정/${filename}`;
  } catch {
    return DEFAULT_TOAD;
  }
}

function fallbackFor(image) {
  if (!(image instanceof HTMLImageElement)) return null;
  if (!image.classList.contains("scene-layer-image")) return null;
  if (!image.closest("#visualStage")) return null;

  if (image.closest(".scene-toad-expression") || image.closest(".scene-toad-skin")) {
    return migratedToadPath(image);
  }
  if (image.closest(".scene-tool")) return DEFAULT_TOOL;
  return null;
}

function hideBrokenLayer(image) {
  image.hidden = true;
  const layer = image.closest(".scene-toad-expression, .scene-toad-skin, .scene-tool");
  if (layer) layer.hidden = true;
}

function handleSceneAssetError(event) {
  const image = event.target;
  const fallbackPath = fallbackFor(image);
  if (!fallbackPath) return;

  const fallbackUrl = new URL(fallbackPath, document.baseURI).href;
  if ((image.currentSrc || image.src) === fallbackUrl) {
    hideBrokenLayer(image);
    return;
  }

  const layer = image.closest(".scene-toad-expression, .scene-toad-skin, .scene-tool");
  if (layer) layer.hidden = false;
  image.hidden = false;
  image.src = fallbackUrl;
}

if (ACTIVE) {
  document.addEventListener("error", handleSceneAssetError, true);
}
