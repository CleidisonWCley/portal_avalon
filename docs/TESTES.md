# Testes e regressões do Portal Avalon

Este é o documento canônico da suíte. Outros READMEs e manuais devem apresentar apenas os comandos essenciais e apontar para esta página.

## 1. Objetivo

A suíte protege:

- sintaxe JavaScript;
- regras do Hall, ranking, ausentes e classificações;
- OCR, revisão e promoção segura das raids;
- JSONs publicados e histórico;
- Registro, evolução individual e coletiva;
- casos especiais como retorno à batalha e ausência de dados;
- Raid estratégica sem dependência do histórico da guilda;
- Liga, Firebase e separação de papéis;
- referências locais, assets, documentação e higiene do repositório;
- carregamento real, acessibilidade e responsividade em navegador.

## 2. Arquitetura consolidada

A suíte possui somente três arquivos principais de teste:

```text
tools/
├── test_core.js          # regras funcionais executadas em Node.js
├── test_regressions.py   # dados, OCR, Registro, estrutura e higiene
└── test_browser.py       # Playwright, interações e responsividade
```

O runner oficial é:

```text
tools/run_tests.py
```

Testes nomeados por versão ou arquivos estruturais paralelos não devem ser recriados. Novas regressões entram no bloco temático correspondente de `test_regressions.py`.

## 3. Pré-requisitos

Obrigatórios:

- Python 3.10 ou superior;
- Node.js disponível no `PATH`;
- dependências do OCR instaladas quando a suíte importar seus módulos.

Para testes de navegador:

- Playwright para Python;
- Chromium instalado pelo Playwright.

## 4. Ambiente virtual

Mantenha o ambiente virtual fora do repositório para que a higiene não encontre `.venv` dentro de `raid_hall`.

PowerShell:

```powershell
python -m venv "$env:USERPROFILE\Documents\AmbientesPython\raid_hall_venv"
& "$env:USERPROFILE\Documents\AmbientesPython\raid_hall_venv\Scripts\Activate.ps1"
```

Confirme o interpretador:

```powershell
python -c "import sys; print(sys.executable)"
```

## 5. Dependências do OCR

Na raiz do projeto, com o ambiente ativo:

```bash
python -m pip install -r ocr/guild-rank-ocr/requirements.txt
```

Confirme o OpenCV:

```bash
python -c "import cv2; print(cv2.__version__)"
```

## 6. Playwright e Chromium

```bash
python -m pip install playwright
python -m playwright install chromium
```

Verifique:

```bash
python -m playwright --version
```

## 7. Comandos oficiais

### Suíte rápida

```bash
python tools/run_tests.py --quick
```

Executa:

1. sintaxe de todos os JavaScripts publicados;
2. `test_core.js`;
3. `test_regressions.py`;
4. `validate_raid_history.py`.

Não abre navegador.

### Somente navegador

```bash
python tools/run_tests.py --browser
```

Exige Playwright e Chromium.

### Suíte completa

```bash
python tools/run_tests.py --all
```

Executa a suíte rápida e os testes de navegador. Falha se Playwright não estiver disponível.

### Modo automático

```bash
python tools/run_tests.py
```

Executa a suíte rápida e acrescenta navegador quando Playwright estiver instalado.

## 8. Cobertura por arquivo

### `test_core.js`

- limites matemáticos do Hall;
- ranking dinâmico e ausentes;
- métricas essenciais dos cards;
- estrutura e filtros do Registro;
- Liga, papéis e arquivos locais;
- loader, reveal, feedback e retorno ao topo;
- caminhos canônicos e versão documental.

### `test_regressions.py`

O arquivo é dividido por responsabilidade:

#### OCR e histórico

- artefatos bruto, revisado, JSON e relatório da Raid 133;
- dano, participação e pendências;
- correções isoladas por raid;
- aliases curtos protegidos;
- quinta imagem limitada às posições 29 e 30;
- Raid 133 atual, Raid 132 anterior e histórico com quatro entradas.

#### Limpeza da Raid

- ausência do dashboard coletivo em `raid.html`;
- ausência de `raid-evolution.js`;
- ausência de CSS `.raid-evolution-*`;
- evolução coletiva restrita ao Registro.

#### Registro

- evolução individual e coletiva;
- Raids 130–133 e fontes oficial/estimada;
- snapshot único e nenhum segundo `fetch`;
- modal único, bloqueio, foco, X e cache;
- gráficos responsivos sem rolagem lateral;
- retorno à batalha e ausência de dados;
- segmentos interrompidos quando faltam raids;
- `colgroup`, nove colunas e alinhamento desktop.

#### Projeto

- validade de JSONs;
- referências HTML e links Markdown;
- sete documentos canônicos;
- orçamento de imagens críticas;
- migração WebP;
- ausência de `.venv`, caches, ZIPs e pacotes locais;
- confirmação de apenas três arquivos principais de teste.

### `test_browser.py`

- sete páginas em celular, tablet e desktop;
- loader e imagens críticas;
- ausência de erros JavaScript e overflow horizontal;
- Registro em onze larguras, modal, foco, casos sem histórico e ordenação;
- Raid restrita a boss, elemento, times e resultados;
- ausência de requisição a `raid_history.json` na página Raid;
- Liga e botão global de retorno ao topo.

### `validate_raid_history.py`

- estrutura da raid atual e das entradas históricas;
- consistência dos dados consumidos por Hall e Registro;
- avisos para bases estimadas e frequências excluídas da média.

## 9. Responsabilidade atual das páginas

### Registro

É a única página que apresenta evolução individual e coletiva. Reutiliza o histórico carregado por `app.js` e não deve executar um segundo `fetch`.

### Raid

É exclusiva para consulta estratégica de bosses, elementos, composições, equipamentos, chains, vídeos e cache da API. Não deve carregar:

- `raid-evolution.js`;
- `raid_history.json`;
- cards ou gráficos coletivos da guilda.

## 10. Antes do commit

```bash
python tools/run_tests.py --quick
python tools/run_tests.py --all
git status
git diff --stat
git diff --check
```

Não inclua `.venv`, `__pycache__`, screenshots, caches, arquivos temporários ou credenciais.

## 11. Antes do deploy

- branch correta e sincronizada;
- árvore de trabalho limpa;
- suíte aplicável aprovada;
- hospedagem apontando para `web/`;
- páginas testadas por HTTP, nunca por `file://`;
- console e Network sem erros inesperados.

## 12. Antes de promover uma nova raid

1. revise `raid_N_bruto.csv`;
2. confira `raid_N_revisado.csv`;
3. confirme `raid_N_relatorio.json` validado e sem pendências;
4. promova os JSONs;
5. execute:

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json

python tools/run_tests.py --quick
```

## 13. Avisos esperados

O validador pode emitir avisos sem bloquear a suíte:

- base estimada;
- frequência histórica abaixo de `15/21`, excluída da média;
- membro ausente em uma base antiga.

Erros estruturais, duplicidades, JSON inválido ou inconsistência entre raid atual e histórico devem bloquear o commit.

## 14. Erros comuns

### `ModuleNotFoundError: No module named 'cv2'`

```bash
python -m pip install -r ocr/guild-rank-ocr/requirements.txt
```

### `artefatos locais encontrados: ['.venv']`

Remova a `.venv` de dentro do repositório e use um ambiente externo.

### Playwright não instalado

```bash
python -m pip install playwright
python -m playwright install chromium
```

### JSON não carrega no navegador

```bash
python -m http.server 8000 --directory web
```

### Teste da Raid encontra histórico

Confirme que `raid.html` não referencia `raid-evolution.js` e que `raid.js` não solicita `raid_history.json`.

## 15. Política de manutenção

- `tools/run_tests.py` é o único runner oficial;
- mantenha somente `test_core.js`, `test_regressions.py` e `test_browser.py` como testes principais;
- acrescente regressões ao bloco temático adequado em vez de criar um arquivo por versão;
- não replique instruções completas em outros documentos;
- atualize este arquivo quando dependências, comandos ou cobertura mudarem;
- evite testes presos a danos ou nomes mutáveis, salvo artefatos oficiais auditados.
