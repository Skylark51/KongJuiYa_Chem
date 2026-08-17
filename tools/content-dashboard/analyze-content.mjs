#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { analyzeContent, questionsToCsv, SUBJECT_LABELS } from "./content-analyzer.js";

const execFileAsync = promisify(execFile);
const VISUAL_ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".json", ".webm", ".mp4"
]);

export const DASHBOARD_ROOT = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = resolve(DASHBOARD_ROOT, "../..");
export const GENERATED_ROOT = resolve(DASHBOARD_ROOT, "generated");

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

export async function collectVisualAssets(repositoryRoot = REPOSITORY_ROOT) {
  const assetRoot = resolve(repositoryRoot, "assets");
  const files = await walk(assetRoot);
  return files
    .filter(file => VISUAL_ASSET_EXTENSIONS.has(extname(file).toLowerCase()))
    .map(file => relative(repositoryRoot, file).replaceAll("\\", "/"))
    .sort((a, b) => a.localeCompare(b, "ko"));
}

async function sourceRevision(repositoryRoot) {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

export async function loadSubjectContents(repositoryRoot = REPOSITORY_ROOT) {
  try {
    const sourceUrl = pathToFileURL(resolve(repositoryRoot, "data/subject-game-content.js")).href;
    const module = await import(`${sourceUrl}?dashboard=${Date.now()}`);
    return { subjectContents: module.SUBJECT_GAME_CONTENT, parseIssues: [] };
  } catch (error) {
    return {
      subjectContents: Object.fromEntries(Object.keys(SUBJECT_LABELS).map(subjectId => [
        subjectId,
        { subjectId, trainingModes: [], questions: [] }
      ])),
      parseIssues: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export async function createRepositoryReport({
  repositoryRoot = REPOSITORY_ROOT,
  generatedAt = new Date().toISOString()
} = {}) {
  const [{ subjectContents, parseIssues }, assetFiles, revision] = await Promise.all([
    loadSubjectContents(repositoryRoot),
    collectVisualAssets(repositoryRoot),
    sourceRevision(repositoryRoot)
  ]);
  return analyzeContent({
    subjectContents,
    assetFiles,
    generatedAt,
    sourceRevision: revision,
    parseIssues
  });
}

export async function writeRepositoryReport({
  repositoryRoot = REPOSITORY_ROOT,
  generatedRoot = GENERATED_ROOT,
  generatedAt
} = {}) {
  const report = await createRepositoryReport({ repositoryRoot, generatedAt });
  await mkdir(generatedRoot, { recursive: true });
  const jsonPath = resolve(generatedRoot, "content-report.json");
  const csvPath = resolve(generatedRoot, "content-inventory.csv");
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(csvPath, `\uFEFF${questionsToCsv(report.questions)}\n`, "utf8")
  ]);
  return { report, jsonPath, csvPath };
}

export async function main() {
  const { report, jsonPath, csvPath } = await writeRepositoryReport();
  console.log(`Content report: ${jsonPath}`);
  console.log(`CSV inventory: ${csvPath}`);
  console.log(
    `Questions ${report.summary.totalQuestions} | Errors ${report.summary.errorCount} | Warnings ${report.summary.warningCount}`
  );
  for (const subject of report.subjects) {
    console.log(`${subject.label}: ${subject.questionCount}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
