#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SCENE_BASE_URL || "http://127.0.0.1:4173";
const baseOrigin = new URL(baseUrl).origin;
const path = "/%EC%BD%A9%EC%A5%90%EC%95%BC_%EC%A4%98%EB%95%8C%EC%8D%A8.html?training=atomic_number";
const viewport = { width: 367, height: 662 };

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

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];

  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/^Failed to load resource:/i.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", error => consoleErrors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400 && isLocalResponse(response.url())) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.addInitScript(() => {
    const url = new URL(location.href);
    if (url.searchParams.get("training") === "atomic_number") {
      sessionStorage.setItem("kongjuiya-training-selection", JSON.stringify({
        trainingId: "atomic_number",
        difficulty: "normal",
        resume: false
      }));
    }
    globalThis.__openingProbe = { gameStarts: 0, statusDuring: null, timeAtPause: null, timeAfterDelay: null };
    addEventListener("game:start", () => {
      globalThis.__openingProbe.gameStarts += 1;
      queueMicrotask(() => {
        const game = globalThis.KongJuiYaGame?.game;
        globalThis.__openingProbe.statusDuring = game?.state?.status || null;
        globalThis.__openingProbe.timeAtPause = game?.state?.questionTimeRemaining ?? null;
        setTimeout(() => {
          globalThis.__openingProbe.timeAfterDelay = game?.state?.questionTimeRemaining ?? null;
        }, 900);
      });
    });
  });

  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const api = globalThis.KongJuiYaGame;
    const app = document.getElementById("ui-gameApp");
    return api?.game?.state?.status === "running" && Boolean(api.game.question) && app?.dataset.sceneRenderer === "layered-png";
  }, null, { timeout: 15000 });
  await page.waitForSelector("#ui-mobileKeypad:not([hidden])", { state: "visible" });

  const metrics = await page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const px = (selector, property = "fontSize") => {
      const node = document.querySelector(selector);
      return node ? Number.parseFloat(getComputedStyle(node)[property]) || 0 : 0;
    };
    const visibleToad = [...document.querySelectorAll("#layeredScene .scene-toad-skin, #layeredScene .scene-toad-expression")]
      .find(node => !node.hidden && getComputedStyle(node).display !== "none");
    const numericButtons = [...document.querySelectorAll("#ui-mobileKeypad .keypad-keys.is-numeric > button")];
    const clear = document.querySelector("#ui-mobileKeypad .keypad-clear");
    const title = document.querySelector(".header-title");
    const titleStrong = document.querySelector(".header-title strong");
    const titleStyle = title ? getComputedStyle(title) : null;
    const toadBox = visibleToad?.getBoundingClientRect();
    const toadStyle = visibleToad ? getComputedStyle(visibleToad) : null;
    const toadBefore = visibleToad ? getComputedStyle(visibleToad, "::before") : null;
    const toadAfter = visibleToad ? getComputedStyle(visibleToad, "::after") : null;
    const toadImage = visibleToad?.querySelector(".scene-layer-image");
    const toadImageBox = toadImage?.getBoundingClientRect();
    const questionText = document.querySelector("#questionText")?.textContent?.trim() || "";
    const startOverlay = document.querySelector("#startOverlay");

    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      },
      questionText,
      runtimeInstances: globalThis.KongJuiYaGame ? 1 : 0,
      layeredScenes: document.querySelectorAll("#layeredScene").length,
      debugButtons: document.querySelectorAll("#ui-assetInspectorButton").length,
      debugResources: performance.getEntriesByType("resource").filter(entry => /asset-debug-viewer\.js(?:\?|$)/.test(entry.name)).length,
      openingProbe: globalThis.__openingProbe,
      overlayId: startOverlay?.id || null,
      startOverlayHidden: Boolean(startOverlay?.classList.contains("hidden")),
      headerTitle: {
        visibility: titleStyle?.visibility || "missing",
        display: titleStyle?.display || "missing",
        width: title?.getBoundingClientRect().width || 0,
        text: titleStrong?.textContent?.trim() || ""
      },
      stage: rect("#visualStage"),
      questionBubble: rect(".scene-question-bubble"),
      fever: rect(".fever-panel"),
      feedback: rect("#feedback"),
      keypad: rect("#ui-mobileKeypad"),
      display: rect("#ui-mobileKeypad .keypad-display"),
      kongjwi: rect("#layeredScene .scene-kongjwi"),
      jar: rect("#layeredScene .scene-jar-back"),
      toad: toadBox ? { width: toadBox.width, height: toadBox.height, left: toadBox.left, top: toadBox.top, right: toadBox.right, bottom: toadBox.bottom } : null,
      toadImage: toadImageBox ? { width: toadImageBox.width, height: toadImageBox.height } : null,
      toadBackgroundImage: toadStyle?.backgroundImage || "missing",
      toadBackgroundColor: toadStyle?.backgroundColor || "missing",
      toadBeforeBackground: toadBefore?.backgroundImage || "missing",
      toadBeforeInset: toadBefore?.inset || "missing",
      toadAfterDisplay: toadAfter?.display || "missing",
      feverFont: px(".fever-copy"),
      feedbackFont: px("#feedback"),
      minKeyHeight: numericButtons.length ? Math.min(...numericButtons.map(button => button.getBoundingClientRect().height)) : 0,
      clearLabel: clear?.textContent?.trim() || "",
      clearAfter: clear ? getComputedStyle(clear, "::after").content : "",
      clearFont: clear ? Number.parseFloat(getComputedStyle(clear).fontSize) || 0 : -1
    };
  });

  assert(metrics.document.width <= metrics.viewport.width + 1, `367x662: horizontal overflow ${metrics.document.width} > ${metrics.viewport.width}`);
  assert(metrics.document.height <= metrics.viewport.height + 1, `367x662: vertical overflow ${metrics.document.height} > ${metrics.viewport.height}`);
  assert(/^[A-Z][a-z]?$/.test(metrics.questionText), `367x662: atomic-number prompt is not symbol-only (${metrics.questionText})`);
  assert(metrics.runtimeInstances === 1, "367x662: game runtime is missing");
  assert(metrics.layeredScenes === 1, `367x662: layered scene count is ${metrics.layeredScenes}`);
  assert(metrics.debugButtons === 0 && metrics.debugResources === 0, "367x662: asset debug viewer loaded in production mode");
  assert(metrics.overlayId === "startOverlay", `367x662: countdown changed overlay id to ${metrics.overlayId}`);
  assert(metrics.openingProbe.gameStarts === 1, `367x662: game:start fired ${metrics.openingProbe.gameStarts} times`);
  assert(metrics.openingProbe.statusDuring === "paused", `367x662: countdown status is ${metrics.openingProbe.statusDuring}`);
  assert(Math.abs(metrics.openingProbe.timeAfterDelay - metrics.openingProbe.timeAtPause) < 0.01, "367x662: question timer changed during countdown");
  assert(metrics.startOverlayHidden, "367x662: opening countdown did not clear before gameplay");
  assert(metrics.headerTitle.visibility === "visible" && metrics.headerTitle.display !== "none", "367x662: training title remains hidden");
  assert(metrics.headerTitle.width >= 70 && metrics.headerTitle.text.length > 0, "367x662: training title has no usable width/text");
  assert(metrics.stage?.height >= 180, `367x662: scene collapsed to ${metrics.stage?.height || 0}px`);
  assert(metrics.questionBubble && metrics.questionBubble.height >= 56 && metrics.questionBubble.height <= 140, "367x662: question card has an unusable height");
  assert(metrics.feverFont >= 8.5, `367x662: FEVER copy too small (${metrics.feverFont}px)`);
  assert(metrics.feedbackFont >= 9, `367x662: feedback too small (${metrics.feedbackFont}px)`);
  assert(metrics.display?.height >= 31, `367x662: answer display too short (${metrics.display?.height || 0}px)`);
  assert(metrics.minKeyHeight >= 40, `367x662: keypad touch target too short (${metrics.minKeyHeight}px)`);
  assert(metrics.clearLabel === "전체", "367x662: clear button behavior/source label changed unexpectedly");
  assert(/지우기/.test(metrics.clearAfter), `367x662: clear button visual label is not 지우기 (${metrics.clearAfter})`);
  assert(metrics.clearFont === 0, `367x662: legacy 전체 text is still visible (${metrics.clearFont}px)`);

  const stageWidth = metrics.stage.width;
  const ratio = box => box.width / stageWidth;
  assert(metrics.kongjwi && ratio(metrics.kongjwi) >= 0.29 && ratio(metrics.kongjwi) <= 0.35, `367x662: Kongjwi width ratio ${ratio(metrics.kongjwi).toFixed(3)}`);
  assert(metrics.jar && ratio(metrics.jar) >= 0.33 && ratio(metrics.jar) <= 0.40, `367x662: jar width ratio ${ratio(metrics.jar).toFixed(3)}`);
  assert(metrics.toad && ratio(metrics.toad) >= 0.11 && ratio(metrics.toad) <= 0.15, `367x662: toad viewport width ratio ${ratio(metrics.toad).toFixed(3)}`);
  assert(metrics.toad.right <= metrics.stage.right + 1 && metrics.toad.bottom <= metrics.stage.bottom + 1, "367x662: toad is cropped outside the stage");

  assert(metrics.toadBackgroundImage === "none", `367x662: toad viewport has a synthetic background (${metrics.toadBackgroundImage})`);
  assert(metrics.toadBackgroundColor === "rgba(0, 0, 0, 0)", `367x662: toad viewport is not transparent (${metrics.toadBackgroundColor})`);
  assert(/radial-gradient/.test(metrics.toadBeforeBackground), `367x662: feathered inner cavity missing (${metrics.toadBeforeBackground})`);
  assert(metrics.toadBeforeInset !== "0px", `367x662: cavity still fills the whole viewport (${metrics.toadBeforeInset})`);
  assert(metrics.toadAfterDisplay === "none", `367x662: artificial hard hole ring is still visible (${metrics.toadAfterDisplay})`);
  assert(metrics.toadImage && metrics.toadImage.width >= metrics.toad.width * 1.2, `367x662: toad PNG is not enlarged inside the smaller opening (${metrics.toadImage?.width || 0}px / ${metrics.toad.width}px)`);

  assert(failedResponses.length === 0, `367x662: local HTTP failures\n${failedResponses.join("\n")}`);
  assert(consoleErrors.length === 0, `367x662: console errors\n${consoleErrors.join("\n")}`);

  await page.screenshot({ path: "/tmp/quiz-interface-367x662.png", fullPage: false });
  console.log("367x662 atomic-number symbol prompt, countdown reveal, and quiz interface checks passed.");
  await context.close();

  const debugContext = await browser.newContext({ viewport });
  const debugPage = await debugContext.newPage();
  await debugPage.addInitScript(() => {
    sessionStorage.setItem("kongjuiya-training-selection", JSON.stringify({
      trainingId: "atomic_number",
      difficulty: "normal",
      resume: false
    }));
  });
  await debugPage.goto(`${baseUrl}${path}&debug=assets`, { waitUntil: "networkidle" });
  await debugPage.waitForSelector("#ui-assetInspectorButton", { state: "attached" });
  const debugMetrics = await debugPage.evaluate(() => ({
    buttons: document.querySelectorAll("#ui-assetInspectorButton").length,
    resources: performance.getEntriesByType("resource").filter(entry => /asset-debug-viewer\.js(?:\?|$)/.test(entry.name)).length
  }));
  assert(debugMetrics.buttons === 1, `debug mode: inspector button count is ${debugMetrics.buttons}`);
  assert(debugMetrics.resources === 1, `debug mode: inspector module loaded ${debugMetrics.resources} times`);
  await debugContext.close();
} finally {
  await browser.close();
}
