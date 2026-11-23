"""Ronda 2: atlas alfa de briznas finas de prado y de flores pequenas con sombreado interno.
Fuentes CC0 Poly Haven (ver CREDITOS.md): grass_medium_01/02 (briznas, espigas, version seca), dandelion_01 (hojas, capitulos),
mas dibujo procedural (treboles, flores de 5 petalos/margarita/ranunculo/calendula con gradiente y centro oscuro). Semilla fija.
Uso: python3 -I crear_atlas_ronda2.py <cache2> <salida>
Salida: hierba_briznas_atlas.png (2048x1024, 8x2 teselas de 256x512), flores_prado_atlas.png (2048x1536, 4x3 teselas de 512x512)."""
import colorsys, math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

cache, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
R = random.Random(2024)

def bleed(im):
    a = np.array(im); op = a[..., 3] > 100
    idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
    a[..., :3] = a[..., :3][idx[0], idx[1]]; return Image.fromarray(a, 'RGBA')

def components(slug, alpha_name, diff_names, min_area, ids=None, close=2, res='4k'):
    al = np.array(Image.open(f'{cache}/{slug}/{alpha_name}').convert('L')) > 128
    al = ndi.binary_closing(al, iterations=close)
    lab, n = ndi.label(al, structure=np.ones((3, 3))); sl = ndi.find_objects(lab)
    diffs = [np.array(Image.open(f'{cache}/{slug}/{d}').convert('RGB')) for d in diff_names]
    res_ = {}
    for i in range(n):
        if ids is not None and i not in ids: continue
        y0, y1, x0, x1 = sl[i][0].start, sl[i][0].stop, sl[i][1].start, sl[i][1].stop
        m = lab[y0:y1, x0:x1] == i + 1
        if m.sum() < min_area: continue
        a = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
        res_[i] = []
        for d in diffs:
            c = Image.fromarray(d[y0:y1, x0:x1]).convert('RGBA'); c.putalpha(a); res_[i].append(bleed(c))
    return res_

def hsv_adjust(im, dh=0.0, ds=1.0, dv=1.0, sat_cap=None):
    a = np.array(im).astype('float32') / 255; rgb = a[..., :3]
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx); dd = np.maximum(d, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) / 6
    h = (h + dh) % 1; s = np.clip(s * ds, 0, sat_cap if sat_cap else 1); v = np.clip(mx * dv, 0, 1)
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    ch = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    o = np.zeros_like(rgb)
    for k in range(6):
        sel = i == k
        for c in range(3): o[..., c] = np.where(sel, ch[k][c], o[..., c])
    a[..., :3] = o; return Image.fromarray((a * 255 + .5).astype('uint8'), 'RGBA')

def gradient_base(im, lo=0.62, span=0.45, tip=1.06):
    """Oscurece la base (AO falso) y aclara ligeramente la punta; base = parte baja de la imagen."""
    a = np.array(im).astype('float32'); y = np.linspace(1, 0, a.shape[0])[:, None]  # 1 arriba
    k = np.where(y < 1 - span, 1.0, lo + (1 - lo) * (1 - y) / span * 0 + (1 - lo) * np.clip((1 - y) / span, 0, 1) * 0)
    # base oscura -> hasta 'span' desde el suelo: rampa lo..1 ; punta: tip
    t = np.clip((1 - y) / span, 0, 1)
    k = lo + (1 - lo) * t ** 0.8
    k = np.where(y > 0.7, k * (1 + (tip - 1) * (y - 0.7) / 0.3), k)
    a[..., :3] *= k[..., None]; return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')

def bend(im, k):
    """Curva la brizna: desplazamiento horizontal creciente hacia la punta (cuadratico); la base queda centrada."""
    a = np.array(im); H, W = a.shape[:2]; pad = int(abs(k) * H) + 4
    o = np.zeros((H, W + 2 * pad, 4), np.uint8)
    for y in range(H):
        t = (H - 1 - y) / H; x = pad + int(k * H * t * t); o[y, x:x + W] = a[y]
    return Image.fromarray(o, 'RGBA')

def place(tile, im, base_xy, ang, flip=False):
    """Pega 'im' (base = centro inferior) con su base en base_xy y la gira ang grados (positivo = hacia la derecha)."""
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    w, h = im.size; S = max(w, h) * 2 + 8
    pad = Image.new('RGBA', (S, S), (0, 0, 0, 0)); bx, by = S // 2, S // 2 + h // 2
    pad.paste(im, (bx - w // 2, by - h))
    pad = pad.rotate(-ang, center=(bx, by), resample=Image.BICUBIC)
    tmp = Image.new('RGBA', tile.size, (0, 0, 0, 0)); tmp.paste(pad, (int(base_xy[0] - bx), int(base_xy[1] - by)))
    tile.alpha_composite(tmp)

# ============================================================ HIERBA
g2 = components('grass_medium_02', 'alpha_4k.jpg', ['diff_4k.jpg', 'dry_diff_4k.jpg'], 30000, ids={0, 1, 3, 4, 5}, close=3)
blades = list(g2.values())          # (verde, seca) de hojas largas completas
g1 = components('grass_medium_01', 'alpha_4k.jpg', ['diff_4k.jpg', 'dry_diff_4k.jpg'], 15000, ids={6, 80, 82, 87, 173, 178, 358, 366, 380}, close=2)
spikes = [g1[k] for k in (80, 82, 87, 6)]
CROP = {173: (0, .88, 0, .88), 178: (0, .7, 0, .95), 358: (0, 1, 0, .96), 366: (0, .92, 0, .78), 380: (0, 1, 0, .86)}   # (x0,x1,y0,y1) fraccion: recorta los restos de relleno del atlas original
def crop_f(im, f): return im.crop((int(im.width * f[0]), int(im.height * f[2]), int(im.width * f[1]), int(im.height * f[3])))
clumps = [[crop_f(g1[k][0], CROP[k])] for k in (173, 178, 358, 366, 380)]
print('briznas', len(blades), 'espigas', len(spikes), 'macollas', len(clumps))
VW, VH, SS = 410, 512, 2   # lienzo virtual (0,36 x 0,45 m) -> se comprime a 256x512 en el atlas

def stem_to_base(sp, length):
    """Alarga el tallo de una espiga hasta la base con un tallo fino del color del tallo existente."""
    w, h = sp.size; a = np.array(sp); ys, xs = np.where(a[..., 3] > 128)
    bot = ys.max(); xb = int(xs[ys >= bot - 3].mean()); col = tuple(int(c) for c in a[max(0, bot - 6):bot, max(0, xb - 2):xb + 3, :3].reshape(-1, 3).mean(0))
    n = Image.new('RGBA', (w, h + length), (0, 0, 0, 0)); n.paste(sp, (0, 0)); d = ImageDraw.Draw(n)
    d.line([(xb, bot), (xb + 2, h + length - 1)], fill=col + (255,), width=max(3, w // 70)); return n, xb + 1

def grass_tile(seed, nblades, dry=0.0, nspikes=0, height=(0.55, 0.95), spread=30, filler=0.9, squeeze=0.5, sat=(0.7, 0.88), hue=0.0, bend_k=(0.0, 0.25), short=False):
    r = random.Random(seed); W, H = VW * SS, VH * SS
    tile = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # relleno fino de la base (macollas reales de grass_medium_01, bajas y densas)
    if filler > 0:
        for q in range(3 if filler > .5 else 2):
            c = r.choice(clumps)[0]; sc = W * r.uniform(0.8, 1.25) / c.width * (1.0 if q == 0 else 0.8)
            c = c.resize((int(c.width * sc), int(c.height * sc * (0.55 if short else 0.9 + 0.3 * r.random()))), Image.LANCZOS)
            c = hsv_adjust(c, hue + r.uniform(-.012, .012), r.uniform(*sat), r.uniform(.8, 1.0))
            c = gradient_base(c, lo=.55, span=.35)
            place(tile, c, (W * r.uniform(.4, .6), H * 0.995), r.uniform(-5, 5), r.random() < .5)
    order = []
    for i in range(nblades):
        b = r.choice(blades); isdry = r.random() < dry
        src = b[1] if isdry else b[0]
        t = (i / max(1, nblades - 1)) * 2 - 1 + r.uniform(-.15, .15)   # -1..1 reparto lateral
        lh = H * r.uniform(*height) * (1 - 0.3 * abs(t)) * (0.4 if short else 1)
        order.append((lh, t, src, isdry))
    for lh, t, src, isdry in sorted(order, key=lambda o: o[0]):
        sc = lh / src.height; w = max(6, int(src.width * sc * squeeze)); im = src.resize((w, int(lh)), Image.LANCZOS)
        k = r.uniform(*bend_k) * (1 if t >= 0 else -1) * r.choice([1, 1, -0.5]); im = bend(im, k)
        v = r.uniform(.72, 1.0) * (0.78 if isdry else 1); ss = r.uniform(*sat) * (1.25 if isdry else 1)
        im = hsv_adjust(im, hue + r.uniform(-.012, .012), ss, v)
        im = gradient_base(im, lo=r.uniform(.5, .7), span=0.4)
        place(tile, im, (W * (0.5 + t * 0.12 + r.uniform(-.03, .03)), H * 0.99), t * spread + r.uniform(-8, 8), r.random() < .5)
    for j in range(nspikes):
        sp = r.choice(spikes)[0]; lh = H * r.uniform(0.72, 0.98)
        sc = lh / (sp.height + (0 if sp.height > 700 else 450 * 1.0)); w0 = sp.width
        sp2 = sp.resize((max(8, int(sp.width * sc * squeeze)), int(sp.height * sc)), Image.LANCZOS)
        if sp2.height < lh * 0.95:
            sp2, xb = stem_to_base(sp2, int(lh - sp2.height)); 
        sp2 = hsv_adjust(sp2, hue, r.uniform(.8, 1.0), r.uniform(.66, .82))
        sp2 = gradient_base(sp2, lo=.7, span=.3)
        # base del tallo = centro inferior de la imagen
        a = np.array(sp2); ys, xs = np.where(a[..., 3] > 128); xb = int(xs[ys >= ys.max() - 4].mean())
        canvas = Image.new('RGBA', (sp2.width, sp2.height), (0, 0, 0, 0))
        place(tile, bend(sp2, r.uniform(0.0, .1)), (W * (0.5 + (j - (nspikes - 1) / 2) * 0.2 + r.uniform(-.05, .05)) - (sp2.width / 2 - xb) * 0, H * 0.99), (j - (nspikes - 1) / 2) * 16 + r.uniform(-9, 9), r.random() < .5)
    return tile.resize((256, 512), Image.LANCZOS)

def clover_tile(seed, flowers=False, leaves=11):
    r = random.Random(seed); W, H = VW * SS, VH * SS; tile = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(tile)
    def leaflet(size, rot):
        S = int(size * 2.4); im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dd = ImageDraw.Draw(im)
        pts = []
        for a in np.linspace(0, 2 * math.pi, 60):
            rr = size * (0.5 + 0.5 * (math.sin(a / 2) ** 0.8 if False else 1)) * 0.5
            x = math.cos(a); y = math.sin(a); rr = size * 0.5 * (1 - 0.18 * (x < -0.0) * 0)  # obovado
            pts.append((S / 2 + x * rr * 0.95, S / 2 + y * rr * (0.82 + 0.18 * (x > 0))))
        # muesca en el extremo (corazon)
        pts = [(px - (size * 0.07 * max(0, 1 - abs(py - S / 2) / (size * .15)) if px > S / 2 + size * .3 else 0), py) for px, py in pts]
        dd.polygon(pts, fill=(255, 255, 255, 255))
        a = np.array(im).astype('float32'); yy, xx = np.mgrid[0:S, 0:S]; dist = np.hypot(xx - S * .45, yy - S / 2) / (size * .5)
        base = np.array([62, 96, 44], 'float32') * (0.7 + 0.45 * np.clip(dist, 0, 1.1)[..., None] ** 1.2)
        # marca clara en V (caracteristica del trebol)
        vx = (xx - S / 2) / (size * .5); vy = (yy - S / 2) / (size * .5)
        chev = np.exp(-(((np.abs(vy) * 0.9 - (vx * -0.55 + 0.25)) ) ** 2) / 0.012) * (vx > -0.4) * (vx < 0.55)
        base = base * (1 - 0.35 * chev[..., None]) + np.array([150, 175, 110], 'float32') * 0.35 * chev[..., None]
        a[..., :3] = base * R.uniform(.9, 1.08); im = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
        im.putalpha(Image.fromarray(np.array(im)[..., 3]).filter(ImageFilter.GaussianBlur(0.8)))
        return im.rotate(rot, resample=Image.BICUBIC)
    for i in range(leaves):
        x0 = W * r.uniform(.3, .7); ph = r.uniform(.07, .26) * H; ang = r.uniform(-55, 55); a = math.radians(ang)
        x1, y1 = x0 + math.sin(a) * ph, H * .99 - math.cos(a) * ph
        d.line([(x0, H * .99), (x1, y1)], fill=(104, 126, 70, 255), width=3 * SS)
        for k in range(3):
            rot = k * 120 + r.uniform(-12, 12) + ang; lf = leaflet(r.uniform(.052, .075) * H, 0)
            lf = lf.rotate(rot - 90, resample=Image.BICUBIC, expand=True)
            off = (math.cos(math.radians(rot - 90)) * 0.045 * H, -math.sin(math.radians(rot - 90)) * 0.045 * H)
            lf = lf.resize((lf.width, int(lf.height * r.uniform(.8, .95))))
            tile.alpha_composite(lf, (int(x1 - lf.width / 2 + off[0] * 0.8), int(y1 - lf.height / 2 + off[1] * 0.5)))
    if flowers:
        for i in range(r.randint(3, 5)):
            x0 = W * r.uniform(.3, .7); ph = r.uniform(.22, .4) * H; ang = r.uniform(-18, 18); a = math.radians(ang)
            x1, y1 = x0 + math.sin(a) * ph, H * .99 - math.cos(a) * ph
            d.line([(x0, H * .99), (x1, y1)], fill=(120, 140, 88, 255), width=3 * SS)
            fl = pom_flower(int(.05 * H), r); tile.alpha_composite(fl, (int(x1 - fl.width / 2), int(y1 - fl.height * .6)))
    return tile.resize((256, 512), Image.LANCZOS)

def pom_flower(size, r):
    """Flor de trebol blanco: esfera de florecillas pequenas, sombreada (mas oscura abajo, crema en el centro)."""
    S = int(size * 1.6); im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); a = np.zeros((S, S, 4), 'float32')
    yy, xx = np.mgrid[0:S, 0:S]; cx = cy = S / 2
    for _ in range(90):
        th = r.uniform(0, 2 * math.pi); rr = size * 0.5 * math.sqrt(r.random()); fx = cx + math.cos(th) * rr; fy = cy + math.sin(th) * rr * .85
        sh = 1 - 0.45 * max(0, (fy - cy) / size) + 0.25 * max(0, -(fy - cy) / size)
        m = np.exp(-(((xx - fx) ** 2 + (yy - fy) ** 2) / (2 * (size * .075) ** 2)))
        col = np.array([238, 232, 214]) * sh * r.uniform(.9, 1.0)
        a[..., :3] = a[..., :3] * (1 - m[..., None]) + col * m[..., None]; a[..., 3] = np.maximum(a[..., 3], m * 255 * 1.6)
    a[..., 3] = np.clip(a[..., 3], 0, 255); return Image.fromarray(a.astype('uint8'), 'RGBA')

def dandelion_leaves_tile(seed, n=6):
    r = random.Random(seed); W, H = VW * SS, VH * SS; tile = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dl = components('dandelion_01', 'alpha_2k.jpg', ['diff_2k.jpg'], 6000, ids={4, 14}, close=2)
    big, small = dl[4][0], dl[14][0]
    for i in range(n):
        src = big if r.random() < .55 else small; t = (i / (n - 1)) * 2 - 1
        if src is small: src = src.rotate(90 + 0, expand=True) if src.width > src.height else src
        lh = H * r.uniform(.28, .5) * (1 - .25 * abs(t))
        if src.width > src.height: src = src.rotate(-90, expand=True)
        sc = lh / src.height; im = src.resize((max(8, int(src.width * sc * .8)), int(lh)), Image.LANCZOS)
        im = hsv_adjust(im, -0.005, r.uniform(.7, .9), r.uniform(.85, 1.08)); im = bend(im, r.choice([-1, 1]) * r.uniform(.05, .3))
        im = gradient_base(im, lo=.62, span=.35)
        place(tile, im, (W * (.5 + t * .08), H * .99), t * 62 + r.uniform(-10, 10), r.random() < .5)
    return tile.resize((256, 512), Image.LANCZOS)

atlas = Image.new('RGBA', (2048, 1024), (0, 0, 0, 0))
T = [  # (nombre, funcion)
    ('verde_a', lambda: grass_tile(1, 7, 0.0)), ('verde_b', lambda: grass_tile(2, 8, 0.05, height=(.4, .75))),
    ('verde_c', lambda: grass_tile(3, 6, 0.1, height=(.5, .9), spread=38)), ('verde_d', lambda: grass_tile(4, 9, 0.0, height=(.4, .8), hue=0.004)),
    ('espiga_a', lambda: grass_tile(5, 5, 0.1, nspikes=2)), ('espiga_b', lambda: grass_tile(6, 4, 0.15, nspikes=3, height=(.4, .7))),
    ('mixta_seca_a', lambda: grass_tile(7, 7, 0.45, nspikes=1, hue=-0.006)), ('mixta_seca_b', lambda: grass_tile(8, 7, 0.7, nspikes=2, hue=-0.012, sat=(.6, .8))),
    ('seca', lambda: grass_tile(9, 8, 1.0, nspikes=2, hue=-0.02, sat=(.8, 1.0))), ('cesped_bajo', lambda: grass_tile(10, 3, 0.0, height=(.3, .5), filler=1.0, short=True)),
    ('alta_arqueada', lambda: grass_tile(11, 6, 0.2, nspikes=3, height=(.7, .95), bend_k=(.1, .4), spread=26)), ('pálida', lambda: grass_tile(12, 7, 0.35, hue=-0.01, sat=(.55, .75))),
    ('trebol', lambda: clover_tile(13)), ('trebol_flor', lambda: clover_tile(14, True)), ('hojas_diente_leon', lambda: dandelion_leaves_tile(15)), ('hojas_diente_leon_b', lambda: dandelion_leaves_tile(16, 5)),
]
for i, (n, fn) in enumerate(T):
    atlas.alpha_composite(fn(), ((i % 8) * 256, (i // 8) * 512)); print('tile', i, n)
atlas.save(os.path.join(out, 'hierba_briznas_atlas.png'))
a = np.array(atlas).astype('float32'); m = a[..., 3] > 128
print('color medio sRGB', a[..., :3][m].mean(0), 'cobertura', m.mean())

# ============================================================ FLORES
def petal_flower(kind, D, r, tilt=0.0):
    """Cabeza de flor procedural sombreada. D = diametro en px. Devuelve RGBA con la flor vista con 'tilt' (0 = de frente)."""
    SSF = 3; S = int(D * SSF * 1.3); cx = cy = S / 2
    yy, xx = np.mgrid[0:S, 0:S].astype('float32'); dx = xx - cx; dy = yy - cy; rad = np.hypot(dx, dy) / (D * SSF / 2); ang = np.arctan2(dy, dx)
    P = {'morada': dict(n=5, wid=0.42, base=(70, 40, 120), tip=(150, 112, 205), vein=(215, 190, 240), centre=(235, 225, 190), cr=.14, notch=.0),
         'blanca': dict(n=17, wid=0.13, base=(205, 205, 190), tip=(250, 248, 240), vein=(235, 232, 222), centre=(220, 170, 40), cr=.26, notch=0),
         'amarilla': dict(n=5, wid=0.46, base=(214, 150, 16), tip=(255, 218, 55), vein=(255, 235, 120), centre=(240, 190, 20), cr=.10, notch=0),
         'naranja': dict(n=21, wid=0.12, base=(190, 70, 20), tip=(255, 150, 50), vein=(255, 175, 90), centre=(90, 45, 25), cr=.28, notch=0)}[kind]
    n = P['n']; off = r.uniform(0, 2 * math.pi)
    sector = ((ang - off) % (2 * math.pi)) / (2 * math.pi) * n; fr = sector - np.floor(sector) - 0.5   # -0.5..0.5 dentro del petalo
    # perfil del petalo: ancho maximo a ~65% del radio, punta redondeada
    prof = np.where(rad < 1, P['wid'] * np.sin(np.clip(rad, 0, 1) ** 0.75 * math.pi * .95) ** .8 + 0.02 * (rad < .15), 0)
    ang_half = prof * (1.0 if n < 8 else 1.0) * (n / (2 * math.pi)) * 1.0
    inside = (np.abs(fr) < np.clip(prof * n / (2 * math.pi) * (1.0 if n < 8 else 1.0) * 2.6 if n >= 8 else prof * n / (2 * math.pi) * 2.2, 0, 0.5)) & (rad <= 1.0) & (rad > 0.0)
    if kind == 'morada': inside &= ~((np.abs(fr) < 0.06) & (rad > 0.9))              # muesca en la punta
    if n >= 8: inside |= rad < P['cr'] * 1.1
    t = np.clip(rad, 0, 1)
    base = np.array(P['base'], 'float32'); tip = np.array(P['tip'], 'float32'); vein = np.array(P['vein'], 'float32')
    col = base + (tip - base) * (t[..., None] ** 0.9)                                   # gradiente centro oscuro -> punta clara
    vein_m = np.exp(-(fr ** 2) / 0.0025) * (rad > .12) * (rad < .85) * (0.25 if n < 8 else 0.15)
    col = col * (1 - vein_m[..., None]) + vein * vein_m[..., None]
    edge = np.clip((1 - t) / 0.12, 0, 1)                                              # borde algo mas claro/translucido
    col = col * (0.85 + 0.15 * edge[..., None]) + (tip * 1.05 - col) * (1 - edge[..., None]) * 0.25
    gap = np.exp(-(np.abs(fr) - 0.5) ** 2 / 0.003) if n < 8 else 0
    col *= (1 - 0.22 * gap * (1 if n < 8 else 0))[..., None] if n < 8 else 1               # sombra entre petalos
    col *= (1 + 0.18 * (-(dy / (D * SSF / 2))))[..., None].clip(0.85, 1.15) * 1.0       # luz desde arriba
    # centro oscuro / estambres
    cen = np.array(P['centre'], 'float32'); cm = np.clip((P['cr'] - rad) / 0.04, 0, 1)
    cdark = np.clip(1 - rad / P['cr'], 0, 1)
    ccol = cen * (0.55 + 0.45 * (1 - cdark ** 1.5))[..., None] if kind in ('blanca', 'amarilla', 'morada') else cen * (0.8 + 0.4 * (rad / P['cr']))[..., None]
    dots = (np.sin(xx * 1.7) * np.sin(yy * 1.9) > 0.3) & (rad < P['cr'])
    ccol = ccol * (1 - 0.18 * dots[..., None])
    col = col * (1 - cm[..., None]) + ccol * cm[..., None]
    alpha = (inside | (rad < P['cr'])).astype('float32')
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype('uint8'), 'RGBA')
    im = im.filter(ImageFilter.GaussianBlur(0.9))
    # ligero ruido de color
    a = np.array(im).astype('float32'); a[..., :3] *= (1 + 0.05 * np.random.default_rng(r.randint(0, 1 << 30)).standard_normal((S, S, 1))); im = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    im = im.resize((S // SSF, int(S // SSF * math.cos(tilt) ** .6 + 2)), Image.LANCZOS) if tilt else im.resize((S // SSF, S // SSF), Image.LANCZOS)
    return im

def flower_tile(kind, seed, TS=512):
    r = random.Random(seed); tile = Image.new('RGBA', (TS, TS), (0, 0, 0, 0)); d = ImageDraw.Draw(tile)
    mpp = 0.0006 * 512 / TS * (512 / 512)   # 0,6 mm por pixel (tarjeta de 0,31 m)
    dia = {'morada': (.028, .036), 'blanca': (.022, .03), 'amarilla': (.026, .034), 'naranja': (.03, .04)}[kind]
    leaf_col = (66, 98, 44)
    # hojas basales pequenas (lanceoladas sombreadas)
    for _ in range(r.randint(5, 8)):
        L = r.uniform(.04, .09) / mpp; Wd = L * r.uniform(.13, .2); ang = r.uniform(-75, 75)
        S = int(L * 1.2); lf = Image.new('RGBA', (S, S), (0, 0, 0, 0)); a = np.zeros((S, S, 4), 'float32'); yy, xx = np.mgrid[0:S, 0:S]
        t = np.clip((S - 1 - yy) / L, 0, 1); half = Wd * np.sin(np.clip(t, 0, 1) ** .7 * math.pi) ** .9 / 2 + .001
        inside = (np.abs(xx - S / 2) < half) & (t > 0) & (t < 1)
        shade = 0.62 + 0.5 * np.clip(np.abs(xx - S / 2) / np.maximum(half, 1), 0, 1) ** 1.2 * 0.8 + 0.2 * t
        col = np.array(leaf_col, 'float32') * shade[..., None] * r.uniform(.85, 1.1)
        mid = np.abs(xx - S / 2) < 1; col[mid] = col[mid] * 1.25
        a[..., :3] = col; a[..., 3] = inside * 255; lf = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA').filter(ImageFilter.GaussianBlur(0.6))
        place(tile, lf, (TS * r.uniform(.4, .6), TS * 0.985), ang, r.random() < .5)
    nst = r.randint(3, 6)
    for i in range(nst):
        x0 = TS * r.uniform(.42, .58); ph = r.uniform(.14, .27) / mpp; ang = (i - (nst - 1) / 2) * r.uniform(7, 11) + r.uniform(-4, 4); a = math.radians(ang)
        x1 = x0 + math.sin(a) * ph; y1 = TS * .985 - math.cos(a) * ph; ctrl = (x0 + math.sin(a) * ph * .45 + r.uniform(-8, 8), TS * .985 - math.cos(a) * ph * .55)
        pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * ctrl[0] + t * t * x1, (1 - t) ** 2 * TS * .985 + 2 * (1 - t) * t * ctrl[1] + t * t * y1) for t in np.linspace(0, 1, 24)]
        for k in range(len(pts) - 1):   # tallo fino (2-3 mm) con tono mas claro arriba
            f = k / len(pts); c = tuple(int(v) for v in (np.array((78, 100, 52)) * (0.7 + .5 * f)))
            d.line([pts[k], pts[k + 1]], fill=c + (255,), width=4 if k < 12 else 3)
        # hojillas en el tallo
        if r.random() < .6:
            m = pts[len(pts) // 3]; d.ellipse([m[0] - 3, m[1] - 8, m[0] + 3, m[1] + 8], fill=(70, 104, 48, 255))
        D = int(r.uniform(*dia) / mpp); fl = petal_flower(kind, D, r, tilt=r.choice([0, 0, .5, .9]))
        tile.alpha_composite(fl, (int(x1 - fl.width / 2), int(y1 - fl.height / 2)))
        if r.random() < .5 and kind != 'blanca':   # capullo pequeno junto a la flor
            bd = int(D * .4); bud = petal_flower(kind, bd, r, tilt=.9)
            bx = x1 + r.uniform(-1, 1) * D * .9; by = y1 + D * r.uniform(.5, 1.3)
            d.line([(x1, y1 + D * .3), (bx, by)], fill=(86, 110, 58, 255), width=2); tile.alpha_composite(bud, (int(bx - bud.width / 2), int(by - bud.height / 2)))
    return tile

fat = Image.new('RGBA', (2048, 1536), (0, 0, 0, 0)); i = 0
for row, kind in enumerate(('morada', 'blanca', 'amarilla', 'naranja')):
    pass
kinds = ['morada', 'blanca', 'amarilla']   # 4 columnas x 3 filas: filas = morada, blanca/amarilla, naranja ...
layout = ['morada', 'morada', 'blanca', 'blanca', 'amarilla', 'amarilla', 'naranja', 'naranja', 'morada', 'blanca', 'amarilla', 'naranja']
for i, k in enumerate(layout):
    fat.alpha_composite(flower_tile(k, 100 + i), ((i % 4) * 512, (i // 4) * 512)); print('flor', i, k)
fat = bleed(hsv_adjust(fat, 0.0, 0.8, 0.94))   # colores suaves, nada saturado
fat.save(os.path.join(out, 'flores_prado_atlas.png'))
