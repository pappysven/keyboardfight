"""Crée des variantes recolorées de l'ennemi et du décor (Pillow).

Usage : python3 scripts/make-variants.py   (depuis la racine du dépôt)
Les variantes sont des fichiers dérivés : on peut les régénérer à tout moment.
"""
import colorsys, json, os
from PIL import Image, ImageEnhance

def hue_shift(src, dst, degrees, sat=1.0, val=1.0):
    im = Image.open(src).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # Le contour presque noir reste tel quel.
            if v < 0.2: continue
            r2, g2, b2 = colorsys.hsv_to_rgb((h + degrees / 360) % 1, min(1, s * sat), min(1, v * val))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    os.makedirs(os.path.dirname(dst), exist_ok=True); im.save(dst)

def enemy(variant_id, name, degrees, sat=1.0, val=1.0):
    base = 'public/sprites/ennemi'
    out = f'public/sprites/{variant_id}'
    hue_shift(f'{base}/sheet.png', f'{out}/sheet.png', degrees, sat, val)
    manifest = json.load(open(f'{base}/manifest.json', encoding='utf-8'))
    manifest['id'] = variant_id; manifest['name'] = name
    open(f'{out}/manifest.json', 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

def grade(dst, tint, brightness=1.0, saturation=1.0):
    im = Image.open('public/decor/arene.png').convert('RGB')
    im = ImageEnhance.Color(im).enhance(saturation)
    r, g, b = im.split()
    im = Image.merge('RGB', tuple(ch.point(lambda v, k=k: min(255, round(v * k))) for ch, k in zip((r, g, b), tint)))
    ImageEnhance.Brightness(im).enhance(brightness).save(dst)

enemy('ennemi-bronze', 'Gardien de bronze', 115, sat=1.1, val=1.15)
enemy('ennemi-givre', 'Gardien de givre', -55, sat=0.9, val=1.35)
grade('public/decor/arene-aube.png', (1.35, 1.0, 0.8), brightness=1.25)
grade('public/decor/arene-brume.png', (0.85, 1.1, 1.0), brightness=1.3, saturation=0.45)
print('ok')
