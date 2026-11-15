"""Crop SLDEM2015 around Apollo 17 and save a matching LROC WAC image.

The source tile is a 1.4 GB raw float32 raster (15360 x 23040). This script
range-requests only the rows it needs. It does not use GDAL. Do not commit the
full IMG.

Elevation: SLDEM2015 512 pixels/degree, LRO LOLA + Kaguya Terrain Camera,
latitudes 0–30 N, longitudes 0–45 E.
https://pgda.gsfc.nasa.gov/products/54
https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_000_045_FLOAT.IMG
Label: heights are kilometres relative to a 1737.4 km sphere, pixel-registered,
north at the first row. Line and sample projection offsets in the PDS label
put longitude 0 and latitude 30 on the outer edges of that tile.

Imagery: USGS WMS layer LROC_WAC (LROC Wide Angle Camera global mosaic), same
bounds, north-up. Narrow Angle Camera frames are not a continuous mosaic here,
so they are not fetched.

Run from the repo root:
  python scripts/terrain/prepare_apollo17.py
"""

from __future__ import annotations

import json
import math
import struct
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

SITE_LAT = 20.19080
SITE_LON = 30.77168
PPD = 512
SAMPLES = 23040
RECORD = SAMPLES * 4
MAX_LAT = 30.0
MIN_LON = 0.0
N = 256
RADIUS_KM = 1737.4

IMG = (
    "https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/"
    "SLDEM2015_512_00N_30N_000_045_FLOAT.IMG"
)
WMS = (
    "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map"
    "&service=WMS&version=1.3.0&request=GetMap&layers=LROC_WAC&styles=&crs=EPSG:4326"
    "&bbox={south},{west},{north},{east}&width={size}&height={size}&format=image/jpeg"
)

OUT = Path(__file__).resolve().parents[2] / "public" / "terrain" / "moon" / "apollo17"
UA = "space-apps-terrain/1.0"


def pixel_index(lat: float, lon: float) -> tuple[float, float]:
    """0-based row (northward origin) and column of the pixel that contains this point."""
    row = (MAX_LAT - lat) * PPD - 0.5
    col = (lon - MIN_LON) * PPD - 0.5
    return row, col


def fetch(url: str, range_header: str | None = None) -> bytes:
    headers = {"User-Agent": UA}
    if range_header:
        headers["Range"] = range_header
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()


def fill_voids(values: list[float]) -> list[float]:
    valid = [v for v in values if math.isfinite(v) and -12.0 <= v <= 12.0]
    if not valid:
        raise SystemExit("SLDEM window has no usable heights.")
    mean = sum(valid) / len(valid)
    grid = [v if math.isfinite(v) and -12.0 <= v <= 12.0 else None for v in values]
    for _ in range(4):
        nxt = grid[:]
        for i, v in enumerate(grid):
            if v is not None:
                continue
            r, c = divmod(i, N)
            near = []
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < N and 0 <= cc < N:
                    n = grid[rr * N + cc]
                    if n is not None:
                        near.append(n)
            nxt[i] = sum(near) / len(near) if near else mean
        grid = nxt
    return [v if v is not None else mean for v in grid]


def main() -> None:
    row_f, col_f = pixel_index(SITE_LAT, SITE_LON)
    row0 = int(round(row_f)) - N // 2
    col0 = int(round(col_f)) - N // 2
    if row0 < 0 or col0 < 0 or row0 + N > 15360 or col0 + N > SAMPLES:
        raise SystemExit(f"window {row0},{col0} falls outside the tile")

    north = MAX_LAT - row0 / PPD
    south = MAX_LAT - (row0 + N) / PPD
    west = MIN_LON + col0 / PPD
    east = MIN_LON + (col0 + N) / PPD
    start = row0 * RECORD
    end = (row0 + N) * RECORD - 1
    print(f"rows {row0}..{row0 + N - 1} cols {col0}..{col0 + N - 1}")
    print(f"bounds S {south:.6f} N {north:.6f} W {west:.6f} E {east:.6f}")
    blob = fetch(IMG, f"bytes={start}-{end}")
    if len(blob) != N * RECORD:
        raise SystemExit(f"expected {N * RECORD} bytes, got {len(blob)}")

    km: list[float] = []
    for r in range(N):
        line = blob[r * RECORD + col0 * 4 : r * RECORD + (col0 + N) * 4]
        km.extend(struct.unpack(f"<{N}f", line))
    filled = fill_voids(km)
    metres = [v * 1000.0 for v in filled]
    lo, hi = min(metres), max(metres)
    if hi - lo < 20:
        raise SystemExit(f"height span is only {hi - lo:.1f} m; the window is not real relief")
    if lo < -12000 or hi > 12000:
        raise SystemExit(f"heights {lo:.0f}..{hi:.0f} m are outside a lunar range")

    image_bytes = fetch(WMS.format(south=south, west=west, north=north, east=east, size=768))
    if not image_bytes.startswith(b"\xff\xd8"):
        raise SystemExit("LROC WAC response was not a JPEG")
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    OUT.mkdir(parents=True, exist_ok=True)
    height_path = OUT / "height.f32"
    with height_path.open("wb") as handle:
        handle.write(struct.pack(f"<{len(metres)}f", *metres))
    image.save(OUT / "color.jpg", quality=82, optimize=True)
    center = metres[N // 2 * N + N // 2]
    meta = {
        "name": "Apollo 17, Taurus-Littrow",
        "lat": SITE_LAT,
        "lon": SITE_LON,
        "cols": N,
        "rows": N,
        "south": south,
        "north": north,
        "west": west,
        "east": east,
        "min_m": lo,
        "max_m": hi,
        "mean_m": sum(metres) / len(metres),
        "center_m": center,
        "radius_m": RADIUS_KM * 1000.0,
        "row0": "north",
        "encoding": "float32-le-row-major-metres",
        "elevation": "SLDEM2015 512 ppd, LRO LOLA + Kaguya TC, km relative to 1737.4 km, stored here as metres",
        "imagery": "USGS WMS LROC_WAC (LRO LROC Wide Angle Camera global mosaic), 768 px, same bounds",
        "sources": [
            "https://pgda.gsfc.nasa.gov/products/54",
            IMG,
            "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map",
        ],
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {height_path} span {lo:.1f}..{hi:.1f} m, center {center:.1f} m")


if __name__ == "__main__":
    main()
