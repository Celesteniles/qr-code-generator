import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { authSchema, schema, ensureWorkspaceForUser, type Db } from '@link/db'
import { turnstileKeys } from './turnstile'

function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB, { schema })
  const turnstile = turnstileKeys(env)
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      // Pas encore de service d'e-mail : vérification désactivée pour l'instant.
      requireEmailVerification: false,
      // Verrouillage optionnel de l'inscription (var DISABLE_SIGNUP=true).
      // String() élargit le type littéral figé par `wrangler types`.
      disableSignUp: String(env.DISABLE_SIGNUP) === 'true',
    },
    // Turnstile sur l'inscription et la connexion, seulement si les clés sont posées
    // (cf. server/turnstile.ts) : sans elles, pas de plugin, rien n'est exigé. Le
    // jeton arrive dans l'en-tête x-captcha-response (cf. AuthPanel).
    plugins: turnstile
      ? [captcha({
          provider: 'cloudflare-turnstile',
          secretKey: turnstile.secretKey,
          endpoints: ['/sign-up/email', '/sign-in/email'],
        })]
      : [],
    databaseHooks: {
      user: {
        create: {
          // À l'inscription, chaque utilisateur reçoit son espace de travail.
          after: async (user) => {
            await ensureWorkspaceForUser(db as unknown as Db, user.id, user.name || user.email)
          },
        },
      },
    },
  })
}

// Better Auth doit être instancié PAR REQUÊTE : sur Workers, les bindings (D1, secrets)
// vivent dans le contexte de requête, pas au niveau module. On memoïse par binding pour
// éviter de reconstruire dans une même requête.
let cached: { db: D1Database; auth: ReturnType<typeof createAuth> } | null = null

export function getAuth(): ReturnType<typeof createAuth> {
  const { env } = getCloudflareContext()
  if (cached && cached.db === env.DB) return cached.auth
  const auth = createAuth(env)
  cached = { db: env.DB, auth }
  return auth
}
