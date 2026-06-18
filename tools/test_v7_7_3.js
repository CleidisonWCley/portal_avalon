#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pages = [
  'web/index.html',
  'web/pages/hall.html',
  'web/pages/oraculo.html',
  'web/pages/registro.html',
  'web/pages/raid.html',
  'web/pages/galeria.html',
  'web/pages/liga.html'
];

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS | ${name}`);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const css = read('web/assets/css/styles.css');
const ui = read('web/assets/js/ui.js');
const app = read('web/assets/js/app.js');
const raid = read('web/assets/js/raid.js');
const liga = read('web/assets/js/liga.js');

// Syntax for classic browser scripts.
for (const [name, source] of [['ui.js', ui], ['app.js', app], ['raid.js', raid], ['liga.js', liga]]) {
  new vm.Script(source, { filename: name });
}

test('HTMLs usam referências canônicas sem parâmetros de release', () => {
  for (const file of pages) {
    const html = read(file);
    assert(!/[?&](?:v|version|build)=/i.test(html), `${file} ainda possui parâmetro de versão/build`);
    assert(/styles\.css["']/.test(html), `${file} não aponta para styles.css canônico`);
    assert(/ui\.js["']/.test(html), `${file} não aponta para ui.js canônico`);
  }
});

test('código funcional não contém identificação de release do Portal', () => {
  const sources = [css, ui, app, raid, liga];
  for (const source of sources) {
    assert(!/\bV\d+\.\d+(?:\.\d+)?\b/.test(source), 'Foi encontrada identificação de release no código funcional');
  }
});

test('mascotes estão estáticos e sem código morto de animação', () => {
  assert(!css.includes('mascotFloat'), 'keyframe mascotFloat ainda existe');
  assert(!css.includes('glassesFlash'), 'keyframe glassesFlash ainda existe');
  assert(!css.includes('--avalon-mascot-float-duration'), 'token de flutuação ainda existe');
  assert(!/\.page-hero-mascot[^{}]*\{[^{}]*animation/i.test(css), 'mascote ainda recebe animation');
});

test('loader animado e reveal permanecem no projeto', () => {
  assert(css.includes('@keyframes avalonLoaderSpin'), 'keyframe do loader ausente');
  assert(css.includes('animation: avalonLoaderSpin'), 'spinner do loader sem animação');
  assert(ui.includes("const MIN_VISIBLE_MS = 220"), 'tempo mínimo do loader foi alterado');
  assert(ui.includes("avalon:loader-hidden"), 'evento de encerramento do loader ausente');
  assert(css.includes('html.avalon-motion-ready .reveal'), 'reveal consolidado ausente');
});

test('Registro mobile e Raid mobile continuam consolidados', () => {
  assert(css.includes('.registro-member-card'), 'cards mobile do Registro ausentes');
  assert(css.includes('.raid-page .reveal'), 'blindagem mobile da Raid ausente');
  assert(css.includes('.raid-heroes-grid'), 'grid de heróis da Raid ausente');
  assert(app.includes('data-label'), 'rótulos mobile do Registro ausentes');
});

test('cache e armazenamento usam chaves canônicas', () => {
  assert(raid.includes("portal_avalon_raid_api_list'"), 'cache canônico da Raid ausente');
  assert(!raid.includes('raid_api_list_v'), 'cache versionado da Raid ainda existe');
  assert(liga.includes("const LIGA_STORAGE_KEY = 'portal_avalon_liga'"), 'chave canônica da Liga ausente');
  assert(liga.includes('getLigaStorageKeys'), 'migração automática da Liga ausente');
});

console.log(`\nResultado estrutural: ${passed}/${passed} testes aprovados.`);
