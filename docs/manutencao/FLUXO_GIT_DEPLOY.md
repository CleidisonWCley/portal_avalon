# Fluxo de commit e deploy

## Modelo de branch

```bash
git checkout main
git pull
git checkout -b manutencao/raid-YYYY-MM-DD
```

Sugestões de prefixo:

- `data/` para raid e galeria;
- `fix/` para correção;
- `docs/` para documentação;
- `manutencao/` para refatoração sem mudança funcional.

## Antes do commit

```bash
git status
git diff --stat
git diff
bash tools/run_tests_v7_6_1.sh
```

Não inclua `.venv`, cache Python, screenshots temporários desnecessários ou segredos.

## Commits recomendados

```bash
git add web/data/raids docs
git commit -m "data: atualizar raid 2026-06-XX"
```

Ou:

```bash
git add .
git commit -m "docs: consolidar manutenção do Portal Avalon"
```

## GitHub

1. Faça push da branch.
2. Abra Pull Request.
3. Revise diff, testes e arquivos binários.
4. Faça merge na branch publicada somente após aprovação.
5. Crie tag quando representar uma release:

```bash
git tag -a v7.6.1 -m "Portal Avalon V7.6.1 Maintenance Edition"
git push origin v7.6.1
```

## Cloudflare Pages

Configuração recomendada quando o repositório inteiro está conectado:

- branch de produção: a branch principal escolhida;
- comando de build: vazio/nenhum;
- diretório de saída: `web`;
- variável/segredo: nenhuma exigida pelo Portal estático.

Após o merge:

1. acompanhe o deployment no painel;
2. confirme status de sucesso;
3. abra a URL de produção;
4. force atualização sem cache;
5. teste Salão, Hall, Buscar, Registro, Raid e Liga;
6. abra diretamente um JSON publicado, por exemplo `data/raids/raid_atual.json`;
7. registre o ID/data do deploy no relatório da raid.

Se o projeto Cloudflare estiver configurado com `web/` como diretório raiz, use saída `.` em vez de `web`. Não altere essa configuração sem verificar o setup atual.

## GitHub Pages opcional

Como o conteúdo está em `web/`, publicar diretamente pelo Pages exige workflow/branch de publicação ou reorganização para raiz/`docs`. Não mova a aplicação somente para atender Pages se Cloudflare já estiver funcionando.

## Rollback

- reverta o commit problemático ou redeploye um commit anterior;
- não corrija diretamente em produção sem registrar no Git;
- restaure os JSONs do backup quando o problema for de dados.
