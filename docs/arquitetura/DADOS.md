# Dados e fontes da verdade

| Informação | Fonte publicada |
|---|---|
| raid atual | `web/data/raids/raid_atual.json` |
| histórico e regras configuráveis | `web/data/raids/raid_history.json` |
| overrides comprovados | `web/data/raids/raid_manual_overrides.json` |
| raid anterior compatível | `web/data/raids/raid_anterior.json` |
| caminhos usados pelo app | `web/assets/js/data.js` |
| membros oficiais para OCR | `ocr/guild-rank-ocr/src/config.py` |
| aliases OCR | `ALIASES_MEMBROS` no mesmo arquivo |
| insígnias | `web/data/insignias.json` |
| galeria | `web/data/gallery/eventos.json` |
| modos/mapas da Liga | `web/data/arenas.json` |

## Schemas resumidos

### `raid_atual.json`

- `resumo`: totais, data, participantes, ausentes e dano da guilda;
- `membros`: nick, frequência, dano e status;
- `duplicados` e `raw_normalizado`: auditoria do OCR.

### `raid_history.json`

- `settings`: políticas de histórico e posições;
- `seed`: origem e observações da carga inicial;
- `raids`: raid atual e anteriores normalizadas.

O campo `version` do histórico representa o schema/dataset, não necessariamente a versão visual do Portal.

## Fonte primária versus derivado

Screenshots são evidência primária; o JSON tratado é derivado revisado; o histórico publicado é a fonte operacional do site. Nunca edite somente um derivado sem registrar a origem da correção.
