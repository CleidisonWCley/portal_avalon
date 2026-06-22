# Portal Avalon

Portal estático da Guilda Avalon para acompanhar raids, evolução dos guardiões, histórico de desempenho, estratégias e torneios internos.

**Versão funcional atual:** V7.9.0.2 — automação do ciclo de novos e retornantes.
**Base funcional preservada:** V7.8.3.4 — remoção do dashboard legado da Raid e consolidação dos testes.

> Este é o README oficial e a entrada principal do projeto. A documentação técnica consolidada está em [`docs/`](docs/README.md).

## Recursos principais

- Salão com apresentação, identidade da Guilda Avalon e Ramigam integrado ao card de propósito do portal;
- Hall da Evolução baseado em frequência, dano, histórico, crescimento pessoal e ciclo automatizado de novos/retornantes;
- busca individual e fichas dos guardiões;
- pré-cadastro interno de guardiões sem raid válida, sem código do jogo e sem poluir Hall, médias ou rankings;
- Registro com ranking de dano, Hall evolutivo, evolução individual em modal bloqueante, casos sem histórico tratados e comparação coletiva responsiva das Raids 130–133;
- Raid dedicada à consulta estratégica de bosses, elementos, times, equipamentos, chains e vídeos;
- Galeria histórica da guilda;
- Liga Avalon com modos competitivos, chaves, mapas, pódio e exportações;
- transmissão da Liga em tempo real com Firebase;
- acesso persistente de participante e sessão administrativa controlada;
- rascunhos e arquivos locais exclusivos do organizador.

## Executar localmente

O Portal usa `fetch`, módulos JavaScript e Firebase. Execute por HTTP, nunca diretamente por `file://`.

Na raiz do repositório:

```bash
python -m http.server 8000 --directory web
```

Acesse:

```text
http://localhost:8000
```

A extensão **Live Server** do Visual Studio Code também é compatível.

## Estrutura do repositório

```text
raid_hall/
├── README.md          # entrada oficial
├── web/               # aplicação estática publicada
├── docs/              # documentação técnica consolidada
├── tools/             # manutenção de raids e testes de regressão
└── ocr/               # leitura e tratamento dos screenshots
```

### `web/`

HTML, CSS, JavaScript, imagens e JSONs utilizados pelo Portal publicado.

### `docs/`

Sete documentos essenciais:

- [`docs/README.md`](docs/README.md): índice e início rápido;
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): páginas, scripts, componentes e dependências;
- [`docs/REGRAS_E_DADOS.md`](docs/REGRAS_E_DADOS.md): Hall, raids, histórico e fontes da verdade;
- [`docs/LIGA_FIREBASE.md`](docs/LIGA_FIREBASE.md): acesso, sincronização, arquivos e segurança da Liga;
- [`docs/MANUTENCAO_E_DEPLOY.md`](docs/MANUTENCAO_E_DEPLOY.md): alteração segura, Git e publicação;
- [`docs/TESTES.md`](docs/TESTES.md): suíte atual e critérios de aprovação;
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md): histórico resumido das versões.

### `tools/`

Ferramentas permanentes para promover e validar raids, além da suíte consolidada em `test_core.js`, `test_regressions.py` e `test_browser.py`. Consulte [`tools/README.md`](tools/README.md).

### `ocr/`

Subprojeto de extração de rankings por imagem. Possui ambiente e README próprios.

## Testes de regressão

Comandos principais:

```bash
python tools/run_tests.py --quick
python tools/run_tests.py --browser
python tools/run_tests.py --all
```

A instalação, cobertura, interpretação dos avisos e solução de problemas estão centralizadas em [`docs/TESTES.md`](docs/TESTES.md).

## Fluxo resumido de uma nova raid

```text
screenshots padronizados
→ OCR bruto
→ revisão vinculada ao número da raid
→ CSV/JSON identificados
→ promoção segura
→ validação
→ regressões
→ commit
→ push
→ deploy
```

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

O OCR preserva o resultado bruto, não herda correções de outra raid e bloqueia sobrescrita silenciosa. As regras completas estão em [`docs/REGRAS_E_DADOS.md`](docs/REGRAS_E_DADOS.md).

## Liga em tempo real

A Liga utiliza Firebase Authentication para organizadores e Cloud Firestore para transmitir o torneio atual.

- participantes entram em modo somente leitura e veem apenas uma Liga publicada;
- a escolha Participante fica lembrada até **Mudar de acesso**;
- organizadores usam sessão temporária por padrão;
- permanência administrativa exige consentimento explícito;
- rascunhos e arquivos concluídos ficam somente no dispositivo do organizador;
- encerrar uma Liga remove o conteúdo da visualização dos participantes.

Detalhes: [`docs/LIGA_FIREBASE.md`](docs/LIGA_FIREBASE.md).

## Fontes oficiais

| Informação | Fonte |
|---|---|
| aplicação publicada | `web/` |
| raid atual | `web/data/raids/raid_atual.json` |
| histórico | `web/data/raids/raid_history.json` |
| regras do Hall | `web/assets/js/hall-rules.js` |
| lógica geral | `web/assets/js/app.js` |
| Liga local | `web/assets/js/liga.js` |
| Liga online | `web/assets/js/liga-firebase.js` |
| OCR e artefatos por raid | `ocr/guild-rank-ocr/` |
| manutenção e regressão | `tools/` |
| documentação | `docs/` |

Antes de editar dados ou regras, confirme a fonte da verdade no documento temático correspondente.

## Publicação

O projeto não exige build. A pasta publicada é `web/` e pode ser servida por qualquer hospedagem estática configurada no repositório.

Fluxo recomendado:

git status
git diff --stat
python tools/run_tests.py --quick
git add -A
git diff --cached --stat
git commit -m "descrição objetiva"
git push origin main

As instruções completas estão em [`docs/MANUTENCAO_E_DEPLOY.md`](docs/MANUTENCAO_E_DEPLOY.md).

## Segurança
Não versionar:
- senhas ou tokens privados;
- Service Account do Firebase;
- `.env` com segredos;
- screenshots e evidências locais;
- ambientes virtuais, caches ou pacotes gerados.
A configuração pública do Firebase para aplicações web não substitui as regras do Firestore nem a validação administrativa por UID.