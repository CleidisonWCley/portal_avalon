"""Gera (ou atualiza) o modelo visual de um nome a partir de um screenshot oficial.

Use quando um membro tiver nome que o Tesseract não lê (japonês, kanji ou
símbolos), ou para trocar um modelo que deixou de casar:

    python -m src.gerar_modelos_nomes --imagem images/img1.jpg --linha 6 --nome ヴァルディネイ

O nome precisa estar em ``MODELOS_NOMES`` (src/config.py), que associa o nome
oficial ao arquivo PNG em ``assets/nomes``. ``--linha`` é a posição da linha
dentro do screenshot (de cima para baixo; 1 a 7 no tablet, 1 a 6 no celular).
O perfil (tablet ou celular) é detectado pela proporção da imagem. Use
``--listar`` para ver os modelos existentes.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2

from src.config import DIR_MODELOS_NOMES, MODELOS_NOMES
from src.ocr.modelos_nomes import _arquivos_do_nome
from src.ocr.extractor import detectar_ancoras_linhas, perfil_da_imagem, recortes_da_linha
from src.ocr.modelos_nomes import caixa_do_texto


# Fundo mantido em volta do texto ao salvar o modelo (ver caixa_do_texto).
MARGEM_MODELO_PX = 4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--imagem", type=Path, help="Screenshot oficial que contém o nome")
    parser.add_argument("--linha", type=int, help="Linha do screenshot (1 = primeira de cima)")
    parser.add_argument("--nome", help="Nome oficial, exatamente como em MODELOS_NOMES")
    parser.add_argument(
        "--arquivo",
        help="Qual arquivo do nome gravar quando ele tem vários modelos (padrão: o primeiro)",
    )
    parser.add_argument("--listar", action="store_true", help="Lista modelos cadastrados e presentes")
    return parser.parse_args()


def listar() -> int:
    for nome, arquivos in MODELOS_NOMES.items():
        for arquivo in _arquivos_do_nome(arquivos):
            existe = (Path(DIR_MODELOS_NOMES) / arquivo).exists()
            print(f"{'OK     ' if existe else 'AUSENTE'} | {nome} -> {arquivo}")
    return 0


def main() -> int:
    args = parse_args()
    if args.listar:
        return listar()
    if not (args.imagem and args.linha and args.nome):
        print("[ERRO] Informe --imagem, --linha e --nome (ou use --listar).")
        return 2
    if args.nome not in MODELOS_NOMES:
        print(f"[ERRO] '{args.nome}' não está em MODELOS_NOMES (src/config.py). Cadastre o nome e o arquivo PNG antes.")
        return 2

    img = cv2.imread(str(args.imagem))
    if img is None:
        print(f"[ERRO] Não foi possível abrir {args.imagem}")
        return 2

    perfil = perfil_da_imagem(img.shape[1], img.shape[0])
    ancoras = detectar_ancoras_linhas(img, perfil)
    if not 1 <= args.linha <= len(ancoras):
        print(f"[ERRO] A imagem tem {len(ancoras)} linha(s) detectada(s); --linha deve estar entre 1 e {len(ancoras)}.")
        return 2

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    recorte = recortes_da_linha(img, hsv, ancoras[args.linha - 1], perfil)["nome"]
    cinza = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    caixa = caixa_do_texto(cinza, margem=MARGEM_MODELO_PX)
    if caixa is None:
        print("[ERRO] Nenhum texto claro encontrado nessa linha. Confira a imagem e o número da linha.")
        return 2

    arquivos = _arquivos_do_nome(MODELOS_NOMES[args.nome])
    arquivo = args.arquivo or arquivos[0]
    if arquivo not in arquivos:
        print(f"[ERRO] '{arquivo}' não está entre os arquivos de '{args.nome}': {', '.join(arquivos)}")
        return 2
    destino = Path(DIR_MODELOS_NOMES) / arquivo
    destino.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(destino), caixa)
    print(f"Modelo de '{args.nome}' salvo em {destino} ({caixa.shape[1]}x{caixa.shape[0]} px)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
