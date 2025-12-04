interface FullscreenLayoutProps {
  children: React.ReactNode
}

export function FullscreenLayout({ children }: FullscreenLayoutProps) {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-transparent">
      {children}
    </div>
  )
}