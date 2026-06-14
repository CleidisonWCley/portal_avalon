# Portal Avalon — Web

Esta versão refina o MVP visual e arquitetural do portal da Guilda Avalon.

## Como testar localmente

Abra o terminal dentro da pasta `web/` e rode:

```powershell
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

Não abra o `index.html` com duplo clique, porque o navegador pode bloquear o carregamento dos arquivos JSON.

## Estrutura da web

```text
web/
├── index.html                  # Salão de Avalon
├── pages/
│   ├── hall.html               # Hall da Evolução
│   ├── oraculo.html            # Buscar Ficha
│   ├── registro.html           # Registro da Batalha
│   └── galeria.html            # Galeria de Eventos
├── assets/
│   ├── css/styles.css
│   ├── js/data.js
│   ├── js/app.js
│   └── img/
│       ├── brand/
│       ├── insignias/
│       └── mascots/
└── data/
    ├── raids/raid_atual.json
    ├── raids/raid_anterior.json
    └── insignias.json
```

## Melhorias v3.1

- Site separado em páginas HTML.
- Estética medieval refinada com molduras, bordas e cards mais nobres.
- Animação de entrada padrão nas seções.
- Hover/flutuação em cards, nomes e blocos principais.
- Registro da Batalha simplificado e mais operacional.
- Insígnias removidas da tabela geral para evitar confusão.
- Filtros por nick, situação e evolução.
- Mascotes integrados:
  - `cley.png`: mascote rato do líder.
  - `olimpio.png`: mascote capivara do vice.
- Fundos indesejados removidos das insígnias e mascotes.
- Melhorias de responsividade e legibilidade.

## Atualização dos dados

Quando uma nova raid for processada pelo OCR:

1. Copie o `raid_atual.json` antigo para `raid_anterior.json`.
2. Copie o novo JSON tratado para `raid_atual.json`.
3. Rode novamente o servidor local.

O site calcula automaticamente:

```text
evolução = dano atual - dano anterior
```

## Observação

A pasta `ocr/` foi mantida como está. Esta etapa atua apenas sobre a arquitetura web e assets visuais.

## V7.3 — Hall dinâmico

A V7.3 adiciona frequência mínima por faixa, posições vagas, patentes dinâmicas e a seção “Às Margens do Hall”.

Para executar os testes da versão:

```bash
./tools/run_tests_v7_3.sh
```

Consulte `RELATORIO_V7_3_ATUALIZACAO.md` para os critérios e resultados completos.

## V7.3.1 — blindagem do Hall e Registro otimizado

A V7.3.1 mantém integralmente as regras matemáticas da V7.3 e adiciona:

- frequência e limites internos ocultos na página pública do Hall;
- Hall exibindo somente dano atual, média base e evolução;
- ficha baixável horizontal com dano, média, evolução, ranking de dano e posição no Hall;
- ranking de dano recalculado dinamicamente a cada raid;
- membros ausentes preservados com ranking `Incalculável`;
- Registro da Batalha com modos `Dano total`, `Hall evolutivo` e `Ausente`;
- tabela reduzida para dez colunas, cabeçalho e identificação do membro fixos;
- filtros de base parcial/insuficiente exibidos somente quando existirem casos;
- botão flutuante para retornar ao topo.

Execute a validação completa com:

```bash
./tools/run_tests_v7_3_1.sh
```
