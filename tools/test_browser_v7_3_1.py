#!/usr/bin/env python3
"""Validação visual/DOM da V7.3.1 sem servidor externo."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "web"
EVIDENCE_DIR = PROJECT_ROOT / "docs/evidencias/V7.3.1"
EVIDENCE_DIR.mkdir(exist_ok=True)

DATA_PATHS = [
    "data/raids/raid_atual.json",
    "data/raids/raid_anterior.json",
    "data/raids/raid_history.json",
    "data/raids/raid_manual_overrides.json",
    "data/insignias.json",
    "data/gallery/eventos.json",
]


def build_inline_page(page_relative: str) -> str:
    html = (WEB_ROOT / page_relative).read_text(encoding="utf-8")
    css = (WEB_ROOT / "assets/css/styles.css").read_text(encoding="utf-8")
    data_js = (WEB_ROOT / "assets/js/data.js").read_text(encoding="utf-8")
    hall_rules = (WEB_ROOT / "assets/js/hall-rules.js").read_text(encoding="utf-8")
    app_js = (WEB_ROOT / "assets/js/app.js").read_text(encoding="utf-8")

    html = re.sub(r"<link[^>]*>", "", html)
    html = re.sub(r"<script[^>]*>\s*</script>", "", html)
    html = html.replace(
        "</head>",
        f'<base href="https://assets.local/pages/"><style>{css}.material-symbols-outlined{{font-family:Arial}}</style></head>',
    )
    data = {key: json.loads((WEB_ROOT / key).read_text(encoding="utf-8")) for key in DATA_PATHS}
    patch = rf"""
<script>
window.__AVALON_TEST_DATA__ = {json.dumps(data, ensure_ascii=False)};
const __memoryStorage = {{}};
Object.defineProperty(window, 'localStorage', {{ configurable: true, value: {{
  getItem: key => Object.prototype.hasOwnProperty.call(__memoryStorage, key) ? __memoryStorage[key] : null,
  setItem: (key, value) => {{ __memoryStorage[key] = String(value); }},
  removeItem: key => {{ delete __memoryStorage[key]; }},
  clear: () => {{ Object.keys(__memoryStorage).forEach(key => delete __memoryStorage[key]); }}
}} }});
window.fetch = async function(url) {{
  const key = String(url).replace(/^\.\.\//, '').replace(/^\.\//, '');
  const value = window.__AVALON_TEST_DATA__[key];
  return {{ ok: Boolean(value), status: value ? 200 : 404, json: async () => value }};
}};
</script>
"""
    scripts = f"<script>{data_js}</script>{patch}<script>{hall_rules}</script><script>{app_js}</script>"
    return html.replace("</body>", f"{scripts}</body>")


def route_local_assets(route) -> None:
    url = route.request.url
    if not url.startswith("https://assets.local/"):
        route.abort()
        return
    relative = url.split("https://assets.local/", 1)[1].split("?", 1)[0]
    candidate = (WEB_ROOT / relative).resolve()
    if candidate.is_file() and WEB_ROOT.resolve() in candidate.parents:
        route.fulfill(status=200, body=candidate.read_bytes(), content_type=mimetypes.guess_type(str(candidate))[0] or "application/octet-stream")
    else:
        route.fulfill(status=404, body=b"")


def new_page(browser, viewport):
    page = browser.new_page(viewport=viewport)
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.route("**/*", route_local_assets)
    return page, errors


def assert_no_errors(errors, name):
    if errors:
        raise AssertionError(f"Erros em {name}: {errors}")


def run() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])

        # Hall desktop blindado.
        page, errors = new_page(browser, {"width": 1440, "height": 900})
        page.set_content(build_inline_page("pages/hall.html"), wait_until="networkidle")
        page.wait_for_selector("#podium .podium-card")
        page.evaluate("document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'))")
        body_text = page.locator("body").inner_text()
        assert "/21" not in body_text
        assert page.locator(".hall-rules-section").count() == 0
        assert page.locator("#podium .podium-card").count() == 3
        assert page.locator("#unclassified-hall .outside-hall-item").count() == 1
        first_card = page.locator("#podium .podium-card").first.inner_text().lower()
        assert "dano atual" in first_card and "média base" in first_card and "evolução" in first_card
        assert "frequência" not in first_card
        page.screenshot(path=str(EVIDENCE_DIR / "hall_v7_3_1_desktop.png"), full_page=True)
        assert_no_errors(errors, "Hall desktop")
        page.close()

        # Hall mobile sem overflow.
        page, errors = new_page(browser, {"width": 390, "height": 844})
        page.set_content(build_inline_page("pages/hall.html"), wait_until="networkidle")
        page.wait_for_selector("#podium .podium-card")
        page.evaluate("document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'))")
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        assert overflow <= 2, overflow
        page.screenshot(path=str(EVIDENCE_DIR / "hall_v7_3_1_mobile.png"), full_page=True)
        assert_no_errors(errors, "Hall mobile")
        page.close()

        # Busca mantém frequência e trata ausente.
        page, errors = new_page(browser, {"width": 1280, "height": 900})
        page.set_content(build_inline_page("pages/oraculo.html"), wait_until="networkidle")
        page.locator("#member-search").fill("Carlinhozz")
        page.locator("#member-search").dispatch_event("input")
        page.wait_for_selector("#member-card .member-name")
        profile = page.locator("#member-card").inner_text()
        assert "0/21" in profile
        assert "Incalculável" in profile
        assert "Fora do Hall" in profile
        assert_no_errors(errors, "Busca de ausente")
        page.close()

        # Registro desktop, classificação e botão de topo.
        page, errors = new_page(browser, {"width": 1536, "height": 900})
        page.set_content(build_inline_page("pages/registro.html"), wait_until="networkidle")
        page.wait_for_selector("#members-table tr")
        page.evaluate("document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'))")
        assert page.locator("thead th").count() == 10
        assert page.locator("#members-table tr").count() == 28
        assert "Cley" in page.locator("#members-table tr").first.inner_text()
        assert "#1" in page.locator("#members-table tr").first.inner_text()
        assert "Carlinhozz" in page.locator("#members-table tr").last.inner_text()
        assert "Incalculável" in page.locator("#members-table tr").last.inner_text()
        assert "27 membros ativos" in page.locator("#registro-kpis").inner_text()
        assert "1 membro ausente" in page.locator("#registro-kpis").inner_text()
        options = page.locator("#confidence-filter option").all_text_contents()
        assert "Base parcial" not in options and "Base insuficiente" not in options

        page.locator("#ranking-filter").select_option("hall")
        assert "kia" in page.locator("#members-table tr").first.inner_text()
        page.locator("#ranking-filter").select_option("ausente")
        assert page.locator("#members-table tr").count() == 1
        assert "Carlinhozz" in page.locator("#members-table tr").first.inner_text()
        page.locator("#ranking-filter").select_option("dano")

        page.locator(".table-wrap").evaluate("el => { el.scrollTop = 420; el.dispatchEvent(new Event('scroll')); }")
        page.wait_for_timeout(150)
        assert page.locator("#back-to-top").evaluate("el => el.classList.contains('visible')")
        page.screenshot(path=str(EVIDENCE_DIR / "registro_v7_3_1_desktop.png"), full_page=True)
        assert_no_errors(errors, "Registro desktop")
        page.close()

        # Canvas horizontal do Cley: captura o PNG gerado.
        page, errors = new_page(browser, {"width": 1280, "height": 900})
        page.set_content(build_inline_page("pages/oraculo.html"), wait_until="networkidle")
        page.wait_for_timeout(250)
        result = page.evaluate("""async () => {
          HTMLCanvasElement.prototype.toDataURL = function() { return 'data:image/png;base64,'; };
          HTMLAnchorElement.prototype.click = function() {};
          await window.downloadGuardianCard('Cley');
          const canvas = window.__lastGuardianCardCanvas;
          canvas.id = 'guardian-card-evidence';
          canvas.style.width = '1200px';
          canvas.style.height = '900px';
          document.body.innerHTML = '';
          document.body.style.margin = '0';
          document.body.style.background = '#050812';
          document.body.appendChild(canvas);
          return { width: canvas.width, height: canvas.height };
        }""")
        assert result["width"] == 1600 and result["height"] == 1200
        page.locator("#guardian-card-evidence").screenshot(path=str(EVIDENCE_DIR / "ficha_cley_v7_3_1.png"))
        assert_no_errors(errors, "Canvas horizontal")
        page.close()

        browser.close()

    print("PASS | Hall público sem frequência e sem limites numéricos")
    print("PASS | Hall mobile sem overflow horizontal")
    print("PASS | Busca mantém frequência e exibe ranking incalculável ao ausente")
    print("PASS | Registro com 10 colunas, ranking dinâmico, Hall e filtro Ausente")
    print("PASS | Canvas horizontal 1600x1200 gerado com sucesso")
    print("Resultado visual/DOM: 5/5 cenários aprovados.")


if __name__ == "__main__":
    run()
