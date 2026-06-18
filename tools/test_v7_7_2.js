#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const css = read('web/assets/css/styles.css');
const ui = read('web/assets/js/ui.js');
const app = read('web/assets/js/app.js');
const pages = [
  'web/index.html',
  'web/pages/hall.html',
  'web/pages/oraculo.html',
  'web/pages/registro.html',
  'web/pages/raid.html',
  'web/pages/galeria.html',
  'web/pages/liga.html'
];

const tests = [];
function test(name, fn) {
  fn();
  tests.push(name);
  console.log(`PASS | ${name}`);
}

function occurrences(text, pattern) {
  return (text.match(pattern) || []).length;
}

test('Portal identifica a versão funcional V7.7.2', () => {
  assert.match(app, /const PORTAL_VERSION = ['"]V7\.7\.2['"]/);
});

test('CSS possui bloco consolidado V7.7.2', () => {
  assert.ok(css.includes('V7.7.2 — MOTION E RESPONSIVIDADE CONSOLIDADOS'));
  assert.ok(css.includes('--avalon-mascot-float-duration: 4.8s'));
  assert.ok(css.includes('animation-name: mascotFloat !important'));
});

test('flutuação dos mascotes possui uma única implementação ativa', () => {
  assert.strictEqual(occurrences(css, /animation-name:\s*mascotFloat/g), 1);
  assert.ok(!css.includes('animation: mascotFloat 4.6s'));
  assert.ok(!css.includes('--mascot-title-size'));
  assert.ok(!css.includes('--mascot-registro-size'));
});

test('movimento reduzido está consolidado sem seletor universal', () => {
  assert.strictEqual(occurrences(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/g), 1);
  assert.ok(!/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\*\s*\{[\s\S]*?animation:\s*none/s.test(css));
  assert.ok(css.includes('.avalon-page-loader__spinner'));
});

test('loader mantém 220 ms e libera o reveal por evento', () => {
  assert.ok(ui.includes('const MIN_VISIBLE_MS = 220;'));
  assert.ok(ui.includes("const LOADER_HIDDEN_EVENT = 'avalon:loader-hidden';"));
  assert.ok(ui.includes('dispatchLoaderHidden();'));
  assert.ok(ui.includes('document.addEventListener(LOADER_HIDDEN_EVENT, releaseInitialMotion'));
  assert.ok(ui.includes('window.requestAnimationFrame(() =>'));
  assert.ok(ui.includes('if (!initialMotionReleased && !prefersReducedMotion()) return;'));
});

test('DOMContentLoaded não inicia o reveal antes do loader', () => {
  const boot = ui.slice(ui.indexOf('prepareMotionSystem();'));
  assert.ok(!/DOMContentLoaded[\s\S]{0,220}initRevealAnimations\(\)/.test(boot));
});

test('HTMLs usam cache busting V7.7.2 para CSS e UI', () => {
  pages.forEach(file => {
    const html = read(file);
    assert.ok(html.includes('styles.css?v=7.7.2'), file);
    assert.ok(html.includes('ui.js?v=7.7.2'), file);
  });
});

test('páginas que carregam app.js usam cache busting V7.7.2', () => {
  [
    'web/index.html',
    'web/pages/hall.html',
    'web/pages/oraculo.html',
    'web/pages/registro.html',
    'web/pages/galeria.html'
  ].forEach(file => assert.ok(read(file).includes('app.js?v=7.7.2'), file));
});

test('scripts específicos também recebem o identificador de cache V7.7.2', () => {
  assert.ok(read('web/pages/raid.html').includes('raid.js?v=7.7.2'));
  assert.ok(read('web/pages/liga.html').includes('liga.js?v=7.7.2'));
});

test('consolidação reduziu blocos de media query sem remover o mobile final', () => {
  assert.ok(occurrences(css, /@media/g) <= 48);
  assert.ok(css.includes('/* Único bloco mobile de autoridade para cabeçalhos, Raid e Registro. */'));
  assert.ok(css.includes('tr.registro-member-card'));
  assert.ok(css.includes('.raid-hero-slot'));
});

console.log(`\nResultado estrutural V7.7.2: ${tests.length}/${tests.length} testes aprovados.`);
