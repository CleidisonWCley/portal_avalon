#!/usr/bin/env python3
"""Promove uma raid validada e rotaciona o histórico com escrita atômica."""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path


def normalize(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+", "", text)


def attacks(value):
    match = re.search(r"\d+", str(value or ""))
    return int(match.group()) if match else 0


def atomic_json_write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)


def raid_number_from_payload(payload: dict) -> int | None:
    value = payload.get("raid", {}).get("number")
    if value is None:
        value = payload.get("resumo", {}).get("raidNumber")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def enrich_legacy_current(payload: dict, raid_number: int) -> dict:
    payload = json.loads(json.dumps(payload, ensure_ascii=False))
    resumo = payload.setdefault("resumo", {})
    resumo.setdefault("raidNumber", raid_number)
    resumo.setdefault("source", "official")
    resumo.setdefault("generatedAt", resumo.get("gerado_em"))
    payload["raid"] = {
        "number": raid_number,
        "endedAt": resumo.get("endedAt"),
        "source": resumo.get("source", "official"),
        "generatedAt": resumo.get("generatedAt") or resumo.get("gerado_em"),
    }
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--new-current", required=True, type=Path)
    parser.add_argument("--history", required=True, type=Path)
    parser.add_argument("--published-current", required=True, type=Path)
    parser.add_argument("--published-previous", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument(
        "--legacy-current-number",
        type=int,
        help="Número da raid atual antiga quando o JSON legado ainda não possui raidNumber.",
    )
    args = parser.parse_args()

    new_json = json.loads(args.new_current.read_text(encoding="utf-8"))
    history = json.loads(args.history.read_text(encoding="utf-8"))
    old_published = json.loads(args.published_current.read_text(encoding="utf-8"))

    report = None
    if args.report:
        report = json.loads(args.report.read_text(encoding="utf-8"))
        if report.get("status") != "validada" or int(report.get("registrosPendentes") or 0) != 0:
            raise SystemExit("Promoção bloqueada: o relatório da raid ainda não está validado.")

    new_number = raid_number_from_payload(new_json)
    if not new_number:
        raise SystemExit("Promoção bloqueada: raidNumber ausente no novo JSON.")

    old_number = raid_number_from_payload(old_published)
    if old_number is None:
        old_number = args.legacy_current_number
    if old_number is None:
        raise SystemExit(
            "Promoção bloqueada: informe --legacy-current-number para identificar a raid atual legada."
        )
    if new_number <= old_number:
        raise SystemExit(
            f"Promoção bloqueada: Raid {new_number} não é superior à Raid atual {old_number}."
        )

    old_published = enrich_legacy_current(old_published, old_number)
    max_raids = int(history.get("settings", {}).get("maxStoredRaids", 4))
    roster = {normalize(member["nome"]): member["nome"] for member in new_json.get("membros", [])}

    resumo = new_json.get("resumo", {})
    generated = resumo.get("generatedAt") or resumo.get("gerado_em", "")
    ended_at = resumo.get("endedAt") or new_json.get("raid", {}).get("endedAt")
    source = resumo.get("source") or new_json.get("raid", {}).get("source") or "official"
    confidence = "oficial" if source == "official" else "estimada"
    raid_id = f"raid_{new_number}"

    new_members = [{
        "name": member["nome"],
        "damage": int(member.get("dano") or 0),
        "frequency": member.get("frequencia"),
        "attacks": attacks(member.get("frequencia")),
        "status_participacao": member.get("status_participacao"),
        "source": "ocr" if source == "official" else source,
    } for member in new_json.get("membros", [])]

    new_current = {
        "id": raid_id,
        "raidNumber": new_number,
        "label": f"Raid {new_number}",
        "role": "current",
        "order": 0,
        "source": "ocr" if source == "official" else source,
        "confidence": confidence,
        "generatedAt": generated,
        "endedAt": ended_at,
        "maxAttacks": 21,
        "summary": {
            "totalDamage": int(resumo.get("dano_total_guilda") or 0),
            "participants": int(resumo.get("participantes") or 0),
            "absent": int(resumo.get("ausentes") or 0),
            "registeredMembers": len(new_members),
        },
        "members": new_members,
    }

    old_raids = sorted(history.get("raids", []), key=lambda raid: int(raid.get("order", 99)))
    if old_raids and old_raids[0].get("role") == "current" and old_raids[0].get("raidNumber") is None:
        old_raids[0]["raidNumber"] = old_number
        old_raids[0]["id"] = f"raid_{old_number}"
        old_raids[0]["label"] = f"Raid {old_number}"
        old_raids[0]["confidence"] = "oficial"

    rotated = [new_current]
    estimated_index = 1
    for old in old_raids:
        old_num = old.get("raidNumber")
        old_id = f"raid_{old_num}" if old_num is not None else old.get("id")
        if old_id == raid_id:
            continue

        item = dict(old)
        item["id"] = old_id
        item["role"] = "previous"
        item["order"] = len(rotated)
        if old_num is not None:
            item["label"] = f"Raid {old_num}"
        elif item.get("confidence") == "estimada" or item.get("source") == "seed_planilha":
            item["label"] = f"Base estimada {estimated_index}"
            estimated_index += 1
        else:
            item["label"] = f"Raid anterior {item['order']}"

        filtered = []
        for member in item.get("members", []):
            key = normalize(member.get("name") or member.get("nome"))
            if key in roster:
                member_item = dict(member)
                member_item["name"] = roster[key]
                filtered.append(member_item)
        item["members"] = filtered
        rotated.append(item)
        if len(rotated) >= max_raids:
            break

    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    history["raids"] = rotated
    history["version"] = "7.8.2"
    history["generatedAt"] = now

    atomic_json_write(args.published_previous, old_published)
    atomic_json_write(args.history, history)
    atomic_json_write(args.published_current, new_json)

    if args.report and report is not None:
        report["promovida"] = True
        report["promovidaEm"] = now
        report["raidAnterior"] = old_number
        report["historicoArmazenado"] = len(rotated)
        atomic_json_write(args.report, report)

    previous_total = int(old_published.get("resumo", {}).get("dano_total_guilda") or 0)
    current_total = int(resumo.get("dano_total_guilda") or 0)
    variation = ((current_total - previous_total) / previous_total * 100) if previous_total else 0
    print(f"Raid {new_number} promovida; Raid {old_number} preservada como anterior.")
    print(f"Histórico atualizado: {len(rotated)} raids armazenadas.")
    print(f"Dano total: {previous_total} -> {current_total} ({variation:+.2f}%).")


if __name__ == "__main__":
    main()
