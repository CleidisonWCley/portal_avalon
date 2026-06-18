from copy import deepcopy

from src.config import (
    CORRECOES_LINHAS_POR_RAID,
    STATUS_LINHA_CORRIGIDA,
    USAR_CORRECOES_LINHAS,
)


def correcoes_da_raid(raid_numero: int) -> dict:
    """Retorna somente as correções explicitamente cadastradas para a raid."""
    if not USAR_CORRECOES_LINHAS:
        return {}
    return CORRECOES_LINHAS_POR_RAID.get(int(raid_numero), {})


def aplicar_correcoes_raid(registros: list[dict], raid_numero: int) -> tuple[list[dict], list[dict]]:
    """Aplica correções revisadas sem alterar o OCR bruto.

    A chave inclui o número da raid indiretamente, pois apenas o bloco daquela
    raid é carregado. Assim, uma correção de uma coleta anterior nunca é usada
    silenciosamente na coleta atual.
    """
    correcoes = correcoes_da_raid(raid_numero)
    revisados = deepcopy(registros)
    aplicadas = []

    for registro in revisados:
        chave = (registro.get("imagem_origem", ""), int(registro.get("linha") or 0))
        correcao = correcoes.get(chave)
        if not correcao:
            continue

        antes = {
            "nome": registro.get("nome", ""),
            "frequencia": registro.get("frequencia", ""),
            "dano": registro.get("dano", ""),
            "status": registro.get("status", ""),
        }
        registro.update({
            "nome": correcao["nome"],
            "frequencia": str(correcao["frequencia"]),
            "dano": str(correcao["dano"]),
            "status": STATUS_LINHA_CORRIGIDA,
        })
        aplicadas.append({
            "raidNumber": int(raid_numero),
            "imagem_origem": chave[0],
            "linha": chave[1],
            "antes": antes,
            "depois": {
                "nome": registro["nome"],
                "frequencia": registro["frequencia"],
                "dano": int(registro["dano"]),
                "status": registro["status"],
            },
        })

    return revisados, aplicadas
