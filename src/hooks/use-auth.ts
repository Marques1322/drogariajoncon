import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "financeiro" | "estoque" | "atendente" | "gerente";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  estoque: "Estoque",
  atendente: "Atendente",
  gerente: "Gerente",
};

// Módulos → papéis que podem acessá-los. Admin tem acesso a tudo.
export const MODULE_ROLES: Record<string, AppRole[]> = {
  "/dashboard": ["admin", "financeiro", "estoque", "atendente", "gerente"],
  "/produtos": ["admin", "gerente", "estoque"],
  "/clientes": ["admin", "gerente", "atendente"],
  "/vendas": ["admin", "gerente", "atendente"],
  "/estoque": ["admin", "gerente", "estoque"],
  "/fornecedores": ["admin", "gerente", "estoque"],
  "/compras": ["admin", "gerente", "estoque"],
  "/financeiro": ["admin", "gerente", "financeiro"],
  "/contas-pagar": ["admin", "gerente", "financeiro"],
  "/contas-receber": ["admin", "gerente", "financeiro"],
  "/relatorios": ["admin", "gerente", "financeiro"],
  "/configuracoes": ["admin"],
  "/configuracoes/usuarios": ["admin"],
};

export function canAccess(path: string, roles: AppRole[]): boolean {
  if (roles.includes("admin")) return true;
  const allowed = MODULE_ROLES[path];
  if (!allowed) return true;
  return allowed.some((r) => roles.includes(r));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRoles(userId: string) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (mounted) setRoles((data ?? []).map((r: { role: AppRole }) => r.role));
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      if (data.user) loadRoles(data.user.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadRoles(session.user.id);
      } else {
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, roles, loading, isAdmin: roles.includes("admin") };
}
