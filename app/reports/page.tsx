import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { ProgressReports } from "@/components/reports/progress-reports"
import { PageWithTOC } from "@/components/ui/page-with-toc"
import { Footer } from "@/components/home/footer"

export default function ReportsPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />
      <PageWithTOC>
        <div className="container mx-auto px-4 py-8">
          <ProgressReports />
        </div>
      </PageWithTOC>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
