/* Gráficos de apoio (d3). Cada função devolve {atualizar(dados)} e se redesenha ao mudar de largura. */
(function () {
  const G = {};

  function responsivo(el, desenhar) {
    let ultimo = null;
    new ResizeObserver(U.debounce(() => { if (ultimo) desenhar(ultimo); }, 120)).observe(el);
    return { atualizar(d) { ultimo = d; desenhar(d); }, limpar() { ultimo = null; } };
  }
  function vazio(el, msg) { el.innerHTML = `<p class="grafico-vazio">${msg}</p>`; }

  /* Ranking em barras horizontais. itens: [{rotulo, valor, cor, id, destaque, demais}] */
  G.barrasH = (el, opc = {}) => responsivo(el, d => {
    if (d.mensagem) return vazio(el, d.mensagem);
    const itens = d.itens;
    if (!itens.length) return vazio(el, t("Sem valores neste ano."));
    const W = U.largura(el), s = U.escalaTexto(), lh = 22 * s, m = { t: 4, r: 64 * s, b: 22 * s, l: Math.min(150 * s, W * (s > 1 ? 0.45 : 0.38)) };
    const H = m.t + m.b + itens.length * lh;
    const min = Math.min(0, d3.min(itens, i => i.valor)), max = Math.max(0, d3.max(itens, i => i.valor));
    const x = d3.scaleLinear().domain([min, max]).nice(4).range([m.l, W - m.r]);
    const y = d3.scaleBand().domain(itens.map((_, i) => i)).range([m.t, H - m.b]).paddingInner(0.22);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img")
      .attr("aria-label", d.rotulo || t("Ranking"));
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor((W - m.l - m.r) / 70))).tickFormat(U.eixo).tickSize(-(H - m.t - m.b)))
      .call(g => g.select(".domain").remove());
    const lin = svg.append("g").selectAll("g").data(itens).join("g")
      .attr("class", i => "rank-linha" + (i.destaque ? " destaque" : "") + (opc.aoClicar && i.id ? " clicavel" : ""))
      .attr("transform", (_, k) => `translate(0,${y(k)})`)
      .on("click", (ev, i) => { if (opc.aoClicar && i.id) opc.aoClicar(i.id); })
      .on("mousemove", (ev, i) => U.dica.mostrar(`<b>${i.rotulo}</b><br>${U.usd(i.valor)}${i.extra ? "<br>" + i.extra : ""}`, ev))
      .on("mouseleave", U.dica.esconder);
    lin.append("rect").attr("x", i => x(Math.min(0, i.valor))).attr("width", i => Math.max(1, Math.abs(x(i.valor) - x(0))))
      .attr("height", y.bandwidth()).attr("fill", i => i.demais ? "#B8B0A2" : i.cor).attr("rx", 2);
    lin.append("text").attr("class", "rank-rotulo").attr("x", m.l - 6).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("text-anchor", "end").text(i => i.rotulo).each(function (i) {
        const s = d3.select(this); let txt = i.rotulo;
        while (this.getComputedTextLength() > m.l - 10 && txt.length > 4) { txt = txt.slice(0, -2); s.text(txt + "…"); }
      });
    lin.append("text").attr("class", "rank-valor").attr("x", i => i.valor >= 0 ? x(i.valor) + 4 : x(0) + 4)
      .attr("y", y.bandwidth() / 2).attr("dy", "0.35em").text(i => U.eixo(i.valor));
    if (min < 0) svg.append("line").attr("class", "linha-zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t).attr("y2", H - m.b);
  });

  /* Série histórica. d = {anos, meta, anoAtivo, linhas:[{nome, cor, valores}], barras:[valores] (saldo)} */
  G.serie = (el) => responsivo(el, d => {
    const W = U.largura(el), s = U.escalaTexto(), H = Math.round(210 * Math.sqrt(s)), m = { t: 12, r: 12, b: 24 * s, l: 52 * s };
    const { anos, meta } = d;
    const todos = [...(d.linhas || []).flatMap(l => l.valores), ...(d.barras || [])];
    if (!todos.some(v => v)) return vazio(el, t("Sem valores no período."));
    const x = d3.scaleBand().domain(anos).range([m.l, W - m.r]).paddingInner(0.2);
    const cx = a => x(a) + x.bandwidth() / 2;
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(todos)), Math.max(0, d3.max(todos))]).nice(4).range([H - m.b, m.t]);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(U.eixo).tickSize(-(W - m.l - m.r))).call(g => g.select(".domain").remove());
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues(anos.filter(a => a % 5 === 0)).tickSize(0)).call(g => g.select(".domain").remove());
    // ano ativo
    svg.append("rect").attr("class", "ano-ativo").attr("x", x(d.anoAtivo) - 1).attr("width", x.bandwidth() + 2)
      .attr("y", m.t).attr("height", H - m.b - m.t);
    if (d.barras) {
      svg.append("g").selectAll("rect").data(anos).join("rect")
        .attr("x", a => x(a)).attr("width", x.bandwidth())
        .attr("y", (a, i) => y(Math.max(0, d.barras[i]))).attr("height", (a, i) => Math.abs(y(d.barras[i]) - y(0)))
        .attr("fill", (a, i) => { const c = d.barras[i] >= 0 ? ATLAS_CONFIG.cores.divergente[4] : ATLAS_CONFIG.cores.divergente[0]; return a === meta.ano_parcial ? U.hachura(c) : c; })
        .attr("stroke", (a, i) => a === meta.ano_parcial ? (d.barras[i] >= 0 ? ATLAS_CONFIG.cores.divergente[4] : ATLAS_CONFIG.cores.divergente[0]) : null);
      svg.append("line").attr("class", "linha-zero").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
    }
    (d.linhas || []).forEach(l => {
      // linha só até o último ano fechado; o ano parcial aparece como ponto vazado (não comparável ao ano inteiro)
      const fech = anos.map((a, i) => [a, l.valores[i]]).filter(([a]) => a !== meta.ano_parcial);
      svg.append("path").attr("fill", "none").attr("stroke", l.cor).attr("stroke-width", 2.2)
        .attr("d", d3.line().x(p => cx(p[0])).y(p => y(p[1]))(fech));
      if (meta.ano_parcial) {
        const i = anos.indexOf(meta.ano_parcial);
        svg.append("circle").attr("cx", cx(meta.ano_parcial)).attr("cy", y(l.valores[i])).attr("r", 4)
          .attr("fill", "#fff").attr("stroke", l.cor).attr("stroke-width", 2).attr("stroke-dasharray", "2 1.5");
      }
    });
    // camada de leitura (dica por ano)
    svg.append("g").selectAll("rect").data(anos).join("rect").attr("x", a => x(a)).attr("width", x.bandwidth())
      .attr("y", m.t).attr("height", H - m.b - m.t).attr("fill", "transparent")
      .on("mousemove", (ev, a) => {
        const i = anos.indexOf(a);
        const linhas = (d.linhas || []).map(l => `<span style="color:${l.cor}">●</span> ${l.nome}: ${U.usd(l.valores[i])}`);
        if (d.barras) linhas.push(`${t("Saldo")}: ${U.usd(d.barras[i])}`);
        U.dica.mostrar(`<b>${U.rotuloAno(a, meta)}</b><br>${linhas.join("<br>")}`, ev);
      })
      .on("mouseleave", U.dica.esconder);
  });

  /* Curva de concentração: % acumulado × nº de municípios (ordem decrescente) */
  G.curva = (el) => responsivo(el, d => {
    if (d.mensagem) return vazio(el, d.mensagem);
    const conc = d.conc;
    if (!conc.length) return vazio(el, t("Sem valores neste ano."));
    const W = U.largura(el), s = U.escalaTexto(), H = Math.round(190 * Math.sqrt(s)), m = { t: 10, r: 14, b: 32 * s, l: 40 * s };
    const x = d3.scaleLinear().domain([0, conc.length]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 100]).range([H - m.b, m.t]);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(v => v + "%").tickSize(-(W - m.l - m.r))).call(g => g.select(".domain").remove());
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))).call(g => g.select(".domain").remove());
    svg.append("text").attr("class", "eixo-titulo").attr("x", (m.l + W - m.r) / 2).attr("y", H - 2).attr("text-anchor", "middle")
      .text(t("nº de municípios (do maior para o menor)"));
    const pts = [[0, 0], ...conc.map((c, i) => [i + 1, c])];
    svg.append("path").attr("d", d3.area().x(p => x(p[0])).y0(y(0)).y1(p => y(p[1]))(pts)).attr("fill", d.cor).attr("opacity", 0.15);
    svg.append("path").attr("d", d3.line().x(p => x(p[0])).y(p => y(p[1]))(pts)).attr("fill", "none").attr("stroke", d.cor).attr("stroke-width", 2.2);
    const k = Math.min(10, conc.length);
    svg.append("circle").attr("cx", x(k)).attr("cy", y(conc[k - 1])).attr("r", 4.5).attr("fill", ATLAS_CONFIG.cores.navy);
    svg.append("text").attr("class", "anotacao").attr("x", x(k) + 8).attr("y", y(conc[k - 1]) + 14)
      .text(t`${k} maiores: ${U.pct(conc[k - 1], false)}`);
    svg.append("g").selectAll("rect").data(pts.slice(1)).join("rect")
      .attr("x", p => x(p[0] - 0.5)).attr("width", Math.max(1, x(1) - x(0))).attr("y", m.t).attr("height", H - m.b - m.t)
      .attr("fill", "transparent")
      .on("mousemove", (ev, p) => U.dica.mostrar(t`Os <b>${p[0]}</b> maiores somam <b>${U.pct(p[1], false)}</b> do total`, ev))
      .on("mouseleave", U.dica.esconder);
  });

  /* Barras empilhadas 100% por ano. d = {anos, meta, anoAtivo, series:[{nome, cor, valores[]}]} */
  G.empilhado100 = (el, opc = {}) => responsivo(el, d => {
    const W = U.largura(el), s = U.escalaTexto(), H = Math.round(230 * Math.sqrt(s)), m = { t: 8, r: 8, b: 24 * s, l: 40 * s };
    const { anos, meta } = d;
    const tot = anos.map((_, i) => d3.sum(d.series, s => s.valores[i]));
    const x = d3.scaleBand().domain(anos).range([m.l, W - m.r]).paddingInner(0.12);
    const y = d3.scaleLinear().domain([0, 100]).range([H - m.b, m.t]);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(v => v + "%").tickSize(-(W - m.l - m.r))).call(g => g.select(".domain").remove());
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues(anos.filter(a => a % 5 === 0)).tickSize(0)).call(g => g.select(".domain").remove());
    anos.forEach((a, i) => {
      let acc = 0;
      d.series.forEach(s => {
        const p = tot[i] ? s.valores[i] / tot[i] * 100 : 0;
        if (p <= 0) return;
        svg.append("rect").attr("x", x(a)).attr("width", x.bandwidth())
          .attr("y", y(acc + p)).attr("height", y(acc) - y(acc + p))
          .attr("fill", a === meta.ano_parcial ? U.hachura(s.cor) : s.cor)
          .attr("opacity", d.destaque != null && d.destaque !== s.id ? 0.25 : (a === d.anoAtivo ? 1 : 0.88))
          .on("mousemove", ev => U.dica.mostrar(`<b>${U.rotuloAno(a, meta)}</b><br><span style="color:${s.cor}">■</span> ${s.nome}: ${U.pct(p, false)}<br>${U.usd(s.valores[i])}`, ev))
          .on("mouseleave", U.dica.esconder)
          .on("click", () => opc.aoClicar && opc.aoClicar(a));
        acc += p;
      });
    });
    svg.append("rect").attr("x", x(d.anoAtivo) - 1.5).attr("width", x.bandwidth() + 3).attr("y", m.t - 2)
      .attr("height", H - m.b - m.t + 4).attr("fill", "none").attr("stroke", ATLAS_CONFIG.cores.navy).attr("stroke-width", 1.5);
  });

  /* Várias linhas no tempo. d = {anos, meta, anoAtivo, linhas:[{nome, cor, valores}]} */
  G.linhas = (el) => responsivo(el, d => {
    const W = U.largura(el), s = U.escalaTexto(), H = Math.round(220 * Math.sqrt(s)), m = { t: 12, r: 12, b: 24 * s, l: 52 * s };
    const { anos, meta } = d;
    const todos = d.linhas.flatMap(l => l.valores);
    if (!todos.some(v => v)) return vazio(el, t("Sem valores no período."));
    const x = d3.scaleBand().domain(anos).range([m.l, W - m.r]).paddingInner(0.2);
    const cx = a => x(a) + x.bandwidth() / 2;
    const y = d3.scaleLinear().domain([0, d3.max(todos)]).nice(4).range([H - m.b, m.t]);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(U.eixo).tickSize(-(W - m.l - m.r))).call(g => g.select(".domain").remove());
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues(anos.filter(a => a % 5 === 0)).tickSize(0)).call(g => g.select(".domain").remove());
    svg.append("rect").attr("class", "ano-ativo").attr("x", x(d.anoAtivo) - 1).attr("width", x.bandwidth() + 2).attr("y", m.t).attr("height", H - m.b - m.t);
    d.linhas.forEach((l, k) => {
      const fech = anos.map((a, i) => [a, l.valores[i]]).filter(([a]) => a !== meta.ano_parcial);
      svg.append("path").attr("fill", "none").attr("stroke", l.cor).attr("stroke-width", 2.2)
        .attr("stroke-dasharray", l.tracejado ? "5 3" : null).attr("d", d3.line().x(p => cx(p[0])).y(p => y(p[1]))(fech));
      if (meta.ano_parcial) {
        const i = anos.indexOf(meta.ano_parcial);
        svg.append("circle").attr("cx", cx(meta.ano_parcial)).attr("cy", y(l.valores[i])).attr("r", 3.5)
          .attr("fill", "#fff").attr("stroke", l.cor).attr("stroke-width", 2);
      }
    });
    svg.append("g").selectAll("rect").data(anos).join("rect").attr("x", a => x(a)).attr("width", x.bandwidth())
      .attr("y", m.t).attr("height", H - m.b - m.t).attr("fill", "transparent")
      .on("mousemove", (ev, a) => {
        const i = anos.indexOf(a);
        U.dica.mostrar(`<b>${U.rotuloAno(a, meta)}</b><br>` + d.linhas.map(l => `<span style="color:${l.cor}">●</span> ${l.nome}: ${U.usd(l.valores[i])}`).join("<br>"), ev);
      }).on("mouseleave", U.dica.esconder);
  });

  /* Sankey (d3-sankey). d = {nos:[{id, nome, cor, col}], links:[{s, t, v, cor}], total, rotulo} */
  G.sankey = (el) => responsivo(el, d => {
    if (d.mensagem) return vazio(el, d.mensagem);
    const W = U.largura(el);
    const lab = Math.min(170, W * 0.24);
    const H = Math.max(380, d.nos.length * 20);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    const sk = d3.sankey().nodeId(n => n.id).nodeWidth(12).nodePadding(9)
      .nodeSort(null).linkSort(null)
      .extent([[lab, 6], [W - lab, H - 6]]);
    const g = sk({ nodes: d.nos.map(n => Object.assign({}, n)), links: d.links.map(l => ({ source: l.s, target: l.t, value: l.v, cor: l.cor })) });
    const pct = v => U.pct(v / d.total * 100, false);
    svg.append("g").attr("fill", "none").selectAll("path").data(g.links).join("path")
      .attr("d", d3.sankeyLinkHorizontal()).attr("stroke", l => l.cor).attr("stroke-opacity", 0.38)
      .attr("stroke-width", l => Math.max(1, l.width)).attr("class", "sk-link")
      .on("mousemove", (ev, l) => U.dica.mostrar(`<b>${l.source.nome} → ${l.target.nome}</b><br>${U.usd(l.value)}<br>${t`${pct(l.value)} do fluxo do ano`}`, ev))
      .on("mouseleave", U.dica.esconder);
    const no = svg.append("g").selectAll("g").data(g.nodes).join("g");
    no.append("rect").attr("x", n => n.x0).attr("y", n => n.y0).attr("height", n => Math.max(1, n.y1 - n.y0))
      .attr("width", n => n.x1 - n.x0).attr("fill", n => n.cor)
      .on("mousemove", (ev, n) => U.dica.mostrar(`<b>${n.nome}</b><br>${U.usd(n.value)}<br>${t`${pct(n.value)} do fluxo do ano`}`, ev))
      .on("mouseleave", U.dica.esconder);
    no.append("text").attr("class", "sk-rotulo")
      .attr("x", n => n.x0 < W / 2 ? n.x0 - 6 : n.x1 + 6)
      .attr("y", n => (n.y0 + n.y1) / 2).attr("dy", "0.35em")
      .attr("text-anchor", n => n.x0 < W / 2 ? "end" : "start")
      .text(n => (n.y1 - n.y0 > 5 || n.col !== 1) ? n.nome : "")
      .each(function (n) {
        if (n.col === 1) { d3.select(this).attr("x", n.x1 + 4).attr("text-anchor", "start"); return; }
        const s = d3.select(this); let t = n.nome;
        while (this.getComputedTextLength() > lab - 10 && t.length > 4) { t = t.slice(0, -2); s.text(t + "…"); }
      });
  });

  /* Barras empilhadas horizontais (alternativa ao Sankey no celular). d = {linhas:[{rotulo, partes:[{nome, cor, v}]}], legenda:[{nome, cor}]} */
  G.empilhadoH = (el) => responsivo(el, d => {
    const W = U.largura(el), s = U.escalaTexto(), lh = 24 * s, m = { t: 4, r: 10, b: 22 * s, l: Math.min(140 * s, W * (s > 1 ? 0.45 : 0.36)) };
    const H = m.t + m.b + d.linhas.length * lh;
    const max = d3.max(d.linhas, l => d3.sum(l.partes, p => p.v));
    const x = d3.scaleLinear().domain([0, max]).nice(3).range([m.l, W - m.r]);
    const y = d3.scaleBand().domain(d.linhas.map((_, i) => i)).range([m.t, H - m.b]).paddingInner(0.25);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", d.rotulo);
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(3).tickFormat(U.eixo).tickSize(-(H - m.t - m.b))).call(g => g.select(".domain").remove());
    d.linhas.forEach((l, i) => {
      let acc = 0;
      svg.append("text").attr("class", "rank-rotulo").attr("x", m.l - 6).attr("y", y(i) + y.bandwidth() / 2).attr("dy", "0.35em")
        .attr("text-anchor", "end").text(l.rotulo).each(function () {
          const s = d3.select(this); let t = l.rotulo;
          while (this.getComputedTextLength() > m.l - 10 && t.length > 4) { t = t.slice(0, -2); s.text(t + "…"); }
        }).append("title").text(l.rotulo);
      l.partes.forEach(p => {
        svg.append("rect").attr("x", x(acc)).attr("width", Math.max(0.5, x(acc + p.v) - x(acc))).attr("y", y(i)).attr("height", y.bandwidth())
          .attr("fill", p.cor)
          .on("mousemove", ev => U.dica.mostrar(`<b>${l.rotulo}</b><br>${p.nome}: ${U.usd(p.v)}<br>${t`${U.pct(p.v / d.total * 100, false)} do fluxo do ano`}`, ev))
          .on("mouseleave", U.dica.esconder);
        acc += p.v;
      });
    });
    const leg = d3.select(el).append("p").attr("class", "legenda-html");
    d.legenda.forEach(p => leg.append("span").html(`<i style="background:${p.cor}"></i>${p.nome}`));
  });

  window.Graficos = G;
})();
