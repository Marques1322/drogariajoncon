import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Warehouse,
  BarChart3,
  Settings,
  Pill,
  Truck,
  Receipt,
  CreditCard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, canAccess, type AppRole } from "@/hooks/use-auth";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles: AppRole[] };

const modules: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "financeiro", "estoque", "atendente", "gerente"] },
  { title: "Medicamentos", url: "/produtos", icon: Package, roles: ["admin", "gerente", "estoque"] },
  { title: "Estoque", url: "/estoque", icon: Warehouse, roles: ["admin", "gerente", "estoque"] },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, roles: ["admin", "gerente", "estoque"] },
  { title: "Compras", url: "/compras", icon: Receipt, roles: ["admin", "gerente", "estoque"] },
  { title: "Clientes", url: "/clientes", icon: Users, roles: ["admin", "gerente", "atendente"] },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart, roles: ["admin", "gerente", "atendente"] },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard, roles: ["admin", "gerente", "financeiro"] },
  { title: "Contas a Receber", url: "/contas-receber", icon: DollarSign, roles: ["admin", "gerente", "financeiro"] },
  { title: "Financeiro", url: "/financeiro", icon: BarChart3, roles: ["admin", "gerente", "financeiro"] },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: ["admin", "gerente", "financeiro"] },
];

const system: NavItem[] = [
  { title: "Usuários", url: "/configuracoes/usuarios", icon: Users, roles: ["admin"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { roles } = useAuth();
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const visibleModules = modules.filter((m) => canAccess(m.url, roles));
  const visibleSystem = system.filter((m) => canAccess(m.url, roles));

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
            <Link to={item.url} className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Pill className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">PharmaERP</span>
              <span className="text-xs text-muted-foreground">Gestão de Farmácias</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(visibleModules)}</SidebarGroupContent>
        </SidebarGroup>
        {visibleSystem.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(visibleSystem)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
