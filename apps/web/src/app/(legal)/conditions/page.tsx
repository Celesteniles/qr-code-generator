import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS } from '@link/shared'
import { ISSUER } from '@/server/billing-config'

// Conditions d'utilisation. Les usages interdits reprennent les protections en
// place (Safe Browsing, limites de création, e-mails jetables refusés).

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation · link.cg',
  description: 'Les règles d\'utilisation de link.cg : compte, liens courts, QR codes, cartes de visite, offres et paiements.',
}

const UPDATED = '28 septembre 2026'

export default function ConditionsPage() {
  const contact = ISSUER.email
  return (
    <article>
      <h1>Conditions d&apos;utilisation</h1>
      <p className="updated">Dernière mise à jour : {UPDATED}</p>

      <h2>1. Le service</h2>
      <p>
        link.cg permet de créer des liens courts (link.cg/…), des QR codes et des cartes de visite en ligne, et de
        suivre leurs visites. Le service est édité par <strong>{ISSUER.name}</strong>, en République du Congo
        {ISSUER.rccm ? ` (RCCM ${ISSUER.rccm})` : ''}. En utilisant link.cg, vous acceptez ces conditions.
      </p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Les QR codes fixes se créent sans compte. Les liens courts, les QR modifiables et les cartes demandent un compte.</li>
        <li>Vous devez fournir une adresse e-mail valide, qui vous appartient, et la confirmer. Les adresses e-mail temporaires ne sont pas acceptées.</li>
        <li>Vous êtes responsable de la confidentialité de votre mot de passe et de ce qui est fait depuis votre compte.</li>
        <li>Vous devez avoir au moins 16 ans, ou agir pour le compte d&apos;une entreprise ou d&apos;une organisation.</li>
      </ul>

      <h2>3. Ce que vous publiez</h2>
      <p>
        Vous restez propriétaire de vos contenus (liens, cartes, logos) et responsable de ce vers quoi vos liens
        mènent. Vous nous autorisez seulement à les héberger et à les afficher pour faire fonctionner le service.
        Vous garantissez avoir le droit d&apos;utiliser les logos et informations que vous publiez.
      </p>

      <h2>4. Usages interdits</h2>
      <p>Il est interdit d&apos;utiliser link.cg pour :</p>
      <ul>
        <li>du phishing, de l&apos;usurpation d&apos;identité ou de marque (faux sites de banque, de mobile money, d&apos;administration…) ;</li>
        <li>diffuser des logiciels malveillants ou des arnaques ;</li>
        <li>du spam ou l&apos;envoi massif de messages non sollicités ;</li>
        <li>des contenus illégaux en République du Congo, haineux, ou portant atteinte aux droits d&apos;autrui ;</li>
        <li>créer des comptes en masse ou automatiser la création de liens pour contourner les limites.</li>
      </ul>
      <p>
        Les adresses de destination sont vérifiées automatiquement auprès de services de sécurité. Nous pouvons
        désactiver sans préavis un lien, une carte ou un compte qui enfreint ces règles, et signaler les abus aux
        autorités compétentes. Pour signaler un lien : <a href={`mailto:${contact}`}>{contact}</a>.
      </p>

      <h2>5. Offres et paiements</h2>
      <ul>
        <li>L&apos;offre Gratuite comprend {PLANS.free.maxLinks} liens courts. Les limites de chaque offre sont décrites sur la page <Link href="/offres">Offres</Link>.</li>
        <li>Les offres payantes se règlent par mobile money (Airtel Money, MTN MoMo), pour la période indiquée. Un reçu est émis pour chaque paiement.</li>
        <li>Une période payée n&apos;est pas remboursable, sauf erreur de notre part ou disposition légale contraire.</li>
        <li>Sans renouvellement, le compte repasse à l&apos;offre Gratuite et ses limites s&apos;appliquent de nouveau.</li>
      </ul>

      <h2>6. Disponibilité</h2>
      <p>
        Nous faisons de notre mieux pour que vos liens et QR codes fonctionnent en permanence, mais le service est
        fourni « en l&apos;état », sans garantie de disponibilité continue. Nous pouvons le faire évoluer, et vous
        préviendrons avant tout changement important qui vous concerne.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        {ISSUER.name} n&apos;est pas responsable des contenus vers lesquels mènent les liens de ses utilisateurs, ni
        des dommages indirects liés à l&apos;utilisation du service (perte de clientèle, d&apos;image ou de données),
        dans les limites permises par la loi.
      </p>

      <h2>8. Fin d&apos;utilisation</h2>
      <p>
        Vous pouvez arrêter d&apos;utiliser link.cg et demander la suppression de votre compte à tout moment en nous
        écrivant. Vos liens cessent alors de fonctionner : pensez-y avant de supprimer un lien imprimé sur des
        supports.
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        L&apos;utilisation de vos données est décrite dans notre <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces conditions sont régies par le droit de la République du Congo. En cas de litige, nous chercherons
        d&apos;abord une solution amiable ; à défaut, les tribunaux de Brazzaville seront compétents.
      </p>

      <h2>11. Contact</h2>
      <p>{ISSUER.name} — <a href={`mailto:${contact}`}>{contact}</a></p>
    </article>
  )
}
