import csv
from datetime import datetime
from pathlib import Path


def exportar_csv(dados: list[dict], nome_arquivo: str = None, pasta_saida: str = "output") -> Path | None:
    if not dados:
        print("Nenhum dado para exportar")
        return None

    if not nome_arquivo:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nome_arquivo = f"ocr_dados_{timestamp}.csv"

    Path(pasta_saida).mkdir(exist_ok=True)
    caminho_completo = Path(pasta_saida) / nome_arquivo

    ordem_colunas = [
        "imagem_origem",
        "linha",
        "nome",
        "frequencia",
        "dano",
        "status",
        "status_participacao",
    ]

    todas_colunas = []
    for item in dados:
        for coluna in item.keys():
            if coluna not in todas_colunas:
                todas_colunas.append(coluna)

    colunas_extras = [col for col in todas_colunas if col not in ordem_colunas]
    colunas = [col for col in ordem_colunas if col in todas_colunas] + colunas_extras

    with open(caminho_completo, "w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=colunas)
        escritor.writeheader()
        escritor.writerows(dados)

    print(f"Dados exportados para {caminho_completo}")
    print(f"Total de registros exportados: {len(dados)}")
    return caminho_completo
