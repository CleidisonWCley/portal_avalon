#!/usr/bin/env python3
"""Validação visual e geométrica do pódio adaptativo da Liga V7.5."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "web"
EVIDENCE_DIR = PROJECT_ROOT / "docs/evidencias/V7.5"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def build_inline_page() -> str:
    html = (WEB_ROOT / "pages/liga.html").read_text(encoding="utf-8")
    css = (WEB_ROOT / "assets/css/styles.css").read_text(encoding="utf-8")
    liga_js = (WEB_ROOT / "assets/js/liga.js").read_text(encoding="utf-8")
    data = {
        "data/arenas.json": json.loads((WEB_ROOT / "data/arenas.json").read_text(encoding="utf-8")),
        "data/raids/raid_atual.json": json.loads((WEB_ROOT / "data/raids/raid_atual.json").read_text(encoding="utf-8")),
    }

    html = re.sub(r"<link[^>]*>", "", html)
    html = re.sub(r"<script[^>]*>\s*</script>", "", html)
    html = html.replace(
        "</head>",
        f'<base href="https://assets.local/pages/"><style>{css}.material-symbols-outlined{{font-family:Arial}}</style></head>',
    )
    patch = rf"""
<script>
window.__AVALON_LIGA_TEST_DATA__ = {json.dumps(data, ensure_ascii=False)};
const __memoryStorage = {{}};
Object.defineProperty(window, 'localStorage', {{ configurable: true, value: {{
  getItem: key => Object.prototype.hasOwnProperty.call(__memoryStorage, key) ? __memoryStorage[key] : null,
  setItem: (key, value) => {{ __memoryStorage[key] = String(value); }},
  removeItem: key => {{ delete __memoryStorage[key]; }},
  clear: () => {{ Object.keys(__memoryStorage).forEach(key => delete __memoryStorage[key]); }}
}} }});
window.fetch = async function(url) {{
  const key = String(url).replace(/^\.\.\//, '').replace(/^\.\//, '');
  const value = window.__AVALON_LIGA_TEST_DATA__[key];
  return {{ ok: Boolean(value), status: value ? 200 : 404, json: async () => value }};
}};
HTMLAnchorElement.prototype.click = function() {{}};
</script>
<script>{liga_js}</script>
"""
    return html.replace("</body>", f"{patch}</body>")


def route_local_assets(route) -> None:
    url = route.request.url
    if not url.startswith("https://assets.local/"):
        route.abort()
        return
    relative = url.split("https://assets.local/", 1)[1].split("?", 1)[0]
    candidate = (WEB_ROOT / relative).resolve()
    if candidate.is_file() and WEB_ROOT.resolve() in candidate.parents:
        route.fulfill(
            status=200,
            body=candidate.read_bytes(),
            content_type=mimetypes.guess_type(str(candidate))[0] or "application/octet-stream",
        )
    else:
        route.fulfill(status=404, body=b"")


def player(name: str, origin: str = "avalon") -> dict:
    return {"type": "player", "name": name, "origin": origin}


def team(name: str, members: list[str]) -> dict:
    return {"type": "team", "name": name, "members": [{"name": item, "origin": "avalon"} for item in members]}


def mode(formato: str = "3v3") -> dict:
    return {"id": f"test-{formato}", "formato": formato, "titulo": "Batalha de Esquadrões", "nome": "Equipe", "mapas": []}


def append_podium(page, config: dict, canvas_id: str) -> dict:
    return page.evaluate(
        """async ({config, canvasId}) => {
          const output = await window.AvalonLeaguePodiumCanvas.render(config);
          const canvas = output.canvas;
          canvas.id = canvasId;
          canvas.style.width = '1120px';
          canvas.style.height = 'auto';
          document.body.innerHTML = '';
          document.body.style.margin = '0';
          document.body.style.display = 'grid';
          document.body.style.placeItems = 'start center';
          document.body.style.background = '#050812';
          document.body.appendChild(canvas);
          return {
            width: canvas.width,
            height: canvas.height,
            layouts: output.layouts.map((layout, index) => ({
              place: output.models[index].place,
              variant: layout.variant,
              box: layout.box,
              requiredHeight: layout.requiredHeight,
              safeBottom: layout.safeBottom || null,
              membersY: layout.membersY || null,
              memberLineHeight: layout.memberLineHeight || null,
              memberLines: layout.memberLines || layout.members || [],
              trophySize: layout.trophySize,
              titleLines: output.models[index].titleLines
            }))
          };
        }""",
        {"config": config, "canvasId": canvas_id},
    )


def assert_compact_safe(layout: dict) -> None:
    assert layout["requiredHeight"] <= layout["box"]["h"], layout
    lines = layout["memberLines"]
    if lines and layout["safeBottom"] is not None:
        last_baseline = layout["membersY"] + (len(lines) - 1) * layout["memberLineHeight"]
        assert last_baseline <= layout["safeBottom"], (last_baseline, layout["safeBottom"], layout)


def run() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )

        def create_page():
            page = browser.new_page(viewport={"width": 1500, "height": 1200})
            errors: list[str] = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.route("**/*", route_local_assets)
            page.set_content(build_inline_page(), wait_until="networkidle")
            return page, errors

        # 1v1: o mesmo renderer suporta jogadores individuais.
        page, errors = create_page()
        podium_1v1 = {
            "gold": player("Cley"),
            "silver": player("Ramigam"),
            "bronze": player("SkyLord"),
        }
        result = append_podium(page, {"type": "full", "podium": podium_1v1, "modo": mode("1v1")}, "podium-1v1")
        assert result["width"] == 1600 and result["height"] == 900
        for layout in result["layouts"]:
            assert_compact_safe(layout)
        page.locator("#podium-1v1").screenshot(path=str(EVIDENCE_DIR / "podio_v7_5_1v1.png"))
        assert not errors, errors
        page.close()

        # 2v2: equipes permanecem centralizadas e legíveis.
        page, errors = create_page()
        podium_2v2 = {
            "gold": team("Equipe Aurora", ["Cley", "Drymus"]),
            "silver": team("Equipe Horizonte", ["Dennis", "Capibara"]),
            "bronze": team("Equipe Avalon", ["Krelian", "Ramigam"]),
        }
        result = append_podium(page, {"type": "full", "podium": podium_2v2, "modo": mode("3v3")}, "podium-2v2")
        for layout in result["layouts"]:
            assert_compact_safe(layout)
        page.locator("#podium-2v2").screenshot(path=str(EVIDENCE_DIR / "podio_v7_5_2v2.png"))
        assert not errors, errors
        page.close()

        # 3v3: reprodução do caso real de bronze; Sr_Mendes deve permanecer dentro do card.
        page, errors = create_page()
        podium_3v3 = {
            "gold": team("Equipe 2", ["Carlinhozz", "Gashak", "Cley"]),
            "silver": team("Equipe 3", ["CAPETTINI", "Capibara", "Drymus"]),
            "bronze": team("Equipe 1", ["SirAudino", "SkyLord", "Sr_Mendes"]),
        }
        result = append_podium(page, {"type": "full", "podium": podium_3v3, "modo": mode("3v3")}, "podium-3v3")
        bronze = next(item for item in result["layouts"] if item["place"] == "bronze")
        assert bronze["titleLines"] == ["GUERREIROS", "DE BRONZE"]
        assert any("Sr_Mendes" in line for line in bronze["memberLines"])
        assert_compact_safe(bronze)
        assert bronze["box"]["h"] >= 445
        page.locator("#podium-3v3").screenshot(path=str(EVIDENCE_DIR / "podio_v7_5_3v3_bronze_corrigido.png"))
        assert not errors, errors
        page.close()

        # Nomes extensos: o resolvedor reduz tipografia/troféu sem cortar o rodapé.
        page, errors = create_page()
        long_podium = {
            "gold": team("Esquadrão Celestial de Avalon", ["GuardiãoCelestialSupremo", "CavaleiroDoHorizonte", "SentinelaDaLuaEterna"]),
            "silver": team("Ordem dos Vigias", ["ComandanteDoPrimeiroCorpo", "ProtetorDoReinoAntigo", "ArautoDaCidadeCeleste"]),
            "bronze": team("Defensores do Portal", ["SirAudinoDeHeavenhold", "SkyLordGuardião", "Sr_MendesAvalon"]),
        }
        result = append_podium(page, {"type": "full", "podium": long_podium, "modo": mode("3v3")}, "podium-long")
        for layout in result["layouts"]:
            assert_compact_safe(layout)
            assert layout["trophySize"] >= 174
        assert not errors, errors
        page.close()

        # Card individual de bronze reutiliza o mesmo modelo/resolvedor.
        page, errors = create_page()
        result = append_podium(
            page,
            {"type": "placement", "place": "bronze", "unit": podium_3v3["bronze"], "modo": mode("3v3")},
            "placement-bronze",
        )
        layout = result["layouts"][0]
        assert result["width"] == 1200 and result["height"] == 800
        assert layout["variant"] == "feature"
        assert layout["requiredHeight"] <= layout["box"]["h"]
        page.locator("#placement-bronze").screenshot(path=str(EVIDENCE_DIR / "card_individual_bronze_v7_5.png"))
        assert not errors, errors
        page.close()

        browser.close()

    print("PASS | Pódio 1v1 usa o renderer adaptativo")
    print("PASS | Pódio 2v2 permanece equilibrado")
    print("PASS | Bronze 3v3 mantém todos os membros dentro da moldura")
    print("PASS | Nomes extensos são ajustados sem invadir o rodapé")
    print("PASS | Card individual reutiliza modelo e resolvedor do pódio")
    print("Resultado visual V7.5: 5/5 cenários aprovados.")


if __name__ == "__main__":
    run()
