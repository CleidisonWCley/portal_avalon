# Inventário final de redundâncias — V7.6.1

## Mantidas intencionalmente

- cabeçalho e rodapé repetidos por página: simplicidade de site estático sem build;
- `$`, `$$`, `formatNumber`, `loadJson` e animações locais: diferenças e risco de regressão não justificam unificação na edição congelada;
- `raid-status-card`, `raid-state-card` e feedback central: responsabilidades distintas;
- testes e releases históricos: evidência de regressão, não lixo;
- blocos CSS históricos ainda vencedores em cascata: documentados para futura refatoração funcional.

## Corrigida

- `promote_raid_history.py` forçava a versão `7.2`; a promoção agora preserva a versão existente do schema.

## Candidatas futuras

- reorganizar `styles.css` por responsabilidade em branch própria;
- centralizar utilitários somente com testes equivalentes;
- adicionar template/build opcional para header/footer, sem tornar build obrigatório;
- extrair schemas JSON formais.

## Decisão

Nenhuma dessas candidatas bloqueia manutenção ou publicação. A estabilidade da V7.6 teve prioridade sobre redução de linhas.
