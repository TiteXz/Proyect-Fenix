"""Genera atlas alfa RGBA (hojas, mechones de hierba, flores) a partir de las texturas CC0 de Poly Haven
(ya descargadas con fetch_modelos.py). Todo procedural y con semilla fija. Uso:
  python3 -I crear_atlas.py <dir_cache_modelos> <dir_salida>
Salida (PNG 1024x1024 RGBA, luego se empaquetan en los GLB como WebP):
  follaje_isla.png (4x4 ramillos de island_tree_01/02), follaje_jacaranda.png, hierba_atlas.png (4x2 mechones 256x512),
  flores_atlas.png (4x4: 3 colores + diente de leon, 256x256)
"""
import colorsys, math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

cache, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)

def load(p):
    return Image.open(os.path.join(cache, p)).convert('RGBA')

def bleed(im):
    """Rellena el RGB de los pixeles transparentes con el color opaco mas cercano (evita halos oscuros al escalar)."""
    a = np.array(im); op = a[..., 3] > 128
    idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
    rgb = a[..., :3][idx[0], idx[1]]
    a[..., :3] = rgb
    return Image.fromarray(a, 'RGBA')

def crops(im, mask, min_area, pad=3):
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    sl = ndi.find_objects(lab); res = []
    for i in range(n):
        if (lab[sl[i]] == i + 1).sum() < min_area:
            continue
        y0, y1, x0, x1 = sl[i][0].start, sl[i][0].stop, sl[i][1].start, sl[i][1].stop
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
        c = im.crop((x0, y0, x1, y1)).copy()
        dark = np.array(im.crop((x0, y0, x1, y1)).convert('RGB')).max(-1) < 60  # restos negros de tallos del atlas original
        m = Image.fromarray((((lab[y0:y1, x0:x1] == i + 1) & ~dark) * 255).astype('uint8'))
        m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # erosion 1 px: quita el reborde oscuro
        c.putalpha(m)
        res.append(bleed(c))
    return res

def paste(dst, im, pos, ang=0, scale=1.0, flip=False):
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1.0:
        im = im.resize((max(2, int(im.width * scale)), max(2, int(im.height * scale))), Image.LANCZOS)
    im = im.rotate(ang, expand=True, resample=Image.BICUBIC)
    tmp = Image.new('RGBA', dst.size, (0, 0, 0, 0))
    tmp.paste(im, (int(pos[0] - im.width / 2), int(pos[1] - im.height / 2)))
    dst.alpha_composite(tmp)

def paste_base(dst, im, base, ang=0, scale=1.0, flip=False):
    """Pega 'im' (vertical, base abajo-centro) con su base en 'base' y la gira 'ang' grados alrededor de ella."""
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize((max(2, int(im.width * scale)), max(2, int(im.height * scale))), Image.LANCZOS)
    pad = Image.new('RGBA', (im.width * 2, im.height * 2), (0, 0, 0, 0))
    pad.paste(im, (im.width // 2, 0))
    pad = pad.rotate(ang, center=(im.width, im.height // 2 * 0 + im.height), resample=Image.BICUBIC) if False else pad
    # rotacion alrededor del punto base (centro inferior de 'im' dentro de pad)
    cx, cy = im.width, im.height
    pad2 = Image.new('RGBA', (im.width * 2 + im.height * 2, im.height * 3), (0, 0, 0, 0))
    ox, oy = im.height, im.height
    pad2.paste(im, (ox + im.width // 2, oy))
    bx, by = ox + im.width, oy + im.height
    pad2 = pad2.rotate(ang, center=(bx, by), resample=Image.BICUBIC)
    tmp = Image.new('RGBA', dst.size, (0, 0, 0, 0))
    tmp.paste(pad2, (int(base[0] - bx), int(base[1] - by)))
    dst.alpha_composite(tmp)

def tint_hue(im, hue_deg, sat_mul=1.0, val_mul=1.0, sat_set=None):
    a = np.array(im).astype('float32') / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    if sat_set is not None:
        s = np.full_like(s, sat_set)
    s = np.clip(s * sat_mul, 0, 1); v = np.clip(mx * val_mul, 0, 1)
    h = hue_deg / 360.0
    # hsv -> rgb vectorizado con h constante
    i = int(h * 6) % 6; f = h * 6 - int(h * 6)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    rgb = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]
    a[..., 0], a[..., 1], a[..., 2] = rgb
    return Image.fromarray((a * 255).astype('uint8'), 'RGBA')

def stem(draw, p0, p1, bend, w, col):
    pts = []
    for i in range(21):
        t = i / 20
        x = p0[0] + (p1[0] - p0[0]) * t + bend * math.sin(math.pi * t)
        y = p0[1] + (p1[1] - p0[1]) * t
        pts.append((x, y))
    draw.line(pts, fill=col, width=w, joint='curve')

# ---------------------------------------------------------------- ramillos de hojas (arboles)
def ramillos_isla(seed):
    R = random.Random(seed)
    src = load('island_tree_02/textures/island_tree_02_leaves_diff_1k.png')
    leaves = [c for c in crops(src, np.array(src)[..., 3] > 128, 8000)]
    T = 256; S = 2; atlas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    for k in range(16):
        tile = Image.new('RGBA', (T * S, T * S), (0, 0, 0, 0)); dr = ImageDraw.Draw(tile)
        base = (T * S * 0.5, T * S * 0.97); tip = (T * S * (0.5 + R.uniform(-.12, .12)), T * S * 0.08); bend = R.uniform(-30, 30)
        stem(dr, base, tip, bend, 5, (92, 78, 48, 255))
        n = R.randint(8, 12)
        for i in range(n):
            t = 0.12 + 0.8 * i / (n - 1)
            x = base[0] + (tip[0] - base[0]) * t + bend * math.sin(math.pi * t); y = base[1] + (tip[1] - base[1]) * t
            side = 1 if i % 2 == 0 else -1
            lf = R.choice(leaves); sc = R.uniform(0.17, 0.26) * (1.15 - 0.5 * t) * S
            ang = side * R.uniform(35, 70)
            paste_base(tile, lf, (x, y), -ang, sc, flip=R.random() < .5)
        # hoja terminal
        paste_base(tile, R.choice(leaves), tip, R.uniform(-15, 15), 0.2 * S)
        tile = tile.resize((T, T), Image.LANCZOS)
        atlas.alpha_composite(tile, ((k % 4) * T, (k // 4) * T))
    return atlas

def ramillos_jacaranda(seed):
    R = random.Random(seed)
    src = load('jacaranda_tree/textures/jacaranda_tree_leaves_diff_1k.png')
    cs = crops(src, np.array(src)[..., 3] > 128, 20000)   # 3 hojas compuestas (helecho)
    T = 256; S = 2; atlas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    for k in range(16):
        tile = Image.new('RGBA', (T * S, T * S), (0, 0, 0, 0))
        n = R.choice([1, 1, 2])
        for i in range(n):
            c = R.choice(cs)
            sc = (T * S * 0.92) / max(c.width, c.height) * R.uniform(0.55, 0.9)
            c2 = c.rotate(-90 if c.width > c.height else 0, expand=True)  # que el eje largo quede vertical
            paste(tile, c2, (T * S * (0.5 + (i - (n - 1) / 2) * 0.25 + R.uniform(-.05, .05)), T * S * 0.52), R.uniform(-40, 40), sc * (1.15 if n == 2 else 1.6), R.random() < .5)
        tile = tile.resize((T, T), Image.LANCZOS)
        atlas.alpha_composite(tile, ((k % 4) * T, (k // 4) * T))
    return atlas

# ---------------------------------------------------------------- mechones de hierba
def mechones_hierba(seed):
    R = random.Random(seed)
    src = load('grass_medium_02/textures/grass_medium_02_diff_1k.png')
    a = np.array(src); mask = a[..., 3] > 128
    blades = [b for b in crops(src, mask, 2500) if b.height > 4 * b.width and b.height > 250 and np.array(b)[..., 1][np.array(b)[..., 3] > 128].mean() > np.array(b)[..., 0][np.array(b)[..., 3] > 128].mean() + 4]  # solo hojas largas, verticales y verdes (sin pajas secas)
    print('  hierba: hojas', len(blades))
    W, H, S = 256, 512, 2
    atlas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    for k in range(8):
        tile = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
        n = R.randint(9, 14)
        for i in range(n):
            b = R.choice(blades)
            spread = R.uniform(-1, 1)
            sc = (H * S * R.uniform(0.55, 0.95) * (1 - 0.25 * abs(spread))) / b.height
            paste_base(tile, b, (W * S * 0.5 + spread * W * S * 0.12, H * S * 0.985), spread * R.uniform(14, 30), sc, R.random() < .5)
        # oscurece la base (AO falso) para dar profundidad
        arr = np.array(tile).astype('float32'); yy = np.linspace(0, 1, tile.height)[:, None]
        arr[..., :3] *= (0.62 + 0.38 * np.clip(1 - (yy - 0.0) * 1.0, 0, 1) ** 0.6)[..., None] if False else (0.55 + 0.45 * (1 - yy) ** 0.7)[..., None]
        tile = Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGBA').resize((W, H), Image.LANCZOS)
        atlas.alpha_composite(tile, ((k % 4) * W, (k // 4) * H))
    return atlas

# ---------------------------------------------------------------- flores silvestres
def flores(seed):
    R = random.Random(seed)
    peri = load('periwinkle_plant/textures/periwinkle_plant_diff_1k.png')
    dande = load('dandelion_01/textures/dandelion_01_diff_1k.png')
    pa = np.array(peri).astype('int'); da = np.array(dande).astype('int')
    pink = (pa[..., 0] > 150) & (pa[..., 2] > 110) & (pa[..., 1] < 140) & (pa[..., 3] > 128)
    heads_p = crops(peri, pink, 1500)                                   # flores de vincapervinca (5 petalos)
    yel = (da[..., 0] > 190) & (da[..., 1] > 140) & (da[..., 2] < 90) & (da[..., 3] > 128)
    heads_d = [h for h in crops(dande, yel, 6000) if 0.6 < h.width / h.height < 1.6 and h.width > 120]
    green = (pa[..., 1] > pa[..., 0] + 15) & (pa[..., 1] > pa[..., 2] + 25) & (pa[..., 3] > 128)
    leaves = [l for l in crops(peri, green, 8000) if l.width > 100 and l.height > 80 and l.width < 400][:6]
    print('  flores: cabezas p', len(heads_p), 'd', len(heads_d), 'hojas', len(leaves))
    T, S = 256, 2
    atlas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    # fila 0 morado 0x7a4fb5 (hue ~266), fila 1 naranja 0xe07a20 (~28), fila 2 blanco 0xf4efe2, fila 3 amarillo (diente de leon, sin tinte)
    rows = [('morada', 266, 1.2, 0.95), ('naranja', 28, 2.2, 1.05), ('blanca', 45, 0.07, 1.25), ('amarilla', 50, 1.9, 1.1)]
    for row, (nm, hue, sat, val) in enumerate(rows):
        for col in range(4):
            tile = Image.new('RGBA', (T * S, T * S), (0, 0, 0, 0)); dr = ImageDraw.Draw(tile)
            # hojas basales
            for _ in range(3):
                paste_base(tile, R.choice(leaves), (T * S * R.uniform(.38, .62), T * S * 0.97), R.uniform(-70, 70), R.uniform(.2, .32) * S, R.random() < .5)
            nst = R.randint(3, 5)
            for i in range(nst):
                x1 = T * S * (0.5 + (i - (nst - 1) / 2) * 0.17 + R.uniform(-.04, .04)); y1 = T * S * R.uniform(0.2, 0.55)
                stem(dr, (T * S * R.uniform(.44, .56), T * S * 0.97), (x1, y1), R.uniform(-18, 18), 4, (84, 118, 52, 255))
                h = R.choice(heads_p); sc = R.uniform(0.2, 0.3) * S
                if hue is not None:
                    h = tint_hue(h, hue, sat, val)
                paste(tile, h, (x1, y1), R.uniform(0, 360), sc)
            tile = tile.resize((T, T), Image.LANCZOS)
            atlas.alpha_composite(tile, (col * T, row * T))
    return atlas

for name, fn, seed in (('follaje_isla', ramillos_isla, 11), ('follaje_jacaranda', ramillos_jacaranda, 12), ('hierba_atlas', mechones_hierba, 13), ('flores_atlas', flores, 14)):
    im = fn(seed); im.save(os.path.join(out, name + '.png')); print(name)
