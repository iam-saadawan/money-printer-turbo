import sys
from PIL import Image
out, cols = sys.argv[1], int(sys.argv[2]); files = sys.argv[3:]
ims = [Image.open(f) for f in files]; w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims): s.paste(im, ((i % cols) * w, (i // cols) * h))
s.thumbnail((2000, 2000)); s.save(out, quality=88); print(s.size)
