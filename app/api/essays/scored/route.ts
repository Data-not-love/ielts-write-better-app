import { NextRequest } from "next/server"
import { getAdminDb, requireUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req)

    // Query for scored tasks only (without orderBy to avoid composite index requirement)
    const snapshot = await getAdminDb()
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .where("status", "==", "scored")
      .get()

    const scoredEssays = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || data.prompt || "Untitled Essay",
        prompt: data.prompt,
        response: data.response,
        taskType: data.taskType,
        overallBand: data.overallBand ?? data.feedback?.overallBand,
        feedback: data.feedback,
        updatedAt: data.updatedAt,
      }
    })

    // Sort by updatedAt in memory (descending - most recent first)
    scoredEssays.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds * 1000 || 0
      const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds * 1000 || 0
      return bTime - aTime
    })

    return Response.json({ essays: scoredEssays })
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse()
    console.error("[scored-essays] Error fetching scored essays:", error)
    return Response.json(
      { error: "Failed to fetch scored essays" },
      { status: 500 }
    )
  }
}
