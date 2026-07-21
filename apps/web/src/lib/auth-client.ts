'use client'
import { createAuthClient } from 'better-auth/react'

// baseURL omis : le client utilise l'origine courante (marche en bêta comme en prod).
export const authClient = createAuthClient()
export const { signIn, signUp, signOut, useSession } = authClient
