'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const liga = fs.readFileSync(path.join(root, 'web/assets/js/liga.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'web/assets/css/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'web/assets/js/app.js'), 'utf8');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function occurrences(source, token) { return source.split(token).length - 1; }

test('pódio possui tema, modelo e resolvedor centralizados', () => {
  assert(liga.includes('const PODIUM_CANVAS_THEME'));
  assert.strictEqual(occurrences(liga, 'function buildPodiumPlacementModel('), 1);
  assert.strictEqual(occurrences(liga, 'function resolvePodiumCardLayout('), 1);
  assert.strictEqual(occurrences(liga, 'function drawPodiumPlacementCard('), 1);
});

test('pódio completo e card individual usam o mesmo renderer', () => {
  assert.strictEqual(occurrences(liga, 'async function renderPodiumCanvas('), 1);
  const full = liga.slice(liga.indexOf('async function downloadPodiumImage'), liga.indexOf('async function downloadPlacementCardImage'));
  const individual = liga.slice(liga.indexOf('async function downloadPlacementCardImage'), liga.indexOf('function downloadWinnerCardImage'));
  assert(full.includes("renderPodiumCanvas({ type: 'full'"));
  assert(individual.includes("renderPodiumCanvas({ type: 'placement'"));
});

test('não existem renderizadores completos separados por colocação', () => {
  assert(!liga.includes('function drawPodiumCanvasPlaceCard('));
  assert(!/function\s+draw(?:Gold|Silver|Bronze)Podium/i.test(liga));
  assert(!liga.includes('function drawMultilineText('));
});

test('bronze mantém título em duas linhas e margem segura calculada', () => {
  assert(liga.includes("return ['GUERREIROS', 'DE BRONZE']"));
  assert(liga.includes('safeBottom: box.y + box.h - bottomPadding'));
  assert(liga.includes('metrics.requiredHeight > box.h'));
});

test('API do pódio está disponível para manutenção e testes', () => {
  assert(liga.includes('window.AvalonLeaguePodiumCanvas'));
  assert(liga.includes('resolveCardLayout: resolvePodiumCardLayout'));
  assert(liga.includes('render: renderPodiumCanvas'));
});

test('CSS do pódio foi consolidado sem seletores órfãos conhecidos', () => {
  assert(!css.includes('.winner-share-copy'));
  assert.strictEqual(occurrences(css, '.placement-share-grid {'), 1);
  assert(!/\.placement-share-grid\s*\{[^}]*!important/s.test(css));
  assert(css.includes('PÓDIO ADAPTATIVO E CONSOLIDAÇÃO DO COMPONENTE DA LIGA'));
});

test('Portal mantém código neutro e histórico na documentação', () => {
  assert(!/PORTAL_VERSION/.test(app));
  assert(!/\bV\d+\.\d+(?:\.\d+)?\b/.test(app));
  assert(fs.existsSync(path.join(root, 'README.md')));
  assert(fs.existsSync(path.join(root, 'docs/releases/V7.5.md')));
  assert(fs.existsSync(path.join(root, 'docs/auditoria/INVENTARIO_REDUNDANCIAS_V7_5.md')));
  assert(fs.existsSync(path.join(root, 'docs/evidencias/V7.5/README.md')));
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS | ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL | ${name}`);
    console.error(error.stack || error.message);
  }
}
console.log(`\nResultado V7.5: ${tests.length - failures}/${tests.length} testes aprovados.`);
if (failures) process.exit(1);
