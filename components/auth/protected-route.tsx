"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const wasSignedIn = useRef(false)

  useEffect(() => {
    if (user) {
      wasSignedIn.current = true
      return
    }
    if (!loading) {
      // A session that just ended (sign out here or in another tab) goes to the landing page;
      // a visitor who never signed in is asked to log in
      router.replace(wasSignedIn.current ? "/" : "/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
