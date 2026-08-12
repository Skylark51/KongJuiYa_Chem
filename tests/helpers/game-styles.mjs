import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

export const gameHtml = read("콩쥐야_줘때써.html");

const styleEntrypoints = Object.freeze([
  read("assets/css/game-runtime-base.css"),
  read("assets/css/game-runtime-features.css")
]);

export function assertGameStyleLoaded(assert, filename, version) {
  const declaration = `@import url("./${filename}?v=${version}")`;
  assert.ok(
    styleEntrypoints.some(source => source.includes(declaration)),
    `game stylesheet entrypoints must import ${filename}?v=${version}`
  );
}
