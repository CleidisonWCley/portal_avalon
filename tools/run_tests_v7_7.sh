#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/5] Sintaxe JavaScript"
node --check web/assets/js/app.js
node --check web/assets/js/raid.js

echo
echo "[2/5] Estrutura V7.7"
node tools/test_v7_7.js

echo
echo "[3/5] Regressão funcional do Hall e Registro"
node tools/test_v7_3_1.js

echo
echo "[4/5] Validação do histórico"
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json

echo
echo "[5/5] Testes visuais e responsivos V7.7"
python tools/test_browser_v7_7.py

echo
echo "V7.7 aprovada: sintaxe, estrutura, regras, histórico e experiência responsiva validados."
