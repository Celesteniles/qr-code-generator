// Valeurs d'une fiche contact (vCard 3.0). Une vCard est un format ligne à ligne :
// un retour chariot ou un saut de ligne dans une valeur ouvrirait une nouvelle
// propriété (injection : faux TEL, URL, PHOTO…). Toute valeur passe donc par l'une
// de ces deux fonctions avant d'être écrite.

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g

/**
 * Valeur texte (FN, N, ORG, TITLE…) : retours à la ligne (\r\n, \r, \n) écrits
 * « \n » comme le veut la norme, autres caractères de contrôle retirés, puis
 * \ , ; échappés.
 */
export function vcardText(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(CONTROL, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/**
 * Valeur brute (TEL, EMAIL, URL) : écrite telle quelle, sans échappement, donc
 * sans aucun caractère de contrôle (retirés) ni espace en bord.
 */
export function vcardRaw(v: string): string {
  return v.replace(CONTROL, '').trim()
}
