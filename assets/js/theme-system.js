import { siteUrl } from "./site-routing.js";

export const GAME_TITLE = "콩쥐야 줘때써 - 화학편";

const JAR_THUMBNAIL_STYLE_ID = "jar-png-preview-style-v4";
const JAR_PREVIEW_PNGS = Object.freeze({
  onggi: "assets/art/jars/onggi/thumbnail-no-toad.png",
  celadon: "assets/art/jars/celadon/thumbnail-no-toad.png",
  "moon-white": "assets/art/jars/moon-white/thumbnail-no-toad.png",
  "night-lacquer": "assets/art/jars/night-lacquer/thumbnail-no-toad.png"
});
const COSMETIC_STORAGE_KEY = "kongjuiya-cosmetics-v1";
const JAR_ITEM_TO_SKIN = Object.freeze({
  jar_onggi: "onggi",
  jar_celadon: "celadon",
  jar_moon_white: "moon-white",
  jar_night_lacquer: "night-lacquer"
});

const ids = [
  "atomic_number", "atomic_mass", "period_group", "valence_electron",
  "electron_configuration", "ion_charge", "electronegativity", "atomic_radius",
  "ionization_energy", "bond_type", "bond_polarity", "ionic_formula",
  "formula_mass", "mole_mass", "mole_particles", "gas_molar_volume",
  "concentration", "equation_balancing", "stoichiometry", "oxidation_number",
  "redox", "acid_base", "ph", "reaction_energy", "equilibrium"
];

const names = {
  atomic_number: ["bronze", "dots", "green"],
  atomic_mass: ["umber", "waves", "brown"],
  period_group: ["green", "grid", "striped"],
  valence_electron: ["violet", "orbit", "orbit"],
  electronegativity: ["yellow", "lightning", "electric"],
  mole_mass: ["red", "molecule", "heavy"],
  gas_molar_volume: ["sky", "bubbles", "balloon"],
  redox: ["rust", "split", "split"],
  acid_base: ["two-tone", "yin-yang", "acid-base"]
};

const palettes = [
  ["#9b6136", "#4b281d", "#39d8ed"], ["#76523b", "#321f18", "#58e8e4"],
  ["#39785a", "#183c2c", "#76e3bb"], ["#7250a3", "#321d55", "#bb8cff"],
  ["#426b9b", "#1a355a", "#72d9ff"], ["#8f647d", "#44283b", "#ff9cd4"],
  ["#a67b22", "#4e380c", "#ffe14e"], ["#4f8275", "#203f38", "#6fe2cf"],
  ["#9b4e6a", "#482234", "#ff81ad"], ["#4e7193", "#21384f", "#77c9ff"],
  ["#7e5598", "#362347", "#cf92ff"], ["#986744", "#472d1e", "#ffbd72"],
  ["#536f82", "#243947", "#80d8ef"], ["#9c4b41", "#4b211e", "#ff8a55"],
  ["#517c8a", "#213f49", "#71e6ef"], ["#4e8fb1", "#1c485d", "#a6efff"],
  ["#7c6b3a", "#3f3518", "#d8e56a"], ["#8a5d47", "#43291d", "#f3aa72"],
  ["#436f62", "#203a33", "#71d9aa"], ["#7b526d", "#382333", "#ee91ca"],
  ["#9b4d31", "#482117", "#ff675d"], ["#85506b", "#273c69", "#ff7190"],
  ["#536f9b", "#27364f", "#8daeff"], ["#a16932", "#4d3017", "#ffc354"],
  ["#456f63", "#223b35", "#72d9bd"]
];

export const JAR_THEMES = Object.freeze(Object.fromEntries(ids.map((id, index) => {
  const named = names[id] || [
    `theme-${index + 1}`,
    index % 4 === 0 ? "rings" : index % 4 === 1 ? "hex" : index % 4 === 2 ? "lines" : "stars",
    `toad-${index + 1}`
  ];
  const palette = palettes[index];
  return [id, Object.freeze({
    id,
    jar: named[0],
    pattern: named[1],
    toad: named[2],
    jarColor: palette[0],
    jarDark: palette[1],
    waterColor: palette[2],
    hue: index * 14,
    photoIndex: index
  })];
})));

export const displayJarName = mode => `${String(mode?.title || "화학")
  .replace(/\s*(?:훈련|장독대 채우기)\s*$/, " ")
  .trim()} 장독대 채우기`;

export function themeFor(trainingId) {
  return JAR_THEMES[trainingId] || JAR_THEMES.atomic_number;
}

function decorate(root, theme) {
  root.dataset.jarTheme = theme.jar;
  root.dataset.jarPattern = theme.pattern;
  root.dataset.toadTheme = theme.toad;
  root.style.setProperty("--jar-main", theme.jarColor);
  root.style.setProperty("--jar-dark", theme.jarDark);
  root.style.setProperty("--theme-water", theme.waterColor);
  root.style.setProperty("--mode-accent", theme.waterColor);
  root.style.setProperty("--toad-hue", `${theme.hue}deg`);
}

function normalizeJarSkin(value) {
  return Object.hasOwn(JAR_PREVIEW_PNGS, value) ? value : "onggi";
}

function readEquippedJarSkin() {
  try {
    const saved = JSON.parse(localStorage.getItem(COSMETIC_STORAGE_KEY) || "null");
    const equipped = saved?.equipped?.jar;
    return normalizeJarSkin(JAR_ITEM_TO_SKIN[equipped] || equipped);
  } catch {
    return "onggi";
  }
}

function ensureJarPhotoStyle() {
  if (document.getElementById(JAR_THUMBNAIL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = JAR_THUMBNAIL_STYLE_ID;
  style.textContent = `
    #trainingGrid .jar-preview.jar-preview-photo {
      min-height: 0;
      isolation: isolate;
      background-color: #21150f;
      background-position: center 51% !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      filter: none !important;
      mix-blend-mode: normal !important;
    }
    #trainingGrid .jar-preview.jar-preview-photo::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(255, 246, 218, .035), transparent 48%, rgba(18, 8, 3, .18));
    }
    #trainingGrid .jar-preview.jar-preview-photo::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      border: 1px solid rgba(255, 232, 184, .09);
      box-shadow: inset 0 -24px 30px rgba(12, 6, 3, .18);
    }
    @media (max-width: 760px), (max-device-width: 760px) {
      #trainingGrid .jar-preview.jar-preview-photo {
        height: auto !important;
        aspect-ratio: 1 / 1;
        background-position: center 51% !important;
      }
    }
  `;
  document.head.append(style);
}

function setPreviewSkin(preview, jarSkin) {
  const skin = normalizeJarSkin(jarSkin);
  preview.dataset.jarSkin = skin;
  preview.style.backgroundImage = `url("${siteUrl(JAR_PREVIEW_PNGS[skin])}")`;
  preview.style.filter = "none";
}

export function applyJarTheme(root, trainingId) {
  if (!root) return null;
  const theme = themeFor(trainingId);
  decorate(root, theme);
  return theme;
}

export function createJarPreview(mode, jarSkin = readEquippedJarSkin()) {
  const preview = document.createElement("div");
  const theme = themeFor(mode.id);
  ensureJarPhotoStyle();
  preview.className = "jar-preview jar-preview-photo";
  preview.setAttribute("aria-hidden", "true");
  preview.dataset.trainingId = mode.id;
  decorate(preview, theme);
  setPreviewSkin(preview, jarSkin);
  return preview;
}

export function refreshJarPreviews(jarSkin = readEquippedJarSkin(), root = document) {
  root.querySelectorAll?.("#trainingGrid .jar-preview.jar-preview-photo")
    .forEach(preview => setPreviewSkin(preview, jarSkin));
}

if (typeof window !== "undefined" && !window.__jarPreviewSkinSync) {
  window.__jarPreviewSkinSync = true;
  window.addEventListener("pageshow", () => refreshJarPreviews());
  window.addEventListener("cosmetic:equipped", event => {
    if (!event.detail?.category || event.detail.category === "jar") refreshJarPreviews();
  });
  window.addEventListener("storage", event => {
    if (event.key === COSMETIC_STORAGE_KEY || event.key == null) refreshJarPreviews();
  });
}
