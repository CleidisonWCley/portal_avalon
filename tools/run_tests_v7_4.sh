#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

printf '\n[1/7] Sintaxe JavaScript\n'
find "$ROOT/web/assets/js" -maxdepth 1 -name '*.js' -print0 | while IFS= read -r -d '' file; do
  node --check "$file"
done

printf '\n[2/7] Regressão funcional V7.3.1\n'
node "$ROOT/tools/test_v7_3_1.js"

printf '\n[3/7] Estrutura e documentação V7.4\n'
node "$ROOT/tools/test_v7_4.js"

printf '\n[4/7] Validação do histórico\n'
python3 "$ROOT/tools/validate_raid_history.py" \
  --history "$ROOT/web/data/raids/raid_history.json" \
  --current "$ROOT/web/data/raids/raid_atual.json"

printf '\n[5/7] Testes visuais do canvas V7.4\n'
python3 "$ROOT/tools/test_browser_v7_4.py"

printf '\n[6/7] JSON, HTML e referências locais\n'
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
print('JSON válidos e referências HTML locais existentes.')
PY

printf '\n[7/7] Links Markdown centrais e ausência de relatórios soltos\n'
python3 - "$ROOT" <<'PY'
import re, sys
from pathlib import Path
root=Path(sys.argv[1])
required=['README.md','docs/README.md','docs/CHANGELOG.md','docs/VERSIONAMENTO.md','docs/ARQUITETURA.md','docs/COMPONENTES.md','docs/CHECKLIST_RELEASE.md']
for item in required:
    assert (root/item).exists(), item
assert not list(root.glob('RELATORIO_*.md'))
assert not list(root.glob('RESULTADOS_TESTES_*.txt'))
missing=[]
for md in [root/'README.md', *root.joinpath('docs').rglob('*.md')]:
    text=md.read_text(encoding='utf-8')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',text):
        if target.startswith(('http://','https://','#','mailto:')): continue
        clean=target.split('#',1)[0]
        if clean and not (md.parent/clean).resolve().exists():
            missing.append(f'{md.relative_to(root)} -> {target}')
if missing: raise SystemExit('Links Markdown ausentes:\n'+'\n'.join(missing))
print('Documentação central validada.')
PY

printf '\nTodos os testes da V7.4 foram aprovados.\n'
