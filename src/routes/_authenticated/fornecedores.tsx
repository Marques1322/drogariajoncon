import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Search, Pencil, Trash2, ArrowLeft, Receipt, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — PharmaERP" },
      {
        name: "description",
        content: "Cadastro de fornecedores, histórico de compras e duplicatas.",
      },
    ],
  }),
  component: FornecedoresPage,
});

type Fornecedor = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
};

type FormState = Omit<Fornecedor, "id"> & { id?: string };

const empty: FormState = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  ativo: true,
};

function FornecedoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["fornecedores", search],
    queryFn: async (): Promise<Fornecedor[]> => {
      let q = supabase.from("fornecedores").select("*").order("razao_social");
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(
          `razao_social.ilike.${s},nome_fantasia.ilike.${s},cnpj.ilike.${s},email.ilike.${s},cidade.ilike.${s}`,
        );
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as Fornecedor[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        razao_social: f.razao_social.trim(),
        nome_fantasia: f.nome_fantasia?.trim() || null,
        cnpj: f.cnpj?.trim() || null,
        inscricao_estadual: f.inscricao_estadual?.trim() || null,
        email: f.email?.trim() || null,
        telefone: f.telefone?.trim() || null,
        endereco: f.endereco?.trim() || null,
        cidade: f.cidade?.trim() || null,
        estado: f.estado?.trim() || null,
        cep: f.cep?.trim() || null,
        ativo: f.ativo,
      };
      if (f.id) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Fornecedor salvo.");
      setDialogOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor removido.");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro. Fornecedor pode ter compras vinculadas."),
  });

  function openNew() {
    setForm(empty);
    setDialogOpen(true);
  }
  function openEdit(f: Fornecedor) {
    setForm({ ...f });
    setDialogOpen(true);
  }

  if (selected) {
    return (
      <FornecedorDetalhe
        fornecedor={selected}
        onBack={() => setSelected(null)}
        onEdit={() => openEdit(selected)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6" /> Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastro, contatos, histórico de compras e duplicatas.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por razão, nome fantasia, CNPJ, e-mail ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão social</TableHead>
                  <TableHead>Nome fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (listQ.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum fornecedor encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  listQ.data!.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelected(f)}>
                      <TableCell className="font-medium">{f.razao_social}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.nome_fantasia ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.cnpj ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {f.telefone && <div>{f.telefone}</div>}
                        {f.email && <div className="text-muted-foreground">{f.email}</div>}
                        {!f.telefone && !f.email && "—"}
                      </TableCell>
                      <TableCell>{[f.cidade, f.estado].filter(Boolean).join("/") || "—"}</TableCell>
                      <TableCell>
                        {f.ativo ? (
                          <Badge variant="secondary">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Clique numa linha para ver histórico de compras e duplicatas.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
            <DialogDescription>Preencha os dados cadastrais e de contato.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate(form);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Razão social *</Label>
              <Input
                required
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome fantasia</Label>
              <Input
                value={form.nome_fantasia ?? ""}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj ?? ""}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Inscrição estadual</Label>
              <Input
                value={form.inscricao_estadual ?? ""}
                onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.telefone ?? ""}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={form.endereco ?? ""}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={form.cidade ?? ""}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                maxLength={2}
                value={form.estado ?? ""}
                onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={form.cep ?? ""}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-2">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Fornecedor ativo
              </Label>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se houver compras vinculadas a operação será bloqueada. Prefira desativar para
              preservar histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FornecedorDetalhe({
  fornecedor,
  onBack,
  onEdit,
}: {
  fornecedor: Fornecedor;
  onBack: () => void;
  onEdit: () => void;
}) {
  const comprasQ = useQuery({
    queryKey: ["fornecedor-compras", fornecedor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("id, numero_nota, data_emissao, valor_total, status")
        .eq("fornecedor_id", fornecedor.id)
        .order("data_emissao", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const duplicatasQ = useQuery({
    queryKey: ["fornecedor-duplicatas", fornecedor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("id, descricao, numero_documento, data_vencimento, valor, valor_pago, status")
        .eq("fornecedor_id", fornecedor.id)
        .order("data_vencimento", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalComprado = useMemo(
    () => (comprasQ.data ?? []).reduce((s: number, c: any) => s + Number(c.valor_total ?? 0), 0),
    [comprasQ.data],
  );
  const emAberto = useMemo(
    () =>
      (duplicatasQ.data ?? [])
        .filter((d: any) => d.status !== "pago" && d.status !== "cancelado")
        .reduce((s: number, d: any) => s + (Number(d.valor) - Number(d.valor_pago ?? 0)), 0),
    [duplicatasQ.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{fornecedor.razao_social}</h1>
          <p className="text-sm text-muted-foreground">
            {fornecedor.nome_fantasia ?? "—"} • {fornecedor.cnpj ?? "sem CNPJ"}
          </p>
        </div>
        <Button variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total comprado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{brl(totalComprado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Duplicatas em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{brl(emAberto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contato</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{fornecedor.telefone ?? "—"}</p>
            <p className="text-muted-foreground">{fornecedor.email ?? "—"}</p>
            <p className="text-muted-foreground">
              {[fornecedor.endereco, fornecedor.cidade, fornecedor.estado]
                .filter(Boolean)
                .join(", ") || "Sem endereço"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compras">
        <TabsList>
          <TabsTrigger value="compras">
            <Receipt className="h-4 w-4 mr-1" /> Compras
          </TabsTrigger>
          <TabsTrigger value="duplicatas">
            <FileText className="h-4 w-4 mr-1" /> Duplicatas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="compras">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nota</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(comprasQ.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Sem compras registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    comprasQ.data!.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.numero_nota ?? "—"}</TableCell>
                        <TableCell>
                          {c.data_emissao
                            ? format(new Date(c.data_emissao), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {brl(Number(c.valor_total ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="duplicatas">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(duplicatasQ.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Sem duplicatas vinculadas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    duplicatasQ.data!.map((d: any) => {
                      const saldo = Number(d.valor) - Number(d.valor_pago ?? 0);
                      return (
                        <TableRow key={d.id}>
                          <TableCell>{d.descricao}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {d.numero_documento ?? "—"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(d.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.status === "pago"
                                  ? "secondary"
                                  : d.status === "atrasado"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{brl(Number(d.valor))}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${saldo > 0 ? "text-amber-600" : ""}`}
                          >
                            {brl(saldo)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
