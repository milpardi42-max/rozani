"""A big, genuinely tileable master: white noise wraps onto itself by
construction, so the pattern stays seamless while the file is large enough to
force the chunked (multipart) upload path. 12 MB at the default settings means
three 5 MB chunks.

usage: python3 mknoise.py out.png [w] [h]   (default 2000x2000 → ~12 MB)
"""
import os
import struct
import sys
import zlib


def chunk(tag, data):
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


path = sys.argv[1]
w = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
h = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
rows = bytearray()
for _ in range(h):
    rows.append(0)  # filter type 0
    rows += os.urandom(w * 3)
png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    + chunk(b"IDAT", zlib.compress(bytes(rows), 1))  # low level: keep the file big
    + chunk(b"IEND", b"")
)
open(path, "wb").write(png)
print(f"wrote {path}: {w}x{h}, {len(png)} bytes")
