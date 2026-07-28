import { useNavigate, Link } from "@tanstack/react-router";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Bell,
  Search,
  LogOut,
  UserCircle2,
  ShieldCheck,
  AlertTriangle,
  Package,
  Receipt,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { useNotifications, type Notificacao } from "@/hooks/use-notifications";

const iconFor = (t: Notificacao["tipo"]) => {
  switch (t) {
    case "vencimento": return AlertTriangle;
    case "estoque_baixo": return Package;
    case "conta_pagar": return Receipt;
    case "conta_receber": return DollarSign;
  }
};

export function Header() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const notifQ = useNotifications();
  const email = user?.email ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }


  const notifs = notifQ.data ?? [];
  const altas = notifs.filter((n) => n.gravidade === "alta").length;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-[#1B1B1B]/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Search */}
        <div className="max-w-md flex-1">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar medicamentos, clientes, notas..."
              className="h-10 w-full rounded-xl border border-border bg-[#242424] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 transition-all focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Roles */}
          <div className="hidden items-center gap-1.5 md:flex">
            {roles.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className="gap-1 border border-border bg-[#242424] text-zinc-300 hover:bg-[#2a2a2a]"
              >
                <ShieldCheck className="h-3 w-3 text-[#F97316]" />
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-[#242424] text-zinc-300 transition-all hover:border-[#F97316]/40 hover:text-white"
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                {notifs.length > 0 && (
                  <span
                    className={
                      "absolute -right-1 -top-1 grid min-w-[20px] h-5 place-items-center rounded-full px-1 text-[10px] font-bold " +
                      (altas > 0
                        ? "bg-[#EF4444] text-white pulse-orange"
                        : "bg-[#F97316] text-white")
                    }
                  >
                    {notifs.length > 99 ? "99+" : notifs.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {notifs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{notifs.length} alertas</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifs.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sem alertas no momento.
                </div>
              ) : (
                notifs.slice(0, 20).map((n) => {
                  const Icon = iconFor(n.tipo);
                  return (
                    <DropdownMenuItem key={n.id} asChild className="cursor-pointer">
                      <Link to={n.link} className="flex items-start gap-2 py-2">
                        <Icon
                          className={
                            "mt-0.5 h-4 w-4 shrink-0 " +
                            (n.gravidade === "alta"
                              ? "text-[#EF4444]"
                              : "text-[#FACC15]")
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{n.titulo}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {n.descricao}
                          </p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-border bg-[#242424] py-1.5 pl-1.5 pr-3 text-sm transition-all hover:border-[#F97316]/40">
                <div className="grid h-7 w-7 place-items-center rounded-lg joncon-gradient text-xs font-bold text-white">
                  {(email?.[0] || "U").toUpperCase()}
                </div>
                <span className="hidden max-w-[160px] truncate text-zinc-200 sm:inline">
                  {email ?? "Usuário"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" /> Minha conta
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
