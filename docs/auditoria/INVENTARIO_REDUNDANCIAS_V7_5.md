# Inventário de redundâncias — V7.5

## Escopo auditado

A V7.5 realizou uma auditoria controlada no pódio da Liga e nos estilos diretamente associados. A revisão completa de todo o Portal permanece planejada para uma etapa posterior.

## JavaScript da Liga

### Fluxos anteriores

O pódio completo e o card individual possuíam rotinas independentes para:

- fundo e gradiente;
- moldura;
- cabeçalho;
- carregamento de troféu;
- posicionamento de colocação, título, equipe e membros;
- rodapé;
- exportação.

### Consolidação aplicada

Os dois fluxos agora utilizam:

- `PODIUM_CANVAS_THEME`;
- `buildPodiumPlacementModel()`;
- `resolvePodiumCardLayout()`;
- `drawPodiumCanvasBackground()`;
- `drawPodiumCanvasFrame()`;
- `drawPodiumCanvasHeader()`;
- `drawPodiumPlacementCard()`;
- `drawPodiumCanvasFooter()`;
- `renderPodiumCanvas()`.

A função antiga `drawPodiumCanvasPlaceCard()` foi removida. A função `drawMultilineText()`, que deixou de possuir consumidores, também foi removida.

## CSS da Liga

### Regras removidas

- implementação antiga de `.winner-share-card` substituída pela versão consolidada;
- seletores órfãos `.winner-share-copy *`;
- versão antiga de `.placement-share-grid` com três colunas;
- seletores antigos `.placement-share-card.silver` e `.placement-share-card.bronze`;
- duplicação posterior de `.placement-share-grid`;
- uso de `!important` no grid dos cards de colocação.

### Regras preservadas

As classes HTML existentes foram mantidas para reduzir risco de regressão. A V7.5 consolidou suas definições efetivas sem exigir uma migração completa de nomenclatura.

## Métricas

| Arquivo | V7.4 | V7.5 | Variação |
|---|---:|---:|---:|
| `styles.css` | 6.352 linhas / 125.617 bytes | 6.330 linhas / 125.203 bytes | -22 linhas / -414 bytes |
| `liga.js` | 3.262 linhas / 115.280 bytes | 3.556 linhas / 125.839 bytes | +294 linhas / +10.559 bytes |

O JavaScript cresceu porque passou a possuir tema, modelo, medição geométrica, resolvedor adaptativo, renderizador unificado e API de teste. A duplicação dos dois geradores foi removida; a estabilidade teve prioridade sobre redução puramente numérica.

## Itens mapeados para auditoria posterior

- `league-notice-*` e `raid-floating-*`;
- `raid-status-card` e `raid-state-card`;
- `raid-back-top` e `back-to-top`;
- especializações antigas de títulos de página;
- múltiplas larguras históricas da tabela do Registro;
- regras de avatares da Raid com alta quantidade de `!important`.
