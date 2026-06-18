#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const css = read('web/assets/css/styles.css');
const app = read('web/assets/js/app.js');
const raid = read('web/assets/js/raid.js');
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

test('Portal identifica a versão funcional V7.7', () => {
  assert.match(app, /const PORTAL_VERSION = ['"]V7\.7['"]/);
});

test('CSS possui bloco final de otimização mobile V7.7', () => {
  assert.ok(css.includes('V7.7 — OTIMIZAÇÃO FINAL MOBILE'));
  assert.ok(css.includes('.raid-page .reveal'));
  assert.ok(css.includes('tr.registro-member-card'));
});

test('mascotes não são mais ocultados pelos breakpoints antigos', () => {
  assert.ok(!/\.page-hero-mascot\s*\{[^}]*display:\s*none/s.test(css));
  assert.ok(!/\.registro-hero-mascot\s*\{[^}]*display:\s*none/s.test(css));
});

test('Registro gera células rotuladas e estado vazio próprio', () => {
  const labels = [
    'Ranking de dano', 'Guardião', 'Dano atual', 'Frequência', 'Média base',
    'Evolução', 'Posição no Hall', 'Patente', 'Participação', 'Base histórica'
  ];
  labels.forEach(label => assert.ok(app.includes(`data-label=\"${label}\"`), label));
  assert.ok(app.includes('registro-empty-row'));
  assert.ok(app.includes('registro-empty-cell'));
});

test('Raid possui fallback mobile e fallback temporizado do reveal', () => {
  assert.ok(raid.includes("window.matchMedia('(max-width: 980px)').matches"));
  assert.ok(raid.includes('window.setTimeout(() =>'));
  assert.ok(raid.includes("section.classList.add('is-visible')"));
});

test('HTMLs usam cache busting V7.7 para o CSS global', () => {
  pages.forEach(file => assert.ok(read(file).includes('styles.css?v=7.7'), file));
});

test('scripts alterados usam cache busting V7.7', () => {
  ['web/index.html','web/pages/hall.html','web/pages/oraculo.html','web/pages/registro.html','web/pages/galeria.html']
    .forEach(file => assert.ok(read(file).includes('app.js?v=7.7'), file));
  assert.ok(read('web/pages/raid.html').includes('raid.js?v=7.7'));
});

console.log(`\nResultado estrutural V7.7: ${tests.length}/${tests.length} testes aprovados.`);
