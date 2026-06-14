from rapidfuzz import process, fuzz

from src.config import ALIASES_MEMBROS, CORRECOES_OCR_NOMES, NOMES_VALIDOS, STATUS_NOME_CORRIGIDO, STATUS_REVISAR
from src.utils.text_cleaning import limpar_nome


def _normalizar_chave(texto: str) -> str:
    return limpar_nome(texto).casefold()


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


def corrigir_nome(texto_ocr: str) -> tuple[str, str]:
    """Corrige nome lido por OCR usando correções diretas, aliases e fuzzy matching."""
    texto_limpo = limpar_nome(texto_ocr)
    if not texto_limpo:
        return ("", STATUS_REVISAR)

    mapa_alias = _mapa_aliases()
    chave = _normalizar_chave(texto_limpo)

    # Correção exata por alias/correção manual.
    if chave in mapa_alias:
        nome = mapa_alias[chave]
        status = "" if nome == texto_limpo else STATUS_NOME_CORRIGIDO
        return (nome, status)

    # Evita forçar fuzzy em leituras curtas demais: elas são muito ambíguas.
    if len(texto_limpo) <= 2:
        return (texto_limpo, STATUS_REVISAR)

    # Candidatos incluem nomes oficiais e aliases, mas retornam nome oficial.
    candidatos = list(mapa_alias.keys())

    scorers = [
        (fuzz.WRatio, 82),
        (fuzz.token_set_ratio, 78),
        (fuzz.partial_ratio, 82),
        (fuzz.ratio, 72),
    ]

    for scorer, limiar in scorers:
        resultado = process.extractOne(chave, candidatos, scorer=scorer)
        if not resultado:
            continue
        melhor_chave, similaridade, _ = resultado
        if similaridade >= limiar:
            nome_corrigido = mapa_alias[melhor_chave]
            status = "" if _normalizar_chave(nome_corrigido) == chave else STATUS_NOME_CORRIGIDO
            return (nome_corrigido, status)

    return (texto_limpo, STATUS_REVISAR)
