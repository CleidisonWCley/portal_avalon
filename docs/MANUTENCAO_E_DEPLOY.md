# Manutenção, release e deploy

## 1. Ambiente local

```bash
python -m http.server 8000 --directory web
```

Acesse `http://localhost:8000`. Live Server também é suportado.

Para o OCR, use o README próprio em `ocr/guild-rank-ocr/` e um ambiente virtual separado.

## 2. Fluxo seguro de alteração

1. trabalhar a partir da última versão aprovada;
2. guardar backup ou confiar em um commit limpo;
3. localizar todos os consumidores antes de renomear classe, função, arquivo ou chave;
4. alterar a menor área possível;
5. validar sintaxe e referências;
6. executar testes da área e regressões;
7. revisar `git diff`;
8. atualizar documentação e changelog;
9. publicar somente depois da revisão.

Antes de criar algo novo, pesquise se já existe implementação equivalente no HTML, CSS e JavaScript dinâmico.

## 3. Alterações comuns

### Novo membro

1. editar `ocr/guild-rank-ocr/src/config.py`;
2. adicionar nick a `NOMES_VALIDOS`;
3. adicionar aliases quando necessário;
4. executar o OCR da próxima raid;
5. não inventar histórico;
6. testar Hall, Buscar e Registro.

### Remover membro atual

1. confirmar a saída;
2. remover de `NOMES_VALIDOS`;
3. não apagar histórico antigo manualmente;
4. promover a próxima raid;
5. confirmar ausência nas áreas atuais.

### Nova raid

Fluxo completo está em [`REGRAS_E_DADOS.md`](REGRAS_E_DADOS.md). Exemplo para a Raid 134:

```bash
cd ocr/guild-rank-ocr
python -m src.main --raid 134 --ended-at AAAA-MM-DD --source official
cd ../..

python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/json/raid_134.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json \
  --published-previous web/data/raids/raid_anterior.json \
  --report ocr/guild-rank-ocr/output/json/raid_134_relatorio.json

python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

Antes de promover, confira o CSV bruto, o revisado e o relatório. Não use `--force` para ocultar uma execução anterior e não copie correções de outra raid.

### Cabeçalho ou rodapé

Estão repetidos nas páginas. Atualize `web/index.html` e todos os arquivos em `web/pages/`.

### Componente global

Verificar `styles.css`, `ui.js`, HTMLs estáticos e elementos criados dinamicamente. Testar todas as páginas.

### Liga/Firebase

Ler [`LIGA_FIREBASE.md`](LIGA_FIREBASE.md). Não duplicar regras competitivas em `liga-firebase.js`; não alterar chaves locais sem migração; não liberar escrita pública.

## 4. Áreas sensíveis

### Hall e dados

- `hall-rules.js`;
- `raid_history.json`;
- `raid_manual_overrides.json`;
- promoção, relatório e artefatos identificados do OCR.

Teste fórmulas, posições vagas, ausentes, base estimada e ranking de dano.

### Liga

- `liga.js`;
- `liga-firebase.js`;
- `firebase-config.js`;
- Firestore Rules;
- `admins/{uid}`.

Teste participante, organizador, publicação, navegação, arquivos e encerramento.

### UI e desempenho

- `styles.css`;
- `ui.js`;
- loader;
- breakpoints;
- imagens críticas;
- sistema de reveal e zoom.

Não adicionar efeitos decorativos infinitos ou blurs grandes em camadas fixas.

### Assets e caminhos

Linux e Cloudflare diferenciam maiúsculas de minúsculas. Ao migrar imagens, confirme que todos os caminhos apontam para os novos arquivos antes de remover os antigos.

## 5. Solução de problemas

### Página sem estilo

Verifique caminhos relativos e a aba Network. Raiz usa `assets/...`; páginas internas usam `../assets/...`.

### JSON não carrega

Não use `file://`. Execute servidor HTTP e confira Network/console.

### Membro não aparece

Verifique `NOMES_VALIDOS`, aliases, `raid_atual.json` e saída do OCR.

### Ranking ou Hall incorreto

Confirme números, frequência, status ausente, duplicados, base histórica e overrides. Execute o validador.

### Canvas não baixa

Verifique imagens, CORS, `toDataURL`, console e existência do botão/evento.

### Liga abre restauração antiga

Na V7.8.1 o modal legado não deve existir. Verifique se `liga.js` e `liga-firebase.js` atuais foram publicados e se as chaves antigas foram migradas pelo organizador.

### Participante vê conteúdo encerrado

O documento deve estar com `publicada: false` e `state: null`. Verifique listener, regras e cache de arquivos publicados.

### Organizador perde login

Confirme se marcou permanência. Sem marcação, a sessão é temporária por design.

### Firebase não conecta

Verifique domínio autorizado, configuração, Network, conta, `admins/{uid}`, `ativo` booleano e Rules.

### Raid externa falha

Verifique API, cache local e conexão. Preserve a última resposta válida.

### Erro após deploy

Verifique capitalização, diretório publicado, console, Network e cache. Compare produção com o commit publicado.

## 6. Versionamento

Orientação:

- `Vx.y`: recurso ou alteração funcional relevante;
- `Vx.y.z`: correção, blindagem ou refinamento menor.

Estados:

- Escopo;
- Em desenvolvimento;
- Validada;
- Entregue.

Uma release deve atualizar `CHANGELOG.md` e, quando necessário, este manual ou o documento temático afetado. Não criar um arquivo de release separado para cada ajuste pequeno.

## 7. Checklist antes do commit

```bash
git status
git diff --stat
git diff
```

Verificar:

- suíte rápida aprovada com `python tools/run_tests.py --quick`;
- JavaScript válido com `node --check`;
- JSON válido;
- referências locais existentes;
- ausência de erros no console;
- nenhuma credencial privada;
- arquivos novos e exclusões esperados;
- páginas mobile e desktop;
- documentação atualizada.

Não incluir:

- `.venv`;
- `__pycache__`;
- screenshots e evidências locais;
- arquivos temporários;
- Service Account;
- `.env` com segredos;
- chaves privadas.

## 8. Suíte de regressão

Comando padrão:

```bash
python tools/run_tests.py
```

Mudanças visuais, de Liga ou responsividade devem usar:

```bash
python tools/run_tests.py --all
```

A organização dos testes está em [`TESTES.md`](TESTES.md) e em [`../tools/README.md`](../tools/README.md).

## 9. Git

Fluxo com branch:

```bash
git switch main
git pull origin main
git switch -c fix/descritivo
```

Depois:

```bash
git add -A
git diff --cached --stat
git diff --cached --name-status
git commit -m "fix: descrição objetiva"
git push -u origin fix/descritivo
```

Um único commit é aceitável quando representa uma versão final testada e coerente. Mais de um commit é útil quando separa mudanças independentes e facilita revisão.

Nunca use `git clean` ou `git restore` sem confirmar o que será removido.

## 9. Deploy no Cloudflare Pages

Configuração recomendada:

- branch de produção: `main` ou a branch definida no projeto;
- comando de build: vazio;
- diretório de saída: `web`;
- variáveis: nenhuma obrigatória para a aplicação estática.

Se `web/` estiver configurado como raiz do projeto no Cloudflare, a saída pode ser `.`. Verifique antes de mudar.

Após o push:

1. acompanhar o deployment;
2. abrir produção em janela anônima;
3. testar todas as páginas;
4. conferir JSON público diretamente;
5. testar Liga com organizador e participante;
6. encerrar uma Liga de teste e confirmar `state: null`;
7. verificar console e Network;
8. registrar o commit publicado.

## 10. Rollback

Preferencial:

```bash
git revert HEAD
git push origin main
```

Ou redeploy de commit anterior pelo provedor. Não corrigir diretamente em produção sem registrar no Git. Para erros de dados, restaurar JSONs do backup ou commit anterior.

## 11. Limpeza do repositório

Documentação não deve armazenar evidências visuais ou originais de design. Testes e utilitários em `tools/` não pesam no carregamento do site e devem ser mantidos enquanto forem úteis.

Arquivos antigos continuam recuperáveis pelo histórico do Git; não é necessário duplicá-los em `docs/`.
