import os
import re
import shutil
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
import pytesseract

from src.utils.text_cleaning import limpar_campo, limpar_nome
from src.utils.name_matcher import corrigir_nome, corrigir_nome_detalhado
from src.ocr.modelos_nomes import identificar_nome_visual
from src.config import (
    ALTURA_BASE_CELULAR,
    ALTURA_BASE_TABLET,
    ANCORAGEM_CELULAR,
    ANCORAGEM_TABLET,
    BADGE_NIVEL_CELULAR,
    BADGE_NIVEL_TABLET,
    DANO_MAXIMO_PLAUSIVEL,
    DANO_MINIMO_PARA_VALIDACAO,
    DEBUG_DIR,
    GERAR_DEBUG_CROPS,
    LARGURA_BASE_CELULAR,
    LARGURA_BASE_TABLET,
    LIMIAR_PROPORCAO_CELULAR,
    LIMITE_SUPERIOR_LINHA_CELULAR,
    LIMITE_SUPERIOR_LINHA_TABLET,
    NUMERO_LINHAS,
    NUMERO_LINHAS_CELULAR,
    NUMERO_LINHAS_TABLET,
    INCREMENTO_Y_BASE_CELULAR,
    INCREMENTO_Y_BASE_TABLET,
    OCR_LANG,
    REGIOES_ANCORADAS_CELULAR,
    REGIOES_ANCORADAS_TABLET,
    REGIOES_BASE_PIXELS_CELULAR,
    REGIOES_BASE_PIXELS_TABLET,
    STATUS_DANO_SUSPEITO,
    STATUS_FREQUENCIA_SUSPEITA,
    STATUS_REVISAR,
    TAMANHO_NOME_MAX,
    TAMANHO_NOME_MIN,
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


def selecionar_perfil(largura_img: int, altura_img: int) -> tuple[dict, int, int, int, int]:
    """Escolhe o perfil de calibração (tablet ou celular) pela proporção da imagem.

    Retorna (regioes_base_pixels, largura_base, altura_base, incremento_y_base, numero_linhas).
    """
    proporcao = largura_img / altura_img if altura_img else 0
    if proporcao >= LIMIAR_PROPORCAO_CELULAR:
        return (
            REGIOES_BASE_PIXELS_CELULAR,
            LARGURA_BASE_CELULAR,
            ALTURA_BASE_CELULAR,
            INCREMENTO_Y_BASE_CELULAR,
            NUMERO_LINHAS_CELULAR,
        )
    return (
        REGIOES_BASE_PIXELS_TABLET,
        LARGURA_BASE_TABLET,
        ALTURA_BASE_TABLET,
        INCREMENTO_Y_BASE_TABLET,
        NUMERO_LINHAS_TABLET,
    )


def escalar_regioes(largura_img: int, altura_img: int) -> tuple[dict, int]:
    """Escala as coordenadas do OCR conforme a resolução da imagem.

    O perfil de referência (tablet ou celular) é escolhido primeiro pela
    proporção da imagem, e só depois as coordenadas desse perfil são
    escaladas pela diferença de resolução dentro do mesmo formato — assim
    não misturamos proporções diferentes na mesma escala.
    """
    regioes_base, largura_base, altura_base, incremento_base, _ = selecionar_perfil(largura_img, altura_img)

    escala_x = largura_img / largura_base
    escala_y = altura_img / altura_base

    regioes_escaladas = {}
    for campo, (x, y, w, h) in regioes_base.items():
        regioes_escaladas[campo] = (
            int(round(x * escala_x)),
            int(round(y * escala_y)),
            int(round(w * escala_x)),
            int(round(h * escala_y)),
        )

    incremento_y = int(round(incremento_base * escala_y))
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
    """Gera poucas variações de pré-processamento para manter o OCR rápido.

    A ordem importa: o OCR para na primeira variante válida. A moldura em
    volta do recorte usa a cor do próprio fundo; uma moldura preta fixa
    reduzia a leitura da frequência de 28/28 para 21/28 nas linhas de fundo
    mais claro (o dígito inicial de "21/21" se perdia e virava "2/21").
    """
    if recorte is None or recorte.size == 0:
        return []

    gray = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY) if recorte.ndim == 3 else recorte
    cor_fundo = int(np.median(np.concatenate([gray[0], gray[-1]])))
    variantes = []

    # Variantes 1 e 2: cinza ampliado 2x e 3x, moldura na cor do fundo.
    for fator, moldura in ((2, 10), (3, 12)):
        ampliada = cv2.resize(gray, None, fx=fator, fy=fator, interpolation=cv2.INTER_CUBIC)
        ampliada = cv2.copyMakeBorder(
            ampliada, moldura, moldura, moldura, moldura, cv2.BORDER_CONSTANT, value=cor_fundo
        )
        variantes.append((f"gray{fator}x", ampliada))

    # Variante 3: binarização OTSU ampliada. Ajuda quando o fundo confunde o OCR.
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


# O dano aparece no jogo sempre agrupado de três em três dígitos (7.695.963.918).
# Um dígito a mais ou a menos (ex.: 352.257.517 lido como 3522575117) quebra
# esse agrupamento quando o texto bruto é preservado, e é o que permite
# rejeitar a leitura em vez de aceitar um dano 10x maior.
_PADRAO_DANO_AGRUPADO = re.compile(r"\d{1,3}(?:[.,\s]\d{3})+")


def _dano_estrutura_valida(texto_bruto: str) -> bool:
    return bool(_PADRAO_DANO_AGRUPADO.fullmatch((texto_bruto or "").strip()))


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
        # 1) Leituras com o agrupamento 1.234.567.890 íntegro são as confiáveis.
        agrupadas = [
            _somente_digitos(r) for r in resultados
            if _dano_estrutura_valida(r) and _dano_valido(_somente_digitos(r))
        ]
        if agrupadas:
            return Counter(agrupadas).most_common(1)[0][0]
        # 2) Sem nenhuma leitura íntegra, vale o voto da maioria entre as
        # variantes (empate: a primeira, que vem da variante mais confiável).
        # Preferir "mais dígitos" aqui era o que aceitava 3522575117.
        candidatos = [_somente_digitos(limpar_campo("dano", r)) for r in resultados]
        candidatos = [c for c in candidatos if c]
        if not candidatos:
            return "0"
        plausiveis = [c for c in candidatos if _dano_valido(c)] or candidatos
        contagem = Counter(plausiveis)
        melhor = max(contagem.values())
        return next(c for c in plausiveis if contagem[c] == melhor)

    # nome: preferir texto mais informativo, depois o matcher decide.
    return max(resultados, key=len)


def ocr_recorte_detalhado(recorte, campo: str, resolver_nome=None) -> tuple[str, bool]:
    """Lê um campo e informa se a leitura é confiável.

    Devolve ``(texto, confiavel)``. Para o dano, "confiável" exige o
    agrupamento de milhares íntegro; para frequência, o formato N/21; para
    nome, correspondência com o elenco sem precisar de revisão.
    """
    if recorte is None or recorte.size == 0:
        return "", False

    if campo == "nome":
        # psm 7 (linha única) foi o que mais acertou; psm 8 fica como reserva.
        configs = ["--psm 7", "--psm 8"]
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
                return limpar_campo(campo, texto), True
            if campo == "dano" and _dano_estrutura_valida(texto) and _dano_valido(limpar_campo(campo, texto)):
                return limpar_campo(campo, texto), True
            if campo == "nome":
                if resolver_nome is not None:
                    status = resolver_nome(texto)["status"]
                else:
                    _, status = corrigir_nome(texto)
                if status != STATUS_REVISAR:
                    return texto, True

    escolhido = escolher_melhor_texto(campo, resultados)
    return escolhido, False


def ocr_recorte(recorte, campo: str) -> str:
    """Compatibilidade: devolve só o texto lido (ver ``ocr_recorte_detalhado``)."""
    return ocr_recorte_detalhado(recorte, campo)[0]


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


def numero_linhas_padrao_para_imagem(caminho_imagem: str) -> int:
    """Descobre quantas linhas por página o perfil (tablet ou celular) dessa imagem comporta."""
    img = cv2.imread(caminho_imagem)
    if img is None:
        return NUMERO_LINHAS_TABLET
    altura_img, largura_img = img.shape[:2]
    _, _, _, _, numero_linhas = selecionar_perfil(largura_img, altura_img)
    return numero_linhas


# Margem entre o topo da caixa calibrada de "dano" e o topo real do texto,
# medida na imagem de referência do perfil celular (resolução base). Serve
# de referência pra saber "quanto texto deveria faltar" acima da caixa.
MARGEM_TOPO_DANO_CELULAR = 12


def detectar_deslocamento_y(img, regiao_dano_escalada: tuple, escala_y: float) -> int:
    """Detecta o desvio vertical da grade de linhas nesta imagem específica.

    O scroll da lista nem sempre para exatamente no início de uma linha —
    duas capturas da mesma tela podem ter a grade inteira deslocada em
    alguns pixels entre si, mesmo com o espaçamento entre linhas constante.
    Um deslocamento fixo (calibrado numa única imagem) não compensa isso.

    Localiza o topo real do texto na coluna de dano (maior contraste: branco
    sobre fundo escuro) perto de onde a primeira linha era esperada, e
    devolve a diferença a aplicar em todas as regiões. Se nada for
    detectado (imagem cortada, sem texto etc.), devolve 0 e o pipeline usa
    a calibração padrão sem ajuste.
    """
    x, y_esperado, w, h = regiao_dano_escalada
    altura_img = img.shape[0]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img

    # Busca numa janela generosa ao redor da posição esperada (a linha pode
    # estar mais acima ou mais abaixo do que a calibração prevê).
    busca_inicio = max(0, y_esperado - h)
    busca_fim = min(altura_img, y_esperado + h * 2)
    coluna = gray[busca_inicio:busca_fim, x:x + w]
    linhas_com_texto = np.where((coluna > 150).sum(axis=1) > 1)[0]
    if linhas_com_texto.size == 0:
        return 0

    y_texto_detectado = int(linhas_com_texto[0]) + busca_inicio
    y_texto_esperado = y_esperado + int(round(MARGEM_TOPO_DANO_CELULAR * escala_y))
    return y_texto_detectado - y_texto_esperado


# ============================================================
# LINHAS ANCORADAS PELAS PÍLULAS DE DANO (perfis TABLET e CELULAR)
# ============================================================

def _faixas(mascara) -> list[tuple[int, int]]:
    """Intervalos contínuos (inicio, fim) onde a máscara 1-D é verdadeira."""
    faixas, inicio = [], None
    for indice, valor in enumerate(mascara):
        if valor and inicio is None:
            inicio = indice
        elif not valor and inicio is not None:
            faixas.append((inicio, indice - 1))
            inicio = None
    if inicio is not None:
        faixas.append((inicio, len(mascara) - 1))
    return faixas


def _config_perfil(perfil: str) -> dict:
    """Parâmetros de ancoragem do perfil (``tablet`` ou ``celular``)."""
    if perfil == "celular":
        return {
            "largura_base": LARGURA_BASE_CELULAR,
            "altura_base": ALTURA_BASE_CELULAR,
            "ancoragem": ANCORAGEM_CELULAR,
            "regioes": REGIOES_ANCORADAS_CELULAR,
            "badge": BADGE_NIVEL_CELULAR,
            "passo_base": INCREMENTO_Y_BASE_CELULAR,
            "limite_superior": LIMITE_SUPERIOR_LINHA_CELULAR,
        }
    return {
        "largura_base": LARGURA_BASE_TABLET,
        "altura_base": ALTURA_BASE_TABLET,
        "ancoragem": ANCORAGEM_TABLET,
        "regioes": REGIOES_ANCORADAS_TABLET,
        "badge": BADGE_NIVEL_TABLET,
        "passo_base": INCREMENTO_Y_BASE_TABLET,
        "limite_superior": LIMITE_SUPERIOR_LINHA_TABLET,
    }


def perfil_da_imagem(largura_img: int, altura_img: int) -> str:
    """``celular`` ou ``tablet``, pela proporção da imagem."""
    proporcao = largura_img / altura_img if altura_img else 0
    return "celular" if proporcao >= LIMIAR_PROPORCAO_CELULAR else "tablet"


def detectar_ancoras_linhas(img, perfil: str = "tablet") -> list[int]:
    """Localiza o centro Y de cada linha visível pela pílula escura do dano.

    Compara, em cada Y, uma faixa dentro da pílula com uma faixa do fundo do
    cartão logo ao lado. A diferença (contraste local) é positiva só onde há
    pílula, mesmo com o degradê que clareia as linhas de baixo. Pílulas
    cortadas na borda da lista e o cartão rosa fixo "minha posição" (última
    linha da tela, repete o ranking do próprio jogador) são descartados.
    """
    config = _config_perfil(perfil)
    altura_img, largura_img = img.shape[:2]
    escala_x = largura_img / config["largura_base"]
    escala_y = altura_img / config["altura_base"]
    cfg = config["ancoragem"]

    p0, p1 = (int(round(v * escala_x)) for v in cfg["coluna_pilula"])
    c0, c1 = (int(round(v * escala_x)) for v in cfg["coluna_cartao"])
    if p1 <= p0 or c1 <= c0 or c1 > largura_img:
        return []

    cor = img.astype(np.float32)
    cinza = cor.mean(axis=2)
    contraste = cinza[:, c0:c1].mean(axis=1) - cinza[:, p0:p1].mean(axis=1)
    # OpenCV usa BGR: canal 2 = vermelho, canal 0 = azul.
    rosado = (cor[:, c0:c1, 2] - cor[:, c0:c1, 0]).mean(axis=1)

    altura_minima = cfg["altura_minima_pilula"] * escala_y
    ancoras = []
    for inicio, fim in _faixas(contraste > cfg["contraste_minimo"]):
        if (fim - inicio + 1) < altura_minima:
            continue
        centro = (inicio + fim) // 2
        if rosado[centro] > cfg["limite_rosa"]:
            continue
        ancoras.append(int(round((inicio + fim) / 2)))
    return ancoras


def regularizar_ancoras(
    ancoras: list[int],
    numero_linhas: int,
    passo: float,
    limite_superior: float = 75.0,
    tolerancia_passo: float | None = None,
) -> tuple[list[int], int]:
    """Garante ``numero_linhas`` âncoras igualmente espaçadas a partir da primeira.

    Cada posição esperada é trocada pela âncora detectada mais próxima (dentro
    da tolerância); se uma pílula não foi detectada, a posição esperada é
    mantida. ``limite_superior`` é o menor Y de centro de pílula que ainda fica
    totalmente visível sob o cabeçalho da lista. Devolve (âncoras, quantas
    foram estimadas e não detectadas).
    """
    if not ancoras:
        return [], 0
    fracao = ANCORAGEM_TABLET["tolerancia_passo"] if tolerancia_passo is None else tolerancia_passo
    tolerancia = passo * fracao
    primeira = ancoras[0]
    resultado, estimadas = [], 0
    # Se a primeira pílula detectada está tão abaixo que caberia outra linha
    # inteira acima dela, a pílula daquela linha não foi detectada: recua até
    # a primeira posição realmente visível para não deslocar a numeração.
    while primeira - passo >= limite_superior:
        primeira -= passo
        estimadas += 1
    for indice in range(numero_linhas):
        esperada = primeira + passo * indice
        proxima = min(ancoras, key=lambda a: abs(a - esperada))
        if abs(proxima - esperada) <= tolerancia:
            resultado.append(int(proxima))
        else:
            resultado.append(int(round(esperada)))
            estimadas += 1
    return resultado, estimadas


def _inicio_do_badge_nivel(hsv, centro_y: int, escala_x: float, escala_y: float, perfil: str = "tablet"):
    """X (em pixels da imagem) onde começa o badge "Nv.", ou None.

    O badge costuma ser roxo, mas há contas com outra cor (DuckDolnad: verde-água);
    ``matizes_extras`` do perfil cobre esses casos.
    """
    config = _config_perfil(perfil)
    cfg = config["badge"]
    x0, x1 = (int(round(v * escala_x)) for v in cfg["busca_x"])
    reg = config["regioes"]["nome"]
    y0 = max(0, centro_y + int(round(reg["dy"] * escala_y)))
    y1 = min(hsv.shape[0], y0 + int(round(reg["h"] * escala_y)))
    faixa = hsv[y0:y1, x0:x1]
    if faixa.size == 0:
        return None
    matiz_min, matiz_max = cfg["matiz"]
    mascara = (
        (faixa[..., 0] > matiz_min) & (faixa[..., 0] < matiz_max)
        & (faixa[..., 1] > cfg["saturacao_min"]) & (faixa[..., 2] > cfg["valor_min"])
    )
    for h_min, h_max, s_min, v_min in cfg.get("matizes_extras", []):
        mascara |= (
            (faixa[..., 0] > h_min) & (faixa[..., 0] < h_max)
            & (faixa[..., 1] > s_min) & (faixa[..., 2] > v_min)
        )
    colunas = mascara.sum(axis=0) >= cfg["pixels_por_coluna_min"]
    for inicio, fim in _faixas(colunas):
        if (fim - inicio + 1) >= cfg["largura_min"] * escala_x:
            return x0 + inicio
    return None


def recortes_da_linha(img, hsv, centro_y: int, perfil: str = "tablet") -> dict:
    """Recortes (nome, frequência, dano) de uma linha a partir do centro da pílula."""
    config = _config_perfil(perfil)
    altura_img, largura_img = img.shape[:2]
    escala_x = largura_img / config["largura_base"]
    escala_y = altura_img / config["altura_base"]
    regioes = config["regioes"]
    badge = config["badge"]

    def caixa(x, w, dy, h):
        return (
            int(round(x * escala_x)),
            centro_y + int(round(dy * escala_y)),
            int(round(w * escala_x)),
            int(round(h * escala_y)),
        )

    nome = regioes["nome"]
    x_nome = int(round(nome["x"] * escala_x))
    inicio_badge = _inicio_do_badge_nivel(hsv, centro_y, escala_x, escala_y, perfil)
    if inicio_badge is not None:
        x_fim = inicio_badge - int(round(badge["margem"] * escala_x))
    else:
        x_fim = int(round(badge["x_fim_padrao"] * escala_x))

    caixas = {
        "nome": (x_nome, centro_y + int(round(nome["dy"] * escala_y)), max(1, x_fim - x_nome),
                 int(round(nome["h"] * escala_y))),
        "frequencia": caixa(**{k: regioes["frequencia"][k] for k in ("x", "w", "dy", "h")}),
        "dano": caixa(**{k: regioes["dano"][k] for k in ("x", "w", "dy", "h")}),
    }
    return {campo: recortar_area(img, *valores) for campo, valores in caixas.items()}


def recortes_da_linha_tablet(img, hsv, centro_y: int) -> dict:
    """Compatibilidade: recortes de uma linha do perfil tablet."""
    return recortes_da_linha(img, hsv, centro_y, "tablet")


# ============================================================
# LEITURA DE NOMES: CONSENSO PARA MEMBROS NOVOS
# ============================================================

def _normalizar_leitura_nome(texto: str) -> str:
    """Reduz uma leitura bruta ao provável nick (sem bordas soltas nem nível)."""
    limpo = limpar_nome(texto)
    palavras = limpo.split()
    while len(palavras) > 1 and len(palavras[0]) == 1:
        palavras = palavras[1:]
    while len(palavras) > 1 and len(palavras[-1]) == 1:
        palavras = palavras[:-1]
    if not palavras:
        return ""
    # Nicks do jogo não têm espaço: se sobrou mais de uma palavra, a mais longa
    # é o nick e o resto é ruído do recorte.
    return max(palavras, key=len)


def ler_nome_candidato(recorte) -> dict:
    """Lê um nome desconhecido em todas as variantes e vota na grafia mais repetida.

    Serve para membros novos: eles não estão em nenhum alias, então o nome só
    é aceito se várias leituras independentes (3 imagens x 2 modos) concordarem.
    Devolve ``{"nome", "votos", "leituras", "total", "valido"}``.
    """
    vazio = {"nome": "", "votos": 0, "leituras": [], "total": 0, "valido": False}
    if recorte is None or recorte.size == 0:
        return vazio

    leituras = []
    for _, variante in preparar_variantes(recorte):
        for config in ("--psm 7", "--psm 8"):
            try:
                texto = pytesseract.image_to_string(variante, config=config, lang=OCR_LANG).strip()
            except pytesseract.TesseractError:
                texto = ""
            if texto:
                leituras.append(texto)

    normalizadas = [_normalizar_leitura_nome(t) for t in leituras]
    normalizadas = [n for n in normalizadas if n]
    if not normalizadas:
        return {**vazio, "leituras": leituras, "total": len(leituras)}

    contagem = Counter(n.casefold() for n in normalizadas)
    melhor_chave, votos = max(contagem.items(), key=lambda item: item[1])
    # Mantém a caixa (maiúsculas/minúsculas) da leitura mais antiga com essa chave.
    nome = next(n for n in normalizadas if n.casefold() == melhor_chave)
    valido = (
        votos >= 1
        and TAMANHO_NOME_MIN <= len(nome) <= TAMANHO_NOME_MAX
        and re.fullmatch(r"\w+", nome) is not None
        and not nome.isdigit()
    )
    return {"nome": nome, "votos": votos, "leituras": leituras, "total": len(leituras), "valido": valido}


# ============================================================
# LEITURA DE UMA LINHA
# ============================================================

def _resolver_nome_padrao(texto: str) -> dict:
    return corrigir_nome_detalhado(texto)


def _ler_linha(
    nome_imagem: str,
    indice_linha: int,
    recortes: dict,
    resolver_nome=None,
    pasta_revisao: Path | None = None,
) -> dict:
    """OCR de uma linha já recortada (compartilhado entre os dois perfis).

    ``resolver_nome`` recebe o texto lido e devolve ``{"nome", "status", ...}``;
    sem ele vale o elenco base (``NOMES_VALIDOS``). Quando o nome não casa com
    ninguém, a linha guarda a leitura bruta e o resultado da votação entre as
    variantes (``nome_candidato``), que a etapa de elenco usa para detectar
    membros novos, e o recorte é salvo em ``pasta_revisao`` para conferência.
    """
    resolver_nome = resolver_nome or _resolver_nome_padrao
    linha_dados = {"imagem_origem": nome_imagem, "linha": indice_linha}
    suspeitas = []

    for campo in ("nome", "frequencia", "dano"):
        recorte = recortes.get(campo)
        salvar_debug_crop(nome_imagem, indice_linha, campo, recorte)

        if campo == "nome":
            # Nomes que o Tesseract não lê (japonês, kanji) são reconhecidos
            # visualmente antes de qualquer tentativa de OCR de texto.
            visual = None
            if recorte is not None and recorte.size:
                cinza = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY) if recorte.ndim == 3 else recorte
                visual = identificar_nome_visual(cinza)
            if visual:
                linha_dados["nome"], linha_dados["status"] = visual[0], ""
                continue

        texto, confiavel = ocr_recorte_detalhado(recorte, campo, resolver_nome)
        if campo == "nome":
            resultado = resolver_nome(texto)
            linha_dados["nome"] = resultado["nome"]
            linha_dados["status"] = resultado["status"]
            if resultado["status"] == STATUS_REVISAR:
                candidato = ler_nome_candidato(recorte)
                linha_dados["nome_ocr"] = texto
                linha_dados["nome_candidato"] = candidato["nome"]
                linha_dados["nome_candidato_votos"] = candidato["votos"]
                linha_dados["nome_candidato_leituras"] = candidato["total"]
                if pasta_revisao is not None and recorte is not None and recorte.size:
                    pasta_revisao.mkdir(parents=True, exist_ok=True)
                    destino = pasta_revisao / f"{Path(nome_imagem).stem}_linha{indice_linha:02d}_nome.png"
                    cv2.imwrite(str(destino), recorte)
        else:
            linha_dados[campo] = limpar_campo(campo, texto)
            if campo == "dano" and not confiavel:
                suspeitas.append(STATUS_DANO_SUSPEITO)

    linha_dados = validar_linha(linha_dados)
    for status in suspeitas:
        linha_dados["status"] = juntar_status(linha_dados.get("status", ""), status)
    return linha_dados


def _imprimir_linha(linha_dados: dict) -> None:
    status_display = f" [{linha_dados['status']}]" if linha_dados.get("status") else ""
    extra = ""
    if linha_dados.get("nome_candidato"):
        extra = f"  (leitura: {linha_dados['nome_candidato']!r}, {linha_dados.get('nome_candidato_votos', 0)} votos)"
    print(
        f"{linha_dados.get('nome', 'VAZIO'):14} | "
        f"{linha_dados.get('frequencia', 'N/A'):5} | "
        f"{linha_dados.get('dano', '0'):15}"
        f"{status_display}{extra}"
    )


def processar_imagem(
    caminho_imagem: str,
    numero_linhas: int = NUMERO_LINHAS,
    resolver_nome=None,
    pasta_revisao: Path | None = None,
) -> list[dict]:
    img = cv2.imread(caminho_imagem)
    if img is None:
        print(f"[ERRO] Não foi possível abrir a imagem: {caminho_imagem}")
        return []

    altura_img, largura_img = img.shape[:2]
    proporcao = largura_img / altura_img if altura_img else 0
    perfil = perfil_da_imagem(largura_img, altura_img)
    nome_imagem = Path(caminho_imagem).name
    print(f"\nProcessando: {nome_imagem} ({largura_img}x{altura_img}, perfil {perfil})")

    dados_extraidos = []

    # TABLET e CELULAR: cada linha é ancorada pela sua pílula de dano.
    config = _config_perfil(perfil)
    ancoras = detectar_ancoras_linhas(img, perfil)
    if ancoras:
        escala_y = altura_img / config["altura_base"]
        passo = config["passo_base"] * escala_y
        if len(ancoras) >= 2:
            passo = float(np.median(np.diff(ancoras)))
        ancoras, estimadas = regularizar_ancoras(
            ancoras,
            numero_linhas,
            passo,
            config["limite_superior"] * escala_y,
            config["ancoragem"]["tolerancia_passo"],
        )
        if estimadas:
            print(f"  [AVISO] {estimadas} linha(s) sem pílula detectada: posição estimada pelo passo")
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        for indice_linha, centro_y in enumerate(ancoras, start=1):
            recortes = recortes_da_linha(img, hsv, centro_y, perfil)
            linha_dados = _ler_linha(nome_imagem, indice_linha, recortes, resolver_nome, pasta_revisao)
            dados_extraidos.append(linha_dados)
            _imprimir_linha(linha_dados)
        return dados_extraidos
    print("  [AVISO] nenhuma pílula de dano detectada: usando a grade fixa de reserva")

    regioes_escaladas, incremento_y = escalar_regioes(largura_img, altura_img)
    if proporcao >= LIMIAR_PROPORCAO_CELULAR:
        escala_y = altura_img / ALTURA_BASE_CELULAR
        deslocamento_y = detectar_deslocamento_y(img, regioes_escaladas["dano"], escala_y)
        if deslocamento_y:
            print(f"  (ajuste automático de scroll: {deslocamento_y:+d}px)")
            regioes_escaladas = {
                campo: (x, y + deslocamento_y, w, h)
                for campo, (x, y, w, h) in regioes_escaladas.items()
            }

    for indice_linha in range(1, numero_linhas + 1):
        i = indice_linha - 1
        recortes = {
            campo: recortar_area(img, x, y + (incremento_y * i), w, h)
            for campo, (x, y, w, h) in regioes_escaladas.items()
        }
        linha_dados = _ler_linha(nome_imagem, indice_linha, recortes, resolver_nome, pasta_revisao)
        dados_extraidos.append(linha_dados)
        _imprimir_linha(linha_dados)

    return dados_extraidos
