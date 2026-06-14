# ============================================================
# CONFIGURAÇÕES GERAIS - AVALON RAID HALL OCR v2.0
# ============================================================

from pathlib import Path

NOME_GUILDA = "Avalon"
CAPACIDADE_GUILDA = 30

# Idioma usado pelo Tesseract.
# Se futuramente instalar jpn/kor, pode trocar para: "eng+jpn+kor".
OCR_LANG = "eng"

# Caminho do Tesseract no Windows. Se estiver no PATH ou em Linux/Mac,
# o extractor tenta localizar automaticamente.
TESSERACT_CMD_WINDOWS = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

EXTENSOES_IMAGEM = [".jpeg", ".jpg", ".png"]

# ============================================================
# MEMBROS OFICIAIS DA GUILDA
# ============================================================
# Fonte oficial para correção OCR e auditoria.
# Quem estiver aqui e não aparecer no ranking será marcado como ausente.

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
]

# Apelidos e variações conhecidas. Útil quando o OCR lê sem acento,
# troca símbolos, ou quando o jogador muda de nick.
ALIASES_MEMBROS = {
    "Cley": ["MJ_McQueen", "MJ馬McQueen"],
    "Sr_Mendes": ["Sr Mendes", "Sr-Mendes", "SrMendes"],
    "CAPETTINI": ["Capettini", "capettini"],
    "ヴァルディネイ": ["Valdinei", "Valdiney", "ValdineI", "Sry Heg"],
    "カミナリ": ["Kaminari", "737"],
    "Lux": ["LUX", "wa"],
    "Ger": ["cr"],
    "kia": ["Zz", "Kia"],
    "Drymus": ["ee"],
}

# Correções diretas de OCR. Use apenas para leituras recorrentes e muito claras.
CORRECOES_OCR_NOMES = {
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
# Resolução base calibrada pelos prints atuais: largura 1599, altura 999.
# Para outras resoluções, o extractor escala proporcionalmente.

LARGURA_BASE = 1599
ALTURA_BASE = 999

# campo: (x, y, largura, altura) na resolução base.
# As regiões foram ampliadas levemente para evitar cortes em telas diferentes.
REGIOES_BASE_PIXELS = {
    # Recorte de nome menor para evitar capturar o "Nv." do personagem.
    "nome": (610, 63, 185, 50),
    # Frequência e dano recebem recortes mais largos para não cortar dígitos.
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
# Se True, salva recortes em debug/crops para analisar visualmente o OCR.
GERAR_DEBUG_CROPS = False
DEBUG_DIR = Path("debug") / "crops"

# Se True, aplica correções conhecidas por imagem/linha.
# Útil quando a tela tem nomes japoneses e o idioma jpn não está instalado.
USAR_CORRECOES_LINHAS_ATUAL = True

# Correções por imagem e índice da linha visível no print, começando em 1.
# Para futuras raids, você pode apagar/alterar este bloco ou desativar
# USAR_CORRECOES_LINHAS_ATUAL.
CORRECOES_LINHAS_ATUAL = {
    # Print 1: posições 1 a 7
    ("img1.jpeg", 1): {"nome": "Cley", "frequencia": "21/21", "dano": 7007227970},
    ("img1.jpeg", 2): {"nome": "Hela", "frequencia": "21/21", "dano": 6872864703},
    ("img1.jpeg", 3): {"nome": "Krelian", "frequencia": "21/21", "dano": 6566449530},
    ("img1.jpeg", 4): {"nome": "Leon", "frequencia": "21/21", "dano": 6136756694},
    ("img1.jpeg", 5): {"nome": "Sr_Mendes", "frequencia": "21/21", "dano": 6047485963},
    ("img1.jpeg", 6): {"nome": "Gashak", "frequencia": "21/21", "dano": 6045943039},
    ("img1.jpeg", 7): {"nome": "Lux", "frequencia": "21/21", "dano": 5757010994},

    # Print 2: posições 8 a 14
    ("img2.jpeg", 1): {"nome": "SkyLord", "frequencia": "21/21", "dano": 5450006166},
    ("img2.jpeg", 2): {"nome": "Kanao", "frequencia": "21/21", "dano": 5227989147},
    ("img2.jpeg", 3): {"nome": "SirAudino", "frequencia": "21/21", "dano": 5179854176},
    ("img2.jpeg", 4): {"nome": "Aurora", "frequencia": "21/21", "dano": 4689989569},
    ("img2.jpeg", 5): {"nome": "Snowers", "frequencia": "19/21", "dano": 4655762502},
    ("img2.jpeg", 6): {"nome": "Ger", "frequencia": "18/21", "dano": 4654615408},
    ("img2.jpeg", 7): {"nome": "Capibara", "frequencia": "16/21", "dano": 4276834242},

    # Print 3: posições 15 a 21
    ("img3.jpeg", 1): {"nome": "Wagnero", "frequencia": "15/21", "dano": 4199793235},
    ("img3.jpeg", 2): {"nome": "ヴァルディネイ", "frequencia": "15/21", "dano": 4196284054},
    ("img3.jpeg", 3): {"nome": "Dennis", "frequencia": "15/21", "dano": 4005294241},
    ("img3.jpeg", 4): {"nome": "カミナリ", "frequencia": "21/21", "dano": 3924119148},
    ("img3.jpeg", 5): {"nome": "Ino", "frequencia": "19/21", "dano": 3524310859},
    ("img3.jpeg", 6): {"nome": "Cosmos", "frequencia": "18/21", "dano": 3455156171},
    ("img3.jpeg", 7): {"nome": "math", "frequencia": "11/21", "dano": 2121268952},

    # Print 4: repetição de math + posições 22 a 27
    ("img4.jpeg", 1): {"nome": "math", "frequencia": "11/21", "dano": 2121268952},
    ("img4.jpeg", 2): {"nome": "kia", "frequencia": "18/21", "dano": 1988357012},
    ("img4.jpeg", 3): {"nome": "Ramigam", "frequencia": "9/21", "dano": 1877637550},
    ("img4.jpeg", 4): {"nome": "Drymus", "frequencia": "9/21", "dano": 1790445105},
    ("img4.jpeg", 5): {"nome": "CAPETTINI", "frequencia": "9/21", "dano": 1667651751},
    ("img4.jpeg", 6): {"nome": "PeSH", "frequencia": "12/21", "dano": 1634108517},
    ("img4.jpeg", 7): {"nome": "utiago", "frequencia": "6/21", "dano": 1063888601},
}

# ============================================================
# CONFIGURAÇÃO DE SAÍDA
# ============================================================

ORDENAR_POR_DANO = True
REMOVER_LINHAS_VAZIAS = True
MARCAR_REVISAO_AUTOMATICA = True
