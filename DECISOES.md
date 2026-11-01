# Decisões do projeto – Atlas Austral

Registro das escolhas feitas na construção do site (atualizado a cada etapa).

## Rodada única de perguntas (01/11/2026)

| # | Tema | Decisão |
|---|---|---|
| 1 | Segmentos | `dim_produto.csv` chegou com a coluna `segmento` vazia e sem coluna de grupo. A Bianca vai reexportar do Power BI. Se não houver classificação, será montada uma tabela editável SH2 → 7 grupos para revisão. "Demais produtos" não existe nos arquivos: o que ficar sem grupo vai para **Outros**. |
| 2 | Mapa de fundo | Claro: **CARTO Positron** (`light_all`), com chave gratuita restrita ao domínio `biachagas.github.io`. A CARTO não aceita `localhost` na mesma chave; no computador local o mapa aparece só com contornos (mesmo comportamento offline). Satélite (Escoamento): **EOX Sentinel-2 cloudless**, sem chave, uso não comercial com atribuição. Esri não é usado (exigiria conta ArcGIS). |
| 3 | Logo CAPES | PNG com fundo transparente gerado a partir do PDF vetorial oficial do pacote, sem recolorir nem distorcer; exibição mínima de 380×70 px. Atlas Austral: kit em português (`horizontal-fundo-escuro.svg`). |
| 4 | Sankey – porto na BA × fora | Usa só `uf_local` do `dim_urf`: "Na Bahia", "Fora da Bahia", "UF não informada". A UF não é deduzida pelo nome. |
| 5 | URF 9999999 | Aparece em tabelas/rankings como "URF não informada"; fora do mapa, citada em nota. |
| 6 | fato_pais_ano | Usado no ranking de países da página Território (mesma base: domicílio fiscal; totais conferem 100%). |
| 7 | Nomes de municípios | Nomes da malha IBGE 2025 (Araçás, Iuiu, Muquém do São Francisco, Santa Terezinha). |
| 8 | Enquadramento do Escoamento | Abre mostrando o Brasil (para ver URFs fora da BA) com botão "Aproximar na Bahia". |
| 9 | Aeródromos | Aeroporto internacional (Salvador) sempre visível; 231 aeródromos nacionais em camada desligada por padrão; 62 helipontos excluídos. |
| 10 | Publicação | Entrega em .zip + README com passo a passo pelo navegador. |

## Decisões técnicas (Etapa 1)

- **Bibliotecas:** o registro do npm estava bloqueado no ambiente de construção, então o Leaflet não foi usado. Os mapas foram feitos só com **d3 7.9.0** (projeção Web Mercator, zoom e camada de tiles próprias). O **d3-sankey 0.12.3** já está na pasta para a Etapa 2. Tudo local, sem CDN.
- **Malha municipal:** simplificada por `scripts/simplificar_malhas.py` (Douglas-Peucker por trecho de divisa, tolerância 0,0012°, 4 casas decimais). Mantém os 417 municípios e reaproveita o mesmo trecho simplificado nos dois lados de uma divisa compartilhada. 2,6 MB → 1,3 MB (≈370 KB trafegados com a compressão do GitHub Pages).
- **Ano padrão:** último ano fechado (2025). Ano parcial detectado automaticamente pelo último mês disponível: "2026 (parcial, jan–set)".
- **Variação %:** anos fechados = ano inteiro × ano anterior inteiro; ano parcial = mesmos meses × mesmos meses do ano anterior. Primeiro ano (1997) sem variação. Município sem valor no ano-base: variação "—".
- **Municípios "com valor":** valor FOB > 0 no ano e fluxo. As 429 linhas com valor 0 (só peso) não contam.
- **Classes do mapa:** 5 quantis entre os municípios com valor (nº igual de municípios por classe). Saldo: 2 classes de cada lado, com corte na mediana dos superávits e dos déficits; centro = saldo zero.
- **Cartões em modo Saldo:** saldo do ano; variação do saldo **em US$** (não em %, porque o % de um saldo que troca de sinal engana); nº de municípios com superávit e déficit; participação dos 10 maiores superávits no total dos superávits.
- **Concentração e países em modo Saldo:** não exibidos (mensagem pede para escolher um fluxo), para não combinar fluxos.
- **Série histórica:** linha só até o último ano fechado; o ano parcial aparece como ponto vazado, porque não é comparável a um ano inteiro.
- **Ranking:** 15 maiores + "Demais municípios" (soma do mesmo ano e fluxo). Em Saldo: 15 maiores em módulo.
- **Tabela:** só municípios com comércio no ano (sem linha Total). CSV com separador `;` e acentos (UTF-8 com BOM), para abrir direto no Excel.
- **Valores:** US$ FOB sem casas decimais; cartões em "US$ … mi" sem decimais; % com 1 casa; eixos em mil/mi/bi.
- **Dados brutos fora do site:** os CSVs (≈43 MB) não vão para o repositório. O script lê de uma pasta indicada por `--dados`.

## Decisões da Etapa 2 (Segmentos e Escoamento)

- **10 grupos** (pedido da Bianca, no lugar dos 7): Grãos, oleaginosas e fibras · Agro tropical e alimentos · Petróleo e combustíveis · Química e petroquímica · Fertilizantes · Celulose e papel · Minerais e metais (inclui ouro) · Máquinas, veículos e borracha · Couro, têxteis e calçados · Outros. Os 7 tons do briefing foram mantidos; 3 cores novas: Agro tropical #E3B505, Fertilizantes #7A8B2E, Couro/têxteis/calçados #7B5EA7. A classificação fica em `scripts/grupos.csv` (editável).
- **Regra do grupo:** pelo segmento do `dim_produto`; quando o segmento é "Demais produtos", pelo capítulo SH2 (regra "SH4 e, na falta, SH2"). Motivo: "Demais produtos" escondia fertilizantes (10,5% da importação de 2025) e parte dos combustíveis (8,1%). Com isso, "Outros" ficou com 0,1% da exportação e 0,4% da importação em 2025.
- **Ranking de segmentos:** usa os 30 segmentos do `dim_produto` como vieram (inclusive "Demais produtos", em cinza, porque reúne vários grupos). 15 maiores + "Demais segmentos".
- **Classificação de casos discutíveis:** Couros (cap. 41) → Couro, têxteis e calçados; Consumo de bordo (SH 9998) → Petróleo e combustíveis; Hidrocarbonetos e Éteres e álcoois (cap. 29) → Química e petroquímica; Ouro e Metais preciosos → Minerais e metais.
- **Mapa de Segmentos:** cor do grupo dominante; ao escolher um grupo, os municípios em que ele não é dominante ficam esmaecidos. Dica: município, grupo dominante, valor e participação dos 3 principais grupos.
- **Escoamento – círculos:** URFs com a mesma coordenada (ex.: códigos diferentes do Porto de Salvador) viram um só círculo (soma do mesmo ano e fluxo), com a lista das URFs na dica. Área proporcional ao valor (máx. 34 px no ano).
- **URFs sem coordenada:** nunca posicionadas; listadas em nota recolhível abaixo do mapa, e mantidas nos gráficos e na tabela. 6 URFs com coordenada "inferido-nome" aparecem com asterisco na dica e "sim (inferida)" na tabela.
- **Sankey:** 6 maiores grupos + "Demais grupos" (o briefing pedia 6–7 grupos), todas as vias com valor, 8 maiores URFs + "Demais URFs". Cor das URFs pelo `uf_local`: na Bahia / fora da Bahia / UF não informada (sem dedução pelo nome). Em telas com menos de 700 px, vira barras empilhadas Grupo × Via.
- **Cores das vias** (barras, série e versão celular): a via de maior valor no tom mais escuro do fluxo, a 2ª no tom principal, a 3ª no tom claro; demais em cinza. Laranja = EXP e verde-água = IMP continuam valendo.
- **Série por via:** 3 vias de maior valor no período + "Demais vias" (linha tracejada).
- **Camadas:** ligadas por padrão: limites estaduais, contorno da BA, rodovias federais, ferrovias, portos ANTAQ, aeroporto internacional. Desligadas: Amazônia Azul, rodovias estaduais, dutovias, portos SNV, aeródromos nacionais (231). Helipontos (62) excluídos.
- **Satélite:** EOX Sentinel-2 cloudless 2023 (`tiles.maps.eox.at`, camada `s2cloudless-2023_3857`), sem chave, CC BY-NC-SA 4.0 (uso não comercial com atribuição). No modo satélite, contornos e linhas ficam brancos/claros e mais grossos.
- **Malhas nacionais:** BR_UF_2025 e Amazônia Azul 2024 lidas do shapefile por leitor próprio (sem bibliotecas externas), simplificadas e sem ilhotas menores que ~0,002 grau² (fica só o necessário para a escala do Brasil).
- **Cartão "Por URFs na Bahia":** participação do valor despachado em URFs com `uf_local = BA` (mesmo ano e fluxo, só base Escoamento).

## Decisões da Etapa 3 (Metodologia, Créditos, publicação e idioma)

- **Planilha – aba 4:** usada só para um bloco no Escoamento ("Exportação marítima: porto na Bahia × porto fora da Bahia", 2023–2025, cada ano separado, valor e peso). Antes de publicar, o script confere os totais com a exportação **marítima** do `fato_via_urf`: coincidem em valor e peso nos 3 anos. Se um dia não coincidirem, o bloco não é gerado. A separação local × fora usa a classificação da própria planilha (5 URFs sem UF no `dim_urf` aparecem lá como fora da Bahia; somam menos de 0,2% do valor). **TEU estimado não é publicado** (decisão da autora: o fator 14,5 t/TEU foi aplicado inclusive a granéis).
- **Planilha – aba 3:** dica ao passar o mouse nas rodovias com extensão, pista, avaliação CNT, corredor e **somente os sinistros, mortos e feridos de 2025**. O acumulado 2010–2025 não é usado, para não somar anos. Rodovias estaduais aparecem sem sinistros (a PRF só cobre as federais). **Aba 5 não é usada.**
- **Logos CAPES:** convertidas do PDF vetorial oficial para SVG, removendo só o retângulo de fundo e as margens vazias. Desenho e cores originais, proporção 775×151, exibidas com 380 px de largura (74 px de altura). Demais logos: recortadas as margens transparentes e reduzidas para 640 px de largura, sem alteração de cor.
- **Faixa de logos (revisada em 01/11):** uma única faixa navy compacta no fim de todas as páginas, com PPDRU, UNIFACS, Ânima e uma só CAPES (branca). A logo do PPDRU foi convertida para branco com fundo transparente, a pedido da autora. A CAPES segue com 380 × 74 px: o Manual de Identidade Visual da CAPES (p. 7, "Redução da marca") fixa o mínimo de 380 × 70 px para a versão horizontal (231 × 214 px na vertical, que ocuparia mais espaço). Para equilibrar a faixa, as outras logos foram ampliadas (PPDRU 200 px, UNIFACS 230 px, Ânima 92 px), com espaçamento largo, que também respeita a área de não interferência da CAPES. Em telas de celular com menos de 380 px úteis, a CAPES ocupa a largura disponível.
- **Créditos:** "Elaboração: tratamento dos dados, cartografia e desenvolvimento do painel" (Bianca) e "Idealização e orientação" (Prof. Henrique), com botões ORCID, Lattes e LinkedIn. Bolsa registrada como **"Bolsista CAPES – PROSUP"** (Programa de Suporte à Pós-Graduação de Instituições de Ensino Particulares), conforme declaração da CAPES apresentada pela autora; nenhum dado pessoal do documento foi publicado. Incluída a frase de agradecimento padrão da CAPES ("Código de Financiamento 001") e uma sugestão de citação. Filiação do orientador informada pela autora: professor do PPDRU e do PPG em Administração da UNIFACS, integrante do grupo Instituições Políticas e Políticas Públicas (CRH). **Pendente:** crédito ao autor da planilha de conectividade (dados a confirmar pela autora).
- **Idioma PT | EN:** tradução embutida (sem Google Tradutor, sem cookies, funciona sem internet), guardada no link (`?lang=en`). Traduzidos: interface, gráficos, dicas, rodapés, grupos, segmentos, vias, países dos rankings e a página Metodologia. Mantidos em português: nomes de municípios e de URFs (nomes próprios). Nomes dos produtos SH4 em inglês: oficiais do Comex Stat (`NCM_SH.csv`, coluna `NO_SH4_ING`), conferidos com o `dim_produto` (1.274 de 1.274 códigos; nomes em português idênticos). Números em formato inglês (11,463; mn/bn).
- **Publicação:** envio direto ao repositório pelo assistente (autorizado pela autora); o README ensina o envio manual pelo navegador em 4 pacotes de menos de 100 arquivos cada, para as próximas atualizações.
- **`.nojekyll`:** incluído para o GitHub Pages servir os arquivos como estão, sem processamento.

## Revisão da autora (01/11/2026, tarde)

- **Aba "Território" renomeada para "Municípios"** (EN: "Municipalities"). O endereço interno continua `#territorio`, para não quebrar links já compartilhados. Nos documentos técnicos, "base Território" continua designando os dados por domicílio fiscal.
- **Ranking de países:** 25 maiores + "Demais países" (antes 15). Com 25, "Demais países" fica abaixo de 10% em todos os anos testados (com 15, ficava entre 13% e 19%).
- **Camada "Portos (SNV)" removida** do Escoamento: duplicava em parte a camada da ANTAQ, que é o cadastro oficial de portos e terminais (inclui os terminais de uso privado).
- **Planilha de conectividade:** creditada à **Usuport** (disponibilizada em 30/10/2026), na Metodologia, nas fontes dos blocos e nos Créditos ("Dados complementares"). Autor pessoa física: pendente.
- **Sankey:** explicação "O que é este gráfico?" diretamente acima do diagrama e na Metodologia.
- **Concentração:** frase de leitura acima da curva, calculada para o ano e fluxo (participação do maior município, dos 10 maiores e quantos municípios somam 90%).
- **Segmentos:** legenda das cores na composição por grupo; lista suspensa "Ver todos os segmentos por grupo", com valor e % do grupo no ano e fluxo escolhidos.
- **Como citar:** lista suspensa com ABNT (NBR 6023), APA (7ª ed.) e ISO 690, com botão para copiar. A data de acesso é a do dia da consulta.
- **Tratamento:** registrado como "Power Query do Power BI". Extração dos dados: outubro de 2026 (confirmado).
- **Glossário:** mantido na página Metodologia (o público do evento pode não conhecer FOB, SH, URF), além do DICIONARIO_DADOS.md no repositório.

- **Declaração de uso de IA** (01/11/2026): incluída na seção 9 da Metodologia (PT e EN) e no README, com a redação aprovada pela autora ("sob orientação, revisão e permissões da autora").
- **Endereço da página Municípios** (01/11/2026): passa a ser `#municipios`; links antigos com `#territorio` são redirecionados automaticamente.
- **Tradução das dicas das rodovias** (01/11/2026): tipos de pista, avaliações CNT e as 57 descrições de corredor da aba 3 traduzidas para o inglês no dicionário (`assets/js/i18n-en.js`), com a nota "Descriptions translated from Portuguese" na versão EN; tradução feita com apoio de IA, sujeita à revisão da autora. Nomes de lugares, empresas e siglas mantidos.
- **Downloads na página Segmentos** (01/11/2026): dois botões CSV para o ano e o fluxo escolhidos: (1) segmentos por grupo, com valor, % do total e % do grupo (a parte "Demais produtos" aparece separada por grupo, classificada pelo capítulo SH2; a soma bate com o total do ano); (2) municípios com valor, grupo dominante e os 3 principais grupos com %. Cabeçalhos em PT ou EN conforme o idioma. Produtos SH4 por município não incluídos (exigiria arquivos muito maiores; o detalhe está nos CSVs do Comex Stat).
- **CSV por idioma:** em PT, separador ";" e decimal ","; em EN, separador "," e decimal "." (padrão do Excel em cada idioma). Vale para todos os downloads do site.
