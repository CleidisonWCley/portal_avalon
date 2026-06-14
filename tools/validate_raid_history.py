#!/usr/bin/env python3
"""Valida estrutura, roster e regras básicas do histórico rotativo."""
from __future__ import annotations
import argparse, json, re, sys, unicodedata
from pathlib import Path


def normalize(value):
    text = unicodedata.normalize('NFKD', str(value or '').strip().casefold())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+', '', text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--history', required=True, type=Path)
    parser.add_argument('--current', required=True, type=Path)
    args = parser.parse_args()
    history = json.loads(args.history.read_text(encoding='utf-8'))
    current = json.loads(args.current.read_text(encoding='utf-8'))
    errors, warnings = [], []
    raids = history.get('raids', [])
    if not 2 <= len(raids) <= int(history.get('settings', {}).get('maxStoredRaids', 4)):
        errors.append('Quantidade de raids fora do intervalo esperado.')
    ids = [raid.get('id') for raid in raids]
    if len(ids) != len(set(ids)):
        errors.append('IDs de raid duplicados.')
    roster = {normalize(member['nome']) for member in current.get('membros', [])}
    for raid in raids:
        seen = set()
        for member in raid.get('members', []):
            name = member.get('name') or member.get('nome')
            key = normalize(name)
            if key in seen:
                errors.append(f"Membro duplicado em {raid.get('id')}: {name}")
            seen.add(key)
            if key not in roster:
                errors.append(f"Membro fora do roster atual em {raid.get('id')}: {name}")
            if int(member.get('damage') or member.get('dano') or 0) < 0:
                errors.append(f"Dano negativo em {raid.get('id')}: {name}")
            attacks = member.get('attacks')
            if attacks is not None and not 0 <= int(attacks) <= int(raid.get('maxAttacks', 21)):
                errors.append(f"Frequência inválida em {raid.get('id')}: {name}")
            if attacks is None and raid.get('role') == 'previous':
                warnings.append(f"Base estimada: {raid.get('id')} / {name}")
            if raid.get('role') == 'previous' and attacks is not None and int(attacks) < int(history.get('settings', {}).get('minBaselineAttacks', 15)):
                warnings.append(f"Excluído da média por frequência: {raid.get('id')} / {name} ({attacks}/21)")
    print(f"Raids: {len(raids)} | erros: {len(errors)} | avisos: {len(warnings)}")
    for item in errors:
        print('ERRO:', item)
    for item in warnings[:20]:
        print('AVISO:', item)
    if len(warnings) > 20:
        print(f"... e mais {len(warnings)-20} avisos de base estimada.")
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
