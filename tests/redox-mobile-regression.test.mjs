import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { redoxQuestions } from "../data/questions/redox.js";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("redox pool contains only complete underlined reaction equations and three choices", () => {
  assert.equal(redoxQuestions.length, 30);
  for (const question of redoxQuestions) {
    const promptArrows = question.prompt.match(/→/g) || [];
    const htmlArrows = question.promptHtml.match(/→/g) || [];
    assert.equal(promptArrows.length, 1, `${question.id}: 반응식 화살표는 정확히 하나여야 합니다.`);
    assert.equal(htmlArrows.length, 1, `${question.id}: 표시용 반응식 화살표는 정확히 하나여야 합니다.`);
    assert.doesNotMatch(question.prompt, /[\r\n]/, `${question.id}: 반응식에는 개행 문자가 없어야 합니다.`);
    assert.doesNotMatch(question.promptHtml, /<br\b[^>]*>|[\r\n]/i, `${question.id}: 표시용 반응식에는 명시적 개행이 없어야 합니다.`);

    const [reactants, products] = question.prompt.split("→");
    assert.ok(reactants.trim(), `${question.id}: 반응물이 비어 있습니다.`);
    assert.ok(products.trim(), `${question.id}: 생성물이 비어 있습니다.`);
    assert.equal(question.prompt.includes("?"), false);
    assert.match(question.promptHtml, /<u>[^<]+<\/u>/);
    assert.equal(question.promptHtml.replace(/<\/?u>/g, ""), question.prompt);
    assert.equal(question.type, "multiple_choice");
    assert.deepEqual(question.choices.map(choice => choice.label), ["산화", "환원", "둘 다 아님"]);
    assert.deepEqual(question.keyboardShortcuts, ["1", "2", "3"]);
  }
});

test("game entry keeps one cache boundary and canonical redox module identities", () => {
  const html = read("콩쥐야_줘때써.html");
  const uiEffects = read("assets/js/ui-effects.js");
  const main = read("assets/js/main.js");
  const questions = read("data/questions.js");
  const questionIndex = read("data/questions/index.js");
  assert.match(html, /game-page\.js\?v=/);
  for (const source of [uiEffects, main]) assert.doesNotMatch(source, /\.js\?v=/);
  assert.match(questions, /questions\/index\.js/);
  assert.match(questionIndex, /\.\/redox\.js/);
  assert.doesNotMatch(questionIndex, /\.\/redox\.js\?v=/);
  assert.match(html, /redox-quiz\.css\?v=20260807-redox-one-line1/);
});

test("redox mobile layout keeps every reaction equation on one line above three buttons", () => {
  const css = read("assets/css/redox-quiz.css");
  const fitter = read("assets/js/redox-single-line.js");
  const gamePage = read("assets/js/game-page.js");
  const cosmeticsEntry = read("assets/js/game-cosmetics-entry.js");

  assert.match(css, /data-training-id="redox"/);
  assert.match(css, /grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /grid-template-rows:\s*38px minmax\(0, 1fr\) auto/);
  assert.match(css, /\.feedback\s*\{\s*display:\s*none;/s);
  assert.match(css, /#ui-gameApp\[data-training-id="redox"\] #questionText\s*\{[^}]*display:\s*block\s*!important/s);
  assert.match(css, /#ui-gameApp\[data-training-id="redox"\] #questionText\s*\{[^}]*align-content:\s*center/s);
  assert.match(css, /white-space:\s*nowrap\s*!important/);
  assert.match(css, /word-break:\s*keep-all\s*!important/);
  assert.match(css, /--redox-fit-font-size/);
  assert.doesNotMatch(css, /#questionText[^}]*white-space:\s*normal/s);

  assert.match(fitter, /scrollWidth\s*<=\s*element\.clientWidth/);
  assert.match(fitter, /ResizeObserver/);
  assert.match(fitter, /MutationObserver/);
  assert.match(fitter, /for \(let index = 0; index < 14;/);
  assert.match(gamePage, /import "\.\/redox-single-line\.js";/);
  assert.doesNotMatch(gamePage, /redox-single-line\.js\?v=/);
  assert.doesNotMatch(cosmeticsEntry, /redox-single-line\.js/);
});
