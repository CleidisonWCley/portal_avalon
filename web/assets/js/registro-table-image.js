/* ============================================================
   PORTAL AVALON — EXPORTAÇÃO DA TABELA DE REGISTRO EM IMAGEM
   Gera um PNG (via <canvas>) com a participação de todos os
   guardiões da raid atual, com cores por situação.
============================================================ */

(function () {
  const PALETTE = {
    bgMain: '#070a13',
    bgDeep: '#0b1020',
    bgCard: 'rgba(17, 24, 39, 0.94)',
    bgCardAlt: 'rgba(23, 31, 50, 0.94)',
    headerBg: 'rgba(7, 11, 22, 0.98)',
    gold: '#f2c766',
    goldLine: 'rgba(242, 199, 102, 0.42)',
    silver: '#d8dee9',
    blue: '#4f8cff',
    green: '#5bb98c',
    red: '#e06c75',
    amber: '#f6c25b',
    muted: '#aab0c0',
    text: '#f4f0e6',
    white: '#ffffff',
    textSoft: '#d7d9e2',
    border: 'rgba(216, 222, 233, 0.14)'
  };

  const COLUMNS = [
    { key: 'rank', label: '#', align: 'center', weight: 0.6 },
    { key: 'name', label: 'Guardião', align: 'left', weight: 2.1 },
    { key: 'damage', label: 'Dano atual', align: 'right', weight: 1.3 },
    { key: 'frequency', label: 'Frequência', align: 'center', weight: 1 },
    { key: 'average', label: 'Média base', align: 'right', weight: 1.3 },
    { key: 'evolution', label: 'Evolução %', align: 'center', weight: 1 },
    { key: 'participation', label: 'Participação', align: 'center', weight: 1.6 }
  ];

  const LOW_PARTICIPATION_THRESHOLD = 12;
  const FULL_ATTACKS = 21;

  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  let cachedSnapshot = null;

  function getSnapshot() {
    if (window.AvalonRegistroData?.getSnapshot) {
      return window.AvalonRegistroData.getSnapshot();
    }
    return cachedSnapshot;
  }

  document.addEventListener('avalon:registro-ready', (event) => {
    cachedSnapshot = event.detail || cachedSnapshot;
  });

  function formatDamage(value) {
    const number = Number(value || 0);
    return numberFormatter.format(Math.round(number));
  }

  function formatEvolution(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Sem base';
    const number = Number(value);
    const sign = number > 0 ? '+' : '';
    return `${sign}${number.toFixed(1)}%`;
  }

  function nameColor(member) {
    // Ordem de prioridade: ausente > baixa participação > retorno à batalha > completo > participação boa.
    if (member.absent) return PALETTE.muted;
    if (member.currentAttacks > 0 && member.currentAttacks <= LOW_PARTICIPATION_THRESHOLD) return PALETTE.red;
    if (member.returnToBattle) return PALETTE.green;
    if (member.currentAttacks >= FULL_ATTACKS) return PALETTE.white;
    return PALETTE.amber;
  }

  function evolutionColor(member) {
    if (member.absent || member.evolutionPercent === null || member.evolutionPercent === undefined) return PALETTE.muted;
    const number = Number(member.evolutionPercent);
    if (Number.isNaN(number) || number === 0) return PALETTE.muted;
    return number > 0 ? PALETTE.green : PALETTE.red;
  }

  const STATUS_BADGE_COLORS = {
    completo: { text: '#bfe7ff', bg: 'rgba(79,140,255,0.16)', border: 'rgba(79,140,255,0.4)' },
    participou_bem: { text: '#baf7d9', bg: 'rgba(91,185,140,0.16)', border: 'rgba(91,185,140,0.4)' },
    baixa_participacao: { text: '#ffe3a8', bg: 'rgba(242,199,102,0.18)', border: 'rgba(242,199,102,0.42)' },
    quase_ausente: { text: '#ffc1c5', bg: 'rgba(224,108,117,0.18)', border: 'rgba(224,108,117,0.42)' },
    ausente: { text: '#d0d2db', bg: 'rgba(170,176,192,0.16)', border: 'rgba(170,176,192,0.34)' },
    retorno_batalha: { text: '#ffe7a8', bg: 'rgba(242,199,102,0.2)', border: 'rgba(242,199,102,0.5)' },
    sem_comparativo: { text: '#d0d2db', bg: 'rgba(170,176,192,0.16)', border: 'rgba(170,176,192,0.34)' }
  };

  function statusBadgeColors(member) {
    return STATUS_BADGE_COLORS[member.statusCode] || STATUS_BADGE_COLORS.sem_comparativo;
  }

  function sortedMembers(snapshot) {
    return [...(snapshot?.members || [])].sort((a, b) => {
      const aRank = Number.isInteger(a.rank) ? a.rank : null;
      const bRank = Number.isInteger(b.rank) ? b.rank : null;
      if (aRank !== null && bRank !== null) return aRank - bRank;
      if (aRank !== bRank) return aRank !== null ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
    });
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function buildCanvas(snapshot) {
    const members = sortedMembers(snapshot);

    const scale = 2; // resolução alta para download nítido
    const width = 1180;
    const padding = 36;
    const titleHeight = 108;
    const headerRowHeight = 46;
    const rowHeight = 40;
    const legendHeight = 66;
    const footerHeight = 34;
    const tableWidth = width - padding * 2;

    const totalWeight = COLUMNS.reduce((sum, col) => sum + col.weight, 0);
    let cursor = 0;
    const columnBounds = COLUMNS.map(col => {
      const colWidth = (col.weight / totalWeight) * tableWidth;
      const bounds = { ...col, x: padding + cursor, width: colWidth };
      cursor += colWidth;
      return bounds;
    });

    const tableTop = titleHeight;
    const bodyHeight = members.length * rowHeight;
    const height = titleHeight + headerRowHeight + bodyHeight + legendHeight + footerHeight + padding;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // fundo
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, PALETTE.bgDeep);
    bgGradient.addColorStop(1, PALETTE.bgMain);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // título
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 26px Cinzel, Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Registro da Batalha', padding, 40);

    ctx.fillStyle = PALETTE.textSoft;
    ctx.font = '400 14px Inter, system-ui, sans-serif';
    ctx.fillText('Portal Avalon • Participação completa dos guardiões na raid atual', padding, 62);

    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Gerado em ${dateFormatter.format(new Date())}`, width - padding, 62);

    // cabeçalho da tabela
    ctx.fillStyle = PALETTE.headerBg;
    drawRoundedRect(ctx, padding, tableTop, tableWidth, headerRowHeight, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldLine;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, padding, tableTop, tableWidth, headerRowHeight, 10);
    ctx.stroke();

    ctx.font = '700 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    columnBounds.forEach(col => {
      ctx.textAlign = col.align;
      const textX = col.align === 'left'
        ? col.x + 14
        : (col.align === 'right' ? col.x + col.width - 14 : col.x + col.width / 2);
      ctx.fillText(col.label.toUpperCase(), textX, tableTop + headerRowHeight / 2 + 4);
    });

    // linhas
    let rowY = tableTop + headerRowHeight;
    members.forEach((member, index) => {
      const rowBg = index % 2 === 0 ? PALETTE.bgCard : PALETTE.bgCardAlt;
      ctx.fillStyle = rowBg;
      ctx.fillRect(padding, rowY, tableWidth, rowHeight);

      const centerY = rowY + rowHeight / 2 + 4;

      columnBounds.forEach(col => {
        ctx.textAlign = col.align;
        const textX = col.align === 'left'
          ? col.x + 14
          : (col.align === 'right' ? col.x + col.width - 14 : col.x + col.width / 2);

        if (col.key === 'rank') {
          ctx.fillStyle = PALETTE.muted;
          ctx.font = '600 13px Inter, system-ui, sans-serif';
          ctx.fillText(member.rank ? `#${member.rank}` : '—', textX, centerY);
        } else if (col.key === 'name') {
          ctx.fillStyle = nameColor(member);
          ctx.font = '700 14px Inter, system-ui, sans-serif';
          ctx.fillText(member.name, textX, centerY);
        } else if (col.key === 'damage') {
          ctx.fillStyle = member.absent ? PALETTE.muted : PALETTE.textSoft;
          ctx.font = '600 13px Inter, system-ui, sans-serif';
          ctx.fillText(member.absent ? '—' : formatDamage(member.currentDamage), textX, centerY);
        } else if (col.key === 'frequency') {
          ctx.fillStyle = PALETTE.textSoft;
          ctx.font = '600 13px Inter, system-ui, sans-serif';
          ctx.fillText(member.currentFrequency || '—', textX, centerY);
        } else if (col.key === 'average') {
          ctx.fillStyle = PALETTE.textSoft;
          ctx.font = '600 13px Inter, system-ui, sans-serif';
          ctx.fillText(
            member.averageBase === null || member.averageBase === undefined ? 'Sem base' : formatDamage(member.averageBase),
            textX,
            centerY
          );
        } else if (col.key === 'evolution') {
          ctx.fillStyle = evolutionColor(member);
          ctx.font = '700 13px Inter, system-ui, sans-serif';
          ctx.fillText(member.absent ? 'Incalculável' : formatEvolution(member.evolutionPercent), textX, centerY);
        } else if (col.key === 'participation') {
          const colors = statusBadgeColors(member);
          ctx.font = '700 11px Inter, system-ui, sans-serif';
          const label = (member.statusLabel || 'Sem registro').toUpperCase();
          const textWidth = ctx.measureText(label).width;
          const pillWidth = Math.min(col.width - 16, textWidth + 24);
          const pillX = col.x + (col.width - pillWidth) / 2;
          const pillY = rowY + 8;
          const pillHeight = rowHeight - 16;
          ctx.fillStyle = colors.bg;
          drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
          ctx.fill();
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
          ctx.stroke();
          ctx.fillStyle = colors.text;
          ctx.textAlign = 'center';
          ctx.fillText(label, pillX + pillWidth / 2, pillY + pillHeight / 2 + 4);
        }
      });

      ctx.strokeStyle = PALETTE.border;
      ctx.beginPath();
      ctx.moveTo(padding, rowY + rowHeight);
      ctx.lineTo(padding + tableWidth, rowY + rowHeight);
      ctx.stroke();

      rowY += rowHeight;
    });

    // borda externa da tabela
    ctx.strokeStyle = PALETTE.goldLine;
    ctx.lineWidth = 1.4;
    drawRoundedRect(ctx, padding, tableTop, tableWidth, headerRowHeight + bodyHeight, 10);
    ctx.stroke();

    // legenda de cores
    const legendY = tableTop + headerRowHeight + bodyHeight + 28;
    const legendItems = [
      { color: PALETTE.red, label: `Baixa participação (${LOW_PARTICIPATION_THRESHOLD}/${FULL_ATTACKS} ou menos)` },
      { color: PALETTE.amber, label: 'Participação boa' },
      { color: PALETTE.white, label: `Participação completa (${FULL_ATTACKS}/${FULL_ATTACKS})` },
      { color: PALETTE.green, label: 'Retorno à batalha' },
      { color: PALETTE.muted, label: 'Ausente' }
    ];
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    let legendX = padding;
    legendItems.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX + 6, legendY - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.textSoft;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 18, legendY);
      legendX += ctx.measureText(item.label).width + 46;
    });

    // rodapé
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Portal Avalon — Registro, memórias e disputas da guilda', width / 2, height - 16);

    return canvas;
  }

  function downloadCanvas(canvas) {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `avalon-registro-${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  // ------------------------------------------------------------------
  // Exportação do gráfico de evolução da guilda (SVG -> PNG)
  // ------------------------------------------------------------------

  const SVG_STYLE_PROPERTIES = [
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'font-style',
    'text-anchor', 'opacity', 'color'
  ];

  function inlineComputedStyles(sourceEl, targetEl) {
    const computed = window.getComputedStyle(sourceEl);
    const declarations = SVG_STYLE_PROPERTIES
      .map(prop => `${prop}:${computed.getPropertyValue(prop)}`)
      .join(';');
    targetEl.setAttribute('style', declarations);

    const sourceChildren = sourceEl.children;
    const targetChildren = targetEl.children;
    for (let i = 0; i < sourceChildren.length; i += 1) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }

  function serializeSvgWithStyles(svgEl) {
    const clone = svgEl.cloneNode(true);
    inlineComputedStyles(svgEl, clone);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('width') || !clone.getAttribute('height')) {
      const viewBox = clone.getAttribute('viewBox');
      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
        clone.setAttribute('width', vbWidth);
        clone.setAttribute('height', vbHeight);
      }
    }
    return new XMLSerializer().serializeToString(clone);
  }

  function svgToImage(svgMarkup) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  const GUILD_TABLE_COLUMNS = [
    { key: 'raid', label: 'Raid', align: 'left', weight: 1.15 },
    { key: 'damage', label: 'Dano total', align: 'right', weight: 1.25 },
    { key: 'participants', label: 'Particip.', align: 'center', weight: 0.95 },
    { key: 'average', label: 'Média/membro', align: 'right', weight: 1.3 },
    { key: 'variation', label: 'Variação', align: 'center', weight: 1.05 },
    { key: 'source', label: 'Fonte', align: 'center', weight: 0.9 }
  ];

  const VARIATION_COLORS = {
    positive: PALETTE.green,
    negative: PALETTE.red,
    stable: PALETTE.amber,
    neutral: PALETTE.muted
  };

  const SOURCE_BADGE_COLORS = {
    official: { text: '#f2c766', bg: 'rgba(242,199,102,0.12)', border: 'rgba(242,199,102,0.32)' },
    estimated: { text: '#9ec5ff', bg: 'rgba(79,140,255,0.12)', border: 'rgba(79,140,255,0.32)' },
    partial: { text: '#f6c25b', bg: 'rgba(224,168,74,0.12)', border: 'rgba(224,168,74,0.32)' }
  };

  function fitFontSize(ctx, text, maxWidth, family, weight, startSize, minSize = 9) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return `${weight} ${size}px ${family}`;
  }

  function readGuildTableRows() {
    const rows = [...document.querySelectorAll('#registro-guild-table-body tr')];
    return rows.map(row => {
      const cell = (label) => row.querySelector(`td[data-label="${label}"]`)?.textContent.trim() || '—';
      const variationEl = row.querySelector('.registro-table-variation');
      const sourceEl = row.querySelector('.registro-source-badge');
      return {
        raid: cell('Raid'),
        damage: cell('Dano total'),
        participants: cell('Participantes'),
        average: cell('Média por membro'),
        variationText: variationEl?.textContent.trim() || '—',
        variationClass: [...(variationEl?.classList || [])].find(cls => VARIATION_COLORS[cls]) || 'neutral',
        sourceText: sourceEl?.textContent.trim() || '—',
        sourceClass: [...(sourceEl?.classList || [])].find(cls => SOURCE_BADGE_COLORS[cls]) || 'official'
      };
    });
  }

  async function buildGuildChartCanvas(svgEl) {
    const viewBox = (svgEl.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const chartWidth = viewBox[2] || svgEl.clientWidth || 760;
    const chartHeight = viewBox[3] || svgEl.clientHeight || 276;

    const svgMarkup = serializeSvgWithStyles(svgEl);
    const chartImage = await svgToImage(svgMarkup);
    const tableRows = readGuildTableRows();

    const scale = 2;
    const padding = 36;
    const titleHeight = 96;
    const legendHeight = 46;
    const tableTitleHeight = tableRows.length ? 40 : 0;
    const tableHeaderHeight = tableRows.length ? 40 : 0;
    const tableRowHeight = 36;
    const tableHeight = tableRows.length ? (tableTitleHeight + tableHeaderHeight + tableRows.length * tableRowHeight + 16) : 0;
    const footerHeight = 34;
    const renderScale = Math.min(1180 - padding * 2, chartWidth) / chartWidth;
    const renderWidth = chartWidth * renderScale;
    const renderHeight = chartHeight * renderScale;
    const width = Math.max(renderWidth + padding * 2, tableRows.length ? 920 : 720);
    const height = titleHeight + renderHeight + 24 + legendHeight + tableHeight + footerHeight + padding;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, PALETTE.bgDeep);
    bgGradient.addColorStop(1, PALETTE.bgMain);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 24px Cinzel, Georgia, serif';
    ctx.fillText('Evolução recente da Guilda', padding, 38);

    ctx.fillStyle = PALETTE.textSoft;
    ctx.font = '400 13px Inter, system-ui, sans-serif';
    ctx.fillText('Portal Avalon • Comparação entre as raids oficiais recentes', padding, 58);

    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Gerado em ${dateFormatter.format(new Date())}`, width - padding, 58);

    // painel do gráfico
    const panelX = (width - renderWidth) / 2;
    const panelY = titleHeight;
    ctx.fillStyle = PALETTE.bgCard;
    drawRoundedRect(ctx, padding, panelY - 12, width - padding * 2, renderHeight + 24, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldLine;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, padding, panelY - 12, width - padding * 2, renderHeight + 24, 14);
    ctx.stroke();

    ctx.drawImage(chartImage, panelX, panelY, renderWidth, renderHeight);

    // legenda de fontes
    const legendY = panelY + renderHeight + 34;
    const legendItems = [
      { color: PALETTE.gold, label: 'Fonte oficial', shape: 'circle' },
      { color: PALETTE.blue, label: 'Base estimada', shape: 'diamond' }
    ];
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    let legendX = width / 2 - 110;
    legendItems.forEach(item => {
      ctx.fillStyle = item.color;
      if (item.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(legendX + 6, legendY - 4, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(legendX + 6, legendY - 4);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      }
      ctx.fillStyle = PALETTE.textSoft;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 18, legendY);
      legendX += ctx.measureText(item.label).width + 56;
    });

    // tabela comparativa por raid
    if (tableRows.length) {
      const tableTop = legendY + 22;
      const tableWidth = width - padding * 2;
      const totalWeight = GUILD_TABLE_COLUMNS.reduce((sum, col) => sum + col.weight, 0);
      let cursor = 0;
      const columnBounds = GUILD_TABLE_COLUMNS.map(col => {
        const colWidth = (col.weight / totalWeight) * tableWidth;
        const bounds = { ...col, x: padding + cursor, width: colWidth };
        cursor += colWidth;
        return bounds;
      });

      ctx.fillStyle = PALETTE.gold;
      ctx.font = '700 16px Cinzel, Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('Comparativo por raid', padding, tableTop + 12);

      const headerY = tableTop + tableTitleHeight;
      ctx.fillStyle = PALETTE.headerBg;
      drawRoundedRect(ctx, padding, headerY, tableWidth, tableHeaderHeight, 10);
      ctx.fill();
      ctx.strokeStyle = PALETTE.goldLine;
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, padding, headerY, tableWidth, tableHeaderHeight, 10);
      ctx.stroke();

      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = PALETTE.gold;
      columnBounds.forEach(col => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(col.x + 4, headerY, col.width - 8, tableHeaderHeight);
        ctx.clip();
        ctx.textAlign = col.align;
        const textX = col.align === 'left'
          ? col.x + 14
          : (col.align === 'right' ? col.x + col.width - 14 : col.x + col.width / 2);
        ctx.fillText(col.label.toUpperCase(), textX, headerY + tableHeaderHeight / 2 + 4);
        ctx.restore();
      });

      let rowY = headerY + tableHeaderHeight;
      tableRows.forEach((row, index) => {
        ctx.fillStyle = index % 2 === 0 ? PALETTE.bgCard : PALETTE.bgCardAlt;
        ctx.fillRect(padding, rowY, tableWidth, tableRowHeight);

        const centerY = rowY + tableRowHeight / 2 + 4;
        columnBounds.forEach(col => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(col.x + 4, rowY, col.width - 8, tableRowHeight);
          ctx.clip();
          ctx.textAlign = col.align;
          const textX = col.align === 'left'
            ? col.x + 14
            : (col.align === 'right' ? col.x + col.width - 14 : col.x + col.width / 2);

          if (col.key === 'raid') {
            ctx.fillStyle = PALETTE.text;
            ctx.font = '700 13px Inter, system-ui, sans-serif';
            ctx.fillText(row.raid, textX, centerY);
          } else if (col.key === 'damage') {
            ctx.fillStyle = PALETTE.textSoft;
            ctx.font = '600 13px Inter, system-ui, sans-serif';
            ctx.fillText(row.damage, textX, centerY);
          } else if (col.key === 'participants') {
            ctx.fillStyle = PALETTE.textSoft;
            ctx.font = '600 13px Inter, system-ui, sans-serif';
            ctx.fillText(row.participants, textX, centerY);
          } else if (col.key === 'average') {
            ctx.fillStyle = PALETTE.textSoft;
            ctx.font = '600 13px Inter, system-ui, sans-serif';
            ctx.fillText(row.average, textX, centerY);
          } else if (col.key === 'variation') {
            ctx.fillStyle = VARIATION_COLORS[row.variationClass] || PALETTE.muted;
            ctx.font = fitFontSize(ctx, row.variationText, col.width - 20, 'Inter, system-ui, sans-serif', 700, 13);
            ctx.fillText(row.variationText, textX, centerY);
          } else if (col.key === 'source') {
            const colors = SOURCE_BADGE_COLORS[row.sourceClass] || SOURCE_BADGE_COLORS.official;
            ctx.font = '700 10px Inter, system-ui, sans-serif';
            const label = row.sourceText.toUpperCase();
            const textWidth = ctx.measureText(label).width;
            const pillWidth = Math.min(col.width - 14, textWidth + 20);
            const pillX = col.x + (col.width - pillWidth) / 2;
            const pillY = rowY + 7;
            const pillHeight = tableRowHeight - 14;
            ctx.fillStyle = colors.bg;
            drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
            ctx.fill();
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
            ctx.stroke();
            ctx.fillStyle = colors.text;
            ctx.textAlign = 'center';
            ctx.fillText(label, pillX + pillWidth / 2, pillY + pillHeight / 2 + 3);
          }
          ctx.restore();
        });

        ctx.strokeStyle = PALETTE.border;
        ctx.beginPath();
        ctx.moveTo(padding, rowY + tableRowHeight);
        ctx.lineTo(padding + tableWidth, rowY + tableRowHeight);
        ctx.stroke();

        rowY += tableRowHeight;
      });

      ctx.strokeStyle = PALETTE.goldLine;
      ctx.lineWidth = 1.4;
      drawRoundedRect(ctx, padding, headerY, tableWidth, tableHeaderHeight + tableRows.length * tableRowHeight, 10);
      ctx.stroke();
    }

    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Portal Avalon — Registro, memórias e disputas da guilda', width / 2, height - 16);

    return canvas;
  }

  function downloadGuildChartCanvas(canvas) {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `avalon-evolucao-guilda-${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  async function handleGuildChartExportClick(button) {
    const svgEl = document.querySelector('#registro-guild-chart svg');
    if (!svgEl) {
      const originalLabel = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Sem gráfico disponível';
      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }, 2200);
      return;
    }
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Gerando imagem...';
    try {
      const canvas = await buildGuildChartCanvas(svgEl);
      downloadGuildChartCanvas(canvas);
    } catch (error) {
      console.error('[Portal Avalon] Falha ao exportar o gráfico da guilda:', error);
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  }

  function handleExportClick(button) {
    const snapshot = getSnapshot();
    if (!snapshot || !snapshot.members?.length) {
      button.disabled = true;
      button.textContent = 'Sem dados para exportar';
      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = '<span aria-hidden="true" class="material-symbols-outlined">photo_camera</span>Baixar tabela (imagem)';
      }, 2200);
      return;
    }
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Gerando imagem...';
    // pequeno delay para o navegador atualizar o estado do botão antes do trabalho síncrono de desenho
    requestAnimationFrame(() => {
      try {
        const canvas = buildCanvas(snapshot);
        downloadCanvas(canvas);
      } finally {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
    });
  }

  function init() {
    const tableButton = document.getElementById('registro-export-image');
    if (tableButton) {
      tableButton.addEventListener('click', () => handleExportClick(tableButton));
    }

    const chartButton = document.getElementById('registro-export-guild-chart');
    if (chartButton) {
      chartButton.addEventListener('click', () => handleGuildChartExportClick(chartButton));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
