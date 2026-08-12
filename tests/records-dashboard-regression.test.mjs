import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

const [indexHtml, navigation, lobbyActions] = await Promise.all([
  read("subjects/chemistry/index.html"),
  read("assets/js/lobby-navigation.js"),
  read("assets/js/lobby-actions.js")
]);

for (const id of [
  "recordsView",
  "dashboardSection",
  "dashboardTrendRegion",
  "dashboardModeBars",
  "recordsSection",
  "recordGrid"
]) {
  assert.match(indexHtml, new RegExp(`id=["']${id}["']`));
}

assert.doesNotMatch(indexHtml, /KONGJWI PART PREVIEW|data-kongjwi-dashboard|kongjwi-dashboard\.js/);
assert.doesNotMatch(navigation, /records-interface|installRecordsInterface/);
assert.match(lobbyActions, /const metrics = renderDashboard\(storage\);/);
assert.match(lobbyActions, /renderDetailedRecords\(metrics\);/);

console.log("records-dashboard-regression: canonical dashboard restored");
