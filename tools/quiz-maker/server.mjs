import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateEditor, editorFromQuestion } from "./core.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, "../..");
const authoredPath = path.join(root, "data/questions/quiz-maker-authored.js");
const manifestPath = path.join(toolDir, "asset-manifest.json");
const port = Number(process.env.QUIZ_MAKER_PORT || 4177);
const SUBJECT_IDS = ["chemistry", "physics", "biology", "earth-science"];

export async function loadCatalog() {
  const stamp = `${Date.now()}-${Math.random()}`;
  const contentUrl = `${pathToFileURL(path.join(root, "data/subject-game-content.js")).href}?v=${stamp}`;
  const { SUBJECT_GAME_CONTENT } = await import(contentUrl);
  const authored = await readAuthoredState();
  return Object.fromEntries(SUBJECT_IDS.map(subjectId => {
    const content = SUBJECT_GAME_CONTENT[subjectId];
    const authoredBucket = authored[subjectId] || { trainingModes: [], questions: [], overrides: {} };
    const modeMap = new Map(content.trainingModes.map(mode => [mode.id, { ...mode }]));
    authoredBucket.trainingModes.forEach(mode => modeMap.set(mode.id, { ...mode }));
    const questionMap = new Map(content.questions.map(question => [question.id, { ...question }]));
    Object.entries(authoredBucket.overrides || {}).forEach(([id, question]) => questionMap.set(id, { ...question }));
    authoredBucket.questions.forEach(question => questionMap.set(question.id, { ...question }));
    return [subjectId, { modes: [...modeMap.values()], questions: [...questionMap.values()], validationErrors: content.validateQuestions() }];
  }));
}

export async function loadAssets() {
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

export async function readAuthoredState() {
  const source = await fs.readFile(authoredPath, "utf8");
  const match = source.match(/const DATA = ([\s\S]*?);\r?\n\r?\nfunction deepFreeze/);
  if (!match) throw new Error("authored data marker를 찾을 수 없습니다.");
  return JSON.parse(match[1]);
}

export function serializeAuthoredState(state) {
  return `const DATA = ${JSON.stringify(state, null, 2)};\n\nfunction deepFreeze(value) {\n  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;\n  Object.values(value).forEach(deepFreeze);\n  return Object.freeze(value);\n}\n\nexport const QUIZ_MAKER_AUTHORED_CONTENT = deepFreeze(DATA);\n`;
}

export async function writeAuthoredState(state, target = authoredPath) {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  const source = serializeAuthoredState(state);
  await fs.writeFile(temporary, source, "utf8");
  const check = source.match(/const DATA = ([\s\S]*?);\n\nfunction deepFreeze/);
  if (!check) throw new Error("임시 authored module validation 실패");
  JSON.parse(check[1]);
  await fs.rename(temporary, target);
}

export async function saveQuestion(payload, { target = authoredPath } = {}) {
  const { subjectId, question, operation, trainingMode } = payload || {};
  if (!SUBJECT_IDS.includes(subjectId)) throw new Error("올바른 과목이 아닙니다.");
  const catalog = await loadCatalog();
  const assets = await loadAssets();
  const mode = catalog[subjectId].modes.find(item => item.id === question?.trainingId) || trainingMode;
  if (!mode || mode.id !== question?.trainingId) throw new Error("문제 분류가 존재하지 않습니다.");
  const editor = editorFromQuestion(question, subjectId, mode.category);
  const errors = validateEditor(editor, {
    mode: operation,
    ids: catalog[subjectId].questions.map(item => item.id),
    assets: assets.map(item => item.path)
  });
  if (errors.length) throw new Error(errors.join("\n"));

  const state = await readAuthoredState();
  const bucket = state[subjectId];
  const existingIndex = bucket.questions.findIndex(item => item.id === question.id);
  const existsInProduction = catalog[subjectId].questions.some(item => item.id === question.id);
  if (operation === "create" && existsInProduction) throw new Error(`${question.id} ID가 이미 존재합니다.`);
  if (operation === "update" && !existsInProduction) throw new Error(`${question.id} 수정 대상을 찾을 수 없습니다.`);

  if (trainingMode && !catalog[subjectId].modes.some(item => item.id === trainingMode.id)
      && !bucket.trainingModes.some(item => item.id === trainingMode.id)) bucket.trainingModes.push(trainingMode);
  if (operation === "update") {
    if (existingIndex >= 0) bucket.questions[existingIndex] = question;
    else bucket.overrides[question.id] = question;
  } else bucket.questions.push(question);
  await writeAuthoredState(state, target);
  return { operation, id: question.id, target: path.relative(root, target).split(path.sep).join("/") };
}

async function jsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

const mime = new Map([[".html", "text/html"], [".js", "text/javascript"], [".mjs", "text/javascript"], [".css", "text/css"], [".json", "application/json"], [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".svg", "image/svg+xml"]]);

export function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname === "/api/health") return json(response, 200, { ok: true });
      if (url.pathname === "/api/catalog") return json(response, 200, { subjects: await loadCatalog(), assets: await loadAssets(), target: "data/questions/quiz-maker-authored.js" });
      if (url.pathname === "/api/save" && request.method === "POST") return json(response, 200, { ok: true, result: await saveQuestion(await jsonBody(request)) });
      const requestPath = url.pathname === "/" ? "/tools/quiz-maker/index.html" : url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
      const absolute = path.resolve(root, `.${decodeURIComponent(requestPath)}`);
      if (!(absolute === root || absolute.startsWith(root + path.sep))) return json(response, 403, { error: "Forbidden" });
      const data = await fs.readFile(absolute);
      response.writeHead(200, { "Content-Type": `${mime.get(path.extname(absolute).toLowerCase()) || "application/octet-stream"}; charset=utf-8` });
      response.end(data);
    } catch (error) {
      if (error.code === "ENOENT") return json(response, 404, { error: "Not found" });
      json(response, 400, { error: error.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(port, "127.0.0.1", () => console.log(`Quiz Maker: http://127.0.0.1:${port}/tools/quiz-maker/`));
}
