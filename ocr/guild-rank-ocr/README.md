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
