# Início rápido do mantenedor

## 1. O que é este projeto

O Portal Avalon é uma aplicação web estática, sem backend próprio, composta por HTML, CSS, JavaScript e JSON. O conteúdo publicado está em `web/`. O OCR em `ocr/guild-rank-ocr/` transforma screenshots do ranking em dados tratados. Os scripts de `tools/` promovem esses dados para a aplicação e validam o resultado.

- Versão funcional final: **V7.6**
- Edição técnica: **V7.6.1 Maintenance Edition**
- Pasta publicada: **`web/`**
- Entrada principal: **`web/index.html`**

## 2. Executar localmente

Na raiz `raid_hall/`:

```bash
python -m http.server 8000 --directory web
```

Abra `http://localhost:8000`.

Alternativa: abra `web/` no VS Code e use a extensão Live Server. Não utilize `file://`, pois o navegador pode bloquear o carregamento dos JSONs.

## 3. Onde encontrar cada coisa

- Páginas: `web/index.html` e `web/pages/`
- CSS: `web/assets/css/styles.css`
- Núcleo Hall/Registro/Busca: `web/assets/js/app.js`
- Regras puras do Hall: `web/assets/js/hall-rules.js`
- Dados e labels: `web/assets/js/data.js`
- Interface compartilhada: `web/assets/js/ui.js`
- Liga: `web/assets/js/liga.js`
- Consulta Raid: `web/assets/js/raid.js`
- Raids: `web/data/raids/`
- OCR: `ocr/guild-rank-ocr/`
- Testes e promoção: `tools/`

## 4. Adicionar um novo membro para preencher vaga

1. Edite `ocr/guild-rank-ocr/src/config.py`.
2. Adicione o nick exato em `NOMES_VALIDOS`.
3. Adicione variações em `ALIASES_MEMBROS` quando existirem.
4. Execute o OCR da próxima raid. Quem está em `NOMES_VALIDOS` e não aparece no screenshot será incluído como ausente.
5. Revise o JSON tratado antes de publicar.
6. Não invente histórico para o novo membro. Ele ficará sem base suficiente até possuir raids históricas válidas.
7. Teste Buscar, Registro e Hall.

## 5. Remover um membro ativo

1. Remova o nick de `NOMES_VALIDOS` apenas quando a saída estiver confirmada.
2. Não apague o histórico antigo em `raid_history.json` por impulso.
3. Ao promover a próxima raid, o script mantém no histórico publicado somente o elenco da nova raid.
4. Confirme que o membro não retorna ao Hall, Busca ou Registro atual.

## 6. Iniciar o OCR

No Windows, instale o Tesseract e confirme o caminho configurado em `src/config.py`. Depois:

```bash
cd ocr/guild-rank-ocr
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m src.main
```

Linux/macOS:

```bash
cd ocr/guild-rank-ocr
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m src.main
```

Antes da execução:

- substitua os arquivos de `images/` pelos screenshots atuais;
- revise `NOMES_VALIDOS`, aliases e correções temporárias;
- desative ou atualize `CORRECOES_LINHAS_ATUAL`, pois elas pertencem à raid usada na calibração atual;
- confirme resolução e recortes em `REGIOES_BASE_PIXELS`.

Saídas esperadas em `output/`:

- `ocr_raw_*.csv`;
- `ocr_tratado_*.csv`;
- `raid_tratada_*.json`.

## 7. Do OCR para o site

Na raiz `raid_hall/`, use o JSON revisado:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/raid_tratada_YYYYMMDD_HHMMSS.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json
```

Depois valide:

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

O processo completo está em [`CHECKLIST_NOVA_RAID.md`](CHECKLIST_NOVA_RAID.md).

## 8. Testes

Suíte da edição de manutenção:

```bash
bash tools/run_tests_v7_6_1.sh
```

Em Windows sem Bash, execute ao menos:

```bash
node tools/test_v7_3_1.js
node tools/test_v7_4.js
node tools/test_v7_5.js
node tools/test_v7_6.js
python tools/test_v7_6_1.py
```

Os testes visuais exigem Playwright/Chromium configurado.

## 9. Commit e deploy

Resumo:

```bash
git status
git checkout -b manutencao/raid-YYYY-MM-DD
git add .
git commit -m "data: atualizar raid YYYY-MM-DD"
git push -u origin manutencao/raid-YYYY-MM-DD
```

Revise o Pull Request, faça merge e acompanhe o deploy do Cloudflare Pages conectado ao repositório. O procedimento detalhado está em [`FLUXO_GIT_DEPLOY.md`](FLUXO_GIT_DEPLOY.md).

## 10. Próximas leituras

- [`MAPA_DO_PROJETO.md`](MAPA_DO_PROJETO.md)
- [`GUIA_DE_MANUTENCAO.md`](GUIA_DE_MANUTENCAO.md)
- [`AREAS_SENSIVEIS.md`](AREAS_SENSIVEIS.md)
- [`../arquitetura/DADOS.md`](../arquitetura/DADOS.md)
- [`../regras/HALL_DA_EVOLUCAO.md`](../regras/HALL_DA_EVOLUCAO.md)
