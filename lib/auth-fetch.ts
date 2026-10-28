import { auth } from "@/lib/firebase"

/**
 * fetch() that attaches the signed-in user's Firebase ID token so API routes
 * can verify who is calling.
 */
export async function authFetch(input: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken()
  const headers = new Headers(init.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}
