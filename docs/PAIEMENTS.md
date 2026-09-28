# Paiements : tâche planifiée, rappels et anomalies

Complément du paiement mobile money (pawaPay) décrit dans `packages/db/src/checkout.ts`
et `apps/web/src/server/pawapay.ts`.

## Tâche planifiée (Cron Trigger)

- **Où** : dans le Worker de l’app (`apps/web`), via `custom-worker.ts` (modèle
  OpenNext « custom worker ») qui ajoute un gestionnaire `scheduled` au Worker
  généré. Il appelle en interne la route `/api/taches/facturation` avec un jeton à
  usage unique (`src/lib/internal-task.ts`) : aucune requête venue d’Internet ne
  peut la déclencher (404), et il n’y a aucun secret à poser.
- **Quand** : toutes les heures (`0 * * * *`, UTC), sur la bêta et la production.
- **Quoi** (`src/server/billing-jobs.ts`) :
  1. relit chez pawaPay les paiements en attente depuis plus de 10 minutes
     (callback perdu, page fermée) et les applique ; au-delà de 48 h, un paiement
     toujours en attente ou introuvable passe en échec (`EXPIRED`). Chaque Worker
     ne relit que les paiements créés par **sa** API pawaPay (`checkouts.pawapay_env`) :
     la bêta (sandbox) ne touche jamais aux paiements de production ;
  2. renvoie les alertes d’anomalie que Brevo a refusées ;
  3. envoie les rappels d’échéance (J-7, veille, jour J), entre 8 h et 20 h à
     Brazzaville, **seulement si `BILLING_REMINDERS` = `"true"`** (production).
- **Au plus une fois** : chaque e-mail est réservé dans la table `notifications`
  avant l’envoi. Refus certain de Brevo : retenté (5 fois au plus). Issue incertaine
  (délai dépassé) : jamais renvoyé.
- **Tester en local** :
  ```sh
  cd apps/web
  npx opennextjs-cloudflare build
  npx wrangler d1 migrations apply link-db --local
  npx wrangler dev --local --test-scheduled --port 8799 --var BETTER_AUTH_URL:http://localhost:8799
  curl "http://localhost:8799/__scheduled?cron=0+*+*+*+*"
  ```
  Sans `BREVO_API_KEY`, aucun e-mail ne part (erreur journalisée).

## Anomalies de paiement

pawaPay a confirmé un dépôt (`COMPLETED`), mais l’offre n’a pas pu être donnée :
montant ou devise inattendus, opérateur inconnu, reçu non créé. Alors :

- l’anomalie est enregistrée une seule fois dans `payment_anomalies` (même si le
  callback, la page de retour et la tâche relisent le même paiement) ;
- le paiement passe en `review` : le client voit « paiement reçu, en cours de
  vérification par notre équipe » (page de retour et Facturation), jamais
  « Réessayer » ;
- NS Creative reçoit une alerte à `contact@nscreative.cg` (`ISSUER.email`) avec
  l’espace, le payeur, le propriétaire, les montants, le `depositId`, le
  `providerTransactionId`, l’opérateur et le numéro masqué.

### Résoudre

1. Vérifier le dépôt dans le tableau de bord pawaPay (recherche par `depositId`).
2. Ouvrir **`/interne/paiements`** (lien dans l’alerte), connecté avec une adresse
   listée dans le secret `BILLING_ADMIN_EMAILS`. Toute autre personne reçoit une 404.
3. Choisir :
   - **Accorder l’offre** : reçu du montant réellement encaissé (en FCFA), palier
     appliqué, période enchaînée comme un paiement normal. Opérateur inconnu :
     choisir le moyen de paiement du reçu. Rejouable sans second reçu ;
   - **Client remboursé** (remboursement fait dans pawaPay) : paiement clos
     (`REFUNDED`), aucune offre ;
   - **Classer** (rien n’a été encaissé en réalité) : paiement clos (`DISMISSED`).

La logique est dans `resolvePaymentAnomaly` (`packages/db/src/anomalies.ts`, testée).
Ne pas « accorder » en SQL à la main : le numéro de reçu et la période seraient à
recalculer. Pour **consulter** seulement :

```sh
npx wrangler d1 execute link-db --remote --command \
  "SELECT id, checkout_id, workspace_id, kind, detail, deposit, created_at FROM payment_anomalies WHERE status = 'open'"
```

## Réglages

| Nom | Où | Rôle |
| --- | --- | --- |
| `BILLING_REMINDERS` | var, `wrangler.jsonc` | `"true"` sur le Worker du site public seulement (production) |
| `BILLING_ADMIN_EMAILS` | secret, par Worker | adresses autorisées sur `/interne/paiements` ; absent = fermé |
| `BREVO_API_KEY` | secret, par Worker | envoi des rappels et alertes |
| `PAWAPAY_API_TOKEN`, `PAWAPAY_ENV` | secrets, par Worker | rattrapage des paiements en attente |
