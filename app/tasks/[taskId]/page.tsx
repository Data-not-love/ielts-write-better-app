import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { TaskDetail } from "@/components/tasks/task-detail"
import { Footer } from "@/components/home/footer"

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />

      <div className="container mx-auto px-4 py-8">
        <TaskDetail taskId={taskId} />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
