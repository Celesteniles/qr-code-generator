import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExclamationCircleIcon, UsersIcon } from '@heroicons/react/24/outline'
import { getInvitationByToken, normalizeEmail } from '@link/db'
import { Logo } from '@/components/kit/Logo'
import { MadeBy } from '@/components/kit/MadeBy'
import { AcceptInvitation, SwitchAccountButton } from '@/components/equipe/AcceptInvitation'
import { ROLE_LABEL } from '@/components/equipe/model'
import { formatDate } from '@/components/facturation/format'
import { getSessionState } from '@/server/session'
import { getDb } from '@/server/data'

// Lien reçu par e-mail : « X vous invite à rejoindre l'espace Y ». Hors coquille,
// comme /verifier-email. Le jeton est dans l'URL : pas de référent transmis, pas
// d'indexation. L'acceptation est un bouton (POST), jamais le simple affichage,
// pour que les aperçus de liens des messageries ne consomment pas l'invitation.
// Non connecté : connexion ou inscription, avec retour ici (`next`, conservé
// aussi par la confirmation d'adresse).

export const metadata: Metadata = {
  title: 'Invitation · link.cg',
  robots: { index: false },
  referrer: 'no-referrer',
}

export const dynamic = 'force-dynamic'

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="h1">{title}</h1>
      <p role="alert" className="mt-5 flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
        <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <Link href="/" className="btn btn-soft btn-lg mt-6 w-full">Aller à l’accueil</Link>
    </section>
  )
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const self = `/invitation/${encodeURIComponent(token)}`
  const [invitation, state] = await Promise.all([getInvitationByToken(getDb(), token), getSessionState()])

  // Adresse pas encore confirmée : on y passe d'abord, puis retour ici.
  if (state.kind === 'unverified') redirect(`/verifier-email?next=${encodeURIComponent(self)}`)

  let body: React.ReactNode
  if (!invitation) {
    body = (
      <Problem title="Invitation introuvable">
        Ce lien ne correspond à aucune invitation. Elle a peut-être été annulée ou remplacée par une plus récente : vérifiez le dernier e-mail reçu.
      </Problem>
    )
  } else if (invitation.status === 'accepted') {
    body = (
      <Problem title="Invitation déjà utilisée">
        Cette invitation a déjà servi. Connectez-vous : l’espace « {invitation.workspaceName} » apparaît dans Mon compte, onglet Équipe.
      </Problem>
    )
  } else if (invitation.status === 'expired') {
    body = (
      <Problem title="Invitation expirée">
        Cette invitation n’est plus valable depuis le {formatDate(invitation.expiresAt)}. Demandez à {invitation.inviterName ?? 'la personne qui vous a invité'} de vous en envoyer une nouvelle.
      </Problem>
    )
  } else {
    const intro = (
      <>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand [&_svg]:h-6 [&_svg]:w-6" aria-hidden="true"><UsersIcon /></span>
        <h1 className="h1 mt-5">Rejoignez « {invitation.workspaceName} »</h1>
        <p className="lead mt-2">
          {invitation.inviterName ? <><strong className="text-ink">{invitation.inviterName}</strong> vous invite</> : 'Vous êtes invité'} à
          travailler dans cet espace link.cg, en tant que {ROLE_LABEL[invitation.role].toLowerCase()}.
        </p>
      </>
    )
    if (state.kind === 'guest') {
      const next = encodeURIComponent(self)
      body = (
        <section>
          {intro}
          <p className="mt-5 text-sm text-muted">
            L’invitation est réservée à <strong className="break-all text-ink">{invitation.email}</strong>. Connectez-vous avec cette adresse, ou créez votre compte gratuit.
          </p>
          <Link href={`/connexion?mode=inscription&next=${next}`} className="btn btn-cta btn-lg mt-6 w-full">Créer mon compte</Link>
          <Link href={`/connexion?next=${next}`} className="btn btn-soft btn-lg mt-2 w-full">J’ai déjà un compte</Link>
        </section>
      )
    } else if (normalizeEmail(state.ctx.email) !== normalizeEmail(invitation.email)) {
      body = (
        <section>
          {intro}
          <p role="alert" className="mt-5 flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
            <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>
              Cette invitation est réservée à <strong className="break-all">{invitation.email}</strong>, mais vous êtes connecté avec{' '}
              <strong className="break-all">{state.ctx.email}</strong>. Changez de compte pour l’accepter.
            </span>
          </p>
          <SwitchAccountButton next={self} />
        </section>
      )
    } else {
      body = (
        <section>
          {intro}
          <AcceptInvitation token={token} workspaceName={invitation.workspaceName} />
          <p className="mt-4 text-center text-[13px] text-muted">
            Votre propre espace reste disponible : vous passerez de l’un à l’autre depuis Mon compte, onglet Équipe.
          </p>
        </section>
      )
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-5">
      <div className="w-full max-w-[440px]">
        <div className="mb-8"><Logo /></div>
        {body}
        <MadeBy className="mt-8" />
      </div>
    </main>
  )
}
