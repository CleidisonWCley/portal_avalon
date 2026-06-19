# Ferramentas do Portal Avalon

A pasta `tools/` reúne utilitários de manutenção das raids e a suíte automatizada. Esses scripts não são carregados pelo site publicado.

## Suíte consolidada

```text
tools/
├── run_tests.py
├── test_core.js
├── test_regressions.py
├── test_browser.py
├── validate_raid_history.py
├── promote_raid_history.py
└── seed_raid_history_from_xlsx.py
```

Comandos oficiais:

```bash
python tools/run_tests.py --quick
python tools/run_tests.py --browser
python tools/run_tests.py --all
```

`test_regressions.py` concentra OCR, histórico, Registro, estrutura, referências, assets e higiene. Não crie novos arquivos `test_vX_Y_Z.py`.

Pré-requisitos, ambiente virtual, Playwright, cobertura, avisos esperados e solução de problemas estão centralizados em [`../docs/TESTES.md`](../docs/TESTES.md).

## Atualização de raid

- `seed_raid_history_from_xlsx.py`: prepara o histórico inicial a partir da planilha;
- `promote_raid_history.py`: promove uma raid validada e atualiza os JSONs publicados;
- `validate_raid_history.py`: valida o estado final antes do commit.

Exemplo para uma nova raid oficial:

```bash
cd ocr/guild-rank-ocr
python -m src.main --raid 134 --ended-at AAAA-MM-DD --source official
cd ../..

python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/json/raid_134.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json \
  --published-previous web/data/raids/raid_anterior.json \
  --report ocr/guild-rank-ocr/output/json/raid_134_relatorio.json

python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

Não crie instruções paralelas de testes neste arquivo. Atualize sempre `docs/TESTES.md` quando a suíte mudar.
