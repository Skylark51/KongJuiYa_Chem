const { test, expect } = require("playwright/test");

test.use({ channel: "chrome" });

const viewports = [
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 375, height: 812 },
  { width: 412, height: 915 }
];
const target = "http://127.0.0.1:4173/" + encodeURI("콩쥐야_줘때써.html") + "?subject=chemistry&training=atomic_number";

async function geometry(page) {
  await page.waitForSelector("#layeredScene[data-scale-mode='uniform-contain']");
  return page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const value = node.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        top: value.top,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
        centerX: value.left + value.width / 2,
        centerY: value.top + value.height / 2
      };
    };
    const stack = document.querySelector("#layeredScene");
    return {
      zone: rect(".scene-animation-zone"),
      frame: rect("#layeredScene"),
      background: rect("#layeredScene > .scene-background"),
      kongjwi: rect("#layeredScene > .scene-kongjwi"),
      jar: rect("#layeredScene > .scene-jar-back"),
      toad: rect("#layeredScene > .scene-toad-skin:not([hidden]), #layeredScene > .scene-toad-expression:not([hidden])"),
      transform: getComputedStyle(stack).transform,
      scaleMode: stack.dataset.scaleMode,
      logicalAspect: stack.dataset.logicalAspect
    };
  });
}

function verifyFrame(result) {
  expect(Math.abs(result.zone.centerX - result.frame.centerX)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.zone.centerY - result.frame.centerY)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.frame.width / result.frame.height - 16 / 9)).toBeLessThan(0.002);
  expect(result.frame.width).toBeLessThanOrEqual(result.zone.width + 0.5);
  expect(result.frame.height).toBeLessThanOrEqual(result.zone.height + 0.5);
  expect(Math.abs(result.background.left - result.frame.left)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(result.background.right - result.frame.right)).toBeLessThanOrEqual(0.5);
  expect(result.kongjwi.left).toBeGreaterThanOrEqual(result.frame.left - 0.5);
  expect(result.kongjwi.right).toBeLessThanOrEqual(result.frame.right + 0.5);
  expect(result.jar.left).toBeGreaterThanOrEqual(result.frame.left - 0.5);
  expect(result.jar.right).toBeLessThanOrEqual(result.frame.right + 0.5);
  expect(result.toad.left).toBeGreaterThanOrEqual(result.jar.left - 0.5);
  expect(result.toad.right).toBeLessThanOrEqual(result.jar.right + 0.5);
  expect(result.scaleMode).toBe("uniform-contain");
  expect(result.logicalAspect).toBe("2048:1152");
}

test("mobile fixed scene frame remains centered across viewports, rotation, and re-entry", async ({ page }) => {
  const reports = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(target, { waitUntil: "networkidle" });
    const result = await geometry(page);
    verifyFrame(result);
    reports.push({ viewport, ...result });
    await page.screenshot({
      path: "qa/mobile-fixed-scene-frame/" + viewport.width + "x" + viewport.height + ".png",
      fullPage: false
    });
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);
  await page.setViewportSize(viewports[0]);
  await page.waitForTimeout(150);
  const rotated = await geometry(page);
  verifyFrame(rotated);

  await page.reload({ waitUntil: "networkidle" });
  const reentered = await geometry(page);
  verifyFrame(reentered);

  console.log("SCENE_FRAME_REPORT " + JSON.stringify({ reports, rotated, reentered }));
});
