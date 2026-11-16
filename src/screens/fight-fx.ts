import { h } from '../app/dom';

/**
 * Arène de combat : décor, combattants, barres de vie et effets visuels.
 * Tout reste DANS l'arène (docs/pedagogie.md : aucune animation hors de la zone de combat).
 * Les effets sont purement décoratifs (aria-hidden) ; le texte utile passe par la ligne de statut.
 */
export type Side = 'hero' | 'enemy';
export type Move = 'enter' | 'lunge' | 'dash' | 'recoil' | 'hop' | 'fall';
export type Tone = 'gold' | 'danger' | 'info';

export interface Arena {
  readonly el: HTMLElement;
  mount(side: Side, sprite: HTMLElement, name: string): void;
  setHp(side: Side, ratio: number): void;
  move(side: Side, move: Move): void;
  struck(side: Side): void;
  spark(side: Side): void;
  damage(side: Side, text: string): void;
  banner(text: string, tone: Tone): void;
  shake(strong?: boolean): void;
  /** Zoom bref de la caméra sur les combattants (combo). */
  zoom(): void;
  destroy(): void;
}

const MOVES: readonly Move[] = ['enter', 'lunge', 'dash', 'recoil', 'hop', 'fall'];
const MOVE_MS: Record<Move, number> = { enter: 450, lunge: 240, dash: 420, recoil: 280, hop: 700, fall: 500 };

interface Bar {
  root: HTMLElement;
  name: HTMLElement;
  fill: HTMLElement;
  ghost: HTMLElement;
}

function createBar(side: Side): Bar {
  const name = h('span', { className: 'bar__name' }, side === 'hero' ? 'Héros' : 'Adversaire');
  const ghost = h('div', { className: 'bar__ghost' });
  const fill = h('div', { className: 'bar__fill' });
  const root = h(
    'div',
    { className: `bar bar--${side}`, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100' },
    name,
    h('div', { className: 'bar__track' }, ghost, fill),
  );
  return { root, name, fill, ghost };
}

export function createArena(backgroundUrl: string): Arena {
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number): void => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const bars: Record<Side, Bar> = { hero: createBar('hero'), enemy: createBar('enemy') };
  const fighters: Record<Side, HTMLElement> = {
    hero: h('div', { className: 'fighter fighter--hero' }, h('div', { className: 'fighter__shadow' })),
    enemy: h('div', { className: 'fighter fighter--enemy' }, h('div', { className: 'fighter__shadow' })),
  };
  const sprites: Partial<Record<Side, HTMLElement>> = {};
  const fx = h('div', { className: 'arena__fx', 'aria-hidden': 'true' });
  const bannerEl = h('div', { className: 'arena__banner', 'aria-hidden': 'true' });
  // La « caméra » porte le décor, les combattants et les effets : c'est elle qui zoome.
  // Les barres de vie et la bannière restent fixes.
  const background = h('div', { className: 'arena__bg' });
  background.style.backgroundImage = `url("${backgroundUrl}")`;
  const camera = h(
    'div',
    { className: 'arena__cam' },
    background,
    h('div', { className: 'arena__stage' }, fighters.hero, fighters.enemy),
    fx,
  );
  const el = h(
    'div',
    { className: 'arena' },
    camera,
    h('div', { className: 'arena__hud' }, bars.hero.root, h('span', { className: 'arena__vs', 'aria-hidden': 'true' }, 'VS'), bars.enemy.root),
    bannerEl,
  );

  /** (Re)joue une animation CSS portée par une classe. */
  const pulses = new Map<string, number>();
  let pulseIds = 0;
  const ids = new WeakMap<HTMLElement, number>();

  function pulse(target: HTMLElement, cls: string, ms: number): void {
    // Une relance annule le minuteur précédent : sinon il effacerait l'effet en cours.
    let id = ids.get(target);
    if (id === undefined) {
      id = ++pulseIds;
      ids.set(target, id);
    }
    const key = `${id}:${cls}`;
    const previous = pulses.get(key);
    if (previous !== undefined) {
      window.clearTimeout(previous);
      timers.delete(previous);
    }
    target.classList.remove(cls);
    void target.offsetWidth;
    target.classList.add(cls);
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      pulses.delete(key);
      target.classList.remove(cls);
    }, ms);
    timers.add(timer);
    pulses.set(key, timer);
  }

  function particle(className: string, text: string, ms: number): void {
    const node = h('span', { className }, text);
    fx.append(node);
    later(() => node.remove(), ms);
  }

  return {
    el,
    mount(side, sprite, name) {
      sprites[side] = sprite;
      fighters[side].append(sprite);
      bars[side].name.textContent = name;
      bars[side].root.setAttribute('aria-label', `Vie de ${name}`);
      pulse(fighters[side], 'move-enter', MOVE_MS.enter);
    },
    setHp(side, ratio) {
      const pct = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      bars[side].fill.style.width = pct;
      bars[side].ghost.style.width = pct;
      bars[side].root.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      bars[side].root.classList.toggle('bar--low', ratio <= 0.3);
    },
    move(side, move) {
      const target = fighters[side];
      for (const m of MOVES) target.classList.remove(`move-${m}`);
      pulse(target, `move-${move}`, MOVE_MS[move]);
    },
    struck(side) {
      const sprite = sprites[side];
      if (sprite) pulse(sprite, 'struck', 110);
    },
    spark(side) {
      particle(`spark spark--${side}`, '', 220);
    },
    damage(side, text) {
      particle(`dmg dmg--${side}`, text, 700);
    },
    banner(text, tone) {
      bannerEl.textContent = text;
      bannerEl.dataset.tone = tone;
      pulse(bannerEl, 'show', 1100);
    },
    shake(strong = false) {
      pulse(el, strong ? 'shake-strong' : 'shake-soft', 260);
    },
    zoom() {
      pulse(camera, 'zoom', 640);
    },
    destroy() {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    },
  };
}
