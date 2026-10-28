import { ProtectedRoute } from "@/components/auth/protected-route"
import { TopNav } from "@/components/navigation/top-nav"
import { SecondaryNav } from "@/components/navigation/secondary-nav"
import { ChatInterface } from "@/components/chat/chat-interface"
import { PageWithTOC } from "@/components/ui/page-with-toc"
import { Footer } from "@/components/home/footer"

export default function ChatPage() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
      <TopNav />
      <SecondaryNav />
      <PageWithTOC>
        <div className="container mx-auto px-4 py-8">
          <ChatInterface />
        </div>
      </PageWithTOC>
      
      {/* Footer */}
      <Footer />
    </div>
    </ProtectedRoute>
  )
}
