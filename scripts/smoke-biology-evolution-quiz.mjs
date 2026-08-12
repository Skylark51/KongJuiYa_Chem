#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS as questions } from "../data/questions/biology-variation-natural-selection.js";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.BIOLOGY_SCREENSHOT_DIR || "";
const cases = [
  ["mobile-390", { width: 390, height: 844 }],
  ["desktop-1366", { width: 1366, height: 768 }]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  for (const [name, viewport] of cases) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", message => {
      if (message.type() === "error") errors.push("console: " + message.text());
    });
    page.on("pageerror", error => errors.push("page: " + error.message));
    page.on("response", response => {
      if (response.status() >= 400 && response.url().startsWith(baseUrl)) errors.push(response.status() + " " + response.url());
    });

    await page.goto(baseUrl + "/subjects/biology/quiz.html?quiz=biology-variation-natural-selection", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.subjectQuizReady === "true");
    assert(await page.locator("#progressText").textContent() === "1 / 10", name + ": question count");
    assert(await page.locator("#sourceImage").evaluate(image => image.complete && image.naturalWidth > 0), name + ": source image");
    if (screenshotDir && name === "mobile-390") {
      await page.screenshot({ path: screenshotDir + "/biology-evolution-question-mobile.png", fullPage: true });
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      assert(await page.locator("#questionPrompt").textContent() === question.prompt, name + ": prompt " + index);
      const choice = index === 1 ? question.choices.find(item => item !== question.answer) : question.answer;
      await page.locator("#answerChoices button").filter({ hasText: choice }).click();
      assert(await page.locator("#feedback").isVisible(), name + ": feedback " + index);
      if (index === 1) assert((await page.locator("#feedbackTitle").textContent()).startsWith("정답은"), name + ": wrong feedback");
      else assert(await page.locator("#feedbackTitle").textContent() === "정답입니다!", name + ": correct feedback");
      await page.locator("#nextButton").click();
    }

    assert(await page.locator("#resultPanel").isVisible(), name + ": result");
    assert(await page.locator("#resultScore").textContent() === "9 / 10", name + ": score");
    if (screenshotDir && name === "desktop-1366") {
      await page.screenshot({ path: screenshotDir + "/biology-evolution-result-desktop.png", fullPage: true });
    }
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem("kongjuiya:biology:records") || "[]")[0]);
    assert(record?.quizId === "biology-variation-natural-selection", name + ": record quiz");
    assert(record.correct === 9 && record.wrong === 1, name + ": record score");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ": horizontal overflow");
    assert(errors.length === 0, name + ": " + errors.join(" | "));

    await page.getByRole("link", { name: "기록 보기" }).click();
    await page.waitForFunction(() => document.documentElement.dataset.subjectShellReady === "true");
    assert(await page.locator("#subjectTotalPlays").textContent() === "1", name + ": record view");
    await context.close();
  }
  console.log("biology evolution image quiz: 10 questions, feedback, records, mobile and desktop passed");
} finally {
  await browser.close();
}
