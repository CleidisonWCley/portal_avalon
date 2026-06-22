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
    "SkyLord",
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
    "Drymus",
    "CAPETTINI",
    "PeSH",
    "utiago",
    "Carlinhozz",
    "MJ馬McQueen",
    "tang"
]

# Apelidos e variações conhecidas. Aliases de 1 ou 2 caracteres são aceitos
# somente em correspondência exata e nunca entram no fuzzy matching.
ALIASES_MEMBROS = {
    "Cley": ["cley"],
    "MJ馬McQueen": ["MJ_McQueen", "MJ McQueen", "MJMcQueen"],
    "Sr_Mendes": ["Sr Mendes", "Sr-Mendes", "SrMendes"],
    "CAPETTINI": ["Capettini", "capettini"],
    "ヴァルディネイ": ["Valdinei", "Valdiney", "ValdineI", "Sry Heg"],
    "カミナリ": ["Kaminari", "737"],
    "Lux": ["LUX", "wa"],
    "Ger": ["cr"],
    "kia": ["Zz", "Kia"],
    "Drymus": ["ee"],
    "tang": ["Tang", "TANG"],
}

CORRECOES_OCR_NOMES = {
    "MJ_McQueen": "MJ馬McQueen",
    "MJ McQueen": "MJ馬McQueen",
    "MJMcQueen": "MJ馬McQueen",
    "Tang": "tang",
    "TANG": "tang",
    "wa": "Lux",
    "cr": "Ger",
    "Zz": "kia",
    "zz": "kia",
    "ee": "Drymus",
    "737": "カミナリ",
    "Sry Heg": "ヴァルディネイ",
    "SryHeg": "ヴァルディネイ",
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
# COORDENADAS DO OCR - MODO RESPONSIVO
# ============================================================

LARGURA_BASE = 1599
ALTURA_BASE = 999

REGIOES_BASE_PIXELS = {
    "nome": (610, 63, 185, 50),
    "frequencia": (1000, 72, 145, 56),
    "dano": (1190, 68, 310, 62),
}

INCREMENTO_Y_BASE = 113
NUMERO_LINHAS = 7

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
    }
}

# ============================================================
# CONFIGURAÇÃO DE SAÍDA
# ============================================================

ORDENAR_POR_DANO = True
REMOVER_LINHAS_VAZIAS = True
MARCAR_REVISAO_AUTOMATICA = True
