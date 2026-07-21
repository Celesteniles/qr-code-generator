import { getAuth } from '@/server/auth'

// Handler Better Auth (login, logout, session, signup…). Instancié par requête
// car les bindings Cloudflare vivent dans le contexte de requête.
export async function POST(request: Request): Promise<Response> {
  return getAuth().handler(request)
}

export async function GET(request: Request): Promise<Response> {
  return getAuth().handler(request)
}
