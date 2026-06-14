import re


def limpar_nome(texto: str) -> str:
    """Limpa ruídos do OCR mantendo letras, números, underscore e caracteres japoneses."""
    if not texto:
        return ""

    texto = str(texto)
    texto = texto.replace("\n", " ").replace("\r", " ")

    # Remove blocos comuns de nível/cargo quando entram no recorte do nome.
    texto = re.sub(r"Nv\.?\s*\d+", " ", texto, flags=re.IGNORECASE)
    texto = re.sub(r"N[vV]\.?\s*\d+", " ", texto)
    texto = re.sub(r"\b(Membro|Oficial|Mestre\s+da\s+Guilda)\b", " ", texto, flags=re.IGNORECASE)

    # Remove conteúdo entre parênteses/colchetes/chaves.
    texto = re.sub(r"[\(\[\{].*?[\)\]\}]", " ", texto)

    # Mantém caracteres comuns em nicks e japonês.
    texto = re.sub(r"[^\w\u3040-\u30ff\u4e00-\u9fff]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def limpar_frequencia(texto: str) -> str:
    if not texto:
        return ""

    texto = str(texto)
    texto = texto.replace("I", "1").replace("l", "1").replace("O", "0")
    texto = re.sub(r"[^\d/]", "", texto)

    # Tenta capturar algo como 21/21 dentro de ruído.
    m = re.search(r"(\d{1,2})/(\d{1,2})", texto)
    if m:
        return f"{m.group(1)}/{m.group(2)}"

    # Casos em que OCR cola números demais. Ex.: 12121 -> 21/21 pode aparecer errado.
    return texto


def limpar_dano(texto: str) -> str:
    if not texto:
        return "0"

    # Mantém só dígitos. Pontos/vírgulas são separadores visuais.
    somente_digitos = re.sub(r"\D", "", str(texto))
    return somente_digitos if somente_digitos else "0"


def limpar_campo(campo: str, texto: str) -> str:
    if campo == "nome":
        return limpar_nome(texto)
    if campo == "frequencia":
        return limpar_frequencia(texto)
    if campo == "dano":
        return limpar_dano(texto)
    return str(texto).strip() if texto else ""
