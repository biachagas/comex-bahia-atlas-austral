/* =========================================================
   CONFIGURAÇÃO – é aqui que você edita rótulos, chave e cores.
   (Comércio Exterior da Bahia – Atlas Austral)
   ========================================================= */
window.ATLAS_CONFIG = {
  // Rótulos das abas (editáveis). A chave "territorio" é o rótulo da página Municípios (endereço #municipios).
  rotulos: {
    territorio: "Municípios",
    escoamento: "Escoamento",
    segmentos: "Segmentos",
    metodologia: "Metodologia e Créditos"
  },

  // Textos fixos dos rodapés (texto exato do briefing)
  fonte: "Fonte: Comex Stat (MDIC/SECEX). Dados até setembro de 2026 (2026 parcial).",
  rodape: {
    territorio: "Empresas com domicílio fiscal na Bahia.",
    segmentos: "Empresas com domicílio fiscal na Bahia.",
    escoamento: "Mercadorias com origem (exportação) ou destino (importação) na Bahia."
  },

  // Mapa de fundo claro: CARTO Positron. A chave é pública por natureza
  // (fica no navegador) e está restrita ao domínio biachagas.github.io.
  // Se trocar de chave, mude só a linha abaixo.
  cartoKey: "cb1_4zg8_1_2fddb9034ea8e4e72e041534",
  fundoClaro: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key={key}",
    sub: ["a", "b", "c", "d"],
    atribuicao: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxZoom: 18
  },

  cores: {
    navy: "#0C1E33", areia: "#F3E7D3", exp: "#F2691F", imp: "#62B7B2", rosa: "#E85A8A",
    quente: ["#FBEBDA", "#F8C9A0", "#F59458", "#F2691F", "#A83F12"],
    agua: ["#E4F3F2", "#B4DCD9", "#62B7B2", "#2E8C87", "#16304D"],
    divergente: ["#1F6F6A", "#62B7B2", "#F3E7D3", "#F59A5F", "#D2476F"],
    semValor: "#FFFFFF",
    // 10 grupos de produtos (ordem igual à de scripts/gerar_dados.py e scripts/grupos.csv)
    grupos: ["#C9A66B", "#E3B505", "#0C1E33", "#E85A8A", "#7A8B2E", "#5B7A99", "#A83F12", "#2E8C87", "#7B5EA7", "#B8B0A2"],
    demaisGrupos: "#D9D2C5",
    // Sankey: local da URF
    urfBA: "#0C1E33", urfFora: "#8FA3B8", urfSemUF: "#D6CEC0", via: "#3D4A5A"
  },

  // Satélite (só na página Escoamento): EOX Sentinel-2 cloudless 2023, uso não comercial com atribuição
  fundoSatelite: {
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg",
    retina: false,
    atribuicao: '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless – https://s2maps.eu</a> by <a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2023)',
    maxZoom: 14,
    escuro: true
  }
};
