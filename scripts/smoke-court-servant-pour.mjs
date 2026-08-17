#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.COURT_POUR_BASE_URL || "http://127.0.0.1:4173";
const gamePath = "/%EC%BD%A9%EC%A5%90%EC%95%BC_%EC%A4%98%EB%95%8C%EC%8D%A8.html?training=atomic_number";
const viewports = [[390, 844], [844, 390], [1366, 768], [1920, 1080]];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cosmetics = {
  version: 1,
  owned: ["tool_wood_bucket", "outfit_underlayer", "outfit_classic_red", "outfit_royal_night", "toad_field_brown", "jar_onggi"],
  equipped: { tool: "tool_wood_bucket", outfit: "outfit_royal_night", toad: "toad_field_brown", jar: "jar_onggi" }
};

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(value => localStorage.setItem("kongjuiya-cosmetics-v1", JSON.stringify(value)), cosmetics);
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && !/^Failed to load resource:/i.test(message.text())) errors.push(message.text());
    });
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.origin === new URL(baseUrl).origin && response.status() >= 400) failures.push(`${response.status()} ${url.pathname}`);
    });

    await page.goto(baseUrl + gamePath, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running" && document.getElementById("layeredScene")?.dataset.kongjwiOutfit === "night-court", null, { timeout: 15000 });
    const answeredQuestionId = await page.evaluate(() => globalThis.KongJuiYaGame.game.question.id);
    const submittedAt = Date.now();
    await page.evaluate(() => globalThis.KongJuiYaGame.submit(globalThis.KongJuiYaGame.game.question.answers[0]));
    await page.waitForSelector(".scene-court-servants.is-active[data-asset-mode='authored-dolsoe']", { timeout: 10000 });
    await page.waitForFunction(questionId => {
      const game = globalThis.KongJuiYaGame?.game;
      return game?.state?.feedbackPending === false && game?.question?.id !== questionId;
    }, answeredQuestionId, { timeout: 700 });
    const advanceElapsedMs = Date.now() - submittedAt;
    await page.waitForTimeout(300);

    const qa = await page.evaluate(() => {
      const stage = document.getElementById("visualStage").getBoundingClientRect();
      const layer = document.querySelector(".scene-court-servants.is-active");
      const servant = layer?.querySelector(".court-servant-authored");
      const droplets = layer?.querySelector(".court-servant-water-droplets");
      const stream = document.querySelector("#layeredScene .scene-water-stream");
      const sprite = stream?.querySelector(".scene-sprite");
      const servantBox = servant?.getBoundingClientRect();
      const streamBox = stream?.getBoundingClientRect();
      return {
        assetMode: layer?.dataset.assetMode,
        servantImage: getComputedStyle(servant).backgroundImage,
        servantAnimation: getComputedStyle(servant).animationName,
        dropletsImage: getComputedStyle(droplets).backgroundImage,
        dropletsOpacity: Number(getComputedStyle(droplets).opacity),
        streamImage: getComputedStyle(sprite).backgroundImage,
        streamOpacity: Number(getComputedStyle(stream).opacity),
        waterFlow: document.getElementById("layeredScene")?.dataset.waterFlow,
        sceneState: document.getElementById("ui-gameApp")?.dataset.sceneState,
        currentQuestionId: globalThis.KongJuiYaGame?.game?.question?.id,
        feedbackPending: globalThis.KongJuiYaGame?.game?.state?.feedbackPending,
        servantContained: Boolean(servantBox && servantBox.left >= stage.left - 1 && servantBox.right <= stage.right + 1 && servantBox.top >= stage.top - 1 && servantBox.bottom <= stage.bottom + 1),
        streamContained: Boolean(streamBox && streamBox.left >= stage.left - 1 && streamBox.right <= stage.right + 1 && streamBox.top >= stage.top - 1 && streamBox.bottom <= stage.bottom + 1)
      };
    });

    assert(qa.assetMode === "authored-dolsoe", `${width}x${height}: authored Dolsoe not mounted`);
    assert(qa.servantImage.includes("dolsoe-c-sheet.png"), `${width}x${height}: wrong servant ${qa.servantImage}`);
    assert(qa.servantAnimation.includes("court-servant-authored-frames"), `${width}x${height}: Dolsoe frames not animating`);
    assert(qa.dropletsImage.includes("water-droplets-sheet.png"), `${width}x${height}: precision water missing`);
    assert(qa.dropletsOpacity > 0, `${width}x${height}: precision water invisible`);
    assert(qa.streamImage.includes("물줄기-동작.png"), `${width}x${height}: continuous water stream missing`);
    assert(qa.streamOpacity > 0.9 && qa.waterFlow === "pour", `${width}x${height}: stream is not visibly pouring`);
    assert(advanceElapsedMs < 700, `${width}x${height}: next question cadence was too slow (${advanceElapsedMs}ms)`);
    assert(qa.currentQuestionId !== answeredQuestionId && qa.feedbackPending === false, `${width}x${height}: next question did not advance`);
    assert(qa.sceneState === "correct", `${width}x${height}: visual effect ended when the question advanced`);
    assert(qa.servantContained && qa.streamContained, `${width}x${height}: actor or stream escaped the stage`);
    assert(errors.length === 0, `${width}x${height}: console errors\n${errors.join("\n")}`);
    assert(failures.length === 0, `${width}x${height}: HTTP failures\n${failures.join("\n")}`);

    if (width === 1366) {
      await mkdir("qa", { recursive: true });
      await page.screenshot({ path: "qa/court-servant-pour-1366x768.png", fullPage: true });
    }
    await context.close();
  }
  console.log("court servant pour smoke: fast next-question cadence kept the full Dolsoe and water effect in 4 viewports");
} finally {
  await browser.close();
}
