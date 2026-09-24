import sys
src, size, prefix = sys.argv[1], int(sys.argv[2]), sys.argv[3]
data = open(src, "rb").read()
n = 0
for off in range(0, len(data), size):
    n += 1
    open(f"{prefix}-{n}.bin", "wb").write(data[off:off + size])
print(f"split into {n} parts of {size} bytes")
