#!/usr/bin/env python3
"""Runner multiplataforma da suíte de regressão do Portal Avalon."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
WEB = ROOT / "web"


def run(label: str, command: list[str]) -> None:
    print(f"\n=== {label} ===")
    result = subprocess.run(command, cwd=ROOT)
    if result.returncode:
        raise SystemExit(result.returncode)


def node_command() -> str:
    executable = shutil.which("node")
    if not executable:
        raise SystemExit("Node.js não encontrado. Instale o Node para validar os JavaScripts.")
    return executable


def playwright_available() -> bool:
    try:
        import playwright  # noqa: F401
    except ImportError:
        return False
    return True


def run_static_suite() -> None:
    node = node_command()
    javascript_files = sorted((WEB / "assets/js").glob("*.js"))
    for file in javascript_files:
        run(f"Sintaxe JavaScript — {file.name}", [node, "--check", str(file)])

    run("Regressão funcional e estrutural", [node, str(TOOLS / "test_core.js")])
    run("OCR, Raid 133 e evolução coletiva", [sys.executable, str(TOOLS / "test_v7_8_2.py")])
    run("Estrutura, referências e assets", [sys.executable, str(TOOLS / "test_project.py")])
    run(
        "Histórico de raids",
        [
            sys.executable,
            str(TOOLS / "validate_raid_history.py"),
            "--history",
            str(WEB / "data/raids/raid_history.json"),
            "--current",
            str(WEB / "data/raids/raid_atual.json"),
        ],
    )


def run_browser_suite(required: bool) -> None:
    if not playwright_available():
        message = (
            "Playwright não instalado. Use: python -m pip install playwright "
            "e python -m playwright install chromium"
        )
        if required:
            raise SystemExit(message)
        print(f"\nSKIP | {message}")
        return
    run("Navegador, loader e responsividade", [sys.executable, str(TOOLS / "test_browser.py")])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Executa regressões do Portal Avalon.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--quick", action="store_true", help="Executa somente testes estáticos e de dados.")
    group.add_argument("--browser", action="store_true", help="Executa somente testes de navegador e exige Playwright.")
    group.add_argument("--all", action="store_true", help="Executa a suíte completa e exige Playwright.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.browser:
        run_browser_suite(required=True)
    else:
        run_static_suite()
        if not args.quick:
            run_browser_suite(required=args.all)
    print("\nOK — suíte de regressão concluída.")


if __name__ == "__main__":
    main()
