"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen, CheckCircle, FileEdit, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"

const practiceNavItems = [
  {
    href: "/practice/prompts",
    label: "Prompts Library",
    icon: BookOpen,
  },
  {
    href: "/practice/grammar",
    label: "Grammar Checker",
    icon: CheckCircle,
  },
  {
    href: "/practice/paraphrase",
    label: "Paraphrase Tool",
    icon: FileEdit,
  },
  {
    href: "/practice/planner",
    label: "Essay Planner",
    icon: PenTool,
  },
]

export function PracticeNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-muted/50 sticky top-[115px] sm:top-[112px] z-30">
      <div className="transition-[margin] duration-300 lg:[[data-toc=collapsed]_&]:ml-16 lg:[[data-toc=expanded]_&]:ml-72">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide">
          {practiceNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "whitespace-nowrap",
                  isActive && "font-semibold shadow-sm"
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>
      </div>
    </nav>
  )
}
