#!/usr/bin/env python3
"""Valida a arquitetura de carregamento resiliente do Portal Avalon."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    ui = read("web/assets/js/ui.js")
    app = read("web/assets/js/app.js")
    raid = read("web/assets/js/raid.js")
    liga = read("web/assets/js/liga.js")
    css = read("web/assets/css/styles.css")
    liga_html = read("web/pages/liga.html")

    check("window.fetch =" not in ui, "ui.js não pode substituir window.fetch globalmente")
    check("SAFETY_TIMEOUT_MS" not in ui, "loader não pode usar encerramento forçado silencioso")
    check("registerLoaderTask" in ui and "AvalonLoader" in ui, "registro explícito de tarefas ausente")
    check("waitForCriticalImages" in ui, "loader não aguarda imagens críticas")
    check("AvalonResources" in ui and "fetchWithTimeout" in ui, "carregador resiliente ausente")
    check("AbortController" in ui, "requisições não possuem timeout/cancelamento")
    check("RESOURCE_CACHE_PREFIX" in ui, "cache de contingência ausente")
    check("cache: 'no-store'" not in ui + app + raid + liga, "cache no-store ainda está ativo")

    check("PAGE_DATA_REQUIREMENTS" in app, "dependências por página ausentes")
    galeria_match = re.search(r"galeria\s*:\s*\[([^\]]*)\]", app)
    check(bool(galeria_match), "dependência da Galeria não localizada")
    check("eventos" in galeria_match.group(1) and "raidAtual" not in galeria_match.group(1),
          "Galeria ainda carrega dados de Raid desnecessários")
    check("Promise.allSettled" in app, "falhas isoladas de dados não estão protegidas")

    check("lista-inicial-da-raid" in raid, "lista inicial da Raid não foi registrada no loader")
    check("loadFirebaseIntegration" in liga and "import(moduleUrl)" in liga,
          "Firebase da Liga não está sendo carregado em segundo plano")
    check("liga-firebase.js\"" not in liga_html and "liga-firebase.js'" not in liga_html,
          "Liga ainda contém script Firebase estático")

    check("trophyGlow" not in css, "animação trophyGlow ainda existe")
    check("ligaTrophyShine" not in css, "animação ligaTrophyShine ainda existe")
    check("slowShine" not in css, "animação decorativa slowShine ainda existe")

    media_conditions = re.findall(r"@media\s*\(([^)]*)\)", css)
    allowed = {
        "min-width: 1181px",
        "max-width: 1180px",
        "max-width: 980px",
        "max-width: 720px",
        "max-width: 440px",
        "prefers-reduced-motion: reduce",
    }
    unexpected = [condition.strip() for condition in media_conditions if condition.strip() not in allowed]
    check(not unexpected, f"@media não consolidado(s): {unexpected}")
    check(len(media_conditions) == len(set(media_conditions)) == 6,
          f"esperados 6 blocos @media únicos; encontrados {len(media_conditions)}")

    pages = [WEB / "index.html", *(WEB / "pages").glob("*.html")]
    for page in pages:
        html = page.read_text(encoding="utf-8")
        check("?v=" not in html and "?build=" not in html,
              f"referência funcional versionada em {page.relative_to(ROOT)}")
        for tag in re.findall(r"<img\b[^>]*>", html, re.I):
            check("width=" in tag and "height=" in tag,
                  f"imagem sem dimensões em {page.relative_to(ROOT)}: {tag[:120]}")
            check("decoding=" in tag, f"imagem sem decoding em {page.relative_to(ROOT)}")

    print("OK — carregamento resiliente, dados por página e responsividade consolidados.")


if __name__ == "__main__":
    main()
