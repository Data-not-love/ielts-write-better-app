"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const quickLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/practice", label: "Practice" },
  { href: "/chat", label: "Chat" },
  { href: "/reports", label: "Reports" },
]

const linkClass = "hover:text-foreground transition-colors"

export function Footer() {
  const [email, setEmail] = useState("")

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement newsletter subscription. Nothing is stored or sent yet.
    setEmail("")
  }

  return (
    <footer className="border-t border-foreground/80 mt-20">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Colophon */}
          <div className="md:col-span-5 space-y-4 text-sm text-muted-foreground">
            <p className="font-display text-xl font-semibold text-foreground">IELTS WriteBetter</p>
            <p>
              <span className="text-foreground">Trường Đại học CNTT &amp; TT Việt-Hàn</span>
              <br />
              Khu Đô thị Đại học Đà Nẵng, Đường Nam Kỳ Khởi Nghĩa,
              <br />
              quận Ngũ Hành Sơn, TP. Đà Nẵng
            </p>
            <dl className="grid grid-cols-[6rem_1fr] gap-y-1">
              <dt>Văn phòng</dt>
              <dd>
                <a href="tel:02366552688" className={linkClass}>0236.6.552.688</a> ·{" "}
                <a href="mailto:daotao@vku.udn.vn" className={linkClass}>daotao@vku.udn.vn</a>
              </dd>
              <dt>Hotline</dt>
              <dd>
                <a href="tel:0376138772" className={linkClass}>0376138772</a>
              </dd>
              <dt>Liên hệ</dt>
              <dd>
                <a href="mailto:cuongtd.23ai@vku.udn.vn" className={linkClass}>cuongtd.23ai@vku.udn.vn</a>
              </dd>
            </dl>
          </div>

          {/* Quick links */}
          <nav className="md:col-span-3 text-sm" aria-label="Liên kết nhanh">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Ứng dụng</p>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-foreground/80 hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Newsletter */}
          <div className="md:col-span-4 text-sm">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Nhận tin</p>
            <p className="mb-3 text-muted-foreground">Đề mới và mẹo viết, gửi qua email.</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
              />
              <Button type="submit" variant="outline">
                Đăng ký
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© 2025 IELTS WriteBetter</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
