# Dicionário de dados – Atlas Austral

Todas as **chaves são texto**, com zeros à esquerda: SH4 = 4 dígitos, SH2 = 2, `cod_via` = 2, `cod_urf` = 7, `cod_pais` = 3, `cod_mun` = 7. Valores em **US$ FOB** (inteiros), pesos em **kg**. Coordenadas em graus decimais (WGS84), com ponto decimal.

## 1. Arquivos de entrada (pasta `dados_brutos/`, fora do site)

### fato_municipio.csv – base **Território** (domicílio fiscal da empresa)
| Coluna | Tipo | Descrição |
|---|---|---|
| ano | inteiro | Ano (1997–2026) |
| mes | inteiro | Mês (1–12; em 2026, 1–9) |
| fluxo | texto | `EXP` ou `IMP` |
| cod_mun | texto(7) | Código IBGE do município do domicílio fiscal da empresa |
| SH4 | texto(4) | Posição do Sistema Harmonizado |
| valor_fob | inteiro | Valor US$ FOB |
| peso_kg | inteiro | Peso líquido em kg |

### fato_via_urf.csv – base **Escoamento** (UF de origem/destino da mercadoria)
Mesmas colunas de tempo, fluxo, SH4, valor e peso, mais:
| Coluna | Tipo | Descrição |
|---|---|---|
| cod_via | texto(2) | Via de transporte (ver `dim_via`) |
| cod_urf | texto(7) | Unidade da Receita Federal de despacho (ver `dim_urf`) |

### fato_pais_ano.csv – base Território por país (sem mês)
`ano, fluxo, cod_pais (texto 3), SH4, valor_fob, peso_kg`. Os totais por ano e fluxo coincidem com `fato_municipio`.

### Dimensões
| Arquivo | Colunas | Observação |
|---|---|---|
| dim_municipio.csv | cod_mun, nome_mun | 417 municípios da Bahia. No site, os nomes vêm da malha IBGE 2025. |
| dim_pais.csv | cod_pais, nome_pais | 281 códigos. |
| dim_produto.csv | SH4, nome_sh4, SH2, nome_sh2, segmento | 1.274 SH4; 30 segmentos (inclui "Demais produtos"). |
| dim_urf.csv | cod_urf, nome_urf, nome_local, tipo_local, uf_local, lat, lon, precisao | `precisao`: `malha`, `confirmado` ou `inferido-nome`. Sem coordenada = campos vazios. |
| dim_via.csv | cod_via, nome_via | 17 vias. |

### Opcionais
| Arquivo | Uso |
|---|---|
| NCM_SH.csv (Comex Stat, tabela auxiliar) | Coluna `NO_SH4_ING`: nomes oficiais dos SH4 em inglês para a versão EN. |
| entrega_unifacs_conectividade_comex_bahia.xlsx | Aba 3 (rodovias, só colunas de 2025) e aba 4 (exportação marítima por porto local × fora da Bahia, 2023–2025). A aba 5 não é usada. O TEU estimado não é usado. |
| mapas_bahia/*.geojson | Malhas IBGE e camadas DNIT/VGEO recortadas para a Bahia. |

### scripts/grupos.csv – classificação em 10 grupos
| Coluna | Descrição |
|---|---|
| tipo | `segmento` (regra pelo nome do segmento) ou `sh2` (regra pelo capítulo, usada quando o segmento é "Demais produtos") |
| chave | Nome do segmento, ou lista de capítulos SH2 (ex.: `28-30,32-39`) |
| grupo | Um dos 10 grupos oficiais |

## 2. Arquivos gerados (pasta `data/` do site)

### data/meta.json
`anos`, `ano_padrao` (último ano fechado), `ano_parcial`, `mes_parcial`, `rotulo_parcial`, `gerado_em`, `grupos` (10 nomes, na ordem das cores), `serie_bahia` (base Território: `{EXP|IMP: {ano: {v, var}}}`), `serie_escoamento` (mesma estrutura, base Escoamento) e `conferencia` (totais usados no `CONFERENCIA_NUMEROS.md`).

### data/territorio/{EXP|IMP}_{ano}.json
| Campo | Descrição |
|---|---|
| total, total_base, var | Total do ano; total da base de comparação (ano anterior inteiro, ou mesmos meses se o ano for parcial); variação % |
| n_mun, top10 | Nº de municípios com valor > 0; participação % dos 10 maiores |
| mun | Lista `[cod_mun, valor, var%, participação%, posição]`, ordenada do maior para o menor |
| conc | % acumulado por posição (curva de concentração) |
| paises, total_paises | 15 maiores países + "Demais países": `[nome, valor, %]` (de `fato_pais_ano`) |

### data/territorio/series_municipios.json
`{anos, series: {cod_mun: {EXP: [valor por ano], IMP: [...]}}}`, sempre o valor de cada ano, sem acumular.

### data/segmentos/{EXP|IMP}_{ano}.json
| Campo | Descrição |
|---|---|
| total, total_base, var | Como acima (base Território) |
| grupos | `[índice do grupo, valor, %]` para os 10 grupos |
| segmentos | `[segmento, valor, %, índice do grupo ou null]` (null = segmento com produtos de vários grupos) |
| mun | `[cod_mun, valor, grupo dominante, [[grupo, %], … 3 principais]]` |
| produtos | `{grupo: [[SH4, nome, valor, % no grupo], … 15 maiores + demais]}` |

`data/segmentos/composicao.json`: valor por grupo em cada ano (barras 100%). `data/segmentos/sh4_en.json`: `{SH4: nome em inglês}`.

### data/escoamento/{EXP|IMP}_{ano}.json
| Campo | Descrição |
|---|---|
| total, total_base, var | Base Escoamento (não comparar com a base Território) |
| urfs | `[cod_urf, valor, var%, %]` |
| vias | `[cod_via, valor, %, var%]` |
| sankey | `grupos` (6 maiores), `urfs` (8 maiores), `gv` = ligações grupo→via `[grupo ou -1, via, valor]`, `vu` = via→URF `[via, cod_urf ou "DEMAIS", valor]` |
| sem_coord | URFs com valor e sem coordenada `[cod_urf, valor]` |

`data/escoamento/urfs.json`: cadastro das URFs usadas `{cod: [nome curto, local, tipo, UF, lat, lon, precisão, nome oficial]}` e nomes das vias. `series_vias.json`: valor por via em cada ano. `desembaraco.json`: aba 4 por ano `{local: [valor, peso], fora: [valor, peso], top_fora}`.

### data/geo/
| Arquivo | Origem | Tratamento |
|---|---|---|
| municipios.json, contorno.json | IBGE 2025 (malha recortada) | Simplificação que preserva divisas, 4 casas decimais |
| brasil_uf.json | IBGE BR_UF_2025 | Simplificada, sem ilhotas < 0,002 grau², 3 casas |
| amazonia_azul.json | IBGE SistCostMar_AmAz_2024 | Idem |
| rodovias_federais.json, rodovias_estaduais.json, ferrovias.json, dutovias.json | DNIT/VGEO (SNV, CIDE 2021) | Linhas simplificadas |
| portos_antaq.json, portos_snv.json, aerodromos.json | ANTAQ, SNV, ANAC | Pontos; helipontos excluídos |
| rodovias_info.json | Planilha, aba 3 | Só dados de 2025 + características (sem acumulado de anos) |
