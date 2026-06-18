/* ============================================================
   PORTAL AVALON — EVOLUÇÃO COLETIVA DAS RAIDS
============================================================ */

(function () {
  const HISTORY_PATH = '../data/raids/raid_history.json';
  const $ = selector => document.querySelector(selector);

  function formatCompact(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(number);
  }

  function formatPercent(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? '+' : '';
    return `${sign}${number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  function safeNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function raidLabel(raid, index) {
    if (raid?.raidNumber) return `Raid ${raid.raidNumber}`;
    if (raid?.confidence === 'estimada' || raid?.source === 'seed_planilha') {
      return raid.label || `Base estimada ${index + 1}`;
    }
    return raid?.label || `Raid histórica ${index + 1}`;
  }

  function trendMeta(variation) {
    if (variation > 0.5) return { label: 'Crescimento', icon: 'trending_up', className: 'positive' };
    if (variation < -0.5) return { label: 'Queda', icon: 'trending_down', className: 'negative' };
    return { label: 'Estabilidade', icon: 'trending_flat', className: 'stable' };
  }

  function metricMarkup(label, value, note, className = '') {
    return `
      <article class="raid-evolution-metric ${className}">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </article>
    `;
  }

  function chartMarkup(raids) {
    const width = 820;
    const height = 280;
    const pad = { left: 56, right: 36, top: 46, bottom: 62 };
    const values = raids.map(raid => safeNumber(raid?.summary?.totalDamage));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(maxValue - minValue, maxValue * 0.04, 1);
    const low = Math.max(0, minValue - spread * 0.22);
    const high = maxValue + spread * 0.22;
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    const points = raids.map((raid, index) => {
      const x = raids.length === 1
        ? pad.left + chartWidth / 2
        : pad.left + (chartWidth * index) / (raids.length - 1);
      const ratio = (safeNumber(raid?.summary?.totalDamage) - low) / Math.max(high - low, 1);
      const y = pad.top + chartHeight - ratio * chartHeight;
      return { raid, x, y, value: values[index], label: raidLabel(raid, index) };
    });

    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const gridLines = [0, 0.5, 1].map(step => {
      const y = pad.top + chartHeight * step;
      const value = high - (high - low) * step;
      return `
        <line class="raid-evolution-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
        <text class="raid-evolution-axis-label" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${formatCompact(value)}</text>
      `;
    }).join('');

    const pointMarkup = points.map((point) => {
      const estimated = point.raid?.confidence === 'estimada' || point.raid?.source === 'seed_planilha';
      return `
        <g class="raid-evolution-point ${estimated ? 'estimated' : 'official'}">
          <circle cx="${point.x}" cy="${point.y}" r="7"></circle>
          <text class="raid-evolution-value" x="${point.x}" y="${point.y - 16}" text-anchor="middle">${formatCompact(point.value)}</text>
          <text class="raid-evolution-label" x="${point.x}" y="${height - 27}" text-anchor="middle">${point.label}</text>
        </g>
      `;
    }).join('');

    return `
      <div class="raid-evolution-chart-scroll" tabindex="0" aria-label="Gráfico do dano total da guilda nas raids armazenadas">
        <svg class="raid-evolution-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="raid-evolution-chart-title raid-evolution-chart-desc">
          <title id="raid-evolution-chart-title">Evolução do dano total da Avalon</title>
          <desc id="raid-evolution-chart-desc">Comparação do dano total entre ${raids.length} raids armazenadas.</desc>
          ${gridLines}
          <path class="raid-evolution-line" d="${path}"></path>
          ${pointMarkup}
        </svg>
      </div>
    `;
  }

  function renderEvolution(history) {
    const target = $('#raid-guild-evolution-content');
    if (!target) return;

    const ordered = [...(history?.raids || [])]
      .sort((a, b) => safeNumber(b.order) - safeNumber(a.order))
      .slice(-4);

    if (ordered.length < 2) {
      target.innerHTML = '<p class="raid-evolution-empty">São necessárias pelo menos duas raids para exibir a comparação.</p>';
      return;
    }

    const current = ordered[ordered.length - 1];
    const previous = ordered[ordered.length - 2];
    const currentTotal = safeNumber(current?.summary?.totalDamage);
    const previousTotal = safeNumber(previous?.summary?.totalDamage);
    const participants = safeNumber(current?.summary?.participants);
    const variation = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    const average = participants ? currentTotal / participants : 0;
    const trend = trendMeta(variation);

    target.innerHTML = `
      <div class="raid-evolution-metrics">
        ${metricMarkup('Dano atual', formatCompact(currentTotal), raidLabel(current, ordered.length - 1))}
        ${metricMarkup('Variação', formatPercent(variation), `contra ${raidLabel(previous, ordered.length - 2)}`, trend.className)}
        ${metricMarkup('Média por participante', formatCompact(average), `${participants} participantes`)}
        ${metricMarkup('Tendência', `<span class="material-symbols-outlined" aria-hidden="true">${trend.icon}</span>${trend.label}`, 'última comparação', trend.className)}
      </div>
      ${chartMarkup(ordered)}
      <div class="raid-evolution-legend" aria-label="Legenda das fontes">
        <span><i class="official"></i>Fonte oficial</span>
        <span><i class="estimated"></i>Base estimada</span>
      </div>
    `;
  }

  function renderError() {
    const target = $('#raid-guild-evolution-content');
    if (!target) return;
    target.innerHTML = '<p class="raid-evolution-empty">A comparação histórica não pôde ser carregada agora.</p>';
  }

  async function loadEvolution() {
    try {
      const response = await fetch(HISTORY_PATH, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      renderEvolution(await response.json());
    } catch (error) {
      console.warn('[Portal Avalon] Falha ao carregar evolução da guilda:', error);
      renderError();
    }
  }

  document.addEventListener('DOMContentLoaded', loadEvolution);
})();
