import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { authSchema, schema, ensureWorkspaceForUser, type Db } from '@link/db'
import { turnstileKeys } from './turnstile'
import { googleKeys } from './google'
import { sendEmail } from './email'
import { verificationEmail } from './email-templates/verification'
import { resetPasswordEmail } from './email-templates/reset-password'
import { DISPOSABLE_EMAIL_CODE, DISPOSABLE_EMAIL_MESSAGE, isDisposableEmail } from '@link/shared/disposable-email'

/** Validité du lien de confirmation d'adresse. */
const VERIFICATION_HOURS = 24
/** Durée de validité d'un lien « mot de passe oublié », en secondes. */
const RESET_TOKEN_TTL = 60 * 60

// Adresses jetables (Yopmail, Mailinator…) refusées à l'inscription et au changement
// d'adresse, pour limiter les faux comptes. Liste : @link/shared/disposable-email.
const rejectDisposableEmail = createAuthMiddleware(async (ctx) => {
  const email = ctx.path === '/sign-up/email' ? ctx.body?.email
    : ctx.path === '/change-email' ? ctx.body?.newEmail
    : undefined
  if (typeof email === 'string' && isDisposableEmail(email)) {
    throw new APIError('BAD_REQUEST', { code: DISPOSABLE_EMAIL_CODE, message: DISPOSABLE_EMAIL_MESSAGE })
  }
})

function createAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB, { schema })
  const turnstile = turnstileKeys(env)
  const google = googleKeys(env)
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      // La connexion reste possible sans adresse vérifiée : l'utilisateur doit
      // pouvoir se reconnecter pour renvoyer le lien. C'est l'application qui
      // bloque ensuite l'accès à l'espace (cf. server/session.ts, /verifier-email).
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
    // Vérification de l'adresse : lien envoyé à l'inscription, valable 24 h, qui
    // connecte l'utilisateur à l'ouverture. L'envoi est attendu (borné par le
    // délai du module d'e-mail) ; à l'inscription, Better Auth rattrape et
    // journalise son échec : le compte est créé quand même, et le lien peut être
    // redemandé depuis /verifier-email (où l'erreur, elle, remonte à l'écran).
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: VERIFICATION_HOURS * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        const mail = verificationEmail({ name: user.name, url, validityHours: VERIFICATION_HOURS })
        await sendEmail({ to: user.email, name: user.name || undefined, ...mail })
      },
    },
    // Connexion avec Google, si les secrets sont posés (cf. server/google.ts).
    // Google garantit l'adresse (email_verified) : pas d'e-mail de confirmation.
    // Liaison à un compte existant de même adresse : réglage par défaut de Better
    // Auth, qui l'exige aussi vérifiée côté link.cg. Sinon, quelqu'un qui aurait
    // inscrit l'adresse d'autrui avec un mot de passe garderait l'accès au compte
    // une fois le vrai propriétaire passé par Google.
    socialProviders: google
      ? {
          google: {
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            // Toujours proposer le choix du compte (téléphones partagés).
            prompt: 'select_account',
          },
        }
      : {},
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
        '/sign-in/social': { window: 60, max: 10 },
        '/change-password': { window: 60, max: 5 },
        // Chaque appel envoie un e-mail : strict, pour ne pas servir de relais à spam.
        '/send-verification-email': { window: 60, max: 3 },
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
    hooks: { before: rejectDisposableEmail },
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
