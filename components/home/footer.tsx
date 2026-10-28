"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Facebook, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react"
import { useState } from "react"

export function Footer() {
  const [email, setEmail] = useState("")

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement newsletter subscription
    console.log("Subscribe email:", email)
    setEmail("")
  }

  return (
    <footer className="border-t border-border bg-card mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Giới thiệu</h3>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Trường đại học CNTT & TT Việt-Hàn
              </p>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Khu Đô thị Đại học Đà Nẵng,<br />
                  Đường Nam Kỳ Khởi Nghĩa,<br />
                  quận Ngũ Hành Sơn, TP. Đà Nẵng
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:02366552688" className="hover:text-foreground transition-colors">
                  0236.6.552.688
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:daotao@vku.udn.vn" className="hover:text-foreground transition-colors">
                  daotao@vku.udn.vn
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/tasks" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tasks
                </Link>
              </li>
              <li>
                <Link 
                  href="/practice" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Practice
                </Link>
              </li>
              <li>
                <Link 
                  href="/chat" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Chat
                </Link>
              </li>
              <li>
                <Link 
                  href="/reports" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Thông tin liên hệ</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:0376138772" className="hover:text-foreground transition-colors">
                  Hotline: 0376138772
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:cuongtd.23ai@vku.udn.vn" className="hover:text-foreground transition-colors">
                  cuongtd.23ai@vku.udn.vn
                </a>
              </div>
              <div className="pt-2">
                <p className="text-sm font-medium text-foreground mb-2">Mạng xã hội</p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.facebook.com/nguyen.vinh.sanh.2024"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.instagram.com/nguyenvinhsanh23?igsh=cmphcjJxeXVsYzNo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.tiktok.com/@userd7j3e9nkww?_r=1&_t=ZS-91fTsO5Py6f"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="TikTok"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.youtube.com/@vinhsanh869"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Newsletter Signup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Đăng ký nhận tin</h3>
            <p className="text-sm text-muted-foreground">
              Nhận tin khuyến mãi — Giảm giá đến 30% khi đăng ký
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <Input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
              />
              <Button type="submit" className="w-full">
                Đăng ký
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 IELTS WriteBetter. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link 
                href="/privacy" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
