'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const DOCS = path.join(ROOT, 'docs');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function occurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const HallRules = require(path.join(WEB, 'assets/js/hall-rules.js'));
const app = require(path.join(WEB, 'assets/js/app.js'));

function loadCurrentRaid() {
  app.state.atual = readJson('web/data/raids/raid_atual.json');
  app.state.anterior = readJson('web/data/raids/raid_anterior.json');
  app.state.history = readJson('web/data/raids/raid_history.json');
  app.state.manualOverrides = readJson('web/data/raids/raid_manual_overrides.json');
  app.state.hasComparison = true;
  app.buildMembers();
}

loadCurrentRaid();

test('limites matemáticos do Hall permanecem estáveis', () => {
  assert.strictEqual(HallRules.requiredAttacksForPosition(1), 18);
  assert.strictEqual(HallRules.requiredAttacksForPosition(4), 15);
  assert.strictEqual(HallRules.requiredAttacksForPosition(11), 12);
  assert.strictEqual(HallRules.requiredAttacksForPosition(21), 6);
});

test('dados atuais geram ranking dinâmico sem duplicar membros', () => {
  const members = app.state.members;
  assert(members.length > 0, 'nenhum membro foi carregado');
  const names = members.map(member => member.nome);
  assert.strictEqual(new Set(names).size, names.length, 'nomes duplicados no estado final');

  const ranked = members.filter(member => Number.isInteger(member.currentRank));
  assert(ranked.length > 0, 'ranking de dano vazio');
  const positions = ranked.map(member => member.currentRank).sort((a, b) => a - b);
  assert.deepStrictEqual(positions, Array.from({ length: ranked.length }, (_, index) => index + 1));

  const highestDamage = [...ranked].sort(app.compareDamageRanking)[0];
  assert.strictEqual(highestDamage.currentRank, 1);
});

test('ausentes permanecem consultáveis sem ranking calculado', () => {
  const absent = app.state.members.filter(member => member.ausenteAtual || member.status_participacao === 'ausente');
  absent.forEach(member => {
    assert.strictEqual(member.currentRank, null, `${member.nome}: ranking deveria ser nulo`);
    assert.strictEqual(app.currentRankLabel(member), 'Incalculável');
    assert.strictEqual(app.hallRankLabel(member), 'Fora do Hall');
  });
});

test('cards do Hall mantêm métricas essenciais e classificações independentes', () => {
  const sample = app.state.members.find(member => Number.isInteger(member.currentRank));
  assert(sample, 'nenhum membro elegível para validar o card');
  const stats = Object.fromEntries(app.guardianCardStats(sample));
  ['Dano atual', 'Média base', 'Evolução %', 'Ranking de dano', 'Posição no Hall']
    .forEach(label => assert(Object.hasOwn(stats, label), `métrica ausente: ${label}`));

  const independent = app.state.members.some(member => (
    Number.isInteger(member.currentRank)
    && Number.isInteger(member.hallRank)
    && member.currentRank !== member.hallRank
  ));
  assert(independent, 'Hall e ranking de dano parecem estar acoplados');
});

test('frequência detalhada não é exposta nos cards públicos do Hall', () => {
  const hallHtml = read('web/pages/hall.html');
  const appSource = read('web/assets/js/app.js');
  assert(!hallHtml.includes('Mínimo 18/21'));
  assert(!appSource.includes('Frequência: <strong>'));
  assert.strictEqual(
    HallRules.disqualificationLabel('frequencia_insuficiente', { frequenciaAtualNum: 1 }),
    'Não classificado pelos critérios internos do Hall'
  );
});

test('Registro preserva a tabela principal e adiciona evolução histórica', () => {
  const html = read('web/pages/registro.html');
  const app = read('web/assets/js/app.js');
  const evolution = read('web/assets/js/registro-evolution.js');
  assert(html.includes('id="ranking-filter"'));
  assert(html.includes('value="dano">Dano total'));
  assert(html.includes('value="hall">Hall evolutivo'));
  assert(html.includes('value="ausente">Ausente'));
  assert(html.includes('id="registro-guild-evolution"'));
  assert(html.includes('id="registro-guild-order"'));
  assert(html.includes('../assets/js/registro-evolution.js'));
  assert(html.includes('class="site-back-top hidden"'));
  assert.strictEqual((html.match(/<th(?:\s|>)/g) || []).length, 15);
  assert(app.includes('function getRegistroSnapshot()'));
  assert(app.includes('data-registro-evolution'));
  assert(!evolution.includes('fetch('));
});

test('canvas da Liga usa motores únicos para chaves e pódio', () => {
  const liga = read('web/assets/js/liga.js');
  assert(liga.includes('const LEAGUE_CANVAS_THEME'));
  assert(liga.includes('const PODIUM_CANVAS_THEME'));
  assert.strictEqual(occurrences(liga, 'async function renderLeagueCanvas('), 1);
  assert.strictEqual(occurrences(liga, 'async function renderPodiumCanvas('), 1);
  assert(liga.includes('window.AvalonLeagueCanvas'));
  assert(liga.includes('window.AvalonLeaguePodiumCanvas'));
});

test('Liga V7.8.1 separa rascunho, arquivos e modo de acesso', () => {
  const liga = read('web/assets/js/liga.js');
  const firebase = read('web/assets/js/liga-firebase.js');
  const config = read('web/assets/js/firebase-config.js');

  assert(liga.includes("portal_avalon_liga_draft_v2"));
  assert(liga.includes("portal_avalon_liga_archives_v1"));
  assert(liga.includes('window.AvalonLeagueStorage'));
  assert(firebase.includes('function finalizeLeague('));
  assert(firebase.includes('state: null'));
  assert(firebase.includes('data-live-discard'));
  assert(firebase.includes('data-finalize-preserve'));
  assert(firebase.includes('data-finalize-clear'));
  assert(config.includes('roleStorageKey: "portal_avalon_liga_access_role"'));
  assert(config.includes('roleSessionKey: "portal_avalon_liga_access_role_session"'));
  assert(config.includes('organizerPersistenceKey: "portal_avalon_liga_access_persistent"'));
  assert(config.includes('maxLocalArchives: 5'));
});

test('participante não recebe controles administrativos nem arquivos locais', () => {
  const firebase = read('web/assets/js/liga-firebase.js');
  assert(firebase.includes('body.liga-readonly [data-liga-admin-only]'));
  assert(firebase.includes('runtime.role === ACCESS_ROLES.PARTICIPANT'));
  assert(firebase.includes('setNoLiveTournament(true)'));
  assert(firebase.includes('clearLeagueViewForParticipant'));
  assert(firebase.includes('renderArchivesPanel'));
  assert(firebase.includes('if (!isOrganizer())'));
});

test('interface global preserva loader, feedback, reveal e botão de topo', () => {
  const css = read('web/assets/css/styles.css');
  const ui = read('web/assets/js/ui.js');
  const pagesWithBackTop = ['hall', 'registro', 'raid', 'liga'];
  const allPages = ['hall', 'oraculo', 'registro', 'raid', 'galeria', 'liga'];

  pagesWithBackTop.forEach(page => {
    const html = read(`web/pages/${page}.html`);
    assert(html.includes('class="site-back-top hidden"'), `${page}: botão de topo ausente`);
  });

  allPages.forEach(page => {
    const html = read(`web/pages/${page}.html`);
    assert(html.includes('../assets/js/ui.js'), `${page}: ui.js ausente`);
  });

  assert(css.includes('@keyframes avalonLoaderSpin'));
  assert(css.includes('.action-feedback-overlay'));
  assert(css.includes('html.avalon-motion-ready .reveal'));
  assert(ui.includes('function initBackToTop'));
  assert(ui.includes('function showActionFeedback'));
  assert(ui.includes('avalon:loader-hidden'));
});

test('HTML e código funcional usam caminhos canônicos sem versão de release', () => {
  const htmlFiles = [
    'web/index.html',
    ...['hall', 'oraculo', 'registro', 'raid', 'galeria', 'liga'].map(page => `web/pages/${page}.html`)
  ];
  htmlFiles.forEach(file => {
    const html = read(file);
    assert(!/[?&](?:v|version|build)=/i.test(html), `${file}: cache busting de release encontrado`);
    assert(/styles\.css["']/.test(html), `${file}: styles.css canônico ausente`);
    assert(/ui\.js["']/.test(html), `${file}: ui.js canônico ausente`);
  });

  ['web/assets/js/app.js', 'web/assets/js/raid.js', 'web/assets/js/liga.js', 'web/assets/js/ui.js']
    .forEach(file => assert(!/PORTAL_VERSION/.test(read(file)), `${file}: versão embutida no código`));
});

test('documentação oficial está consolidada em sete arquivos', () => {
  const expected = [
    'ARQUITETURA.md',
    'CHANGELOG.md',
    'LIGA_FIREBASE.md',
    'MANUTENCAO_E_DEPLOY.md',
    'README.md',
    'REGRAS_E_DADOS.md',
    'TESTES.md'
  ];
  const actual = fs.readdirSync(DOCS)
    .filter(name => fs.statSync(path.join(DOCS, name)).isFile())
    .sort();
  assert.deepStrictEqual(actual, expected);
  assert.strictEqual(
    fs.readdirSync(DOCS).filter(name => fs.statSync(path.join(DOCS, name)).isDirectory()).length,
    0,
    'docs ainda possui subpastas redundantes'
  );
});

test('README oficial aponta para V7.8.3.4 e para a estrutura atual', () => {
  const readme = read('README.md');
  assert(readme.includes('V7.8.3.4'));
  assert(readme.includes('docs/README.md'));
  assert(readme.includes('python tools/run_tests.py'));
  assert(!readme.includes('docs/manutencao/'));
  assert(!readme.includes('docs/arquitetura/'));
  assert(!readme.includes('docs/evidencias/'));
  assert(!readme.includes('tests/'));
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

console.log(`\nResultado do núcleo: ${tests.length - failures}/${tests.length} testes aprovados.`);
if (failures) process.exit(1);
