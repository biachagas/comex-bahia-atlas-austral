/* Página ESCOAMENTO – por onde a mercadoria sai/entra (base: origem/destino da mercadoria na Bahia).
   Nenhum valor da base Território aparece aqui. */
(function () {
  const C = ATLAS_CONFIG.cores;
  const FLUXOS = ["EXP", "IMP"];
  const TONS = { EXP: ["#A83F12", "#F2691F", "#F8C9A0"], IMP: ["#16304D", "#2E8C87", "#B4DCD9"] };
  const CINZA = "#B8B0A2";

  const CAMADAS = [
    { id: "uf", nome: "Limites estaduais (IBGE 2025)", on: true },
    { id: "amazonia", nome: "Amazônia Azul (IBGE 2024)", on: false },
    { id: "contorno", nome: "Contorno da Bahia", on: true },
    { id: "rodest", nome: "Rodovias estaduais (2021)", on: false },
    { id: "rodfed", nome: "Rodovias federais (SNV)", on: true },
    { id: "ferro", nome: "Ferrovias", on: true },
    { id: "duto", nome: "Dutovias", on: false },
    { id: "antaq", nome: "Portos e terminais (ANTAQ)", on: true },
    { id: "aeroint", nome: "Aeroporto internacional", on: true },
    { id: "aeronac", nome: "Aeródromos nacionais", on: false }
  ];

  async function montar(raiz, params) {
    const F = t(ATLAS_CONFIG.fonte);
    raiz.innerHTML = `
    <section class="pagina pg-escoamento" aria-labelledby="tit-esc">
      <div class="cartoes" id="e-cartoes" aria-live="polite"></div>
      <div class="grade grade-3">
        <aside class="painel-esq cartao">
          <h2 id="tit-esc" class="titulo-secao">${t(ATLAS_CONFIG.rotulos.escoamento)}</h2>
          <p class="descricao">${t("Por onde passam as mercadorias com origem (exportação) ou destino (importação) na Bahia: vias de transporte e unidades da Receita Federal (URFs) de despacho.")}</p>
          <fieldset class="seletor-fluxo"><legend>${t("Fluxo")}</legend>
            ${FLUXOS.map(f => `<label class="opcao opcao-${f.toLowerCase()}"><input type="radio" name="e-fluxo" value="${f}"><span>${U.nomeFluxo[f]}</span></label>`).join("")}
          </fieldset>
          <label class="campo">${t("Ano")} <select id="e-ano"></select></label>
          <fieldset class="seletor-fundo"><legend>${t("Mapa de fundo")}</legend>
            <div class="segmentado">
              <label><input type="radio" name="e-fundo" value="claro"><span>${t("Mapa claro")}</span></label>
              <label><input type="radio" name="e-fundo" value="satelite"><span>${t("Satélite")}</span></label>
            </div>
          </fieldset>
          <div class="botoes-linha">
            <button type="button" class="btn btn-sec" id="e-bahia">${t("Aproximar na Bahia")}</button>
            <button type="button" class="btn btn-sec" id="e-brasil">${t("Ver o Brasil")}</button>
          </div>
          <fieldset class="camadas"><legend>${t("Camadas")}</legend>
            ${CAMADAS.map(c => `<label class="chk"><input type="checkbox" data-camada="${c.id}" ${c.on ? "checked" : ""}><i class="sim-${c.id}"></i>${t(c.nome)}</label>`).join("")}
          </fieldset>
          <details class="como-ler"><summary>${t("Como ler esta página")}</summary>
            <ul>
              <li>${t("<b>Círculos:</b> área proporcional ao valor despachado em cada local de URF, no ano e fluxo escolhidos. URFs no mesmo porto ou aeroporto aparecem juntas.")}</li>
              <li>${t("URFs <b>sem coordenada</b> não são posicionadas no mapa: estão listadas na nota abaixo do mapa e aparecem nos gráficos e na tabela.")}</li>
              <li>${t("<b>Sankey:</b> lê-se da esquerda para a direita — grupo de produtos → via de transporte → URF. A largura de cada faixa é o valor em US$ FOB. Cor das URFs: na Bahia, fora da Bahia ou UF não informada.")}</li>
              <li>${t("Esta página usa a base de <b>escoamento</b> (origem/destino da mercadoria), diferente da página Municípios (domicílio fiscal). As duas não devem ser somadas nem comparadas em valor total.")}</li>
            </ul>
          </details>
          <p class="atualizado" id="e-atualizado"></p>
        </aside>
        <div class="col-centro">
          <figure class="cartao cartao-mapa">
            <figcaption class="cartao-cab"><h3 id="e-tit-mapa">${t("Mapa")}</h3></figcaption>
            <div id="e-mapa" class="area-mapa"><p class="carregando">${t("Carregando mapa…")}</p></div>
            <p class="nota" id="e-sem-coord"></p>
            <p class="fonte">${F} ${t("Infraestrutura: DNIT/VGEO (ANTAQ, ANAC, SNV, ferrovias, dutovias) e rodovias estaduais 2021; limites IBGE.")}</p>
          </figure>
          <div class="cartao"><div id="e-faixa"></div><p class="fonte">${F}</p></div>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="e-tit-sk">${t("Fluxo: grupo → via → URF")}</h3></figcaption>
            <p class="explica">${t("<b>O que é este gráfico?</b> Um diagrama de Sankey mostra fluxos: cada faixa liga uma categoria à seguinte, e a largura da faixa é proporcional ao valor que passa por ela. Leia da esquerda para a direita: que grupo de produtos sai (ou entra), por qual via de transporte e por qual URF.")}</p>
            <div id="e-sankey" class="grafico"></div>
            <p class="legenda-html" id="e-leg-sk"></p>
            <p class="nota" id="e-nota-sk"></p><p class="fonte">${F}</p></figure>
        </div>
        <div class="col-graficos">
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="e-tit-vias">${t("Vias")}</h3></figcaption>
            <div id="e-vias" class="grafico"></div><p class="fonte">${F}</p></figure>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="e-tit-urf">URFs</h3></figcaption>
            <div id="e-urf" class="grafico"></div><p class="fonte">${F}</p></figure>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="e-tit-serie">${t("Série por via")}</h3></figcaption>
            <div id="e-serie" class="grafico"></div><p class="legenda-html" id="e-leg-serie"></p><p class="nota">${t("Valor de cada ano, sem acumular. Ponto vazado = ano parcial.")}</p><p class="fonte">${F}</p></figure>
          <figure class="cartao" id="e-box-desemb" hidden><figcaption class="cartao-cab"><h3>${t("Exportação marítima: porto na Bahia × porto fora da Bahia")}</h3></figcaption>
            <div id="e-desemb" class="grafico"></div><p class="legenda-html" id="e-leg-desemb"></p>
            <p class="nota">${t("Só 2023–2025, cada ano separado. \"Fora da Bahia\" = embarque em porto de outro estado (chamado de \"fuga de carga\" na planilha de origem). Totais conferidos com o fato_via_urf (exportação marítima).")}</p>
            <p class="fonte">${t("Fonte: planilha de conectividade (aba 4), a partir de Comex Stat (MDIC/SECEX) e tabela de URFs da Receita Federal.")}</p></figure>
        </div>
      </div>
      <section class="cartao cartao-tabela" aria-labelledby="e-tit-tab">
        <div class="cartao-cab tabela-cab"><h3 id="e-tit-tab">${t("Tabela das URFs")}</h3>
          <div class="tabela-acoes"><label class="campo campo-linha">${t("Filtrar")} <input id="e-filtro" type="search" placeholder="${t("URF, local ou UF")}"></label>
          <button type="button" class="btn" id="e-csv">${t("⬇ Baixar CSV")}</button></div></div>
        <div class="tabela-rolagem"><table class="tabela" id="e-tabela"></table></div>
        <p class="nota" id="e-nota-tab"></p><p class="fonte">${F}</p>
      </section>
      ${Rodape.html("escoamento")}
    </section>`;

    const $ = id => raiz.querySelector("#" + id);
    const meta = await U.json("data/meta.json");
    const ler = n => U.json(`data/geo/${n}.json`);
    const [dim, svias, uf, contorno, amaz, rodfed, rodest, ferro, duto, antaq, snv, aero] = await Promise.all([
      U.json("data/escoamento/urfs.json"), U.json("data/escoamento/series_vias.json"),
      ler("brasil_uf"), ler("contorno"), ler("amazonia_azul"), ler("rodovias_federais"), ler("rodovias_estaduais"),
      ler("ferrovias"), ler("dutovias"), ler("portos_antaq"), ler("portos_snv"), ler("aerodromos")]);
    const [rodInfo, desemb] = await Promise.all([ler("rodovias_info").catch(() => null), U.json("data/escoamento/desembaraco.json").catch(() => null)]);
    const URF = dim.urfs, G = meta.grupos.map(g => t(g));
    const VIA = new Proxy(dim.vias, { get: (o, k) => o[k] == null ? o[k] : t(o[k]) });

    const st = {
      ano: meta.anos.includes(+params.ano) ? +params.ano : meta.ano_padrao,
      fluxo: FLUXOS.includes((params.fluxo || "").toUpperCase()) ? params.fluxo.toUpperCase() : "EXP",
      fundo: params.fundo === "satelite" ? "satelite" : "claro",
      filtro: "", ordem: null
    };
    let dados = null;

    $("e-atualizado").textContent = U.atualizado(meta);
    $("e-ano").innerHTML = [...meta.anos].reverse().map(a => `<option value="${a}">${U.rotuloAno(a, meta)}</option>`).join("");

    // ---------- mapa ----------
    const mapa = AtlasMapa($("e-mapa"), { rotulo: t("Mapa do escoamento por URF"), minZoom: 2 });
    const cam = {};
    const gv = mapa.gVet;
    cam.uf = gv.append("g").attr("class", "c-uf"); cam.uf.selectAll("path").data(uf.features).join("path").attr("d", mapa.caminho);
    cam.amazonia = gv.append("g").attr("class", "c-amazonia"); cam.amazonia.selectAll("path").data(amaz.features).join("path").attr("d", mapa.caminho);
    cam.contorno = gv.append("g").attr("class", "c-contorno"); cam.contorno.append("path").datum(contorno.features[0]).attr("d", mapa.caminho);
    const linhas = (id, geo, rot) => {
      cam[id] = gv.append("g").attr("class", "c-linha c-" + id);
      cam[id].selectAll("path").data(geo.features).join("path").attr("d", mapa.caminho)
        .on("mousemove", (ev, d) => U.dica.mostrar(rot(d.properties), ev)).on("mouseleave", U.dica.esconder);
    };
    // Dica das rodovias: dados da aba 3 da planilha (somente 2025; nunca o acumulado de anos)
    const dicaRod = (cod, padrao, sup) => {
      const i = rodInfo && rodInfo.rodovias[cod];
      if (!i) return `<b>${cod || t(padrao)}</b><br>${sup || ""}`;
      const n = v => v == null ? "—" : U.int(v);
      const linha = (r, v) => `<dt>${r}</dt><dd>${v}</dd>`;
      const sin = i.esfera === "Federal"
        ? linha(t("Sinistros em 2025"), n(i.sin25)) + linha(t("Mortos em 2025"), n(i.mor25)) + linha(t("Feridos em 2025"), n(i.fer25))
        : `<dd class="sem-valor dl-inteira">${t("Sem dados abertos de sinistros para rodovias estaduais (a PRF só atua nas BRs).")}</dd>`;
      return `<b class="dica-t">${i.nome}</b><span class="dica-s">${t(i.esfera === "Federal" ? "Rodovia federal" : "Rodovia estadual")} · ${i.km != null ? U.int(i.km) + " km " + t("na Bahia") : ""}</span>
        <dl class="dica-dl">${sin}${linha(t("Pista"), t(i.pista))}${linha(t("Estado geral (CNT)"), t(i.cnt))}${linha(t("Pavimento (CNT)"), t(i.pavimento))}</dl>
        <span class="dica-s">${t("Corredor:")} ${t(i.corredor)}</span><span class="dica-s">${I18N.lang === "en" ? t("Fonte: planilha de conectividade (aba 3) – PRF, DNIT/SNV, CNT, SEINFRA-BA. Descrições traduzidas do português.") : t("Fonte: planilha de conectividade (aba 3) – PRF, DNIT/SNV, CNT, SEINFRA-BA.")}</span>`;
    };
    linhas("rodest", rodest, p => dicaRod(p.Codigo_Rod ? "BA-" + p.Codigo_Rod : "", "Rodovia estadual", p.Superficie));
    linhas("rodfed", rodfed, p => dicaRod(p.Codigo_BR ? "BR-" + p.Codigo_BR : "", "Rodovia federal", p.Superficie));
    linhas("ferro", ferro, p => `<b>${p.Linha || t("Ferrovia")}</b><br>${p.Concession || ""}`);
    linhas("duto", duto, p => `<b>${p.Nome_Duto || t("Dutovia")}</b><br>${[p.Categoria, p.Tipo_Mater].filter(Boolean).join(" · ")}`);
    const simbolos = [];
    const pontos = (id, feats, forma, rot) => {
      cam[id] = gv.append("g").attr("class", "c-pt c-" + id);
      const g = cam[id].selectAll("g").data(feats).join("g")
        .attr("data-xy", d => mapa.projetar(d.geometry.coordinates).join(","))
        .on("mousemove", (ev, d) => U.dica.mostrar(rot(d.properties), ev)).on("mouseleave", U.dica.esconder);
      forma(g); simbolos.push(g);
    };
    const quadrado = s => g => g.append("rect").attr("x", -s / 2).attr("y", -s / 2).attr("width", s).attr("height", s);
    pontos("antaq", antaq.features, quadrado(7), p => `<b>${p.Nome}</b><br>${p.Tipo} · ${p.Situacao}<br>${p.NM_MUN || ""} (ANTAQ)`);
    pontos("aeroint", aero.features.filter(f => f.properties.Tipo === "Aeroporto Internacional"),
      g => g.append("path").attr("d", "M0,-7 L6,5 L0,2 L-6,5 Z"), p => `<b>${p.Denominaca}</b><br>${t(p.Tipo)} · ${p.Codigo_OAC}<br>${p.NM_MUN}`);
    pontos("aeronac", aero.features.filter(f => f.properties.Tipo !== "Aeroporto Internacional"),
      g => g.append("circle").attr("r", 2.6), p => `<b>${p.Denominaca}</b><br>${t(p.Tipo)} · ${p.Codigo_OAC}<br>${p.NM_MUN}`);
    const gURF = gv.append("g").attr("class", "c-urf");
    let raioPx = () => 0;
    mapa.aoZoom(f => {
      simbolos.forEach(s => s.attr("transform", function () { const [x, y] = this.dataset.xy.split(","); return `translate(${x},${y}) scale(${1 / f})`; }));
      gURF.selectAll("circle").attr("r", d => raioPx(d.v) / f);
    });
    const aplicarCamadas = () => raiz.querySelectorAll("[data-camada]").forEach(c => cam[c.dataset.camada].style("display", c.checked ? null : "none"));
    raiz.querySelectorAll("[data-camada]").forEach(c => c.addEventListener("change", aplicarCamadas));
    aplicarCamadas();

    function setFundo(tipo) {
      st.fundo = tipo; gravar();
      raiz.querySelector(`input[name=e-fundo][value=${tipo}]`).checked = true;
      if (tipo === "satelite") mapa.setFundo(ATLAS_CONFIG.fundoSatelite);
      else { const f = ATLAS_CONFIG.fundoClaro; mapa.setFundo({ url: f.url, sub: f.sub, key: ATLAS_CONFIG.cartoKey, atribuicao: f.atribuicao, maxZoom: f.maxZoom }); }
    }
    raiz.querySelectorAll("input[name=e-fundo]").forEach(r => r.addEventListener("change", () => setFundo(r.value)));
    setFundo(st.fundo);
    mapa.enquadrar({ type: "FeatureCollection", features: uf.features });
    $("e-bahia").addEventListener("click", () => mapa.enquadrar(contorno, true));
    $("e-brasil").addEventListener("click", () => mapa.enquadrar({ type: "FeatureCollection", features: uf.features }, true));

    // ---------- componentes ----------
    const faixa = Faixa($("e-faixa"), { aoEscolher: a => mudar({ ano: a }) });
    const gVias = Graficos.barrasH($("e-vias"));
    const gUrf = Graficos.barrasH($("e-urf"));
    const gSerie = Graficos.linhas($("e-serie"));
    const gSk = Graficos.sankey($("e-sankey"));
    const gSkM = Graficos.empilhadoH($("e-sankey"));

    raiz.querySelectorAll("input[name=e-fluxo]").forEach(r => r.addEventListener("change", () => mudar({ fluxo: r.value })));
    $("e-ano").addEventListener("change", e => { faixa.parar(); mudar({ ano: +e.target.value }); });
    $("e-filtro").addEventListener("input", U.debounce(e => { st.filtro = U.semAcento(e.target.value); tabela(); }, 120));
    $("e-csv").addEventListener("click", baixarCSV);
    let largAnt = 0;
    window.addEventListener("resize", U.debounce(() => { const w = window.innerWidth; if (dados && (w < 700) !== (largAnt < 700)) sankey(); largAnt = w; }, 150));

    function gravar() { U.gravarHash("escoamento", { ano: st.ano, fluxo: st.fluxo, fundo: st.fundo === "satelite" ? "satelite" : null }); }

    async function mudar(novo) {
      Object.assign(st, novo); gravar();
      raiz.querySelector(`input[name=e-fluxo][value=${st.fluxo}]`).checked = true;
      $("e-ano").value = st.ano;
      raiz.querySelector(".pg-escoamento").classList.add("ocupado");
      try {
        dados = await U.json(`data/escoamento/${st.fluxo}_${st.ano}.json`);
        cartoes(); circulos(); faixaH(); vias(); urfs(); serie(); sankey(); tabela(); desembaraco();
      } catch (e) { console.error(e); $("e-cartoes").innerHTML = `<p class="erro">${t("Não foi possível carregar os dados. Recarregue a página.")}</p>`; }
      finally { raiz.querySelector(".pg-escoamento").classList.remove("ocupado"); }
    }

    const nomeURF = c => c === "DEMAIS" ? t("Demais URFs") : (URF[c] ? URF[c][0] : c);
    const localURF = c => URF[c] && URF[c][1] ? URF[c][1] : "";
    const ufURF = c => URF[c] ? URF[c][3] : "";
    const fmin = () => U.nomeFluxo[st.fluxo].toLowerCase();
    const corURF = c => c === "DEMAIS" ? CINZA : ufURF(c) === "BA" ? C.urfBA : ufURF(c) ? C.urfFora : C.urfSemUF;
    // cor por via (mais valiosa = tom mais forte), igual em todos os gráficos da página
    function coresVia() {
      const ord = dados.vias.map(v => v[0]);
      return c => { const i = ord.indexOf(c); return i >= 0 && i < 3 ? TONS[st.fluxo][i] : CINZA; };
    }

    function cartoes() {
      const r = U.rotuloAno(st.ano, meta), fl = U.nomeFluxo[st.fluxo];
      const ba = d3.sum(dados.urfs.filter(u => ufURF(u[0]) === "BA"), u => u[1]);
      const fora = d3.sum(dados.urfs.filter(u => ufURF(u[0]) && ufURF(u[0]) !== "BA"), u => u[1]);
      const v0 = dados.vias[0];
      const cs = [
        [t`${fl} em ${r} (escoamento)`, U.usdMi(dados.total), U.usd(dados.total)],
        [t("Variação"), U.pct(dados.var), U.textoBase(st.ano, meta), dados.var > 0 ? "sobe" : dados.var < 0 ? "desce" : ""],
        [t("Principal via"), v0 ? VIA[v0[0]] : "—", v0 ? t`${U.pct(v0[2], false)} do valor · ${dados.vias.length} vias usadas` : ""],
        [t("Por URFs na Bahia"), U.pct(ba / dados.total * 100, false), t`fora da Bahia: ${U.pct(fora / dados.total * 100, false)} · UF não informada: ${U.pct((dados.total - ba - fora) / dados.total * 100, false)}`]
      ];
      $("e-cartoes").innerHTML = cs.map(([ti, v, s, cls], i) => `<div class="kpi cartao ${st.fluxo.toLowerCase()}"><p class="kpi-t">${ti}</p><p class="kpi-v ${cls || ""} ${i === 2 ? "kpi-texto" : ""}">${v}</p><p class="kpi-s">${s}</p></div>`).join("");
    }

    function circulos() {
      const r = U.rotuloAno(st.ano, meta);
      // URFs no mesmo local (mesma coordenada) viram um só círculo; mesmo ano e mesmo fluxo
      const loc = new Map();
      dados.urfs.forEach(([c, v, vr, p]) => {
        const u = URF[c]; if (!u || u[4] == null) return;
        const k = u[4] + "," + u[5];
        if (!loc.has(k)) loc.set(k, { k, lat: u[4], lon: u[5], local: u[1], uf: u[3], v: 0, itens: [] });
        const o = loc.get(k); o.v += v; o.itens.push({ c, v, vr, p, prec: u[6] });
      });
      const pts = [...loc.values()].sort((a, b) => b.v - a.v);
      const max = d3.max(pts, d => d.v) || 1;
      const esc = d3.scaleSqrt().domain([0, max]).range([0, 34]);
      raioPx = v => Math.max(2.5, esc(v));
      const f = mapa.fator();
      gURF.selectAll("circle").data(pts, d => d.k).join("circle")
        .attr("cx", d => mapa.projetar([d.lon, d.lat])[0]).attr("cy", d => mapa.projetar([d.lon, d.lat])[1])
        .attr("r", d => raioPx(d.v) / f).attr("fill", U.corFluxo(st.fluxo))
        .on("mousemove", (ev, d) => U.dica.mostrar(`<b class="dica-t">${d.local}</b><span class="dica-s">${d.uf} · ${U.nomeFluxo[st.fluxo]} ${r}</span>
          <table>${d.itens.map(i => `<tr><td>${nomeURF(i.c)}${i.prec === "inferido-nome" ? " *" : ""}</td><td>${U.usd(i.v)}</td><td>${U.pct(i.p, false)}</td></tr>`).join("")}
          ${d.itens.length > 1 ? `<tr class="saldo"><td>${t("Total no local")}</td><td>${U.usd(d.v)}</td><td>${U.pct(d.v / dados.total * 100, false)}</td></tr>` : ""}</table>
          ${d.itens.some(i => i.prec === "inferido-nome") ? `<span class="dica-s">${t("* coordenada inferida pelo nome da URF")}</span>` : ""}
          <span class="dica-s">${t("% = participação no fluxo do ano")}</span>`, ev))
        .on("mouseleave", U.dica.esconder);
      const ref = [max, max / 4, max / 20].map(v => +v.toPrecision(1));
      mapa.legenda(`<p class="leg-t">${t`${U.nomeFluxo[st.fluxo]} por local de URF — ${r}`}</p>
        <div class="leg-circulos">${ref.map(v => `<span><svg width="${2 * esc(v) + 4}" height="${2 * esc(v) + 4}"><circle cx="${esc(v) + 2}" cy="${esc(v) + 2}" r="${esc(v)}" fill="${U.corFluxo(st.fluxo)}" fill-opacity=".55" stroke="#fff"/></svg>${U.eixo(v)}</span>`).join("")}</div>
        <p class="leg-n">${t("Área do círculo proporcional ao valor (US$ FOB).")}</p>`);
      $("e-tit-mapa").textContent = t`${U.nomeFluxo[st.fluxo]} por local de despacho (URF) — ${r}`;
      mapa.svg.attr("aria-label", t`Mapa do Brasil com círculos proporcionais ao valor de ${fmin()} da Bahia por local de URF em ${r}. Maiores: ${pts.slice(0, 3).map(p => `${p.local} (${U.usd(p.v)})`).join("; ")}.`);
      const sem = dados.sem_coord;
      const vs = d3.sum(sem, s => s[1]);
      $("e-sem-coord").innerHTML = sem.length ? `<details><summary>${t`<b>${sem.length} URFs sem coordenada</b> (${U.pct(vs / dados.total * 100, false)} do valor) não aparecem no mapa — ver lista`}</summary>${sem.map(([c, v]) => `${nomeURF(c)} (${U.eixo(v)})`).join("; ")}. ${t("Elas continuam nos gráficos e na tabela.")}</details>` : t("Todas as URFs com valor neste ano têm coordenada.");
    }

    function faixaH() {
      const valores = {}; meta.anos.forEach(a => valores[a] = meta.serie_escoamento[st.fluxo][a].v);
      faixa.atualizar({ anos: meta.anos, valores, parcial: meta.ano_parcial, cor: () => U.corFluxo(st.fluxo), meta,
        titulo: t`Escoamento — ${fmin()} por ano (US$ FOB). Clique numa barra para trocar o ano. * ${U.rotuloParcial(meta)}` }, st.ano);
    }

    function vias() {
      const cv = coresVia();
      $("e-tit-vias").textContent = t`Valor por via — ${fmin()} ${U.rotuloAno(st.ano, meta)}`;
      gVias.atualizar({ rotulo: $("e-tit-vias").textContent,
        itens: dados.vias.map(([c, v, p, vr]) => ({ rotulo: VIA[c] || c, valor: v, cor: cv(c), extra: `${t`${U.pct(p, false)} do total`} · ${U.pct(vr)} ${U.textoBase(st.ano, meta)}` })) });
    }

    function urfs() {
      const N = 15;
      const itens = dados.urfs.slice(0, N).map(([c, v, vr, p]) => ({ rotulo: nomeURF(c), valor: v, cor: U.corFluxo(st.fluxo),
        extra: `${localURF(c) ? localURF(c) + " · " : ""}${ufURF(c) || t("UF não informada")}<br>${t`${U.pct(p, false)} do total`} · ${U.pct(vr)} ${U.textoBase(st.ano, meta)}` }));
      const resto = dados.urfs.slice(N);
      if (resto.length) itens.push({ rotulo: t`Demais URFs (${resto.length})`, valor: d3.sum(resto, u => u[1]), demais: true });
      $("e-tit-urf").textContent = t`Maiores URFs — ${fmin()} ${U.rotuloAno(st.ano, meta)}`;
      gUrf.atualizar({ itens, rotulo: $("e-tit-urf").textContent });
    }

    function serie() {
      const s = svias.series[st.fluxo], anos = svias.anos;
      const ord = Object.entries(s).map(([c, vs]) => [c, d3.sum(vs)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
      const top = ord.slice(0, 3), resto = ord.slice(3);
      const linhas = top.map((c, i) => ({ nome: VIA[c], cor: TONS[st.fluxo][i], valores: s[c] }));
      if (resto.length) linhas.push({ nome: t("Demais vias"), cor: CINZA, tracejado: true, valores: anos.map((_, i) => d3.sum(resto, c => s[c][i])) });
      $("e-tit-serie").textContent = t`Série histórica por via — ${fmin()}`;
      gSerie.atualizar({ anos, meta, anoAtivo: st.ano, linhas, rotulo: $("e-tit-serie").textContent });
      $("e-leg-serie").innerHTML = linhas.map(l => `<span><i style="background:${l.cor}"></i>${l.nome}</span>`).join("");
    }

    function sankey() {
      const sk = dados.sankey, r = U.rotuloAno(st.ano, meta);
      const nomeG = g => g === -1 ? t("Demais grupos") : G[g];
      const corG = g => g === -1 ? C.demaisGrupos : C.grupos[g];
      const celular = window.innerWidth < 700;
      largAnt = window.innerWidth;
      $("e-tit-sk").textContent = celular ? t`Grupo de produtos × via — ${fmin()} ${r}` : t`Grupo de produtos → via → URF — ${fmin()} ${r}`;
      if (celular) {
        gSk.limpar();
        const cv = coresVia();
        const porG = d3.group(sk.gv, l => l[0]);
        const linhas = [...sk.grupos, -1].filter(g => porG.has(g)).map(g => ({ rotulo: nomeG(g),
          partes: porG.get(g).sort((a, b) => b[2] - a[2]).map(([, v, val]) => ({ nome: VIA[v], cor: cv(v), v: val })) }));
        gSkM.atualizar({ linhas, total: dados.total, rotulo: $("e-tit-sk").textContent,
          legenda: dados.vias.slice(0, 3).map(v => ({ nome: VIA[v[0]], cor: cv(v[0]) })).concat(dados.vias.length > 3 ? [{ nome: t("Demais vias"), cor: CINZA }] : []) });
        $("e-leg-sk").innerHTML = "";
        $("e-nota-sk").textContent = t("Em telas pequenas, o diagrama de fluxo é substituído por barras empilhadas: cada barra é um grupo de produtos, dividida pelas vias de transporte.");
        return;
      }
      gSkM.limpar();
      const vias = [...new Set(sk.gv.map(l => l[1]))].sort((a, b) => d3.sum(sk.gv.filter(l => l[1] === b), l => l[2]) - d3.sum(sk.gv.filter(l => l[1] === a), l => l[2]));
      const urfsN = [...sk.urfs, "DEMAIS"].filter(u => sk.vu.some(l => l[1] === u));
      const nos = [
        ...[...sk.grupos, -1].filter(g => sk.gv.some(l => l[0] === g)).map(g => ({ id: "g" + g, nome: nomeG(g), cor: corG(g), col: 0 })),
        ...vias.map(v => ({ id: "v" + v, nome: VIA[v] || v, cor: C.via, col: 1 })),
        ...urfsN.map(u => ({ id: "u" + u, nome: nomeURF(u) + (localURF(u) && u !== "DEMAIS" ? "" : ""), cor: corURF(u), col: 2 }))
      ];
      const links = [
        ...sk.gv.map(([g, v, val]) => ({ s: "g" + g, t: "v" + v, v: val, cor: corG(g) })),
        ...sk.vu.map(([v, u, val]) => ({ s: "v" + v, t: "u" + u, v: val, cor: corURF(u) }))
      ];
      gSk.atualizar({ nos, links, total: dados.total, rotulo: t`Diagrama de Sankey: ${fmin()} ${r} por grupo de produtos, via e URF` });
      $("e-leg-sk").innerHTML = `<span><i style="background:${C.urfBA}"></i>${t("URF na Bahia")}</span><span><i style="background:${C.urfFora}"></i>${t("URF fora da Bahia")}</span><span><i style="background:${C.urfSemUF}"></i>${t("UF não informada")}</span><span><i style="background:${CINZA}"></i>${t("Demais URFs")}</span>`;
      $("e-nota-sk").textContent = t("Mostra os 6 maiores grupos (os demais somados), todas as vias e as 8 maiores URFs (as demais somadas). Largura = valor US$ FOB. Passe o mouse para ver o valor e o % do fluxo do ano.");
    }

    // ---------- porto na Bahia × fora (aba 4 da planilha; só exportação marítima 2023–2025) ----------
    function desembaraco() {
      const box = $("e-box-desemb");
      if (!desemb) { box.hidden = true; return; }
      box.hidden = false;
      const el = $("e-desemb");
      if (st.fluxo !== "EXP") { el.innerHTML = `<p class="grafico-vazio">${t("Disponível só para a exportação (a planilha trata apenas de embarques marítimos de exportação).")}</p>`; $("e-leg-desemb").innerHTML = ""; return; }
      const cores = { local: "#A83F12", fora: "#F8C9A0" };
      const W = U.largura(el), s = U.escalaTexto(), H = Math.round(200 * Math.sqrt(s)), m = { t: 10, r: 8, b: 24 * s, l: 48 * s };
      const anos = desemb.anos.map(a => a.ano);
      const x = d3.scaleBand().domain(anos).range([m.l, W - m.r]).paddingInner(0.3);
      const x2 = d3.scaleBand().domain(["local", "fora"]).range([0, x.bandwidth()]).paddingInner(0.08);
      const y = d3.scaleLinear().domain([0, d3.max(desemb.anos, a => Math.max(a.local[0], a.fora[0]))]).nice(4).range([H - m.b, m.t]);
      el.innerHTML = "";
      const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", t("Exportação marítima: porto na Bahia × porto fora da Bahia"));
      svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(U.eixo).tickSize(-(W - m.l - m.r))).call(g => g.select(".domain").remove());
      svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(0)).call(g => g.select(".domain").remove())
        .selectAll("text").attr("font-weight", d => d === st.ano ? 700 : 400);
      const nomeT = { local: t("Porto na Bahia"), fora: t("Porto fora da Bahia") };
      desemb.anos.forEach(a => {
        const tot = a.local[0] + a.fora[0];
        ["local", "fora"].forEach(k => svg.append("rect").attr("x", x(a.ano) + x2(k)).attr("width", x2.bandwidth())
          .attr("y", y(a[k][0])).attr("height", y(0) - y(a[k][0])).attr("fill", cores[k]).attr("opacity", a.ano === st.ano || !anos.includes(st.ano) ? 1 : 0.55)
          .on("mousemove", ev => U.dica.mostrar(`<b>${a.ano} · ${nomeT[k]}</b><br>${U.usd(a[k][0])}<br>${t`${U.pct(a[k][0] / tot * 100, false)} da exportação marítima do ano`}<br>${t`Peso: ${U.int(a[k][1] / 1000)} t`}` +
            (k === "fora" ? `<br><span class="dica-s">${t("Principais portos fora da Bahia:")} ${a.top_fora.map(([c, v]) => `${URF[c] ? URF[c][0] : c} (${U.eixo(v)})`).join("; ")}</span>` : ""), ev))
          .on("mouseleave", U.dica.esconder));
        svg.append("text").attr("class", "rank-valor").attr("x", x(a.ano) + x.bandwidth() / 2).attr("y", m.t + 2).attr("text-anchor", "middle")
          .text(t`${U.pct(a.fora[0] / tot * 100, false)} fora`);
      });
      $("e-leg-desemb").innerHTML = `<span><i style="background:${cores.local}"></i>${nomeT.local}</span><span><i style="background:${cores.fora}"></i>${nomeT.fora}</span>`;
    }

    // ---------- tabela ----------
    const colunasF = () => [
      { k: "nome", t: "URF", txt: true }, { k: "local", t: t("Local"), txt: true }, { k: "uf", t: "UF", txt: true },
      { k: "v", t: t("Valor (US$)"), f: U.int }, { k: "vr", t: t("Var. %"), f: v => U.pct(v) }, { k: "p", t: t("Participação %"), f: v => U.pct(v, false) },
      { k: "mapa", t: t("No mapa"), txt: true }
    ];
    function linhasTab() {
      return dados.urfs.map(([c, v, vr, p]) => ({ c, nome: nomeURF(c), oficial: URF[c] ? URF[c][7] : c, local: localURF(c), uf: ufURF(c) || "—", v, vr, p,
        mapa: URF[c] && URF[c][4] != null ? (URF[c][6] === "inferido-nome" ? t("sim (inferida)") : t("sim")) : t("sem coordenada") }));
    }
    function tabela() {
      const ord = st.ordem || { k: "v", desc: true };
      const colunas = colunasF();
      let ls = linhasTab().sort((a, b) => {
        const x = a[ord.k], y = b[ord.k];
        if (typeof x === "string") return ord.desc ? y.localeCompare(x, "pt") : x.localeCompare(y, "pt");
        return ord.desc ? (y ?? -Infinity) - (x ?? -Infinity) : (x ?? Infinity) - (y ?? Infinity);
      });
      const total = ls.length;
      if (st.filtro) ls = ls.filter(l => U.semAcento(`${l.nome} ${l.oficial} ${l.local} ${l.uf}`).includes(st.filtro));
      $("e-tabela").innerHTML = `<caption class="sr-only">${t`URFs de despacho em ${U.rotuloAno(st.ano, meta)}`}</caption>
        <thead><tr>${colunas.map(c => `<th scope="col" aria-sort="${ord.k === c.k ? (ord.desc ? "descending" : "ascending") : "none"}" class="${c.txt ? "" : "num"}"><button type="button" data-k="${c.k}">${c.t}${ord.k === c.k ? (ord.desc ? " ▼" : " ▲") : ""}</button></th>`).join("")}</tr></thead>
        <tbody>${ls.map(l => `<tr>${colunas.map((c, i) => i === 0 ? `<th scope="row" title="${l.oficial}">${l.nome}</th>` : c.txt ? `<td>${l[c.k]}</td>` : `<td class="num">${c.f(l[c.k])}</td>`).join("")}</tr>`).join("")}</tbody>`;
      $("e-tabela").querySelectorAll("thead button").forEach(b => b.addEventListener("click", () => {
        const k = b.dataset.k; st.ordem = { k, desc: ord.k === k ? !ord.desc : !["nome", "local", "uf", "mapa"].includes(k) }; tabela();
      }));
      $("e-nota-tab").textContent = t`${total} URFs com ${fmin()} em ${U.rotuloAno(st.ano, meta)}. Variação ${U.textoBase(st.ano, meta)}. Passe o mouse no nome para ver o nome oficial da Receita Federal.`;
    }
    function baixarCSV() {
      const cab = ["cod_urf", "urf_nome_oficial", "local", "uf", "ano", "fluxo", "valor_usd_fob", "var_pct", "participacao_pct", "no_mapa"];
      U.baixarCSV(`atlas-austral_escoamento_${st.fluxo}_${st.ano}.csv`, cab,
        linhasTab().map(l => [l.c, l.oficial, l.local, l.uf, U.rotuloAno(st.ano, meta), U.nomeFluxo[st.fluxo], U.numCSV(l.v), U.pctCSV(l.vr), U.pctCSV(l.p), l.mapa]));
    }

    await mudar({});
  }

  window.PaginaEscoamento = { montar };
})();
