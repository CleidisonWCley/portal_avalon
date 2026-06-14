#!/usr/bin/env python3
"""Promove um novo JSON OCR para raid atual e rotaciona até 4 raids."""
from __future__ import annotations
import argparse, json, re, unicodedata
from pathlib import Path


def normalize(value):
    text = unicodedata.normalize('NFKD', str(value or '').strip().casefold())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+', '', text)


def attacks(value):
    match = re.search(r'\d+', str(value or ''))
    return int(match.group()) if match else 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--new-current', required=True, type=Path)
    parser.add_argument('--history', required=True, type=Path)
    parser.add_argument('--published-current', type=Path)
    args = parser.parse_args()

    new_json = json.loads(args.new_current.read_text(encoding='utf-8'))
    history = json.loads(args.history.read_text(encoding='utf-8'))
    max_raids = int(history.get('settings', {}).get('maxStoredRaids', 4))
    roster = {normalize(member['nome']): member['nome'] for member in new_json.get('membros', [])}

    generated = new_json.get('resumo', {}).get('gerado_em', '')
    raid_id = 'raid_' + re.sub(r'\D', '', generated)[:8]
    new_members = [{
        'name': member['nome'],
        'damage': int(member.get('dano') or 0),
        'frequency': member.get('frequencia'),
        'attacks': attacks(member.get('frequencia')),
        'status_participacao': member.get('status_participacao'),
        'source': 'ocr',
    } for member in new_json.get('membros', [])]

    new_current = {
        'id': raid_id,
        'label': 'Raid atual',
        'role': 'current',
        'order': 0,
        'source': 'ocr',
        'confidence': 'oficial',
        'generatedAt': generated,
        'maxAttacks': 21,
        'summary': {
            'totalDamage': int(new_json.get('resumo', {}).get('dano_total_guilda') or 0),
            'participants': int(new_json.get('resumo', {}).get('participantes') or 0),
            'absent': int(new_json.get('resumo', {}).get('ausentes') or 0),
            'registeredMembers': len(new_members),
        },
        'members': new_members,
    }

    old_raids = sorted(history.get('raids', []), key=lambda raid: int(raid.get('order', 99)))
    rotated = [new_current]
    for old in old_raids:
        if old.get('id') == raid_id:
            continue
        old = dict(old)
        old['role'] = 'previous'
        old['order'] = len(rotated)
        old['label'] = f"Raid anterior {old['order']}"
        filtered = []
        for member in old.get('members', []):
            key = normalize(member.get('name') or member.get('nome'))
            if key in roster:
                item = dict(member)
                item['name'] = roster[key]
                filtered.append(item)
        old['members'] = filtered
        rotated.append(old)
        if len(rotated) >= max_raids:
            break

    history['raids'] = rotated
    # Preserve the existing history schema version; portal release and schema are independent.
    history['version'] = history.get('version') or '7.6.1'
    args.history.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.published_current:
        args.published_current.write_text(json.dumps(new_json, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Histórico atualizado: {len(rotated)} raids armazenadas.")


if __name__ == '__main__':
    main()
