import { h } from '../app/dom';
import { type LoadedManifest, type PoseName, sheetUrl } from './manifest';

/** Affichage x3 : chaque pixel du sprite devient un carré de 3 px (voir docs/design.md). */
export const SPRITE_SCALE = 3;

export interface SpriteView {
  readonly el: HTMLElement;
  setPose(pose: PoseName): void;
  destroy(): void;
}

interface SheetSize {
  w: number;
  h: number;
}

const sheetSizes = new Map<string, Promise<SheetSize>>();

/** Dimensions naturelles d'une planche, mises en cache. */
function loadSheetSize(src: string): Promise<SheetSize> {
  let pending = sheetSizes.get(src);
  if (!pending) {
    pending = new Promise<SheetSize>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error(`planche introuvable : ${src}`));
      img.src = src;
    });
    sheetSizes.set(src, pending);
  }
  return pending;
}

/**
 * Vue d'un sprite : une div dont le fond affiche le cadre courant de la planche.
 * Les pixels restent nets grâce à image-rendering: pixelated (CSS).
 */
export function createSpriteView(
  loaded: LoadedManifest,
  initialPose: PoseName,
  options: { flip?: boolean } = {},
): SpriteView {
  const el = h('div', {
    className: options.flip ? 'sprite sprite--flip' : 'sprite',
    role: 'img',
    'aria-label': loaded.manifest.name,
  });

  let pose: PoseName = initialPose;
  let frameIndex = 0;
  let timer: number | undefined;
  let destroyed = false;

  function paint(): void {
    const def = loaded.manifest.poses[pose];
    const frame = def.frames[frameIndex];
    if (!frame) return;
    const src = sheetUrl(loaded, pose);
    const currentPose = pose;
    void loadSheetSize(src).then((size) => {
      if (destroyed || currentPose !== pose) return;
      el.style.width = `${frame.w * SPRITE_SCALE}px`;
      el.style.height = `${frame.h * SPRITE_SCALE}px`;
      el.style.backgroundImage = `url("${src}")`;
      el.style.backgroundSize = `${size.w * SPRITE_SCALE}px ${size.h * SPRITE_SCALE}px`;
      el.style.backgroundPosition = `${-frame.x * SPRITE_SCALE}px ${-frame.y * SPRITE_SCALE}px`;
    }).catch(() => {
      el.classList.add('sprite--missing');
    });
  }

  function restartTimer(): void {
    window.clearInterval(timer);
    timer = undefined;
    const def = loaded.manifest.poses[pose];
    if (def.frameCount > 1) {
      timer = window.setInterval(() => {
        frameIndex = (frameIndex + 1) % def.frameCount;
        paint();
      }, def.frameDuration);
    }
  }

  function setPose(next: PoseName): void {
    pose = next;
    frameIndex = 0;
    paint();
    restartTimer();
  }

  setPose(initialPose);

  return {
    el,
    setPose,
    destroy() {
      destroyed = true;
      window.clearInterval(timer);
    },
  };
}
