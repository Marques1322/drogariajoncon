import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search, Pencil, Trash2, ArrowLeft, ShoppingCart, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — PharmaERP" },
      { name: "description", content: "Cadastro de clientes, limite de crédito, histórico e situação financeira." },
    ],
  }),
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  limite_credito: number;
  ativo: boolean;
};

type FormState = Omit<Cliente, "id" | "limite_credito"> & { id?: string; limite_credito: string };

const empty: FormState = {
  nome: "", cpf: "", rg: "", data_nascimento: "", email: "", telefone: "",
  endereco: "", cidade: "", estado: "", cep: "", observacoes: "",
  limite_credito: "0", ativo: true,
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["clientes", search],
    queryFn: async () => {
      let q = supabase.from("clientes").select("*").order("nome");
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`nome.ilike.${s},cpf.ilike.${s},email.ilike.${s},telefone.ilike.${s},cidade.ilike.${s}`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Cliente[];
      // saldo devedor (só carrega se usuário tiver acesso a contas_receber)
      const ids = rows.map((c) => c.id);
      let saldos: Record<string, number> = {};
      if (ids.length) {
        const { data: cr } = await supabase
          .from("contas_receber")
          .select("cliente_id, valor, status")
          .in("cliente_id", ids)
          .in("status", ["pendente", "atrasado"]);
        (cr ?? []).forEach((r: any) => {
          if (!r.cliente_id) return;
          saldos[r.cliente_id] = (saldos[r.cliente_id] ?? 0) + Number(r.valor ?? 0);
        });
      }
      return rows.map((c) => ({ ...c, saldo_devedor: saldos[c.id] ?? 0 })) as (Cliente & { saldo_devedor: number })[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        nome: f.nome.trim(),
        cpf: f.cpf?.trim() || null,
        rg: f.rg?.trim() || null,
        data_nascimento: f.data_nascimento || null,
        email: f.email?.trim() || null,
        telefone: f.telefone?.trim() || null,
        endereco: f.endereco?.trim() || null,
        cidade: f.cidade?.trim() || null,
        estado: f.estado?.trim() || null,
        cep: f.cep?.trim() || null,
        observacoes: f.observacoes?.trim() || null,
        limite_credito: Number(f.limite_credito) || 0,
        ativo: f.ativo,
      };
      if (f.id) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cliente salvo.");
      setDialogOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido.");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro."),
  });

  function openNew() { setForm(empty); setDialogOpen(true); }
  function openEdit(c: Cliente) {
    setForm({
      id: c.id, nome: c.nome, cpf: c.cpf ?? "", rg: c.rg ?? "",
      data_nascimento: c.data_nascimento ?? "", email: c.email ?? "",
      telefone: c.telefone ?? "", endereco: c.endereco ?? "",
      cidade: c.cidade ?? "", estado: c.estado ?? "", cep: c.cep ?? "",
      observacoes: c.observacoes ?? "", limite_credito: String(c.limite_credito ?? 0),
      ativo: c.ativo,
    });
    setDialogOpen(true);
  }

  if (selected) return <ClienteDetalhe cliente={selected} onBack={() => setSelected(null)} onEdit={() => openEdit(selected)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" /> Clientes
          </h1>
          <p className="text-sm text-muted-foreground">Cadastro, limite de crédito, histórico de compras e situação financeira.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo cliente</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, CPF, telefone, e-mail ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead className="text-right">Saldo devedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : (listQ.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
                ) : (
                  listQ.data!.map((c) => {
                    const excedeu = c.saldo_devedor > 0 && c.limite_credito > 0 && c.saldo_devedor >= c.limite_credito;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{c.cpf ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {c.telefone && <div>{c.telefone}</div>}
                          {c.email && <div className="text-muted-foreground">{c.email}</div>}
                          {!c.telefone && !c.email && "—"}
                        </TableCell>
                        <TableCell>{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</TableCell>
                        <TableCell className="text-right">{brl(Number(c.limite_credito))}</TableCell>
                        <TableCell className={`text-right font-medium ${c.saldo_devedor > 0 ? "text-amber-600" : ""}`}>{brl(c.saldo_devedor)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {c.ativo ? <Badge variant="secondary">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                            {excedeu && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" /> Limite
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Clique numa linha para ver histórico e parcelas em aberto.</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>Dados cadastrais, contato, endereço e limite de crédito.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="grid gap-4 sm:grid-cols-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
            <div className="space-y-2"><Label>RG</Label><Input value={form.rg ?? ""} onChange={(e) => setForm({ ...form, rg: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data de nascimento</Label><Input type="date" value={form.data_nascimento ?? ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-2"><Label>CEP</Label><Input value={form.cep ?? ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
            <div className="space-y-2"><Label>Limite de crédito</Label><Input type="number" min="0" step="0.01" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-2">
              <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label htmlFor="ativo" className="cursor-pointer">Cliente ativo</Label>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Prefira desativar quando houver histórico de vendas ou parcelas em aberto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClienteDetalhe({ cliente, onBack, onEdit }: { cliente: Cliente; onBack: () => void; onEdit: () => void }) {
  const vendasQ = useQuery({
    queryKey: ["cliente-vendas", cliente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, numero_venda, data_venda, valor_total, tipo_pagamento, status")
        .eq("cliente_id", cliente.id)
        .order("data_venda", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const parcelasQ = useQuery({
    queryKey: ["cliente-parcelas", cliente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_receber")
        .select("id, descricao, data_vencimento, data_recebimento, valor, status, forma_pagamento")
        .eq("cliente_id", cliente.id)
        .order("data_vencimento", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const totalComprado = (vendasQ.data ?? []).reduce((s: number, v: any) => s + Number(v.valor_total ?? 0), 0);
    const emAberto = (parcelasQ.data ?? [])
      .filter((p: any) => ["pendente", "atrasado"].includes(p.status))
      .reduce((s: number, p: any) => s + Number(p.valor ?? 0), 0);
    return { totalComprado, emAberto };
  }, [vendasQ.data, parcelasQ.data]);

  const situacao = stats.emAberto <= 0
    ? { label: "Em dia", variant: "secondary" as const }
    : cliente.limite_credito > 0 && stats.emAberto >= cliente.limite_credito
      ? { label: "Limite excedido", variant: "destructive" as const }
      : { label: "Com pendências", variant: "outline" as const };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {cliente.cpf ?? "sem CPF"} • {cliente.telefone ?? "sem telefone"}
          </p>
        </div>
        <Button variant="outline" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total comprado</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{brl(stats.totalComprado)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo devedor</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-amber-600">{brl(stats.emAberto)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Limite de crédito</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{brl(cliente.limite_credito)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Situação</CardTitle></CardHeader><CardContent><Badge variant={situacao.variant} className="text-base">{situacao.label}</Badge></CardContent></Card>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas"><ShoppingCart className="h-4 w-4 mr-1" /> Compras</TabsTrigger>
          <TabsTrigger value="parcelas"><FileText className="h-4 w-4 mr-1" /> Parcelas</TabsTrigger>
        </TabsList>
        <TabsContent value="vendas">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nº</TableHead><TableHead>Data</TableHead>
                <TableHead>Pagamento</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(vendasQ.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sem vendas registradas.</TableCell></TableRow>
                ) : vendasQ.data!.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.numero_venda}</TableCell>
                    <TableCell>{v.data_venda ? format(new Date(v.data_venda), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{v.tipo_pagamento}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{brl(Number(v.valor_total ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="parcelas">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead>
                <TableHead>Recebimento</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(parcelasQ.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sem parcelas.</TableCell></TableRow>
                ) : parcelasQ.data!.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.descricao}</TableCell>
                    <TableCell>{format(new Date(p.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>{p.data_recebimento ? format(new Date(p.data_recebimento), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "pago" ? "secondary" : p.status === "atrasado" ? "destructive" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{brl(Number(p.valor))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
