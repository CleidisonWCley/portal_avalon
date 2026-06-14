'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const webRoot = path.join(projectRoot, 'web');
const HallRules = require(path.join(webRoot, 'assets/js/hall-rules.js'));
const app = require(path.join(webRoot, 'assets/js/app.js'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(webRoot, relativePath), 'utf8')); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function loadRealData(currentOverride = null) {
  app.state.atual = currentOverride || readJson('data/raids/raid_atual.json');
  app.state.anterior = readJson('data/raids/raid_anterior.json');
  app.state.history = readJson('data/raids/raid_history.json');
  app.state.manualOverrides = readJson('data/raids/raid_manual_overrides.json');
  app.state.hasComparison = true;
  app.buildMembers();
}

loadRealData();

test('regras matemáticas e posições da V7.3 permanecem preservadas', () => {
  assert.strictEqual(HallRules.requiredAttacksForPosition(1), 18);
  assert.strictEqual(HallRules.requiredAttacksForPosition(4), 15);
  assert.strictEqual(HallRules.requiredAttacksForPosition(11), 12);
  assert.strictEqual(HallRules.requiredAttacksForPosition(21), 6);
  assert.strictEqual(app.hallRankMembers().length, 27);
  assert.deepStrictEqual(app.state.hallVacancies.map(item => item.position), [28, 29, 30]);
});

test('motivo público de frequência não revela ataques nem limite mínimo', () => {
  const member = {
    frequenciaAtualNum: 5,
    danoAtual: 1000,
    baselineCount: 3,
    comparativoValido: true,
    ausenteAtual: false,
    status_participacao: 'baixa_participacao'
  };
  const label = HallRules.disqualificationLabel('frequencia_insuficiente', member);
  assert.strictEqual(label, 'Não classificado pelos critérios internos do Hall');
  assert(!label.includes('/21'));
  assert(!label.toLowerCase().includes('mínimo'));
});

test('ranking de dano é dinâmico e Cley lidera apenas pelos dados atuais', () => {
  const byName = Object.fromEntries(app.state.members.map(member => [member.nome, member]));
  assert.strictEqual(byName.Cley.currentRank, 1);
  assert.strictEqual(byName.Hela.currentRank, 2);

  const modified = clone(readJson('data/raids/raid_atual.json'));
  modified.membros.find(member => member.nome === 'Hela').dano = 8000000000;
  loadRealData(modified);
  const changed = Object.fromEntries(app.state.members.map(member => [member.nome, member]));
  assert.strictEqual(changed.Hela.currentRank, 1);
  assert.strictEqual(changed.Cley.currentRank, 2);

  loadRealData();
});

test('desempate do dano usa frequência e depois nome', () => {
  const a = { nome: 'Zeta', danoAtual: 1000, frequenciaAtualNum: 20 };
  const b = { nome: 'Beta', danoAtual: 1000, frequenciaAtualNum: 21 };
  const c = { nome: 'Alfa', danoAtual: 1000, frequenciaAtualNum: 21 };
  assert.deepStrictEqual([a, b, c].sort(app.compareDamageRanking).map(item => item.nome), ['Alfa', 'Beta', 'Zeta']);
});

test('membro ausente permanece registrado com ranking incalculável', () => {
  const absent = app.state.members.find(member => member.nome === 'Carlinhozz');
  assert(absent);
  assert.strictEqual(absent.currentRank, null);
  assert.strictEqual(app.currentRankLabel(absent), 'Incalculável');
  assert.strictEqual(app.hallRankLabel(absent), 'Fora do Hall');
  assert.strictEqual(app.state.members.length, 28);
});

test('card horizontal usa valores abreviados e rankings independentes', () => {
  const cley = app.state.members.find(member => member.nome === 'Cley');
  const stats = Object.fromEntries(app.guardianCardStats(cley));
  assert.strictEqual(stats['Dano atual'], '7,01B');
  assert.strictEqual(stats['Média base'], '6,71B');
  assert.strictEqual(stats['Evolução %'], '+4,37%');
  assert.strictEqual(stats['Ranking de dano'], '#1');
  assert.strictEqual(stats['Posição no Hall'], '#13');

  const absent = app.state.members.find(member => member.nome === 'Carlinhozz');
  const absentStats = Object.fromEntries(app.guardianCardStats(absent));
  assert.strictEqual(absentStats['Dano atual'], '—');
  assert.strictEqual(absentStats['Evolução %'], 'Incalculável');
  assert.strictEqual(absentStats['Ranking de dano'], 'Incalculável');
  assert.strictEqual(absentStats['Posição no Hall'], 'Fora do Hall');
});

test('Hall e ranking de dano continuam classificações independentes', () => {
  const cley = app.state.members.find(member => member.nome === 'Cley');
  const kia = app.state.members.find(member => member.nome === 'kia');
  assert.strictEqual(cley.currentRank, 1);
  assert.strictEqual(cley.hallRank, 13);
  assert.strictEqual(kia.hallRank, 1);
  assert.notStrictEqual(kia.currentRank, 1);
});

test('percentuais validados e integridade dos dados são preservados', () => {
  const byName = Object.fromEntries(app.state.members.map(member => [member.nome, member]));
  assert.strictEqual(Number(byName.Lux.percentualEvolutivo.toFixed(2)), 4.38);
  assert.strictEqual(Number(byName.Cley.percentualEvolutivo.toFixed(2)), 4.37);
  assert.strictEqual(Number(byName.Aurora.percentualEvolutivo.toFixed(2)), 4.05);
  assert.strictEqual(byName.utiago.danoAtual, 1063888601);
  assert.strictEqual(byName.Wagnero.baselineCount, 2);
});

test('HTML público do Hall não contém cards nem anúncios numéricos de frequência', () => {
  const hallHtml = fs.readFileSync(path.join(webRoot, 'pages/hall.html'), 'utf8');
  const appSource = fs.readFileSync(path.join(webRoot, 'assets/js/app.js'), 'utf8');
  assert(!hallHtml.includes('hall-rules-section'));
  assert(!hallHtml.includes('Mínimo 18/21'));
  assert(!appSource.includes("range: 'Top 4–10 • mínimo"));
  assert(!appSource.includes('Frequência: <strong>'));
});

test('Registro possui os três modos atuais, dez colunas e botão de topo', () => {
  const html = fs.readFileSync(path.join(webRoot, 'pages/registro.html'), 'utf8');
  assert(html.includes('id="ranking-filter"'));
  assert(html.includes('value="dano">Dano total'));
  assert(html.includes('value="hall">Hall evolutivo'));
  assert(html.includes('value="ausente">Ausente'));
  assert(html.includes('id="back-to-top"'));
  assert.strictEqual((html.match(/<th(?:\s|>)/g) || []).length, 10);
});

test('bases parciais e insuficientes continuam na lógica, mas não ficam fixas no HTML', () => {
  const html = fs.readFileSync(path.join(webRoot, 'pages/registro.html'), 'utf8');
  const appSource = fs.readFileSync(path.join(webRoot, 'assets/js/app.js'), 'utf8');
  assert(!html.includes('<option value="parcial">'));
  assert(!html.includes('<option value="insuficiente">'));
  assert(appSource.includes("['parcial', 'Base parcial']"));
  assert(appSource.includes("['insuficiente', 'Base insuficiente']"));
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
console.log(`\nResultado: ${tests.length - failures}/${tests.length} testes aprovados.`);
if (failures) process.exit(1);
