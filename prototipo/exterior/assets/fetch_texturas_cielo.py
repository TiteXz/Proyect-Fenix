"""Descarga y convierte texturas PBR y el HDRI CC0 de Poly Haven para la escena exterior.
Uso: python3 -I fetch_texturas_cielo.py <dir_cache> <dir_salida>
Requiere Pillow. Sin claves de API. Resultado: <nombre>_Diffuse.webp, _nor_gl.webp, _arm.webp, cielo_*.hdr
"""
import json, os, sys, urllib.request, io
from PIL import Image

cache, out = sys.argv[1:3]
os.makedirs(cache, exist_ok=True); os.makedirs(out, exist_ok=True)
UA = {'User-Agent': 'asset-fetch/1.0'}

def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()

# nombre_local: (slug Poly Haven, resolucion)
TEX = {
    'camino': ('stony_dirt_path', '2k'),
    'hierba': ('leafy_grass', '2k'),
    'roca_talud': ('rock_face', '2k'),
    'barro': ('brown_mud', '1k'),
    'muro_piedra': ('rock_wall_08', '2k'),
    'madera': ('weathered_planks', '1k'),
    'revoco': ('white_plaster_rough_01', '1k'),
    'teja': ('roof_tiles_14', '2k'),
}
Q = {'Diffuse': 78, 'nor_gl': 66, 'arm': 68}
for name, (slug, res) in TEX.items():
    files = json.loads(get('https://api.polyhaven.com/files/' + slug))
    for mp in ('Diffuse', 'nor_gl', 'arm'):
        dst = os.path.join(out, f'{name}_{mp}.webp')
        if os.path.exists(dst):
            continue
        url = files[mp][res]['jpg']['url']
        im = Image.open(io.BytesIO(get(url))).convert('RGB')
        if mp == 'arm' and im.width >= 2048:
            im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)  # ARM a media resolución: ahorra ~0,5 MB por set
        im.save(dst, 'WEBP', quality=Q[mp], method=6)
        print(dst, os.path.getsize(dst) // 1024, 'KB')

# HDRI 1k (RGBE .hdr, lo lee RGBELoader de r147)
hd = 'kloofendal_48d_partly_cloudy_puresky'
files = json.loads(get('https://api.polyhaven.com/files/' + hd))
url = files['hdri']['1k']['hdr']['url']
dst = os.path.join(out, 'cielo_kloofendal_1k.hdr')
if not os.path.exists(dst):
    open(dst, 'wb').write(get(url)); print(dst, os.path.getsize(dst) // 1024, 'KB')
