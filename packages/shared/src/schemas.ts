// Schémas de validation des règles. Utilisés à l'écriture (dashboard, API) pour
// garantir qu'aucune règle malformée n'entre dans D1/KV. Le Worker de lecture
// n'en dépend pas — il consomme les types de rules.ts et reste minimal.

import { z } from 'zod'

const httpUrl = z.string().url().refine((u) => /^https?:\/\//i.test(u), {
  message: 'URL http(s) requise',
})

export const staticRuleSchema = z.object({
  type: z.literal('static'),
  url: httpUrl,
})

export const appRuleSchema = z
  .object({
    type: z.literal('app'),
    ios: httpUrl.optional(),
    android: httpUrl.optional(),
    fallback: httpUrl,
  })

export const cardRuleSchema = z.object({
  type: z.literal('card'),
})

export const ruleSchema = z.discriminatedUnion('type', [
  staticRuleSchema,
  appRuleSchema,
  cardRuleSchema,
])

export const compiledLinkSchema = z.object({
  slug: z.string().min(1),
  rule: ruleSchema,
  active: z.boolean(),
  expiresAt: z.number().int().positive().optional(),
})
