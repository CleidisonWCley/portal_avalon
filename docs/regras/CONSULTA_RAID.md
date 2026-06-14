# Consulta de estratégias de Raid

A aba Raid consulta um serviço externo definido por `RAID_API_BASE` em `raid.js`.

## Fluxo

- carregar lista de bosses;
- selecionar boss;
- listar elementos;
- consultar composições;
- armazenar cache por seis horas;
- renderizar heróis, armas, acessórios, relíquias, cards e chains.

## Estados

- feedback global: ação central de carregar/sucesso/erro;
- `raid-status-card`: mensagem próxima aos filtros;
- `raid-state-card`: estado persistente na área de resultados.

Esses três papéis não devem ser fundidos apenas por semelhança visual.

## Falha externa

Quando a API estiver indisponível, preserve mensagem clara, cache válido e links oficiais. Não transforme indisponibilidade externa em erro do Hall/dados locais.
