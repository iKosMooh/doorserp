"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Users, 
  DollarSign, 
  LogIn, 
  UserPlus, 
  Building,
  Settings,
  Camera,
  Zap
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Reconhecimento Facial", href: "/face-recognition", icon: Camera },
  { name: "Logs de Acesso", href: "/access-logs", icon: LogIn },
  { name: "Moradores", href: "/residents", icon: Users },
  { name: "Funcionários", href: "/employees", icon: UserPlus },
  { name: "Convidados", href: "/guests", icon: UserPlus },
  { name: "Unidades", href: "/units", icon: Building },
  { name: "Financeiro", href: "/financial", icon: DollarSign },
  { name: "Controle Arduino", href: "/arduino-control", icon: Zap },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center justify-center border-b px-4">
        <h1 className="text-xl font-bold text-primary">DoorsERP</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
