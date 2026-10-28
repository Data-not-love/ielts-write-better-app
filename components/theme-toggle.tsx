"use client"

import * as React from "react"
import { Check, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ACCENTS, ACCENT_STORAGE_KEY, applyAccent, isAccentId, type AccentId } from "@/lib/accent"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [accent, setAccent] = React.useState<AccentId>("blue")

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY)
      if (isAccentId(saved)) setAccent(saved)
    } catch {}
  }, [])

  const chooseAccent = (next: AccentId) => {
    setAccent(next)
    applyAccent(next)
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, next)
    } catch {}
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Đổi giao diện">
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
          <Sun className="mr-2 h-4 w-4" />
          Sáng
          {!isDark && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
          <Moon className="mr-2 h-4 w-4" />
          Tối
          {isDark && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Màu nhấn</DropdownMenuLabel>
        <div className="flex items-center gap-2 px-2 pb-2" role="radiogroup" aria-label="Màu nhấn">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={accent === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => chooseAccent(a.id)}
              className={cn(
                "h-6 w-6 rounded-full ring-offset-2 ring-offset-popover transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                accent === a.id && "ring-2 ring-foreground",
              )}
              style={{ background: a.swatch }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
