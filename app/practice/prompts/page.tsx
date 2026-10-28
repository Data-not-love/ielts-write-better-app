import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { PracticeNav } from "@/components/navigation/practice-nav"
import { PromptsLibrary } from "@/components/practice/prompts-library"
import { PageWithTOC } from "@/components/ui/page-with-toc"
import { Footer } from "@/components/home/footer"

export default function PromptsPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />
      <PracticeNav />
      <PageWithTOC>
        <div className="container mx-auto px-4 py-8">
          <PromptsLibrary />
        </div>
      </PageWithTOC>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
