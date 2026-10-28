import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TopNav } from "@/components/navigation/top-nav"
import { ArrowRight } from "lucide-react"
import { DemoSection } from "@/components/home/demo-section"
import { Footer } from "@/components/home/footer"
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in"

const criteria = [
  { code: "TR", name: "Task Response", note: "Bạn có trả lời đúng và đủ đề bài không" },
  { code: "CC", name: "Coherence & Cohesion", note: "Đoạn văn, liên kết, mạch lập luận" },
  { code: "LR", name: "Lexical Resource", note: "Độ rộng và độ chính xác của từ vựng" },
  { code: "GRA", name: "Grammatical Range & Accuracy", note: "Cấu trúc câu đa dạng, ít lỗi" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <RedirectIfSignedIn />
      <TopNav />

      {/* Intro */}
      <section className="container mx-auto px-4 pt-16 pb-12 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              IELTS Writing · Task 1 &amp; Task 2
            </p>
            <h1 className="mb-6 text-4xl leading-[1.08] md:text-6xl text-balance">
              Viết bài, nhận band điểm như một giám khảo thật.
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Mỗi bài được chấm theo bốn tiêu chí chính thức chuẩn của IDP và BC, kèm nhận xét từng câu và bản viết lại để bạn sửa ngay và học hỏi kinh nghiệm.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/tasks/new">
                <Button size="lg" className="px-6">
                  Viết bài đầu tiên
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/chat">
                <Button size="lg" variant="ghost" className="px-4">
                  Hỏi trợ lý viết
                </Button>
              </Link>
            </div>
          </div>

          <dl className="border-t border-foreground/80">
            {criteria.map((c) => (
              <div key={c.code} className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-border py-4">
                <dt className="font-mono text-sm font-medium text-primary tabular-nums">{c.code}</dt>
                <dd>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.note}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Demo Section */}
      <DemoSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}
