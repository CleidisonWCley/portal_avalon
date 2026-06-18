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


def new_page(browser, viewport: dict, relative: str):
    page = browser.new_page(viewport=viewport)
    page.route("**/*", route_assets)
    page.set_content(page_html(relative), wait_until="domcontentloaded")
    page.locator("#avalon-page-loader").wait_for(state="hidden", timeout=15000)
    page.wait_for_timeout(180)
    return page


def test_pages(browser) -> None:
    results = []
    for viewport in VIEWPORTS:
        for relative in PAGES:
            page = new_page(browser, viewport, relative)
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
                page.locator(".raid-evolution-metric").first.wait_for(state="visible", timeout=5000)
                assert page.locator(".raid-evolution-metric").count() == 4
                assert page.locator(".raid-evolution-chart").count() == 1

            results.append(label)
            page.close()
    print(f"PASS | {len(results)} combinações de página e viewport")


def test_back_to_top(browser) -> None:
    page = new_page(browser, {"width": 390, "height": 844}, "pages/registro.html")
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
    print("PASS | retorno ao topo")


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**browser_launch_options())
        try:
            test_pages(browser)
            test_back_to_top(browser)
        finally:
            browser.close()
    print("\nResultado do navegador: aprovado.")


if __name__ == "__main__":
    main()
