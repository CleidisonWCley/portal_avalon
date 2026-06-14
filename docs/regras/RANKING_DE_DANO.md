# Ranking de dano

Somente membros com dano válido, ataques acima de zero e status não ausente recebem posição numérica.

## Ordem

1. dano atual decrescente;
2. frequência atual decrescente;
3. nome em ordem alfabética como desempate final.

## Ausentes

Continuam visíveis no Registro e na Busca, com:

- dano zero ou traço;
- frequência `0/21`;
- ranking `Incalculável`;
- evolução `Incalculável`;
- Hall `Fora do Hall`.

Ausente não deve ser artificialmente colocado como último colocado.
