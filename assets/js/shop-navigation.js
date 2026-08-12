import { GameStorage } from "./storage.js";
import { mountHistoricalBgm } from "./historical-bgm.js";
import { CosmeticSystem, COSMETIC_STORAGE_KEY } from "./cosmetic-system.js";
import { SHOP_CATEGORIES, SHOP_ITEMS, SHOP_ITEM_MAP } from "../../data/shop-catalog.js";

const META = Object.freeze({
  tool: ["KONGJUI TOOLS", "물을 붓는 도구를 선택합니다.", "器"],
  outfit: ["KONGJUI OUTFITS", "콩쥐가 입을 옷을 선택합니다.", "衣"],
  toad: ["TOAD SKINS", "구멍을 막을 두꺼비를 선택합니다.", "蛙"],
  jar: ["JAR SKINS", "물을 채울 장독대를 선택합니다.", "甕"]
});

const SWATCHES = Object.freeze({
  wood: ["#684426", "#c48a50"],
  brass: ["#74531b", "#e8c35c"],
  celadon: ["#35675f", "#9ccbbd"],
  moon: ["#202443", "#747fd0"],
  underlayer: ["#ece8df", "#ffffff"],
  "classic-red": ["#6f2024", "#c95652"],
  "blue-scholar": ["#17335f", "#4a7fa5"],
  "field-green": ["#365e31", "#75944f"],
  "royal-night": ["#17172e", "#5f3d70"],
  "field-brown": ["#56643b", "#9bad69"],
  "gold-worker": ["#9a6c1d", "#e1c452"],
  "jade-guard": ["#246b58", "#60b88a"],
  "star-night": ["#19162d", "#4f3c79"],
  onggi: ["#4b2d23", "#a25f3f"],
  "moon-white": ["#b8bdc5", "#f3efe3"],
  "night-lacquer": ["#0d0d13", "#4e315c"]
});

const ASSET_VERSION = "20260812-kongjwi-source-locked1";
const OUTFIT_ART = Object.freeze({
  underlayer: `assets/art/source-locked/kongjwi/underlayer/base-cutout.png?v=${ASSET_VERSION}`,
  "classic-red": `assets/art/source-locked/kongjwi/classic-red/base-cutout.png?v=${ASSET_VERSION}`,
  "blue-scholar": `assets/art/source-locked/kongjwi/blue-scholar/base-cutout.png?v=${ASSET_VERSION}`,
  "field-green": `assets/art/source-locked/kongjwi/field-work/base-cutout.png?v=${ASSET_VERSION}`,
  "royal-night": `assets/art/source-locked/kongjwi/night-court/base-cutout.png?v=${ASSET_VERSION}`
});
const UNDERLAYER_ART = `assets/art/source-locked/kongjwi/underlayer/base-cutout.png?v=${ASSET_VERSION}`;

const JAR_ART = Object.freeze({
  onggi: "assets/art/jars/onggi/thumbnail-no-toad.png?v=20260805-jar-clean2",
  celadon: "assets/art/jars/celadon/thumbnail-no-toad.png?v=20260805-jar-clean2",
  "moon-white": "assets/art/jars/moon-white/thumbnail-no-toad.png?v=20260805-jar-clean2",
  "night-lacquer": "assets/art/jars/night-lacquer/thumbnail-no-toad.png?v=20260805-jar-clean2"
});

const TOAD_ASSET_VERSION = "20260812-toad-skins2";
const TOAD_ART = Object.freeze({
  "field-brown": `assets/art/source-locked/toad/base/field-brown.png?v=${TOAD_ASSET_VERSION}`,
  "gold-worker": `assets/art/game-scene/toad/skins/gold-worker.png?v=${TOAD_ASSET_VERSION}`,
  "jade-guard": `assets/art/game-scene/toad/skins/jade-guard.png?v=${TOAD_ASSET_VERSION}`,
  "star-night": `assets/art/game-scene/toad/skins/star-night.png?v=${TOAD_ASSET_VERSION}`
});

const storage = new GameStorage();
const cosmetics = new CosmeticSystem(storage);
const bgm = mountHistoricalBgm({ initialVolume: storage.data.settings?.volume ?? 0.5 });
const byId = id => document.getElementById(id);
const formatNumber = value => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR");
const rootUrl = `${location.pathname}${location.search}`;

let activeCategory = null;
let statusTimer = 0;
let previewOutfitId = null;
let wardrobeReturnFocus = null;

const itemsFor = categoryId => SHOP_ITEMS.filter(item => item.category === categoryId);
const categoryFor = categoryId => SHOP_CATEGORIES.find(category => category.id === categoryId);
const ownedCount = categoryId => itemsFor(categoryId).filter(item => cosmetics.card(item.id).owned).length;
const outfitItems = () => itemsFor("outfit");

function applySwatch(node, item) {
  const [first, second] = SWATCHES[item.visualKey] || ["#60422d", "#b78258"];
  node.style.setProperty("--swatch-a", first);
  node.style.setProperty("--swatch-b", second);
}

function sourceCandidates(versionedSource) {
  return [...new Set([versionedSource, versionedSource.split("?")[0]])];
}

function createImage(source, className, label, onFailure) {
  const image = new Image();
  image.className = className;
  image.alt = label;
  image.draggable = false;
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";

  const candidates = sourceCandidates(source);
  let candidateIndex = 0;
  image.addEventListener("error", () => {
    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      image.src = candidates[candidateIndex];
      return;
    }
    onFailure?.(candidates);
  });
  image.src = candidates[candidateIndex];
  return image;
}

function createOutfitAsset(item) {
  const versionedSource = OUTFIT_ART[item.visualKey];
  if (!versionedSource) throw new Error(`Missing Kongjwi outfit mapping: ${item.visualKey}`);

  const asset = document.createElement("span");
  asset.className = "shop-asset shop-asset-outfit is-authored-kongjwi";
  asset.dataset.visualKey = item.visualKey;
  asset.dataset.assetState = "loading";
  asset.setAttribute("aria-hidden", "true");

  const image = createImage(versionedSource, "shop-kongjwi-image", "", candidates => {
    asset.dataset.assetState = "error";
    console.error(`[콩 상점] 의상 PNG를 불러오지 못했습니다: ${candidates.join(", ")}`);
    image.remove();
    const error = document.createElement("span");
    error.className = "shop-asset-error";
    error.textContent = `${item.title} 이미지 로드 실패`;
    asset.append(error);
  });
  image.addEventListener("load", () => {
    asset.dataset.assetState = "ready";
  });
  asset.append(image);
  return asset;
}

function createJarAsset(item) {
  const versionedSource = JAR_ART[item.visualKey];
  if (!versionedSource) throw new Error(`Missing jar thumbnail mapping: ${item.visualKey}`);

  const asset = document.createElement("span");
  asset.className = "shop-asset shop-asset-jar is-authored-jar";
  asset.dataset.visualKey = item.visualKey;
  asset.dataset.assetState = "loading";
  asset.setAttribute("aria-hidden", "true");
  asset.style.width = "100%";
  asset.style.height = "100%";
  asset.style.aspectRatio = "auto";
  asset.style.overflow = "visible";

  const image = createImage(versionedSource, "shop-jar-image", "", candidates => {
    asset.dataset.assetState = "error";
    console.error(`[콩 상점] 장독대 이미지를 불러오지 못했습니다: ${candidates.join(", ")}`);
    image.remove();
  });
  image.addEventListener("load", () => {
    asset.dataset.assetState = "ready";
  });
  image.style.position = "static";
  image.style.display = "block";
  image.style.width = "100%";
  image.style.maxWidth = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.objectPosition = "center";

  asset.append(image);
  return asset;
}

function createSpriteAsset(item, itemIndex) {
  const asset = document.createElement("span");
  asset.className = `shop-asset shop-asset-${item.category}`;
  asset.dataset.visualKey = item.visualKey;
  asset.setAttribute("aria-hidden", "true");
  asset.style.setProperty("--sprite-y", `${itemIndex * 100 / 3}%`);
  return asset;
}

function createToadAsset(item) {
  const versionedSource = TOAD_ART[item.visualKey];
  if (!versionedSource) throw new Error(`Missing toad skin mapping: ${item.visualKey}`);
  const image = createImage(versionedSource, "shop-asset shop-asset-toad", item.title, candidates => {
    console.error(`[Bean shop] Failed to load toad skin: ${candidates.join(", ")}`);
    image.remove();
  });
  image.dataset.visualKey = item.visualKey;
  image.style.objectFit = "contain";
  image.style.objectPosition = "center";
  return image;
}

function createAsset(item) {
  if (item.category === "outfit") return createOutfitAsset(item);
  if (item.category === "toad") return createToadAsset(item);

  const categoryItems = itemsFor(item.category);
  const itemIndex = Math.max(0, categoryItems.findIndex(entry => entry.id === item.id));
  if (item.category === "jar") return createJarAsset(item);
  return createSpriteAsset(item, itemIndex);
}

function showStatus(message, kind = "normal") {
  const node = byId("shopStatus");
  clearTimeout(statusTimer);
  node.textContent = message;
  node.dataset.kind = kind;
  node.classList.add("is-visible");
  statusTimer = setTimeout(() => node.classList.remove("is-visible"), 2300);
}

function updateWallet() {
  byId("shopBeans").textContent = formatNumber(cosmetics.beans());
  byId("ownedCount").textContent = `보유 ${cosmetics.data.owned.length} / ${SHOP_ITEMS.length}`;
}

function actionFor(item) {
  const card = cosmetics.card(item.id);
  if (card.equipped) return ["장착 중", true, true];
  if (card.owned) return ["장착", false, true];
  return [card.affordable ? "구매" : "콩 부족", !card.affordable, false];
}

function currentWardrobeItem() {
  return SHOP_ITEM_MAP[previewOutfitId || "outfit_underlayer"] || null;
}

function setWardrobeImage(source, label) {
  const image = byId("outfitWardrobeImage");
  const candidates = sourceCandidates(source);
  let index = 0;
  image.dataset.assetState = "loading";
  image.alt = label;
  image.onload = () => {
    image.dataset.assetState = "ready";
  };
  image.onerror = () => {
    index += 1;
    if (index < candidates.length) {
      image.src = candidates[index];
      return;
    }
    image.dataset.assetState = "error";
    showStatus(`${label} 이미지를 불러오지 못했습니다.`, "error");
  };
  image.src = candidates[index];
}

function renderWardrobeOptions() {
  const options = byId("outfitWardrobeOptions");
  const underlayer = document.createElement("button");
  underlayer.type = "button";
  underlayer.className = "outfit-wardrobe-option is-underlayer";
  underlayer.classList.toggle("is-selected", (previewOutfitId || "outfit_underlayer") === "outfit_underlayer");
  underlayer.classList.toggle("is-equipped", cosmetics.isEquipped("outfit_underlayer"));
  underlayer.setAttribute("aria-pressed", String((previewOutfitId || "outfit_underlayer") === "outfit_underlayer"));
  underlayer.innerHTML = "<span>기본</span><strong>Underlayer</strong>";
  underlayer.addEventListener("click", () => {
    previewOutfitId = "outfit_underlayer";
    renderWardrobe();
  });

  const outfitButtons = outfitItems().filter(item => item.id !== "outfit_underlayer").map(item => {
    const card = cosmetics.card(item.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outfit-wardrobe-option";
    button.classList.toggle("is-selected", previewOutfitId === item.id);
    button.classList.toggle("is-equipped", card.equipped);
    button.dataset.itemId = item.id;
    button.setAttribute("aria-pressed", String(previewOutfitId === item.id));
    button.innerHTML = `<span>${card.owned ? "보유" : `콩 ${formatNumber(item.price)}`}</span><strong>${item.title}</strong>`;
    button.addEventListener("click", () => {
      previewOutfitId = item.id;
      renderWardrobe();
    });
    return button;
  });

  options.replaceChildren(underlayer, ...outfitButtons);
}

function renderWardrobe() {
  const selected = currentWardrobeItem();
  const title = byId("outfitWardrobeSelection");
  const detail = byId("outfitWardrobeDetail");
  const equipButton = byId("outfitWardrobeEquip");

  if (!selected) {
    title.textContent = "속옷 상태";
    detail.textContent = "옷을 입히기 전의 콩쥐입니다. 아래에서 의상을 골라 입어볼 수 있습니다.";
    equipButton.textContent = "의상을 선택하세요";
    equipButton.disabled = true;
    setWardrobeImage(UNDERLAYER_ART, "속옷 상태의 콩쥐 전신");
  } else {
    const card = cosmetics.card(selected.id);
    title.textContent = selected.title;
    detail.textContent = card.owned
      ? "입어보기 중입니다. 장착하면 다른 화면에도 이 의상이 적용됩니다."
      : "입어보기는 가능합니다. 실제 장착은 상점에서 구매한 뒤 할 수 있습니다.";
    if (card.equipped) {
      equipButton.textContent = "현재 장착 중";
      equipButton.disabled = true;
    } else if (card.owned) {
      equipButton.textContent = "이 옷 장착";
      equipButton.disabled = false;
    } else {
      equipButton.textContent = "구매 후 장착 가능";
      equipButton.disabled = true;
    }
    setWardrobeImage(OUTFIT_ART[selected.visualKey], `${selected.title}을 입은 콩쥐 전신`);
  }

  renderWardrobeOptions();
}

function openWardrobe(item = null, trigger = null) {
  const dialog = byId("outfitWardrobeDialog");
  wardrobeReturnFocus = trigger || document.activeElement;
  previewOutfitId = item?.category === "outfit" ? item.id : (cosmetics.equipped("outfit") || "outfit_underlayer");
  renderWardrobe();
  if (!dialog.open) dialog.showModal();
}

function equipWardrobeSelection() {
  const item = currentWardrobeItem();
  if (!item) return;
  const card = cosmetics.card(item.id);
  if (!card.owned) {
    showStatus("먼저 해당 의상을 구매해야 합니다.", "error");
    return;
  }

  const result = cosmetics.equip(item.id);
  if (result.ok) showStatus(`${item.title}을(를) 장착했습니다.`, "success");
  else showStatus("의상을 장착하지 못했습니다.", "error");

  updateWallet();
  renderHub();
  if (activeCategory) renderProducts();
  renderWardrobe();
}

function createCategoryCard(category) {
  const categoryItems = itemsFor(category.id);
  const equipped = SHOP_ITEM_MAP[cosmetics.equipped(category.id)] || categoryItems[0];
  const [, , symbol] = META[category.id];
  const button = document.createElement("button");

  button.type = "button";
  button.className = "shop-category-card";
  button.dataset.category = category.id;
  button.setAttribute("aria-label", `${category.label} 열기. 현재 ${equipped.title} 장착 중.`);
  applySwatch(button, equipped);

  const top = document.createElement("span");
  top.className = "shop-category-card-top";

  const label = document.createElement("span");
  label.className = "shop-category-card-label";
  label.innerHTML = `<span class="shop-category-symbol">${symbol}</span><strong>${category.label}</strong>`;

  const count = document.createElement("span");
  count.className = "shop-category-count";
  count.textContent = `${ownedCount(category.id)} / ${categoryItems.length}`;
  top.append(label, count);

  const visual = document.createElement("span");
  visual.className = category.id === "jar"
    ? "shop-category-visual shop-jar-visual"
    : "shop-category-visual";
  visual.dataset.category = category.id;
  if (category.id === "outfit") {
    visual.style.background = "transparent";
    visual.style.borderColor = "rgba(255, 255, 255, 0.07)";
  }
  visual.append(createAsset(equipped));

  const bottom = document.createElement("span");
  bottom.className = "shop-category-card-bottom";

  const current = document.createElement("span");
  current.innerHTML = `<small>현재 장착</small><b>${equipped.title}</b>`;

  const arrow = document.createElement("span");
  arrow.className = "shop-category-arrow";
  arrow.textContent = "→";
  bottom.append(current, arrow);

  button.append(top, visual, bottom);
  button.addEventListener("click", () => openCategory(category.id, true));
  return button;
}

function renderHub() {
  byId("shopCategories").replaceChildren(...SHOP_CATEGORIES.map(createCategoryCard));
}

function createProductCard(item) {
  const cardData = cosmetics.card(item.id);
  const [label, disabled, isOwned] = actionFor(item);
  const card = document.createElement("article");

  card.className = `shop-item shop-item-${item.category}`;
  card.dataset.category = item.category;
  card.dataset.itemId = item.id;
  card.classList.toggle("is-equipped", cardData.equipped);
  card.title = item.description;
  applySwatch(card, item);

  const visual = document.createElement("div");
  visual.className = item.category === "jar"
    ? "shop-item-visual shop-jar-visual"
    : "shop-item-visual";
  visual.dataset.category = item.category;
  if (item.category === "outfit") {
    visual.style.background = "transparent";
    visual.style.borderColor = "rgba(255, 255, 255, 0.07)";
  }
  visual.append(createAsset(item));

  const copy = document.createElement("div");
  copy.className = "shop-item-copy";

  const heading = document.createElement("h3");
  heading.textContent = item.title;

  const meta = document.createElement("div");
  meta.className = "shop-item-meta";
  meta.innerHTML = `<span class="shop-rarity">${item.rarity}</span><span class="shop-price">${item.price ? `콩 ${formatNumber(item.price)}` : "기본 지급"}</span>`;
  copy.append(heading, meta);

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.className = "shop-item-action";
  actionButton.textContent = label;
  actionButton.disabled = disabled;
  actionButton.classList.toggle("is-owned", isOwned);
  actionButton.addEventListener("click", () => purchaseOrEquip(item));

  const actions = document.createElement("div");
  actions.className = "shop-item-actions";
  if (item.category === "outfit") {
    const tryOnButton = document.createElement("button");
    tryOnButton.type = "button";
    tryOnButton.className = "shop-item-try-on";
    tryOnButton.textContent = "입어보기";
    tryOnButton.setAttribute("aria-label", `${item.title} 입어보기`);
    tryOnButton.addEventListener("click", event => openWardrobe(item, event.currentTarget));
    actions.append(tryOnButton);
  }
  actions.append(actionButton);

  card.append(visual, copy, actions);
  return card;
}

function renderProducts() {
  const category = categoryFor(activeCategory);
  if (!category) return;

  const categoryItems = itemsFor(category.id);
  const [eyebrow, description] = META[category.id];
  const grid = byId("shopGrid");
  const wardrobeButton = byId("openOutfitWardrobe");

  byId("categoryEyebrow").textContent = eyebrow;
  byId("categoryTitle").textContent = category.label;
  byId("categoryDescription").textContent = description;
  byId("categoryOwnedCount").textContent = `${ownedCount(category.id)} / ${categoryItems.length}`;
  wardrobeButton.hidden = category.id !== "outfit";
  grid.dataset.category = category.id;
  grid.replaceChildren(...categoryItems.map(createProductCard));
}

function showHome() {
  activeCategory = null;
  byId("shopHomeView").hidden = false;
  byId("shopCategoryView").hidden = true;
  byId("openOutfitWardrobe").hidden = true;
  byId("shopGrid").removeAttribute("data-category");
  renderHub();
}

function showCategory(categoryId) {
  if (!categoryFor(categoryId)) return showHome();
  activeCategory = categoryId;
  byId("shopHomeView").hidden = true;
  byId("shopCategoryView").hidden = false;
  renderProducts();
}

function openCategory(categoryId, push = false) {
  if (!categoryFor(categoryId)) return;
  if (push) history.pushState({ shopCategory: categoryId }, "", `${rootUrl}#${categoryId}`);
  showCategory(categoryId);
}

function route() {
  const categoryId = decodeURIComponent(location.hash.slice(1));
  categoryFor(categoryId) ? showCategory(categoryId) : showHome();
}

function purchaseOrEquip(item) {
  const before = cosmetics.card(item.id);
  const result = before.owned ? cosmetics.equip(item.id) : cosmetics.purchase(item.id);

  if (result.ok) {
    showStatus(
      before.owned
        ? `${item.title}을(를) 장착했습니다.`
        : `${item.title} 구매 완료. 바로 장착했습니다.`,
      "success"
    );
  } else {
    const messages = {
      insufficient_beans: `콩이 부족합니다. ${formatNumber(result.cost - result.beans)}개가 더 필요합니다.`,
      already_owned: "이미 보유한 상품입니다.",
      not_owned: "먼저 상품을 구매해야 합니다.",
      busy: "구매 처리 중입니다.",
      save_failed: "브라우저 저장 공간에 기록하지 못했습니다."
    };
    showStatus(messages[result.reason] || "상품을 처리하지 못했습니다.", "error");
  }

  if (item.category === "outfit") previewOutfitId = item.id;
  updateWallet();
  renderHub();
  if (activeCategory) renderProducts();
  if (byId("outfitWardrobeDialog").open) renderWardrobe();
}

function syncExternalChanges(event) {
  if (event.key !== COSMETIC_STORAGE_KEY && event.key !== "kongjuiya-chem-save") return;
  cosmetics.data = cosmetics.load();
  storage.data = storage.load();
  bgm.setVolume(storage.data.settings?.volume ?? 0.5);
  updateWallet();
  renderHub();
  if (activeCategory) renderProducts();
  if (byId("outfitWardrobeDialog").open) renderWardrobe();
}

function init() {
  const initialCategory = decodeURIComponent(location.hash.slice(1));
  const wardrobeDialog = byId("outfitWardrobeDialog");

  byId("shopBackButton").addEventListener("click", () => history.back());
  byId("openOutfitWardrobe").addEventListener("click", event => openWardrobe(null, event.currentTarget));
  byId("outfitWardrobeEquip").addEventListener("click", equipWardrobeSelection);
  byId("outfitWardrobeUnderlayer").addEventListener("click", () => {
    previewOutfitId = null;
    renderWardrobe();
  });
  wardrobeDialog.addEventListener("close", () => {
    wardrobeReturnFocus?.focus?.();
    wardrobeReturnFocus = null;
  });
  addEventListener("popstate", route);
  addEventListener("storage", syncExternalChanges);

  updateWallet();
  renderHub();
  history.replaceState({ shopRoot: true }, "", rootUrl);

  if (categoryFor(initialCategory)) {
    history.pushState({ shopCategory: initialCategory }, "", `${rootUrl}#${initialCategory}`);
    showCategory(initialCategory);
  } else {
    showHome();
  }
}

init();