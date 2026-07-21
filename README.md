# link-platform

Plateforme de liens intelligents : lien court, routage app store, carte de
visite numérique, QR dynamique. Un seul système, deux domaines.

- **`qrcode.cg`** — acquisition : outil QR gratuit, marketing, tableau de bord.
- **`link.cg`** — infrastructure : redirection de tous les liens clients.

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour la conception complète.

## Structure

```
apps/
  web/          Next.js 16 — qrcode.cg (marketing, outil gratuit, dashboard)
packages/
  qr/           sérialiseurs de contenu QR (pur, sans DOM, testé)
docs/           architecture, présentation commerciale
```

À venir : `apps/router` (Worker de redirection `link.cg`), `packages/ui`,
`packages/db`, `packages/shared`.

## Développement

Monorepo pnpm + Turborepo. Requiert Node 22+ et pnpm 10+.

```bash
pnpm install          # installe tout le workspace
pnpm dev              # lance les apps en mode dev
pnpm build            # build de production
pnpm test             # tests de tous les packages
pnpm lint             # lint
pnpm typecheck        # vérification de types
```

Pour ne cibler qu'un package : `pnpm --filter @link/web dev`.
