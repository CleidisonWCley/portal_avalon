#!/usr/bin/env python3
"""Valida estrutura, roster e regras do histórico rotativo."""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path


def normalize(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+", "", text)


def current_raid_number(current: dict) -> int | None:
    value = current.get("raid", {}).get("number")
    if value is None:
        value = current.get("resumo", {}).get("raidNumber")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--history", required=True, type=Path)
    parser.add_argument("--current", required=True, type=Path)
    args = parser.parse_args()

    history = json.loads(args.history.read_text(encoding="utf-8"))
    current = json.loads(args.current.read_text(encoding="utf-8"))
    errors, warnings = [], []
    raids = history.get("raids", [])
    max_raids = int(history.get("settings", {}).get("maxStoredRaids", 4))

    if not 2 <= len(raids) <= max_raids:
        errors.append("Quantidade de raids fora do intervalo esperado.")

    ids = [raid.get("id") for raid in raids]
    if len(ids) != len(set(ids)):
        errors.append("IDs de raid duplicados.")
    orders = [int(raid.get("order", -1)) for raid in raids]
    if orders != list(range(len(raids))):
        errors.append(f"Ordem do histórico inválida: {orders}")
    if raids and raids[0].get("role") != "current":
        errors.append("A primeira entrada do histórico não está marcada como atual.")

    payload_number = current_raid_number(current)
    history_number = raids[0].get("raidNumber") if raids else None
    if payload_number is None:
        errors.append("raid_atual.json não possui raidNumber.")
    elif history_number is None or int(history_number) != payload_number:
        errors.append("Número da raid atual diverge entre JSON publicado e histórico.")

    official_numbers = [int(raid["raidNumber"]) for raid in raids if raid.get("raidNumber") is not None]
    if official_numbers != sorted(official_numbers, reverse=True):
        errors.append(f"Raids oficiais fora da ordem decrescente: {official_numbers}")

    roster = {normalize(member["nome"]) for member in current.get("membros", [])}
    for raid in raids:
        seen = set()
        registered = int(raid.get("summary", {}).get("registeredMembers") or 0)
        listed = len(raid.get("members", []))
        if raid.get("confidence") == "oficial" and registered != listed:
            errors.append(f"Resumo de membros inconsistente em {raid.get('id')}.")
        elif registered < listed:
            errors.append(f"Resumo histórico menor que a lista de membros em {raid.get('id')}.")
        elif registered > listed:
            warnings.append(f"Base histórica omite {registered - listed} membro(s): {raid.get('id')}")
        for member in raid.get("members", []):
            name = member.get("name") or member.get("nome")
            key = normalize(name)
            if key in seen:
                errors.append(f"Membro duplicado em {raid.get('id')}: {name}")
            seen.add(key)
            if key not in roster:
                errors.append(f"Membro fora do roster atual em {raid.get('id')}: {name}")
            if int(member.get("damage") or member.get("dano") or 0) < 0:
                errors.append(f"Dano negativo em {raid.get('id')}: {name}")
            attacks = member.get("attacks")
            if attacks is not None and not 0 <= int(attacks) <= int(raid.get("maxAttacks", 21)):
                errors.append(f"Frequência inválida em {raid.get('id')}: {name}")
            if attacks is None and raid.get("role") == "previous":
                warnings.append(f"Base estimada: {raid.get('id')} / {name}")
            if (
                raid.get("role") == "previous"
                and attacks is not None
                and int(attacks) < int(history.get("settings", {}).get("minBaselineAttacks", 15))
            ):
                warnings.append(
                    f"Excluído da média por frequência: {raid.get('id')} / {name} ({attacks}/21)"
                )

    print(f"Raids: {len(raids)} | erros: {len(errors)} | avisos: {len(warnings)}")
    for item in errors:
        print("ERRO:", item)
    for item in warnings[:20]:
        print("AVISO:", item)
    if len(warnings) > 20:
        print(f"... e mais {len(warnings)-20} avisos de base estimada.")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
