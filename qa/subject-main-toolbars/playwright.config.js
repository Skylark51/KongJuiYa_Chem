const os = require("os");
const path = require("path");

module.exports = {
  testDir: ".",
  testMatch: "verify.spec.js",
  timeout: 120000,
  outputDir: path.join(os.tmpdir(), "kongjuiya-subject-toolbar-qa"),
  use: { baseURL: process.env.SUBJECT_TOOLBAR_BASE_URL || "http://127.0.0.1:4173" }
};
