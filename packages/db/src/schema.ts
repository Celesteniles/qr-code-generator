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
