#!/usr/bin/env python3
"""
Simplifica as malhas GeoJSON para o site, SEM abrir buracos entre vizinhos.

Como funciona (resumo para iniciantes):
1. Arredonda as coordenadas (5 casas) para que divisas iguais fiquem idênticas.
2. Quebra cada contorno em "trechos" entre pontos onde 3+ municípios se encontram.
3. Simplifica cada trecho UMA vez (Douglas-Peucker) e reaproveita o mesmo trecho
   simplificado para os dois municípios vizinhos -> as divisas continuam encaixadas.
4. Grava com 4 casas decimais (~11 m), o suficiente para a escala do painel.

Uso:  python scripts/simplificar_malhas.py --malhas PASTA/mapas_bahia --saida data/geo
Só precisa ser rodado de novo se a malha do IBGE mudar.
"""
import argparse
import json
from pathlib import Path

Q = 5        # casas decimais para casar vértices
OUT = 4      # casas decimais na saída


def q(pt):
    return (round(pt[0], Q), round(pt[1], Q))


def dp(pts, tol):
    """Douglas-Peucker iterativo; mantém primeiro e último ponto."""
    n = len(pts)
    if n < 3:
        return pts[:]
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    tol2 = tol * tol
    while stack:
        i, j = stack.pop()
        ax, ay = pts[i]; bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        best, bi = -1, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if L2 == 0:
                d2 = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
                d2 = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d2 > best:
                best, bi = d2, k
        if best > tol2:
            keep[bi] = True
            stack += [(i, bi), (bi, j)]
    return [p for p, k in zip(pts, keep) if k]


def rings_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    return geom["coordinates"]


def simplificar_poligonos(feats, tol):
    # anéis quantizados, sem o ponto de fechamento repetido
    polys = []
    for f in feats:
        ps = []
        for poly in rings_of(f["geometry"]):
            rs = []
            for ring in poly:
                r = [q(p) for p in ring]
                if r[0] == r[-1]:
                    r = r[:-1]
                # remove duplicados consecutivos
                rr = [r[0]] + [p for a, p in zip(r, r[1:]) if p != a]
                rs.append(rr)
            ps.append(rs)
        polys.append(ps)

    # Dono de cada aresta (quais municípios usam aquele segmento).
    # Um vértice é "nó" quando as arestas que chegam nele têm donos diferentes
    # (ex.: ponto onde 3 municípios se encontram, ou onde a divisa compartilhada termina).
    donos = {}
    for pid, ps in enumerate(polys):
        for rs in ps:
            for r in rs:
                for i in range(len(r)):
                    e = frozenset((r[i - 1], r[i]))
                    donos.setdefault(e, set()).add(pid)
    inc = {}
    for e, d in donos.items():
        for p in e:
            inc.setdefault(p, set()).add(frozenset(d))
    grau = {}
    for e in donos:
        for p in e:
            grau[p] = grau.get(p, 0) + 1
    junc = {p for p in inc if len(inc[p]) > 1 or grau[p] > 2}

    cache = {}

    def arco_simpl(arc):
        a, b = arc[0], arc[-1]
        chave = tuple(arc) if (a, arc[1]) <= (b, arc[-2]) else tuple(reversed(arc))
        if chave not in cache:
            cache[chave] = dp(list(chave), tol)
        res = cache[chave]
        return res if chave == tuple(arc) else list(reversed(res))

    def simpl_anel(r):
        idx = [i for i, p in enumerate(r) if p in junc]
        if not idx:
            # anel isolado: ancora no menor ponto (mesmo anel nos dois lados de um enclave)
            m = r.index(min(r))
            idx = [m]
        k0 = idx[0]
        rr = r[k0:] + r[:k0]
        cortes = [i - k0 if i >= k0 else i - k0 + len(r) for i in idx] + [len(r)]
        rr = rr + [rr[0]]
        out = []
        for a, b in zip(cortes, cortes[1:]):
            arc = rr[a:b + 1]
            s = arco_simpl(arc) if len(arc) > 2 else arc
            out.extend(s[:-1])
        out.append(out[0])
        if len(out) < 4:   # anel colapsou: usa o original
            out = r + [r[0]]
        return [[round(x, OUT), round(y, OUT)] for x, y in out]

    novos = []
    for f, ps in zip(feats, polys):
        coords = [[simpl_anel(r) for r in rs] for rs in ps]
        g = ({"type": "Polygon", "coordinates": coords[0]} if len(coords) == 1
             else {"type": "MultiPolygon", "coordinates": coords})
        novos.append({"type": "Feature", "properties": f["properties"], "geometry": g})
    return novos


def simplificar_linhas(feats, tol, props):
    novos = []
    for f in feats:
        g = f["geometry"]
        if g is None:
            continue
        linhas = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        out = []
        for ln in linhas:
            s = dp([tuple(p[:2]) for p in ln], tol)
            if len(s) >= 2:
                out.append([[round(x, OUT), round(y, OUT)] for x, y in s])
        if not out:
            continue
        geom = ({"type": "LineString", "coordinates": out[0]} if len(out) == 1
                else {"type": "MultiLineString", "coordinates": out})
        novos.append({"type": "Feature",
                      "properties": {k: f["properties"].get(k) for k in props},
                      "geometry": geom})
    return novos


def ler_shp(caminho_shp):
    """Leitor mínimo de shapefile de POLÍGONOS (tipo 5) + atributos .dbf."""
    import struct
    feats = []
    dbf = Path(caminho_shp).with_suffix(".dbf").read_bytes()
    n_reg, tam_cab, tam_reg = struct.unpack("<IHH", dbf[4:12])
    campos, pos = [], 32
    while dbf[pos] != 0x0D:
        nome = dbf[pos:pos + 11].split(b"\0")[0].decode("latin-1")
        campos.append((nome, dbf[pos + 16])); pos += 32
    atributos = []
    for i in range(n_reg):
        r = dbf[tam_cab + i * tam_reg + 1: tam_cab + (i + 1) * tam_reg]
        d, o = {}, 0
        for nome, tam in campos:
            d[nome] = r[o:o + tam].decode("utf-8", "replace").strip(); o += tam
        atributos.append(d)
    b = Path(caminho_shp).read_bytes()
    pos, i = 100, 0
    while pos < len(b):
        _, tam = struct.unpack(">ii", b[pos:pos + 8]); pos += 8
        rec = b[pos:pos + tam * 2]; pos += tam * 2
        tipo = struct.unpack("<i", rec[:4])[0]
        if tipo not in (5, 15, 25):
            i += 1; continue
        npart, npt = struct.unpack("<ii", rec[36:44])
        partes = list(struct.unpack(f"<{npart}i", rec[44:44 + 4 * npart])) + [npt]
        base = 44 + 4 * npart
        pts = struct.unpack(f"<{2 * npt}d", rec[base:base + 16 * npt])
        aneis = [[(pts[2 * k], pts[2 * k + 1]) for k in range(partes[j], partes[j + 1])] for j in range(npart)]
        # anel horário = exterior (convenção shapefile); anti-horário = buraco
        polys = []
        for a in aneis:
            area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(a, a[1:]))
            if area <= 0 or not polys:
                polys.append([a])
            else:
                polys[-1].append(a)
        geom = {"type": "MultiPolygon", "coordinates": polys}
        feats.append({"type": "Feature", "properties": atributos[i] if i < len(atributos) else {}, "geometry": geom})
        i += 1
    return feats


def pontos(feats, props):
    out = []
    for f in feats:
        g = f["geometry"]
        c = g["coordinates"][0] if g["type"] == "MultiPoint" else g["coordinates"]
        out.append({"type": "Feature", "properties": {k: f["properties"].get(k) for k in props},
                    "geometry": {"type": "Point", "coordinates": [round(c[0], 5), round(c[1], 5)]}})
    return out


def enxugar(feats, area_min=0.002, casas=3):
    """Escala nacional: remove ilhotas minúsculas e usa 3 casas decimais (~110 m)."""
    def area(r):
        return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:]))) / 2
    for f in feats:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        maior = max(polys, key=lambda p: area(p[0]))
        polys = [p for p in polys if p is maior or area(p[0]) >= area_min]
        polys = [[[[round(x, casas), round(y, casas)] for x, y in r] for r in p if area(r) >= area_min or r is p[0]] for p in polys]
        f["geometry"] = {"type": "MultiPolygon", "coordinates": polys}
    return feats


def gravar(feats, caminho):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False, separators=(",", ":"))
    print(f"{caminho.name}: {len(feats)} feições, {caminho.stat().st_size/1024:.0f} KB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--malhas", required=True)
    ap.add_argument("--saida", default="data/geo")
    ap.add_argument("--shp", help="pasta com BR_UF_2025/ e SistCostMar_AmAz_2024/ (opcional)")
    a = ap.parse_args()
    m, s = Path(a.malhas), Path(a.saida)
    ler = lambda n: json.load(open(m / n, encoding="utf-8"))["features"]

    mun = ler("ba_municipios.geojson")
    gravar(simplificar_poligonos(mun, 0.0012), s / "municipios.json")
    gravar(simplificar_poligonos(ler("ba_contorno.geojson"), 0.0012), s / "contorno.json")

    # Camadas do Escoamento (linhas simplificadas; pontos com poucos atributos)
    gravar(simplificar_linhas(ler("ba_rodovias_snv.geojson"), 0.0015, ["Codigo_BR", "Superficie"]), s / "rodovias_federais.json")
    gravar(simplificar_linhas(ler("ba_rodovias_estaduais.geojson"), 0.0015, ["Codigo_Rod", "Superficie"]), s / "rodovias_estaduais.json")
    gravar(simplificar_linhas(ler("ba_ferrovias.geojson"), 0.001, ["Concession", "Linha"]), s / "ferrovias.json")
    gravar(simplificar_linhas(ler("ba_dutovias.geojson"), 0.001, ["Nome_Duto", "Categoria", "Tipo_Mater"]), s / "dutovias.json")
    gravar(pontos(ler("ba_portos_antaq.geojson"), ["Codigo_IP", "Nome", "Tipo", "Situacao", "NM_MUN"]), s / "portos_antaq.json")
    gravar(pontos(ler("ba_portos_snv.geojson"), ["Nome", "Local", "NM_MUN"]), s / "portos_snv.json")
    gravar([f for f in pontos(ler("ba_aerodromos.geojson"), ["Codigo_OAC", "Tipo", "Denominaca", "NM_MUN"])
            if f["properties"]["Tipo"] != "Heliponto"], s / "aerodromos.json")

    if a.shp:
        sh = Path(a.shp)
        uf = ler_shp(sh / "BR_UF_2025" / "BR_UF_2025.shp")
        for f in uf:
            f["properties"] = {"SIGLA_UF": f["properties"].get("SIGLA_UF") or f["properties"].get("SIGLA")}
        gravar(enxugar(simplificar_poligonos(uf, 0.02)), s / "brasil_uf.json")
        am = ler_shp(sh / "SistCostMar_AmAz_2024" / "SistCostMar_AmAz_2024.shp")
        for f in am:
            f["properties"] = {}
        gravar(enxugar(simplificar_poligonos(am, 0.02)), s / "amazonia_azul.json")


if __name__ == "__main__":
    main()
