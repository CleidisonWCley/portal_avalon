# Dependências e execução

## Navegador

Aplicação estática moderna. Requer `fetch`, Canvas, localStorage e APIs DOM usuais.

## Recursos externos

- Google Fonts: Cinzel e Inter;
- Material Symbols;
- API da aba Raid: URL configurada em `raid.js`;
- imagens/dados complementares do `gtales.top` usados pela Raid.

Se fontes/ícones externos falharem, o conteúdo ainda deve permanecer legível com fallbacks; a consulta Raid pode depender da disponibilidade externa.

## OCR

- Python 3;
- Tesseract OCR;
- OpenCV;
- pytesseract;
- RapidFuzz;
- NumPy.

Instale por `requirements.txt` dentro do OCR.

## Testes visuais

Os scripts Python de browser usam Playwright. É necessário instalar a biblioteca e o Chromium compatível no ambiente de teste.

## Hospedagem

O Portal não exige build. Publique `web/`. Caminhos são relativos e sensíveis a maiúsculas/minúsculas.
