"""A genuinely tileable master: the pattern is a function of (x mod w, y mod h)
built from integer-frequency sinusoids, so opposite edges match exactly. This is
what a real seamless texture upload looks like to the auto-detector."""
import math, struct, sys, zlib

def chunk(tag, data):
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xffffffff)

w, h = int(sys.argv[2]), int(sys.argv[3])
rows = []
for y in range(h):
    row = bytearray(b"\x00")
    for x in range(w):
        r = 0.5 + 0.5 * math.sin(2 * math.pi * 4 * x / w) * math.cos(2 * math.pi * 4 * y / h)
        g = 0.5 + 0.5 * math.sin(2 * math.pi * 6 * y / h)
        b = 0.5 + 0.5 * math.cos(2 * math.pi * 3 * x / w)
        row += bytes((int(r * 255), int(g * 255), int(b * 255)))
    rows.append(bytes(row))
png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(b"".join(rows), 6))
       + chunk(b"IEND", b""))
open(sys.argv[1], "wb").write(png)
print("tileable png:", len(png), "bytes")
