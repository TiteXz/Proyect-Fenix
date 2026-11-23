"""Genera la maqueta final incrustando texturas, modelos GLB y módulos de efectos.

Uso:
  python3 prototipo/build.py <maqueta.src.html> <dir_texturas> <salida.html> <caballero.glb> [vfx] [katana=<glb>] [caballo=<glb>] [exterior[=<dir_assets>]]
`exterior` incrusta la escena de la Aldea del Vado: los assets de prototipo/exterior/assets (o <dir_assets>) como mapa nombre-de-fichero → base64
(webp como data URI) en el marcador EXTERIOR, los GLB de prototipo/exterior/assets/edificios/ (Sketchfab, CC-BY 4.0; se ignoran los descartados), la lista de atribuciones
leída de CREDITOS.md en el marcador CREDITOS (apartado «Créditos» del menú de pausa) y el código de prototipo/exterior/src/{terreno,edificios,aldea}.js en el marcador ALDEA. Sin él, la maqueta
funciona igual pero sin la opción «Aldea».
`vfx` incrusta prototipo/vfx/vfx.js y prototipo/vfx/rayos.js (si existen); sin él se usan los efectos básicos.
Siempre incrusta prototipo/magia/magia.js (reglas puras de la magia rúnica).
"""
import base64, json, os, sys

src, texdir, out = sys.argv[1:4]
glb = sys.argv[4] if len(sys.argv) > 4 else None
extra = sys.argv[5:]
opts = dict(a.split('=', 1) for a in extra if '=' in a)
use_vfx = 'vfx' in extra
use_ext = 'exterior' in extra or 'exterior' in opts
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

DESCARTADOS = {'casa_entramado_a.glb', 'casa_entramado_b.glb'}   # aspecto demasiado moderno: fuera del build aunque reaparezcan en disco


def creditos_ccby(adir):
    """Lista de atribuciones CC-BY (título, autor, URL, licencia, uso) leída de la sección «Edificios de la aldea» de CREDITOS.md.
    Solo los modelos que existen en assets/edificios/ y no están descartados."""
    out, ruta = [], os.path.join(adir, 'CREDITOS.md')
    if not os.path.exists(ruta):
        return out
    en = False
    for ln in open(ruta, encoding='utf-8'):
        if ln.startswith('## '):
            en = ln.startswith('## Edificios de la aldea')
        if not en or not ln.startswith('|'):
            continue
        c = [x.strip() for x in ln.strip().strip('|').split('|')]
        f0 = c[0].split(' ')[0]   # «pozo_piedra.glb (prop)» → pozo_piedra.glb
        if len(c) < 4 or not f0.endswith('.glb') or f0 in DESCARTADOS or not os.path.exists(os.path.join(adir, 'edificios', f0)):
            continue
        out.append({'archivo': f0, 'titulo': c[1], 'autor': c[2], 'url': c[3], 'licencia': 'CC BY 4.0', 'licenciaUrl': 'http://creativecommons.org/licenses/by/4.0/'})
    return out


def embed_exterior():
    """Marcadores EXTERIOR (mapa de assets) y ALDEA (código de la escena)."""
    global s
    if '/*__EXTERIOR__*/{}' not in s:
        return
    ext, code = {}, ''
    if use_ext:
        adir = opts.get('exterior') or os.path.join(here, 'exterior', 'assets')
        skip = {'acantilado_03.glb', 'acantilado_04.glb', 'roca_07.glb'}   # variantes sin usar en la escena: no se incrustan (ahorran ≈ 3,4 MB de HTML)
        for f in sorted(os.listdir(adir)):
            fp = os.path.join(adir, f)
            if f in skip:
                continue
            if f.endswith('.webp'):
                ext[f] = 'data:image/webp;base64,' + base64.b64encode(open(fp, 'rb').read()).decode()
            elif f.endswith(('.glb', '.hdr')):
                ext[f] = base64.b64encode(open(fp, 'rb').read()).decode()
        edir = os.path.join(adir, 'edificios')   # modelos de Sketchfab (CC-BY 4.0): se incrustan con su nombre de fichero; los descartados ya no están en disco
        if os.path.isdir(edir):
            for f in sorted(os.listdir(edir)):
                if f.endswith('.glb') and f not in DESCARTADOS:
                    ext[f] = base64.b64encode(open(os.path.join(edir, f), 'rb').read()).decode()
        for f in ('terreno.js', 'edificios.js', 'aldea.js'):
            code += open(os.path.join(here, 'exterior', 'src', f)).read().replace('</script', '<\\/script') + '\n'
    s = s.replace('/*__EXTERIOR__*/{}', json.dumps(ext, separators=(',', ':')))
    cred = creditos_ccby(opts.get('exterior') or os.path.join(here, 'exterior', 'assets')) if use_ext else []
    s = s.replace('/*__CREDITOS__*/[]', json.dumps(cred, ensure_ascii=False).replace('</', '<\\/'))
    print('  creditos CC-BY', len(cred))
    s = s.replace('/*__ALDEA__*/', code)
    print('  exterior', len(ext), 'assets', sum(len(v) for v in ext.values()) // 1024, 'KB (base64)' if ext else '(no incluido)')


embed_exterior()
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w').write(s)
print('built', len(s) // 1024, 'KB')
