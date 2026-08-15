import "./redox-single-line.js";
import { bootstrapGameRuntime } from "./main.js";
import { initializeGamePage, renderGameRecovery } from "./ui-effects.js";
import { mountOpeningCountdown } from "./opening-countdown-flow.js";

mountOpeningCountdown();
const api = bootstrapGameRuntime();
initializeGamePage(api).catch(() => {
  renderGameRecovery();
});

if (new URLSearchParams(location.search).get("debug") === "assets") {
  import("./asset-debug-viewer.js").catch(error => console.error("Asset inspector failed to load.", error));
}
