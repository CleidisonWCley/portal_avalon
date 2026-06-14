# Componentes oficiais

## Cards e molduras

- `.medieval-card`: base de card;
- `.gold-frame`, `.blue-frame`, `.bronze-frame`: modificadores de borda;
- `.page-title-card`: card de título;
- `.solo-title-card`: dimensão/alinhamento de título isolado.

## Cabeçalho com mascotes

```html
<div class="page-hero-mascots pagina-hero-mascots">
  <div class="page-hero-mascot left">...</div>
  <div class="page-title-card medieval-card gold-frame solo-title-card">...</div>
  <div class="page-hero-mascot right">...</div>
</div>
```

A plataforma luminosa é criada apenas por `.page-hero-mascots::after`. Modificadores de página não devem recriar o piso completo.

## Voltar ao topo

```html
<button class="site-back-top hidden" type="button">
  <span class="material-symbols-outlined">arrow_upward</span>
  <span>Voltar ao topo</span>
</button>
```

Requer `ui.js`.

## Feedback central

Família:

- `.action-feedback-overlay`;
- `.action-feedback-card`;
- `.action-feedback-icon`;
- `.action-feedback-content`;
- `.action-feedback-actions`.

Use `AvalonUI.showActionFeedback()`. Não recrie overlays específicos de página.

## Status inline da Raid

`raid-status-card` e `raid-state-card` permanecem separados porque representam informação contextual/persistente, não confirmação central.

## Tabelas

`.table-wrap` e tabela base são compartilhados. Registro adiciona `.battle-table`, colunas sticky e classes de ausente por necessidade funcional.
