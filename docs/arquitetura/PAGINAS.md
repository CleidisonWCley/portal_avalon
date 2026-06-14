# Catálogo de páginas

| Página | Arquivo | `data-page` | Script | Dados/serviços |
|---|---|---|---|---|
| Salão | `web/index.html` | `home` | `data.js`, `hall-rules.js`, `app.js` | raids, insignias |
| Hall | `web/pages/hall.html` | `hall` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | atual + histórico |
| Buscar | `web/pages/oraculo.html` | `oraculo` | `data.js`, `hall-rules.js`, `app.js` | membros consolidados |
| Registro | `web/pages/registro.html` | `registro` | `ui.js`, `data.js`, `hall-rules.js`, `app.js` | atual + histórico |
| Raid | `web/pages/raid.html` | `raid` | `ui.js`, `raid.js` | API externa/cache |
| Galeria | `web/pages/galeria.html` | `galeria` | `data.js`, `hall-rules.js`, `app.js` | `gallery/eventos.json` |
| Liga | `web/pages/liga.html` | `liga` | `ui.js`, `liga.js` | arenas, membros, localStorage |

## Atenção aos caminhos

A raiz usa `assets/...` e `data/...`. Páginas dentro de `pages/` usam `../assets/...`. A função `rootPath()` usa `body[data-root]` para carregar dados a partir das duas profundidades.

## Elementos dinâmicos

Hall, tabelas, sugestões, chaves, feedbacks, cards de Raid e canvas são criados por JavaScript. Pesquisar somente o HTML não localiza todas as classes consumidoras.
