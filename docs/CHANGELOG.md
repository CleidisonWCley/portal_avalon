# Changelog consolidado — Portal Avalon

O histórico detalhado permanece no Git. Este arquivo registra apenas as mudanças relevantes para compreensão e manutenção do estado atual.

## V7.9.0.2 — Automação do ciclo de novos e retornantes

- ciclo dos guardiões passa a inferir automaticamente **Defensor em Início de Jornada** quando há raid válida sem histórico anterior suficiente;
- retorno à batalha com histórico antigo e base insuficiente passa a virar **Defensor Retornante** sem cadastro manual;
- Carlinhozz vira teste real do fluxo de retornante, saindo de **Às Margens do Hall** e entrando em **Novos e retornantes**;
- removido o campo `code` do cadastro web, mantendo o Hall dependente apenas de nome, raid, frequência, dano e histórico;
- pré-cadastros de MJ馬McQueen e tang seguem ocultos até terem dano e frequência válidos;
- testes e documentação atualizados para a automação V7.9.0.2.

## V7.9.0.1 — Refinamento narrativo do Ramigam

- Salão deixa de ter card separado de apresentação do Ramigam;
- Ramigam passa a aparecer integrado ao card `Propósito do Salão`, reforçando a ideia de registro sem alterar o texto institucional;
- bloco dos Defensores no Hall passa a falar diretamente com os membros, incluindo início, retorno e fases de queda;
- removida a frase que citava Ramigam diretamente no Hall, deixando o personagem responder pelo visual;
- núcleo de raid, OCR, ranking, patentes e ciclo dos guardiões permanece preservado.

## V7.9.0 — Ramigam e ciclo dos guardiões

- Ramigam convertido para WebP e publicado no display dos mascotes;
- Salão passa a ter presença institucional discreta do Ramigam como Arquiteto de Avalon;
- Hall passa a exibir Ramigam antes dos Defensores de Avalon, reforçando início de jornada e retorno às muralhas;
- criado `guardians_registry.json` para pré-cadastro de membros novos, retornantes ou removidos sem misturar com dados de raid;
- membros sem raid válida permanecem ocultos do Hall, médias, rankings e evolução;
- tags temporárias `Defensor em Início de Jornada` e `Defensor Retornante` reutilizam a insígnia de Defensor de Avalon;
- tags somem automaticamente quando houver base comparativa mínima definida pelo histórico;
- MJ馬McQueen e tang registrados como pré-cadastro aguardando primeira raid válida;
- testes atualizados para validar Ramigam, WebP, ciclo de guardiões e documentação V7.9.0.

## V7.8.3.4 — Limpeza da Raid e consolidação dos testes

- dashboard coletivo removido definitivamente da página Raid, que volta a ficar exclusiva para consulta estratégica;
- `raid-evolution.js` excluído por não possuir consumidores ativos;
- estilos `.raid-evolution-*` e regras responsivas legadas removidos;
- testes da V7.8.2 e do navegador atualizados para a responsabilidade real da página Raid;
- suíte passa a verificar que a Raid não requisita `raid_history.json`;
- evolução individual e coletiva preservada exclusivamente no Registro;
- instruções completas de testes centralizadas em `docs/TESTES.md`;
- `test_project.py` e os testes nomeados por versão consolidados em `test_regressions.py`;
- suíte permanente reduzida a `test_core.js`, `test_regressions.py` e `test_browser.py`;
- `run_tests.py` passa a executar regressões por responsabilidade, sem depender do número da release;
- READMEs e manual de manutenção reduzidos a referências ao documento canônico de testes.

## V7.8.3.3 — Casos especiais e alinhamento estrutural do Registro

- cards de tendência e histórico adaptados para `Retorno à batalha`, `Sem comparativo` e `Sem registro`;
- textos longos passam a ajustar altura e quebra entre palavras sem ultrapassar os cards;
- gráfico individual interrompe a linha quando há raids sem registro, evitando tendência contínua artificial;
- tabela principal recebe `colgroup` único para sincronizar cabeçalho e células;
- divisórias verticais discretas adicionadas no desktop para facilitar a leitura por coluna;
- alinhamento numérico padronizado com dígitos tabulares;
- comportamento em cards mobile preservado sem interferência do `colgroup`.

## V7.8.3.2 — Simplificação visual e separação do Hall

- coluna e filtro de base histórica removidos da tabela principal;
- botão Ver evolução posicionado abaixo do nome do guardião;
- tabela principal reduzida para nove colunas;
- cards do modal ampliados e reorganizados em notebooks;
- referências à posição do Hall removidas da tendência individual;
- posição atual do Hall preservada somente na tabela principal.

## V7.8.3.1 — Refinamento e desempenho do Registro

- painel individual migrado da tabela para um único modal flutuante reutilizável;
- página ao fundo bloqueada com foco retido, rolagem externa desativada e botão X sempre acessível;
- remoção de `scrollIntoView`, linhas expansíveis e reconstruções que deslocavam a tabela;
- motor SVG compartilhado entre gráficos individual e coletivo;
- gráficos responsivos sem largura mínima, barra horizontal ou filtros SVG pesados;
- tabela principal compactada para notebooks e desktop, mantendo cards abaixo de 980 px;
- tabela coletiva sem rolagem lateral e ordenação 133→130 ou 130→133 preservada;
- cache de conteúdo individual e apenas um listener de redimensionamento;
- cobertura de navegador ampliada para 11 larguras entre 320 px e 1440 px.

## V7.8.3 — Evolução individual e coletiva no Registro

- consulta expansível por membro sem adicionar colunas à tabela principal;
- gráfico individual sob demanda para as Raids 130, 131, 132 e 133;
- tendência recente baseada prioritariamente nas fontes oficiais 132 e 133;
- bases 130 e 131 identificadas visualmente como estimadas;
- posição atual do Hall preservada, sem reconstruir posições históricas;
- quadro, gráfico e tabela da evolução coletiva adicionados após a tabela de membros;
- tabela coletiva exibida por padrão da Raid 133 para a 130, com ordenação crescente ou decrescente;
- histórico reaproveitado do carregamento existente, sem segundo `fetch`;
- painéis individuais renderizados apenas quando solicitados para proteger o desempenho mobile;
- regressões ampliadas para sete larguras entre 320 px e 1366 px.

## V7.8.2 — Blindagem do OCR, Raid 133 e evolução da guilda

- processamento identificado por número, data de encerramento e origem da raid;
- arquivos `raid_N_bruto.csv`, `raid_N_revisado.csv`, `raid_N.json` e `raid_N_relatorio.json`;
- correções manuais isoladas por número da raid, impedindo reutilização silenciosa;
- aliases curtos restritos à correspondência exata e fallback OCR otimizado;
- suporte seguro a `img1` até `img5`, com a quinta imagem limitada às posições 29 e 30;
- promoção atômica com relatório validado, zero pendências e número crescente;
- Raid 133 promovida como segunda fonte oficial, com 28 participantes e 116.390.205.306 de dano;
- Raid 132 preservada como anterior e histórico limitado a quatro entradas;
- seção simples Evolução da Guilda adicionada à página Raid;
- suíte consolidada ampliada com regressões específicas da V7.8.2.

## V7.8.1.1 — Consolidação da suíte de regressão e README oficial

- `tools/` reduzido a utilitários permanentes e testes temáticos;
- runners e testes nomeados por versões antigas removidos;
- runner único e multiplataforma em `python tools/run_tests.py`;
- modos rápido, navegador e completo adicionados;
- testes desacoplados de nomes, danos e quantidades fixas de uma raid;
- cobertura atualizada para Hall, Registro, Liga V7.8.1, assets, documentação e responsividade;
- README oficial atualizado para a estrutura documental consolidada;
- documentação de testes e manutenção alinhada ao novo fluxo;
- nenhuma alteração no código publicado em `web/`.

## V7.8.1 — Refinamento Final da Experiência de Usuário em Ligas

- participante lembrado no dispositivo até Mudar de acesso;
- organizador temporário por padrão e persistente somente com consentimento;
- alinhamento entre persistência do papel e Firebase Authentication;
- rascunho separado em `portal_avalon_liga_draft_v2`;
- arquivos locais separados em `portal_avalon_liga_archives_v1`;
- migração de chaves antigas somente para organizadores autenticados;
- remoção do modal automático legado de restauração;
- participante limitado à Liga realmente publicada;
- encerramento remoto com `state: null`;
- opções de preservar resultado/rascunho ou limpar;
- arquivos visíveis somente ao organizador;
- limite de cinco arquivos, sem exclusão automática;
- remoção dos botões redundantes Limpar Liga;
- regras competitivas, mapas, chaves, pódio e canvas preservados.

## V7.7.4.2.x — Zoom e flashes visuais

- fundo escuro aplicado à superfície completa;
- camadas gráficas simplificadas durante pinch zoom;
- flashes da logo e das patentes condicionados ao fim do loader;
- pausa fora da viewport, em aba oculta, durante zoom e com movimento reduzido;
- tentativas de compatibilidade desktop consolidadas em efeito leve;
- efeito tratado como aprimoramento decorativo, sem dependência funcional.

## V7.7.4.1 — Retorno ao topo e destaque do Hall

- retorno curto controlado por `requestAnimationFrame`;
- salto direto para distâncias grandes;
- cancelamento por gesto ou teclado;
- flash único e sequencial nas patentes Top 1–3;
- troféus da Liga estáticos.

## V7.7.4 — Desempenho, carregamento e zoom

- loader baseado em tarefas e imagens críticas;
- timeout, repetição, cache e fallback de recursos;
- dados carregados conforme a página;
- Liga local inicializada antes do Firebase;
- imagens WebP otimizadas para exibição;
- responsividade e zoom validados.

## V7.7–V7.7.3 — Mobile, motion e consolidação

- Registro convertido em cards no mobile;
- Raid reorganizada sem corte dos quatro heróis;
- breakpoints consolidados;
- loader e reveal sincronizados;
- remoção de animações redundantes dos mascotes;
- referências canônicas sem parâmetros de release;
- código morto e regras duplicadas removidos.

## V7.6–V7.6.1 — Interface consolidada e manutenção

- botão voltar ao topo compartilhado;
- plataforma luminosa global;
- feedback de Raid e Liga unificado;
- Hall simplificado;
- documentação e testes de manutenção;
- promoção do histórico preservando schema.

## V7.5 — Pódio adaptativo

- motor compartilhado para ouro, prata e bronze;
- cálculo dinâmico de altura, troféu e fontes;
- equipes e nomes extensos protegidos contra overflow;
- cards individuais e pódio completo refinados.

## V7.4 — Canvas PvP unificado

- 1v1, 2v2, 3v3 e grupos no mesmo motor;
- adversários aproximados do VS;
- tamanhos e fontes adaptativos;
- mapas, cabeçalho e rodapé preservados.

## V7.3–V7.3.1 — Hall dinâmico e Registro

- Hall baseado em evolução pessoal;
- posições limitadas por frequência;
- posições vagas preservadas;
- patentes derivadas da posição;
- ranking de dano independente;
- frequência oculta nos cards públicos;
- ausentes e bases insuficientes mantidos.

## V7.2 — Histórico rotativo

- raid atual e anteriores normalizadas;
- políticas de frequência conhecida e desconhecida;
- promoção controlada e overrides comprovados.

## V7.0–V7.1 — Área Raid

- consulta estratégica externa;
- cache local;
- cards de equipes, heróis e equipamentos;
- estados de carregamento, vazio e erro.

## V6.x — Busca, cards e identidade compartilhável

- ficha individual e histórico de busca;
- canvases de guardião e pódio;
- refinamentos de Liga e imagens;
- expansão de mapas e formatos.

## V5.x — Fundação da Liga Avalon

- participantes, convidados e modalidades;
- equipes, sorteios, mapas, chaves e fases;
- Survival, bronze e pódio;
- downloads e canvases;
- blindagens do fluxo e armazenamento local.

## V4.x e anteriores

- estrutura inicial do Portal;
- identidade visual medieval;
- páginas principais, cards e dados básicos da guilda.
