import type { IllustrationName } from '@/components/kit/Illustration'

// Choix de la visite guidée et ce qu'ils impliquent : question « fixe ou
// modifiable » adaptée, exemple concret, et destination dans l'écran Créer
// (contrat /creer?mode=lien|qr&type=…). Un QR modifiable = un lien court : il est
// donc créé en mode « lien » avec le type choisi.

export type Kind = 'fixe' | 'modifiable'

export interface TourCta {
  href: string
  label: string
  ready: string
  lead: string
}

export interface TourChoice {
  id: string
  title: string
  desc: string
  ill: IllustrationName
  bg: string
  question: string
  lead: string
  labels: Record<Kind, string>
  allowed: Kind[]
  recommended: Kind
  /** Précision affichée quand une seule option est possible. */
  note?: string
  example: string
  tip: { title: string; text: string }
  cta: Partial<Record<Kind, TourCta>>
}

const LEAD = 'C’est la seule question technique. Voici la différence, simplement.'
const QR_LABELS: Record<Kind, string> = { fixe: 'QR fixe', modifiable: 'QR modifiable' }

export const CHOICES: TourChoice[] = [
  {
    id: 'lien',
    title: 'Un lien court à partager',
    desc: 'Pour vos statuts, groupes et publications',
    ill: 'shortlink', bg: 'bg-sky',
    question: 'Un lien court se modifie quand vous voulez.',
    lead: 'Pas de question ici : un lien court est toujours modifiable, et son QR aussi.',
    labels: { fixe: 'QR fixe', modifiable: 'Lien court + QR' },
    allowed: ['modifiable'], recommended: 'modifiable',
    note: 'Un lien court passe par votre adresse link.cg/… : vous changez sa destination sans le republier, et son QR imprimé suit.',
    example: 'vous partagez link.cg/promo dans vos statuts pour la rentrée. En décembre, vous le faites pointer vers la promo de fin d’année : même lien, rien à republier.',
    tip: { title: 'Une adresse qui inspire confiance', text: 'Choisissez une adresse courte et lisible, comme link.cg/votre-boutique.' },
    cta: {
      modifiable: {
        href: '/creer?mode=lien', label: 'Créer mon lien court',
        ready: 'Parfait, votre lien court vous attend.',
        lead: 'Collez le lien à raccourcir, choisissez l’adresse link.cg/…, c’est prêt. Le QR du lien est inclus.',
      },
    },
  },
  {
    id: 'menu',
    title: 'Mon menu',
    desc: 'Sur chaque table du restaurant',
    ill: 'menu', bg: 'bg-sun',
    question: 'Votre menu change de temps en temps ?',
    lead: LEAD,
    labels: QR_LABELS,
    allowed: ['fixe', 'modifiable'], recommended: 'modifiable',
    example: 'un restaurant imprime son QR sur 40 tables. Quand il change de carte, il met à jour la destination du lien : les tables restent telles quelles.',
    tip: { title: 'Votre menu est un PDF ?', text: 'Déposez-le sur Google Drive ou WhatsApp Business et collez le lien de partage.' },
    cta: {
      fixe: {
        href: '/creer?mode=qr&type=menu', label: 'Créer mon QR menu',
        ready: 'Parfait, votre QR menu vous attend.',
        lead: 'Collez le lien de votre menu, choisissez un style, c’est prêt.',
      },
      modifiable: {
        href: '/creer?mode=lien&type=menu', label: 'Créer mon QR menu modifiable',
        ready: 'Parfait, votre QR menu vous attend.',
        lead: 'Collez le lien de votre menu, choisissez l’adresse courte et un style, c’est prêt.',
      },
    },
  },
  {
    id: 'whatsapp',
    title: 'Mon WhatsApp',
    desc: 'Vos clients vous écrivent en un geste',
    ill: 'whatsapp', bg: 'bg-mint',
    question: 'Votre numéro WhatsApp pourrait changer ?',
    lead: LEAD,
    labels: QR_LABELS,
    allowed: ['fixe', 'modifiable'], recommended: 'fixe',
    example: 'une boutique imprime « Écrivez-nous » sur ses sacs. Si elle change de numéro, un QR fixe est à réimprimer ; un QR modifiable se met à jour en ligne.',
    tip: { title: 'Pensez à l’indicatif', text: 'Saisissez votre numéro avec l’indicatif du pays, par exemple +242.' },
    cta: {
      fixe: {
        href: '/creer?mode=qr&type=whatsapp', label: 'Créer mon QR WhatsApp',
        ready: 'Parfait, votre QR WhatsApp vous attend.',
        lead: 'Indiquez votre numéro et, si vous voulez, le premier message. Choisissez un style, c’est prêt.',
      },
      modifiable: {
        href: '/creer?mode=lien&type=whatsapp', label: 'Créer mon lien WhatsApp',
        ready: 'Parfait, votre lien WhatsApp vous attend.',
        lead: 'Indiquez votre numéro, choisissez l’adresse courte : vous obtenez un lien à partager et son QR.',
      },
    },
  },
  {
    id: 'vcard',
    title: 'Mes coordonnées',
    desc: 'Une carte de visite digitale',
    ill: 'card', bg: 'bg-coral-tint',
    question: 'Vos coordonnées vont évoluer ?',
    lead: LEAD,
    labels: { fixe: 'QR contact fixe', modifiable: 'Carte de visite digitale' },
    allowed: ['fixe', 'modifiable'], recommended: 'modifiable',
    example: 'vous changez de numéro ou de poste. Avec la carte de visite digitale, vous mettez à jour votre profil : les cartes déjà distribuées mènent aux nouvelles coordonnées.',
    tip: { title: 'À préparer', text: 'Votre numéro, votre email et, si vous voulez, vos réseaux sociaux.' },
    cta: {
      fixe: {
        href: '/creer?mode=qr&type=vcard', label: 'Créer mon QR contact',
        ready: 'Parfait, votre QR contact vous attend.',
        lead: 'Remplissez vos coordonnées : en scannant, on les enregistre dans son téléphone.',
      },
      modifiable: {
        href: '/carte', label: 'Créer ma carte de visite',
        ready: 'Parfait, votre carte de visite vous attend.',
        lead: 'Remplissez votre profil : on vous appelle, on vous écrit sur WhatsApp, on enregistre votre contact. Lien et QR inclus.',
      },
    },
  },
  {
    id: 'wifi',
    title: 'Mon Wi‑Fi',
    desc: 'Connexion sans taper le mot de passe',
    ill: 'wifi', bg: 'bg-mint',
    question: 'Un QR Wi‑Fi est toujours fixe.',
    lead: 'Pas de question ici : voici pourquoi, simplement.',
    labels: QR_LABELS,
    allowed: ['fixe'], recommended: 'fixe',
    note: 'Le téléphone lit le nom du réseau et le mot de passe directement dans le QR, sans passer par un lien. Si vous changez de mot de passe, il faudra en créer un nouveau, gratuitement.',
    example: 'un café affiche le QR de son Wi‑Fi au comptoir. Les clients se connectent sans demander le mot de passe.',
    tip: { title: 'À préparer', text: 'Le nom exact du réseau et son mot de passe.' },
    cta: {
      fixe: {
        href: '/creer?mode=qr&type=wifi', label: 'Créer mon QR Wi‑Fi',
        ready: 'Parfait, votre QR Wi‑Fi vous attend.',
        lead: 'Indiquez le nom du réseau et le mot de passe, choisissez un style, c’est prêt.',
      },
    },
  },
  {
    id: 'app',
    title: 'Mon application',
    desc: 'Le bon store selon le téléphone',
    ill: 'app', bg: 'bg-lilac',
    question: 'Un lien d’application est toujours modifiable.',
    lead: 'Pas de question ici : il passe forcément par votre adresse courte.',
    labels: { fixe: 'QR fixe', modifiable: 'Lien selon le téléphone' },
    allowed: ['modifiable'], recommended: 'modifiable',
    note: 'Votre adresse link.cg/… choisit l’App Store ou Google Play selon le téléphone. Un QR fixe ne sait pas le faire.',
    example: 'link.cg/monappli ouvre l’App Store sur iPhone et Google Play sur Android. Un seul QR sur vos affiches pour les deux.',
    tip: { title: 'À préparer', text: 'Les liens App Store et Google Play de votre application.' },
    cta: {
      modifiable: {
        href: '/creer?mode=lien&type=app', label: 'Créer mon lien d’application',
        ready: 'Parfait, votre lien d’application vous attend.',
        lead: 'Collez vos liens de store, choisissez l’adresse courte, c’est prêt. Le QR est inclus.',
      },
    },
  },
]
