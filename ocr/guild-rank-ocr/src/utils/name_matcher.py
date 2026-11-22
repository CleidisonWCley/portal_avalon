from __future__ import annotations

from functools import lru_cache
from typing import Iterable

from rapidfuzz import fuzz, process

from src.config import (
    ALIASES_MEMBROS,
    CORRECOES_OCR_NOMES,
    NOMES_VALIDOS,
    STATUS_NOME_CORRIGIDO,
    STATUS_REVISAR,
)
from src.utils.text_cleaning import limpar_nome


def _normalizar_chave(texto: str) -> str:
    return limpar_nome(texto).casefold()


@lru_cache(maxsize=32)
def _mapa_aliases_para(nomes: tuple[str, ...], usar_aliases: bool = True) -> dict[str, str]:
    """Mapa chave-normalizada -> nome oficial, restrito ao elenco informado.

    Aliases e correções só valem para membros que fazem parte do elenco: um
    alias de quem já saiu da guilda não pode "roubar" a leitura de outra linha.
    """
    permitidos = set(nomes)
    mapa: dict[str, str] = {}
    for nome in nomes:
        mapa[_normalizar_chave(nome)] = nome
    if not usar_aliases:
        return mapa
    for nome_oficial, aliases in ALIASES_MEMBROS.items():
        if nome_oficial not in permitidos:
            continue
        mapa[_normalizar_chave(nome_oficial)] = nome_oficial
        for alias in aliases:
            mapa[_normalizar_chave(alias)] = nome_oficial
    for leitura, nome in CORRECOES_OCR_NOMES.items():
        if nome in permitidos:
            mapa[_normalizar_chave(leitura)] = nome
    return mapa


def _mapa_aliases(nomes: Iterable[str] | None = None, usar_aliases: bool = True) -> dict[str, str]:
    base = NOMES_VALIDOS if nomes is None else nomes
    return _mapa_aliases_para(tuple(dict.fromkeys(base)), usar_aliases)


def _candidatos_fuzzy(mapa_alias: dict[str, str], chave: str) -> list[str]:
    """Remove aliases curtos e candidatos com tamanho incompatível."""
    candidatos = []
    tamanho = len(chave)
    for candidato in mapa_alias:
        if len(candidato) < 3:
            continue
        # Evita que um ruído curto seja associado a um nome muito diferente.
        tolerancia = max(2, round(max(tamanho, len(candidato)) * 0.45))
        if abs(len(candidato) - tamanho) > tolerancia:
            continue
        candidatos.append(candidato)
    return candidatos


def corrigir_nome_detalhado(
    texto_ocr: str,
    nomes_validos: Iterable[str] | None = None,
    permitir_fuzzy: bool = True,
    usar_aliases: bool = True,
) -> dict:
    """Resolve um nome lido pelo OCR contra um elenco e explica como decidiu.

    Devolve ``{"nome", "status", "metodo", "score"}``. ``metodo`` é um de
    ``exato``, ``alias``, ``aparado``, ``fuzzy`` ou ``nenhum``. O fuzzy pode
    ser desligado (``permitir_fuzzy=False``) e os aliases também
    (``usar_aliases=False``) para camadas em que só o nome oficial exato é
    seguro, como a busca por retornantes: um ruído curto não pode "ressuscitar"
    um ex-membro por causa de um alias antigo.
    """
    texto_limpo = limpar_nome(texto_ocr)
    nao_resolvido = {"nome": texto_limpo, "status": STATUS_REVISAR, "metodo": "nenhum", "score": 0.0}
    if not texto_limpo:
        return {**nao_resolvido, "nome": ""}

    mapa_alias = _mapa_aliases(nomes_validos, usar_aliases)
    chave = _normalizar_chave(texto_limpo)

    # Alias curto continua útil, mas apenas quando o OCR o lê exatamente.
    if chave in mapa_alias:
        nome = mapa_alias[chave]
        igual = _normalizar_chave(nome) == chave
        return {
            "nome": nome,
            "status": "" if igual else STATUS_NOME_CORRIGIDO,
            "metodo": "exato" if igual else "alias",
            "score": 100.0,
        }

    # Ruído de borda do recorte (ex.: "| Gashak", "PPeSH ."): se, descartando
    # palavras soltas de 1 caractere nas pontas, sobra um nome exato do elenco,
    # ele é aceito. Só vale para correspondência exata, nunca para fuzzy.
    palavras = texto_limpo.split()
    while len(palavras) > 1 and len(palavras[0]) == 1:
        palavras = palavras[1:]
    while len(palavras) > 1 and len(palavras[-1]) == 1:
        palavras = palavras[:-1]
    aparada = _normalizar_chave(" ".join(palavras))
    if aparada != chave and len(aparada) > 2 and aparada in mapa_alias:
        return {"nome": mapa_alias[aparada], "status": STATUS_NOME_CORRIGIDO, "metodo": "aparado", "score": 95.0}

    if not permitir_fuzzy or len(chave) <= 2:
        return nao_resolvido

    candidatos = _candidatos_fuzzy(mapa_alias, chave)
    if not candidatos:
        return nao_resolvido

    # WRatio é mais estável para as variações observadas. Exigimos diferença
    # clara para o segundo colocado, evitando aceitar resultados ambíguos.
    resultados = process.extract(chave, candidatos, scorer=fuzz.WRatio, limit=2)
    if not resultados:
        return nao_resolvido

    melhor_chave, melhor_score, _ = resultados[0]
    segundo_score = resultados[1][1] if len(resultados) > 1 else 0
    limiar = 82 if len(chave) >= 5 else 88

    if melhor_score < limiar or melhor_score - segundo_score < 5:
        return {**nao_resolvido, "score": float(melhor_score)}

    nome_corrigido = mapa_alias[melhor_chave]
    igual = _normalizar_chave(nome_corrigido) == chave
    return {
        "nome": nome_corrigido,
        "status": "" if igual else STATUS_NOME_CORRIGIDO,
        "metodo": "fuzzy",
        "score": float(melhor_score),
    }


def corrigir_nome(texto_ocr: str, nomes_validos: Iterable[str] | None = None) -> tuple[str, str]:
    """Corrige nomes sem permitir que aliases curtos contaminem o fuzzy.

    Compatível com o uso antigo: sem ``nomes_validos`` usa ``NOMES_VALIDOS``.
    """
    resultado = corrigir_nome_detalhado(texto_ocr, nomes_validos)
    return resultado["nome"], resultado["status"]


def corrigir_nome_em_camadas(texto_ocr: str, camadas: list[tuple]) -> dict:
    """Tenta cada camada na ordem e devolve a primeira que resolve.

    Cada camada é ``(elenco, permitir_fuzzy)`` ou ``(elenco, permitir_fuzzy,
    usar_aliases)``. O resultado inclui ``camada`` (índice da camada que
    resolveu, ou ``None``).
    """
    ultimo = {"nome": limpar_nome(texto_ocr), "status": STATUS_REVISAR, "metodo": "nenhum", "score": 0.0}
    for indice, camada in enumerate(camadas):
        nomes, fuzzy = camada[0], camada[1]
        aliases = camada[2] if len(camada) > 2 else True
        resultado = corrigir_nome_detalhado(texto_ocr, nomes, permitir_fuzzy=fuzzy, usar_aliases=aliases)
        if resultado["status"] != STATUS_REVISAR:
            return {**resultado, "camada": indice}
        ultimo = resultado
    return {**ultimo, "camada": None}
