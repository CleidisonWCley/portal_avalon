# ============================================================
# CONFIGURAÇÕES GERAIS - AVALON RAID HALL OCR v2.1
# ============================================================

from pathlib import Path

NOME_GUILDA = "Avalon"
CAPACIDADE_GUILDA = 30

# Idioma usado pelo Tesseract.
OCR_LANG = "eng"

# Caminho do Tesseract no Windows. Se estiver no PATH ou em Linux/Mac,
# o extractor tenta localizar automaticamente.
TESSERACT_CMD_WINDOWS = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

EXTENSOES_IMAGEM = [".jpeg", ".jpg", ".png"]
PADRAO_NOME_IMAGEM = r"^img([1-5])\.(?:jpeg|jpg|png)$"
MAXIMO_IMAGENS = 5

# ============================================================
# MEMBROS OFICIAIS DA GUILDA
# ============================================================

NOMES_VALIDOS = [
    "Cley",
    "Hela",
    "Krelian",
    "Leon",
    "Sr_Mendes",
    "Gashak",
    "Lux",
    "Kanao",
    "SirAudino",
    "Aurora",
    "Snowers",
    "Ger",
    "Capibara",
    "Wagnero",
    "ヴァルディネイ",
    "Dennis",
    "カミナリ",
    "Ino",
    "Cosmos",
    "math",
    "kia",
    "Ramigam",
    "CAPETTINI",
    "PeSH",
    "utiago",
    "Carlinhozz",
    "MJ馬McQueen",
    "tang",
    "Haru_Urara",
]

# Apelidos e variações conhecidas. Aliases de 1 ou 2 caracteres são aceitos
# somente em correspondência exata e nunca entram no fuzzy matching.
ALIASES_MEMBROS = {
    "Cley": ["cley", "ley" , "SESH"],
    "MJ馬McQueen": ["MJ_McQueen", "MJ McQueen", "MJMcQueen", "MyiBMcQueen"],
    "Sr_Mendes": ["Sr Mendes", "Sr-Mendes", "SrMendes"],
    "CAPETTINI": ["Capettini", "capettini"],
    "ヴァルディネイ": ["Valdinei", "Valdiney", "ValdineI", "Sry Heg", "ornee et   ", "areca", ],
    "カミナリ": ["Kaminari", "737", "757", "ast",],
    "Lux": ["LUX", "wa", "_     ", "oa"],
    "Ger": ["cr","co"],
    "kia": ["Zz", "Kia", "oa an",],
    "tang": ["Tang", "TANG"],
    "utiago": [ "Utiago", "utage", "Utage"],
    "Kanao": ["Kanao","kenao", "Kenao", "Kaneo Sn "],
    "PeSH": ["PESH","pesh", "Pesh", "NUGZRD",],
    "Haru_Urara": ["tangHaru_Urara"],
    "Aurora": ["jurors"],
    "Ino": ["ro"],
    "Snowers": ["cnowers mm "],
}

CORRECOES_OCR_NOMES = {
    "MJ_McQueen": "MJ馬McQueen",
    "MJ McQueen": "MJ馬McQueen",
    "MJMcQueen": "MJ馬McQueen",
    "MyiBMcQueen": "MJ馬McQueen",
    "Tang": "tang",
    "TANG": "tang",
    "wa": "Lux",
    "cr": "Ger",
    "Zz": "kia",
    "zz": "kia",
    "ee": "Drymus",
    "oa an": "kia",
    "737": "カミナリ",
    "757": "カミナリ",
    "Sry Heg": "ヴァルディネイ",
    "SryHeg": "ヴァルディネイ",
    "utage": "utiago",
    "Utage": "utiago",
    "ornee et   ": "ヴァルディネイ",
    "_     ": "Lux",
    "co": "Ger",
    "cnowers mm": "Snowers",
    "jurors": "Aurora",
    "ro": "Ino",
    "io": "Kia ",
    "areca": "ヴァルディネイ",
    "Kaneo Sn ": "Kanao",
    "ast": "カミナリ",
    "tangHaru_Urara": "Haru_Urara"
}

# ============================================================
# CONFIGURAÇÃO DE PARTICIPAÇÃO E VALIDAÇÃO
# ============================================================

ATAQUES_MAXIMOS_RAID = 21
FREQUENCIA_PADRAO_AUSENTE = "0/21"

REGRAS_PARTICIPACAO = {
    "completo": 21,
    "participou_bem_min": 15,
    "baixa_participacao_min": 8,
    "quase_ausente_min": 1,
    "ausente": 0,
}

DANO_MINIMO_VALIDO = 0
DANO_MINIMO_PARA_VALIDACAO = 1_000_000
DANO_MAXIMO_PLAUSIVEL = 20_000_000_000

STATUS_VALIDO = ""
STATUS_REVISAR = "revisar"
STATUS_AUSENTE = "ausente"
STATUS_DUPLICADO = "duplicado"
STATUS_DANO_SUSPEITO = "dano_suspeito"
STATUS_FREQUENCIA_SUSPEITA = "frequencia_suspeita"
STATUS_LINHA_CORRIGIDA = "linha_corrigida"
STATUS_NOME_CORRIGIDO = "nome_corrigido"

# ============================================================
# ============================================================
# COORDENADAS DO OCR - MODO RESPONSIVO
# ============================================================
# Existem dois perfis de calibração porque o layout do jogo NÃO escala de
# forma uniforme entre tablet/desktop e celular — no celular o painel de
# ranking divide espaço com um menu lateral que não existe no tablet, então
# escalar as coordenadas do tablet proporcionalmente à imagem inteira faz
# os recortes "andarem" pra fora do lugar (mais quanto mais à direita o
# campo estiver). Por isso cada perfil tem sua própria imagem de referência.

# --- Perfil TABLET/DESKTOP (referência original) ---
LARGURA_BASE_TABLET = 1599
ALTURA_BASE_TABLET = 999

REGIOES_BASE_PIXELS_TABLET = {
    "nome": (610, 63, 185, 50),
    "frequencia": (1000, 72, 145, 56),
    "dano": (1190, 68, 310, 62),
}

INCREMENTO_Y_BASE_TABLET = 113
NUMERO_LINHAS_TABLET = 7

# --- Perfil CELULAR (calibrado em print de celular 2340x1080, deitado) ---
LARGURA_BASE_CELULAR = 2340
ALTURA_BASE_CELULAR = 1080

REGIOES_BASE_PIXELS_CELULAR = {
    "nome": (818, 70, 190, 50),
    "frequencia": (1340, 100, 125, 44),
    "dano": (1595, 100, 250, 48),
}

INCREMENTO_Y_BASE_CELULAR = 138
# No celular, a lista de ranking mostra menos linhas por print que no
# tablet (o card de cada membro ocupa proporcionalmente mais altura).
NUMERO_LINHAS_CELULAR = 6

# Proporção largura/altura a partir da qual uma imagem é tratada como
# print de celular. Tablet fica perto de 1.6; celular deitado normalmente
# fica em 1.9+ (ex.: 2340x1080 = 2.17). O limiar fica no meio do caminho
# entre os dois formatos de referência conhecidos.
LIMIAR_PROPORCAO_CELULAR = 1.85

# Nomes mantidos por compatibilidade com código antigo — sempre apontam
# para o perfil TABLET; código novo deve escolher o perfil dinamicamente
# via `selecionar_perfil()` em src/ocr/extractor.py.
LARGURA_BASE = LARGURA_BASE_TABLET
ALTURA_BASE = ALTURA_BASE_TABLET
REGIOES_BASE_PIXELS = REGIOES_BASE_PIXELS_TABLET
INCREMENTO_Y_BASE = INCREMENTO_Y_BASE_TABLET
NUMERO_LINHAS = NUMERO_LINHAS_TABLET

# Compatibilidade com código antigo.
REGIOES_BASE = REGIOES_BASE_PIXELS
INCREMENTO_Y = INCREMENTO_Y_BASE

# ============================================================
# DEBUG E QUALIDADE
# ============================================================

GERAR_DEBUG_CROPS = False
DEBUG_DIR = Path("debug") / "crops"

# Correções revisadas são vinculadas ao número da raid. O OCR bruto é sempre
# preservado antes dessas correções serem aplicadas.
USAR_CORRECOES_LINHAS = True

CORRECOES_LINHAS_POR_RAID = {
    133: {
        # Somente linhas em que o resultado bruto não corresponde aos dados
        # conferidos nos screenshots oficiais da Raid 133.
        ("img1.jpeg", 3): {"nome": "Cley", "frequencia": "21/21", "dano": 6418524181},
        ("img1.jpeg", 7): {"nome": "Lux", "frequencia": "21/21", "dano": 5868302434},
        ("img2.jpeg", 4): {"nome": "Ger", "frequencia": "21/21", "dano": 5432498592},
        ("img2.jpeg", 5): {"nome": "Wagnero", "frequencia": "18/21", "dano": 5002233689},
        ("img2.jpeg", 6): {"nome": "SirAudino", "frequencia": "21/21", "dano": 4983526750},
        ("img2.jpeg", 7): {"nome": "Snowers", "frequencia": "21/21", "dano": 4889974560},
        ("img3.jpeg", 3): {"nome": "カミナリ", "frequencia": "21/21", "dano": 3854104442},
        ("img3.jpeg", 5): {"nome": "Ino", "frequencia": "16/21", "dano": 3168253423},
        ("img3.jpeg", 6): {"nome": "ヴァルディネイ", "frequencia": "13/21", "dano": 3126292007},
        ("img4.jpeg", 4): {"nome": "PeSH", "frequencia": "14/21", "dano": 1510787224},
        ("img4.jpeg", 5): {"nome": "Carlinhozz", "frequencia": "9/21", "dano": 1432042582},
        ("img4.jpeg", 7): {"nome": "utiago", "frequencia": "3/21", "dano": 531796294},
    },
    134: {
        ("img2.jpeg", 5): {"nome": "Kanao", "frequencia": "21/21", "dano": 5146046379},
        ("img2.jpeg", 6): {"nome": "Sr_Mendes", "frequencia": "18/21", "dano": 5011237651},
        ("img2.jpeg", 7): {"nome": "SkyLord", "frequencia": "18/21", "dano": 4910370115},
        ("img5.jpeg", 1): {"nome": "PeSH", "frequencia": "12/21", "dano": 919946595},
        ("img5.jpeg", 2): {"nome": "Drymus", "frequencia": "3/21", "dano": 530981851},
    },
    135: {
        ("img2.jpeg", 6): {"nome": "Aurora", "frequencia": "21/21", "dano": 5190475037},
        ("img2.jpeg", 7): {"nome": "Snowers", "frequencia": "18/21", "dano": 4545986172},
        ("img3.jpeg", 4): {"nome": "Sr_Mendes", "frequencia": "15/21", "dano": 4317518896},
    },
    136: {
        # Conferidas contra os screenshots oficiais da Raid 136 (deslocamento
        # de scroll já corrigido no OCR; só o nome ficou "revisar" nestas
        # linhas — frequência e dano já batiam com a imagem).
        ("img1.jpeg", 3): {"nome": "Cley", "frequencia": "21/21", "dano": 6791215007},
        ("img1.jpeg", 4): {"nome": "Krelian", "frequencia": "21/21", "dano": 6768643794},
        ("img1.jpeg", 5): {"nome": "MJ馬McQueen", "frequencia": "21/21", "dano": 6659104205},
        ("img1.jpeg", 6): {"nome": "Gashak", "frequencia": "21/21", "dano": 6453921540},
        ("img2.jpeg", 3): {"nome": "Lux", "frequencia": "21/21", "dano": 6251944076},
        ("img2.jpeg", 6): {"nome": "Kanao", "frequencia": "21/21", "dano": 5391553217},
        ("img3.jpeg", 4): {"nome": "Ger", "frequencia": "17/21", "dano": 4374399105},
        ("img3.jpeg", 5): {"nome": "カミナリ", "frequencia": "21/21", "dano": 3971075271},
        ("img4.jpeg", 1): {"nome": "Ino", "frequencia": "18/21", "dano": 3677476051},
        ("img4.jpeg", 4): {"nome": "Cosmos", "frequencia": "15/21", "dano": 2698406766},
        ("img5.jpeg", 3): {"nome": "PeSH", "frequencia": "18/21", "dano": 1965689627},
        ("img5.jpeg", 4): {"nome": "kia", "frequencia": "18/21", "dano": 1953658609},
        ("img5.jpeg", 6): {"nome": "Carlinhozz", "frequencia": "3/21", "dano": 415155293},
    },
}
# ============================================================
# CONFIGURAÇÃO DE SAÍDA
# ============================================================

ORDENAR_POR_DANO = True
REMOVER_LINHAS_VAZIAS = True
MARCAR_REVISAO_AUTOMATICA = True