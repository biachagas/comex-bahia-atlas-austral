/* Componente de mapa feito só com d3 (sem dependências externas).
   - Projeção Web Mercator compatível com tiles XYZ.
   - Camada de fundo opcional (tiles); se não carregar, o mapa segue legível.
   - Camadas vetoriais desenhadas uma vez e movidas por transformação (rápido). */
(function () {
  const Z = 4096; // vetores desenhados na escala do zoom 12 (precisão)
  const projBase = d3.geoMercator().scale(256 * Z / (2 * Math.PI)).translate([128 * Z, 128 * Z]);
  const caminho = d3.geoPath(projBase);

  function AtlasMapa(el, opcoes = {}) {
    const o = Object.assign({ rotulo: "Mapa", minZoom: 3, maxZoom: 14 }, opcoes);
    el.classList.add("mapa");
    el.innerHTML = "";
    const svg = d3.select(el).append("svg")
      .attr("role", "img").attr("aria-label", o.rotulo);
    const gTiles = svg.append("g").attr("class", "tiles");
    const gVet = svg.append("g").attr("class", "vetor");
    const ui = d3.select(el);
    const ctrl = ui.append("div").attr("class", "mapa-ctrl");
    const btn = (txt, tit, fn) => ctrl.append("button").attr("type", "button").attr("title", tit).attr("aria-label", tit).text(txt).on("click", fn);
    btn("+", t("Aproximar"), () => svg.transition().duration(250).call(zoom.scaleBy, 1.6));
    btn("−", t("Afastar"), () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
    btn("⌂", t("Enquadrar a Bahia"), () => api.enquadrar(null, true));
    const bLeg = btn("☰", t("Mostrar ou esconder a legenda"), () => {
      const fechada = el.classList.toggle("legenda-fechada");
      bLeg.attr("aria-expanded", !fechada);
    }).attr("class", "btn-legenda");
    if (window.innerWidth < 641) el.classList.add("legenda-fechada");
    bLeg.attr("aria-expanded", !el.classList.contains("legenda-fechada"));
    const atrib = ui.append("div").attr("class", "mapa-atrib");
    const legenda = ui.append("div").attr("class", "mapa-legenda");
    const aviso = ui.append("div").attr("class", "mapa-aviso").attr("role", "status");

    let W = 0, H = 0, tr = d3.zoomIdentity, fundo = null, limites = null;
    const aoZoom = [];

    const zoom = d3.zoom()
      .scaleExtent([2 ** o.minZoom, 2 ** o.maxZoom])
      .on("zoom", ev => { tr = ev.transform; desenhar(); });
    svg.call(zoom).on("dblclick.zoom", null);
    svg.on("click", ev => { if (ev.target === svg.node() && o.aoClicarFundo) o.aoClicarFundo(); });

    function desenhar() {
      gVet.attr("transform", `translate(${tr.x},${tr.y}) scale(${tr.k / Z})`);
      aoZoom.forEach(f => f(tr.k / Z));
      desenharTiles();
    }

    function desenharTiles() {
      if (!fundo) { gTiles.selectAll("image").remove(); return; }
      const z = Math.max(0, Math.min(fundo.maxZoom || 18, Math.round(Math.log2(tr.k))));
      const n = 2 ** z, ts = 256 * tr.k / n;
      const x0 = Math.floor(-tr.x / ts), x1 = Math.ceil((W - tr.x) / ts);
      const y0 = Math.max(0, Math.floor(-tr.y / ts)), y1 = Math.min(n, Math.ceil((H - tr.y) / ts));
      const lista = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) lista.push({ x, y, z, k: `${z}/${x}/${y}` });
      const r = window.devicePixelRatio > 1 ? "@2x" : "";
      gTiles.selectAll("image").data(lista, d => d.k)
        .join(en => en.append("image")
          .attr("preserveAspectRatio", "none")
          .on("error", function () { d3.select(this).attr("visibility", "hidden"); fundoFalhou(); })
          .attr("href", d => {
            const xx = ((d.x % n) + n) % n;
            return fundo.url.replace("{s}", fundo.sub ? fundo.sub[(xx + d.y) % fundo.sub.length] : "")
              .replace("{z}", d.z).replace("{x}", xx).replace("{y}", d.y)
              .replace("{r}", fundo.retina === false ? "" : r).replace("{key}", fundo.key || "");
          }))
        .attr("x", d => d.x * ts + tr.x).attr("y", d => d.y * ts + tr.y)
        .attr("width", ts + 0.5).attr("height", ts + 0.5);
    }

    let avisado = false;
    function fundoFalhou() {
      if (avisado) return; avisado = true;
      aviso.text(t("Mapa de fundo indisponível (sem internet ou serviço fora do ar). Os dados continuam visíveis."))
        .classed("ativo", true);
      setTimeout(() => aviso.classed("ativo", false), 6000);
    }

    function medir() {
      const r = el.getBoundingClientRect();
      W = Math.max(50, r.width); H = Math.max(50, r.height);
      svg.attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    }

    const api = {
      el, svg, gVet,
      projetar: lonlat => projBase(lonlat),
      caminho,
      fator: () => tr.k / Z,
      aoZoom: f => aoZoom.push(f),
      setFundo(f) {
        fundo = f; avisado = false;
        gTiles.selectAll("image").remove();
        atrib.html(f ? f.atribuicao : "");
        el.classList.toggle("satelite", !!(f && f.escuro));
        desenharTiles();
      },
      legenda: html => legenda.html(html).style("display", html ? null : "none"),
      enquadrar(geo, animar) {
        if (geo) limites = geo;
        if (!limites) return;
        medir();
        const b = d3.geoPath(d3.geoMercator().scale(256 / (2 * Math.PI)).translate([128, 128])).bounds(limites);
        const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
        const pad = W < 600 ? 0.94 : 0.88;
        const k = Math.min(2 ** o.maxZoom, pad * Math.min(W / dx, H / dy));
        const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
        const nt = d3.zoomIdentity.translate(W / 2 - k * cx, H / 2 - k * cy).scale(k);
        (animar ? svg.transition().duration(400) : svg).call(zoom.transform, nt);
      },
      redimensionar() { medir(); desenhar(); }
    };

    medir();
    new ResizeObserver(U.debounce(() => { const k0 = W; medir(); if (Math.abs(W - k0) > 40) api.enquadrar(); else desenhar(); }, 120)).observe(el);
    return api;
  }

  window.AtlasMapa = AtlasMapa;
})();
