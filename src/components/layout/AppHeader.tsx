import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, UserCircle2, ShieldCheck } from "lucide-react";
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

export function AppHeader() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => setEmail(user?.email ?? null), [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex-1 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {roles.map((role) => (
          <Badge key={role} variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>
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
  );
}
