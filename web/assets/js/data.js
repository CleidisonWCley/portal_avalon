const AVALON_DATA_PATHS = {
  raidAtual: 'data/raids/raid_atual.json',
  raidAnterior: 'data/raids/raid_anterior.json',
  raidHistory: 'data/raids/raid_history.json',
  raidManualOverrides: 'data/raids/raid_manual_overrides.json',
  insignias: 'data/insignias.json',
  eventos: 'data/gallery/eventos.json'
};

const STATUS_FANTASY_LABELS = {
  completo: 'Juramento Cumprido',
  participou_bem: 'Guarda Ativa',
  baixa_participacao: 'Chama Oscilante',
  quase_ausente: 'À Beira do Silêncio',
  ausente: 'Desaparecido em Avalon'
};

const STATUS_OPERATION_LABELS = {
  completo: 'Completo',
  participou_bem: 'Participação boa',
  baixa_participacao: 'Baixa participação',
  quase_ausente: 'Quase ausente',
  ausente: 'Ausente',
  retorno_batalha: 'Retorno à Batalha',
  sem_comparativo: 'Base insuficiente'
};

const BADGE_RULES = {
  desafiante: { label: 'Desafiante de Avalon', position: 'Top 1' },
  sentinela: { label: 'Sentinela de Prata', position: 'Top 2' },
  guardiao: { label: 'Guardião de Bronze', position: 'Top 3' },
  vigia: { label: 'Vigia do Horizonte', position: 'Top 4–10' },
  ascendente: { label: 'Cavaleiro Ascendente', position: 'Top 11–20' },
  juramentado: { label: 'Defensor de Avalon', position: 'Top 21–30' }
};

const AVALON_ACCESS = {
  enabled: false,
  developmentKey: 'AvaloNHALL',
  storageKey: 'portal_avalon_access_granted'
};
