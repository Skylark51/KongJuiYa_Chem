const { test, expect } = require("playwright/test");

const SUBJECTS = [
  ["chemistry", "\ud654\ud559\ud3b8"],
  ["physics", "\ubb3c\ub9ac\ud559\ud3b8"],
  ["biology", "\uc0dd\uba85\uacfc\ud559\ud3b8"],
  ["earth-science", "\uc9c0\uad6c\uacfc\ud559\ud3b8"]
];
const VIEWPORTS = [
  [360, 800], [390, 844], [414, 896], [430, 932], [434, 956],
  [1366, 768], [1920, 1080]
];
const SELECTORS = {
  topbar: '[data-subject-toolbar="top"]',
  logo: '[data-subject-toolbar="top"] .brand-seal',
  title: '[data-subject-toolbar="top"] .subject-brand strong',
  portal: '[data-subject-toolbar="top"] .science-portal-link',
  wallet: '[data-subject-toolbar="top"] .bean-wallet',
  settings: '[data-subject-toolbar="top"] .settings-button',
  bottom: '[data-subject-toolbar="bottom"]',
  home: '[data-subject-toolbar="bottom"] [data-view-target="home"]',
  jars: '[data-subject-toolbar="bottom"] [data-view-target="jars"]',
  records: '[data-subject-toolbar="bottom"] [data-view-target="records"]',
  shop: '[data-subject-toolbar="bottom"] > a',
  bottomSettings: '[data-subject-toolbar="bottom"] #bottomSettingsButton'
};
const STYLE_KEYS = [
  "display", "position", "padding", "margin", "gap", "borderRadius",
  "fontSize", "fontWeight", "lineHeight", "zIndex", "alignItems", "justifyContent"
];

async function measure(page) {
  return page.evaluate(({ selectors, styleKeys }) => {
    const read = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        style: Object.fromEntries(styleKeys.map(key => [key, style[key]]))
      };
    };
    const signature = node => ({
      tag: node.tagName,
      classes: [...node.classList].sort(),
      children: [...node.children].map(signature)
    });
    return {
      elements: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, read(selector)])),
      topSignature: signature(document.querySelector('[data-subject-toolbar="top"]')),
      bottomSignature: signature(document.querySelector('[data-subject-toolbar="bottom"]')),
      bottomCount: document.querySelector('[data-subject-toolbar="bottom"]').children.length,
      title: document.querySelector('[data-subject-toolbar="top"] .subject-brand strong').textContent,
      master: document.documentElement.dataset.toolbarMaster,
      ready: document.documentElement.dataset.subjectToolbarReady,
      overflowX: document.documentElement.scrollWidth - innerWidth
    };
  }, { selectors: SELECTORS, styleKeys: STYLE_KEYS });
}

function compareGeometry(actual, expected, label) {
  expect(actual.topSignature, label + " top DOM").toEqual(expected.topSignature);
  expect(actual.bottomSignature, label + " bottom DOM").toEqual(expected.bottomSignature);
  expect(actual.bottomCount, label + " bottom item count").toBe(5);
  for (const key of Object.keys(SELECTORS)) {
    expect(Boolean(actual.elements[key]), label + " " + key + " exists").toBe(true);
    for (const dimension of ["x", "y", "width", "height"]) {
      expect(Math.abs(actual.elements[key].rect[dimension] - expected.elements[key].rect[dimension]), label + " " + key + " " + dimension).toBeLessThanOrEqual(0.05);
    }
    expect(actual.elements[key].style, label + " " + key + " computed style").toEqual(expected.elements[key].style);
  }
}

test("four subject main toolbars share exact geometry at seven viewports", async ({ browser, baseURL }) => {
  for (const [width, height] of VIEWPORTS) {
    const results = {};
    for (const [subject, title] of SUBJECTS) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const failures = [];
      page.on("pageerror", error => failures.push("pageerror " + error.message));
      page.on("console", message => { if (message.type() === "error") failures.push("console " + message.text()); });
      page.on("response", response => { if (response.status() >= 400 && response.url().startsWith(baseURL)) failures.push(response.status() + " " + response.url()); });
      await page.goto(baseURL + "/subjects/" + subject + "/", { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.subjectToolbarReady === "true");
      const result = results[subject] = await measure(page);
      expect(result.title).toBe("\ucf69\uc950\uc57c \uc918\ub54c\uc368 - " + title);
      expect(result.master).toBe("chemistry");
      expect(result.ready).toBe("true");
      expect(result.overflowX).toBeLessThanOrEqual(1);
      expect(failures, width + "x" + height + " " + subject + " errors").toEqual([]);
      await context.close();
    }
    for (const [subject] of SUBJECTS.slice(1)) compareGeometry(results[subject], results.chemistry, width + "x" + height + " " + subject);
  }
});

test("toolbar routes, history, settings, beans, and storage remain intact", async ({ page, baseURL }) => {
  for (const [subject] of SUBJECTS) {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 434, height: 956 });
    await page.goto(baseURL + "/subjects/" + subject + "/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.setItem("toolbar-qa-preserve", "kept");
      localStorage.setItem("kongjuiya-chem-save", JSON.stringify({ economy: { beans: 4321 }, cosmetics: { equipped: { jar: "qa" } } }));
    });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator('[data-subject-toolbar="top"] .bean-wallet strong')).toHaveText("4,321");
    await page.locator('[data-subject-toolbar="bottom"] [data-view-target="jars"]').click();
    await expect(page).toHaveURL(/view=jars/);
    await page.goBack();
    await expect(page).not.toHaveURL(/view=jars/);
    await page.goForward();
    await expect(page).toHaveURL(/view=jars/);
    await page.locator('[data-subject-toolbar="bottom"] [data-view-target="records"]').click();
    await expect(page.locator('[data-subject-toolbar="bottom"] [data-view-target="records"]')).toHaveAttribute("aria-current", "page");
    await page.locator('[data-subject-toolbar="bottom"] [data-view-target="home"]').click();
    await expect(page.locator('[data-subject-toolbar="bottom"] [data-view-target="home"]')).toHaveAttribute("aria-current", "page");
    await page.locator('[data-subject-toolbar="bottom"] > a').click();
    await expect(page).toHaveURL(new RegExp("/shop\\.html\\?subject=" + subject));
    await page.goBack();
    await page.waitForSelector('[data-subject-toolbar="top"]');
    await page.locator('[data-subject-toolbar="top"] .science-portal-link').click();
    await expect(page).toHaveURL(/127\.0\.0\.1:4173\/?$/);
    await page.goBack();
    await page.waitForSelector('[data-subject-toolbar="top"]');
    await expect(page.locator('[data-subject-toolbar="top"] .bean-wallet strong')).toHaveText("4,321");
    await page.locator('[data-subject-toolbar="bottom"] #bottomSettingsButton').click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    const storage = await page.evaluate(() => ({
      marker: localStorage.getItem("toolbar-qa-preserve"),
      save: JSON.parse(localStorage.getItem("kongjuiya-chem-save"))
    }));
    expect(storage.marker).toBe("kept");
    expect(storage.save.cosmetics.equipped.jar).toBe("qa");
    expect(errors, subject + " page errors").toEqual([]);
  }
});
