"""Elenco dinâmico da guilda: quem permanece, saiu, é novo ou retornou.

Até a V7.9.0 o elenco era uma lista escrita à mão em ``NOMES_VALIDOS``. Cada
entrada ou saída exigia editar o código, e foi aí que os dois últimos membros
novos deram problema em sequência (vírgula faltando que colou dois nomes,
grafia ``DuckDonald`` x ``DuckDolnad``, membro novo lido como outro membro).

Agora o elenco de cada raid é CALCULADO comparando o ranking lido com o
histórico das raids anteriores (``output/json/raid_*.json`` e o histórico
publicado do portal):

    permanecem   estavam na raid anterior e aparecem no ranking atual
    saíram       estavam na raid anterior e NÃO aparecem no ranking atual
    novos        aparecem no ranking e nunca estiveram em nenhuma raid anterior
    retornantes  aparecem no ranking, não estavam na raid anterior, mas já
                 estiveram em alguma raid mais antiga (ex.: tang, Raids 135-136)

Limite importante, e por isso nada aqui é decidido em silêncio: o ranking do
jogo não lista quem não atacou. Um membro que apenas faltou na raid é
indistinguível, no screenshot, de quem saiu da guilda (o histórico tem vários
casos: Snowers na Raid 141, PeSH, Carlinhozz...). Por isso toda saída é
classificada como *inferida*, vem com a evidência (última raid, ausências
anteriores) e pode ser revertida com ``--manter-ausente NOME``.

Uso isolado (sem OCR), para auditar qualquer raid já processada:

    python -m src.utils.elenco --raid 144
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path

from src.config import (
    CAPACIDADE_GUILDA,
    DIR_DADOS_WEB_RAIDS,
    DIR_JSON_RAIDS,
    ELENCO_MANUAL_POR_RAID,
    LIMITE_TROCA_NICK,
    MEMBROS_SEMPRE_NO_ELENCO,
    NOMES_VALIDOS,
    STATUS_DANO_SUSPEITO,
    STATUS_FREQUENCIA_SUSPEITA,
    STATUS_NOVO_MEMBRO,
    STATUS_REVISAR,
    TAMANHO_NOME_MAX,
    TAMANHO_NOME_MIN,
    VOTOS_MINIMOS_NOME_NOVO,
)
from src.utils.name_matcher import corrigir_nome_em_camadas
from src.utils.postprocess import juntar_status, parse_int

# Quantas raids de "ausências anteriores" o relatório mostra por membro.
ESQUEMA_ELENCO = 1


# ============================================================
# HISTÓRICO
# ============================================================

def _entrada_ocr(membro: dict) -> dict:
    return {
        "dano": parse_int(membro.get("dano")),
        "frequencia": membro.get("frequencia"),
        "status_participacao": membro.get("status_participacao"),
    }


def _entrada_web(membro: dict) -> dict:
    return {
        "dano": int(membro.get("damage") or membro.get("dano") or 0),
        "frequencia": membro.get("frequency") or membro.get("frequencia"),
        "status_participacao": membro.get("status_participacao"),
    }


def _numero_do_payload(payload: dict) -> int | None:
    valor = (payload.get("raid") or {}).get("number")
    if valor is None:
        valor = (payload.get("resumo") or {}).get("raidNumber")
    try:
        return int(valor) if valor is not None else None
    except (TypeError, ValueError):
        return None


def _ler_json(caminho: Path) -> dict | None:
    try:
        return json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def carregar_historico(
    raid_numero: int,
    dir_json: Path = DIR_JSON_RAIDS,
    dir_web: Path = DIR_DADOS_WEB_RAIDS,
) -> tuple[dict[int, dict[str, dict]], dict[int, str], list[str]]:
    """Lê os membros de todas as raids ANTERIORES à informada.

    Devolve ``(raids, fontes, avisos)`` com ``raids = {numero: {nome: {...}}}``.
    A própria raid (e qualquer número maior) nunca entra: um JSON antigo da
    raid sendo reprocessada não pode contaminar o elenco dela mesma.

    Prioridade quando a mesma raid existe em mais de uma fonte (a última vence):
    histórico publicado < raid_anterior/raid_atual publicadas < ``output/json``.
    Raids de ``output/json`` cujo relatório não está "validada" são ignoradas.
    """
    raids: dict[int, dict[str, dict]] = {}
    fontes: dict[int, str] = {}
    avisos: list[str] = []

    def registrar(numero, membros: dict, fonte: str) -> None:
        if numero is None or numero >= raid_numero or not membros:
            return
        raids[numero] = membros
        fontes[numero] = fonte

    # 1) histórico publicado pelo portal
    historico = _ler_json(Path(dir_web) / "raid_history.json")
    for raid in (historico or {}).get("raids", []):
        numero = raid.get("raidNumber")
        membros = {m["name"]: _entrada_web(m) for m in raid.get("members", []) if m.get("name")}
        registrar(int(numero) if numero is not None else None, membros, "web/raid_history.json")

    # 2) raid_anterior e raid_atual publicadas
    for arquivo in ("raid_anterior.json", "raid_atual.json"):
        payload = _ler_json(Path(dir_web) / arquivo)
        if payload:
            membros = {m["nome"]: _entrada_ocr(m) for m in payload.get("membros", []) if m.get("nome")}
            registrar(_numero_do_payload(payload), membros, f"web/{arquivo}")

    # 3) artefatos do OCR (fonte mais completa: inclui ausentes)
    pasta = Path(dir_json)
    if pasta.exists():
        for caminho in sorted(pasta.glob("raid_*.json")):
            casado = re.fullmatch(r"raid_(\d+)\.json", caminho.name)
            if not casado:
                continue
            numero = int(casado.group(1))
            if numero >= raid_numero:
                continue
            relatorio = _ler_json(pasta / f"raid_{numero}_relatorio.json")
            if relatorio and relatorio.get("status") not in (None, "validada"):
                avisos.append(f"Raid {numero} ignorada no histórico: relatório com status '{relatorio.get('status')}'.")
                continue
            payload = _ler_json(caminho)
            if payload:
                membros = {m["nome"]: _entrada_ocr(m) for m in payload.get("membros", []) if m.get("nome")}
                registrar(numero, membros, f"output/json/{caminho.name}")

    return raids, fontes, avisos


# ============================================================
# CONTEXTO (entrada para o OCR e para a análise)
# ============================================================

@dataclass
class ContextoElenco:
    raid: int
    raid_anterior: int | None
    roster_anterior: list[str]
    nomes_historicos: list[str]          # já estiveram em alguma raid, mas não na anterior
    historico: dict[int, dict[str, dict]]
    fontes: dict[int, str]
    fonte_elenco: str                    # "historico" ou "config_base"
    manter_ausentes: list[str] = field(default_factory=list)
    renomear_novos: dict[str, str] = field(default_factory=dict)
    nao_e_novo: dict[str, str] = field(default_factory=dict)
    saidas_confirmadas: list[str] = field(default_factory=list)
    novos_confirmados: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    def resolver_nome(self, texto: str) -> dict:
        """Resolve um nome lido em camadas, da mais para a menos segura.

        1. elenco da raid anterior: aliases e fuzzy protegido;
        2. membros que já passaram pela guilda: SOMENTE o nome oficial exato
           (reconhece retornantes sem deixar ruído curto "ressuscitar" ex-membros).
        """
        camadas: list[tuple] = [(self.roster_anterior, True)]
        if self.nomes_historicos:
            camadas.append((self.roster_anterior + self.nomes_historicos, False, False))
        return corrigir_nome_em_camadas(texto, camadas)


def construir_contexto(
    raid_numero: int,
    manter_ausentes: list[str] | tuple[str, ...] = (),
    dir_json: Path = DIR_JSON_RAIDS,
    dir_web: Path = DIR_DADOS_WEB_RAIDS,
    sempre_no_elenco: list[str] | None = None,
    manual: dict | None = None,
) -> ContextoElenco:
    """Monta o contexto de elenco de uma raid.

    Membros mantidos como ausentes = ``MEMBROS_SEMPRE_NO_ELENCO`` (config) +
    ``manter_ausentes`` da raid + ``--manter-ausente``. Uma saída confirmada
    para a raid tem precedência sobre a lista global (mas não sobre as
    escolhas explícitas da própria raid, que viram erro se contradizerem).
    ``sempre_no_elenco`` e ``manual`` existem para testes; por padrão vêm do config.
    """
    raids, fontes, avisos = carregar_historico(raid_numero, dir_json, dir_web)
    if manual is None:
        manual = ELENCO_MANUAL_POR_RAID.get(int(raid_numero), {})
    globais = list(MEMBROS_SEMPRE_NO_ELENCO if sempre_no_elenco is None else sempre_no_elenco)
    globais = [n for n in globais if n not in manual.get("saidas_confirmadas", [])]
    manter = list(dict.fromkeys([*globais, *manual.get("manter_ausentes", []), *manter_ausentes]))

    if raids:
        raid_anterior = max(raids)
        roster_anterior = list(raids[raid_anterior])
        vistos = set(roster_anterior)
        historicos: list[str] = []
        for numero in sorted(raids, reverse=True):
            for nome in raids[numero]:
                if nome not in vistos:
                    vistos.add(nome)
                    historicos.append(nome)
        fonte = "historico"
    else:
        raid_anterior = None
        roster_anterior = list(NOMES_VALIDOS)
        historicos = []
        fonte = "config_base"
        avisos.append(
            "Nenhuma raid anterior encontrada: usando o elenco base de NOMES_VALIDOS. "
            "Saídas/entradas não podem ser inferidas nesta execução."
        )

    return ContextoElenco(
        raid=int(raid_numero),
        raid_anterior=raid_anterior,
        roster_anterior=roster_anterior,
        nomes_historicos=historicos,
        historico=raids,
        fontes=fontes,
        fonte_elenco=fonte,
        manter_ausentes=manter,
        renomear_novos={k.casefold(): v for k, v in manual.get("renomear_novos", {}).items()},
        nao_e_novo={k.casefold(): v for k, v in manual.get("nao_e_novo", {}).items()},
        saidas_confirmadas=list(manual.get("saidas_confirmadas", [])),
        novos_confirmados=list(manual.get("novos_confirmados", [])),
        avisos=avisos,
    )


# ============================================================
# EVIDÊNCIAS POR MEMBRO
# ============================================================

def _ultima_participacao(ctx: ContextoElenco, nome: str) -> dict | None:
    for numero in sorted(ctx.historico, reverse=True):
        entrada = ctx.historico[numero].get(nome)
        if entrada and entrada["dano"] > 0:
            return {"raid": numero, "dano": entrada["dano"], "frequencia": entrada["frequencia"]}
    return None


def _ausencias_anteriores(ctx: ContextoElenco, nome: str) -> list[int]:
    """Raids em que o membro constava no elenco mas sem dano (0/21)."""
    return sorted(
        numero for numero, membros in ctx.historico.items()
        if nome in membros and membros[nome]["dano"] <= 0
    )


def _ausencias_consecutivas(ctx: ContextoElenco, nome: str) -> int:
    """Quantas raids seguidas sem atacar, contando a atual (que é a que falta)."""
    total = 1
    for numero in sorted(ctx.historico, reverse=True):
        entrada = ctx.historico[numero].get(nome)
        if entrada is not None and entrada["dano"] <= 0:
            total += 1
        else:
            break
    return total


def _ultima_raid_no_elenco(ctx: ContextoElenco, nome: str) -> int | None:
    presentes = [n for n, membros in ctx.historico.items() if nome in membros]
    return max(presentes) if presentes else None


def _formatar_dano(valor: int) -> str:
    return f"{valor / 1e9:.2f} bi"


# ============================================================
# CLASSIFICAÇÃO (compartilhada entre o OCR e a auditoria isolada)
# ============================================================

def classificar_elenco(
    ctx: ContextoElenco,
    encontrados: dict[str, dict],
    mantidos_ausentes: list[str] | None = None,
) -> dict:
    """Compara quem apareceu no ranking com o histórico e monta o bloco ``elenco``.

    ``encontrados`` é ``{nome: {"dano", "frequencia", "imagem", "linha", ...}}``
    (somente quem aparece no ranking). ``mantidos_ausentes`` são membros que o
    ranking não lista mas que continuam na guilda (decisão manual).
    """
    mantidos = [n for n in (mantidos_ausentes if mantidos_ausentes is not None else ctx.manter_ausentes)]
    anterior = ctx.roster_anterior
    anterior_set = set(anterior)
    historicos = set(ctx.nomes_historicos)
    avisos: list[str] = []
    erros: list[str] = []

    for nome in mantidos:
        if nome not in anterior_set and nome not in historicos:
            erros.append(
                f"Membro mantido como ausente '{nome}': nome desconhecido (não consta em nenhuma raid anterior). "
                "Confira a grafia exata."
            )
    mantidos = [n for n in mantidos if n not in encontrados and (n in anterior_set or n in historicos)]
    for nome in ctx.saidas_confirmadas:
        if nome in encontrados or nome in mantidos:
            erros.append(f"Saída confirmada de '{nome}', mas ele aparece no ranking ou foi mantido como ausente.")
        elif nome not in anterior_set:
            erros.append(f"Saída confirmada de '{nome}': não estava na raid anterior (confira a grafia).")
    for nome in ctx.novos_confirmados:
        if nome not in encontrados:
            erros.append(f"Novo membro confirmado '{nome}' não foi encontrado no ranking (confira a grafia).")
        elif nome in anterior_set or nome in historicos:
            erros.append(f"Novo membro confirmado '{nome}' já consta no histórico: não é novo.")

    ordenados = sorted(encontrados, key=lambda n: (-int(encontrados[n].get("dano") or 0), n))
    posicao = {nome: indice for indice, nome in enumerate(ordenados, start=1)}

    def info_encontrado(nome: str) -> dict:
        dados = encontrados[nome]
        saida = {
            "nome": nome,
            "posicao": posicao[nome],
            "frequencia": dados.get("frequencia"),
            "dano": int(dados.get("dano") or 0),
        }
        if dados.get("imagem"):
            saida["imagem"] = dados["imagem"]
            saida["linha"] = dados.get("linha")
        return saida

    permanecem = [info_encontrado(n) for n in ordenados if n in anterior_set]

    retornantes = []
    for nome in ordenados:
        if nome in anterior_set or nome not in historicos:
            continue
        item = info_encontrado(nome)
        ultima = _ultima_raid_no_elenco(ctx, nome)
        item["ultimaRaidNoElenco"] = ultima
        if ultima is not None and ctx.raid_anterior is not None:
            item["raidsForaDoElenco"] = ctx.raid_anterior - ultima
        retornantes.append(item)

    novos = []
    for nome in ordenados:
        if nome in anterior_set or nome in historicos:
            continue
        item = info_encontrado(nome)
        for chave in ("leituraOcr", "votos", "leituras", "origem", "recorte"):
            if encontrados[nome].get(chave) is not None:
                item[chave] = encontrados[nome][chave]
        item["grafiaConfirmada"] = nome in ctx.novos_confirmados
        novos.append(item)

    saidos = []
    for nome in anterior:
        if nome in encontrados or nome in mantidos:
            continue
        ultima = _ultima_participacao(ctx, nome)
        ausencias = _ausencias_anteriores(ctx, nome)
        consecutivas = _ausencias_consecutivas(ctx, nome)
        item = {
            "nome": nome,
            "ultimaRaidComDano": ultima["raid"] if ultima else None,
            "ultimoDano": ultima["dano"] if ultima else 0,
            "ultimaFrequencia": ultima["frequencia"] if ultima else None,
            "ausenciasConsecutivas": consecutivas,
            "ausenciasAnteriores": ausencias,
            "decisao": "saiu",
            "inferido": nome not in ctx.saidas_confirmadas,
        }
        pode_so_ter_faltado = [n for n in ausencias if n < (ctx.raid_anterior or 0)]
        if pode_so_ter_faltado and item["inferido"]:
            item["observacao"] = (
                f"já ficou ausente antes (Raid {', '.join(map(str, pode_so_ter_faltado))}) e voltou: "
                "pode ter apenas faltado."
            )
        saidos.append(item)

    sugestoes = []
    for saiu in saidos:
        base = saiu["ultimoDano"]
        if base <= 0:
            continue
        for novo in novos:
            if not saiu["inferido"] and novo["grafiaConfirmada"]:
                continue          # os dois foram confirmados: não é troca de nick
            variacao = (novo["dano"] - base) / base
            if abs(variacao) <= LIMITE_TROCA_NICK:
                sugestoes.append({
                    "tipo": "possivel_troca_de_nick",
                    "saiu": saiu["nome"],
                    "novo": novo["nome"],
                    "motivo": (
                        f"{saiu['nome']} fez {_formatar_dano(base)} na Raid {saiu['ultimaRaidComDano']} e "
                        f"{novo['nome']} fez {_formatar_dano(novo['dano'])} agora ({variacao:+.0%}). "
                        "Hipótese a confirmar no jogo; não é aplicada automaticamente."
                    ),
                })

    for item in saidos:
        if not item["inferido"]:
            avisos.append(f"SAIU (confirmado): {item['nome']} estava na Raid {ctx.raid_anterior}.")
            continue
        evidencia = f"estava na Raid {ctx.raid_anterior} e não aparece no ranking da Raid {ctx.raid}"
        extra = f" ({item['observacao']})" if item.get("observacao") else ""
        avisos.append(
            f"SAIU (inferido): {item['nome']} {evidencia}{extra} "
            f"Se só faltou, use --manter-ausente {item['nome']} (ou MEMBROS_SEMPRE_NO_ELENCO no config)."
        )
    for nome in mantidos:
        consecutivas = _ausencias_consecutivas(ctx, nome)
        extra = f" Ausente há {consecutivas} raids seguidas: confira se ainda está na guilda." if consecutivas >= 3 else ""
        avisos.append(f"MANTIDO COMO AUSENTE: {nome} (0/21, mantido por configuração).{extra}")
    for item in novos:
        if item["grafiaConfirmada"]:
            avisos.append(f"NOVO (grafia confirmada): {item['nome']} (posição {item['posicao']}, {item.get('frequencia')}).")
            continue
        avisos.append(
            f"NOVO: {item['nome']} (posição {item['posicao']}, {item.get('frequencia')}). "
            "Confira a grafia no recorte salvo em output/revisao."
        )
    for item in retornantes:
        avisos.append(f"RETORNANTE: {item['nome']} (última vez no elenco: Raid {item.get('ultimaRaidNoElenco')}).")
    for sugestao in sugestoes:
        avisos.append("DICA: " + sugestao["motivo"])
    if len(novos) > 3:
        avisos.append(f"{len(novos)} membros novos de uma vez: confira se não há leitura errada de nomes.")

    elenco_atual = list(ordenados) + [n for n in mantidos if n not in encontrados]
    if len(elenco_atual) > CAPACIDADE_GUILDA:
        erros.append(f"Elenco com {len(elenco_atual)} membros excede a capacidade da guilda ({CAPACIDADE_GUILDA}).")
    if not encontrados:
        erros.append("Nenhum membro identificado no ranking.")

    return {
        "esquema": ESQUEMA_ELENCO,
        "raid": ctx.raid,
        "raidAnterior": ctx.raid_anterior,
        "fonteElenco": ctx.fonte_elenco,
        "fontesHistorico": {str(n): ctx.fontes[n] for n in sorted(ctx.fontes)},
        "contagens": {
            "atuais": len(elenco_atual),
            "permanecem": len(permanecem),
            "saidos": len(saidos),
            "novos": len(novos),
            "retornantes": len(retornantes),
            "mantidosAusentes": len(mantidos),
        },
        "atuais": elenco_atual,
        "permanecem": permanecem,
        "saidos": saidos,
        "novos": novos,
        "retornantes": retornantes,
        "mantidosAusentes": mantidos,
        "sugestoes": sugestoes,
        "avisos": avisos,
        "erros": erros,
    }


# ============================================================
# ANÁLISE DAS LINHAS DO OCR
# ============================================================

@dataclass
class ResultadoElenco:
    registros: list[dict]
    roster: list[str]
    elenco: dict
    erros: list[str]
    avisos: list[str]


def _partes(status: str) -> list[str]:
    return [p.strip() for p in (status or "").split(";") if p.strip()]


def _sem_status(status: str, remover: str) -> str:
    return ";".join(p for p in _partes(status) if p != remover)


def _nome_plausivel(nome: str) -> bool:
    return (
        TAMANHO_NOME_MIN <= len(nome) <= TAMANHO_NOME_MAX
        and re.fullmatch(r"\w+", nome) is not None
        and not nome.isdigit()
    )


def _distancia_continuidade(dano: int, referencia: int) -> float:
    if dano <= 0 or referencia <= 0:
        return math.inf
    return abs(math.log(dano / referencia))


def analisar_elenco(registros: list[dict], ctx: ContextoElenco) -> ResultadoElenco:
    """Decide, linha a linha, quem é membro conhecido, novo, retornante ou pendente.

    - Linha cujo nome não casou com ninguém, mas com frequência e dano válidos e
      uma grafia que se repete nas leituras do OCR, vira MEMBRO NOVO (automático).
    - Duas linhas disputando o mesmo nome com danos diferentes são resolvidas pela
      continuidade com o dano da raid anterior; a perdedora fica pendente.
    - O restante (nome ilegível, dano/frequência duvidosos) continua pendente e
      bloqueia a promoção, como antes.
    """
    linhas = deepcopy(registros)
    avisos: list[str] = list(ctx.avisos)
    erros: list[str] = []
    conhecidos = {n.casefold(): n for n in [*ctx.roster_anterior, *ctx.nomes_historicos]}

    # 1) nomes não resolvidos: membro novo (consenso entre leituras) ou pendência
    for linha in linhas:
        partes = _partes(linha.get("status"))
        if STATUS_REVISAR not in partes:
            continue
        local = f"{linha.get('imagem_origem')} linha {linha.get('linha')}"
        if STATUS_DANO_SUSPEITO in partes or STATUS_FREQUENCIA_SUSPEITA in partes:
            avisos.append(f"{local}: nome não reconhecido e dano/frequência duvidosos; mantida como pendente.")
            continue

        lido = (linha.get("nome_candidato") or "").strip()
        votos = int(linha.get("nome_candidato_votos") or 0)
        chave = lido.casefold()

        if chave in ctx.nao_e_novo:
            nome, origem = ctx.nao_e_novo[chave], "correcao_manual"
        elif chave in ctx.renomear_novos:
            nome, origem = ctx.renomear_novos[chave], "correcao_manual"
        elif votos >= VOTOS_MINIMOS_NOME_NOVO and _nome_plausivel(lido):
            nome, origem = lido, "consenso_ocr"
        else:
            avisos.append(
                f"{local}: nome ilegível (leitura {lido!r}, {votos} voto(s)). Pode ser membro novo com nome em "
                "outro alfabeto: confira o recorte em output/revisao e use ELENCO_MANUAL_POR_RAID."
            )
            continue

        if nome.casefold() in conhecidos:           # leitura de alguém já conhecido
            nome = conhecidos[nome.casefold()]
            linha["status"] = juntar_status(_sem_status(linha.get("status"), STATUS_REVISAR), "nome_corrigido")
        else:
            linha["status"] = juntar_status(_sem_status(linha.get("status"), STATUS_REVISAR), STATUS_NOVO_MEMBRO)
            linha["_origem_nome_novo"] = origem
        linha["nome"] = nome

    # 2) duas linhas com o mesmo nome e danos diferentes: continuidade com a raid anterior
    por_nome: dict[str, list[dict]] = defaultdict(list)
    for linha in linhas:
        if linha.get("nome") and STATUS_REVISAR not in _partes(linha.get("status")):
            por_nome[linha["nome"]].append(linha)
    for nome, grupo in por_nome.items():
        distintas = {(parse_int(l.get("dano")), str(l.get("frequencia"))) for l in grupo}
        if len(distintas) <= 1:
            continue                                  # mesma linha fotografada duas vezes
        ultima = _ultima_participacao(ctx, nome)
        if not ultima:
            avisos.append(f"{nome}: lido em linhas com danos diferentes e sem histórico para decidir.")
            continue
        vencedora = min(grupo, key=lambda l: _distancia_continuidade(parse_int(l.get("dano")), ultima["dano"]))
        chave_vencedora = (parse_int(vencedora.get("dano")), str(vencedora.get("frequencia")))
        for linha in grupo:
            if (parse_int(linha.get("dano")), str(linha.get("frequencia"))) == chave_vencedora:
                continue
            linha["status"] = juntar_status(linha.get("status"), STATUS_REVISAR)
            avisos.append(
                f"{linha.get('imagem_origem')} linha {linha.get('linha')}: disputava o nome '{nome}' com "
                f"{vencedora.get('imagem_origem')} linha {vencedora.get('linha')}; ficou com a mais próxima do dano "
                f"da Raid {ultima['raid']} e esta ficou pendente."
            )

    # 3) quem aparece no ranking
    encontrados: dict[str, dict] = {}
    for linha in linhas:
        nome = linha.get("nome")
        partes = _partes(linha.get("status"))
        if not nome or STATUS_REVISAR in partes:
            continue
        dano = parse_int(linha.get("dano"))
        atual = encontrados.get(nome)
        if atual is not None and atual["dano"] >= dano:
            continue
        encontrados[nome] = {
            "dano": dano,
            "frequencia": linha.get("frequencia"),
            "imagem": linha.get("imagem_origem"),
            "linha": linha.get("linha"),
        }
        if STATUS_NOVO_MEMBRO in partes:
            encontrados[nome]["origem"] = linha.get("_origem_nome_novo", "consenso_ocr")
            encontrados[nome]["leituraOcr"] = linha.get("nome_candidato") or linha.get("nome_ocr")
            encontrados[nome]["votos"] = linha.get("nome_candidato_votos")
            encontrados[nome]["leituras"] = linha.get("nome_candidato_leituras")
            stem = Path(str(linha.get("imagem_origem"))).stem
            encontrados[nome]["recorte"] = (
                f"output/revisao/raid_{ctx.raid}/{stem}_linha{int(linha.get('linha') or 0):02d}_nome.png"
            )

    # Nomes que não vieram do matcher (modelo visual/correção manual) e que
    # ninguém conhece também são membros novos.
    for linha in linhas:
        linha.pop("_origem_nome_novo", None)
    for nome, dados in encontrados.items():
        if nome not in conhecidos.values() and "origem" not in dados:
            dados["origem"] = "correcao_manual_ou_modelo_visual"

    elenco = classificar_elenco(ctx, encontrados)
    erros.extend(elenco.pop("erros"))
    avisos.extend(elenco["avisos"])
    elenco["avisos"] = avisos
    return ResultadoElenco(
        registros=linhas,
        roster=list(elenco["atuais"]),
        elenco=elenco,
        erros=erros,
        avisos=avisos,
    )


# ============================================================
# AUDITORIA ISOLADA (sem OCR)
# ============================================================

def auditar_raid(raid_numero: int, dir_json: Path = DIR_JSON_RAIDS, dir_web: Path = DIR_DADOS_WEB_RAIDS) -> dict:
    """Recalcula o elenco de uma raid já processada a partir do seu JSON."""
    payload = _ler_json(Path(dir_json) / f"raid_{raid_numero}.json")
    if payload is None:
        raise FileNotFoundError(f"output/json/raid_{raid_numero}.json não encontrado.")
    ctx = construir_contexto(raid_numero, dir_json=dir_json, dir_web=dir_web)
    encontrados, ausentes = {}, []
    for membro in payload.get("membros", []):
        nome = membro.get("nome")
        if not nome:
            continue
        if parse_int(membro.get("dano")) > 0:
            encontrados[nome] = {
                "dano": parse_int(membro.get("dano")),
                "frequencia": membro.get("frequencia"),
                "imagem": membro.get("imagem_origem") or None,
                "linha": membro.get("linha"),
            }
        else:
            ausentes.append(nome)
    return classificar_elenco(ctx, encontrados, mantidos_ausentes=ausentes)


def imprimir_resumo(elenco: dict) -> None:
    c = elenco["contagens"]
    print(
        f"Elenco da Raid {elenco['raid']} (anterior: {elenco['raidAnterior']}) | atuais {c['atuais']} | "
        f"permanecem {c['permanecem']} | saíram {c['saidos']} | novos {c['novos']} | retornantes {c['retornantes']}"
    )
    for rotulo, chave in (("SAÍRAM", "saidos"), ("NOVOS", "novos"), ("RETORNANTES", "retornantes")):
        for item in elenco[chave]:
            detalhe = ""
            if chave == "saidos":
                detalhe = f" (última: Raid {item['ultimaRaidComDano']}, {item['ultimaFrequencia']})"
            elif chave == "novos":
                dano = f"{item['dano']:,}".replace(",", ".")
                detalhe = f" (posição {item['posicao']}, {item.get('frequencia')}, dano {dano})"
            elif chave == "retornantes":
                detalhe = f" (última no elenco: Raid {item.get('ultimaRaidNoElenco')})"
            print(f"  {rotulo:11} {item['nome']}{detalhe}")
    if elenco["mantidosAusentes"]:
        print("  MANTIDOS AUSENTES: " + ", ".join(elenco["mantidosAusentes"]))
    for sugestao in elenco.get("sugestoes", []):
        print("  DICA:", sugestao["motivo"])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audita o elenco (permanecem/saíram/novos/retornantes) de uma raid.")
    parser.add_argument("--raid", required=True, type=int)
    parser.add_argument("--json", action="store_true", help="Imprime o bloco completo em JSON")
    args = parser.parse_args(argv)
    try:
        elenco = auditar_raid(args.raid)
    except FileNotFoundError as erro:
        print(f"[ERRO] {erro}")
        return 2
    if args.json:
        print(json.dumps(elenco, ensure_ascii=False, indent=2))
    else:
        imprimir_resumo(elenco)
    return 0


if __name__ == "__main__":
    sys.exit(main())
