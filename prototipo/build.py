"""Genera la maqueta final incrustando texturas, modelos GLB y módulos de efectos.

Uso:
  python3 prototipo/build.py <maqueta.src.html> <dir_texturas> <salida.html> <caballero.glb> [vfx] [katana=<glb>] [caballo=<glb>]
`vfx` incrusta prototipo/vfx/vfx.js y prototipo/vfx/rayos.js (si existen); sin él se usan los efectos básicos.
Siempre incrusta prototipo/magia/magia.js (reglas puras de la magia rúnica).
"""
import base64, json, os, sys

src, texdir, out = sys.argv[1:4]
glb = sys.argv[4] if len(sys.argv) > 4 else None
extra = sys.argv[5:]
opts = dict(a.split('=', 1) for a in extra if '=' in a)
use_vfx = 'vfx' in extra
here = os.path.dirname(os.path.abspath(__file__))

tex = {f[:-5]: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(texdir, f), 'rb').read()).decode()
       for f in sorted(os.listdir(texdir)) if f.endswith('.webp')}
s = open(src).read()
assert s.count('/*__TEX__*/{}') == 1
s = s.replace('/*__TEX__*/{}', json.dumps(tex))


def embed_glb(marker, path):
    global s
    if marker not in s:
        return
    data = base64.b64encode(open(path, 'rb').read()).decode() if path and os.path.exists(path) else ''
    s = s.replace(marker, "'" + data + "'")
    print(' ', marker, (len(data) * 3 // 4) // 1024, 'KB' if data else '(vacío)')


embed_glb("/*__KNIGHT__*/''", glb)
embed_glb("/*__KATANA__*/''", opts.get('katana'))
embed_glb("/*__HORSE__*/''", opts.get('caballo'))


def embed_js(marker, name):
    global s
    if marker not in s:
        return
    path = os.path.join(here, 'vfx', name)
    code = open(path).read().replace('</script', '<\\/script') if use_vfx and os.path.exists(path) else ''
    s = s.replace(marker, code)


embed_js('/*__VFX__*/', 'vfx.js')
embed_js('/*__RAYOS__*/', 'rayos.js')


def embed_magia(marker, path):
    global s
    if marker not in s:
        return
    code = open(path).read().replace('</script', '<\\/script') if os.path.exists(path) else ''
    s = s.replace(marker, code)


embed_magia('/*__MAGIA__*/', os.path.join(here, 'magia', 'magia.js'))   # reglas puras de la magia rúnica (siempre, no depende de `vfx`)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w').write(s)
print('built', len(s) // 1024, 'KB')
