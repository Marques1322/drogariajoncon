import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { LogOut, UserCircle2, ShieldCheck, Bell, AlertTriangle, Package, Receipt, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

export function AppHeader() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const notifQ = useNotifications();

  useEffect(() => setEmail(user?.email ?? null), [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const notifs = notifQ.data ?? [];
  const altas = notifs.filter((n) => n.gravidade === "alta").length;

  return (
    <div className="flex-1 flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        {roles.map((role) => (
          <Badge key={role} variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {notifs.length > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold flex items-center justify-center px-1 ${altas > 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
                  {notifs.length > 99 ? "99+" : notifs.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {notifs.length > 0 && <span className="text-xs text-muted-foreground">{notifs.length} alertas</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sem alertas no momento.</div>
            ) : notifs.slice(0, 20).map((n) => {
              const Icon = iconFor(n.tipo);
              return (
                <DropdownMenuItem key={n.id} asChild className="cursor-pointer">
                  <Link to={n.link} className="flex gap-2 items-start py-2">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.gravidade === "alta" ? "text-destructive" : "text-amber-600"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.descricao}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <UserCircle2 className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">{email ?? "Usuário"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
