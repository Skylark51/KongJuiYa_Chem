#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const screenshotDir = process.env.SCIENCE_PARITY_SCREENSHOT_DIR || "";
const viewports = [
  ["390x844", { width: 390, height: 844 }],
  ["430x932", { width: 430, height: 932 }],
  ["844x390", { width: 844, height: 390 }],
  ["932x430", { width: 932, height: 430 }],
  ["768x1024", { width: 768, height: 1024 }],
  ["1024x768", { width: 1024, height: 768 }],
  ["1366x768", { width: 1366, height: 768 }],
  ["1920x1080", { width: 1920, height: 1080 }]
];
const subjects = [
  ["chemistry", "atomic_number"],
  ["biology", "biology-variation-natural-selection"],
  ["earth-science", "earth-fossil-type"]
];
const geometrySelectors = {
  header: ".jar-game-header",
  layout: ".jar-game-layout",
  hud: ".game-hud",
  scenePanel: ".scene-panel",
  visualStage: "#visualStage",
  animationZone: ".scene-animation-zone",
  layeredScene: "#layeredScene",
  questionPanel: ".question-panel",
  feverPanel: ".fever-panel",
  feedback: "#feedback"
};
const requiredLayerOrder = [
  "scene-background", "scene-kongjwi", "scene-tool", "scene-water-stream",
  "scene-jar-back", "scene-water-fill", "scene-toad-skin", "scene-toad-expression",
  "scene-jar-front", "scene-water-splash", "scene-water-leak", "scene-foreground", "scene-ui"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function closeEnough(actual, expected, tolerance = 1.1) {
  return Math.abs(actual - expected) <= tolerance;
}

async function waitRunning(page) {
  await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running");
}

async function waitCadence(page) {
  await page.waitForFunction(() => {
    const state = globalThis.KongJuiYaGame?.game?.state;
    return state && (state.status !== "running" || !state.feedbackPending);
  }, null, { timeout: 4000 });
}

async function capture(page, subjectId, state, viewport = "1366x768") {
  if (!screenshotDir) return;
  await page.screenshot({
    path: screenshotDir + "/" + viewport + "-" + subjectId + "-" + state + ".png",
    fullPage: true
  });
}

async function submit(page, correct) {
  await page.evaluate(wantCorrect => {
    const api = globalThis.KongJuiYaGame;
    const question = api.game.question;
    const descriptor = api.game.snapshot().questionInput;
    let answer;
    if (descriptor.choices.length) {
      const correctKey = String(question.correctChoice + 1);
      answer = wantCorrect
        ? correctKey
        : String((question.correctChoice + 1) % descriptor.choices.length + 1);
    } else {
      answer = wantCorrect ? String(question.answers[0]) : "__wrong__";
    }
    api.submit(answer);
  }, correct);
}

async function measure(page) {
  return page.evaluate(({ selectors, layerOrder }) => {
    const rect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        x: box.x, y: box.y, width: box.width, height: box.height,
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
        display: style.display
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      geometry: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, rect(selector)])),
      layerOrder: [...document.querySelectorAll("#layeredScene > .scene-layer")].map(node =>
        layerOrder.find(name => node.classList.contains(name))
      ),
      overflow: {
        x: document.documentElement.scrollWidth - innerWidth,
        y: document.documentElement.scrollHeight - innerHeight
      },
      image: (() => {
        const node = document.querySelector(".subject-question-image");
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height, visible: box.width > 20 && box.height > 20 };
      })()
    };
  }, { selectors: geometrySelectors, layerOrder: requiredLayerOrder });
}

const browser = await chromium.launch({ headless: true });
try {
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const pages = new Map();
  const errors = [];

  for (const [subjectId, trainingId] of subjects) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(subjectId + " page: " + error.message));
    page.on("console", message => {
      const source = message.location().url || "";
      if (message.type() === "error" && source.startsWith(baseUrl)) {
        errors.push(subjectId + " console: " + message.text());
      }
    });
    page.on("response", response => {
      if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
        errors.push(subjectId + " " + response.status() + " " + response.url());
      }
    });
    const url = new URL("/콩쥐야_줘때써.html", baseUrl);
    url.searchParams.set("subject", subjectId);
    url.searchParams.set("training", trainingId);
    await page.addInitScript(id => {
      sessionStorage.setItem("kongjuiya-training-selection", JSON.stringify({
        trainingId: id,
        difficulty: "normal",
        resume: false
      }));
    }, trainingId);
    await page.goto(url.href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.gameRuntime === "ready");
    await waitRunning(page);
    pages.set(subjectId, { context, page });
  }

  const measurements = {};
  for (const [viewportName, viewport] of viewports) {
    measurements[viewportName] = {};
    for (const [subjectId] of subjects) {
      const { page } = pages.get(subjectId);
      await page.setViewportSize(viewport);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.gameRuntime === "ready");
      await waitRunning(page);
      const current = measurements[viewportName][subjectId] = await measure(page);
      assert(current.overflow.x <= 1, viewportName + " " + subjectId + ": horizontal overflow");
      assert(current.overflow.y <= 1, viewportName + " " + subjectId + ": vertical overflow");
      assert(JSON.stringify(current.layerOrder) === JSON.stringify(requiredLayerOrder), viewportName + " " + subjectId + ": layer order");
      if (subjectId !== "chemistry") assert(current.image?.visible, viewportName + " " + subjectId + ": visible image presentation");
      await capture(page, subjectId, "question", viewportName);
    }

    const gold = measurements[viewportName].chemistry;
    for (const subjectId of ["biology", "earth-science"]) {
      const candidate = measurements[viewportName][subjectId];
      for (const key of Object.keys(geometrySelectors)) {
        for (const dimension of ["x", "y", "width", "height"]) {
          assert(
            closeEnough(candidate.geometry[key][dimension], gold.geometry[key][dimension]),
            viewportName + " " + subjectId + ": " + key + " " + dimension +
              " expected " + gold.geometry[key][dimension] + " got " + candidate.geometry[key][dimension]
          );
        }
        for (const property of ["borderRadius", "fontFamily", "display"]) {
          assert(candidate.geometry[key][property] === gold.geometry[key][property], viewportName + " " + subjectId + ": " + key + " " + property);
        }
      }
    }
  }

  for (const [subjectId] of subjects) {
    const { page } = pages.get(subjectId);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.gameRuntime === "ready");
    await waitRunning(page);
    await submit(page, true);
    await page.waitForFunction(() => document.getElementById("ui-gameApp")?.dataset.sceneState === "correct");
    assert(await page.locator("#ui-choiceOptions button:disabled").count() || await page.locator("#answerInput:disabled").count(), subjectId + ": input locked during correct");
    await capture(page, subjectId, "correct");
    await waitCadence(page);

    await submit(page, false);
    await page.waitForFunction(() => document.getElementById("ui-gameApp")?.dataset.sceneState === "wrong");
    await capture(page, subjectId, "wrong");
    await waitCadence(page);

    await page.evaluate(() => {
      const game = globalThis.KongJuiYaGame.game;
      game.state.combo = 2;
      game.state.feverCharge = 2;
      game.state.lastCorrectAt = game.state.elapsedSeconds;
    });
    await submit(page, true);
    await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.feverActive);
    await capture(page, subjectId, "combo-fever");
    await waitCadence(page);

    await page.evaluate(() => {
      const game = globalThis.KongJuiYaGame.game;
      game.state.water = 10.1;
      game.tick(0.25);
    });
    await page.waitForFunction(() => document.getElementById("ui-gameApp")?.dataset.sceneState === "critical");
    await capture(page, subjectId, "critical");

    await page.locator("#ui-pauseButton").click();
    await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.status === "paused");
    await capture(page, subjectId, "pause");
    await page.locator("#ui-pauseButton").click();
    await waitRunning(page);

    await page.evaluate(() => {
      const game = globalThis.KongJuiYaGame.game;
      game.state.water = 70;
      game.warningLevel = null;
      game.state.questionTimeRemaining = 0;
      game.tick(0.01);
    });
    await page.waitForFunction(() => document.getElementById("ui-gameApp")?.dataset.sceneState === "timeout");
    await capture(page, subjectId, "timeout");
    await waitCadence(page);

    await page.evaluate(() => {
      const api = globalThis.KongJuiYaGame;
      api.game.state.correctInStage = api.questionCount - 1;
    });
    await submit(page, true);
    await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.status === "cleared");
    await page.evaluate(() => { const dialog = document.getElementById("adDialog"); if (dialog?.open) dialog.close(); });
    await capture(page, subjectId, "clear");
    assert(await page.locator("#resultPanel").isVisible(), subjectId + ": result visible");
    await capture(page, subjectId, "result");

    await page.locator("#ui-restartGameButton").click();
    await waitRunning(page);
    await page.evaluate(() => {
      const game = globalThis.KongJuiYaGame.game;
      game.state.water = 0.1;
      game.tick(0.25);
    });
    await page.waitForFunction(() => globalThis.KongJuiYaGame.game.state.status === "over");
    await page.evaluate(() => { const dialog = document.getElementById("adDialog"); if (dialog?.open) dialog.close(); });
    await capture(page, subjectId, "over");
  }

  assert(errors.length === 0, errors.join(" | "));
  console.log("cross-subject parity: 3 subjects, 8 viewports, shared geometry/layers and 9 gameplay states passed");
  for (const { context } of pages.values()) await context.close();
} finally {
  await browser.close();
}
