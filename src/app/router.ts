/**
 * Navigation minimale par hash (#/accueil, #/combat, ...).
 * Le hash marche tel quel sur GitHub Pages, sous le préfixe /keyboardfight/.
 */
export const ROUTES = ['accueil', 'combat', 'resultat', 'parent'] as const;
export type RouteName = (typeof ROUTES)[number];

export type Navigate = (route: RouteName) => void;

/** Un écran monte son DOM dans `root` et renvoie sa fonction de nettoyage (timers, écouteurs). */
export interface Screen {
  mount(root: HTMLElement, navigate: Navigate): () => void;
}

export function routeFromHash(hash: string): RouteName {
  const name = hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(name) ? (name as RouteName) : 'accueil';
}

export function startRouter(
  root: HTMLElement,
  screens: Record<RouteName, Screen>,
  win: Window = window,
): void {
  let cleanup: (() => void) | undefined;

  const render = (): void => {
    cleanup?.();
    cleanup = undefined;
    root.replaceChildren();
    const route = routeFromHash(win.location.hash);
    cleanup = screens[route].mount(root, navigate);
  };

  const navigate: Navigate = (route) => {
    const target = `#/${route}`;
    if (win.location.hash === target) {
      render();
    } else {
      win.location.hash = target; // déclenche hashchange -> render
    }
  };

  win.addEventListener('hashchange', render);
  render();
}
