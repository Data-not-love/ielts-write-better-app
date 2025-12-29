import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TopNav } from "@/components/navigation/top-nav"
import { Footer } from "@/components/home/footer"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <TopNav />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Last updated: December 29, 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to IELTS WriteBetter. We are committed to protecting your personal information and
                your right to privacy. This Privacy Policy explains what information we collect, how we use
                it, and what rights you have in relation to it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc text-muted-foreground ml-6 mb-4">
                <li className="mb-2">Account information (name, email address, password)</li>
                <li className="mb-2">Profile information and preferences</li>
                <li className="mb-2">Essays and writing samples you submit for evaluation</li>
                <li className="mb-2">Communications with us</li>
                <li className="mb-2">Usage data and analytics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc text-muted-foreground ml-6 mb-4">
                <li className="mb-2">Provide, maintain, and improve our Service</li>
                <li className="mb-2">Process and evaluate your writing submissions</li>
                <li className="mb-2">Generate personalized feedback and recommendations</li>
                <li className="mb-2">Send you technical notices, updates, and support messages</li>
                <li className="mb-2">Respond to your comments and questions</li>
                <li className="mb-2">Analyze usage patterns to improve our AI models</li>
                <li className="mb-2">Protect against fraudulent or illegal activity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. We may share your information only in the following
                circumstances:
              </p>
              <ul className="list-disc text-muted-foreground ml-6 mb-4">
                <li className="mb-2">With your consent</li>
                <li className="mb-2">With service providers who assist in operating our Service</li>
                <li className="mb-2">To comply with legal obligations</li>
                <li className="mb-2">To protect the rights and safety of our users and the public</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. AI and Machine Learning</h2>
              <p className="text-muted-foreground mb-4">
                We use artificial intelligence and machine learning technologies to analyze your writing and
                provide feedback. Your submitted essays may be used to improve our AI models, but we take
                steps to anonymize this data and protect your privacy. We use third-party AI services
                (including Google Generative AI) that may process your content according to their own privacy
                policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction. However, no
                method of transmission over the Internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal information for as long as necessary to provide the Service and for
                legitimate business purposes. You can request deletion of your account and associated data at
                any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have certain rights regarding your personal information,
                including:
              </p>
              <ul className="list-disc text-muted-foreground ml-6 mb-4">
                <li className="mb-2">The right to access your personal information</li>
                <li className="mb-2">The right to correct inaccurate information</li>
                <li className="mb-2">The right to delete your information</li>
                <li className="mb-2">The right to restrict or object to processing</li>
                <li className="mb-2">The right to data portability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar tracking technologies to collect usage information and improve
                your experience. You can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect
                personal information from children under 13. If you believe we have collected information
                from a child under 13, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by
                posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <ul className="list-none text-muted-foreground ml-0">
                <li className="mb-2">Email: sanhnv.23ai@vku.udn.vn</li>
                <li className="mb-2">Phone: 0376138772</li>
                <li>Address: Trường đại học CNTT & TT Việt-Hàn, Khu Đô thị Đại học Đà Nẵng</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
