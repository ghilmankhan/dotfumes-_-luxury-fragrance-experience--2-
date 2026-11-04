#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
hero_dir="$root_dir/public/images/hero"
temp_png="$(mktemp /tmp/dotfumes-hero-XXXXXX.png)"
trap 'rm -f "$temp_png"' EXIT

for original in "$hero_dir"/*-2560x1440.webp; do
  base="${original%.webp}"
  dwebp "$original" -o "$temp_png" >/dev/null 2>&1
  for width in 900 1440; do
    cwebp -quiet -q 84 -m 6 -resize "$width" 0 "$temp_png" -o "${base}-${width}w.webp"
  done
  if [[ "$original" == *dotfumes-home-hero-* ]]; then
    # The source photograph places the complete bottle inside x=1180..2332.
    # This crop preserves the whole bottle in a separate mobile image panel.
    ffmpeg -hide_banner -loglevel error -i "$original" -vf 'crop=1152:1440:1180:0,scale=900:1125' -frames:v 1 -y "$temp_png"
    cwebp -quiet -q 84 -m 6 "$temp_png" -o "${base}-mobile-900x1125.webp"
  fi
done

about="$hero_dir/dotfumes-about-hero-maison-split-1800x2400.webp"
dwebp "$about" -o "$temp_png" >/dev/null 2>&1
for width in 720 1200; do
  cwebp -quiet -q 84 -m 6 -resize "$width" 0 "$temp_png" -o "${about%.webp}-${width}w.webp"
done
