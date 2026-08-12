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
  ["physics", "물리학", [], []],
  ["biology", "생명과학", [
    "생물 다양성 종류 구분 장독대",
    "생물 다양성의 감소 원인 구분 장독대",
    "생물다양성을 보전하기 위한 노력 구분 장독대"
  ], [
    "통합과학2 - 변이와 자연선택에 의한 생물의 진화",
    "통합과학2 - 생물다양성"
  ]],
  ["earth-science", "지구과학", [
    "시상 화석과 표준 화석 구분 장독대",
    "표준 화석의 시대 구분 장독대",
    "지질 시대 키워드 구분 장독대"
  ], ["통합과학2 - 지질 시대의 환경과 생물"]]
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

    for (const [subjectId, subjectName, jarTitles, categoryNames] of subjects) {
      const label = viewportName + " " + subjectId;
      await page.goto(baseUrl + "/subjects/" + subjectId + "/", { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.subjectShellReady === "true");
      assert(await page.title() === "콩쥐야 줘때써 - " + subjectName + "편", label + ": title");
      assert(await page.locator(".portal-return").isVisible(), label + ": portal return");
      assert(await page.locator('a[aria-label="과학 통합관으로 돌아가기"]').count() >= 2, label + ": explicit portal links");
      await assertNoOverflow(page, label + " home");

      await page.locator('[data-view-target="jars"]:visible').first().click();
      if (jarTitles.length === 0) {
        assert(await page.locator("#subjectQuizEmpty").isVisible(), label + ": empty state hidden");
        assert(await page.locator("#subjectQuizEmpty h3").textContent() === "아직 등록된 " + subjectName + " 장독대가 없습니다.", label + ": empty copy");
        assert(await page.locator("#subjectCategoryFilter").isHidden(), label + ": empty category filter visible");
        assert(await page.locator(".subject-quiz-card").count() === 0, label + ": invented quiz");
      } else {
        assert(await page.locator("#subjectQuizEmpty").isHidden(), label + ": non-empty state visible");
        assert(await page.locator("#subjectCategoryFilter").isVisible(), label + ": category filter hidden");
        assert(await page.locator("#subjectCategoryFilter button").count() === categoryNames.length + 1, label + ": category filters");
        assert(await page.locator(".subject-quiz-card").count() === jarTitles.length, label + ": authored jar count");
        assert(await page.locator(".subject-quiz-card.is-planned button:disabled").count() === jarTitles.length, label + ": planned jars must be disabled");
        assert(await page.locator(".subject-quiz-card h3").allTextContents().then(titles => titles.join("|")) === jarTitles.join("|"), label + ": jar titles");
        assert(await page.locator("#subjectCategoryFilter button").allTextContents().then(labels => labels.slice(1).join("|")) === categoryNames.join("|"), label + ": category names");
        if (subjectId === "biology") {
          await page.getByRole("button", { name: categoryNames[0], exact: true }).click();
          assert(await page.locator("#subjectQuizEmpty").isVisible(), label + ": empty evolution category state");
          assert(await page.locator("#subjectQuizEmpty h3").textContent() === "이 범주에는 아직 등록된 장독대가 없습니다.", label + ": empty category copy");
          await page.getByRole("button", { name: "전체", exact: true }).click();
        }
      }
      await assertNoOverflow(page, label + " jars");
      if (screenshotDir && viewportName === "mobile-390" && subjectId === "physics") {
        await page.screenshot({ path: screenshotDir + "/physics-empty-mobile.png", fullPage: true });
      }
      if (screenshotDir && viewportName === "mobile-390" && subjectId === "biology") {
        await page.screenshot({ path: screenshotDir + "/biology-planned-jars-mobile.png", fullPage: true });
      }

      await page.locator('[data-view-target="records"]:visible').first().click();
      assert(await page.locator(".record-empty").textContent() === "플레이 기록 없음", label + ": record empty");
      assert(await page.locator("#subjectAccuracy").textContent() === "—", label + ": empty accuracy");
      assert(!(await page.locator("[data-subject-view=records]").textContent()).includes("NaN"), label + ": NaN");
      await assertNoOverflow(page, label + " records");

      const shopHref = await page.locator('.subject-desktop-nav a').getAttribute("href");
      assert(new URL(shopHref).searchParams.get("subject") === subjectId, label + ": shop context");
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
  assert(await page.locator("#subjectCategoryFilter button").count() === 3, "biology categories missing");
  assert(!(await page.locator("#subjectCategoryFilter").textContent()).includes("산화환원"), "biology leaked chemistry category");

  await page.locator("[data-settings-open]:visible").first().click();
  assert(await page.locator("#subjectVolume").inputValue() === "0.35", "global audio did not carry");
  await page.locator('.dialog-close').click();

  await page.goto(baseUrl + "/shop.html?subject=biology", { waitUntil: "networkidle" });
  assert(new URL(await page.locator('.desktop-tabs a').first().getAttribute("href")).pathname.endsWith("/subjects/biology/"), "shop return subject lost");
  await page.locator(".science-portal-link").click();
  await page.waitForURL(baseUrl + "/");
  assert(await page.locator(".subject-card").count() === 4, "shop to portal failed");
  await isolation.close();

  console.log("subject shells smoke: 6 viewports, empty states, isolation, global settings, shop and portal routes passed");
} finally {
  await browser.close();
}
