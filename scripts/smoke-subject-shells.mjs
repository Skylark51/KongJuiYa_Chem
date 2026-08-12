#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.SUBJECT_SCREENSHOT_DIR || "";
const viewports = [
  ["mobile-375", { width: 375, height: 667 }],
  ["mobile-390", { width: 390, height: 844 }],
  ["mobile-430", { width: 430, height: 932 }],
  ["tablet-768", { width: 768, height: 1024 }],
  ["desktop-1366", { width: 1366, height: 768 }],
  ["desktop-1920", { width: 1920, height: 1080 }]
];
const subjects = [
  ["physics", "물리학"],
  ["biology", "생명과학"],
  ["earth-science", "지구과학"]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - innerWidth,
    titleClipped: [...document.querySelectorAll(".subject-brand strong, .subject-hero h1")]
      .some(node => node.scrollWidth > node.clientWidth + 1)
  }));
  assert(overflow.horizontal <= 1, label + ": horizontal overflow " + overflow.horizontal + "px");
  assert(!overflow.titleClipped, label + ": subject title is clipped");
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

    await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
    assert(await page.locator(".subject-card").count() === 4, viewportName + ": portal cards");
    await assertNoOverflow(page, viewportName + " portal");
    if (screenshotDir && viewportName === "desktop-1366") {
      await page.screenshot({ path: screenshotDir + "/science-portal-desktop.png", fullPage: true });
    }
    if (viewportName === "desktop-1366") {
      const keyboardCard = page.locator('.subject-card[data-subject="physics"]');
      await keyboardCard.focus();
      assert(await keyboardCard.evaluate(node => node === document.activeElement), "portal card is not keyboard focusable");
      await Promise.all([
        page.waitForURL(url => url.pathname.endsWith("/subjects/physics/")),
        keyboardCard.press("Enter")
      ]);
      await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
    }

    for (const [subjectId, subjectName] of subjects) {
      const label = viewportName + " " + subjectId;
      await page.goto(baseUrl + "/subjects/" + subjectId + "/", { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.subjectShellReady === "true");
      assert(await page.title() === "콩쥐야 줘때써 - " + subjectName + "편", label + ": title");
      assert(await page.locator(".portal-return").isVisible(), label + ": portal return");
      assert(await page.locator('a[aria-label="과학 통합관으로 돌아가기"]').count() >= 2, label + ": explicit portal links");
      await assertNoOverflow(page, label + " home");

      await page.locator('[data-view-target="jars"]:visible').first().click();
      assert(await page.locator("#subjectQuizEmpty").isVisible(), label + ": empty state hidden");
      assert(await page.locator("#subjectQuizEmpty h3").textContent() === "아직 등록된 " + subjectName + " 장독대가 없습니다.", label + ": empty copy");
      assert(await page.locator("#subjectCategoryFilter").isHidden(), label + ": empty category filter visible");
      assert(await page.locator(".subject-quiz-card").count() === 0, label + ": invented quiz");
      await assertNoOverflow(page, label + " jars");
      if (screenshotDir && viewportName === "mobile-390" && subjectId === "physics") {
        await page.screenshot({ path: screenshotDir + "/physics-empty-mobile.png", fullPage: true });
      }

      await page.locator('[data-view-target="records"]:visible').first().click();
      assert(await page.locator(".record-empty").textContent() === "플레이 기록 없음", label + ": record empty");
      assert(await page.locator("#subjectAccuracy").textContent() === "—", label + ": empty accuracy");
      assert(!(await page.locator("[data-subject-view=records]").textContent()).includes("NaN"), label + ": NaN");
      await assertNoOverflow(page, label + " records");

      const shopHref = await page.locator('.subject-desktop-nav a').getAttribute("href");
      assert(new URL(shopHref).searchParams.get("from") === subjectId, label + ": shop context");
    }

    assert(errors.length === 0, viewportName + ": " + errors.join(" | "));
    await context.close();
  }

  const isolation = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await isolation.newPage();
  await page.goto(baseUrl + "/subjects/physics/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("kongjuiya:physics:records", JSON.stringify([{ quizId: "fixture", correct: 3, wrong: 1, bestCombo: 2 }]));
    localStorage.setItem("kongjuiya-training-category", "산화환원");
    localStorage.setItem("kongjuiya-audio-settings", JSON.stringify({ bgmVolume: 0.35, sfxVolume: 0.35 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('[data-view-target="records"]:visible').first().click();
  assert(await page.locator("#subjectTotalPlays").textContent() === "1", "physics fixture record missing");
  assert(await page.locator("#subjectAccuracy").textContent() === "75%", "physics accuracy incorrect");

  await page.goto(baseUrl + "/subjects/biology/?view=records", { waitUntil: "networkidle" });
  assert(await page.locator(".record-empty").textContent() === "플레이 기록 없음", "biology leaked physics record");
  assert(await page.locator("#subjectAccuracy").textContent() === "—", "biology leaked accuracy");
  assert(await page.locator("#subjectCategoryFilter").isHidden(), "biology leaked chemistry category");

  await page.locator("[data-settings-open]:visible").first().click();
  assert(await page.locator("#subjectVolume").inputValue() === "0.35", "global audio did not carry");
  await page.locator('.dialog-close').click();

  await page.goto(baseUrl + "/shop.html?from=biology", { waitUntil: "networkidle" });
  assert(new URL(await page.locator('.desktop-tabs a').first().getAttribute("href")).pathname.endsWith("/subjects/biology/"), "shop return subject lost");
  await page.locator(".science-portal-link").click();
  await page.waitForURL(baseUrl + "/");
  assert(await page.locator(".subject-card").count() === 4, "shop to portal failed");
  await isolation.close();

  console.log("subject shells smoke: 6 viewports, empty states, isolation, global settings, shop and portal routes passed");
} finally {
  await browser.close();
}
