/* Navegação entre as 4 abas, idioma (PT | EN), estado na URL e modo apresentação */
(function () {
  const R = ATLAS_CONFIG.rotulos;
  const PAGINAS = [
    { id: "municipios", rotulo: () => t(R.territorio), montar: (el, p) => PaginaTerritorio.montar(el, p) },
    { id: "escoamento", rotulo: () => t(R.escoamento), montar: (el, p) => PaginaEscoamento.montar(el, p) },
    { id: "segmentos", rotulo: () => t(R.segmentos), montar: (el, p) => PaginaSegmentos.montar(el, p) },
    { id: "metodologia", rotulo: () => t(R.metodologia), montar: (el, p) => PaginaMetodologia.montar(el, p) }
  ];

  const nav = document.getElementById("abas");
  const conteudo = document.getElementById("conteudo");
  const bA = document.getElementById("btn-apresentacao");
  const bL = document.getElementById("btn-idioma");
  let atual = null;

  function textosFixos() {
    nav.innerHTML = PAGINAS.map(p => `<a href="#${p.id}${I18N.lang === "en" ? "?lang=en" : ""}" data-pag="${p.id}">${p.rotulo()}</a>`).join("");
    nav.setAttribute("aria-label", t("Páginas"));
    const on = document.documentElement.classList.contains("apresentacao");
    bA.textContent = on ? t("Sair da apresentação") : t("Modo apresentação");
    bL.innerHTML = `<span class="${I18N.lang === "pt" ? "ativo" : ""}">PT</span><span class="${I18N.lang === "en" ? "ativo" : ""}">EN</span>`;
    bL.setAttribute("aria-label", I18N.lang === "en" ? "Ver em português" : "View in English");
    bL.setAttribute("title", I18N.lang === "en" ? "Ver em português" : "View in English");
    document.querySelector(".pular").textContent = t("Pular para o conteúdo");
    document.querySelector(".marca").setAttribute("aria-label", t("Atlas Austral – início"));
    const lA = document.getElementById("link-atlas");
    lA.querySelector(".la-longo").textContent = t("Voltar ao Atlas");
    lA.setAttribute("aria-label", t("Voltar ao site Atlas Austral"));
    lA.href = "https://biachagas.github.io/atlas-austral/" + (I18N.lang === "en" ? "?lang=en" : "");
  }

  async function rotear(forcar) {
    const { pagina, params } = U.lerHash();
    const lang = params.lang === "en" ? "en" : "pt";
    const mudouIdioma = lang !== I18N.lang;
    if (mudouIdioma) I18N.definir(lang);
    const p = PAGINAS.find(x => x.id === pagina) || PAGINAS[0];
    if (atual === p.id && !forcar && !mudouIdioma) return; // mudança só de parâmetros: a página já cuida
    atual = p.id;
    textosFixos();
    nav.querySelectorAll("a").forEach(a => {
      const on = a.dataset.pag === p.id;
      a.classList.toggle("ativa", on);
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    document.getElementById("titulo-pagina").textContent = p.rotulo();
    document.title = `${p.rotulo()} · ${t("Comércio Exterior da Bahia")} – Atlas Austral`;
    U.dica.esconder();
    conteudo.innerHTML = `<p class="carregando-pagina">${t("Carregando…")}</p>`;
    try { await p.montar(conteudo, params); }
    catch (e) {
      console.error(e);
      const local = location.protocol === "file:";
      conteudo.innerHTML = `<div class="cartao erro"><p>${local
        ? t("Não foi possível carregar esta página. Se você abriu o arquivo direto do computador (file://), use um servidor local — veja o README.")
        : t("Não foi possível carregar esta página. Verifique a conexão e tente de novo.")}</p>
        ${local ? "" : `<button type="button" class="btn btn-sec" id="tentar-de-novo">${t("Tentar de novo")}</button>`}</div>`;
      const bT = document.getElementById("tentar-de-novo");
      if (bT) bT.addEventListener("click", () => rotear(true));
    }
  }
  window.addEventListener("hashchange", () => rotear());

  // Idioma: mantém a página e os filtros atuais, só troca o parâmetro lang
  bL.addEventListener("click", () => {
    const { pagina, params } = U.lerHash();
    const novo = I18N.lang === "en" ? "pt" : "en";
    I18N.definir(novo);
    U.gravarHash(pagina, Object.fromEntries(Object.entries(params).filter(([k]) => k !== "lang")));
    rotear(true);
  });

  // Modo apresentação: tela cheia + fontes maiores para projetor
  bA.addEventListener("click", () => {
    const raiz = document.documentElement;
    const on = !raiz.classList.contains("apresentacao");
    raiz.classList.toggle("apresentacao", on);
    bA.setAttribute("aria-pressed", on);
    bA.textContent = on ? t("Sair da apresentação") : t("Modo apresentação");
    if (on && raiz.requestFullscreen) raiz.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.documentElement.classList.contains("apresentacao")) bA.click();
  });

  // Menu de acessibilidade: ao mudar o tamanho do texto, redesenha a página (os gráficos medem os rótulos)
  document.addEventListener("atlas-a11y", async ev => {
    if (!["escala", "restaurar"].includes(ev.detail.mudou)) return;
    const y = window.scrollY;
    await rotear(true);
    window.scrollTo(0, y);
  });

  I18N.definir(U.lerHash().params.lang === "en" ? "en" : "pt");
  rotear(true);
})();
