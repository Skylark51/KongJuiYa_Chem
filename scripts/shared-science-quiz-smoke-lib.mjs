import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const EVENT_TYPES = [
  "game:start", "training:start", "question:changed", "answer:correct", "answer:wrong",
  "answer:timeout", "water:warning", "water:critical", "fever:start", "game:pause",
  "game:resume", "game:clear", "game:complete", "game:over", "toad:speak"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitRunning(page) {
  await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running", null, { timeout: 7000 });
}

async function waitFeedbackCadence(page) {
  try {
    await page.waitForFunction(() => {
      const state = globalThis.KongJuiYaGame?.game?.state;
      return state && (state.status !== "running" || !state.feedbackPending);
    }, null, { timeout: 5000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      state: globalThis.KongJuiYaGame?.game?.snapshot?.(),
      cadenceTimer: Boolean(globalThis.KongJuiYaGame?.cadence?.timer),
      sceneState: document.getElementById("ui-gameApp")?.dataset.sceneState
    }));
    throw new Error("feedback cadence timeout: " + JSON.stringify(diagnostic), { cause: error });
  }
}

async function choose(page, correct) {
  await page.evaluate(wantCorrect => {
    const question = globalThis.KongJuiYaGame.game.question;
    const choiceCount = question.choices.length;
    const index = wantCorrect ? question.correctChoice : (question.correctChoice + 1) % choiceCount;
    document.querySelector(`#ui-choiceOptions [data-choice-key="${index + 1}"]`)?.click();
  }, correct);
}

export async function runSharedQuizSmoke({
  label,
  subjectId,
  trainingIds,
  viewports,
  screenshotDir = "",
  baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173"
}) {
  const browser = await chromium.launch({ headless: true });
  try {
    if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
    for (const [viewportName, viewport] of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      await page.addInitScript(() => {
        const url = new URL(location.href);
        const trainingId = url.searchParams.get("training");
        if (decodeURIComponent(url.pathname).endsWith("/콩쥐야_줘때써.html") && trainingId) {
          sessionStorage.setItem("kongjuiya-training-selection", JSON.stringify({
            trainingId,
            difficulty: "normal",
            resume: false
          }));
        }
      });
      await page.addInitScript(types => {
        globalThis.__sharedQuizEvents = [];
        for (const type of types) addEventListener(type, () => globalThis.__sharedQuizEvents.push(type));
      }, EVENT_TYPES);
      page.on("console", message => {
        if (message.type() === "error") {
          const source = message.location().url || "unknown";
          if (source.startsWith(baseUrl)) errors.push("console: " + message.text() + " @ " + source);
        }
      });
      page.on("pageerror", error => errors.push("page: " + error.message));
      page.on("response", response => {
        if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
          errors.push(response.status() + " " + response.url());
        }
      });

      for (const trainingId of trainingIds) {
        const runLabel = `${viewportName} ${trainingId}`;
        const url = new URL("/콩쥐야_줘때써.html", baseUrl);
        url.searchParams.set("subject", subjectId);
        url.searchParams.set("training", trainingId);
        await page.goto(url.href, { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.documentElement.dataset.gameRuntime === "ready");
        await waitRunning(page);

        assert(await page.locator("html").getAttribute("data-subject") === subjectId, runLabel + ": subject context");
        assert(await page.locator("#ui-gameApp").getAttribute("data-scene-renderer") === "layered-png", runLabel + ": shared scene");
        assert(await page.locator("#layeredScene").count() === 1, runLabel + ": one layered scene");
        assert(await page.locator(".subject-question-image").evaluate(image => image.complete && image.naturalWidth > 0), runLabel + ": image");
        assert(await page.locator("#ui-choiceOptions button").count() >= 2, runLabel + ": choices");
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), runLabel + ": horizontal overflow");
        assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), runLabel + ": vertical overflow");

        if (screenshotDir && trainingId === trainingIds[0]) {
          await page.screenshot({ path: `${screenshotDir}/${label}-${viewportName}-question.png`, fullPage: true });
        }

        await choose(page, false);
        await waitFeedbackCadence(page);
        await choose(page, false);
        await waitFeedbackCadence(page);
        await choose(page, false);
        await waitFeedbackCadence(page);
        await choose(page, true);
        await waitFeedbackCadence(page);
        await choose(page, true);
        await waitFeedbackCadence(page);
        await page.evaluate(() => {
          const question = globalThis.KongJuiYaGame.game.question;
          const key = String(question.correctChoice + 1);
          document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        });
        await page.waitForFunction(() => globalThis.__sharedQuizEvents.includes("fever:start"));
        await waitFeedbackCadence(page);

        await page.locator("#ui-pauseButton").click();
        await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.status === "paused");
        await page.locator("#ui-pauseButton").click();
        await waitRunning(page);

        await page.evaluate(() => {
          globalThis.KongJuiYaGame.game.state.questionTimeRemaining = 0;
          globalThis.KongJuiYaGame.game.tick(0.01);
        });
        await page.waitForFunction(() => globalThis.__sharedQuizEvents.includes("answer:timeout"));
        await waitFeedbackCadence(page);

        for (let guard = 0; guard < 20; guard += 1) {
          const status = await page.evaluate(() => globalThis.KongJuiYaGame.game.state.status);
          if (status !== "running") break;
          await choose(page, true);
          await waitFeedbackCadence(page);
        }
        await page.waitForFunction(() => ["cleared", "completed"].includes(globalThis.KongJuiYaGame.game.state.status));
        const finalStatus = await page.evaluate(() => globalThis.KongJuiYaGame.game.state.status);
        assert(finalStatus === "completed", runLabel + ": mixed-answer fixed session should finish without a jar clear");
        assert(await page.locator("#resultPanel").isVisible(), runLabel + ": result panel");
        assert(await page.evaluate(id => {
          const records = JSON.parse(localStorage.getItem(`kongjuiya:${id}:records`) || "[]");
          return records.some(record => record.quizId === new URL(location.href).searchParams.get("training"));
        }, subjectId), runLabel + ": isolated record");

        const events = await page.evaluate(() => globalThis.__sharedQuizEvents);
        for (const required of ["game:start", "question:changed", "answer:correct", "answer:wrong", "answer:timeout", "fever:start", "game:pause", "game:resume", "game:complete", "toad:speak"]) {
          assert(events.includes(required), runLabel + ": event " + required);
        }

        await page.evaluate(() => {
          const dialog = document.getElementById("adDialog");
          if (dialog?.open) dialog.close();
        });
        await page.locator("#ui-restartGameButton").click();
        await page.waitForSelector("#jarDifficultyDialog[open]");
        await page.locator("#jarDifficultyDialog [data-session-difficulty=normal]").click();
        await waitRunning(page);
        await page.evaluate(() => {
          const game = globalThis.KongJuiYaGame.game;
          game.state.water = 50.1;
          game.tick(0.25);
          game.state.water = 10.1;
          game.tick(0.25);
          game.state.water = 0.1;
          game.tick(0.25);
        });
        await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.status === "over");
        const dangerEvents = await page.evaluate(() => globalThis.__sharedQuizEvents);
        for (const required of ["water:warning", "water:critical", "game:over"]) {
          assert(dangerEvents.includes(required), runLabel + ": event " + required);
        }
      }

      await page.goto(new URL(`/subjects/${subjectId}/?view=records`, baseUrl).href, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.subjectShellReady === "true");
      assert(Number(await page.locator("#subjectTotalAnswers").textContent()) > 0, viewportName + ": record answers");
      assert(await page.locator(".subject-record-card").count() >= trainingIds.length, viewportName + ": record sessions");
      assert(errors.length === 0, viewportName + ": " + errors.join(" | "));
      await context.close();
    }
    console.log(`${label}: shared GameCore gameplay, events, records, 404/console and responsive checks passed`);
  } finally {
    await browser.close();
  }
}
