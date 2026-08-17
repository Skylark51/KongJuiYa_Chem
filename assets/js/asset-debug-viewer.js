const MANIFEST_URL = "assets/그림/게임-장면/manifest.json?v=20260807-source-locked-jars1";
const STYLE_ID = "asset-source-inspector-style";
const BUTTON_ID = "ui-assetInspectorButton";
const DIALOG_ID = "ui-assetInspectorDialog";

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .asset-source-inspector {
      width: min(94vw, 760px);
      max-height: min(88vh, 760px);
      padding: 0;
      border: 1px solid rgba(222, 199, 72, .58);
      border-radius: 18px;
      color: #f3ecd2;
      background: #090d11;
      box-shadow: 0 20px 70px rgba(0,0,0,.62);
    }
    .asset-source-inspector::backdrop { background: rgba(0,0,0,.72); backdrop-filter: blur(4px); }
    .asset-inspector-form { display: grid; gap: 12px; padding: 16px; }
    .asset-inspector-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .asset-inspector-head h2 { margin:0; font-size:18px; }
    .asset-inspector-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; overflow:auto; }
    .asset-inspector-card { min-width:0; padding:10px; border:1px solid rgba(255,255,255,.1); border-radius:14px; background:rgba(255,255,255,.035); }
    .asset-inspector-card h3 { margin:0 0 8px; font-size:14px; }
    .asset-inspector-frame { height:250px; display:grid; place-items:center; overflow:hidden; border-radius:10px; background:linear-gradient(45deg,#14191f 25%,#0e1318 25% 50%,#14191f 50% 75%,#0e1318 75%); background-size:18px 18px; }
    .asset-inspector-frame img { display:block; max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; }
    .asset-inspector-meta { margin:8px 0 0; white-space:pre-wrap; overflow-wrap:anywhere; font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace; color:#c8d0d8; }
    .asset-inspector-close { min-height:38px; padding:0 18px; border:0; border-radius:10px; font-weight:800; background:#d6b900; color:#16130a; }
    #${BUTTON_ID} { font-size:15px; }
    @media (max-width:600px) {
      .asset-source-inspector { width:96vw; }
      .asset-inspector-grid { grid-template-columns:1fr; }
      .asset-inspector-frame { height:210px; }
    }
  `;
  document.head.append(style);
}

function sourceCard(label) {
  const section = document.createElement("section");
  section.className = "asset-inspector-card";
  const title = document.createElement("h3");
  title.textContent = label;
  const frame = document.createElement("div");
  frame.className = "asset-inspector-frame";
  const image = document.createElement("img");
  image.alt = `${label} 원본 PNG`;
  image.draggable = false;
  frame.append(image);
  const meta = document.createElement("pre");
  meta.className = "asset-inspector-meta";
  section.append(title, frame, meta);
  return { section, image, meta };
}

function renderMetrics(card, { key, src, layerSelector, expectedRatio = null }) {
  card.image.onload = () => {
    const layer = document.querySelector(layerSelector);
    const rect = layer?.getBoundingClientRect();
    const naturalRatio = card.image.naturalHeight ? card.image.naturalWidth / card.image.naturalHeight : 0;
    const renderedRatio = rect?.height ? rect.width / rect.height : 0;
    const distortion = expectedRatio && renderedRatio
      ? ((renderedRatio / expectedRatio - 1) * 100)
      : null;
    card.meta.textContent = [
      `skin: ${key}`,
      `source: ${src}`,
      `natural: ${card.image.naturalWidth} × ${card.image.naturalHeight}`,
      rect ? `scene box: ${Math.round(rect.width)} × ${Math.round(rect.height)}` : "scene box: -",
      expectedRatio ? `sprite ratio: ${expectedRatio.toFixed(3)}` : `source ratio: ${naturalRatio.toFixed(3)}`,
      distortion == null ? "" : `box delta: ${distortion >= 0 ? "+" : ""}${distortion.toFixed(1)}%`
    ].filter(Boolean).join("\n");
  };
  card.image.src = src;
}

async function loadInspector(dialog, cards) {
  const root = document.getElementById("ui-gameApp");
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`manifest ${response.status}`);
  const manifest = await response.json();

  const outfit = root?.dataset.kongjwiOutfit || "classic-red";
  const tool = root?.dataset.toolSkin || "wood";
  const jar = root?.dataset.jarSkin || "onggi";
  const outfitAsset = manifest.assets.kongjwi[outfit] || manifest.assets.kongjwi["classic-red"];
  const toolAsset = manifest.assets.tools[tool] || manifest.assets.tools.wood;
  const jarAsset = manifest.assets.jars[jar] || manifest.assets.jars.onggi;

  renderMetrics(cards.kongjwi, {
    key: outfit,
    src: outfitAsset.fallback,
    layerSelector: "#layeredScene > .scene-kongjwi",
    expectedRatio: manifest.sprites.kongjwi.cell.width / manifest.sprites.kongjwi.cell.height
  });
  renderMetrics(cards.tool, {
    key: tool,
    src: toolAsset.fallback,
    layerSelector: "#layeredScene > .scene-tool",
    expectedRatio: manifest.sprites.tool.cell.width / manifest.sprites.tool.cell.height
  });
  renderMetrics(cards.jar, {
    key: jar,
    src: jarAsset.sourceClosed || jarAsset.fallback,
    layerSelector: "#layeredScene > .scene-jar-back",
    expectedRatio: manifest.sprites.jar.cell.width / manifest.sprites.jar.cell.height
  });
  dialog.dataset.loaded = "true";
}

function installInspector() {
  if (document.getElementById(BUTTON_ID)) return;
  const header = document.querySelector(".header-status");
  if (!header) return;
  installStyle();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "header-button";
  button.textContent = "◉";
  button.title = "현재 콩쥐·바가지·장독대 원본 에셋 확인";
  button.setAttribute("aria-label", "원본 에셋 확인");

  const dialog = document.createElement("dialog");
  dialog.id = DIALOG_ID;
  dialog.className = "asset-source-inspector";
  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "asset-inspector-form";
  const head = document.createElement("div");
  head.className = "asset-inspector-head";
  const heading = document.createElement("h2");
  heading.textContent = "현재 장착 원본 에셋";
  const close = document.createElement("button");
  close.className = "asset-inspector-close";
  close.value = "close";
  close.textContent = "닫기";
  head.append(heading, close);

  const grid = document.createElement("div");
  grid.className = "asset-inspector-grid";
  const cards = {
    kongjwi: sourceCard("콩쥐"),
    tool: sourceCard("바가지"),
    jar: sourceCard("장독대 기준 원본")
  };
  grid.append(cards.kongjwi.section, cards.tool.section, cards.jar.section);
  form.append(head, grid);
  dialog.append(form);
  document.body.append(dialog);
  header.insertBefore(button, header.lastElementChild);

  button.addEventListener("click", async () => {
    dialog.showModal();
    try {
      await loadInspector(dialog, cards);
    } catch (error) {
      cards.kongjwi.meta.textContent = `에셋 정보를 불러오지 못했습니다.\n${error?.message || error}`;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installInspector, { once: true });
} else {
  installInspector();
}
