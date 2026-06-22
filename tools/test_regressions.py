#!/usr/bin/env python3
"""Regressões estruturais, de dados e de funcionalidades do Portal Avalon.

Este arquivo consolida os antigos testes nomeados por versão e as verificações
estruturais do projeto. Novas regressões devem ser adicionadas ao bloco temático
correspondente, sem criar um novo arquivo por release.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
DOCS = ROOT / "docs"
OCR_ROOT = ROOT / "ocr" / "guild-rank-ocr"

EXTERNAL_PREFIXES = ("http://", "https://", "#", "mailto:", "tel:", "data:", "javascript:")
PAGES = [WEB / "index.html", *sorted((WEB / "pages").glob("*.html"))]
EXPECTED_DOCS = {
    "README.md",
    "ARQUITETURA.md",
    "REGRAS_E_DADOS.md",
    "LIGA_FIREBASE.md",
    "MANUTENCAO_E_DEPLOY.md",
    "TESTES.md",
    "CHANGELOG.md",
}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []
        self.critical_images: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        for key in ("src", "href"):
            value = values.get(key)
            if value and not value.startswith(EXTERNAL_PREFIXES):
                self.references.append(value)
        if tag == "img" and "data-avalon-critical-image" in values:
            src = values.get("src")
            if src:
                self.critical_images.append(src)


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    print(f"OK: {message}")


def section(title: str) -> None:
    print(f"\n--- {title} ---")


def inferred_raid_number(raid: dict, latest: int) -> int:
    direct = raid.get("raidNumber")
    if isinstance(direct, int) and direct > 0:
        return direct
    match = re.search(r"raid[_\s-]*(\d+)", f"{raid.get('id', '')} {raid.get('label', '')}", re.I)
    if match:
        return int(match.group(1))
    return latest - int(raid.get("order", 0))


def resolve_reference(owner: Path, reference: str) -> Path:
    clean = reference.split("#", 1)[0].split("?", 1)[0]
    return (owner.parent / clean).resolve()


def test_ocr_and_history() -> None:
    section("OCR, Raid 133 e histórico oficial")

    sys.path.insert(0, str(OCR_ROOT))
    from src.main import linhas_da_pagina  # noqa: E402
    from src.utils.name_matcher import corrigir_nome  # noqa: E402
    from src.utils.review import correcoes_da_raid  # noqa: E402

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

    revised_names = {item["nome"] for item in revised_rows}
    check(len(raw_rows) == 28, "CSV bruto preserva 28 linhas do OCR")
    check(len(revised_rows) == 28, "CSV revisado contém os 28 membros")
    check(any(row["nome"] not in revised_names for row in raw_rows), "CSV bruto difere do resultado revisado")

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

    current = load_json(WEB / "data/raids/raid_atual.json")
    previous = load_json(WEB / "data/raids/raid_anterior.json")
    history = load_json(WEB / "data/raids/raid_history.json")
    check(current["raid"]["number"] == 133, "raid_atual publica a Raid 133")
    check(previous["raid"]["number"] == 132, "raid_anterior preserva a Raid 132")
    check(history["raids"][0]["raidNumber"] == 133, "histórico inicia pela Raid 133")
    check(history["raids"][1]["raidNumber"] == 132, "histórico mantém a Raid 132 como segunda fonte oficial")
    check(len(history["raids"]) == 4, "histórico respeita o limite de quatro raids")


def test_raid_cleanup() -> None:
    section("Raid estratégica sem dashboard legado")
    raid_html = read("web/pages/raid.html")
    legacy_script = WEB / "assets/js/raid-evolution.js"
    styles = read("web/assets/css/styles.css")
    check('id="raid-guild-evolution"' not in raid_html, "página Raid não contém dashboard coletivo")
    check("raid-evolution.js" not in raid_html, "página Raid não carrega o script legado")
    check(not legacy_script.exists(), "script legado da evolução na Raid foi removido")
    check(".raid-evolution-" not in styles, "CSS legado da evolução na Raid foi removido")


def test_registro_evolution() -> None:
    section("Registro, evolução individual e coletiva")
    registro_html = read("web/pages/registro.html")
    app_js = read("web/assets/js/app.js")
    evolution_js = read("web/assets/js/registro-evolution.js")
    css = read("web/assets/css/styles.css")
    readme = read("README.md")

    check('id="registro-guild-evolution"' in registro_html, "Registro possui a seção coletiva após a tabela")
    check('id="registro-guild-order"' in registro_html, "tabela coletiva possui controle de ordenação")
    check('value="desc"' in registro_html and 'value="asc"' in registro_html, "controle oferece ordem recente e antiga")
    check('../assets/js/registro-evolution.js' in registro_html, "módulo do Registro está carregado")
    check(len(re.findall(r"<th(?:\s|>)", registro_html)) == 15, "nove colunas dos membros e seis da guilda estão preservadas")

    check("function getRegistroSnapshot()" in app_js, "app.js publica snapshot único para o Registro")
    check("avalon:registro-ready" in app_js, "app.js sinaliza dados prontos sem novo carregamento")
    check("data-registro-evolution" in app_js, "cada membro recebe ação de evolução")
    check("fetch(" not in evolution_js, "módulo do Registro não realiza segundo fetch")
    check("localState.order = event.target.value === 'asc'" in evolution_js, "ordenação coletiva alterna entre crescente e decrescente")
    check("openMemberModal" in evolution_js and "closeModal" in evolution_js, "evolução individual usa modal único reutilizável")
    check("individualChartMarkup" in evolution_js and "guildChartMarkup" in evolution_js, "gráficos individual e coletivo são SVG locais")
    check("currentHallRank" not in app_js and "Posição atual" not in evolution_js, "snapshot e modal não misturam Hall com tendência individual")

    history = load_json(WEB / "data/raids/raid_history.json")
    raids = sorted(history.get("raids", []), key=lambda item: int(item.get("order", 0)))
    check(len(raids) == 4, "histórico mantém quatro raids para comparação")
    latest = inferred_raid_number(raids[0], 133)
    numbers = [inferred_raid_number(raid, latest) for raid in raids]
    check(numbers == [133, 132, 131, 130], "interface pode identificar Raids 133 a 130")
    check([raid.get("confidence") for raid in raids] == ["oficial", "oficial", "estimada", "estimada"], "fontes oficiais e estimadas permanecem distinguíveis")
    check(all(int(raid.get("summary", {}).get("totalDamage", 0)) > 0 for raid in raids), "as quatro raids possuem dano coletivo utilizável")
    check(all(int(raid.get("summary", {}).get("participants", 0)) > 0 for raid in raids), "as quatro raids possuem participantes para média coletiva")

    check(".registro-evolution-modal" in css, "evolução individual possui modal flutuante")
    check(".registro-guild-table" in css, "tabela coletiva possui estilos responsivos")
    check("@media (max-width: 720px)" in css, "mobile reutiliza breakpoint consolidado")
    check("V7.9.0.2" in readme, "README identifica a versão funcional atual")


def test_registro_modal_and_performance() -> None:
    section("Modal, desempenho e responsividade estrutural")
    registro = read("web/pages/registro.html")
    app_js = read("web/assets/js/app.js")
    evolution_js = read("web/assets/js/registro-evolution.js")
    css = read("web/assets/css/styles.css")
    changelog = read("docs/CHANGELOG.md")

    check('id="registro-evolution-modal"' in registro, "Registro possui um único modal de evolução")
    check('role="dialog"' in registro and 'aria-modal="true"' in registro, "modal declara semântica bloqueante")
    check('data-registro-evolution-close' in registro, "modal possui botão X obrigatório")
    check('aria-controls="registro-evolution-modal"' in app_js, "ações individuais apontam para o modal compartilhado")
    check('aria-haspopup="dialog"' in app_js, "ações anunciam abertura de diálogo")

    check("row.after" not in evolution_js, "evolução não injeta linha dentro da tabela")
    check("scrollIntoView" not in evolution_js, "abertura não força rolagem da página")
    check("registro-evolution-detail-row" not in evolution_js, "JavaScript não mantém painel expansível legado")
    check("buildEvolutionChart" in evolution_js, "gráficos individual e coletivo compartilham um motor")
    check(evolution_js.count("window.addEventListener('resize'") == 1, "redimensionamento usa apenas um listener global")
    check("panelCache" in evolution_js, "conteúdo individual possui cache por viewport")
    check("setBackgroundInert" in evolution_js, "conteúdo de fundo é tornado inerte")
    check("trapFocus" in evolution_js, "foco permanece preso ao modal")
    check("body.classList.add('modal-open')" in evolution_js, "rolagem externa é bloqueada")
    check("event.target.closest(selectors.close)" in evolution_js, "botão X fecha o modal")
    check("registro-evolution-modal-backdrop" not in evolution_js, "clique no fundo não fecha o modal acidentalmente")
    check("fetch(" not in evolution_js, "refinamento continua sem segundo fetch")

    check(".registro-evolution-detail-row" not in css, "CSS legado da linha expansível foi removido")
    check(".registro-evolution-chart-scroll" not in css, "wrapper com rolagem horizontal foi removido")
    check("min-width: 610px" not in css, "gráfico não possui largura mínima fixa")
    check("min-width: 760px" not in css, "tabela coletiva não possui largura mínima fixa")
    start = css.index("PORTAL AVALON — REGISTRO V7.8.3.2")
    end = css.index("@media (min-width: 1181px)")
    check("overflow-x: auto" not in css[start:end], "bloco refinado não cria scroll horizontal")
    check("table-layout: fixed" in css, "tabelas utilizam distribuição fixa e compacta")
    check("position: sticky" in css and ".registro-evolution-dialog-head" in css, "cabeçalho e X permanecem acessíveis no modal")
    check("V7.8.3.1" in changelog, "changelog preserva o refinamento do modal")


def test_registro_special_cases() -> None:
    section("Casos especiais e alinhamento do Registro")
    registro = read("web/pages/registro.html")
    evolution = read("web/assets/js/registro-evolution.js")
    css = read("web/assets/css/styles.css")
    changelog = read("docs/CHANGELOG.md")

    check('class="registro-column-layout"' in registro, "tabela usa colgroup compartilhado")
    for class_name in (
        "registro-col-rank", "registro-col-member", "registro-col-damage",
        "registro-col-frequency", "registro-col-average", "registro-col-evolution",
        "registro-col-hall", "registro-col-patent", "registro-col-participation",
    ):
        check(class_name in registro, f"coluna declarada: {class_name}")

    check("continuousSegments" in evolution, "gráfico separa sequências por ausência de dados")
    check("activeSegment = []" in evolution, "ausência encerra o segmento visual")
    check(".filter(segment => segment.length > 1)" in evolution, "pontos isolados não viram linhas artificiais")
    check("Sem raid oficial anterior" in evolution, "retorno à batalha possui explicação direta")
    check("Dados oficiais insuficientes" in evolution, "sem comparativo possui explicação própria")
    check("trend.note" in evolution, "card de tendência usa nota contextual")

    check("PORTAL AVALON — REGISTRO V7.8.3.3" in css, "CSS identifica o refinamento de casos especiais")
    check("grid-auto-rows: 1fr" in css, "cards históricos acompanham a maior altura da linha")
    check("overflow-wrap: break-word" in css, "textos excepcionais quebram somente entre palavras")
    check("hyphens: auto" in css, "cards permitem ajuste tipográfico seguro")
    check("border-right: 1px solid rgba(216, 222, 233, 0.075)" in css, "tabela possui divisórias verticais discretas")
    check(".registro-column-layout .registro-col-member" in css, "larguras são controladas pelo colgroup")
    check(".registro-column-layout { display: none; }" in css, "colgroup não interfere nos cards mobile")
    check("V7.8.3.3" in changelog, "changelog preserva o ajuste de casos especiais")


def test_project_structure() -> None:
    section("Estrutura, referências, assets e higiene")

    json_files = sorted(WEB.rglob("*.json"))
    check(bool(json_files), "projeto contém JSONs publicados")
    for file in json_files:
        json.loads(file.read_text(encoding="utf-8"))
    print(f"PASS | {len(json_files)} JSONs válidos")

    missing: list[str] = []
    for html in PAGES:
        parser = ReferenceParser()
        parser.feed(html.read_text(encoding="utf-8"))
        for reference in parser.references:
            if not resolve_reference(html, reference).exists():
                missing.append(f"{html.relative_to(ROOT)} -> {reference}")
    check(not missing, "referências locais das páginas estão válidas" if not missing else "referências HTML ausentes:\n" + "\n".join(missing))

    markdown_files = [ROOT / "README.md", *sorted(DOCS.glob("*.md")), ROOT / "tools/README.md"]
    missing_links: list[str] = []
    pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for markdown in markdown_files:
        text = markdown.read_text(encoding="utf-8")
        for target in pattern.findall(text):
            if target.startswith(EXTERNAL_PREFIXES):
                continue
            clean = target.split("#", 1)[0]
            if clean and not (markdown.parent / clean).resolve().exists():
                missing_links.append(f"{markdown.relative_to(ROOT)} -> {target}")
    check(not missing_links, "links Markdown estão válidos" if not missing_links else "links Markdown ausentes:\n" + "\n".join(missing_links))

    files = {item.name for item in DOCS.iterdir() if item.is_file()}
    directories = [item.name for item in DOCS.iterdir() if item.is_dir()]
    check(files == EXPECTED_DOCS, "documentação permanece consolidada em sete arquivos")
    check(not directories, "docs não possui subpastas redundantes")

    limits = {
        "index.html": 180 * 1024,
        "pages/hall.html": 130 * 1024,
        "pages/oraculo.html": 130 * 1024,
        "pages/registro.html": 130 * 1024,
        "pages/raid.html": 130 * 1024,
        "pages/galeria.html": 150 * 1024,
        "pages/liga.html": 150 * 1024,
    }
    totals: dict[str, int] = {}
    for html in PAGES:
        parser = ReferenceParser()
        parser.feed(html.read_text(encoding="utf-8"))
        total = 0
        for reference in parser.critical_images:
            target = resolve_reference(html, reference)
            check(target.exists(), f"imagem crítica existe: {html.relative_to(ROOT)} -> {reference}")
            total += target.stat().st_size
        relative = html.relative_to(WEB).as_posix()
        totals[relative] = total
        check(total <= limits[relative], f"orçamento de imagem respeitado em {relative}")
    print("PASS | orçamento de imagens críticas: " + ", ".join(
        f"{name}={size / 1024:.1f}KiB" for name, size in totals.items()
    ))

    source = "\n".join(file.read_text(encoding="utf-8", errors="ignore") for file in PAGES)
    for old_pattern in (
        "assets/img/brand/avalon-logo.png",
        "assets/img/brand/avalon-logo-small.png",
        "assets/img/mascots/cley.png",
        "assets/img/mascots/olimpio.png",
        "assets/img/insignias/thumbs/guardiao.png",
    ):
        check(old_pattern not in source, f"referência antiga ausente: {old_pattern}")
    registry = load_json(WEB / "data/guardians_registry.json")
    registry_members = registry.get("members", [])
    registry_names = {item.get("name") for item in registry_members}
    check({"MJ馬McQueen", "tang"}.issubset(registry_names), "pré-cadastro dos novos guardiões existe")
    check(not any("code" in item for item in registry_members), "cadastro web não mantém código do jogo")
    check(registry.get("policy", {}).get("hideWithoutValidRaid") is True, "pré-cadastros sem raid válida permanecem ocultos")

    check((WEB / "assets/img/brand/display/avalon-logo.webp").exists(), "logo WebP publicada existe")
    check((WEB / "assets/img/mascots/display/cley.webp").exists(), "mascote WebP publicado existe")
    check((WEB / "assets/img/mascots/display/ramigam.webp").exists(), "Ramigam WebP publicado existe")
    check((WEB / "assets/img/mascots/display/ramigam-salao.webp").exists(), "Ramigam do Salão em WebP existe")
    check((WEB / "assets/img/mascots/display/ramigam-hall.webp").exists(), "Ramigam do Hall em WebP existe")
    check((WEB / "assets/img/mascots/display/ramigam.webp").stat().st_size <= 80 * 1024, "Ramigam WebP respeita orçamento leve")
    check((WEB / "assets/img/insignias/ranks/display/guardiao.webp").exists(), "insígnia WebP publicada existe")

    public_source = read("web/index.html") + read("web/assets/js/app.js")
    check("Ramigam.png" not in public_source, "telas públicas não referenciam PNG pesado do Ramigam")
    check("assets/img/mascots/display/ramigam-salao.webp" in public_source, "Salão referencia Ramigam em WebP")
    check("assets/img/mascots/display/ramigam-hall.webp" in public_source, "Hall referencia Ramigam em WebP")
    check("ramigam-salao-section" not in public_source, "Salão não mantém card separado do Ramigam")
    check("salao-purpose-ramigam" in public_source, "Ramigam fica integrado ao propósito do Salão")
    check("Ramigam confia" not in public_source, "Hall não cita Ramigam diretamente no texto")
    check("fase de queda" in public_source, "Hall acolhe também defensores em queda")
    check("registryCode" not in public_source, "web não usa código do jogo no ciclo dos guardiões")

    forbidden = [ROOT / "docs/evidencias", ROOT / "node_modules", ROOT / ".venv", ROOT / "__pycache__"]
    present = [str(path.relative_to(ROOT)) for path in forbidden if path.exists()]
    check(not present, "repositório não contém evidências, caches ou pacotes locais")
    check(not list(ROOT.glob("*.zip")), "raiz do repositório não contém ZIPs")


def test_suite_consolidation() -> None:
    section("Consolidação da suíte")
    expected_tests = {"test_core.js", "test_regressions.py", "test_browser.py"}
    actual_tests = {path.name for path in (ROOT / "tools").glob("test_*") if path.is_file()}
    check(actual_tests == expected_tests, "tools mantém apenas três arquivos principais de teste")
    check("test_v7_8_" not in read("tools/run_tests.py"), "runner não depende de nomes de versão")
    tests_doc = read("docs/TESTES.md")
    check("test_regressions.py" in tests_doc, "documentação aponta para o teste consolidado")
    check("test_v7_8_2.py" not in tests_doc, "documentação não lista testes antigos por versão")


def main() -> None:
    test_ocr_and_history()
    test_raid_cleanup()
    test_registro_evolution()
    test_registro_modal_and_performance()
    test_registro_special_cases()
    test_project_structure()
    test_suite_consolidation()
    print("\nResultado consolidado: todas as regressões estruturais e de dados foram aprovadas.")


if __name__ == "__main__":
    main()
