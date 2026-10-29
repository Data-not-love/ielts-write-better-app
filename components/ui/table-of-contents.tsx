"use client"

import { useEffect, useState } from "react"
import { ChevronRight, ChevronLeft, Menu } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Constants for TOC behavior configuration
const HEADING_DETECTION_DELAY = 500 // ms to wait for dynamic content to load
const INTERSECTION_RATIO_THRESHOLD = 0.1 // threshold for comparing intersection ratios
const FOOTER_HIDE_OFFSET = -100 // px offset before footer to start hiding TOC

interface TOCItem {
  id: string
  title: string
  level: number // 1 for main headings, 2 for subheadings
}

interface TableOfContentsProps {
  items?: TOCItem[]
  className?: string
  defaultCollapsed?: boolean
  onToggle?: (collapsed: boolean) => void
}

export function TableOfContents({ 
  items, 
  className,
  defaultCollapsed = false,
  onToggle
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [tocItems, setTocItems] = useState<TOCItem[]>(items || [])
  const [isHidden, setIsHidden] = useState(false)
  
  // Notify parent of toggle state changes
  useEffect(() => {
    onToggle?.(isCollapsed)
  }, [isCollapsed, onToggle])

  // Hide TOC when footer is visible to prevent overlap
  useEffect(() => {
    // Wait for footer to be rendered in the DOM
    const checkFooter = () => {
      const footer = document.querySelector('footer')
      if (!footer) {
        // Footer not yet rendered, retry after a short delay
        const retryTimer = setTimeout(checkFooter, 100)
        return () => clearTimeout(retryTimer)
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Hide TOC when footer starts to become visible
            setIsHidden(entry.isIntersecting)
          })
        },
        {
          // Trigger when footer starts entering the viewport
          rootMargin: `0px 0px ${FOOTER_HIDE_OFFSET}px 0px`,
          threshold: 0
        }
      )

      observer.observe(footer)

      return () => {
        observer.disconnect()
      }
    }

    const cleanup = checkFooter()
    return cleanup
  }, [])

  // Auto-detect headings from the page if items not provided
  useEffect(() => {
    if (items && items.length > 0) {
      // Explicit items replace auto-detected headings
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTocItems(items)
      return
    }

    const detectHeadings = () => {
      // Auto-detect headings from the DOM
      const headings = document.querySelectorAll('h1, h2, h3, [data-toc-title]')
      const detectedItems: TOCItem[] = []

      headings.forEach((heading) => {
        const title = heading.getAttribute('data-toc-title') || heading.textContent || ""
        if (!title || title.trim() === "") return

        // Skip if this heading is inside the TOC itself
        if (heading.closest('[data-toc-container]')) return

        let id = heading.id
        if (!id) {
          // Generate ID from title if not present
          id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          heading.id = id
        }

        const tagName = heading.tagName.toLowerCase()
        let level = 1
        if (tagName === 'h2' || heading.getAttribute('data-toc-level') === '2') {
          level = 2
        } else if (tagName === 'h3' || heading.getAttribute('data-toc-level') === '3') {
          level = 3
        }

        detectedItems.push({ id, title, level })
      })

      setTocItems(detectedItems)
    }

    // Initial detection
    detectHeadings()

    // Re-detect after a short delay to catch dynamically rendered content
    const timer = setTimeout(detectHeadings, HEADING_DETECTION_DELAY)

    // Also set up a MutationObserver to detect new headings added to the DOM
    // Debounce the detection to avoid excessive re-renders
    let detectionTimeout: NodeJS.Timeout | null = null
    const debouncedDetection = () => {
      if (detectionTimeout) clearTimeout(detectionTimeout)
      detectionTimeout = setTimeout(detectHeadings, 100)
    }

    const observer = new MutationObserver((mutations) => {
      // Only trigger if heading-related elements might have been added
      const hasRelevantChanges = mutations.some(mutation => {
        // Check if any added nodes are headings or contain headings
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false
          const element = node as Element
          const tagName = element.tagName?.toLowerCase()
          // Quick check using tagName first, then fallback to attribute/querySelector
          return (
            tagName === 'h1' || tagName === 'h2' || tagName === 'h3' ||
            element.hasAttribute('data-toc-title') ||
            element.querySelector('h1, h2, h3, [data-toc-title]') !== null
          )
        })
      })
      
      if (hasRelevantChanges) {
        debouncedDetection()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      clearTimeout(timer)
      if (detectionTimeout) clearTimeout(detectionTimeout)
      observer.disconnect()
    }
  }, [items])

  // Track active section based on scroll position
  useEffect(() => {
    if (tocItems.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is intersecting and has the highest intersectionRatio
        const intersectingEntries = entries.filter(entry => entry.isIntersecting)
        
        if (intersectingEntries.length > 0) {
          // Sort by intersection ratio and position (top-most visible section wins)
          const topEntry = intersectingEntries.sort((a, b) => {
            // First, prioritize by intersection ratio
            if (Math.abs(a.intersectionRatio - b.intersectionRatio) > INTERSECTION_RATIO_THRESHOLD) {
              return b.intersectionRatio - a.intersectionRatio
            }
            // If similar intersection ratios, prioritize the one closer to the top
            return a.boundingClientRect.top - b.boundingClientRect.top
          })[0]
          
          if (topEntry) {
            setActiveId(topEntry.target.id)
          }
        }
      },
      { 
        rootMargin: "-100px 0px -66% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    )

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [tocItems])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Immediately set the active state when clicking
      setActiveId(id)
      
      const yOffset = -120 // Offset for fixed headers (TopNav 64px + SecondaryNav ~56px)
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  if (tocItems.length === 0) {
    return null
  }

  return (
    <div
      data-toc-container
      className={cn(
        // Desktop only: on narrower screens a fixed side panel would sit on top of the content
        "fixed top-[7.5rem] left-4 z-30 hidden lg:block transition-all duration-300",
        isCollapsed ? "w-12" : "w-64",
        isHidden && "opacity-0 pointer-events-none",
        className
      )}
    >
      <div className="rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between p-3 border-b">
          {!isCollapsed && (
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Contents
            </h3>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("shrink-0", isCollapsed && "mx-auto")}
            aria-label={isCollapsed ? "Expand table of contents" : "Collapse table of contents"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <ScrollArea className="h-[calc(100vh-12rem)] max-h-[600px]">
            <div className="p-3 space-y-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full text-left text-sm py-2 px-3 rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    item.level === 2 && "pl-6",
                    item.level === 3 && "pl-9",
                    activeId === item.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
