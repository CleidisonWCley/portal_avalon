# Arquitetura do Portal Avalon

## 1. Princípios

O Portal é uma aplicação estática composta por HTML, CSS, JavaScript e JSON. Não utiliza framework, bundler, npm ou backend próprio para as páginas principais.

Princípios mantidos:

1. `web/` é o diretório publicável;
2. os JSONs são fontes operacionais auditáveis;
3. scripts clássicos são carregados em ordem explícita;
4. a Liga local funciona antes da integração Firebase;
5. componentes globais ficam em `ui.js` e `styles.css`;
6. regras de negócio não devem ser duplicadas entre módulos;
7. falha de um serviço externo não deve derrubar outras páginas.

## 2. Camadas

```text
Interface
├── web/index.html
├── web/pages/*.html
└── web/assets/css/styles.css

Núcleo compartilhado
├── web/assets/js/ui.js
├── web/assets/js/data.js
├── web/assets/js/hall-rules.js
└── web/assets/js/app.js

Módulos independentes
├── web/assets/js/raid.js
├── web/assets/js/registro-evolution.js
├── web/assets/js/liga.js
├── web/assets/js/liga-firebase.js
└── web/assets/js/firebase-config.js

Dados publicados
└── web/data/**/*.json

Pipeline e qualidade
├── ocr/
├── tools/
└── docs/
```

## 2.1 Suíte de qualidade consolidada

A manutenção automatizada utiliza um runner e três testes principais:

```text
tools/
├── run_tests.py          # orquestra sintaxe, regras, regressões e navegador
├── test_core.js          # regras funcionais executadas em Node.js
├── test_regressions.py   # OCR, histórico, Registro, estrutura e higiene
└── test_browser.py       # Playwright, interações e responsividade
```

Testes nomeados por versão foram absorvidos por `test_regressions.py`. Novas proteções devem ser adicionadas ao bloco temático correspondente, evitando um arquivo por release. A documentação canônica está em [`TESTES.md`](TESTES.md).

## 3. Páginas e scripts

| Página | Arquivo | Scripts principais | Fonte de dados/serviço |
|---|---|---|---|
| Salão | `web/index.html` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | raids, histórico e insígnias |
| Hall | `web/pages/hall.html` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | raid atual e histórico |
| Buscar | `web/pages/oraculo.html` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | membros consolidados |
| Registro | `web/pages/registro.html` | `ui.js`, `data.js`, `hall-rules.js`, `app.js`, `registro-evolution.js` | raid atual e histórico |
| Raid | `web/pages/raid.html` | `ui.js`, `raid.js` | API externa + cache local |
| Galeria | `web/pages/galeria.html` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | `gallery/eventos.json` |
| Liga | `web/pages/liga.html` | `ui.js`, `liga.js` | arenas, raid atual e Firebase |

### Caminhos relativos

- `web/index.html` usa `assets/...` e `data/...`;
- arquivos em `web/pages/` usam `../assets/...` e `../data/...`;
- os módulos usam `document.body.dataset.root` para resolver a raiz quando necessário.

## 4. Responsabilidade dos scripts

### `ui.js`

- loader global;
- tarefas críticas e imagens críticas;
- carregamento resiliente de JSON;
- feedback global;
- sistema `reveal`;
- retorno ao topo;
- proteção durante pinch zoom;
- flashes visuais decorativos, quando suportados.

### `data.js`

- caminhos canônicos dos JSONs;
- labels de participação;
- metadados das patentes;
- configurações de acesso local não administrativo.

### `hall-rules.js`

- cálculo puro da evolução;
- seleção de raids históricas válidas;
- limites de posição por frequência;
- classificação e desempates;
- motivos de não classificação.

### `app.js`

- carrega somente os dados exigidos pela página atual;
- monta Salão, Hall, Buscar, Registro e Galeria;
- organiza filtros, cards, fichas e canvas de guardião;
- não deve duplicar fórmulas de `hall-rules.js`.

### `registro-evolution.js`

- reutiliza o snapshot publicado por `app.js`, sem novo `fetch`;
- mantém um único modal bloqueante e cacheia a apresentação por membro/viewport;
- compartilha o mesmo motor SVG entre evolução individual e coletiva;
- reorganiza a tabela coletiva sem recalcular ou recarregar os dados.


### `raid.js`

- consulta `https://avalon-raid-api.cleidisonlima20.workers.dev`;
- usa assets e links de `gtales.top`;
- mantém cache local por seis horas;
- preserva mensagens, fallback e última consulta.


### `liga.js`

- participantes, convidados e modos;
- equipes automáticas e manuais;
- sorteio, mapas, chaves e fases;
- vencedores, pódio e canvas;
- rascunho e arquivos locais da Liga;
- API global `AvalonLeagueStorage` usada pela camada Firebase.

### `liga-firebase.js`

- escolha e persistência do perfil de acesso;
- autenticação do organizador;
- validação de `admins/{uid}`;
- publicação, sincronização e listener em tempo real;
- encerramento, arquivamento e navegação protegida;
- bloqueio visual e funcional dos controles administrativos.

### `firebase-config.js`

- inicializa Firebase App, Authentication e Firestore;
- centraliza coleções, documento ativo, chaves de acesso local e limite de arquivos;
- não contém senha ou segredo administrativo.

## 5. Carregamento e resiliência

O loader aguarda apenas recursos declarados como críticos:

- DOM;
- imagens com `data-avalon-critical-image`;
- tarefas registradas por `AvalonLoader.register()`;
- dados necessários à primeira renderização.

`AvalonResources` oferece:

- timeout;
- repetição controlada;
- cache local da última resposta válida;
- fallback por componente.

Não reintroduzir:

- substituição global de `window.fetch`;
- `cache: "no-store"` indiscriminado;
- encerramento forçado silencioso do loader;
- carregamento de todos os JSONs em todas as páginas.

## 6. Estado e persistência

| Área | Estado principal |
|---|---|
| Hall, Buscar e Registro | memória reconstruída dos JSONs |
| Galeria | memória baseada em `eventos.json` |
| Raid | memória + cache local de seis horas |
| Liga em preparação | `portal_avalon_liga_draft_v2` |
| Liga arquivada | `portal_avalon_liga_archives_v1` |
| Liga publicada | Firestore `ligas/liga_atual` |
| Perfil participante | `portal_avalon_liga_access_role` |
| Organizador temporário | Firebase/sessionStorage |
| Organizador persistente | Firebase/localStorage após consentimento |

## 7. Componentes globais

Componentes compartilhados:

- `.site-header` e `.main-nav`;
- `.medieval-card`, `.gold-frame`, `.blue-frame`;
- `.page-hero-mascots` e plataforma luminosa;
- `.avalon-page-loader`;
- `.action-feedback-*`;
- `.site-back-top`;
- `.reveal`;
- inputs, botões, cards e estados vazios.

O cabeçalho e o rodapé estão duplicados nos HTMLs por decisão compatível com o projeto estático. Qualquer alteração precisa ser aplicada a todas as páginas.

## 8. Responsividade

Breakpoints consolidados:

- `1180px`: ajuste intermediário de layouts amplos;
- `980px`: tablets, Registro em cards e reorganizações críticas;
- `720px`: experiência mobile;
- `440px`: celulares compactos.

Regras:

- não mascarar erros com `overflow-x: hidden` global;
- preservar quatro heróis nos cards da Raid;
- preservar tabela do Registro em desktop e cards em telas estreitas;
- renderizar a evolução individual em um único modal sob demanda, com gráficos responsivos sem rolagem horizontal;
- interromper segmentos de gráficos quando uma raid não possuir registro, sem ligar pontos separados por lacunas;
- manter cabeçalho e células do Registro sincronizados pelo `colgroup`, com divisórias verticais somente no desktop;
- testar cabeçalho, mascotes, filtros, modais e canvas em cada faixa.

## 9. Canvas e exportações

A Liga possui dois motores compartilhados:

- `AvalonLeagueCanvas`: rodadas, confrontos, equipes e Survival;
- `AvalonLeaguePodiumCanvas`: pódio completo e cards individuais.

As imagens de exibição podem ser WebP otimizadas, mas os originais de maior qualidade podem continuar sendo usados nas exportações. Mudanças de canvas devem testar nomes longos, equipes, 1v1, 2v2, 3v3, Survival e pódio.

## 10. Dependências externas

- Google Fonts e Material Symbols;
- Firebase JavaScript modular via CDN, versão definida em `firebase-config.js`;
- Cloud Firestore e Firebase Authentication;
- API externa da Raid;
- recursos do `gtales.top` para a consulta estratégica;
- APIs nativas do navegador: `fetch`, Canvas, Clipboard, localStorage, sessionStorage, IntersectionObserver e visualViewport.

A indisponibilidade do Firebase não deve impedir a interface local da Liga de abrir. A indisponibilidade da API da Raid deve preservar cache e mensagem clara.

## 11. Áreas de maior risco

- `hall-rules.js`, `raid_history.json` e overrides;
- `liga.js`, `liga-firebase.js`, Firebase Rules e `admins/{uid}`;
- `ui.js`, loader e sistema de reveal;
- `styles.css` e breakpoints globais;
- caminhos relativos e assets renomeados;
- canvas e imagens de exportação.

Antes de alterar uma área crítica, consulte também [`TESTES.md`](TESTES.md) e [`MANUTENCAO_E_DEPLOY.md`](MANUTENCAO_E_DEPLOY.md).
