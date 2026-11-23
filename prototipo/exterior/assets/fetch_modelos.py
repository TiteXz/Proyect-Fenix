"""Descarga modelos CC0 de Poly Haven (gltf 1k + texturas jpg) a <dir_cache>/<slug>/.
Uso: python3 -I fetch_modelos.py <dir_cache> slug [slug...]   (luego procesar_modelos.mjs los reduce y empaqueta)"""
import io, json, re, os, sys, urllib.request
from PIL import Image
UA = {'User-Agent': 'asset-fetch/1.0'}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180).read()
cache = sys.argv[1]
for slug in sys.argv[2:]:
    d = os.path.join(cache, slug)
    if os.path.exists(os.path.join(d, 'ok')):
        continue
    files = json.loads(get('https://api.polyhaven.com/files/' + slug))
    f = files['gltf']['1k']['gltf']
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, slug + '_1k.gltf'), 'wb').write(get(f['url']))
    for rel, v in f['include'].items():
        p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(get(v['url']))
    # El gltf de Poly Haven lleva el diffuse en JPG sin alfa; el alfa va aparte: se fusiona en un PNG RGBA y se re-apunta el gltf.
    gp = os.path.join(d, slug + '_1k.gltf'); g = json.load(open(gp))
    for k, v in files.items():
        if not re.search('alpha|opacity', k.lower()) or not isinstance(v, dict) or '1k' not in v:
            continue
        a = Image.open(io.BytesIO(get(v['1k']['png']['url']))).convert('L')
        for rel in list(f['include']):
            base = os.path.basename(rel)
            if base.endswith('_diff_1k.jpg') and base[:-len('_diff_1k.jpg')] == re.sub(r'_(alpha|opacity)_1k\.png$', '', os.path.basename(v['1k']['png']['url'])):
                rgb = Image.open(os.path.join(d, rel)).convert('RGB')
                rgb.putalpha(a.resize(rgb.size))
                rgb.save(os.path.join(d, rel.replace('.jpg', '.png')))
                for im in g['images']:
                    if im['uri'] == rel:
                        im['uri'] = rel.replace('.jpg', '.png'); im['mimeType'] = 'image/png'
    json.dump(g, open(gp, 'w'))
    open(os.path.join(d, 'ok'), 'w').write('1')
    print(slug, 'ok')
