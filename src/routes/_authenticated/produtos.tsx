import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Medicamentos — PharmaERP" },
      { name: "description", content: "Cadastro e gestão de medicamentos da farmácia." },
    ],
  }),
  component: MedicamentosPage,
});

const PAGE_SIZE = 15;

type Categoria = { id: string; nome: string };
type Medicamento = {
  id: string;
  codigo_interno: string | null;
  codigo_barras: string | null;
  nome: string;
  principio_ativo: string | null;
  fabricante: string | null;
  categoria_id: string | null;
  categoria: { nome: string } | null;
  preco_custo: number;
  preco_venda: number;
  estoque_minimo: number;
  localizacao: string | null;
  ativo: boolean;
  quantidade_atual?: number;
};

type FormState = {
  id?: string;
  codigo_interno: string;
  codigo_barras: string;
  nome: string;
  principio_ativo: string;
  fabricante: string;
  categoria_id: string;
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: string;
  localizacao: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  codigo_interno: "", codigo_barras: "", nome: "", principio_ativo: "",
  fabricante: "", categoria_id: "", preco_custo: "0", preco_venda: "0",
  estoque_minimo: "0", localizacao: "", ativo: true,
};


function MedicamentosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [ativoFilter, setAtivoFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const categoriasQ = useQuery({
    queryKey: ["categorias"],
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from("categorias").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as Categoria[];
    },
  });

  const listQ = useQuery({
    queryKey: ["medicamentos", { search, categoriaFilter, ativoFilter, page }],
    queryFn: async () => {
      let q = supabase
        .from("medicamentos")
        .select(
          "id, codigo_interno, codigo_barras, nome, principio_ativo, fabricante, categoria_id, preco_custo, preco_venda, estoque_minimo, localizacao, ativo, categoria:categorias(nome)",
          { count: "exact" },
        )
        .order("nome", { ascending: true });

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`nome.ilike.${s},principio_ativo.ilike.${s},codigo_barras.ilike.${s},codigo_interno.ilike.${s}`);
      }
      if (categoriaFilter !== "all") q = q.eq("categoria_id", categoriaFilter);
      if (ativoFilter === "ativos") q = q.eq("ativo", true);
      if (ativoFilter === "inativos") q = q.eq("ativo", false);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;

      const ids = (data ?? []).map((m: any) => m.id);
      let estoques: Record<string, number> = {};
      if (ids.length) {
        const { data: lotesData } = await supabase
          .from("lotes")
          .select("medicamento_id, quantidade")
          .in("medicamento_id", ids);
        (lotesData ?? []).forEach((l: any) => {
          estoques[l.medicamento_id] = (estoques[l.medicamento_id] ?? 0) + Number(l.quantidade ?? 0);
        });
      }
      const rows: Medicamento[] = (data ?? []).map((m: any) => ({
        ...m,
        quantidade_atual: estoques[m.id] ?? 0,
      }));
      return { rows, count: count ?? 0 };
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        codigo_interno: f.codigo_interno.trim() || null,
        codigo_barras: f.codigo_barras.trim() || null,
        nome: f.nome.trim(),
        principio_ativo: f.principio_ativo.trim() || null,
        fabricante: f.fabricante.trim() || null,
        categoria_id: f.categoria_id || null,
        preco_custo: Number(f.preco_custo) || 0,
        preco_venda: Number(f.preco_venda) || 0,
        estoque_minimo: parseInt(f.estoque_minimo || "0", 10) || 0,
        localizacao: f.localizacao.trim() || null,
        ativo: f.ativo,
      };
      if (f.id) {
        const { error } = await supabase.from("medicamentos").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medicamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Medicamento salvo.");
      setDialogOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medicamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicamento excluído.");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir."),
  });

  function openNew() {
    setForm(emptyForm);
    setDialogOpen(true);
  }
  function openEdit(m: Medicamento) {
    setForm({
      id: m.id,
      codigo_interno: m.codigo_interno ?? "",
      codigo_barras: m.codigo_barras ?? "",
      nome: m.nome,
      principio_ativo: m.principio_ativo ?? "",
      fabricante: m.fabricante ?? "",
      categoria_id: m.categoria_id ?? "",
      preco_custo: String(m.preco_custo ?? 0),
      preco_venda: String(m.preco_venda ?? 0),
      estoque_minimo: String(m.estoque_minimo ?? 0),
      localizacao: m.localizacao ?? "",
      ativo: m.ativo,
    });
    setDialogOpen(true);
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((listQ.data?.count ?? 0) / PAGE_SIZE)),
    [listQ.data?.count],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" /> Medicamentos
          </h1>
          <p className="text-sm text-muted-foreground">Cadastro completo de produtos da farmácia.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo medicamento</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, princípio ativo, código..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full lg:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {(categoriasQ.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ativoFilter} onValueChange={(v) => { setAtivoFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Princípio ativo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : (listQ.data?.rows ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum medicamento encontrado.</TableCell></TableRow>
                ) : (
                  listQ.data!.rows.map((m) => {
                    const abaixo = (m.quantidade_atual ?? 0) < m.estoque_minimo;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.codigo_interno ?? m.codigo_barras ?? "—"}</TableCell>
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{m.principio_ativo ?? "—"}</TableCell>
                        <TableCell>{m.categoria?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className={abaixo ? "text-amber-600 font-semibold" : ""}>
                            {m.quantidade_atual ?? 0}
                          </span>
                          <span className="text-xs text-muted-foreground"> / mín {m.estoque_minimo}</span>
                        </TableCell>
                        <TableCell className="text-right">{brl(Number(m.preco_custo))}</TableCell>
                        <TableCell className="text-right font-medium">{brl(Number(m.preco_venda))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.localizacao ?? "—"}</TableCell>
                        <TableCell>
                          {m.ativo
                            ? <Badge variant="secondary">Ativo</Badge>
                            : <Badge variant="outline">Inativo</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">
              {listQ.data?.count ?? 0} registro(s)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="text-muted-foreground">Página {page + 1} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar medicamento" : "Novo medicamento"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do produto. Lotes, validade e movimentação de estoque são gerenciados no módulo de Estoque.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label>Código interno</Label>
              <Input value={form.codigo_interno} onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Código de barras</Label>
              <Input value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Princípio ativo</Label>
              <Input value={form.principio_ativo} onChange={(e) => setForm({ ...form, principio_ativo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria_id || "none"} onValueChange={(v) => setForm({ ...form, categoria_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {(categoriasQ.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Localização no estoque</Label>
              <Input placeholder="Ex.: Prateleira A3" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estoque mínimo</Label>
              <Input type="number" min="0" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preço de custo</Label>
              <Input type="number" min="0" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preço de venda</Label>
              <Input type="number" min="0" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} id="ativo" />
              <Label htmlFor="ativo" className="cursor-pointer">Medicamento ativo</Label>
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
            <AlertDialogTitle>Excluir medicamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente. Se o produto possui histórico de vendas ou compras, prefira desativá-lo.
            </AlertDialogDescription>
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
