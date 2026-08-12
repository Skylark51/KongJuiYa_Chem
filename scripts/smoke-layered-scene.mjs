#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SCENE_BASE_URL || "http://127.0.0.1:4173";
const baseOrigin = new URL(baseUrl).origin;
const path = "/%EC%BD%A9%EC%A5%90%EC%95%BC_%EC%A4%98%EB%95%8C%EC%8D%A8.html?training=atomic_number";
const cases = [
  ["mobile-portrait", { width: 390, height: 844 }],
  ["mobile-landscape", { width: 844, height: 390 }],
  ["desktop-1366", { width: 1366, height: 768 }],
  ["desktop-1920", { width: 1920, height: 1080 }]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isLocalResponse(url) {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

async function exerciseGameplay(page, name) {
  await page.waitForFunction(() => {
    const api = globalThis.KongJuiYaGame;
    return api?.game?.state?.status === "running" && Boolean(api.game.question);
  }, null, { timeout: 15000 });

  const initial = await page.evaluate(() => {
    const api = globalThis.KongJuiYaGame;
    const question = api.game.question;
    const answer = ["binary_choice", "multiple_choice"].includes(question.type)
      ? question.type === "binary_choice"
        ? String(question.correctChoice)
        : String(Number(question.correctChoice) + 1)
      : String(question.answers?.[0] ?? "");
    return {
      status: api.game.state.status,
      score: api.game.state.score,
      correctInStage: api.game.state.correctInStage,
      questionId: question.id,
      prompt: document.getElementById("questionText")?.textContent?.trim(),
      answer,
      inputDisabled: document.getElementById("answerInput")?.disabled,
      submitDisabled: document.getElementById("submitButton")?.disabled
    };
  });

  assert(initial.status === "running", `${name}: game did not start`);
  assert(initial.questionId, `${name}: no active question`);
  assert(initial.prompt && initial.prompt !== "문제를 준비하고 있습니다.", `${name}: question prompt was not rendered`);
  assert(initial.answer !== "", `${name}: active question has no testable answer`);
  assert(initial.inputDisabled === false, `${name}: answer input is disabled`);
  assert(initial.submitDisabled === false, `${name}: submit button is disabled`);

  await page.evaluate(() => {
    const api = globalThis.KongJuiYaGame;
    const stack = document.getElementById("layeredScene");
    globalThis.__runtimeInvariantCounts = { correctEvents: 0, recordAnswer: 0, finishRun: 0, waterFeedback: 0 };
    addEventListener("answer:correct", () => globalThis.__runtimeInvariantCounts.correctEvents += 1);
    const originalRecordAnswer = api.storage.recordAnswer.bind(api.storage);
    api.storage.recordAnswer = (...args) => {
      globalThis.__runtimeInvariantCounts.recordAnswer += 1;
      return originalRecordAnswer(...args);
    };
    const originalFinishRun = api.storage.finishRun.bind(api.storage);
    api.storage.finishRun = (...args) => {
      globalThis.__runtimeInvariantCounts.finishRun += 1;
      return originalFinishRun(...args);
    };
    new MutationObserver(records => {
      for (const record of records) {
        if (record.attributeName === "data-scene-state" && stack.dataset.sceneState === "correct") {
          globalThis.__runtimeInvariantCounts.waterFeedback += 1;
        }
      }
    }).observe(stack, { attributes: true, attributeFilter: ["data-scene-state"] });
  });

  await page.evaluate(answer => globalThis.KongJuiYaGame.submit(answer), initial.answer);
  await page.waitForFunction(({ score, correctInStage }) => {
    const state = globalThis.KongJuiYaGame?.game?.state;
    return state?.score > score && state?.correctInStage > correctInStage;
  }, { score: initial.score, correctInStage: initial.correctInStage });

  const afterCorrect = await page.evaluate(() => ({
    score: globalThis.KongJuiYaGame.game.state.score,
    combo: globalThis.KongJuiYaGame.game.state.combo,
    questionId: globalThis.KongJuiYaGame.game.question?.id,
    feedbackPending: globalThis.KongJuiYaGame.game.state.feedbackPending,
    correctCount: Number(document.getElementById("ui-correctCount")?.textContent || 0),
    feedback: document.getElementById("feedback")?.textContent?.trim()
  }));
  assert(afterCorrect.score > initial.score, `${name}: correct answer did not increase score`);
  assert(afterCorrect.combo >= 1, `${name}: correct answer did not increase combo`);
  assert(afterCorrect.questionId === initial.questionId, `${name}: answered question did not remain during feedback`);
  assert(afterCorrect.feedbackPending === true, `${name}: shared feedback cadence was not active`);
  assert(afterCorrect.correctCount >= 1, `${name}: correct UI count did not update`);
  assert(/정답/.test(afterCorrect.feedback || ""), `${name}: correct feedback did not render`);
  const invariantCounts = await page.evaluate(() => globalThis.__runtimeInvariantCounts);
  assert(invariantCounts.correctEvents === 1, `${name}: answer:correct fired ${invariantCounts.correctEvents} times`);
  assert(invariantCounts.recordAnswer === 1, `${name}: recordAnswer ran ${invariantCounts.recordAnswer} times`);
  assert(invariantCounts.waterFeedback === 1, `${name}: water feedback ran ${invariantCounts.waterFeedback} times`);

  await page.waitForFunction(questionId => {
    const game = globalThis.KongJuiYaGame?.game;
    return game?.state?.feedbackPending === false && game?.question?.id !== questionId;
  }, initial.questionId);

  const wrongBefore = await page.evaluate(() => ({
    combo: globalThis.KongJuiYaGame.game.state.combo,
    wrongCount: Number(document.getElementById("ui-wrongCount")?.textContent || 0)
  }));
  await page.evaluate(() => globalThis.KongJuiYaGame.submit("__definitely_wrong_answer__"));
  await page.waitForFunction(wrongCount => {
    const nextWrong = Number(document.getElementById("ui-wrongCount")?.textContent || 0);
    return nextWrong > wrongCount;
  }, wrongBefore.wrongCount);

  const afterWrong = await page.evaluate(() => ({
    combo: globalThis.KongJuiYaGame.game.state.combo,
    wrongCount: Number(document.getElementById("ui-wrongCount")?.textContent || 0),
    questionId: globalThis.KongJuiYaGame.game.question?.id,
    feedback: document.getElementById("feedback")?.textContent?.trim()
  }));
  assert(afterWrong.combo === 0, `${name}: wrong answer did not reset combo`);
  assert(afterWrong.wrongCount > wrongBefore.wrongCount, `${name}: wrong UI count did not update`);
  assert(afterWrong.questionId, `${name}: no question after wrong answer`);
  assert(/오답/.test(afterWrong.feedback || ""), `${name}: wrong feedback did not render`);

  await page.click("#ui-pauseButton");
  await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "paused");
  await page.click("#ui-pauseButton");
  await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running");

  if (name === "desktop-1366") {
    while (await page.evaluate(() => globalThis.KongJuiYaGame.game.state.status === "running")) {
      const answeredQuestionId = await page.evaluate(() => {
        const api = globalThis.KongJuiYaGame;
        const question = api.game.question;
        const answer = ["binary_choice", "multiple_choice"].includes(question.type)
          ? question.type === "binary_choice"
            ? String(question.correctChoice)
            : String(Number(question.correctChoice) + 1)
          : String(question.answers?.[0] ?? "");
        api.submit(answer);
        return question.id;
      });
      await page.waitForFunction(questionId => {
        const game = globalThis.KongJuiYaGame?.game;
        return game?.state?.status !== "running"
          || (game.state.feedbackPending === false && game.question?.id !== questionId);
      }, answeredQuestionId);
    }
    const completed = await page.evaluate(() => ({
      status: globalThis.KongJuiYaGame.game.state.status,
      finishRun: globalThis.__runtimeInvariantCounts.finishRun,
      recentRuns: globalThis.KongJuiYaGame.storage.data.recentRuns.length
    }));
    assert(completed.status === "cleared", `${name}: game did not clear`);
    assert(completed.finishRun === 1, `${name}: finishRun ran ${completed.finishRun} times`);
    assert(completed.recentRuns === 1, `${name}: recentRuns grew ${completed.recentRuns} times`);
  }
}

async function exerciseScene(browser, name, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];

  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/^Failed to load resource:/i.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("response", response => {
    if (response.status() >= 400 && isLocalResponse(response.url())) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", error => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#layeredScene", { state: "attached" });
  await page.waitForFunction(() => {
    const app = document.getElementById("ui-gameApp");
    return app?.dataset.sceneRenderer === "layered-png";
  }, null, { timeout: 15000 });

  await exerciseGameplay(page, name);

  const geometry = await page.evaluate(() => {
    const stage = document.getElementById("visualStage").getBoundingClientRect();
    const stacks = [...document.querySelectorAll("#layeredScene")];
    const stack = stacks[0].getBoundingClientRect();
    const visible = [...document.querySelectorAll(
      "#layeredScene > .scene-kongjwi, #layeredScene > .scene-tool, #layeredScene > .scene-jar-back, #layeredScene > .scene-toad-expression"
    )].filter(element => !element.hidden).map(element => {
      const box = element.getBoundingClientRect();
      return { className: element.className, left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });
    return {
      runtimeEntries: performance.getEntriesByType("resource").filter(entry => /\/assets\/js\/main\.js(?:\?|$)/.test(entry.name)).length,
      stackCount: stacks.length,
      legacySceneNodes: document.querySelectorAll(".scene-background-layer,.scene-cinematic-shade,.quiz-scene-actors,.scene-leak-effect").length,
      stage: { left: stage.left, top: stage.top, right: stage.right, bottom: stage.bottom, width: stage.width, height: stage.height },
      stack: { left: stack.left, top: stack.top, right: stack.right, bottom: stack.bottom, width: stack.width, height: stack.height },
      visible
    };
  });

  const tolerance = 2;
  assert(geometry.stackCount === 1, `${name}: expected one layered scene, found ${geometry.stackCount}`);
  assert(geometry.runtimeEntries === 1, `${name}: main.js loaded ${geometry.runtimeEntries} times`);
  assert(geometry.legacySceneNodes === 0, `${name}: ${geometry.legacySceneNodes} legacy scene nodes remain`);
  assert(geometry.stage.width > 0 && geometry.stage.height > 0, `${name}: visual stage has no layout box`);
  assert(geometry.stack.width > 0 && geometry.stack.height > 0, `${name}: layered scene has no layout box`);
  assert(geometry.stack.left >= geometry.stage.left - tolerance, `${name}: stack left crop`);
  assert(geometry.stack.right <= geometry.stage.right + tolerance, `${name}: stack right crop`);
  assert(geometry.stack.top >= geometry.stage.top - tolerance, `${name}: stack top crop`);
  assert(geometry.stack.bottom <= geometry.stage.bottom + tolerance, `${name}: stack bottom crop`);
  for (const actor of geometry.visible) {
    assert(actor.left >= geometry.stack.left - tolerance, `${name}: ${actor.className} left crop`);
    assert(actor.right <= geometry.stack.right + tolerance, `${name}: ${actor.className} right crop`);
    assert(actor.top >= geometry.stack.top - tolerance, `${name}: ${actor.className} top crop`);
    assert(actor.bottom <= geometry.stack.bottom + tolerance, `${name}: ${actor.className} bottom crop`);
  }

  if (reducedMotion === "reduce") {
    const animation = await page.locator("#layeredScene .scene-kongjwi").evaluate(element =>
      getComputedStyle(element).animationName
    );
    assert(animation === "none", `${name}: reduced motion animation is ${animation}`);
  }

  assert(failedResponses.length === 0, `${name}: local HTTP failures\n${failedResponses.join("\n")}`);
  assert(consoleErrors.length === 0, `${name}: console errors\n${consoleErrors.join("\n")}`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of cases) await exerciseScene(browser, name, viewport);
  await exerciseScene(browser, "reduced-motion", { width: 1366, height: 768 }, "reduce");
  console.log("Layered scene and real quiz gameplay smoke test passed.");
} finally {
  await browser.close();
}
