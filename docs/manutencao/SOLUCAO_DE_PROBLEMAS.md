# Solução de problemas

## Página sem estilo

**Causa provável:** caminho relativo incorreto.  
**Verifique:** aba Network e `<link rel="stylesheet">`.  
**Corrija:** páginas em `web/pages/` usam `../assets/...`; a raiz usa `assets/...`.  
**Teste:** recarregue sem cache.

## JSON não carrega / CORS

**Causa:** página aberta por `file://`.  
**Correção:** execute um servidor HTTP local.

## Membro não aparece

**Verifique:** `NOMES_VALIDOS`, `raid_atual.json`, aliases e status do OCR.  
**Teste:** Busca e Registro.

## Ranking de dano incorreto

**Verifique:** dano numérico, frequência, status ausente e duplicidade. Empate usa frequência e depois nome.

## Patente ou Hall incorreto

**Verifique:** média histórica, frequência atual, raids válidas, `hallPositionRules` e overrides. Execute o validador histórico.

## Média incorreta

Confirme que a raid atual não entrou na própria média; frequências históricas conhecidas abaixo de `15/21` devem ser excluídas; frequência desconhecida deve permanecer `null`.

## Canvas não baixa

Abra o console. Verifique imagens locais, CORS de imagens externas, `toDataURL` e existência do botão/evento.

## Liga não avança

Limpe o estado local de teste, confirme participantes/equipes e verifique o console. Não altere a chave de armazenamento sem migração.

## Mapas não aparecem

Verifique `web/data/arenas.json`, caminho da imagem e modo selecionado.

## Consulta Raid falha

A API externa pode estar indisponível. Verifique Network, cache local, URL base em `raid.js` e se o boss/elemento existem.

## Botão global não aparece

Confirme `.site-back-top`, carregamento de `ui.js`, limite `data-threshold` e altura suficiente para rolagem.

## Classe alterada quebrou outra página

Pesquise a classe no projeto inteiro, inclusive strings em JavaScript. Reaplique o nome anterior e migre consumidores antes de apagar.

## Caminho quebrado após deploy

Confirme que o diretório publicado é `web/` e que os arquivos mantêm a mesma capitalização. Linux/Cloudflare diferencia maiúsculas de minúsculas.
