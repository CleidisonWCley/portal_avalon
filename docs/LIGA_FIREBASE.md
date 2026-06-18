# Liga Avalon e Firebase — V7.8.1

## 1. Objetivo

A Liga combina uma aplicação local estática com sincronização em tempo real:

```text
liga.js
├── competição, rascunho, arquivos e canvas
└── funciona antes do Firebase

liga-firebase.js
├── acesso, autenticação e permissões
├── publicação e sincronização
└── encerramento e listener em tempo real

Firebase Authentication
└── autentica organizadores

Cloud Firestore
└── publica somente a Liga ativa
```

Participantes não fazem login. Eles acompanham somente o documento publicado.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `web/pages/liga.html` | estrutura da página e scripts canônicos |
| `web/assets/js/liga.js` | competição, estado local, arquivos e canvas |
| `web/assets/js/liga-firebase.js` | acesso, Firestore e ciclo de vida online |
| `web/assets/js/firebase-config.js` | SDK, coleções, documento e chaves locais |
| `web/data/arenas.json` | modalidades e mapas |

`liga.js` importa `liga-firebase.js` em segundo plano depois de montar a interface local. Falha ou lentidão no CDN Firebase não deve bloquear a página.

## 3. Perfis de acesso

### Participante

Escolhe Participante uma única vez no navegador. O perfil é salvo em:

```text
portal_avalon_liga_access_role = participant
```

Nas visitas seguintes:

```text
abrir Liga
→ detectar participante
→ ocultar seletor
→ iniciar listener
→ mostrar Liga publicada ou tela de espera
```

Pode visualizar e baixar conteúdos públicos. Não pode alterar, publicar, sincronizar, encerrar ou acessar arquivos administrativos.

O perfil só é removido por **Mudar de acesso**.

### Organizador temporário

Quando a opção de permanência não é marcada:

- Firebase usa persistência de sessão;
- o papel fica em `portal_avalon_liga_access_role_session`;
- atualizar e navegar na mesma sessão não exige novo login;
- ao encerrar a sessão do navegador, o login é solicitado novamente.

### Organizador persistente

Quando o usuário marca **Manter acesso de organizador neste dispositivo**:

- Firebase usa persistência local;
- o papel fica em `portal_avalon_liga_access_role`;
- `portal_avalon_liga_access_persistent = true` registra o consentimento;
- o UID é revalidado em `admins/{uid}` ao retornar;
- nenhuma senha é salva pelo Portal.

**Mudar de acesso** encerra a autenticação e remove as preferências.

## 4. Persistência local

| Chave | Uso |
|---|---|
| `portal_avalon_liga_draft_v2` | rascunho exclusivo do organizador |
| `portal_avalon_liga_archives_v1` | até cinco Ligas preservadas no dispositivo |
| `portal_avalon_liga_access_role` | participante ou organizador persistente |
| `portal_avalon_liga_access_role_session` | organizador temporário |
| `portal_avalon_liga_access_persistent` | consentimento de permanência administrativa |
| `portal_avalon_liga` e `portal_avalon_liga_v*` | chaves legadas migradas somente pelo organizador |

O participante nunca lê ou grava rascunhos e arquivos administrativos.

Arquivos são locais ao navegador/dispositivo. Não são backup em nuvem e não aparecem em outro computador.

## 5. Ciclo de vida

### Rascunho

Antes da publicação:

- alterações são salvas em `portal_avalon_liga_draft_v2`;
- o rascunho é restaurado silenciosamente para organizadores;
- não existe modal legado de “Restaurar Liga”;
- participantes não recebem nada.

A ação disponível é **Descartar rascunho**.

### Publicação

A publicação exige:

- modalidade;
- quantidade válida de participantes;
- equipes válidas, quando aplicável;
- chaves ou estrutura competitiva.

Depois de publicada:

```text
alteração
→ saveLiga()
→ debounce
→ Firestore
→ onSnapshot()
→ participantes atualizados
```

### Liga concluída

Pódio completo altera o status para `finalizada`, mas não encerra a transmissão. O resultado continua público até decisão do organizador.

### Encerramento

**Encerrar Liga** oferece:

- **Encerrar e arquivar**, quando há pódio;
- **Encerrar e manter rascunho**, quando a competição ainda está incompleta;
- **Encerrar e limpar**.

Para o participante, todas as opções interrompem imediatamente a visualização.

#### Preservar

- Liga concluída: cria arquivo administrativo local;
- Liga incompleta: mantém rascunho local;
- limpa o estado ativo;
- não publica o arquivo.

#### Limpar

- encerra a publicação;
- remove rascunho e estados legados;
- zera a Liga ativa;
- não cria arquivo.

Documento remoto após encerramento:

```javascript
{
  publicada: false,
  status: "encerrada",
  state: null,
  encerradaEm: serverTimestamp(),
  encerradaPorUid: "UID",
  updatedAt: serverTimestamp()
}
```

## 6. Arquivos administrativos

Limite local: **5**.

Disponíveis somente para organizadores autenticados:

- Ver resultado;
- Duplicar como novo rascunho;
- Excluir.

A visualização arquivada é somente consulta e nunca é transmitida.

A duplicação preserva informações de preparação úteis, mas remove progresso competitivo, vencedores, pódio, fase e estado de batalha.

Ao atingir o limite, o sistema não exclui arquivos antigos automaticamente.

## 7. Participante e estado vazio

Documento válido:

```javascript
publicada === true && state
```

Caso contrário, o participante recebe uma Liga vazia e a mensagem:

```text
Nenhum torneio em andamento
Quando os organizadores publicarem uma nova Liga, ela aparecerá automaticamente.
```

Ligas arquivadas, rascunhos e dados antigos nunca são apresentados ao participante.

## 8. Navegação

Durante uma Liga ativa:

- **Cancelar:** permanece na página;
- **Sair e manter a Liga:** sincroniza mudanças pendentes, mantém a publicação e navega;
- **Encerrar Liga e sair:** usa o mesmo fluxo de preservação/limpeza e navega após confirmação.

Links externos, downloads e nova guia não devem ser interceptados como navegação interna.

## 9. Configuração Firebase

Configuração funcional em `firebase-config.js`:

```text
adminCollection: admins
leagueCollection: ligas
leagueDocumentId: liga_atual
leagueSchemaVersion: 1
maxLocalArchives: 5
publishDebounceMs: 750
```

Para ambiente isolado de desenvolvimento, pode-se usar `dev_local`. Não troque o documento de produção sem revisar o ambiente.

### Authentication

Método:

```text
E-mail e senha
```

Domínios autorizados devem incluir:

- `localhost` para testes;
- domínio do Cloudflare Pages;
- domínio personalizado, se houver.

Não adicionar protocolo, porta ou caminho.

### Administradores

Cada conta administrativa exige um documento:

```text
admins/{UID}
├── nome: string
├── ativo: true
└── funcao: string
```

O ID deve ser exatamente o UID do Firebase Authentication. Conta autenticada sem documento ou com `ativo: false` não recebe acesso.

## 10. Documento da Liga

Durante publicação:

```javascript
{
  nome: "Liga Avalon",
  publicada: true,
  status: "em_andamento" | "finalizada",
  schemaVersion: 1,
  revision: 1,
  state: {
    modoId: "",
    participantes: [],
    ordem: [],
    teamMode: "auto",
    manualTeams: [],
    bracket: {},
    phaseIndex: 0,
    battleStarted: true
  },
  createdAt: timestamp,
  publishedAt: timestamp,
  updatedAt: timestamp,
  updatedByUid: "UID"
}
```

Não armazenar senhas, tokens, e-mails administrativos, chaves privadas ou dados pessoais desnecessários na coleção `ligas`.

## 11. Regras recomendadas do Firestore

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function adminPath() {
      return /databases/$(database)/documents/admins/$(request.auth.uid);
    }

    function isAdmin() {
      return request.auth != null
        && exists(adminPath())
        && get(adminPath()).data.ativo == true;
    }

    match /admins/{uid} {
      allow read: if request.auth != null
                  && request.auth.uid == uid;
      allow create, update, delete: if false;
    }

    match /ligas/{ligaId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();

      match /{document=**} {
        allow read: if true;
        allow create, update, delete: if isAdmin();
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Esconder botões não é segurança. A barreira real é:

```text
Authentication
+ admins/{uid}
+ ativo == true
+ Firestore Security Rules
```

Nunca usar `allow read, write: if true` em produção.

## 12. Operação e conflitos

O estado completo da Liga é salvo em um documento. Se dois organizadores editarem simultaneamente, a última gravação pode prevalecer. Regra operacional: um organizador principal altera; os demais acompanham ou assumem de forma coordenada.

## 13. Teste obrigatório

Usar dois contextos:

- janela normal como Organizador;
- janela anônima como Participante.

Verificar:

1. participante lembrado após retorno;
2. organizador temporário e persistente;
3. conta não autorizada e `ativo: false`;
4. rascunho silencioso;
5. publicação inicial;
6. atualizações em tempo real;
7. encerramento com preservação e limpeza;
8. `state: null` após encerramento;
9. arquivo invisível ao participante;
10. Mudar de acesso;
11. falha e retorno de conexão;
12. navegação mantendo ou encerrando a Liga.

A V7.8.1 foi validada com Firebase simulado. A operação contra o Firestore real deve ser confirmada no ambiente publicado.
