import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventário", href: "/estoque", icon: Package },
  { label: "Vendas", href: "/vendas", icon: ShoppingCart },
  { label: "Medicamentos", href: "/produtos", icon: Package },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Compras", href: "/compras", icon: FileText },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (href: string) => {
    const path = location.pathname;
    return path === href || path.startsWith(href + "/");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out z-40 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo/Brand com border-l-4 e fundo degradado */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-transparent">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">Φ</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-lg">Drogaria</span>
              <span className="font-semibold text-teal-600 text-xs">Joncon</span>
            </div>
          </div>
        )}
        <button
          onClick={() => onToggle(!isOpen)}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          title={isOpen ? "Fechar" : "Abrir"}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-slate-600" />
          ) : (
            <Menu className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active
                  ? "bg-teal-500 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110`} />
              {isOpen && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
          title="Sair da aplicação"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
          {isOpen && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
