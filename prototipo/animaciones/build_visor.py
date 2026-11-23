"""Genera visor.html autocontenido (GLB en base64) a partir de visor.src.html.

Uso: python3 prototipo/animaciones/build_visor.py [ruta.glb] [salida.html]
Sin argumentos usa prototipo/animaciones/candidatas.glb si existe, si no juego/public/assets/personajes/caballero_soldado.glb.
"""
import base64, os, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
default = os.path.join(here, 'candidatas.glb')
if not os.path.exists(default):
    default = os.path.join(root, 'juego', 'public', 'assets', 'personajes', 'caballero_soldado.glb')
glb = sys.argv[1] if len(sys.argv) > 1 else default
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'visor.html')

s = open(os.path.join(here, 'visor.src.html'), encoding='utf-8').read()
for m in ("/*__GLB__*/''", "/*__GLBNAME__*/''"):
    assert s.count(m) == 1, m
data = base64.b64encode(open(glb, 'rb').read()).decode()
s = s.replace("/*__GLB__*/''", "'" + data + "'").replace("/*__GLBNAME__*/''", "'" + os.path.basename(glb) + "'")
open(out, 'w', encoding='utf-8').write(s)
mb = os.path.getsize(out) / 1048576
print(f'visor: {out} ({mb:.2f} MB, GLB {os.path.getsize(glb) / 1048576:.2f} MB)')
if mb > 16:
    print('AVISO: supera el objetivo de 16 MB')
