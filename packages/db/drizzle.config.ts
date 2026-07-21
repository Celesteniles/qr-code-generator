import { defineConfig } from 'drizzle-kit'

// Génère les migrations SQL depuis src/schema.ts vers ./migrations.
// Base D1 : link-db (id 6798b00a-d331-488c-9e48-a38fb11654d1, région WEUR).
// Appliquer : wrangler d1 execute link-db --remote --file=migrations/<fichier>.sql
// (le binding D1 vivra dans l'app qui écrit — dashboard/API — pas dans le routeur,
//  qui ne lit que KV).
export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/schema.ts', './src/auth-schema.ts'],
  out: './migrations',
})
