# Regras de negócio e dados

## 1. Fontes da verdade

| Informação | Arquivo |
|---|---|
| raid atual | `web/data/raids/raid_atual.json` |
| histórico e políticas | `web/data/raids/raid_history.json` |
| correções manuais comprovadas | `web/data/raids/raid_manual_overrides.json` |
| raid anterior compatível | `web/data/raids/raid_anterior.json` |
| caminhos consumidos pelo app | `web/assets/js/data.js` |
| membros e aliases do OCR | `ocr/guild-rank-ocr/src/config.py` |
| insígnias | `web/data/insignias.json` |
| galeria | `web/data/gallery/eventos.json` |
| modos e mapas da Liga | `web/data/arenas.json` |

Screenshots são evidência primária. O JSON tratado é derivado revisado. O histórico publicado é a fonte operacional do site. Não corrija somente um derivado sem registrar e conferir a origem.

## 2. Schema resumido das raids

### `raid_atual.json`

- `resumo`: totais, data, participantes, ausentes e dano da guilda;
- `membros`: nome, frequência, dano e status;
- `duplicados` e `raw_normalizado`: auditoria do OCR.

### `raid_history.json`

- `settings`: políticas, limites e tamanho da base;
- `seed`: origem da carga histórica;
- `raids`: raid atual e anteriores normalizadas.

### `raid_manual_overrides.json`

Usar somente para correções históricas comprovadas. Não utilizar para melhorar artificialmente resultados ou patentes.

## 3. Hall da Evolução

### Fórmula

```text
percentual = ((dano atual - média histórica válida) / média histórica válida) × 100
```

A raid atual nunca entra na própria média.

### Histórico válido

- frequência conhecida `>= 15/21`: entra na média;
- frequência conhecida `< 15/21`: é excluída;
- frequência desconhecida (`null`): entra como base estimada;
- dano vazio ou zero: não entra;
- são necessárias pelo menos duas raids válidas para percentual confiável.

### Limite de melhor posição pela frequência atual

| Faixa | Frequência mínima |
|---|---:|
| Top 1–3 | `18/21` |
| Top 4–10 | `15/21` |
| Top 11–20 | `12/21` |
| Top 21–30 | `6/21` |
| Fora do Hall | abaixo de `6/21` |

A frequência define a melhor posição permitida; não garante uma colocação. Posições superiores podem permanecer vagas e não devem ser renumeradas artificialmente.

### Ordem dos candidatos

1. maior percentual de evolução;
2. maior frequência atual;
3. maior evolução absoluta;
4. maior dano atual;
5. nome em ordem alfabética.

### Patentes

As patentes pertencem à posição final do Hall, não ao jogador. Elas devem ser recalculadas a cada raid.

## 4. Ranking de dano

Somente membros com dano válido, ataques acima de zero e status não ausente recebem posição numérica.

Desempate:

1. dano atual decrescente;
2. frequência atual decrescente;
3. nome.

O ranking de dano é independente do Hall de evolução.

## 5. Ausentes e base insuficiente

Membros ausentes permanecem visíveis no Registro e na Busca com:

- dano zero ou traço;
- frequência `0/21`;
- ranking `Incalculável`;
- evolução `Incalculável`;
- Hall `Fora do Hall`.

Novo membro não recebe histórico inventado. Ele permanece sem base suficiente até acumular raids válidas.

## 6. Histórico e rotação

`raid_history.json` respeita `settings.maxStoredRaids`. A promoção de uma nova raid:

- publica a nova atual;
- rebaixa a atual anterior;
- limita o histórico;
- filtra o histórico pelo elenco atual;
- preserva a versão do schema existente.

Políticas importantes:

- frequência desconhecida permanece `null`;
- frequência conhecida abaixo do limite não entra na média;
- saída de um membro não autoriza apagar evidência histórica arbitrariamente;
- aliases preservam o nick canônico.

## 7. Atualização de uma nova raid

### Preparação

1. confirmar que a raid terminou;
2. obter screenshots completos e sem linhas cortadas;
3. revisar entradas, saídas e mudanças de nick;
4. atualizar `NOMES_VALIDOS` e `ALIASES_MEMBROS`;
5. revisar correções temporárias do OCR.

### OCR

```bash
cd ocr/guild-rank-ocr
python -m src.main
```

Revisar:

- `ocr_raw_*.csv`;
- `ocr_tratado_*.csv`;
- linhas marcadas para revisão;
- duplicados;
- danos suspeitos;
- `raid_tratada_*.json`.

Casos de atenção conhecidos:

- um dígito omitido pode alterar centenas de milhões;
- frequência desconhecida não deve virar `21/21`;
- membro ausente deve permanecer no elenco atual com zero;
- a raid histórica de Wagnero com `6/21` é exemplo de exclusão da média.

### Promoção

Na raiz:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/raid_tratada_YYYYMMDD_HHMMSS.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json
```

### Validação

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

Depois executar as suítes descritas em [`TESTES.md`](TESTES.md).

## 8. Consulta estratégica de Raid

A página Raid usa:

```text
API: https://avalon-raid-api.cleidisonlima20.workers.dev
Assets: https://gtales.top/assets
Referência: https://gtales.top/raids/focus
```

O cache local dura seis horas. A interface diferencia:

- feedback global da ação;
- status próximo aos filtros;
- estado persistente na área de resultados.

Quando a API falhar, manter cache válido, mensagem clara e links oficiais. Não transformar falha externa em erro dos dados locais do Hall.

## 9. Regras competitivas da Liga

Fluxo funcional:

1. selecionar membros e convidados;
2. escolher modo;
3. configurar equipes, quando necessário;
4. sortear participantes;
5. gerar chaves;
6. definir ou sortear mapas;
7. registrar vencedores e colocações;
8. avançar fases;
9. concluir o pódio;
10. exportar chaves e resultados.

Regras de blindagem:

- chaves exigem participantes oficialmente sorteados;
- remover participante invalida a ordem e a estrutura preparada;
- alterações em equipes manuais invalidam chaves anteriores;
- mapas exigem chaves válidas;
- mudar mapa durante batalha não reinicia o torneio;
- pódio final é renderizado apenas na seção oficial;
- regras de bracket e Survival permanecem em `liga.js`.

Autenticação, publicação, arquivos e encerramento estão detalhados em [`LIGA_FIREBASE.md`](LIGA_FIREBASE.md).
