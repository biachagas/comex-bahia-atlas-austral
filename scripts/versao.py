"""Atualiza o número de versão dos arquivos do painel (evita cache antigo no navegador).

Rode antes de cada publicação:  python3 scripts/versao.py
Troca ?v=... em todos os <script> e <link> do index.html e o <meta name="versao">,
que também é usado para baixar os dados (data/*.json) atualizados.
"""
import re, datetime, pathlib

idx = pathlib.Path(__file__).resolve().parent.parent / "index.html"
v = datetime.datetime.now().strftime("%Y%m%d%H%M")
h = idx.read_text(encoding="utf-8")
# acrescenta ou troca ?v= nos arquivos locais de assets/
h = re.sub(r'((?:src|href)="assets/(?:js|lib|css)/[^"?]+)(\?v=\d+)?"', rf'\1?v={v}"', h)
if '<meta name="versao"' in h:
    h = re.sub(r'<meta name="versao" content="\d*">', f'<meta name="versao" content="{v}">', h)
else:
    h = h.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n  <meta name="versao" content="{v}">', 1)
idx.write_text(h, encoding="utf-8")
print("versão", v)
