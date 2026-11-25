"""Genera grimorio.html autocontenido (fondo de la Aldea del Vado en base64) a partir de grimorio.src.html.

Uso: python3 prototipo/grimorio/build_grimorio.py [fondo.webp] [salida.html]
"""
import base64, os, sys

here = os.path.dirname(os.path.abspath(__file__))
fondo = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'exterior', 'capturas', 'C1_entrada.webp')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'grimorio.html')
s = open(os.path.join(here, 'grimorio.src.html'), encoding='utf-8').read()
m = "/*__FONDO__*/''"
assert s.count(m) == 1, m
data = 'data:image/webp;base64,' + base64.b64encode(open(fondo, 'rb').read()).decode()
s = s.replace(m, "'" + data + "'")
open(out, 'w', encoding='utf-8').write(s)
print(f'grimorio: {out} ({os.path.getsize(out) / 1048576:.2f} MB)')
