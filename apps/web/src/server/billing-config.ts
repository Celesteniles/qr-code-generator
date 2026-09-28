// Mentions de l'émetteur imprimées sur les reçus link.cg.
//
// Coordonnées fournies par NS Creative le 2026-09-28 (reprises aussi dans les
// pages légales). Reste à compléter : le NIU (numéro d'identification unique).
// Ne saisir que des informations officielles et vérifiées. Tant qu'un champ est
// vide, il n'apparaît pas sur le reçu.

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
  address: '15, rue Konda, Ouenzé, Brazzaville, République du Congo',
  niu: '', // à compléter
  rccm: 'CG-BZV-01-2026-A10-01846',
  phone: '+242 06 723 0202',
}

/** Nom du service facturé, repris dans la désignation des reçus. */
export const SERVICE_NAME = 'link.cg'
