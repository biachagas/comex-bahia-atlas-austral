# Checklist final – Atlas Austral

## A. O que já foi testado automaticamente (01/11/2026)

Testes feitos no Chromium, com o site servido numa subpasta (`/comex-bahia-atlas-austral/`), igual ao GitHub Pages:

- [x] As 4 páginas carregam em português e em inglês, em 1440 px (desktop), 900 px (tablet) e 390 px (celular), sem erros no console. Não foi possível testar os tiles CARTO e EOX, porque o ambiente de teste não tem acesso a eles.
- [x] Página inicial carrega em cerca de 1,2–2,5 s no servidor local.
- [x] Mapa do Território com os 417 municípios; a dica mostra o nome mesmo sem valor ("sem exportação no período").
- [x] Busca de município, clique para fixar, troca de fluxo (incluindo Saldo), troca de ano e link com estado (`#municipios?ano=…&fluxo=…&mun=…`).
- [x] Segmentos: destaque de grupo esmaece os outros municípios; dica com os 3 principais grupos.
- [x] Escoamento: satélite, camadas, Sankey no desktop e barras empilhadas no celular.
- [x] Versão EN sem textos em português na interface (só nomes próprios).
- [x] Tamanho do site: cerca de 5,8 MB; maior arquivo: 1,3 MB (limites: 15 MB e 25 MB).
- [x] Conferência de números reexecutada pelo script (ver `CONFERENCIA_NUMEROS.md`).

### Menu de acessibilidade (testado em 01/11/2026)
- 264 verificações automáticas: 11 combinações de opções × PT e EN × 4 páginas × larguras de 1440, 900 e 390 px. Resultado: botão visível, página carregada, sem rolagem lateral e sem erros no console.
- Teclado: Tab chega ao botão (antes do PT | EN); Enter abre e o foco vai para o título; ordem de Tab: Fechar → A− → A+ → 7 opções → Restaurar; Espaço liga/desliga (`aria-pressed`); Esc fecha e devolve o foco; "Pular para o conteúdo" funciona com o menu aberto.
- Persistência: as escolhas continuam após recarregar; "Restaurar padrão" apaga a escolha guardada. Com o armazenamento bloqueado, o menu funciona na página sem erros.
- Convivência: troca PT | EN com o menu aberto mantém filtros do link; Modo apresentação + A+ = 118% × 112,5%; "Pausar animações" para o Play e esconde o botão.
- Sistema: movimento reduzido liga "Pausar animações"; contraste maior liga "Alto contraste"; modo escuro do sistema **não** liga o modo escuro.
- Contraste (WCAG, mínimo 4,5:1): varredura automática de todo texto visível fora dos mapas e gráficos nas 4 páginas, nos modos escuro, alto contraste e escuro + contraste: nenhum texto abaixo do mínimo.
- Não testado aqui: leitores de tela reais (NVDA, VoiceOver), Safari e Firefox, e o mapa de fundo (bloqueado no ambiente de teste).

## B. O que você precisa testar depois de publicar (no endereço real)

1. [ ] Abrir https://biachagas.github.io/comex-bahia-atlas-austral/ e ver o **mapa de fundo claro** (ruas e nomes de cidades em cinza claro) atrás dos municípios. Se aparecer uma marca d'água "API key required", avise.
2. [ ] Na página **Escoamento**, clicar em **Satélite** e ver a imagem de satélite. Clicar em **Mapa claro** para voltar.
3. [ ] Conferir se a atribuição aparece no canto inferior direito do mapa (OpenStreetMap/CARTO ou Sentinel-2/EOX).
4. [ ] Testar no **celular**: menu de abas rola para o lado, a legenda abre e fecha no botão ☰, e o Sankey vira barras.
5. [ ] Clicar em **PT | EN** em cada página e voltar.
6. [ ] Copiar o link de uma página filtrada (ex.: Saldo 2026), abrir numa aba anônima e ver se abre igual.
7. [ ] Botão **Baixar CSV** nas tabelas do Território e do Escoamento: abrir no Excel e conferir acentos e números.
8. [ ] **Modo apresentação** no computador do evento: ver se a tela cheia e as fontes maiores ficam legíveis no projetor.
9. [ ] Botões de ORCID, Lattes e LinkedIn nos Créditos abrem as páginas certas.
10. [ ] Testar **sem internet** (desligar o Wi-Fi depois de abrir o site uma vez): os mapas devem continuar com os contornos e um aviso discreto.
11. [ ] **Menu de acessibilidade** (ícone ao lado do PT | EN): abrir; clicar em **A+** duas vezes e ver o texto crescer; ligar **Modo escuro** e **Alto contraste**; recarregar a página (F5) e ver que continuam ligados; abrir em EN e ver o menu em inglês; clicar em **Restaurar padrão**.
12. [ ] Só com o teclado: Tab até o ícone de acessibilidade, Enter para abrir, Tab pelas opções, Espaço para ligar, **Esc** para fechar (o foco volta para o ícone).
13. [ ] No celular: o ícone aparece no cabeçalho e o painel ocupa a tela toda.

## C. Conferência de números para validar contra os arquivos brutos

| O que conferir | Valor esperado |
|---|---|
| Exportação Bahia 2025 (Território) | US$ 11.463.334.640 |
| Importação Bahia 2025 (Território) | US$ 9.311.068.239 |
| Saldo 2025 (Território) | US$ 2.152.266.401 |
| Exportação 2026 jan–set × 2025 jan–set | +26,1% (10.445.322.235 × 8.286.351.294) |
| Municípios com valor em 2025 | EXP 151 · IMP 154 |
| Exportação 2025 (Escoamento) | US$ 11.629.026.070 (difere da base Território, como esperado) |
| Importação: Território = Escoamento | igual em todos os anos |
| Maior URF 2025 | ALF Salvador: EXP 6.048.404.399 · IMP 7.366.210.737 |
| Soma dos grupos e dos segmentos = total do ano | sim, todos os anos e fluxos |
| Soma das vias = soma das URFs | sim |
| Sankey: entra = sai em cada via | sim |
| Planilha aba 4 = EXP marítima do fato_via_urf (2023–2025) | sim, em valor e peso |
