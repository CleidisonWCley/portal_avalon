# OCR Guild Rank Extractor — Portal Avalon

Subprojeto responsável por extrair, revisar e consolidar os dados do ranking de Raid da Guilda Avalon a partir de screenshots do jogo.

O OCR reconhece:

- nome do membro;
- frequência de participação;
- dano total;
- status de validação;
- situação de participação.

Ao final, gera arquivos de auditoria em CSV e um JSON tratado pronto para entrar no fluxo de atualização do Portal Avalon.

> **Documentação canônica do projeto**
>
> Antes de atualizar uma nova raid, leia:
>
> 1. [`../../docs/manutencao/INICIO_RAPIDO.md`](../../docs/manutencao/INICIO_RAPIDO.md)
> 2. [`../../docs/manutencao/CHECKLIST_NOVA_RAID.md`](../../docs/manutencao/CHECKLIST_NOVA_RAID.md)
> 3. [`../../docs/manutencao/GUIA_DE_MANUTENCAO.md`](../../docs/manutencao/GUIA_DE_MANUTENCAO.md)
> 4. [`../../docs/manutencao/FLUXO_GIT_DEPLOY.md`](../../docs/manutencao/FLUXO_GIT_DEPLOY.md)

---

## Aviso crítico antes de processar uma nova Raid

O arquivo [`src/config.py`](src/config.py) contém correções manuais da raid usada na calibração atual:

```python
USAR_CORRECOES_LINHAS_ATUAL = True
CORRECOES_LINHAS_ATUAL = {
    # correções por nome de imagem e número da linha
}
```

Essas correções podem substituir diretamente nome, frequência e dano quando os novos screenshots utilizam os mesmos nomes de arquivo, como:

```text
img1.jpeg
img2.jpeg
img3.jpeg
img4.jpeg
```

Antes de executar o OCR em uma nova raid, faça uma destas ações:

1. atualize `CORRECOES_LINHAS_ATUAL` com dados confirmados da nova raid;
2. limpe o dicionário de correções; ou
3. desative temporariamente:

```python
USAR_CORRECOES_LINHAS_ATUAL = False
```

Nunca reutilize as correções da raid anterior sem revisão. Isso pode publicar danos e frequências antigos como se pertencessem à nova raid.

---

## Papel do OCR no Portal

O OCR não publica os dados automaticamente.

O fluxo correto é:

```text
Screenshots
→ extração OCR
→ CSV bruto
→ tratamento e consolidação
→ revisão manual
→ JSON tratado
→ promoção do histórico
→ validação
→ testes do Portal
→ commit e deploy
```

A revisão humana continua obrigatória, especialmente para:

- nomes com caracteres especiais;
- valores de dano muito baixos ou muito altos;
- frequências incompletas;
- registros duplicados;
- membros novos;
- correções manuais por linha.

---

## Tecnologias

As versões efetivamente utilizadas estão fixadas em [`requirements.txt`](requirements.txt).

| Tecnologia | Uso |
|---|---|
| Python | execução do pipeline |
| OpenCV | leitura, recorte e tratamento das imagens |
| Pytesseract | integração com o Tesseract OCR |
| RapidFuzz | correção de nomes e aliases |
| NumPy | operações de imagem |
| Pillow | suporte de processamento |

### Requisito de Python

Use preferencialmente:

```text
Python 3.10 ou superior
```

O código requer no mínimo Python 3.9 devido ao uso das anotações nativas `list[...]`.

---

## Estrutura atual

```text
ocr/guild-rank-ocr/
├── images/
│   └── imagens da raid para processamento
├── output/
│   ├── ocr_raw_*.csv
│   ├── ocr_tratado_*.csv
│   └── raid_tratada_*.json
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── ocr/
│   │   ├── __init__.py
│   │   └── extractor.py
│   └── utils/
│       ├── __init__.py
│       ├── export.py
│       ├── name_matcher.py
│       ├── postprocess.py
│       └── text_cleaning.py
├── .gitignore
├── requirements.txt
└── README.md
```

### Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `src/main.py` | coordena leitura, extração, tratamento e exportação |
| `src/config.py` | membros, aliases, coordenadas, limites e correções da raid |
| `src/ocr/extractor.py` | recortes, pré-processamento, Tesseract e validação inicial |
| `src/utils/name_matcher.py` | aliases, correções exatas e fuzzy matching |
| `src/utils/postprocess.py` | normalização, duplicados, ausentes, resumo e JSON |
| `src/utils/export.py` | geração dos CSVs |
| `src/utils/text_cleaning.py` | limpeza de nomes, frequências e danos |

---

## Pré-requisitos

### 1. Python

Confirme:

```bash
python --version
```

No Linux ou macOS, o comando pode ser:

```bash
python3 --version
```

### 2. Tesseract OCR

O Tesseract precisa estar instalado no sistema.

#### Windows

O projeto tenta localizar o executável nesta ordem:

1. variável de ambiente `TESSERACT_CMD`;
2. executável disponível no `PATH`;
3. caminho padrão configurado em `src/config.py`.

Caminho padrão atual:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Também é possível definir manualmente:

```powershell
$env:TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

#### Linux

Exemplo em distribuições baseadas em Debian ou Ubuntu:

```bash
sudo apt install tesseract-ocr
```

#### macOS

Com Homebrew:

```bash
brew install tesseract
```

### Idiomas do OCR

A configuração atual é:

```python
OCR_LANG = "eng"
```

Nomes japoneses e outras leituras difíceis são recuperados principalmente por:

- `NOMES_VALIDOS`;
- `ALIASES_MEMBROS`;
- `CORRECOES_OCR_NOMES`;
- `CORRECOES_LINHAS_ATUAL`.

Caso os pacotes de idioma correspondentes estejam instalados, a configuração poderá ser alterada para:

```python
OCR_LANG = "eng+jpn+kor"
```

Faça essa mudança somente após testar o resultado e o tempo de processamento.

---

## Instalação

Partindo da raiz do Portal Avalon:

```bash
cd ocr/guild-rank-ocr
python -m pip install -r requirements.txt
```

É recomendado utilizar ambiente virtual.

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

### Linux e macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

---

## Preparação das imagens

Coloque os screenshots em:

```text
ocr/guild-rank-ocr/images/
```

Formatos aceitos:

```text
.jpeg
.jpg
.png
```

### Recomendações

- use capturas sem redimensionamento manual;
- mantenha a lista do ranking completamente visível;
- evite cortes laterais;
- evite sobreposição de notificações;
- use nomes de arquivos previsíveis;
- confirme a ordem das páginas do ranking;
- verifique se uma linha foi repetida entre screenshots.

O OCR atual processa até sete linhas visíveis por imagem.

---

## Coordenadas e resolução

A calibração oficial está em:

```text
src/config.py
```

Não copie as coordenadas para outro arquivo como fonte oficial.

A resolução-base atual é definida no próprio código, e o extrator escala proporcionalmente:

- regiões de nome;
- frequência;
- dano;
- distância vertical entre as linhas.

Isso permite trabalhar com resoluções diferentes, mas não garante precisão perfeita em screenshots com:

- proporção diferente;
- interface reposicionada;
- zoom;
- corte;
- resolução muito distante da calibração.

Quando o resultado estiver desalinhado, consulte `GERAR_DEBUG_CROPS` e revise a configuração em `src/config.py`.

### Recortes de depuração

Para salvar os recortes analisados pelo OCR:

```python
GERAR_DEBUG_CROPS = True
```

Os arquivos serão gerados em:

```text
debug/crops/
```

Desative novamente após concluir a calibração para evitar arquivos desnecessários.

---

## Membros, aliases e novos integrantes

A lista utilizada como fonte de validação do OCR está em:

```python
NOMES_VALIDOS = [...]
```

Ela também é usada para adicionar automaticamente como ausentes os membros que não apareceram nos screenshots.

### Adicionar um novo membro

Em `src/config.py`:

1. adicione o nome oficial em `NOMES_VALIDOS`;
2. adicione variações conhecidas em `ALIASES_MEMBROS`, quando necessário;
3. adicione correções recorrentes em `CORRECOES_OCR_NOMES` somente quando forem confiáveis;
4. execute o OCR;
5. revise o CSV tratado;
6. confirme o membro no JSON final;
7. teste Busca, Registro e Hall após a promoção.

Exemplo:

```python
NOMES_VALIDOS = [
    # ...
    "NovoMembro",
]

ALIASES_MEMBROS = {
    # ...
    "NovoMembro": ["Novo Membro", "Novo-Membro"],
}
```

### Remover um membro da lista ativa

Remover um membro de `NOMES_VALIDOS` afeta o JSON tratado da raid atual.

Não apague o histórico publicado do jogador sem evidência e sem seguir o guia de manutenção:

[`../../docs/manutencao/CHECKLIST_NOVA_RAID.md`](../../docs/manutencao/CHECKLIST_NOVA_RAID.md)

---

## Execução

O comando deve ser executado dentro de:

```text
ocr/guild-rank-ocr/
```

### Windows

```bash
python -m src.main
```

### Linux e macOS

```bash
python3 -m src.main
```

Caso nenhuma imagem seja encontrada, o programa exibirá:

```text
Nenhuma imagem encontrada na pasta images/
```

---

## Pipeline de processamento

O fluxo atual executa:

1. busca de imagens em `images/`;
2. leitura da resolução;
3. escala proporcional das regiões;
4. recorte de nome, frequência e dano;
5. geração de variantes em escala de cinza e OTSU;
6. OCR com configurações específicas por campo;
7. limpeza dos textos;
8. correção de nomes por aliases e RapidFuzz;
9. aplicação opcional das correções por imagem e linha;
10. validação inicial;
11. exportação bruta;
12. normalização dos registros;
13. remoção de ruídos fora da lista oficial;
14. consolidação de duplicados;
15. inclusão dos membros ausentes;
16. ordenação por dano;
17. exportação tratada;
18. geração do JSON da raid.

---

## Arquivos gerados

A execução produz três arquivos principais na pasta `output/`.

### 1. CSV bruto

```text
ocr_raw_YYYYMMDD_HHMMSS.csv
```

Contém a leitura inicial de cada linha.

Use para:

- auditar o que o OCR leu;
- comparar com o screenshot;
- identificar problemas nos recortes;
- confirmar se uma correção manual foi aplicada.

### 2. CSV tratado

```text
ocr_tratado_YYYYMMDD_HHMMSS.csv
```

Contém:

- nomes normalizados;
- aliases corrigidos;
- frequência;
- dano numérico;
- status;
- situação de participação;
- ausentes adicionados pela lista oficial.

### 3. JSON tratado da Raid

```text
raid_tratada_YYYYMMDD_HHMMSS.json
```

Contém:

- resumo da guilda;
- membros consolidados;
- duplicados detectados;
- registros normalizados;
- dano total;
- participantes;
- ausentes;
- quantidade para revisão.

Este é o arquivo usado como entrada no processo de promoção da raid.

---

## Campos e status

### Campos principais

```text
imagem_origem
linha
nome
frequencia
dano
status
status_participacao
```

### Status possíveis

| Status | Significado |
|---|---|
| vazio | registro sem alerta |
| `revisar` | leitura não confirmada automaticamente |
| `nome_corrigido` | nome convertido por alias ou similaridade |
| `linha_corrigida` | valores substituídos por correção confiável em `config.py` |
| `duplicado` | membro apareceu mais de uma vez |
| `dano_suspeito` | dano abaixo ou acima dos limites configurados |
| `frequencia_suspeita` | frequência fora do formato válido |
| `ausente` | membro oficial não localizado na raid |

Mais de um status pode aparecer separado por ponto e vírgula:

```text
nome_corrigido;frequencia_suspeita
```

### Situação de participação

O campo `status_participacao` pode apresentar:

```text
completo
participou_bem
baixa_participacao
quase_ausente
ausente
```

Esses estados pertencem à auditoria e à apresentação geral da raid. Eles não substituem as regras internas do Hall da Evolução.

---

## Correção de nomes

A correção segue esta ordem:

1. limpeza do texto;
2. correspondência exata com nome oficial;
3. correspondência exata com alias;
4. correção direta conhecida;
5. fuzzy matching com RapidFuzz;
6. marcação para revisão quando não houver confiança suficiente.

Os limiares atuais ficam em:

```text
src/utils/name_matcher.py
```

Evite reduzir os limiares sem testar, pois isso pode transformar um nome desconhecido no jogador errado.

---

## Revisão manual obrigatória

Após a execução:

1. abra o CSV bruto;
2. compare cada linha com os screenshots;
3. abra o CSV tratado;
4. filtre a coluna `status`;
5. revise registros com alertas;
6. confira nomes japoneses e caracteres especiais;
7. confirme danos com quantidade incomum de dígitos;
8. confira frequência;
9. confirme duplicados causados pela sobreposição entre screenshots;
10. revise a lista de ausentes;
11. abra o JSON tratado;
12. confirme o resumo final.

### Atenção a `linha_corrigida`

`linha_corrigida` significa que o registro foi substituído por uma correção declarada em `src/config.py`.

Ele não representa necessariamente erro pendente, mas exige que a correção pertença à raid atual.

---

## Promoção para o Portal Avalon

Execute esta etapa somente depois da revisão manual.

Partindo da raiz do projeto `raid_hall/`, use o JSON tratado mais recente:

```bash
python tools/promote_raid_history.py --new-current ocr/guild-rank-ocr/output/raid_tratada_YYYYMMDD_HHMMSS.json --history web/data/raids/raid_history.json --published-current web/data/raids/raid_atual.json
```

O script:

- move a raid publicada anteriormente para o histórico rotativo;
- publica a nova raid como raid atual;
- preserva a estrutura histórica do Portal.

Antes de executar, crie uma cópia de segurança dos JSONs envolvidos.

---

## Validação após a promoção

Ainda na raiz do projeto:

```bash
python tools/validate_raid_history.py --history web/data/raids/raid_history.json --current web/data/raids/raid_atual.json
```

Depois execute a suíte de manutenção indicada em:

[`../../docs/manutencao/GUIA_DE_MANUTENCAO.md`](../../docs/manutencao/GUIA_DE_MANUTENCAO.md)

Valide manualmente:

- Salão;
- Hall;
- Busca;
- Registro;
- ranking de dano;
- ausentes;
- médias;
- patentes;
- posições do Hall;
- canvas do Guardião.

---

## Commit e deploy

Após promoção e validação:

1. revise o diff do Git;
2. confirme que somente os arquivos esperados mudaram;
3. atualize a documentação da raid, quando necessário;
4. execute os testes;
5. faça o commit;
6. envie para o GitHub;
7. acompanhe o deploy no Cloudflare Pages;
8. valide o Portal publicado.

Fluxo completo:

[`../../docs/manutencao/FLUXO_GIT_DEPLOY.md`](../../docs/manutencao/FLUXO_GIT_DEPLOY.md)

---

## Solução de problemas

### Tesseract não encontrado

**Sintoma**

O programa falha ao iniciar o OCR.

**Verifique**

```bash
tesseract --version
```

**Correção**

- adicione o Tesseract ao `PATH`;
- configure `TESSERACT_CMD`;
- atualize `TESSERACT_CMD_WINDOWS` em `src/config.py`.

---

### Nenhuma imagem encontrada

**Sintoma**

```text
Nenhuma imagem encontrada na pasta images/
```

**Correção**

- confirme que o terminal está em `ocr/guild-rank-ocr/`;
- confira a pasta `images/`;
- use `.jpeg`, `.jpg` ou `.png`;
- confira maiúsculas e minúsculas da extensão em sistemas sensíveis a caso.

---

### Recortes desalinhados

**Sintoma**

Nome, frequência ou dano são lidos de outra região.

**Correção**

1. ative `GERAR_DEBUG_CROPS`;
2. execute novamente;
3. examine `debug/crops/`;
4. ajuste a calibração em `src/config.py`;
5. teste todas as linhas.

---

### Dados da raid anterior aparecem novamente

**Causa provável**

`CORRECOES_LINHAS_ATUAL` ainda contém valores da raid anterior.

**Correção**

```python
USAR_CORRECOES_LINHAS_ATUAL = False
```

ou atualize o dicionário antes de reprocessar.

---

### Nome conhecido aparece como `revisar`

**Correção**

- confirme o texto bruto;
- adicione alias confiável;
- revise `CORRECOES_OCR_NOMES`;
- evite criar correção genérica que possa afetar outro membro.

---

### Muitos nomes incorretos

**Verifique**

- resolução dos screenshots;
- posição dos recortes;
- idioma do Tesseract;
- nitidez da imagem;
- aliases;
- limiares do RapidFuzz.

Não diminua os limiares de forma agressiva.

---

### JSON final contém ausentes inesperados

**Causa provável**

- o membro não foi reconhecido;
- o nome não consta em `NOMES_VALIDOS`;
- o nome foi filtrado por não corresponder à lista oficial;
- screenshots incompletos.

Revise o CSV bruto, aliases e a lista oficial.

---

## Boas práticas

- mantenha os screenshots originais até concluir a auditoria;
- não publique o JSON sem revisar o CSV;
- não apague histórico para corrigir apenas a lista ativa;
- atualize aliases quando um membro mudar de nome;
- use correções por linha somente com evidência;
- não altere limites de validação sem teste;
- mantenha uma cópia de segurança antes da promoção;
- confirme o deploy publicado após cada atualização;
- não duplique coordenadas ou regras do OCR em documentos paralelos.

---

## Documentação relacionada

- [`../../docs/manutencao/INICIO_RAPIDO.md`](../../docs/manutencao/INICIO_RAPIDO.md)
- [`../../docs/manutencao/CHECKLIST_NOVA_RAID.md`](../../docs/manutencao/CHECKLIST_NOVA_RAID.md)
- [`../../docs/manutencao/GUIA_DE_MANUTENCAO.md`](../../docs/manutencao/GUIA_DE_MANUTENCAO.md)
- [`../../docs/manutencao/AREAS_SENSIVEIS.md`](../../docs/manutencao/AREAS_SENSIVEIS.md)
- [`../../docs/manutencao/SOLUCAO_DE_PROBLEMAS.md`](../../docs/manutencao/SOLUCAO_DE_PROBLEMAS.md)
- [`../../docs/manutencao/FLUXO_GIT_DEPLOY.md`](../../docs/manutencao/FLUXO_GIT_DEPLOY.md)
- [`../../docs/arquitetura/DADOS.md`](../../docs/arquitetura/DADOS.md)
- [`../../docs/regras/HISTORICO_DE_RAIDS.md`](../../docs/regras/HISTORICO_DE_RAIDS.md)

---

## Autoria

OCR desenvolvido originalmente por **José Olimpio de Melo Neto** e integrado ao fluxo técnico do Portal Avalon.

Este README documenta o funcionamento atual do subprojeto dentro da Maintenance Edition do Portal.
