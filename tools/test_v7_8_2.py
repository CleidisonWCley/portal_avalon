#!/usr/bin/env python3
"""Regressões específicas da V7.8.2."""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OCR_ROOT = ROOT / "ocr" / "guild-rank-ocr"
sys.path.insert(0, str(OCR_ROOT))

from src.main import linhas_da_pagina  # noqa: E402
from src.utils.name_matcher import corrigir_nome  # noqa: E402
from src.utils.review import correcoes_da_raid  # noqa: E402


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    print("OK:", message)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    output = OCR_ROOT / "output"
    raw_csv = output / "csv" / "raid_133_bruto.csv"
    revised_csv = output / "csv" / "raid_133_revisado.csv"
    raid_json = output / "json" / "raid_133.json"
    report_json = output / "json" / "raid_133_relatorio.json"

    for path in (raw_csv, revised_csv, raid_json, report_json):
        check(path.exists(), f"artefato identificado existe: {path.name}")

    with raw_csv.open(encoding="utf-8-sig", newline="") as file:
        raw_rows = list(csv.DictReader(file))
    with revised_csv.open(encoding="utf-8-sig", newline="") as file:
        revised_rows = list(csv.DictReader(file))
    check(len(raw_rows) == 28, "CSV bruto preserva 28 linhas do OCR")
    check(len(revised_rows) == 28, "CSV revisado contém os 28 membros")
    check(any(row["nome"] not in {item["nome"] for item in revised_rows} for row in raw_rows), "CSV bruto difere do resultado revisado")

    raid = load_json(raid_json)
    report = load_json(report_json)
    check(raid["raid"]["number"] == 133, "JSON oficial identifica a Raid 133")
    check(raid["raid"]["endedAt"] == "2026-06-17", "JSON oficial registra a data de encerramento")
    check(raid["resumo"]["dano_total_guilda"] == 116390205306, "dano total da Raid 133 está correto")
    check(raid["resumo"]["participantes"] == 28 and raid["resumo"]["ausentes"] == 0, "participação oficial está correta")
    check(raid["resumo"]["registros_revisar"] == 0, "não existem registros pendentes")
    check(report["status"] == "validada" and report["promovida"] is True, "relatório registra validação e promoção")
    check(report["registrosCorrigidos"] == 12, "relatório audita somente as 12 correções necessárias")

    check(len(correcoes_da_raid(133)) == 12, "Raid 133 carrega seu próprio conjunto de correções")
    check(correcoes_da_raid(134) == {}, "Raid 134 não herda correções da Raid 133")
    check(corrigir_nome("wa")[0] == "Lux", "alias curto exato continua suportado")
    check(corrigir_nome("Wagnero")[0] == "Wagnero", "nome longo não é contaminado por alias curto")
    check(corrigir_nome("Waonero mm")[0] != "Lux", "ruído longo não é convertido para Lux")
    check(linhas_da_pagina(5) == 2, "quinta imagem processa somente as posições 29 e 30")

    current = load_json(ROOT / "web" / "data" / "raids" / "raid_atual.json")
    previous = load_json(ROOT / "web" / "data" / "raids" / "raid_anterior.json")
    history = load_json(ROOT / "web" / "data" / "raids" / "raid_history.json")
    check(current["raid"]["number"] == 133, "raid_atual publica a Raid 133")
    check(previous["raid"]["number"] == 132, "raid_anterior preserva a Raid 132")
    check(history["raids"][0]["raidNumber"] == 133, "histórico inicia pela Raid 133")
    check(history["raids"][1]["raidNumber"] == 132, "histórico mantém a Raid 132 como segunda fonte oficial")
    check(len(history["raids"]) == 4, "histórico respeita o limite de quatro raids")

    raid_html = (ROOT / "web" / "pages" / "raid.html").read_text(encoding="utf-8")
    evolution_js = (ROOT / "web" / "assets" / "js" / "raid-evolution.js").read_text(encoding="utf-8")
    styles = (ROOT / "web" / "assets" / "css" / "styles.css").read_text(encoding="utf-8")
    check('id="raid-guild-evolution"' in raid_html, "página Raid possui a seção Evolução da Guilda")
    check('raid-evolution.js' in raid_html, "script da evolução está carregado")
    check("raid_history.json" in evolution_js, "comparação usa o histórico oficial")
    check("raid-evolution-metrics" in styles, "estilos responsivos da comparação foram adicionados")

    print("V7.8.2: todas as regressões específicas foram aprovadas.")


if __name__ == "__main__":
    main()
