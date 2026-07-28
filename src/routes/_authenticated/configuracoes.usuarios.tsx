import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, type AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw redirect({ to: "/dashboard" });
  },
  component: UsuariosPage,
});

type Row = {
  user_id: string;
  nome_completo: string | null;
  roles: AppRole[];
};

const ALL_ROLES: AppRole[] = ["admin", "gerente", "financeiro", "estoque", "atendente"];

function UsuariosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("atendente");

  async function reload() {
    setLoading(true);
    const [{ data: profiles }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, nome_completo").order("nome_completo"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, Row>();
    (profiles ?? []).forEach((p: { id: string; nome_completo: string | null }) => {
      map.set(p.id, { user_id: p.id, nome_completo: p.nome_completo, roles: [] });
    });
    (rolesData ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      const row = map.get(r.user_id);
      if (row) row.roles.push(r.role);
    });
    setRows(Array.from(map.values()));
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function addRole(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Permissão adicionada.");
    setAddFor(null);
    reload();
  }

  async function removeRole(userId: string, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Permissão removida.");
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários e permissões</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os perfis de acesso de cada usuário do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-64">Adicionar permissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const available = ALL_ROLES.filter((r) => !row.roles.includes(r));
                  return (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{row.nome_completo ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.roles.length === 0 && (
                            <span className="text-xs text-muted-foreground">Sem permissões</span>
                          )}
                          {row.roles.map((r) => (
                            <Badge key={r} variant="secondary" className="gap-1">
                              {ROLE_LABELS[r]}
                              <button
                                onClick={() => removeRole(row.user_id, r)}
                                className="ml-1 rounded hover:text-destructive"
                                aria-label="Remover"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {available.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : addFor === row.user_id ? (
                          <div className="flex gap-2">
                            <Select
                              value={selectedRole}
                              onValueChange={(v) => setSelectedRole(v as AppRole)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {available.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => addRole(row.user_id, selectedRole)}>
                              OK
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAddFor(row.user_id);
                              setSelectedRole(available[0]);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Adicionar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
