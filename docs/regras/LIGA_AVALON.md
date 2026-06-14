# Liga Avalon

A Liga funciona inteiramente no navegador.

## Fluxo

1. selecionar membros/convidados;
2. escolher modo;
3. configurar equipes quando necessário;
4. sortear ordem;
5. gerar chaves;
6. sortear mapas;
7. avançar vencedores;
8. concluir pódio;
9. exportar canvas.

## Persistência

Estado principal: `portal_avalon_liga_v531`. Chaves antigas são lidas para migração. Não troque a chave sem plano de compatibilidade.

## Modos

A definição vem de `web/data/arenas.json`. Regras de brackets e sobrevivência estão em `liga.js`.

## Canvas

1v1, 2v2 e 3v3 usam o mesmo motor adaptativo. O pódio usa modelo e resolvedor compartilhados para ouro, prata e bronze.
