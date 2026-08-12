#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.TOAD_BASE_URL || "http://127.0.0.1:4173";
const gamePath = "/%EC%BD%A9%EC%A5%90%EC%95%BC_%EC%A4%98%EB%95%8C%EC%8D%A8.html?training=atomic_number";
const skins = ["gold-worker", "jade-guard", "star-night"];
const viewports = [
  [390, 844], [430, 932], [844, 390], [1366, 768], [1920, 1080]
];
const states = [
  ["game:start", "idle"], ["answer:correct", "correct"], ["answer:wrong", "wrong"],
  ["water:warning", "warning"], ["water:critical", "critical"]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cosmeticData(skin) {
  return {
    version: 1,
    owned: ["tool_wood_bucket", "outfit_underlayer", "outfit_classic_red", "toad_field_brown", "jar_onggi", ...skins.map(key => `toad_${key.replaceAll("-", "_")}`)],
    equipped: { tool: "tool_wood_bucket", outfit: "outfit_classic_red", toad: `toad_${skin.replaceAll("-", "_")}`, jar: "jar_onggi" }
  };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of viewports) {
    for (const skin of skins) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
        key: "kongjuiya-cosmetics-v1", value: cosmeticData(skin)
      });
      const page = await context.newPage();
      const errors = [];
      const failedResponses = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error" && !/^Failed to load resource:/i.test(message.text())) errors.push(message.text());
      });
      page.on("response", response => {
        const url = new URL(response.url());
        if (url.origin === new URL(baseUrl).origin && response.status() >= 400) failedResponses.push(`${response.status()} ${url.pathname}`);
      });
      await page.goto(baseUrl + gamePath, { waitUntil: "networkidle" });
      await page.waitForFunction(expected => document.getElementById("layeredScene")?.dataset.toadSkin === expected, skin);
      for (const [eventName, state] of states) {
        await page.evaluate(name => dispatchEvent(new CustomEvent(name, { detail: { combo: 4 } })), eventName);
        await page.waitForFunction(expected => document.getElementById("layeredScene")?.dataset.sceneState === expected, state);
        const qa = await page.evaluate(expected => {
          const stage = document.getElementById("visualStage").getBoundingClientRect();
          const layer = document.querySelector("#layeredScene .scene-toad-skin");
          const image = layer?.querySelector("img");
          const box = layer?.getBoundingClientRect();
          return {
            skin: document.getElementById("layeredScene")?.dataset.toadSkin,
            src: image?.currentSrc || image?.src || "",
            natural: image ? [image.naturalWidth, image.naturalHeight] : null,
            contained: Boolean(box && box.left >= stage.left - 1 && box.right <= stage.right + 1 && box.top >= stage.top - 1 && box.bottom <= stage.bottom + 1)
          };
        }, skin);
        assert(qa.skin === skin, `${width}x${height} ${state}: equipped ${qa.skin}, expected ${skin}`);
        assert(qa.src.includes(`/toad/skins/${skin}.png`), `${width}x${height} ${state}: wrong asset ${qa.src}`);
        assert(qa.natural?.[0] === 1024 && qa.natural?.[1] === 768, `${width}x${height} ${state}: canvas ${qa.natural}`);
        assert(qa.contained, `${width}x${height} ${state}: toad layer escaped visual stage`);
      }
      assert(errors.length === 0, `${width}x${height} ${skin}: console errors\\n${errors.join("\\n")}`);
      assert(failedResponses.length === 0, `${width}x${height} ${skin}: local HTTP failures\\n${failedResponses.join("\\n")}`);
      await context.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(baseUrl + "/shop.html?subject=chemistry", { waitUntil: "networkidle" });
  await page.click('.shop-category-card[data-category="toad"]');
  await page.waitForSelector('img.shop-asset-toad[data-visual-key="star-night"]');
  const previews = await page.locator("img.shop-asset-toad").evaluateAll(images => images.map(image => ({ key: image.dataset.visualKey, source: image.currentSrc || image.src })));
  assert(new Set(previews.map(preview => preview.key)).size === 4, `shop: expected 4 unique toad keys, got ${previews.map(preview => preview.key).join(", ")}`);
  assert(previews.every(preview => preview.source.endsWith(".png") || preview.source.includes(".png?")), `shop: non-PNG preview ${previews.map(preview => preview.source).join(", ")}`);
  assert(previews.every(preview => !preview.source.includes("toads.svg")), "shop: legacy SVG toad preview remains");
  await page.close();

  console.log(`toad skins smoke: ${skins.length} skins, ${viewports.length} viewports, ${states.length} scene states and shop PNG previews passed`);
} finally {
  await browser.close();
}
