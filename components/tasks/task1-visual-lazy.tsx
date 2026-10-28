"use client"

import dynamic from "next/dynamic"

/**
 * Task1VisualView loaded on demand, so pages only pull in Recharts once a Task 1
 * visual is actually rendered. Use this everywhere instead of importing task1-visual directly.
 */
export const Task1VisualView = dynamic(() => import("./task1-visual").then((m) => m.Task1VisualView), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-md border bg-muted/40" aria-hidden="true" />,
})
