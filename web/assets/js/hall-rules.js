(function exposeAvalonHallRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AvalonHallRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAvalonHallRules() {
  'use strict';

  const DEFAULT_SETTINGS = Object.freeze({
    maxHallPosition: 30,
    minCurrentAttacksForHall: 6,
    minBaselineRaids: 2,
    hallPositionRules: [
      { from: 1, to: 3, minAttacks: 18 },
      { from: 4, to: 10, minAttacks: 15 },
      { from: 11, to: 20, minAttacks: 12 },
      { from: 21, to: 30, minAttacks: 6 }
    ]
  });

  function numberOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizedSettings(settings = {}) {
    const configuredRules = Array.isArray(settings.hallPositionRules)
      ? settings.hallPositionRules
          .map(rule => ({
            from: numberOr(rule.from, 0),
            to: numberOr(rule.to, 0),
            minAttacks: numberOr(rule.minAttacks, 0)
          }))
          .filter(rule => rule.from > 0 && rule.to >= rule.from && rule.minAttacks >= 0)
      : [];

    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      maxHallPosition: numberOr(settings.maxHallPosition, DEFAULT_SETTINGS.maxHallPosition),
      minCurrentAttacksForHall: numberOr(
        settings.minCurrentAttacksForHall,
        DEFAULT_SETTINGS.minCurrentAttacksForHall
      ),
      minBaselineRaids: numberOr(settings.minBaselineRaids, DEFAULT_SETTINGS.minBaselineRaids),
      hallPositionRules: configuredRules.length
        ? configuredRules.sort((a, b) => a.from - b.from)
        : DEFAULT_SETTINGS.hallPositionRules.map(rule => ({ ...rule }))
    };
  }

  function requiredAttacksForPosition(position, settings = {}) {
    const config = normalizedSettings(settings);
    const rank = numberOr(position, 0);
    const rule = config.hallPositionRules.find(item => rank >= item.from && rank <= item.to);
    return rule ? rule.minAttacks : Infinity;
  }

  function firstAllowedPosition(attacks, settings = {}) {
    const config = normalizedSettings(settings);
    const currentAttacks = numberOr(attacks, 0);
    const rule = config.hallPositionRules.find(item => currentAttacks >= item.minAttacks);
    return rule ? rule.from : null;
  }

  function badgeForPosition(position) {
    const rank = numberOr(position, 0);
    if (rank === 1) return 'desafiante';
    if (rank === 2) return 'sentinela';
    if (rank === 3) return 'guardiao';
    if (rank >= 4 && rank <= 10) return 'vigia';
    if (rank >= 11 && rank <= 20) return 'ascendente';
    if (rank >= 21 && rank <= 30) return 'juramentado';
    return null;
  }

  function disqualificationCode(member, settings = {}) {
    const config = normalizedSettings(settings);
    const attacks = numberOr(member?.frequenciaAtualNum, 0);
    const damage = numberOr(member?.danoAtual, 0);
    const baselineCount = numberOr(member?.baselineCount, 0);
    const absent = Boolean(member?.ausenteAtual)
      || String(member?.status_participacao || '').toLowerCase() === 'ausente'
      || attacks <= 0;

    if (absent) return 'ausente';
    if (damage <= 0) return 'sem_dano';
    if (!member?.comparativoValido) {
      if (baselineCount < config.minBaselineRaids) return 'base_insuficiente';
      return 'sem_comparativo';
    }
    if (attacks < config.minCurrentAttacksForHall) return 'frequencia_insuficiente';
    return null;
  }

  function disqualificationLabel(code, member, settings = {}) {
    const config = normalizedSettings(settings);
    const attacks = numberOr(member?.frequenciaAtualNum, 0);
    const labels = {
      ausente: 'Ausente nesta raid',
      sem_dano: 'Sem dano registrado',
      base_insuficiente: 'Base comparativa insuficiente',
      sem_comparativo: 'Sem base comparável',
      frequencia_insuficiente: 'Não classificado pelos critérios internos do Hall',
      fora_top_30: 'Fora do Top 30 nesta raid',
      nao_classificado: 'Não classificado nesta raid'
    };
    return labels[code] || labels.nao_classificado;
  }

  function compareCandidates(a, b) {
    const percentA = numberOr(a?.percentualEvolutivo, -Infinity);
    const percentB = numberOr(b?.percentualEvolutivo, -Infinity);
    if (percentA !== percentB) return percentB - percentA;

    const attacksA = numberOr(a?.frequenciaAtualNum, 0);
    const attacksB = numberOr(b?.frequenciaAtualNum, 0);
    if (attacksA !== attacksB) return attacksB - attacksA;

    const evolutionA = numberOr(a?.evolucao, -Infinity);
    const evolutionB = numberOr(b?.evolucao, -Infinity);
    if (evolutionA !== evolutionB) return evolutionB - evolutionA;

    const damageA = numberOr(a?.danoAtual, 0);
    const damageB = numberOr(b?.danoAtual, 0);
    if (damageA !== damageB) return damageB - damageA;

    return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
  }

  function buildStandings(members = [], settings = {}) {
    const config = normalizedSettings(settings);
    const candidates = [];
    const baseUnclassified = [];

    members.forEach(member => {
      const code = disqualificationCode(member, config);
      if (code) {
        baseUnclassified.push({
          member,
          code,
          reason: disqualificationLabel(code, member, config)
        });
      } else {
        candidates.push(member);
      }
    });

    const remaining = [...candidates].sort(compareCandidates);
    const assignments = [];
    const vacancies = [];

    for (let position = 1; position <= config.maxHallPosition; position += 1) {
      const minAttacks = requiredAttacksForPosition(position, config);
      const candidateIndex = remaining.findIndex(member => numberOr(member.frequenciaAtualNum, 0) >= minAttacks);
      if (candidateIndex === -1) {
        vacancies.push({ position, minAttacks, badgeId: badgeForPosition(position) });
        continue;
      }

      const [member] = remaining.splice(candidateIndex, 1);
      assignments.push({
        member,
        position,
        minAttacks,
        badgeId: badgeForPosition(position)
      });
    }

    const overflow = remaining.map(member => ({
      member,
      code: 'fora_top_30',
      reason: disqualificationLabel('fora_top_30', member, config)
    }));

    return {
      settings: config,
      assignments,
      vacancies,
      unclassified: [...baseUnclassified, ...overflow]
    };
  }

  return {
    DEFAULT_SETTINGS,
    normalizedSettings,
    requiredAttacksForPosition,
    firstAllowedPosition,
    badgeForPosition,
    disqualificationCode,
    disqualificationLabel,
    compareCandidates,
    buildStandings
  };
});
