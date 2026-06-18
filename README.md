# Portal Avalon

Portal estático da Guilda Avalon para acompanhamento de raids, Hall da Evolução, fichas de guardiões, estratégias e torneios internos.

**Versão funcional atual:** V7.7.4 — Desempenho, Carregamento e Zoom  
**Base técnica de manutenção:** V7.6.1 Maintenance Edition

> Este é o README oficial e a entrada principal do projeto. A documentação detalhada fica em `docs/`; não duplique instruções gerais dentro de `web/`.

---

## Refinamento de desempenho V7.7.4

A área funcional continua usando caminhos canônicos (`styles.css`, `ui.js`, `app.js`, `raid.js` e `liga.js`), sem parâmetros ou comentários de release. O loader agora aguarda apenas recursos críticos declarados, cada página carrega somente seus próprios dados, a Liga inicia localmente antes do Firebase e imagens WebP de exibição reduzem o peso inicial. O histórico de versões permanece restrito à documentação e ao Git.

## Executar localmente

O Portal carrega arquivos JSON com `fetch`, portanto deve ser executado por um servidor HTTP.

Na raiz do projeto, execute:

```bash
python -m http.server 8000 --directory web
```

Depois acesse:

```text
http://localhost:8000
```

Também é possível abrir a pasta `web/` com a extensão **Live Server** do Visual Studio Code.

Não abra as páginas diretamente por `file://`, pois o navegador pode bloquear o carregamento dos JSONs e de outros recursos locais.

---

## Primeira leitura para manutenção

Um novo mantenedor deve consultar os documentos nesta ordem:

1. [`docs/manutencao/INICIO_RAPIDO.md`](docs/manutencao/INICIO_RAPIDO.md)
2. [`docs/manutencao/MAPA_DO_PROJETO.md`](docs/manutencao/MAPA_DO_PROJETO.md)
3. [`docs/manutencao/GUIA_DE_MANUTENCAO.md`](docs/manutencao/GUIA_DE_MANUTENCAO.md)
4. [`docs/manutencao/CHECKLIST_NOVA_RAID.md`](docs/manutencao/CHECKLIST_NOVA_RAID.md)
5. [`docs/manutencao/AREAS_SENSIVEIS.md`](docs/manutencao/AREAS_SENSIVEIS.md)
6. [`docs/README.md`](docs/README.md)

O manual específico do OCR permanece no README do próprio subprojeto em `ocr/`.

---

## Estrutura principal

```text
raid_hall/
├── README.md              # entrada oficial do projeto
├── web/                   # aplicação estática publicada
├── ocr/                   # extração e tratamento dos screenshots
├── tools/                 # promoção de raids, validações e utilitários
├── tests/                 # testes automatizados e regressões
└── docs/                  # documentação técnica e histórica
```

### `web/`

Aplicação publicada: páginas HTML, CSS, JavaScript, imagens e dados JSON consumidos pelo Portal.

### `ocr/`

Ferramentas responsáveis pela leitura dos screenshots do ranking e pela preparação dos dados brutos.

### `tools/`

Utilitários para promoção de uma nova raid, validação de dados, preparação de versões e manutenção do projeto.

### `tests/`

Testes funcionais, estruturais, visuais e de regressão.

### `docs/`

Fonte oficial da documentação técnica. Contém arquitetura, regras, manutenção, releases, auditorias, evidências e resultados de testes.

---

## Fluxo resumido de atualização de Raid

```text
Screenshot da raid
→ OCR
→ revisão manual
→ atualização dos membros, danos e frequências
→ validação dos JSONs
→ promoção do histórico
→ testes do Hall, Busca e Registro
→ commit no Git
→ envio ao GitHub
→ deploy no Cloudflare Pages
```

O procedimento completo está em:

[`docs/manutencao/CHECKLIST_NOVA_RAID.md`](docs/manutencao/CHECKLIST_NOVA_RAID.md)

---

## Fontes oficiais

| Informação | Fonte oficial |
|---|---|
| Aplicação publicada | `web/` |
| Dados da raid atual | arquivos JSON em `web/data/` |
| Histórico de raids | `raid_history.json` |
| Extração dos screenshots | `ocr/` |
| Ferramentas de atualização | `tools/` |
| Regras do Portal | `docs/regras/` |
| Guia de manutenção | `docs/manutencao/` |
| Histórico das versões | `docs/CHANGELOG.md` |

Antes de editar qualquer dado, consulte a documentação para confirmar qual arquivo é a fonte da verdade.

---

## Regras de manutenção

Antes de criar uma classe, função ou componente:

1. pesquise o projeto inteiro;
2. confirme se já existe uma implementação equivalente;
3. consulte [`docs/arquitetura/COMPONENTES.md`](docs/arquitetura/COMPONENTES.md);
4. verifique elementos criados dinamicamente pelo JavaScript;
5. teste todas as páginas consumidoras.

Não altere dados históricos sem evidência da raid correspondente. Ao remover um membro da lista atual, preserve seu histórico.

---

## Política de documentação

- `README.md` da raiz: visão geral, execução e entrada oficial do projeto;
- `docs/README.md`: índice da documentação técnica;
- README do OCR: instruções específicas do subprojeto;
- READMEs em pastas de evidências ou releases: índices locais e históricos.

Não crie outro README geral dentro de `web/`. Documentos antigos devem ser movidos para `docs/archive/` e marcados como históricos.

---

## Testes de desempenho e resiliência

Para validar carregamento, imagens, zoom, responsividade e sintaxe:

```bash
./tools/run_performance_tests.sh
```

A suíte também confirma que a Galeria não baixa dados de Raid, que o Firebase não bloqueia a Liga e que Registro, Raid e Liga não geram overflow nas larguras testadas.

---

## Publicação

O projeto não possui etapa obrigatória de build, backend ou banco de dados.

É compatível com:

- Cloudflare Pages;
- GitHub Pages, quando configurado para publicar os arquivos estáticos adequados;
- Live Server;
- qualquer servidor HTTP estático.

As instruções completas de commit e deploy estão na documentação de manutenção.

---

## Estado da versão

A **V7.7.4** é a versão funcional atual do Portal Avalon. Ela preserva a base mobile consolidada, reduz o peso inicial, torna o carregamento resiliente, desacopla a Liga local do Firebase e estabiliza o layout durante zoom.

A **V7.6.1 Maintenance Edition** continua como a base documental de manutenção de longo prazo; o histórico das mudanças posteriores permanece no changelog e nos relatórios de release.

O manifesto abaixo registra os hashes do núcleo funcional anterior à otimização mobile:

[`docs/manutencao/MANIFESTO_BASELINE_V7_6.json`](docs/manutencao/MANIFESTO_BASELINE_V7_6.json)

## Liga em tempo real

A Liga Avalon utiliza Firebase Authentication para os organizadores e Cloud Firestore para sincronizar chaves, mapas, resultados e pódio em tempo real.

Participantes acompanham o torneio sem login e possuem acesso somente à visualização e aos downloads.

Documentação técnica:

[`docs/arquitetura/FIREBASE_LIGA.md`](docs/arquitetura/FIREBASE_LIGA.md)
