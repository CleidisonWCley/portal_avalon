# Portal Avalon v3.3 — Liga Avalon, Ícones e Coerência Visual

Esta versão adiciona a aba **Liga**, melhora a navegação com ícones, troca a área visual de **Oráculo** para **Buscar Ficha**, renomeia a faixa Top 21–30 para **Defensores de Avalon** e remove textos técnicos visíveis do portal.

## Principais mudanças

- Nova página: `web/pages/liga.html`
- Novo script: `web/assets/js/liga.js`
- Novo banco de mapas: `web/data/arenas.json`
- Estrutura inicial de torneios: `web/data/torneios.json`
- Menu com ícones Material Symbols
- Menu atualizado: Salão, Hall, Buscar, Registro, Galeria, Liga
- Footer sem menções técnicas a OCR/JSON
- Patente Top 21–30 exibida como Defensor/Defensores de Avalon

## Liga Avalon

A Liga permite:

- escolher modo PvP;
- selecionar membros da Avalon;
- adicionar convidados especiais;
- sortear participantes;
- gerar chaves automaticamente;
- sortear mapas por confronto;
- marcar vencedores manualmente;
- gerar disputa de bronze quando aplicável;
- exibir pódio final;
- copiar resultado para envio no grupo;
- manter progresso no navegador com localStorage.

## Teste local

Abra a pasta `web` no VS Code e use Live Server, ou rode:

```powershell
cd web
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```
