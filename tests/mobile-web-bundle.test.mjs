import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("mobile bundle includes the shared quiz entry and runtime", async () => {
  const source = await readFile(path.join(root, "mobile/build-web.mjs"), "utf8");
  assert.match(source, /"콩쥐야_줘때써\.html"/);
  assert.match(source, /assets\\\/js\\\/game-page\\\.js/);

  // The builder owns a fixed www directory. Its post-build assertions protect
  // Capacitor from accepting a shell that can open the lobby but not a quiz.
  assert.match(source, /readFile\(path\.join\(outDir, "콩쥐야_줘때써\.html"\)/);
});
