// Adresses des liens courts.
//
// Un QR encode la même adresse que le lien partagé, suivie de la marque `?q` :
// le routeur (apps/router) s'en sert pour distinguer un scan de QR d'un clic. La
// marque est sans effet sur la redirection (le routeur ne lit que le chemin et
// ne transmet pas la requête à la destination). L'adresse AFFICHÉE, copiée ou
// partagée reste toujours sans marque.

export const SHORT_HOST = 'link.cg'

/** Adresse publique d'un lien court (affichage, copie, partage). */
export function shortLinkUrl(slug: string): string {
  return `https://${SHORT_HOST}/${slug}`
}

/** Adresse encodée dans le QR d'un lien court. */
export function qrLinkUrl(slug: string): string {
  return `${shortLinkUrl(slug)}?q`
}
