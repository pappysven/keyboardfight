"""Prépare une planche de sprites à partir d'une image générée (grille 6 x 2).

Détourage sans liseré, débris retirés, palette resserrée, contour sombre d'1 px.
Usage :
  python3 scripts/process-sheet.py SOURCE SORTIE.png --bg grey|magenta|magenta-strict
         [--fringe] [--only-body] [--segment]
  --bg magenta-strict : fond magenta franc, pour un personnage dont l'armure est violette.
  --fringe            : rogne les pixels de bord teintés par le fond.
  --only-body         : ne garde que la silhouette principale (retire étincelles et débris).
  --segment           : découpe chaque pose d'après sa silhouette (au lieu d'une grille
                        régulière), utile quand une pose déborde de sa case.
Dépendance : Pillow. Les images sources ne sont pas dans le dépôt. Voir docs/design.md.
"""
import argparse
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

def bg_magenta_strict(c):
    # Magenta franc seulement : un violet d'armure (r ~ 135) n'est jamais touché.
    r, g, b = c
    return r > 180 and b > 180 and g < 0.5 * min(r, b)

def fringe_magenta_strict(c):
    r, g, b = c
    return r > 150 and b > 150 and r - g > 60 and b - g > 60

def runs(flags, min_gap):
    """Plages consécutives de True, fusionnées si séparées de moins de min_gap."""
    out = []
    for i, f in enumerate(flags):
        if not f: continue
        if out and i - out[-1][1] <= min_gap: out[-1][1] = i + 1
        else: out.append([i, i + 1])
    return out

def segment_boxes(im, is_bg, cols, rows):
    """Une boîte par pose : lignes séparées par une bande vide, poses par plages de colonnes."""
    W, H = im.size; px = im.load()
    fg = [[0 if is_bg(px[x, y]) else 1 for x in range(W)] for y in range(H)]
    row_runs = runs([any(r) for r in fg], 12)
    row_runs = [r for r in row_runs if r[1] - r[0] > 8]
    if len(row_runs) != rows:
        sys.exit(f'--segment : {len(row_runs)} lignes détectées, {rows} attendues')
    boxes = []
    for y0, y1 in row_runs:
        col_runs = runs([any(fg[y][x] for y in range(y0, y1)) for x in range(W)], 6)
        col_runs = [c for c in col_runs if c[1] - c[0] > 8]
        if len(col_runs) == cols:
            boxes += [(max(0, x0 - 2), y0, min(W, x1 + 2), y1) for x0, x1 in col_runs]
            continue
        # Poses qui se touchent : on coupe, près de chaque limite régulière, à la colonne la plus vide.
        left, right = col_runs[0][0], col_runs[-1][1]
        step = (right - left) / cols
        count = [sum(fg[y][x] for y in range(y0, y1)) for x in range(W)]
        cuts = [left]
        for k in range(1, cols):
            target = round(left + k * step)
            lo, hi = max(cuts[-1] + 20, target - 35), min(W - 1, target + 35)
            cuts.append(min(range(lo, hi + 1), key=lambda x: (count[x], abs(x - target))))
        cuts.append(right)
        boxes += [(cuts[i], y0, cuts[i + 1], y1) for i in range(cols)]
    return boxes

def fringe_magenta(c):
    # Pixel de bord mélangé au fond magenta : rouge et bleu nettement au-dessus du vert.
    r, g, b = c
    return r - g > 40 and b - g > 40

def peel(mask, px, w, h, is_fringe, rounds=4):
    """Rogne, depuis le fond, les pixels de bord teintés par la couleur de fond."""
    for _ in range(rounds):
        drop = []
        for y in range(h):
            for x in range(w):
                p = y * w + x
                if not mask[p] or not is_fringe(px[x, y]): continue
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if not (0 <= nx < w and 0 <= ny < h) or not mask[ny * w + nx]:
                        drop.append(p); break
        if not drop: break
        for p in drop: mask[p] = 0

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

def process(src, dst, is_bg, is_fringe=None, only_body=False, segment=False):
    im = Image.open(src).convert('RGB'); W, H = im.size
    cw, ch = W / COLS, H / ROWS
    if segment:
        boxes = segment_boxes(im, is_bg, COLS, ROWS)
    else:
        boxes = [(int(c*cw), int(r*ch), int((c+1)*cw), int((r+1)*ch)) for r in range(ROWS) for c in range(COLS)]
    cells = []
    for box in boxes:
        if True:
            cell = im.crop(box); w, h = cell.size; px = cell.load()
            mask = bytearray(0 if is_bg(px[x, y]) else 1 for y in range(h) for x in range(w))
            if is_fringe: peel(mask, px, w, h, is_fringe)
            comps = components(mask, w, h)
            big = max(len(k) for k in comps)
            for k in comps:
                touches = any(p % w in (0, w-1) or p // w in (0, h-1) for p in k)
                # only_body : on ne garde que la silhouette principale (ni étincelles, ni ombre).
                if len(k) < 6 or (touches and len(k) < 0.15 * big) or (only_body and len(k) < big):
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

BACKGROUNDS = {
    'grey': (bg_grey, None),
    'magenta': (bg_magenta, fringe_magenta),
    'magenta-strict': (bg_magenta_strict, fringe_magenta_strict),
}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Prépare une planche de sprites 12 cadres de 48 px.')
    ap.add_argument('source'); ap.add_argument('sortie')
    ap.add_argument('--bg', choices=BACKGROUNDS, required=True)
    ap.add_argument('--fringe', action='store_true'); ap.add_argument('--only-body', action='store_true')
    ap.add_argument('--segment', action='store_true')
    a = ap.parse_args()
    bg, fringe = BACKGROUNDS[a.bg]
    process(a.source, a.sortie, bg, fringe if a.fringe else None, a.only_body, a.segment)
