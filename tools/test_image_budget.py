#!/usr/bin/env python3
"""Confere orçamento de imagens de exibição e primeira dobra."""
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
MAX_DISPLAY_FILE = 320 * 1024
MAX_CRITICAL_TOTAL = 900 * 1024


def resolve_asset(page: Path, src: str) -> Path | None:
    if not src or src.startswith(("http://", "https://", "data:")):
        return None
    clean = urlsplit(src).path
    return (page.parent / clean).resolve()


def main() -> None:
    display_files = sorted((WEB / "assets" / "img").glob("**/display/*.webp"))
    if not display_files:
        raise AssertionError("nenhuma imagem WebP de exibição encontrada")

    oversized = [(path.relative_to(ROOT), path.stat().st_size) for path in display_files
                 if path.stat().st_size > MAX_DISPLAY_FILE]
    if oversized:
        raise AssertionError(f"imagens de exibição acima de 320 KiB: {oversized}")

    pages = [WEB / "index.html", *(WEB / "pages").glob("*.html")]
    totals: dict[str, int] = {}
    for page in pages:
        html = page.read_text(encoding="utf-8")
        critical = re.findall(
            r"<img\b(?=[^>]*data-avalon-critical-image)[^>]*src=[\"']([^\"']+)[\"'][^>]*>",
            html,
            re.I,
        )
        total = 0
        missing = []
        for src in critical:
            path = resolve_asset(page, src)
            if path is None:
                continue
            if not path.exists():
                missing.append(src)
            else:
                total += path.stat().st_size
        if missing:
            raise AssertionError(f"imagens críticas ausentes em {page.relative_to(ROOT)}: {missing}")
        totals[str(page.relative_to(ROOT))] = total
        if total > MAX_CRITICAL_TOTAL:
            raise AssertionError(
                f"primeira dobra acima de 900 KiB em {page.relative_to(ROOT)}: {total / 1024:.1f} KiB"
            )

    print("OK — orçamento de imagens aprovado.")
    for page, total in totals.items():
        print(f"  {page}: {total / 1024:.1f} KiB críticos")


if __name__ == "__main__":
    main()
