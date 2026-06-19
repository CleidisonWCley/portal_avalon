#!/usr/bin/env python3
"""Regressão real de navegador para carregamento, responsividade e controles globais."""
from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
PAGES = [
    "index.html",
    "pages/hall.html",
    "pages/oraculo.html",
    "pages/registro.html",
    "pages/raid.html",
    "pages/galeria.html",
    "pages/liga.html",
]
VIEWPORTS = [
    {"width": 390, "height": 844},
    {"width": 768, "height": 1024},
    {"width": 1366, "height": 900},
]
REGISTRO_VIEWPORTS = [
    {"width": 320, "height": 760},
    {"width": 360, "height": 800},
    {"width": 390, "height": 844},
    {"width": 430, "height": 932},
    {"width": 768, "height": 1024},
    {"width": 980, "height": 900},
    {"width": 981, "height": 900},
    {"width": 1024, "height": 900},
    {"width": 1180, "height": 900},
    {"width": 1366, "height": 900},
    {"width": 1440, "height": 900},
]


def browser_launch_options() -> dict:
    executable = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    options = {"headless": True, "args": ["--no-sandbox", "--disable-gpu"]}
    if executable:
        options["executable_path"] = executable
    return options


def page_html(relative: str) -> str:
    html = (WEB / relative).read_text(encoding="utf-8")
    base = "https://assets.local/" if relative == "index.html" else "https://assets.local/pages/"
    storage = """
<script>
const __storage = {};
Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  get length() { return Object.keys(__storage).length; },
  key: index => Object.keys(__storage)[index] ?? null,
  getItem: key => Object.prototype.hasOwnProperty.call(__storage, key) ? __storage[key] : null,
  setItem: (key, value) => { __storage[key] = String(value); },
  removeItem: key => { delete __storage[key]; },
  clear: () => { Object.keys(__storage).forEach(key => delete __storage[key]); }
}});
</script>
"""
    return html.replace("<head>", f'<head><base href="{base}">{storage}', 1)


def route_assets(route) -> None:
    url = route.request.url
    if url.startswith("https://assets.local/"):
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
        return

    if url.startswith("https://avalon-raid-api.cleidisonlima20.workers.dev"):
        route.fulfill(status=200, body='{"list":[]}', content_type="application/json")
        return

    # Fontes e Firebase externos não são necessários para a regressão local.
    route.abort()


def assert_no_overflow(page, label: str) -> None:
    size = page.evaluate("() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})")
    assert size["scroll"] <= size["client"] + 2, (label, size)


def assert_critical_images(page, label: str) -> None:
    images = page.evaluate("""
      () => [...document.querySelectorAll('img[data-avalon-critical-image]')]
        .map(img => ({ complete: img.complete, width: img.naturalWidth, src: img.getAttribute('src') }))
    """)
    assert images, f"{label}: nenhuma imagem crítica encontrada"
    assert all(item["complete"] and item["width"] > 0 for item in images), (label, images)


def new_page(context, viewport: dict, relative: str):
    page = context.new_page()
    page.set_viewport_size(viewport)
    page.route("**/*", route_assets)
    page.set_content(page_html(relative), wait_until="domcontentloaded")
    page.locator("#avalon-page-loader").wait_for(state="hidden", timeout=15000)
    page.wait_for_timeout(180)
    return page


def test_pages(browser) -> None:
    results = []
    context = browser.new_context()
    try:
        for viewport in VIEWPORTS:
            for relative in PAGES:
                page = new_page(context, viewport, relative)
                errors: list[str] = []
                page.on("pageerror", lambda error, errors=errors: errors.append(str(error)))
                label = f"{relative}@{viewport['width']}"
                assert_no_overflow(page, label)
                assert_critical_images(page, label)
                assert not errors, (label, errors)

                if relative == "pages/registro.html":
                    display = page.locator(".battle-table").evaluate("el => getComputedStyle(el).display")
                    expected = "block" if viewport["width"] <= 980 else "table"
                    assert display == expected, (label, display, expected)

                if relative == "pages/liga.html":
                    assert page.locator("#league-mode-grid").evaluate("el => el.children.length") > 0

                if relative == "pages/raid.html":
                    assert page.locator("#raid-boss-combobox").count() == 1
                    assert page.locator("#raid-element-combobox").count() == 1
                    assert page.locator("#raid-search-button").count() == 1
                    assert page.locator("#raid-refresh-button").count() == 1
                    assert page.locator("#raid-clear-button").count() == 1
                    assert page.locator("#raid-status").count() == 1
                    assert page.locator("#raid-results-section").count() == 1
                    assert page.locator("#raid-guild-evolution").count() == 0
                    assert page.locator(".raid-evolution-metric").count() == 0
                    history_requests = page.evaluate(
                        "performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('raid_history.json')).length"
                    )
                    assert history_requests == 0, (label, history_requests)

                results.append(label)
                page.close()
    finally:
        context.close()
    print(f"PASS | {len(results)} combinações de página e viewport")



def test_registro_evolution(browser) -> None:
    results = []
    context = browser.new_context()
    try:
        for viewport in REGISTRO_VIEWPORTS:
            page = new_page(context, viewport, "pages/registro.html")
            label = f"registro-evolution@{viewport['width']}"

            assert page.locator(".registro-evolution-toggle").count() > 0, f"{label}: ações individuais ausentes"
            assert page.locator("#registro-evolution-modal").count() == 1, f"{label}: modal compartilhado ausente"
            assert page.locator("#registro-evolution-modal").get_attribute("aria-hidden") == "true", f"{label}: modal iniciou aberto"
            assert page.locator(".registro-evolution-detail-row").count() == 0, f"{label}: linha expansível legada encontrada"
            assert page.locator("#registro-guild-metrics .registro-evolution-metric").count() == 4, f"{label}: quadro coletivo incompleto"
            assert page.locator("#registro-guild-chart .registro-guild-chart").count() == 1, f"{label}: gráfico coletivo ausente"
            assert page.locator("#registro-guild-table-body tr").count() == 4, f"{label}: tabela coletiva deve conter quatro raids"

            initial_order = page.locator("#registro-guild-table-body tr").evaluate_all(
                "els => els.map(el => Number(el.dataset.raidNumber))"
            )
            assert initial_order == [133, 132, 131, 130], (label, initial_order)

            history_requests = page.evaluate(
                "performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('raid_history.json')).length"
            )
            assert history_requests == 1, (label, history_requests)

            if viewport["width"] >= 981:
                table_size = page.locator(".registro-page .table-wrap").evaluate(
                    "el => ({scroll: el.scrollWidth, client: el.clientWidth})"
                )
                assert table_size["scroll"] <= table_size["client"] + 2, (label, table_size)

            chart_sizes = page.locator(".registro-evolution-chart-frame").evaluate_all(
                "els => els.map(el => ({scroll: el.scrollWidth, client: el.clientWidth}))"
            )
            assert all(item["scroll"] <= item["client"] + 2 for item in chart_sizes), (label, chart_sizes)

            first = page.locator(".registro-evolution-toggle").first
            second = page.locator(".registro-evolution-toggle").nth(1)
            table_height_before = page.locator(".registro-page .battle-table").evaluate("el => el.getBoundingClientRect().height")
            first.click()
            modal = page.locator("#registro-evolution-modal")
            assert modal.get_attribute("aria-hidden") == "false", f"{label}: modal individual não abriu"
            assert page.locator("body").evaluate("el => el.classList.contains('modal-open')"), f"{label}: body não foi bloqueado"
            assert page.locator("main").evaluate("el => el.inert"), f"{label}: página ao fundo não ficou inerte"
            assert page.locator(".registro-history-item").count() == 4, f"{label}: histórico individual incompleto"
            assert first.get_attribute("aria-expanded") == "true", f"{label}: aria-expanded não atualizado"
            table_height_after = page.locator(".registro-page .battle-table").evaluate("el => el.getBoundingClientRect().height")
            assert abs(table_height_after - table_height_before) < 1, (label, table_height_before, table_height_after)

            dialog_box = page.locator("#registro-evolution-dialog").bounding_box()
            assert dialog_box is not None
            assert dialog_box["width"] <= viewport["width"] + 1, (label, dialog_box)
            assert dialog_box["height"] <= viewport["height"] + 1, (label, dialog_box)
            modal_chart = page.locator("#registro-evolution-modal .registro-evolution-chart-frame")
            modal_chart_size = modal_chart.evaluate("el => ({scroll: el.scrollWidth, client: el.clientWidth})")
            assert modal_chart_size["scroll"] <= modal_chart_size["client"] + 2, (label, modal_chart_size)

            page.locator(".registro-evolution-modal-backdrop").click(position={"x": 5, "y": 5}, force=True)
            assert modal.get_attribute("aria-hidden") == "false", f"{label}: backdrop fechou o modal"

            page.keyboard.press("Tab")
            assert page.locator("[data-registro-evolution-close]").evaluate("el => document.activeElement === el"), f"{label}: foco escapou do modal"
            page.locator("[data-registro-evolution-close]").click()
            assert modal.get_attribute("aria-hidden") == "true", f"{label}: botão X não fechou"
            assert first.evaluate("el => document.activeElement === el"), f"{label}: foco não retornou ao acionador"

            second.click()
            assert modal.get_attribute("aria-hidden") == "false", f"{label}: segundo membro não abriu"
            page.keyboard.press("Escape")
            assert modal.get_attribute("aria-hidden") == "true", f"{label}: Esc não fechou"
            assert second.get_attribute("aria-expanded") == "false", f"{label}: aria-expanded permaneceu ativo"

            page.select_option("#registro-guild-order", "asc")
            ascending = page.locator("#registro-guild-table-body tr").evaluate_all(
                "els => els.map(el => Number(el.dataset.raidNumber))"
            )
            assert ascending == [130, 131, 132, 133], (label, ascending)

            page.select_option("#registro-guild-order", "desc")
            descending = page.locator("#registro-guild-table-body tr").evaluate_all(
                "els => els.map(el => Number(el.dataset.raidNumber))"
            )
            assert descending == [133, 132, 131, 130], (label, descending)

            assert_no_overflow(page, label)
            results.append(label)
            page.close()
    finally:
        context.close()

    print(f"PASS | {len(results)} larguras do Registro com modal e gráficos responsivos")

def test_registro_special_cases(browser) -> None:
    context = browser.new_context()
    try:
        for viewport in ({"width": 390, "height": 844}, {"width": 1024, "height": 900}):
            page = new_page(context, viewport, "pages/registro.html")
            label = f"registro-special@{viewport['width']}"

            if viewport["width"] >= 981:
                headers = page.locator(".battle-table thead th").evaluate_all(
                    "els => els.map(el => { const r = el.getBoundingClientRect(); return {x:r.x, width:r.width}; })"
                )
                cells = page.locator(".battle-table tbody tr.registro-member-card").first.locator("td").evaluate_all(
                    "els => els.map(el => { const r = el.getBoundingClientRect(); return {x:r.x, width:r.width}; })"
                )
                assert len(headers) == len(cells) == 9, (label, len(headers), len(cells))
                for index, (header, cell) in enumerate(zip(headers, cells)):
                    assert abs(header["x"] - cell["x"]) <= 1.5, (label, index, header, cell)
                    assert abs(header["width"] - cell["width"]) <= 1.5, (label, index, header, cell)

            trigger = page.locator('button[aria-label="Ver evolução de Carlinhozz"]')
            assert trigger.count() == 1, f"{label}: caso Retorno à batalha não encontrado"
            trigger.click()

            modal = page.locator("#registro-evolution-modal")
            assert modal.get_attribute("aria-hidden") == "false", f"{label}: modal especial não abriu"
            assert page.locator("#registro-evolution-modal").get_by_text("Retorno à batalha", exact=True).count() == 1
            assert page.locator("#registro-evolution-modal").get_by_text("Sem raid oficial anterior", exact=True).count() >= 1
            assert page.locator("#registro-evolution-modal .registro-evolution-missing-label").count() == 2
            assert page.locator("#registro-evolution-modal .registro-evolution-line").count() == 0, f"{label}: gráfico conectou raids através de lacunas"

            metric_boxes = page.locator("#registro-evolution-modal .registro-evolution-metric").evaluate_all(
                "els => els.map(el => ({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}))"
            )
            assert all(item["sw"] <= item["cw"] + 2 and item["sh"] <= item["ch"] + 2 for item in metric_boxes), (label, metric_boxes)

            history_boxes = page.locator("#registro-evolution-modal .registro-history-item").evaluate_all(
                "els => els.map(el => ({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}))"
            )
            assert all(item["sw"] <= item["cw"] + 2 and item["sh"] <= item["ch"] + 2 for item in history_boxes), (label, history_boxes)

            assert_no_overflow(page, label)
            page.locator("[data-registro-evolution-close]").click()
            page.close()
    finally:
        context.close()
    print("PASS | casos especiais e alinhamento estrutural do Registro")


def test_back_to_top(browser) -> None:
    context = browser.new_context()
    try:
        page = new_page(context, {"width": 390, "height": 844}, "pages/registro.html")
        page.evaluate("""
          () => {
            const spacer = document.createElement('div');
            spacer.style.height = '10000px';
            document.body.appendChild(spacer);
            window.scrollTo(0, 5000);
          }
        """)
        page.wait_for_function("() => !document.querySelector('.site-back-top')?.classList.contains('hidden')")
        page.locator(".site-back-top").click()
        page.wait_for_function("() => window.scrollY <= 1", timeout=2500)
        assert page.evaluate("() => window.scrollY") <= 1
        page.close()
    finally:
        context.close()
    print("PASS | retorno ao topo")

def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**browser_launch_options())
        try:
            test_pages(browser)
            test_back_to_top(browser)
            test_registro_evolution(browser)
            test_registro_special_cases(browser)
        finally:
            browser.close()
    print("\nResultado do navegador: aprovado.")


if __name__ == "__main__":
    main()
