# Portal Avalon — Web v3.2

Esta versão adiciona a Galeria de Eventos, padroniza os títulos das páginas e amplia o sistema de insígnias para todos os membros ranqueados.

## Como testar

Abra a pasta `web/` no VS Code e use Live Server no `index.html`, ou rode:

```powershell
cd web
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

## Principais novidades

- Galeria de Eventos com filtro por ano.
- Cards com título, tipo, ano, descrição, visualizar e baixar.
- Modal/lightbox para visualização em tela cheia.
- Títulos das páginas no padrão premium com card medieval.
- Insígnias expandidas:
  - Top 1: Desafiante de Avalon
  - Top 2: Sentinela de Prata
  - Top 3: Guardião de Bronze
  - Top 4–10: Vigia do Horizonte
  - Top 11–20: Cavaleiro Ascendente
  - Top 21–30: Juramentado de Avalon
- Registro da Batalha permanece sem insígnias para manter foco operacional.
- Preparação conceitual para futura Chave de Avalon: `AvaloNHALL` em desenvolvimento, ainda desativada.

## Galeria

Estrutura usada:

```text
web/assets/img/gallery/eventos/2022/
web/assets/img/gallery/eventos/2023/
web/assets/img/gallery/eventos/2024/
web/assets/img/gallery/eventos/2025/
web/assets/img/gallery/eventos/2026/
```

Os dados ficam em:

```text
web/data/gallery/eventos.json
```

Cada item possui `titulo`, `ano`, `tipo`, `descricao`, `imagem` e `download`.
