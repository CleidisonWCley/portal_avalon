# Guia de manutenção

## Regra número 1: preservar o comportamento

A V7.6.1 é uma edição de manutenção. Antes de qualquer mudança, identifique se ela altera dados, regra, visual ou somente documentação. Mudanças em regras exigem uma nova versão funcional, não uma edição silenciosa.

## Ciclo seguro

### Antes

1. Faça backup ou crie uma branch.
2. Leia a documentação da área.
3. Pesquise o nome da classe/função no projeto inteiro.
4. Verifique HTML e conteúdo criado por JavaScript.
5. Anote o comportamento atual e uma evidência.

### Durante

1. Reutilize componentes existentes.
2. Não misture regra de negócio com estilização.
3. Não edite histórico sem fonte verificável.
4. Não apague aliases ou correções sem entender sua origem.
5. Faça alterações pequenas e testáveis.

### Depois

1. Rode sintaxe, testes estruturais e histórico.
2. Teste a página afetada em desktop e mobile.
3. Compare canvas antes/depois quando aplicável.
4. Atualize CHANGELOG, release e evidências.
5. Gere o ZIP somente após validação em pasta limpa.

## Tipos de mudança

- **Dados de raid:** siga `CHECKLIST_NOVA_RAID.md`.
- **Membro/alias:** siga `RECEITAS_DE_MANUTENCAO.md`.
- **Hall:** leia os três documentos em `docs/regras/` sobre Hall, dano e histórico.
- **Liga/canvas:** leia `docs/regras/LIGA_AVALON.md` e `docs/arquitetura/CANVAS.md`.
- **Raid estratégica:** leia `docs/regras/CONSULTA_RAID.md`.
- **Componente global:** leia `docs/arquitetura/COMPONENTES.md`.

## Fonte da verdade

Não copie um valor para vários lugares. Identifique a fonte oficial em `docs/arquitetura/DADOS.md` e mantenha os derivados gerados por ferramentas.

## Definition of Done

Uma manutenção está concluída quando:

- a fonte oficial foi atualizada;
- não há erro de sintaxe ou JSON;
- referências locais existem;
- páginas consumidoras foram testadas;
- documentação e CHANGELOG refletem a mudança;
- o ZIP foi extraído e testado novamente.

## Checklist reutilizável

Use também [`GUIA_DE_ALTERACAO_FUTURA.md`](GUIA_DE_ALTERACAO_FUTURA.md) em qualquer manutenção.
