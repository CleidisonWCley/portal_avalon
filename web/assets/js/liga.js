const LIGA_DRAFT_STORAGE_KEY = 'portal_avalon_liga_draft_v2';
const LIGA_ARCHIVES_STORAGE_KEY = 'portal_avalon_liga_archives_v1';
const LIGA_LEGACY_STORAGE_KEY = 'portal_avalon_liga';
const LIGA_LEGACY_STORAGE_PREFIX = 'portal_avalon_liga_v';
const LIGA_MAX_ARCHIVES = 5;

function cloneLigaValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function getLegacyLigaStorageKeys() {
  const keys = [LIGA_LEGACY_STORAGE_KEY];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(LIGA_LEGACY_STORAGE_PREFIX)) keys.push(key);
    }
  } catch (error) {
    console.warn('Não foi possível localizar salvamentos antigos da Liga.', error);
  }
  return [...new Set(keys)];
}

function clearLegacyLigaStorage() {
  getLegacyLigaStorageKeys().forEach((key) => localStorage.removeItem(key));
}

function clearLigaStorage() {
  localStorage.removeItem(LIGA_DRAFT_STORAGE_KEY);
  clearLegacyLigaStorage();
}

function readLigaDraft() {
  try {
    const raw = localStorage.getItem(LIGA_DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Falha ao ler o rascunho da Liga.', error);
    return null;
  }
}

function writeLigaDraft(state) {
  try {
    if (!state || typeof state !== 'object') {
      localStorage.removeItem(LIGA_DRAFT_STORAGE_KEY);
      return true;
    }
    localStorage.setItem(LIGA_DRAFT_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Falha ao salvar o rascunho da Liga.', error);
    return false;
  }
}

function migrateLegacyLigaDraft() {
  const existing = readLigaDraft();
  if (existing) {
    clearLegacyLigaStorage();
    return { migrated: false, state: existing };
  }

  for (const key of getLegacyLigaStorageKeys()) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      if (state && typeof state === 'object') {
        writeLigaDraft(state);
        clearLegacyLigaStorage();
        return { migrated: true, state };
      }
    } catch (error) {
      console.warn(`Falha ao migrar o salvamento ${key}.`, error);
    }
  }

  clearLegacyLigaStorage();
  return { migrated: false, state: null };
}

function readLigaArchives() {
  try {
    const raw = localStorage.getItem(LIGA_ARCHIVES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Falha ao ler as Ligas arquivadas.', error);
    return [];
  }
}

function writeLigaArchives(archives) {
  try {
    localStorage.setItem(
      LIGA_ARCHIVES_STORAGE_KEY,
      JSON.stringify(Array.isArray(archives) ? archives : [])
    );
    return true;
  } catch (error) {
    console.warn('Falha ao salvar as Ligas arquivadas.', error);
    return false;
  }
}

function ligaStateHasPodium(state) {
  const podium = state?.bracket?.podium;
  return Boolean(podium && Object.values(podium).some(Boolean));
}

function archiveLigaState(state, metadata = {}) {
  if (!state || typeof state !== 'object') {
    return { ok: false, reason: 'empty-state' };
  }

  const archives = readLigaArchives();
  if (archives.length >= LIGA_MAX_ARCHIVES) {
    return { ok: false, reason: 'limit', limit: LIGA_MAX_ARCHIVES };
  }

  const archivedAt = new Date().toISOString();
  const archive = {
    id: globalThis.crypto?.randomUUID?.() || `liga-${Date.now()}`,
    title: metadata.title || 'Liga Avalon',
    status: ligaStateHasPodium(state) ? 'concluida' : 'interrompida',
    createdAt: state.savedAt || archivedAt,
    archivedAt,
    state: cloneLigaValue(state)
  };

  const next = [archive, ...archives];
  return writeLigaArchives(next)
    ? { ok: true, archive }
    : { ok: false, reason: 'storage-error' };
}

function deleteLigaArchive(archiveId) {
  const archives = readLigaArchives();
  const next = archives.filter((archive) => archive?.id !== archiveId);
  if (next.length === archives.length) return false;
  return writeLigaArchives(next);
}

function getLigaArchive(archiveId) {
  return readLigaArchives().find((archive) => archive?.id === archiveId) || null;
}

function duplicateLigaArchiveState(archiveId) {
  const archive = getLigaArchive(archiveId);
  if (!archive?.state) return null;

  return {
    modoId: archive.state.modoId || '',
    participantes: cloneLigaValue(archive.state.participantes || []),
    ordem: [],
    teamMode: archive.state.teamMode === 'manual' ? 'manual' : 'auto',
    manualTeams: cloneLigaValue(archive.state.manualTeams || []),
    bracket: null,
    phaseIndex: 0,
    battleStarted: false,
    savedAt: new Date().toISOString()
  };
}

const TROPHY_DISPLAY_PATHS = {
  gold: 'assets/img/trophies/display/ligaouro.webp',
  silver: 'assets/img/trophies/display/ligaprata.webp',
  bronze: 'assets/img/trophies/display/ligabronze.webp'
};

const TROPHY_EXPORT_PATHS = {
  gold: 'assets/img/trophies/ligaouro.png',
  silver: 'assets/img/trophies/ligaprata.png',
  bronze: 'assets/img/trophies/ligabronze.png'
};

const PLACE_LABELS = {
  gold: '1º lugar',
  silver: '2º lugar',
  bronze: '3º lugar'
};

const PLACE_TITLES = {
  gold: 'Campeão',
  silver: 'Vice-campeão',
  bronze: 'Guerreiro de Bronze'
};

const PLACE_TITLES_TEAM = {
  gold: 'Campeões',
  silver: 'Vice-campeões',
  bronze: 'Guerreiros de Bronze'
};

const PLACE_TROPHIES = {
  display: TROPHY_DISPLAY_PATHS,
  export: TROPHY_EXPORT_PATHS
};


/* tokens compartilhados do canvas da Liga.
   Todos os formatos (1v1, 2v2 e 3v3) usam o mesmo motor visual. */
const LEAGUE_CANVAS_THEME = Object.freeze({
  width: 1400,
  maxHeight: 2200,
  contentX: 150,
  contentWidth: 1100,
  colors: Object.freeze({
    gold: '#f2c766',
    text: '#f4f0e6',
    textSoft: 'rgba(215,217,226,0.84)',
    panel: 'rgba(255,255,255,0.055)',
    panelBorder: 'rgba(216,222,233,0.15)',
    blueBorder: 'rgba(79,140,255,0.22)'
  }),
  spacing: Object.freeze({
    phaseStartY: 555,
    itemGap: 24,
    matchInnerRatio: 0.78,
    versusGap: 92
  }),
  cards: Object.freeze({
    matchSingleWidth: 960,
    matchDoubleWidth: 510,
    groupWidth: 980,
    oneVsOneHeight: 142,
    twoVsTwoHeight: 164,
    threeVsThreeHeight: 184,
    groupHeight: 300
  })
});



/* tema único para o pódio completo e os cards individuais.
   O conteúdo de ouro, prata e bronze usa o mesmo modelo e o mesmo resolvedor. */
const PODIUM_CANVAS_THEME = Object.freeze({
  colors: Object.freeze({
    text: '#f4f0e6',
    textSoft: 'rgba(215,217,226,0.90)',
    panel: 'rgba(255,255,255,0.045)',
    innerFrame: 'rgba(255,255,255,0.075)',
    fullBackground: Object.freeze(['#071126', '#080b15', '#1a1308'])
  }),
  full: Object.freeze({
    width: 1600,
    height: 900,
    frame: Object.freeze({ x: 70, y: 60, w: 1460, h: 780, radius: 44, lineWidth: 4 }),
    innerFrame: Object.freeze({ x: 88, y: 78, w: 1424, h: 744, radius: 34, lineWidth: 2 }),
    leagueTitleY: 130,
    titleY: 215,
    footerY: 825,
    cardBottom: 770
  }),
  placement: Object.freeze({
    width: 1200,
    height: 800,
    frame: Object.freeze({ x: 64, y: 58, w: 1072, h: 684, radius: 44, lineWidth: 5 }),
    innerFrame: Object.freeze({ x: 82, y: 76, w: 1036, h: 648, radius: 34, lineWidth: 2 }),
    leagueTitleY: 118,
    titleY: 188,
    footerY: 710,
    card: Object.freeze({ x: 120, y: 230, w: 960, h: 430 })
  }),
  placements: Object.freeze({
    gold: Object.freeze({
      accent: '#f2c766',
      background: Object.freeze(['#071126', '#0b0e18', '#211607']),
      minHeight: 500,
      maxHeight: 535,
      width: 380,
      x: 610,
      trophySize: 245,
      trophyMin: 215,
      featureTrophySize: 315
    }),
    silver: Object.freeze({
      accent: '#d8dee9',
      background: Object.freeze(['#071126', '#101622', '#141a24']),
      minHeight: 445,
      maxHeight: 480,
      width: 360,
      x: 235,
      trophySize: 205,
      trophyMin: 178,
      featureTrophySize: 300
    }),
    bronze: Object.freeze({
      accent: '#b87333',
      background: Object.freeze(['#071126', '#121017', '#231508']),
      minHeight: 445,
      maxHeight: 480,
      width: 360,
      x: 1005,
      trophySize: 205,
      trophyMin: 174,
      featureTrophySize: 300
    })
  }),
  compact: Object.freeze({
    topPadding: 24,
    bottomPadding: 24,
    trophyGap: 15,
    titleGap: 14,
    nameGap: 12,
    memberGap: 14,
    rankSize: 21,
    rankMin: 17,
    titleSize: 22,
    titleMin: 16,
    nameSize: 34,
    nameMin: 21,
    memberSize: 18,
    memberMin: 14,
    memberMaxLines: 3
  }),
  feature: Object.freeze({
    panelPadding: 34,
    trophyAreaWidth: 365,
    contentGap: 30,
    rankSize: 24,
    rankMin: 18,
    titleSize: 28,
    titleMin: 20,
    nameSize: 42,
    nameMin: 25,
    memberSize: 30,
    memberMin: 20,
    lineGap: 12
  })
});

const ligaState = {
  modos: [],
  membrosAvalon: [],
  modoId: '',
  participantes: [],
  ordem: [],
  teamMode: 'auto',
  manualTeams: [],
  bracket: null,
  phaseIndex: 0,
  battleStarted: false,
  feedback: ''
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function rootPath(path = '') {
  const root = document.body?.dataset?.root || '';
  return `${root}${path}`;
}

async function loadJson(path, fallback = null) {
  try {
    if (window.AvalonResources?.fetchJson) {
      const result = await window.AvalonResources.fetchJson(rootPath(path), {
        fallback,
        timeoutMs: 6500,
        retries: 1
      });
      if (result.source !== 'network') {
        console.warn(`[Portal Avalon] ${path} carregado por ${result.source}.`);
      }
      return result.data;
    }

    const response = await fetch(rootPath(path), { cache: 'default' });
    if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function participantKey(name) {
  return String(name || '').trim().toLowerCase();
}

function getModo() {
  return ligaState.modos.find(modo => modo.id === ligaState.modoId) || null;
}

function leagueFullTitle(modo = getModo()) {
  if (!modo) return 'Liga Avalon';
  const base = `${modo.titulo || 'Liga Avalon'} (${modo.formato || 'Liga'})`;
  return `Liga Avalon • ${base}${modo.nome ? ` — ${modo.nome}` : ''}`;
}

function placementLabel(place) {
  return PLACE_LABELS[place] || 'Colocação';
}

function placementTitle(place) {
  return PLACE_TITLES[place] || 'Classificado';
}

function isTeamUnit(unit) {
  return unit?.type === 'team';
}

function placementTitleFor(place, unit = null) {
  if (isTeamUnit(unit)) return PLACE_TITLES_TEAM[place] || placementTitle(place);
  return placementTitle(place);
}

function leagueCanvasTitle(modo = getModo()) {
  return leagueFullTitle(modo).replace(/•/g, '-').replace(/—/g, '-').replace(/\s+-\s+/g, ' - ');
}

function placementTrophy(place, purpose = 'display') {
  const paths = PLACE_TROPHIES[purpose] || PLACE_TROPHIES.display;
  return paths[place] || paths.gold;
}

function isTeamMode(modo) {
  return modo?.formato === '3v3';
}

function isSurvivalMode(modo) {
  return modo?.formato === '1v5';
}

function getLigaStateSnapshot() {
  return {
    modoId: ligaState.modoId,
    participantes: cloneLigaValue(ligaState.participantes),
    ordem: cloneLigaValue(ligaState.ordem),
    teamMode: ligaState.teamMode,
    manualTeams: cloneLigaValue(ligaState.manualTeams),
    bracket: cloneLigaValue(ligaState.bracket),
    phaseIndex: ligaState.phaseIndex,
    battleStarted: Boolean(ligaState.battleStarted),
    savedAt: new Date().toISOString()
  };
}

function canPersistLigaDraft() {
  if (document.body?.classList.contains('liga-archive-view')) return false;
  return window.AvalonLigaFirebase?.role !== 'participant';
}

function saveLiga() {
  const data = getLigaStateSnapshot();
  if (!canPersistLigaDraft()) return data;
  writeLigaDraft(data);
  return data;
}

function applySavedLiga(data) {
  ligaState.modoId = data?.modoId || '';
  ligaState.participantes = Array.isArray(data?.participantes) ? data.participantes : [];
  ligaState.ordem = Array.isArray(data?.ordem) ? data.ordem : [];
  ligaState.teamMode = data?.teamMode === 'manual' ? 'manual' : 'auto';
  ligaState.manualTeams = normalizeManualTeams(data?.manualTeams || []);
  ligaState.bracket = normalizeBracket(data?.bracket || null);
  ligaState.phaseIndex = Number(data?.phaseIndex || 0);
  ligaState.battleStarted = Boolean(data?.battleStarted || ligaState.phaseIndex > 0 || bracketHasRecordedProgress(ligaState.bracket));
}

function bracketHasRecordedProgress(bracket) {
  if (!bracket) return false;
  if (bracket.type === 'elimination') {
    const rounds = bracket.rounds || [];
    const hasRoundProgress = rounds.some(round => (round.matches || []).some(match => Boolean(match.winner || match.manualWinnerName)));
    const hasBronzeProgress = Boolean(bracket.bronze?.winner || bracket.bronze?.manualWinnerName);
    const hasPodium = bracket.podium && Object.values(bracket.podium).some(Boolean);
    return hasRoundProgress || hasBronzeProgress || hasPodium;
  }
  if (bracket.type === 'survival') {
    const placementValues = target => Object.values(target?.placements || {}).some(Boolean);
    const hasGroupProgress = (bracket.groups || []).some(group => placementValues(group));
    const hasFinalProgress = placementValues(bracket.final);
    const hasPodium = bracket.podium && Object.values(bracket.podium).some(Boolean);
    return hasGroupProgress || hasFinalProgress || hasPodium;
  }
  return false;
}


function normalizePlacements(target) {
  if (!target) return;
  target.placements = target.placements || { gold: null, silver: null, bronze: null };
  for (const place of ['gold', 'silver', 'bronze']) {
    if (target.placements[place] === undefined) target.placements[place] = null;
  }
}

function normalizeBracket(bracket) {
  if (!bracket) return null;
  if (bracket.type === 'elimination') {
    bracket.rounds = bracket.rounds || [];
    bracket.rounds.forEach(round => {
      if (round.arena === undefined) round.arena = '';
      round.matches = round.matches || [];
    });
    if (bracket.bronze && bracket.bronze.arena === undefined) bracket.bronze.arena = '';
    bracket.podium = bracket.podium || {};
    recalculateElimination(bracket);
  }

  if (bracket.type === 'survival') {
    bracket.groups = bracket.groups || [];
    bracket.groups.forEach(group => normalizePlacements(group));
    bracket.groupsArena = bracket.groupsArena || '';
    bracket.final = bracket.final || { id: 'final-survival', name: 'Final Survival', participants: [], arena: '', placements: { gold: null, silver: null, bronze: null } };
    normalizePlacements(bracket.final);
    bracket.podium = bracket.podium || {};
    updateSurvivalFinal(bracket);
  }

  return bracket;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextPowerOfTwo(value) {
  if (value <= 1) return 2;
  return 2 ** Math.ceil(Math.log2(value));
}

function arrangeFirstRoundSlots(units, size) {
  const safeUnits = Array.isArray(units) ? units.filter(Boolean) : [];
  const matchCount = Math.max(1, size / 2);
  const byes = Math.max(0, size - safeUnits.length);
  const slots = [];
  let unitIndex = 0;

  for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
    if (matchIndex < byes && unitIndex < safeUnits.length) {
      slots.push(safeUnits[unitIndex], null);
      unitIndex += 1;
    } else {
      slots.push(safeUnits[unitIndex] || null, safeUnits[unitIndex + 1] || null);
      unitIndex += 2;
    }
  }

  return slots;
}

function roundName(matchCount, roundIndex = 0) {
  if (matchCount >= 16) return 'Preliminares';
  if (matchCount === 8) return 'Oitavas de Final';
  if (matchCount === 4) return 'Quartas de Final';
  if (matchCount === 2) return 'Semifinal';
  if (matchCount === 1) return 'Final do Campeão';
  return `Fase ${roundIndex + 1}`;
}

function unitName(unit) {
  if (!unit) return 'Aguardando';
  if (unit.type === 'team') return unit.name;
  return unit.name || 'Aguardando';
}

function unitSubtitle(unit) {
  if (!unit) return 'A definir';
  if (unit.type === 'team') return unit.members.map(member => member.name).join(' • ');
  return unit.origin === 'convidado' ? 'Convidado Especial' : 'Membro Avalon';
}

function sameParticipant(a, b) {
  return unitName(a) === unitName(b);
}

function ensureModeSelected() {
  const modo = getModo();
  if (!modo) {
    showNotice('Escolha o modo da Liga', 'Selecione um modo antes de continuar.', 'warn');
    return null;
  }
  return modo;
}

function minimumForMode(modo) {
  if (!modo) return 8;
  if (modo.formato === '3v3') return 4;
  if (modo.formato === '1v5') return 6;
  return Number(modo.minimo || 8);
}

function validateParticipantCount(modo) {
  const count = ligaState.participantes.length;
  const min = minimumForMode(modo);
  if (count < min) {
    showNotice('Participantes insuficientes', `Este modo precisa de pelo menos ${min} participantes confirmados.`, 'warn');
    return false;
  }
  return true;
}

function participantSignature(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => participantKey(item?.name || item?.nome || item))
    .filter(Boolean)
    .sort()
    .join('|');
}

function participantDrawReady() {
  return ligaState.participantes.length > 0
    && ligaState.ordem.length === ligaState.participantes.length
    && participantSignature(ligaState.ordem) === participantSignature(ligaState.participantes);
}

function requireParticipantDraw(action = 'continuar') {
  const modo = ensureModeSelected();
  if (!modo || !validateParticipantCount(modo)) return false;
  if (!participantDrawReady()) {
    showNotice(
      'Sorteio de participantes pendente',
      `Antes de ${action}, use o botão “Sortear participantes” para confirmar a ordem oficial da Liga.`,
      'warn'
    );
    return false;
  }
  return true;
}

function resetParticipantDraw() {
  ligaState.ordem = [];
  resetPreparedStructure();
}

function addParticipant(participant, silent = false) {
  const name = String(participant?.name || '').trim();
  const key = participantKey(name);
  if (!key) {
    if (!silent) showNotice('Nick inválido', 'Digite um nick válido para adicionar à Liga.', 'warn');
    return false;
  }
  if (name.length > 24) {
    if (!silent) showNotice('Nick muito longo', 'Use no máximo 24 caracteres.', 'warn');
    return false;
  }
  if (ligaState.participantes.some(item => participantKey(item.name) === key)) {
    if (!silent) showNotice('Participante duplicado', `${name} já está na Liga.`, 'warn');
    return false;
  }
  ligaState.participantes.push({ name, origin: participant.origin || 'avalon', type: 'player' });
  ligaState.ordem = [];
  resetPreparedStructure();
  saveLiga();
  if (!silent) showNotice('Participante adicionado', `${name} entrou na Liga.`, 'success');
  return true;
}

function removeParticipant(name) {
  const key = participantKey(name);
  ligaState.participantes = ligaState.participantes.filter(item => participantKey(item.name) !== key);
  ligaState.ordem = [];
  ligaState.manualTeams = normalizeManualTeams(ligaState.manualTeams.map(team => ({
    ...team,
    members: (team.members || []).filter(item => participantKey(item.name) !== key)
  })));
  resetPreparedStructure();
  saveLiga();
}

function participantIsSelected(name) {
  const key = participantKey(name);
  return ligaState.participantes.some(item => participantKey(item.name) === key);
}

function renderModes() {
  const grid = $('#league-mode-grid');
  if (!grid) return;
  grid.innerHTML = ligaState.modos.map(modo => `
    <button class="league-mode-card medieval-card ${ligaState.modoId === modo.id ? 'active' : ''}" type="button" data-mode-id="${modo.id}">
      <span class="material-symbols-outlined" aria-hidden="true">${modo.formato === '1v1' ? 'swords' : modo.formato === '3v3' ? 'groups' : 'sports_mma'}</span>
      <small>${modo.formato} • ${modo.jogadoresPorSala} jogadores por sala</small>
      <strong>${modo.titulo}</strong>
      <span>${modo.nome}</span>
      <p>${modo.descricao}</p>
    </button>
  `).join('');

  $$('[data-mode-id]').forEach(button => {
    button.addEventListener('click', async () => {
      const changeMode = () => {
        ligaState.modoId = button.dataset.modeId;
        ligaState.ordem = [];
        ligaState.teamMode = 'auto';
        ligaState.manualTeams = [];
        resetPreparedStructure();
        saveLiga();
        renderAll();
        showNotice('Modo selecionado', 'A Liga foi preparada para o modo escolhido.', 'success');
      };

      if (ligaState.bracket) {
        const ok = await confirmNotice('Alterar modo da Liga?', 'Alterar o modo apagará as chaves atuais.', 'Alterar modo');
        if (!ok) return;
      }
      changeMode();
    });
  });
}

function teamSizeForCurrentParticipants(modo) {
  if (!isTeamMode(modo)) return 0;
  const count = ligaState.participantes.length;
  if (count % 3 === 0 && count >= 6) return 3;
  if (count >= 4) return 2;
  return 3;
}

function previewFormat(modo) {
  if (!modo) return '';
  const count = ligaState.participantes.length;
  if (!count) return 'Aguardando participantes';

  if (modo.formato === '1v1') {
    const size = nextPowerOfTwo(count);
    const direct = Math.max(0, size - count);
    return `Chave de ${size}${direct ? ` • ${direct} avanço${direct === 1 ? '' : 's'} direto${direct === 1 ? '' : 's'}` : ''}`;
  }

  if (modo.formato === '3v3') {
    const size = teamSizeForCurrentParticipants(modo);
    const teams = Math.floor(count / size);
    const reserves = count % size;
    const label = size === 2 ? '2v2 adaptado' : '3v3';
    const bracketSize = nextPowerOfTwo(Math.max(2, teams));
    return `${label} • ${teams} times • chave de ${bracketSize}${reserves ? ` • ${reserves} reserva${reserves === 1 ? '' : 's'}` : ''}`;
  }

  if (modo.formato === '1v5') {
    const groupSize = Number(modo.jogadoresPorSala || 6);
    const groups = Math.ceil(count / groupSize);
    if (groups <= 1) return 'Grupo final único • definir Top 3';
    return `${groups} grupos • Top 3 de cada grupo avança à final`;
  }

  return 'Formato pronto';
}

function renderModeSummary() {
  const title = $('#league-selected-mode-title');
  const desc = $('#league-selected-mode-desc');
  const meta = $('#league-selected-mode-meta');
  const modo = getModo();
  if (!title || !desc || !meta) return;
  if (!modo) {
    title.textContent = 'Nenhum modo escolhido';
    desc.textContent = 'Escolha um modo para preparar as regras da disputa.';
    meta.innerHTML = '';
    return;
  }
  title.textContent = `${modo.titulo} — ${modo.nome}`;
  desc.textContent = modo.descricao;
  const teamSize = teamSizeForCurrentParticipants(modo);
  meta.innerHTML = `
    <span><strong>Formato:</strong> ${modo.formato}${teamSize === 2 ? ' / 2v2 adaptado' : ''}</span>
    <span><strong>Sala:</strong> ${modo.jogadoresPorSala} jogadores</span>
    <span><strong>Mínimo:</strong> ${minimumForMode(modo)} confirmados</span>
    <span><strong>Mapas:</strong> ${modo.mapas.length}</span>
    <span><strong>Previsão:</strong> ${previewFormat(modo)}</span>
  `;
}

function renderParticipants() {
  const selectedBox = $('#selected-participants');
  const counter = $('#league-counter');
  const search = $('#member-search');
  if (counter) counter.textContent = `${ligaState.participantes.length} confirmado${ligaState.participantes.length === 1 ? '' : 's'}`;

  if (selectedBox) {
    selectedBox.innerHTML = ligaState.participantes.length
      ? ligaState.participantes.map(item => `
        <span class="participant-chip ${item.origin === 'convidado' ? 'guest' : ''}">
          ${item.name}
          <small>${item.origin === 'convidado' ? 'Convidado Especial' : 'Avalon'}</small>
          <button type="button" data-remove-participant="${item.name}" aria-label="Remover ${item.name}">×</button>
        </span>
      `).join('')
      : '<p class="league-muted">Nenhum participante confirmado ainda. Use a busca acima para adicionar membros.</p>';

    $$('[data-remove-participant]').forEach(button => {
      button.addEventListener('click', () => {
        removeParticipant(button.dataset.removeParticipant);
        renderAll();
      });
    });
  }

  if (search) renderMemberSuggestions(search.value || '');
}

function renderMemberSuggestions(query = '') {
  const target = $('#member-suggestions');
  if (!target) return;

  const normalized = participantKey(query);
  if (!normalized) {
    target.innerHTML = '<p class="league-muted">Digite para encontrar um membro da guilda.</p>';
    return;
  }

  const suggestions = ligaState.membrosAvalon
    .filter(member => participantKey(member.nome).includes(normalized))
    .filter(member => !participantIsSelected(member.nome))
    .slice(0, 8);

  target.innerHTML = suggestions.length
    ? suggestions.map(member => `
      <button class="member-suggestion" type="button" data-add-member="${member.nome}">
        <strong>${member.nome}</strong>
        <small>${member.status_participacao === 'ausente' ? 'Ausente no registro' : 'Membro Avalon'}</small>
      </button>
    `).join('')
    : '<p class="league-muted">Nenhum membro encontrado ou todos já foram adicionados.</p>';

  $$('[data-add-member]').forEach(button => {
    button.addEventListener('click', () => {
      addParticipant({ name: button.dataset.addMember, origin: 'avalon', type: 'player' });
      const input = $('#member-search');
      if (input) input.value = '';
      renderAll();
    });
  });
}

function addGuest() {
  const input = $('#guest-name');
  const name = input?.value.trim();
  if (!name) {
    showNotice('Nick obrigatório', 'Digite o nick do convidado especial.', 'warn');
    return;
  }
  if (addParticipant({ name, origin: 'convidado', type: 'player' })) {
    input.value = '';
    renderAll();
  }
}

function resetPreparedStructure() {
  ligaState.bracket = null;
  ligaState.phaseIndex = 0;
  ligaState.battleStarted = false;
}

function shuffleParticipants() {
  const modo = ensureModeSelected();
  if (!modo || !validateParticipantCount(modo)) return;
  ligaState.ordem = shuffleArray(ligaState.participantes);
  resetPreparedStructure();
  saveLiga();
  renderAll();
  showNotice('Participantes da Liga definidos', 'A ordem da Liga foi definida com sucesso. Agora gere as chaves.', 'success');
}

function renderDrawnOrder() {
  const box = $('#drawn-order');
  if (!box) return;
  const order = ligaState.ordem.length ? ligaState.ordem : [];
  box.innerHTML = order.length
    ? order.map((item, index) => `
      <div class="drawn-item">
        <strong>${index + 1}</strong>
        <span>${item.name}</span>
        <small>${item.origin === 'convidado' ? 'Convidado Especial' : 'Avalon'}</small>
      </div>
    `).join('')
    : '<p class="league-muted">A ordem sorteada aparecerá aqui.</p>';
}

function buildTeams(order, size = 3) {
  const teams = [];
  const reserves = [];
  for (let i = 0; i < order.length; i += size) {
    const chunk = order.slice(i, i + size);
    if (chunk.length === size) {
      teams.push({
        type: 'team',
        name: `Equipe ${teams.length + 1}`,
        members: chunk,
        origin: 'time',
        teamSize: size
      });
    } else {
      reserves.push(...chunk);
    }
  }
  return { teams, reserves };
}

function normalizeManualTeams(teams = []) {
  if (!Array.isArray(teams)) return [];
  return teams.map((team, index) => ({
    id: team.id || `manual-team-${index + 1}`,
    name: team.name || `Equipe ${index + 1}`,
    members: Array.isArray(team.members) ? team.members.filter(Boolean) : []
  }));
}

function ensureManualTeams() {
  const modo = getModo();
  if (!isTeamMode(modo)) {
    ligaState.manualTeams = [];
    return;
  }

  const size = teamSizeForCurrentParticipants(modo);
  const expected = Math.max(2, Math.ceil(ligaState.participantes.length / Math.max(1, size)));
  if (!ligaState.manualTeams.length) {
    ligaState.manualTeams = Array.from({ length: expected }, (_, index) => ({
      id: `manual-team-${index + 1}`,
      name: `Equipe ${index + 1}`,
      members: []
    }));
    return;
  }

  ligaState.manualTeams = normalizeManualTeams(ligaState.manualTeams);
  while (ligaState.manualTeams.length < 2) {
    ligaState.manualTeams.push({
      id: `manual-team-${ligaState.manualTeams.length + 1}`,
      name: `Equipe ${ligaState.manualTeams.length + 1}`,
      members: []
    });
  }
}

function assignedManualKeys() {
  return new Set(ligaState.manualTeams.flatMap(team => (team.members || []).map(member => participantKey(member.name))));
}

function unassignedManualParticipants() {
  const assigned = assignedManualKeys();
  return ligaState.participantes.filter(participant => !assigned.has(participantKey(participant.name)));
}

function setTeamMode(mode) {
  ligaState.teamMode = mode === 'manual' ? 'manual' : 'auto';
  resetPreparedStructure();
  if (ligaState.teamMode === 'manual') ensureManualTeams();
  saveLiga();
  renderAll();
  showNotice(
    ligaState.teamMode === 'manual' ? 'Definição manual ativada' : 'Sorteio automático ativado',
    ligaState.teamMode === 'manual'
      ? 'Monte as equipes manualmente antes de gerar as chaves.'
      : 'As equipes serão formadas pelo sorteio dos participantes.',
    'success'
  );
}

function shuffleTeams() {
  const modo = ensureModeSelected();
  if (!modo || !isTeamMode(modo) || !validateParticipantCount(modo)) return;
  ligaState.teamMode = 'auto';
  ligaState.ordem = shuffleArray(ligaState.participantes);
  ligaState.manualTeams = [];
  resetPreparedStructure();
  saveLiga();
  renderAll();
  showNotice('Equipes definidas', 'Equipes sorteadas automaticamente. Agora gere as chaves e revise ou sorteie os mapas da Liga.', 'success');
}


function saveManualTeams() {
  if (!isTeamMode(getModo())) return;
  ensureManualTeams();
  saveLiga();
  renderAll();
  showNotice('Equipes definidas', 'Equipes manuais salvas. Agora gere as chaves e revise ou sorteie os mapas da Liga.', 'success');
}

function fillManualTeamsWithRemaining() {
  const modo = ensureModeSelected();
  if (!modo || !isTeamMode(modo) || !validateParticipantCount(modo)) return;
  ligaState.teamMode = 'manual';
  ensureManualTeams();

  const teamSize = teamSizeForCurrentParticipants(modo);
  let remaining = shuffleArray(unassignedManualParticipants());

  ligaState.manualTeams.forEach(team => {
    team.members = team.members || [];
    while (team.members.length < teamSize && remaining.length) {
      team.members.push(remaining.shift());
    }
  });

  while (remaining.length >= teamSize) {
    ligaState.manualTeams.push({
      id: `manual-team-${Date.now()}-${ligaState.manualTeams.length + 1}`,
      name: `Equipe ${ligaState.manualTeams.length + 1}`,
      members: remaining.splice(0, teamSize)
    });
  }

  resetPreparedStructure();
  saveLiga();
  renderAll();

  if (remaining.length) {
    showNotice(
      'Restantes sorteados',
      `${remaining.length} participante${remaining.length === 1 ? '' : 's'} ficou${remaining.length === 1 ? '' : 'ram'} sem equipe completa e continuará disponível/reserva.`,
      'warn'
    );
  } else {
    showNotice('Equipes definidas', 'Todos os participantes restantes foram distribuídos em equipes completas. Agora gere as chaves e revise ou sorteie os mapas da Liga.', 'success');
  }
}

function addManualTeam() {
  ensureManualTeams();
  ligaState.manualTeams.push({
    id: `manual-team-${Date.now()}`,
    name: `Equipe ${ligaState.manualTeams.length + 1}`,
    members: []
  });
  resetPreparedStructure();
  saveLiga();
  renderAll();
}

async function removeManualTeam(index) {
  const team = ligaState.manualTeams[index];
  if (!team) return;
  const ok = await confirmNotice('Remover equipe?', `${team.name} será removida e seus membros voltarão para a lista disponível.`, 'Remover');
  if (!ok) return;
  ligaState.manualTeams.splice(index, 1);
  ligaState.manualTeams = normalizeManualTeams(ligaState.manualTeams).map((item, idx) => ({ ...item, name: `Equipe ${idx + 1}` }));
  resetPreparedStructure();
  saveLiga();
  renderAll();
}

function assignManualMember(teamIndex, memberName) {
  ensureManualTeams();
  const participant = ligaState.participantes.find(item => participantKey(item.name) === participantKey(memberName));
  const team = ligaState.manualTeams[teamIndex];
  if (!participant || !team) return;

  const modo = getModo();
  const teamSize = teamSizeForCurrentParticipants(modo);
  if ((team.members || []).length >= teamSize) {
    showNotice('Equipe completa', `${team.name} já possui ${teamSize} jogador${teamSize === 1 ? '' : 'es'}.`, 'warn');
    return;
  }

  ligaState.manualTeams.forEach(item => {
    item.members = (item.members || []).filter(member => participantKey(member.name) !== participantKey(participant.name));
  });

  team.members = [...(team.members || []), participant];
  resetPreparedStructure();
  saveLiga();
  renderAll();
}

function removeManualMember(teamIndex, memberName) {
  const team = ligaState.manualTeams[teamIndex];
  if (!team) return;
  team.members = (team.members || []).filter(member => participantKey(member.name) !== participantKey(memberName));
  resetPreparedStructure();
  saveLiga();
  renderAll();
}

function manualTeamResult(modo) {
  const teamSize = teamSizeForCurrentParticipants(modo);
  const teams = [];
  const reserves = [];
  const assigned = new Set();

  normalizeManualTeams(ligaState.manualTeams).forEach((team, index) => {
    const members = (team.members || []).filter(Boolean);
    const unit = {
      type: 'team',
      name: team.name || `Equipe ${index + 1}`,
      members,
      origin: 'time',
      teamSize
    };

    if (members.length === teamSize) {
      teams.push(unit);
      members.forEach(member => assigned.add(participantKey(member.name)));
    } else if (members.length > 0) {
      reserves.push(...members.map(member => ({ ...member, reserveReason: `${unit.name} incompleta` })));
      members.forEach(member => assigned.add(participantKey(member.name)));
    }
  });

  ligaState.participantes.forEach(participant => {
    if (!assigned.has(participantKey(participant.name))) {
      reserves.push({ ...participant, reserveReason: 'Não alocado em equipe' });
    }
  });

  return { teams, reserves, teamSize };
}

function teamControlsHtml(modo) {
  if (!isTeamMode(modo)) return '';
  const teamSize = teamSizeForCurrentParticipants(modo);
  const label = teamSize === 2 ? '2v2 adaptado' : '3v3';
  const modeNote = teamSize === 2
    ? 'Quantidade atual usando formato adaptado 2v2.'
    : 'Formato padrão com equipes de 3 jogadores.';

  const builder = ligaState.teamMode === 'manual' ? manualTeamBuilderHtml(modo, teamSize) : '';

  return `
    <div class="team-controls-card medieval-card gold-frame">
      <div class="team-controls-head">
        <div>
          <p class="eyebrow">Equipes da Liga</p>
          <h3>${label}</h3>
          <p>${modeNote}</p>
        </div>
        <span class="team-mode-badge">${ligaState.teamMode === 'manual' ? 'Definição manual' : 'Sorteio automático'}</span>
      </div>

      <div class="team-action-row">
        <button class="btn btn-secondary" type="button" data-shuffle-teams>
          <span class="material-symbols-outlined" aria-hidden="true">shuffle</span>
          Sortear equipes
        </button>
        <button class="btn btn-ghost" type="button" data-manual-teams>
          <span class="material-symbols-outlined" aria-hidden="true">edit_note</span>
          Definir equipes manualmente
        </button>
      </div>

      ${builder}
    </div>
  `;
}

function manualTeamBuilderHtml(modo, teamSize) {
  ensureManualTeams();
  const available = unassignedManualParticipants();

  return `
    <div class="manual-team-builder">
      <div class="manual-team-info">
        <p class="league-muted">Monte equipes completas com ${teamSize} jogador${teamSize === 1 ? '' : 'es'}. Equipes incompletas entram como reserva. Você pode salvar equipes fixas e sortear apenas quem sobrou.</p>
        <div class="manual-team-toolbar">
          <button class="btn btn-ghost" type="button" data-add-manual-team>
            <span class="material-symbols-outlined" aria-hidden="true">add</span>
            Adicionar equipe
          </button>
          <button class="btn btn-secondary" type="button" data-randomize-remaining>
            <span class="material-symbols-outlined" aria-hidden="true">shuffle</span>
            Sortear restantes
          </button>
          <button class="btn btn-secondary" type="button" data-save-manual-teams>
            <span class="material-symbols-outlined" aria-hidden="true">save</span>
            Salvar equipes
          </button>
        </div>
      </div>

      <div class="manual-team-grid">
        ${ligaState.manualTeams.map((team, index) => `
          <article class="manual-team-card">
            <div class="manual-team-title">
              <strong>${team.name}</strong>
              <small>${(team.members || []).length}/${teamSize}</small>
              ${ligaState.manualTeams.length > 2 ? `<button type="button" data-remove-manual-team="${index}" aria-label="Remover ${team.name}">×</button>` : ''}
            </div>

            <div class="manual-team-members">
              ${(team.members || []).length ? team.members.map(member => `
                <span class="participant-chip">
                  ${member.name}
                  <button type="button" data-remove-manual-member="${member.name}" data-team-index="${index}" aria-label="Remover ${member.name}">×</button>
                </span>
              `).join('') : '<p class="league-muted">Nenhum membro nesta equipe.</p>'}
            </div>

            <div class="manual-team-add">
              <select data-team-picker="${index}">
                <option value="">Adicionar membro...</option>
                ${available.map(member => `<option value="${member.name}">${member.name}</option>`).join('')}
              </select>
              <button class="btn btn-secondary" type="button" data-add-manual-member="${index}">Adicionar</button>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTeamControls() {
  const target = $('#league-team-controls');
  if (!target) return;
  const modo = getModo();
  target.innerHTML = teamControlsHtml(modo);

  target.querySelector('[data-shuffle-teams]')?.addEventListener('click', shuffleTeams);
  target.querySelector('[data-manual-teams]')?.addEventListener('click', () => setTeamMode('manual'));
  target.querySelector('[data-add-manual-team]')?.addEventListener('click', addManualTeam);
  target.querySelector('[data-randomize-remaining]')?.addEventListener('click', fillManualTeamsWithRemaining);
  target.querySelector('[data-save-manual-teams]')?.addEventListener('click', saveManualTeams);

  target.querySelectorAll('[data-remove-manual-team]').forEach(button => {
    button.addEventListener('click', () => removeManualTeam(Number(button.dataset.removeManualTeam)));
  });

  target.querySelectorAll('[data-add-manual-member]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.addManualMember);
      const select = target.querySelector(`[data-team-picker="${index}"]`);
      if (select?.value) assignManualMember(index, select.value);
    });
  });

  target.querySelectorAll('[data-remove-manual-member]').forEach(button => {
    button.addEventListener('click', () => removeManualMember(Number(button.dataset.teamIndex), button.dataset.removeManualMember));
  });
}

function createMatch(id, roundIndex, matchIndex, unitA = null, unitB = null, special = '') {
  return {
    id,
    roundIndex,
    matchIndex,
    special,
    unitA,
    unitB,
    winner: null,
    loser: null,
    manualWinnerName: null,
    auto: false
  };
}

function createEliminationBracket(units, mode, reserves = [], teamSize = 0) {
  const validUnits = Array.isArray(units) ? units.filter(Boolean) : [];
  const size = Math.max(2, nextPowerOfTwo(validUnits.length));
  const slots = arrangeFirstRoundSlots(validUnits, size);
  const totalRounds = Math.log2(size);
  const rounds = [];
  let matchCount = size / 2;

  for (let r = 0; r < totalRounds; r += 1) {
    const matches = [];
    if (r === 0) {
      for (let m = 0; m < matchCount; m += 1) {
        const unitA = slots[m * 2] || null;
        const unitB = slots[m * 2 + 1] || null;
        if (unitA || unitB) {
          matches.push(createMatch(`r${r + 1}m${m + 1}`, r, matches.length, unitA, unitB));
        }
      }
    } else {
      for (let m = 0; m < matchCount; m += 1) {
        matches.push(createMatch(`r${r + 1}m${m + 1}`, r, m));
      }
    }
    rounds.push({ id: `round-${r + 1}`, name: roundName(matchCount, r), arena: '', matches });
    matchCount = Math.max(1, matchCount / 2);
  }

  const bronze = validUnits.length >= 4
    ? { ...createMatch('bronze', totalRounds, 0, null, null, 'Disputa do Bronze'), arena: '' }
    : null;

  const bracket = {
    type: 'elimination',
    modeId: mode.id,
    modeName: mode.titulo,
    format: mode.formato,
    teamSize,
    rounds,
    bronze,
    reserves,
    podium: {}
  };
  recalculateElimination(bracket);
  return bracket;
}

function createSurvivalBracket(order, mode) {
  const groupSize = Number(mode.jogadoresPorSala || 6);

  /*
    Formato padrão:
    No 1v5, cada sala classifica Top 3.
    Para evitar grupos finais com 1 ou 2 jogadores, distribuímos os participantes
    de forma equilibrada quando houver mais de uma sala.
  */
  const groupCount = order.length <= groupSize ? 1 : Math.ceil(order.length / groupSize);
  const buckets = Array.from({ length: groupCount }, () => []);

  order.forEach((participant, index) => {
    buckets[index % groupCount].push(participant);
  });

  const groups = buckets.map((participants, index) => ({
    id: `g${index + 1}`,
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    participants,
    placements: { gold: null, silver: null, bronze: null }
  }));

  const hasClassificatoryGroups = groups.length > 1;
  const bracket = {
    type: 'survival',
    modeId: mode.id,
    modeName: mode.titulo,
    format: mode.formato,
    groups: hasClassificatoryGroups ? groups : [],
    groupsArena: '',
    final: hasClassificatoryGroups
      ? { id: 'final-survival', name: 'Final Survival', participants: [], arena: '', placements: { gold: null, silver: null, bronze: null } }
      : { id: 'final-survival', name: 'Final Survival', participants: groups[0]?.participants || [], arena: '', placements: { gold: null, silver: null, bronze: null } },
    podium: {}
  };
  updateSurvivalFinal(bracket);
  return bracket;
}

async function generateBracket() {
  const modo = ensureModeSelected();
  if (!modo || !validateParticipantCount(modo)) return;
  if (!requireParticipantDraw('gerar as chaves')) return;
  const order = ligaState.ordem;

  if (modo.formato === '3v3') {
    const teamSize = teamSizeForCurrentParticipants(modo);
    let teams = [];
    let reserves = [];

    if (ligaState.teamMode === 'manual') {
      ensureManualTeams();
      const manual = manualTeamResult(modo);
      teams = manual.teams;
      reserves = manual.reserves;
      if (teams.length < 2) {
        showNotice('Equipes manuais incompletas', 'Defina pelo menos 2 equipes completas, salve as equipes ou use “Sortear restantes” antes de gerar as chaves.', 'warn');
        return;
      }
    } else {
      const automatic = buildTeams(order, teamSize);
      teams = automatic.teams;
      reserves = automatic.reserves;
    }

    if (teams.length < 2) {
      showNotice('Times insuficientes', `Este modo precisa de pelo menos 2 equipes completas de ${teamSize} jogadores.`, 'warn');
      return;
    }

    ligaState.bracket = createEliminationBracket(teams, modo, reserves, teamSize);
    ligaState.bracket.teamMode = ligaState.teamMode;
    if (teamSize === 2) {
      showNotice('2v2 adaptado ativado', 'A quantidade atual não fechou bem para 3v3, então a Liga usará times de 2.', 'info');
    }
  } else if (modo.formato === '1v5') {
    ligaState.bracket = createSurvivalBracket(order, modo);
  } else {
    ligaState.bracket = createEliminationBracket(order, modo, []);
  }

  ligaState.phaseIndex = 0;
  ligaState.battleStarted = false;
  applySingleMapToAllPhases();
  saveLiga();
  renderAll();

  if (isTournamentStructureReady()) {
    await offerStartBattles();
  } else {
    showNotice('Liga iniciada', 'Participantes, modalidade e chaves foram preparados. A primeira fase já está disponível.', 'success');
  }
}

function recalculateElimination(bracket) {
  if (!bracket || bracket.type !== 'elimination') return;

  bracket.rounds.forEach((round, roundIndex) => {
    round.matches.forEach(match => {
      if (roundIndex > 0) {
        match.unitA = null;
        match.unitB = null;
      }
      match.winner = null;
      match.loser = null;
      match.auto = false;
    });
  });

  if (bracket.bronze) {
    bracket.bronze.unitA = null;
    bracket.bronze.unitB = null;
    bracket.bronze.winner = null;
    bracket.bronze.loser = null;
    bracket.bronze.auto = false;
  }

  bracket.podium = {};

  for (let r = 0; r < bracket.rounds.length; r += 1) {
    const round = bracket.rounds[r];
    round.matches.forEach((match, m) => {
      const candidates = [match.unitA, match.unitB].filter(Boolean);
      if (match.manualWinnerName) {
        match.winner = candidates.find(unit => unitName(unit) === match.manualWinnerName) || null;
        if (!match.winner) match.manualWinnerName = null;
      }
      if (!match.winner && match.unitA && !match.unitB) {
        match.winner = match.unitA;
        match.auto = true;
      }
      if (!match.winner && !match.unitA && match.unitB) {
        match.winner = match.unitB;
        match.auto = true;
      }
      if (!match.winner) return;

      const loser = match.unitA && match.unitB
        ? (sameParticipant(match.winner, match.unitA) ? match.unitB : match.unitA)
        : null;

      match.loser = loser;
      const nextRound = bracket.rounds[r + 1];
      if (nextRound) {
        const nextMatch = nextRound.matches[Math.floor(m / 2)];
        if (m % 2 === 0) nextMatch.unitA = match.winner;
        else nextMatch.unitB = match.winner;
      } else {
        bracket.podium.gold = match.winner;
        if (loser) bracket.podium.silver = loser;
      }

      if (bracket.bronze && r === bracket.rounds.length - 2 && loser) {
        if (m % 2 === 0) bracket.bronze.unitA = loser;
        else bracket.bronze.unitB = loser;
      }
    });
  }

  if (bracket.bronze) {
    const bronzeCandidates = [bracket.bronze.unitA, bracket.bronze.unitB].filter(Boolean);
    if (bracket.bronze.manualWinnerName) {
      bracket.bronze.winner = bronzeCandidates.find(unit => unitName(unit) === bracket.bronze.manualWinnerName) || null;
      if (!bracket.bronze.winner) bracket.bronze.manualWinnerName = null;
    }
    if (!bracket.bronze.winner && bracket.bronze.unitA && !bracket.bronze.unitB) {
      bracket.bronze.winner = bracket.bronze.unitA;
      bracket.bronze.auto = true;
    }
    if (!bracket.bronze.winner && !bracket.bronze.unitA && bracket.bronze.unitB) {
      bracket.bronze.winner = bracket.bronze.unitB;
      bracket.bronze.auto = true;
    }
    if (bracket.bronze.winner) {
      bracket.bronze.loser = bracket.bronze.unitA && bracket.bronze.unitB
        ? (sameParticipant(bracket.bronze.winner, bracket.bronze.unitA) ? bracket.bronze.unitB : bracket.bronze.unitA)
        : null;
      bracket.podium.bronze = bracket.bronze.winner;
    }
  }
}

async function chooseEliminationWinner(matchId, winnerName) {
  const bracket = ligaState.bracket;
  if (!bracket || bracket.type !== 'elimination') return;
  const allMatches = [...bracket.rounds.flatMap(round => round.matches), bracket.bronze].filter(Boolean);
  const match = allMatches.find(item => item.id === matchId);
  if (!match || match.auto) return;
  const candidates = [match.unitA, match.unitB].filter(Boolean);
  const winner = candidates.find(item => unitName(item) === winnerName);
  if (!winner) return;

  const ok = await confirmNotice('Confirmar vencedor', `Avançar ${unitName(winner)} para a próxima fase?`, 'Sim, avançar');
  if (!ok) return;

  ligaState.battleStarted = true;
  match.manualWinnerName = unitName(winner);
  match.winner = winner;
  match.auto = false;
  recalculateElimination(bracket);
  saveLiga();
  renderAll();
  await handlePhaseCompletion();
}

async function undoEliminationWinner(matchId) {
  const bracket = ligaState.bracket;
  if (!bracket || bracket.type !== 'elimination') return;
  const allMatches = [...bracket.rounds.flatMap(round => round.matches), bracket.bronze].filter(Boolean);
  const match = allMatches.find(item => item.id === matchId);
  if (!match) return;
  const ok = await confirmNotice('Desfazer resultado?', 'Fases seguintes poderão ser recalculadas.', 'Desfazer');
  if (!ok) return;
  match.manualWinnerName = null;
  match.winner = null;
  match.loser = null;
  match.auto = false;
  recalculateElimination(bracket);
  saveLiga();
  renderAll();
}

function placementName(place) {
  return PLACE_LABELS[place] || place;
}

function getPlacementByParticipant(placements, participantName) {
  return ['gold', 'silver', 'bronze'].find(place => placements?.[place]?.name === participantName) || null;
}

function nextPlacement(placements) {
  return ['gold', 'silver', 'bronze'].find(place => !placements?.[place]) || null;
}

function isPlacementComplete(target) {
  return Boolean(target?.placements?.gold && target?.placements?.silver && target?.placements?.bronze);
}

function orderedPlacements(target) {
  return ['gold', 'silver', 'bronze'].map(place => target?.placements?.[place]).filter(Boolean);
}

function updateSurvivalFinal(bracket) {
  if (!bracket || bracket.type !== 'survival') return;

  if (bracket.groups.length) {
    bracket.final.participants = bracket.groups.flatMap(group => orderedPlacements(group));
    const finalKeys = new Set(bracket.final.participants.map(item => participantKey(item.name)));
    for (const place of ['gold', 'silver', 'bronze']) {
      if (bracket.final.placements?.[place] && !finalKeys.has(participantKey(bracket.final.placements[place].name))) {
        bracket.final.placements[place] = null;
      }
    }
  }

  const placements = bracket.final.placements || {};
  bracket.podium = {
    gold: placements.gold || null,
    silver: placements.silver || null,
    bronze: placements.bronze || null
  };
}

async function pickSurvivalPlacement(targetId, name, isFinal = false) {
  const bracket = ligaState.bracket;
  if (!bracket || bracket.type !== 'survival') return;

  const target = isFinal
    ? bracket.final
    : bracket.groups.find(group => group.id === targetId);

  if (!target) return;

  const participant = target.participants.find(item => item.name === name);
  if (!participant) return;

  const currentPlace = getPlacementByParticipant(target.placements, participant.name);
  if (currentPlace) {
    const okRemove = await confirmNotice('Remover classificação?', `${participant.name} está como ${placementName(currentPlace)}. Deseja remover essa marcação?`, 'Remover');
    if (!okRemove) return;
    target.placements[currentPlace] = null;
  } else {
    const place = nextPlacement(target.placements);
    if (!place) {
      showNotice('Top 3 já definido', 'Limpe uma colocação antes de selecionar outro jogador.', 'warn');
      return;
    }
    const ok = await confirmNotice('Confirmar colocação', `Definir ${participant.name} como ${placementName(place)} em ${target.name}?`, 'Confirmar');
    if (!ok) return;
    target.placements[place] = participant;
  }

  ligaState.battleStarted = true;
  updateSurvivalFinal(bracket);
  saveLiga();
  renderAll();
  await handlePhaseCompletion();
}

async function clearSurvivalPlacements(targetId = '', isFinal = false) {
  const bracket = ligaState.bracket;
  if (!bracket || bracket.type !== 'survival') return;
  const target = isFinal ? bracket.final : bracket.groups.find(group => group.id === targetId);
  if (!target) return;
  const ok = await confirmNotice('Limpar Top 3?', `Deseja limpar as colocações de ${target.name}?`, 'Limpar');
  if (!ok) return;
  target.placements = { gold: null, silver: null, bronze: null };
  updateSurvivalFinal(bracket);
  saveLiga();
  renderAll();
}

function mapName(map) {
  if (!map) return '';
  return typeof map === 'string' ? map : (map.nome || map.name || '');
}

function mapDescription(map) {
  if (!map || typeof map === 'string') return '';
  return map.descricao || map.description || '';
}

function mapImage(map) {
  if (!map || typeof map === 'string') return '';
  return map.imagem || map.image || '';
}

function getModeMaps(modo = getModo()) {
  return Array.isArray(modo?.mapas) ? modo.mapas : [];
}

function findMapByName(name, modo = getModo()) {
  const key = slug(String(name || '').trim());
  return getModeMaps(modo).find(map => {
    const aliases = Array.isArray(map?.aliases) ? map.aliases : [];
    return [mapName(map), ...aliases].some(item => slug(item) === key);
  }) || null;
}

function mapCount(modo = getModo()) {
  return getModeMaps(modo).length;
}

function uniqueMapName(modo = getModo()) {
  const maps = getModeMaps(modo);
  return maps.length === 1 ? mapName(maps[0]) : '';
}

function randomMap() {
  const maps = getModeMaps();
  if (!maps.length) return '';
  return mapName(maps[Math.floor(Math.random() * maps.length)]);
}

function getPhases() {
  const bracket = ligaState.bracket;
  if (!bracket) return [];
  if (bracket.type === 'elimination') {
    const phases = bracket.rounds.map((round, index) => ({
      type: 'round',
      label: round.name,
      arena: round.arena || '',
      round,
      index
    }));
    const bronzeCandidates = [bracket.bronze?.unitA, bracket.bronze?.unitB].filter(Boolean);
    if (bracket.bronze && bronzeCandidates.length >= 2) {
      phases.push({
        type: 'bronze',
        label: 'Disputa do Bronze',
        arena: bracket.bronze.arena || '',
        match: bracket.bronze
      });
    }
    phases.push({ type: 'podium', label: 'Pódio Final', arena: '', podium: bracket.podium });
    return phases;
  }

  if (bracket.type === 'survival') {
    const phases = [];
    if (bracket.groups.length) {
      phases.push({ type: 'survival_groups', label: 'Salas Iniciais', arena: bracket.groupsArena || '', groups: bracket.groups });
    }
    phases.push({ type: 'survival_final', label: 'Final Survival', arena: bracket.final.arena || '', final: bracket.final });
    phases.push({ type: 'podium', label: 'Pódio Final', arena: '', podium: bracket.podium });
    return phases;
  }

  return [];
}

function clampPhaseIndex() {
  const phases = getPhases();
  if (!phases.length) {
    ligaState.phaseIndex = 0;
    return;
  }
  ligaState.phaseIndex = Math.max(0, Math.min(ligaState.phaseIndex, phases.length - 1));
}

function setPhaseArena(phase, arena) {
  if (!phase || phase.type === 'podium') return;
  if (phase.type === 'round') phase.round.arena = arena;
  if (phase.type === 'bronze') phase.match.arena = arena;
  if (phase.type === 'survival_groups') ligaState.bracket.groupsArena = arena;
  if (phase.type === 'survival_final') ligaState.bracket.final.arena = arena;
}

function phasesWithMaps() {
  return getPhases().filter(phase => phase.type !== 'podium');
}

function applySingleMapToAllPhases() {
  const modo = getModo();
  const maps = getModeMaps(modo);
  if (!ligaState.bracket || maps.length !== 1) return false;
  const only = mapName(maps[0]);
  phasesWithMaps().forEach(phase => {
    if (!phase.arena) setPhaseArena(phase, only);
  });
  return true;
}

function areMapsReady() {
  if (!ligaState.bracket) return false;
  applySingleMapToAllPhases();
  const phases = phasesWithMaps();
  return phases.length > 0 && phases.every(phase => Boolean(phase.arena));
}

function teamStructureReady(modo = getModo()) {
  if (!isTeamMode(modo)) return true;
  if (!ligaState.bracket || ligaState.bracket.type !== 'elimination') return false;
  const teams = ligaState.bracket.rounds?.[0]?.matches?.flatMap(match => [match.unitA, match.unitB]).filter(Boolean) || [];
  return teams.length >= 2;
}

function tournamentMissingStep() {
  const modo = getModo();
  if (!modo) return 'Escolha um modo da Liga antes de iniciar.';
  if (!ligaState.participantes.length) return 'Adicione os participantes antes de iniciar.';
  if (!validateParticipantCount(modo)) return 'Quantidade de participantes insuficiente para o modo selecionado.';
  if (!participantDrawReady()) return 'Sorteie os participantes antes de gerar ou iniciar a estrutura da Liga.';
  if (!ligaState.bracket) return 'Gere as chaves da Liga antes de iniciar.';
  if (isTeamMode(modo) && !teamStructureReady(modo)) return 'Defina equipes válidas antes de iniciar as batalhas.';
  if (!areMapsReady()) return 'Defina ou sorteie os mapas antes de iniciar.';
  return '';
}

function isTournamentStructureReady() {
  return !tournamentMissingStep();
}

async function offerStartBattles() {
  if (ligaState.battleStarted) return true;
  applySingleMapToAllPhases();
  saveLiga();
  renderAll();

  const missing = tournamentMissingStep();
  if (missing) {
    showNotice('Estrutura incompleta', missing, 'warn');
    return false;
  }

  const ok = await confirmNotice('Estrutura do torneio definida', 'Iniciar as batalhas?', 'Confirmar');
  if (!ok) {
    showNotice('Revisão mantida', 'A estrutura foi mantida para você revisar participantes, equipes, chaves ou mapas.', 'info');
    return false;
  }

  ligaState.phaseIndex = 0;
  ligaState.battleStarted = true;
  saveLiga();
  renderAll();
  setTimeout(() => {
    document.querySelector('.league-bracket-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showNotice('Batalhas iniciadas', 'A Etapa 3 foi aberta. Clique no vencedor de cada confronto para registrar o avanço.', 'success');
  }, 80);
  return true;
}

async function drawCurrentPhaseMap() {
  const phases = getPhases();
  const phase = phases[ligaState.phaseIndex];
  const modo = getModo();
  const maps = getModeMaps(modo);
  if (!phase || phase.type === 'podium') {
    showNotice('Mapa indisponível', 'O pódio não precisa de mapa.', 'warn');
    return;
  }
  if (maps.length === 1) {
    const only = mapName(maps[0]);
    setPhaseArena(phase, only);
    saveLiga();
    renderAll();
    showNotice(
      ligaState.battleStarted ? 'Mapa da fase atualizado' : 'Mapa único',
      ligaState.battleStarted
        ? `${only}: mapa único aplicado sem reiniciar o torneio.`
        : `${only}: sorteio indisponível para este modo.`,
      'info'
    );
    return;
  }
  const previousMap = phase.arena || '';
  let map = randomMap();
  if (maps.length > 1) {
    let guard = 0;
    while (map === previousMap && guard < 8) {
      map = randomMap();
      guard += 1;
    }
  }
  setPhaseArena(phase, map);
  saveLiga();
  renderAll();
  showNotice(
    ligaState.battleStarted ? 'Mapa da fase atualizado' : 'Mapa sorteado',
    `${phase.label}: ${map}${ligaState.battleStarted ? ' — torneio mantido em andamento.' : ''}`,
    'success'
  );
}

async function drawAllMaps() {
  const bracket = ligaState.bracket;
  const modo = ensureModeSelected();
  if (!modo) return;
  if (!participantDrawReady()) {
    showNotice('Sorteio de participantes pendente', 'Sorteie os participantes antes de sortear os mapas da Liga.', 'warn');
    return;
  }
  if (!bracket) {
    showNotice('Gere as chaves primeiro', 'Gere as chaves antes de sortear os mapas.', 'warn');
    return;
  }
  const maps = getModeMaps(modo);
  getPhases().forEach(phase => {
    if (phase.type !== 'podium') setPhaseArena(phase, maps.length === 1 ? mapName(maps[0]) : randomMap());
  });
  saveLiga();
  renderAll();
  if (ligaState.battleStarted) {
    showNotice(maps.length === 1 ? 'Mapa único atualizado' : 'Mapas atualizados', maps.length === 1 ? 'Todas as fases mantêm o mapa único do modo.' : 'Os mapas das fases foram atualizados sem reiniciar o torneio.', 'success');
  } else if (isTournamentStructureReady()) {
    await offerStartBattles();
  } else {
    showNotice(maps.length === 1 ? 'Mapa único aplicado' : 'Mapas sorteados', maps.length === 1 ? 'Todas as fases receberam o mapa único do modo.' : 'Todas as fases receberam mapas. Revise a estrutura antes de iniciar.', 'success');
  }
}

function isMatchComplete(match) {
  return Boolean(match?.winner);
}

function isPhaseComplete(phase) {
  if (!phase || phase.type === 'podium') return false;
  if (phase.type === 'round') {
    const validMatches = (phase.round?.matches || []).filter(match => match.unitA || match.unitB || match.winner || match.manualWinnerName);
    return validMatches.length > 0 && validMatches.every(match => isMatchComplete(match));
  }
  if (phase.type === 'bronze') {
    const candidates = [phase.match?.unitA, phase.match?.unitB].filter(Boolean);
    return candidates.length >= 2 && isMatchComplete(phase.match);
  }
  if (phase.type === 'survival_groups') return Array.isArray(phase.groups) && phase.groups.length > 0 && phase.groups.every(group => isPlacementComplete(group));
  if (phase.type === 'survival_final') return isPlacementComplete(phase.final);
  return false;
}

function isPhaseAccessible(phases, index) {
  if (index <= 0) return true;
  for (let i = 0; i < index; i += 1) {
    if (!isPhaseComplete(phases[i])) return false;
  }
  return true;
}

async function advanceToNextPhaseWithConfirmation() {
  const phases = getPhases();
  clampPhaseIndex();
  const phase = phases[ligaState.phaseIndex];

  if (!phase || phase.type === 'podium') return false;

  if (!isPhaseComplete(phase)) {
    showNotice('Rodada em andamento', `Conclua ${phase.label} antes de avançar.`, 'warn');
    return false;
  }

  const nextIndex = ligaState.phaseIndex + 1;
  const next = phases[nextIndex];
  if (!next) return false;

  const title = `${phase.label} concluída`;
  const message = next.type === 'podium'
    ? 'Ver pódio final?'
    : `Avançar para ${next.label}?`;

  const ok = await confirmNotice(title, message, 'Confirmar', 'Revisar');
  if (!ok) {
    showNotice('Revisão mantida', `Você continua em ${phase.label} para conferir ou corrigir os classificados.`, 'info');
    return false;
  }

  ligaState.phaseIndex = nextIndex;
  saveLiga();
  renderAll();
  setTimeout(() => {
    const target = next.type === 'podium' ? '#league-podium' : '#league-bracket';
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
  return true;
}

async function handlePhaseCompletion() {
  const phases = getPhases();
  clampPhaseIndex();
  const phase = phases[ligaState.phaseIndex];
  if (!isPhaseComplete(phase)) return;
  await advanceToNextPhaseWithConfirmation();
}

function phaseProgressLabel(phase, current, total) {
  if (!phase) return 'Aguardando fase';
  if (phase.type === 'podium') return 'Resultado da Liga';
  return `Fase ${current + 1} de ${total}`;
}

function phaseHelpText(phase) {
  if (!phase) return '';
  if (phase.type === 'podium') return 'Confira o resultado oficial da Liga Avalon.';
  if (phase.type === 'survival_groups') return 'Defina o Top 3 de cada sala para formar a final.';
  if (phase.type === 'survival_final') return 'Defina o Top 3 final para revelar o pódio.';
  if (phase.type === 'bronze') return 'Disputa válida pelo terceiro lugar da Liga.';
  return 'Escolha os classificados da rodada atual.';
}

function renderPhaseProgressDots(phases, current) {
  return `
    <div class="round-progress-dots" aria-hidden="true">
      ${phases.map((phase, index) => `
        <span class="round-dot ${index === current ? 'active' : ''} ${index < current ? 'complete' : ''}" title="${phase.label}"></span>
      `).join('')}
    </div>
  `;
}

function renderPhaseNav(phases) {
  clampPhaseIndex();
  const current = ligaState.phaseIndex;
  const phase = phases[current];
  const hasPrev = current > 0;
  const canGoNext = current < phases.length - 1 && isPhaseComplete(phase);
  const next = phases[current + 1];
  const nextLabel = next?.type === 'podium' ? 'Pódio Final' : next?.label || 'próxima fase';

  return `
    <div class="league-round-navigator medieval-card blue-frame">
      <button class="round-nav-control prev" type="button" data-phase-prev ${!hasPrev ? 'disabled' : ''} aria-label="Rodada anterior">
        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
      </button>

      <div class="round-nav-center">
        <span class="round-kicker">Rodada atual</span>
        <h3>${phase?.label || 'Aguardando rodada'}</h3>
        <p class="round-progress-label">${phaseProgressLabel(phase, current, phases.length)}</p>
        ${renderPhaseProgressDots(phases, current)}
        <p class="round-helper">${phaseHelpText(phase)}</p>
      </div>

      <button class="round-nav-control next" type="button" data-phase-next ${!canGoNext ? 'disabled' : ''} aria-label="Avançar para ${nextLabel}">
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>

      <div class="round-nav-actions">
        <button class="btn btn-secondary download-phase-card" type="button" data-download-phase-card>
          <span class="material-symbols-outlined" aria-hidden="true">download</span>
          Baixar chave da rodada
        </button>
      </div>
    </div>
  `;
}

function renderPhaseMap(phase) {
  if (!phase || phase.type === 'podium') return '';
  const modo = getModo();
  const maps = getModeMaps(modo);
  const single = maps.length === 1;
  const arenaName = phase.arena || (single ? mapName(maps[0]) : '');
  const arenaData = findMapByName(arenaName, modo) || (single ? maps[0] : null);
  const image = mapImage(arenaData);
  const description = mapDescription(arenaData) || (arenaName
    ? 'Mapa selecionado para esta fase da Liga Avalon.'
    : 'Sorteie um mapa para definir o campo da fase.');
  const statusText = single ? 'Mapa único — sorteio indisponível' : `${phase.label} usa um único mapa sorteado para manter o fluxo limpo e fácil de organizar.`;

  return `
    <div class="league-phase-map medieval-card gold-frame ${single ? 'single-map' : ''}">
      <p class="eyebrow">Mapa da fase</p>
      <h3>${arenaName || 'Aguardando sorteio'}</h3>
      ${image ? `
        <figure class="league-map-preview">
          <img src="${rootPath(image)}" alt="Mapa ${arenaName}" loading="lazy" decoding="async" width="960" height="540" />
        </figure>
      ` : `
        <div class="league-map-preview empty-map">
          <span class="material-symbols-outlined" aria-hidden="true">map</span>
          <strong>Aguardando mapa</strong>
        </div>
      `}
      <p>${description}</p>
      <small class="map-draw-status">${statusText}</small>
      <button class="btn btn-secondary" type="button" data-draw-phase-map ${single ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">${single ? 'lock' : 'casino'}</span>
        ${single ? 'Mapa único' : 'Sortear mapa da fase'}
      </button>
    </div>
  `;
}

function renderUnit(unit, options = {}) {
  const {
    matchId = '',
    selectable = false,
    isWinner = false,
    isLoser = false
  } = options;

  const classes = [
    'league-unit',
    selectable && unit ? 'selectable' : '',
    isWinner ? 'winner' : '',
    isLoser ? 'loser' : '',
    !unit ? 'empty' : ''
  ].filter(Boolean).join(' ');

  if (selectable && unit) {
    return `
      <button class="${classes}" type="button" data-winner-match="${matchId}" data-winner-name="${unitName(unit)}" title="Clique para avançar ${unitName(unit)}">
        <strong>${unitName(unit)}</strong>
        <small>${unitSubtitle(unit)}</small>
      </button>
    `;
  }

  return `
    <div class="${classes}">
      <strong>${unitName(unit)}</strong>
      <small>${unitSubtitle(unit)}</small>
    </div>
  `;
}

function matchTemplate(match, phaseLabel = '') {
  const candidates = [match.unitA, match.unitB].filter(Boolean);
  const complete = Boolean(match.winner);
  const winnerName = match.winner ? unitName(match.winner) : '';
  const canSelect = !match.auto && !complete && candidates.length === 2;
  const loserName = match.loser ? unitName(match.loser) : '';
  return `
    <article class="league-match medieval-card ${complete ? 'complete' : ''}">
      <div class="league-match-head">
        <span>${match.special || phaseLabel}</span>
        ${match.auto ? '<small>Avanço direto</small>' : ''}
        ${complete && !match.auto ? '<small>Resultado definido</small>' : ''}
      </div>
      ${renderUnit(match.unitA, {
        matchId: match.id,
        selectable: canSelect,
        isWinner: winnerName === unitName(match.unitA),
        isLoser: loserName === unitName(match.unitA)
      })}
      <div class="versus">vs</div>
      ${renderUnit(match.unitB, {
        matchId: match.id,
        selectable: canSelect,
        isWinner: winnerName === unitName(match.unitB),
        isLoser: loserName === unitName(match.unitB)
      })}
      ${complete && !match.auto ? `
        <div class="league-match-actions compact-actions">
          <button class="btn btn-ghost" type="button" data-undo-match="${match.id}">
            <span class="material-symbols-outlined" aria-hidden="true">undo</span>
            Desfazer
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderEliminationPhase(phase) {
  if (phase.type === 'round') {
    const validMatches = phase.round.matches.filter(match => match.unitA || match.unitB || match.winner || match.manualWinnerName);
    if (!validMatches.length) {
      return `
        <section class="phase-panel">
          <div class="gallery-placeholder medieval-card blue-frame">
            <div class="placeholder-icon">⏳</div>
            <h2>${phase.label} aguardando classificados.</h2>
            <p>Conclua a fase anterior para montar os confrontos válidos.</p>
          </div>
        </section>
      `;
    }
    return `
      <section class="phase-panel">
        <div class="phase-heading">
          <p class="eyebrow">Chaves da fase</p>
          <h2>${phase.label}</h2>
          <p>Clique no nome ou no time vencedor para avançar. Avanços diretos são preenchidos automaticamente.</p>
        </div>
        <div class="phase-matches-grid">
          ${validMatches.map(match => matchTemplate(match, phase.label)).join('')}
        </div>
      </section>
    `;
  }

  if (phase.type === 'bronze') {
    const candidates = [phase.match?.unitA, phase.match?.unitB].filter(Boolean);
    if (candidates.length < 2) {
      return `
        <section class="phase-panel">
          <div class="gallery-placeholder medieval-card blue-frame">
            <div class="placeholder-icon">🥉</div>
            <h2>Bronze indisponível.</h2>
            <p>Esta Liga não gerou dois semifinalistas derrotados para disputa de terceiro lugar.</p>
          </div>
        </section>
      `;
    }
    return `
      <section class="phase-panel">
        <div class="phase-heading">
          <p class="eyebrow">Terceiro lugar</p>
          <h2>Disputa do Bronze</h2>
          <p>Os perdedores das semifinais disputam o terceiro lugar da Liga.</p>
        </div>
        <div class="phase-matches-grid final-grid">
          ${matchTemplate(phase.match, 'Disputa do Bronze')}
        </div>
      </section>
    `;
  }

  return renderPodiumPointer();
}

function placeClassForParticipant(target, participant) {
  const place = getPlacementByParticipant(target.placements, participant.name);
  return place ? `placed ${place}` : '';
}

function renderSurvivalParticipant(participant, group, final = false) {
  const place = getPlacementByParticipant(group.placements, participant.name);
  const placeLabel = place ? placementName(place) : 'Clique para classificar';
  return `
    <button class="survival-row selectable ${placeClassForParticipant(group, participant)}" type="button"
      data-survival-pick="${group.id}" data-survival-name="${participant.name}" data-survival-final="${final ? '1' : '0'}">
      <div>
        <strong>${participant.name}</strong>
        <small>${participant.origin === 'convidado' ? 'Convidado Especial' : 'Avalon'}</small>
      </div>
      <span class="survival-place-label">${placeLabel}</span>
    </button>
  `;
}

function survivalGroupTemplate(group, final = false) {
  const complete = isPlacementComplete(group);
  return `
    <article class="league-survival-group medieval-card ${final ? 'gold-frame' : 'blue-frame'} ${complete ? 'complete' : ''}">
      <div class="league-match-head">
        <span>${group.name}</span>
        <small>${complete ? 'Top 3 definido' : 'Escolha Top 3 em ordem'}</small>
      </div>
      <p class="league-muted compact-help">Clique nos nomes em ordem: 1º, 2º e 3º lugar.</p>
      <div class="survival-list">
        ${group.participants.map(participant => renderSurvivalParticipant(participant, group, final)).join('') || '<p class="league-muted">Aguardando classificados.</p>'}
      </div>
      ${(group.placements?.gold || group.placements?.silver || group.placements?.bronze) ? `
        <div class="league-match-actions compact-actions">
          <button class="btn btn-ghost" type="button" data-clear-survival="${group.id}" data-clear-survival-final="${final ? '1' : '0'}">
            <span class="material-symbols-outlined" aria-hidden="true">undo</span>
            Limpar Top 3
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderSurvivalPhase(phase) {
  if (phase.type === 'survival_groups') {
    return `
      <section class="phase-panel">
        <div class="phase-heading">
          <p class="eyebrow">Salas classificatórias</p>
          <h2>Salas Iniciais</h2>
          <p>Defina o Top 3 de cada grupo. Os três primeiros de cada sala avançam para a Final Survival.</p>
        </div>
        <div class="survival-grid">
          ${phase.groups.map(group => survivalGroupTemplate(group)).join('')}
        </div>
      </section>
    `;
  }

  if (phase.type === 'survival_final') {
    return `
      <section class="phase-panel">
        <div class="phase-heading">
          <p class="eyebrow">Decisão final</p>
          <h2>Final Survival</h2>
          <p>Defina 1º, 2º e 3º lugar entre os finalistas para revelar o pódio.</p>
        </div>
        <div class="survival-grid final-grid">
          ${survivalGroupTemplate(phase.final, true)}
        </div>
      </section>
    `;
  }

  return renderPodiumPointer();
}

function renderPodiumPointer() {
  return `
    <section class="phase-panel">
      <div class="gallery-placeholder medieval-card gold-frame">
        <div class="placeholder-icon">🏆</div>
        <h2>Pódio Final pronto.</h2>
        <p>O pódio oficial aparece uma única vez na seção Resultado Final, logo abaixo das chaves.</p>
        <button class="btn btn-primary" type="button" data-scroll-podium-final>Ver pódio</button>
      </div>
    </section>
  `;
}

function renderPodiumBlock() {
  return `
    <section class="phase-panel">
      <div class="phase-heading">
        <p class="eyebrow">Cerimônia final</p>
        <h2>Pódio dos Campeões</h2>
        <p>Confira os vencedores e baixe a imagem do pódio para compartilhar.</p>
      </div>
      ${podiumHtml()}
    </section>
  `;
}

function renderBracket() {
  const target = $('#league-bracket');
  if (!target) return;
  if (!ligaState.bracket) {
    target.innerHTML = `
      <div class="section-heading compact league-bracket-heading">
        <p class="eyebrow">Etapa 3</p>
        <h2 id="liga-chaves-title">Chaves da Liga</h2>
        <p>
          Navegue por fases, sorteie um mapa para cada etapa e clique diretamente no nome,
          jogador ou time classificado para registrar o avanço.
        </p>
      </div>
      <div class="gallery-placeholder medieval-card gold-frame"><div class="placeholder-icon">♛</div><h2>Nenhuma chave gerada.</h2><p>Escolha o modo, confirme participantes, sorteie a ordem e gere as chaves da Liga.</p></div>`;
    return;
  }

  const phases = getPhases();
  clampPhaseIndex();
  const phase = phases[ligaState.phaseIndex];

  const reserves = ligaState.bracket?.reserves?.length ? `
    <div class="league-reserves medieval-card blue-frame">
      <p class="eyebrow">Reservas</p>
      <p>${ligaState.bracket.reserves.map(item => item.name).join(' • ')}</p>
    </div>
  ` : '';

  const phaseContent = ligaState.bracket.type === 'elimination'
    ? renderEliminationPhase(phase)
    : renderSurvivalPhase(phase);

  target.innerHTML = `
    ${reserves}
    <div class="league-slide-shell">
      <div class="section-heading compact league-bracket-heading">
        <p class="eyebrow">Etapa 3</p>
        <h2 id="liga-chaves-title">Chaves da Liga</h2>
        <p>
          Navegue por fases, sorteie um mapa para cada etapa e clique diretamente no nome,
          jogador ou time classificado para registrar o avanço.
        </p>
      </div>
      ${renderPhaseNav(phases)}
      ${renderPhaseMap(phase)}
      ${phaseContent}
    </div>
  `;
  bindBracketActions();
}


function podiumMembers(unit) {
  if (!unit) return '';
  if (unit.type === 'team') {
    return (unit.members || []).map(member => member.name).join(' • ');
  }
  return unit.origin === 'convidado' ? 'Convidado Especial' : 'Membro Avalon';
}

function unitMembersList(unit) {
  if (!unit) return [];
  if (unit.type === 'team') return (unit.members || []).map(member => member.name).filter(Boolean);
  return [unit.origin === 'convidado' ? 'Convidado Especial' : 'Membro Avalon'];
}

function podiumShareTitle(unit) {
  if (!unit) return 'A definir';
  if (unit.type === 'team') return `${unitName(unit)} — ${podiumMembers(unit)}`;
  return unitName(unit);
}

function podiumName(unit) {
  return unitName(unit) === 'Aguardando' ? 'A definir' : unitName(unit);
}

function podiumCardHtml(place, unit) {
  const trophyAlt = {
    gold: 'Troféu de ouro',
    silver: 'Troféu de prata',
    bronze: 'Troféu de bronze'
  }[place] || 'Troféu';

  return `
    <article class="podium-final-card ${place}">
      <img src="${rootPath(placementTrophy(place))}" alt="${trophyAlt}" loading="lazy" decoding="async" width="384" height="384" />
      <small>${placementTitleFor(place, unit)} • ${placementLabel(place)}</small>
      <strong>${podiumName(unit)}</strong>
      <span class="podium-members">${podiumMembers(unit)}</span>
    </article>
  `;
}

function downloadLabelFor(place, unit) {
  if (place === 'gold') return isTeamUnit(unit) ? 'Baixar card dos campeões' : 'Baixar card do campeão';
  if (place === 'silver') return isTeamUnit(unit) ? 'Baixar card dos vice-campeões' : 'Baixar card do vice';
  return isTeamUnit(unit) ? 'Baixar card dos guerreiros de bronze' : 'Baixar card do bronze';
}

function individualShareCardHtml(place, unit) {
  if (!unit) return '';
  const members = unitMembersList(unit);
  const teamCard = isTeamUnit(unit);
  const title = placementTitleFor(place, unit);
  const buttonLabel = downloadLabelFor(place, unit);
  const trophyAlt = `Troféu ${title} da Liga Avalon`;

  return `
    <article class="winner-share-card placement-share-card placement-${place} medieval-card" id="winner-export-card-${place}">
      <div class="winner-share-export">
        <div class="winner-share-header">
          <p class="eyebrow">${leagueFullTitle()}</p>
          <h2>${title}</h2>
          <p class="winner-share-place">${placementLabel(place)} • ${podiumName(unit)}</p>
        </div>
        <div class="winner-share-body ${teamCard ? 'team-card' : 'solo-card'}">
          <div class="winner-share-trophy-wrap">
            <img src="${rootPath(placementTrophy(place))}" alt="${trophyAlt}" loading="lazy" decoding="async" width="384" height="384" />
          </div>
          <div class="winner-share-details">
            ${teamCard ? `
              <strong class="winner-share-team-name">${podiumName(unit)}</strong>
              <span class="winner-share-members-title">Membros</span>
              <ol class="winner-share-members-list">
                ${members.map(name => `<li>${name}</li>`).join('')}
              </ol>
            ` : `
              <strong class="winner-share-player-name">${podiumName(unit)}</strong>
              <span class="winner-share-status">${podiumMembers(unit)}</span>
            `}
          </div>
        </div>
      </div>
      <div class="winner-share-actions" data-html2canvas-ignore="true">
        <button class="btn placement-card-download placement-btn-${place}" type="button" data-download-placement="${place}">
          <span class="material-symbols-outlined" aria-hidden="true">download</span>
          ${buttonLabel}
        </button>
      </div>
    </article>
  `;
}

function podiumHtml() {
  const podium = ligaState.bracket?.podium || {};
  if (!podium.gold && !podium.silver && !podium.bronze) {
    return `
      <div class="gallery-placeholder medieval-card blue-frame">
        <div class="placeholder-icon">🏆</div>
        <h2>Pódio aguardando vencedores.</h2>
        <p>Finalize a Liga para revelar os campeões.</p>
      </div>
    `;
  }

  return `
    <div class="podium-export-actions" data-html2canvas-ignore="true">
      <button class="btn btn-primary" type="button" data-download-podium-card>
        <span class="material-symbols-outlined" aria-hidden="true">download</span>
        Baixar pódio completo
      </button>
    </div>

    <div class="podium-final-export" id="podium-export-card">
      <div class="podium-export-title">
        <p class="eyebrow">Liga Avalon</p>
        <h2>Pódio dos Campeões</h2>
        <p>${leagueFullTitle()}</p>
      </div>
      <div class="podium-final-grid">
        ${podiumCardHtml('silver', podium.silver)}
        ${podiumCardHtml('gold', podium.gold)}
        ${podiumCardHtml('bronze', podium.bronze)}
      </div>
    </div>

    <div class="placement-share-grid">
      ${individualShareCardHtml('gold', podium.gold)}
      ${individualShareCardHtml('silver', podium.silver)}
      ${individualShareCardHtml('bronze', podium.bronze)}
    </div>

  `;
}
function renderPodium() {
  const target = $('#league-podium');
  if (!target) return;
  target.innerHTML = podiumHtml();
  target.querySelector('[data-download-podium-card]')?.addEventListener('click', downloadPodiumImage);
  target.querySelectorAll('[data-download-placement]').forEach(button => {
    button.addEventListener('click', () => downloadPlacementCardImage(button.dataset.downloadPlacement));
  });
}

function unitCallLabel(unit) {
  if (!unit) return 'Aguardando';
  if (unit.type === 'team') return `${unit.name} (${podiumMembers(unit)})`;
  return unit.name || 'Aguardando';
}

function phaseCallText(phase) {
  if (!phase) return '';
  const lines = [
    `🏆 ${leagueFullTitle()} — ${phase.label}`,
    phase.arena ? `🗺️ Mapa: ${phase.arena}` : '🗺️ Mapa: aguardando sorteio',
    ''
  ];

  if (phase.type === 'round') {
    phase.round.matches.forEach(match => {
      lines.push(`${unitCallLabel(match.unitA)} vs ${unitCallLabel(match.unitB)}`);
    });
  } else if (phase.type === 'bronze') {
    lines.push(`${unitCallLabel(phase.match.unitA)} vs ${unitCallLabel(phase.match.unitB)}`);
  } else if (phase.type === 'survival_groups') {
    phase.groups.forEach(group => {
      lines.push(`${group.name}: ${group.participants.map(item => item.name).join(', ')}`);
    });
  } else if (phase.type === 'survival_final') {
    lines.push(`Final: ${phase.final.participants.map(item => item.name).join(', ') || 'aguardando classificados'}`);
  } else {
    lines.push('Pódio final disponível no Portal.');
  }

  return lines.join('\n');
}

function copyCurrentPhaseCall() {
  const phases = getPhases();
  const phase = phases[ligaState.phaseIndex];
  if (!phase) return;
  navigator.clipboard?.writeText(phaseCallText(phase))
    .then(() => showNotice('Chamada copiada', `${phase.label} foi copiada para enviar no grupo.`, 'success'))
    .catch(() => showNotice('Não foi possível copiar', 'Seu navegador bloqueou a cópia automática.', 'warn'));
}


function wrapCanvasText(ctx, text, maxWidth) {
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

function drawWrappedCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3, align = 'center') {
  ctx.textAlign = align;
  const lines = wrapCanvasText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function drawContainCanvasImage(ctx, img, x, y, w, h) {
  if (!img) return;
  const ratio = Math.min(w / img.width, h / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function safeCanvasUnitTitle(unit) {
  const name = unitName(unit);
  return name && name !== 'Aguardando' ? name : 'Aguardando';
}

function getPhaseMapInfo(phase, modo = getModo()) {
  const maps = getModeMaps(modo);
  const single = maps.length === 1;
  const arenaName = phase?.arena || (single ? mapName(maps[0]) : '');
  const arenaData = findMapByName(arenaName, modo) || (single ? maps[0] : null);
  return {
    name: arenaName || 'Mapa aguardando sorteio',
    image: mapImage(arenaData),
    description: mapDescription(arenaData) || 'Mapa selecionado para esta rodada da Liga Avalon.'
  };
}

function countPhaseItemsForCanvas(phase) {
  if (!phase) return 0;
  if (phase.type === 'round') {
    return (phase.round?.matches || []).filter(match => match.unitA || match.unitB || match.winner || match.manualWinnerName).length;
  }
  if (phase.type === 'bronze') return phase.match ? 1 : 0;
  if (phase.type === 'survival_groups') return phase.groups?.length || 0;
  if (phase.type === 'survival_final') return 1;
  return 1;
}

function drawCanvasPanel(ctx, x, y, w, h, options = {}) {
  const {
    radius = 26,
    fill = LEAGUE_CANVAS_THEME.colors.panel,
    stroke = LEAGUE_CANVAS_THEME.colors.panelBorder,
    lineWidth = 2
  } = options;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

function drawLeagueRoundBackground(ctx, canvas) {
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, '#071126');
  bg.addColorStop(0.56, '#080b15');
  bg.addColorStop(1, '#1a1308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.20;
  const glow = ctx.createRadialGradient(canvas.width / 2, 250, 80, canvas.width / 2, 250, 740);
  glow.addColorStop(0, LEAGUE_CANVAS_THEME.colors.gold);
  glow.addColorStop(0.38, 'rgba(242,199,102,0.20)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.strokeStyle = 'rgba(242,199,102,0.58)';
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, 58, 52, canvas.width - 116, canvas.height - 104, 44);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.075)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 82, 78, canvas.width - 164, canvas.height - 156, 32);
  ctx.stroke();
}

function splitCanvasInlineLines(ctx, items = [], maxWidth, maxLines = 3, separator = ' • ') {
  const values = items.map(item => String(item || '').trim()).filter(Boolean);
  const lines = [];
  let line = '';

  values.forEach(value => {
    const test = line ? `${line}${separator}${value}` : value;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = value;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const remaining = lines.slice(maxLines).join(separator);
    kept[maxLines - 1] = `${kept[maxLines - 1]} + ${remaining.split(separator).filter(Boolean).length}`;
    return kept;
  }
  return lines;
}

function drawCanvasInlineNames(ctx, names = [], x, y, maxWidth, options = {}) {
  const {
    font = 'bold 23px Inter, Arial, sans-serif',
    fill = 'rgba(244,240,230,0.92)',
    lineHeight = 31,
    maxLines = 2,
    align = 'left'
  } = options;

  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillStyle = fill;
  const lines = splitCanvasInlineLines(ctx, names, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function canvasMatchSideData(unit) {
  if (!unit || safeCanvasUnitTitle(unit) === 'Aguardando') {
    return { label: 'A definir', members: ['Aguardando'], memberCount: 0, waiting: true };
  }
  if (unit.type === 'team') {
    const members = (unit.members || []).map(member => member.name).filter(Boolean);
    return {
      label: unit.name || 'Equipe',
      members: members.length ? members : ['Equipe aguardando'],
      memberCount: members.length,
      waiting: false
    };
  }
  return {
    label: unit.origin === 'convidado' ? 'Convidado especial' : 'Guardião',
    members: [unit.name || 'Aguardando'],
    memberCount: 1,
    waiting: false
  };
}

function normalizeCanvasMatchData(match, index = 0, phaseLabel = '') {
  return {
    title: `${String(phaseLabel).includes('Sala') ? 'Sala' : 'Confronto'} ${index + 1}`,
    left: canvasMatchSideData(match?.unitA),
    right: canvasMatchSideData(match?.unitB),
    winner: match?.winner ? unitName(match.winner) : ''
  };
}

function resolveCanvasMatchLayout(match, availableWidth = LEAGUE_CANVAS_THEME.cards.matchSingleWidth) {
  const left = canvasMatchSideData(match?.unitA);
  const right = canvasMatchSideData(match?.unitB);
  const maxMembers = Math.max(left.memberCount, right.memberCount, 1);
  const longestName = [...left.members, ...right.members].reduce((max, name) => Math.max(max, String(name).length), 0);
  const compact = availableWidth < 700;

  let height = LEAGUE_CANVAS_THEME.cards.oneVsOneHeight;
  if (maxMembers === 2) height = LEAGUE_CANVAS_THEME.cards.twoVsTwoHeight;
  if (maxMembers >= 3) height = LEAGUE_CANVAS_THEME.cards.threeVsThreeHeight;
  if (longestName > 18) height += 12;

  const innerWidth = Math.min(availableWidth - 64, availableWidth * (compact ? 0.88 : LEAGUE_CANVAS_THEME.spacing.matchInnerRatio));
  const vsWidth = compact ? 64 : LEAGUE_CANVAS_THEME.spacing.versusGap;
  const sideWidth = Math.max(145, (innerWidth - vsWidth) / 2);
  let memberFontSize = maxMembers === 1 ? (compact ? 23 : 28) : maxMembers === 2 ? (compact ? 18 : 22) : (compact ? 16 : 20);
  if (longestName > 18) memberFontSize -= 2;
  if (longestName > 22) memberFontSize -= 2;
  memberFontSize = Math.max(14, memberFontSize);

  return {
    height,
    innerWidth,
    vsWidth,
    sideWidth,
    memberFontSize,
    memberLineHeight: memberFontSize + 7,
    maxLines: maxMembers >= 3 || longestName > 18 ? 2 : 1,
    memberCount: maxMembers
  };
}

function drawCanvasMatchSide(ctx, data, anchorX, labelY, membersY, maxWidth, align, layout) {
  ctx.textAlign = align;
  ctx.fillStyle = 'rgba(242,199,102,0.86)';
  ctx.font = 'bold 16px Inter, Arial, sans-serif';
  ctx.fillText(String(data.label || '').toUpperCase(), anchorX, labelY);

  const fontTemplate = `bold {size}px ${data.memberCount <= 1 ? 'Cinzel, Georgia, serif' : 'Inter, Arial, sans-serif'}`;
  if (data.members.length === 1) {
    ctx.fillStyle = data.waiting ? 'rgba(244,240,230,0.72)' : LEAGUE_CANVAS_THEME.colors.text;
    drawFittingText(ctx, data.members[0], anchorX, membersY, maxWidth, fontTemplate, layout.memberFontSize, 14, align);
    return;
  }

  drawCanvasInlineNames(ctx, data.members, anchorX, membersY, maxWidth, {
    font: fontTemplate.replace('{size}', String(layout.memberFontSize)),
    fill: data.waiting ? 'rgba(244,240,230,0.72)' : LEAGUE_CANVAS_THEME.colors.text,
    lineHeight: layout.memberLineHeight,
    maxLines: layout.maxLines,
    align
  });
}

function drawCanvasMatchCard(ctx, match, x, y, w, h, index, phaseLabel) {
  const model = normalizeCanvasMatchData(match, index, phaseLabel);
  const layout = resolveCanvasMatchLayout(match, w);
  const cardHeight = h || layout.height;
  drawCanvasPanel(ctx, x, y, w, cardHeight);

  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = 'bold 18px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(model.title, x + 26, y + 32);

  const centerX = x + w / 2;
  const versusHalf = layout.vsWidth / 2;
  const labelY = y + Math.max(62, Math.round(cardHeight * 0.43));
  const membersY = labelY + 32;

  drawCanvasMatchSide(ctx, model.left, centerX - versusHalf, labelY, membersY, layout.sideWidth, 'right', layout);

  ctx.textAlign = 'center';
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = `bold ${layout.memberCount === 1 ? 28 : 25}px Cinzel, Georgia, serif`;
  ctx.fillText('VS', centerX, membersY + 2);

  drawCanvasMatchSide(ctx, model.right, centerX + versusHalf, labelY, membersY, layout.sideWidth, 'left', layout);

  if (model.winner) {
    ctx.fillStyle = 'rgba(242,199,102,0.92)';
    ctx.font = 'bold 15px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Classificado: ${model.winner}`, x + w - 24, y + cardHeight - 18);
  }
  return layout;
}

function survivalParticipantLabels(group, final = false) {
  const participants = (group.participants || []).map(item => item.name).filter(Boolean);
  const placements = group.placements || {};
  return participants.slice(0, 9).map(name => {
    const place = getPlacementByParticipant(placements, name);
    if (!place || !final) return name;
    return `${placementName(place).replace(' lugar', '')} ${name}`;
  });
}

function drawSurvivalCard(ctx, group, x, y, w, h, index, final = false) {
  drawCanvasPanel(ctx, x, y, w, h, {
    stroke: final ? 'rgba(242,199,102,0.42)' : LEAGUE_CANVAS_THEME.colors.blueBorder
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = 'bold 21px Inter, Arial, sans-serif';
  ctx.fillText(final ? 'Final Top 3' : `Sala ${index + 1}`, x + 30, y + 40);

  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.text;
  drawFittingText(ctx, group.name || (final ? 'Final Survival' : `Sala ${index + 1}`), x + 30, y + 82, w - 60, 'bold {size}px Cinzel, Georgia, serif', 30, 18, 'left');

  const names = survivalParticipantLabels(group, final);
  drawCanvasInlineNames(ctx, names, x + 30, y + 134, w - 60, {
    font: 'bold 23px Inter, Arial, sans-serif',
    fill: 'rgba(244,240,230,0.94)',
    lineHeight: 34,
    maxLines: 3,
    align: 'left'
  });

  ctx.fillStyle = 'rgba(215,217,226,0.78)';
  ctx.font = '18px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(final ? 'Defina 1º, 2º e 3º lugar.' : 'Top 3 avançam para a decisão.', x + 30, y + h - 30);
}

function resolveLeaguePhaseLayout(phase) {
  const isSurvival = phase?.type === 'survival_groups' || phase?.type === 'survival_final';
  const items = Math.max(1, countPhaseItemsForCanvas(phase));
  const columns = !isSurvival && items >= 4 ? 2 : 1;
  let itemHeight = LEAGUE_CANVAS_THEME.cards.groupHeight;

  if (!isSurvival) {
    const matches = phase?.type === 'bronze'
      ? [phase.match]
      : (phase?.round?.matches || []).filter(match => match.unitA || match.unitB || match.winner || match.manualWinnerName);
    const width = columns === 2 ? LEAGUE_CANVAS_THEME.cards.matchDoubleWidth : LEAGUE_CANVAS_THEME.cards.matchSingleWidth;
    itemHeight = Math.max(
      LEAGUE_CANVAS_THEME.cards.oneVsOneHeight,
      ...matches.map(match => resolveCanvasMatchLayout(match, width).height)
    );
  }

  const rows = Math.ceil(items / columns);
  const width = isSurvival
    ? LEAGUE_CANVAS_THEME.cards.groupWidth
    : columns === 2
      ? LEAGUE_CANVAS_THEME.cards.matchDoubleWidth
      : LEAGUE_CANVAS_THEME.cards.matchSingleWidth;
  const gap = LEAGUE_CANVAS_THEME.spacing.itemGap;
  const totalWidth = columns * width + (columns - 1) * gap;
  const startX = (LEAGUE_CANVAS_THEME.width - totalWidth) / 2;
  const height = Math.max(980, LEAGUE_CANVAS_THEME.spacing.phaseStartY + rows * (itemHeight + gap) + 150);

  return { items, columns, rows, itemHeight, width, gap, startX, height: Math.min(LEAGUE_CANVAS_THEME.maxHeight, height) };
}

function drawLeagueCanvasHeader(ctx, model) {
  ctx.textAlign = 'center';
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = 'bold 30px Cinzel, Georgia, serif';
  ctx.fillText('PORTAL AVALON', 700, 122);
  ctx.fillStyle = 'rgba(215,217,226,0.90)';
  ctx.font = 'bold 22px Inter, Arial, sans-serif';
  drawFittingText(ctx, model.leagueTitle, 700, 162, 1120, 'bold {size}px Inter, Arial, sans-serif', 22, 16);

  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.text;
  drawFittingText(ctx, String(model.phase.label || 'Rodada da Liga').toUpperCase(), 700, 245, 1160, 'bold {size}px Cinzel, Georgia, serif', 66, 34);
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = 'bold 25px Inter, Arial, sans-serif';
  ctx.fillText(model.progressLabel, 700, 292);
}

async function drawPhaseMapCard(ctx, mapInfo) {
  let mapImg = null;
  if (mapInfo.image) {
    try { mapImg = await loadImage(rootPath(mapInfo.image)); } catch (error) { mapImg = null; }
  }
  const mapX = LEAGUE_CANVAS_THEME.contentX;
  const mapY = 330;
  const mapW = LEAGUE_CANVAS_THEME.contentWidth;
  const mapH = 180;
  drawCanvasPanel(ctx, mapX, mapY, mapW, mapH, { stroke: 'rgba(242,199,102,0.24)', radius: 28 });
  if (mapImg) drawContainCanvasImage(ctx, mapImg, mapX + 30, mapY + 22, 240, 136);

  const textX = mapImg ? mapX + 300 : mapX + 35;
  ctx.textAlign = 'left';
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.gold;
  ctx.font = 'bold 20px Inter, Arial, sans-serif';
  ctx.fillText('MAPA DA FASE', textX, mapY + 52);
  ctx.fillStyle = LEAGUE_CANVAS_THEME.colors.text;
  drawFittingText(ctx, mapInfo.name, textX, mapY + 96, mapImg ? 750 : 1000, 'bold {size}px Cinzel, Georgia, serif', 34, 22, 'left');
  ctx.fillStyle = 'rgba(215,217,226,0.82)';
  ctx.font = '20px Inter, Arial, sans-serif';
  drawWrappedCanvasText(ctx, mapInfo.description, textX, mapY + 132, mapImg ? 720 : 1000, 28, 2, 'left');
}

function drawLeaguePhaseContent(ctx, phase, layout) {
  const startY = LEAGUE_CANVAS_THEME.spacing.phaseStartY;
  if (phase.type === 'round') {
    const matches = (phase.round?.matches || []).filter(match => match.unitA || match.unitB || match.winner || match.manualWinnerName);
    if (!matches.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(244,240,230,0.88)';
      ctx.font = 'bold 34px Cinzel, Georgia, serif';
      ctx.fillText('Rodada aguardando classificados.', 700, startY + 120);
      return;
    }
    matches.forEach((match, index) => {
      const col = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const x = layout.startX + col * (layout.width + layout.gap);
      const y = startY + row * (layout.itemHeight + layout.gap);
      drawCanvasMatchCard(ctx, match, x, y, layout.width, layout.itemHeight, index, phase.label);
    });
    return;
  }

  if (phase.type === 'bronze') {
    drawCanvasMatchCard(ctx, phase.match, layout.startX, startY, layout.width, layout.itemHeight, 0, 'Disputa do Bronze');
    return;
  }
  if (phase.type === 'survival_groups') {
    phase.groups.forEach((group, index) => {
      drawSurvivalCard(ctx, group, layout.startX, startY + index * (layout.itemHeight + layout.gap), layout.width, layout.itemHeight, index, false);
    });
    return;
  }
  if (phase.type === 'survival_final') {
    drawSurvivalCard(ctx, phase.final, layout.startX, startY, layout.width, layout.itemHeight, 0, true);
  }
}

function drawLeagueCanvasFooter(ctx, canvas) {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(215,217,226,0.72)';
  ctx.font = '20px Inter, Arial, sans-serif';
  ctx.fillText('Gerado pelo Portal Avalon • Compartilhe com a guilda', canvas.width / 2, canvas.height - 84);
}

function buildLeagueCanvasModel({ phase, phaseIndex = 0, phases = [], modo = getModo() }) {
  return {
    phase,
    phaseIndex,
    phases,
    modo,
    leagueTitle: leagueCanvasTitle(modo),
    progressLabel: phaseProgressLabel(phase, phaseIndex, phases.length || 1),
    mapInfo: getPhaseMapInfo(phase, modo),
    layout: resolveLeaguePhaseLayout(phase)
  };
}

async function renderLeagueCanvas(config) {
  const model = buildLeagueCanvasModel(config);
  const canvas = document.createElement('canvas');
  canvas.width = LEAGUE_CANVAS_THEME.width;
  canvas.height = model.layout.height;
  const ctx = canvas.getContext('2d');

  drawLeagueRoundBackground(ctx, canvas);
  drawLeagueCanvasHeader(ctx, model);
  await drawPhaseMapCard(ctx, model.mapInfo);
  drawLeaguePhaseContent(ctx, model.phase, model.layout);
  drawLeagueCanvasFooter(ctx, canvas);
  return { canvas, model };
}

async function downloadCurrentPhaseCard() {
  const phases = getPhases();
  clampPhaseIndex();
  const phase = phases[ligaState.phaseIndex];
  if (!phase || phase.type === 'podium') {
    showNotice('Rodada indisponível', 'O pódio não é uma rodada de batalha. Use os botões do pódio final.', 'warn');
    return;
  }

  const { canvas } = await renderLeagueCanvas({
    phase,
    phaseIndex: ligaState.phaseIndex,
    phases,
    modo: getModo()
  });
  window.__lastLeaguePhaseCanvas = canvas;

  const link = document.createElement('a');
  link.download = `liga-avalon-${slug(phase.label || 'rodada')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showNotice('Chave da rodada gerada', `${phase.label} foi enviada para download.`, 'success');
}

function copyResult() {
  const podium = ligaState.bracket?.podium || {};
  const lines = [
    `🏆 ${leagueFullTitle()}`,
    '',
    `🥇 ${placementTitleFor('gold', podium.gold)} (${placementLabel('gold')}): ${podiumShareTitle(podium.gold)}`,
    `🥈 ${placementTitleFor('silver', podium.silver)} (${placementLabel('silver')}): ${podiumShareTitle(podium.silver)}`,
    `🥉 ${placementTitleFor('bronze', podium.bronze)} (${placementLabel('bronze')}): ${podiumShareTitle(podium.bronze)}`
  ];
  navigator.clipboard?.writeText(lines.join('\n'))
    .then(() => showNotice('Resultado copiado', 'O pódio foi copiado para a área de transferência.', 'success'))
    .catch(() => showNotice('Não foi possível copiar', 'Copie manualmente o pódio.', 'warn'));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFittingText(ctx, text, x, y, maxWidth, fontTemplate, startSize, minSize = 16, align = 'center') {
  let size = startSize;
  ctx.textAlign = align;
  do {
    ctx.font = fontTemplate.replace('{size}', size);
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size >= minSize);
  ctx.fillText(text, x, y);
  return size;
}


function podiumCanvasTitleLines(place, unit) {
  const title = placementTitleFor(place, unit).toUpperCase();
  if (title === 'GUERREIROS DE BRONZE') return ['GUERREIROS', 'DE BRONZE'];
  if (title === 'GUERREIRO DE BRONZE') return ['GUERREIRO', 'DE BRONZE'];
  return [title];
}

function getPodiumPlacementPalette(place = 'gold') {
  return PODIUM_CANVAS_THEME.placements[place] || PODIUM_CANVAS_THEME.placements.gold;
}

function buildPodiumPlacementModel(place, unit, trophyImage = null) {
  const team = isTeamUnit(unit);
  const memberNames = team ? unitMembersList(unit) : [];
  return {
    place,
    unit,
    isTeam: team,
    name: podiumName(unit),
    title: placementTitleFor(place, unit),
    titleLines: podiumCanvasTitleLines(place, unit),
    memberNames,
    status: team ? '' : podiumMembers(unit),
    trophyImage,
    palette: getPodiumPlacementPalette(place)
  };
}

function getPodiumCompactMemberLines(ctx, model, maxWidth, fontSize) {
  const values = model.isTeam ? model.memberNames : (model.status ? [model.status] : []);
  if (!values.length) return [];
  ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
  return splitCanvasInlineLines(
    ctx,
    values,
    maxWidth,
    PODIUM_CANVAS_THEME.compact.memberMaxLines
  );
}

function resolvePodiumCardLayout(ctx, model, box, variant = 'compact') {
  if (variant === 'feature') {
    const cfg = PODIUM_CANVAS_THEME.feature;
    const palette = model.palette;
    const trophyAreaWidth = Math.min(cfg.trophyAreaWidth, box.w * 0.40);
    const contentX = box.x + trophyAreaWidth + cfg.contentGap;
    const contentW = box.x + box.w - cfg.panelPadding - contentX;
    const contentCenterX = contentX + contentW / 2;
    const trophyBox = {
      x: box.x + cfg.panelPadding,
      y: box.y + cfg.panelPadding,
      w: trophyAreaWidth - cfg.panelPadding,
      h: box.h - cfg.panelPadding * 2
    };

    let rankSize = cfg.rankSize;
    let titleSize = cfg.titleSize;
    let nameSize = cfg.nameSize;
    let memberSize = cfg.memberSize;
    const members = model.isTeam ? model.memberNames : (model.status ? [model.status] : []);

    const calculate = () => {
      const titleLineHeight = titleSize + 5;
      const memberLineHeight = memberSize + 10;
      const rankY = box.y + 66;
      const titleY = rankY + rankSize + cfg.lineGap;
      const titleLastY = titleY + (model.titleLines.length - 1) * titleLineHeight;
      const nameY = titleLastY + titleSize + cfg.lineGap + 12;
      const memberTitleY = nameY + nameSize + cfg.lineGap + 6;
      const membersY = memberTitleY + (model.isTeam ? 38 : 24);
      const lastMemberY = members.length
        ? membersY + (members.length - 1) * memberLineHeight
        : nameY;
      const bottom = lastMemberY + memberSize + cfg.panelPadding;
      return {
        titleLineHeight,
        memberLineHeight,
        rankY,
        titleY,
        nameY,
        memberTitleY,
        membersY,
        requiredHeight: bottom - box.y
      };
    };

    let metrics = calculate();
    for (let attempt = 0; metrics.requiredHeight > box.h && attempt < 28; attempt += 1) {
      if (memberSize > cfg.memberMin) memberSize -= 1;
      else if (nameSize > cfg.nameMin) nameSize -= 1;
      else if (titleSize > cfg.titleMin) titleSize -= 1;
      else if (rankSize > cfg.rankMin) rankSize -= 1;
      metrics = calculate();
    }

    return {
      variant,
      box,
      palette,
      trophyBox,
      trophySize: Math.min(palette.featureTrophySize, trophyBox.w, trophyBox.h),
      contentX,
      contentW,
      contentCenterX,
      rankSize,
      titleSize,
      nameSize,
      memberSize,
      members,
      ...metrics
    };
  }

  const cfg = PODIUM_CANVAS_THEME.compact;
  const palette = model.palette;
  const innerW = box.w - 44;
  let trophySize = palette.trophySize;
  let rankSize = model.place === 'gold' ? cfg.rankSize + 2 : cfg.rankSize;
  let titleSize = model.place === 'gold' ? cfg.titleSize + 2 : cfg.titleSize;
  let nameSize = model.place === 'gold' ? cfg.nameSize + 4 : cfg.nameSize;
  let memberSize = cfg.memberSize;
  let topPadding = cfg.topPadding;
  let bottomPadding = cfg.bottomPadding;
  let trophyGap = cfg.trophyGap;
  let titleGap = cfg.titleGap;
  let nameGap = cfg.nameGap;
  let memberGap = cfg.memberGap;

  const calculate = () => {
    const titleLineHeight = titleSize + 4;
    const memberLineHeight = memberSize + 7;
    const memberLines = getPodiumCompactMemberLines(ctx, model, innerW, memberSize);
    const trophyY = box.y + topPadding;
    const rankY = trophyY + trophySize + trophyGap + rankSize;
    const titleY = rankY + titleGap + titleSize;
    const titleLastY = titleY + (model.titleLines.length - 1) * titleLineHeight;
    const nameY = titleLastY + nameGap + nameSize;
    const membersY = nameY + memberGap + memberSize;
    const lastBaseline = memberLines.length
      ? membersY + (memberLines.length - 1) * memberLineHeight
      : nameY;
    const requiredHeight = lastBaseline + bottomPadding - box.y;
    return {
      memberLines,
      titleLineHeight,
      memberLineHeight,
      trophyY,
      rankY,
      titleY,
      nameY,
      membersY,
      requiredHeight
    };
  };

  let metrics = calculate();
  for (let attempt = 0; metrics.requiredHeight > box.h && attempt < 52; attempt += 1) {
    if (trophySize > palette.trophyMin) trophySize -= 4;
    else if (memberSize > cfg.memberMin) memberSize -= 1;
    else if (nameSize > cfg.nameMin) nameSize -= 1;
    else if (titleSize > cfg.titleMin) titleSize -= 1;
    else if (rankSize > cfg.rankMin) rankSize -= 1;
    else if (topPadding > 16) topPadding -= 1;
    else if (bottomPadding > 18) bottomPadding -= 1;
    else if (memberGap > 9) memberGap -= 1;
    else if (nameGap > 8) nameGap -= 1;
    else if (titleGap > 9) titleGap -= 1;
    else if (trophyGap > 9) trophyGap -= 1;
    metrics = calculate();
  }

  return {
    variant,
    box,
    palette,
    innerW,
    centerX: box.x + box.w / 2,
    trophySize,
    rankSize,
    titleSize,
    nameSize,
    memberSize,
    safeBottom: box.y + box.h - bottomPadding,
    ...metrics
  };
}

function measurePodiumCompactCardHeight(ctx, model, place) {
  const palette = getPodiumPlacementPalette(place);
  const provisional = { x: 0, y: 0, w: palette.width, h: 1000 };
  const layout = resolvePodiumCardLayout(ctx, model, provisional, 'compact');
  return Math.ceil(layout.requiredHeight);
}

function resolveFullPodiumCardBoxes(ctx, models) {
  const bottom = PODIUM_CANVAS_THEME.full.cardBottom;
  return models.map(model => {
    const palette = model.palette;
    const naturalHeight = measurePodiumCompactCardHeight(ctx, model, model.place);
    const h = Math.max(palette.minHeight, Math.min(palette.maxHeight, naturalHeight));
    return {
      x: palette.x,
      y: bottom - h,
      w: palette.width,
      h
    };
  });
}

function drawPodiumCanvasBackground(ctx, canvas, background, accent) {
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, background[0]);
  bg.addColorStop(0.55, background[1]);
  bg.addColorStop(1, background[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.14;
  const glow = ctx.createRadialGradient(canvas.width / 2, 175, 60, canvas.width / 2, 175, canvas.width * 0.46);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPodiumCanvasFrame(ctx, frame, innerFrame, accent) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = frame.lineWidth;
  drawRoundedRect(ctx, frame.x, frame.y, frame.w, frame.h, frame.radius);
  ctx.stroke();

  ctx.strokeStyle = PODIUM_CANVAS_THEME.colors.innerFrame;
  ctx.lineWidth = innerFrame.lineWidth;
  drawRoundedRect(ctx, innerFrame.x, innerFrame.y, innerFrame.w, innerFrame.h, innerFrame.radius);
  ctx.stroke();
}

function drawPodiumCanvasHeader(ctx, options) {
  const {
    canvas,
    leagueTitle,
    mainTitle,
    accent,
    leagueY,
    titleY,
    leagueSize = 34,
    titleSize = 76,
    titleMin = 40
  } = options;
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  drawFittingText(
    ctx,
    String(leagueTitle || 'LIGA AVALON').toUpperCase(),
    canvas.width / 2,
    leagueY,
    canvas.width - 280,
    'bold {size}px Cinzel, Georgia, serif',
    leagueSize,
    18,
    'center'
  );

  ctx.fillStyle = PODIUM_CANVAS_THEME.colors.text;
  drawFittingText(
    ctx,
    String(mainTitle || 'PÓDIO DOS CAMPEÕES').toUpperCase(),
    canvas.width / 2,
    titleY,
    canvas.width - 360,
    'bold {size}px Cinzel, Georgia, serif',
    titleSize,
    titleMin,
    'center'
  );
}

function drawPodiumCanvasFooter(ctx, canvas, y) {
  ctx.fillStyle = 'rgba(215,217,226,0.86)';
  ctx.font = '24px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Portal Avalon • Registros, memórias e disputas da guilda', canvas.width / 2, y);
}

function drawPodiumPlacementCard(ctx, model, layout) {
  const { box, palette } = layout;
  drawCanvasPanel(ctx, box.x, box.y, box.w, box.h, {
    radius: layout.variant === 'feature' ? 32 : 34,
    fill: PODIUM_CANVAS_THEME.colors.panel,
    stroke: palette.accent,
    lineWidth: 3
  });

  if (layout.variant === 'feature') {
    if (model.trophyImage) {
      drawContainCanvasImage(
        ctx,
        model.trophyImage,
        layout.trophyBox.x,
        layout.trophyBox.y,
        layout.trophyBox.w,
        layout.trophyBox.h
      );
    }

    ctx.fillStyle = palette.accent;
    drawFittingText(ctx, placementLabel(model.place).toUpperCase(), layout.contentCenterX, layout.rankY, layout.contentW, 'bold {size}px Inter, Arial, sans-serif', layout.rankSize, PODIUM_CANVAS_THEME.feature.rankMin, 'center');

    model.titleLines.forEach((line, index) => {
      ctx.fillStyle = palette.accent;
      drawFittingText(ctx, line, layout.contentCenterX, layout.titleY + index * layout.titleLineHeight, layout.contentW, 'bold {size}px Inter, Arial, sans-serif', layout.titleSize, PODIUM_CANVAS_THEME.feature.titleMin, 'center');
    });

    ctx.fillStyle = PODIUM_CANVAS_THEME.colors.text;
    drawFittingText(ctx, model.name, layout.contentCenterX, layout.nameY, layout.contentW, 'bold {size}px Cinzel, Georgia, serif', layout.nameSize, PODIUM_CANVAS_THEME.feature.nameMin, 'center');

    if (model.isTeam && layout.members.length) {
      ctx.fillStyle = palette.accent;
      ctx.font = 'bold 22px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MEMBROS', layout.contentCenterX, layout.memberTitleY);
      layout.members.forEach((name, index) => {
        ctx.fillStyle = PODIUM_CANVAS_THEME.colors.text;
        drawFittingText(
          ctx,
          `${index + 1}. ${name}`,
          layout.contentCenterX,
          layout.membersY + index * layout.memberLineHeight,
          layout.contentW,
          'bold {size}px Inter, Arial, sans-serif',
          layout.memberSize,
          PODIUM_CANVAS_THEME.feature.memberMin,
          'center'
        );
      });
    } else if (layout.members.length) {
      ctx.fillStyle = PODIUM_CANVAS_THEME.colors.textSoft;
      drawFittingText(ctx, layout.members[0], layout.contentCenterX, layout.membersY, layout.contentW, 'bold {size}px Inter, Arial, sans-serif', layout.memberSize, PODIUM_CANVAS_THEME.feature.memberMin, 'center');
    }
    return;
  }

  if (model.trophyImage) {
    const trophyX = box.x + (box.w - layout.trophySize) / 2;
    drawContainCanvasImage(ctx, model.trophyImage, trophyX, layout.trophyY, layout.trophySize, layout.trophySize);
  }

  ctx.fillStyle = palette.accent;
  drawFittingText(ctx, placementLabel(model.place).toUpperCase(), layout.centerX, layout.rankY, layout.innerW, 'bold {size}px Inter, Arial, sans-serif', layout.rankSize, PODIUM_CANVAS_THEME.compact.rankMin, 'center');

  model.titleLines.forEach((line, index) => {
    ctx.fillStyle = palette.accent;
    drawFittingText(ctx, line, layout.centerX, layout.titleY + index * layout.titleLineHeight, layout.innerW, 'bold {size}px Inter, Arial, sans-serif', layout.titleSize, PODIUM_CANVAS_THEME.compact.titleMin, 'center');
  });

  ctx.fillStyle = PODIUM_CANVAS_THEME.colors.text;
  drawFittingText(ctx, model.name, layout.centerX, layout.nameY, layout.innerW, 'bold {size}px Cinzel, Georgia, serif', layout.nameSize, PODIUM_CANVAS_THEME.compact.nameMin, 'center');

  layout.memberLines.forEach((line, index) => {
    ctx.fillStyle = PODIUM_CANVAS_THEME.colors.textSoft;
    drawFittingText(
      ctx,
      line,
      layout.centerX,
      layout.membersY + index * layout.memberLineHeight,
      layout.innerW,
      'bold {size}px Inter, Arial, sans-serif',
      layout.memberSize,
      PODIUM_CANVAS_THEME.compact.memberMin,
      'center'
    );
  });
}

async function renderPodiumCanvas(options = {}) {
  const type = options.type === 'placement' ? 'placement' : 'full';
  const podium = options.podium || ligaState.bracket?.podium || {};
  const modo = options.modo || getModo();

  if (type === 'placement') {
    const place = options.place || 'gold';
    const unit = options.unit || podium[place];
    if (!unit) throw new Error(`Colocação ${place} ainda não foi definida.`);

    const cfg = PODIUM_CANVAS_THEME.placement;
    const palette = getPodiumPlacementPalette(place);
    const canvas = document.createElement('canvas');
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    const ctx = canvas.getContext('2d');
    const trophy = await loadImage(rootPath(placementTrophy(place, 'export')));
    const model = buildPodiumPlacementModel(place, unit, trophy);

    drawPodiumCanvasBackground(ctx, canvas, palette.background, palette.accent);
    drawPodiumCanvasFrame(ctx, cfg.frame, cfg.innerFrame, palette.accent);
    drawPodiumCanvasHeader(ctx, {
      canvas,
      leagueTitle: leagueCanvasTitle(modo),
      mainTitle: model.title,
      accent: palette.accent,
      leagueY: cfg.leagueTitleY,
      titleY: cfg.titleY,
      leagueSize: 28,
      titleSize: 56,
      titleMin: 30
    });

    const layout = resolvePodiumCardLayout(ctx, model, cfg.card, 'feature');
    drawPodiumPlacementCard(ctx, model, layout);
    drawPodiumCanvasFooter(ctx, canvas, cfg.footerY);
    return { canvas, models: [model], layouts: [layout] };
  }

  const cfg = PODIUM_CANVAS_THEME.full;
  const canvas = document.createElement('canvas');
  canvas.width = cfg.width;
  canvas.height = cfg.height;
  const ctx = canvas.getContext('2d');
  const order = ['silver', 'gold', 'bronze'];
  const trophies = await Promise.all(order.map(place => loadImage(rootPath(placementTrophy(place, 'export')))));
  const models = order.map((place, index) => buildPodiumPlacementModel(place, podium[place], trophies[index]));

  drawPodiumCanvasBackground(ctx, canvas, PODIUM_CANVAS_THEME.colors.fullBackground, '#f2c766');
  drawPodiumCanvasFrame(ctx, cfg.frame, cfg.innerFrame, 'rgba(242,199,102,0.58)');
  drawPodiumCanvasHeader(ctx, {
    canvas,
    leagueTitle: leagueCanvasTitle(modo),
    mainTitle: 'Pódio dos Campeões',
    accent: '#f2c766',
    leagueY: cfg.leagueTitleY,
    titleY: cfg.titleY
  });

  const boxes = resolveFullPodiumCardBoxes(ctx, models);
  const layouts = models.map((model, index) => resolvePodiumCardLayout(ctx, model, boxes[index], 'compact'));
  models.forEach((model, index) => drawPodiumPlacementCard(ctx, model, layouts[index]));
  drawPodiumCanvasFooter(ctx, canvas, cfg.footerY);
  return { canvas, models, layouts };
}

async function downloadPodiumImage() {
  const podium = ligaState.bracket?.podium || {};
  if (!podium.gold && !podium.silver && !podium.bronze) {
    showNotice('Pódio incompleto', 'Finalize o pódio antes de baixar a imagem.', 'warn');
    return;
  }

  const { canvas } = await renderPodiumCanvas({ type: 'full', podium, modo: getModo() });
  window.__lastLeaguePodiumCanvas = canvas;
  const link = document.createElement('a');
  link.download = `podio-liga-avalon-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showNotice('Imagem gerada', 'A imagem do pódio foi enviada para download.', 'success');
}

async function downloadPlacementCardImage(place = 'gold') {
  const podium = ligaState.bracket?.podium || {};
  const unit = podium[place];
  if (!unit) {
    showNotice('Colocação indefinida', `Finalize a Liga para baixar o card de ${placementTitle(place)}.`, 'warn');
    return;
  }

  const title = placementTitleFor(place, unit);
  const { canvas } = await renderPodiumCanvas({ type: 'placement', place, unit, podium, modo: getModo() });
  window.__lastLeaguePlacementCanvas = canvas;
  const link = document.createElement('a');
  link.download = `${slug(title)}-liga-avalon-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showNotice('Card gerado', `A imagem de ${title} foi enviada para download.`, 'success');
}

function downloadWinnerCardImage() {
  return downloadPlacementCardImage('gold');
}

function emptyLigaState() {
  return {
    modoId: '',
    participantes: [],
    ordem: [],
    teamMode: 'auto',
    manualTeams: [],
    bracket: null,
    phaseIndex: 0,
    battleStarted: false,
    savedAt: null
  };
}

function resetLeagueState({ clearDraft = false, render = true } = {}) {
  applySavedLiga(emptyLigaState());
  if (clearDraft) clearLigaStorage();
  if (render) renderAll();
}

function bindBracketActions() {
  $('[data-phase-prev]')?.addEventListener('click', () => {
    ligaState.phaseIndex -= 1;
    clampPhaseIndex();
    saveLiga();
    renderAll();
  });
  $('[data-phase-next]')?.addEventListener('click', () => {
    advanceToNextPhaseWithConfirmation();
  });
  $$('[data-phase-index]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      ligaState.phaseIndex = Number(button.dataset.phaseIndex || 0);
      clampPhaseIndex();
      saveLiga();
      renderAll();
    });
  });
  $('[data-download-phase-card]')?.addEventListener('click', downloadCurrentPhaseCard);
  $('[data-draw-phase-map]')?.addEventListener('click', drawCurrentPhaseMap);
  $$('[data-winner-match]').forEach(button => {
    button.addEventListener('click', () => chooseEliminationWinner(button.dataset.winnerMatch, button.dataset.winnerName));
  });
  $$('[data-undo-match]').forEach(button => {
    button.addEventListener('click', () => undoEliminationWinner(button.dataset.undoMatch));
  });
  $$('[data-survival-pick]').forEach(button => {
    button.addEventListener('click', () => {
      pickSurvivalPlacement(button.dataset.survivalPick, button.dataset.survivalName, button.dataset.survivalFinal === '1');
    });
  });
  $$('[data-clear-survival]').forEach(button => {
    button.addEventListener('click', () => clearSurvivalPlacements(button.dataset.clearSurvival, button.dataset.clearSurvivalFinal === '1'));
  });
  $('[data-scroll-podium-final]')?.addEventListener('click', () => document.querySelector('#league-podium')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function bindStaticEvents() {
  const navToggle = $('.nav-toggle');
  const nav = $('.main-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  $('#member-search')?.addEventListener('input', (event) => renderMemberSuggestions(event.target.value));
  $('#add-guest')?.addEventListener('click', addGuest);
  $('#guest-name')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addGuest();
  });
  $('#shuffle-participants')?.addEventListener('click', shuffleParticipants);
  $('#generate-bracket')?.addEventListener('click', generateBracket);
  $('#draw-all-maps')?.addEventListener('click', drawAllMaps);
  $('#copy-league-result')?.addEventListener('click', copyResult);
  $('#download-league-podium')?.addEventListener('click', downloadPodiumImage);
  $('#download-league-winner-card')?.addEventListener('click', downloadWinnerCardImage);
  $('#download-league-card-gold')?.addEventListener('click', () => downloadPlacementCardImage('gold'));
  $('#download-league-card-silver')?.addEventListener('click', () => downloadPlacementCardImage('silver'));
  $('#download-league-card-bronze')?.addEventListener('click', () => downloadPlacementCardImage('bronze'));
}

function renderAll() {
  renderModes();
  renderModeSummary();
  renderParticipants();
  renderTeamControls();
  renderDrawnOrder();
  renderBracket();
  renderPodium();
}

function showNotice(title, message, type = 'info', options = {}) {
  return window.AvalonUI?.showActionFeedback({
    title,
    message,
    type,
    persistent: Boolean(options.persistent),
    actions: options.actions || '',
    dismissOnBackdrop: Boolean(options.dismissOnBackdrop),
    role: options.persistent ? 'alertdialog' : 'status'
  });
}

function confirmNotice(title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar') {
  return new Promise((resolve) => {
    const overlay = showNotice(title, message, 'info', {
      persistent: true,
      actions: `
        <button class="btn btn-ghost" type="button" data-notice-cancel>${cancelLabel}</button>
        <button class="btn btn-primary" type="button" data-notice-confirm>${confirmLabel}</button>
      `
    });

    overlay.querySelector('[data-notice-cancel]')?.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('[data-notice-confirm]')?.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
  });
}

function initRevealAnimations() {
  if (window.AvalonUI?.initRevealAnimations) {
    window.AvalonUI.initRevealAnimations();
    return;
  }

  document.querySelectorAll('.reveal').forEach((element) => {
    element.classList.add('is-visible');
  });
}

async function initLiga() {
  const [arenaData, raidAtual] = await Promise.all([
    loadJson('data/arenas.json', { modos: [] }),
    loadJson('data/raids/raid_atual.json', { membros: [] })
  ]);

  ligaState.modos = arenaData.modos || [];
  ligaState.membrosAvalon = [...(raidAtual.membros || [])]
    .map(member => ({ nome: member.nome, status_participacao: member.status_participacao || '' }))
    .filter((member, index, arr) => member.nome && arr.findIndex(item => item.nome === member.nome) === index)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  bindStaticEvents();
  renderAll();
  initRevealAnimations();
}

function loadFirebaseIntegration() {
  const start = () => {
    const moduleUrl = new URL(rootPath('assets/js/liga-firebase.js'), document.baseURI).href;
    import(moduleUrl).catch((error) => {
      console.warn('[Portal Avalon] Liga online indisponível; modo local preservado.', error);
      window.AvalonUI?.showActionFeedback?.({
        title: 'Liga em modo local',
        message: 'A conexão online não foi concluída. A Liga local continua disponível.',
        type: 'warning',
        duration: 3200
      });
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1800 });
  } else {
    window.setTimeout(start, 80);
  }
}

function startLiga() {
  const task = initLiga();
  const registered = window.AvalonLoader?.register
    ? window.AvalonLoader.register('dados-da-liga', task, { message: 'Preparando a Liga...' })
    : task;

  Promise.resolve(registered)
    .catch(error => console.error('[Portal Avalon] Falha ao iniciar a Liga:', error))
    .finally(loadFirebaseIntegration);
}

window.AvalonLeagueStorage = Object.freeze({
  keys: Object.freeze({
    draft: LIGA_DRAFT_STORAGE_KEY,
    archives: LIGA_ARCHIVES_STORAGE_KEY,
    legacy: LIGA_LEGACY_STORAGE_KEY
  }),
  maxArchives: LIGA_MAX_ARCHIVES,
  readDraft: readLigaDraft,
  writeDraft: writeLigaDraft,
  clearDraft: clearLigaStorage,
  migrateLegacyDraft: migrateLegacyLigaDraft,
  readArchives: readLigaArchives,
  getArchive: getLigaArchive,
  archiveState: archiveLigaState,
  deleteArchive: deleteLigaArchive,
  duplicateArchiveState: duplicateLigaArchiveState,
  hasPodium: ligaStateHasPodium,
  snapshot: getLigaStateSnapshot,
  emptyState: emptyLigaState,
  applyState(state, options = {}) {
    applySavedLiga(state || emptyLigaState());
    if (options.persist === true) writeLigaDraft(getLigaStateSnapshot());
    if (options.render !== false) renderAll();
    return getLigaStateSnapshot();
  },
  resetActive(options = {}) {
    resetLeagueState({
      clearDraft: options.clearDraft !== false,
      render: options.render !== false
    });
  }
});

window.AvalonLeagueCanvas = Object.freeze({
  theme: LEAGUE_CANVAS_THEME,
  normalizeMatch: normalizeCanvasMatchData,
  resolveMatchLayout: resolveCanvasMatchLayout,
  resolvePhaseLayout: resolveLeaguePhaseLayout,
  render: renderLeagueCanvas
});

window.AvalonLeaguePodiumCanvas = Object.freeze({
  theme: PODIUM_CANVAS_THEME,
  buildModel: buildPodiumPlacementModel,
  resolveCardLayout: resolvePodiumCardLayout,
  resolveFullBoxes: resolveFullPodiumCardBoxes,
  render: renderPodiumCanvas
});

document.addEventListener('DOMContentLoaded', startLiga);
