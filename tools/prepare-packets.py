"""Resize the raw packet artwork in assets/ into web-sized PNGs under packets/."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "packets"
MAX_WIDTH = 1400

SOURCES = {
    "packet-0003-1.png": "assets/Packet0003/8.24_01.png",
    "packet-0004-1.png": "assets/Packet0004/8.27_01.png",
    "packet-0005-1.png": "assets/Packet0005/8.30_01.png",
    "packet-0006-1.png": "assets/Packet0006/03_01.png",
    "packet-0006-2.png": "assets/Packet0006/Start Poster_01.png",
    "packet-0007-1.png": "assets/Packet0007/07_01.png",
    "packet-0007-2.png": "assets/Packet0007/Start Poster_2_01.png",
    "packet-0008-1.png": "assets/Packet0008/\u6700\u7ec8\u8f93\u51fa_01.png",
}

OUT.mkdir(exist_ok=True)

for name, relative in SOURCES.items():
    source = ROOT / relative
    image = Image.open(source)
    width, height = image.size
    if width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(height * MAX_WIDTH / width)), Image.LANCZOS)
    image = image.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    target = OUT / name
    image.save(target, optimize=True)
    print(f"{relative}  {width}x{height} {source.stat().st_size // 1024}KB"
          f"  ->  {name}  {image.size[0]}x{image.size[1]} {target.stat().st_size // 1024}KB")
