# Documentação técnica — Portal Avalon V7.8.3.4

Esta pasta é a fonte técnica consolidada do Portal Avalon. Ela foi reduzida para poucos arquivos, evitando READMEs duplicados, relatórios fragmentados, imagens de evidência e documentos de versões intermediárias.

## Leitura recomendada

| Ordem | Documento | Finalidade |
|---:|---|---|
| 1 | [`ARQUITETURA.md`](ARQUITETURA.md) | Estrutura do projeto, páginas, scripts, dados e dependências. |
| 2 | [`REGRAS_E_DADOS.md`](REGRAS_E_DADOS.md) | Regras do Hall, ranking, histórico, Raid e fluxo de atualização dos dados. |
| 3 | [`LIGA_FIREBASE.md`](LIGA_FIREBASE.md) | Liga V7.8.1, autenticação, Firestore, rascunhos, arquivos e encerramento. |
| 4 | [`MANUTENCAO_E_DEPLOY.md`](MANUTENCAO_E_DEPLOY.md) | Execução local, alterações seguras, OCR, Git, release e solução de problemas. |
| 5 | [`TESTES.md`](TESTES.md) | Comandos, cobertura, baseline atual e histórico consolidado de validações. |
| 6 | [`CHANGELOG.md`](CHANGELOG.md) | Evolução resumida do Portal até a V7.8.3.4. |

## Visão geral

O Portal Avalon é uma aplicação web estática para a Guilda Avalon. O conteúdo publicado fica em `web/` e não exige etapa de build.

Principais áreas:

- **Salão:** apresentação e resumo da raid atual;
- **Hall:** classificação de evolução pessoal;
- **Buscar:** ficha individual do guardião;
- **Registro:** tabela e filtros dos membros atuais, consulta individual e comparação coletiva das Raids 130–133;
- **Raid:** consulta externa de composições e estratégias;
- **Galeria:** eventos e imagens da guilda;
- **Liga:** torneios internos com Firebase em tempo real.

## Execução local

Na raiz do projeto:

```bash
python -m http.server 8000 --directory web
```

Acesse:

```text
http://localhost:8000
```

A Liga está em:

```text
http://localhost:8000/pages/liga.html
```

Também é possível usar Live Server. Não abra por `file://`, pois os JSONs, módulos JavaScript e requisições podem ser bloqueados pelo navegador.

## Estrutura principal

```text
raid_hall/
├── README.md
├── web/        # aplicação publicada
├── ocr/        # leitura e tratamento dos screenshots
├── tools/      # promoção de raids e testes
└── docs/       # estes sete documentos
```

## Fontes oficiais

| Informação | Fonte |
|---|---|
| Aplicação publicada | `web/` |
| Raid atual | `web/data/raids/raid_atual.json` |
| Histórico e políticas | `web/data/raids/raid_history.json` |
| Correções comprovadas | `web/data/raids/raid_manual_overrides.json` |
| Modos e mapas da Liga | `web/data/arenas.json` |
| Insígnias | `web/data/insignias.json` |
| Galeria | `web/data/gallery/eventos.json` |
| Configuração Firebase | `web/assets/js/firebase-config.js` |
| Extração OCR | `ocr/guild-rank-ocr/` |
| Testes e utilitários | `tools/` |

## Política documental

- Não criar outro README geral dentro de `web/`.
- Não armazenar screenshots, evidências visuais ou originais de design em `docs/`.
- Registrar mudanças funcionais em `CHANGELOG.md`.
- Atualizar o documento temático correspondente quando mudar regra, dado, fluxo ou arquitetura.
- Resultados novos de teste devem ser incorporados em `TESTES.md`, evitando um arquivo por versão.
- Releases antigas permanecem resumidas no changelog; o histórico detalhado continua disponível no Git.

## Estado atual

- **Versão funcional:** V7.8.3.4 — Limpeza da Raid e consolidação dos testes.
- **Aplicação:** estática, sem framework ou build obrigatório.
- **Deploy recomendado:** Cloudflare Pages publicando `web/`.
- **Liga:** Firebase Authentication + Cloud Firestore, carregados em segundo plano.
- **Documentação:** consolidada em sete arquivos essenciais.
- **Testes:** runner único em `tools/run_tests.py` e três arquivos principais (`test_core.js`, `test_regressions.py`, `test_browser.py`); instalação, cobertura e diagnóstico ficam em `docs/TESTES.md`.
