import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Plus, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — PharmaERP" },
      { name: "description", content: "Vendas à vista e a prazo com baixa automática de estoque." },
    ],
  }),
  component: VendasPage,
});

type Item = {
  medicamento_id: string;
  quantidade: string;
  preco_unitario: string;
  desconto: string;
};

function VendasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const listQ = useQuery({
    queryKey: ["vendas", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select(
          "id, data_venda, valor_total, desconto, forma_pagamento, status, observacoes, cliente:clientes(nome), itens:vendas_itens(id, quantidade, preco_unitario, desconto, subtotal, medicamento:medicamentos(nome), lote:lotes(numero_lote))",
        )
        .order("data_venda", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (!search.trim()) return rows;
      const s = search.trim().toLowerCase();
      return rows.filter((r) => (r.cliente?.nome ?? "").toLowerCase().includes(s));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" /> Vendas
          </h1>
          <p className="text-sm text-muted-foreground">
            À vista ou a prazo. Ao salvar, o estoque é baixado (FIFO) e as parcelas viram contas a
            receber.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova venda
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente..."
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
                  <TableHead className="w-8" />
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (listQ.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  listQ.data!.map((v: any) => (
                    <>
                      <TableRow
                        key={v.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded((e) => ({ ...e, [v.id]: !e[v.id] }))}
                      >
                        <TableCell>
                          {expanded[v.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(v.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{v.cliente?.nome ?? "Consumidor"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.forma_pagamento}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              v.status === "concluida"
                                ? "secondary"
                                : v.status === "cancelada"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {brl(Number(v.valor_total))}
                        </TableCell>
                      </TableRow>
                      {expanded[v.id] && (
                        <TableRow key={`${v.id}-d`} className="bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="p-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Medicamento</TableHead>
                                    <TableHead>Lote</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Preço</TableHead>
                                    <TableHead className="text-right">Desconto</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(v.itens ?? []).map((it: any) => (
                                    <TableRow key={it.id}>
                                      <TableCell>{it.medicamento?.nome ?? "—"}</TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {it.lote?.numero_lote ?? "—"}
                                      </TableCell>
                                      <TableCell className="text-right">{it.quantidade}</TableCell>
                                      <TableCell className="text-right">
                                        {brl(Number(it.preco_unitario))}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {brl(Number(it.desconto ?? 0))}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {brl(Number(it.subtotal ?? 0))}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NovaVendaDialog
        open={open}
        onOpenChange={setOpen}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["vendas"] });
          qc.invalidateQueries({ queryKey: ["lotes"] });
          qc.invalidateQueries({ queryKey: ["contas-receber"] });
          qc.invalidateQueries({ queryKey: ["fluxo"] });
        }}
      />
    </div>
  );
}

function NovaVendaDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [clienteId, setClienteId] = useState<string>("");
  const [modo, setModo] = useState<"vista" | "prazo">("vista");
  const [forma, setForma] = useState("dinheiro");
  const [desconto, setDesconto] = useState("0");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<Item[]>([
    { medicamento_id: "", quantidade: "", preco_unitario: "", desconto: "0" },
  ]);
  const [numParcelas, setNumParcelas] = useState("1");
  const [primeiroVenc, setPrimeiroVenc] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );

  const cliQ = useQuery({
    queryKey: ["cli-options"],
    queryFn: async () =>
      (
        await supabase
          .from("clientes")
          .select("id, nome, limite_credito")
          .eq("ativo", true)
          .order("nome")
      ).data ?? [],
  });
  const medsQ = useQuery({
    queryKey: ["meds-com-estoque"],
    queryFn: async () => {
      const { data } = await supabase
        .from("medicamentos")
        .select("id, nome, preco_venda, lotes(quantidade)")
        .eq("ativo", true)
        .order("nome");
      return (data ?? []).map((m: any) => ({
        ...m,
        estoque: (m.lotes ?? []).reduce((s: number, x: any) => s + (x.quantidade ?? 0), 0),
      }));
    },
  });

  const total = useMemo(
    () =>
      itens.reduce(
        (s, i) =>
          s +
          (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0) -
          (Number(i.desconto) || 0),
        0,
      ) - (Number(desconto) || 0),
    [itens, desconto],
  );

  const mut = useMutation({
    mutationFn: async () => {
      const items = itens
        .filter((i) => i.medicamento_id && Number(i.quantidade) > 0 && Number(i.preco_unitario) > 0)
        .map((i) => ({
          medicamento_id: i.medicamento_id,
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
          desconto: Number(i.desconto) || 0,
        }));
      if (items.length === 0) throw new Error("Adicione ao menos um item");

      const parcs: any[] = [];
      if (modo === "prazo") {
        if (!clienteId) throw new Error("Cliente é obrigatório para vendas a prazo");
        const n = Math.max(1, parseInt(numParcelas, 10) || 1);
        const valorParc = +(total / n).toFixed(2);
        for (let i = 0; i < n; i++) {
          const d = new Date(primeiroVenc);
          d.setMonth(d.getMonth() + i);
          parcs.push({
            descricao: `Parcela ${i + 1}/${n}`,
            valor: i === n - 1 ? +(total - valorParc * (n - 1)).toFixed(2) : valorParc,
            data_vencimento: d.toISOString().slice(0, 10),
          });
        }
      }

      const { error } = await supabase.rpc("registrar_venda", {
        p_cliente_id: clienteId || (null as any),
        p_forma_pagamento: forma as any,
        p_desconto: Number(desconto) || 0,
        p_observacoes: obs,
        p_itens: items as any,
        p_parcelas: parcs as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venda registrada.");
      setClienteId("");
      setDesconto("0");
      setObs("");
      setItens([{ medicamento_id: "", quantidade: "", preco_unitario: "", desconto: "0" }]);
      setNumParcelas("1");
      setModo("vista");
      setForma("dinheiro");
      onOpenChange(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Nova venda</DialogTitle>
          <DialogDescription>
            À vista ou a prazo. Estoque é baixado automaticamente pelo lote mais próximo do
            vencimento.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Cliente {modo === "prazo" && <span className="text-destructive">*</span>}
                </Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Consumidor final" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cliQ.data ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={modo} onValueChange={(v) => setModo(v as any)}>
              <TabsList>
                <TabsTrigger value="vista">À vista</TabsTrigger>
                <TabsTrigger value="prazo">A prazo</TabsTrigger>
              </TabsList>
            </Tabs>

            {modo === "prazo" && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-md border p-3">
                <div className="space-y-2">
                  <Label>Nº de parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primeiro vencimento</Label>
                  <Input
                    type="date"
                    value={primeiroVenc}
                    onChange={(e) => setPrimeiroVenc(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItens([
                      ...itens,
                      { medicamento_id: "", quantidade: "", preco_unitario: "", desconto: "0" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Item
                </Button>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicamento</TableHead>
                      <TableHead className="w-24">Estoque</TableHead>
                      <TableHead className="w-24">Qtd</TableHead>
                      <TableHead className="w-28">Preço</TableHead>
                      <TableHead className="w-24">Desc.</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it, idx) => {
                      const med = (medsQ.data ?? []).find((m: any) => m.id === it.medicamento_id);
                      const sub =
                        (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0) -
                        (Number(it.desconto) || 0);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={it.medicamento_id}
                              onValueChange={(v) => {
                                const m = (medsQ.data ?? []).find((x: any) => x.id === v);
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          medicamento_id: v,
                                          preco_unitario:
                                            x.preco_unitario || String(m?.preco_venda ?? ""),
                                        }
                                      : x,
                                  ),
                                );
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(medsQ.data ?? []).map((m: any) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {med?.estoque ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={it.quantidade}
                              onChange={(e) =>
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx ? { ...x, quantidade: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.preco_unitario}
                              onChange={(e) =>
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx ? { ...x, preco_unitario: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.desconto}
                              onChange={(e) =>
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx ? { ...x, desconto: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">{brl(sub)}</TableCell>
                          <TableCell>
                            {itens.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Desconto geral</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end items-end">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{brl(total)}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
