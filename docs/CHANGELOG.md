# Changelog — Portal Avalon

As alterações detalhadas permanecem em [`releases/`](releases/).

## V7.6.1 — Maintenance Edition

### Adicionado
- documentação técnica consolidada para novos mantenedores;
- início rápido, mapa do projeto, fluxos, áreas sensíveis e solução de problemas;
- checklist completo de nova raid, OCR, commit e deploy GitHub/Cloudflare Pages;
- arquitetura de páginas, JavaScript, dados, componentes e canvas;
- regras centralizadas do Hall, ranking, histórico, Liga e consulta Raid;
- manifesto SHA-256 do núcleo funcional V7.6;
- suíte de validação documental e comportamento congelado.

### Alterado
- README principal e índice de documentação passam a apontar para a Maintenance Edition;
- utilitário de promoção deixa de rebaixar o campo de versão do histórico para `7.2`;
- documentos antigos de arquitetura/componentes passam a atuar como atalhos para a fonte consolidada.

### Preservado
- nenhum comportamento público, regra, visual, dado ou canvas da V7.6 foi alterado.

## V7.6

### Alterado
- Plataforma luminosa global para todos os cabeçalhos com mascotes.
- Feedback da Raid adaptado ao design dos cards da Liga.
- Botão de voltar ao topo unificado no Hall, Registro, Raid e Liga.

### Removido
- Resumo técnico público do Hall.
- Classes e handlers duplicados de feedback, plataforma e retorno ao topo.


## V7.5 — Pódio adaptativo e refatoração controlada

### Adicionado
- tema central `PODIUM_CANVAS_THEME`;
- modelo comum de colocação;
- resolvedor de geometria para pódio completo e cards individuais;
- inventário de redundâncias da Liga.

### Corrigido
- membros do card de bronze não ultrapassam mais a moldura;
- títulos com duas linhas, equipes com três integrantes e nomes extensos respeitam margem inferior segura.

### Refatorado
- pódio completo e cards individuais passam por `renderPodiumCanvas()`;
- ouro, prata e bronze compartilham o mesmo renderer;
- estilos antigos e seletores órfãos do pódio foram removidos;
- `!important` deixou de ser necessário no grid de cards compartilháveis.

## V7.4 — Canvas PvP unificado e documentação centralizada

### Adicionado
- motor único de canvas para confrontos 1v1, 2v2 e 3v3;
- resolvedor adaptativo de largura, altura, linhas e tipografia;
- tokens centralizados do canvas da Liga;
- diretório oficial `docs/`.

### Alterado
- adversários aproximados do eixo central `VS`;
- cards de confronto reduzidos e centralizados;
- documentação e evidências organizadas por versão.

### Refatorado
- geração de fundo, cabeçalho, mapa, conteúdo e rodapé em funções reutilizáveis;
- confronto direto e salas de sobrevivência compartilham a mesma base de painel.

## V7.3.1 — Hall blindado e Registro otimizado
- frequência ocultada no Hall público;
- ficha horizontal com rankings independentes;
- ranking de dano dinâmico;
- ausentes com posição incalculável;
- Registro reorganizado.

## V7.3 — Hall dinâmico
- frequências mínimas por faixa;
- posições vagas;
- patentes móveis;
- membros não classificados preservados.

## V7.2 — Histórico rotativo
- média histórica com raids válidas;
- bases oficiais e estimadas;
- regras de baixa frequência histórica.

## V7.1
- versão de transição incorporada ao ciclo V7; não foi encontrado relatório autônomo no pacote recebido.

## V7.0–V7.0.6 — Área Raid
- consulta de estratégias;
- comboboxes e elementos;
- refinamentos dos resultados;
- estados, toasts e retorno ao topo.

## V6.x — Cards compartilháveis
- fichas e imagens compartilháveis;
- refinamentos da Liga e pódio.

## V5.x — Liga Avalon e pré-deploy
- mapas, fases, pódio, equipes e fluxo final;
- sucessivos refinamentos visuais e operacionais.

## V4.x e anteriores
- fundação das páginas, mascotes, Hall, Galeria, Liga e identidade medieval.

## Liga Firebase em tempo real

### Adicionado

- Firebase Authentication para contas de organizadores;
- Cloud Firestore como fonte compartilhada da Liga publicada;
- acesso de participante sem login;
- validação administrativa por `admins/{UID}`;
- rascunho local antes da publicação;
- botão `Publicar Liga`;
- sincronização automática depois da publicação;
- botão `Sincronizar agora`;
- listener em tempo real com `onSnapshot()`;
- botão próprio `Encerrar Liga`;
- proteção ao navegar durante uma transmissão;
- opção de sair mantendo a Liga;
- opção de encerrar a Liga e sair;
- proteção de alterações pendentes com `beforeunload`;
- card de acesso Participante/Organizador;
- card de estado integrado ao conteúdo da Liga;
- mensagens genéricas sem exposição do nome ou e-mail do organizador;
- documentação técnica em `docs/arquitetura/FIREBASE_LIGA.md`.

### Alterado

- `localStorage` passou a funcionar como rascunho e contingência;
- o Firestore passou a ser a fonte oficial da Liga publicada;
- controles administrativos passaram a ser marcados com `data-liga-admin-only`;
- cards de modalidade usam `data-liga-admin-locked` no modo participante;
- o participante mantém visualização e downloads, mas não pode alterar o torneio;
- a Liga somente é exibida quando `publicada: true`;
- a conclusão do pódio não encerra automaticamente a transmissão;
- a saída para outras páginas agora exige decisão quando existe uma Liga ao vivo.

### Segurança

- escrita no Firestore restrita a administradores autenticados e ativos;
- coleção `admins` não pode ser alterada pelo frontend;
- dados da Liga permanecem públicos para leitura;
- credenciais administrativas não são armazenadas no Firestore nem no repositório.

### Arquivos principais

```text
web/assets/js/firebase-config.js
web/assets/js/liga-firebase.js
web/pages/liga.html
docs/arquitetura/FIREBASE_LIGA.md
```
