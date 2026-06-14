# Arquivos JavaScript

## `data.js`

Constantes de caminhos, labels de status, patentes e configuração de acesso desabilitada.

## `hall-rules.js`

Módulo puro e testável. Normaliza regras, calcula frequência exigida por posição, identifica desclassificação, ordena candidatos, distribui Hall e associa patentes.

## `app.js`

Carrega dados, consolida histórico, calcula médias/evolução, cria ranking de dano, renderiza Salão/Hall/Busca/Registro/Galeria e gera ficha do Guardião.

Inicialização principal: `init()` no fim do arquivo, condicionada por `body[data-page]`.

## `ui.js`

Expõe `window.AvalonUI` com:

- `initBackToTop()`;
- `showActionFeedback()`;
- `closeActionFeedback()`.

## `liga.js`

Gerencia participantes, convidados, modos, equipes, sorteio, chaves, mapas, fases, pódio e canvas. Armazena estado sob `portal_avalon_liga_v531` e lê chaves legadas para compatibilidade.

## `raid.js`

Consulta a API configurada em `RAID_API_BASE`, mantém cache de seis horas, renderiza filtros, composições, equipamentos, cards inline e feedback global.

## Utilitários semelhantes não unificados

`$`, `$$`, `formatNumber`, `loadJson` e animações possuem implementações locais. A V7.6.1 não os unificou para preservar comportamento. Consulte o inventário de redundâncias antes de uma futura refatoração.
