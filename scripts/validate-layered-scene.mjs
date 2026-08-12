#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strictAssets = process.argv.includes('--strict-assets');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/art/game-scene/manifest.json'), 'utf8'));
const cleanPath = pathname => String(pathname).split(/[?#]/, 1)[0];
const declared = pathname => manifest.availability[pathname] ?? manifest.availability[cleanPath(pathname)];
const expressionOverlay = manifest.assets.effects.toadExpression;

const expected = [
  ['background', manifest.assets.background.path, 2048, 1152],
  ['foreground', manifest.assets.foreground.path, 2048, 1152],
  ...Object.entries(manifest.assets.kongjwi).map(([name, value]) => ['kongjwi:' + name, value.sheet, 4096, 768]),
  ...Object.entries(manifest.assets.tools).map(([name, value]) => ['tool:' + name, value.sheet, 4096, 768]),
  ...Object.entries(manifest.assets.jars).map(([name, value]) => ['jar:' + name, value.layers, 2048, 1024]),
  ...Object.entries(manifest.assets.toads)
    .filter(([, value]) => value.mode === 'skin-motion')
    .map(([name, value]) => ['toad-skin:' + name, value.skin, 1024, 768]),
  ...(expressionOverlay?.enabled === true
    ? [['toad-expression-overlay', expressionOverlay.path, 5120, 384]]
    : []),
  ['water-stream', manifest.assets.effects.waterStream, 4096, 512],
  ['water-splash', manifest.assets.effects.waterSplash, 3072, 512],
  ['water-leak', manifest.assets.effects.waterLeak, 4096, 512],
  ['water-surface', manifest.assets.effects.waterSurface, 1024, 256]
];

const expressionEntries = [...new Map(
  Object.entries(manifest.assets.toadFallback || {})
    .map(([state, pathname]) => [pathname, ['toad-expression:' + state, pathname]])
).values()];

function readPng(pathname) {
  const buffer = fs.readFileSync(pathname);
  if (buffer.length < 33) throw new Error('PNG file is too short');
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('PNG signature mismatch');

  let offset = 8;
  let ihdr = null;
  let sawIend = false;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error('truncated PNG chunk header');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const next = offset + 12 + length;
    if (next > buffer.length) throw new Error('truncated PNG chunk: ' + type);

    if (!ihdr) {
      if (type !== 'IHDR' || length !== 13) throw new Error('IHDR chunk missing');
      ihdr = {
        width: buffer.readUInt32BE(offset + 8),
        height: buffer.readUInt32BE(offset + 12),
        bitDepth: buffer[offset + 16],
        colorType: buffer[offset + 17]
      };
    }

    if (type === 'IEND') {
      if (length !== 0) throw new Error('invalid IEND chunk');
      sawIend = true;
      if (next !== buffer.length) throw new Error('trailing data after IEND');
      break;
    }

    offset = next;
  }

  if (!sawIend) throw new Error('IEND chunk missing');
  return { ...ihdr, size: buffer.length };
}

let failures = 0;
let missing = 0;
let planned = 0;

function checkPng(label, relative, width, height, canvas = null) {
  const diskPath = cleanPath(relative);
  const absolute = path.join(root, diskPath);
  const exists = fs.existsSync(absolute);
  const availability = declared(relative);
  const required = availability === true;
  if (availability == null) {
    failures += 1;
    console.error('AVAILABILITY UNDECLARED ' + label + ': ' + diskPath);
  }
  if (!exists) {
    missing += 1;
    if (required) {
      failures += 1;
      console.error('MISSING REQUIRED ' + label + ': ' + diskPath);
    } else {
      planned += 1;
      console.warn('MISSING PLANNED ' + label + ': ' + diskPath);
    }
    return null;
  }
  if (availability === false) {
    failures += 1;
    console.error('AVAILABILITY MISMATCH ' + label + ': manifest=false disk=true');
  }
  try {
    const png = readPng(absolute);
    const sameCanvas = !canvas || (png.width === canvas.width && png.height === canvas.height);
    const valid = png.width === width && png.height === height && sameCanvas && png.colorType === 6 && png.bitDepth >= 8;
    console.log((valid ? 'OK ' : 'INVALID ') + label + ': ' + png.width + 'x' + png.height);
    if (!valid) failures += 1;
    return png;
  } catch (error) {
    failures += 1;
    console.error('INVALID ' + label + ': ' + diskPath + ': ' + error.message);
    return null;
  }
}

for (const [label, relative, width, height] of expected) {
  checkPng(label, relative, width, height);
}

if (expressionOverlay?.enabled !== true && expressionOverlay?.path) {
  const diskPath = cleanPath(expressionOverlay.path);
  if (fs.existsSync(path.join(root, diskPath))) {
    console.warn('DISABLED ASSET toad-expression-overlay: ' + diskPath + ' (' + (expressionOverlay.validation || 'not validated') + ')');
  }
}

let expressionCanvas = null;
for (const [label, relative] of expressionEntries) {
  const diskPath = cleanPath(relative);
  if (!fs.existsSync(path.join(root, diskPath))) {
    checkPng(label, relative, 0, 0);
    continue;
  }
  try {
    const png = readPng(path.join(root, diskPath));
    if (!expressionCanvas) expressionCanvas = { width: png.width, height: png.height };
    checkPng(label, relative, expressionCanvas.width, expressionCanvas.height, expressionCanvas);
  } catch (error) {
    failures += 1;
    console.error('INVALID ' + label + ': ' + diskPath + ': ' + error.message);
  }
}

for (const jarKey of Object.keys(manifest.assets.jars)) {
  const composition = manifest.jarCompositions?.[jarKey];
  if (!composition?.toad || !composition?.fullExpression || !composition?.skinMotion || !composition?.mask) {
    failures += 1;
    console.error('INVALID jar composition: ' + jarKey);
  }
}

const runtimeFiles = [
  '콩쥐야_줘때써.html',
  'assets/js/scene-renderer.js',
  'assets/js/scene-state-machine.js',
  'assets/js/game-cosmetics-entry.js',
  'assets/js/quiz-shell-controls.js',
  'assets/css/game-runtime-base.css',
  'assets/css/game-asset-animation.css',
  'assets/css/game-runtime-features.css',
  'assets/css/toad-composition-fix.css'
];
const forbidden = [
  ['JPEG Base64', /data:image\/jpeg;base64/i],
  ['legacy single layout', /SCENE_ART_LAYOUT\s*=\s*[\x22']single[\x22']/],
  ['legacy photo fragment', /scene-photo\/jar-photo-/],
  ['legacy toad WebP', /toad-expression-sprite\.webp/],
  ['WebP runtime reference', /\.webp(?:[\x22')?])/i],
  ['CSS toad recolor', /hue-rotate|sepia\(|saturate\(/]
];

for (const relative of runtimeFiles) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures += 1;
    console.error('MISSING RUNTIME FILE ' + relative);
    continue;
  }
  const text = fs.readFileSync(absolute, 'utf8');
  for (const [label, pattern] of forbidden) {
    if (pattern.test(text)) {
      failures += 1;
      console.error('FORBIDDEN ' + label + ': ' + relative);
    }
  }
}

for (const obsolete of [
  '.github/workflows/integrate-game-animation.yml',
  'assets/js/game-asset-animation.js',
  'assets/js/scene-art-loader.js',
  'assets/js/quiz-scene-actors.js',
  'assets/js/photoreal-scene.js',
  'assets/css/quiz-scene-actors.css',
  'assets/images/toad-expressions/toad-expression-sprite.webp',
  'assets/images/toad-expressions/manifest.json'
]) {
  if (fs.existsSync(path.join(root, obsolete))) {
    failures += 1;
    console.error('OBSOLETE FILE ' + obsolete);
  }
}

const photoDir = path.join(root, 'assets/js/scene-photo');
if (fs.existsSync(photoDir) && fs.readdirSync(photoDir).some(name => /^jar-photo-.*\.js$/.test(name))) {
  failures += 1;
  console.error('OBSOLETE FILES assets/js/scene-photo/jar-photo-*.js');
}

const total = expected.length + expressionEntries.length;
console.log(
  'Layered scene validation: ' + (total - missing) + '/' + total +
  ' authored PNG files present; ' + planned + ' planned; ' + failures + ' invalid checks.'
);
if (failures || (strictAssets && missing)) process.exitCode = 1;
