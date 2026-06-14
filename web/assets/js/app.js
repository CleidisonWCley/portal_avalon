const PORTAL_VERSION = 'V7.6';
const HallRules = typeof AvalonHallRules !== 'undefined'
  ? AvalonHallRules
  : (typeof module !== 'undefined' && module.exports ? require('./hall-rules.js') : null);

const state = {
  atual: null,
  anterior: null,
  history: null,
  manualOverrides: {},
  historySettings: {},
  insignias: {},
  galleryEvents: [],
  members: [],
  hasComparison: false,
  rankingMode: 'atual',
  galleryYear: 'todos',
  hallVacancies: [],
  hallSettings: {}
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const formatter = new Intl.NumberFormat('pt-BR');
const GUARDIAN_SEARCH_HISTORY_KEY = 'portal_avalon_busca_guardiao_historico';
const GUARDIAN_SEARCH_HISTORY_LIMIT = 8;

function rootPath(path = '') {
  const root = document.body?.dataset?.root || '';
  return `${root}${path}`;
}

function formatNumber(value) {
  return formatter.format(Number(value || 0));
}

function formatDamageShort(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0).replace('.', ',')}K`;
  return formatNumber(n);
}

function parseAttackCount(value) {
  if (value === null || value === undefined || value === '') return null;
  const first = String(value).match(/\d+/);
  return first ? Number(first[0]) : null;
}

function normalizeMemberKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, '');
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Sem base';
  const number = Number(value);
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toFixed(2).replace('.', ',')}%`;
}

function confidenceLabel(value) {
  const labels = {
    oficial: 'Base oficial',
    estimada: 'Base estimada',
    parcial: 'Base parcial',
    insuficiente: 'Base insuficiente'
  };
  return labels[value] || 'Base insuficiente';
}

function confidenceClass(value) {
  return ['oficial', 'estimada', 'parcial', 'insuficiente'].includes(value) ? value : 'insuficiente';
}

function isAbsentStatus(status) {
  return String(status || '').toLowerCase() === 'ausente';
}

function isRankableByDamage(member) {
  const damage = Number(member?.danoAtual ?? member?.dano ?? 0);
  const attacks = Number(member?.frequenciaAtualNum ?? parseAttackCount(member?.frequencia) ?? 0);
  return !isAbsentStatus(member?.status_participacao) && damage > 0 && attacks > 0;
}

function compareDamageRanking(a, b) {
  const damageDifference = Number(b?.danoAtual ?? b?.dano ?? 0) - Number(a?.danoAtual ?? a?.dano ?? 0);
  if (damageDifference !== 0) return damageDifference;

  const attackDifference = Number(b?.frequenciaAtualNum ?? parseAttackCount(b?.frequencia) ?? 0)
    - Number(a?.frequenciaAtualNum ?? parseAttackCount(a?.frequencia) ?? 0);
  if (attackDifference !== 0) return attackDifference;

  return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
}

function currentRankLabel(member) {
  return Number.isInteger(member?.currentRank) && member.currentRank > 0
    ? `#${member.currentRank}`
    : 'Incalculável';
}

function hallRankLabel(member) {
  return Number.isInteger(member?.hallRank) && member.hallRank > 0
    ? `#${member.hallRank}`
    : 'Fora do Hall';
}

function memberEvolutionPercentLabel(member) {
  if (member?.ausenteAtual || !member?.comparativoValido) return 'Incalculável';
  return formatPercent(member.percentualEvolutivo);
}

function currentRankMembers() {
  return [...state.members]
    .filter(member => Number.isInteger(member.currentRank) && member.currentRank > 0)
    .sort((a, b) => a.currentRank - b.currentRank);
}

function hallRankMembers() {
  return [...state.members]
    .filter(member => Number.isInteger(member.hallRank) && member.hallRank > 0)
    .sort((a, b) => a.hallRank - b.hallRank);
}

function hallUnclassifiedMembers() {
  return [...state.members]
    .filter(member => !Number.isInteger(member.hallRank))
    .sort((a, b) => {
      if (a.hallReasonCode === 'ausente' && b.hallReasonCode !== 'ausente') return 1;
      if (b.hallReasonCode === 'ausente' && a.hallReasonCode !== 'ausente') return -1;
      if (a.comparativoValido && b.comparativoValido) return HallRules.compareCandidates(a, b);
      if (a.comparativoValido !== b.comparativoValido) return a.comparativoValido ? -1 : 1;
      return (a.currentRank || 999) - (b.currentRank || 999);
    });
}

function memberAtHallPosition(position) {
  return state.members.find(member => member.hallRank === position) || null;
}


function evolutionText(value, hasComparison = state.hasComparison) {
  if (!hasComparison) return 'Aguardando histórico';
  if (value === null || value === undefined) return 'Base insuficiente';
  if (value > 0) return `+${formatNumber(value)}`;
  if (value < 0) return `-${formatNumber(Math.abs(value))}`;
  return '0';
}


function evolutionClass(value, hasComparison = state.hasComparison) {
  if (!hasComparison || value === null || value === undefined || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

async function loadJson(path, fallback = null) {
  try {
    const response = await fetch(rootPath(path), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

function hasPreviousRaidData(anterior) {
  return Boolean(anterior && Array.isArray(anterior.membros) && anterior.membros.length > 0);
}


function getStatus(member) {
  return member.status_participacao || 'sem_status';
}

function fantasyStatusLabel(status) {
  return STATUS_FANTASY_LABELS[status] || 'Sem registro';
}

function operationStatusLabel(status) {
  return STATUS_OPERATION_LABELS[status] || 'Sem registro';
}

function getBadgeImage(id, thumb = false) {
  if (!id || !state.insignias[id]) return '';
  const path = thumb ? state.insignias[id].thumb : state.insignias[id].imagem;
  return rootPath(path);
}

function getBadgeName(id) {
  if (!id || !state.insignias[id]) return 'Sem insígnia especial';
  return state.insignias[id].nome;
}

function getHistoryRaids() {
  const raids = Array.isArray(state.history?.raids) ? state.history.raids : [];
  return raids
    .filter(raid => raid && Number(raid.order) > 0)
    .sort((a, b) => Number(a.order) - Number(b.order));
}

function historyMemberForRaid(raid, memberName) {
  const key = normalizeMemberKey(memberName);
  return (raid?.members || []).find(item => normalizeMemberKey(item.name || item.nome) === key) || null;
}

function manualOverrideFor(memberName, raidId) {
  const members = state.manualOverrides?.members || {};
  const direct = members[memberName]?.[raidId];
  if (direct) return direct;
  const key = normalizeMemberKey(memberName);
  const matchedName = Object.keys(members).find(name => normalizeMemberKey(name) === key);
  return matchedName ? (members[matchedName]?.[raidId] || null) : null;
}

function historicalEntry(raid, memberName) {
  const raw = historyMemberForRaid(raid, memberName);
  if (!raw) return null;
  const override = manualOverrideFor(memberName, raid.id) || {};
  const frequency = override.frequency ?? raw.frequency ?? raw.frequencia ?? null;
  const attacks = override.attacks ?? raw.attacks ?? parseAttackCount(frequency);
  return {
    raidId: raid.id,
    raidLabel: raid.label,
    damage: Number(raw.damage ?? raw.dano ?? 0),
    frequency,
    attacks: attacks === null || attacks === undefined ? null : Number(attacks),
    source: raw.source || raid.source || 'unknown',
    confidence: raid.confidence || 'estimada',
    note: override.note || null
  };
}

function buildMembers() {
  const baseMembers = state.atual?.membros || [];
  const previousRaids = getHistoryRaids();
  const settings = {
    baselineSize: 3,
    minBaselineRaids: 2,
    minCurrentAttacksForHall: 6,
    minBaselineAttacks: 15,
    maxHallPosition: 30,
    hallPositionRules: [
      { from: 1, to: 3, minAttacks: 18 },
      { from: 4, to: 10, minAttacks: 15 },
      { from: 11, to: 20, minAttacks: 12 },
      { from: 21, to: 30, minAttacks: 6 }
    ],
    ...(state.history?.settings || {})
  };
  state.historySettings = settings;

  const fallbackPreviousMap = new Map((state.anterior?.membros || [])
    .map(member => [normalizeMemberKey(member.nome), member]));

  const rankedByDamage = [...baseMembers]
    .filter(member => isRankableByDamage({
      ...member,
      danoAtual: Number(member.dano || 0),
      frequenciaAtualNum: parseAttackCount(member.frequencia) ?? 0
    }))
    .sort(compareDamageRanking);
  const rankMap = new Map(rankedByDamage.map((member, index) => [normalizeMemberKey(member.nome), index + 1]));

  state.members = baseMembers.map(member => {
    const danoAtual = Number(member.dano || 0);
    const frequenciaAtualNum = parseAttackCount(member.frequencia) ?? 0;
    const ausenteAtual = isAbsentStatus(member.status_participacao) || frequenciaAtualNum <= 0 || danoAtual <= 0;

    let historyEntries = previousRaids
      .slice(0, Number(settings.baselineSize || 3))
      .map(raid => historicalEntry(raid, member.nome));

    let availableHistoryEntries = historyEntries.filter(Boolean);
    if (!availableHistoryEntries.length && state.hasComparison) {
      const fallback = fallbackPreviousMap.get(normalizeMemberKey(member.nome));
      if (fallback) {
        const legacyEntry = {
          raidId: 'legacy_previous',
          raidLabel: 'Raid anterior',
          damage: Number(fallback.dano || 0),
          frequency: fallback.frequencia || null,
          attacks: parseAttackCount(fallback.frequencia),
          source: 'legacy',
          confidence: 'estimada'
        };
        historyEntries = [legacyEntry];
        availableHistoryEntries = [legacyEntry];
      }
    }

    const directPrevious = historyEntries[0] || null;
    const danoAnterior = directPrevious ? Number(directPrevious.damage || 0) : null;
    const frequenciaAnterior = directPrevious?.frequency || null;
    const frequenciaAnteriorNum = directPrevious?.attacks ?? null;

    const baselineDetails = availableHistoryEntries.map(entry => {
      const knownFrequency = entry.attacks !== null && entry.attacks !== undefined;
      const validDamage = Number(entry.damage || 0) > 0;
      const validFrequency = !knownFrequency || Number(entry.attacks) >= Number(settings.minBaselineAttacks || 15);
      return {
        ...entry,
        knownFrequency,
        valid: validDamage && validFrequency,
        excludedReason: !validDamage ? 'sem_dano' : (!validFrequency ? 'frequencia_baixa' : null)
      };
    });

    const validBaseline = baselineDetails.filter(entry => entry.valid);
    const minBaseline = Number(settings.minBaselineRaids || 2);
    const hasEnoughBaseline = validBaseline.length >= minBaseline;
    const mediaBase = hasEnoughBaseline
      ? Math.round(validBaseline.reduce((total, entry) => total + Number(entry.damage), 0) / validBaseline.length)
      : null;
    const hasUnknownFrequency = validBaseline.some(entry => !entry.knownFrequency);
    const baseConfidence = !hasEnoughBaseline
      ? (validBaseline.length ? 'parcial' : 'insuficiente')
      : (hasUnknownFrequency ? 'estimada' : 'oficial');

    const comparativoValido = mediaBase !== null && !ausenteAtual;
    const evolucao = comparativoValido ? danoAtual - mediaBase : null;
    const percentualEvolutivo = comparativoValido && mediaBase > 0 ? (evolucao / mediaBase) * 100 : null;
    const directPreviousAbsent = !directPrevious || danoAnterior <= 0 || (frequenciaAnteriorNum !== null && frequenciaAnteriorNum <= 0);
    const retornoBatalha = directPreviousAbsent && !ausenteAtual && danoAtual > 0;
    const presencaMinimaHall = frequenciaAtualNum >= Number(settings.minCurrentAttacksForHall || 6);
    const comparisonStatus = retornoBatalha
      ? 'retorno_batalha'
      : (!comparativoValido ? 'sem_comparativo' : 'comparativo_valido');

    return {
      ...member,
      danoAtual,
      danoAnterior,
      frequenciaAnterior,
      frequenciaAtualNum,
      frequenciaAnteriorNum,
      mediaBase,
      baselineCount: validBaseline.length,
      baselineTarget: Number(settings.baselineSize || 3),
      baselineDetails,
      baseConfidence,
      comparativoValido,
      retornoBatalha,
      ausenteAtual,
      presencaMinimaHall,
      elegivelHall: false,
      comparisonStatus,
      evolucao,
      percentualEvolutivo,
      currentRank: rankMap.get(normalizeMemberKey(member.nome)) || null,
      hallRank: null,
      hallBadgeId: null,
      badgeId: null,
      hallReasonCode: null,
      hallReason: null,
      hallFirstAllowedPosition: HallRules.firstAllowedPosition(frequenciaAtualNum, settings)
    };
  });

  state.hasComparison = state.members.some(member => member.comparativoValido);
  state.rankingMode = state.hasComparison ? 'evolucao' : 'atual';
  state.hallSettings = HallRules.normalizedSettings(settings);

  const standings = HallRules.buildStandings(state.members, state.hallSettings);
  state.hallVacancies = standings.vacancies;

  standings.assignments.forEach(({ member, position, badgeId }) => {
    member.hallRank = position;
    member.hallBadgeId = badgeId;
    member.badgeId = badgeId;
    member.elegivelHall = true;
    member.hallReasonCode = 'classificado';
    member.hallReason = `Classificado no Hall em #${position}`;
  });

  standings.unclassified.forEach(({ member, code, reason }) => {
    member.hallRank = null;
    member.hallBadgeId = null;
    member.badgeId = null;
    member.elegivelHall = false;
    member.hallReasonCode = code;
    member.hallReason = reason;
  });
}


function getRankingMembers(mode = state.rankingMode) {
  if (mode === 'evolucao') {
    const hall = hallRankMembers();
    return hall.length ? hall : currentRankMembers();
  }
  return currentRankMembers();
}

function getSummary() {
  const resumo = state.atual?.resumo || {};
  const directPrevious = getHistoryRaids()[0] || null;
  const totalAnterior = directPrevious
    ? Number(directPrevious.summary?.totalDamage || 0)
    : (state.hasComparison ? Number(state.anterior?.resumo?.dano_total_guilda || 0) : null);
  const totalAtual = Number(resumo.dano_total_guilda || 0);
  return {
    totalAtual,
    totalAnterior,
    deltaTotal: totalAnterior !== null ? totalAtual - totalAnterior : null,
    participantes: Number(resumo.participantes || 0),
    ausentes: Number(resumo.ausentes || 0),
    vagas: Number(resumo.vagas_estimadas || 0),
    cadastrados: Number(resumo.membros_cadastrados || 0)
  };
}

function renderSummary() {
  const grid = $('#summary-grid');
  if (!grid) return;
  const s = getSummary();
  const cards = [
    ['Dano total', formatNumber(s.totalAtual), 'gold'],
    ['Participantes', s.participantes, ''],
    ['Ausentes', s.ausentes, ''],
    ['Vagas abertas', s.vagas, ''],
    ['Membros cadastrados', s.cadastrados, '']
  ];
  grid.innerHTML = cards.map(([label, value, kind]) => `
    <article class="summary-card ${kind}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join('');

  const mode = $('#raid-mode-text');
  if (mode) {
    mode.textContent = state.hasComparison
      ? 'Histórico ativo: o Hall usa a média das últimas 3 raids anteriores válidas. Bases sem frequência confirmada são sinalizadas como estimadas.'
      : 'Histórico ainda insuficiente: o percentual será liberado após pelo menos duas raids anteriores válidas.';
  }
}

function renderSalaoPreview() {
  const target = $('#salao-top-preview');
  if (!target) return;
  const hall = hallRankMembers();
  const ranking = (hall.length ? hall : currentRankMembers()).slice(0, 3);
  target.innerHTML = `
    <p class="eyebrow">Destaques atuais</p>
    <h3>${hall.length ? 'Primeiros do Hall da Evolução' : 'Primeiros guardiões registrados'}</h3>
    ${ranking.map(member => {
      const image = member.hallBadgeId
        ? getBadgeImage(member.hallBadgeId, true)
        : rootPath('assets/img/brand/avalon-logo-small.png');
      const label = member.hallBadgeId
        ? `Hall #${member.hallRank} • ${formatPercent(member.percentualEvolutivo)}`
        : `Dano #${member.currentRank || '—'} • ${formatDamageShort(member.danoAtual)}`;
      return `
        <div class="mini-top-row">
          <img src="${image}" alt="${member.hallBadgeId ? getBadgeName(member.hallBadgeId) : 'Símbolo Avalon'}" />
          <div>
            <strong>${member.nome}</strong><br>
            <small>${label}</small>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function hallPositionMinimum(position) {
  return HallRules.requiredAttacksForPosition(position, state.hallSettings);
}

function podiumCard(member, position) {
  const podiumClasses = ['gold', 'silver', 'bronze'];
  const badgeId = HallRules.badgeForPosition(position);
  const cssClass = podiumClasses[position - 1] || '';

  if (!member) {
    return `
      <article class="podium-card medieval-card ${cssClass} hall-vacancy">
        <div class="podium-image-wrap">
          <img src="${getBadgeImage(badgeId)}" alt="${getBadgeName(badgeId)}" />
        </div>
        <p class="rank-kicker">Posição #${position}</p>
        <h3>Trono vago</h3>
        <p>${getBadgeName(badgeId)}</p>
        <p class="vacancy-reason">Nenhum guardião ocupou esta posição nesta raid. A numeração oficial foi preservada.</p>
      </article>
    `;
  }

  return `
    <article class="podium-card medieval-card ${cssClass}">
      <div class="podium-image-wrap">
        <img src="${getBadgeImage(member.hallBadgeId)}" alt="${getBadgeName(member.hallBadgeId)}" />
      </div>
      <p class="rank-kicker">Hall da Evolução #${member.hallRank}</p>
      <h3>${member.nome}</h3>
      <p class="hall-patent">${getBadgeName(member.hallBadgeId)}</p>
      <div class="hall-public-stats">
        <p><span>Dano atual</span><strong>${formatDamageShort(member.danoAtual)}</strong></p>
        <p><span>Média base</span><strong>${formatDamageShort(member.mediaBase)}</strong></p>
        <p><span>Evolução</span><strong class="evolution ${evolutionClass(member.evolucao)}">${formatPercent(member.percentualEvolutivo)}</strong></p>
      </div>
      <p class="history-meta">${confidenceLabel(member.baseConfidence)}</p>
    </article>
  `;
}

function hallSlotTemplate(position) {
  const member = memberAtHallPosition(position);
  const badgeId = HallRules.badgeForPosition(position);

  if (!member) {
    return `
      <article class="elite-item hall-slot-vacant">
        <img src="${getBadgeImage(badgeId, true)}" alt="${getBadgeName(badgeId)}" />
        <div>
          <strong>#${position} Posição vaga</strong><br>
          <span>Trono ainda não conquistado</span>
          <small class="history-inline">A posição oficial não é renumerada.</small>
        </div>
      </article>
    `;
  }

  return `
    <article class="elite-item ${evolutionClass(member.evolucao)}">
      <img src="${getBadgeImage(member.hallBadgeId, true)}" alt="${getBadgeName(member.hallBadgeId)}" />
      <div>
        <strong>#${member.hallRank} ${member.nome}</strong><br>
        <span>${getBadgeName(member.hallBadgeId)}</span>
        <small class="hall-result-line">Dano ${formatDamageShort(member.danoAtual)} • Média ${formatDamageShort(member.mediaBase)} • <span class="evolution ${evolutionClass(member.evolucao)}">${formatPercent(member.percentualEvolutivo)}</span></small>
        <small class="history-inline">${confidenceLabel(member.baseConfidence)}</small>
      </div>
    </article>
  `;
}

function rankGroupTemplate({ id, title, range, description, from, to }) {
  const positions = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  return `
    <section class="rank-panel medieval-card blue-frame">
      <div class="elite-header">
        <img src="${getBadgeImage(id, true)}" alt="${getBadgeName(id)}" />
        <div>
          <p class="eyebrow">${range}</p>
          <h2>${title}</h2>
          <p>${description}</p>
        </div>
      </div>
      <div class="elite-list">
        ${positions.map(hallSlotTemplate).join('')}
      </div>
    </section>
  `;
}

function outsideHallTemplate(member) {
  const damage = member.ausenteAtual ? '—' : formatDamageShort(member.danoAtual);
  const base = member.mediaBase === null ? 'Sem base' : formatDamageShort(member.mediaBase);
  const percent = memberEvolutionPercentLabel(member);
  const publicReason = member.hallReasonCode === 'ausente'
    ? 'Ausente nesta raid'
    : (member.hallReasonCode === 'sem_dano'
      ? 'Sem dano registrado'
      : (member.hallReasonCode === 'base_insuficiente' || member.hallReasonCode === 'sem_comparativo'
        ? 'Aguardando base comparável'
        : 'Não classificado nesta raid'));
  return `
    <article class="elite-item outside-hall-item">
      <img src="${rootPath('assets/img/brand/avalon-logo-small.png')}" alt="Símbolo Avalon" />
      <div>
        <strong>${member.nome}</strong><br>
        <span>Dano ${damage} • Média ${base} • <span class="evolution ${evolutionClass(member.evolucao)}">${percent}</span></span>
        <small class="history-inline hall-reason">${publicReason}</small>
      </div>
    </article>
  `;
}

function renderOutsideHall() {
  const target = $('#unclassified-hall');
  if (!target) return;
  const members = hallUnclassifiedMembers();
  target.innerHTML = `
    <section class="rank-panel medieval-card outside-hall-panel">
      <div class="elite-header">
        <img src="${rootPath('assets/img/brand/avalon-logo-small.png')}" alt="Símbolo Avalon" />
        <div>
          <p class="eyebrow">Sem patente nesta raid</p>
          <h2>Às Margens do Hall</h2>
          <p>Guardiões atuais que permanecem registrados, mas não cumpriram algum critério para receber posição oficial.</p>
        </div>
      </div>
      <div class="elite-list outside-hall-list">
        ${members.map(outsideHallTemplate).join('') || '<p class="empty-inline">Todos os guardiões atuais foram classificados no Hall.</p>'}
      </div>
    </section>
  `;
}

function renderHall() {
  const podium = $('#podium');
  if (!podium) return;

  podium.innerHTML = [1, 2, 3]
    .map(position => podiumCard(memberAtHallPosition(position), position))
    .join('');

  const groups = $('#rank-groups');
  if (groups) {
    groups.innerHTML = [
      {
        id: 'vigia',
        title: 'Vigias do Horizonte',
        range: 'Top 4–10',
        description: 'Guardiões que avançam com constância e já enxergam os próximos degraus de Avalon.',
        from: 4,
        to: 10
      },
      {
        id: 'ascendente',
        title: 'Cavaleiros Ascendentes',
        range: 'Top 11–20',
        description: 'Membros que fortalecem sua jornada e demonstram crescimento ao longo das raids.',
        from: 11,
        to: 20
      },
      {
        id: 'juramentado',
        title: 'Defensores de Avalon',
        range: 'Top 21–30',
        description: 'Guardiões que permanecem em batalha e seguem construindo sua evolução.',
        from: 21,
        to: 30
      }
    ].map(rankGroupTemplate).join('');
  }

  renderOutsideHall();
}


function memberCardTemplate(member) {
  const badge = member.hallBadgeId;
  const image = badge ? getBadgeImage(badge, true) : rootPath('assets/img/brand/avalon-logo-small.png');
  const status = getStatus(member);
  const comparisonLabel = member.retornoBatalha
    ? 'Retorno à Batalha'
    : (member.comparativoValido ? confidenceLabel(member.baseConfidence) : 'Base insuficiente');
  const hallLabel = member.hallRank ? `#${member.hallRank}` : 'Fora do Hall';
  const patentLabel = badge ? getBadgeName(badge) : 'Sem patente nesta raid';
  return `
    <div class="member-profile">
      <img src="${image}" alt="${badge ? getBadgeName(badge) : 'Símbolo Avalon'}" />
      <div>
        <p class="eyebrow">Ficha do Guardião</p>
        <h2 class="member-name">${member.nome}</h2>
        <p>${patentLabel}</p>
        ${!member.hallRank ? `<small class="hall-profile-reason">${member.hallReason || 'Não classificado nesta raid'}</small>` : ''}
      </div>
    </div>
    <div class="member-stats">
      <div class="stat-box"><span>Dano atual</span><strong>${formatNumber(member.danoAtual)}</strong></div>
      <div class="stat-box"><span>Média base</span><strong>${member.mediaBase === null ? 'Sem base' : formatNumber(member.mediaBase)}</strong></div>
      <div class="stat-box"><span>Evolução</span><strong class="evolution ${evolutionClass(member.evolucao)}">${member.ausenteAtual ? 'Incalculável' : evolutionText(member.evolucao)}</strong></div>
      <div class="stat-box"><span>Percentual evolutivo</span><strong class="evolution ${evolutionClass(member.evolucao)}">${memberEvolutionPercentLabel(member)}</strong></div>
      <div class="stat-box"><span>Frequência atual</span><strong>${member.frequencia || '—'}</strong></div>
      <div class="stat-box"><span>Ranking por dano</span><strong>${currentRankLabel(member)}</strong></div>
      <div class="stat-box"><span>Posição no Hall</span><strong>${hallLabel}</strong></div>
      <div class="stat-box"><span>Patente atual</span><strong>${patentLabel}</strong></div>
      <div class="stat-box"><span>Base histórica</span><strong><span class="history-confidence ${confidenceClass(member.baseConfidence)}">${comparisonLabel}</span></strong></div>
      <div class="stat-box"><span>Raids válidas</span><strong>${member.baselineCount}/${member.baselineTarget}</strong></div>
      <div class="stat-box"><span>Participação</span><strong>${member.retornoBatalha ? 'Retorno à Batalha' : fantasyStatusLabel(status)}</strong></div>
      <div class="stat-box"><span>Situação no Hall</span><strong>${member.hallRank ? 'Classificado' : (member.hallReason || 'Não classificado')}</strong></div>
    </div>
    <div class="member-card-actions" data-html2canvas-ignore="true">
      <button class="btn btn-primary btn-download-ficha" type="button" data-download-member-card="${member.nome}">
        <span class="material-symbols-outlined" aria-hidden="true">download</span>
        Baixar ficha
      </button>
    </div>
  `;
}

function slugFile(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guardiao';
}

function guardianShareMessage(member) {
  if (member.hallRank === 1) return 'O Desafiante de Avalon lidera a evolução desta raid.';
  if (member.hallRank) return `Patente conquistada pelo esforço: ${getBadgeName(member.hallBadgeId)}.`;
  if (member.retornoBatalha) return 'O retorno de um guardião nunca passa despercebido.';
  return member.hallReason || 'Seu esforço fortalece o legado da Avalon.';
}

function loadCanvasImageApp(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRectApp(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFittingTextApp(ctx, text, x, y, maxWidth, fontTemplate, startSize, minSize = 18, align = 'center') {
  let size = startSize;
  ctx.textAlign = align;
  do {
    ctx.font = fontTemplate.replace('{size}', size);
    if (ctx.measureText(String(text || '')).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size >= minSize);
  ctx.fillText(String(text || ''), x, y);
  return size;
}

function wrapTextApp(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrappedTextApp(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3, align = 'center') {
  ctx.textAlign = align;
  const lines = wrapTextApp(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function drawContainImageApp(ctx, img, x, y, w, h) {
  if (!img) return;
  const ratio = Math.min(w / img.width, h / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function downloadCanvasApp(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function guardianCardStats(member) {
  const absent = Boolean(member?.ausenteAtual) || !isRankableByDamage(member);
  return [
    ['Dano atual', absent ? '—' : formatDamageShort(member.danoAtual)],
    ['Média base', member.mediaBase === null ? 'Sem base' : formatDamageShort(member.mediaBase)],
    ['Evolução %', absent || !member.comparativoValido ? 'Incalculável' : formatPercent(member.percentualEvolutivo)],
    ['Ranking de dano', currentRankLabel(member)],
    ['Posição no Hall', hallRankLabel(member)]
  ];
}

async function downloadGuardianCard(memberName) {
  const member = findMember(memberName || '');
  if (!member) return;

  const badge = member.badgeId;
  const badgeName = badge ? getBadgeName(badge) : 'Às Margens do Hall';
  const badgeImage = badge ? getBadgeImage(badge, false) : rootPath('assets/img/brand/avalon-logo-transparent.png');
  const logoImage = rootPath('assets/img/brand/avalon-logo-small.png');
  const [badgeImg, logoImg] = await Promise.all([
    loadCanvasImageApp(badgeImage),
    loadCanvasImageApp(logoImage)
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, '#071126');
  bg.addColorStop(0.52, '#080b15');
  bg.addColorStop(1, '#1a1308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.20;
  const glow = ctx.createRadialGradient(800, 420, 70, 800, 420, 760);
  glow.addColorStop(0, '#f2c766');
  glow.addColorStop(0.42, 'rgba(242,199,102,0.20)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.strokeStyle = 'rgba(242,199,102,0.72)';
  ctx.lineWidth = 7;
  drawRoundedRectApp(ctx, 54, 48, 1492, 1104, 46);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  drawRoundedRectApp(ctx, 82, 76, 1436, 1048, 36);
  ctx.stroke();

  if (logoImg) drawContainImageApp(ctx, logoImg, 690, 84, 220, 142);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c766';
  ctx.font = 'bold 32px Cinzel, Georgia, serif';
  ctx.fillText('PORTAL AVALON', 800, 246);

  ctx.fillStyle = '#f4f0e6';
  drawFittingTextApp(ctx, member.nome.toUpperCase(), 800, 326, 1320, 'bold {size}px Cinzel, Georgia, serif', 72, 36);

  ctx.fillStyle = '#f2c766';
  drawFittingTextApp(ctx, badgeName, 800, 388, 1260, 'bold {size}px Cinzel, Georgia, serif', 38, 24);

  if (badgeImg) drawContainImageApp(ctx, badgeImg, 440, 418, 720, 360);

  const stats = guardianCardStats(member);
  const firstRow = stats.slice(0, 3);
  const secondRow = stats.slice(3);

  const drawStat = ([label, value], x, y, width, accent = false) => {
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.strokeStyle = accent ? 'rgba(242,199,102,0.48)' : 'rgba(216,222,233,0.18)';
    ctx.lineWidth = 2;
    drawRoundedRectApp(ctx, x, y, width, 104, 22);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(215,217,226,0.82)';
    ctx.font = 'bold 20px Inter, Arial, sans-serif';
    ctx.fillText(label.toUpperCase(), x + width / 2, y + 34);
    ctx.fillStyle = accent ? '#f2c766' : '#f4f0e6';
    drawFittingTextApp(ctx, value, x + width / 2, y + 78, width - 42, 'bold {size}px Inter, Arial, sans-serif', 30, 18, 'center');
  };

  firstRow.forEach((stat, index) => drawStat(stat, 100 + index * 480, 800, 440, index === 2));
  secondRow.forEach((stat, index) => drawStat(stat, 220 + index * 620, 928, 560, false));

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(244,240,230,0.94)';
  ctx.font = 'italic 25px Inter, Arial, sans-serif';
  drawWrappedTextApp(ctx, `“${guardianShareMessage(member)}”`, 800, 1080, 1260, 34, 2, 'center');

  ctx.fillStyle = 'rgba(215,217,226,0.72)';
  ctx.font = '19px Inter, Arial, sans-serif';
  ctx.fillText('Gerado pelo Portal Avalon', 800, 1135);

  if (typeof window !== 'undefined') window.__lastGuardianCardCanvas = canvas;
  downloadCanvasApp(canvas, `ficha-avalon-${slugFile(member.nome)}.png`);
}

function findMember(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return state.members.find(member => member.nome.toLowerCase() === normalized)
    || state.members.find(member => member.nome.toLowerCase().includes(normalized))
    || null;
}

function renderMemberCard(member) {
  const card = $('#member-card');
  if (!card) return;
  if (!member) {
    card.className = 'member-card empty-state medieval-card';
    card.innerHTML = '<h3>Busque sua ficha.</h3><p>Digite seu nick para consultar seu perfil, presença, dano e patente no Portal Avalon.</p>';
    return;
  }
  card.className = 'member-card medieval-card gold-frame';
  card.innerHTML = memberCardTemplate(member);
  card.querySelector('[data-download-member-card]')?.addEventListener('click', (event) => {
    downloadGuardianCard(event.currentTarget.dataset.downloadMemberCard);
  });
}

function getGuardianSearchHistory() {
  try {
    const raw = localStorage.getItem(GUARDIAN_SEARCH_HISTORY_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, GUARDIAN_SEARCH_HISTORY_LIMIT) : [];
  } catch (error) {
    return [];
  }
}

function saveGuardianSearchHistory(items = []) {
  const clean = [];
  items.forEach(item => {
    const name = String(item || '').trim();
    if (!name || clean.some(current => current.toLowerCase() === name.toLowerCase())) return;
    clean.push(name);
  });
  localStorage.setItem(GUARDIAN_SEARCH_HISTORY_KEY, JSON.stringify(clean.slice(0, GUARDIAN_SEARCH_HISTORY_LIMIT)));
}

function addGuardianSearchHistory(member) {
  if (!member?.nome) return;
  const current = getGuardianSearchHistory().filter(name => name.toLowerCase() !== member.nome.toLowerCase());
  saveGuardianSearchHistory([member.nome, ...current]);
}

function clearGuardianSearchHistory() {
  localStorage.removeItem(GUARDIAN_SEARCH_HISTORY_KEY);
}

function isExactMemberSearch(query, member) {
  return Boolean(member && query && String(query).trim().toLowerCase() === String(member.nome).toLowerCase());
}

function renderSuggestions(query = '') {
  const suggestionsBox = $('#suggestions');
  if (!suggestionsBox) return;
  const normalized = query.trim().toLowerCase();
  const history = getGuardianSearchHistory();
  const suggestions = history
    .filter(name => !normalized || name.toLowerCase().includes(normalized))
    .slice(0, GUARDIAN_SEARCH_HISTORY_LIMIT);

  suggestionsBox.innerHTML = suggestions.length ? suggestions.map(name => `
    <button class="suggestion-chip" type="button" data-member="${name}" title="Buscar ${name}">${name}</button>
  `).join('') : '';
  suggestionsBox.classList.toggle('is-empty', suggestions.length === 0);

  $$('.suggestion-chip').forEach(button => {
    button.addEventListener('click', () => {
      const input = $('#member-search');
      const member = findMember(button.dataset.member);
      if (input) input.value = button.dataset.member;
      renderMemberCard(member);
      if (member) addGuardianSearchHistory(member);
      renderSuggestions(button.dataset.member);
    });
  });
}

function trendKey(member) {
  if (member.retornoBatalha) return 'retorno_batalha';
  if (!state.hasComparison || !member.comparativoValido || member.evolucao === null || member.evolucao === undefined) return 'sem_comparacao';
  if (member.evolucao > 0) return 'subiu';
  if (member.evolucao < 0) return 'caiu';
  return 'igual';
}


function renderRegistroKpis() {
  const target = $('#registro-kpis');
  if (!target) return;
  const s = getSummary();
  const activeLabel = s.participantes === 1 ? 'membro ativo' : 'membros ativos';
  const absentLabel = s.ausentes === 1 ? 'membro ausente' : 'membros ausentes';
  target.innerHTML = `
    <span class="kpi-pill"><strong>${s.participantes}</strong> ${activeLabel}</span>
    <span class="kpi-pill"><strong>${s.ausentes}</strong> ${absentLabel}</span>
    <span class="kpi-pill"><strong>${formatDamageShort(s.totalAtual)}</strong> dano total</span>
    <span class="kpi-pill"><strong>${s.cadastrados}</strong> registrados</span>
  `;
}

function syncConfidenceFilterOptions() {
  const select = $('#confidence-filter');
  if (!select) return;
  const optional = [
    ['parcial', 'Base parcial'],
    ['insuficiente', 'Base insuficiente']
  ];
  optional.forEach(([value, label]) => {
    const exists = state.members.some(member => member.baseConfidence === value);
    const current = select.querySelector(`option[value="${value}"]`);
    if (exists && !current) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    } else if (!exists && current) {
      current.remove();
    }
  });
}

function compareRegistroMembers(a, b, mode) {
  if (mode === 'hall') {
    if (a.hallRank && b.hallRank) return a.hallRank - b.hallRank;
    if (a.hallRank !== b.hallRank) return a.hallRank ? -1 : 1;
  }

  if (Number.isInteger(a.currentRank) && Number.isInteger(b.currentRank)) {
    return a.currentRank - b.currentRank;
  }
  if (Number.isInteger(a.currentRank) !== Number.isInteger(b.currentRank)) {
    return Number.isInteger(a.currentRank) ? -1 : 1;
  }
  return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' });
}

function renderTable() {
  const table = $('#members-table');
  if (!table) return;
  const search = $('#table-search')?.value.trim().toLowerCase() || '';
  const statusFilter = $('#status-filter')?.value || 'todos';
  const trendFilter = $('#trend-filter')?.value || 'todos';
  const rankingFilter = $('#ranking-filter')?.value || 'dano';
  const confidenceFilter = $('#confidence-filter')?.value || 'todos';

  const sorted = [...state.members].sort((a, b) => compareRegistroMembers(a, b, rankingFilter));

  const filtered = sorted.filter(member => {
    const matchesSearch = !search || member.nome.toLowerCase().includes(search);
    const status = getStatus(member);
    const displayStatus = member.retornoBatalha ? 'retorno_batalha' : status;
    const matchesStatus = statusFilter === 'todos'
      || (statusFilter === 'ativo' ? status !== 'ausente' : displayStatus === statusFilter)
      || (statusFilter === 'sem_comparativo' ? !member.comparativoValido : false);
    const matchesTrend = trendFilter === 'todos' || trendKey(member) === trendFilter;
    const matchesRankingMode = rankingFilter !== 'ausente' || member.ausenteAtual;
    const matchesConfidence = confidenceFilter === 'todos' || member.baseConfidence === confidenceFilter;
    return matchesSearch && matchesStatus && matchesTrend && matchesRankingMode && matchesConfidence;
  });

  table.innerHTML = filtered.map(member => {
    const status = getStatus(member);
    const absent = member.ausenteAtual;
    const evolutionPercent = absent ? 'Incalculável' : memberEvolutionPercentLabel(member);
    const hallPosition = member.hallRank
      ? `<span class="hall-table-status classified">#${member.hallRank}</span>`
      : `<span class="hall-table-status outside" title="${member.hallReason || 'Fora do Hall'}">Fora do Hall</span>`;
    return `
      <tr class="${absent ? 'member-row-absent' : ''}">
        <td class="sticky-rank">${currentRankLabel(member)}</td>
        <td class="member-name-cell sticky-member">${member.nome}</td>
        <td class="numeric-cell">${absent ? '—' : formatDamageShort(member.danoAtual)}</td>
        <td>${member.frequencia || '—'}</td>
        <td class="numeric-cell">${member.mediaBase === null ? 'Sem base' : formatDamageShort(member.mediaBase)}</td>
        <td><span class="evolution ${evolutionClass(member.evolucao)}">${evolutionPercent}</span></td>
        <td>${hallPosition}</td>
        <td>${member.hallBadgeId ? getBadgeName(member.hallBadgeId) : 'Sem patente'}</td>
        <td><span class="status-badge status-${member.retornoBatalha ? 'retorno_batalha' : status}">${member.retornoBatalha ? 'Retorno à Batalha' : operationStatusLabel(status)}</span></td>
        <td><span class="history-confidence ${confidenceClass(member.baseConfidence)}">${confidenceLabel(member.baseConfidence)}</span></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="10">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
}

function renderGalleryYearFilters() {
  const target = $('#gallery-year-filters');
  if (!target) return;
  const years = ['todos', '2022', '2023', '2024', '2025', '2026'];
  target.innerHTML = years.map(year => `
    <button class="year-filter ${state.galleryYear === year ? 'active' : ''}" type="button" data-year="${year}">
      ${year === 'todos' ? 'Todos' : year}
    </button>
  `).join('');

  $$('.year-filter').forEach(button => {
    button.addEventListener('click', () => {
      state.galleryYear = button.dataset.year;
      renderGallery();
    });
  });
}

function galleryCardTemplate(evento) {
  const img = rootPath(evento.imagem);
  const download = rootPath(evento.download || evento.imagem);
  return `
    <article class="gallery-card medieval-card gold-frame" data-year="${evento.ano}">
      <button class="gallery-image-button" type="button" data-gallery-open="${evento.id}" aria-label="Visualizar ${evento.titulo}">
        <img src="${img}" alt="${evento.titulo}" loading="lazy" />
      </button>
      <div class="gallery-card-body">
        <p class="eyebrow">${evento.tipo} • ${evento.ano}</p>
        <h3>${evento.titulo}</h3>
        <p>${evento.descricao}</p>
        <div class="gallery-actions">
          <button class="btn btn-secondary" type="button" data-gallery-open="${evento.id}">Visualizar</button>
          <a class="btn btn-ghost" href="${download}" download>Baixar</a>
        </div>
      </div>
    </article>
  `;
}

function renderGallery() {
  const grid = $('#gallery-grid');
  if (!grid) return;
  renderGalleryYearFilters();
  const events = state.galleryYear === 'todos'
    ? state.galleryEvents
    : state.galleryEvents.filter(evento => String(evento.ano) === String(state.galleryYear));

  grid.innerHTML = events.map(galleryCardTemplate).join('');
  const empty = $('#gallery-empty');
  if (empty) empty.classList.toggle('hidden', events.length > 0);
  bindGalleryButtons();
}

function openGalleryModal(id) {
  const modal = $('#gallery-modal');
  if (!modal) return;
  const evento = state.galleryEvents.find(item => item.id === id);
  if (!evento) return;
  const img = rootPath(evento.imagem);
  const download = rootPath(evento.download || evento.imagem);
  $('#gallery-modal-title').textContent = evento.titulo;
  $('#gallery-modal-meta').textContent = `${evento.tipo} • ${evento.ano}`;
  $('#gallery-modal-description').textContent = evento.descricao;
  $('#gallery-modal-image').src = img;
  $('#gallery-modal-image').alt = evento.titulo;
  $('#gallery-modal-download').href = download;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeGalleryModal() {
  const modal = $('#gallery-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function bindGalleryButtons() {
  $$('[data-gallery-open]').forEach(button => {
    button.addEventListener('click', () => openGalleryModal(button.dataset.galleryOpen));
  });
}

function bindEvents() {
  const navToggle = $('.nav-toggle');
  const nav = $('.main-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  const memberInput = $('#member-search');
  if (memberInput) {
    memberInput.addEventListener('input', (event) => {
      const query = event.target.value;
      const member = findMember(query);
      renderSuggestions(query);
      renderMemberCard(member);
      if (isExactMemberSearch(query, member)) {
        addGuardianSearchHistory(member);
        renderSuggestions(query);
      }
    });
  }

  const clearSearch = $('#clear-search');
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      const input = $('#member-search');
      if (input) input.value = '';
      clearGuardianSearchHistory();
      renderSuggestions('');
      renderMemberCard(null);
    });
  }

  ['#table-search', '#status-filter', '#trend-filter', '#ranking-filter', '#confidence-filter'].forEach(selector => {
    const element = $(selector);
    if (!element) return;
    element.addEventListener('input', renderTable);
    element.addEventListener('change', renderTable);
  });
  const modal = $('#gallery-modal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target.matches('[data-gallery-close]') || event.target === modal) {
        closeGalleryModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeGalleryModal();
  });
}

function initRevealAnimations() {
  const elements = $$('.reveal');
  if (!elements.length) return;
  if (!('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  elements.forEach(element => observer.observe(element));
}

async function init() {
  const [atual, anterior, history, manualOverrides, insigniasData, galleryData] = await Promise.all([
    loadJson(AVALON_DATA_PATHS.raidAtual, { resumo: {}, membros: [] }),
    loadJson(AVALON_DATA_PATHS.raidAnterior, { resumo: {}, membros: [] }),
    loadJson(AVALON_DATA_PATHS.raidHistory, null),
    loadJson(AVALON_DATA_PATHS.raidManualOverrides, { members: {} }),
    loadJson(AVALON_DATA_PATHS.insignias, { insignias: [] }),
    loadJson(AVALON_DATA_PATHS.eventos, { eventos: [] })
  ]);
  state.atual = atual;
  state.anterior = anterior;
  state.history = history;
  state.manualOverrides = manualOverrides || { members: {} };
  state.insignias = Object.fromEntries((insigniasData.insignias || []).map(item => [item.id, item]));
  state.galleryEvents = galleryData.eventos || [];
  state.hasComparison = hasPreviousRaidData(anterior) || Boolean(history?.raids?.length > 1);
  buildMembers();

  renderSummary();
  renderSalaoPreview();
  renderHall();
  renderSuggestions('');
  renderRegistroKpis();
  syncConfidenceFilterOptions();
  renderTable();
  renderGallery();
  bindEvents();
  initRevealAnimations();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    state,
    buildMembers,
    hallRankMembers,
    hallUnclassifiedMembers,
    memberAtHallPosition,
    getHistoryRaids,
    historicalEntry,
    normalizeMemberKey,
    parseAttackCount,
    isRankableByDamage,
    compareDamageRanking,
    currentRankLabel,
    hallRankLabel,
    guardianCardStats,
    compareRegistroMembers
  };
}
