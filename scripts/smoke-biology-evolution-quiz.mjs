#!/usr/bin/env node
import { runSharedQuizSmoke } from "./shared-science-quiz-smoke-lib.mjs";

await runSharedQuizSmoke({
  label: "biology-evolution",
  subjectId: "biology",
  trainingIds: ["biology-variation-natural-selection"],
  viewports: [
    ["mobile-390", { width: 390, height: 844 }],
    ["tablet-768", { width: 768, height: 1024 }],
    ["desktop-1366", { width: 1366, height: 768 }],
    ["desktop-1920", { width: 1920, height: 1080 }]
  ],
  screenshotDir: process.env.BIOLOGY_SCREENSHOT_DIR || ""
});
