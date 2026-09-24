import zlib, struct, sys
def chunk(t, d):
    c = t + d
    return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
w = int(sys.argv[2]); h = int(sys.argv[3])
raw = b""
for y in range(h):
    raw += b"\x00" + bytes([(x + y) % 256 for x in range(w) for _ in range(3)])
png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
open(sys.argv[1], "wb").write(png)
