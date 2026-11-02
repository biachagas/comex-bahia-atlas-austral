/* Faixa histórica: uma barra por ano (nunca soma de anos).
   Clique troca o ano; "play" percorre os anos; ano parcial hachurado. */
(function () {
  function Faixa(el, opcoes) {
    const o = Object.assign({ aoEscolher: () => {} }, opcoes);
    el.classList.add("faixa");
    el.innerHTML = `
      <div class="faixa-topo">
        <button type="button" class="btn-play" aria-label="${t("Percorrer os anos automaticamente")}">▶ Play</button>
        <span class="faixa-titulo"></span>
      </div>
      <div class="faixa-grafico"></div>`;
    const btnPlay = el.querySelector(".btn-play");
    const box = el.querySelector(".faixa-grafico");
    let dados = null, ano = null, timer = null;

    function parar() { clearInterval(timer); timer = null; btnPlay.textContent = "▶ Play"; btnPlay.setAttribute("aria-pressed", "false"); }
    // "Pausar animações" (menu de acessibilidade) interrompe o Play em andamento
    const aoA11y = ev => {
      if (!el.isConnected) return document.removeEventListener("atlas-a11y", aoA11y);
      if (ev.detail.estado.semAnimacao && timer) parar();
    };
    document.addEventListener("atlas-a11y", aoA11y);
    btnPlay.addEventListener("click", () => {
      if (timer) return parar();
      if (U.semAnimacao()) return;
      btnPlay.textContent = "❚❚ " + t("Pausar"); btnPlay.setAttribute("aria-pressed", "true");
      const anos = dados.anos;
      let i = anos.indexOf(ano);
      if (i === anos.length - 1) i = -1;
      const passo = () => {
        i += 1;
        if (i >= anos.length) return parar();
        o.aoEscolher(anos[i]);
      };
      passo();
      timer = setInterval(passo, 1300);
    });

    function desenhar() {
      if (!dados) return;
      const { anos, valores, parcial, cor, titulo } = dados;
      el.querySelector(".faixa-titulo").textContent = titulo;
      const W = U.largura(box), s = U.escalaTexto(), H = Math.round(96 * Math.sqrt(s)), m = { t: 6, r: 4, b: 18 * s, l: 42 * s };
      const x = d3.scaleBand().domain(anos).range([m.l, W - m.r]).paddingInner(0.18);
      const vs = anos.map(a => valores[a] || 0);
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(vs)), Math.max(0, d3.max(vs))]).nice().range([H - m.b, m.t]);
      box.innerHTML = "";
      const svg = d3.select(box).append("svg").attr("width", W).attr("height", H)
        .attr("role", "group").attr("aria-label", titulo + ". " + t("Use as setas para trocar o ano."));
      svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(3).tickFormat(U.eixo).tickSize(-(W - m.l - m.r)))
        .call(g => g.select(".domain").remove());
      const barras = svg.append("g").selectAll("g").data(anos).join("g")
        .attr("class", d => "barra" + (d === ano ? " ativa" : ""))
        .attr("tabindex", d => d === ano ? 0 : -1)
        .attr("role", "button")
        .attr("aria-label", d => `${U.rotuloAno(d, dados.meta)}: ${U.usd(valores[d])}`)
        .on("click", (ev, d) => { parar(); o.aoEscolher(d); })
        .on("keydown", (ev, d) => {
          const i = anos.indexOf(d);
          if (ev.key === "ArrowRight" && i < anos.length - 1) { ev.preventDefault(); parar(); o.aoEscolher(anos[i + 1]); focar(); }
          if (ev.key === "ArrowLeft" && i > 0) { ev.preventDefault(); parar(); o.aoEscolher(anos[i - 1]); focar(); }
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); parar(); o.aoEscolher(d); }
        })
        .on("mousemove", (ev, d) => U.dica.mostrar(`<b>${U.rotuloAno(d, dados.meta)}</b><br>${U.usd(valores[d])}`, ev))
        .on("mouseleave", U.dica.esconder);
      barras.append("rect").attr("class", "alvo")
        .attr("x", d => x(d) - 1).attr("width", x.bandwidth() + 2).attr("y", m.t).attr("height", H - m.b - m.t)
        .attr("fill", "transparent");
      barras.append("rect").attr("class", "valor")
        .attr("x", d => x(d)).attr("width", x.bandwidth())
        .attr("y", d => y(Math.max(0, valores[d] || 0)))
        .attr("height", d => Math.max(valores[d] ? 1 : 0, Math.abs(y(valores[d] || 0) - y(0))))
        .attr("fill", d => d === parcial ? U.hachura(cor(valores[d])) : cor(valores[d]))
        .attr("stroke", d => d === parcial ? cor(valores[d]) : null)
        .attr("opacity", d => d === ano ? 1 : 0.42);
      // rótulos de anos (a cada 5 + o ano ativo)
      svg.append("g").selectAll("text").data(anos.filter(a => a % 5 === 0 || a === ano || a === anos[0]))
        .join("text").attr("class", d => "faixa-ano" + (d === ano ? " ativo" : ""))
        .attr("x", d => x(d) + x.bandwidth() / 2).attr("y", H - 4).attr("text-anchor", "middle")
        .text(d => d === parcial ? d + "*" : d);
      if (y.domain()[0] < 0) svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("class", "linha-zero");
    }
    function focar() { setTimeout(() => { const a = el.querySelector(".barra.ativa"); if (a) a.focus(); }, 0); }

    new ResizeObserver(U.debounce(desenhar, 120)).observe(box);
    return {
      atualizar(d, anoAtivo) { dados = d; ano = anoAtivo; desenhar(); },
      parar
    };
  }
  window.Faixa = Faixa;
})();
