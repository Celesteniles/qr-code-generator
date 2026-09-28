import type { Metadata } from 'next'
import Link from 'next/link'
import { ISSUER } from '@/server/billing-config'

// Politique de confidentialité. Décrit ce que l'application fait réellement :
// à tenir à jour à chaque nouvelle donnée collectée ou nouveau prestataire.

export const metadata: Metadata = {
  title: 'Confidentialité · link.cg',
  description: 'Quelles données link.cg collecte, pourquoi, avec qui elles sont partagées et comment exercer vos droits.',
}

const UPDATED = '28 septembre 2026'

export default function ConfidentialitePage() {
  const contact = ISSUER.email
  return (
    <article>
      <h1>Politique de confidentialité</h1>
      <p className="updated">Dernière mise à jour : {UPDATED}</p>

      <p>
        link.cg (liens courts, QR codes et cartes de visite en ligne, accessibles sur qrcode.cg et link.cg) est un
        service édité par <strong>{ISSUER.name}</strong>, en République du Congo{ISSUER.address ? `, ${ISSUER.address}` : ''}.
        Cette page explique quelles données nous collectons, pourquoi, et ce que vous pouvez en faire.
      </p>

      <h2>En bref</h2>
      <ul>
        <li>Nous ne vendons pas vos données et n&apos;affichons pas de publicité.</li>
        <li>Nous collectons le minimum pour faire fonctionner votre compte, vos liens et leurs statistiques.</li>
        <li>Les statistiques de visites sont anonymes : nous n&apos;enregistrons pas l&apos;adresse IP de vos visiteurs.</li>
        <li>Vous pouvez demander à tout moment une copie ou la suppression de vos données.</li>
      </ul>

      <h2>1. Les données que nous collectons</h2>
      <p><strong>Votre compte</strong></p>
      <ul>
        <li>Votre nom (ou celui de votre activité) et votre adresse e-mail.</li>
        <li>Votre mot de passe, jamais stocké en clair : seule une empreinte chiffrée est conservée.</li>
        <li>
          Si vous vous connectez avec Google : votre nom, votre adresse e-mail et votre photo de profil, transmis par
          Google avec votre accord. Nous n&apos;avons pas accès à votre mot de passe Google ni à vos autres données Google.
        </li>
        <li>
          Pour la sécurité de vos connexions : l&apos;adresse IP et le type d&apos;appareil de chaque session (visibles
          dans « Mon compte », où vous pouvez déconnecter un appareil).
        </li>
      </ul>
      <p><strong>Ce que vous créez</strong></p>
      <ul>
        <li>Vos liens courts, leurs adresses de destination et le style de leurs QR codes (couleurs, logo).</li>
        <li>
          Vos cartes de visite : les informations que vous choisissez d&apos;y publier (nom, fonction, téléphone,
          e-mail, site web, réseaux sociaux). <strong>Une carte est publique</strong> : toute personne qui a son lien ou
          son QR code peut la voir.
        </li>
      </ul>
      <p><strong>Les visites de vos liens</strong></p>
      <p>
        Quand quelqu&apos;un ouvre un de vos liens ou scanne un de vos QR codes, nous enregistrons : la date et l&apos;heure,
        le pays et la ville approximatifs (déduits par notre hébergeur, sans conserver l&apos;adresse IP), le type
        d&apos;appareil et de navigateur, le site d&apos;où vient la visite, et s&apos;il s&apos;agit d&apos;un scan de
        QR code ou d&apos;un clic. Ces informations ne permettent pas d&apos;identifier la personne.
      </p>
      <p><strong>Les paiements</strong></p>
      <p>
        Pour les offres payantes réglées par mobile money : le montant, l&apos;offre et la période, le moyen de
        paiement, la référence de la transaction et le numéro de téléphone payeur.
      </p>
      <p><strong>Sans compte</strong></p>
      <p>
        Les QR codes créés sans compte restent dans votre navigateur (stockage local) : ils ne nous sont pas envoyés.
        Votre choix de thème clair ou sombre est aussi gardé dans votre navigateur.
      </p>

      <h2>2. Pourquoi nous les utilisons</h2>
      <ul>
        <li>Créer et sécuriser votre compte, vous connecter, et vous permettre de retrouver vos créations.</li>
        <li>Faire fonctionner vos liens, vos QR codes et vos cartes, et vous montrer leurs statistiques.</li>
        <li>
          Vous envoyer les e-mails nécessaires au service : confirmation de votre adresse, réinitialisation du mot de
          passe. Nous n&apos;envoyons pas de lettre d&apos;information sans votre accord.
        </li>
        <li>
          Protéger le service et ses utilisateurs contre les abus : liens de phishing ou de logiciels malveillants, faux
          comptes, tentatives de connexion répétées.
        </li>
        <li>Gérer les paiements et émettre vos reçus.</li>
      </ul>

      <h2>3. Avec qui elles sont partagées</h2>
      <p>
        Nous faisons appel à des prestataires techniques, qui ne traitent vos données que pour nous rendre ce service :
      </p>
      <ul>
        <li><strong>Cloudflare</strong> : hébergement de l&apos;application, de la base de données et des statistiques de visites, protection anti-robots (Turnstile).</li>
        <li><strong>Brevo</strong> : envoi des e-mails (votre adresse e-mail et le contenu du message).</li>
        <li><strong>Google</strong> : connexion avec Google si vous la choisissez, et vérification des adresses de destination de vos liens auprès de Google Safe Browsing (seule l&apos;adresse du lien est transmise).</li>
      </ul>
      <p>
        Ces prestataires peuvent traiter des données hors de la République du Congo, avec des garanties de sécurité
        adaptées. Nous ne communiquons vos données à aucun autre tiers, sauf obligation légale.
      </p>

      <h2>4. Combien de temps nous les gardons</h2>
      <ul>
        <li>Votre compte et vos créations : tant que votre compte existe. À sa suppression, ils sont effacés.</li>
        <li>Les statistiques de visites : environ 3 mois.</li>
        <li>Les sessions de connexion : jusqu&apos;à leur expiration ou votre déconnexion.</li>
        <li>Les paiements et reçus : pendant la durée exigée par les obligations comptables et fiscales.</li>
      </ul>

      <h2>5. Vos droits</h2>
      <p>
        Vous pouvez à tout moment accéder à vos données, les corriger, demander leur suppression ou vous opposer à
        leur utilisation, conformément à la législation congolaise sur la protection des données à caractère
        personnel. Une grande partie se fait directement dans l&apos;application (« Mon compte », vos liens, vos cartes).
        Pour le reste, et notamment pour supprimer votre compte, écrivez-nous à{' '}
        <a href={`mailto:${contact}`}>{contact}</a> depuis l&apos;adresse de votre compte. Nous répondons sous 30 jours.
      </p>

      <h2>6. Sécurité</h2>
      <p>
        Les échanges avec link.cg sont chiffrés (HTTPS), les mots de passe sont stockés sous forme d&apos;empreinte, et
        l&apos;accès à vos données est limité à votre compte. Aucun système n&apos;est infaillible : si une faille
        touchait vos données, nous vous en informerions.
      </p>

      <h2>7. Cookies</h2>
      <p>
        link.cg n&apos;utilise que les cookies nécessaires à la connexion (session et sécurité). Pas de cookie
        publicitaire ni de mesure d&apos;audience par un tiers.
      </p>

      <h2>8. Enfants</h2>
      <p>link.cg s&apos;adresse aux professionnels et aux adultes. Le service n&apos;est pas destiné aux moins de 16 ans.</p>

      <h2>9. Modifications</h2>
      <p>
        Si cette politique change de façon importante, nous vous en informerons par e-mail ou dans l&apos;application.
        La date de dernière mise à jour figure en haut de cette page.
      </p>

      <h2>10. Contact</h2>
      <p>
        {ISSUER.name} — <a href={`mailto:${contact}`}>{contact}</a>. Voir aussi nos{' '}
        <Link href="/conditions">conditions d&apos;utilisation</Link>.
      </p>
    </article>
  )
}
