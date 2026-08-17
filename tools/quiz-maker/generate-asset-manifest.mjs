import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, "../..");
const assetsRoot = path.join(root, "assets");
const supported = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (supported.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

function subjectFor(relative) {
  const value = relative.toLowerCase();
  if (value.includes("physics") || value.includes("물리")) return "physics";
  if (value.includes("chemistry") || value.includes("화학")) return "chemistry";
  if (value.includes("biology") || value.includes("생명")) return "biology";
  if (value.includes("earth-science") || value.includes("지구과학")) return "earth-science";
  return "shared";
}

const files = (await walk(assetsRoot)).sort((a, b) => a.localeCompare(b, "ko"));
const manifest = files.map(absolute => {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  return {
    path: relative,
    name: path.basename(relative),
    folder: path.dirname(relative).split(path.sep).join("/"),
    subject: subjectFor(relative)
  };
});
await fs.writeFile(path.join(toolDir, "asset-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Quiz Maker asset manifest: ${manifest.length} files`);
