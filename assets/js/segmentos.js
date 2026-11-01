/* Página SEGMENTOS – grupo de produtos dominante por município (base: domicílio fiscal) */
(function () {
  const C = ATLAS_CONFIG.cores;
  const FLUXOS = ["EXP", "IMP"];

  async function montar(raiz, params) {
    const F = t(ATLAS_CONFIG.fonte);
    raiz.innerHTML = `
    <section class="pagina pg-segmentos" aria-labelledby="tit-seg">
      <div class="cartoes" id="s-cartoes" aria-live="polite"></div>
      <div class="grade grade-3">
        <aside class="painel-esq cartao">
          <h2 id="tit-seg" class="titulo-secao">${t(ATLAS_CONFIG.rotulos.segmentos)}</h2>
          <p class="descricao">${t("O que a Bahia exporta e importa: cada município colorido pelo grupo de produtos de maior valor no ano. Um fluxo e um ano por vez.")}</p>
          <fieldset class="seletor-fluxo"><legend>${t("Fluxo")}</legend>
            ${FLUXOS.map(f => `<label class="opcao opcao-${f.toLowerCase()}"><input type="radio" name="s-fluxo" value="${f}"><span>${U.nomeFluxo[f]}</span></label>`).join("")}
          </fieldset>
          <label class="campo">${t("Ano")} <select id="s-ano"></select></label>
          <label class="campo">${t("Buscar município")}
            <input id="s-busca" type="search" list="s-lista-mun" placeholder="${t("Digite o nome…")}" autocomplete="off"></label>
          <datalist id="s-lista-mun"></datalist>
          <div id="s-selecionado" class="selecionado" aria-live="polite"></div>
          <fieldset class="lista-grupos"><legend>${t("Grupo em destaque")}</legend><div id="s-grupos"></div></fieldset>
          <details class="como-ler"><summary>${t("Como ler esta página")}</summary>
            <ul>
              <li>${t("<b>Cor do município:</b> o grupo de produtos com maior valor no ano e fluxo escolhidos. Branco = sem valor no período.")}</li>
              <li>${t("<b>Grupos:</b> 10 grupos montados a partir dos segmentos (SH4); produtos sem segmento são agrupados pelo capítulo SH2.")}</li>
              <li>${t("Escolha um <b>grupo</b> na lista para destacá-lo no mapa e ver os produtos (SH4) que mais pesam nele.")}</li>
              <li>${t("As barras <b>100%</b> mostram como a composição mudou ano a ano (cada ano soma 100%; anos não são somados).")}</li>
              <li>${t("Base: <b>domicílio fiscal</b> da empresa (a mesma da página Municípios).")}</li>
            </ul>
          </details>
          <p class="atualizado" id="s-atualizado"></p>
        </aside>
        <div class="col-centro">
          <figure class="cartao cartao-mapa">
            <figcaption class="cartao-cab"><h3 id="s-tit-mapa">${t("Mapa")}</h3></figcaption>
            <div id="s-mapa" class="area-mapa"><p class="carregando">${t("Carregando mapa…")}</p></div>
            <p class="sr-only" id="s-resumo" aria-live="polite"></p>
            <p class="fonte">${F}</p>
          </figure>
          <div class="cartao"><div id="s-faixa"></div><p class="fonte">${F}</p></div>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="s-tit-comp">${t("Composição por grupo ao longo dos anos")}</h3></figcaption>
            <div id="s-comp" class="grafico"></div><p class="legenda-html" id="s-leg-comp"></p><p class="nota">${t("Cada barra é um ano e soma 100%. Clique numa barra para ir ao ano. Ano parcial hachurado.")}</p><p class="fonte">${F}</p></figure>
        </div>
        <div class="col-graficos">
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="s-tit-seg">${t("Segmentos")}</h3></figcaption>
            <div id="s-seg" class="grafico"></div>
            <div class="botoes-csv">
              <button type="button" class="btn" id="s-csv-seg">${t("⬇ CSV: segmentos e grupos")}</button>
              <button type="button" class="btn" id="s-csv-mun">${t("⬇ CSV: municípios")}</button>
            </div>
            <p class="nota">${t("Os arquivos trazem o ano e o fluxo escolhidos. Abrem direto no Excel.")}</p>
            <p class="fonte">${F}</p></figure>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="s-tit-prod">${t("Produtos")}</h3></figcaption>
            <div id="s-prod" class="grafico"></div><p class="nota" id="s-nota-prod"></p>
            <details class="lista-seg"><summary>${t("Ver todos os segmentos por grupo")}</summary>
              <label class="campo campo-linha">${t("Grupo")} <select id="s-sel-grupo"></select></label>
              <table class="tabela tabela-mini" id="s-tab-seg"></table>
            </details>
            <p class="fonte">${F}</p></figure>
        </div>
      </div>
      ${Rodape.html("segmentos")}
    </section>`;

    const $ = id => raiz.querySelector("#" + id);
    const meta = await U.json("data/meta.json");
    const [geo, contorno, comp, sh4en] = await Promise.all([
      U.json("data/geo/municipios.json"), U.json("data/geo/contorno.json"), U.json("data/segmentos/composicao.json"),
      I18N.lang === "en" ? U.json("data/segmentos/sh4_en.json").catch(() => null) : Promise.resolve(null)]);
    const G = meta.grupos.map(g => t(g)), cor = i => C.grupos[i];
    const nomeProd = (sh4, n) => (sh4en && sh4en[sh4]) || n;
    const nomes = Object.fromEntries(geo.features.map(f => [f.properties.CD_MUN, f.properties.NM_MUN]));
    const porNome = Object.fromEntries(geo.features.map(f => [U.semAcento(f.properties.NM_MUN), f.properties.CD_MUN]));

    const st = {
      ano: meta.anos.includes(+params.ano) ? +params.ano : meta.ano_padrao,
      fluxo: FLUXOS.includes((params.fluxo || "").toUpperCase()) ? params.fluxo.toUpperCase() : "EXP",
      grupo: params.grupo !== undefined && G[+params.grupo] ? +params.grupo : null,
      mun: nomes[params.mun] ? params.mun : null
    };
    let dados = null, idx = {};
    const fmin = () => U.nomeFluxo[st.fluxo].toLowerCase();
    const pctPeq = p => p > 0 && p < 0.1 ? (I18N.lang === "en" ? "<0.1%" : "<0,1%") : U.pct(p, false);

    $("s-atualizado").textContent = U.atualizado(meta);
    $("s-ano").innerHTML = [...meta.anos].reverse().map(a => `<option value="${a}">${U.rotuloAno(a, meta)}</option>`).join("");
    $("s-lista-mun").innerHTML = Object.values(nomes).sort((a, b) => a.localeCompare(b, "pt")).map(n => `<option value="${n}">`).join("");

    // mapa
    const mapa = AtlasMapa($("s-mapa"), { rotulo: t("Mapa do grupo de produtos dominante por município") });
    const fc = ATLAS_CONFIG.fundoClaro;
    mapa.setFundo({ url: fc.url, sub: fc.sub, key: ATLAS_CONFIG.cartoKey, atribuicao: fc.atribuicao, maxZoom: fc.maxZoom });
    const caminhos = mapa.gVet.append("g").selectAll("path").data(geo.features).join("path")
      .attr("d", mapa.caminho).attr("class", "mun")
      .on("mousemove", (ev, d) => { d3.select(ev.currentTarget).raise().classed("hover", true); U.dica.mostrar(dica(d.properties.CD_MUN), ev); })
      .on("mouseleave", ev => { d3.select(ev.currentTarget).classed("hover", false); U.dica.esconder(); })
      .on("click", (ev, d) => selecionar(d.properties.CD_MUN === st.mun ? null : d.properties.CD_MUN));
    mapa.gVet.append("path").datum(contorno.features[0]).attr("class", "contorno").attr("d", mapa.caminho);
    mapa.enquadrar(contorno);

    const faixa = Faixa($("s-faixa"), { aoEscolher: a => mudar({ ano: a }) });
    const gComp = Graficos.empilhado100($("s-comp"), { aoClicar: a => mudar({ ano: a }) });
    const gSeg = Graficos.barrasH($("s-seg"));
    const gProd = Graficos.barrasH($("s-prod"));

    raiz.querySelectorAll("input[name=s-fluxo]").forEach(r => r.addEventListener("change", () => mudar({ fluxo: r.value })));
    $("s-ano").addEventListener("change", e => { faixa.parar(); mudar({ ano: +e.target.value }); });
    const buscar = e => {
      const q = U.semAcento(e.target.value.trim()); if (!q) return;
      const cod = porNome[q] || Object.entries(porNome).find(([n]) => n.startsWith(q))?.[1];
      if (cod) { selecionar(cod); mapa.enquadrar(geo.features.find(f => f.properties.CD_MUN === cod), true); e.target.value = ""; }
    };
    $("s-busca").addEventListener("change", buscar);
    $("s-busca").addEventListener("keydown", e => { if (e.key === "Enter") buscar(e); });

    // ---------- downloads (ano e fluxo escolhidos) ----------
    const en = I18N.lang === "en";
    $("s-csv-seg").addEventListener("click", () => {
      const rot = U.rotuloAno(st.ano, meta), fl = U.nomeFluxo[st.fluxo];
      const linhas = [];
      dados.grupos.forEach(([g, tg]) => {
        if (!tg) return;
        const segs = dados.segmentos.filter(x => x[3] === g);
        segs.forEach(([n, v]) => linhas.push([rot, fl, G[g], t(n), U.numCSV(v), U.pctCSV(v / dados.total * 100), U.pctCSV(v / tg * 100)]));
        const resto = tg - d3.sum(segs, x => x[1]);
        if (resto > 0) linhas.push([rot, fl, G[g], t("Demais produtos (classificados pelo capítulo SH2)"), U.numCSV(resto), U.pctCSV(resto / dados.total * 100), U.pctCSV(resto / tg * 100)]);
      });
      const cab = en ? ["year", "flow", "group", "segment", "value_usd_fob", "share_of_total_pct", "share_of_group_pct"]
                     : ["ano", "fluxo", "grupo", "segmento", "valor_usd_fob", "participacao_total_pct", "participacao_grupo_pct"];
      U.baixarCSV(`atlas-austral_segmentos_${st.fluxo}_${st.ano}.csv`, cab, linhas);
    });
    $("s-csv-mun").addEventListener("click", () => {
      const rot = U.rotuloAno(st.ano, meta), fl = U.nomeFluxo[st.fluxo];
      const linhas = dados.mun.map(([cod, v, gd, top]) => {
        const l = [cod, nomes[cod], rot, fl, U.numCSV(v), G[gd]];
        for (let k = 0; k < 3; k++) { const x = top[k]; l.push(x ? G[x[0]] : "", x ? U.pctCSV(x[1]) : ""); }
        return l;
      });
      const cab = en ? ["cod_mun", "municipality", "year", "flow", "value_usd_fob", "dominant_group", "group_1", "group_1_pct", "group_2", "group_2_pct", "group_3", "group_3_pct"]
                     : ["cod_mun", "municipio", "ano", "fluxo", "valor_usd_fob", "grupo_dominante", "grupo_1", "grupo_1_pct", "grupo_2", "grupo_2_pct", "grupo_3", "grupo_3_pct"];
      U.baixarCSV(`atlas-austral_segmentos_municipios_${st.fluxo}_${st.ano}.csv`, cab, linhas);
    });

    function gravar() { U.gravarHash("segmentos", { ano: st.ano, fluxo: st.fluxo, grupo: st.grupo, mun: st.mun }); }
    function selecionar(cod) { st.mun = cod; gravar(); painelMun(); caminhos.classed("selecionado", d => d.properties.CD_MUN === st.mun); }
    function escolherGrupo(g) { st.grupo = st.grupo === g ? null : g; gravar(); botoesGrupos(); colorir(); produtos(); composicao(); listaSegmentos(); }
    $("s-sel-grupo").innerHTML = G.map((n, i) => `<option value="${i}">${n}</option>`).join("");
    $("s-sel-grupo").addEventListener("change", () => listaSegmentos(+$("s-sel-grupo").value));
    // Todos os segmentos de um grupo, no ano e fluxo escolhidos ("Demais produtos" = parte classificada pelo capítulo SH2)
    function listaSegmentos(gEscolhido) {
      const g = gEscolhido != null ? gEscolhido : (st.grupo != null ? st.grupo : [...dados.grupos].sort((a, b) => b[1] - a[1])[0][0]);
      $("s-sel-grupo").value = g;
      const totG = (dados.grupos.find(x => x[0] === g) || [0, 0])[1];
      const segs = dados.segmentos.filter(x => x[3] === g).map(x => [t(x[0]), x[1]]);
      const resto = totG - d3.sum(segs, x => x[1]);
      if (resto > 0) segs.push([t("Demais produtos (classificados pelo capítulo SH2)"), resto]);
      segs.sort((a, b) => b[1] - a[1]);
      $("s-tab-seg").innerHTML = `<thead><tr><th scope="col">${t("Segmento")}</th><th scope="col" class="num">${t("Valor (US$)")}</th><th scope="col" class="num">${t("% do grupo")}</th></tr></thead>
        <tbody>${segs.length ? segs.map(([n, v]) => `<tr><th scope="row">${n}</th><td class="num">${U.int(v)}</td><td class="num">${U.pct(v / totG * 100, false)}</td></tr>`).join("")
          : `<tr><td colspan="3">${t`Sem ${fmin()} deste grupo em ${U.rotuloAno(st.ano, meta)}.`}</td></tr>`}</tbody>`;
    }

    async function mudar(novo) {
      Object.assign(st, novo); gravar();
      raiz.querySelector(`input[name=s-fluxo][value=${st.fluxo}]`).checked = true;
      $("s-ano").value = st.ano;
      raiz.querySelector(".pg-segmentos").classList.add("ocupado");
      try {
        dados = await U.json(`data/segmentos/${st.fluxo}_${st.ano}.json`);
        idx = Object.fromEntries(dados.mun.map(m => [m[0], m]));
        cartoes(); botoesGrupos(); colorir(); painelMun(); faixaH(); composicao(); segmentos(); produtos(); listaSegmentos();
      } catch (e) { console.error(e); $("s-cartoes").innerHTML = `<p class="erro">${t("Não foi possível carregar os dados. Recarregue a página.")}</p>`; }
      finally { raiz.querySelector(".pg-segmentos").classList.remove("ocupado"); }
    }

    function cartoes() {
      const r = U.rotuloAno(st.ano, meta);
      const gs = [...dados.grupos].sort((a, b) => b[1] - a[1]);
      const sg = dados.segmentos.filter(s => s[0] !== "Demais produtos")[0];
      const cs = [
        [t`${U.nomeFluxo[st.fluxo]} em ${r}`, U.usdMi(dados.total), U.usd(dados.total)],
        [t("Principal grupo"), G[gs[0][0]], t`${U.pct(gs[0][2], false)} do total`],
        [t("Principal segmento"), sg ? t(sg[0]) : "—", sg ? t`${U.pct(sg[2], false)} do total` : ""],
        [t`Municípios com ${fmin()}`, U.int(dados.mun.length), t("de 417 municípios")]
      ];
      $("s-cartoes").innerHTML = cs.map(([ti, v, s], i) => `<div class="kpi cartao ${st.fluxo.toLowerCase()}"><p class="kpi-t">${ti}</p><p class="kpi-v ${i === 1 || i === 2 ? "kpi-texto" : ""}">${v}</p><p class="kpi-s">${s}</p></div>`).join("");
    }

    function botoesGrupos() {
      const val = Object.fromEntries(dados.grupos.map(g => [g[0], g]));
      $("s-grupos").innerHTML = G.map((nome, i) => `<button type="button" class="btn-grupo ${st.grupo === i ? "ativo" : ""}" aria-pressed="${st.grupo === i}" data-g="${i}">
        <i style="background:${cor(i)}"></i><span>${nome}</span><b>${U.pct(val[i] ? val[i][2] : 0, false)}</b></button>`).join("") +
        (st.grupo != null ? `<button type="button" class="btn-link" id="s-todos">${t("mostrar todos os grupos")}</button>` : "");
      $("s-grupos").querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => escolherGrupo(+b.dataset.g)));
      const tb = $("s-grupos").querySelector("#s-todos"); if (tb) tb.addEventListener("click", () => escolherGrupo(st.grupo));
    }

    function colorir() {
      const r = U.rotuloAno(st.ano, meta);
      caminhos.attr("fill", d => { const m = idx[d.properties.CD_MUN]; return m ? cor(m[2]) : C.semValor; })
        .style("fill-opacity", d => { const m = idx[d.properties.CD_MUN]; return (st.grupo == null || (m && m[2] === st.grupo)) ? 0.93 : 0.15; })
        .classed("selecionado", d => d.properties.CD_MUN === st.mun);
      const presentes = new Set(dados.mun.map(m => m[2]));
      mapa.legenda(`<p class="leg-t">${t`Grupo dominante — ${fmin()} ${r}`}</p>` +
        G.map((n, i) => presentes.has(i) ? `<p><i style="background:${cor(i)}"></i>${n}</p>` : "").join("") +
        `<p><i class="sem"></i>${t`sem ${fmin()} no período`}</p>`);
      $("s-tit-mapa").textContent = t`Grupo de produtos dominante por município — ${fmin()} ${r}`;
      const cont = d3.rollups(dados.mun, v => v.length, m => m[2]).sort((a, b) => b[1] - a[1]);
      mapa.svg.attr("aria-label", t`Mapa dos 417 municípios da Bahia colorido pelo grupo de produtos dominante na ${fmin()} de ${r}.`);
      $("s-resumo").textContent = t("Municípios por grupo dominante:") + " " + cont.map(([g, n]) => `${G[g]}: ${n}`).join("; ") + ".";
    }

    function dica(cod) {
      const m = idx[cod];
      if (!m) return `<b class="dica-t">${nomes[cod]}</b><span class="dica-s">${t`sem ${fmin()} no período`} (${U.rotuloAno(st.ano, meta)})</span>`;
      return `<b class="dica-t">${nomes[cod]}</b><span class="dica-s">${U.nomeFluxo[st.fluxo]} ${U.rotuloAno(st.ano, meta)}</span>
        <table><tr><td>${t("Grupo dominante")}</td><td><b>${G[m[2]]}</b></td></tr><tr><td>${t("Valor")}</td><td>${U.usd(m[1])}</td></tr></table>
        <span class="dica-s">${t("Participação dos 3 principais grupos:")}</span>
        <table>${m[3].map(([g, p]) => `<tr><td><span class="pt" style="background:${cor(g)}"></span>${G[g]}</td><td>${pctPeq(p)}</td></tr>`).join("")}</table>`;
    }

    function painelMun() {
      const box = $("s-selecionado");
      if (!st.mun) { box.innerHTML = ""; return; }
      const m = idx[st.mun];
      box.innerHTML = `<div class="sel-cab"><b>${nomes[st.mun]}</b><button type="button" class="btn-link" id="s-limpar">${t("limpar ✕")}</button></div>` +
        (m ? `<table><tr><td>${t("Valor")}</td><td>${U.usdMi(m[1])}</td></tr>${m[3].map(([g, p]) => `<tr><td><span class="pt" style="background:${cor(g)}"></span>${G[g]}</td><td>${pctPeq(p)}</td></tr>`).join("")}</table>`
          : `<p class="nota">${t`Sem ${fmin()} em ${U.rotuloAno(st.ano, meta)}.`}</p>`);
      box.querySelector("#s-limpar").addEventListener("click", () => selecionar(null));
    }

    function faixaH() {
      const valores = {}; meta.anos.forEach(a => valores[a] = meta.serie_bahia[st.fluxo][a].v);
      faixa.atualizar({ anos: meta.anos, valores, parcial: meta.ano_parcial, cor: () => U.corFluxo(st.fluxo), meta,
        titulo: t`Bahia — ${fmin()} por ano (US$ FOB). Clique numa barra para trocar o ano. * ${U.rotuloParcial(meta)}` }, st.ano);
    }

    function composicao() {
      const linhas = comp.composicao[st.fluxo];
      const anos = linhas.map(l => l[0]);
      gComp.atualizar({ anos, meta, anoAtivo: st.ano, destaque: st.grupo, rotulo: t("Composição por grupo, em % de cada ano"),
        series: G.map((n, i) => ({ id: i, nome: n, cor: cor(i), valores: linhas.map(l => l[1][i]) })) });
      $("s-tit-comp").textContent = t`Composição da ${fmin()} por grupo (% de cada ano)`;
      $("s-leg-comp").innerHTML = G.map((n, i) => `<span><i style="background:${cor(i)}"></i>${n}</span>`).join("");
    }

    function segmentos() {
      const N = 15, s = dados.segmentos;
      const itens = s.slice(0, N).map(([n, v, p, g]) => ({ rotulo: t(n), valor: v, cor: g == null ? "#B8B0A2" : cor(g), extra: `${t`${U.pct(p, false)} do total`}${g == null ? " · " + t("produtos de vários grupos") : " · " + G[g]}` }));
      const resto = s.slice(N);
      if (resto.length) itens.push({ rotulo: t`Demais segmentos (${resto.length})`, valor: d3.sum(resto, x => x[1]), demais: true });
      $("s-tit-seg").textContent = t`Maiores segmentos — ${fmin()} ${U.rotuloAno(st.ano, meta)}`;
      gSeg.atualizar({ itens, rotulo: $("s-tit-seg").textContent });
    }

    function produtos() {
      const g = st.grupo != null ? st.grupo : [...dados.grupos].sort((a, b) => b[1] - a[1])[0][0];
      const lst = dados.produtos[String(g)] || [];
      $("s-tit-prod").textContent = t`Produtos (SH4) — ${G[g]}` + (st.grupo == null ? " " + t("(principal grupo)") : "");
      $("s-nota-prod").textContent = t("SH4 = posição de 4 dígitos do Sistema Harmonizado.") + (I18N.lang === "en" && !sh4en ? " Product names are shown in Portuguese (official Comex Stat descriptions)." : "");
      if (!lst.length) return gProd.atualizar({ mensagem: t`Sem ${fmin()} deste grupo em ${U.rotuloAno(st.ano, meta)}.` });
      gProd.atualizar({ rotulo: $("s-tit-prod").textContent,
        itens: lst.map(([sh4, n, v, p]) => ({ rotulo: sh4 ? `${sh4} ${nomeProd(sh4, n)}` : t`Demais produtos do grupo (${n.match(/\d+/) ? n.match(/\d+/)[0] : ""})`, valor: v, cor: cor(g), demais: !sh4, extra: t`${U.pct(p, false)} do grupo` })) });
    }

    await mudar({});
    if (st.mun) mapa.enquadrar(geo.features.find(f => f.properties.CD_MUN === st.mun), false);
  }

  window.PaginaSegmentos = { montar };
})();
