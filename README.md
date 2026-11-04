# Comércio Exterior da Bahia – Atlas Austral

Painel interativo das exportações e importações da Bahia (1997 a setembro de 2026), em quatro páginas: **Municípios**, **Escoamento** (vias e URFs, com diagrama de Sankey), **Segmentos** (grupos de produtos) e **Metodologia e Créditos**. Disponível em português e inglês (botão **PT | EN**).

**Endereço:** https://biachagas.github.io/comex-bahia-atlas-austral/

Elaboração: Bianca Glória França de Oliveira Chagas (PPDRU/UNIFACS, bolsista CAPES/PROSUP). Idealização e orientação: Prof. Dr. Henrique Campos de Oliveira.
Fonte dos dados: Comex Stat (MDIC/SECEX). O site é estático: não usa banco de dados, cookies nem serviços de análise de acesso.
Código e interface desenvolvidos com apoio do assistente de IA Claude (Anthropic), sob orientação, revisão e permissões da autora.

---

## 1. O que tem em cada pasta

| Pasta / arquivo | Para que serve |
|---|---|
| `index.html` | A página que o navegador abre. |
| `assets/css/` | Cores, fontes e layout. `acessibilidade.css` tem os estilos do menu de acessibilidade. |
| `assets/js/` | Funcionamento do site. **`config.js` é o único arquivo que você deve precisar editar** (rótulos das abas, textos dos rodapés, chave do mapa de fundo). |
| `assets/js/acessibilidade.js` | Menu de acessibilidade (componente independente, reaproveitável no site do Atlas Austral). |
| `assets/js/i18n-en.js` | Traduções para o inglês. Para corrigir uma tradução, mude o texto à direita dos dois-pontos. |
| `assets/lib/` | Bibliotecas d3 e d3-sankey (ficam dentro do site; não precisa de internet para elas). |
| `assets/img/` | Logos e ícone do site. |
| `data/` | Dados prontos para o site, gerados pelo script. **Não edite à mão.** |
| `scripts/gerar_dados.py` | Lê os CSVs do Comex Stat e gera a pasta `data/`. |
| `scripts/grupos.csv` | Classificação dos segmentos nos 10 grupos (editável). |
| `scripts/simplificar_malhas.py` | Simplifica as malhas do IBGE/DNIT (só precisa rodar se a malha mudar). |
| `CONFERENCIA_NUMEROS.md` | Conferência de números gerada automaticamente pelo script. |
| `LICENSE`, `LICENSE-DADOS.md` e `LICENCAS.md` | Licenças: MIT para o código; CC BY-NC 4.0 para dados tratados, mapas e gráficos; o que fica de fora. |
| `DECISOES.md` | Todas as decisões tomadas no projeto. |
| `DICIONARIO_DADOS.md` | Descrição de cada arquivo e coluna. |
| `CHECKLIST.md` | Lista de testes para fazer antes da apresentação. |

Os CSVs brutos (cerca de 45 MB) **não** vão para o GitHub. Guarde-os numa pasta do seu computador, por exemplo `dados_brutos/`.

---

## 2. Ver o site no seu computador

Clicar duas vezes no `index.html` **não funciona**: por segurança, o navegador bloqueia a leitura dos dados quando a página é aberta direto do disco (endereço começando com `file://`). Use um servidor local, que é um comando só:

1. Abra o **Terminal** (Mac) ou o **Prompt de Comando** (Windows).
2. Entre na pasta do site. Exemplo: `cd Downloads/comex-bahia-atlas-austral`
3. Digite: `python -m http.server 8000` (no Mac pode ser `python3 -m http.server 8000`).
4. No navegador, abra: **http://localhost:8000**
5. Para desligar, volte ao terminal e aperte `Ctrl + C`.

No seu computador o **mapa de fundo não aparece** (a chave da CARTO só vale para `biachagas.github.io`). O mapa continua funcionando com os contornos. No endereço publicado, o fundo aparece normalmente.

---

## 3. Publicar no GitHub Pages pela primeira vez

O repositório é `biachagas/comex-bahia-atlas-austral`. Há dois jeitos de enviar os arquivos.

### 3.1 Enviar os arquivos pelo navegador (sem instalar nada)

O GitHub aceita **no máximo 100 arquivos por envio**, e o site tem cerca de 230. Por isso o envio é feito em **4 pacotes**. O arquivo `atlas-austral-pacotes-upload.zip` já vem separado em `pacote-1` a `pacote-4`.

1. Descompacte `atlas-austral-pacotes-upload.zip` no seu computador.
2. Entre em https://github.com/biachagas/comex-bahia-atlas-austral (logada na sua conta).
3. Clique em **Add file → Upload files**.
4. Abra a pasta **`pacote-1`** no seu computador, selecione **tudo o que está dentro dela** (Ctrl+A no Windows ou Cmd+A no Mac) e **arraste** para a área cinza da página do GitHub. As pastas mantêm a estrutura sozinhas.
5. Espere a lista de arquivos terminar de carregar. Lá embaixo, em *Commit changes*, escreva por exemplo "Envio do site – pacote 1" e clique em **Commit changes**.
6. Repita os passos 3 a 5 para **`pacote-2`**, **`pacote-3`** e **`pacote-4`**. Cada um deles tem só uma pasta chamada `data`: arraste essa pasta inteira. O GitHub junta o conteúdo com a pasta `data` que já existe, sem apagar nada.
7. Confira se, na página do repositório, aparecem `index.html`, `assets`, `data` e `scripts`, e se dentro de `data` estão `escoamento`, `geo`, `segmentos`, `territorio` e `meta.json`.

> Se o Mac não mostrar o arquivo `.nojekyll` (arquivos que começam com ponto ficam ocultos), não tem problema: o site funciona sem ele.

### 3.2 Ligar o GitHub Pages (só uma vez)

1. No repositório, clique em **Settings** (engrenagem, no alto).
2. No menu da esquerda, clique em **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha **main** e a pasta **/ (root)**. Clique em **Save**.
5. Espere de 1 a 5 minutos. A página vai mostrar "Your site is live at https://biachagas.github.io/comex-bahia-atlas-austral/".
6. Abra o endereço. Se aparecer a versão antiga ou uma página em branco, aperte **Ctrl + Shift + R** (no Mac, **Cmd + Shift + R**) para recarregar sem cache.

O progresso da publicação aparece na aba **Actions** do repositório (círculo amarelo = publicando; verde = pronto).

---

## 4. Atualizar com dados novos (ex.: quando sair outubro de 2026)

1. Exporte do Power Query os mesmos arquivos, com **as mesmas colunas** e **as chaves como texto** (zeros à esquerda): `fato_municipio.csv`, `fato_via_urf.csv`, `fato_pais_ano.csv`, `dim_municipio.csv`, `dim_pais.csv`, `dim_produto.csv`, `dim_urf.csv`, `dim_via.csv`. Separador vírgula ou ponto e vírgula, tanto faz. Coloque-os na pasta `dados_brutos/`, junto com a subpasta `mapas_bahia/`.
   - Opcional: `NCM_SH.csv` (nomes em inglês dos produtos) e a planilha de conectividade.
2. Instale o Python (https://www.python.org) e, uma única vez, a biblioteca pandas: `pip install pandas openpyxl`
3. No terminal, dentro da pasta do site, rode:
   ```
   python scripts/gerar_dados.py --dados CAMINHO/dados_brutos --planilha CAMINHO/dados_brutos/entrega_unifacs_conectividade_comex_bahia.xlsx
   ```
   (Sem a planilha, apague a parte `--planilha ...`.)
4. Leia o arquivo **`CONFERENCIA_NUMEROS.md`** que o script acabou de gerar e confira os totais com o Comex Stat. Se alguma linha disser **NÃO**, não publique antes de entender a diferença.
5. O script detecta sozinho o último mês disponível e o ano parcial. Atualize em `assets/js/config.js` o texto da **fonte** (por exemplo, "Dados até outubro de 2026 (2026 parcial)").
6. Envie de novo **só a pasta `data/`** (e o `config.js`, se mudou), pelo mesmo caminho da seção 3.1. Arquivos com o mesmo nome são substituídos.

---

## 5. Mapa de fundo (chave CARTO)

- O fundo claro usa o **CARTO Positron**. A CARTO exige uma chave gratuita, que está em `assets/js/config.js` (`cartoKey`) e foi **restrita ao domínio `biachagas.github.io`**. Ela fica visível no código do site, como em qualquer chave de mapa para navegador; a restrição de domínio impede o uso dela em outros sites.
- Para gerenciar a chave: https://dashboard.basemaps.carto.com (com o e-mail usado no pedido).
- O satélite (página Escoamento) usa o **EOX Sentinel-2 cloudless 2023**, sem chave, livre para uso não comercial com atribuição.
- Sem internet, os mapas continuam funcionando com os contornos e as camadas próprias.

---

## 6. Mudar textos sem mexer no resto

- **Rótulo de uma aba** (ex.: trocar "Território" por "Municípios"): em `assets/js/config.js`, linha `territorio: "Território"`. Se mudar, acrescente a tradução em `assets/js/i18n-en.js`.
- **Textos dos rodapés:** também em `config.js`.
- **Cores dos 10 grupos:** `config.js`, lista `grupos` (na mesma ordem de `scripts/grupos.csv`).
- **Classificação de um segmento em outro grupo:** edite `scripts/grupos.csv` e rode o script de novo (seção 4).

---

## 7. Menu de acessibilidade

**Para quem visita:** o botão com o ícone de acessibilidade, ao lado do **PT | EN**, abre um painel com: aumentar e diminuir texto (87,5% a 150%), alto contraste, modo escuro, tons de cinza, destacar links, destacar títulos, cursor grande, pausar animações e restaurar padrão. Funciona com teclado (Tab, Enter/Espaço, **Esc** fecha). As escolhas ficam só no navegador da pessoa e valem também no site do Atlas Austral (mesmo endereço `biachagas.github.io`).

**Para quem mantém o código:**
- `assets/js/acessibilidade.js` + `assets/css/acessibilidade.css` não dependem das páginas do painel. Para usar em outro site: carregar os dois arquivos; o botão entra antes de um `#btn-idioma` ou dentro de um elemento com `data-a11y-botao`.
- As escolhas ficam no `localStorage`, chave `atlas-austral-a11y`. As opções viram classes no `<html>` (`a11y-contraste`, `a11y-escuro`, `a11y-cinza`, `a11y-links`, `a11y-titulos`, `a11y-cursor`, `a11y-sem-animacao`) e a variável CSS `--a11y-escala`.
- Ao mudar algo, o menu dispara o evento `atlas-a11y` em `document`. O painel usa isso para redesenhar os gráficos quando o texto muda de tamanho e para parar o **Play**.
- Textos do menu passam por `t()`; traduções em `i18n-en.js`.

## 8. Licenças e créditos de terceiros

- **Código** (`index.html`, `assets/css/`, `assets/js/`, `scripts/*.py`): **MIT**, arquivo [`LICENSE`](LICENSE).
- **Dados tratados, mapas, gráficos e textos** (`data/`, `scripts/grupos.csv`, CSVs do painel, textos e Metodologia): **CC BY-NC 4.0**, arquivo [`LICENSE-DADOS.md`](LICENSE-DADOS.md).
- **Dados de terceiros** mantêm as licenças de origem. A **planilha da Usuport** (`data/escoamento/desembaraco.json`, `data/geo/rodovias_info.json`) e as **logos** ficam de fora das licenças abertas. A **marca Atlas Austral** é © 2026 Bianca Chagas, todos os direitos reservados.
- Detalhes por arquivo e como dar o crédito: [`LICENCAS.md`](LICENCAS.md).

D3.js (ISC) e d3-sankey (BSD-3), arquivos de licença em `assets/lib/`. Mapas: © OpenStreetMap contributors, © CARTO; Sentinel-2 cloudless by EOX IT Services GmbH (CC BY-NC-SA 4.0); IBGE; DNIT/VGEO, ANAC, ANTAQ. Logos UNIFACS, Ânima, PPDRU, PPGA e CAPES usadas sem alteração de proporções; a do PPDRU em versão branca para o fundo escuro.
