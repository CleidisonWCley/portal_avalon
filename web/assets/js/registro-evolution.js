/* ============================================================
   PORTAL AVALON — EVOLUÇÃO INDIVIDUAL E COLETIVA DO REGISTRO
============================================================ */

(function () {
  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const compactFormatter = new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 2
  });

  const localState = {
    snapshot: null,
    membersByKey: new Map(),
    panelCache: new Map(),
    openKey: null,
    activeTrigger: null,
    order: 'desc',
    resizeTimer: null,
    inertState: new Map()
  };

  const selectors = {
    modal: '#registro-evolution-modal',
    dialog: '#registro-evolution-dialog',
    title: '#registro-evolution-modal-title',
    content: '#registro-evolution-modal-content',
    close: '[data-registro-evolution-close]'
  };

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatCompact(value) {
    return compactFormatter.format(safeNumber(value));
  }

  function formatFull(value) {
    return numberFormatter.format(safeNumber(value));
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Sem comparativo';
    const number = Number(value);
    const sign = number > 0 ? '+' : '';
    return `${sign}${number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }

  function isEstimated(item) {
    return item?.confidence === 'estimada' || item?.source === 'seed_planilha';
  }

  function sourceLabel(item) {
    if (item?.confidence === 'insuficiente') return 'Insuficiente';
    if (item?.confidence === 'parcial') return 'Parcial';
    return isEstimated(item) ? 'Estimada' : 'Oficial';
  }

  function sourceClass(item) {
    if (item?.confidence === 'insuficiente') return 'neutral';
    if (item?.confidence === 'parcial') return 'partial';
    return isEstimated(item) ? 'estimated' : 'official';
  }

  function trendMeta(variation, returnToBattle = false) {
    if (returnToBattle) {
      return {
        label: 'Retorno à batalha',
        icon: '↻',
        className: 'stable',
        note: 'Sem raid oficial anterior'
      };
    }
    if (variation === null || variation === undefined || !Number.isFinite(Number(variation))) {
      return {
        label: 'Sem comparativo',
        icon: '–',
        className: 'neutral',
        note: 'Dados oficiais insuficientes'
      };
    }
    if (Number(variation) > 0.5) return { label: 'Crescimento', icon: '↗', className: 'positive', note: '' };
    if (Number(variation) < -0.5) return { label: 'Queda', icon: '↘', className: 'negative', note: '' };
    return { label: 'Estabilidade', icon: '→', className: 'stable', note: '' };
  }

  function variationBetween(current, previous) {
    const currentValue = safeNumber(current);
    const previousValue = safeNumber(previous);
    if (currentValue <= 0 || previousValue <= 0) return null;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  function statusLabel(entry) {
    const labels = {
      raid_atual: 'Raid atual',
      incluida_media: 'Incluída na média',
      base_estimada: 'Utilizada como estimativa',
      fora_media_frequencia: 'Fora da média por frequência',
      sem_registro: 'Sem registro nesta raid'
    };
    return labels[entry?.status] || 'Registro histórico';
  }

  function metricMarkup(label, value, note, className = '') {
    return `
      <article class="registro-evolution-metric ${className}">
        <span>${escapeHtml(label)}</span>
        <strong>${value}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `;
  }

  function orderedTimeline(member) {
    return [...(member?.timeline || [])]
      .sort((a, b) => safeNumber(b.order) - safeNumber(a.order));
  }

  function currentAndPreviousOfficial(member) {
    const byOrder = [...(member?.timeline || [])].sort((a, b) => safeNumber(a.order) - safeNumber(b.order));
    const current = byOrder.find(entry => safeNumber(entry.order) === 0 && safeNumber(entry.damage) > 0) || null;
    const previous = byOrder.find(entry => safeNumber(entry.order) === 1 && safeNumber(entry.damage) > 0) || null;
    return { current, previous };
  }

  function chartDimensions() {
    const compact = window.matchMedia('(max-width: 720px)').matches;
    return compact
      ? { width: 430, height: 252, pad: { left: 32, right: 32, top: 48, bottom: 56 }, compact: true }
      : { width: 760, height: 276, pad: { left: 38, right: 38, top: 52, bottom: 62 }, compact: false };
  }

  function markerMarkup(point, className) {
    if (className === 'estimated') {
      const size = 6;
      return `<path d="M ${point.x} ${point.y - size} L ${point.x + size} ${point.y} L ${point.x} ${point.y + size} L ${point.x - size} ${point.y} Z"></path>`;
    }
    return `<circle cx="${point.x}" cy="${point.y}" r="5.5"></circle>`;
  }

  function buildEvolutionChart(points, options = {}) {
    const valid = points.filter(point => point.value !== null && safeNumber(point.value) > 0);
    if (!valid.length) {
      return '<p class="registro-evolution-empty">Não há dados suficientes para desenhar o gráfico.</p>';
    }

    const { width, height, pad, compact } = chartDimensions();
    const values = valid.map(point => safeNumber(point.value));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(maxValue - minValue, maxValue * 0.045, 1);
    const low = Math.max(0, minValue - spread * 0.24);
    const high = maxValue + spread * 0.26;
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    const positions = points.map((point, index) => {
      const x = points.length === 1
        ? pad.left + chartWidth / 2
        : pad.left + (chartWidth * index) / (points.length - 1);
      if (point.value === null || safeNumber(point.value) <= 0) return { ...point, x, y: null, index };
      const ratio = (safeNumber(point.value) - low) / Math.max(high - low, 1);
      return { ...point, x, y: pad.top + chartHeight - ratio * chartHeight, index };
    });

    const continuousSegments = [];
    let activeSegment = [];
    positions.forEach(point => {
      if (point.y === null) {
        if (activeSegment.length) continuousSegments.push(activeSegment);
        activeSegment = [];
        return;
      }
      activeSegment.push(point);
    });
    if (activeSegment.length) continuousSegments.push(activeSegment);

    const pathMarkup = continuousSegments
      .filter(segment => segment.length > 1)
      .map(segment => {
        const d = segment
          .map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
          .join(' ');
        return `<path class="registro-evolution-line" d="${d}"></path>`;
      })
      .join('');

    const gridLines = [0, 0.5, 1].map(step => {
      const y = pad.top + chartHeight * step;
      return `
        <line class="registro-evolution-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      `;
    }).join('');

    const pointMarkup = positions.map(point => {
      if (point.y === null) {
        return `
          <g class="registro-evolution-point missing">
            <text class="registro-evolution-label" x="${point.x}" y="${height - 23}" text-anchor="middle">${escapeHtml(point.label)}</text>
            <text class="registro-evolution-missing-label" x="${point.x}" y="${pad.top + chartHeight / 2}" text-anchor="middle">Sem registro</text>
          </g>
        `;
      }

      const markerClass = point.sourceClass || 'official';
      const alternatingOffset = point.index % 2 === 0 ? 24 : 38;
      const labelY = Math.max(17, point.y - alternatingOffset);
      return `
        <g class="registro-evolution-point ${markerClass}">
          ${markerMarkup(point, markerClass)}
          <text class="registro-evolution-value" x="${point.x}" y="${labelY}" text-anchor="middle">${escapeHtml(formatCompact(point.value))}</text>
          <text class="registro-evolution-label" x="${point.x}" y="${height - 23}" text-anchor="middle">${escapeHtml(point.label)}</text>
        </g>
      `;
    }).join('');

    const description = options.description || points.map(point => (
      `${point.label}: ${point.value === null ? 'sem registro' : formatFull(point.value)}`
    )).join('; ');

    return `
      <div class="registro-evolution-chart-frame" aria-label="${escapeHtml(options.ariaLabel || 'Gráfico de evolução')}">
        <svg class="registro-evolution-chart ${options.className || ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(description)}" preserveAspectRatio="xMidYMid meet">
          ${gridLines}
          ${pathMarkup}
          ${pointMarkup}
        </svg>
        ${compact ? '<p class="registro-chart-hint">Valores completos disponíveis no histórico abaixo.</p>' : ''}
      </div>
    `;
  }

  function individualChartMarkup(member) {
    const timeline = orderedTimeline(member);
    return buildEvolutionChart(timeline.map(entry => ({
      label: entry.label,
      value: entry.damage,
      sourceClass: sourceClass(entry)
    })), {
      ariaLabel: `Gráfico da evolução de ${member.name}`,
      description: timeline.map(entry => `${entry.label}: ${entry.damage === null ? 'sem registro' : formatFull(entry.damage)}`).join('; ')
    });
  }

  function historyListMarkup(member) {
    return orderedTimeline(member).map(entry => {
      const hasDamage = entry.damage !== null && safeNumber(entry.damage) > 0;
      const frequency = entry.frequency || (entry.knownFrequency ? `${entry.attacks}/21` : 'Desconhecida');
      return `
        <article class="registro-history-item ${sourceClass(entry)}">
          <div class="registro-history-item-head">
            <strong>${escapeHtml(entry.label)}</strong>
            <span class="registro-source-badge ${sourceClass(entry)}">${escapeHtml(sourceLabel(entry))}</span>
          </div>
          <dl>
            <div><dt>Dano</dt><dd>${hasDamage ? escapeHtml(formatCompact(entry.damage)) : 'Sem registro'}</dd></div>
            <div><dt>Frequência</dt><dd>${escapeHtml(frequency)}</dd></div>
            <div><dt>Situação</dt><dd>${escapeHtml(statusLabel(entry))}</dd></div>
          </dl>
        </article>
      `;
    }).join('');
  }

  function individualPanelMarkup(member) {
    const cacheKey = `${member.key}:${window.matchMedia('(max-width: 720px)').matches ? 'compact' : 'wide'}`;
    if (localState.panelCache.has(cacheKey)) return localState.panelCache.get(cacheKey);

    const { current, previous } = currentAndPreviousOfficial(member);
    const recentVariation = current && previous ? variationBetween(current.damage, previous.damage) : null;
    const trend = trendMeta(recentVariation, member.returnToBattle);
    const best = [...(member.timeline || [])]
      .filter(entry => entry.damage !== null && safeNumber(entry.damage) > 0)
      .sort((a, b) => safeNumber(b.damage) - safeNumber(a.damage))[0] || null;
    const currentDamage = current?.damage ?? member.currentDamage;

    const markup = `
      <div class="registro-evolution-modal-grid">
        <div class="registro-evolution-modal-main">
          <div class="registro-evolution-metrics">
            ${metricMarkup('Dano atual', currentDamage > 0 ? formatCompact(currentDamage) : 'Sem registro', current?.label || 'Raid atual')}
            ${metricMarkup('Variação recente', formatPercent(recentVariation), previous ? `contra ${previous.label}` : 'sem raid oficial anterior', trend.className)}
            ${metricMarkup('Melhor marca', best ? formatCompact(best.damage) : 'Sem registro', best ? best.label : 'histórico insuficiente')}
            ${metricMarkup('Tendência', `<span class="registro-trend-icon" aria-hidden="true">${trend.icon}</span><span class="registro-trend-label">${escapeHtml(trend.label)}</span>`, current && previous ? `${previous.label} → ${current.label}` : trend.note, trend.className)}
          </div>
          ${individualChartMarkup(member)}
        </div>
        <div class="registro-evolution-modal-history">
          <div class="registro-history-list" aria-label="Histórico detalhado de ${escapeHtml(member.name)}">
            ${historyListMarkup(member)}
          </div>
          <p class="registro-evolution-note">Média base atual: <strong>${member.averageBase === null ? 'Sem base suficiente' : escapeHtml(formatCompact(member.averageBase))}</strong> · Confiança: <strong>${escapeHtml(sourceLabel({ confidence: member.baseConfidence }))}</strong>.</p>
        </div>
      </div>
    `;
    localState.panelCache.set(cacheKey, markup);
    return markup;
  }

  function modalElements() {
    return {
      modal: document.querySelector(selectors.modal),
      dialog: document.querySelector(selectors.dialog),
      title: document.querySelector(selectors.title),
      content: document.querySelector(selectors.content),
      close: document.querySelector(selectors.close)
    };
  }

  function setBackgroundInert(enabled) {
    const { modal } = modalElements();
    if (!modal) return;
    [...document.body.children].forEach(element => {
      if (element === modal) return;
      if (enabled) {
        localState.inertState.set(element, Boolean(element.inert));
        element.inert = true;
      } else {
        element.inert = localState.inertState.get(element) || false;
      }
    });
    if (!enabled) localState.inertState.clear();
  }

  function focusableElements() {
    const { dialog } = modalElements();
    if (!dialog) return [];
    return [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.disabled && element.getAttribute('aria-hidden') !== 'true');
  }

  function closeModal({ restoreFocus = true } = {}) {
    const { modal, content } = modalElements();
    if (!modal || !localState.openKey) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    setBackgroundInert(false);
    document.querySelectorAll('.registro-evolution-toggle[aria-expanded="true"]').forEach(button => {
      button.setAttribute('aria-expanded', 'false');
    });
    if (content) content.innerHTML = '';

    const trigger = localState.activeTrigger;
    localState.openKey = null;
    localState.activeTrigger = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }

  function openMemberModal(button, member) {
    const { modal, dialog, title, content, close } = modalElements();
    if (!modal || !dialog || !title || !content || !close) return;

    if (localState.openKey) closeModal({ restoreFocus: false });
    localState.openKey = member.key;
    localState.activeTrigger = button;
    button.setAttribute('aria-expanded', 'true');
    title.textContent = `${member.name} — evolução individual`;
    content.innerHTML = individualPanelMarkup(member);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setBackgroundInert(true);
    dialog.scrollTop = 0;
    close.focus({ preventScroll: true });
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !localState.openKey) return;
    const focusables = focusableElements();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function raidRows() {
    const raids = [...(localState.snapshot?.raids || [])]
      .sort((a, b) => safeNumber(b.order) - safeNumber(a.order));

    return raids.map((raid, index) => {
      const total = safeNumber(raid?.summary?.totalDamage);
      const participants = safeNumber(raid?.summary?.participants);
      const average = participants > 0 ? total / participants : null;
      const previous = index > 0 ? raids[index - 1] : null;
      const previousTotal = previous ? safeNumber(previous?.summary?.totalDamage) : 0;
      return {
        ...raid,
        total,
        participants,
        average,
        variation: previous ? variationBetween(total, previousTotal) : null
      };
    });
  }

  function guildChartMarkup(rows) {
    if (rows.length < 2) {
      return '<p class="registro-evolution-empty">São necessárias pelo menos duas raids para montar a comparação coletiva.</p>';
    }
    return buildEvolutionChart(rows.map(row => ({
      label: row.label,
      value: row.total,
      sourceClass: sourceClass(row)
    })), {
      className: 'registro-guild-chart',
      ariaLabel: 'Gráfico do dano total da guilda',
      description: rows.map(row => `${row.label}: ${formatFull(row.total)}`).join('; ')
    });
  }

  function guildMetricMarkup(rows) {
    const current = rows[rows.length - 1];
    const previous = rows[rows.length - 2] || null;
    const variation = previous ? variationBetween(current.total, previous.total) : null;
    const trend = trendMeta(variation);
    return `
      ${metricMarkup('Dano atual', formatCompact(current.total), current.label)}
      ${metricMarkup('Variação coletiva', formatPercent(variation), previous ? `contra ${previous.label}` : 'sem raid anterior', trend.className)}
      ${metricMarkup('Média por participante', current.average === null ? 'Não disponível' : formatCompact(current.average), `${current.participants} participantes`)}
      ${metricMarkup('Tendência', `<span class="registro-trend-icon" aria-hidden="true">${trend.icon}</span>${escapeHtml(trend.label)}`, 'última comparação', trend.className)}
    `;
  }

  function guildTableMarkup(rows) {
    return rows.map(row => `
      <tr data-raid-number="${safeNumber(row.raidNumber)}">
        <td data-label="Raid"><strong>${escapeHtml(row.label)}</strong></td>
        <td data-label="Dano total">${escapeHtml(formatCompact(row.total))}</td>
        <td data-label="Participantes">${row.participants || 'Não disponível'}</td>
        <td data-label="Média por membro">${row.average === null ? 'Não disponível' : escapeHtml(formatCompact(row.average))}</td>
        <td data-label="Variação"><span class="registro-table-variation ${trendMeta(row.variation).className}">${escapeHtml(formatPercent(row.variation))}</span></td>
        <td data-label="Fonte"><span class="registro-source-badge ${sourceClass(row)}">${escapeHtml(sourceLabel(row))}</span></td>
      </tr>
    `).join('');
  }

  function orderGuildTable() {
    const body = document.querySelector('#registro-guild-table-body');
    if (!body) return;
    [...body.querySelectorAll('tr')]
      .sort((a, b) => localState.order === 'asc'
        ? safeNumber(a.dataset.raidNumber) - safeNumber(b.dataset.raidNumber)
        : safeNumber(b.dataset.raidNumber) - safeNumber(a.dataset.raidNumber))
      .forEach(row => body.appendChild(row));
  }

  function renderGuildEvolution() {
    if (!localState.snapshot) return;
    const rows = raidRows();
    const metrics = document.querySelector('#registro-guild-metrics');
    const chart = document.querySelector('#registro-guild-chart');
    const body = document.querySelector('#registro-guild-table-body');
    if (!metrics || !chart || !body) return;

    if (rows.length < 2) {
      metrics.innerHTML = '';
      chart.innerHTML = '<p class="registro-evolution-empty">Histórico insuficiente para comparar a guilda.</p>';
      body.innerHTML = guildTableMarkup(rows);
      orderGuildTable();
      return;
    }

    metrics.innerHTML = guildMetricMarkup(rows);
    chart.innerHTML = guildChartMarkup(rows);
    body.innerHTML = guildTableMarkup(rows);
    orderGuildTable();
  }

  function applySnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.members) || !Array.isArray(snapshot.raids)) return;
    localState.snapshot = snapshot;
    localState.membersByKey = new Map(snapshot.members.map(member => [member.key, member]));
    localState.panelCache.clear();
    closeModal({ restoreFocus: false });
    renderGuildEvolution();
  }

  function handleResize() {
    window.clearTimeout(localState.resizeTimer);
    localState.resizeTimer = window.setTimeout(() => {
      renderGuildEvolution();
      if (localState.openKey) {
        const member = localState.membersByKey.get(localState.openKey);
        const { content } = modalElements();
        if (member && content) content.innerHTML = individualPanelMarkup(member);
      }
    }, 120);
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-registro-evolution]');
      if (toggle) {
        const member = localState.membersByKey.get(toggle.dataset.registroEvolution);
        if (member) openMemberModal(toggle, member);
        return;
      }
      if (event.target.closest(selectors.close)) closeModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && localState.openKey) {
        event.preventDefault();
        closeModal();
        return;
      }
      trapFocus(event);
    });

    document.addEventListener('avalon:registro-ready', event => applySnapshot(event.detail));
    document.addEventListener('avalon:registro-table-rendering', () => closeModal());

    const orderControl = document.querySelector('#registro-guild-order');
    if (orderControl) {
      orderControl.addEventListener('change', event => {
        localState.order = event.target.value === 'asc' ? 'asc' : 'desc';
        orderGuildTable();
      });
    }

    window.addEventListener('resize', handleResize, { passive: true });
  }

  function init() {
    bindEvents();
    const snapshot = window.AvalonRegistroData?.getSnapshot?.();
    if (snapshot) applySnapshot(snapshot);
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

  window.AvalonRegistroEvolution = Object.freeze({
    closeOpenPanel: closeModal,
    closeModal,
    applySnapshot
  });
})();
