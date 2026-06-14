# Raid Hall OCR - Versão 2.0

Esta versão foi blindada para o projeto **Avalon Raid Hall**.

## O que mudou

- OCR com coordenadas responsivas baseado na resolução-base `1599x999`.
- Configuração oficial de membros da Avalon em `src/config.py`.
- Correções por aliases e leituras problemáticas, como `wa -> Lux`, `cr -> Ger`, `Zz -> kia`.
- Correções por imagem/linha para a raid atual, úteis quando o OCR falha em nomes japoneses ou linhas difíceis.
- Pós-processamento com auditoria:
  - remove duplicados;
  - adiciona membros ausentes;
  - calcula vagas estimadas;
  - calcula participantes;
  - calcula dano total da guilda;
  - gera CSV tratado e JSON final.
- Exportação dupla:
  - `ocr_raw_YYYYMMDD_HHMMSS.csv`: leitura bruta.
  - `ocr_tratado_YYYYMMDD_HHMMSS.csv`: dados consolidados para análise.
  - `raid_tratada_YYYYMMDD_HHMMSS.json`: base ideal para alimentar o site web.

## Como rodar

No terminal dentro de `ocr/guild-rank-ocr`:

```powershell
.venv\Scripts\activate
python -m src.main
```

Se estiver em outro computador e não tiver `.venv`, recrie:

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m src.main
```

## Importante

A pasta `.venv` não deve ir para o GitHub. Ela foi removida deste pacote 2.0 para economizar espaço.

## Como usar em raids futuras

No arquivo `src/config.py` existe a variável:

```python
USAR_CORRECOES_LINHAS_ATUAL = True
```

Para a raid atual, ela deixa os dados muito confiáveis porque usa correções por print/linha.

Para futuras raids, você tem duas opções:

1. Atualizar `CORRECOES_LINHAS_ATUAL` com os novos prints.
2. Desativar com `False` e deixar o OCR tentar ler sozinho.

A recomendação prática para a Avalon é manter a correção por linha como uma camada de auditoria assistida, porque a raid acontece só 2 vezes por mês e isso aumenta muito a confiabilidade do resultado.

## Saída atual validada

Na execução de teste da versão 2.0:

- Membros cadastrados: 28
- Vagas estimadas: 2
- Participantes: 27
- Ausentes: 1
- Registros para revisar: 0
- Dano total da guilda: 114.017.105.299

O membro ausente detectado pelo cadastro oficial foi `Carlinhozz`.
