#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.EARTH_SCIENCE_SCREENSHOT_DIR || "";
const cases = [
  ["mobile-375", { width: 375, height: 667 }],
  ["mobile-430", { width: 430, height: 932 }],
  ["desktop-1366", { width: 1366, height: 768 }]
];
const quizzes = [
  ["earth-fossil-type", 8, ["시상 화석", "표준 화석"]],
  ["earth-index-fossil-era", 6, ["선캄브리아시대", "고생대", "중생대", "신생대"]]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  for (const [viewportName, viewport] of cases) {
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

    for (const [quizId, questionCount, expectedChoices] of quizzes) {
      const label = viewportName + " " + quizId;
      await page.goto(baseUrl + "/subjects/earth-science/quiz.html?quiz=" + quizId, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.subjectQuizReady === "true");
      assert(await page.locator("#ui-gameApp").getAttribute("data-scene-renderer") === "layered-png", label + ": chemistry scene renderer");
      assert(await page.locator("#layeredScene").count() === 1, label + ": layered scene");
      assert(await page.locator("#answerChoices button span").allTextContents().then(values => values.join("|")) === expectedChoices.join("|"), label + ": choices");
      assert(await page.locator("#answerChoices kbd").allTextContents().then(values => values.join("|")) === expectedChoices.map((_, index) => String(index + 1)).join("|"), label + ": keyboard labels");
      assert(await page.locator("#fossilImage").evaluate(image => image.complete && image.naturalWidth > 0), label + ": image");
      assert(await page.locator("#progressText").textContent() === "1 / " + questionCount, label + ": initial progress");
      if (screenshotDir && quizId === "earth-fossil-type" && ["mobile-375", "desktop-1366"].includes(viewportName)) {
        await page.screenshot({ path: screenshotDir + "/" + viewportName + "-fossil-game.png", fullPage: true });
      }

      for (let index = 0; index < questionCount; index += 1) {
        if (viewportName === "desktop-1366" && quizId === "earth-fossil-type" && index < 2) {
          await page.keyboard.press(index === 0 ? "1" : "2");
          await page.waitForFunction(expected => document.getElementById("ui-gameApp")?.dataset.sceneState === expected, index === 0 ? "correct" : "wrong");
          if (index === 0) assert(Number((await page.locator("#waterText").textContent()).replace("%", "")) > 55, label + ": correct water");
          if (screenshotDir) {
            await page.screenshot({ path: screenshotDir + "/desktop-key-" + (index + 1) + "-" + (index === 0 ? "correct" : "wrong") + ".png", fullPage: true });
          }
        } else {
          await page.locator("#answerChoices button").first().click();
        }
        assert(await page.locator("#feedback").isVisible(), label + ": feedback " + index);
        assert(await page.locator("#nextButton").isVisible(), label + ": next " + index);
        await page.locator("#nextButton").click();
      }
      assert(await page.locator("#resultPanel").isVisible(), label + ": result");
      assert(await page.locator("#resultScore").textContent().then(value => value.endsWith(" / " + questionCount)), label + ": score");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 1, label + ": horizontal overflow " + overflow);
    }

    const records = await page.evaluate(() => JSON.parse(localStorage.getItem("kongjuiya:earth-science:records") || "[]"));
    assert(records.some(record => record.quizId === "earth-fossil-type"), viewportName + ": type record");
    assert(records.some(record => record.quizId === "earth-index-fossil-era"), viewportName + ": era record");

    await page.goto(baseUrl + "/subjects/earth-science/?view=jars", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.subjectShellReady === "true");
    assert(await page.locator(".subject-quiz-card a").count() === 2, viewportName + ": two live jars");
    assert(await page.locator(".subject-quiz-card.is-planned button:disabled").count() === 1, viewportName + ": one planned jar");
    assert(errors.length === 0, viewportName + ": " + errors.join(" | "));
    await context.close();
  }

  console.log("earth science fossil quizzes smoke: two live jars, 14 questions, records and 3 viewports passed");
} finally {
  await browser.close();
}
