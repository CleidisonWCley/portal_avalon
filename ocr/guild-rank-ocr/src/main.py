from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from src.config import (
    CAPACIDADE_GUILDA,
    EXTENSOES_IMAGEM,
    MAXIMO_IMAGENS,
    NUMERO_LINHAS,
    PADRAO_NOME_IMAGEM,
)
from src.ocr.extractor import processar_imagem
from src.utils.export import exportar_csv
from src.utils.postprocess import salvar_json, tratar_dados_ocr, validar_dados_tratados
from src.utils.review import aplicar_correcoes_raid, correcoes_da_raid


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Processa screenshots de Raid da Avalon com saída identificada por número."
    )
    parser.add_argument("--raid", required=True, type=int, help="Número oficial da raid, ex.: 133")
    parser.add_argument("--ended-at", required=True, help="Data de encerramento no formato AAAA-MM-DD")
    parser.add_argument("--source", choices=["official", "estimated"], default="official")
    parser.add_argument("--images-dir", type=Path, default=Path("images"))
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--force", action="store_true", help="Sobrescreve arquivos já existentes da mesma raid")
    return parser.parse_args()


def validar_data(valor: str) -> str:
    try:
        return date.fromisoformat(valor).isoformat()
    except ValueError as exc:
        raise ValueError("--ended-at deve usar o formato AAAA-MM-DD") from exc


def numero_pagina(caminho: Path) -> int:
    match = re.fullmatch(PADRAO_NOME_IMAGEM, caminho.name, flags=re.IGNORECASE)
    if not match:
        raise ValueError(f"Nome de imagem inválido: {caminho.name}")
    return int(match.group(1))


def listar_imagens(pasta: Path) -> list[Path]:
    if not pasta.exists():
        raise ValueError(f"Pasta de imagens não encontrada: {pasta}")

    arquivos_imagem = [
        item for item in pasta.iterdir()
        if item.is_file() and item.suffix.lower() in EXTENSOES_IMAGEM
    ]
    invalidas = [item.name for item in arquivos_imagem if not re.fullmatch(PADRAO_NOME_IMAGEM, item.name, re.IGNORECASE)]
    if invalidas:
        raise ValueError("Imagens com nomes inesperados: " + ", ".join(sorted(invalidas)))

    imagens = sorted(arquivos_imagem, key=numero_pagina)
    if not imagens:
        raise ValueError("Nenhuma imagem encontrada na pasta images/")
    if len(imagens) > MAXIMO_IMAGENS:
        raise ValueError(f"Máximo de {MAXIMO_IMAGENS} imagens excedido.")

    paginas = [numero_pagina(item) for item in imagens]
    esperadas = list(range(1, len(imagens) + 1))
    if paginas != esperadas:
        raise ValueError(f"Sequência de imagens inválida. Encontrado {paginas}; esperado {esperadas}.")
    return imagens


def linhas_da_pagina(pagina: int) -> int:
    inicio = (pagina - 1) * NUMERO_LINHAS
    restantes = CAPACIDADE_GUILDA - inicio
    return max(0, min(NUMERO_LINHAS, restantes))


def caminhos_saida(output_dir: Path, raid_numero: int) -> dict[str, Path]:
    prefixo = f"raid_{raid_numero}"
    return {
        "bruto": output_dir / "csv" / f"{prefixo}_bruto.csv",
        "revisado": output_dir / "csv" / f"{prefixo}_revisado.csv",
        "json": output_dir / "json" / f"{prefixo}.json",
        "relatorio": output_dir / "json" / f"{prefixo}_relatorio.json",
    }


def garantir_saida_livre(caminhos: dict[str, Path], force: bool) -> None:
    existentes = [str(caminho) for caminho in caminhos.values() if caminho.exists()]
    if existentes and not force:
        raise FileExistsError(
            "A raid já possui arquivos processados. Use --force somente após conferir:\n- "
            + "\n- ".join(existentes)
        )


def salvar_relatorio(caminho: Path, relatorio: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    args = parse_args()
    try:
        ended_at = validar_data(args.ended_at)
        imagens = listar_imagens(args.images_dir)
        saidas = caminhos_saida(args.output_dir, args.raid)
        garantir_saida_livre(saidas, args.force)
    except (ValueError, FileExistsError) as exc:
        print(f"[BLOQUEADO] {exc}")
        return 2

    correcoes = correcoes_da_raid(args.raid)
    if correcoes:
        print(f"Correções revisadas carregadas exclusivamente para a Raid {args.raid}: {len(correcoes)}")
    else:
        print(f"Nenhuma correção revisada cadastrada para a Raid {args.raid}.")

    todos_dados = []
    for imagem in imagens:
        pagina = numero_pagina(imagem)
        dados = processar_imagem(str(imagem), numero_linhas=linhas_da_pagina(pagina))
        todos_dados.extend(dados)
        print()

    if not todos_dados:
        print("Nenhum dado extraído das imagens.")
        return 2

    print("-" * 70)
    print("EXPORTAÇÃO BRUTA DO OCR")
    exportar_csv(todos_dados, nome_arquivo=saidas["bruto"].name, pasta_saida=str(saidas["bruto"].parent))

    print("-" * 70)
    print(f"REVISÃO VINCULADA À RAID {args.raid}")
    registros_revisados, correcoes_aplicadas = aplicar_correcoes_raid(todos_dados, args.raid)
    metadata = {
        "raidNumber": args.raid,
        "endedAt": ended_at,
        "source": args.source,
    }
    dados_tratados = tratar_dados_ocr(registros_revisados, metadata=metadata)
    erros = validar_dados_tratados(dados_tratados)

    exportar_csv(
        dados_tratados["membros"],
        nome_arquivo=saidas["revisado"].name,
        pasta_saida=str(saidas["revisado"].parent),
    )
    salvar_json(dados_tratados, saidas["json"])

    resumo = dados_tratados["resumo"]
    relatorio = {
        "raidNumber": args.raid,
        "endedAt": ended_at,
        "source": args.source,
        "status": "validada" if not erros else "revisao_pendente",
        "promovida": False,
        "imagens": [imagem.name for imagem in imagens],
        "linhasProcessadas": len(todos_dados),
        "participantes": resumo["participantes"],
        "ausentes": resumo["ausentes"],
        "danoTotal": resumo["dano_total_guilda"],
        "registrosCorrigidos": len(correcoes_aplicadas),
        "registrosPendentes": resumo["registros_revisar"],
        "duplicadosDetectados": resumo["duplicados_detectados"],
        "erros": erros,
        "correcoesAplicadas": correcoes_aplicadas,
    }
    salvar_relatorio(saidas["relatorio"], relatorio)

    print("-" * 70)
    print(f"Raid: {args.raid}")
    print(f"Encerramento: {ended_at}")
    print(f"Fonte: {args.source}")
    print(f"Participantes: {resumo['participantes']}")
    print(f"Ausentes: {resumo['ausentes']}")
    print(f"Dano total: {resumo['dano_total_guilda']}")
    print(f"Registros corrigidos: {len(correcoes_aplicadas)}")
    print(f"Registros pendentes: {resumo['registros_revisar']}")
    print(f"Status: {relatorio['status']}")
    print(f"JSON oficial: {saidas['json']}")

    if erros:
        for erro in erros:
            print(f"[ERRO] {erro}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
