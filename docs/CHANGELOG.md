# Changelog consolidado — Portal Avalon

O histórico detalhado permanece no Git. Este arquivo registra apenas as mudanças relevantes para compreensão e manutenção do estado atual.

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
