#!/usr/bin/env node
import { chromium } from "playwright";
import { join } from "node:path";
import { tmpdir } from "node:os";

const baseUrl = process.env.LOBBY_BASE_URL || "http://127.0.0.1:4173";
const viewports = [
  ["mobile-portrait", { width: 390, height: 844 }],
  ["mobile-landscape", { width: 844, height: 390 }],
  ["desktop-1366", { width: 1366, height: 768 }],
  ["desktop-1920", { width: 1920, height: 1080 }]
];
const subjectRoutes = ["chemistry", "physics", "biology", "earth-science"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("console", message => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", error => errors.push(`page: ${error.message}`));
    page.on("response", response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    assert(await page.locator(".subject-card").count() === 4, `${name}: expected four subject cards`);
    assert(await page.locator(".subject-card[data-subject=chemistry]").getAttribute("href"), `${name}: chemistry route missing`);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - innerWidth,
      y: document.documentElement.scrollHeight - innerHeight
    }));
    assert(overflow.x <= 1, `${name}: horizontal overflow ${overflow.x}px`);
    if (name === "mobile-portrait" || name === "desktop-1366") {
      await page.screenshot({ path: join(tmpdir(), `multiscience-portal-${name}.png`), fullPage: true });
    }

    for (const subject of subjectRoutes) {
      await page.goto(`${baseUrl}/subjects/${subject}/`, { waitUntil: "networkidle" });
      if (subject === "chemistry") {
        await page.waitForFunction(() => document.documentElement.dataset.lobbyRouterReady === "true");
        assert(await page.locator("#trainingGrid .training-card").count() > 0, `${name}: chemistry jars missing`);
        assert(await page.locator('a[href="../../"]').count() > 0, `${name}: chemistry portal return missing`);
      } else {
        assert(await page.locator("#subjectShell h1").textContent(), `${name}: ${subject} shell missing`);
        assert(await page.locator(".portal-return").getAttribute("href"), `${name}: ${subject} portal return missing`);
      }
    }

    await page.goto(`${baseUrl}/?view=records`, { waitUntil: "networkidle" });
    assert(new URL(page.url()).pathname.endsWith("/subjects/chemistry/"), `${name}: legacy route did not reach chemistry`);
    assert(new URL(page.url()).searchParams.get("view") === "records", `${name}: legacy view was lost`);
    assert(errors.length === 0, `${name}: ${errors.join(" | ")}`);
    await context.close();
  }
  console.log("subject-portal smoke: 4 routes, legacy redirect, 4 viewport contracts passed");
} finally {
  await browser.close();
}
