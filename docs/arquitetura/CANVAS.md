# Arquitetura dos canvas

## Ficha do Guardião

Local: `app.js`. Dados: dano atual, média base, evolução, ranking de dano, Hall e patente. Ausente recebe valores incalculáveis, sem posição inventada.

## Canvas PvP da Liga

Fluxo principal:

```text
renderLeagueCanvas
→ buildLeagueCanvasModel
→ resolveLeaguePhaseLayout
→ drawLeagueRoundBackground/header/map/content/footer
```

Confrontos 1v1, 2v2 e 3v3 compartilham `normalizeCanvasMatchData`, `resolveCanvasMatchLayout` e `drawCanvasMatchCard`.

## Pódio

Fluxo:

```text
renderPodiumCanvas
→ buildPodiumPlacementModel
→ resolvePodiumCardLayout
→ drawPodiumPlacementCard
```

Ouro, prata e bronze compartilham tema e resolvedor adaptativo. Cards completos e individuais reutilizam o mesmo núcleo.

## Testes mínimos para qualquer mudança

- nomes curtos e longos;
- caracteres japoneses;
- individual, 2v2 e 3v3;
- mapa ausente;
- bronze com três membros;
- download completo e individual;
- margem inferior e rodapé.
