import { NextRequest } from "next/server"
import { getAdminDb, requireUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/firebase-admin"
import type { UserTarget } from "@/types/reports"

export const maxDuration = 60

function targetRef(userId: string) {
  return getAdminDb().collection("users").doc(userId).collection("settings").doc("target")
}

// GET - Retrieve user's target
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req)

    const targetDoc = await targetRef(userId).get()

    if (!targetDoc.exists) {
      return Response.json({ target: null })
    }

    return Response.json({ target: targetDoc.data() as UserTarget })
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse()
    console.error("[get-target] Error:", error)
    return Response.json({ error: "Failed to retrieve target" }, { status: 500 })
  }
}

// POST - Save user's target
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req)
    const { targetOverallBand, deadline } = await req.json()

    if (typeof targetOverallBand !== "number" || targetOverallBand < 5.0 || targetOverallBand > 9.0) {
      return Response.json({ error: "Invalid target band. Must be between 5.0 and 9.0" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const targetData: UserTarget = {
      targetOverallBand,
      createdAt: now,
      updatedAt: now
    }
    if (typeof deadline === "string" && deadline) {
      targetData.deadline = deadline
    }

    const ref = targetRef(userId)

    // Check if target already exists to preserve createdAt
    const existingDoc = await ref.get()
    if (existingDoc.exists) {
      const existingData = existingDoc.data() as UserTarget
      targetData.createdAt = existingData.createdAt
    }

    await ref.set(targetData)

    return Response.json({ success: true, target: targetData })
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse()
    console.error("[save-target] Error:", error)
    return Response.json({ error: "Failed to save target" }, { status: 500 })
  }
}
