#!/usr/bin/env python3
"""
Builds the academy hero preview video from the course artwork that ships with
the site — no stock footage, no placeholders: every shot is a real course from
the academy catalogue and the captions use its real title.

    python3 scripts/academy/make-preview-video.py                 # → public/videos/academy/preview.mp4
    python3 scripts/academy/make-preview-video.py --width 1920 --height 1080

Requirements (dev-time only, not shipped with the app):
    pip install pillow arabic-reshaper python-bidi fonttools brotli imageio-ffmpeg

The admin panel can replace this file at any time: upload a video for the
featured course (آکادمی → دوره → ویدیوها) and the hero plays that instead.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    from fontTools.ttLib import TTFont
    import imageio_ffmpeg
except ImportError as exc:  # pragma: no cover - tooling hint
    sys.exit(f"missing dev dependency: {exc}. See the docstring for the pip line.")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Real catalogue entries (slug → artwork + Persian title), mirrored from
# src/lib/data/seed.ts so the preview always shows genuine courses.
SHOTS = [
    {"image": "e01.jpg", "title": "مبانی طراحی الگو", "caption": "از موتیف تا تکرار بی‌درز"},
    {"image": "e02.jpg", "title": "رنگ برای فضای داخلی", "caption": "پالت، نور و مقیاس"},
    {"image": "e03.jpg", "title": "هندسه و ریتم", "caption": "شبکه، تقارن، ساختار"},
    {"image": "e04.jpg", "title": "نقش ایرانی: اسلیمی و ختایی", "caption": "بازخوانی معاصر"},
    {"image": "e06.jpg", "title": "ورکشاپ و وبینار زنده", "caption": "کلاس تعاملی با مدرس"},
]

BRAND = "آکادمی رزی"
TAGLINE = "یاد بگیر، بساز، بفروش."
URL = "rosieatelier.com/academy"

ACCENT = (211, 143, 85)  # brand accent (dark theme value from globals.css)
INK = (12, 16, 24)


def fa(text: str) -> str:
    """Reshape + bidi so Persian renders with correct letter joining."""
    return get_display(arabic_reshaper.reshape(text))


def load_font(source_woff2: str, size: int, cache_dir: str) -> ImageFont.FreeTypeFont:
    """Pillow cannot read woff2 — convert once to ttf with fontTools."""
    name = os.path.basename(source_woff2).replace(".woff2", ".ttf")
    target = os.path.join(cache_dir, name)
    if not os.path.exists(target):
        font = TTFont(os.path.join(ROOT, source_woff2))
        font.flavor = None
        font.save(target)
    return ImageFont.truetype(target, size)


def cover(img: Image.Image, width: int, height: int, zoom: float, pan: float) -> Image.Image:
    """Scale to cover the frame at `zoom`, then crop with a horizontal pan (-1..1)."""
    scale = max(width / img.width, height / img.height) * zoom
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    max_dx = max(0, resized.width - width)
    max_dy = max(0, resized.height - height)
    left = round(max_dx * (0.5 + pan * 0.5))
    top = round(max_dy * 0.5)
    return resized.crop((left, top, left + width, top + height))


def scrim(canvas: Image.Image) -> Image.Image:
    """Bottom gradient so the captions stay readable over any artwork."""
    width, height = canvas.size
    layer = Image.new("L", (1, height), 0)
    for y in range(height):
        ratio = max(0.0, (y / height - 0.45) / 0.55)
        layer.putpixel((0, y), int(215 * min(1.0, ratio) ** 1.4))
    return Image.composite(Image.new("RGB", canvas.size, (6, 9, 14)), canvas, layer.resize((width, height)))


def draw_caption(canvas: Image.Image, title: str, caption: str, alpha: float, fonts) -> None:
    if alpha <= 0.01:
        return
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    a = int(255 * alpha)
    pad = round(canvas.width * 0.062)
    y = canvas.height - pad - 96
    d.text((canvas.width - pad, y), fa(caption), font=fonts["regular"], fill=(255, 255, 255, int(a * 0.72)), anchor="ra")
    d.text((canvas.width - pad, y - 62), fa(title), font=fonts["bold"], fill=(255, 255, 255, a), anchor="ra")
    d.line([(canvas.width - pad, y + 30), (canvas.width - pad - 86, y + 30)], fill=ACCENT + (a,), width=3)
    canvas.alpha_composite(overlay)


def end_card(size, alpha: float, fonts) -> Image.Image:
    width, height = size
    card = Image.new("RGBA", size, INK + (255,))
    d = ImageDraw.Draw(card)
    for i in range(0, width, 60):  # faint grid, matches the page hero
        d.line([(i, 0), (i, height)], fill=(255, 255, 255, 8))
    for j in range(0, height, 60):
        d.line([(0, j), (width, j)], fill=(255, 255, 255, 8))
    a = int(255 * alpha)
    cx = width // 2
    d.text((cx, height // 2 - 92), fa(BRAND), font=fonts["display"], fill=(255, 255, 255, a), anchor="ma")
    d.text((cx, height // 2 - 12), fa(TAGLINE), font=fonts["bold"], fill=ACCENT + (a,), anchor="ma")
    d.text((cx, height // 2 + 62), URL, font=fonts["small"], fill=(255, 255, 255, int(a * 0.55)), anchor="ma")
    d.line([(cx - 60, height // 2 + 26), (cx + 60, height // 2 + 26)], fill=ACCENT + (int(a * 0.6),), width=2)
    return card


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "videos", "academy", "preview.mp4"))
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--shot", type=float, default=3.2, help="seconds each shot stays on screen")
    ap.add_argument("--fade", type=float, default=0.7, help="crossfade seconds")
    ap.add_argument("--end", type=float, default=3.2, help="end card seconds")
    args = ap.parse_args()

    size = (args.width, args.height)
    fps = args.fps
    frame_count = args.fade and round((len(SHOTS) * args.shot - (len(SHOTS) - 1) * args.fade + args.end) * fps)

    with tempfile.TemporaryDirectory() as tmp:
        fonts = {
            "display": load_font("public/fonts/iransanse-web/IRANSansWeb_Bold.woff2", round(args.height * 0.088), tmp),
            "bold": load_font("public/fonts/iransanse-web/IRANSansWeb_Bold.woff2", round(args.height * 0.062), tmp),
            "regular": load_font("public/fonts/iransanse-web/IRANSansWeb.woff2", round(args.height * 0.037), tmp),
            "small": load_font("public/fonts/inter/inter-latin-wght-normal.woff2", round(args.height * 0.028), tmp),
        }
        images = []
        for shot in SHOTS:
            path = os.path.join(ROOT, "public", "images", "education", shot["image"])
            images.append(Image.open(path).convert("RGB"))

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        cmd = [
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{args.width}x{args.height}", "-r", str(fps), "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-tune", "stillimage", "-crf", "24", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-an", args.out,
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        try:
            for index in range(frame_count):
                t = index / fps
                frames = []
                for i, shot in enumerate(SHOTS):
                    start = i * (args.shot - args.fade)
                    local = t - start
                    if local < 0 or local > args.shot:
                        continue
                    zoom = 1.06 - 0.06 * max(0.0, min(1.0, local / args.shot)) if i % 2 == 0 else 1.0 + 0.06 * max(0.0, min(1.0, local / args.shot))
                    pan = (-1 + 2 * (local / args.shot)) * (1 if i % 2 == 0 else -1)
                    scene = scrim(cover(images[i], *size, zoom, pan)).convert("RGBA")
                    draw_caption(scene, shot["title"], shot["caption"], min(1.0, local / 0.5) * (1.0 if local < args.shot - args.fade else max(0.0, (args.shot - local) / args.fade)), fonts)
                    frames.append((scene, local))
                if not frames:
                    alpha = min(1.0, (t - (frame_count / fps - args.end)) / 0.6)
                    canvas = end_card(size, max(0.15, alpha), fonts)
                else:
                    canvas, local = frames[0]
                    if len(frames) > 1:
                        nxt, nlocal = frames[1]
                        alpha = max(0.0, min(1.0, (local - (args.shot - args.fade)) / args.fade))
                        canvas = Image.blend(canvas, nxt, alpha)
                proc.stdin.write(canvas.convert("RGB").tobytes())
        finally:
            proc.stdin.close()
            if proc.wait() != 0:
                sys.exit("ffmpeg failed")

    size_kb = os.path.getsize(args.out) / 1024
    print(f"wrote {args.out} — {frame_count} frames, {frame_count / fps:.1f}s, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
