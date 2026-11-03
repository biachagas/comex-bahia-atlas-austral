/* Rodapé de cada página: texto fixo + fonte + faixas de logos (navy e clara). */
(function () {
  const L = "assets/img/logos/";
  function html(pagina) {
    const txt = ATLAS_CONFIG.rodape[pagina];
    return `<footer class="rodape-pagina">
        ${txt ? `<p>${t(txt)}</p>` : ""}
        <p>${t(ATLAS_CONFIG.fonte)}</p>
        <p>${t("Este painel faz parte do")} <a href="https://biachagas.github.io/atlas-austral/${I18N.lang === "en" ? "?lang=en" : ""}">${t("site Atlas Austral")}</a>.</p>
      </footer>
      <div class="faixa-logos" role="contentinfo" aria-label="${t("Instituições")}">
        <img src="${L}ppdru-branco.png" alt="PPDRU – ${t("Programa de Pós-Graduação em Desenvolvimento Regional e Urbano")}" class="logo-ppdru" width="640" height="237" loading="lazy">
        <img src="${L}unifacs-branco.png" alt="UNIFACS – Universidade Salvador" class="logo-unifacs" width="640" height="138" loading="lazy">
        <img src="${L}anima-branco.png" alt="${t("Ecossistema Ânima")}" class="logo-anima" width="640" height="478" loading="lazy">
        <img src="${L}capes-branca.svg" alt="CAPES – ${t("Coordenação de Aperfeiçoamento de Pessoal de Nível Superior")}" class="logo-capes" width="775" height="151" loading="lazy">
      </div>`;
  }
  window.Rodape = { html };
})();
