import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GAME_TITLE, JAR_THEMES, displayJarName, themeFor } from '../assets/js/theme-system.js';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('official title is present in lobby and game HTML', async () => {
  for (const file of ['subjects/chemistry/index.html', '콩쥐야_줘때써.html']) {
    const html = await read(file);
    assert.ok(html.includes('<title>' + GAME_TITLE + '</title>'));
    assert.ok(html.includes(GAME_TITLE));
  }
});

test('jar themes and display names remain available', () => {
  const themes = Object.values(JAR_THEMES);
  assert.equal(themes.length, 25);
  assert.equal(new Set(themes.map(theme => theme.jarColor)).size, 25);
  assert.equal(displayJarName({ title: '원자 번호' }), '원자 번호 장독대 채우기');
  assert.equal(themeFor('atomic_number').jar, 'bronze');
  assert.equal(themeFor('redox').toad, 'split');
});

test('mobile keypad is driven by input descriptors', async () => {
  const code = await read('assets/js/mobile-keypad.js');
  assert.match(code, /getInputDescriptor/);
  assert.match(code, /descriptor\.allowedKeys/);
  assert.match(code, /descriptor\.inputMode/);
  assert.match(code, /renderChoiceKeys/);
  assert.match(code, /renderNumericKeys/);
  assert.doesNotMatch(code, /trainingId\s*===/);
});

test('numeric keypad keeps a four-by-three digit contract', async () => {
  const code = await read('assets/js/mobile-keypad.js');
  assert.match(code, /DIGITS\s*=\s*\[[^\]]*'1'|DIGITS\s*=\s*\[[^\]]*\x221\x22/);
  assert.match(code, /gridTemplateColumns\s*=\s*\x22repeat\(3,/);
  assert.match(code, /gridTemplateRows\s*=\s*\x22repeat\(4,/);
  assert.match(code, /createButton\(\x22전체\x22/);
  assert.match(code, /createButton\(\x22확인\x22/);
});

test('single game entry owns lobby redirects and result navigation', async () => {
  const html = await read('콩쥐야_줘때써.html');
  const entry = await read('assets/js/game-page.js');
  const ui = await read('assets/js/ui-effects.js');
  assert.match(html, /game-page\.js\?v=/);
  assert.match(entry, /initializeGamePage/);
  assert.match(ui, /chemistryLobbyUrl\("jars"\)/);
  assert.match(ui, /장독대 고르기로/);
});

test('mobile layout reserves a scene and full keypad', async () => {
  const balance = await read('assets/css/mobile-quiz-balance.css');
  const polish = await read('assets/css/quiz-mobile-polish.css');
  assert.match(balance, /--mobile-scene-height/);
  assert.match(balance, /grid-template-rows/);
  assert.match(polish, /\.mobile-keypad/);
  assert.match(polish, /min-height:\s*40px\s*!important/);
});

test('pause button stays icon-sized with accessible labels', async () => {
  const entry = await read('assets/js/ui-effects.js');
  assert.match(entry, /button\.textContent\s*=\s*paused\s*\?\s*\x22▶\x22\s*:\s*\x22Ⅱ\x22/);
  assert.match(entry, /aria-label/);
  assert.match(entry, /게임 계속하기/);
  assert.match(entry, /게임 일시정지/);
});
