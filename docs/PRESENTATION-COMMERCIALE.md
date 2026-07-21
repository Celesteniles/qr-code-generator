# Présentation de la solution cible

## 1. Résumé exécutif

**`qrcode.cg` est en production aujourd'hui.** L'outil de génération de QR codes
est en ligne, fonctionnel, gratuit et déjà utilisable. Ce document décrit ce
qu'il devient : une plateforme complète de liens intelligents pour les
entreprises et les institutions d'Afrique centrale.

Le constat est simple. Un QR code ou un lien imprimé est **figé pour toujours**.
Une brochure, une carte de visite, un panneau, un menu : dès que l'information
change, tout le support imprimé devient obsolète. Il faut réimprimer.

La plateforme rend ces liens **modifiables après impression**, et mesurables.
Quatre services sur une seule infrastructure :

| Service                     | Ce que le client obtient                                        |
| --------------------------- | --------------------------------------------------------------- |
| **QR code dynamique**       | Change la destination sans réimprimer le support                 |
| **Lien court mesuré**       | Liens sur `link.cg`, ou sur le domaine propre du client          |
| **Lien d'application**      | Un lien unique qui envoie vers l'App Store ou le Play Store      |
| **Carte de visite digitale**| Profil professionnel à jour, adossé à une carte physique         |

Le tout opéré depuis le Congo, sur une infrastructure distribuée mondialement,
avec une équipe locale.

---

## 2. Le problème

### Pour les entreprises

L'imprimé et le numérique sont désynchronisés. Un numéro change, une campagne se
termine, un site est refondu — et chaque support déjà distribué pointe dans le
vide. Le coût n'est pas seulement la réimpression : c'est le client perdu au
moment où il a scanné.

### Pour les institutions

Aucune traçabilité. Une campagne de sensibilisation, un document officiel, une
affiche publique : impossible de savoir si le support a été consulté, par
combien de personnes, où. La décision se prend sans mesure.

### Pour tout le monde, localement

Les solutions existantes sont étrangères, facturées en devises, sans support
local, sans interlocuteur, et souvent inaccessibles aux moyens de paiement
réellement utilisés dans la zone. **Il n'existe pas d'acteur régional sur ce
segment.**

---

## 3. La solution

### 3.1 QR code dynamique

Le QR imprimé pointe vers un lien que le client contrôle. Il peut en changer la
destination à tout moment, sans toucher au support.

*Un restaurant imprime 200 menus avec un QR. Le menu change chaque semaine. Il
met à jour la destination en trente secondes, les 200 supports restent valables.*

### 3.2 Lien court mesuré

Des liens courts sur `link.cg`, ou sur le domaine du client (`go.entreprise.cg`)
pour les organisations qui veulent garder leur identité. Chaque lien remonte le
nombre de consultations, leur origine géographique et le type d'appareil.

### 3.3 Lien d'application

Un lien unique qui détecte l'appareil et envoie automatiquement l'utilisateur
vers l'App Store, le Play Store, ou une page web s'il est sur ordinateur.

*Un opérateur lance une application. Une seule adresse sur toute la campagne —
affiches, SMS, radio, réseaux sociaux — quel que soit le téléphone du client.*

### 3.4 Carte de visite digitale

Un profil professionnel hébergé, accessible par QR ou lien, dont le contenu se
met à jour sans réimprimer la carte. Adossé à une carte physique produite par
l'agence.

*Un cadre change de fonction. Sa carte imprimée reste valable : le profil est
mis à jour, pas le carton.*

---

## 4. Preuve d'exécution

C'est le point qui distingue ce dossier d'une idée sur papier.

- **Le produit est en ligne** : [qrcode.cg](https://www.qrcode.cg/), fonctionnel,
  utilisable immédiatement.
- **Dix types de contenu** déjà pris en charge : URL, texte, Wi-Fi, contact,
  e-mail, SMS, téléphone, localisation, application, réseaux sociaux.
- **Personnalisation complète** : couleurs, dégradés, formes, logo intégré,
  export PNG et SVG haute définition.
- **Bilingue français / anglais** dès l'origine.
- **L'architecture technique de la plateforme cible est spécifiée et
  documentée.**
- **Les deux noms de domaine stratégiques sont détenus** : `qrcode.cg` et
  `link.cg`.

---

## 5. Cas d'usage par secteur

### Opérateurs télécom

Campagnes d'acquisition mesurées, lien unique multi-plateformes pour les
applications, QR sur les supports de vente en boutique, activation de forfaits.
Attribution réelle par canal — savoir quelle affiche a converti.

### Banques et institutions financières

Onboarding client par QR en agence, liens sécurisés vers les parcours
d'ouverture de compte, cartes de visite digitales pour les chargés de clientèle,
supports de campagne modifiables sans repasser par l'impression.

### Administrations et secteur public

Campagnes de santé publique et de sensibilisation avec mesure d'audience réelle,
QR sur documents et affichage officiels, accès aux formulaires et démarches en
ligne, information de proximité mise à jour sans réimpression.

### Commerce et hôtellerie

Menus, cartes, tarifs, catalogues, QR Wi-Fi pour la clientèle, vitrophanies,
fiches produit.

### Événementiel

Billetterie, programmes évolutifs, signalétique, badges exposants.

---

## 6. Garanties techniques

### Disponibilité et performance

L'infrastructure de redirection s'exécute sur un réseau distribué mondialement,
au plus près de l'utilisateur. Un QR scanné depuis un téléphone en 4G doit
répondre en quelques dizaines de millisecondes — c'est un choix d'architecture,
pas une optimisation ultérieure.

La mesure d'audience est découplée de la redirection : **même en cas de panne du
système d'analyse, les liens continuent de fonctionner.**

### Continuité des supports imprimés

C'est l'engagement le plus important, parce qu'il est irréversible. Un QR
imprimé sur 10 000 brochures doit fonctionner dans cinq ans. L'architecture
sépare volontairement le domaine de redirection du reste du système, et impose
des choix techniques stricts pour qu'aucune évolution ultérieure ne puisse
casser un lien déjà distribué.

### Sécurité et lutte contre l'abus

Un service de liens courts est une cible. S'il sert à diffuser du contenu
malveillant, il peut être bloqué par les navigateurs — et tous les liens
légitimes tomberaient avec lui.

Quatre mesures, intégrées dès la conception et non ajoutées après coup :

1. **Aucune création de lien anonyme.** Compte obligatoire, identité traçable.
2. **Vérification automatique des destinations** à la création et à chaque
   modification.
3. **Re-vérification périodique** des liens actifs.
4. **Domaines dédiés pour les grands comptes** — un client sur son propre
   domaine est totalement isolé de la réputation des autres.

### Souveraineté et protection des données

**Le premier principe est la minimisation.** La plateforme ne collecte pas de
données personnelles pour fonctionner : un lien, sa destination, et des
statistiques de consultation agrégées. Pas de profilage individuel, pas de
revente de données. La meilleure garantie de souveraineté reste de ne pas
détenir la donnée.

**Pour les données de service**, l'hébergement s'appuie sur une infrastructure
internationale distribuée, avec possibilité de choisir la région de stockage
principal.

**Pour les organisations soumises à une obligation stricte de localisation** —
certaines banques, certaines administrations — un déploiement dédié sur
infrastructure choisie par le client est proposable. C'est une offre distincte,
à qualifier au cas par cas.

---

## 7. Modèle économique

Quatre sources de revenus, volontairement complémentaires — l'une donne du
récurrent, l'autre de la trésorerie immédiate.

### Abonnement (revenu récurrent)

Accès à la plateforme par paliers : nombre de liens actifs, volume de scans,
utilisateurs, domaines personnalisés, profondeur des statistiques. C'est le
socle de la valorisation.

### Production physique (marge immédiate)

L'adossement à une agence créative est un avantage structurel : la plateforme
génère le lien, l'agence produit le support. Cartes de visite, stickers,
chevalets, plaques, vitrophanies, signalétique. Marge sur le support, pas sur le
pixel — et un cycle de vente court.

### Projets au volume (B2B)

Génération et gestion de campagnes à grande échelle pour un événement, un
réseau d'agences, une administration. Facturation sur devis.

### Domaines personnalisés (grands comptes)

Les organisations qui veulent leurs liens sur leur propre domaine. Levier de
revenu et, techniquement, isolation de réputation.

---

## 8. Position défendable

Ce qu'un concurrent international ne peut pas répliquer facilement.

**Le domaine `link.cg`.** Sept caractères. Un domaine court est un actif rare et
non reproductible — c'est l'infrastructure sur laquelle vivent tous les liens
clients.

**L'ancrage local.** Interlocuteur sur place, langue, facturation locale,
compréhension des moyens de paiement réellement utilisés, capacité à répondre à
un appel d'offres régional. Les acteurs internationaux n'ont ni support local ni
présence commerciale sur ce marché.

**L'intégration numérique-physique.** Peu d'acteurs peuvent livrer à la fois la
plateforme et le support imprimé. C'est un avantage de marge et un argument de
simplicité pour le client.

**Une structure de coûts très basse.** L'architecture retenue permet de servir
les premiers clients à un coût d'infrastructure marginal, ce qui autorise une
tarification adaptée au pouvoir d'achat local — là où les acteurs étrangers
facturent en devises fortes.

**L'avance d'exécution.** Le produit est en ligne. Sur ce marché, personne
d'autre ne l'est.

---

## 9. Feuille de route

| Étape | Livrable                                                              |
| ----- | --------------------------------------------------------------------- |
| 1     | Infrastructure de redirection en production sur `link.cg`              |
| 2     | Comptes, espaces de travail, gestion des liens                         |
| 3     | QR dynamique et statistiques de consultation                           |
| 4     | Lien d'application (routage App Store / Play Store)                    |
| 5     | Cartes de visite digitales et offre physique associée                  |
| 6     | Domaines personnalisés pour grands comptes                             |
| 7     | Encaissement mobile money et facturation                               |
