# Testes e baseline de qualidade

Este arquivo substitui os antigos relatórios e validações separados. Ele registra comandos, cobertura, baseline atual e resultados históricos relevantes.

## 1. Requisitos

- Node.js para `node --check` e testes `.js`;
- Python 3 para validações e testes de navegador;
- Playwright/Chromium para testes visuais automatizados;
- Bash para os scripts agregadores, quando disponível.

Em Windows sem Bash, execute os comandos Node/Python individualmente.

## 2. Suítes existentes

### Desempenho e resiliência

```bash
bash tools/run_performance_tests.sh
```

Executa:

- `test_loading_resilience.py`;
- `test_image_budget.py`;
- `test_zoom_responsive.py`;
- sintaxe de `ui.js`, `app.js`, `raid.js`, `liga.js` e `liga-firebase.js`.

### Regressão funcional principal

```bash
node tools/test_v7_3_1.js   # Hall e Registro
node tools/test_v7_4.js     # canvas e Liga
node tools/test_v7_5.js     # pódio adaptativo
node tools/test_v7_6.js     # componentes globais
```

### Histórico

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json
```

### Refinamentos V7.7

```bash
bash tools/run_tests_v7_7.sh
bash tools/run_tests_v7_7_2.sh
bash tools/run_tests_v7_7_3.sh
bash tools/run_tests_v7_7_4_1.sh
```

Essas suítes permanecem úteis como regressão, embora os nomes representem a versão em que foram criadas.

## 3. Checklist manual por release

### Todas as páginas

- carregamento sem conteúdo invisível;
- menu desktop e mobile;
- mascotes e cabeçalho sem overflow;
- botão voltar ao topo;
- console sem erro;
- caminhos e imagens válidos.

### Hall, Buscar e Registro

- percentuais e médias;
- posições vagas;
- patentes;
- ranking de dano independente;
- ausentes e base insuficiente;
- filtros e busca;
- ficha e canvas.

### Raid

- lista de bosses;
- filtros e composição;
- quatro heróis sem corte;
- cache de seis horas;
- falha externa com mensagem e fallback.

### Liga

- participante lembrado;
- organizador temporário e persistente;
- conta não autorizada;
- rascunho silencioso;
- publicação;
- sincronização em dois navegadores;
- mapas, chaves, fases e pódio;
- encerramento com preservação e limpeza;
- `state: null`;
- arquivo administrativo invisível ao participante;
- Mudar de acesso;
- downloads e canvas.

### Viewports mínimas

- `320×568`;
- `390×844`;
- `430×932`;
- `720×900`;
- `768×1024`;
- `980px` de largura;
- `1366×768/900`.

Também verificar zoom de 80% a 200% e pinch zoom em dispositivo real.

## 4. Baseline funcional consolidada

| Área | Baseline histórica aprovada |
|---|---:|
| Hall e Registro | 11/11 |
| Canvas/Liga V7.4 | 7/7 |
| Pódio V7.5 | 7/7 |
| Estrutura global V7.6 | 6/6 |
| Histórico de raids | 4 raids, 0 erros |
| Avisos históricos | 83 esperados, principalmente base estimada |

Avisos de base estimada e exclusão de baixa frequência são informativos quando correspondem às políticas configuradas.

## 5. Baseline de desempenho V7.7.4

Resultados aprovados:

- sem substituição global de `window.fetch`;
- tarefas críticas explícitas;
- timeout, repetição, cache e fallback;
- Firebase carregado em segundo plano;
- imagens WebP dentro do orçamento;
- páginas sem overflow global nas larguras testadas;
- Registro em tabela acima de 980px e cards até 980px;
- Galeria carregando somente `eventos.json`;
- JSON lento mantendo loader até a renderização;
- JSON indisponível liberando fallback.

Peso crítico registrado naquela baseline:

| Página | Peso aproximado |
|---|---:|
| Salão | 147,2 KiB |
| Galeria | 112,3 KiB |
| Hall | 98,0 KiB |
| Liga | 110,6 KiB |
| Buscar | 94,3 KiB |
| Raid | 78,9 KiB |
| Registro | 75,2 KiB |

Esses valores servem como referência, não como limite absoluto permanente.

## 6. Histórico resumido de validações

### V7.3

- 13/13 regras e integração do Hall;
- 4/4 cenários DOM;
- JSON e referências válidos;
- 27 classificados, 1 fora e 3 vagas na base testada.

### V7.3.1

- 11/11 regressões de Hall e Registro;
- frequência removida dos cards públicos;
- ranking dinâmico e ausentes preservados;
- bases insuficientes mantidas na lógica.

### V7.4

- 7/7 canvas PvP;
- 1v1, 2v2, 3v3 e grupos usando motor compartilhado;
- pacote extraído e testado sem erro.

### V7.5

- 7/7 pódio adaptativo;
- nomes extensos e equipes dentro da moldura;
- 35 casos automatizados nomeados aprovados na validação do pacote.

### V7.6

- 6/6 estrutura global;
- botão de topo, plataforma, Hall simplificado e feedback compartilhado;
- pacote e referências aprovados.

### V7.6.1

- regressões V7.3.1, V7.4, V7.5 e V7.6 aprovadas;
- documentação, referências, hashes e utilitário de promoção validados;
- nenhuma mudança pública introduzida.

### V7.7

- responsividade em sete viewports;
- Registro mobile em cards;
- Raid mobile com quatro heróis;
- resultado final aprovado.

### V7.7.2

- 10/10 estrutura e consolidação;
- 11/11 Hall/Registro;
- 6/6 estrutura V7.6;
- 6/6 grupos visuais e responsivos.

### V7.7.3

- sintaxe dos seis JavaScripts principais;
- 6/6 estrutura consolidada;
- 5/5 grupos de navegador e responsividade;
- regressões anteriores preservadas.

### V7.7.4

- carregamento resiliente, imagens e zoom aprovados;
- Hall/Registro 11/11;
- Liga 7/7;
- pódio 7/7;
- estrutura 6/6.

### V7.7.4.1

- retorno ao topo em 390px e 1366px;
- cancelamento por gesto e teclado;
- destaque único das patentes;
- troféus da Liga estáticos;
- regressões preservadas.

### V7.7.4.2.x

- fundo escuro e simplificação gráfica durante pinch zoom;
- flashes decorativos refinados sem interferir nas funções;
- mobile e tablet mantiveram o efeito visual;
- em alguns ambientes Chromium/Windows o flash pode degradar para imagem estática, sem impacto funcional. Confirmar no deploy real.

### V7.8.1

Validações realizadas na atualização:

- participante lembrado sem criar rascunho;
- Mudar de acesso removendo a preferência;
- organizador temporário e persistente;
- migração legada somente após autenticação;
- encerramento com arquivo, rascunho ou limpeza;
- `state: null` no documento encerrado;
- arquivos invisíveis ao participante;
- consulta, duplicação e exclusão administrativa;
- ausência do modal legado de restauração;
- regras, mapas, chaves, pódio e canvas preservados;
- sintaxe dos JavaScripts alterados aprovada.

A integração V7.8.1 foi testada com Firebase simulado. Validar o Firestore real depois do deploy.

## 7. Validação de pacote

Antes de distribuir um ZIP:

1. testar integridade com `unzip -t` ou ferramenta equivalente;
2. extrair em diretório limpo;
3. executar sintaxe e regressões na cópia extraída;
4. conferir que o pacote contém somente os arquivos esperados;
5. validar caminhos com capitalização exata;
6. registrar hash SHA-256 quando necessário.

## 8. Critério de aprovação

Uma versão pode ser entregue quando:

- testes da área alterada passam;
- regressões essenciais passam;
- não há erro novo no console;
- mobile e desktop foram verificados;
- JSONs e caminhos são válidos;
- comportamento de falha é aceitável;
- limitações conhecidas estão documentadas;
- diff contém somente mudanças intencionais.
