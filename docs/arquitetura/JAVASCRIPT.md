# Arquivos JavaScript

## `data.js`

Constantes de caminhos, labels de status, patentes e configuração de acesso desabilitada.

## `hall-rules.js`

Módulo puro e testável. Normaliza regras, calcula frequência exigida por posição, identifica desclassificação, ordena candidatos, distribui Hall e associa patentes.

## `app.js`

Carrega dados, consolida histórico, calcula médias/evolução, cria ranking de dano, renderiza Salão/Hall/Busca/Registro/Galeria e gera ficha do Guardião.

Inicialização principal: `init()` no fim do arquivo, condicionada por `body[data-page]`.

## `ui.js`

Expõe `window.AvalonUI` com:

- `initBackToTop()`;
- `showActionFeedback()`;
- `closeActionFeedback()`.

## `liga.js`

Gerencia participantes, convidados, modos, equipes, sorteio, chaves, mapas, fases, pódio e canvas. Armazena estado sob `portal_avalon_liga_v531` e lê chaves legadas para compatibilidade.

## `raid.js`

Consulta a API configurada em `RAID_API_BASE`, mantém cache de seis horas, renderiza filtros, composições, equipamentos, cards inline e feedback global.

## Utilitários semelhantes não unificados

`$`, `$$`, `formatNumber`, `loadJson` e animações possuem implementações locais. A V7.6.1 não os unificou para preservar comportamento. Consulte o inventário de redundâncias antes de uma futura refatoração.

## `firebase-config.js`

**Localização:**

```text
web/assets/js/firebase-config.js

Responsável por:

carregar o SDK modular do Firebase por CDN;
inicializar o aplicativo Firebase;
inicializar o Firebase Authentication;
inicializar o Cloud Firestore;
definir o documento utilizado pela Liga;
armazenar configurações compartilhadas da integração.

Principais configurações:

adminCollection: "admins"
leagueCollection: "ligas"
leagueDocumentId: "dev_local"
localStorageKey: "portal_avalon_liga_v531"
publishDebounceMs: 750

Durante o desenvolvimento, a Liga utiliza:

leagueDocumentId: "dev_local"

Na produção:

leagueDocumentId: "liga_atual"

O objeto firebaseConfig pode permanecer no frontend. Ele identifica o projeto, mas não concede acesso administrativo. A proteção real depende do Authentication, dos documentos admins/{UID} e das regras do Firestore.
# TRECHOS DOCUMENTAIS — INTEGRAÇÃO FIREBASE DA LIGA

---

# 1. `README.md` da raiz

## Onde adicionar

Insira depois da apresentação das funcionalidades principais ou antes da seção de estrutura do projeto.

## Trecho

```markdown
## Liga em tempo real

A Liga Avalon utiliza **Firebase Authentication** para autenticar os organizadores e **Cloud Firestore** para sincronizar chaves, mapas, resultados e pódios em tempo real.

Os participantes podem acompanhar o torneio sem login, com acesso somente à visualização e aos downloads disponíveis. Os controles de criação, sorteio, avanço de fases e encerramento ficam restritos aos organizadores autorizados.

O Portal continua sendo uma aplicação estática hospedada no Cloudflare Pages. O Firebase é utilizado somente como serviço de autenticação e persistência da Liga.

Documentação técnica:

[`docs/arquitetura/FIREBASE_LIGA.md`](docs/arquitetura/FIREBASE_LIGA.md)
```

---

# 2. `docs/README.md`

## Onde adicionar

Inclua na seção de arquitetura ou no índice principal da documentação.

## Trecho

```markdown
### Firebase da Liga

- [`arquitetura/FIREBASE_LIGA.md`](arquitetura/FIREBASE_LIGA.md) — autenticação dos organizadores, Firestore, publicação da Liga, sincronização em tempo real, encerramento, segurança e testes.
```

Caso o arquivo possua uma seção de leitura recomendada, acrescente:

```markdown
Para alterações relacionadas à Liga em tempo real, consulte primeiro:

1. [`arquitetura/FIREBASE_LIGA.md`](arquitetura/FIREBASE_LIGA.md)
2. [`regras/LIGA_AVALON.md`](regras/LIGA_AVALON.md)
3. [`manutencao/AREAS_SENSIVEIS.md`](manutencao/AREAS_SENSIVEIS.md)
```

---

# 3. `docs/arquitetura/JAVASCRIPT.md`

## Onde adicionar

Inclua depois da descrição de `liga.js`.

## Trecho

````markdown
## `firebase-config.js`

**Localização:**

```text
web/assets/js/firebase-config.js
````

Responsável por:

* carregar o SDK modular do Firebase por CDN;
* inicializar o aplicativo Firebase;
* inicializar o Firebase Authentication;
* inicializar o Cloud Firestore;
* definir o documento utilizado pela Liga;
* armazenar configurações compartilhadas da integração.

Principais configurações:

```javascript
adminCollection: "admins"
leagueCollection: "ligas"
leagueDocumentId: "dev_local"
localStorageKey: "portal_avalon_liga_v531"
publishDebounceMs: 750
```

Durante o desenvolvimento, a Liga utiliza:

```javascript
leagueDocumentId: "dev_local"
```

Na produção:

```javascript
leagueDocumentId: "liga_atual"
```

O objeto `firebaseConfig` pode permanecer no frontend. Ele identifica o projeto, mas não concede acesso administrativo. A proteção real depende do Authentication, dos documentos `admins/{UID}` e das regras do Firestore.

---

## `liga-firebase.js`

**Localização:**

```text
web/assets/js/liga-firebase.js
```

Responsável por:

* apresentar o acesso como Participante ou Organizador;
* autenticar organizadores por e-mail e senha;
* validar o documento `admins/{UID}`;
* bloquear controles administrativos para participantes;
* preservar o rascunho local antes da publicação;
* publicar a Liga no Firestore;
* sincronizar alterações depois da publicação;
* acompanhar o documento remoto com `onSnapshot()`;
* encerrar a transmissão;
* proteger a navegação durante uma Liga ativa;
* preservar o `localStorage` como cache e contingência.

O arquivo trabalha sobre funções existentes em `liga.js`, principalmente:

```javascript
saveLiga()
applySavedLiga()
renderAll()
resetLeague()
```

### Relação entre os arquivos

```text
liga.js
├── regras do torneio
├── participantes
├── modalidades
├── equipes
├── mapas
├── chaves
├── resultados
├── pódio
└── canvas

liga-firebase.js
├── autenticação
├── autorização
├── publicação
├── sincronização
├── listener em tempo real
├── encerramento
└── proteção de navegação
```

O `liga-firebase.js` não deve duplicar a lógica competitiva de `liga.js`.

### Ordem de carregamento

Em `liga.html`:

```html
<script src="../assets/js/ui.js"></script>
<script src="../assets/js/liga.js"></script>
<script type="module" src="../assets/js/liga-firebase.js"></script>
```

O módulo Firebase deve ser carregado depois de `liga.js`.