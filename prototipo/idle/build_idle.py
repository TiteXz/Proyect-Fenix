"""Genera idle.html autocontenido (GLB del personaje en base64) a partir de idle.src.html.

Uso: python3 prototipo/idle/build_idle.py [personaje.glb] [salida.html]
Por defecto usa juego/public/assets/personajes/caballero_soldado.glb (clips «reposo» y «andar»).
"""
import base64, os, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
glb = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'juego', 'public', 'assets', 'personajes', 'caballero_soldado.glb')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'idle.html')
s = open(os.path.join(here, 'idle.src.html'), encoding='utf-8').read()
assert s.count("/*__GLB__*/''") == 1
s = s.replace("/*__GLB__*/''", "'" + base64.b64encode(open(glb, 'rb').read()).decode() + "'")
open(out, 'w', encoding='utf-8').write(s)
print(f'idle: {out} ({os.path.getsize(out) / 1048576:.2f} MB)')
