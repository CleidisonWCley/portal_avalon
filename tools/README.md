# Ferramentas e testes do Portal Avalon

A pasta `tools/` possui duas responsabilidades: manutenção dos dados de raid e regressão do Portal. Os scripts não são carregados pelo site publicado.

## Testes

Comando recomendado em Windows, Linux ou macOS:

```bash
python tools/run_tests.py
```

Modos disponíveis:

```bash
python tools/run_tests.py --quick
python tools/run_tests.py --browser
python tools/run_tests.py --all
```

- padrão: regressões estáticas e testes de navegador quando Playwright estiver disponível;
- `--quick`: sintaxe, regras, estrutura, referências, dados e histórico;
- `--browser`: somente navegador, exigindo Playwright;
- `--all`: suíte completa, falhando se Playwright não estiver instalado.

Dependências mínimas:

- Python 3.10 ou superior;
- Node.js;
- Playwright apenas para testes de navegador.

Instalação opcional do Playwright:

```bash
python -m pip install playwright
python -m playwright install chromium
```

### Arquivos da suíte

- `run_tests.py`: runner único e multiplataforma;
- `test_core.js`: regras do Hall, estrutura funcional, Liga V7.8.1, UI e README;
- `test_project.py`: JSON, referências, documentação, assets e higiene do repositório;
- `test_browser.py`: carregamento, páginas, responsividade e ausência de overflow;
- `validate_raid_history.py`: integridade entre raid atual e histórico.

## Atualização de raid

- `seed_raid_history_from_xlsx.py`: prepara histórico inicial a partir da planilha;
- `promote_raid_history.py`: promove a nova raid e atualiza o histórico;
- `validate_raid_history.py`: valida o estado final antes do commit.

Exemplo:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/raid_tratada.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json

python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

Não crie novos arquivos nomeados por versão. Quando surgir uma regressão, acrescente o caso ao teste temático correspondente.
