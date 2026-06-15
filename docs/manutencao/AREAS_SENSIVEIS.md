# Áreas sensíveis

## Crítico

| Área | Por que é sensível | Testes mínimos |
|---|---|---|
| `hall-rules.js` | define elegibilidade, ordem e patentes | testes V7.3.1/V7.6 + casos de frequência |
| `raid_history.json` | fonte histórica e configuração | validador histórico + percentuais conhecidos |
| promoção de raid | pode perder histórico/elenco | backup, diff JSON, validador |
| aliases | podem unir ou separar pessoas erradas | OCR + Busca + histórico |
| Liga/chaves | estado recursivo e localStorage | modos, avanço, desfazer, pódio |
| canvas | geometria e imagens assíncronas | 1v1, 2v2, 3v3, nomes longos |

## Alto

- `app.js`: compartilhado por Salão, Hall, Buscar, Registro e Galeria.
- `styles.css`: cascata longa; uma regra global pode afetar sete páginas.
- `ui.js`: feedback e botão usados por vários módulos.
- caminhos relativos: páginas em `web/pages/` usam `../`.
- OCR `config.py`: coordenadas e correções podem substituir leituras reais.

## Médio

- filtros e ordenação visual;
- textos gerados por templates;
- responsividade;
- galeria e metadados;
- cards inline da Raid.

## Baixo

- documentação;
- texto isolado confirmado por busca global;
- imagem nova sem substituir arquivo existente;
- evidência ou release histórica.

## Regra de proteção

Quanto maior o risco, menor deve ser a alteração e maior o número de testes. Não aprove uma mudança crítica apenas porque “a página abriu”.

```markdown
## Firebase da Liga — risco alto

Arquivos e recursos sensíveis:

```text
web/assets/js/firebase-config.js
web/assets/js/liga-firebase.js
web/assets/js/liga.js
Firestore Security Rules
admins/{UID}
ligas/dev_local
ligas/liga_atual
````

### Riscos principais

* liberar gravação pública no Firestore;
* cadastrar UID incorreto em `admins`;
* usar `ativo` como string em vez de booleano;
* trocar `dev_local` por `liga_atual` antes dos testes;
* alterar a estrutura de `state` sem compatibilidade;
* mudar a chave do `localStorage`;
* duplicar regras de competição em `liga-firebase.js`;
* remover o patch de `saveLiga()` sem validar sincronização;
* ocultar downloads no modo participante;
* publicar senhas ou credenciais administrativas;
* permitir edição simultânea sem controle entre organizadores.

### Regras obrigatórias

Nunca utilizar:

```javascript
allow read, write: if true;
```

A escrita deve continuar restrita a:

usuário autenticado
+
admins/{UID}
+
ativo == true

Não versionar:
service-account.json
*.pem
*.key
.env com segredos
senhas
tokens administrativos

### Testes obrigatórios após alteração

* login administrativo;
* conta não autorizada;
* participante sem login;
* publicação inicial;
* sincronização automática;
* sincronização manual;
* encerramento;
* navegação protegida;
* falha de conexão;
* retorno da conexão;
* downloads;
* canvas;
* pódio;
* regras do Firestore.

### Conflito entre organizadores

A implementação atual salva o estado completo da Liga em um documento.

Caso dois organizadores alterem o torneio simultaneamente, a última gravação poderá prevalecer.

Regra operacional:

um organizador principal realiza as alterações;
os demais acompanham ou assumem quando necessário.
