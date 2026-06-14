# Histórico de raids

`raid_history.json` mantém até o limite configurado em `settings.maxStoredRaids`. O sistema usa uma raid atual e anteriores ordenadas.

## Políticas

- `unknownFrequencyPolicy`: frequência antiga desconhecida pode compor base estimada;
- `knownLowFrequencyPolicy`: frequência conhecida abaixo do mínimo é excluída;
- `baselineSize`: quantidade desejada de raids na base;
- `minBaselineRaids`: mínimo para percentual válido.

## Overrides

`raid_manual_overrides.json` contém somente correções históricas comprovadas. Não use overrides para “melhorar” resultado.

## Rotação

`promote_raid_history.py` publica a nova atual, rebaixa as antigas e filtra o histórico pelo elenco atual. Faça backup e revise o diff após cada promoção.
