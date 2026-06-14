# Visão geral da arquitetura

O Portal possui três subsistemas:

1. **Aplicação publicada (`web/`)** — HTML/CSS/JS/JSON.
2. **Pipeline de dados (`ocr/` + `tools/`)** — screenshot até raid publicada.
3. **Documentação e testes (`docs/` + `tools/`)** — manutenção, regressão e releases.

## Carregamento

As páginas usam scripts clássicos, sem módulos ES. A ordem importa: `ui.js` antes de módulos que usam `AvalonUI`; `data.js` e `hall-rules.js` antes de `app.js`.

## Estado

- Hall/Registro/Busca: estado em memória reconstruído dos JSONs.
- Liga: estado em memória + `localStorage`.
- Raid estratégica: API externa + cache local.

## Publicação

O diretório publicável é `web/`. Não é necessário build.
