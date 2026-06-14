#!/usr/bin/env bash
# Compatibilidade: na árvore V7.3.1, este atalho executa a suíte atual.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/tools/run_tests_v7_3_1.sh"
