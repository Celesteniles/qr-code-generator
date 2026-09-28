// Schéma D1 (SQLite) — source de vérité de la plateforme. Voir docs/ARCHITECTURE.md §4.
// KV n'est qu'une vue de lecture compilée depuis ces tables (cf. compile.ts).

import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core'
import type { Rule } from '@link/shared'

const now = () => integer('created_at').notNull()

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan', { enum: ['free', 'pro', 'business', 'enterprise'] }).notNull().default('free'),
  createdAt: now(),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: now(),
})

export const memberships = sqliteTable(
  'memberships',
  {
    // userId référence l'identité Better Auth (table `user`), pas la table `users`
    // applicative. Pas de FK : l'intégrité entre auth et domaine se gère en code
    // (D1 applique les FK, une contrainte cross-frontière casserait la création).
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  },
  (t) => [unique().on(t.userId, t.workspaceId)],
)

export const domains = sqliteTable(
  'domains',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    hostname: text('hostname').notNull().unique(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    // Domaine personnalisé (Cloudflare for SaaS). Null pour les domaines de la
    // plateforme (link.cg). sslStatus = statut du certificat renvoyé par Cloudflare.
    cfHostnameId: text('cf_hostname_id'),
    sslStatus: text('ssl_status'),
    createdAt: integer('created_at'),
  },
)

// Invitation d'une personne dans un espace. Le jeton en clair ne part que dans
// l'e-mail ; seul son hachage SHA-256 est stocké.
export const invitations = sqliteTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    email: text('email').notNull(),
    role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: text('invited_by').notNull(),
    createdAt: now(),
    expiresAt: integer('expires_at').notNull(),
    acceptedAt: integer('accepted_at'),
  },
  (t) => [index('invitations_workspace').on(t.workspaceId)],
)

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    domainId: text('domain_id').notNull().references(() => domains.id),
    slug: text('slug').notNull(),
    kind: text('kind', { enum: ['static', 'app', 'card'] }).notNull(),
    // Règle sérialisée en JSON, typée Rule à la lecture (cf. compile.ts).
    rule: text('rule', { mode: 'json' }).notNull().$type<Rule>(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: integer('expires_at'),
    createdAt: now(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    unique('links_domain_slug').on(t.domainId, t.slug),
    index('links_workspace').on(t.workspaceId),
  ],
)

export const qrDesigns = sqliteTable('qr_designs', {
  id: text('id').primaryKey(),
  linkId: text('link_id').notNull().references(() => links.id),
  config: text('config', { mode: 'json' }).notNull(),
})

export const cardProfiles = sqliteTable('card_profiles', {
  id: text('id').primaryKey(),
  linkId: text('link_id').notNull().references(() => links.id),
  fullName: text('full_name').notNull(),
  title: text('title'),
  org: text('org'),
  phone: text('phone'),
  email: text('email'),
  socials: text('socials', { mode: 'json' }),
  avatarKey: text('avatar_key'),
  theme: text('theme'),
})

export const linkReviews = sqliteTable('link_reviews', {
  linkId: text('link_id').primaryKey().references(() => links.id),
  status: text('status', { enum: ['pending', 'clean', 'flagged'] }).notNull().default('pending'),
  checkedAt: integer('checked_at'),
  provider: text('provider'),
})

// Tentatives de paiement en ligne (pawaPay). id = depositId envoyé à pawaPay.
// Le reçu (table payments) n'est créé qu'une fois le dépôt COMPLETED, pour que
// les numéros de reçu restent continus malgré les paiements abandonnés.
export const checkouts = sqliteTable(
  'checkouts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    /** Utilisateur (Better Auth) qui a lancé le paiement. */
    userId: text('user_id').notNull(),
    plan: text('plan', { enum: ['pro', 'business'] }).notNull(),
    cycle: text('cycle', { enum: ['month', 'year'] }).notNull(),
    /** Montant attendu en FCFA, figé au lancement. */
    amount: integer('amount').notNull(),
    /**
     * review : pawaPay a encaissé, mais le rapprochement a échoué (anomalie de
     * paiement, cf. payment_anomalies) ; l'équipe NS Creative tranche à la main.
     */
    status: text('status', { enum: ['pending', 'completed', 'failed', 'review'] }).notNull().default('pending'),
    failureCode: text('failure_code'),
    /** Paiement (reçu) créé à la confirmation. */
    paymentId: text('payment_id'),
    /**
     * API pawaPay qui a créé le dépôt (« sandbox » ou « production »). La bêta et
     * la production partagent la base mais pas l'API : chaque Worker ne relit que
     * ses propres tentatives. Null : tentative antérieure à cette colonne.
     */
    pawapayEnv: text('pawapay_env', { enum: ['sandbox', 'production'] }),
    createdAt: now(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('checkouts_workspace').on(t.workspaceId),
    index('checkouts_status_created').on(t.status, t.createdAt),
  ],
)

// Anomalies de paiement : pawaPay a encaissé (COMPLETED) mais l'offre n'a pas pu
// être donnée (montant ou devise inattendus, opérateur inconnu, reçu non créé).
// Une seule par tentative, quel que soit le nombre de relectures. Voir
// anomalies.ts et docs/PAIEMENTS.md (procédure de résolution).
export const paymentAnomalies = sqliteTable('payment_anomalies', {
  id: text('id').primaryKey(),
  checkoutId: text('checkout_id').notNull().unique().references(() => checkouts.id),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  kind: text('kind', { enum: ['amount_mismatch', 'unknown_provider', 'receipt_failed'] }).notNull(),
  /** Explication lisible (montant reçu / attendu, code d'erreur…). */
  detail: text('detail').notNull(),
  /** Dépôt tel que relu chez pawaPay (montant, devise, opérateur, numéro, transaction). */
  deposit: text('deposit', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  status: text('status', { enum: ['open', 'resolved'] }).notNull().default('open'),
  /** granted : offre accordée (reçu créé) ; refunded : remboursé ; dismissed : rien d'encaissé. */
  resolution: text('resolution', { enum: ['granted', 'refunded', 'dismissed'] }),
  /** Qui a tranché (adresse e-mail) et pourquoi. */
  resolvedBy: text('resolved_by'),
  resolutionNote: text('resolution_note'),
  resolvedAt: integer('resolved_at'),
  createdAt: now(),
})

// Journal des e-mails automatiques (rappels d'échéance, alertes d'anomalie).
// La clé identifie UN envoi à UN destinataire (ex. rappel:<paiement>:j7:<user>) :
// elle est réservée AVANT l'envoi, si bien qu'un e-mail n'est jamais envoyé deux
// fois, même si la tâche tourne en double ou s'interrompt au milieu (cf. notifications.ts).
export const notifications = sqliteTable('notifications', {
  key: text('key').primaryKey(),
  /** sending : réservé (envoi en cours ou interrompu) ; sent : parti ; failed : refusé, à retenter. */
  status: text('status', { enum: ['sending', 'sent', 'failed'] }).notNull(),
  attempts: integer('attempts').notNull().default(1),
  createdAt: now(),
  updatedAt: integer('updated_at').notNull(),
})

// Paiements d'abonnement (mobile money). Un paiement = un reçu numéroté
// LCG-AAAA-NNNNN. Montants en FCFA (XAF), entiers. Voir payments.ts.
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
    receiptNumber: text('receipt_number').notNull().unique(),
    plan: text('plan', { enum: ['free', 'pro', 'business', 'enterprise'] }).notNull(),
    periodStart: integer('period_start').notNull(),
    periodEnd: integer('period_end').notNull(),
    /** Montant en FCFA, entier (le franc CFA n'a pas de subdivision en usage). */
    amount: integer('amount').notNull(),
    currency: text('currency', { enum: ['XAF'] }).notNull().default('XAF'),
    method: text('method', { enum: ['airtel_money', 'mtn_momo', 'manual'] }).notNull(),
    /** Référence de transaction de l'opérateur (clé d'idempotence avec `method`). */
    providerReference: text('provider_reference'),
    /** Numéro du payeur, stocké normalisé ; toujours masqué à l'affichage. */
    payerPhone: text('payer_phone'),
    status: text('status', { enum: ['pending', 'paid', 'failed', 'refunded'] }).notNull().default('pending'),
    paidAt: integer('paid_at'),
    createdAt: now(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [
    index('payments_workspace_created').on(t.workspaceId, t.createdAt),
    // Une même transaction opérateur ne peut produire qu'un paiement. SQLite
    // autorise plusieurs NULL : les paiements sans référence ne sont pas contraints.
    unique('payments_method_reference').on(t.method, t.providerReference),
  ],
)

export type LinkRow = typeof links.$inferSelect
export type PaymentRow = typeof payments.$inferSelect
export type DomainRow = typeof domains.$inferSelect
export type InvitationRow = typeof invitations.$inferSelect
export type CheckoutRow = typeof checkouts.$inferSelect
export type PaymentAnomalyRow = typeof paymentAnomalies.$inferSelect
