#!/usr/bin/env python3
"""Valida a Maintenance Edition sem modificar o núcleo funcional V7.6."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_DOCS = [
    'README.md', 'docs/README.md', 'docs/CHANGELOG.md', 'docs/VERSIONAMENTO.md',
    'docs/manutencao/INICIO_RAPIDO.md', 'docs/manutencao/GUIA_DE_MANUTENCAO.md',
    'docs/manutencao/MAPA_DO_PROJETO.md', 'docs/manutencao/FLUXOS_DO_SISTEMA.md',
    'docs/manutencao/RECEITAS_DE_MANUTENCAO.md', 'docs/manutencao/SOLUCAO_DE_PROBLEMAS.md',
    'docs/manutencao/AREAS_SENSIVEIS.md', 'docs/manutencao/CHECKLIST_NOVA_RAID.md',
    'docs/manutencao/DECISOES_TECNICAS.md', 'docs/manutencao/FLUXO_GIT_DEPLOY.md',
    'docs/manutencao/MANIFESTO_BASELINE_V7_6.json',
    'docs/arquitetura/VISAO_GERAL.md', 'docs/arquitetura/PAGINAS.md',
    'docs/arquitetura/JAVASCRIPT.md', 'docs/arquitetura/DADOS.md',
    'docs/arquitetura/COMPONENTES.md', 'docs/arquitetura/CANVAS.md',
    'docs/arquitetura/DEPENDENCIAS.md',
    'docs/regras/HALL_DA_EVOLUCAO.md', 'docs/regras/RANKING_DE_DANO.md',
    'docs/regras/HISTORICO_DE_RAIDS.md', 'docs/regras/LIGA_AVALON.md',
    'docs/regras/CONSULTA_RAID.md', 'docs/releases/V7.6.1.md',
]

class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs: list[str] = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for key in ('src', 'href'):
            value = data.get(key)
            if value:
                self.refs.append(value)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)
    print(f'PASS | {label}')


def main() -> None:
    missing = [item for item in REQUIRED_DOCS if not (ROOT / item).exists()]
    check(not missing, f'documentação obrigatória presente ({len(REQUIRED_DOCS)} arquivos)')

    # Markdown links locais.
    broken: list[str] = []
    markdown_files = [ROOT / 'README.md', *ROOT.joinpath('docs').rglob('*.md')]
    for md in markdown_files:
        text = md.read_text(encoding='utf-8')
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', text):
            if target.startswith(('http://', 'https://', '#', 'mailto:')):
                continue
            clean = target.split('#', 1)[0]
            if clean and not (md.parent / clean).resolve().exists():
                broken.append(f'{md.relative_to(ROOT)} -> {target}')
    check(not broken, 'links Markdown locais válidos')

    # JSON publicado.
    for path in ROOT.joinpath('web').rglob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))
    check(True, 'JSONs publicados válidos')

    # Referências locais dos HTMLs.
    missing_refs: list[str] = []
    for html in ROOT.joinpath('web').rglob('*.html'):
        parser = RefParser()
        parser.feed(html.read_text(encoding='utf-8'))
        for ref in parser.refs:
            if ref.startswith(('http://', 'https://', '#', 'mailto:', 'data:')):
                continue
            if not (html.parent / ref).resolve().exists():
                missing_refs.append(f'{html.relative_to(ROOT)} -> {ref}')
    check(not missing_refs, 'referências HTML locais existentes')

    # Núcleo V7.6 congelado.
    manifest = json.loads((ROOT / 'docs/manutencao/MANIFESTO_BASELINE_V7_6.json').read_text(encoding='utf-8'))
    changed = []
    for relative, expected in manifest['files'].items():
        path = ROOT / relative
        if not path.exists() or sha256(path) != expected:
            changed.append(relative)
    check(not changed, f'núcleo funcional V7.6 preservado ({len(manifest["files"])} hashes)')

    # A correção de manutenção não pode voltar a forçar 7.2.
    promoter = (ROOT / 'tools/promote_raid_history.py').read_text(encoding='utf-8')
    check("history['version'] = '7.2'" not in promoter and "history.get('version')" in promoter,
          'promotor preserva versão do schema histórico')

    # Sintaxe JavaScript.
    for js in ROOT.joinpath('web/assets/js').glob('*.js'):
        subprocess.run(['node', '--check', str(js)], check=True, capture_output=True, text=True)
    check(True, 'sintaxe JavaScript válida')

    # Identidade técnica.
    readme = (ROOT / 'README.md').read_text(encoding='utf-8')
    changelog = (ROOT / 'docs/CHANGELOG.md').read_text(encoding='utf-8')
    check('V7.6.1' in readme and 'V7.6.1' in changelog, 'identidade V7.6.1 consistente')

    print('Resultado V7.6.1: 8/8 verificações aprovadas.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'FAIL | {exc}', file=sys.stderr)
        raise
