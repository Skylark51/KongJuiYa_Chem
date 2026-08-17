import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const npx = isWindows ? "npx.cmd" : "npx";

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 22) {
  throw new Error(`Node.js 22+ is required. Current: ${process.versions.node}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npm, ["run", "mobile:prepare"]);

const platforms = ["android"];
if (process.platform === "darwin") {
  platforms.push("ios");
} else {
  console.log("iOS native project creation is skipped on this OS. Run this command on macOS with Xcode 26+ to add/sync iOS.");
}

for (const platform of platforms) {
  if (!existsSync(path.join(root, platform))) {
    run(npx, ["cap", "add", platform]);
  }
  run(npx, ["cap", "sync", platform]);
}

console.log(`Native bootstrap complete: ${platforms.join(", ")}.`);
