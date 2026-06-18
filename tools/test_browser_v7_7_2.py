#!/usr/bin/env python3
"""Testes visuais, DOM e motion da V7.7.2 sem depender de deploy."""
from __future__ import annotations

import json
import mimetypes
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
EVIDENCE = ROOT / "docs/evidencias/V7.7.2"
EVIDENCE.mkdir(parents=True, exist_ok=True)
WRITE_EVIDENCE = os.getenv("AVALON_WRITE_EVIDENCE") == "1"
CSS = (WEB / "assets/css/styles.css").read_text(encoding="utf-8")
UI_JS = (WEB / "assets/js/ui.js").read_text(encoding="utf-8")

PAGES = [
    "index.html",
    "pages/hall.html",
    "pages/oraculo.html",
    "pages/registro.html",
    "pages/raid.html",
    "pages/galeria.html",
    "pages/liga.html",
]

DATA_PATHS = [
    "data/raids/raid_atual.json",
    "data/raids/raid_anterior.json",
    "data/raids/raid_history.json",
    "data/raids/raid_manual_overrides.json",
    "data/insignias.json",
    "data/gallery/eventos.json",
]


def route_local_assets(route) -> None:
    url = route.request.url
    if not url.startswith("https://assets.local/"):
        route.abort()
        return
    relative = url.split("https://assets.local/", 1)[1].split("?", 1)[0]
    candidate = (WEB / relative).resolve()
    if candidate.is_file() and WEB.resolve() in candidate.parents:
        route.fulfill(
            status=200,
            body=candidate.read_bytes(),
            content_type=mimetypes.guess_type(str(candidate))[0] or "application/octet-stream",
        )
    else:
        route.fulfill(status=404, body="")


def base_inline_page(relative: str) -> str:
    html = (WEB / relative).read_text(encoding="utf-8")
    html = re.sub(r"<link[^>]*>", "", html)
    html = re.sub(r"<script[^>]*src=[\"'][^\"']+[\"'][^>]*></script>", "", html)
    base = "https://assets.local/" if relative == "index.html" else "https://assets.local/pages/"
    html = html.replace(
        "</head>",
        f'<base href="{base}"><style>{CSS}.material-symbols-outlined{{font-family:Arial}}</style></head>',
    )
    html = html.replace('class="avalon-page-loader is-visible"', 'class="avalon-page-loader" hidden')
    html = html.replace(' reveal"', ' reveal is-visible"')
    return html


def storage_patch() -> str:
    return """
<script>
const __v77Storage = {};
Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  getItem: key => Object.prototype.hasOwnProperty.call(__v77Storage, key) ? __v77Storage[key] : null,
  setItem: (key, value) => { __v77Storage[key] = String(value); },
  removeItem: key => { delete __v77Storage[key]; },
  clear: () => { Object.keys(__v77Storage).forEach(key => delete __v77Storage[key]); }
}});
</script>
"""


def registro_inline_page() -> str:
    html = base_inline_page("pages/registro.html")
    data = {key: json.loads((WEB / key).read_text(encoding="utf-8")) for key in DATA_PATHS}
    data_js = (WEB / "assets/js/data.js").read_text(encoding="utf-8")
    hall_rules = (WEB / "assets/js/hall-rules.js").read_text(encoding="utf-8")
    app_js = (WEB / "assets/js/app.js").read_text(encoding="utf-8")
    fetch_patch = rf"""
<script>
window.__AVALON_TEST_DATA__ = {json.dumps(data, ensure_ascii=False)};
window.fetch = async function(url) {{
  const key = String(url).replace(/^\.\.\//, '').replace(/^\.\//, '');
  const value = window.__AVALON_TEST_DATA__[key];
  return {{ ok: Boolean(value), status: value ? 200 : 404, json: async () => value }};
}};
</script>
"""
    scripts = f"{storage_patch()}<script>{data_js}</script>{fetch_patch}<script>{hall_rules}</script><script>{app_js}</script>"
    return html.replace("</body>", f"{scripts}</body>")


def raid_inline_page() -> str:
    html = base_inline_page("pages/raid.html")
    raid_js = (WEB / "assets/js/raid.js").read_text(encoding="utf-8")
    patch = """
<script>
window.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
</script>
"""
    export = "<script>window.__raidV772 = { raidState, renderResults };</script>"
    return html.replace("</body>", f"{storage_patch()}{patch}<script>{raid_js}</script>{export}</body>")


SAMPLE_TEAM = {
    "boss": "Goblin Chief",
    "element": "fire",
    "label": "Teste Mobile",
    "player": "Avalon",
    "dmg": 123.45,
    "feverDmg": 25.1,
    "season": "V7.7.2",
    "lastUpdate": "2026-06-15",
    "heroes": ["Hero A", "Hero B", "Hero C", "Hero D"],
    "heroesAtr": ["", "", "", ""],
    "weaponsAtr": ["", "", "", ""],
    "access": ["Mirror", "Mirror", "Mirror", "Mirror"],
    "cards": ["Skill Damage - Crit", "Atk - Def", "Crit - Atk", "HP - Def"],
    "chains": {"Padrão": {"1": "Hero A > Hero B", "2": "Hero C > Hero D"}},
    "infos": "Observação extensa para validar quebra de linha, legibilidade e largura segura no celular.",
    "video": "",
}


def motion_inline_page() -> str:
    safe_ui = UI_JS.replace("</script>", "<\\/script>")
    return f"""<!doctype html>
<html lang=\"pt-BR\">
<head><meta charset=\"utf-8\"><style>{CSS}</style></head>
<body>
  <div id=\"avalon-page-loader\" class=\"avalon-page-loader is-visible\" role=\"status\">
    <span class=\"avalon-page-loader__spinner\"></span>
    <span class=\"avalon-page-loader__text\">Carregando...</span>
  </div>
  <main class=\"page-shell\">
    <section id=\"motion-section\" class=\"section-block page-title-stage reveal\">
      <div class=\"page-hero-mascots salao-hero-mascots\">
        <div class=\"page-hero-mascot left cley\"><span> Cley </span></div>
        <div class=\"page-title-card\"><h1>Portal Avalon</h1></div>
        <div class=\"page-hero-mascot right olimpio\"><span> Olimpio </span></div>
      </div>
    </section>
  </main>
  <script>{safe_ui}</script>
</body>
</html>"""


def assert_no_global_overflow(page, label: str) -> None:
    values = page.evaluate("() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})")
    assert values["scroll"] <= values["client"] + 1, (label, values)


def assert_mascots(page, width: int, label: str) -> None:
    values = page.evaluate(
        """() => [...document.querySelectorAll('.page-hero-mascot')].map(el => {
          const style = getComputedStyle(el);
          const image = el.querySelector('img');
          const rect = image.getBoundingClientRect();
          return { display: style.display, width: rect.width, height: rect.height, left: rect.left, right: rect.right };
        })"""
    )
    assert len(values) == 2, (label, values)
    for mascot in values:
        assert mascot["display"] != "none", (label, mascot)
        assert mascot["width"] > 0 and mascot["height"] > 0, (label, mascot)
        assert mascot["left"] >= -1 and mascot["right"] <= width + 1, (label, mascot)


def run() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-gpu"],
        )

        # Motion global: loader não é prolongado e reveal só inicia após sua saída.
        for width, height in [(390, 844), (768, 1024), (1366, 768)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_content(motion_inline_page(), wait_until="domcontentloaded")
            page.wait_for_timeout(60)
            during = page.evaluate(
                """() => ({
                  loaderHidden: document.querySelector('#avalon-page-loader').hidden,
                  revealVisible: document.querySelector('#motion-section').classList.contains('is-visible'),
                  opacity: getComputedStyle(document.querySelector('#motion-section')).opacity
                })"""
            )
            assert not during["loaderHidden"], (width, during)
            assert not during["revealVisible"] and during["opacity"] == "0", (width, during)

            page.wait_for_timeout(520)
            after = page.evaluate(
                """() => {
                  const mascot = document.querySelector('.page-hero-mascot');
                  const section = document.querySelector('#motion-section');
                  const loader = document.querySelector('#avalon-page-loader');
                  const style = getComputedStyle(mascot);
                  return {
                    loaderHidden: loader.hidden,
                    revealVisible: section.classList.contains('is-visible'),
                    opacity: getComputedStyle(section).opacity,
                    animationName: style.animationName,
                    animationDuration: style.animationDuration,
                    playState: style.animationPlayState,
                    transform: style.transform
                  };
                }"""
            )
            assert after["loaderHidden"], (width, after)
            assert after["revealVisible"] and float(after["opacity"]) > 0, (width, after)
            assert after["animationName"] == "mascotFloat", (width, after)
            assert after["animationDuration"] == "4.8s", (width, after)
            assert after["playState"] == "running", (width, after)
            first_transform = after["transform"]
            page.wait_for_timeout(240)
            second_transform = page.locator('.page-hero-mascot').first.evaluate("el => getComputedStyle(el).transform")
            assert first_transform != second_transform, (width, first_transform, second_transform)
            page.close()

        # Acessibilidade: movimento reduzido não esconde conteúdo.
        reduced = browser.new_page(viewport={"width": 1366, "height": 768})
        reduced.emulate_media(reduced_motion="reduce")
        reduced.set_content(motion_inline_page(), wait_until="domcontentloaded")
        reduced.wait_for_timeout(480)
        reduced_metrics = reduced.evaluate(
            """() => ({
              animationName: getComputedStyle(document.querySelector('.page-hero-mascot')).animationName,
              opacity: getComputedStyle(document.querySelector('#motion-section')).opacity,
              loaderHidden: document.querySelector('#avalon-page-loader').hidden
            })"""
        )
        assert reduced_metrics["animationName"] == "none", reduced_metrics
        assert reduced_metrics["opacity"] == "1" and reduced_metrics["loaderHidden"], reduced_metrics
        reduced.close()

        # Identidade visual e overflow nas sete páginas.
        for width, height in [(320, 568), (390, 844), (720, 900), (768, 1024)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.route("https://assets.local/**", route_local_assets)
            for relative in PAGES:
                page.set_content(base_inline_page(relative), wait_until="domcontentloaded")
                page.wait_for_timeout(100)
                assert_mascots(page, width, f"{relative}@{width}")
                assert_no_global_overflow(page, f"{relative}@{width}")
            page.close()

        # Registro em cards nas larguras mobile prioritárias.
        for width, height in [(320, 568), (390, 844), (430, 932), (720, 900)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.route("https://assets.local/**", route_local_assets)
            page.set_content(registro_inline_page(), wait_until="domcontentloaded")
            page.wait_for_timeout(900)
            metrics = page.evaluate(
                """() => {
                  const table = document.querySelector('.battle-table');
                  const wrap = document.querySelector('.table-wrap');
                  const first = document.querySelector('.registro-member-card');
                  return {
                    rows: document.querySelectorAll('.registro-member-card').length,
                    labels: first ? [...first.querySelectorAll('td')].map(cell => cell.dataset.label) : [],
                    tableWidth: table.getBoundingClientRect().width,
                    wrapWidth: wrap.getBoundingClientRect().width,
                    wrapScroll: wrap.scrollWidth,
                    rowDisplay: first ? getComputedStyle(first).display : '',
                    rowWidth: first ? first.getBoundingClientRect().width : 0
                  };
                }"""
            )
            assert metrics["rows"] >= 1, (width, metrics)
            assert metrics["rowDisplay"] == "grid", (width, metrics)
            assert len(metrics["labels"]) == 10 and all(metrics["labels"]), (width, metrics)
            assert metrics["tableWidth"] <= metrics["wrapWidth"] + 1, (width, metrics)
            assert metrics["wrapScroll"] <= metrics["wrapWidth"] + 1, (width, metrics)
            assert metrics["rowWidth"] <= metrics["wrapWidth"] + 1, (width, metrics)
            assert_no_global_overflow(page, f"registro@{width}")
            if width == 390 and WRITE_EVIDENCE:
                page.screenshot(path=str(EVIDENCE / "registro_mobile_cards_390.png"), full_page=True)
            page.close()

        # Registro desktop preserva tabela e colunas sticky.
        desktop = browser.new_page(viewport={"width": 1366, "height": 768})
        desktop.route("https://assets.local/**", route_local_assets)
        desktop.set_content(registro_inline_page(), wait_until="domcontentloaded")
        desktop.wait_for_timeout(900)
        desktop_metrics = desktop.evaluate(
            """() => ({
              tableDisplay: getComputedStyle(document.querySelector('.battle-table')).display,
              headDisplay: getComputedStyle(document.querySelector('.battle-table thead')).display,
              rankPosition: getComputedStyle(document.querySelector('.sticky-rank')).position,
              tableWidth: document.querySelector('.battle-table').getBoundingClientRect().width
            })"""
        )
        assert desktop_metrics["tableDisplay"] == "table", desktop_metrics
        assert desktop_metrics["headDisplay"] == "table-header-group", desktop_metrics
        assert desktop_metrics["rankPosition"] == "sticky", desktop_metrics
        assert desktop_metrics["tableWidth"] >= 1100, desktop_metrics
        desktop.close()

        # Raid mobile: conteúdo visível, quatro heróis e largura segura.
        for width, height in [(320, 568), (390, 844), (430, 932), (720, 900)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.route("https://assets.local/**", route_local_assets)
            page.set_content(raid_inline_page(), wait_until="domcontentloaded")
            page.wait_for_timeout(220)
            initial = page.evaluate(
                """() => ({
                  titleOpacity: getComputedStyle(document.querySelector('.raid-page .page-title-stage')).opacity,
                  consultOpacity: getComputedStyle(document.querySelector('.raid-consult-panel').closest('.reveal')).opacity
                })"""
            )
            assert initial == {"titleOpacity": "1", "consultOpacity": "1"}, (width, initial)
            page.evaluate(
                """team => {
                  window.__raidV772.raidState.selectedBoss = 'goblin';
                  window.__raidV772.raidState.selectedElement = 'fire';
                  window.__raidV772.renderResults([team]);
                }""",
                SAMPLE_TEAM,
            )
            page.wait_for_timeout(180)
            metrics = page.evaluate(
                """() => {
                  const card = document.querySelector('.raid-team-card');
                  const heroes = [...document.querySelectorAll('.raid-hero-slot')];
                  const section = document.querySelector('#raid-results-section');
                  return {
                    heroes: heroes.length,
                    sectionHidden: section.classList.contains('hidden'),
                    sectionOpacity: getComputedStyle(section).opacity,
                    cardLeft: card.getBoundingClientRect().left,
                    cardRight: card.getBoundingClientRect().right,
                    heroWidths: heroes.map(hero => hero.getBoundingClientRect().width)
                  };
                }"""
            )
            assert metrics["heroes"] == 4, (width, metrics)
            assert not metrics["sectionHidden"] and metrics["sectionOpacity"] == "1", (width, metrics)
            assert metrics["cardLeft"] >= -1 and metrics["cardRight"] <= width + 1, (width, metrics)
            assert all(hero_width > 0 for hero_width in metrics["heroWidths"]), (width, metrics)
            assert_no_global_overflow(page, f"raid@{width}")
            if width == 390 and WRITE_EVIDENCE:
                page.screenshot(path=str(EVIDENCE / "raid_mobile_times_390.png"), full_page=True)
            page.close()

        # Raid desktop preserva quatro colunas.
        desktop = browser.new_page(viewport={"width": 1366, "height": 900})
        desktop.route("https://assets.local/**", route_local_assets)
        desktop.set_content(raid_inline_page(), wait_until="domcontentloaded")
        desktop.wait_for_timeout(220)
        desktop.evaluate(
            """team => {
              window.__raidV772.raidState.selectedBoss = 'goblin';
              window.__raidV772.raidState.selectedElement = 'fire';
              window.__raidV772.renderResults([team]);
            }""",
            SAMPLE_TEAM,
        )
        grid_columns = desktop.locator(".raid-heroes-grid").evaluate("el => getComputedStyle(el).gridTemplateColumns")
        assert len(grid_columns.split()) == 4, grid_columns
        desktop.close()

        browser.close()

    print("PASS | motion global sincronizado após o loader")
    print("PASS | mascotes visíveis e dentro da viewport nas sete páginas")
    print("PASS | Registro convertido em cards de 320 a 720 px")
    print("PASS | Registro desktop preservado com cabeçalho e sticky columns")
    print("PASS | Raid mobile visível e com quatro heróis sem corte")
    print("PASS | Raid desktop preservada em quatro colunas")
    print("Resultado visual V7.7.2: 6/6 grupos aprovados.")


if __name__ == "__main__":
    run()
