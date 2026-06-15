# Liga Avalon

A Liga funciona inteiramente no navegador.

## Fluxo

1. selecionar membros/convidados;
2. escolher modo;
3. configurar equipes quando necessário;
4. sortear ordem;
5. gerar chaves;
6. sortear mapas;
7. avançar vencedores;
8. concluir pódio;
9. exportar canvas.

## Persistência

Estado principal: `portal_avalon_liga_v531`. Chaves antigas são lidas para migração. Não troque a chave sem plano de compatibilidade.

## Modos

A definição vem de `web/data/arenas.json`. Regras de brackets e sobrevivência estão em `liga.js`.

## Canvas

1v1, 2v2 e 3v3 usam o mesmo motor adaptativo. O pódio usa modelo e resolvedor compartilhados para ouro, prata e bronze.

## Perfis de acesso da Liga

A Liga possui dois perfis:

Participante
Organizador

### Participante

O participante não precisa realizar login.

Pode:

* acompanhar a Liga publicada;
* visualizar participantes e equipes;
* visualizar chaves e mapas;
* acompanhar resultados e fases;
* visualizar o pódio;
* baixar chaves, canvas e cards disponíveis.

Não pode:

* adicionar ou remover membros;
* configurar equipes;
* escolher modalidade;
* gerar chaves;
* sortear mapas;
* definir vencedores;
* desfazer resultados;
* publicar;
* sincronizar;
* encerrar a Liga.

Regra:

visualizar e exportar → permitido
alterar a competição → restrito

### Organizador

O organizador precisa:

1. autenticar-se pelo Firebase;
2. possuir documento `admins/{UID}`;
3. possuir o campo `ativo: true`.

Pode:

* preparar o torneio;
* adicionar participantes;
* escolher modalidades;
* configurar equipes;
* gerar chaves;
* sortear mapas;
* registrar resultados;
* avançar fases;
* gerar o pódio;
* publicar;
* sincronizar;
* encerrar a transmissão.

---

## Rascunho e publicação

Antes da publicação:

alterações → localStorage
participantes → não visualizam
Firestore → não recebe sincronização automática

A publicação inicial é explícita pelo botão:

Publicar Liga

Para publicar, a Liga deve possuir:

* modalidade;
* quantidade válida de participantes;
* equipes válidas, quando necessárias;
* chaves ou estrutura competitiva geradas.

Depois da publicação:
alteração do organizador
→ saveLiga()
→ debounce
→ Firestore
→ participantes atualizados

## Encerramento da Liga

O botão:
Encerrar Liga

fica disponível somente para organizadores durante uma transmissão ativa.

Ao encerrar:

javascript
publicada: false
status: "encerrada"


O rascunho local é preservado.

Os participantes passam a visualizar que não existe torneio em andamento.

## Navegação durante uma Liga ativa

Quando o organizador tenta abrir outra página do Portal, são oferecidas três opções:
Cancelar
Sair e manter a Liga
Encerrar Liga e sair

### Sair e manter a Liga

* sincroniza alterações pendentes;
* mantém `publicada: true`;
* continua transmitindo para os participantes;
* navega somente após confirmar a sincronização.

### Encerrar Liga e sair

* define `publicada: false`;
* registra o encerramento;
* preserva o rascunho;
* navega depois da confirmação do Firestore.

### Mudar de acesso

O botão `Mudar de acesso` encerra a sessão administrativa e retorna ao seletor de perfil.

Ele não encerra a Liga publicada.