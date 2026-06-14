# Portal Avalon V4.3.1 — Correções de Pódio e Mascotes

Atualização de manutenção aplicada sobre a V4.3.

## Correções aplicadas

- Cards individuais de equipes agora usam títulos no plural:
  - Campeões
  - Vice-campeões
  - Guerreiros de Bronze
- Layout do canvas dos cards de equipe reorganizado para evitar cortes nos nomes dos membros.
- Card individual de equipe agora segue o padrão:
  - nome completo da Liga;
  - conquista;
  - número/nome da equipe;
  - troféu Avalon;
  - lista vertical de membros.
- Botão **Voltar ao topo** permanece visível mesmo após limpar a Liga.
- Botão **Limpar Liga** continua disponível quando há pódio final.
- Correção de CSS específico que impedia o aumento real dos mascotes do `registro.html`.
- Ajuste de responsividade dos botões finais do pódio.

## Arquivos alterados

```text
web/assets/js/liga.js
web/assets/css/styles.css
READM_AVALON_VF_1.md
README_V4_3_1_CORRECOES.md
```

## Observação

A pasta `ocr/` foi mantida sem alterações.
