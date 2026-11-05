import sys, glob
from PIL import Image, ImageDraw
a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]
fa = sorted(glob.glob(a + '/*.png')); fb = sorted(glob.glob(b + '/*.png'))
# contact sheet of b
ims = [Image.open(f) for f in fb]; W, H = ims[0].size
s = Image.new('RGB', (W * 2, H * 5))
for i, im in enumerate(ims): s.paste(im, ((i % 2) * W, (i // 2) * H))
s.save(out + '_sheet.jpg', quality=88)
# side-by-side previous|current per shot
for x, y in zip(fa, fb):
    A, B_ = Image.open(x).resize((W, H)), Image.open(y)
    c = Image.new('RGB', (W * 2 + 8, H), (0, 0, 0)); c.paste(A, (0, 0)); c.paste(B_, (W + 8, 0))
    c.save(out + '_cmp_' + y.split('/')[-1].replace('.png', '.jpg'), quality=85)
