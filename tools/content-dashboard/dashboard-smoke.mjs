import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.DASHBOARD_BASE_URL || "http://127.0.0.1:4176";
const screenshotDir = path.join(tmpdir(), "kongjuiya-content-dashboard");
await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 1024, height: 768 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    page.on("console", message => {
      if (message.type() === "error") failures.push(`${viewport.name} console: ${message.text()}`);
    });
    page.on("pageerror", error => failures.push(`${viewport.name} page: ${error.message}`));
    page.on("response", response => {
      if (response.status() >= 400) failures.push(`${viewport.name} HTTP ${response.status()}: ${response.url()}`);
    });

    await page.goto(`${baseUrl}/tools/content-dashboard/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.dashboardReady === "true");
    assert.equal(await page.locator("#kpiGrid .kpi-card").count(), 7);
    assert.match(await page.locator("#kpiGrid").innerText(), /785/);
    assert.ok(await page.locator("#questionRows tr[data-testid='question-row']").count() <= 50);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${viewport.name} horizontal overflow: ${overflow}`);

    if (viewport.name === "desktop") {
      await page.selectOption("#subjectFilter", "physics");
      assert.match(await page.locator("#questionRows").innerText(), /조건에 맞는 문제가 없습니다/);
      await page.selectOption("#subjectFilter", "chemistry");
      assert.ok(await page.locator("#questionRows tr[data-testid='question-row']").count() > 0);
      await page.fill("#searchFilter", "atomic_number");
      await page.locator("#questionRows tr[data-testid='question-row']").first().click();
      await page.locator("#questionDetail[open]").waitFor();
      assert.match(await page.locator("#detailId").innerText(), /atomic_number/);
      await page.locator("#questionDetail .icon-button").click();

      const [jsonDownload] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#exportJson").click()
      ]);
      assert.match(jsonDownload.suggestedFilename(), /\.json$/);
      const [csvDownload] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#exportCsv").click()
      ]);
      assert.match(csvDownload.suggestedFilename(), /\.csv$/);
    }

    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}.png`), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, []);
console.log(`Content dashboard smoke passed. Screenshots: ${screenshotDir}`);
