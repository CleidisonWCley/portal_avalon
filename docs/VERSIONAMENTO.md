# Política de versionamento

O Portal Avalon utiliza versionamento incremental orientado ao impacto da mudança.

- **Vx.y:** funcionalidade nova, refatoração relevante ou alteração visual ampla;
- **Vx.y.z:** correção, blindagem, documentação ou refinamento menor sem mudança estrutural extensa;
- **próxima versão principal:** reservada para reestruturação ampla ou release final estável.

## Regras de entrega

1. Trabalhar sempre a partir do ZIP da última versão aprovada.
2. Preservar a versão anterior como backup.
3. Registrar alterações em `docs/CHANGELOG.md`.
4. Criar relatório detalhado em `docs/releases/`.
5. Salvar resultados em `docs/testes/`.
6. Salvar imagens em `docs/evidencias/<versão>/`.
7. Validar JavaScript, JSON, referências locais e cenários de regressão.
8. Nomear o pacote como `Portal_Avalon_Vx_y[_z].zip`.

## Estados de uma versão

- **Escopo:** requisitos definidos, ainda não implementados;
- **Em desenvolvimento:** alterações em execução;
- **Validada:** testes aprovados;
- **Entregue:** ZIP e relatório disponibilizados.

## Status final do Portal

- **V7.6:** versão funcional final para os membros.
- **V7.6.1:** Maintenance Edition, fonte técnica para manutenção sem mudança pública.

Uma futura mudança de regra, visual ou recurso deverá sair da linha de manutenção e receber nova versão funcional.
