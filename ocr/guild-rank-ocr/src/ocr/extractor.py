import os
import re
import shutil
from pathlib import Path

import cv2
import pytesseract

from src.utils.text_cleaning import limpar_campo
from src.utils.name_matcher import corrigir_nome
from src.config import (
    ALTURA_BASE,
    DANO_MAXIMO_PLAUSIVEL,
    DANO_MINIMO_PARA_VALIDACAO,
    DEBUG_DIR,
    GERAR_DEBUG_CROPS,
    INCREMENTO_Y_BASE,
    LARGURA_BASE,
    NUMERO_LINHAS,
    OCR_LANG,
    REGIOES_BASE_PIXELS,
    STATUS_DANO_SUSPEITO,
    STATUS_FREQUENCIA_SUSPEITA,
    STATUS_REVISAR,
    TESSERACT_CMD_WINDOWS,
)


def configurar_tesseract() -> None:
    """Localiza o executável do Tesseract de forma portátil."""
    candidatos = [
        os.environ.get("TESSERACT_CMD"),
        shutil.which("tesseract"),
        TESSERACT_CMD_WINDOWS,
    ]

    for candidato in candidatos:
        if candidato and Path(candidato).exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidato)
            return

    # Se estiver no PATH, pytesseract ainda pode funcionar.
    if shutil.which("tesseract"):
        return


configurar_tesseract()


def juntar_status(status_atual: str, novo_status: str) -> str:
    if not novo_status:
        return status_atual or ""
    if not status_atual:
        return novo_status
    partes = [p.strip() for p in status_atual.split(";") if p.strip()]
    if novo_status not in partes:
        partes.append(novo_status)
    return ";".join(partes)


def escalar_regioes(largura_img: int, altura_img: int) -> tuple[dict, int]:
    """Escala as coordenadas do OCR conforme a resolução da imagem."""
    escala_x = largura_img / LARGURA_BASE
    escala_y = altura_img / ALTURA_BASE

    regioes_escaladas = {}
    for campo, (x, y, w, h) in REGIOES_BASE_PIXELS.items():
        regioes_escaladas[campo] = (
            int(round(x * escala_x)),
            int(round(y * escala_y)),
            int(round(w * escala_x)),
            int(round(h * escala_y)),
        )

    incremento_y = int(round(INCREMENTO_Y_BASE * escala_y))
    return regioes_escaladas, incremento_y


def recortar_area(img, x: int, y: int, w: int, h: int):
    """Recorta com proteção contra coordenadas fora da imagem."""
    altura_img, largura_img = img.shape[:2]
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(largura_img, x + w)
    y2 = min(altura_img, y + h)
    if x1 >= x2 or y1 >= y2:
        return None
    return img[y1:y2, x1:x2]


def preparar_variantes(recorte):
    """Gera poucas variações de pré-processamento para manter o OCR rápido."""
    if recorte is None or recorte.size == 0:
        return []

    gray = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    variantes = []

    # Variante 1: cinza ampliado. Geralmente funciona melhor nos números do GT.
    up_gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    up_gray = cv2.copyMakeBorder(up_gray, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=0)
    variantes.append(("gray2x", up_gray))

    # Variante 2: binarização OTSU ampliada. Ajuda quando o fundo confunde o OCR.
    _, binaria = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    up_bin = cv2.resize(binaria, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    up_bin = cv2.copyMakeBorder(up_bin, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=0)
    variantes.append(("otsu2x", up_bin))

    return variantes

def _somente_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")


def _frequencia_valida(freq: str) -> bool:
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})", freq or "")
    if not m:
        return False
    feitos = int(m.group(1))
    total = int(m.group(2))
    return total == 21 and 0 <= feitos <= 21


def _dano_valido(dano: str) -> bool:
    try:
        valor = int(_somente_digitos(dano) or 0)
    except ValueError:
        return False
    return DANO_MINIMO_PARA_VALIDACAO <= valor <= DANO_MAXIMO_PLAUSIVEL


def escolher_melhor_texto(campo: str, resultados: list[str]) -> str:
    """Seleciona o resultado OCR mais plausível entre várias tentativas."""
    resultados = [r.strip() for r in resultados if r and r.strip()]
    if not resultados:
        return ""

    if campo == "frequencia":
        limpos = [limpar_campo("frequencia", r) for r in resultados]
        for freq in limpos:
            if _frequencia_valida(freq):
                return freq
        # fallback: tenta reconstruir a partir dos últimos 4 dígitos, quando possível.
        for freq in limpos:
            dig = _somente_digitos(freq)
            if len(dig) >= 3 and dig.endswith("21"):
                feitos = dig[:-2][-2:].lstrip("0") or "0"
                candidato = f"{feitos}/21"
                if _frequencia_valida(candidato):
                    return candidato
        return limpos[0]

    if campo == "dano":
        candidatos = []
        for r in resultados:
            dano = limpar_campo("dano", r)
            dig = _somente_digitos(dano)
            if dig:
                candidatos.append(dig)
        if not candidatos:
            return "0"
        # Preferir danos plausíveis com mais dígitos.
        plausiveis = [c for c in candidatos if _dano_valido(c)]
        if plausiveis:
            return max(plausiveis, key=lambda x: (len(x), int(x)))
        return max(candidatos, key=lambda x: (len(x), int(x or 0)))

    # nome: preferir texto mais informativo, depois o matcher decide.
    return max(resultados, key=len)


def ocr_recorte(recorte, campo: str) -> str:
    """Executa a segunda variante somente quando a primeira não é suficiente."""
    if recorte is None or recorte.size == 0:
        return ""

    if campo == "nome":
        configs = ["--psm 8"]
    elif campo == "frequencia":
        configs = ["--psm 7 -c tessedit_char_whitelist=0123456789/"]
    elif campo == "dano":
        configs = ["--psm 7 -c tessedit_char_whitelist=0123456789., "]
    else:
        configs = ["--psm 7"]

    resultados = []
    for _, variante in preparar_variantes(recorte):
        for config in configs:
            try:
                texto = pytesseract.image_to_string(variante, config=config, lang=OCR_LANG).strip()
            except pytesseract.TesseractError:
                texto = ""
            if not texto:
                continue
            resultados.append(texto)

            if campo == "frequencia" and _frequencia_valida(limpar_campo(campo, texto)):
                return limpar_campo(campo, texto)
            if campo == "dano" and _dano_valido(limpar_campo(campo, texto)):
                return limpar_campo(campo, texto)
            if campo == "nome":
                _, status = corrigir_nome(texto)
                if status != STATUS_REVISAR:
                    return texto

    return escolher_melhor_texto(campo, resultados)

def salvar_debug_crop(nome_imagem: str, linha: int, campo: str, recorte) -> None:
    if not GERAR_DEBUG_CROPS or recorte is None:
        return
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    saida = DEBUG_DIR / f"{Path(nome_imagem).stem}_linha{linha:02d}_{campo}.png"
    cv2.imwrite(str(saida), recorte)


def validar_linha(linha_dados: dict) -> dict:
    status = linha_dados.get("status", "")

    nome = linha_dados.get("nome", "")
    frequencia = linha_dados.get("frequencia", "")
    dano = linha_dados.get("dano", "")

    if not nome or nome.lower() in {"membro", "mestre da", "oficial"}:
        status = juntar_status(status, STATUS_REVISAR)

    if not _frequencia_valida(frequencia):
        status = juntar_status(status, STATUS_FREQUENCIA_SUSPEITA)

    if not _dano_valido(dano):
        status = juntar_status(status, STATUS_DANO_SUSPEITO)

    linha_dados["status"] = status
    return linha_dados


def processar_imagem(caminho_imagem: str, numero_linhas: int = NUMERO_LINHAS) -> list[dict]:
    img = cv2.imread(caminho_imagem)
    if img is None:
        print(f"[ERRO] Não foi possível abrir a imagem: {caminho_imagem}")
        return []

    altura_img, largura_img = img.shape[:2]
    regioes_escaladas, incremento_y = escalar_regioes(largura_img, altura_img)

    dados_extraidos = []
    nome_imagem = Path(caminho_imagem).name

    print(f"\nProcessando: {nome_imagem} ({largura_img}x{altura_img})")

    for indice_linha in range(1, numero_linhas + 1):
        i = indice_linha - 1
        linha_dados = {
            "imagem_origem": nome_imagem,
            "linha": indice_linha,
        }

        for campo, (x, y, w, h) in regioes_escaladas.items():
            y_atual = y + (incremento_y * i)
            recorte = recortar_area(img, x, y_atual, w, h)
            salvar_debug_crop(nome_imagem, indice_linha, campo, recorte)

            texto = ocr_recorte(recorte, campo)

            if campo == "nome":
                nome_corrigido, status = corrigir_nome(texto)
                linha_dados["nome"] = nome_corrigido
                linha_dados["status"] = status
            else:
                linha_dados[campo] = limpar_campo(campo, texto)

        linha_dados = validar_linha(linha_dados)
        dados_extraidos.append(linha_dados)

        status_display = f" [{linha_dados['status']}]" if linha_dados.get("status") else ""
        print(
            f"{linha_dados.get('nome', 'VAZIO'):14} | "
            f"{linha_dados.get('frequencia', 'N/A'):5} | "
            f"{linha_dados.get('dano', '0'):15}"
            f"{status_display}"
        )

    return dados_extraidos
