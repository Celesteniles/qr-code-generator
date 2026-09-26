import 'server-only'
import { cache } from 'react'
import { listLinks } from '@link/db'
import { getDb } from './data'

/**
 * Liens d'un espace, lus une seule fois par requête : la coquille (compteur de
 * l'offre) et la page les demandent toutes deux au premier affichage.
 */
export const getWorkspaceLinks = cache((workspaceId: string) => listLinks(getDb(), workspaceId))
