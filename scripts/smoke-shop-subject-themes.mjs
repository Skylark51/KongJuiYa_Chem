#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.SHOP_THEME_SCREENSHOT_DIR || "";
const viewports = [
  ["mobile-375", { width: 375, height: 667 }],
  ["mobile-390", { width: 390, height: 844 }],
  ["mobile-430", { width: 430, height: 932 }],
  ["desktop-1366", { width: 1366, height: 768 }],
  ["desktop-1920", { width: 1920, height: 1080 }]
];
const subjects = [
  ["chemistry", "#d5a03e"],
  ["physics", "#5b91e6"],
  ["biology", "#69b982"],
  ["earth-science", "#50b1b1"]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectShop(page, requested, expected, accent, label) {
  await page.goto(baseUrl + "/shop.html?subject=" + requested, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.shopContextReady === "true");
  await page.waitForSelector(".shop-category-card");

  const state = await page.evaluate(() => ({
    rootSubject: document.documentElement.dataset.shopSubject,
    bodySubject: document.body.dataset.subject,
    accent: getComputedStyle(document.documentElement).getPropertyValue("--shop-theme-accent").trim(),
    categories: document.querySelectorAll(".shop-category-card").length,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    homeHref: document.querySelector(".desktop-tabs a")?.href || "",
    brandHref: document.querySelector(".app-brand")?.href || "",
    shopHrefs: [...document.querySelectorAll(".desktop-tabs a, .mobile-bottom-nav a")]
      .map(link => link.href)
      .filter(href => href.includes("shop.html"))
  }));

  assert(state.rootSubject === expected, label + ": root subject " + state.rootSubject);
  assert(state.bodySubject === expected, label + ": body subject " + state.bodySubject);
  assert(state.accent.toLowerCase() === accent, label + ": accent " + state.accent);
  assert(state.categories === 4, label + ": shared category count " + state.categories);
  assert(state.horizontalOverflow <= 1, label + ": horizontal overflow " + state.horizontalOverflow);
  assert(new URL(state.homeHref).pathname.endsWith("/subjects/" + expected + "/"), label + ": home return");
  assert(new URL(state.brandHref).pathname.endsWith("/subjects/" + expected + "/"), label + ": brand return");
  assert(state.shopHrefs.length >= 2, label + ": shop navigation links missing");
  assert(state.shopHrefs.every(href => new URL(href).searchParams.get("subject") === expected), label + ": shop context lost");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(subject => document.documentElement.dataset.shopSubject === subject, expected);
}

const browser = await chromium.launch({ headless: true });
try {
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  for (const [viewportName, viewport] of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", message => {
      if (message.type() === "error") errors.push("console: " + message.text());
    });
    page.on("pageerror", error => errors.push("page: " + error.message));
    page.on("response", response => {
      if (response.status() >= 400) errors.push(response.status() + " " + response.url());
    });

    for (const [subject, accent] of subjects) {
      const label = viewportName + " " + subject;
      await inspectShop(page, subject, subject, accent, label);
      if (screenshotDir && viewportName === "mobile-390") {
        await page.screenshot({ path: screenshotDir + "/shop-" + subject + "-mobile.png", fullPage: true });
      }
      if (screenshotDir && viewportName === "desktop-1366") {
        await page.screenshot({ path: screenshotDir + "/shop-" + subject + "-desktop.png", fullPage: true });
      }
    }

    await inspectShop(page, "asdf", "chemistry", "#d5a03e", viewportName + " invalid fallback");
    assert(errors.length === 0, viewportName + ": " + errors.join(" | "));
    await context.close();
  }

  const remembered = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await remembered.newPage();
  await page.goto(baseUrl + "/shop.html?subject=biology", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.shopContextReady === "true");
  await page.goto(baseUrl + "/shop.html", { waitUntil: "networkidle" });
  assert(await page.locator("html").getAttribute("data-shop-subject") === "biology", "last subject fallback was not retained");
  await remembered.close();

  console.log("shop subject themes smoke: 5 viewports, 4 themes, invalid and remembered fallbacks, routes and reload passed");
} finally {
  await browser.close();
}
