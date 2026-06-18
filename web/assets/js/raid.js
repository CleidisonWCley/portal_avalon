/* ============================================================
   PORTAL AVALON — CONSULTA E ESTRATÉGIAS DE RAID
   Cartas visuais, feedback de busca e navegação dos resultados.
============================================================ */

const RAID_API_BASE = 'https://avalon-raid-api.cleidisonlima20.workers.dev';
const RAID_ASSET_BASE = 'https://gtales.top/assets';
const GT_TOP_RAID_BASE = 'https://gtales.top/raids/focus';
const RAID_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas
const RAID_CACHE_KEYS = {
  list: 'portal_avalon_raid_api_list',
  queryPrefix: 'portal_avalon_raid_api_query_',
  lastSearch: 'portal_avalon_raid_last_search'
};

const raidState = {
  list: [],
  selectedBoss: '',
  selectedElement: '',
  lastResults: [],
  usedCache: false,
  hasSearched: false,
  toastTimer: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function bindNav() {
  const navToggle = $('.nav-toggle');
  const nav = $('.main-nav');
  if (!navToggle || !nav) return;
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
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

function inlineStatusMeta(message = '', type = 'info') {
  const text = String(message || '');
  if (/conclu[ií]da com sucesso|composi/i.test(text)) {
    return { icon: 'check_circle', title: 'Composições encontradas', type: 'success' };
  }
  if (/cache/i.test(text)) {
    return { icon: 'inventory_2', title: 'Dados do cache local', type: 'warn' };
  }
  if (/boss selecionado/i.test(text)) {
    return { icon: 'target', title: 'Boss selecionado', type: 'info' };
  }
  if (/elemento selecionado/i.test(text)) {
    return { icon: 'auto_awesome', title: 'Elemento selecionado', type: 'info' };
  }
  if (/não foi possível|indispon/i.test(text)) {
    return { icon: 'warning', title: 'Fonte temporariamente indisponível', type: 'error' };
  }
  if (/escolha|antes/i.test(text)) {
    return { icon: 'info', title: 'Consulta incompleta', type: 'warn' };
  }
  if (/carregada|carregado/i.test(text)) {
    return { icon: 'check_circle', title: 'Dados carregados', type: type === 'warn' ? 'warn' : 'success' };
  }
  return { icon: type === 'warn' ? 'warning' : 'info', title: 'Consulta de Raid', type };
}

function setStatus(message = '', type = 'info') {
  const status = $('#raid-status');
  if (!status) return;
  const text = String(message || '').trim();
  status.dataset.type = type;
  if (!text) {
    status.innerHTML = '';
    status.classList.add('is-empty');
    return;
  }
  const meta = inlineStatusMeta(text, type);
  status.classList.remove('is-empty');
  status.innerHTML = `
    <div class="raid-status-card ${escapeHtml(meta.type)}">
      <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(meta.icon)}</span>
      <div>
        <strong>${escapeHtml(meta.title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    </div>
  `;
}

function floatingToastMeta(type = 'info') {
  const map = {
    loading: { icon: 'sync', title: 'Consultando estratégias' },
    success: { icon: 'check_circle', title: 'Composições encontradas' },
    empty: { icon: 'search_off', title: 'Nenhuma composição encontrada' },
    error: { icon: 'warning', title: 'Fonte temporariamente indisponível' },
    info: { icon: 'info', title: 'Consulta de Raid' }
  };
  return map[type] || map.info;
}

function showRaidToast({ type = 'info', title = '', message = '', autoHide = true, duration = 1400 } = {}) {
  window.clearTimeout(raidState.toastTimer);
  const meta = floatingToastMeta(type);
  window.AvalonUI?.showActionFeedback({
    type: type === 'empty' ? 'empty' : type,
    title: title || meta.title,
    message,
    persistent: !autoHide,
    duration
  });
}

function hideRaidToast() {
  window.clearTimeout(raidState.toastTimer);
  window.AvalonUI?.closeActionFeedback();
}

function setCacheBadge(show) {
  const badge = $('#raid-cache-badge');
  if (!badge) return;
  badge.classList.toggle('hidden', !show);
}

function showResultsSection() {
  const section = $('#raid-results-section');
  if (!section) return;
  section.classList.remove('hidden');
  section.classList.add('is-visible');
}

function hideResultsSection() {
  const section = $('#raid-results-section');
  if (!section) return;
  section.classList.add('hidden');
  setCacheBadge(false);
}

function raidStateCard({ type = 'info', icon = 'info', title = '', message = '' } = {}) {
  return `
    <div class="raid-state-card ${escapeHtml(type)}">
      <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(icon)}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
}

function formatDate(value) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normalizeLabel(value = '') {
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function stripHtml(html = '') {
  const normalized = String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = normalized;
  return (div.textContent || div.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function translateRaidInfoToPtBr(html = '') {
  const text = stripHtml(html);
  if (!text) return '';

  const replacements = [
    [/Completly RNG\.?/gi, 'Completamente dependente de RNG.'],
    [/Completely RNG\.?/gi, 'Completamente dependente de RNG.'],
    [/Your first WS might miss/gi, 'Sua primeira WS pode errar'],
    [/your first WS might miss/gi, 'sua primeira WS pode errar'],
    [/your Lilith might delay shred a lot/gi, 'sua Lilith pode atrasar bastante a redução de defesa'],
    [/your Callie might not get atk buff on chain/gi, 'sua Callie pode não receber buff de ATK na chain'],
    [/or straight up cancelled by hearts/gi, 'ou até ter a ação cancelada pelos corações'],
    [/Make sure to be far away from Carmen/gi, 'Garanta distância da Carmen'],
    [/make sure to be far away from Carmen/gi, 'garanta distância da Carmen'],
    [/before using WS during hearts/gi, 'antes de usar WS durante os corações'],
    [/so you don't get it cancelled/gi, 'para não ter a ação cancelada'],
    [/Heart Attack Pattern Gauge/gi, 'Medidor do padrão de ataque dos corações'],
    [/at (\d+) o'clock/gi, 'na posição de $1 horas'],
    [/Weapon Skill/gi, 'WS'],
    [/Leader Skill/gi, 'LS'],
    [/Downed/gi, 'Downed'],
    [/Your/gi, 'Sua'],
    [/might miss/gi, 'pode errar'],
    [/might delay/gi, 'pode atrasar'],
    [/Make sure/gi, 'Garanta'],
    [/before using/gi, 'antes de usar'],
    [/during hearts/gi, 'durante os corações'],
    [/atk buff/gi, 'buff de ATK'],
    [/def shred/gi, 'redução de DEF'],
    [/shred/gi, 'redução de defesa']
  ];

  let translated = text;
  replacements.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });

  return translated
    .replace(/\s+\./g, '.')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || !payload.timestamp) return null;
    if (Date.now() - payload.timestamp > RAID_CACHE_TTL) return null;
    return payload.data;
  } catch (error) {
    console.warn('Cache inválido da aba Raid:', error);
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (error) {
    console.warn('Não foi possível salvar cache da aba Raid:', error);
  }
}

function queryCacheKey(boss, element) {
  return `${RAID_CACHE_KEYS.queryPrefix}${boss}_${element}`;
}

async function fetchJsonWithCache(url, cacheKey, forceRefresh = false) {
  const cached = cacheGet(cacheKey);
  if (!forceRefresh && cached) {
    raidState.usedCache = true;
    return cached;
  }

  try {
    raidState.usedCache = false;
    const response = window.AvalonResources?.fetchWithTimeout
      ? await window.AvalonResources.fetchWithTimeout(url, {
        timeoutMs: 6000,
        retries: 0,
        fetchOptions: { cache: 'default' }
      })
      : await fetch(url, { cache: 'default' });

    if (!response.ok) throw new Error(`Falha ao consultar API (${response.status})`);
    const data = await response.json();
    cacheSet(cacheKey, data);
    return data;
  } catch (error) {
    if (cached) {
      raidState.usedCache = true;
      return cached;
    }
    throw error;
  }
}

function bossImageUrl(boss) {
  return boss ? `${RAID_ASSET_BASE}/bosses/${boss}.webp` : '';
}

function heroImageUrls(key) {
  if (!key) return [];
  const normalized = String(key).replace(/^\/+/, '');
  const shortKey = normalized.split('/').pop();

  // A GTales usa ícones quadrados. Priorizamos caminhos que já carregaram nos testes
  // e deixamos fallbacks extras para mitigar mudanças de diretório/formato.
  return uniqueList([
    `${RAID_ASSET_BASE}/heroes/${normalized}.png`,
    `${RAID_ASSET_BASE}/heroes/${normalized}.webp`,
    `${RAID_ASSET_BASE}/characters/${normalized}.png`,
    `${RAID_ASSET_BASE}/characters/${normalized}.webp`,
    `${RAID_ASSET_BASE}/portraits/${normalized}.png`,
    `${RAID_ASSET_BASE}/portraits/${normalized}.webp`,
    `${RAID_ASSET_BASE}/hero/${normalized}.png`,
    `${RAID_ASSET_BASE}/hero/${normalized}.webp`,
    `${RAID_ASSET_BASE}/heroes/${shortKey}.png`,
    `${RAID_ASSET_BASE}/heroes/${shortKey}.webp`,
    `${RAID_ASSET_BASE}/characters/${shortKey}.png`,
    `${RAID_ASSET_BASE}/characters/${shortKey}.webp`,
    `${RAID_ASSET_BASE}/portraits/${shortKey}.png`,
    `${RAID_ASSET_BASE}/portraits/${shortKey}.webp`,
    `${RAID_ASSET_BASE}/hero/${shortKey}.png`,
    `${RAID_ASSET_BASE}/hero/${shortKey}.webp`
  ]);
}

function weaponImageUrl(key) {
  return key ? `${RAID_ASSET_BASE}/weapons/${key}.webp` : '';
}

function accessImageUrl(key) {
  return key ? `${RAID_ASSET_BASE}/access/${key}.webp` : '';
}

function relicImageUrls(key) {
  if (!key) return [];
  const normalized = String(key).trim().toLowerCase().replace(/\s+/g, '-').replace(/^\/+/, '');
  const aliases = {
    chalice: ['chalice', 'cup'],
    cup: ['cup', 'chalice'],
    book: ['book'],
    candle: ['candle']
  };
  const keys = uniqueList([normalized, ...(aliases[normalized] || [])]);
  return uniqueList(keys.flatMap(item => [
    `${RAID_ASSET_BASE}/relics/${item}.webp`,
    `${RAID_ASSET_BASE}/relic/${item}.webp`,
    `${RAID_ASSET_BASE}/relics/${item}.png`,
    `${RAID_ASSET_BASE}/relic/${item}.png`,
    `${RAID_ASSET_BASE}/assets/relics/${item}.webp`,
    `${RAID_ASSET_BASE}/assets/relic/${item}.webp`
  ]));
}

const RAID_CARD_LABELS = {
  skill: 'Habilidade',
  crit: 'Crítico',
  atk7: 'Ataque',
  atk: 'Ataque',
  def: 'Defesa',
  hp: 'Vida'
};

function normalizeCardToken(token = '') {
  const key = String(token || '').trim().toLowerCase();
  if (!key) return '';
  return RAID_CARD_LABELS[key] || normalizeLabel(key);
}

function renderCardCombo(cards = '') {
  const raw = String(cards || '').trim();
  if (!raw) return '<span class="raid-card-chip muted">Não informado</span>';
  const tokens = raw.split('-').map(token => token.trim()).filter(Boolean);
  if (!tokens.length) return `<span class="raid-card-chip">${escapeHtml(raw)}</span>`;
  return `
    <span class="raid-card-combo" title="${escapeHtml(raw)}">
      ${tokens.map((token, index) => `
        ${index ? '<span class="raid-card-separator" aria-hidden="true">-</span>' : ''}
        <span class="raid-card-chip ${escapeHtml(String(token).toLowerCase())}">${escapeHtml(normalizeCardToken(token))}</span>
      `).join('')}
    </span>
  `;
}

function cardImageText(value) {
  return normalizeLabel(value || 'Não informado');
}

function officialRaidUrl(boss, element) {
  const params = new URLSearchParams({
    boss: boss || raidState.selectedBoss || '',
    element: element || raidState.selectedElement || '',
    fever: 'off',
    old: 'off'
  });
  return `${GT_TOP_RAID_BASE}?${params.toString()}`;
}

function localAsset(path = '') {
  const root = document.body?.dataset?.root || '';
  return `${root}${String(path).replace(/^\/+/, '')}`;
}

function normalizeElementKey(element = '') {
  return String(element || '').trim().toLowerCase();
}

function elementIconUrl(element = '') {
  const key = normalizeElementKey(element);
  return key ? localAsset(`assets/img/elements/${key}.png`) : '';
}

function elementIconMarkup(element = '', className = '') {
  const key = normalizeElementKey(element);
  const label = normalizeLabel(element || 'Elemento');
  if (!key) {
    return `<span class="raid-element-icon empty ${escapeHtml(className)}" aria-hidden="true"><span class="material-symbols-outlined">auto_awesome</span></span>`;
  }
  return `
    <span class="raid-element-icon element-${escapeHtml(key)} ${escapeHtml(className)}" aria-hidden="true">
      <img src="${escapeHtml(elementIconUrl(key))}" alt="" loading="lazy" decoding="async" />
    </span>
    <span class="sr-only">${escapeHtml(label)}</span>
  `;
}

function resultElementBadge(element = '') {
  const key = normalizeElementKey(element);
  const label = normalizeLabel(element || 'Elemento');
  return `
    <span class="raid-result-element element-${escapeHtml(key)}">
      ${elementIconMarkup(key, 'small')}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function safeLink(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function onImageLoad(event) {
  const img = event.currentTarget;
  const wrap = img.closest('.raid-image-wrap');
  const fallback = wrap?.querySelector('.raid-image-fallback');
  img.classList.remove('is-hidden');
  img.classList.add('is-loaded');
  wrap?.classList.add('has-image');
  if (fallback) fallback.classList.add('hidden');
}

function onImageError(event) {
  const img = event.currentTarget;
  const fallbackSources = img.dataset.fallbackSrcs ? JSON.parse(img.dataset.fallbackSrcs) : [];
  const nextIndex = Number(img.dataset.fallbackIndex || 0);

  if (fallbackSources[nextIndex]) {
    img.dataset.fallbackIndex = String(nextIndex + 1);
    img.src = fallbackSources[nextIndex];
    return;
  }

  img.classList.add('is-hidden');
  img.classList.remove('is-loaded');
  const wrap = img.closest('.raid-image-wrap');
  wrap?.classList.remove('has-image');
  const fallback = wrap?.querySelector('.raid-image-fallback');
  if (fallback) fallback.classList.remove('hidden');
}

function imageWithFallback(src, alt, fallbackText, className = '') {
  const sources = Array.isArray(src) ? src.filter(Boolean) : [src].filter(Boolean);
  const safeAlt = escapeHtml(alt);
  const safeFallback = escapeHtml(fallbackText || '?');
  const classText = String(className || '');
  const loadingMode = /(^|\s)(hero|boss|raid-hero-avatar)(\s|$)/.test(classText) ? 'eager' : 'lazy';

  if (!sources.length) {
    return `
      <div class="raid-image-wrap ${escapeHtml(className)}">
        <div class="raid-image-fallback">${safeFallback}</div>
      </div>
    `;
  }

  return `
    <div class="raid-image-wrap ${escapeHtml(className)}">
      <img src="${escapeHtml(sources[0])}" alt="${safeAlt}" loading="${loadingMode}" decoding="async" width="96" height="96" data-fallback-srcs='${escapeHtml(JSON.stringify(sources.slice(1)))}' data-fallback-index="0" />
      <div class="raid-image-fallback hidden">${safeFallback}</div>
    </div>
  `;
}

function prepareRaidImages(scope = document) {
  const images = [...scope.querySelectorAll('.raid-image-wrap img')];

  images.forEach(img => {
    img.removeEventListener('error', onImageError);
    img.removeEventListener('load', onImageLoad);
    img.addEventListener('error', onImageError);
    img.addEventListener('load', onImageLoad);

    if (img.complete && img.naturalWidth > 0) {
      onImageLoad({ currentTarget: img });
    } else if (img.complete && img.naturalWidth === 0) {
      onImageError({ currentTarget: img });
    }
  });
}

function setBossComboboxDisabled(disabled, label = '') {
  const combobox = $('#raid-boss-combobox');
  const trigger = $('#raid-boss-trigger');
  const current = $('#raid-boss-current');
  if (combobox) {
    combobox.classList.toggle('is-disabled', disabled);
    combobox.dataset.disabled = String(disabled);
  }
  if (trigger) trigger.disabled = disabled;
  if (label && current) current.textContent = label;
}

function closeBossCombobox() {
  const panel = $('#raid-boss-panel');
  const trigger = $('#raid-boss-trigger');
  const combobox = $('#raid-boss-combobox');
  panel?.classList.add('hidden');
  combobox?.classList.remove('is-open');
  trigger?.setAttribute('aria-expanded', 'false');
}

function openBossCombobox() {
  const combobox = $('#raid-boss-combobox');
  const panel = $('#raid-boss-panel');
  const trigger = $('#raid-boss-trigger');
  const search = $('#raid-boss-search');
  if (!combobox || combobox.dataset.disabled === 'true' || !panel) return;
  closeElementCombobox();
  panel.classList.remove('hidden');
  combobox.classList.add('is-open');
  trigger?.setAttribute('aria-expanded', 'true');
  renderBossComboboxList(search?.value || '');
  setTimeout(() => search?.focus(), 20);
}

function bossOptionMarkup(item, selected = false) {
  const boss = item?.boss || '';
  const label = normalizeLabel(boss);
  const elements = Array.isArray(item?.element) ? item.element.map(normalizeLabel).join(' • ') : '';
  return `
    <button class="raid-combobox-option ${selected ? 'is-selected' : ''}" type="button" role="option" data-boss="${escapeHtml(boss)}" aria-selected="${selected ? 'true' : 'false'}">
      ${imageWithFallback(bossImageUrl(boss), `Boss ${label}`, label.slice(0, 2), 'boss mini-boss')}
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(elements || 'Elementos indisponíveis')}</small>
      </span>
    </button>
  `;
}

function renderBossComboboxList(filter = '') {
  const list = $('#raid-boss-list');
  if (!list) return;
  const term = String(filter || '').trim().toLowerCase();
  const options = raidState.list.filter(item => normalizeLabel(item.boss).toLowerCase().includes(term) || String(item.boss).toLowerCase().includes(term));

  if (!options.length) {
    list.innerHTML = '<div class="raid-combobox-empty">Nenhum boss encontrado.</div>';
    return;
  }

  list.innerHTML = options.map(item => bossOptionMarkup(item, item.boss === raidState.selectedBoss)).join('');
  prepareRaidImages(list);
}

function selectBoss(boss, options = {}) {
  const bossSelect = $('#raid-boss-select');
  const current = $('#raid-boss-current');
  const previousBoss = raidState.selectedBoss;
  raidState.selectedBoss = boss || '';
  raidState.selectedElement = '';
  if (bossSelect) bossSelect.value = raidState.selectedBoss;
  if (current) current.textContent = raidState.selectedBoss ? normalizeLabel(raidState.selectedBoss) : 'Buscar boss...';
  if (previousBoss !== raidState.selectedBoss && options.keepResults !== true) {
    raidState.hasSearched = false;
    raidState.lastResults = [];
    hideResultsSection();
  }
  fillElementSelect(raidState.selectedBoss);
  updateSearchButton();
  renderBossComboboxList($('#raid-boss-search')?.value || '');
  if (options.close !== false) closeBossCombobox();
  if (raidState.selectedBoss && options.status !== false) {
    setStatus(`Boss selecionado: ${normalizeLabel(raidState.selectedBoss)}. Agora escolha o elemento.`, 'info');
  }
}

function fillBossSelect() {
  const bossSelect = $('#raid-boss-select');
  if (!bossSelect) return;

  if (!raidState.list.length) {
    bossSelect.innerHTML = '<option value="">Nenhum boss disponível</option>';
    bossSelect.disabled = true;
    setBossComboboxDisabled(true, 'Nenhum boss disponível');
    renderBossComboboxList('');
    return;
  }

  bossSelect.disabled = false;
  bossSelect.innerHTML = `
    <option value="">Escolha um boss</option>
    ${raidState.list.map(item => `<option value="${item.boss}">${normalizeLabel(item.boss)}</option>`).join('')}
  `;
  setBossComboboxDisabled(false, raidState.selectedBoss ? normalizeLabel(raidState.selectedBoss) : 'Buscar boss...');
  renderBossComboboxList('');
}

function setElementComboboxDisabled(disabled, label = '') {
  const combobox = $('#raid-element-combobox');
  const trigger = $('#raid-element-trigger');
  const current = $('#raid-element-current');
  const icon = $('#raid-element-current-icon');
  if (!combobox || !trigger) return;
  combobox.dataset.disabled = disabled ? 'true' : 'false';
  combobox.classList.toggle('is-disabled', Boolean(disabled));
  trigger.disabled = Boolean(disabled);
  if (label && current) current.textContent = label;
  if (icon && disabled) {
    icon.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span>';
  }
}

function updateElementComboboxCurrent(element = '') {
  const current = $('#raid-element-current');
  const icon = $('#raid-element-current-icon');
  if (current) current.textContent = element ? normalizeLabel(element) : (raidState.selectedBoss ? 'Escolha o elemento' : 'Escolha um boss primeiro');
  if (icon) icon.innerHTML = element ? elementIconMarkup(element, 'trigger-current') : '<span class="material-symbols-outlined">auto_awesome</span>';
}

function closeElementCombobox() {
  const combobox = $('#raid-element-combobox');
  const panel = $('#raid-element-panel');
  const trigger = $('#raid-element-trigger');
  if (!combobox || !panel) return;
  panel.classList.add('hidden');
  combobox.classList.remove('is-open');
  trigger?.setAttribute('aria-expanded', 'false');
}

function openElementCombobox() {
  const combobox = $('#raid-element-combobox');
  const panel = $('#raid-element-panel');
  const trigger = $('#raid-element-trigger');
  if (!combobox || combobox.dataset.disabled === 'true' || !panel) return;
  closeBossCombobox();
  panel.classList.remove('hidden');
  combobox.classList.add('is-open');
  trigger?.setAttribute('aria-expanded', 'true');
  renderElementComboboxList();
}

function elementOptionMarkup(element, selected = false) {
  const key = normalizeElementKey(element);
  return `
    <button class="raid-combobox-option raid-element-option ${selected ? 'is-selected' : ''}" type="button" role="option" data-element="${escapeHtml(element)}" aria-selected="${selected ? 'true' : 'false'}">
      ${elementIconMarkup(element, 'option-icon')}
      <span>
        <strong>${escapeHtml(normalizeLabel(element))}</strong>
        <small>${escapeHtml(key || 'elemento')}</small>
      </span>
    </button>
  `;
}

function renderElementComboboxList(elements = null) {
  const list = $('#raid-element-list');
  if (!list) return;
  const selectedBoss = raidState.list.find(item => item.boss === raidState.selectedBoss);
  const available = Array.isArray(elements) ? elements : (selectedBoss?.element || []);

  if (!raidState.selectedBoss) {
    list.innerHTML = '<div class="raid-combobox-empty">Escolha um boss primeiro.</div>';
    return;
  }

  if (!available.length) {
    list.innerHTML = '<div class="raid-combobox-empty">Nenhum elemento disponível para este boss.</div>';
    return;
  }

  list.innerHTML = available.map(element => elementOptionMarkup(element, element === raidState.selectedElement)).join('');
}

function selectElement(element, options = {}) {
  const elementSelect = $('#raid-element-select');
  const previousElement = raidState.selectedElement;
  raidState.selectedElement = element || '';
  if (elementSelect) elementSelect.value = raidState.selectedElement;
  if (previousElement !== raidState.selectedElement && options.keepResults !== true) {
    raidState.hasSearched = false;
    raidState.lastResults = [];
    hideResultsSection();
  }
  updateElementComboboxCurrent(raidState.selectedElement);
  const selected = raidState.list.find(item => item.boss === raidState.selectedBoss);
  renderElementComboboxList(selected?.element || []);
  updateSearchButton();
  if (options.close !== false) closeElementCombobox();
  if (raidState.selectedElement && options.status !== false) {
    setStatus(`Elemento selecionado: ${normalizeLabel(raidState.selectedElement)}. Pronto para buscar times.`, 'info');
  }
}

function fillElementSelect(boss) {
  const elementSelect = $('#raid-element-select');
  const searchButton = $('#raid-search-button');
  if (!elementSelect) return;
  const selected = raidState.list.find(item => item.boss === boss);
  const elements = selected?.element || [];

  raidState.selectedElement = '';
  closeElementCombobox();
  updateElementComboboxCurrent('');

  if (!boss || !elements.length) {
    elementSelect.innerHTML = '<option value="">Escolha um boss primeiro</option>';
    elementSelect.disabled = true;
    setElementComboboxDisabled(true, boss ? 'Nenhum elemento disponível' : 'Escolha um boss primeiro');
    renderElementComboboxList([]);
    if (searchButton) searchButton.disabled = true;
    return;
  }

  elementSelect.disabled = false;
  elementSelect.innerHTML = `
    <option value="">Escolha o elemento</option>
    ${elements.map(element => `<option value="${element}">${normalizeLabel(element)}</option>`).join('')}
  `;
  setElementComboboxDisabled(false, 'Escolha o elemento');
  renderElementComboboxList(elements);
  if (elements.length === 1) {
    selectElement(elements[0], { status: false, close: true });
  }
  if (searchButton) searchButton.disabled = !(raidState.selectedBoss && raidState.selectedElement);
}

function updateSearchButton() {
  const searchButton = $('#raid-search-button');
  if (!searchButton) return;
  searchButton.disabled = !(raidState.selectedBoss && raidState.selectedElement);
}

function renderInitialGuidance() {
  hideResultsSection();
  setCacheBadge(false);
  setStatus('');
}

function scrollToFirstComposition() {
  const firstCard = $('#raid-composition-1') || document.querySelector('.raid-team-card');
  if (!firstCard) return;
  window.setTimeout(() => {
    firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 180);
}

function renderLoadingState() {
  hideResultsSection();
}

function renderError(message) {
  hideResultsSection();
  showRaidToast({
    type: 'error',
    title: 'Fonte temporariamente indisponível',
    message: message || 'Não foi possível consultar os dados no momento.',
    autoHide: true,
    duration: 2200
  });
}

function renderNoResults() {
  hideResultsSection();
  showRaidToast({
    type: 'empty',
    title: 'Nenhuma composição encontrada',
    message: 'Tente outra combinação de boss e elemento.',
    autoHide: true,
    duration: 1900
  });
}

function renderHeroSlot(team, index) {
  const hero = team.heroes?.[index] || `Herói ${index + 1}`;
  const heroKey = team.heroesAtr?.[index] || '';
  const weaponKey = team.weaponsAtr?.[index] || '';
  const access = team.access?.[index] || '';
  const cards = team.cards?.[index] || '';
  const heroFallback = hero.split(' ')[0]?.slice(0, 2) || 'H';

  return `
    <article class="raid-hero-slot">
      <div class="raid-hero-avatar-box">
        ${imageWithFallback(heroImageUrls(heroKey), hero, heroFallback, 'hero raid-hero-avatar')}
      </div>
      <div class="raid-hero-info">
        <strong>${escapeHtml(hero)}</strong>
        <span>Herói da composição</span>
      </div>
      <div class="raid-gear-line" aria-label="Equipamentos de ${escapeHtml(hero)}">
        <div class="raid-gear-item">
          ${imageWithFallback(weaponImageUrl(weaponKey), `Arma de ${hero}`, 'Arma', 'mini')}
          <span>Arma</span>
        </div>
        <div class="raid-gear-item">
          ${imageWithFallback(accessImageUrl(access), `Acessório ${cardImageText(access)}`, cardImageText(access), 'mini')}
          <span>Acessório</span>
        </div>
      </div>
      <dl class="raid-mini-stats">
        <div><dt>Cartas</dt><dd>${renderCardCombo(cards)}</dd></div>
      </dl>
    </article>
  `;
}

function renderChains(chains = {}) {
  const patterns = Object.entries(chains || {});
  if (!patterns.length) return '<p class="raid-muted">Nenhuma sequência de chain informada.</p>';

  return patterns.map(([pattern, steps]) => {
    const lines = Object.entries(steps || {}).map(([step, text]) => `
      <li class="raid-chain-step">
        <span class="raid-chain-label">Chain ${escapeHtml(step)}</span>
        <p>${escapeHtml(text)}</p>
      </li>
    `).join('');

    return `
      <div class="raid-chain-pattern">
        <span class="raid-chain-phase">${escapeHtml(pattern)}</span>
        <ol>${lines}</ol>
      </div>
    `;
  }).join('');
}

function renderTeamCard(team, index) {
  const video = safeLink(team.video || '');
  const infos = translateRaidInfoToPtBr(team.infos || '');
  const label = team.label ? ` • ${team.label}` : '';
  const boss = team.boss || raidState.selectedBoss;
  const element = team.element || raidState.selectedElement;
  const stun = team.stun ? `<span>Skills p/ Stun: ${escapeHtml(team.stun)}</span>` : '';
  const relic = team.relic ? `
    <span class="raid-relic-chip">
      ${imageWithFallback(relicImageUrls(team.relic), `Relíquia ${normalizeLabel(team.relic)}`, normalizeLabel(team.relic).slice(0, 2), 'relic mini-relic')}
      <span>Relíquia: ${escapeHtml(normalizeLabel(team.relic))}</span>
    </span>
  ` : '';
  const officialUrl = officialRaidUrl(boss, element);
  const observationBlock = infos ? `
        <section class="raid-strategy-box">
          <h4>Observações</h4>
          <p>${escapeHtml(infos)}</p>
        </section>
      ` : '';

  return `
    <article id="raid-composition-${index + 1}" class="raid-team-card medieval-card ${index === 0 ? 'gold-frame' : 'blue-frame'}">
      <header class="raid-team-head">
        <div class="raid-boss-title">
          ${imageWithFallback(bossImageUrl(boss), `Boss ${normalizeLabel(boss)}`, normalizeLabel(boss).slice(0, 2), 'boss')}
          <div>
            <p class="eyebrow raid-team-eyebrow">${escapeHtml(normalizeLabel(boss))}${escapeHtml(label)} ${resultElementBadge(element)}</p>
            <h3>Composição #${index + 1}</h3>
            <p>Player: <strong>${escapeHtml(team.player || team.videoCreator || 'Comunidade')}</strong></p>
          </div>
        </div>
        <div class="raid-damage-box">
          <span>Dano total</span>
          <strong>${formatNumber(team.dmg)}M</strong>
          <small>Fever total: ${formatNumber(team.feverDmg)}M</small>
        </div>
      </header>

      <div class="raid-team-meta">
        ${relic}
        ${stun}
        <span>Temporada: ${escapeHtml(team.season || '—')}</span>
        <span>Atualizado: ${escapeHtml(formatDate(team.lastUpdate))}</span>
      </div>

      <div class="raid-heroes-grid">
        ${[0, 1, 2, 3].map(slot => renderHeroSlot(team, slot)).join('')}
      </div>

      <div class="raid-strategy-grid ${infos ? '' : 'single'}">
        <section class="raid-strategy-box">
          <h4>Chains da composição</h4>
          ${renderChains(team.chains)}
        </section>
        ${observationBlock}
      </div>

      <div class="raid-card-actions">
        <a class="btn btn-secondary raid-source-link" href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
          Ver no Guardian Tales TOP
        </a>
        ${video ? `<a class="btn btn-primary raid-video-link" href="${escapeHtml(video)}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined" aria-hidden="true">play_circle</span>Assistir vídeo</a>` : ''}
      </div>
    </article>
  `;
}

function renderResults(results = []) {
  const resultContainer = $('#raid-results');
  const summary = $('#raid-result-summary');
  if (!resultContainer) return;

  if (!Array.isArray(results) || !results.length) {
    renderNoResults();
    return;
  }

  showResultsSection();
  const boss = normalizeLabel(raidState.selectedBoss);
  const element = normalizeLabel(raidState.selectedElement);
  if (summary) {
    summary.textContent = `${results.length} composição(ões) encontradas para ${boss} • ${element}.`;
  }
  setCacheBadge(raidState.usedCache);
  resultContainer.className = 'raid-results has-results';
  resultContainer.innerHTML = `
    <div class="raid-team-list">
      ${results.map((team, index) => renderTeamCard(team, index)).join('')}
    </div>
  `;
  prepareRaidImages(resultContainer);
}

async function loadRaidList(forceRefresh = false) {
  const bossSelect = $('#raid-boss-select');
  const elementSelect = $('#raid-element-select');
  const searchButton = $('#raid-search-button');
  if (bossSelect) bossSelect.innerHTML = '<option value="">Carregando bosses...</option>';
  if (bossSelect) bossSelect.disabled = true;
  if (elementSelect) elementSelect.disabled = true;
  if (searchButton) searchButton.disabled = true;
  if (forceRefresh) {
    setStatus('Atualizando lista de bosses pelo Worker GTales.top...', 'info');
  } else {
    setStatus('');
  }

  try {
    const data = await fetchJsonWithCache(RAID_API_BASE, RAID_CACHE_KEYS.list, forceRefresh);
    const list = Array.isArray(data?.list) ? data.list : [];
    raidState.list = list.filter(item => item?.boss && Array.isArray(item.element));
    fillBossSelect();
    if (forceRefresh) {
      setStatus('Lista de bosses atualizada com sucesso.', 'success');
    } else {
      setStatus('');
    }
    restoreLastSearch();
  } catch (error) {
    console.error(error);
    setStatus('Não foi possível carregar os dados pelo Worker GTales.top no momento.', 'warn');
    hideResultsSection();
    if (bossSelect) bossSelect.innerHTML = '<option value="">API indisponível</option>';
    setBossComboboxDisabled(true, 'API indisponível');
  }
}

async function searchTeams(forceRefresh = false) {
  if (!raidState.selectedBoss || !raidState.selectedElement) {
    setStatus('Escolha um boss e um elemento antes de buscar os times.', 'warn');
    return;
  }

  const url = `${RAID_API_BASE}?boss=${encodeURIComponent(raidState.selectedBoss)}&element=${encodeURIComponent(raidState.selectedElement)}`;
  closeBossCombobox();
  closeElementCombobox();
  raidState.hasSearched = true;
  raidState.lastResults = [];
  hideResultsSection();
  setStatus('');
  showRaidToast({
    type: 'loading',
    title: 'Consultando estratégias',
    message: 'Buscando times recomendados...',
    autoHide: false
  });

  try {
    const data = await fetchJsonWithCache(url, queryCacheKey(raidState.selectedBoss, raidState.selectedElement), forceRefresh);
    raidState.lastResults = Array.isArray(data) ? data : [];
    localStorage.setItem(RAID_CACHE_KEYS.lastSearch, JSON.stringify({ boss: raidState.selectedBoss, element: raidState.selectedElement }));

    if (!raidState.lastResults.length) {
      renderNoResults();
      return;
    }

    renderResults(raidState.lastResults);
    showRaidToast({
      type: 'success',
      title: 'Composições encontradas',
      message: 'Consulta concluída com sucesso.',
      autoHide: true,
      duration: 1200
    });
    scrollToFirstComposition();
  } catch (error) {
    console.error(error);
    renderError('Não foi possível consultar os dados no momento.');
  }
}

function restoreLastSearch() {
  try {
    const raw = localStorage.getItem(RAID_CACHE_KEYS.lastSearch);
    if (!raw) return;
    const last = JSON.parse(raw);
    if (!last?.boss || !last?.element) return;
    const bossExists = raidState.list.some(item => item.boss === last.boss);
    if (!bossExists) return;
    selectBoss(last.boss, { close: true, status: false });
    const selected = raidState.list.find(item => item.boss === last.boss);
    const elementExists = selected?.element?.includes(last.element);
    if (!elementExists) return;
    selectElement(last.element, { status: false });
    updateSearchButton();
  } catch (error) {
    console.warn('Não foi possível restaurar a última consulta da Raid:', error);
  }
}

function clearSearch() {
  const bossSelect = $('#raid-boss-select');
  const elementSelect = $('#raid-element-select');
  const bossSearch = $('#raid-boss-search');
  const bossCurrent = $('#raid-boss-current');
  raidState.selectedBoss = '';
  raidState.selectedElement = '';
  raidState.lastResults = [];
  raidState.hasSearched = false;
  if (bossSelect) bossSelect.value = '';
  if (elementSelect) elementSelect.value = '';
  if (bossSearch) bossSearch.value = '';
  if (bossCurrent) bossCurrent.textContent = raidState.list.length ? 'Buscar boss...' : 'Carregando bosses...';
  closeBossCombobox();
  closeElementCombobox();
  fillElementSelect('');
  renderBossComboboxList('');
  updateSearchButton();
  localStorage.removeItem(RAID_CACHE_KEYS.lastSearch);
  renderInitialGuidance();
  hideRaidToast();
}

function bindRaidEvents() {
  const bossSelect = $('#raid-boss-select');
  const elementSelect = $('#raid-element-select');
  const form = $('#raid-search-form');
  const refreshButton = $('#raid-refresh-button');
  const clearButton = $('#raid-clear-button');
  const bossTrigger = $('#raid-boss-trigger');
  const bossSearch = $('#raid-boss-search');
  const bossList = $('#raid-boss-list');
  const elementTrigger = $('#raid-element-trigger');
  const elementList = $('#raid-element-list');
  bossTrigger?.addEventListener('click', () => {
    const panel = $('#raid-boss-panel');
    if (panel?.classList.contains('hidden')) openBossCombobox();
    else closeBossCombobox();
  });

  bossSearch?.addEventListener('input', (event) => {
    renderBossComboboxList(event.target.value);
  });

  bossSearch?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBossCombobox();
      bossTrigger?.focus();
    }
  });

  bossList?.addEventListener('click', (event) => {
    const option = event.target.closest('[data-boss]');
    if (!option) return;
    selectBoss(option.dataset.boss || '');
  });

  elementTrigger?.addEventListener('click', () => {
    const panel = $('#raid-element-panel');
    if (panel?.classList.contains('hidden')) openElementCombobox();
    else closeElementCombobox();
  });

  elementTrigger?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeElementCombobox();
      elementTrigger.focus();
    }
  });

  elementList?.addEventListener('click', (event) => {
    const option = event.target.closest('[data-element]');
    if (!option) return;
    selectElement(option.dataset.element || '');
  });

  document.addEventListener('click', (event) => {
    const bossCombobox = $('#raid-boss-combobox');
    const elementCombobox = $('#raid-element-combobox');
    if (bossCombobox && !bossCombobox.contains(event.target)) closeBossCombobox();
    if (elementCombobox && !elementCombobox.contains(event.target)) closeElementCombobox();
  });

  bossSelect?.addEventListener('change', (event) => {
    selectBoss(event.target.value || '');
  });

  elementSelect?.addEventListener('change', (event) => {
    selectElement(event.target.value || '');
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchTeams(false);
  });

  refreshButton?.addEventListener('click', async () => {
    if (raidState.selectedBoss && raidState.selectedElement) {
      await searchTeams(true);
    } else {
      await loadRaidList(true);
    }
  });

  clearButton?.addEventListener('click', clearSearch);
}

async function initRaidPage() {
  bindNav();
  initRevealAnimations();
  bindRaidEvents();
  renderInitialGuidance();
  await loadRaidList(false);
}

function startRaidPage() {
  const task = initRaidPage();
  if (window.AvalonLoader?.register) {
    window.AvalonLoader.register('lista-inicial-da-raid', task, {
      message: 'Carregando estratégias de Raid...'
    });
  } else {
    task.catch(error => console.error('[Portal Avalon] Falha ao iniciar a Raid:', error));
  }
}

document.addEventListener('DOMContentLoaded', startRaidPage);
