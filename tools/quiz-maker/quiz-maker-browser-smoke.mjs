import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { createServer } from "./server.mjs";

const server = createServer();
await new Promise(resolve => server.listen(4177, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", message => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
page.on("pageerror", error => errors.push(`page: ${error.message}`));
page.on("response", response => { if (response.status() === 404) errors.push(`404: ${response.url()}`); });

try {
  await page.goto("http://127.0.0.1:4177/tools/quiz-maker/", { waitUntil: "networkidle" });
  await page.getByText("준비 완료", { exact: true }).waitFor();
  assert.equal(await page.locator(".maker-grid > .panel").count(), 3);
  const columns = await page.locator(".maker-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  assert.equal(columns, 3);
  assert.ok((await page.locator("#assetGrid button").count()) > 0);

  await page.locator("#subject").selectOption("earth-science");
  await page.locator("#category").selectOption("earth-fossil-type");
  await page.locator("#existingQuestion").selectOption("fossil-type-coral");
  assert.equal(await page.locator("#questionId").inputValue(), "fossil-type-coral");
  assert.match(await page.locator("#prompt").inputValue(), /화석/);
  assert.match(await page.locator("#jsonPreview").textContent(), /source-image/);
  const frame = page.frameLocator("#previewFrame");
  await frame.locator(".subject-question-image").waitFor();
  assert.equal(await frame.locator("#ui-choiceOptions button").count(), 2);
  assert.match(await frame.locator(".subject-question-image").getAttribute("src"), /%ED|산호/);

  await page.locator("#assetSearch").fill("산호");
  assert.ok((await page.locator("#assetGrid button").count()) >= 1);
  await page.screenshot({ path: path.join(os.tmpdir(), "quiz-maker-1440.png"), fullPage: true });

  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  assert.equal(await page.locator("#previewShell").evaluate(element => element.classList.contains("mobile")), true);
  await page.waitForFunction(() => document.querySelector("#previewShell").getBoundingClientRect().width <= 377.5);
  const mobileMetrics = await page.locator("#previewShell").evaluate(element => ({ width: element.getBoundingClientRect().width, cssWidth: getComputedStyle(element).width, className: element.className }));
  assert.ok(mobileMetrics.width <= 377.5);
  await page.screenshot({ path: path.join(os.tmpdir(), "quiz-maker-mobile-preview.png"), fullPage: false });

  await page.setViewportSize({ width: 800, height: 1000 });
  const stacked = await page.locator(".maker-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  assert.equal(stacked, 1);

  for (const route of ["/index.html", "/subjects/physics/index.html", "/subjects/chemistry/index.html", "/subjects/biology/index.html", "/subjects/earth-science/index.html", "/콩쥐야_줘때써.html?training=atomic_number"]) {
    await page.goto(`http://127.0.0.1:4177${route}`, { waitUntil: "domcontentloaded" });
    assert.ok(await page.title());
  }
  assert.deepEqual(errors, []);
  console.log("Quiz Maker browser smoke: PASS");
  console.log(path.join(os.tmpdir(), "quiz-maker-1440.png"));
  console.log(path.join(os.tmpdir(), "quiz-maker-mobile-preview.png"));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
