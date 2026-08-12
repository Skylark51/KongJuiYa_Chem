#!/usr/bin/env node
import { runSharedQuizSmoke } from "./shared-science-quiz-smoke-lib.mjs";

await runSharedQuizSmoke({
  label: "earth-science-fossils",
  subjectId: "earth-science",
  trainingIds: ["earth-fossil-type", "earth-index-fossil-era"],
  viewports: [
    ["mobile-375", { width: 375, height: 667 }],
    ["mobile-430", { width: 430, height: 932 }],
    ["desktop-1366", { width: 1366, height: 768 }]
  ],
  screenshotDir: process.env.EARTH_SCIENCE_SCREENSHOT_DIR || ""
});
