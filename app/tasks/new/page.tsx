import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { NewTaskForm } from "@/components/tasks/new-task-form"
import { Footer } from "@/components/home/footer"

export default function NewTaskPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />

      <div className="container mx-auto px-4 py-8">
        <NewTaskForm />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
