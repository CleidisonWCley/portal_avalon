# Checklist de nova Raid

## A. Preparação

- [ ] Criar branch e backup do ZIP/JSON atual.
- [ ] Confirmar que a raid terminou.
- [ ] Tirar screenshots completos, sem linhas cortadas.
- [ ] Conferir membros que entraram, saíram ou mudaram de nick.
- [ ] Atualizar `NOMES_VALIDOS` e aliases antes do OCR.
- [ ] Remover ou atualizar `CORRECOES_LINHAS_ATUAL` da raid anterior.

## B. OCR

1. Coloque screenshots em `ocr/guild-rank-ocr/images/`.
2. Execute `python -m src.main` dentro de `ocr/guild-rank-ocr/`.
3. Revise `ocr_raw_*.csv`.
4. Revise linhas `revisar`, duplicadas e danos suspeitos em `ocr_tratado_*.csv`.
5. Compare cada valor com o screenshot, principalmente zeros, bilhões e frequência.
6. Abra `raid_tratada_*.json` e confira resumo, membros, ausentes e duplicados.

## C. Casos conhecidos que ensinam o tipo de revisão

- **utiago:** um dígito omitido pelo OCR pode mudar centenas de milhões; o valor validado da raid usada na base foi `1.063.888.601`.
- **Wagnero:** raid histórica com frequência conhecida `6/21` deve permanecer excluída da média.
- **Frequência desconhecida:** use `null`, não invente `21/21`; ela entra como base estimada.
- **Membro ausente:** permanece na lista atual com `0/21`, dano zero e ranking incalculável.
- **Alias:** preserve o nick canônico e registre variações em `ALIASES_MEMBROS`.

## D. Publicação dos dados

Na raiz:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/raid_tratada_YYYYMMDD_HHMMSS.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json
```

O script:

- publica a nova raid atual;
- transforma a antiga atual em anterior;
- limita o histórico conforme `maxStoredRaids`;
- filtra o histórico pelo elenco da nova raid;
- preserva a versão do schema histórico existente.

## E. Validação obrigatória

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
bash tools/run_tests_v7_6_1.sh
```

Verificação manual:

- [ ] Salão: totais e Top 3.
- [ ] Hall: percentuais, posições vagas, patentes e não classificados.
- [ ] Buscar: frequência, dano, média, ranking e canvas.
- [ ] Registro: ativos, ausentes, dano total e Hall evolutivo.
- [ ] Mobile: sem overflow inesperado.

## F. Commit e deploy

- [ ] `git diff` contém apenas arquivos esperados.
- [ ] CHANGELOG/release de dados atualizado, se aplicável.
- [ ] Commit com data/identificador da raid.
- [ ] Push e Pull Request.
- [ ] Merge somente após revisão.
- [ ] Acompanhar Cloudflare Pages.
- [ ] Abrir produção e testar os JSONs sem cache antigo.
- [ ] Guardar o ZIP e as evidências.
