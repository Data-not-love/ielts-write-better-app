import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Server-only Firebase access. Bypasses Firestore rules, so every route using it
// must scope reads/writes to the uid returned by requireUserId().

function getAdminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set")
  }

  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export class UnauthorizedError extends Error {}

/**
 * Verify the Firebase ID token sent as "Authorization: Bearer <token>"
 * and return the caller's uid. Never trust a userId from the request body/query.
 */
export async function requireUserId(req: Request): Promise<string> {
  const match = req.headers.get("authorization")?.match(/^Bearer (.+)$/)
  if (!match) {
    throw new UnauthorizedError("Missing ID token")
  }

  const adminAuth = getAuth(getAdminApp())
  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    return decoded.uid
  } catch {
    throw new UnauthorizedError("Invalid ID token")
  }
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
