#!/usr/bin/env python3
"""Validação visual e estrutural do canvas unificado da Liga V7.4."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "web"
EVIDENCE_DIR = PROJECT_ROOT / "docs/evidencias/V7.4"
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


def append_canvas(page, config: dict, canvas_id: str) -> dict:
    return page.evaluate(
        """async ({config, canvasId}) => {
          const output = await window.AvalonLeagueCanvas.render(config);
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
            layout: output.model.layout
          };
        }""",
        {"config": config, "canvasId": canvas_id},
    )


def player(name: str) -> dict:
    return {"type": "player", "name": name, "origin": "avalon"}


def team(name: str, members: list[str]) -> dict:
    return {"type": "team", "name": name, "members": [{"name": item, "origin": "avalon"} for item in members]}


def mode(formato: str, title: str, name: str, maps: list[dict]) -> dict:
    return {"id": f"test-{formato}", "formato": formato, "titulo": title, "nome": name, "mapas": maps}


def phase(label: str, arena: str, matches: list[dict]) -> dict:
    return {"type": "round", "label": label, "arena": arena, "round": {"matches": matches}}


def run() -> None:
    arena_data = json.loads((WEB_ROOT / "data/arenas.json").read_text(encoding="utf-8"))
    modes = {item["formato"] + "-" + item["nome"]: item for item in arena_data["modos"]}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )

        def create_page():
            page = browser.new_page(viewport={"width": 1440, "height": 1200})
            errors: list[str] = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.route("**/*", route_local_assets)
            page.set_content(build_inline_page(), wait_until="networkidle")
            return page, errors

        # 1v1 compacto.
        page, errors = create_page()
        m1 = modes["1v1-Arena"]
        p1 = phase("Quartas de Final", "Estádio", [{"unitA": player("Cley"), "unitB": player("Ramigam")}])
        result = append_canvas(page, {"phase": p1, "phaseIndex": 0, "phases": [p1], "modo": m1}, "canvas-1v1")
        match_layout = page.evaluate("match => window.AvalonLeagueCanvas.resolveMatchLayout(match, 960)", p1["round"]["matches"][0])
        assert result["width"] == 1400
        assert result["layout"]["width"] == 960
        assert match_layout["height"] == 142
        assert match_layout["innerWidth"] < 960
        long_layout = page.evaluate(
            "match => window.AvalonLeagueCanvas.resolveMatchLayout(match, 510)",
            {"unitA": player("GuardiãoCelestialSupremo"), "unitB": player("CavaleiroDoHorizonte")},
        )
        assert long_layout["memberFontSize"] <= 19
        page.locator("#canvas-1v1").screenshot(path=str(EVIDENCE_DIR / "canvas_liga_v7_4_1v1.png"))
        assert not errors, errors
        page.close()

        # 2v2 adaptado.
        page, errors = create_page()
        m2 = modes["3v3-Equipe"]
        p2 = phase("Semifinal", "Oásis", [{
            "unitA": team("Equipe 1", ["Cley", "Drymus"]),
            "unitB": team("Equipe 2", ["Dennis", "Capibara"]),
        }])
        result = append_canvas(page, {"phase": p2, "phaseIndex": 0, "phases": [p2], "modo": m2}, "canvas-2v2")
        match_layout = page.evaluate("match => window.AvalonLeagueCanvas.resolveMatchLayout(match, 960)", p2["round"]["matches"][0])
        assert match_layout["height"] == 164
        assert match_layout["memberCount"] == 2
        page.locator("#canvas-2v2").screenshot(path=str(EVIDENCE_DIR / "canvas_liga_v7_4_2v2.png"))
        assert not errors, errors
        page.close()

        # 3v3 com nomes maiores.
        page, errors = create_page()
        p3 = phase("Final do Campeão", "Estádio da Batalha", [{
            "unitA": team("Equipe Aurora", ["Cley", "Drymus", "SkyLord"]),
            "unitB": team("Equipe Avalon", ["Dennis", "Capibara", "Krelian"]),
        }])
        result = append_canvas(page, {"phase": p3, "phaseIndex": 0, "phases": [p3], "modo": m2}, "canvas-3v3")
        match_layout = page.evaluate("match => window.AvalonLeagueCanvas.resolveMatchLayout(match, 960)", p3["round"]["matches"][0])
        assert match_layout["height"] == 184
        assert match_layout["maxLines"] == 2
        assert match_layout["sideWidth"] < 360
        page.locator("#canvas-3v3").screenshot(path=str(EVIDENCE_DIR / "canvas_liga_v7_4_3v3.png"))
        assert not errors, errors
        page.close()

        # Quatro confrontos usam duas colunas e o mesmo componente.
        page, errors = create_page()
        matches = [
            {"unitA": player(f"Guardião {i * 2 + 1}"), "unitB": player(f"Guardião {i * 2 + 2}")}
            for i in range(4)
        ]
        p4 = phase("Oitavas de Final", "Mata-Mata", matches)
        result = append_canvas(page, {"phase": p4, "phaseIndex": 0, "phases": [p4], "modo": m1}, "canvas-grid")
        assert result["layout"]["columns"] == 2
        assert result["layout"]["width"] == 510
        assert result["height"] <= 2200
        assert not errors, errors
        page.close()

        # Provação dos Seis preserva grupos usando a mesma base de painel.
        page, errors = create_page()
        ms = modes["1v5-Briga"]
        ps = {
            "type": "survival_groups",
            "label": "Salas Iniciais",
            "arena": "Campo de Treinamento de Batalha de Heavenhold",
            "groups": [
                {"name": "Grupo A", "participants": [player("Krelian"), player("Cley"), player("Cosmos"), player("Ramigam")], "placements": {}},
                {"name": "Grupo B", "participants": [player("Dennis"), player("Drymus"), player("Capibara"), player("SkyLord")], "placements": {}},
            ],
        }
        result = append_canvas(page, {"phase": ps, "phaseIndex": 0, "phases": [ps], "modo": ms}, "canvas-survival")
        assert result["layout"]["width"] == 980
        assert result["layout"]["columns"] == 1
        page.locator("#canvas-survival").screenshot(path=str(EVIDENCE_DIR / "canvas_liga_v7_4_grupos.png"))
        assert not errors, errors
        page.close()

        browser.close()

    print("PASS | Canvas 1v1 compacto e centralizado")
    print("PASS | Canvas 2v2 adaptado pelo mesmo renderer")
    print("PASS | Canvas 3v3 com quebra e altura adaptativas")
    print("PASS | Grade com quatro confrontos reutiliza o mesmo componente")
    print("PASS | Salas de sobrevivência preservadas com painel compartilhado")
    print("Resultado visual V7.4: 5/5 cenários aprovados.")


if __name__ == "__main__":
    run()
