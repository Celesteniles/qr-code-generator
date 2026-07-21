// Schéma D1 (SQLite) — source de vérité de la plateforme. Voir docs/ARCHITECTURE.md §4.
// KV n'est qu'une vue de lecture compilée depuis ces tables (cf. compile.ts).

import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core'
import type { Rule } from '@link/shared'

const now = () => integer('created_at').notNull()

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).notNull().default('free'),
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
    userId: text('user_id').notNull().references(() => users.id),
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
  },
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

export type LinkRow = typeof links.$inferSelect
export type DomainRow = typeof domains.$inferSelect
