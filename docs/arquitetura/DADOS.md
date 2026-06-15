# Dados e fontes da verdade

| Informação | Fonte publicada |
|---|---|
| raid atual | `web/data/raids/raid_atual.json` |
| histórico e regras configuráveis | `web/data/raids/raid_history.json` |
| overrides comprovados | `web/data/raids/raid_manual_overrides.json` |
| raid anterior compatível | `web/data/raids/raid_anterior.json` |
| caminhos usados pelo app | `web/assets/js/data.js` |
| membros oficiais para OCR | `ocr/guild-rank-ocr/src/config.py` |
| aliases OCR | `ALIASES_MEMBROS` no mesmo arquivo |
| insígnias | `web/data/insignias.json` |
| galeria | `web/data/gallery/eventos.json` |
| modos/mapas da Liga | `web/data/arenas.json` |

## Schemas resumidos

### `raid_atual.json`

- `resumo`: totais, data, participantes, ausentes e dano da guilda;
- `membros`: nick, frequência, dano e status;
- `duplicados` e `raw_normalizado`: auditoria do OCR.

### `raid_history.json`

- `settings`: políticas de histórico e posições;
- `seed`: origem e observações da carga inicial;
- `raids`: raid atual e anteriores normalizadas.

## Dados da Liga em tempo real

A Liga utiliza duas camadas de persistência:

localStorage
└── rascunho local e contingência

Cloud Firestore
└── versão oficialmente publicada e compartilhada

### Fonte oficial por estado

| Situação                    | Fonte oficial                             |
| --------------------------- | ----------------------------------------- |
| Liga ainda não publicada    | `localStorage` do organizador             |
| Liga publicada              | Cloud Firestore                           |
| Participante acompanhando   | Cloud Firestore                           |
| Falha temporária de conexão | `localStorage` preserva alterações locais |
| Liga encerrada              | documento remoto com `publicada: false`   |

### Chave local

portal_avalon_liga_v531


O estado local contém, entre outros:

modoId
participantes
ordem
teamMode
manualTeams
bracket
phaseIndex
battleStarted
savedAt


### Documento remoto

Durante o desenvolvimento:

ligas/dev_local

Na produção:

ligas/liga_atual

Estrutura principal:

```javascript
{
  nome: "Liga Avalon",
  publicada: true,
  status: "em_andamento",
  schemaVersion: 1,
  revision: 1,
  state: {
    modoId: "",
    participantes: [],
    ordem: [],
    teamMode: "auto",
    manualTeams: [],
    bracket: {},
    phaseIndex: 0,
    battleStarted: true
  },
  createdAt: timestamp,
  publishedAt: timestamp,
  updatedAt: timestamp,
  updatedByUid: "UID"
}

### Estados remotos

em_andamento
finalizada
encerrada

`status: "finalizada"` indica que o pódio foi concluído, mas a Liga ainda pode continuar visível.

A Liga deixa de ser apresentada aos participantes somente quando:

javascript
publicada: false

### Dados proibidos na coleção `ligas`

Não armazenar:

* senhas;
* tokens;
* e-mails administrativos;
* chaves privadas;
* arquivos de Service Account;
* dados pessoais desnecessários.

A coleção deve conter somente informações relacionadas ao torneio.

O campo `version` do histórico representa o schema/dataset, não necessariamente a versão visual do Portal.

## Fonte primária versus derivado

Screenshots são evidência primária; o JSON tratado é derivado revisado; o histórico publicado é a fonte operacional do site. Nunca edite somente um derivado sem registrar a origem da correção.
