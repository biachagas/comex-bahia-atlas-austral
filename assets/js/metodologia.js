/* Página METODOLOGIA E CRÉDITOS – uma página: metodologia primeiro, créditos em bloco separado no fim.
   Texto completo em português e em inglês (o idioma segue o botão PT | EN). */
(function () {
  const C = ATLAS_CONFIG.cores;
  const LINKS = {
    bianca: { orcid: "https://orcid.org/0009-0009-4859-8666", lattes: "http://lattes.cnpq.br/6882612035536485", linkedin: "https://www.linkedin.com/in/biancagfochagas/" },
    henrique: { orcid: "https://orcid.org/0000-0002-0953-7731", lattes: "http://lattes.cnpq.br/8801706927407720" }
  };
  // Ícones oficiais (arquivos em assets/img/logos/). null = ainda não recebido: o botão mostra só o texto.
  const ICONES = { orcid: "assets/img/logos/orcid-id.png", linkedin: "assets/img/logos/linkedin-in.png", lattes: "assets/img/logos/lattes-icone.png" };
  const novaAba = () => `<span class="sr-only"> (${I18N.lang === "en" ? "opens in a new tab" : "abre em nova aba"})</span>`;
  const icone = (tipo, alt) => ICONES[tipo] ? `<img src="${ICONES[tipo]}" alt="${alt}" class="ico-${tipo}">` : "";
  // ORCID no formato "compacto" das diretrizes oficiais: ícone iD + número, com link para o registro completo
  const btnOrcid = url => {
    const id = url.split("/").pop();
    const rot = I18N.lang === "en" ? `View ORCID record - ${id}` : `Ver registro ORCID - ${id}`;
    return `<a class="btn-perfil" href="${url}" target="_blank" rel="noopener" aria-label="${rot}">${icone("orcid", "ORCID iD") || '<b class="txt-orcid">ORCID</b>'}<span>${id}</span></a>`;
  };
  const btnLattes = url => `<a class="btn-perfil" href="${url}" target="_blank" rel="noopener">${icone("lattes", "")}<span>${I18N.lang === "en" ? "Lattes CV" : "Currículo Lattes"}</span>${novaAba()}</a>`;
  const btnLinkedin = url => `<a class="btn-perfil" href="${url}" target="_blank" rel="noopener">${icone("linkedin", "")}<span>LinkedIn</span>${novaAba()}</a>`;

  function grupos(lang) {
    return ATLAS_CONFIG.cores.grupos.map((c, i) => `<li><i style="background:${c}"></i>${lang === "en" ? t(GR[i]) : GR[i]}</li>`).join("");
  }
  let GR = [];

  const PT = (m) => `
    <h2 class="titulo-secao">Metodologia</h2>
    <p class="lead">O painel Comércio Exterior da Bahia – Atlas Austral reúne, em mapas e gráficos, as exportações e importações da Bahia de ${m.anos[0]} a setembro de 2026, segundo três leituras: <b>Municípios</b> (onde estão as empresas), <b>Escoamento</b> (por onde a mercadoria sai ou entra) e <b>Segmentos</b> (o que é comercializado).</p>

    <h3>1. Fontes e período</h3>
    <ul>
      <li><b>Comércio exterior:</b> Comex Stat (MDIC/SECEX), dados mensais de ${m.anos[0]} a setembro de 2026. O ano de 2026 é <b>parcial (jan–set)</b>. Dados extraídos em outubro de 2026.</li>
      <li><b>Malha municipal:</b> IBGE, Malha Municipal Digital 2025 (417 municípios da Bahia). <b>Limites estaduais:</b> IBGE, UF 2025. <b>Amazônia Azul:</b> IBGE, Sistema Costeiro-Marinho 2024.</li>
      <li><b>Infraestrutura</b> (DNIT/VGEO, acesso em 29/10/2026): aeródromos (ANAC), portos e terminais (ANTAQ), ferrovias, rodovias estaduais 2021 (CIDE), dutovias, portos e rodovias federais do SNV.</li>
      <li><b>Planilha de conectividade</b>, disponibilizada pela <b>Usuport</b> em 30/10/2026 (complementar): aba 3 (rodovias: extensão, avaliação CNT e sinistros de 2025, fontes PRF, DNIT, CNT e SEINFRA-BA) e aba 4 (exportação marítima por porto na Bahia × fora da Bahia, 2023–2025). Os totais da aba 4 foram conferidos com os dados do Comex Stat usados no painel e coincidem em valor e peso. O TEU estimado da planilha não é usado.</li>
    </ul>

    <h3>2. Tratamento dos dados</h3>
    <ul>
      <li>Consultas do Comex Stat tratadas no <b>Power Query do Power BI</b>, com todas as chaves gravadas como <b>texto com zeros à esquerda</b> (SH4 = 4 dígitos, SH2 = 2, via = 2, URF = 7, país = 3, município = 7).</li>
      <li>Um script em Python (<code>scripts/gerar_dados.py</code>) lê os CSVs e gera arquivos pré-agregados por ano e fluxo. O mesmo script refaz a <b>conferência de números</b> (totais por ano, soma dos grupos = total, soma das vias = soma das URFs).</li>
      <li>A malha municipal foi simplificada (mantendo os 417 municípios e as divisas encaixadas) para carregar rápido na web.</li>
    </ul>

    <h3>3. Regras de leitura</h3>
    <ul>
      <li><b>Exportação e importação são sempre separadas</b> e mostradas por ano. Anos nunca são somados nem acumulados.</li>
      <li>O <b>saldo</b> (exportação − importação do mesmo ano) existe somente na página Municípios.</li>
      <li><b>Variação %:</b> anos fechados comparam o ano inteiro com o ano anterior; o ano parcial (2026) compara apenas os mesmos meses (jan–set de 2026 × jan–set de 2025).</li>
      <li>Valores em <b>US$ FOB</b> correntes, sem correção pela inflação.</li>
    </ul>

    <h3>4. Duas bases que não se somam</h3>
    <p>O Comex Stat publica os dados municipais por <b>domicílio fiscal</b> da empresa (páginas Municípios e Segmentos) e os dados por via e URF pela <b>UF de origem (exportação) ou destino (importação) da mercadoria</b> (página Escoamento). Por isso:</p>
    <ul>
      <li>as <b>importações coincidem</b> nas duas bases em todos os anos;</li>
      <li>as <b>exportações diferem</b>: uma empresa com sede fora da Bahia pode exportar mercadoria produzida na Bahia, e vice-versa;</li>
      <li>as duas bases <b>nunca são somadas nem comparadas em valor total</b> no painel.</li>
    </ul>

    <h3>5. Segmentos e grupos</h3>
    <p>Cada produto (SH4) recebe um <b>segmento</b> (30 segmentos definidos na tabela de produtos). Os segmentos são reunidos em <b>10 grupos</b>. Quando o segmento é “Demais produtos”, o grupo é definido pelo <b>capítulo SH2</b> do produto (por exemplo, adubos → Fertilizantes). A classificação completa está no arquivo <code>scripts/grupos.csv</code> do repositório.</p>
    <ul class="lista-cores">${grupos("pt")}</ul>

    <h3>6. Como ler o diagrama de Sankey</h3>
    <p>O <b>diagrama de Sankey</b> é um gráfico de fluxos: faixas ligam categorias, e a largura de cada faixa é proporcional à quantidade que passa por ela. Ele mostra de onde o valor vem e para onde vai, como um mapa de "encanamentos". Na página Escoamento, o diagrama lê-se da esquerda para a direita: <b>grupo de produtos → via de transporte → URF</b> de despacho. A largura de cada faixa é proporcional ao valor em US$ FOB, sempre de um único ano e de um único fluxo. São mostrados os 6 maiores grupos (os demais somados), todas as vias e as 8 maiores URFs (as demais somadas). A cor da URF indica se ela fica na Bahia, fora da Bahia ou se a UF não está informada no cadastro. Em telas pequenas, o diagrama vira barras empilhadas grupo × via.</p>

    <h3>7. URFs e coordenadas</h3>
    <p>Cada URF é posicionada no porto, aeroporto ou ponto de fronteira correspondente quando há coordenada no cadastro. <b>URFs sem coordenada não são posicionadas por estimativa</b>: ficam listadas em nota abaixo do mapa e continuam nos gráficos e na tabela. Algumas coordenadas foram inferidas pelo nome da URF; elas são marcadas com asterisco.</p>

    <h3>8. Glossário</h3>
    <dl class="glossario">
      <dt>FOB</dt><dd><i>Free on Board</i>: valor da mercadoria posta no navio ou veículo de embarque, sem frete e seguro internacionais. Unidade: US$.</dd>
      <dt>SH2 / SH4</dt><dd>Capítulo (2 dígitos) e posição (4 dígitos) do Sistema Harmonizado, a classificação internacional de mercadorias.</dd>
      <dt>URF</dt><dd>Unidade da Receita Federal onde a mercadoria foi despachada (porto, aeroporto, ponto de fronteira ou unidade interior).</dd>
      <dt>Via</dt><dd>Modal de transporte declarado: marítima, aérea, rodoviária, ferroviária, dutos etc.</dd>
      <dt>Saldo</dt><dd>Exportação menos importação do mesmo ano. Positivo = superávit; negativo = déficit.</dd>
      <dt>Ano parcial</dt><dd>Ano ainda incompleto na fonte. Aqui, 2026 com dados de janeiro a setembro.</dd>
    </dl>

    <h3>9. Mapas, tipografia e software</h3>
    <ul>
      <li><b>Mapa de fundo claro:</b> CARTO Positron, dados © OpenStreetMap contributors, © CARTO.</li>
      <li><b>Satélite (Escoamento):</b> Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2023), licença CC BY-NC-SA 4.0, uso não comercial.</li>
      <li><b>Limites e malhas:</b> IBGE. <b>Infraestrutura:</b> DNIT/VGEO, ANAC, ANTAQ, SNV.</li>
      <li>Sem internet, o painel continua funcionando só com os contornos e as camadas próprias.</li>
      <li><b>Tipografia:</b> Georgia (títulos) e Segoe UI (texto), com alternativas do sistema.</li>
      <li><b>Software:</b> D3.js 7.9 (licença ISC) e d3-sankey 0.12 (licença BSD-3), incluídos no próprio site. Sem cookies e sem coleta de dados de navegação. As preferências do menu de acessibilidade ficam só no navegador da pessoa (armazenamento local) e não são enviadas a lugar nenhum.</li>
      <li><b>Uso de inteligência artificial:</b> o código e a interface do painel foram desenvolvidos com apoio do assistente de IA Claude (Anthropic), sob orientação, revisão e permissões da autora. A seleção e o tratamento dos dados, as escolhas metodológicas e a conferência dos números são de responsabilidade da autora.</li>
    </ul>
    <h3>10. Licenças</h3>
    <ul>
      <li><b>Código do painel:</b> licença <a href="https://github.com/biachagas/comex-bahia-atlas-austral/blob/main/LICENSE" target="_blank" rel="noopener">MIT</a>. Qualquer pessoa pode reaproveitar, desde que mantenha o nome da autora.</li>
      <li><b>Dados tratados, mapas, gráficos e textos</b> (inclusive os CSVs baixados aqui e esta Metodologia): licença <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.pt-br" target="_blank" rel="noopener">CC BY-NC 4.0</a>. Podem ser reaproveitados com crédito (veja "Como citar"), mas não para fins comerciais.</li>
      <li><b>Dados de terceiros</b> mantêm as licenças de origem: Comex Stat (dados públicos), IBGE, DNIT/VGEO, ANAC e ANTAQ; mapa de fundo © OpenStreetMap contributors e © CARTO; Sentinel-2 cloudless (EOX), CC BY-NC-SA 4.0, usado só como fundo e não redistribuído; D3.js (ISC) e d3-sankey (BSD-3).</li>
      <li><b>Planilha da Usuport</b> (dados de rodovias e de desembaraço na página Escoamento): fica de fora da licença aberta.</li>
      <li><b>Marca Atlas Austral</b> (logo, símbolo e ícone): © 2026 Bianca Chagas, todos os direitos reservados. Pode ser exibida sem alteração para citar ou divulgar o Atlas Austral; outros usos dependem de autorização. As logos institucionais (PPDRU, PPGA, UNIFACS, Ânima e CAPES) pertencem aos respectivos titulares. Detalhes por arquivo: <a href="https://github.com/biachagas/comex-bahia-atlas-austral/blob/main/LICENCAS.md" target="_blank" rel="noopener">LICENCAS.md</a>.</li>
    </ul>`;

  const EN = (m) => `
    <h2 class="titulo-secao">Methodology</h2>
    <p class="lead">The Bahia Foreign Trade – Atlas Austral dashboard brings together, in maps and charts, the exports and imports of the state of Bahia (Brazil) from ${m.anos[0]} to September 2026, through three lenses: <b>Municipalities</b> (where the companies are), <b>Shipping routes</b> (where goods leave or enter the country) and <b>Segments</b> (what is traded).</p>

    <h3>1. Sources and period</h3>
    <ul>
      <li><b>Foreign trade:</b> Comex Stat (MDIC/SECEX, Brazilian Ministry of Development, Industry, Trade and Services), monthly data from ${m.anos[0]} to September 2026. 2026 is a <b>partial year (Jan–Sep)</b>. Data extracted in October 2026.</li>
      <li><b>Municipal boundaries:</b> IBGE, Digital Municipal Grid 2025 (417 municipalities of Bahia). <b>State boundaries:</b> IBGE, 2025. <b>Blue Amazon:</b> IBGE, Coastal-Marine System 2024.</li>
      <li><b>Infrastructure</b> (DNIT/VGEO, accessed on 29 Oct 2026): aerodromes (ANAC), ports and terminals (ANTAQ), railways, state highways 2021 (CIDE), pipelines, ports and federal highways from the National Road System (SNV).</li>
      <li><b>Connectivity spreadsheet</b>, provided by <b>Usuport</b> on 30 October 2026 (supplementary): tab 3 (highways: length, CNT rating and 2025 crashes; sources PRF, DNIT, CNT and SEINFRA-BA) and tab 4 (maritime exports through ports in Bahia × outside Bahia, 2023–2025). Tab 4 totals were checked against the Comex Stat data used in the dashboard and match in value and weight. The spreadsheet's estimated TEU is not used.</li>
    </ul>

    <h3>2. Data processing</h3>
    <ul>
      <li>Comex Stat queries were processed in <b>Power Query (Power BI)</b>, with every key stored as <b>text with leading zeros</b> (HS4 = 4 digits, HS2 = 2, transport mode = 2, customs unit = 7, country = 3, municipality = 7).</li>
      <li>A Python script (<code>scripts/gerar_dados.py</code>) reads the CSV files and produces pre-aggregated files by year and flow. The same script re-runs the <b>numerical checks</b> (yearly totals, sum of groups = total, sum of transport modes = sum of customs units).</li>
      <li>The municipal grid was simplified (keeping all 417 municipalities and matching borders) so that it loads quickly on the web.</li>
    </ul>

    <h3>3. Reading rules</h3>
    <ul>
      <li><b>Exports and imports are always kept separate</b> and shown year by year. Years are never added up or accumulated.</li>
      <li>The <b>trade balance</b> (exports − imports in the same year) appears only on the Municipalities page.</li>
      <li><b>% change:</b> full years are compared with the whole previous year; the partial year (2026) compares only the same months (Jan–Sep 2026 × Jan–Sep 2025).</li>
      <li>Values in current <b>US$ FOB</b>, not adjusted for inflation.</li>
    </ul>

    <h3>4. Two datasets that must not be added together</h3>
    <p>Comex Stat publishes municipal data by the company's <b>tax domicile</b> (Municipalities and Segments pages) and data by transport mode and customs unit by the <b>state of origin (exports) or destination (imports) of the goods</b> (Shipping routes page). Therefore:</p>
    <ul>
      <li><b>imports match</b> in both datasets in every year;</li>
      <li><b>exports differ</b>: a company based outside Bahia may export goods produced in Bahia, and vice versa;</li>
      <li>the two datasets are <b>never added together or compared in total value</b> in this dashboard.</li>
    </ul>

    <h3>5. Segments and groups</h3>
    <p>Each product (HS4) is assigned a <b>segment</b> (30 segments defined in the product table). Segments are gathered into <b>10 groups</b>. When the segment is “Other products”, the group is defined by the product's <b>HS2 chapter</b> (e.g., fertilisers → Fertilisers). The full classification is in the repository file <code>scripts/grupos.csv</code>.</p>
    <ul class="lista-cores">${grupos("en")}</ul>

    <h3>6. How to read the Sankey diagram</h3>
    <p>A <b>Sankey diagram</b> is a flow chart: bands connect categories, and the width of each band is proportional to the amount flowing through it. It shows where value comes from and where it goes, like a map of "pipes". On the Shipping routes page, the diagram reads from left to right: <b>product group → transport mode → customs unit (URF)</b>. The width of each band is proportional to the US$ FOB value, always for a single year and a single flow. It shows the 6 largest groups (the rest combined), all transport modes and the 8 largest customs units (the rest combined). The colour of each customs unit shows whether it is in Bahia, outside Bahia, or has no state recorded. On small screens the diagram becomes stacked bars (group × transport mode).</p>

    <h3>7. Customs units and coordinates</h3>
    <p>Each customs unit (URF, Brazilian Federal Revenue unit) is placed at its port, airport or border crossing when the register has coordinates. <b>Units without coordinates are never placed by guesswork</b>: they are listed in a note below the map and remain in the charts and the table. Some coordinates were inferred from the unit's name; these are marked with an asterisk.</p>

    <h3>8. Glossary</h3>
    <dl class="glossario">
      <dt>FOB</dt><dd><i>Free on Board</i>: value of the goods loaded on the ship or vehicle, excluding international freight and insurance. Unit: US$.</dd>
      <dt>HS2 / HS4</dt><dd>Chapter (2 digits) and heading (4 digits) of the Harmonized System, the international classification of goods (SH in Portuguese).</dd>
      <dt>URF</dt><dd>Federal Revenue unit where the goods were cleared (port, airport, border crossing or inland unit).</dd>
      <dt>Transport mode</dt><dd>Declared mode: sea, air, road, rail, pipeline, etc.</dd>
      <dt>Trade balance</dt><dd>Exports minus imports in the same year. Positive = surplus; negative = deficit.</dd>
      <dt>Partial year</dt><dd>Year still incomplete in the source. Here, 2026 with data from January to September.</dd>
    </dl>

    <h3>9. Maps, typography and software</h3>
    <ul>
      <li><b>Light basemap:</b> CARTO Positron, data © OpenStreetMap contributors, © CARTO.</li>
      <li><b>Satellite (Shipping routes):</b> Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2023), CC BY-NC-SA 4.0 licence, non-commercial use.</li>
      <li><b>Boundaries:</b> IBGE. <b>Infrastructure:</b> DNIT/VGEO, ANAC, ANTAQ, SNV.</li>
      <li>Without internet access, the dashboard keeps working with its own boundaries and layers.</li>
      <li><b>Typography:</b> Georgia (headings) and Segoe UI (text), with system fallbacks.</li>
      <li><b>Software:</b> D3.js 7.9 (ISC licence) and d3-sankey 0.12 (BSD-3 licence), bundled with the site. No cookies and no browsing-data collection. Accessibility-menu preferences stay only in the visitor's browser (local storage) and are never sent anywhere.</li>
      <li>Municipality and customs-unit names are proper names and are kept in Portuguese.</li>
      <li><b>Use of artificial intelligence:</b> the dashboard's code and interface were developed with the support of the AI assistant Claude (Anthropic), under the author's guidance, review and permissions. Data selection and processing, methodological choices and the checking of figures are the author's responsibility.</li>
    </ul>
    <h3>10. Licences</h3>
    <ul>
      <li><b>Dashboard code:</b> <a href="https://github.com/biachagas/comex-bahia-atlas-austral/blob/main/LICENSE" target="_blank" rel="noopener">MIT</a> licence. Anyone may reuse it, as long as the author's name is kept.</li>
      <li><b>Processed data, maps, charts and texts</b> (including the CSV downloads and this Methodology): <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.en" target="_blank" rel="noopener">CC BY-NC 4.0</a>. They may be reused with credit (see "How to cite"), but not for commercial purposes.</li>
      <li><b>Third-party data</b> keep their original licences: Comex Stat (public data), IBGE, DNIT/VGEO, ANAC and ANTAQ; basemap © OpenStreetMap contributors and © CARTO; Sentinel-2 cloudless (EOX), CC BY-NC-SA 4.0, used only as a background and not redistributed; D3.js (ISC) and d3-sankey (BSD-3).</li>
      <li><b>Usuport spreadsheet</b> (road and customs-clearance data on the Shipping routes page): not covered by the open licence.</li>
      <li><b>Atlas Austral brand</b> (logo, symbol and icon): © 2026 Bianca Chagas, all rights reserved. It may be shown unaltered to cite or refer to Atlas Austral; any other use requires permission. Institutional logos (PPDRU, PPGA, UNIFACS, Ânima and CAPES) belong to their owners. File-by-file details: <a href="https://github.com/biachagas/comex-bahia-atlas-austral/blob/main/LICENCAS.md" target="_blank" rel="noopener">LICENCAS.md</a>.</li>
    </ul>`;

  function creditos(lang) {
    const en = lang === "en";
    const b = LINKS.bianca, h = LINKS.henrique;
    return `
    <section class="cartao creditos" aria-labelledby="tit-creditos">
      <h2 id="tit-creditos" class="titulo-secao">${en ? "Credits" : "Créditos"}</h2>
      <div class="pessoa">
        <p class="papel">${en ? "Data processing, cartography and dashboard development" : "Elaboração: tratamento dos dados, cartografia e desenvolvimento do painel"}</p>
        <p class="nome">Bianca Glória França de Oliveira Chagas</p>
        <ul class="formacao">
          ${en
            ? `<li>Bachelor in International Relations, Universidade Salvador (UNIFACS)</li>
               <li>Master's student in Regional and Urban Development, Graduate Program in Regional and Urban Development (PPDRU/UNIFACS)</li>
               <li>CAPES scholarship holder – Graduate Support Program for Private Higher Education Institutions (PROSUP)</li>`
            : `<li>Bacharela em Relações Internacionais pela Universidade Salvador (UNIFACS)</li>
               <li>Mestranda em Desenvolvimento Regional e Urbano pelo Programa de Pós-Graduação em Desenvolvimento Regional e Urbano (PPDRU/UNIFACS)</li>
               <li>Bolsista CAPES – Programa de Suporte à Pós-Graduação de Instituições de Ensino Particulares (PROSUP)</li>`}
        </ul>
        <div class="botoes-perfil">${btnOrcid(b.orcid)}${btnLattes(b.lattes)}${btnLinkedin(b.linkedin)}</div>
      </div>
      <div class="pessoa">
        <p class="papel">${en ? "Conception and supervision" : "Idealização e orientação"}</p>
        <p class="nome">Prof. Dr. Henrique Campos de Oliveira</p>
        <ul class="formacao">
          ${en
            ? `<li>Professor in the Graduate Program in Regional and Urban Development (PPDRU) and in the Graduate Program in Business Administration at Universidade Salvador (UNIFACS)</li>
               <li>Member of the research group Political Institutions and Public Policies, Center for Studies and Research in Humanities (CRH)</li>
               <li>Research areas: international maritime trade, Bahia's foreign trade and development policies</li>`
            : `<li>Professor do Programa de Pós-Graduação em Desenvolvimento Regional e Urbano e do Programa de Pós-Graduação em Administração da Universidade Salvador (UNIFACS)</li>
               <li>Integra o grupo Instituições Políticas e Políticas Públicas do Centro de Estudos e Pesquisa em Humanidades (CRH)</li>
               <li>Atua nas áreas de Comércio Internacional Marítimo, Comércio Exterior Baiano e Políticas para o Desenvolvimento</li>`}
        </ul>
        <div class="botoes-perfil">${btnOrcid(h.orcid)}${btnLattes(h.lattes)}</div>
      </div>
      <div class="pessoa">
        <p class="papel">${en ? "Cooperation" : "Cooperação"}</p>
        <p class="nome nome-menor">Usuport</p>
        <ul class="formacao"><li>${en ? "Connectivity spreadsheet (highways and customs clearance), provided on 30 October 2026" : "Planilha de conectividade (rodovias e desembaraço aduaneiro), disponibilizada em 30/10/2026"}</li></ul>
      </div>
      <p class="apoio">${en
        ? "Developed within the project <i>Infraestrutura e Desenvolvimento Regional: Cadeias Globais de Valor (CGV) e Sistemas Estruturantes de Logística e Transporte</i> (Infrastructure and Regional Development: Global Value Chains and Structuring Logistics and Transport Systems), by the Graduate Program in Regional and Urban Development (PPDRU) and the Graduate Program in Business Administration (PPGA) at UNIFACS, in cooperation with Usuport, with support from CAPES/FAPESB Call No. 38/2020 (PDPG – Strategic Partnerships in the States III)."
        : "Desenvolvido no âmbito do projeto <i>Infraestrutura e Desenvolvimento Regional: Cadeias Globais de Valor (CGV) e Sistemas Estruturantes de Logística e Transporte</i>, do Programa de Pós-Graduação em Desenvolvimento Regional e Urbano (PPDRU) e do Programa de Pós-Graduação em Administração (PPGA) da UNIFACS, em cooperação com a Usuport, com apoio do Edital CAPES/FAPESB nº 38/2020 (PDPG – Parcerias Estratégicas nos Estados III)."}</p>
      <p class="apoio">${en
        ? "This work was carried out with the support of the Coordination for the Improvement of Higher Education Personnel – Brazil (CAPES) – Financing Code 001."
        : "O presente trabalho foi realizado com apoio da Coordenação de Aperfeiçoamento de Pessoal de Nível Superior – Brasil (CAPES) – Código de Financiamento 001."}</p>
    </section>`;
  }

  async function montar(raiz) {
    const meta = await U.json("data/meta.json");
    GR = meta.grupos;
    const en = I18N.lang === "en";
    raiz.innerHTML = `
    <section class="pagina pg-metodologia">
      <article class="cartao texto-longo">${en ? EN(meta) : PT(meta)}
        <p class="atualizado">${U.atualizado(meta)}</p>
      </article>
      ${creditos(I18N.lang)}
      ${Rodape.html("metodologia")}
    </section>`;
  }

  window.PaginaMetodologia = { montar };
})();
