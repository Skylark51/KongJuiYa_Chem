#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const cases = [
  ["mobile", { width: 390, height: 844 }, true],
  ["desktop", { width: 1366, height: 768 }, false]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForView(page, view) {
  await page.waitForFunction(expected => {
    const active = document.querySelector(`[data-app-view="${expected}"]`);
    return document.documentElement.dataset.lobbyView === expected && active && !active.hidden;
  }, view);
}

async function exerciseLobby(browser, name, viewport, mobile) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];
  const obsoleteRequests = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => consoleErrors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("request", request => {
    if (/scene-photo\/jar-photo-|data:image\/jpeg;base64/.test(request.url())) obsoleteRequests.push(request.url());
  });

  try {
    await page.goto(`${baseUrl}/subjects/chemistry/?view=home`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.lobbyRouterReady === "true");
    await page.waitForFunction(() => document.querySelectorAll("#trainingGrid .training-card").length > 0);
    await waitForView(page, "home");

    const initial = await page.evaluate(() => {
      const hero = document.getElementById("lobbyTop")?.getBoundingClientRect();
      return {
        mainLabel: document.getElementById("mainCta")?.textContent?.trim(),
        cardCount: document.querySelectorAll("#trainingGrid .training-card").length,
        heroHeight: hero?.height || 0,
        homeCurrent: document.querySelector('.mobile-bottom-nav [data-view-target="home"]')?.getAttribute("aria-current"),
        legacyPhoto: Boolean(document.querySelector(".jar-selection-scene"))
      };
    });

    assert(initial.mainLabel && initial.mainLabel !== "장독대 바로 채우기", `${name}: lobby actions did not initialize`);
    assert(initial.cardCount > 0, `${name}: jar cards were not rendered`);
    assert(!initial.legacyPhoto, `${name}: legacy selection photograph was injected`);
    if (mobile) assert(initial.heroHeight > 0 && initial.heroHeight <= 460, `${name}: hero height is ${initial.heroHeight}px`);

    await page.click("#alternativeCta");
    await waitForView(page, "jars");
    assert(await page.locator("#trainingGrid .training-card").count() > 0, `${name}: jar view is empty after CTA navigation`);

    const expectedCategories = ["전체", "원자 구조", "화학 결합", "화학량론", "화학 반응", "주기적 성질", "산화환원", "산염기"];
    const categoryLabels = mobile
      ? await page.locator("#categorySelect option").allTextContents()
      : await page.locator("#categoryFilter button").allTextContents();
    assert(JSON.stringify(categoryLabels) === JSON.stringify(expectedCategories), `${name}: category order changed`);

    const selectedCategory = "화학 결합";
    if (mobile) await page.selectOption("#categorySelect", selectedCategory);
    else await page.getByRole("button", { name: selectedCategory, exact: true }).click();
    await page.waitForFunction(expected => {
      const cards = [...document.querySelectorAll("#trainingGrid .training-card .card-category")];
      return localStorage.getItem("kongjuiya-training-category") === expected &&
        cards.length > 0 && cards.every(card => card.textContent.trim() === expected);
    }, selectedCategory);

    await page.click(mobile
      ? '.mobile-bottom-nav [data-view-target="home"]'
      : '.desktop-tabs [data-view-target="home"]');
    await waitForView(page, "home");
    await page.click(mobile
      ? '.mobile-bottom-nav [data-view-target="jars"]'
      : '.desktop-tabs [data-view-target="jars"]');
    await waitForView(page, "jars");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.lobbyRouterReady === "true");
    await waitForView(page, "jars");
    assert(await page.evaluate(expected =>
      localStorage.getItem("kongjuiya-training-category") === expected &&
      [...document.querySelectorAll("#trainingGrid .training-card .card-category")]
        .every(card => card.textContent.trim() === expected), selectedCategory),
    `${name}: category selection was not restored after leaving and reloading the lobby`);

    const homeControl = mobile
      ? '.mobile-bottom-nav [data-view-target="home"]'
      : '.desktop-tabs [data-view-target="home"]';
    const jarControl = mobile
      ? '.mobile-bottom-nav [data-view-target="jars"]'
      : '.desktop-tabs [data-view-target="jars"]';

    await page.click(homeControl);
    await waitForView(page, "home");
    await page.click(jarControl);
    await waitForView(page, "jars");

    const activeJarControl = await page.locator(jarControl).getAttribute("aria-current");
    assert(activeJarControl === "page", `${name}: jar navigation active state was not synchronized`);

    await page.click(homeControl);
    await waitForView(page, "home");

    assert(failedResponses.length === 0, `${name}: lobby HTTP failures\n${failedResponses.join("\n")}`);
    assert(consoleErrors.length === 0, `${name}: lobby console errors\n${consoleErrors.join("\n")}`);
    assert(obsoleteRequests.length === 0, `${name}: obsolete lobby photo requests\n${obsoleteRequests.join("\n")}`);

    await page.click("#mainCta");
    await page.waitForSelector("#jarDifficultyDialog[open]");
    assert(await page.locator("#jarDifficultyDialog [data-session-difficulty]").count() === 3, `${name}: session difficulty choices missing`);
    assert(await page.locator("#jarDifficultyDialog").textContent().then(text => text.includes("쉬운 문제만") && text.includes("쉬움 50% + 보통 50%") && text.includes("쉬움 20% + 보통 30% + 어려움 50%")), `${name}: session difficulty descriptions missing`);
    await page.locator("#jarDifficultyDialog [value=cancel]").last().click();
    await waitForView(page, "jars");
    await page.click(homeControl);
    await waitForView(page, "home");
    await page.click("#mainCta");
    await page.waitForSelector("#jarDifficultyDialog[open]");
    await Promise.all([
      page.waitForURL(url => decodeURIComponent(url.pathname).endsWith("/콩쥐야_줘때써.html") && url.searchParams.has("training")),
      page.locator("#jarDifficultyDialog [data-session-difficulty=normal]").click()
    ]);
    await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running", null, { timeout: 15000 });

    const launch = await page.evaluate(() => {
      const api = globalThis.KongJuiYaGame;
      const url = new URL(location.href);
      return {
        training: url.searchParams.get("training"),
        selectedTraining: api?.game?.state?.trainingId || null,
        selectedDifficulty: api?.game?.state?.difficulty || null,
        selectionConsumed: sessionStorage.getItem("kongjuiya-training-selection") === null
      };
    });

    assert(launch.training, `${name}: quick start did not include a training id`);
    assert(launch.selectedTraining === launch.training, `${name}: selected training and URL training differ`);
    assert(["easy", "normal", "hard"].includes(launch.selectedDifficulty), `${name}: invalid session difficulty`);
    assert(launch.selectionConsumed, `${name}: selected difficulty was retained as a reusable default`);

    if (name === "desktop") {
      const persistedBefore = await page.evaluate(() => {
        const api = globalThis.KongJuiYaGame;
        api.submit(api.game.question.answers[0]);
        return {
          beans: api.storage.data.economy.beans,
          correct: api.storage.getTrainingStats(api.game.state.trainingId).correct
        };
      });
      await page.goBack({ waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.lobbyRouterReady === "true");
      await Promise.all([
        page.waitForURL(url => decodeURIComponent(url.pathname).endsWith("/콩쥐야_줘때써.html") && url.searchParams.has("training")),
        page.click("#mainCta")
      ]);
      await page.waitForFunction(() => globalThis.KongJuiYaGame?.game?.state?.status === "running", null, { timeout: 15000 });
      const persistedAfter = await page.evaluate(() => {
        const api = globalThis.KongJuiYaGame;
        return {
          beans: api.storage.data.economy.beans,
          correct: api.storage.getTrainingStats(api.game.state.trainingId).correct
        };
      });
      assert(persistedAfter.beans === persistedBefore.beans, `${name}: bean balance changed after re-entry`);
      assert(persistedAfter.correct === persistedBefore.correct, `${name}: answer record changed after re-entry`);
    }
  } catch (error) {
    await page.screenshot({ path: `/tmp/lobby-${name}-failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport, mobile] of cases) await exerciseLobby(browser, name, viewport, mobile);
  console.log("Lobby navigation and quick-start browser smoke test passed.");
} finally {
  await browser.close();
}
