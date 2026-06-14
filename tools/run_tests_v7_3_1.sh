#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

printf '\n[1/5] Sintaxe JavaScript\n'
find "$ROOT/web/assets/js" -maxdepth 1 -name '*.js' -print0 | while IFS= read -r -d '' file; do
  node --check "$file"
done

printf '\n[2/5] Testes unitários e de integração V7.3.1\n'
node "$ROOT/tools/test_v7_3_1.js"

printf '\n[3/5] Validação do histórico\n'
python3 "$ROOT/tools/validate_raid_history.py" \
  --history "$ROOT/web/data/raids/raid_history.json" \
  --current "$ROOT/web/data/raids/raid_atual.json"

printf '\n[4/5] Testes visuais/DOM V7.3.1\n'
python3 "$ROOT/tools/test_browser_v7_3_1.py"

printf '\n[5/5] JSON e referências locais\n'
python3 - "$ROOT" <<'PY'
import json, sys
from html.parser import HTMLParser
from pathlib import Path
root=Path(sys.argv[1])
for p in root.joinpath('web').rglob('*.json'):
    json.loads(p.read_text(encoding='utf-8'))
class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        for key in ('src','href'):
            value=d.get(key)
            if value and not value.startswith(('http://','https://','#','mailto:','data:')): self.refs.append(value)
missing=[]
for html in root.joinpath('web').rglob('*.html'):
    parser=Parser(); parser.feed(html.read_text(encoding='utf-8'))
    for ref in parser.refs:
        target=(html.parent/ref).resolve()
        if not target.exists(): missing.append(f'{html.relative_to(root)} -> {ref}')
if missing: raise SystemExit('Referências locais ausentes:\n'+'\n'.join(missing))
print('JSON válidos e referências locais existentes.')
PY

printf '\nTodos os testes da V7.3.1 foram aprovados.\n'
