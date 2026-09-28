# Domaines personnalisés (Cloudflare for SaaS)

Promesse de l'offre Business (« Votre propre domaine », un domaine) et Entreprise
(« Plusieurs domaines », 20 par espace) : `go.monresto.cg/menu` au lieu de
`link.cg/menu`.

Le code est en place et **éteint** tant que trois secrets manquent sur le Worker
`apps/web` : l'onglet *Mon compte › Domaines* affiche alors « Bientôt disponible »
avec l'adresse de contact. Rien n'est simulé.

---

## 1. Fonctionnement

```
Client (DNS)   go.monresto.cg  CNAME  domaines.link.cg
                                          │
Cloudflare     zone link.cg, Cloudflare for SaaS : custom hostname go.monresto.cg
               (certificat DV émis par Cloudflare, validation HTTP automatique)
                                          │
Worker         apps/router, route */* sur la zone link.cg
               KV.get("go.monresto.cg:menu") → 302
```

| Étape | Où | Code |
| --- | --- | --- |
| Ajouter | D1 réserve le nom (unique, plafond de l'offre), puis `POST /zones/{zone}/custom_hostnames` ; si Cloudflare refuse, le nom est libéré | `@link/db` `addCustomDomain`, `apps/web/src/server/domain-actions.ts` |
| Vérifier | `GET …/custom_hostnames/{id}`, et si pas actif `PATCH` (relance de la validation) ; `verified = status active ET ssl.status active` | `verifyDomainAction`, `updateDomainStatus` |
| Créer un lien | Domaine au choix (link.cg + domaines **vérifiés** de l'espace) ; `createLink` refuse un domaine d'un autre espace ou non vérifié ; clé KV `${hostname}:${slug}` | `createLinkAction`, `@link/db` `createLink` |
| Retirer | Refusé tant que des liens l'utilisent (ils sont peut-être imprimés) ; sinon `DELETE …/custom_hostnames/{id}` puis suppression D1 (garde atomique `NOT EXISTS links`) | `deleteDomainAction`, `removeCustomDomain` |
| Statistiques | Le routeur enregistre le hostname en `blob8` ; les requêtes filtrent `blob8 = 'go.monresto.cg'` (ou `IN ('', 'link.cg')` pour link.cg) | `@link/shared` `stats-sql.ts` |

Règles de saisie (`normalizeHostname`) : sous-domaine obligatoire (au moins trois
étiquettes : un CNAME n'est pas possible sur un domaine nu), ASCII strict (punycode
pour les noms accentués), ni adresse IP, ni `link.cg` / `qrcode.cg` ni leurs
sous-domaines.

Droits : propriétaire ou administrateur de l'espace. Les cartes de visite restent
sur `link.cg` (leur page publique `/c/{slug}` est résolue par slug).

Offre inférieure après coup : les liens existants sur le domaine continuent de
fonctionner ; on ne peut plus en créer de nouveaux sur ce domaine.

---

## 2. Étapes manuelles (propriétaire du compte Cloudflare)

À faire **une fois**, dans cet ordre. Aucune n'a été faite par le code.

### 2.1 Activer Cloudflare for SaaS sur la zone `link.cg`

Tableau de bord Cloudflare › zone **link.cg** › *SSL/TLS* › *Custom Hostnames* ›
activer (*Enable Cloudflare for SaaS*). Le forfait gratuit inclut 100 custom
hostnames ; au-delà, facturation par hostname (vérifier le tarif en vigueur).

### 2.2 Créer l'origine de repli (fallback origin)

Le Worker répond à tout : pas de serveur d'origine réel, un enregistrement
« sans origine » suffit.

1. DNS de la zone link.cg : `domaines.link.cg` **AAAA** `100::`, **proxifié**
   (nuage orange).
2. *SSL/TLS* › *Custom Hostnames* › *Fallback Origin* : `domaines.link.cg`, puis
   attendre le statut **Active**.

`domaines.link.cg` sert aussi de cible CNAME donnée aux clients (le nom est libre ;
garder le même partout).

### 2.3 Router le trafic des domaines clients vers `link-router`

La route actuelle du Worker (`link.cg`, custom domain) ne voit pas les hostnames
clients. Ajouter une **route** sur la zone link.cg :

- *Workers Routes* › *Add route* › motif `*/*` › Worker **link-router**.

Cloudflare recommande ce motif pour les custom hostnames : c'est le seul qui
attrape le trafic arrivant sous le nom du client. Il capte aussi tout le reste de
la zone link.cg ; aujourd'hui la zone ne sert que le routeur, donc sans effet de
bord. La route custom domain `link.cg` existante reste en place.

Équivalent wrangler (NON appliqué, `apps/router/wrangler.jsonc` inchangé ; à
décider au moment de l'activation) :

```jsonc
"routes": [
  { "pattern": "link.cg", "custom_domain": true },
  { "pattern": "*/*", "zone_name": "link.cg" }
]
```

### 2.4 Créer le jeton API

*Mon profil* › *Jetons API* › *Créer un jeton* › personnalisé :

- Permission : **Zone › SSL and Certificates › Edit** (c'est la permission
  « SSL and Certificates Write » exigée par l'API Custom Hostnames : créer, lire,
  modifier, supprimer). Si le tableau de bord propose aussi une permission
  **Custom Hostnames**, l'ajouter.
- Ressources de zone : **Include › Specific zone › link.cg** uniquement.
- Pas de permission de compte.

### 2.5 Poser les secrets sur le Worker `apps/web`

Bêta puis production (`--env production`) :

```sh
wrangler secret put CF_ZONE_ID            # ID de la zone link.cg (page d'accueil de la zone, colonne de droite)
wrangler secret put CF_SAAS_TOKEN         # jeton de l'étape 2.4
wrangler secret put CF_SAAS_CNAME_TARGET  # domaines.link.cg
```

Les trois sont requis. Aucun redéploiement nécessaire après `secret put`.

### 2.6 Déployer le routeur avant d'ouvrir la fonctionnalité

Le routeur doit enregistrer `blob8` (hostname) avant le premier domaine client :
une visite sur un domaine client enregistrée par l'ancien routeur (blob8 vide)
serait comptée comme une visite link.cg. Le déploiement CI habituel suffit.

### 2.7 Essai de bout en bout

1. Passer un espace de test en Business.
2. *Mon compte › Domaines* : ajouter `test.<un domaine à vous>`.
3. Chez le registraire : `test.<domaine>` CNAME `domaines.link.cg`.
4. « Vérifier » jusqu'à « Actif » (quelques minutes à quelques heures).
5. *Créer* : choisir le domaine, créer un lien, le scanner.

Si la validation reste bloquée : vérifier que le CNAME n'est pas proxifié chez le
client (si son domaine est lui-même sur Cloudflare, l'écran affiche aussi le TXT
de propriété demandé par Cloudflare) ; vérifier dans *Custom Hostnames* le détail
de l'erreur (les messages de Cloudflare sont journalisés côté Worker `[domaines]`).

---

## 3. Limites connues

- **Statistiques** : deux liens d'un **même** espace avec le même slug sur deux
  domaines ont leurs compteurs additionnés dans les listes (clé = slug). Les
  statistiques détaillées d'un lien et les données d'un autre espace sont, elles,
  bien séparées par domaine.
- **Pas de domaine nu** (`monresto.cg`) : il faudrait des IP fixes (Cloudflare for
  SaaS « apex proxying », option payante à vérifier auprès de Cloudflare).
- **Retrait concurrent** : si un lien est créé sur le domaine entre la suppression
  chez Cloudflare et la suppression D1, le domaine reste en base sans hostname
  Cloudflare ; « Vérifier » le redéclare.
- **Pas de suivi automatique** : le statut n'est mis à jour qu'au clic sur
  « Vérifier ». Un client qui retire son CNAME garde `verified = true` jusqu'au
  prochain clic (ses liens, eux, cessent de répondre). Un Cron Trigger de
  revérification serait l'étape suivante.
- La cible CNAME est globale (`CF_SAAS_CNAME_TARGET`), identique en bêta et en
  production : les deux Workers partagent la même base et le même KV.
