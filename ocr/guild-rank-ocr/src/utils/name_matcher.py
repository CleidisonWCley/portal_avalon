from functools import lru_cache

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


@lru_cache(maxsize=1)
def _mapa_aliases() -> dict[str, str]:
    mapa = {}
    for nome in NOMES_VALIDOS:
        mapa[_normalizar_chave(nome)] = nome
    for nome_oficial, aliases in ALIASES_MEMBROS.items():
        mapa[_normalizar_chave(nome_oficial)] = nome_oficial
        for alias in aliases:
            mapa[_normalizar_chave(alias)] = nome_oficial
    for leitura, nome in CORRECOES_OCR_NOMES.items():
        mapa[_normalizar_chave(leitura)] = nome
    return mapa


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


def corrigir_nome(texto_ocr: str) -> tuple[str, str]:
    """Corrige nomes sem permitir que aliases curtos contaminem o fuzzy."""
    texto_limpo = limpar_nome(texto_ocr)
    if not texto_limpo:
        return ("", STATUS_REVISAR)

    mapa_alias = _mapa_aliases()
    chave = _normalizar_chave(texto_limpo)

    # Alias curto continua útil, mas apenas quando o OCR o lê exatamente.
    if chave in mapa_alias:
        nome = mapa_alias[chave]
        status = "" if _normalizar_chave(nome) == chave else STATUS_NOME_CORRIGIDO
        return (nome, status)

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
        return (mapa_alias[aparada], STATUS_NOME_CORRIGIDO)

    if len(chave) <= 2:
        return (texto_limpo, STATUS_REVISAR)

    candidatos = _candidatos_fuzzy(mapa_alias, chave)
    if not candidatos:
        return (texto_limpo, STATUS_REVISAR)

    # WRatio é mais estável para as variações observadas. Exigimos diferença
    # clara para o segundo colocado, evitando aceitar resultados ambíguos.
    resultados = process.extract(chave, candidatos, scorer=fuzz.WRatio, limit=2)
    if not resultados:
        return (texto_limpo, STATUS_REVISAR)

    melhor_chave, melhor_score, _ = resultados[0]
    segundo_score = resultados[1][1] if len(resultados) > 1 else 0
    limiar = 82 if len(chave) >= 5 else 88

    if melhor_score < limiar or melhor_score - segundo_score < 5:
        return (texto_limpo, STATUS_REVISAR)

    nome_corrigido = mapa_alias[melhor_chave]
    status = "" if _normalizar_chave(nome_corrigido) == chave else STATUS_NOME_CORRIGIDO
    return (nome_corrigido, status)
