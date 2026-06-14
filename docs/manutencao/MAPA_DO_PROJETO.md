# Mapa do projeto

```text
raid_hall/
├── README.md
├── web/                       # aplicação publicada
│   ├── index.html             # Salão
│   ├── pages/                 # Hall, Buscar, Registro, Raid, Galeria e Liga
│   ├── assets/
│   │   ├── css/styles.css
│   │   ├── js/                # app, regras, Liga, Raid e UI compartilhada
│   │   └── img/
│   └── data/                  # JSONs da aplicação
├── ocr/guild-rank-ocr/        # screenshots -> CSV/JSON tratado
├── tools/                     # promoção, validações e testes
├── docs/                      # documentação oficial
└── docs/archive/design/       # fontes auxiliares de arte arquivadas
```

## Matriz de responsabilidade e risco

| Diretório | Responsabilidade | Consumidor | Risco |
|---|---|---|---|
| `web/pages/` | estrutura das páginas | navegador | médio |
| `web/assets/css/` | visual e responsividade | todas as páginas | médio/alto |
| `web/assets/js/app.js` | Hall, Registro, Busca e Salão | 5 páginas | alto |
| `web/assets/js/hall-rules.js` | regra pura do Hall | app e testes | crítico |
| `web/assets/js/liga.js` | torneios e canvas | Liga | alto |
| `web/assets/js/raid.js` | consulta estratégica | Raid | alto |
| `web/assets/js/ui.js` | feedback e voltar ao topo | Hall, Registro, Raid e Liga | médio |
| `web/data/raids/` | dados atuais e históricos | app.js | crítico |
| `ocr/` | extração e correção OCR | manutenção de dados | alto |
| `tools/` | promoção e testes | mantenedor/CI manual | alto |
| `docs/` | fonte técnica | mantenedores | baixo, mas obrigatório |

## Arquivos que não devem ser editados às cegas

- `web/data/raids/raid_history.json`
- `web/assets/js/hall-rules.js`
- `web/assets/js/app.js`
- `web/assets/js/liga.js`
- `ocr/guild-rank-ocr/src/config.py`
- `tools/promote_raid_history.py`

Antes de tocar nesses arquivos, consulte `AREAS_SENSIVEIS.md`.
