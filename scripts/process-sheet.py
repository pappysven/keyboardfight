"""Prépare une planche de sprites à partir d'une image générée (grille 6 x 2).

Détourage sans liseré, débris retirés, palette resserrée, contour sombre d'1 px.
Usage : python3 scripts/process-sheet.py <dossier des images sources>
Dépendance : Pillow. Les sources ne sont pas dans le dépôt. Voir docs/design.md.
"""
import sys
from PIL import Image
FRAME, COLS, ROWS = 48, 6, 2
OUTLINE = (20, 18, 43, 255)

def bg_grey(c):
    r, g, b = c
    return max(c) - min(c) <= 8 and 85 <= r <= 170
def bg_magenta(c):
    r, g, b = c
    return r > 110 and b > 110 and g < 0.5 * min(r, b)

def components(mask, w, h):
    seen = bytearray(w * h); out = []
    for start in range(w * h):
        if not mask[start] or seen[start]: continue
        stack = [start]; seen[start] = 1; comp = []
        while stack:
            p = stack.pop(); comp.append(p)
            x, y = p % w, p // w
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1),(x+1,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    q = ny * w + nx
                    if mask[q] and not seen[q]:
                        seen[q] = 1; stack.append(q)
        out.append(comp)
    return out

def process(src, dst, is_bg):
    im = Image.open(src).convert('RGB'); W, H = im.size
    cw, ch = W / COLS, H / ROWS
    cells = []
    for r in range(ROWS):
        for c in range(COLS):
            box = (int(c*cw), int(r*ch), int((c+1)*cw), int((r+1)*ch))
            cell = im.crop(box); w, h = cell.size; px = cell.load()
            mask = bytearray(0 if is_bg(px[x, y]) else 1 for y in range(h) for x in range(w))
            comps = components(mask, w, h)
            big = max(len(k) for k in comps)
            for k in comps:
                touches = any(p % w in (0, w-1) or p // w in (0, h-1) for p in k)
                if len(k) < 6 or (touches and len(k) < 0.15 * big):
                    for p in k: mask[p] = 0
            alpha = Image.frombytes('L', (w, h), bytes(v * 255 for v in mask))
            rgba = cell.convert('RGBA'); rgba.putalpha(alpha)
            cells.append((rgba, alpha.getbbox()))
    max_h = max(b[3]-b[1] for _, b in cells); max_w = max(b[2]-b[0] for _, b in cells)
    scale = min((FRAME-4)/max_h, (FRAME-4)/max_w)
    sheet = Image.new('RGBA', (FRAME*len(cells), FRAME), (0,0,0,0))
    for i, (rgba, (x0,y0,x1,y1)) in enumerate(cells):
        body = rgba.crop((x0,y0,x1,y1))
        w, h = max(1, round((x1-x0)*scale)), max(1, round((y1-y0)*scale))
        body = body.convert('RGBa').resize((w, h), Image.BOX).convert('RGBA')   # prémultiplié : pas de liseré
        a = body.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
        body.putalpha(a)
        sheet.paste(body, (i*FRAME + (FRAME-w)//2, FRAME-h-2), body)
    # Palette resserrée, sans tramage.
    alpha = sheet.getchannel('A')
    q = sheet.convert('RGB').quantize(colors=28, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    q.putalpha(alpha); sheet = q
    # Contour sombre d'1 px autour de la silhouette, cadre par cadre.
    px = sheet.load(); ap = alpha.load(); todo = []
    for y in range(FRAME):
        for x in range(sheet.size[0]):
            if ap[x, y]: continue
            fx = x // FRAME * FRAME
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if fx <= nx < fx + FRAME and 0 <= ny < FRAME and ap[nx, ny]:
                    todo.append((x, y)); break
    for x, y in todo: px[x, y] = OUTLINE
    sheet.save(dst)
    prev = Image.new('RGBA', sheet.size, (70, 80, 110, 255)); prev.alpha_composite(sheet)
    prev.resize((sheet.size[0]*4, sheet.size[1]*4), Image.NEAREST).save(dst.replace('.png', '_preview.png'))
    print('ok', dst, 'scale', round(scale, 3))

process(sys.argv[1] + '/1.webp', 'hero2.png', bg_grey)
process(sys.argv[1] + '/2.png', 'enemy2.png', bg_magenta)
