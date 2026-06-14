# Validação do pacote — Portal Avalon V7.6.1

## Escopo

Validação da Maintenance Edition com comportamento funcional congelado na V7.6.

## Verificações

- suíte regressiva V7.3.1, V7.4, V7.5 e V7.6 aprovada;
- documentação obrigatória presente;
- links Markdown locais válidos;
- JSON e JavaScript válidos;
- referências HTML locais existentes;
- 105 arquivos do núcleo funcional conferidos por SHA-256;
- histórico com zero erros estruturais;
- testes visuais V7.6 aprovados;
- utilitário de promoção sem downgrade de schema;
- execução repetível por `tools/run_tests_v7_6_1.sh`.

## Comando

```bash
bash tools/run_tests_v7_6_1.sh
```

## Resultado

Aprovado para distribuição como edição técnica final de manutenção.
