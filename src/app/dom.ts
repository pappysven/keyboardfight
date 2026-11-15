/**
 * Petite aide pour construire le DOM sans framework.
 * Les textes passent toujours par textContent : jamais de innerHTML avec des données.
 */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      // onClick -> 'click'
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      node.className = String(value);
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}
