"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

/** Sends signed-in users from a public page (e.g. the landing page) to their dashboard. */
export function RedirectIfSignedIn({ to = "/dashboard" }: { to?: string }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace(to)
    }
  }, [user, loading, router, to])

  return null
}
