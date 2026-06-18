#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

printf '\n[1/7] Sintaxe do controlador global\n'
node --check web/assets/js/ui.js

printf '\n[2/7] Retorno ao topo\n'
python tools/test_back_to_top.py

printf '\n[3/7] Flash das patentes e troféus estáticos\n'
python tools/test_hall_patent_flash.py

printf '\n[4/7] Regressão Hall e Registro\n'
node tools/test_v7_3_1.js

printf '\n[5/7] Regressão Liga\n'
node tools/test_v7_4.js

printf '\n[6/7] Regressão do pódio\n'
node tools/test_v7_5.js

printf '\n[7/7] Estrutura global\n'
node tools/test_v7_6.js

printf '\nTestes V7.7.4.1 aprovados.\n'
