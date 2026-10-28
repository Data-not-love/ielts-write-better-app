import { collection, doc, getDoc, query, orderBy, setDoc, updateDoc, Timestamp, onSnapshot } from "firebase/firestore"
import type { TaskDocument } from "@/types/tasks"
import { db } from "./firebase"

// Tasks are read-only in the browser (see firestore.rules); they are written by the
// API routes through lib/tasks-server.ts so scores can't be edited client-side.

export async function getTask(userId: string, taskId: string): Promise<TaskDocument | null> {
  const taskRef = doc(db, "users", userId, "tasks", taskId)
  const snapshot = await getDoc(taskRef)
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as TaskDocument) : null
}

export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: TaskDocument[]) => void,
  onError?: (error: Error) => void,
) {
  const tasksRef = collection(db, "users", userId, "tasks")
  const q = query(tasksRef, orderBy("updatedAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const documents = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as TaskDocument[]
      onUpdate(documents)
    },
    (error) => {
      console.error("Failed to subscribe to tasks:", error)
      onError?.(error)
    },
  )
}

// User Profile
export type UserProfile = Record<string, unknown>

export async function getUserProfile(userId: string) {
  const userRef = doc(db, "users", userId)
  const snapshot = await getDoc(userRef)
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export async function createUserProfile(userId: string, profileData: UserProfile) {
  const userRef = doc(db, "users", userId)
  await setDoc(userRef, {
    ...profileData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
}

export async function updateUserProfile(userId: string, updates: UserProfile) {
  const userRef = doc(db, "users", userId)
  await updateDoc(userRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}
