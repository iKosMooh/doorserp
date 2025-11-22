"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Camera,
  FileText,
  Home,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Zap,
  Menu,
  Building,
  Activity,
  Settings,
  UserPlus,
  LogOut
} from "lucide-react";
import { CondominiumSelector } from "@/components/CondominiumSelector";
import { useAuth } from "@/contexts/AuthContext";

const adminMenuItems = [
  {
    title: "Dashboard Admin",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600"
  },
  {
    title: "Gerenciar Moradores",
    href: "/residents-management",
    icon: Users,
    color: "text-purple-600"
  },
  {
    title: "Reconhecimento do Condomínio",
    href: "/condominium-recognition",
    icon: Shield,
    color: "text-emerald-600"
  },
  {
    title: "Moradores",
    href: "/residents",
    icon: Users,
    color: "text-purple-600"
  },
  {
    title: "Funcionários",
    href: "/employees",
    icon: UserCheck,
    color: "text-orange-600"
  },
  {
    title: "Convidados",
    href: "/guests",
    icon: UserPlus,
    color: "text-pink-600"
  },
  {
    title: "Unidades",
    href: "/units",
    icon: Building,
    color: "text-indigo-600"
  },
  {
    title: "Financeiro",
    href: "/financial",
    icon: DollarSign,
    color: "text-emerald-600"
  },
  {
    title: "Logs de Acesso",
    href: "/access-logs",
    icon: Activity,
    color: "text-red-600"
  },
  {
    title: "Arduino Control",
    href: "/arduino-control",
    icon: Zap,
    color: "text-yellow-600"
  },
  {
    title: "Cadastro Arduino",
    href: "/arduino-register",
    icon: Settings,
    color: "text-blue-600"
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
    color: "text-gray-600"
  },
];

const residentMenuItems = [
  {
    title: "Painel do Morador",
    href: "/resident-dashboard",
    icon: Home,
    color: "text-blue-600"
  },
  {
    title: "Meus Convidados",
    href: "/guests",
    icon: UserPlus,
    color: "text-pink-600"
  },
  {
    title: "Histórico de Acesso",
    href: "/access-logs",
    icon: Activity,
    color: "text-red-600"
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
    color: "text-gray-600"
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Determine which menu items to show based on user role
  const getMenuItems = () => {
    if (!user) return []; // Não mostrar nenhum menu até carregar o usuário

    if (user.isAdmin) {
      return adminMenuItems;
    } else {
      return residentMenuItems;
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await logout();
      router.push('/login');
    }
  };

  const SidebarContent = () => (
    <div className={cn(
      "h-full flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <Link href="/" className="block p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <Image 
                src="/logorbg.png" 
                alt="DoorsERP Logo" 
                width={40} 
                height={40}
                className="rounded-xl"
              />
              <div>
                <h1 className="text-xl font-extrabold gradient-text text-black">DoorsERP</h1>
                <p className="text-xs text-gray-500">Sistema de Portaria</p>
              </div>
            </div>
          )}
          {collapsed && (
            <Image 
              src="/logorbg.png" 
              alt="DoorsERP Logo" 
              width={40} 
              height={40}
              className="rounded-xl mx-auto"
            />
          )}
        </div>
      </Link>

      {/* Seletor de Condomínio */}
      <div className="p-4 border-b border-gray-100">
        <CondominiumSelector collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Voltar para Home - Redireciona baseado no tipo de usuário */}
        <Link
          href={user?.isAdmin ? "/dashboard" : "/resident-dashboard"}
          className={cn(
            "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200",
            "text-gray-600 hover:text-green-600 hover:bg-green-50",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? (user?.isAdmin ? "Dashboard Admin" : "Painel do Morador") : ""}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">{user?.isAdmin ? "Dashboard Admin" : "Painel do Morador"}</span>}
        </Link>

        <div className="border-t border-gray-200 pt-4 mt-4">
          {!user ? (
            // Estado de carregamento
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-pulse bg-gray-200 rounded-xl",
                    collapsed ? "h-12 w-12 mx-auto" : "h-12 w-full"
                  )}
                />
              ))}
            </div>
          ) : (
            // Menu carregado baseado no usuário
            menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group relative",
                    isActive
                      ? "bg-gradient-to-r from-green-500 to-orange-500 text-white shadow-lg shadow-green-200/50"
                      : "text-gray-700 hover:text-green-600 hover:bg-green-50",
                    collapsed ? "justify-center" : ""
                  )}
                  title={collapsed ? item.title : ""}
                >
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? "text-white" : item.color
                  )} />
                  {!collapsed && (
                    <span className="font-medium">{item.title}</span>
                  )}
                  {isActive && (
                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Botão de Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center rounded-xl p-3",
            "text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200",
            collapsed ? "justify-center" : "justify-start space-x-3"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Sair</span>}
        </button>

        {/* Botão de Recolher */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center justify-center p-3 rounded-xl",
            "text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200",
            collapsed ? "px-3" : "space-x-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-6 h-6" />
          ) : (
            <>
              <ChevronLeft className="w-6 h-6" />
              <span className="font-medium">Recolher</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
