export const ACCENT_STORAGE_KEY = "wb-accent"

export const ACCENTS = [
  { id: "blue", label: "Xanh mực", swatch: "oklch(0.48 0.14 255)" },
  { id: "pink", label: "Hồng", swatch: "oklch(0.53 0.19 355)" },
  { id: "yellow", label: "Vàng", swatch: "oklch(0.53 0.11 75)" },
  { id: "red", label: "Đỏ", swatch: "oklch(0.5 0.19 27)" },
  { id: "purple", label: "Tím", swatch: "oklch(0.49 0.18 300)" },
  { id: "green", label: "Xanh lá", swatch: "oklch(0.5 0.13 150)" },
] as const

export type AccentId = (typeof ACCENTS)[number]["id"]

export function isAccentId(value: unknown): value is AccentId {
  return ACCENTS.some((a) => a.id === value)
}

/** Blue is the default palette, so it is expressed by removing the attribute. */
export function applyAccent(accent: AccentId) {
  const root = document.documentElement
  if (accent === "blue") root.removeAttribute("data-accent")
  else root.setAttribute("data-accent", accent)
}

/**
 * Runs in <head> before first paint so a saved accent never flashes the default.
 * Kept as a static string: it reads only localStorage and an allowlist.
 */
export const accentInitScript = `(function(){try{var a=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});if(${JSON.stringify(
  ACCENTS.map((a) => a.id).filter((id) => id !== "blue"),
)}.indexOf(a)>-1)document.documentElement.setAttribute("data-accent",a)}catch(e){}})()`
