'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ligaPath = path.join(root, 'web/assets/js/liga.js');
const appPath = path.join(root, 'web/assets/js/app.js');
const liga = fs.readFileSync(ligaPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function occurrences(source, token) {
  return source.split(token).length - 1;
}

test('canvas da Liga possui tema centralizado', () => {
  assert(liga.includes('const LEAGUE_CANVAS_THEME'));
  assert(liga.includes('matchSingleWidth: 960'));
  assert(liga.includes('matchDoubleWidth: 510'));
  assert(liga.includes('matchInnerRatio: 0.78'));
});

test('motor possui um renderizador principal e um componente de duelo', () => {
  assert.strictEqual(occurrences(liga, 'async function renderLeagueCanvas('), 1);
  assert.strictEqual(occurrences(liga, 'function drawCanvasMatchCard('), 1);
  assert.strictEqual(occurrences(liga, 'function drawSurvivalCard('), 1);
  assert(liga.includes('function drawCanvasPanel('));
});

test('1v1, 2v2 e 3v3 compartilham normalização e resolvedor adaptativo', () => {
  assert(liga.includes('function normalizeCanvasMatchData('));
  assert(liga.includes('function resolveCanvasMatchLayout('));
  assert(liga.includes("if (maxMembers === 2)"));
  assert(liga.includes("if (maxMembers >= 3)"));
  assert(!/function\s+draw(?:OneVsOne|TwoVsTwo|ThreeVsThree|1v1|2v2|3v3)/i.test(liga));
});

test('download da rodada usa o renderizador unificado', () => {
  const downloadBlock = liga.slice(liga.indexOf('async function downloadCurrentPhaseCard'), liga.indexOf('\nfunction copyResult'));
  assert(downloadBlock.includes('await renderLeagueCanvas'));
  assert(downloadBlock.includes('window.__lastLeaguePhaseCanvas'));
});

test('API de teste e manutenção do canvas está exposta', () => {
  assert(liga.includes('window.AvalonLeagueCanvas'));
  assert(liga.includes('resolveMatchLayout: resolveCanvasMatchLayout'));
  assert(liga.includes('render: renderLeagueCanvas'));
});

test('código funcional utiliza identificação neutra', () => {
  assert(!/PORTAL_VERSION/.test(app));
  assert(!/\bV\d+\.\d+(?:\.\d+)?\b/.test(app));
});

test('documentação oficial foi centralizada', () => {
  const required = [
    'README.md',
    'docs/README.md',
    'docs/CHANGELOG.md',
    'docs/VERSIONAMENTO.md',
    'docs/ARQUITETURA.md',
    'docs/COMPONENTES.md',
    'docs/CHECKLIST_RELEASE.md'
  ];
  required.forEach(file => assert(fs.existsSync(path.join(root, file)), file));
  assert(fs.existsSync(path.join(root, 'docs/releases/V7.3.md')));
  assert(fs.existsSync(path.join(root, 'docs/releases/V7.3.1.md')));
  assert.strictEqual(fs.readdirSync(root).filter(name => /^RELATORIO_.*\.md$/.test(name)).length, 0);
  assert.strictEqual(fs.readdirSync(root).filter(name => /^RESULTADOS_TESTES_.*\.txt$/.test(name)).length, 0);
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
console.log(`\nResultado V7.4: ${tests.length - failures}/${tests.length} testes aprovados.`);
if (failures) process.exit(1);
