import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("renderer owns one centered idempotent 16:9 scene frame", () => {
  const renderer = read("assets/js/scene-renderer.js");

  assert.match(renderer, /Math\.min\(hostWidth \/ logical\.width, hostHeight \/ logical\.height\)/);
  assert.match(renderer, /stack\.style\.setProperty\("width", `\$\{renderWidth\}px`, "important"\)/);
  assert.match(renderer, /stack\.style\.setProperty\("height", `\$\{renderHeight\}px`, "important"\)/);
  assert.match(renderer, /stack\.style\.setProperty\("left", "50%", "important"\)/);
  assert.match(renderer, /stack\.style\.setProperty\("top", "50%", "important"\)/);
  assert.match(renderer, /stack\.style\.setProperty\("transform", "translate\(-50%, -50%\)", "important"\)/);
  assert.doesNotMatch(renderer, /transform\s*\+=|translate3d\(25|translateX\(25/);
});

test("mobile cascade cannot stretch or horizontally shift the scene frame", () => {
  const animation = read("assets/css/game-asset-animation.css");
  const runtime = read("assets/css/layered-scene-runtime.css");
  const strict = read("assets/css/strict-mobile-quiz-layout.css");
  const dialogue = read("assets/css/dialogue-above-kongjwi.css");
  const combined = [animation, runtime, strict, dialogue].join("\n");

  assert.match(animation, /\.scene-layer-stack\s*\{[\s\S]*left:\s*50%;[\s\S]*top:\s*50%;[\s\S]*width:\s*var\(--scene-render-width/);
  assert.match(runtime, /\.scene-animation-zone > #layeredScene\s*\{[\s\S]*top:\s*50%\s*!important;[\s\S]*transform:\s*translate\(-50%, -50%\)/);
  assert.doesNotMatch(combined, /translate3d\(25|translateX\(25|translate3d\(0, 0, 0\)\s*!important/);
  assert.doesNotMatch(strict + dialogue, /scene-animation-zone[^\{]*\.scene-layer-stack\s*\{/);
  assert.doesNotMatch(strict + dialogue, /scene-animation-zone[^\{]*\.quiz-scene-actors\s*\{/);
  assert.equal(fs.existsSync(path.join(root, "assets/css/mobile-scene-final-align.css")), false);
});

test("dialogue remains an animation-zone overlay outside the artwork transform", () => {
  const dialogue = read("assets/css/dialogue-above-kongjwi.css");

  assert.match(dialogue, /scene-animation-zone \.toad-bubble/);
  assert.match(dialogue, /top:\s*8px\s*!important/);
  assert.doesNotMatch(dialogue, /scene-layer-stack|quiz-scene-actors/);
});
