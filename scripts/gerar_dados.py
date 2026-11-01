#!/usr/bin/env python3
"""
Comércio Exterior da Bahia – Atlas Austral
Gera os JSONs pré-agregados do site a partir dos CSVs do Comex Stat.

COMO USAR (no terminal, dentro da pasta do repositório):
    python scripts/gerar_dados.py --dados CAMINHO/DA/PASTA/DOS/CSVS

A pasta de dados precisa ter: fato_municipio.csv, fato_via_urf.csv,
fato_pais_ano.csv, dim_municipio.csv, dim_pais.csv, dim_produto.csv,
dim_urf.csv, dim_via.csv e a subpasta mapas_bahia/ (com ba_municipios.geojson).

Requisito: Python 3.9+ e pandas  (pip install pandas)

Regras aplicadas (ver DECISOES.md):
- Chaves sempre lidas como TEXTO, com zeros à esquerda.
- EXP e IMP nunca são somadas; anos nunca são acumulados.
- Variação %: ano fechado compara o ano inteiro com o ano anterior;
  ano parcial compara só os mesmos meses (ex.: jan–set × jan–set).
- A base Território (fato_municipio) e a base Escoamento (fato_via_urf)
  nunca são somadas nem comparadas entre si.
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

TXT = str
CHAVES = {"cod_mun": TXT, "SH4": TXT, "SH2": TXT, "cod_via": TXT,
          "cod_urf": TXT, "cod_pais": TXT, "fluxo": TXT}
FLUXOS = ["EXP", "IMP"]
N_RANK_PAISES = 25


def ler(pasta: Path, nome: str) -> pd.DataFrame:
    """Lê CSV com vírgula OU ponto e vírgula (exportação do Excel/Power BI), com ou sem BOM."""
    arq = pasta / nome
    if not arq.exists():
        sys.exit(f"ERRO: arquivo não encontrado: {arq}")
    with open(arq, encoding="utf-8-sig") as fh:
        cab = fh.readline()
    sep = ";" if cab.count(";") > cab.count(",") else ","
    df = pd.read_csv(arq, sep=sep, encoding="utf-8-sig", dtype=CHAVES,
                     keep_default_na=False, na_values=[""])
    for c in ("valor_fob", "peso_kg"):
        if c in df:
            df[c] = pd.to_numeric(df[c]).astype("int64")
    for c in ("ano", "mes"):
        if c in df:
            df[c] = df[c].astype(int)
    return df


def checar_chave(df, col, tam):
    ruins = df[df[col].str.len() != tam]
    if len(ruins):
        sys.exit(f"ERRO: {len(ruins)} linhas com {col} fora do tamanho {tam}. "
                 "Confira se a coluna foi salva como texto (zeros à esquerda).")


def salvar(obj, caminho: Path):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def var_pct(atual, anterior):
    if anterior is None or anterior == 0 or pd.isna(anterior):
        return None
    return round((atual - anterior) / anterior * 100, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dados", required=True, help="pasta com os CSVs")
    ap.add_argument("--planilha", help="(opcional) entrega_unifacs_conectividade_comex_bahia.xlsx – usa só as abas 3 e 4")
    ap.add_argument("--saida", default=str(Path(__file__).resolve().parent.parent / "data"),
                    help="pasta data/ do site (padrão: ../data)")
    a = ap.parse_args()
    dados, saida = Path(a.dados), Path(a.saida)

    fm = ler(dados, "fato_municipio.csv")
    fp = ler(dados, "fato_pais_ano.csv")
    dpa = ler(dados, "dim_pais.csv")
    checar_chave(fm, "cod_mun", 7); checar_chave(fm, "SH4", 4)
    checar_chave(fp, "cod_pais", 3)

    geo = json.load(open(dados / "mapas_bahia" / "ba_municipios.geojson", encoding="utf-8"))
    malha = {f["properties"]["CD_MUN"]: f["properties"]["NM_MUN"] for f in geo["features"]}

    # ---------- Casamento município × malha ----------
    sem_malha = sorted(set(fm.cod_mun) - set(malha))
    if sem_malha:
        print("ATENÇÃO – municípios dos dados sem polígono na malha:", sem_malha)

    # ---------- Anos e ano parcial ----------
    meses = fm.groupby("ano").mes.max()
    anos = sorted(int(x) for x in meses.index)
    ano_parcial = None
    ultimo = anos[-1]
    if meses[ultimo] < 12:
        ano_parcial = ultimo
    fechados = [x for x in anos if x != ano_parcial]
    ano_padrao = fechados[-1]
    mes_parcial = int(meses[ano_parcial]) if ano_parcial else 12

    def meses_comparaveis(ano):
        return int(meses[ano])

    # ---------- Totais por município / ano / fluxo ----------
    mun = fm.groupby(["fluxo", "ano", "cod_mun"]).valor_fob.sum()
    # mesma janela de meses do ano parcial (para a variação do ano parcial)
    mun_janela = (fm[fm.mes <= mes_parcial]
                  .groupby(["fluxo", "ano", "cod_mun"]).valor_fob.sum())

    nomes_pais = dict(zip(dpa.cod_pais, dpa.nome_pais))
    pais = fp.groupby(["fluxo", "ano", "cod_pais"]).valor_fob.sum()

    serie_ba = {fl: {} for fl in FLUXOS}
    conferencia = {"anos": {}, "municipios_com_valor": {}}

    for fl in FLUXOS:
        for ano in anos:
            atual = mun.loc[fl, ano] if (fl, ano) in mun.index.droplevel(2) else pd.Series(dtype="int64")
            atual = atual[atual > 0].sort_values(ascending=False)
            total = int(atual.sum())

            # base de comparação
            parcial = (ano == ano_parcial)
            if ano - 1 in anos:
                if parcial:
                    base = mun_janela.loc[fl, ano - 1] if (fl, ano - 1) in mun_janela.index.droplevel(2) else pd.Series(dtype="int64")
                else:
                    base = mun.loc[fl, ano - 1] if (fl, ano - 1) in mun.index.droplevel(2) else pd.Series(dtype="int64")
                total_base = int(base.sum())
            else:
                base, total_base = pd.Series(dtype="int64"), None

            linhas = []
            acum, conc = 0, []
            for i, (cod, v) in enumerate(atual.items(), start=1):
                acum += v
                conc.append(round(acum / total * 100, 2))
                linhas.append([cod, int(v), var_pct(v, base.get(cod)),
                               round(v / total * 100, 3), i])

            top10 = round(atual.head(10).sum() / total * 100, 2) if total else None

            # países (fato_pais_ano = mesma base Território)
            if (fl, ano) in pais.index.droplevel(2):
                p = pais.loc[fl, ano]
                p = p[p > 0].sort_values(ascending=False)
                tp = int(p.sum())
                rank = [[nomes_pais.get(c, c), int(v), round(v / tp * 100, 2)]
                        for c, v in p.head(N_RANK_PAISES).items()]
                resto = int(p.iloc[N_RANK_PAISES:].sum())
                if resto > 0:
                    rank.append(["Demais países", resto, round(resto / tp * 100, 2)])
            else:
                rank, tp = [], 0

            salvar({
                "ano": ano, "fluxo": fl, "parcial": parcial,
                "meses": meses_comparaveis(ano),
                "total": total, "total_base": total_base,
                "var": var_pct(total, total_base),
                "n_mun": len(atual), "top10": top10,
                "mun": linhas, "conc": conc,
                "paises": rank, "total_paises": tp,
            }, saida / "territorio" / f"{fl}_{ano}.json")

            serie_ba[fl][ano] = {"v": total, "var": var_pct(total, total_base)}
            conferencia["anos"].setdefault(ano, {})[fl] = total
            conferencia["anos"][ano][fl + "_paises"] = tp
            if ano == ano_padrao:
                conferencia["municipios_com_valor"][fl] = len(atual)

    # ---------- Série anual por município (para o gráfico histórico) ----------
    piv = (fm.groupby(["cod_mun", "fluxo", "ano"]).valor_fob.sum()
           .unstack("ano").reindex(columns=anos).fillna(0).astype("int64"))
    series = {}
    for (cod, fl), linha in piv.iterrows():
        series.setdefault(cod, {})[fl] = [int(x) for x in linha.values]
    salvar({"anos": anos, "series": series}, saida / "territorio" / "series_municipios.json")

    # ---------- Base Escoamento (só para conferência nesta etapa) ----------
    fv = ler(dados, "fato_via_urf.csv")
    du = ler(dados, "dim_urf.csv")
    checar_chave(fv, "cod_urf", 7); checar_chave(fv, "cod_via", 2)
    urf = (fv[fv.ano == ano_padrao].groupby(["fluxo", "cod_urf"]).valor_fob.sum()
           .reset_index().merge(du[["cod_urf", "nome_urf", "uf_local"]], on="cod_urf", how="left"))
    top_urf = {}
    for fl in FLUXOS:
        t = urf[urf.fluxo == fl].sort_values("valor_fob", ascending=False).head(5)
        top_urf[fl] = [[r.nome_urf, r.uf_local if isinstance(r.uf_local, str) else "",
                        int(r.valor_fob)] for r in t.itertuples()]
    conferencia["top5_urf"] = top_urf
    imp_igual = bool((fm[fm.fluxo == "IMP"].groupby("ano").valor_fob.sum()
                      == fv[fv.fluxo == "IMP"].groupby("ano").valor_fob.sum()).all())
    conferencia["imp_territorio_igual_escoamento"] = imp_igual

    # ---------- Etapa 2: Segmentos e Escoamento ----------
    extra = gerar_segmentos(dados, saida, fm, anos, ano_parcial, mes_parcial)
    extra.update(gerar_escoamento(dados, saida, fv, du, anos, ano_parcial, mes_parcial, ano_padrao))
    conferencia.update(extra.pop("conferencia_seg", {}))
    conferencia.update(extra.pop("conferencia_esc", {}))

    if a.planilha:
        conferencia.update(gerar_planilha(Path(a.planilha), saida, fv, du))

    # ---------- meta ----------
    nomes_meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    rotulo_parcial = (f"{ano_parcial} (parcial, jan–{nomes_meses[mes_parcial - 1]})"
                      if ano_parcial else None)
    salvar({
        "anos": anos, "ano_padrao": ano_padrao, "ano_parcial": ano_parcial,
        "mes_parcial": mes_parcial, "rotulo_parcial": rotulo_parcial,
        "gerado_em": date.today().isoformat(),
        "serie_bahia": serie_ba,
        "grupos": extra["grupos"],
        "serie_escoamento": extra["serie_escoamento"],
        "conferencia": conferencia,
    }, saida / "meta.json")

    # ---------- Relatório de conferência ----------
    fmt = lambda x: f"{x:,.0f}".replace(",", ".")
    linhas = ["# Conferência de números (gerado por scripts/gerar_dados.py)", "",
              f"Gerado em {date.today().isoformat()}. Fonte: CSVs em `{dados}`.", "",
              "## Base Território (fato_municipio) – US$ FOB por ano", "",
              "| Ano | Exportação | Importação | EXP = fato_pais_ano? | IMP = fato_pais_ano? |",
              "|---|---:|---:|:-:|:-:|"]
    for ano in anos:
        c = conferencia["anos"][ano]
        rot = rotulo_parcial if ano == ano_parcial else str(ano)
        linhas.append(f"| {rot} | {fmt(c['EXP'])} | {fmt(c['IMP'])} | "
                      f"{'sim' if c['EXP'] == c['EXP_paises'] else 'NÃO'} | "
                      f"{'sim' if c['IMP'] == c['IMP_paises'] else 'NÃO'} |")
    linhas += ["", f"## Municípios com valor em {ano_padrao} (último ano fechado)", "",
               f"- Exportação: {conferencia['municipios_com_valor']['EXP']}",
               f"- Importação: {conferencia['municipios_com_valor']['IMP']}", "",
               f"## 5 maiores URFs em {ano_padrao} (base Escoamento)", ""]
    for fl in FLUXOS:
        linhas.append(f"**{'Exportação' if fl == 'EXP' else 'Importação'}**")
        linhas.append("")
        for i, (n, uf, v) in enumerate(top_urf[fl], 1):
            linhas.append(f"{i}. {n} ({uf or 'UF não informada'}) – US$ {fmt(v)}")
        linhas.append("")
    linhas.append(f"Importação idêntica entre Território e Escoamento em todos os anos: "
                  f"{'sim' if imp_igual else 'NÃO'} (texto apenas; as bases não são somadas).")
    linhas += ["", "## Segmentos (base Território)", "",
               f"- Soma dos grupos = total do ano, em todos os anos e fluxos: {'sim' if conferencia['seg_soma_ok'] else 'NÃO'}",
               f"- Soma dos 30 segmentos = total do ano, em todos os anos e fluxos: {'sim' if conferencia['seg_segmentos_ok'] else 'NÃO'}",
               f"- Grupos em {ano_padrao} (exportação): " + "; ".join(f"{g} {p:.1f}%".replace('.', ',') for g, p in conferencia['seg_grupos_exp']),
               f"- Grupos em {ano_padrao} (importação): " + "; ".join(f"{g} {p:.1f}%".replace('.', ',') for g, p in conferencia['seg_grupos_imp']),
               "", "## Escoamento (base fato_via_urf)", "",
               "| Ano | Exportação | Importação |", "|---|---:|---:|"]
    for ano in anos:
        rot = rotulo_parcial if ano == ano_parcial else str(ano)
        linhas.append(f"| {rot} | {fmt(extra['serie_escoamento']['EXP'][ano]['v'])} | {fmt(extra['serie_escoamento']['IMP'][ano]['v'])} |")
    linhas += ["", f"- Soma das vias = soma das URFs, em todos os anos e fluxos: {'sim' if conferencia['esc_vias_ok'] else 'NÃO'}",
               f"- URFs com valor em {ano_padrao} sem coordenada (listadas em nota, fora do mapa): "
               f"EXP {conferencia['esc_sem_coord'][0]}, IMP {conferencia['esc_sem_coord'][1]}",
               f"- Sankey: o que entra = o que sai em cada via, em todos os anos e fluxos: {'sim' if conferencia['esc_sankey_ok'] else 'NÃO'}"]
    if "plan_ok" in conferencia:
        linhas += ["", "## Planilha de conectividade (aba 4: desembaraço 2023–2025)", "",
                   "| Ano | Planilha (US$) | fato_via_urf, EXP marítima (US$) | Peso confere? |", "|---|---:|---:|:-:|"]
        for ano, (vp, vc, pok) in sorted(conferencia["plan_anos"].items()):
            linhas.append(f"| {ano} | {fmt(vp)} | {fmt(vc)} | {'sim' if pok else 'NÃO'} |")
        linhas.append("")
        linhas.append(f"Bloco publicado no site: {'sim' if conferencia['plan_ok'] else 'NÃO (totais não conferem)'}. TEU estimado: não publicado (decisão da autora).")
    Path(saida.parent / "CONFERENCIA_NUMEROS.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print("\n".join(linhas))
    print("\nOK – JSONs gravados em", saida)


# ======================================================================
# SEGMENTOS (base Território = fato_municipio, domicílio fiscal)
# ======================================================================
GRUPOS = ["Grãos, oleaginosas e fibras", "Agro tropical e alimentos", "Petróleo e combustíveis",
          "Química e petroquímica", "Fertilizantes", "Celulose e papel", "Minerais e metais",
          "Máquinas, veículos e borracha", "Couro, têxteis e calçados", "Outros"]


def classificar_grupos(dpr: pd.DataFrame, arq_grupos: Path) -> pd.DataFrame:
    """Grupo pelo segmento; se o segmento for 'Demais produtos' (ou vazio), pelo capítulo SH2."""
    g = pd.read_csv(arq_grupos, sep=";", dtype=str, encoding="utf-8-sig")
    por_seg = {r.chave: r.grupo for r in g[g.tipo == "segmento"].itertuples()}
    por_sh2 = {}
    for r in g[g.tipo == "sh2"].itertuples():
        for parte in r.chave.split(","):
            a, b = (parte.split("-") + [parte])[:2]
            for i in range(int(a), int(b) + 1):
                por_sh2[f"{i:02d}"] = r.grupo
    desconhecidos = set(g.grupo) - set(GRUPOS)
    if desconhecidos:
        sys.exit(f"ERRO: grupos fora da lista oficial em grupos.csv: {desconhecidos}")
    dpr = dpr.copy()
    dpr["segmento"] = dpr["segmento"].fillna("Demais produtos").replace("", "Demais produtos")
    dpr["grupo"] = [por_seg.get(sg) or por_sh2.get(sh2, "Outros") for sg, sh2 in zip(dpr.segmento, dpr.SH2)]
    return dpr


def gerar_segmentos(dados, saida, fm, anos, ano_parcial, mes_parcial):
    dpr = ler(dados, "dim_produto.csv")
    checar_chave(dpr, "SH4", 4)
    if "segmento" not in dpr or dpr.segmento.isna().all():
        sys.exit("ERRO: dim_produto.csv sem a coluna 'segmento' preenchida.")
    dpr = classificar_grupos(dpr, Path(__file__).resolve().parent / "grupos.csv")
    gi = {g: i for i, g in enumerate(GRUPOS)}
    x = fm.merge(dpr[["SH4", "nome_sh4", "segmento", "grupo"]], on="SH4", how="left")
    if x.grupo.isna().any():
        sys.exit("ERRO: há SH4 nos fatos sem linha no dim_produto.")
    x["g"] = x.grupo.map(gi)
    pasta = saida / "segmentos"
    soma_ok = segs_ok = True
    composicao = {"EXP": [], "IMP": []}
    conf = {}
    for fl in FLUXOS:
        xf = x[x.fluxo == fl]
        por_ano = {a: d for a, d in xf.groupby("ano")}
        for ano in anos:
            d = por_ano.get(ano)
            if d is None:
                continue
            total = int(d.valor_fob.sum())
            # base de comparação (regra do ano parcial)
            if ano - 1 in por_ano:
                b = por_ano[ano - 1]
                if ano == ano_parcial:
                    b = b[b.mes <= mes_parcial]
                tb = int(b.valor_fob.sum())
            else:
                tb = None
            gr = d.groupby("g").valor_fob.sum()
            grupos = [[int(g), int(gr.get(g, 0)), round(gr.get(g, 0) / total * 100, 2)] for g in range(len(GRUPOS))]
            seg = d.groupby("segmento").valor_fob.sum().sort_values(ascending=False)
            segmentos = []
            for nome, v in seg.items():
                gs = d[d.segmento == nome].g.unique()
                segmentos.append([nome, int(v), round(v / total * 100, 2), int(gs[0]) if len(gs) == 1 else None])
            soma_ok &= sum(g[1] for g in grupos) == total
            segs_ok &= int(seg.sum()) == total
            # municípios: grupo dominante + 3 principais
            mg = d.groupby(["cod_mun", "g"]).valor_fob.sum().reset_index()
            mun = []
            for cod, dm in mg.groupby("cod_mun"):
                dm = dm[dm.valor_fob > 0].sort_values("valor_fob", ascending=False)
                tm = int(dm.valor_fob.sum())
                if tm <= 0:
                    continue
                top3 = [[int(r.g), round(r.valor_fob / tm * 100, 1)] for r in dm.head(3).itertuples()]
                mun.append([cod, tm, int(dm.iloc[0].g), top3])
            mun.sort(key=lambda r: -r[1])
            # produtos (SH4) por grupo: 15 maiores + demais
            produtos = {}
            pp = d.groupby(["g", "SH4", "nome_sh4"]).valor_fob.sum().reset_index()
            for g, dg in pp.groupby("g"):
                dg = dg[dg.valor_fob > 0].sort_values("valor_fob", ascending=False)
                tg = int(dg.valor_fob.sum())
                lst = [[r.SH4, r.nome_sh4, int(r.valor_fob), round(r.valor_fob / tg * 100, 2)] for r in dg.head(15).itertuples()]
                resto = int(dg.valor_fob.iloc[15:].sum())
                if resto > 0:
                    lst.append(["", f"Demais produtos do grupo ({len(dg) - 15})", resto, round(resto / tg * 100, 2)])
                produtos[str(int(g))] = lst
            salvar({"ano": ano, "fluxo": fl, "parcial": ano == ano_parcial, "total": total, "total_base": tb,
                    "var": var_pct(total, tb), "grupos": grupos, "segmentos": segmentos, "mun": mun,
                    "produtos": produtos}, pasta / f"{fl}_{ano}.json")
            composicao[fl].append([ano, [g[1] for g in grupos]])
            if ano == max(a for a in anos if a != ano_parcial):
                conf[f"seg_grupos_{fl.lower()}"] = sorted([(GRUPOS[g[0]], g[2]) for g in grupos], key=lambda t: -t[1])
    salvar({"grupos": GRUPOS, "composicao": composicao}, pasta / "composicao.json")
    # (opcional) nomes oficiais dos SH4 em inglês, para a versão EN do site:
    # sh4_ingles.csv (SH4, nome_sh4_en) ou a tabela auxiliar NCM_SH.csv do Comex Stat
    en = {}
    if (dados / "sh4_ingles.csv").exists():
        e = ler(dados, "sh4_ingles.csv")
        en = dict(zip(e.SH4.str.zfill(4), e.nome_sh4_en))
    elif (dados / "NCM_SH.csv").exists():
        e = pd.read_csv(dados / "NCM_SH.csv", sep=";", dtype=str, encoding="latin-1")
        en = dict(zip(e.CO_SH4.str.zfill(4), e.NO_SH4_ING))
    if en:
        salvar(en, pasta / "sh4_en.json")
        conf["seg_sh4_en"] = len(en)
    conf["seg_soma_ok"] = bool(soma_ok)
    conf["seg_segmentos_ok"] = bool(segs_ok)
    return {"grupos": GRUPOS, "conferencia_seg": conf}


# ======================================================================
# ESCOAMENTO (base fato_via_urf: origem/destino da mercadoria na Bahia)
# Nunca é somado nem comparado em valor com a base Território.
# ======================================================================
NOMES_VIA = {"00": "Via não declarada", "01": "Marítima", "02": "Fluvial", "03": "Lacustre", "04": "Aérea",
             "05": "Postal", "06": "Ferroviária", "07": "Rodoviária", "08": "Conduto/rede de transmissão",
             "09": "Meios próprios", "10": "Entrada/saída ficta", "11": "Courier", "12": "Em mãos",
             "13": "Por reboque", "14": "Dutos", "15": "Vicinal fronteiriço", "99": "Via desconhecida"}
SIGLAS = {"ALF", "IRF", "DRF", "ARF", "BA", "SC", "PR", "RS", "MG", "MS", "CE", "PA", "SP", "RJ", "MT"}


MINUSC = {"de", "do", "da", "dos", "das", "e"}


def nome_curto_urf(nome):
    """'0817800 - PORTO DE SANTOS' -> 'Porto de Santos' (sem acentos: o nome oficial da Receita não tem)."""
    n = nome.split(" - ", 1)[1] if " - " in nome else nome

    def pal(w, i):
        if w.strip("()/.-") in SIGLAS:
            return w
        if i > 0 and w.lower() in MINUSC:
            return w.lower()
        return "/".join(p[:1].upper() + p[1:].lower() for p in w.split("/"))
    return " ".join(pal(w, i) for i, w in enumerate(n.split()))


def gerar_escoamento(dados, saida, fv, du, anos, ano_parcial, mes_parcial, ano_padrao):
    dpr = classificar_grupos(ler(dados, "dim_produto.csv"), Path(__file__).resolve().parent / "grupos.csv")
    gi = {g: i for i, g in enumerate(GRUPOS)}
    x = fv.merge(dpr[["SH4", "grupo"]], on="SH4", how="left")
    x["g"] = x.grupo.map(gi)
    pasta = saida / "escoamento"

    # dimensão das URFs que aparecem nos dados
    usadas = set(x.cod_urf)
    urfs = {}
    for r in du[du.cod_urf.isin(usadas)].itertuples():
        tem = isinstance(r.lat, (int, float)) and r.lat == r.lat
        local = r.nome_local if isinstance(r.nome_local, str) else ""
        uf = r.uf_local if isinstance(r.uf_local, str) else ""
        nome = "URF não informada" if r.cod_urf in ("9999999", "0000000", "0815400", "8110000", "1010109") else nome_curto_urf(r.nome_urf)
        urfs[r.cod_urf] = [nome, local, r.tipo_local if isinstance(r.tipo_local, str) else "", uf,
                           round(float(r.lat), 5) if tem else None, round(float(r.lon), 5) if tem else None,
                           r.precisao if isinstance(r.precisao, str) else "", r.nome_urf]
    salvar({"campos": ["nome", "local", "tipo", "uf", "lat", "lon", "precisao", "nome_oficial"],
            "urfs": urfs, "vias": NOMES_VIA}, pasta / "urfs.json")

    serie = {fl: {} for fl in FLUXOS}
    series_vias = {fl: {} for fl in FLUXOS}
    vias_ok = sankey_ok = True
    sem_coord_padrao = [0, 0]
    for k, fl in enumerate(FLUXOS):
        xf = x[x.fluxo == fl]
        por_ano = {a: d for a, d in xf.groupby("ano")}
        vias_ano = xf.groupby(["cod_via", "ano"]).valor_fob.sum().unstack("ano").reindex(columns=anos).fillna(0).astype("int64")
        series_vias[fl] = {v: [int(z) for z in linha.values] for v, linha in vias_ano.iterrows()}
        for ano in anos:
            d = por_ano.get(ano)
            if d is None:
                continue
            total = int(d.valor_fob.sum())
            base = None
            if ano - 1 in por_ano:
                b = por_ano[ano - 1]
                if ano == ano_parcial:
                    b = b[b.mes <= mes_parcial]
                base = b
            tb = int(base.valor_fob.sum()) if base is not None else None
            u = d.groupby("cod_urf").valor_fob.sum()
            u = u[u > 0].sort_values(ascending=False)
            ub = base.groupby("cod_urf").valor_fob.sum() if base is not None else pd.Series(dtype="int64")
            lista_urf = [[c, int(v), var_pct(v, ub.get(c)), round(v / total * 100, 3)] for c, v in u.items()]
            vv = d.groupby("cod_via").valor_fob.sum()
            vv = vv[vv > 0].sort_values(ascending=False)
            vb = base.groupby("cod_via").valor_fob.sum() if base is not None else pd.Series(dtype="int64")
            lista_via = [[c, int(v), round(v / total * 100, 2), var_pct(v, vb.get(c))] for c, v in vv.items()]
            vias_ok &= int(vv.sum()) == int(u.sum()) == total

            # ---- Sankey: grupo -> via -> URF (6 grupos + Demais; todas as vias; 8 URFs + Demais) ----
            gt = d.groupby("g").valor_fob.sum().sort_values(ascending=False)
            top_g = [int(g) for g in gt.index[:6]]
            top_u = list(u.index[:8])
            dd = d.assign(no_g=d.g.where(d.g.isin(top_g), -1).astype(int),
                          no_u=d.cod_urf.where(d.cod_urf.isin(top_u), "DEMAIS"))
            gv = dd.groupby(["no_g", "cod_via"]).valor_fob.sum()
            vu = dd.groupby(["cod_via", "no_u"]).valor_fob.sum()
            links_gv = [[int(g), v, int(val)] for (g, v), val in gv.items() if val > 0]
            links_vu = [[v, uu, int(val)] for (v, uu), val in vu.items() if val > 0]
            for via in vv.index:
                ent = sum(l[2] for l in links_gv if l[1] == via)
                sai = sum(l[2] for l in links_vu if l[0] == via)
                sankey_ok &= ent == sai
            sem = [[c, int(v)] for c, v in u.items() if urfs.get(c, [None] * 6)[4] is None]
            if ano == ano_padrao:
                sem_coord_padrao[k] = len(sem)
            salvar({"ano": ano, "fluxo": fl, "parcial": ano == ano_parcial, "total": total, "total_base": tb,
                    "var": var_pct(total, tb), "urfs": lista_urf, "vias": lista_via,
                    "sankey": {"grupos": top_g, "urfs": top_u, "gv": links_gv, "vu": links_vu},
                    "sem_coord": sem}, pasta / f"{fl}_{ano}.json")
            serie[fl][ano] = {"v": total, "var": var_pct(total, tb)}
    salvar({"anos": anos, "series": series_vias}, pasta / "series_vias.json")
    return {"serie_escoamento": serie,
            "conferencia_esc": {"esc_vias_ok": bool(vias_ok), "esc_sankey_ok": bool(sankey_ok),
                                "esc_sem_coord": sem_coord_padrao}}


# ======================================================================
# PLANILHA OPCIONAL (abas 3 e 4). A aba 5 NÃO é usada.
# ======================================================================
def gerar_planilha(arq: Path, saida: Path, fv, du):
    import re
    conf = {}
    # ---- Aba 4: exportação marítima por tipo de desembaraço (porto local × fora da Bahia) ----
    x = pd.read_excel(arq, sheet_name="4_URFS_EMBARQUE", header=4, dtype={"Código URF": str})
    x = x[pd.to_numeric(x["Ano"], errors="coerce").notna()].copy()
    x["Ano"] = x["Ano"].astype(int)
    csv = fv[(fv.fluxo == "EXP") & (fv.cod_via == "01")]
    anos, ok = {}, True
    for ano, d in x.groupby("Ano"):
        c = csv[csv.ano == ano]
        vp, vc = int(d["Valor FOB (US$)"].sum()), int(c.valor_fob.sum())
        pok = int(d["Peso Líquido (kg)"].sum()) == int(c.peso_kg.sum())
        anos[int(ano)] = (vp, vc, pok)
        ok &= (vp == vc) and pok
    conf["plan_anos"] = anos
    conf["plan_ok"] = bool(ok)
    if ok:
        res = []
        for ano, d in x.groupby("Ano"):
            t = d.groupby("Tipo de Desembaraço")[["Valor FOB (US$)", "Peso Líquido (kg)"]].sum()
            fora = (d[d["Tipo de Desembaraço"] == "FUGA_DE_CARGA_EXTERNA"]
                    .groupby("Código URF")["Valor FOB (US$)"].sum().sort_values(ascending=False).head(5))
            g = lambda k, col: int(t.loc[k, col]) if k in t.index else 0
            res.append({"ano": int(ano),
                        "local": [g("PORTO_LOCAL_BAHIA", "Valor FOB (US$)"), g("PORTO_LOCAL_BAHIA", "Peso Líquido (kg)")],
                        "fora": [g("FUGA_DE_CARGA_EXTERNA", "Valor FOB (US$)"), g("FUGA_DE_CARGA_EXTERNA", "Peso Líquido (kg)")],
                        "top_fora": [[c, int(v)] for c, v in fora.items()]})
        salvar({"fonte": "Planilha entrega_unifacs_conectividade_comex_bahia.xlsx, aba 4 (MDIC/Comex Stat; tabela de URFs da RFB)",
                "anos": res}, saida / "escoamento" / "desembaraco.json")

    # ---- Aba 3: rodovias (só colunas de 2025 + características; NUNCA o acumulado 2010–2025) ----
    r = pd.read_excel(arq, sheet_name="3_RODOVIAS_E_SINISTROS", header=4)
    info = {}
    for _, l in r.iterrows():
        m = re.match(r"(BR|BA)-(\d{3})", str(l["Rodovia"]))
        if not m:
            continue
        num = lambda v: None if (pd.isna(v) or v == "-") else float(v)
        info[f"{m.group(1)}-{m.group(2)}"] = {
            "nome": str(l["Rodovia"]), "esfera": str(l["Esfera"]).title(),
            "km": num(l["Extensão na Bahia (km)"]),
            "sin25": num(l["Sinistros (2025)"]), "mor25": num(l["Mortos (2025)"]), "fer25": num(l["Feridos (2025)"]),
            "pista": str(l["Tipo de Pista"]), "cnt": str(l["Estado Geral (CNT)"]),
            "pavimento": str(l["Pavimento (CNT)"]), "geometria": str(l["Geometria da Via (CNT)"]),
            "corredor": str(l["Corredor Logístico Atendido"]), "adm": str(l["Administração / Jurisdição"])}
    salvar({"fonte": "Planilha entrega_unifacs_conectividade_comex_bahia.xlsx, aba 3 (PRF Dados Abertos; DNIT SNV; Pesquisa CNT de Rodovias; SEINFRA-BA)",
            "rodovias": info}, saida / "geo" / "rodovias_info.json")
    conf["plan_rodovias"] = len(info)
    return conf


if __name__ == "__main__":
    main()
