"""Cielo 4K LDR para fondo a partir de un .hdr RGBE (Poly Haven, CC0). El HDR 1K existente sigue siendo la luz/PMREM.
Uso: python3 -I crear_cielo.py <in.hdr> <out.webp> [exposicion]
Mapeo: exposicion, curva filmica suave (Reinhard extendido en luminancia, el disco solar se recorta a blanco) y sRGB."""
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1:3]; ev = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
f = open(src, 'rb'); w = h = None
while True:
    l = f.readline().strip()
    if l.startswith(b'-Y'): _, h, _, w = l.split(); h, w = int(h), int(w); break
data = f.read(); img = np.zeros((h, w, 4), np.uint8); p = 0
for y in range(h):
    assert data[p] == 2 and data[p+1] == 2; p += 4
    for c in range(4):
        x = 0
        while x < w:
            n = data[p]; p += 1
            if n > 128: n -= 128; img[y, x:x+n, c] = data[p]; p += 1
            else: img[y, x:x+n, c] = np.frombuffer(data, np.uint8, n, p); p += n
            x += n
e = img[..., 3].astype(np.int32) - 136
rgb = img[..., :3].astype(np.float32) * np.exp2(e)[..., None].astype(np.float32) * ev
L = rgb @ np.array([.2126, .7152, .0722], np.float32)
Lw = 6.0
Ld = L * (1 + L / Lw**2) / (1 + L); k = Ld / np.maximum(L, 1e-6)
ldr = np.clip(rgb * k[..., None], 0, 1) ** (1 / 2.2)
print('lum max', L.max(), 'media', L.mean())
Image.fromarray((ldr * 255 + .5).astype(np.uint8)).save(out, quality=93, method=6)
