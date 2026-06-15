# Firebase da Liga Avalon

## Integração de autenticação administrativa e sincronização em tempo real

Este documento descreve a integração entre o Portal Avalon, o Firebase Authentication e o Cloud Firestore para funcionamento da Liga Avalon em tempo real.

A integração permite que organizadores autenticados administrem os torneios, enquanto participantes acompanham chaves, mapas, resultados e pódios sem precisar realizar login.

---

# 1. Visão geral

O Portal Avalon continua sendo uma aplicação estática hospedada no Cloudflare Pages.

O Firebase é utilizado somente pela área da Liga.

```text
Cloudflare Pages
├── páginas HTML
├── estilos CSS
├── scripts JavaScript
├── imagens
├── Hall da Evolução
├── Registro de Raid
├── Busca de membros
├── Consulta de Raid
├── Galeria
└── interface da Liga

Firebase Authentication
└── login dos organizadores

Cloud Firestore
└── estado compartilhado da Liga em tempo real
```

A integração não utiliza:

* Firebase Hosting;
* Cloud Functions;
* Cloud Storage;
* Realtime Database;
* backend próprio;
* npm;
* bundler;
* etapa de build.

O SDK do Firebase é carregado diretamente pelo navegador por módulos JavaScript via CDN.

---

# 2. Objetivos da integração

A integração foi criada para:

* permitir login seguro dos organizadores;
* restringir alterações da Liga a contas autorizadas;
* manter a visualização pública para participantes;
* publicar uma Liga somente quando estiver pronta;
* sincronizar alterações automaticamente após a publicação;
* mostrar resultados em tempo real;
* preservar um rascunho local antes da transmissão;
* manter uma cópia local em caso de falha de conexão;
* permitir encerramento controlado da Liga;
* proteger a saída da página durante uma transmissão ativa.

---

# 3. Arquivos envolvidos

## 3.1 Configuração do Firebase

```text
web/assets/js/firebase-config.js
```

Responsável por:

* importar o SDK Firebase;
* inicializar o aplicativo;
* inicializar Authentication;
* inicializar Firestore;
* definir o documento utilizado pela Liga;
* armazenar configurações da integração.

Principais exportações:

```javascript
firebaseApp
firebaseAuth
firebaseDb
firebaseConfigured
AVALON_FIREBASE_SETTINGS
```

---

## 3.2 Integração da Liga

```text
web/assets/js/liga-firebase.js
```

Responsável por:

* escolha entre Participante e Organizador;
* login administrativo;
* validação do organizador;
* controle de permissões visuais;
* restauração do rascunho;
* publicação inicial;
* sincronização automática;
* sincronização manual;
* encerramento da Liga;
* acompanhamento em tempo real;
* proteção de navegação;
* proteção contra fechamento com alterações pendentes.

---

## 3.3 Lógica principal da Liga

```text
web/assets/js/liga.js
```

Continua responsável por:

* participantes;
* convidados;
* modalidades;
* equipes;
* sorteios;
* mapas;
* chaves;
* resultados;
* avanço de fases;
* pódio;
* geração dos canvas;
* persistência local.

O arquivo `liga-firebase.js` não substitui essa lógica. Ele adiciona uma camada de autenticação e sincronização sobre o sistema existente.

---

## 3.4 Página da Liga

```text
web/pages/liga.html
```

No final do documento devem existir os scripts da Liga e o módulo Firebase:

```html
<script src="../assets/js/ui.js"></script>
<script src="../assets/js/liga.js"></script>
<script type="module" src="../assets/js/liga-firebase.js"></script>
```

O módulo Firebase deve ser carregado depois de `liga.js`.

---

# 4. Configuração do aplicativo Web

O aplicativo Web deve estar registrado no Console Firebase.

Configuração recomendada:

```text
Projeto Firebase: Portal Avalon Liga
Aplicativo Web: Portal Avalon — Liga
```

O Firebase Hosting não deve ser ativado, porque o Portal permanece hospedado no Cloudflare Pages.

O objeto fornecido pelo Firebase deve ser colocado em:

```text
web/assets/js/firebase-config.js
```

Exemplo:

```javascript
export const firebaseConfig = Object.freeze({
  apiKey: "VALOR_FORNECIDO_PELO_FIREBASE",
  authDomain: "PROJETO.firebaseapp.com",
  projectId: "PROJETO",
  storageBucket: "PROJETO.firebasestorage.app",
  messagingSenderId: "ID_FORNECIDO",
  appId: "APP_ID_FORNECIDO"
});
```

O `firebaseConfig` identifica o projeto Firebase, mas não concede acesso administrativo.

A segurança depende de:

* Firebase Authentication;
* documentos da coleção `admins`;
* regras do Firestore.

Nunca devem ser incluídos no repositório:

* senha de organizadores;
* tokens privados;
* arquivos de Service Account;
* chaves privadas;
* credenciais administrativas;
* arquivos `.env` contendo segredos.

---

# 5. Ambientes da Liga

A configuração possui um identificador para o documento da Liga.

Durante o desenvolvimento:

```javascript
leagueDocumentId: "dev_local"
```

Na produção:

```javascript
leagueDocumentId: "liga_atual"
```

Estrutura:

```text
ligas/
├── dev_local
└── liga_atual
```

## `dev_local`

Utilizado para:

* testes pelo servidor local;
* validação do login;
* testes em dois navegadores;
* testes de sincronização;
* testes de encerramento;
* testes de regras.

## `liga_atual`

Utilizado pelo Portal publicado depois que a integração estiver validada.

Antes de alterar `dev_local` para `liga_atual`, todos os testes obrigatórios devem ser executados.

---

# 6. Firebase Authentication

O método habilitado é:

```text
E-mail e senha
```

Caminho no Console Firebase:

```text
Authentication
→ Sign-in method
→ Email/Password
```

Somente contas administrativas precisam existir no Authentication.

Participantes não precisam realizar login.

---

# 7. Domínios autorizados

Os domínios utilizados pelo Portal devem ser autorizados em:

```text
Authentication
→ Settings
→ Authorized domains
```

Para testes locais:

```text
localhost
```

Para produção:

```text
portal-avalon.pages.dev
```

Caso seja utilizado um domínio personalizado, ele também deverá ser adicionado.

Não informar:

```text
http://
https://
porta
caminho da página
```

Correto:

```text
localhost
portal-avalon.pages.dev
```

Incorreto:

```text
http://localhost:8000
localhost:8000
https://portal-avalon.pages.dev/pages/liga.html
```

---

# 8. Administradores

Cada organizador precisa de:

1. uma conta no Firebase Authentication;
2. um documento correspondente no Firestore.

Estrutura:

```text
admins/
└── UID_DO_USUARIO
```

Campos recomendados:

```text
nome: string
ativo: boolean
funcao: string
```

Exemplo:

```text
admins/
└── aB12cd34EFgh5678
    ├── nome: "Organizador 01"
    ├── ativo: true
    └── funcao: "organizador"
```

O ID do documento deve ser exatamente igual ao UID fornecido pelo Firebase Authentication.

Não utilizar:

* ID automático;
* e-mail como ID;
* nome do usuário como ID.

A interface pública não exibe o nome nem o e-mail do organizador.

Esses dados são utilizados somente para:

* autorização;
* auditoria;
* gerenciamento interno.

---

# 9. Validação administrativa

O acesso como organizador exige:

```text
usuário autenticado
+
documento admins/{UID}
+
ativo == true
```

Uma conta autenticada sem documento em `admins` não recebe permissão administrativa.

Um documento com:

```text
ativo: false
```

também bloqueia o acesso administrativo.

---

# 10. Perfis de acesso

A Liga possui dois perfis:

```text
Participante
Organizador
```

---

# 11. Participante

O participante não realiza login.

Pode:

* visualizar participantes;
* visualizar equipes;
* visualizar chaves;
* visualizar mapas;
* visualizar resultados;
* acompanhar fases;
* visualizar semifinal;
* visualizar final;
* visualizar pódio;
* baixar chaves;
* baixar canvas;
* baixar pódio completo;
* baixar cards individuais disponíveis.

Não pode:

* adicionar membros;
* remover membros;
* adicionar convidados;
* selecionar modalidade;
* configurar equipes;
* gerar chaves;
* sortear mapas;
* definir vencedores;
* desfazer resultados;
* limpar a Liga;
* publicar;
* sincronizar;
* encerrar a transmissão.

Regra geral:

```text
visualização e download → permitidos
alteração do torneio → bloqueada
```

---

# 12. Organizador

O organizador pode:

* adicionar participantes;
* remover participantes;
* adicionar convidados;
* selecionar modalidade;
* configurar equipes;
* realizar sorteios;
* gerar chaves;
* sortear mapas;
* definir vencedores;
* avançar fases;
* corrigir resultados;
* gerar pódio;
* publicar a Liga;
* sincronizar alterações;
* encerrar a Liga.

O organizador utiliza:

```text
Firebase Authentication
+
Firestore Security Rules
```

Esconder controles no HTML não é considerado proteção suficiente.

As regras do Firestore são responsáveis por impedir gravações não autorizadas.

---

# 13. Seletor de acesso

Ao abrir a página, o Portal mostra um card com:

```text
Participante
Organizador
```

O seletor aparece:

```text
depois do título da Liga
antes do conteúdo da competição
```

O cabeçalho, o menu e os mascotes continuam visíveis.

Enquanto nenhum perfil for escolhido, o restante da interface da Liga permanece oculto.

---

# 14. Card do participante

Quando existe uma Liga publicada:

```text
MODO PARTICIPANTE

Liga em andamento.
Acompanhe as chaves, os mapas e os resultados em tempo real.
```

Botões:

```text
Mudar de acesso
Voltar ao Salão
```

Quando não existe Liga publicada:

```text
MODO PARTICIPANTE

Nenhum torneio em andamento.
Quando uma Liga for publicada, ela aparecerá automaticamente.
```

O participante nunca visualiza:

```text
Publicar Liga
Sincronizar agora
Encerrar Liga
```

---

# 15. Card do organizador

O card utiliza textos genéricos.

Não deve mostrar:

* nome do organizador;
* e-mail;
* UID;
* função interna;
* dados do documento `admins`.

## Rascunho

```text
ORGANIZAÇÃO DA LIGA

Rascunho local.
Prepare participantes, modalidade e chaves antes de publicar.
```

## Liga publicada

```text
ORGANIZAÇÃO DA LIGA

Liga ao vivo.
As alterações são transmitidas automaticamente aos participantes.
```

## Sem conexão

```text
ORGANIZAÇÃO DA LIGA

Sem conexão.
As alterações permanecem salvas neste navegador.
```

## Falha de sincronização

```text
ORGANIZAÇÃO DA LIGA

Não foi possível sincronizar as últimas alterações.
A última versão publicada permanece disponível aos participantes.
```

## Liga encerrada

```text
ORGANIZAÇÃO DA LIGA

Liga encerrada.
O rascunho local foi preservado.
```

---

# 16. Rascunho local

Antes da publicação, a Liga fica armazenada somente no navegador.

Fonte:

```text
localStorage
```

Chave atual:

```text
portal_avalon_liga_v531
```

O rascunho permite:

* preparar participantes;
* selecionar modalidade;
* configurar equipes;
* gerar chaves;
* revisar a competição;
* corrigir dados.

Enquanto a Liga estiver apenas como rascunho:

* participantes não visualizam o torneio;
* o Firestore não recebe alterações automáticas;
* o documento remoto pode continuar inexistente ou encerrado.

---

# 17. Publicação inicial

O botão:

```text
Publicar Liga
```

inicia oficialmente a transmissão.

A publicação exige:

* modalidade selecionada;
* participantes suficientes;
* equipes válidas, quando aplicável;
* chaves ou estrutura competitiva;
* estado interno válido.

Caso a Liga esteja incompleta:

```text
Liga ainda não está pronta

Conclua participantes, modalidade e geração das chaves
antes de iniciar a transmissão.
```

Nenhum rascunho incompleto deve ser publicado.

---

# 18. Documento da Liga

Estrutura principal:

```javascript
{
  nome: "Liga Avalon",
  publicada: true,
  status: "em_andamento",
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
  updatedByUid: "UID_DO_ORGANIZADOR"
}
```

A coleção não deve armazenar:

* senhas;
* e-mails;
* tokens;
* nomes reais;
* informações pessoais;
* credenciais;
* dados administrativos privados.

Devem ser armazenados apenas dados relacionados ao torneio:

* nomes utilizados no jogo;
* equipes;
* modalidades;
* mapas;
* confrontos;
* vencedores;
* resultados;
* pódio.

---

# 19. Sincronização em tempo real

Depois da primeira publicação:

```text
ação do organizador
→ saveLiga()
→ localStorage
→ debounce
→ Firestore
→ onSnapshot()
→ atualização dos participantes
```

A sincronização automática é ativada apenas quando:

```text
runtime.hasPublished == true
```

Antes da publicação:

```text
saveLiga()
→ localStorage
```

Depois da publicação:

```text
saveLiga()
→ localStorage
→ Firestore
```

---

# 20. Debounce

As alterações são agrupadas antes da gravação remota.

Configuração:

```javascript
publishDebounceMs: 750
```

O objetivo é impedir várias gravações consecutivas quando uma única ação altera diferentes partes do estado.

---

# 21. Sincronização manual

Depois da publicação, o botão muda para:

```text
Sincronizar agora
```

Ele serve para:

* enviar imediatamente o estado;
* cancelar a espera do debounce;
* tentar novamente após uma falha;
* confirmar manualmente a versão remota.

Em caso de erro:

```text
Tentar sincronizar
```

A última versão válida permanece disponível aos participantes.

---

# 22. Listener em tempo real

O Firestore é acompanhado com:

```javascript
onSnapshot()
```

O listener:

1. recebe o estado atual;
2. identifica se `publicada` é `true`;
3. atualiza o `localStorage`;
4. aplica o estado em `liga.js`;
5. chama `renderAll()`;
6. atualiza a interface;
7. continua ouvindo alterações futuras.

O participante não precisa atualizar a página para receber:

* mapas;
* vencedores;
* avanço de fase;
* final;
* pódio.

---

# 23. Encerramento da Liga

O botão:

```text
Encerrar Liga
```

aparece somente quando:

```text
organizador autenticado
+
Liga publicada
```

Ao confirmar, o Firestore recebe:

```javascript
{
  publicada: false,
  status: "encerrada",
  encerradaEm: serverTimestamp(),
  encerradaPorUid: runtime.user.uid,
  updatedAt: serverTimestamp(),
  updatedByUid: runtime.user.uid
}
```

O rascunho local é preservado.

O organizador permanece na página.

Os participantes passam a visualizar:

```text
Nenhum torneio em andamento
```

---

# 24. Finalização competitiva

Quando o pódio for concluído:

```text
status: "finalizada"
```

A Liga pode continuar com:

```text
publicada: true
```

Isso permite que participantes continuem:

* consultando a chave final;
* visualizando resultados;
* visualizando o pódio;
* baixando cards.

A Liga somente deixa de ser exibida depois da ação:

```text
Encerrar Liga
```

---

# 25. Navegação protegida

Quando um organizador tenta sair da página durante uma Liga publicada, a navegação é interceptada.

Aplicável a:

* Salão;
* Hall;
* Buscar;
* Registro;
* Raid;
* Galeria.

Card:

```text
Deseja sair da Liga?

A Liga continua sendo transmitida em tempo real.
Escolha como deseja prosseguir.
```

Ações:

```text
Cancelar
Sair e manter a Liga
Encerrar Liga e sair
```

---

# 26. Sair e manter a Liga

Antes de navegar:

1. verifica alterações pendentes;
2. sincroniza quando necessário;
3. aguarda confirmação do Firestore;
4. mantém `publicada: true`;
5. navega para o destino.

Caso a sincronização falhe, a navegação é cancelada.

Mensagem:

```text
Não foi possível sincronizar

A última versão publicada continua ao vivo.
Verifique a conexão antes de sair.
```

---

# 27. Encerrar Liga e sair

O sistema:

1. define `publicada: false`;
2. define `status: "encerrada"`;
3. registra data e UID;
4. preserva o rascunho;
5. navega somente depois da resposta do Firestore.

---

# 28. Links não interceptados

A proteção de navegação não deve atuar sobre:

* participantes;
* organizador sem Liga publicada;
* downloads;
* links com atributo `download`;
* âncoras da própria página;
* links externos;
* links com `target="_blank"`;
* cliques com `Ctrl`;
* cliques com `Shift`;
* cliques com `Alt`;
* cliques com `Meta`;
* botão do meio do mouse.

---

# 29. Mudar de acesso

O botão:

```text
Mudar de acesso
```

serve para:

* encerrar a sessão administrativa;
* interromper o listener;
* remover a escolha de perfil da sessão;
* abrir novamente Participante/Organizador.

Ele não deve:

* encerrar a Liga publicada;
* apagar dados do Firestore;
* limpar o rascunho;
* alterar resultados.

Se a Liga estiver publicada, ela continua ao vivo.

---

# 30. Proteção ao fechar a página

O evento:

```javascript
beforeunload
```

é utilizado somente quando:

```text
organizador
+
alterações não sincronizadas
```

Quando tudo estiver sincronizado, a página pode ser fechada normalmente.

A Liga publicada continua disponível no Firestore mesmo depois de o organizador fechar o navegador.

---

# 31. Controles administrativos

Os controles que alteram a Liga recebem:

```html
data-liga-admin-only
```

Exemplos:

* adicionar participante;
* remover participante;
* adicionar convidado;
* gerar chaves;
* alterar equipes;
* sortear mapas;
* escolher vencedor;
* desfazer resultado;
* limpar Liga.

Elementos que permanecem visíveis, mas bloqueados, recebem:

```html
data-liga-admin-locked
```

Exemplo:

* cards de modalidade.

Downloads não devem receber esses atributos.

---

# 32. Regras do Firestore

Regras atuais:

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

Comportamento:

```text
Visitante
└── leitura da Liga

Organizador válido
├── leitura
├── criação
├── atualização
└── encerramento

Usuário sem autorização
└── nenhuma gravação
```

---

# 33. Segurança

A interface não deve ser considerada uma barreira de segurança.

Esconder botões serve apenas para melhorar a experiência do participante.

A proteção real é composta por:

```text
Firebase Authentication
+
admins/{UID}
+
ativo == true
+
Firestore Security Rules
```

Nunca utilizar em produção:

```javascript
allow read, write: if true;
```

---

# 34. Testes locais

Partindo da raiz do projeto:

```bash
python -m http.server 8000 --directory web
```

Acesse:

```text
http://localhost:8000/pages/liga.html
```

O domínio `localhost` precisa estar autorizado no Firebase Authentication.

---

# 35. Teste em dois navegadores

## Janela normal

Acesse como Organizador.

## Janela anônima

Acesse como Participante.

Fluxo:

```text
Organizador publica
→ participante recebe a Liga

Organizador sorteia mapa
→ participante recebe o mapa

Organizador define vencedor
→ participante recebe o resultado

Organizador encerra
→ participante vê estado vazio
```

---

# 36. Checklist de teste

## Autenticação

* [ ] login correto;
* [ ] senha incorreta;
* [ ] conta sem documento em `admins`;
* [ ] administrador com `ativo: false`;
* [ ] manutenção da sessão;
* [ ] logout por Mudar de acesso.

## Participante

* [ ] entrada sem login;
* [ ] estado vazio;
* [ ] Liga publicada;
* [ ] atualizações automáticas;
* [ ] ausência de controles administrativos;
* [ ] downloads disponíveis.

## Organizador

* [ ] rascunho local;
* [ ] validação antes de publicar;
* [ ] publicação inicial;
* [ ] sincronização automática;
* [ ] sincronização manual;
* [ ] falha de conexão;
* [ ] retorno da conexão;
* [ ] encerramento;
* [ ] republicação.

## Navegação

* [ ] Cancelar;
* [ ] Sair e manter a Liga;
* [ ] Encerrar Liga e sair;
* [ ] falha de sincronização bloqueando saída;
* [ ] downloads sem confirmação;
* [ ] links externos sem bloqueio;
* [ ] abertura em nova guia.

## Regressão

* [ ] modalidades;
* [ ] participantes;
* [ ] convidados;
* [ ] equipes;
* [ ] sorteios;
* [ ] mapas;
* [ ] chaves;
* [ ] vencedores;
* [ ] avanço de fase;
* [ ] pódio;
* [ ] canvas;
* [ ] cards individuais.

---

# 37. Passagem para produção

Depois dos testes:

1. confirmar que `dev_local` funciona;
2. revisar regras;
3. revisar documentos `admins`;
4. testar com mais de um organizador;
5. testar pelo preview do Cloudflare;
6. alterar:

```javascript
leagueDocumentId: "dev_local"
```

para:

```javascript
leagueDocumentId: "liga_atual"
```

7. adicionar `portal-avalon.pages.dev` aos domínios autorizados;
8. executar testes novamente;
9. publicar a branch;
10. mesclar na `main`.

---

# 38. Conflito entre organizadores

A Liga é armazenada como estado completo em um documento principal.

Caso dois organizadores alterem simultaneamente, a última gravação pode prevalecer.

Regra operacional recomendada:

```text
um organizador principal edita;
os demais acompanham ou assumem quando necessário.
```

Dados de auditoria:

```text
revision
updatedAt
updatedByUid
encerradaEm
encerradaPorUid
```

Uma futura evolução pode incluir:

* organizador ativo;
* bloqueio temporário de edição;
* presença online;
* histórico de alterações;
* transações por confronto.

Esses recursos não fazem parte da integração atual.

---

# 39. Solução de problemas

## Firebase não configurado

Mensagem:

```text
Firebase ainda não configurado.
```

Verificar:

* valores em `firebase-config.js`;
* ausência de campos `SUBSTITUA_`;
* carregamento do módulo;
* console do navegador.

---

## Login não autorizado

Verificar:

* Email/Password habilitado;
* usuário criado no Authentication;
* UID correto;
* documento `admins/{UID}`;
* campo `ativo` como booleano `true`;
* domínio autorizado.

---

## Participante não recebe atualizações

Verificar:

* documento correto;
* `publicada: true`;
* listener ativo;
* regras permitindo leitura;
* conexão;
* erros no console;
* `leagueDocumentId`.

---

## Organizador não consegue publicar

Verificar:

* usuário autenticado;
* documento administrativo;
* regras publicadas;
* participantes suficientes;
* modalidade escolhida;
* chave gerada;
* Firestore acessível.

---

## Dados antigos aparecem

Verificar:

* conteúdo do `localStorage`;
* documento `dev_local`;
* documento `liga_atual`;
* identificador configurado;
* rascunho preservado;
* Liga encerrada ainda armazenada.

---

## Alterações não sincronizam

Verificar:

* conexão;
* regras;
* login;
* `ativo: true`;
* console do navegador;
* botão Tentar sincronizar.

O estado local não deve ser apagado durante uma falha.

---

# 40. Áreas sensíveis

Alterações nestes pontos exigem testes completos:

```text
firebase-config.js
liga-firebase.js
Firestore Rules
admins/{UID}
leagueDocumentId
localStorageKey
schemaVersion
estrutura state
patch de saveLiga()
patch de resetLeague()
listener onSnapshot()
navegação protegida
encerramento da Liga
```

Não alterar sem revisar:

* Participante;
* Organizador;
* publicação;
* sincronização;
* encerramento;
* navegação;
* regressão dos canvas.

---

# 41. Resultado final

```text
Participante
├── acompanha sem login
├── recebe atualizações
├── visualiza
├── baixa chaves e cards
└── não altera o torneio

Organizador
├── autentica
├── prepara rascunho
├── publica
├── administra
├── sincroniza
├── encerra
└── navega com proteção

Portal
├── permanece estático
├── continua no Cloudflare Pages
└── utiliza Firebase somente na Liga
```

A integração Firebase transforma a Liga em uma área dinâmica e compartilhada sem alterar a arquitetura estática das demais páginas do Portal Avalon.