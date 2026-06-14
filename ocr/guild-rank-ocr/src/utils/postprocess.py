import json
import re
from datetime import datetime
from pathlib import Path

from src.config import (
    ATAQUES_MAXIMOS_RAID,
    CAPACIDADE_GUILDA,
    DANO_MAXIMO_PLAUSIVEL,
    DANO_MINIMO_PARA_VALIDACAO,
    FREQUENCIA_PADRAO_AUSENTE,
    NOME_GUILDA,
    NOMES_VALIDOS,
    ORDENAR_POR_DANO,
    STATUS_LINHA_CORRIGIDA,
    STATUS_NOME_CORRIGIDO,
    STATUS_AUSENTE,
    STATUS_DANO_SUSPEITO,
    STATUS_DUPLICADO,
    STATUS_FREQUENCIA_SUSPEITA,
    STATUS_REVISAR,
)
from src.utils.name_matcher import corrigir_nome


def juntar_status(status_atual: str, novo_status: str) -> str:
    if not novo_status:
        return status_atual or ""
    if not status_atual:
        return novo_status
    partes = [p.strip() for p in status_atual.split(";") if p.strip()]
    if novo_status not in partes:
        partes.append(novo_status)
    return ";".join(partes)


def parse_int(valor) -> int:
    digitos = re.sub(r"\D", "", str(valor or ""))
    return int(digitos) if digitos else 0


def normalizar_frequencia(freq: str) -> tuple[str, str]:
    freq = str(freq or "").strip()
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})", freq)
    if m:
        feitos = int(m.group(1))
        total = int(m.group(2))
        if total == ATAQUES_MAXIMOS_RAID and 0 <= feitos <= total:
            return f"{feitos}/{total}", ""

    return freq, STATUS_FREQUENCIA_SUSPEITA


def status_participacao(freq: str, dano: int) -> str:
    if dano <= 0 or not freq or freq == FREQUENCIA_PADRAO_AUSENTE:
        return "ausente"
    feitos = int(freq.split("/")[0]) if "/" in freq and freq.split("/")[0].isdigit() else 0
    if feitos >= 21:
        return "completo"
    if feitos >= 15:
        return "participou_bem"
    if feitos >= 8:
        return "baixa_participacao"
    if feitos >= 1:
        return "quase_ausente"
    return "ausente"


def normalizar_registro(registro: dict) -> dict:
    nome_ocr = registro.get("nome", "")
    nome, status_nome = corrigir_nome(nome_ocr)

    status = registro.get("status", "") or ""
    status = juntar_status(status, status_nome)

    freq, status_freq = normalizar_frequencia(registro.get("frequencia", ""))
    status = juntar_status(status, status_freq)

    dano = parse_int(registro.get("dano", 0))
    if dano < DANO_MINIMO_PARA_VALIDACAO or dano > DANO_MAXIMO_PLAUSIVEL:
        status = juntar_status(status, STATUS_DANO_SUSPEITO)

    return {
        "imagem_origem": registro.get("imagem_origem", ""),
        "linha": registro.get("linha", ""),
        "nome": nome,
        "frequencia": freq,
        "dano": dano,
        "status": status,
        "status_participacao": status_participacao(freq, dano),
    }


def consolidar_registros(registros: list[dict]) -> tuple[list[dict], list[dict]]:
    """Remove duplicados mantendo o registro mais confiável por membro."""
    por_nome: dict[str, dict] = {}
    duplicados: list[dict] = []

    for reg in registros:
        nome = reg.get("nome", "")
        if not nome:
            continue

        atual = por_nome.get(nome)
        if atual is None:
            por_nome[nome] = reg
            continue

        duplicados.append(reg)

        # Critério: manter frequência válida e maior dano plausível.
        atual_suspeito = STATUS_DANO_SUSPEITO in atual.get("status", "") or STATUS_FREQUENCIA_SUSPEITA in atual.get("status", "")
        novo_suspeito = STATUS_DANO_SUSPEITO in reg.get("status", "") or STATUS_FREQUENCIA_SUSPEITA in reg.get("status", "")

        escolher_novo = False
        if atual_suspeito and not novo_suspeito:
            escolher_novo = True
        elif atual_suspeito == novo_suspeito and reg.get("dano", 0) > atual.get("dano", 0):
            escolher_novo = True

        if escolher_novo:
            atual["status"] = juntar_status(atual.get("status", ""), STATUS_DUPLICADO)
            duplicados.append(atual)
            por_nome[nome] = reg
        else:
            reg["status"] = juntar_status(reg.get("status", ""), STATUS_DUPLICADO)

    consolidados = list(por_nome.values())
    return consolidados, duplicados


def adicionar_ausentes(registros: list[dict]) -> list[dict]:
    nomes_presentes = {r.get("nome") for r in registros if r.get("nome")}
    saida = list(registros)

    for nome in NOMES_VALIDOS:
        if nome not in nomes_presentes:
            saida.append({
                "imagem_origem": "",
                "linha": "",
                "nome": nome,
                "frequencia": FREQUENCIA_PADRAO_AUSENTE,
                "dano": 0,
                "status": STATUS_AUSENTE,
                "status_participacao": "ausente",
            })

    return saida


def tratar_dados_ocr(registros_brutos: list[dict]) -> dict:
    normalizados = [normalizar_registro(r) for r in registros_brutos]

    # Remove linhas claramente vazias/ruído sem nome útil ou nomes fora do cadastro oficial.
    # A lista oficial é a fonte de verdade para evitar que "wa", "cr" ou ruídos
    # virem membros falsos no JSON final.
    normalizados = [
        r for r in normalizados
        if r.get("nome") and r.get("nome") in NOMES_VALIDOS
    ]

    consolidados, duplicados = consolidar_registros(normalizados)
    consolidados = adicionar_ausentes(consolidados)

    if ORDENAR_POR_DANO:
        consolidados.sort(key=lambda r: r.get("dano", 0), reverse=True)

    dano_total = sum(r.get("dano", 0) for r in consolidados)
    participantes = [r for r in consolidados if r.get("dano", 0) > 0]
    ausentes = [r for r in consolidados if r.get("status_participacao") == "ausente"]
    status_problematicos = {STATUS_REVISAR, STATUS_DANO_SUSPEITO, STATUS_FREQUENCIA_SUSPEITA}
    revisar = [
        r for r in consolidados
        if any(st in (r.get("status") or "").split(";") for st in status_problematicos)
    ]

    resumo = {
        "guilda": NOME_GUILDA,
        "gerado_em": datetime.now().isoformat(timespec="seconds"),
        "capacidade_guilda": CAPACIDADE_GUILDA,
        "membros_cadastrados": len(NOMES_VALIDOS),
        "vagas_estimadas": max(CAPACIDADE_GUILDA - len(NOMES_VALIDOS), 0),
        "participantes": len(participantes),
        "ausentes": len(ausentes),
        "registros_revisar": len(revisar),
        "duplicados_detectados": len(duplicados),
        "dano_total_guilda": dano_total,
    }

    return {
        "resumo": resumo,
        "membros": consolidados,
        "duplicados": duplicados,
        "raw_normalizado": normalizados,
    }


def salvar_json(dados: dict, caminho: str | Path) -> Path:
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho
