from datetime import datetime
from pathlib import Path

from src.config import EXTENSOES_IMAGEM
from src.ocr.extractor import processar_imagem
from src.utils.export import exportar_csv
from src.utils.postprocess import salvar_json, tratar_dados_ocr


def listar_imagens() -> list[Path]:
    imagens = []
    pasta = Path("images")
    for extensao in EXTENSOES_IMAGEM:
        imagens.extend(pasta.glob(f"*{extensao}"))
    return sorted(imagens)


def main():
    todos_dados = []
    imagens = listar_imagens()

    if not imagens:
        print("Nenhuma imagem encontrada na pasta images/")
        return

    for caminho_imagem in imagens:
        dados = processar_imagem(str(caminho_imagem))
        todos_dados.extend(dados)
        print()

    if not todos_dados:
        print("Nenhum dado extraído de todas as imagens")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("-" * 70)
    print("EXPORTAÇÃO BRUTA DO OCR")
    exportar_csv(todos_dados, nome_arquivo=f"ocr_raw_{timestamp}.csv")

    print("-" * 70)
    print("TRATAMENTO E CONSOLIDAÇÃO v2.0")
    dados_tratados = tratar_dados_ocr(todos_dados)

    exportar_csv(dados_tratados["membros"], nome_arquivo=f"ocr_tratado_{timestamp}.csv")
    caminho_json = salvar_json(dados_tratados, Path("output") / f"raid_tratada_{timestamp}.json")

    resumo = dados_tratados["resumo"]
    print("Resumo:")
    print(f"Guilda: {resumo['guilda']}")
    print(f"Membros cadastrados: {resumo['membros_cadastrados']}")
    print(f"Vagas estimadas: {resumo['vagas_estimadas']}")
    print(f"Participantes: {resumo['participantes']}")
    print(f"Ausentes: {resumo['ausentes']}")
    print(f"Registros para revisar: {resumo['registros_revisar']}")
    print(f"Dano total da guilda: {resumo['dano_total_guilda']}")
    print(f"JSON tratado: {caminho_json}")


if __name__ == "__main__":
    main()
