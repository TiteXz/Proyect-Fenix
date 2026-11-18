import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; names = sys.argv[2].split(','); out = sys.argv[3]
w, h = 640, 360; cols = 2; rows = (len(names) + 1) // 2
S = Image.new('RGB', (w * cols, h * rows), (0, 0, 0))
for k, n in enumerate(names):
    im = Image.open(os.path.join(d, n + '.png')).convert('RGB').resize((w, h), Image.LANCZOS)
    S.paste(im, ((k % cols) * w, (k // cols) * h))
    ImageDraw.Draw(S).text(((k % cols) * w + 8, (k // cols) * h + 6), n, fill=(255, 255, 255))
S.save(out)
