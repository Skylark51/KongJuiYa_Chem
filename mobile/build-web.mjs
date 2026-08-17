import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(root, "www");

const requiredFiles = ["index.html", "shop.html", "record-detail.html", "privacy.html"];
const requiredDirs = ["assets", "data", "subjects"];
const optionalEntries = [
  "favicon.ico",
  "favicon.png",
  "manifest.json",
  "manifest.webmanifest",
  "robots.txt",
  "service-worker.js",
  "sw.js"
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const relative of requiredFiles) {
  const source = path.join(root, relative);
  if (!(await exists(source))) {
    throw new Error(`Required mobile web file is missing: ${relative}`);
  }
  await cp(source, path.join(outDir, relative));
}

for (const relative of requiredDirs) {
  const source = path.join(root, relative);
  if (!(await exists(source))) {
    throw new Error(`Required mobile web directory is missing: ${relative}`);
  }
  await cp(source, path.join(outDir, relative), { recursive: true });
}

for (const relative of optionalEntries) {
  const source = path.join(root, relative);
  if (await exists(source)) {
    await cp(source, path.join(outDir, relative), { recursive: true });
  }
}

const index = await readFile(path.join(outDir, "index.html"), "utf8");
if (!/<head[\s>]/i.test(index)) {
  throw new Error("www/index.html must contain a <head> element for Capacitor.");
}

console.log("Mobile web bundle prepared in www/.");
console.log("Included: root app pages, privacy policy, assets/, data/, subjects/.");
