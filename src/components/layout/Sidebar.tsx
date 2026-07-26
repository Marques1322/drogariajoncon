import { Link, useRouterState } from "@tanstack/react-router";
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
  Warehouse,
  Truck,
  Receipt,
  CreditCard,
  BarChart3,
  Pill,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canAccess, type AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles: AppRole[] };

const modules: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "financeiro", "estoque", "atendente", "gerente"] },
  { label: "Vendas", href: "/vendas", icon: ShoppingCart, roles: ["admin", "gerente", "atendente"] },
  { label: "Medicamentos", href: "/produtos", icon: Pill, roles: ["admin", "gerente", "estoque"] },
  { label: "Estoque", href: "/estoque", icon: Warehouse, roles: ["admin", "gerente", "estoque"] },
  { label: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "gerente", "atendente"] },
  { label: "Fornecedores", href: "/fornecedores", icon: Truck, roles: ["admin", "gerente", "estoque"] },
  { label: "Compras", href: "/compras", icon: Receipt, roles: ["admin", "gerente", "estoque"] },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: CreditCard, roles: ["admin", "gerente", "financeiro"] },
  { label: "Contas a Receber", href: "/contas-receber", icon: DollarSign, roles: ["admin", "gerente", "financeiro"] },
  { label: "Financeiro", href: "/financeiro", icon: BarChart3, roles: ["admin", "gerente", "financeiro"] },
  { label: "Relatórios", href: "/relatorios", icon: FileText, roles: ["admin", "gerente", "financeiro"] },
  { label: "Configurações", href: "/configuracoes", icon: Settings, roles: ["admin"] },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { roles } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(href + "/");

  const items = modules.filter((m) => canAccess(m.href, roles));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col",
        "border-r border-border/60 bg-[#111111] text-white",
        "shadow-[8px_0_32px_-24px_rgba(0,0,0,0.9)]",
        "transition-[width] duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20",
      )}
    >
      {/* Brand */}
      <div className="flex h-20 items-center gap-3 border-b border-white/5 px-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl joncon-gradient shadow-lg shadow-orange-500/25">
          <span className="text-xl font-black text-white">J</span>
        </div>
        {isOpen && (
          <div className="min-w-0 flex-1 animate-fade-in">
            <div className="truncate text-sm font-bold tracking-tight text-white">
              Drogaria Joncon
            </div>
            <div className="truncate text-[11px] font-medium uppercase tracking-widest text-[#F97316]">
              Gestão farmacêutica
            </div>
          </div>
        )}
        <button
          onClick={() => onToggle(!isOpen)}
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title={isOpen ? "Recolher" : "Expandir"}
          aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isOpen && (
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Menu
          </div>
        )}
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  title={!isOpen ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    "transition-all duration-200",
                    active
                      ? "joncon-gradient text-white shadow-lg shadow-orange-500/30"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                    >
                      <span className="absolute inset-0 shine-active" />
                    </span>
                  )}
                  <Icon
                    className={cn(
                      "relative h-5 w-5 shrink-0 transition-transform duration-200",
                      "group-hover:scale-110",
                      active ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.55)]" : "",
                    )}
                  />
                  {isOpen && (
                    <span className="relative truncate">{item.label}</span>
                  )}
                  {active && isOpen && (
                    <span
                      aria-hidden
                      className="relative ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/5 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          title="Sair"
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
          {isOpen && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
