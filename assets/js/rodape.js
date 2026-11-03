/* Rodapé de cada página: texto fixo + fonte + faixas de logos (navy e clara). */
(function () {
  const L = "assets/img/logos/";
  // "Como citar" do painel: igual em todas as páginas (D109: ABNT, APA 7ª ed. e ISO 690)
  const URL_SITE = "https://biachagas.github.io/comex-bahia-atlas-austral/";
  function citacao(estilo, en) {
    const d = new Date(), dd = d.getDate(), mm = d.getMonth(), aa = d.getFullYear();
    const mesAbnt = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."][mm];
    const iso = `${aa}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const tit = "Comércio Exterior da Bahia – Atlas Austral";
    if (estilo === "apa") return `Chagas, B. G. F. de O., &amp; Oliveira, H. C. de. (2026). <i>${tit}</i> [${en ? "Interactive dashboard" : "Painel interativo"}]. PPDRU/UNIFACS. ${URL_SITE}`;
    if (estilo === "iso") return en
      ? `CHAGAS, Bianca Glória França de Oliveira and OLIVEIRA, Henrique Campos de. <i>${tit}</i> [online]. Salvador: PPDRU/UNIFACS, 2026 [viewed ${iso}]. Available from: ${URL_SITE}`
      : `CHAGAS, Bianca Glória França de Oliveira e OLIVEIRA, Henrique Campos de. <i>${tit}</i> [em linha]. Salvador: PPDRU/UNIFACS, 2026 [consult. ${iso}]. Disponível em: ${URL_SITE}`;
    return `CHAGAS, Bianca Glória França de Oliveira; OLIVEIRA, Henrique Campos de. <i>${tit}</i>. Salvador: PPDRU/UNIFACS, 2026. Disponível em: ${URL_SITE}. Acesso em: ${dd} ${mesAbnt} ${aa}.`;
  }

  const FORMATOS = [["abnt", "ABNT (NBR 6023)"], ["apa", "APA (7ª ed.)", "APA (7th ed.)"], ["iso", "ISO 690"]];
  function blocoCitar() {
    const en = I18N.lang === "en";
    const ops = FORMATOS.map(([k, pt, enr]) => `<option value="${k}">${en && enr ? enr : pt}</option>`).join("");
    return `<section class="cartao citar-bloco" aria-labelledby="cit-tit">
        <h2 id="cit-tit" class="cit-tit">${t("Como citar")}</h2>
        <label class="campo campo-linha">${t("Formato")} <select class="cit-estilo">${ops}</select></label>
        <p class="cit-texto" aria-live="polite">${citacao("abnt", en)}</p>
        <div class="cit-acoes"><button type="button" class="btn btn-sec cit-copiar">${t("Copiar referência")}</button><span class="cit-ok" aria-live="polite"></span></div>
      </section>`;
  }
  // um único ouvinte para todas as páginas (o conteúdo é trocado a cada aba)
  document.addEventListener("change", e => {
    if (!e.target.matches(".cit-estilo")) return;
    const bloco = e.target.closest(".citar-bloco");
    bloco.querySelector(".cit-texto").innerHTML = citacao(e.target.value, I18N.lang === "en");
    bloco.querySelector(".cit-ok").textContent = "";
  });
  document.addEventListener("click", async e => {
    const b = e.target.closest(".cit-copiar");
    if (!b) return;
    const bloco = b.closest(".citar-bloco"), txt = bloco.querySelector(".cit-texto"), ok = bloco.querySelector(".cit-ok");
    try { await navigator.clipboard.writeText(txt.textContent.trim()); ok.textContent = t("Referência copiada."); }
    catch (_) {
      const r = document.createRange(); r.selectNodeContents(txt); getSelection().removeAllRanges(); getSelection().addRange(r);
      ok.textContent = t("Selecionada: use Ctrl+C para copiar.");
    }
  });

  function html(pagina) {
    const txt = ATLAS_CONFIG.rodape[pagina];
    return `${blocoCitar()}
      <footer class="rodape-pagina">
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
