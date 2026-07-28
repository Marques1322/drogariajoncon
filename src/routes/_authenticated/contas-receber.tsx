import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "@/lib/format";
import { useMarcarContasAtrasadas } from "@/hooks/use-marcar-atrasadas";


export const Route = createFileRoute("/_authenticated/contas-receber")({
  head: () => ({
    meta: [
      { title: "Contas a Receber — PharmaERP" },
      { name: "description", content: "Parcelas de clientes, vencimentos, pagamentos parciais e totais." },
    ],
  }),
  component: ContasReceberPage,
});


function ContasReceberPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pendente");
  const [receberId, setReceberId] = useState<string | null>(null);

  useMarcarContasAtrasadas("contas-receber");


  const listQ = useQuery({
    queryKey: ["contas-receber", tab, search],
    queryFn: async () => {
      let q = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_emissao, data_vencimento, data_recebimento, status, forma_pagamento, cliente:clientes(nome, limite_credito)")
        .order("data_vencimento", { ascending: true })
        .limit(500);
      if (tab === "vencendo") {
        const em7 = new Date(); em7.setDate(em7.getDate() + 7);
        q = q.in("status", ["pendente", "atrasado"]).lte("data_vencimento", em7.toISOString().slice(0, 10));
      } else if (tab !== "todos") q = q.eq("status", tab as any);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (!search.trim()) return rows;
      const s = search.trim().toLowerCase();
      return rows.filter((r) =>
        (r.descricao ?? "").toLowerCase().includes(s) ||
        (r.cliente?.nome ?? "").toLowerCase().includes(s),
      );
    },
  });

  const totais = (listQ.data ?? []).reduce(
    (acc: any, r: any) => {
      acc.total += Number(r.valor);
      if (r.status === "pendente") acc.pendente += Number(r.valor);
      if (r.status === "atrasado") acc.atrasado += Number(r.valor);
      if (r.status === "pago") acc.recebido += Number(r.valor);
      return acc;
    },
    { total: 0, pendente: 0, atrasado: 0, recebido: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Contas a receber
        </h1>
        <p className="text-sm text-muted-foreground">Parcelas de clientes, pagamentos totais ou parciais.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total exibido</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{brl(totais.total)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{brl(totais.pendente)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Atrasado</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold text-destructive">{brl(totais.atrasado)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Recebido</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold text-emerald-600">{brl(totais.recebido)}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="atrasado">Atrasadas</TabsTrigger>
          <TabsTrigger value="vencendo">Vence em 7 dias</TabsTrigger>
          <TabsTrigger value="pago">Pagas</TabsTrigger>
          <TabsTrigger value="todos">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por descrição ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Recebimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listQ.isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : (listQ.data ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma parcela encontrada.</TableCell></TableRow>
                    ) : listQ.data!.map((r: any) => {
                      const venc = new Date(r.data_vencimento);
                      const dias = Math.ceil((venc.getTime() - Date.now()) / 86400000);
                      const alertar = r.status !== "pago" && r.status !== "cancelado" && dias <= 7;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.descricao}</TableCell>
                          <TableCell>{r.cliente?.nome ?? "—"}</TableCell>
                          <TableCell>
                            {format(venc, "dd/MM/yyyy", { locale: ptBR })}
                            {alertar && <span className="ml-2 text-xs text-amber-600 inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />{dias < 0 ? `${-dias}d atrasada` : dias === 0 ? "hoje" : `em ${dias}d`}</span>}
                          </TableCell>
                          <TableCell>{r.data_recebimento ? format(new Date(r.data_recebimento), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                          <TableCell><Badge variant={r.status === "pago" ? "secondary" : r.status === "atrasado" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{brl(Number(r.valor))}</TableCell>
                          <TableCell>
                            {r.status !== "pago" && r.status !== "cancelado" && (
                              <Button size="sm" onClick={() => setReceberId(r.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Receber
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceberDialog id={receberId} onOpenChange={() => setReceberId(null)} conta={(listQ.data ?? []).find((r: any) => r.id === receberId)} onDone={() => { setReceberId(null); qc.invalidateQueries({ queryKey: ["contas-receber"] }); qc.invalidateQueries({ queryKey: ["fluxo"] }); qc.invalidateQueries({ queryKey: ["clientes"] }); qc.invalidateQueries({ queryKey: ["notificacoes"] }); }} />
    </div>
  );
}

function ReceberDialog({ id, conta, onOpenChange, onDone }: { id: string | null; conta: any; onOpenChange: () => void; onDone: () => void }) {
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("dinheiro");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { if (conta) setValor(String(conta.valor)); }, [conta]);

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("receber_parcela", {
        p_conta_id: id!,
        p_valor_recebido: Number(valor),
        p_forma: forma as any,
        p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Recebimento registrado."); onDone(); },
    onError: (e: any) => toast.error(e.message ?? "Erro."),
  });

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>Informe o valor recebido. Pagamentos parciais mantêm o saldo em aberto automaticamente.</DialogDescription>
        </DialogHeader>
        {conta && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-medium">{conta.descricao}</p>
              <p className="text-xs text-muted-foreground">Cliente: {conta.cliente?.nome} • Saldo: {brl(Number(conta.valor))} • Venc.: {format(new Date(conta.data_vencimento), "dd/MM/yyyy")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Valor recebido</Label><Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Forma</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onOpenChange}>Cancelar</Button>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Confirmar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
