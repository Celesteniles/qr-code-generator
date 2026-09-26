// Mentions de l'émetteur imprimées sur les reçus link.cg.
//
// À COMPLÉTER par NS Creative avant la mise en service des paiements :
// adresse, NIU (numéro d'identification unique), RCCM et téléphone. Ne saisir
// que des informations officielles et vérifiées. Tant qu'un champ est vide, il
// n'apparaît pas sur le reçu.

export interface Issuer {
  /** Raison sociale. */
  name: string
  website: string
  email: string
  /** Adresse postale complète — à compléter. */
  address: string
  /** Numéro d'identification unique (fiscal) — à compléter. */
  niu: string
  /** Registre du commerce et du crédit mobilier — à compléter. */
  rccm: string
  /** Téléphone de contact — à compléter. */
  phone: string
}

export const ISSUER: Issuer = {
  name: 'NS Creative',
  website: 'nscreative.cg',
  email: 'contact@nscreative.cg',
  address: '', // à compléter
  niu: '', // à compléter
  rccm: '', // à compléter
  phone: '', // à compléter
}

/** Nom du service facturé, repris dans la désignation des reçus. */
export const SERVICE_NAME = 'link.cg'
