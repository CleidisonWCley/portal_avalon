# OCR Guild Rank Extractor — Portal Avalon V7.8.2

Subprojeto responsável por extrair, revisar e consolidar o ranking de Raid da Guilda Avalon a partir dos screenshots do jogo.

O fluxo preserva o método simples do projeto:

```text
substituir img1 até img5
→ informar número e data da raid
→ executar OCR
→ conferir CSV bruto e revisado
→ validar
→ promover para o Portal
```

## Documentação relacionada

- [`../../docs/REGRAS_E_DADOS.md`](../../docs/REGRAS_E_DADOS.md)
- [`../../docs/MANUTENCAO_E_DEPLOY.md`](../../docs/MANUTENCAO_E_DEPLOY.md)
- [`../../docs/TESTES.md`](../../docs/TESTES.md)

## Blindagem das correções

As correções manuais não são mais identificadas apenas por imagem e linha. Elas ficam dentro do número da raid:

```python
CORRECOES_LINHAS_POR_RAID = {
    133: {
        ("img1.jpeg", 3): {
            "nome": "Cley",
            "frequencia": "21/21",
            "dano": 6418524181,
        }
    }
}
```

Ao executar a Raid 134, somente o bloco `134` poderá ser carregado. Uma correção da Raid 133 nunca será aplicada silenciosamente na coleta seguinte.

O CSV bruto é salvo **antes** das correções. O CSV revisado e o JSON oficial são gerados depois.

## Padrão das imagens

Use somente:

```text
images/
├── img1.jpeg
├── img2.jpeg
├── img3.jpeg
├── img4.jpeg
└── img5.jpeg  # opcional, posições 29 e 30
```

Regras:

- extensões aceitas: `.jpeg`, `.jpg` e `.png`;
- imagens devem começar em `img1` e seguir sem lacunas;
- máximo de cinco imagens;
- nomes extras ou fora do padrão bloqueiam a execução;
- cada uma das quatro primeiras imagens processa até sete linhas;
- a quinta processa somente as duas vagas restantes da guilda.

## Instalação

Na raiz do subprojeto:

```bash
cd ocr/guild-rank-ocr
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Linux e macOS:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

O Tesseract também precisa estar instalado. O programa procura:

1. variável `TESSERACT_CMD`;
2. executável no `PATH`;
3. `C:\Program Files\Tesseract-OCR\tesseract.exe`.

## Executar uma nova raid

Exemplo oficial da Raid 133:

```bash
python -m src.main --raid 133 --ended-at 2026-06-17 --source official
```

### Proteção contra repetição

Se os arquivos da raid já existirem, a execução é bloqueada. Para reprocessar conscientemente:

```bash
python -m src.main --raid 133 --ended-at 2026-06-17 --source official --force
```

Nunca use `--force` sem antes conferir os arquivos existentes.

## Arquivos gerados

Para a Raid 133:

```text
output/
├── csv/
│   ├── raid_133_bruto.csv
│   └── raid_133_revisado.csv
└── json/
    ├── raid_133.json
    └── raid_133_relatorio.json
```

- **`raid_133_bruto.csv`:** resultado original do Tesseract para auditoria;
- **`raid_133_revisado.csv`:** dados conferidos e normalizados;
- **`raid_133.json`:** fonte validada usada na promoção;
- **`raid_133_relatorio.json`:** resumo de imagens, correções, pendências e promoção.

## Elenco dinâmico: permanecem, saíram, novos e retornantes

O elenco de cada raid é calculado a partir do histórico, sem editar `NOMES_VALIDOS` (que é só a base de partida):

| Categoria | Regra |
| --- | --- |
| permanecem | estavam na raid anterior e aparecem no ranking |
| saíram | estavam na raid anterior e não aparecem no ranking |
| novos | aparecem no ranking e nunca estiveram em raid anterior |
| retornantes | aparecem, não estavam na raid anterior, mas já estiveram antes (ex.: tang na Raid 136) |

**Atenção:** o ranking do jogo não lista quem não atacou, então "saiu" é sempre uma inferência. Se o membro só faltou, rode de novo com `--manter-ausente NOME` (ele entra como 0/21). Há três formas de dizer que alguém continua na guilda mesmo sem aparecer no ranking:

- `--manter-ausente NOME` na linha de comando (vale só para aquela execução);
- `ELENCO_MANUAL_POR_RAID[N]["manter_ausentes"]` em `src/config.py` (vale só para a raid N);
- `MEMBROS_SEMPRE_NO_ELENCO` em `src/config.py` (rede de segurança permanente: sempre que o nome sumir do ranking entra como ausente 0/21).

Quando o membro realmente sair, remova-o de `MEMBROS_SEMPRE_NO_ELENCO` ou confirme a saída em `ELENCO_MANUAL_POR_RAID[N]["saidas_confirmadas"]`, que tem precedência. As demais decisões fixas de uma raid (`renomear_novos`, `nao_e_novo`, `saidas_confirmadas`, `novos_confirmados`) também ficam em `ELENCO_MANUAL_POR_RAID`.

```bash
python -m src.main --raid 144 --ended-at 2026-11-18 --force
python -m src.main --raid 144 --ended-at 2026-11-18 --force --manter-ausente Snowers
python -m src.utils.elenco --raid 143      # audita uma raid já processada
```

Confira sempre a grafia dos novos no recorte salvo em `output/revisao/raid_N/` (campo `grafiaConfirmada` fica `false` no JSON). Nomes em outro alfabeto (kana, hangul) o Tesseract não lê: a linha fica pendente e precisa de um modelo visual (`gerar_modelos_nomes`) ou de `renomear_novos`.

## Alinhamento das linhas e leitura dos campos

No perfil tablet/desktop, cada linha é localizada pela **pílula escura de dano** (contraste local entre a pílula e o fundo do cartão), e não por uma grade fixa. O scroll da lista para em pontos diferentes em cada print, e uma grade fixa fazia os recortes pegarem pedaços de duas linhas. O cartão rosa fixo "minha posição" (última linha da tela) é ignorado. Se uma pílula não for detectada, a posição é estimada pelo passo (~115 px) e o console avisa.

- **Nome:** o recorte termina no badge roxo "Nv.", então o nível e o cargo ("Mestre da Guilda") não entram no OCR.
- **Dano:** a leitura só é confiável com o agrupamento de milhares íntegro (`7.695.963.918`). Um dígito a mais ou a menos é rejeitado e, sem leitura íntegra, vale a maioria entre as variantes. Se mesmo assim ficar incerto, a linha recebe `dano_suspeito`.
- **Ordem do ranking:** o dano nunca pode aumentar de uma posição para a próxima. Se aumentar, o relatório lista o erro e a raid fica em revisão pendente. Linhas repetidas entre prints (scroll que recua no fim) são ignoradas.

## Nomes que o Tesseract não lê

Nomes em japonês e com kanji (`ヴァルディネイ`, `カミナリ`, `MJ馬McQueen`) são reconhecidos **visualmente**, comparando o recorte com modelos em `assets/nomes/`. O modelo só vale com correlação alta e margem sobre o segundo colocado; na dúvida, o fluxo normal (OCR de texto e revisão) continua. Para cadastrar ou atualizar um modelo, inclua o nome em `MODELOS_NOMES` (`src/config.py`) e rode:

```bash
python -m src.gerar_modelos_nomes --imagem images/img2.jpeg --linha 2 --nome ヴァルディネイ
python -m src.gerar_modelos_nomes --listar
```

Os modelos foram feitos para screenshots do mesmo aparelho/escala dos oficiais.

## Reconhecimento de nomes

A lista oficial permanece em `NOMES_VALIDOS`.

Aliases de um ou dois caracteres, como `wa`, `cr`, `Zz` e `ee`, continuam úteis em correspondência exata, mas não participam do fuzzy matching. Isso evita que um ruído longo seja associado incorretamente a um nome curto.

Resultados ambíguos permanecem marcados para revisão.

## Desempenho

O OCR tenta primeiro a variante em escala de cinza. A variante OTSU é usada somente quando o primeiro resultado não é válido. Isso reduz chamadas desnecessárias ao Tesseract sem remover o fallback de qualidade.

## Promoção segura

Partindo da raiz do Portal:

```bash
python tools/promote_raid_history.py \
  --new-current ocr/guild-rank-ocr/output/json/raid_133.json \
  --history web/data/raids/raid_history.json \
  --published-current web/data/raids/raid_atual.json \
  --published-previous web/data/raids/raid_anterior.json \
  --report ocr/guild-rank-ocr/output/json/raid_133_relatorio.json \
  --legacy-current-number 132
```

`--legacy-current-number` foi necessário somente na transição da Raid 132, pois o JSON antigo ainda não possuía `raidNumber`. Nas próximas raids, não use esse argumento.

A promoção é bloqueada quando:

- o relatório não está validado;
- existem registros pendentes;
- `raidNumber` está ausente;
- a nova raid não é superior à atual.

A escrita dos JSONs publicados ocorre de forma atômica:

```text
raid_atual.json
raid_anterior.json
raid_history.json
```

## Validação

Após promover:

```bash
python tools/validate_raid_history.py \
  --history web/data/raids/raid_history.json \
  --current web/data/raids/raid_atual.json

python tools/run_tests.py --quick
```

Avisos sobre bases estimadas e frequências históricas baixas são esperados. Erros impedem o commit.

## Estrutura principal

```text
src/
├── main.py                 # CLI, imagens, saídas e relatório
├── config.py               # roster, limites, coordenadas e correções por raid
├── ocr/extractor.py        # recortes, variantes e Tesseract
└── utils/
    ├── export.py           # CSV
    ├── name_matcher.py     # aliases e fuzzy protegido
    ├── postprocess.py      # normalização, resumo e validação
    ├── review.py           # correções vinculadas à raid
    └── text_cleaning.py    # limpeza dos campos
```

## Raid 133 processada

```text
Encerramento: 17/06/2026
Fonte: oficial
Participantes: 28
Ausentes: 0
Dano total: 116.390.205.306
Correções necessárias: 12
Status: validada e promovida
```
