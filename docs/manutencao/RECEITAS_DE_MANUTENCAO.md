# Receitas de manutenção

## Alterar texto público

1. Pesquise o texto inteiro no projeto.
2. Se estiver no HTML, altere a página.
3. Se aparecer por `innerHTML`/template, altere o JavaScript.
4. Teste acentos, mobile e leitores de tela.

## Adicionar membro

1. Adicione em `NOMES_VALIDOS` no OCR.
2. Adicione aliases conhecidos.
3. Não adicione histórico fictício.
4. Execute o OCR e publique a nova raid.
5. Teste Busca, Registro e Hall.

## Mudança de nick

1. Mantenha o novo nick como canônico em `NOMES_VALIDOS`.
2. Coloque o nick antigo em `ALIASES_MEMBROS`.
3. Verifique se `normalizeMemberKey`/normalização mantém o histórico associado.
4. Não duplique o jogador no JSON.

## Remover membro ativo

Remova do elenco oficial do OCR e publique a próxima raid. Não apague registros históricos sem necessidade de privacidade ou correção comprovada.

## Alterar regras do Hall

1. Edite a configuração em `raid_history.json` somente com aprovação.
2. Revise `hall-rules.js` se a estrutura da regra mudar.
3. Atualize `HALL_DA_EVOLUCAO.md`.
4. Crie nova versão funcional.
5. Rode todos os testes de Hall e regressão.

## Alterar componente global

Pesquise todas as ocorrências no HTML e no JavaScript. Componentes podem ser criados dinamicamente; procurar apenas no HTML não basta.

## Alterar canvas

Localize, nesta ordem:

1. tema/tokens;
2. modelo normalizado;
3. resolvedor de layout;
4. renderizador;
5. função de exportação.

Gere imagens com nomes curtos, longos e caracteres especiais.

## Limpar localStorage da Liga

No console do navegador:

```js
localStorage.removeItem('portal_avalon_liga_v531');
```

Use isso quando estado antigo causar chaves incoerentes durante testes.
