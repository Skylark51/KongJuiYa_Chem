import "./redox-single-line.js";
import { bootstrapGameRuntime } from "./main.js";
import { initializeGamePage } from "./ui-effects.js?v=20260815-blue-scholar-gridfix1";
import { mountOpeningCountdown } from "./opening-countdown-flow.js";

mountOpeningCountdown();
const api = bootstrapGameRuntime();
initializeGamePage(api).catch(error => {
  console.error(error);
  const feedback = document.getElementById("feedback");
  if (feedback) feedback.textContent = "\uAC8C\uC784\uC744 \uC2DC\uC791\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694.";
});

if (new URLSearchParams(location.search).get("debug") === "assets") {
  import("./asset-debug-viewer.js").catch(error => console.error("Asset inspector failed to load.", error));
}
