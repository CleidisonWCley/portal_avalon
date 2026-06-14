const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const pages = ['hall','registro','raid','liga'];
for (const page of pages) {
  const html = read(`web/pages/${page}.html`);
  assert(html.includes('class="site-back-top hidden"'), `${page}: botão global ausente`);
  assert(html.includes('../assets/js/ui.js'), `${page}: ui.js ausente`);
}

const allHeroPages = [
  'web/index.html', 'web/pages/hall.html', 'web/pages/oraculo.html',
  'web/pages/registro.html', 'web/pages/raid.html', 'web/pages/galeria.html', 'web/pages/liga.html'
];
for (const file of allHeroPages) assert(read(file).includes('page-hero-mascots'), `${file}: plataforma global ausente`);

const hall = read('web/pages/hall.html');
const app = read('web/assets/js/app.js');
assert(!hall.includes('comparison-alert'));
assert(!app.includes('renderComparisonAlert'));

const registro = read('web/pages/registro.html');
assert(registro.includes('registro-hero-mascots'));
assert(!registro.includes('registro-title-platform'));
assert(!registro.includes('mascot-seat'));

const css = read('web/assets/css/styles.css');
assert((css.match(/\.page-hero-mascots::after\s*\{/g) || []).length === 3, 'uma regra-base e dois ajustes responsivos esperados');
assert(!css.includes('.page-title-platform::after')); 
assert(css.includes('.site-back-top'));
assert(css.includes('.action-feedback-overlay'));
assert(!css.includes('.raid-back-top'));
assert(!css.includes('.back-to-top {'));
assert(!css.includes('.league-notice-overlay'));
assert(!css.includes('.raid-floating-toast'));
assert(!css.includes('.registro-title-platform'));

const raid = read('web/assets/js/raid.js');
const liga = read('web/assets/js/liga.js');
assert(raid.includes('window.AvalonUI?.showActionFeedback'));
assert(liga.includes('window.AvalonUI?.showActionFeedback'));
assert(liga.includes("showNotice('Liga iniciada'"));
assert(!liga.includes('podium-scroll-btn'));
assert(!liga.includes('data-scroll-liga-top'));

const ui = read('web/assets/js/ui.js');
assert(ui.includes('function initBackToTop'));
assert(ui.includes('function showActionFeedback'));
assert(ui.includes('function closeActionFeedback'));

console.log('PASS | botão de topo global em Hall, Registro, Raid e Liga');
console.log('PASS | plataforma global presente nas sete abas');
console.log('PASS | Registro migrado sem estrutura legada');
console.log('PASS | resumo técnico do Hall removido');
console.log('PASS | Raid e Liga usam feedback global com visual compartilhado');
console.log('PASS | classes antigas de feedback e retorno ao topo removidas');
console.log('Resultado estrutural V7.6: 6/6 testes aprovados.');
