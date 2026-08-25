import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const choiceUi = fs.readFileSync("assets/js/metal-reactivity-choice-ui.js", "utf8");
const spriteCss = fs.readFileSync("assets/css/game-asset-animation.css", "utf8");
const runtimeCss = fs.readFileSync("assets/css/layered-scene-runtime.css", "utf8");
const main = fs.readFileSync("assets/js/main.js", "utf8");
const gamePage = fs.readFileSync("assets/js/game-page.js", "utf8");
const html = fs.readFileSync("콩쥐야_줘때써.html", "utf8");

test("Kongjwi horizontal sprite sheets always map one complete frame into the actor box", () => {
  assert.ok(!choiceUi.includes("background-size: calc(var(--scene-frame-count) * 100%) auto"));
  assert.ok(spriteCss.includes("background-size: calc(var(--scene-frame-count) * 100%) 100%"));
  assert.ok(runtimeCss.includes('#ui-gameApp .scene-kongjwi[data-sprite-mode="sheet"] > .scene-sprite'));
  assert.ok(runtimeCss.includes("background-size: calc(var(--scene-frame-count) * 100%) 100% !important"));
  assert.ok(runtimeCss.includes("background-position-y: center !important"));
  assert.ok(!gamePage.includes('createElement("style")'));
});

test("sprite repair keeps the HTML cache boundary and canonical internal module identities", () => {
  assert.ok(main.includes('from "./metal-reactivity-choice-ui.js";'));
  assert.ok(!main.includes("metal-reactivity-choice-ui.js?v="));
  assert.ok(gamePage.includes('from "./main.js";'));
  assert.ok(!gamePage.includes("main.js?v="));
  assert.match(html, /assets\/js\/game-page\.js\?v=[^"']+/);
});
