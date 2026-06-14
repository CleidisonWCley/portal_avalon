# Áreas sensíveis

## Crítico

| Área | Por que é sensível | Testes mínimos |
|---|---|---|
| `hall-rules.js` | define elegibilidade, ordem e patentes | testes V7.3.1/V7.6 + casos de frequência |
| `raid_history.json` | fonte histórica e configuração | validador histórico + percentuais conhecidos |
| promoção de raid | pode perder histórico/elenco | backup, diff JSON, validador |
| aliases | podem unir ou separar pessoas erradas | OCR + Busca + histórico |
| Liga/chaves | estado recursivo e localStorage | modos, avanço, desfazer, pódio |
| canvas | geometria e imagens assíncronas | 1v1, 2v2, 3v3, nomes longos |

## Alto

- `app.js`: compartilhado por Salão, Hall, Buscar, Registro e Galeria.
- `styles.css`: cascata longa; uma regra global pode afetar sete páginas.
- `ui.js`: feedback e botão usados por vários módulos.
- caminhos relativos: páginas em `web/pages/` usam `../`.
- OCR `config.py`: coordenadas e correções podem substituir leituras reais.

## Médio

- filtros e ordenação visual;
- textos gerados por templates;
- responsividade;
- galeria e metadados;
- cards inline da Raid.

## Baixo

- documentação;
- texto isolado confirmado por busca global;
- imagem nova sem substituir arquivo existente;
- evidência ou release histórica.

## Regra de proteção

Quanto maior o risco, menor deve ser a alteração e maior o número de testes. Não aprove uma mudança crítica apenas porque “a página abriu”.
