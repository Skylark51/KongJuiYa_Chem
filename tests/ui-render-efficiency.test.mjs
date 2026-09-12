import test from "node:test";
import assert from "node:assert/strict";
import { UIAdapter } from "../assets/js/ui-adapter.js";

test("HUD ticks keep question and answer DOM stable until the question changes", () => {
  const documentRef = { getElementById: () => null };
  const adapter = new UIAdapter(documentRef, { questionPresentation: { render: () => false } });
  const first = { id: "q-1", prompt: "first", type: "numeric" };
  const second = { id: "q-2", prompt: "second", type: "numeric" };
  let question = first;
  let questionRenders = 0;
  let inputRenders = 0;

  adapter.engine = {
    get training() { return { title: "test", category: "test" }; },
    get question() { return question; },
    leakPerSecond: () => 1,
    timeLimit: () => 25
  };
  adapter.question = () => { questionRenders += 1; };
  adapter.renderInput = () => { inputRenders += 1; };

  const state = {
    water: 70,
    combo: 0,
    score: 0,
    correctInStage: 0,
    correctAnswersPerStage: 10,
    questionTimeRemaining: 25,
    status: "running",
    feedbackPending: false
  };

  adapter.render(state);
  adapter.render({ ...state, questionTimeRemaining: 24.98 });
  assert.equal(questionRenders, 1);
  assert.equal(inputRenders, 1);

  question = second;
  adapter.render({ ...state, questionTimeRemaining: 25 });
  assert.equal(questionRenders, 2);
  assert.equal(inputRenders, 2);
});
