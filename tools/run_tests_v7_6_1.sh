#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

printf '\n[1/7] Regressão funcional V7.3.1\n'
node "$ROOT/tools/test_v7_3_1.js"

printf '\n[2/7] Regressão estrutural V7.4\n'
node "$ROOT/tools/test_v7_4.js"

printf '\n[3/7] Regressão estrutural V7.5\n'
node "$ROOT/tools/test_v7_5.js"

printf '\n[4/7] Regressão estrutural V7.6\n'
node "$ROOT/tools/test_v7_6.js"

printf '\n[5/7] Validação do histórico\n'
python3 "$ROOT/tools/validate_raid_history.py" \
  --history "$ROOT/web/data/raids/raid_history.json" \
  --current "$ROOT/web/data/raids/raid_atual.json"

printf '\n[6/7] Maintenance Edition: documentação, referências e baseline\n'
python3 "$ROOT/tools/test_v7_6_1.py"

printf '\n[7/7] Testes visuais disponíveis\n'
if python3 -c 'import playwright' >/dev/null 2>&1; then
  python3 "$ROOT/tools/test_browser_v7_6.py"
else
  printf 'Playwright não instalado: teste visual automatizado ignorado. Consulte docs/arquitetura/DEPENDENCIAS.md.\n'
fi

printf '\nPortal Avalon V7.6.1 aprovado.\n'
