import { GameStorage } from "./storage.js";
import { mountHistoricalBgm } from "./historical-bgm.js";
import { CosmeticSystem, COSMETIC_STORAGE_KEY } from "./cosmetic-system.js";
import { SHOP_CATEGORIES, SHOP_ITEMS, SHOP_ITEM_MAP } from "../../data/shop-catalog.js";
import { SCENE_ATLAS_URL, preloadSceneAtlas } from "./scene-art-loader.js";

const DEFAULT_ITEM_IDS = new Set([
  "tool_wood_bucket",
  "outfit_classic_red",
  "toad_field_brown",
  "jar_onggi"
]);

const CATEGORY_SYMBOLS = Object.freeze({
  tool: "器",
  outfit: "衣",
  toad: "蛙",
  jar: "甕"
});

const CATEGORY_LABELS = Object.freeze(
  Object.fromEntries(SHOP_CATEGORIES.map(category => [category.id, category.label]))
);

const VISUAL_SWATCHES = Object.freeze({
  wood: ["#684426", "#c48a50"],
  brass: ["#74531b", "#e8c35c"],
  celadon: ["#35675f", "#9ccbbd"],
  moon: ["#202443", "#747fd0"],
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

const JAR_SPRITE_OFFSETS = Object.freeze({
  onggi: "24%",
  celadon: "-29%",
  "moon-white": "-82%",
  "night-lacquer": "-135%"
});

const gameStorage = new GameStorage();
const cosmetics = new CosmeticSystem(gameStorage);
const bgm = mountHistoricalBgm({ initialVolume: gameStorage.data.settings?.volume ?? 0.5 });
const byId = id => document.getElementById(id);
const formatNumber = value => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR");

let activeCategory = SHOP_CATEGORIES[0].id;
let selectedItemId = cosmetics.equipped(activeCategory);
let statusTimer = 0;

function showStatus(message, kind = "normal") {
  const node = byId("shopStatus");
  if (!node) return;
  clearTimeout(statusTimer);
  node.textContent = message;
  node.dataset.kind = kind;
  node.classList.add("is-visible");
  statusTimer = setTimeout(() => node.classList.remove("is-visible"), 2300);
}

function itemTitle(id) {
  return SHOP_ITEM_MAP[id]?.title || "기본 외형";
}

function updateWalletAndEquipment() {
  byId("shopBeans").textContent = formatNumber(cosmetics.beans());
  byId("ownedCount").textContent = `보유 ${cosmetics.data.owned.length} / ${SHOP_ITEMS.length}`;
  byId("equippedTool").textContent = itemTitle(cosmetics.equipped("tool"));
  byId("equippedOutfit").textContent = itemTitle(cosmetics.equipped("outfit"));
  byId("equippedToad").textContent = itemTitle(cosmetics.equipped("toad"));
  byId("equippedJar").textContent = itemTitle(cosmetics.equipped("jar"));
}

function itemAction(item) {
  const card = cosmetics.card(item.id);
  if (card.equipped) return { label: "현재 장착 중", disabled: true, owned: true };
  if (card.owned) return { label: "장착하기", disabled: false, owned: true };
  return {
    label: card.affordable ? `콩 ${formatNumber(item.price)}개로 구매` : `콩 ${formatNumber(item.price)}개 필요`,
    disabled: !card.affordable,
    owned: false
  };
}

function refreshPreview(item = SHOP_ITEM_MAP[selectedItemId]) {
  if (!item) return;
  selectedItemId = item.id;

  byId("previewCategory").textContent = CATEGORY_LABELS[item.category] || "외형";
  byId("previewName").textContent = item.title;
  byId("previewDescription").textContent = item.description;
  byId("previewRarity").textContent = item.rarity;

  const sceneArt = byId("shopSceneArt");
  sceneArt.dataset.sceneCell = item.category === "tool" || item.category === "outfit" ? "pour" : "idle";

  const authored = DEFAULT_ITEM_IDS.has(item.id);
  const notice = byId("previewAssetNotice");
  notice.hidden = authored;
  notice.textContent = authored
    ? ""
    : "이 상품의 독립 게임 장면 원화는 준비 중입니다. 구매 기록과 장착 상태는 정상 저장됩니다.";

  const action = itemAction(item);
  const actionButton = byId("previewActionButton");
  actionButton.textContent = action.label;
  actionButton.disabled = action.disabled;

  document.querySelectorAll(".shop-item").forEach(node => {
    node.classList.toggle("is-selected", node.dataset.itemId === item.id);
  });
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

  updateWalletAndEquipment();
  renderProducts();
  refreshPreview(item);
}

function createProductCard(item) {
  const cardData = cosmetics.card(item.id);
  const action = itemAction(item);
  const [swatchA, swatchB] = VISUAL_SWATCHES[item.visualKey] || ["#60422d", "#b78258"];

  const article = document.createElement("article");
  article.className = "shop-item";
  article.dataset.itemId = item.id;
  article.dataset.category = item.category;
  article.classList.toggle("is-equipped", cardData.equipped);
  article.classList.toggle("is-selected", item.id === selectedItemId);
  article.style.setProperty("--swatch-a", swatchA);
  article.style.setProperty("--swatch-b", swatchB);

  const visual = document.createElement("div");
  visual.className = "shop-item-visual";
  visual.dataset.symbol = CATEGORY_SYMBOLS[item.category] || "物";
  visual.setAttribute("aria-hidden", "true");

  if (item.category === "jar") {
    visual.classList.add("shop-jar-visual");
    const sprite = document.createElement("img");
    sprite.className = "shop-jar-sprite";
    sprite.src = "assets/그림/공용/장독대/장독대-상품-스프라이트.png";
    sprite.alt = "";
    sprite.style.setProperty("--jar-sprite-left", JAR_SPRITE_OFFSETS[item.visualKey] || "24%");
    visual.append(sprite);
  }

  const title = document.createElement("h3");
  title.textContent = item.title;

  const description = document.createElement("p");
  description.textContent = item.description;

  const assetState = document.createElement("span");
  assetState.className = `asset-state${DEFAULT_ITEM_IDS.has(item.id) ? " is-ready" : ""}`;
  assetState.textContent = DEFAULT_ITEM_IDS.has(item.id) ? "게임 장면 원화 적용" : "독립 장면 원화 준비 중";

  const meta = document.createElement("div");
  meta.className = "shop-item-meta";

  const rarity = document.createElement("span");
  rarity.className = "shop-rarity";
  rarity.textContent = item.rarity;

  const price = document.createElement("span");
  price.className = "shop-price";
  price.textContent = item.price ? `콩 ${formatNumber(item.price)}개` : "기본 지급";
  meta.append(rarity, price);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = action.label;
  button.disabled = action.disabled;
  button.classList.toggle("is-owned", action.owned);
  button.addEventListener("click", event => {
    event.stopPropagation();
    purchaseOrEquip(item);
  });

  article.addEventListener("click", () => refreshPreview(item));
  article.append(visual, title, description, assetState, meta, button);
  return article;
}

function renderCategoryTabs() {
  const tabs = SHOP_CATEGORIES.map(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category.id === activeCategory));
    button.classList.toggle("is-active", category.id === activeCategory);
    button.innerHTML = `<span aria-hidden="true">${CATEGORY_SYMBOLS[category.id] || "物"}</span>${category.label}`;
    button.addEventListener("click", () => {
      activeCategory = category.id;
      selectedItemId = cosmetics.equipped(activeCategory);
      renderCategoryTabs();
      renderProducts();
      refreshPreview(SHOP_ITEM_MAP[selectedItemId] || SHOP_ITEMS.find(item => item.category === activeCategory));
    });
    return button;
  });

  byId("shopTabs").replaceChildren(...tabs);
}

function renderProducts() {
  const items = SHOP_ITEMS.filter(item => item.category === activeCategory);
  byId("shopGrid").replaceChildren(...items.map(createProductCard));
}

function syncExternalChanges(event) {
  if (event.key !== COSMETIC_STORAGE_KEY && event.key !== "kongjuiya-chem-save") return;
  cosmetics.data = cosmetics.load();
  gameStorage.data = gameStorage.load();
  bgm.setVolume(gameStorage.data.settings?.volume ?? 0.5);
  updateWalletAndEquipment();
  renderProducts();
  refreshPreview(SHOP_ITEM_MAP[selectedItemId]);
}

function initShop() {
  byId("shopSceneArt").style.backgroundImage = `url("${SCENE_ATLAS_URL}")`;
  preloadSceneAtlas().catch(error => {
    console.error(error);
    byId("previewAssetNotice").hidden = false;
    byId("previewAssetNotice").textContent = "장면 원화를 불러오지 못했습니다. 새로고침해 주세요.";
  });

  byId("previewActionButton").addEventListener("click", () => {
    const item = SHOP_ITEM_MAP[selectedItemId];
    if (item) purchaseOrEquip(item);
  });
  addEventListener("storage", syncExternalChanges);

  renderCategoryTabs();
  renderProducts();
  updateWalletAndEquipment();
  refreshPreview(SHOP_ITEM_MAP[selectedItemId]);
}

initShop();
