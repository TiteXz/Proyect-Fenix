"""Ronda 2: descarga CC0 de Poly Haven (API publica, sin claves) a <cache>/<slug>/.
Uso: python3 -I fetch_ronda2.py <cache>
 - plantas: texturas 4K diffuse+dry_diff+alpha (jpg) de grass_medium_01/02 (para recortar briznas)
 - cielo: kloofendal_48d_partly_cloudy_puresky 4k .hdr
 - rocas: gltf 2k (bin + jpg) de mountainside, boulder_01, namaqualand_cliff_01, namaqualand_boulder_02"""
import json, os, sys, urllib.request
UA = {'User-Agent': 'asset-fetch/1.0'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=300).read()
def save(p, u):
    if os.path.exists(p): return
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(get(u)); print(p)
cache = sys.argv[1]
for s in ('grass_medium_01', 'grass_medium_02'):
    f = json.loads(get('https://api.polyhaven.com/files/' + s))
    for k, name in (('Diffuse', 'diff'), ('dry_diff', 'dry_diff'), ('Alpha', 'alpha')):
        save(f'{cache}/{s}/{name}_4k.jpg', f[k]['4k']['jpg']['url'])
f = json.loads(get('https://api.polyhaven.com/files/kloofendal_48d_partly_cloudy_puresky'))
save(f'{cache}/cielo/kloofendal_4k.hdr', f['hdri']['4k']['hdr']['url'])
for s in ('mountainside', 'boulder_01', 'namaqualand_cliff_01', 'namaqualand_boulder_02'):
    f = json.loads(get('https://api.polyhaven.com/files/' + s)); g = f['gltf']['2k']['gltf']
    save(f'{cache}/{s}/{s}_2k.gltf', g['url'])
    for rel, v in g['include'].items(): save(f'{cache}/{s}/{rel}', v['url'])
# hojas anchas / flores fotograficas (2k diffuse + alpha) para el atlas de hierba y flores
for s in ('celandine_01', 'dandelion_01', 'periwinkle_plant'):
    f = json.loads(get('https://api.polyhaven.com/files/' + s))
    save(f'{cache}/{s}/diff_2k.jpg', f['Diffuse']['2k']['jpg']['url'])
    save(f'{cache}/{s}/alpha_2k.jpg', f['Alpha' if 'Alpha' in f else 'opacity']['2k']['jpg' if 'Alpha' in f else 'png']['url'])
