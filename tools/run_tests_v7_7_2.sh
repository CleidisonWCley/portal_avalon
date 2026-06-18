#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/6] Sintaxe JavaScript"
node --check web/assets/js/ui.js
node --check web/assets/js/app.js
node --check web/assets/js/raid.js
node --check web/assets/js/liga.js

echo
echo "[2/6] Estrutura e consolidação V7.7.2"
node tools/test_v7_7_2.js

echo
echo "[3/6] Regressão funcional do Hall e Registro"
node tools/test_v7_3_1.js

echo
echo "[4/6] Regressão estrutural V7.6"
node tools/test_v7_6.js

echo
echo "[5/6] Validação do histórico"
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json

echo
echo "[6/6] Testes visuais, responsivos e de motion V7.7.2"
python tools/test_browser_v7_7_2.py

echo
echo "V7.7.2 aprovada: código consolidado, motion sincronizado e regressões validadas."
