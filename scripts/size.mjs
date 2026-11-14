// What a phone downloads before the game can start: the entry script, the scripts it preloads
// and the stylesheets, as linked from the built index.html. Lazy chunks (the 3D view) don't count.

/** Asset paths (relative to dist/) that index.html loads up front. */
export function firstLoadFiles(html, base) {
  const files = new Set()
  const tags = html.match(/<(script|link)\b[^>]*>/g) ?? []
  for (const tag of tags) {
    const isScript = tag.startsWith('<script') && /\btype="module"/.test(tag)
    const isPreload = /\brel="(modulepreload|stylesheet)"/.test(tag)
    if (!isScript && !isPreload) continue
    const url = tag.match(/\b(?:src|href)="([^"]+)"/)?.[1]
    if (!url || /^(https?:)?\/\//.test(url)) continue
    files.add(url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, ''))
  }
  return [...files]
}
