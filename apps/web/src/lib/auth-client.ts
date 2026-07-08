import { customSessionClient, phoneNumberClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    credentials: 'include',
  },
  // customSessionClient surfaces the active-org membership/role the API attaches
  // to the session (see customSession in the API's auth.config), so useSession()
  // carries role with no extra request.
  plugins: [phoneNumberClient(), customSessionClient()],
})

export const { signUp, signIn, signOut, useSession, getSession } = authClient
