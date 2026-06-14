# Fluxos do sistema

## Hall da Evolução

```text
raid_atual.json + raid_history.json + overrides
→ normalização de nomes
→ elenco atual
→ seleção de raids históricas válidas
→ média base
→ evolução absoluta e percentual
→ regras de elegibilidade e limite de posição
→ distribuição das posições
→ patente dinâmica
→ Hall, Busca e Registro
```

## Ranking de dano

```text
membros atuais
→ excluir apenas da posição quem está ausente/sem dano/sem ataques
→ ordenar dano decrescente
→ desempatar por frequência
→ desempatar por nome
→ currentRank
```

Ausentes continuam visíveis, mas com ranking `Incalculável`.

## Liga Avalon

```text
membros + convidados
→ modo
→ equipes (quando necessário)
→ sorteio
→ geração de chaves
→ mapas
→ vencedores
→ final
→ pódio
→ canvas completo e individual
```

O estado é salvo no `localStorage` do navegador.

## Consulta Raid

```text
lista de bosses da API
→ seleção do boss
→ elementos disponíveis
→ consulta da composição
→ cache local
→ cards de heróis, equipamentos e estratégia
```

## Atualização de raid

```text
screenshots
→ OCR bruto
→ tratamento/aliases/ausentes
→ revisão manual
→ raid_tratada.json
→ promote_raid_history.py
→ raid_atual.json + rotação de raid_history.json
→ validação
→ testes
→ commit
→ deploy
```
