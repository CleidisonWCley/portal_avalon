"""Reconhecimento visual de nomes que o Tesseract (idioma "eng") não consegue ler.

Nomes em japonês (ヴァルディネイ, カミナリ) e com kanji (MJ馬McQueen) viravam lixo
de OCR e obrigavam o projeto a acumular aliases como "Eee eeed" ou "oey ime,".
Aqui o recorte do nome é comparado, como imagem, com um recorte de referência
guardado em ``assets/nomes``. O jogo desenha a mesma fonte sempre, então a
correlação fica próxima de 1,0 para o nome certo e perto de 0 para os demais.

O módulo é conservador de propósito: só devolve um nome quando a correlação
passa do limiar E existe margem sobre o segundo colocado. Qualquer dúvida
devolve ``None`` e o fluxo normal (OCR de texto + revisão manual) continua.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

from src.config import (
    ALTURA_NORMALIZADA_NOME,
    DIR_MODELOS_NOMES,
    LIMIAR_MODELO_NOME,
    MARGEM_MODELO_NOME,
    MODELOS_NOMES,
)

# O limiar de "texto" é relativo ao contraste de cada recorte: fundo (mediana)
# + FRACAO_TEXTO da distância até o pixel mais claro. Um corte fixo (ex.: 200)
# falha com a fonte japonesa, mais fina e menos branca (máx. ~230, com só
# ~20 pixels acima de 200), e com o fundo mais claro das linhas de baixo.
FRACAO_TEXTO = 0.55
# Sem contraste mínimo entre fundo e texto não há nome a reconhecer.
CONTRASTE_MINIMO = 60
# Poucos pixels de texto significam recorte vazio ou ruído.
PIXELS_TEXTO_MINIMOS = 20
# Tolerância de largura entre candidato e modelo (após normalizar a altura).
TOLERANCIA_LARGURA = 0.12
TOLERANCIA_LARGURA_MINIMA_PX = 4


def caixa_do_texto(recorte_cinza):
    """Recorta o retângulo mínimo que contém o texto claro do nome."""
    if recorte_cinza is None or recorte_cinza.size == 0:
        return None
    fundo = float(np.median(recorte_cinza))
    brilho = float(recorte_cinza.max())
    if brilho - fundo < CONTRASTE_MINIMO:
        return None
    limiar = fundo + FRACAO_TEXTO * (brilho - fundo)
    ys, xs = np.where(recorte_cinza > limiar)
    if xs.size < PIXELS_TEXTO_MINIMOS:
        return None
    return recorte_cinza[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def normalizar_nome(recorte_cinza, altura: int = ALTURA_NORMALIZADA_NOME):
    """Transforma o recorte em uma matriz comparável (altura fixa, 0-1, suavizada)."""
    caixa = caixa_do_texto(recorte_cinza)
    if caixa is None or caixa.shape[0] == 0:
        return None
    largura = max(1, int(round(caixa.shape[1] * altura / caixa.shape[0])))
    reduzida = cv2.resize(caixa, (largura, altura), interpolation=cv2.INTER_AREA).astype(np.float32)
    amplitude = float(reduzida.max() - reduzida.min())
    if amplitude <= 0:
        return None
    reduzida = (reduzida - reduzida.min()) / amplitude
    return cv2.GaussianBlur(reduzida, (3, 3), 0)


def correlacao(candidato, modelo) -> float:
    """Correlação de Pearson entre duas matrizes normalizadas (0 se larguras incompatíveis)."""
    if candidato is None or modelo is None:
        return 0.0
    tolerancia = max(TOLERANCIA_LARGURA_MINIMA_PX, TOLERANCIA_LARGURA * modelo.shape[1])
    if abs(candidato.shape[1] - modelo.shape[1]) > tolerancia:
        return 0.0
    candidato = cv2.resize(candidato, (modelo.shape[1], modelo.shape[0]), interpolation=cv2.INTER_AREA)
    x = candidato.ravel() - candidato.mean()
    y = modelo.ravel() - modelo.mean()
    denominador = float(np.sqrt((x * x).sum() * (y * y).sum()))
    if denominador == 0:
        return 0.0
    return float((x * y).sum() / denominador)


@lru_cache(maxsize=1)
def carregar_modelos(diretorio: str | None = None) -> dict:
    """Carrega os modelos disponíveis. Arquivos ausentes são ignorados sem erro."""
    pasta = Path(diretorio) if diretorio else Path(DIR_MODELOS_NOMES)
    modelos = {}
    for nome, arquivo in MODELOS_NOMES.items():
        caminho = pasta / arquivo
        if not caminho.exists():
            continue
        imagem = cv2.imread(str(caminho), cv2.IMREAD_GRAYSCALE)
        normalizado = normalizar_nome(imagem)
        if normalizado is not None:
            modelos[nome] = normalizado
    return modelos


def identificar_nome_visual(recorte_cinza, modelos: dict | None = None) -> tuple[str, float] | None:
    """Devolve (nome, correlação) quando o recorte casa com um modelo com segurança."""
    modelos = carregar_modelos() if modelos is None else modelos
    if not modelos:
        return None
    candidato = normalizar_nome(recorte_cinza)
    if candidato is None:
        return None

    pontuacoes = sorted(
        ((correlacao(candidato, modelo), nome) for nome, modelo in modelos.items()),
        reverse=True,
    )
    melhor_score, melhor_nome = pontuacoes[0]
    segundo_score = pontuacoes[1][0] if len(pontuacoes) > 1 else 0.0
    if melhor_score < LIMIAR_MODELO_NOME or melhor_score - segundo_score < MARGEM_MODELO_NOME:
        return None
    return melhor_nome, melhor_score
