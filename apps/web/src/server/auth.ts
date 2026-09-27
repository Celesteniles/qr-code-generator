import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { authSchema, schema, ensureWorkspaceForUser, type Db } from '@link/db'
import { turnstileKeys } from './turnstile'
import { sendEmail } from './email'
import { resetPasswordEmail } from './email-templates/reset-password'

/** Durée de validité d'un lien « mot de passe oublié », en secondes. */
const RESET_TOKEN_TTL = 60 * 60

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
      // Mot de passe oublié : lien valable 1 h, à usage unique. Après la
      // réinitialisation, toutes les sessions sont fermées (autres appareils compris).
      resetPasswordTokenExpiresIn: RESET_TOKEN_TTL,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // Envoi en tâche de fond (waitUntil) : la réponse part aussi vite, que le
        // compte existe ou non, et un échec Brevo ne remonte jamais au formulaire.
        // Rien ne doit trahir l'existence d'une adresse.
        const mail = resetPasswordEmail({ name: user.name, url })
        const task = sendEmail({ to: user.email, name: user.name || undefined, ...mail }).catch((e) => {
          console.error('[auth] e-mail de réinitialisation non envoyé', e)
          // En développement seulement (pas de clé Brevo) : le lien dans la console.
          if (process.env.NODE_ENV !== 'production') console.info('[auth] lien de réinitialisation (dev) :', url)
        })
        getCloudflareContext().ctx.waitUntil(task)
      },
    },
    // Limitation des essais, par IP et par route. Par défaut Better Auth compte en
    // mémoire : sur Workers, chaque isolat a la sienne, la limite ne tiendrait pas.
    // Compteurs en D1 (table rate_limit, migration 0004). `enabled` explicite : le
    // défaut dépend de NODE_ENV.
    // Attention : au Congo, les opérateurs mobiles partagent souvent une même IP
    // publique entre beaucoup d'abonnés (CGNAT) ; si des clients légitimes se
    // retrouvent bloqués, relever `max` ici avant tout.
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/change-password': { window: 60, max: 5 },
        // Chaque demande envoie un e-mail : très serré, contre l'envoi en masse.
        '/request-password-reset': { window: 60, max: 3 },
        '/reset-password': { window: 60, max: 5 },
        // Lue à chaque affichage de page (useSession) : pas d'écriture D1 pour elle.
        '/get-session': false,
      },
    },
    advanced: {
      // IP posée par Cloudflare, non falsifiable par le client (x-forwarded-for,
      // le défaut, peut être complété par le client et ne serait pas retenu).
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    // Turnstile sur l'inscription, la connexion et la demande de réinitialisation
    // (qui envoie un e-mail), seulement si les clés sont posées
    // (cf. server/turnstile.ts) : sans elles, pas de plugin, rien n'est exigé. Le
    // jeton arrive dans l'en-tête x-captcha-response (cf. AuthPanel).
    plugins: turnstile
      ? [captcha({
          provider: 'cloudflare-turnstile',
          secretKey: turnstile.secretKey,
          endpoints: ['/sign-up/email', '/sign-in/email', '/request-password-reset'],
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
