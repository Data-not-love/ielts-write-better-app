import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { CompareVersions } from "@/components/tasks/compare-versions"
import { Footer } from "@/components/home/footer"

export default async function CompareVersionsPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />

      <div className="container mx-auto px-4 py-8">
        <CompareVersions taskId={taskId} />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
