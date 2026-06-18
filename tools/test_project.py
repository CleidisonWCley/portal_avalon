#!/usr/bin/env python3
"""Valida estrutura, referências, JSONs, documentação e orçamento de assets."""
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
DOCS = ROOT / "docs"

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


def resolve_reference(owner: Path, reference: str) -> Path:
    clean = reference.split("#", 1)[0].split("?", 1)[0]
    return (owner.parent / clean).resolve()


def validate_json() -> None:
    files = sorted(WEB.rglob("*.json"))
    assert files, "nenhum JSON encontrado"
    for file in files:
        json.loads(file.read_text(encoding="utf-8"))
    print(f"PASS | {len(files)} JSONs válidos")


def validate_html_references() -> None:
    missing: list[str] = []
    for html in PAGES:
        parser = ReferenceParser()
        parser.feed(html.read_text(encoding="utf-8"))
        for reference in parser.references:
            target = resolve_reference(html, reference)
            if not target.exists():
                missing.append(f"{html.relative_to(ROOT)} -> {reference}")
    assert not missing, "referências HTML ausentes:\n" + "\n".join(missing)
    print(f"PASS | referências locais de {len(PAGES)} páginas")


def validate_markdown_links() -> None:
    markdown_files = [ROOT / "README.md", *sorted(DOCS.glob("*.md")), ROOT / "tools/README.md"]
    missing: list[str] = []
    pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for markdown in markdown_files:
        text = markdown.read_text(encoding="utf-8")
        for target in pattern.findall(text):
            if target.startswith(EXTERNAL_PREFIXES):
                continue
            clean = target.split("#", 1)[0]
            if clean and not (markdown.parent / clean).resolve().exists():
                missing.append(f"{markdown.relative_to(ROOT)} -> {target}")
    assert not missing, "links Markdown ausentes:\n" + "\n".join(missing)
    print(f"PASS | links de {len(markdown_files)} documentos")


def validate_docs_shape() -> None:
    files = {item.name for item in DOCS.iterdir() if item.is_file()}
    directories = [item.name for item in DOCS.iterdir() if item.is_dir()]
    assert files == EXPECTED_DOCS, ("documentos inesperados", sorted(files ^ EXPECTED_DOCS))
    assert not directories, ("subpastas redundantes em docs", directories)
    print("PASS | documentação consolidada em sete arquivos")


def validate_critical_image_budget() -> None:
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
            assert target.exists(), f"imagem crítica ausente: {html.relative_to(ROOT)} -> {reference}"
            total += target.stat().st_size
        relative = html.relative_to(WEB).as_posix()
        totals[relative] = total
        assert total <= limits[relative], f"{relative}: {total / 1024:.1f} KiB excede orçamento"
    print("PASS | orçamento de imagens críticas: " + ", ".join(
        f"{name}={size / 1024:.1f}KiB" for name, size in totals.items()
    ))


def validate_asset_migration() -> None:
    source = "\n".join(file.read_text(encoding="utf-8", errors="ignore") for file in PAGES)
    old_patterns = [
        "assets/img/brand/avalon-logo.png",
        "assets/img/brand/avalon-logo-small.png",
        "assets/img/mascots/cley.png",
        "assets/img/mascots/olimpio.png",
        "assets/img/insignias/thumbs/guardiao.png",
    ]
    for pattern in old_patterns:
        assert pattern not in source, f"referência antiga encontrada: {pattern}"
    assert (WEB / "assets/img/brand/display/avalon-logo.webp").exists()
    assert (WEB / "assets/img/mascots/display/cley.webp").exists()
    assert (WEB / "assets/img/insignias/ranks/display/guardiao.webp").exists()
    print("PASS | assets publicados usam estrutura display/WebP")


def validate_repository_hygiene() -> None:
    forbidden = [
        ROOT / "docs/evidencias",
        ROOT / "node_modules",
        ROOT / ".venv",
        ROOT / "__pycache__",
    ]
    present = [str(path.relative_to(ROOT)) for path in forbidden if path.exists()]
    assert not present, f"artefatos locais encontrados: {present}"
    assert not list(ROOT.glob("*.zip")), "ZIP encontrado na raiz do repositório"
    print("PASS | repositório sem evidências, caches ou pacotes locais")


def main() -> None:
    validate_json()
    validate_html_references()
    validate_markdown_links()
    validate_docs_shape()
    validate_critical_image_budget()
    validate_asset_migration()
    validate_repository_hygiene()
    print("\nResultado do projeto: 7/7 verificações aprovadas.")


if __name__ == "__main__":
    main()
