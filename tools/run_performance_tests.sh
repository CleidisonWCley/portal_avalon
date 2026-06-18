#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

python3 "$ROOT/tools/test_loading_resilience.py"
python3 "$ROOT/tools/test_image_budget.py"
python3 "$ROOT/tools/test_zoom_responsive.py"

node --check "$ROOT/web/assets/js/ui.js"
node --check "$ROOT/web/assets/js/app.js"
node --check "$ROOT/web/assets/js/raid.js"
node --check "$ROOT/web/assets/js/liga.js"
node --check "$ROOT/web/assets/js/liga-firebase.js"

echo "OK — suíte de desempenho concluída."
