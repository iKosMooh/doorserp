"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
    title: "Reconhecimento Facial",
    href: "/face-recognition",
    icon: Camera,
    color: "text-green-600"
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
    title: "Deploy Arduino",
    href: "/arduino-deploy",
    icon: Zap,
    color: "text-amber-600"
  },
  {
    title: "Cadastro Arduino",
    href: "/arduino-register",
    icon: Settings,
    color: "text-blue-600"
  },
  {
    title: "Serial Monitor",
    href: "/serial-monitor",
    icon: Activity,
    color: "text-teal-600"
  },
  {
    title: "Pessoas Reconhecidas",
    href: "/recognized",
    icon: FileText,
    color: "text-teal-600"
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
    title: "Reconhecimento Facial",
    href: "/face-recognition",
    icon: Camera,
    color: "text-green-600"
  },
  {
    title: "Meus Acessos",
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
  const [userInfo, setUserInfo] = useState<{
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    name?: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  // Fetch user info to determine menu items - apenas uma vez
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok && isMounted) {
          const data = await response.json();
          setUserInfo(data.user);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao obter informações do usuário:', error);
        }
      }
    };

    if (!userInfo) {
      fetchUserInfo();
    }

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine which menu items to show based on user role
  const getMenuItems = () => {
    if (!userInfo) return adminMenuItems; // Default fallback
    
    if (userInfo.isAdmin || userInfo.isSuperAdmin) {
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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold gradient-text text-black">DoorsERP</h1>
                <p className="text-xs text-gray-500">Sistema de Portaria</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Seletor de Condomínio */}
      <div className="p-4 border-b border-gray-100">
        <CondominiumSelector collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Voltar para Home */}
        <Link
          href="/"
          className={cn(
            "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200",
            "text-gray-600 hover:text-green-600 hover:bg-green-50",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? "Página Inicial" : ""}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Página Inicial</span>}
        </Link>

        <div className="border-t border-gray-200 pt-4 mt-4">
          {menuItems.map((item) => {
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
          })}
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
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
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
