#!/usr/bin/env python3
"""Cria raid_history.json a partir de uma planilha simples Nome/Dano 1..4.

Sem dependências externas: lê o XLSX com zipfile + XML da biblioteca padrão.
A raid atual publicada pelo OCR sempre vence a coluna Dano 4 da planilha.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ALIASES = {
    "ramigam": "ramigan",
    "capettini": "capetine",
    "carlinhozz": "carlinhos",
}


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").strip().casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+", "", text)


def column_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value - 1


def read_first_sheet(path: Path) -> list[list[object]]:
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("main:si", NS):
                shared.append("".join(node.text or "" for node in item.iterfind(".//main:t", NS)))

        sheet_name = "xl/worksheets/sheet1.xml"
        root = ET.fromstring(archive.read(sheet_name))
        rows = []
        for row in root.findall(".//main:sheetData/main:row", NS):
            cells = {}
            for cell in row.findall("main:c", NS):
                ref = cell.attrib.get("r", "A1")
                idx = column_index(ref)
                cell_type = cell.attrib.get("t")
                value_node = cell.find("main:v", NS)
                inline = cell.find("main:is/main:t", NS)
                raw = inline.text if inline is not None else (value_node.text if value_node is not None else None)
                if raw is None:
                    value = None
                elif cell_type == "s":
                    value = shared[int(raw)]
                elif cell_type in {"str", "inlineStr"}:
                    value = raw
                else:
                    number = float(raw)
                    value = int(number) if number.is_integer() else number
                cells[idx] = value
            if cells:
                width = max(cells) + 1
                rows.append([cells.get(i) for i in range(width)])
        return rows


def attack_count(frequency):
    match = re.search(r"\d+", str(frequency or ""))
    return int(match.group(0)) if match else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--overrides", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    rows = read_first_sheet(args.xlsx)
    headers = rows[0]
    sheet_rows = [dict(zip(headers, row)) for row in rows[1:]]
    by_name = {normalize(row.get("Nome")): row for row in sheet_rows}
    current = json.loads(args.current.read_text(encoding="utf-8"))
    overrides = {"members": {}}
    if args.overrides and args.overrides.exists():
        overrides = json.loads(args.overrides.read_text(encoding="utf-8"))

    def match_row(current_name):
        key = normalize(current_name)
        return by_name.get(key) or by_name.get(ALIASES.get(key, ""))

    current_members = []
    for member in current.get("membros", []):
        current_members.append({
            "name": member["nome"],
            "damage": int(member.get("dano") or 0),
            "frequency": member.get("frequencia"),
            "attacks": attack_count(member.get("frequencia")) or 0,
            "status_participacao": member.get("status_participacao"),
            "source": "ocr",
        })

    raids = [{
        "id": "raid_" + re.sub(r"\D", "", current.get("resumo", {}).get("gerado_em", ""))[:8],
        "label": "Raid atual",
        "role": "current",
        "order": 0,
        "source": "ocr",
        "confidence": "oficial",
        "generatedAt": current.get("resumo", {}).get("gerado_em"),
        "maxAttacks": 21,
        "summary": {
            "totalDamage": int(current.get("resumo", {}).get("dano_total_guilda") or 0),
            "participants": int(current.get("resumo", {}).get("participantes") or 0),
            "absent": int(current.get("resumo", {}).get("ausentes") or 0),
            "registeredMembers": len(current_members),
        },
        "members": current_members,
    }]

    for column, raid_id, label, order in [
        ("Dano 3", "raid_seed_dano_3", "Raid anterior 1", 1),
        ("Dano 2", "raid_seed_dano_2", "Raid anterior 2", 2),
        ("Dano 1", "raid_seed_dano_1", "Raid anterior 3", 3),
    ]:
        members = []
        for current_member in current.get("membros", []):
            name = current_member["nome"]
            row = match_row(name)
            damage = row.get(column) if row else None
            if not damage:
                continue
            override = overrides.get("members", {}).get(name, {}).get(raid_id, {})
            attacks = override.get("attacks")
            members.append({
                "name": name,
                "damage": int(damage),
                "frequency": override.get("frequency"),
                "attacks": attacks,
                "status_participacao": "historico_sem_frequencia" if attacks is None else ("participou_bem" if attacks >= 15 else "baixa_participacao"),
                "source": "seed_planilha",
                "frequencySource": "manual" if attacks is not None else "unknown",
            })
        raids.append({
            "id": raid_id,
            "label": label,
            "role": "previous",
            "order": order,
            "source": "seed_planilha",
            "confidence": "estimada",
            "maxAttacks": 21,
            "summary": {
                "totalDamage": sum(item["damage"] for item in members),
                "participants": len(members),
                "absent": len(current_members) - len(members),
                "registeredMembers": len(current_members),
            },
            "members": members,
        })

    history = {
        "version": "7.2",
        "guild": "Avalon",
        "settings": {
            "maxStoredRaids": 4,
            "baselineSize": 3,
            "minBaselineRaids": 2,
            "minCurrentAttacksForHall": 15,
            "minBaselineAttacks": 15,
            "unknownFrequencyPolicy": "include_as_estimated",
            "knownLowFrequencyPolicy": "exclude_from_baseline",
        },
        "raids": raids,
    }
    args.output.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Histórico criado em {args.output}")


if __name__ == "__main__":
    main()
