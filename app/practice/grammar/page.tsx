import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { PracticeNav } from "@/components/navigation/practice-nav"
import { GrammarChecker } from "@/components/practice/grammar-checker"
import { Footer } from "@/components/home/footer"

export default function GrammarPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />
      <PracticeNav />

      <div className="container mx-auto px-4 py-8">
        <GrammarChecker />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
