#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/3] Sintaxe JavaScript"
node --check web/assets/js/ui.js
node --check web/assets/js/app.js
node --check web/assets/js/raid.js
node --check web/assets/js/liga.js
node --check web/assets/js/firebase-config.js
node --check web/assets/js/liga-firebase.js

echo "[2/3] Estrutura consolidada"
node tools/test_v7_7_3.js

echo "[3/3] Navegador e responsividade"
python tools/test_browser_v7_7_3.py

echo "Consolidação final aprovada."
