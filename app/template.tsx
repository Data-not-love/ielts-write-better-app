// Re-mounts on every navigation, so each page fades in (see .animate-page-in in globals.css)
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>
}
