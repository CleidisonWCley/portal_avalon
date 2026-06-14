# READM_AVALON_VF_1 — Portal Avalon

> VF significa **Versionamento Final**: esta documentação consolida o histórico técnico do Portal Avalon, que está se aproximando de uma versão candidata para deploy.

## 1. Visão geral

O **Portal Avalon** é um hub web da guilda Avalon, criado para reunir:

- registros de Raid;
- Hall da Evolução;
- busca de ficha individual dos membros;
- Registro da Batalha;
- Galeria de Eventos;
- Liga Avalon com torneios, chaves, mapas, pódio e cards de conquista.

O projeto é construído em **HTML, CSS e JavaScript puro**, com dados em JSON e sem necessidade de backend para a versão atual.

## 2. Estrutura principal do projeto

```text
raid_hall/
├── ocr/                         # Pipeline de leitura/extração da raid — não alterado nas versões web recentes
├── design/                      # Materiais visuais e referências
├── docs/
│   └── historico_readmes/        # READMEs antigos arquivados
└── web/
    ├── index.html                # Salão de Avalon
    ├── pages/
    │   ├── hall.html             # Hall da Evolução
    │   ├── oraculo.html          # Buscar Ficha
    │   ├── registro.html         # Registro da Batalha
    │   ├── galeria.html          # Galeria de Eventos
    │   └── liga.html             # Liga Avalon
    ├── assets/
    │   ├── css/styles.css
    │   ├── js/app.js
    │   ├── js/data.js
    │   ├── js/liga.js
    │   └── img/
    └── data/
        ├── arenas.json
        ├── torneios.json
        ├── gallery.json
        ├── insignias.json
        └── raids/
```

## 3. Como testar localmente

Na pasta raiz do projeto, acesse `web/` e rode:

```powershell
cd web
python -m http.server 5500
```

Depois abra:

```text
http://localhost:5500
```

Também é possível abrir `web/index.html` com **Live Server** no VS Code.

## 4. Páginas do Portal

### Salão de Avalon
Página inicial do Portal, com resumo geral, identidade da guilda e entrada para as demais áreas.

### Hall da Evolução
Área de reconhecimento dos membros que evoluíram com base em comparação justa entre raids.

### Buscar Ficha
Consulta individual por nick, exibindo posição, status, dano, evolução e patente.

### Registro da Batalha
Tabela operacional com dados atuais e anteriores da raid.

### Galeria de Eventos
Galeria de memórias da guilda com filtro por ano, visualização ampliada e download de imagens.

### Liga Avalon
Sistema de torneios internos com seleção de participantes, sorteio, equipes, chaves, mapas por fase, pódio e cards de conquista.

## 5. Regras importantes do Hall da Evolução

O Hall não deve premiar retorno de ausência como evolução real.

Para entrar no Hall da Evolução, o membro precisa cumprir:

```text
- ter comparativo válido com a raid anterior;
- ter dano anterior maior que 0;
- ter presença anterior maior que 0;
- não estar ausente na raid anterior;
- ter presença atual mínima de 15/21;
- ter evolução positiva de dano.
```

Casos como `0 dano → X dano` após ausência devem aparecer como:

```text
Retorno à Batalha
Sem comparativo
Não elegível ao Hall
```

## 6. Liga Avalon — regras atuais

A Liga Avalon suporta:

- modos individuais;
- modos 1v5 com Top 3 por grupo;
- modos de equipe 3v3;
- fallback 2v2 adaptado quando necessário;
- convidados especiais;
- sorteio de participantes;
- sorteio de mapas por fase;
- chaves por fases/slides;
- escolha manual de vencedores;
- confirmação antes de avanço;
- disputa de bronze;
- pódio completo;
- cards de campeão, vice e bronze;
- download de imagens do pódio e cards individuais.

## 7. Banco de mapas da Liga

Os modos e mapas ficam em:

```text
web/data/arenas.json
```

Principais grupos:

```text
1v1 — Arena
1v5 — Briga
1v5 — Frenesi
3v3 — Equipe
3v3 — Captura
```

## 8. Mascotes contextuais

Os mascotes Cley e Olimpio foram organizados por contexto visual:

```text
cley-salao.png      / olimpio-salao.png
cley-hall.png       / olimpio-hall.png
cley-buscar.png     / olimpio-buscar.png
cley-galeria.png    / olimpio-galeria.png
cley-liga.png       / olimpio-liga.png
cley-registro.png   / olimpio-registro.png
```

Regra visual:

```text
Cley à esquerda
Título ao centro
Olimpio à direita
```

O Registro mantém os mascotes originais já aprovados.

## 9. Versionamento consolidado

### V2 — OCR blindado
- OCR responsivo.
- Correções por alias.
- Pós-processamento com ausentes, duplicados e exportação JSON/CSV.
- Base para alimentar a versão web.

### V3.1 — Web separada por páginas
- Separação em páginas HTML.
- Visual medieval/fantasia.
- Registro da Batalha simplificado.
- Integração inicial dos mascotes.

### V3.2 — Galeria e insígnias expandidas
- Galeria de Eventos.
- Filtro por ano.
- Lightbox/modal.
- Insígnias para faixas do Top 1 ao Top 30.

### V3.3 — Liga Avalon
- Nova aba Liga.
- Ícones no menu.
- Oráculo renomeado visualmente para Buscar Ficha.
- Defensores de Avalon como patente Top 21–30.
- Dados técnicos removidos do visual do usuário.

### V4 — Liga Reforjada e Hall Justo
- Liga por fases/slides.
- Mapa por fase.
- Clique no nome/time para definir vencedor.
- Hall blindado com comparativo válido.
- Presença mínima 15/21.

### V4.1 — Liga Mais Intuitiva
- Busca para adicionar membros.
- Participantes em chips compactos.
- Avisos centrais animados.
- 1v5 com Top 3 por grupo.
- 3v3 com fallback 2v2.
- Restauração de Liga salva.

### V4.2 — Liga de Equipes e Mascotes do Portal
- Mascotes contextuais nas páginas.
- Correção visual do Salão.
- Equipes manuais.
- Pódio de equipes com membros.
- Card individual do vencedor/equipe vencedora.

### V4.3 — Liga Inteligente e Pódio Refinado
- Equipes manuais podem ser salvas.
- Participantes restantes podem ser sorteados automaticamente.
- Disputa de bronze gerada a partir dos perdedores da semifinal.
- Pódio mostra nome completo da Liga e modo jogado.
- Cards individuais para Campeão, Vice-campeão e Guerreiro de Bronze.
- Download individual dos cards de 1º, 2º e 3º lugar.
- Botões finais: Limpar Liga e Voltar ao topo.
- Padronização e aumento controlado dos mascotes do Registro.

### V4.3.1 — Correções de Pódio e Mascotes
- Cards individuais de equipe usam títulos no plural: Campeões, Vice-campeões e Guerreiros de Bronze.
- Card individual de equipe reorganizado para não cortar membros: título da Liga, conquista, equipe, troféu e lista vertical de membros.
- Botão Voltar ao topo permanece visível mesmo após limpar a Liga.
- Correção de CSS específico que impedia o aumento real dos mascotes do Registro.
- Ajuste de espaçamento e responsividade dos botões finais do pódio.

### V5.0 — Polimento Final, Mapas da Liga e Preparação para Deploy
- Salão ganhou card visual para os dados atuais da Raid: dano total, participantes, ausentes, vagas abertas e membros cadastrados.
- CSS dos mascotes foi revisado para reduzir redundâncias e controlar melhor tamanho por página.
- Mascotes de Salão, Galeria, Liga e Registro receberam aumento controlado e ajustes de responsividade.
- Flash dos óculos do Cley no Registro foi reposicionado para cruzar a área dos óculos.
- Pódio da Liga recebeu melhor organização dos botões de download, mantendo os botões fora da imagem final baixada.
- Cards individuais de Campeão, Vice-campeão e Guerreiros de Bronze receberam botões próprios de download.
- Foram adicionados 18 mapas oficiais da Liga com imagens recortadas, descrições curtas e organização por modo.
- `arenas.json` passou a usar objetos com nome, imagem, descrição e aliases quando necessário.
- Card de sorteio de mapa agora mostra imagem centralizada, nome e descrição do mapa.
- Modos com mapa único exibem “Mapa único — sorteio indisponível” e desativam o sorteio manual.

#### Estrutura de mapas da V5.0

```text
web/assets/img/maps/
├── arena-1v1/
├── briga-1v5/
├── frenesi-1v5/
├── equipe-3v3/
└── captura-3v3/
```

#### Regras de mapa único

```text
Frenesi 1v5 → Octógono do Reino da Masmorra
Captura 3v3 → Escola de Magia de Batalha
```

## 10. Checklist para deploy futuro

Antes do deploy final, revisar:

```text
- trocar senha/chave de desenvolvimento, caso a barreira de acesso seja ativada;
- decidir se os dados privados da raid continuarão em JSON público;
- testar no celular;
- testar em notebook fraco;
- revisar imagens pesadas;
- confirmar caminhos relativos no GitHub Pages;
- validar se o OCR não precisa ser publicado junto com a versão pública;
- revisar se Registro da Batalha deve ficar protegido.
```

## 11. Observação sobre OCR

A pasta `ocr/` foi preservada nas atualizações recentes. O foco das versões V4.x foi o Portal Web, especialmente a Liga, Hall e identidade visual.

## 12. Histórico arquivado

Os READMEs antigos foram movidos para:

```text
docs/historico_readmes/
```

Eles permanecem disponíveis como referência, mas este arquivo passa a ser a documentação principal consolidada do Portal Avalon.

---

### V5.1 — Correções do Pódio e Fluxo Final da Liga
- Cards individuais da Liga reorganizados em coluna, um abaixo do outro, para melhorar leitura e permitir que cada equipe/jogador enxergue melhor seu próprio card.
- Área de pódio deixou de ser renderizada de forma duplicada: as chaves mostram apenas um atalho para o pódio final e a seção oficial de Resultado Final concentra pódio geral, cards individuais e ações finais.
- Cards individuais de equipe mantêm plural correto: Campeões, Vice-campeões e Guerreiros de Bronze.
- Cards individuais 1v1/1v5 mantêm singular correto: Campeão, Vice-campeão e Guerreiro de Bronze.
- Canvas individual corrigido para manter “Membro Avalon” ou “Convidado Especial” dentro da moldura, sem texto cortado no rodapé.
- Botões de download dos cards individuais receberam diferenciação visual por colocação: ouro, prata e bronze.
- Troféus da Liga receberam brilho/flash sutil semelhante às patentes do Hall, sem alterar o canvas baixado.
- Geração de chaves foi ajustada para evitar partidas vazias na fase inicial, usando distribuição correta de byes/avanços diretos.
- Navegação de fases passou a bloquear fases futuras até que a fase anterior esteja concluída, evitando visualização de confrontos ainda não formados.
- Avanço de fase foi refinado para rolar até as chaves ou até o pódio final conforme a etapa concluída.
- Limpeza da Liga também reseta modo de equipes e equipes manuais salvas.

#### Regras de chaves V5.1

```text
- Nenhuma partida inicial deve nascer com dois lados vazios.
- Jogador/equipe com bye recebe avanço direto.
- Fases futuras ficam bloqueadas até os classificados existirem.
- Bronze só existe quando há participantes/equipes suficientes para semifinal real.
```

---

### V5.2 — Polimento Final do Fluxo da Liga
- O fluxo do organizador foi refinado para seguir melhor a sequência: selecionar → sortear → revisar → confirmar → iniciar as batalhas.
- A chave de armazenamento local passou para `portal_avalon_liga_v52`, mantendo compatibilidade com dados salvos da V5.1.
- Após participantes, chaves e mapas estarem definidos, a Liga agora exibe a confirmação: “Estrutura do torneio definida. Iniciar as batalhas?”.
- O botão **Confirmar** leva automaticamente para a Etapa 3 e rola a página até as Chaves da Liga.
- O botão **Cancelar** mantém a estrutura sorteada para revisão, sem apagar participantes, equipes, chaves ou mapas.
- Modos individuais 1v1 e 1v5 passaram a seguir a mesma lógica de confirmação antes das batalhas.
- Modos de equipe reconhecem estrutura pronta após equipes sorteadas, equipes manuais salvas ou equipes manuais complementadas com os participantes restantes.
- A Etapa 3 foi reorganizada visualmente: “Etapa 3”, “Chaves da Liga” e o texto explicativo agora ficam dentro do card bonito principal.
- O card das Chaves da Liga recebeu fundo, borda e espaçamento compatíveis com o padrão medieval do Portal Avalon.
- Botões individuais de download dos cards receberam hover com brilho, elevação suave e sombra nas cores ouro, prata e bronze.
- As ações finais de pódio, incluindo “Voltar ao topo” e “Limpar Liga”, foram preservadas.

#### Fluxo guiado da V5.2

```text
1. Definir participantes
2. Definir equipes, quando for modo de equipe
3. Gerar chaves
4. Sortear ou definir mapas
5. Confirmar início das batalhas
6. Registrar vencedores na Etapa 3
7. Finalizar pódio
```

---

### V5.2.1 — Ajuste Final de Fluxo e Cabeçalho da Liga
- Cabeçalho da **Etapa 3 — Chaves da Liga** padronizado para seguir melhor o visual da Etapa 2, com título centralizado, tamanho menor e texto introdutório com largura controlada.
- A chave de armazenamento local passou para `portal_avalon_liga_v521`, mantendo compatibilidade com versões anteriores.
- Adicionada flag `battleStarted` para identificar quando as batalhas já foram iniciadas pelo organizador.
- A confirmação “Estrutura do torneio definida. Iniciar as batalhas?” agora aparece apenas antes do início do torneio.
- Sortear novamente o mapa de uma fase durante a Etapa 3 não reinicia mais o fluxo de confirmação.
- Quando mapas são atualizados durante as chaves, o sistema exibe apenas aviso de mapa atualizado.
- Limpar Liga ou reiniciar a estrutura reseta corretamente o estado de batalhas iniciadas.
- Correção limitada à Liga e documentação; OCR e demais páginas não foram alterados.

---

### V5.3 — Navegação Final das Rodadas da Liga
- A Etapa 3 deixou de exibir várias abas grandes de fase ao mesmo tempo e passou a usar um **navegador centralizado de rodada**.
- Apenas a rodada atual fica em destaque, com setas laterais para voltar ou avançar quando permitido.
- O navegador agora mostra o título da rodada no centro, como **Quartas de Final**, **Semifinal**, **Final do Campeão**, **Disputa do Bronze** ou **Pódio Final**.
- Foi adicionada a indicação **Fase X de Y** para orientar o organizador dentro do fluxo da Liga.
- Pontos visuais de progresso indicam fases anteriores, fase atual e próximas etapas.
- O mapa da fase permanece dentro do bloco da rodada atual e acompanha a rodada selecionada.
- Os confrontos exibidos pertencem somente à rodada atual, evitando poluição visual.
- Ao tentar avançar por seta, o sistema usa a mesma confirmação de conclusão de rodada, permitindo **Confirmar** ou **Revisar**.
- A confirmação de avanço foi refinada para mensagens como: “Quartas de Final concluída. Avançar para Semifinal?” ou “Final concluída. Ver pódio final?”.
- Rodadas inexistentes continuam ocultas; a disputa de bronze só aparece quando existe confronto válido.
- A chave de armazenamento local passou para `portal_avalon_liga_v53`, mantendo compatibilidade com versões anteriores.

#### Navegação final da V5.3

```text
←        RODADA ATUAL        →
          Fase X de Y

[Mapa da fase]
[Confrontos da rodada]
[Copiar chamada da rodada]
```

---

### V5.3.1 — Blindagem Final do Fluxo da Liga
- A chave de armazenamento local passou para `portal_avalon_liga_v531`, mantendo compatibilidade com `portal_avalon_liga_v53` e versões anteriores.
- A geração de chaves agora exige que os participantes tenham sido sorteados oficialmente, impedindo pular o botão **Sortear participantes**.
- Remover participantes invalida a ordem sorteada, evitando reaproveitamento de estrutura antiga.
- O sorteio de mapas passa a exigir participantes sorteados e chaves já geradas.
- O sorteio manual de mapa durante a Etapa 3 não dispara mais a confirmação inicial “Estrutura do torneio definida. Iniciar as batalhas?”.
- Durante o torneio em andamento, trocar o mapa da rodada atual mostra apenas aviso de mapa atualizado e mantém a rodada ativa.
- O sorteio manual tenta evitar repetir imediatamente o mesmo mapa quando há mais de uma opção disponível.
- Resultados registrados em chaves e no modo survival reforçam o estado `battleStarted`, protegendo o fluxo contra reinício acidental.
- Alterações em equipes manuais resetam a estrutura preparada, evitando chaves antigas com equipes modificadas.
- A correção foi limitada à Liga; OCR, mapas, demais páginas e canvas de cards foram preservados.

---

### V6.0 — Módulo Raid e Estratégias de Combate
- Nova aba **Raid** adicionada ao Portal Avalon, posicionada entre **Registro** e **Galeria** no menu principal para aproximar registro de desempenho e estratégia de Raid.
- Criada a página `web/pages/raid.html` com cabeçalho próprio, mascotes **Cley Raid** e **Olimpio Raid**, fonte de dados explícita e estrutura visual alinhada ao Portal Avalon.
- Criado o script `web/assets/js/raid.js` para consultar a **GTales.top API** diretamente pelo navegador, mantendo o portal em modelo estático.
- Implementada consulta inicial ao endpoint `/api/raids` para carregar lista de bosses e elementos disponíveis.
- Implementada consulta por combinação `boss + element` para listar composições recomendadas.
- Criados filtros de **Boss** e **Elemento**, com elementos atualizados conforme o boss selecionado.
- Criados cards de composição com boss, elemento, dano, dano Fever, player/criador, temporada, última atualização, heróis, armas, acessórios, cartas, relíquia, stun, chains, observações e vídeo quando disponível.
- Adicionado tratamento de estados: carregando, erro de API, sem resultado, consulta vazia e cache local.
- Implementado cache em `localStorage` para lista de bosses, resultados recentes e última consulta, reduzindo dependência de chamadas repetidas.
- Campos HTML externos de `infos` são convertidos para texto limpo antes de exibir, evitando inserir HTML externo diretamente.
- Criados estilos responsivos para a aba Raid em `web/assets/css/styles.css`.
- OCR, Hall, Buscar, Registro, Galeria, Liga, mapas da Liga e canvas dos cards foram preservados.

#### Ordem final do menu na V6.0

```text
Salão | Hall | Buscar | Registro | Raid | Galeria | Liga
```

#### Observação técnica

A V6.0 tenta usar a GTales.top API diretamente pelo navegador para preservar hospedagem gratuita e estática. Caso o navegador bloqueie chamadas por CORS em ambiente publicado, o plano recomendado é manter o site estático e usar um Cloudflare Worker/Function como proxy leve em versão futura.

---

## Portal Avalon V6.2 — Cards Compartilháveis do Guardião e da Liga

A versão V6.2 adiciona recursos de compartilhamento visual por canvas:

- **Buscar Ficha** agora possui botão **Baixar ficha**, gerando uma imagem oficial do guardião com nome, patente, insígnia em alta resolução, dano atual, evolução, frequência e mensagem curta.
- A exibição da ficha continua usando as thumbs otimizadas das patentes, enquanto o canvas de download utiliza as versões rank em alta resolução.
- **Liga Avalon** agora possui botão **Baixar chave da rodada**, substituindo a chamada textual por uma imagem compartilhável da rodada atual.
- A imagem da rodada exibe apenas a fase atual da Liga, incluindo modo, rodada, Fase X de Y, mapa da fase e confrontos.
- Foram preservados OCR, Hall, aba Raid, cálculo principal da Liga, mapas e dados base.

Relatório da versão: `RELATORIO_V6_2_ATUALIZACAO.md`.

---

## Portal Avalon V6.2.1 — Refinos dos Cards e Histórico Inteligente de Busca

A versão V6.2.1 refina os cards compartilháveis adicionados na V6.2 e melhora a experiência da área **Buscar Ficha**:

- O canvas da Liga no modo **1v1** foi preservado como estava, por já estar aprovado visualmente.
- O canvas da Liga nos modos **1v5** foi refinado para distribuir participantes em linhas horizontais, reduzindo a aparência de lista vertical longa.
- As mensagens de apoio do 1v5, como **Top 3 avançam para a decisão** e **Defina 1º, 2º e 3º lugar**, foram reposicionadas para evitar sobreposição com nomes.
- O canvas da Liga nos modos **3v3** foi refinado para exibir membros das equipes em linhas mais compactas e com quebra controlada.
- Confrontos com **Aguardando** ou equipe classificada sem adversário receberam melhor equilíbrio visual no canvas.
- No canvas da **Ficha do Guardião**, o texto **Portal Avalon** ganhou mais respiro em relação à logo.
- A área **Buscar Ficha** deixou de exibir sugestões genéricas fixas e passou a usar histórico local de nomes pesquisados com sucesso.
- O histórico da busca é salvo em `localStorage` na chave `portal_avalon_busca_guardiao_historico`.
- O botão **Limpar** remove o campo de busca, a ficha atual e as sugestões salvas localmente.

Relatório da versão: `RELATORIO_V6_2_1_ATUALIZACAO.md`.

---

## Portal Avalon V6.2.2 — Refinamento do Pódio Geral da Liga

A versão V6.2.2 corrige exclusivamente o canvas baixável do **Pódio Geral da Liga Avalon**:

- O texto de colocação foi separado do título da conquista.
- O pódio geral agora organiza cada card na ordem: **colocação**, **título**, **equipe/jogador** e **membros/subtítulo**.
- Os textos **Vice-campeões** e **Guerreiros de Bronze** foram ajustados para permanecerem dentro dos cards de prata e bronze.
- O título **Guerreiros de Bronze** pode ser quebrado em duas linhas no canvas para manter legibilidade.
- O campeão permanece no centro com maior destaque visual.
- Os membros das equipes usam quebra controlada para evitar estouro horizontal.
- Cards individuais do pódio, Ficha do Guardião, chave da rodada, busca inteligente, Liga, Raid e demais páginas foram preservados.

Relatório da versão: `RELATORIO_V6_2_2_ATUALIZACAO.md`.

---

## Portal Avalon V7.0 — Integração Worker GTales.top e Refinamento da Aba Raid

A versão V7.0 marca o início oficial da integração estável da aba **Raid** com o Worker Cloudflare criado para consultar a GTales.top API sem bloqueio de CORS.

- A aba **Raid** passa a usar o Worker Cloudflare em `RAID_API_BASE`, preservando os assets visuais da GTales.top em `RAID_ASSET_BASE`.
- As chaves de cache local da aba Raid foram atualizadas para V7.0, evitando reaproveitamento indevido de dados antigos.
- Os cards de heróis foram redesenhados para usar imagem quadrada segura, evitando o quadro retangular grande que ficava vazio quando o asset não carregava corretamente.
- Foi adicionada tentativa de carregamento por múltiplos caminhos de assets para os heróis, aumentando a chance de compatibilidade com as variações da GTales.top.
- Caso a imagem do herói falhe, o card agora mantém um placeholder pequeno e discreto, sem quebrar o layout.
- O layout dos cards de heróis ficou mais compacto, exibindo nome, arma, acessório e cartas de forma objetiva.
- Campos de **Dano** e **Fever** foram removidos dos cards individuais, pois a API não fornece dano por personagem.
- O cabeçalho da composição agora deixa mais claro que **Dano total** e **Fever total** pertencem à composição inteira.
- As chains foram organizadas em bloco próprio como **Chains da composição**.
- As observações da API são exibidas somente quando existem, com HTML externo convertido para texto limpo.
- Cada composição agora possui botão **Ver no Guardian Tales TOP**, apontando para a fonte oficial do boss e elemento consultados.
- O botão **Assistir vídeo** permanece disponível apenas quando a API retorna link de vídeo.
- Hall, Buscar, Registro, Galeria, Liga, canvas da ficha, canvas da rodada, canvas do pódio, OCR e histórico inteligente foram preservados.

Relatório da versão: `RELATORIO_V7_0_ATUALIZACAO.md`.

---

## Portal Avalon V7.0.1 — Refinamento Visual da Aba Raid

A versão V7.0.1 refina a aba **Raid** após a integração oficial com o Worker Cloudflare:

- A área de consulta ficou mais limpa, removendo o aviso técnico grande sobre API externa.
- A referência à fonte **Guardian Tales TOP** agora aparece de forma discreta abaixo dos filtros.
- Os selects de **Boss** e **Elemento** permanecem na primeira linha, enquanto os botões **Buscar times**, **Recarregar dados** e **Limpar consulta** ficam organizados horizontalmente abaixo.
- Os avatars dos heróis receberam regras mais estáveis para desktop, tablet e mobile, reduzindo o risco de quadro vazio em tela cheia.
- As imagens principais de herói e boss passam a carregar de forma prioritária quando estão em área visível.
- O grid dos heróis foi ajustado para `auto-fit`, permitindo melhor adaptação entre 4, 2 ou 1 coluna conforme o tamanho da tela.
- O bloco **Chains da composição** foi reorganizado com fases e chains em cartões internos mais legíveis.
- Dano individual e Fever individual continuam ocultos, mantendo apenas **Dano total** e **Fever total** por composição.
- A URL do Worker e os assets da GTales.top foram preservados.
- Hall, Buscar Ficha, Registro, Galeria, Liga, canvases, OCR e histórico inteligente foram preservados.

Relatório da versão: `RELATORIO_V7_0_1_ATUALIZACAO.md`.


---

## Portal Avalon V7.0.2 — Combobox da Raid, Tradução PT-BR e Correção dos Avatares

A versão V7.0.2 aprofunda o refinamento da aba **Raid** com foco em usabilidade, leitura dos dados e estabilidade visual:

- O select nativo de **Boss** foi substituído por um **combobox customizado** no padrão visual Avalon.
- O combobox permite buscar bosses por texto, filtrar a lista em tempo real, selecionar boss e fechar ao clicar fora ou pressionar ESC.
- A lista de bosses agora tem dropdown estilizado, scroll interno, miniatura do boss e indicação dos elementos disponíveis.
- O seletor de **Elemento** foi refinado para chips/botões visuais, exibindo apenas os elementos disponíveis do boss selecionado.
- A seleção de boss atualiza automaticamente os chips de elemento e mantém o botão de busca bloqueado até a escolha completa.
- As observações vindas da GTales.top API agora são limpas de HTML, convertem `<br>` em quebra de linha e recebem tradução local segura para PT-BR quando há frases conhecidas.
- Termos técnicos como RNG, WS, Chain, Fever, Boss, buff, debuff e shred são preservados quando fazem sentido para a comunidade.
- O CSS dos avatares dos heróis foi revisado de forma mais agressiva para evitar o bug em tela cheia, estabilizando container, imagem, placeholder, z-index e comportamento entre breakpoints.
- A ordem de tentativa dos assets dos heróis foi reorganizada, priorizando caminhos que carregaram nos testes e mantendo fallbacks extras.
- O placeholder não deve mais sobrepor imagens carregadas e a imagem passa a marcar o container com estado `has-image` após carregamento.
- Hall, Buscar Ficha, Registro, Galeria, Liga, canvases, OCR, Worker e lógica principal de consulta foram preservados.

Relatório da versão: `RELATORIO_V7_0_2_ATUALIZACAO.md`.

---

## Portal Avalon V7.0.3 — Refinamento Visual Final da Aba Raid

A versão V7.0.3 finaliza o refinamento visual da aba **Raid**, preservando o restante do Portal Avalon e focando apenas na experiência de consulta de bosses, elementos e composições.

- O seletor de **Elemento** foi transformado em um **combobox customizado**, seguindo o padrão visual do combobox de boss.
- Os elementos agora aparecem com **ícones coloridos** em `web/assets/img/elements/`, mantendo leitura visual rápida para Fire, Water, Earth, Light, Dark e Basic.
- O campo de elemento permanece bloqueado/orientativo enquanto nenhum boss está selecionado.
- A área de **Resultados** não aparece mais antes de uma consulta real, evitando sobreposição com dropdowns e deixando a aba mais limpa.
- Os estados de **carregamento**, **sucesso**, **erro** e **sem resultados** foram convertidos para cards estilizados no padrão Avalon.
- Os cards de composição foram centralizados em uma lista de largura controlada.
- O cabeçalho dos cards de composição agora destaca boss e elemento de forma mais clara, incluindo ícone do elemento consultado.
- O botão **Buscar times** continua bloqueado até boss e elemento serem selecionados.
- Worker, avatares dos heróis, armas, acessórios, cartas, traduções de observações, Hall, Buscar Ficha, Registro, Galeria, Liga, OCR e canvas foram preservados.

Relatório da versão: `RELATORIO_V7_0_3_ATUALIZACAO.md`.

---

## Portal Avalon V7.0.4 — Refinamento dos Resultados da Aba Raid

A versão V7.0.4 corrige e refina exclusivamente a área de resultados da aba **Raid**, preservando o restante do Portal Avalon:

- Os cards de composição foram estabilizados para que **Composição #1, #2, #3 e demais** mantenham a mesma largura, centralização e estrutura visual.
- A lista de composições agora usa uma coluna única de cards independentes, evitando quebra de layout após a primeira composição.
- As mensagens da consulta, como carregamento, sucesso, erro, cache e avisos, passaram a aparecer em **cards compactos no padrão Avalon**, deixando de aparecer como frases soltas.
- A área **Composições encontradas** permanece condicionada a uma consulta real e com resultados válidos.
- As relíquias passaram a ter exibição visual nos metadados das composições, usando tentativas de imagem nos assets da GTales.top e mantendo fallback textual se a imagem não carregar.
- O cabeçalho dos cards preserva boss, elemento com ícone, player/criador, dano total e Fever total.
- Os heróis continuam em grid responsivo, com imagens, armas, acessórios e cartas preservados.
- Worker, combobox de boss, combobox de elementos, avatares, traduções de observações, Hall, Buscar Ficha, Registro, Galeria, Liga, OCR e canvases foram preservados.

Relatório da versão: `RELATORIO_V7_0_4_ATUALIZACAO.md`.

---

## Portal Avalon V7.0.5 — Fluxo Inteligente da Consulta Raid

A versão V7.0.5 refina exclusivamente o fluxo visual da aba **Raid**, removendo cards fixos desnecessários e tornando os avisos contextuais conforme a ação do usuário.

### Ajustes principais

- A página Raid não exibe mais card fixo de “Consulta incompleta” ao abrir ou ao limpar a consulta.
- O status da busca agora aparece apenas em ações relevantes:
  - boss selecionado;
  - elemento selecionado;
  - busca em andamento;
  - consulta concluída com sucesso;
  - erro ou ausência de resultados.
- Ao encontrar composições, a página rola automaticamente até a **Composição #1**.
- O chip técnico `Stun` foi renomeado para **Skills p/ Stun**.
- A aba Raid manteve o restante da estrutura funcional e visual preservada.

Relatório da versão: `RELATORIO_V7_0_5_ATUALIZACAO.md`.


---

## Portal Avalon V7.0.6 — Polimento Final da Experiência Raid

A versão V7.0.6 refinou a experiência final da aba Raid sem alterar as demais áreas do portal.

### Principais melhorias

- Cartas da composição exibidas como chips visuais em português.
- `skill-skill` agora aparece como `Habilidade - Habilidade`.
- `crit-atk7` agora aparece como `Crítico - Ataque`.
- Feedback de busca movido para toast/modal flutuante centralizado.
- Removida redundância de cards “Composições encontradas” dentro da área de resultados.
- Resultados mantidos apenas no bloco real de composições.
- Auto-scroll para a Composição #1 preservado após consulta bem-sucedida.
- Adicionado botão flutuante “↑ Topo” na aba Raid.
- Nomenclatura `Skills p/ Stun` preservada.

### Arquivos principais alterados

```text
web/pages/raid.html
web/assets/js/raid.js
web/assets/css/styles.css
RELATORIO_V7_0_6_ATUALIZACAO.md
```

### Áreas preservadas

Salão, Hall, Buscar, Registro, Galeria, Liga, OCR, mapas, canvas da Liga, canvas da ficha e dados locais foram preservados.

---

## Portal Avalon V7.2 — Hall com Histórico Rotativo de Raids

A versão V7.2 substitui o comparativo simples entre duas raids por uma base histórica rotativa de até quatro registros.

### Nova lógica

- `raid_atual.json` continua sendo a fonte oficial da raid mais recente gerada pelo OCR.
- `raid_history.json` armazena a raid atual e até três raids anteriores.
- O Hall calcula a média das últimas três raids anteriores válidas.
- É necessário ter pelo menos duas raids anteriores válidas para gerar percentual evolutivo.
- Raid histórica com frequência desconhecida entra na média e marca a ficha como **Base estimada**.
- Raid histórica com frequência conhecida abaixo de `15/21` não entra na média.
- O membro só entra no Hall se tiver presença atual mínima de `15/21`, base suficiente e evolução positiva.
- O ranking do Hall é ordenado por percentual evolutivo, depois evolução absoluta e dano atual.

### Semente histórica

A planilha `Raid danos.xlsx` foi usada para iniciar o histórico:

- `Dano 4`: somente referência; o OCR atual continua sendo a autoridade.
- `Dano 3`: raid anterior 1.
- `Dano 2`: raid anterior 2.
- `Dano 1`: raid anterior 3.
- Somente nomes ainda presentes em `raid_atual.json` foram importados.
- `Lancelotz` e `Mesax` foram ignorados por não integrarem o roster atual.
- A divergência de `utiago` em `Dano 4` foi resolvida mantendo o valor oficial do OCR.
- A raid `Dano 3` de `Wagnero` foi marcada como `6/21` e, portanto, excluída da média.

### Arquivos novos

```text
web/data/raids/raid_history.json
web/data/raids/raid_manual_overrides.json
tools/seed_raid_history_from_xlsx.py
tools/promote_raid_history.py
tools/validate_raid_history.py
RELATORIO_V7_2_ATUALIZACAO.md
```

### Fluxo das próximas raids

```text
OCR novo → validar JSON → promover histórico → validar histórico → commit → deploy
```

Exemplo:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/raid_tratada_NOVA_DATA.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json

python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

Relatório da versão: `RELATORIO_V7_2_ATUALIZACAO.md`.
