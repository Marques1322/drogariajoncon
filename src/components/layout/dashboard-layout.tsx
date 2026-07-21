import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Users,
  Truck,
  Wallet,
  FileText,
  Settings,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface SidebarItem {
  label: string;
  icon: ReactNode;
  href: string;
  badge?: number;
}

const menuItems: SidebarItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, href: "/dashboard" },
  { label: "PDV Venda", icon: <ShoppingCart className="h-5 w-5" />, href: "/pdv" },
  { label: "Medicamentos", icon: <Pill className="h-5 w-5" />, href: "/produtos" },
  { label: "Estoque", icon: <Package className="h-5 w-5" />, href: "/estoque" },
  { label: "Clientes", icon: <Users className="h-5 w-5" />, href: "/clientes" },
  { label: "Fornecedores", icon: <Truck className="h-5 w-5" />, href: "/fornecedores" },
  { label: "Financeiro", icon: <Wallet className="h-5 w-5" />, href: "/financeiro" },
  { label: "Contas a Pagar", icon: <CreditCard className="h-5 w-5" />, href: "/contas-pagar" },
  { label: "Contas a Receber", icon: <CreditCard className="h-5 w-5" />, href: "/contas-receber" },
  { label: "Relatórios", icon: <FileText className="h-5 w-5" />, href: "/relatorios" },
  { label: "Configurações", icon: <Settings className="h-5 w-5" />, href: "/configuracoes/index" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const isActive = (href: string) => currentPath.includes(href);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col fixed h-screen z-40`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-bold text-white">
                Ф
              </div>
              <div className="flex flex-col">
                <h1 className="font-bold text-sm">PharmaERP</h1>
                <p className="text-xs text-slate-400">Gestão farmacêutica</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-700 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email?.split("@")[0]}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </>
              )}
            </button>

            {showUserMenu && sidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? "ml-64" : "ml-20"} flex-1 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Sistema de Gestão Farmacêutica</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                Notificações
              </Button>
              <Button variant="ghost" size="sm">
                Suporte
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
