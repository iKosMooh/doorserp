interface FullscreenLayoutProps {
  children: React.ReactNode
}

export function FullscreenLayout({ children }: FullscreenLayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  )
}