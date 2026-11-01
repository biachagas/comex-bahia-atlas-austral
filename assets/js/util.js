/* Funções comuns: formatação brasileira, carga de dados, URL, dica, CSV */
(function () {
  const LOC = {
    pt: d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["US$ ", ""] }),
    en: d3.formatLocale({ decimal: ".", thousands: ",", grouping: [3], currency: ["US$ ", ""] })
  };
  const loc = () => LOC[I18N.lang] || LOC.pt;
  const fInt = v => loc().format(",.0f")(v);
  const f1 = v => loc().format(",.1f")(v);
  const UN = () => I18N.lang === "en" ? { bi: "bn", mi: "mn", mil: "k" } : { bi: "bi", mi: "mi", mil: "mil" };

  const U = {};
  U.int = v => (v == null || isNaN(v)) ? "—" : fInt(Math.round(v)).replace("-", "−");
  U.usd = v => (v == null || isNaN(v)) ? "—" : (v < 0 ? "−US$ " : "US$ ") + fInt(Math.abs(Math.round(v)));
  U.pct = (p, sinal = true) => {
    if (p == null || isNaN(p) || !isFinite(p)) return "—";
    const s = f1(Math.abs(p)) + "%";
    if (!sinal) return (p < 0 ? "−" : "") + s;
    return (p > 0 ? "+" : p < 0 ? "−" : "") + s;
  };
  // Cartões: sem casas decimais, em milhões (ou mil quando pequeno)
  U.usdMi = v => {
    if (v == null || isNaN(v)) return "—";
    const a = Math.abs(v), neg = v < 0 ? "−" : "", u = UN();
    if (a >= 1e6) return `${neg}US$ ${fInt(Math.round(a / 1e6))} ${u.mi}`;
    if (a >= 1e3) return `${neg}US$ ${fInt(Math.round(a / 1e3))} ${u.mil}`;
    return `${neg}US$ ${fInt(a)}`;
  };
  // Eixos: mil / mi / bi  (k / mn / bn em inglês)
  U.eixo = v => {
    const a = Math.abs(v), neg = v < 0 ? "−" : "", u = UN();
    const g = x => loc().format(",~r")(+x.toPrecision(3));
    if (a >= 1e9) return neg + g(a / 1e9) + " " + u.bi;
    if (a >= 1e6) return neg + g(a / 1e6) + " " + u.mi;
    if (a >= 1e3) return neg + g(a / 1e3) + " " + u.mil;
    return neg + g(a);
  };
  U.nomeFluxo = new Proxy({ EXP: "Exportação", IMP: "Importação", SALDO: "Saldo" }, { get: (o, k) => t(o[k]) });
  U.fluxoMin = f => I18N.lang === "en" ? U.nomeFluxo[f].toLowerCase() : U.nomeFluxo[f].toLowerCase();
  U.corFluxo = f => f === "IMP" ? ATLAS_CONFIG.cores.imp : ATLAS_CONFIG.cores.exp;
  U.data = iso => new Date(iso + "T12:00").toLocaleDateString(I18N.lang === "en" ? "en-GB" : "pt-BR");
  U.atualizado = meta => t`Dados atualizados em ${U.data(meta.gerado_em)} · Comex Stat até setembro de 2026.`;

  // ---------- carga de dados com cache ----------
  const cache = new Map();
  U.json = url => {
    if (!cache.has(url)) {
      cache.set(url, fetch(url).then(r => {
        if (!r.ok) throw new Error(`Falha ao carregar ${url} (${r.status})`);
        return r.json();
      }).catch(e => { cache.delete(url); throw e; }));
    }
    return cache.get(url);
  };

  // ---------- estado na URL: #pagina?ano=2025&fluxo=EXP ----------
  U.lerHash = () => {
    const h = location.hash.replace(/^#/, "");
    const [pag, qs] = h.split("?");
    return { pagina: pag || "territorio", params: Object.fromEntries(new URLSearchParams(qs || "")) };
  };
  U.gravarHash = (pagina, params) => {
    params = Object.assign({}, params, { lang: I18N.lang === "en" ? "en" : null });
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ""));
    const novo = "#" + pagina + (qs.toString() ? "?" + qs : "");
    if (location.hash !== novo) history.replaceState(null, "", novo);
  };

  // ---------- dica (tooltip) única ----------
  let tip;
  U.dica = {
    mostrar(html, ev) {
      if (!tip) { tip = document.createElement("div"); tip.className = "dica"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
      tip.innerHTML = html; tip.style.display = "block"; U.dica.mover(ev);
    },
    mover(ev) {
      if (!tip || !ev) return;
      const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
      if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
      tip.style.left = Math.max(4, x) + "px"; tip.style.top = Math.max(4, y) + "px";
    },
    esconder() { if (tip) tip.style.display = "none"; }
  };

  // ---------- CSV (separador ; e BOM, abre direto no Excel em português) ----------
  U.baixarCSV = (nome, cab, linhas) => {
    const esc = v => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const txt = "﻿" + [cab, ...linhas].map(l => l.map(esc).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.numCSV = v => v == null ? "" : String(Math.round(v));
  U.pctCSV = v => v == null ? "" : v.toFixed(1).replace(".", ",");

  const MESES = { pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
                  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
  const mes = i => (MESES[I18N.lang] || MESES.pt)[i];
  U.rotuloParcial = meta => I18N.lang === "en" ? `${meta.ano_parcial} (partial, Jan–${mes(meta.mes_parcial - 1)})` : meta.rotulo_parcial;
  U.rotuloAno = (ano, meta) => ano === meta.ano_parcial ? U.rotuloParcial(meta) : String(ano);
  U.textoBase = (ano, meta) => {
    if (ano === meta.anos[0]) return t("sem ano anterior na série");
    if (ano !== meta.ano_parcial) return `vs ${ano - 1}`;
    return I18N.lang === "en" ? `vs Jan–${mes(meta.mes_parcial - 1)} ${ano - 1}` : `vs jan–${mes(meta.mes_parcial - 1)} de ${ano - 1}`;
  };

  // largura disponível de um elemento
  U.largura = el => Math.max(200, Math.floor(el.getBoundingClientRect().width));

  // Hachura (ano parcial) na cor pedida – cria o padrão SVG global sob demanda
  U.hachura = cor => {
    const id = "h-" + cor.replace("#", "");
    if (!document.getElementById(id)) {
      let defs = document.getElementById("defs-globais");
      const p = d3.select(defs).append("pattern").attr("id", id).attr("patternUnits", "userSpaceOnUse")
        .attr("width", 6).attr("height", 6).attr("patternTransform", "rotate(45)");
      p.append("rect").attr("width", 6).attr("height", 6).attr("fill", cor).attr("opacity", 0.28);
      p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", cor).attr("stroke-width", 3);
    }
    return `url(#${id})`;
  };

  U.debounce =(fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  U.semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  window.U = U;
})();
