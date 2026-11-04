"""Read-only local image metadata inventory for the Dotfumes audit.

Run from repository root: python3 docs/audits/inventory_images.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.ico'}
SKIP_DIRS = {'.git', 'node_modules', 'dist', '.netlify'}


def project_files():
    for path in ROOT.rglob('*'):
        if path.is_file() and not any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            yield path


def metadata(path):
    result = subprocess.run(
        ['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'format', '-g', 'space', '-g', 'hasAlpha', str(path)],
        capture_output=True, text=True, check=False,
    )
    found = dict(re.findall(r'^\s*(pixelWidth|pixelHeight|format|space|hasAlpha):\s*(.+)$', result.stdout, re.M))
    return found


source_files = [p for p in project_files() if p.suffix.lower() in {'.ts', '.tsx', '.css', '.html'} and (
    'src' in p.relative_to(ROOT).parts or p.name == 'index.html'
)]
sources = {str(p.relative_to(ROOT)): p.read_text(errors='replace') for p in source_files}
assets = sorted(p for p in project_files() if p.suffix.lower() in EXTENSIONS)
rows = []
for path in assets:
    rel = str(path.relative_to(ROOT))
    meta = metadata(path)
    width = int(meta['pixelWidth']) if meta.get('pixelWidth', '').isdigit() else None
    height = int(meta['pixelHeight']) if meta.get('pixelHeight', '').isdigit() else None
    raw = path.read_bytes()
    # WebP extended header flags: bit 1 = animation. Simple VP8/VP8L is still.
    animated = bool(len(raw) > 21 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'
                    and raw[12:16] == b'VP8X' and raw[20] & 0x02)
    matches = [(src, text.count(path.name)) for src, text in sources.items() if path.name in text]
    rows.append({
        'filename': path.name,
        'repository_path': rel,
        'extension': path.suffix.lower(),
        'detected_mime': {'webp': 'image/webp', 'png': 'image/png', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
                          'svg': 'image/svg+xml', 'avif': 'image/avif', 'ico': 'image/x-icon'}.get(meta.get('format', ''),
                          'NOT VERIFIED'),
        'width_px': width,
        'height_px': height,
        'aspect_ratio': round(width / height, 4) if width and height else None,
        'bytes': len(raw),
        'color_mode': meta.get('space', 'NOT VERIFIED'),
        'has_alpha': meta.get('hasAlpha', 'NOT VERIFIED'),
        'animated': animated,
        'sha256': hashlib.sha256(raw).hexdigest(),
        'source_reference_count': sum(count for _, count in matches),
        'source_reference_files': [src for src, _ in matches],
        'encoding_quality': 'NOT VERIFIED',
        'display_suitability': 'REQUIRES VISUAL/LAYOUT REVIEW',
    })

csv_path = OUT / 'image-asset-inventory.csv'
json_path = OUT / 'image-asset-inventory.json'
with csv_path.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else [])
    writer.writeheader()
    writer.writerows({k: json.dumps(v) if isinstance(v, list) else v for k, v in row.items()} for row in rows)
json_path.write_text(json.dumps(rows, indent=2) + '\n')
hash_counts = Counter(r['sha256'] for r in rows)
summary = {
    'assets': len(rows),
    'bytes': sum(r['bytes'] for r in rows),
    'formats': dict(Counter(r['extension'] for r in rows)),
    'directories': dict(Counter(str(Path(r['repository_path']).parent) for r in rows)),
    'literal_source_references': sum(r['source_reference_count'] for r in rows),
    'zero_literal_source_references': [r['repository_path'] for r in rows if not r['source_reference_count']],
    'exact_duplicate_groups': [[r['repository_path'] for r in rows if r['sha256'] == digest]
                               for digest, count in hash_counts.items() if count > 1],
    'unreadable_dimensions': [r['repository_path'] for r in rows if r['width_px'] is None],
}
print(json.dumps(summary, indent=2))
