/**
 * Destination après connexion : uniquement un chemin interne (« /carte »).
 * Refuse les URL absolues, « //hote » (URL sans protocole) et « /\hote »,
 * que certains navigateurs traitent comme un autre site.
 */
export function safeNext(raw: string | string[] | undefined | null): string {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return '/'
  if (/[\u0000-\u001f]/.test(v)) return '/'
  return v
}
