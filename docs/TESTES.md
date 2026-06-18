# Testes e regressões

## Objetivo

A suíte protege regras, estrutura, dados, assets, carregamento e experiência responsiva. Os testes atuais ficam em `tools/` e não usam nomes de versões antigas.

## Comando principal

Na raiz do projeto:

```bash
python tools/run_tests.py
```

Modos:

```bash
python tools/run_tests.py --quick
python tools/run_tests.py --browser
python tools/run_tests.py --all
```

- padrão: regressões estáticas e navegador quando Playwright estiver instalado;
- `--quick`: sintaxe, regras, estrutura, referências, assets, OCR V7.8.2 e histórico;
- `--browser`: apenas Playwright, falhando quando a dependência não existe;
- `--all`: suíte completa e obrigatória.

## Dependências

Obrigatórias:

- Python 3.10+;
- Node.js.

Opcionais para navegador:

```bash
python -m pip install playwright
python -m playwright install chromium
```

## Cobertura

### `test_core.js`

- limites matemáticos do Hall;
- ranking dinâmico e membros ausentes;
- independência entre ranking de dano e Hall;
- métricas dos cards;
- estrutura do Registro;
- motores de canvas da Liga;
- chaves de rascunho, arquivos e acesso da V7.8.1;
- isolamento entre participante e organizador;
- loader, reveal, feedback e retorno ao topo;
- caminhos canônicos sem versão embutida;
- documentação consolidada;
- README oficial atualizado.

### `test_project.py`

- leitura de todos os JSONs;
- referências locais de HTML;
- links Markdown;
- formato exato da pasta `docs/`;
- orçamento de imagens críticas;
- migração para assets WebP em `display/`;
- ausência de evidências, caches e pacotes locais.

### `test_v7_8_2.py`

- existência dos quatro artefatos identificados da Raid 133;
- diferença entre OCR bruto e dados revisados;
- número, data, dano total e participação oficiais;
- isolamento das correções entre Raid 133 e Raid 134;
- aliases curtos protegidos contra fuzzy incorreto;
- quinta imagem limitada às posições 29 e 30;
- promoção da Raid 133, preservação da Raid 132 e limite do histórico;
- presença da seção Evolução da Guilda.

### `validate_raid_history.py`

- integridade do histórico;
- estrutura da raid atual;
- consistência dos dados usados no Hall e Registro.

### `test_browser.py`

- sete páginas em celular, tablet e desktop;
- loader concluindo;
- imagens críticas carregadas;
- ausência de erros JavaScript;
- ausência de overflow horizontal;
- layout responsivo do Registro;
- gateway da Liga;
- botão global de retorno ao topo.

## Antes do commit

Execute:

```bash
python tools/run_tests.py --quick
```

Quando houver alteração visual, de loader, responsividade, Liga ou imagens, execute:

```bash
python tools/run_tests.py --all
```

Além da automação, faça teste manual no endereço local e confirme o console sem erros.

## Antes de uma nova raid

1. confira `raid_N_bruto.csv`, `raid_N_revisado.csv` e `raid_N_relatorio.json`;
2. confirme zero pendências antes da promoção;
3. execute:

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json

python tools/run_tests.py --quick
```


## Política de manutenção

- manter `test_v7_8_2.py` enquanto ele validar os artefatos oficiais desta migração; novos casos gerais devem ir para os testes temáticos;
- adicionar novos casos ao arquivo temático correspondente;
- manter o runner único e multiplataforma;
- evitar testes presos a nomes, danos ou quantidade fixa de membros quando esses dados mudam a cada raid;
- atualizar este documento quando a cobertura mudar.
