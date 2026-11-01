/* Página TERRITÓRIO – municípios (empresas com domicílio fiscal na Bahia) */
(function () {
  const C = ATLAS_CONFIG.cores;
  const FLUXOS = ["EXP", "IMP", "SALDO"];

  async function montar(raiz, params) {
    const rot = t(ATLAS_CONFIG.rotulos.territorio);
    const F = t(ATLAS_CONFIG.fonte);
    raiz.innerHTML = `
    <section class="pagina pg-territorio" aria-labelledby="tit-territorio">
      <div class="cartoes" id="t-cartoes" aria-live="polite"></div>
      <div class="grade grade-3">
        <aside class="painel-esq cartao">
          <h2 id="tit-territorio" class="titulo-secao">${rot}</h2>
          <p class="descricao">${t("Exportação, importação e saldo comercial dos 417 municípios baianos, segundo o domicílio fiscal da empresa. Um fluxo e um ano por vez.")}</p>
          <fieldset class="seletor-fluxo">
            <legend>${t("Fluxo")}</legend>
            ${FLUXOS.map(f => `<label class="opcao opcao-${f.toLowerCase()}"><input type="radio" name="t-fluxo" value="${f}"><span>${U.nomeFluxo[f]}</span></label>`).join("")}
          </fieldset>
          <label class="campo">${t("Ano")}
            <select id="t-ano"></select>
          </label>
          <label class="campo">${t("Buscar município")}
            <input id="t-busca" type="search" list="t-lista-mun" placeholder="${t("Digite o nome…")}" autocomplete="off">
          </label>
          <datalist id="t-lista-mun"></datalist>
          <div id="t-selecionado" class="selecionado" aria-live="polite"></div>
          <details class="como-ler">
            <summary>${t("Como ler esta página")}</summary>
            <ul>
              <li>${t("<b>Cores do mapa:</b> municípios agrupados em 5 classes de valor (quantis): quanto mais escuro, maior o valor no ano escolhido. Branco = sem valor no período.")}</li>
              <li>${t("<b>Saldo</b> = exportação − importação do mesmo ano. Laranja/rosa: o município exporta mais do que importa (superávit). Verde-água: importa mais (déficit).")}</li>
              <li>${t("<b>Variação %:</b> compara com o ano anterior inteiro. No ano parcial (2026), compara só os mesmos meses (jan–set × jan–set).")}</li>
              <li>${t("Passe o mouse para ver os valores; <b>clique</b> para fixar o município e atualizar a série histórica.")}</li>
              <li>${t("A <b>faixa histórica</b> mostra o valor de cada ano (nunca a soma de anos). Clique numa barra ou use ▶ Play.")}</li>
              <li>${t("Os valores referem-se ao <b>domicílio fiscal</b> da empresa, e não ao local de produção ou de embarque.")}</li>
            </ul>
          </details>
          <p class="atualizado" id="t-atualizado"></p>
        </aside>

        <div class="col-centro">
          <figure class="cartao cartao-mapa">
            <figcaption class="cartao-cab"><h3 id="t-tit-mapa">${t("Mapa")}</h3></figcaption>
            <div id="t-mapa" class="area-mapa"><p class="carregando">${t("Carregando mapa…")}</p></div>
            <p class="sr-only" id="t-resumo-mapa" aria-live="polite"></p>
            <p class="fonte">${F}</p>
          </figure>
          <div class="cartao">
            <div id="t-faixa"></div>
            <p class="fonte">${F}</p>
          </div>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="t-tit-conc">${t("Concentração")}</h3></figcaption>
            <p class="explica" id="t-le-conc"></p>
            <div id="t-conc" class="grafico"></div><p class="fonte">${F}</p></figure>
        </div>

        <div class="col-graficos">
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="t-tit-rank">Ranking</h3></figcaption>
            <div id="t-rank" class="grafico"></div><p class="fonte">${F}</p></figure>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="t-tit-serie">${t("Série histórica")}</h3></figcaption>
            <div id="t-serie" class="grafico"></div><p class="nota" id="t-nota-serie"></p><p class="fonte">${F}</p></figure>
          <figure class="cartao"><figcaption class="cartao-cab"><h3 id="t-tit-paises">${t("Países")}</h3></figcaption>
            <div id="t-paises" class="grafico"></div><p class="fonte">${F}</p></figure>
        </div>
      </div>

      <section class="cartao cartao-tabela" aria-labelledby="t-tit-tab">
        <div class="cartao-cab tabela-cab">
          <h3 id="t-tit-tab">${t("Tabela dos municípios")}</h3>
          <div class="tabela-acoes">
            <label class="campo campo-linha">${t("Filtrar")} <input id="t-filtro" type="search" placeholder="${t("nome do município")}"></label>
            <button type="button" class="btn" id="t-csv">${t("⬇ Baixar CSV")}</button>
          </div>
        </div>
        <div class="tabela-rolagem"><table class="tabela" id="t-tabela"></table></div>
        <p class="nota" id="t-nota-tab"></p>
        <p class="fonte">${F}</p>
      </section>
      ${Rodape.html("territorio")}
    </section>`;

    const $ = id => raiz.querySelector("#" + id);
    const meta = await U.json("data/meta.json");
    const [geo, contorno, series] = await Promise.all([
      U.json("data/geo/municipios.json"), U.json("data/geo/contorno.json"),
      U.json("data/territorio/series_municipios.json")
    ]);
    const nomes = Object.fromEntries(geo.features.map(f => [f.properties.CD_MUN, f.properties.NM_MUN]));
    const porNome = Object.fromEntries(geo.features.map(f => [U.semAcento(f.properties.NM_MUN), f.properties.CD_MUN]));

    // ---------- estado ----------
    const st = {
      ano: meta.anos.includes(+params.ano) ? +params.ano : meta.ano_padrao,
      fluxo: FLUXOS.includes((params.fluxo || "").toUpperCase()) ? params.fluxo.toUpperCase() : "EXP",
      mun: nomes[params.mun] ? params.mun : null,
      ordem: null, filtro: ""
    };
    let dados = null; // {EXP, IMP} do ano

    $("t-atualizado").textContent = U.atualizado(meta);
    $("t-ano").innerHTML = [...meta.anos].reverse().map(a => `<option value="${a}">${U.rotuloAno(a, meta)}</option>`).join("");
    $("t-lista-mun").innerHTML = geo.features.map(f => f.properties.NM_MUN).sort((a, b) => a.localeCompare(b, "pt")).map(n => `<option value="${n}">`).join("");

    // ---------- mapa ----------
    const mapa = AtlasMapa($("t-mapa"), { rotulo: t("Mapa dos municípios da Bahia") });
    const f = ATLAS_CONFIG.fundoClaro;
    mapa.setFundo({ url: f.url, sub: f.sub, key: ATLAS_CONFIG.cartoKey, atribuicao: f.atribuicao, maxZoom: f.maxZoom });
    const caminhos = mapa.gVet.append("g").attr("class", "municipios").selectAll("path")
      .data(geo.features, d => d.properties.CD_MUN).join("path")
      .attr("d", mapa.caminho).attr("class", "mun")
      .on("mousemove", (ev, d) => { d3.select(ev.currentTarget).raise().classed("hover", true); U.dica.mostrar(dica(d.properties.CD_MUN), ev); })
      .on("mouseleave", ev => { d3.select(ev.currentTarget).classed("hover", false); U.dica.esconder(); elevarSel(); })
      .on("click", (ev, d) => selecionar(d.properties.CD_MUN === st.mun ? null : d.properties.CD_MUN));
    mapa.gVet.append("path").datum(contorno.features[0]).attr("class", "contorno").attr("d", mapa.caminho);
    mapa.enquadrar(contorno);
    const elevarSel = () => { if (st.mun) caminhos.filter(d => d.properties.CD_MUN === st.mun).raise(); };

    // ---------- componentes ----------
    const faixa = Faixa($("t-faixa"), { aoEscolher: a => mudar({ ano: a }) });
    const gRank = Graficos.barrasH($("t-rank"), { aoClicar: cod => selecionar(cod === st.mun ? null : cod) });
    const gSerie = Graficos.serie($("t-serie"));
    const gConc = Graficos.curva($("t-conc"));
    const gPaises = Graficos.barrasH($("t-paises"));

    // ---------- eventos ----------
    raiz.querySelectorAll("input[name=t-fluxo]").forEach(r => r.addEventListener("change", () => mudar({ fluxo: r.value })));
    $("t-ano").addEventListener("change", e => { faixa.parar(); mudar({ ano: +e.target.value }); });
    $("t-busca").addEventListener("change", e => {
      const cod = porNome[U.semAcento(e.target.value.trim())];
      if (cod) { selecionar(cod, true); e.target.value = ""; }
    });
    $("t-busca").addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const q = U.semAcento(e.target.value.trim()); if (!q) return;
      const cod = porNome[q] || Object.entries(porNome).find(([n]) => n.startsWith(q))?.[1];
      if (cod) { selecionar(cod, true); e.target.value = ""; }
    });
    $("t-filtro").addEventListener("input", U.debounce(e => { st.filtro = U.semAcento(e.target.value); tabela(); }, 120));
    $("t-csv").addEventListener("click", baixarCSV);

    function selecionar(cod, enquadrar) {
      st.mun = cod;
      if (enquadrar && cod) mapa.enquadrar(geo.features.find(x => x.properties.CD_MUN === cod), true);
      U.gravarHash("territorio", { ano: st.ano, fluxo: st.fluxo, mun: st.mun });
      desenharSelecao(); serie(); ranking(); tabela();
    }

    async function mudar(novo) {
      Object.assign(st, novo);
      U.gravarHash("territorio", { ano: st.ano, fluxo: st.fluxo, mun: st.mun });
      raiz.querySelector(`input[name=t-fluxo][value=${st.fluxo}]`).checked = true;
      $("t-ano").value = st.ano;
      raiz.querySelector(".pg-territorio").classList.add("ocupado");
      try {
        const [e, i] = await Promise.all([U.json(`data/territorio/EXP_${st.ano}.json`), U.json(`data/territorio/IMP_${st.ano}.json`)]);
        dados = { EXP: e, IMP: i, mapa: { EXP: idx(e), IMP: idx(i) } };
        tudo();
      } catch (err) {
        console.error(err);
        $("t-cartoes").innerHTML = `<p class="erro">${t("Não foi possível carregar os dados. Recarregue a página.")}</p>`;
      } finally {
        raiz.querySelector(".pg-territorio").classList.remove("ocupado");
      }
    }
    const idx = arq => Object.fromEntries(arq.mun.map(r => [r[0], { v: r[1], var: r[2], part: r[3], pos: r[4] }]));

    function tudo() { cartoes(); colorir(); desenharSelecao(); faixaH(); ranking(); serie(); concentracao(); paises(); tabela(); }

    // ---------- valores auxiliares ----------
    const val = (fl, cod) => (dados.mapa[fl][cod] || {}).v || 0;
    const saldo = cod => val("EXP", cod) - val("IMP", cod);
    const comComercio = () => [...new Set([...Object.keys(dados.mapa.EXP), ...Object.keys(dados.mapa.IMP)])];
    const fmin = () => U.nomeFluxo[st.fluxo].toLowerCase();

    // ---------- cartões ----------
    function cartoes() {
      const r = U.rotuloAno(st.ano, meta), base = U.textoBase(st.ano, meta);
      let cs;
      if (st.fluxo !== "SALDO") {
        const d = dados[st.fluxo];
        cs = [
          [t`${U.nomeFluxo[st.fluxo]} em ${r}`, U.usdMi(d.total), U.usd(d.total)],
          [t("Variação"), U.pct(d.var), base, d.var > 0 ? "sobe" : d.var < 0 ? "desce" : ""],
          [t`Municípios com ${fmin()}`, U.int(d.n_mun), t("de 417 municípios")],
          [t("Participação dos 10 maiores"), U.pct(d.top10, false), t`do total de ${fmin()} do ano`]
        ];
      } else {
        const e = dados.EXP, i = dados.IMP, s = e.total - i.total;
        const sb = (e.total_base != null && i.total_base != null) ? e.total_base - i.total_base : null;
        const ss = comComercio().map(saldo);
        const pos = ss.filter(v => v > 0).sort((a, b) => b - a), neg = ss.filter(v => v < 0);
        const top10 = pos.length ? d3.sum(pos.slice(0, 10)) / d3.sum(pos) * 100 : null;
        cs = [
          [t`Saldo em ${r}`, U.usdMi(s), t("exportação − importação do mesmo ano"), s >= 0 ? "sobe" : "desce"],
          [t("Variação do saldo (US$)"), sb == null ? "—" : (s - sb >= 0 ? "+" : "") + U.usdMi(s - sb), base],
          [t("Municípios com superávit"), U.int(pos.length), t`com déficit: ${U.int(neg.length)}`],
          [t("10 maiores superávits"), U.pct(top10, false), t("do total dos superávits municipais")]
        ];
      }
      $("t-cartoes").innerHTML = cs.map(([ti, v, s, cls]) => `
        <div class="kpi cartao ${st.fluxo.toLowerCase()}"><p class="kpi-t">${ti}</p><p class="kpi-v ${cls || ""}">${v}</p><p class="kpi-s">${s}</p></div>`).join("");
    }

    // ---------- mapa coroplético ----------
    let corDe = () => C.semValor;
    function colorir() {
      const r = U.rotuloAno(st.ano, meta);
      let legenda;
      if (st.fluxo !== "SALDO") {
        const pal = st.fluxo === "EXP" ? C.quente : C.agua;
        const vals = Object.values(dados.mapa[st.fluxo]).map(x => x.v);
        const q = d3.scaleQuantile().domain(vals).range(pal);
        corDe = cod => { const v = val(st.fluxo, cod); return v > 0 ? q(v) : C.semValor; };
        const lim = q.quantiles();
        const faixas = pal.map((c, i) => [c, i === 0 ? t`até ${U.eixo(lim[0])}` : i === pal.length - 1 ? t`acima de ${U.eixo(lim[i - 1])}` : t`${U.eixo(lim[i - 1])} a ${U.eixo(lim[i])}`]);
        legenda = `<p class="leg-t">${U.nomeFluxo[st.fluxo]} ${r} (US$ FOB)</p>` +
          faixas.map(([c, tx]) => `<p><i style="background:${c}"></i>${tx}</p>`).join("") +
          `<p><i class="sem"></i>${t`sem ${fmin()} no período`}</p>` +
          `<p class="leg-n">${t("5 classes com nº igual de municípios (quantis)")}</p>`;
        $("t-tit-mapa").textContent = t`${U.nomeFluxo[st.fluxo]} por município — ${r}`;
      } else {
        const D = C.divergente;
        const ss = comComercio().map(c => [c, saldo(c)]);
        const pos = ss.filter(x => x[1] > 0).map(x => x[1]), neg = ss.filter(x => x[1] < 0).map(x => -x[1]);
        const mp = d3.median(pos) || 0, mn = d3.median(neg) || 0;
        corDe = cod => {
          if (!dados.mapa.EXP[cod] && !dados.mapa.IMP[cod]) return C.semValor;
          const s = saldo(cod);
          if (s > 0) return s > mp ? D[4] : D[3];
          if (s < 0) return -s > mn ? D[0] : D[1];
          return D[2];
        };
        legenda = `<p class="leg-t">${t`Saldo ${r} (US$ FOB)`}</p>
          <p><i style="background:${D[4]}"></i>${t`superávit acima de ${U.eixo(mp)}`}</p>
          <p><i style="background:${D[3]}"></i>${t`superávit até ${U.eixo(mp)}`}</p>
          <p><i style="background:${D[2]}"></i>${t("saldo zero")}</p>
          <p><i style="background:${D[1]}"></i>${t`déficit até ${U.eixo(mn)}`}</p>
          <p><i style="background:${D[0]}"></i>${t`déficit acima de ${U.eixo(mn)}`}</p>
          <p><i class="sem"></i>${t("sem comércio exterior no período")}</p>
          <p class="leg-n">${t("Laranja/rosa: exporta mais do que importa. Verde-água: importa mais. Corte de cada lado na mediana.")}</p>`;
        $("t-tit-mapa").textContent = t`Saldo comercial por município — ${r}`;
      }
      caminhos.attr("fill", d => corDe(d.properties.CD_MUN));
      mapa.legenda(legenda);
      const n = st.fluxo === "SALDO" ? comComercio().length : dados[st.fluxo].n_mun;
      mapa.svg.attr("aria-label", t`Mapa coroplético dos 417 municípios da Bahia: ${fmin()} em ${r}. ${n} municípios com valor. Use a busca de município para consultar pelo teclado.`);
      const top = st.fluxo === "SALDO" ? [] : dados[st.fluxo].mun.slice(0, 5).map(m => `${nomes[m[0]]} (${U.usd(m[1])})`);
      $("t-resumo-mapa").textContent = top.length ? t`Maiores valores: ${top.join("; ")}.` : "";
    }

    function dica(cod) {
      const nome = nomes[cod];
      const e = dados.mapa.EXP[cod], i = dados.mapa.IMP[cod];
      const lin = (fl, x) => x
        ? `<tr><td><span class="pt ${fl.toLowerCase()}"></span>${U.nomeFluxo[fl]}</td><td>${U.usd(x.v)}</td><td>${U.pct(x.var)}</td></tr>`
        : `<tr><td><span class="pt ${fl.toLowerCase()}"></span>${U.nomeFluxo[fl]}</td><td colspan="2" class="sem-valor">${t`sem ${U.nomeFluxo[fl].toLowerCase()} no período`}</td></tr>`;
      const s = (e || i) ? `<tr class="saldo"><td>${t("Saldo")}</td><td>${U.usd(saldo(cod))}</td><td></td></tr>` : "";
      return `<b class="dica-t">${nome}</b><span class="dica-s">${U.rotuloAno(st.ano, meta)} · ${t("variação")} ${U.textoBase(st.ano, meta)}</span>
        <table>${lin("EXP", e)}${lin("IMP", i)}${s}</table>
        <span class="dica-s">${cod === st.mun ? t("Clique para desfazer a seleção") : t("Clique para fixar o município")}</span>`;
    }

    function desenharSelecao() {
      caminhos.classed("selecionado", d => d.properties.CD_MUN === st.mun);
      elevarSel();
      const box = $("t-selecionado");
      if (!st.mun) { box.innerHTML = ""; return; }
      box.innerHTML = `<div class="sel-cab"><b>${nomes[st.mun]}</b><button type="button" class="btn-link" id="t-limpar">${t("limpar seleção ✕")}</button></div>${dados ? `<table>${["EXP", "IMP"].map(fl => {
        const x = dados.mapa[fl][st.mun];
        return `<tr><td>${U.nomeFluxo[fl]}</td><td>${x ? U.usdMi(x.v) : "—"}</td><td>${x ? U.pct(x.var) : ""}</td></tr>`;
      }).join("")}<tr><td>${t("Saldo")}</td><td>${U.usdMi(saldo(st.mun))}</td><td></td></tr></table>` : ""}`;
      box.querySelector("#t-limpar").addEventListener("click", () => selecionar(null));
    }

    // ---------- faixa histórica ----------
    function faixaH() {
      const sb = meta.serie_bahia, anos = meta.anos;
      const valores = {}, D = C.divergente;
      anos.forEach(a => valores[a] = st.fluxo === "SALDO" ? sb.EXP[a].v - sb.IMP[a].v : sb[st.fluxo][a].v);
      const cor = st.fluxo === "SALDO" ? (v => v >= 0 ? D[4] : D[0]) : (() => U.corFluxo(st.fluxo));
      faixa.atualizar({ anos, valores, parcial: meta.ano_parcial, cor, meta,
        titulo: t`Bahia — ${fmin()} por ano (US$ FOB). Clique numa barra para trocar o ano. * ${U.rotuloParcial(meta)}` }, st.ano);
    }

    // ---------- ranking ----------
    function ranking() {
      if (!dados) return;
      const r = U.rotuloAno(st.ano, meta), N = 15;
      let itens;
      if (st.fluxo !== "SALDO") {
        const d = dados[st.fluxo], cor = U.corFluxo(st.fluxo);
        itens = d.mun.slice(0, N).map(m => ({ rotulo: nomes[m[0]], valor: m[1], cor, id: m[0], destaque: m[0] === st.mun, extra: `${t`${U.pct(m[3], false)} do total`} · ${U.pct(m[2])} ${U.textoBase(st.ano, meta)}` }));
        const resto = d.mun.slice(N);
        if (resto.length) itens.push({ rotulo: t`Demais municípios (${resto.length})`, valor: d3.sum(resto, m => m[1]), demais: true });
        $("t-tit-rank").textContent = t`Maiores municípios — ${fmin()} ${r}`;
      } else {
        const D = C.divergente;
        const ss = comComercio().map(c => [c, saldo(c)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        itens = ss.slice(0, N).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ rotulo: nomes[c], valor: v, cor: v >= 0 ? D[4] : D[0], id: c, destaque: c === st.mun }));
        const resto = ss.slice(N);
        if (resto.length) itens.push({ rotulo: t`Demais municípios (${resto.length})`, valor: d3.sum(resto, x => x[1]), demais: true });
        $("t-tit-rank").textContent = t`Maiores saldos (em módulo) — ${r}`;
      }
      gRank.atualizar({ itens, rotulo: $("t-tit-rank").textContent });
    }

    // ---------- série histórica ----------
    function serie() {
      const anos = meta.anos;
      let exp, imp, nome;
      if (st.mun) {
        const s = series.series[st.mun] || {};
        exp = s.EXP || anos.map(() => 0); imp = s.IMP || anos.map(() => 0); nome = nomes[st.mun];
      } else {
        exp = anos.map(a => meta.serie_bahia.EXP[a].v); imp = anos.map(a => meta.serie_bahia.IMP[a].v); nome = "Bahia";
      }
      const L = { EXP: { nome: U.nomeFluxo.EXP, cor: C.exp, valores: exp }, IMP: { nome: U.nomeFluxo.IMP, cor: C.imp, valores: imp } };
      const d = { anos, meta, anoAtivo: st.ano };
      if (st.fluxo === "SALDO") { d.linhas = [L.EXP, L.IMP]; d.barras = anos.map((_, i) => exp[i] - imp[i]); }
      else d.linhas = [L[st.fluxo]];
      d.rotulo = t`Série histórica — ${nome}`;
      $("t-tit-serie").textContent = st.mun ? t`Série histórica — ${nome}` : t("Série histórica — Bahia (todos os municípios)");
      $("t-nota-serie").textContent = t`Valor de cada ano, sem acumular. O ponto vazado é ${U.rotuloParcial(meta)}: não é comparável a um ano inteiro.` + (st.mun ? "" : " " + t("Clique num município para ver a série dele."));
      gSerie.atualizar(d);
    }

    function concentracao() {
      if (st.fluxo === "SALDO") {
        $("t-tit-conc").textContent = t("Concentração");
        $("t-le-conc").innerHTML = "";
        return gConc.atualizar({ mensagem: t("A curva de concentração é calculada para um fluxo por vez. Escolha Exportação ou Importação.") });
      }
      const d = dados[st.fluxo];
      $("t-tit-conc").textContent = t`Concentração da ${fmin()} — ${U.rotuloAno(st.ano, meta)}`;
      gConc.atualizar({ conc: d.conc, cor: U.corFluxo(st.fluxo), rotulo: $("t-tit-conc").textContent });
      const nAte = p => d.conc.findIndex(c => c >= p) + 1;
      const k = Math.min(10, d.conc.length);
      $("t-le-conc").innerHTML = d.conc.length ? t`<b>Como ler:</b> a curva soma os municípios do maior para o menor. Quanto mais rápido ela sobe, mais concentrado é o comércio. Em ${U.rotuloAno(st.ano, meta)}, o maior município responde por <b>${U.pct(d.conc[0], false)}</b>, os ${k} maiores por <b>${U.pct(d.conc[k - 1], false)}</b>, e <b>${nAte(90)}</b> dos ${d.conc.length} municípios com ${fmin()} já somam 90% do total.` : "";
    }

    function paises() {
      if (st.fluxo === "SALDO") {
        $("t-tit-paises").textContent = t("Países");
        return gPaises.atualizar({ mensagem: t("O ranking de países é mostrado para um fluxo por vez. Escolha Exportação ou Importação.") });
      }
      const d = dados[st.fluxo], cor = U.corFluxo(st.fluxo);
      $("t-tit-paises").textContent = `${st.fluxo === "EXP" ? t("Principais destinos") : t("Principais origens")} — ${U.rotuloAno(st.ano, meta)}`;
      gPaises.atualizar({ rotulo: $("t-tit-paises").textContent,
        itens: d.paises.map(([n, v, p]) => ({ rotulo: t(n), valor: v, cor, demais: n === "Demais países", extra: t`${U.pct(p, false)} do total` })) });
    }

    // ---------- tabela ----------
    const colunas = () => [
      { k: "nome", t: t("Município"), txt: true },
      { k: "exp", t: t("Exportação (US$)"), f: U.int },
      { k: "vexp", t: t("Var. % exp."), f: v => U.pct(v) },
      { k: "imp", t: t("Importação (US$)"), f: U.int },
      { k: "vimp", t: t("Var. % imp."), f: v => U.pct(v) },
      { k: "saldo", t: t("Saldo (US$)"), f: U.int },
      { k: "part", t: t("Participação %"), f: v => U.pct(v, false) }
    ];
    function linhasTabela() {
      return comComercio().map(c => {
        const e = dados.mapa.EXP[c], i = dados.mapa.IMP[c];
        return { cod: c, nome: nomes[c], exp: e ? e.v : 0, vexp: e ? e.var : null, imp: i ? i.v : 0, vimp: i ? i.var : null,
          saldo: saldo(c), part: st.fluxo === "SALDO" ? null : (dados.mapa[st.fluxo][c] || {}).part ?? null };
      });
    }
    function tabela() {
      if (!dados) return;
      const pad = st.fluxo === "SALDO" ? "saldo" : st.fluxo.toLowerCase();
      const ord = st.ordem || { k: pad, desc: true };
      let ls = linhasTabela();
      ls.sort((a, b) => {
        const x = a[ord.k], y = b[ord.k];
        if (typeof x === "string") return ord.desc ? y.localeCompare(x, "pt") : x.localeCompare(y, "pt");
        return ord.desc ? (y ?? -Infinity) - (x ?? -Infinity) : (x ?? Infinity) - (y ?? Infinity);
      });
      const total = ls.length;
      if (st.filtro) ls = ls.filter(l => U.semAcento(l.nome).includes(st.filtro));
      const cols = colunas().filter(c => !(c.k === "part" && st.fluxo === "SALDO"));
      $("t-tabela").innerHTML = `<caption class="sr-only">${t`Municípios com comércio exterior em ${U.rotuloAno(st.ano, meta)}`}</caption>
        <thead><tr>${cols.map(c => `<th scope="col" aria-sort="${ord.k === c.k ? (ord.desc ? "descending" : "ascending") : "none"}" class="${c.txt ? "" : "num"}"><button type="button" data-k="${c.k}">${c.t}${ord.k === c.k ? (ord.desc ? " ▼" : " ▲") : ""}</button></th>`).join("")}</tr></thead>
        <tbody>${ls.map(l => `<tr data-cod="${l.cod}" class="${l.cod === st.mun ? "destaque" : ""}">${cols.map(c => c.txt
          ? `<th scope="row"><button type="button" class="btn-link" data-sel="${l.cod}">${l.nome}</button></th>`
          : `<td class="num ${c.k === "saldo" ? (l.saldo < 0 ? "neg" : "pos") : ""}">${c.f(l[c.k])}</td>`).join("")}</tr>`).join("")}</tbody>`;
      $("t-tabela").querySelectorAll("thead button").forEach(b => b.addEventListener("click", () => {
        const k = b.dataset.k; st.ordem = { k, desc: ord.k === k ? !ord.desc : k !== "nome" }; tabela();
      }));
      $("t-tabela").querySelectorAll("[data-sel]").forEach(b => b.addEventListener("click", () => selecionar(b.dataset.sel === st.mun ? null : b.dataset.sel, true)));
      $("t-nota-tab").textContent = t`${total} municípios com exportação ou importação em ${U.rotuloAno(st.ano, meta)} (${417 - total} sem comércio exterior no ano não aparecem). Clique no nome para destacar no mapa. Variação ${U.textoBase(st.ano, meta)}.`;
    }

    function baixarCSV() {
      const ls = linhasTabela().sort((a, b) => b.exp - a.exp);
      const cab = ["cod_mun", "municipio", "ano", "exportacao_usd_fob", "var_pct_exportacao", "importacao_usd_fob", "var_pct_importacao", "saldo_usd_fob"];
      const rows = ls.map(l => [l.cod, l.nome, U.rotuloAno(st.ano, meta), U.numCSV(l.exp), U.pctCSV(l.vexp), U.numCSV(l.imp), U.pctCSV(l.vimp), U.numCSV(l.saldo)]);
      U.baixarCSV(`atlas-austral_territorio_${st.ano}.csv`, cab, rows);
    }

    await mudar({});
    if (st.mun) mapa.enquadrar(geo.features.find(x => x.properties.CD_MUN === st.mun), false);
  }

  window.PaginaTerritorio = { montar };
})();
