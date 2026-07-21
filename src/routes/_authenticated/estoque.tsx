import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Warehouse, Plus, ArrowDownToLine, ArrowUpFromLine, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — PharmaERP" },
      { name: "description", content: "Movimentações de entrada e saída, lotes e validades." },
    ],
  }),
  component: EstoquePage,
});

type MovTipo = "entrada" | "saida" | "ajuste" | "perda" | "devolucao";

const TIPO_LABEL: Record<MovTipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  perda: "Perda",
  devolucao: "Devolução",
};

const TIPO_VARIANT: Record<MovTipo, "default" | "secondary" | "destructive" | "outline"> = {
  entrada: "default",
  saida: "secondary",
  ajuste: "outline",
  perda: "destructive",
  devolucao: "outline",
};

type MedOption = { id: string; nome: string; estoque_minimo: number };
type LoteRow = {
  id: string;
  numero_lote: string;
  validade: string;
  quantidade: number;
  preco_custo: number | null;
  medicamento: { id: string; nome: string; estoque_minimo: number } | null;
};
type MovRow = {
  id: string;
  data_movimento: string;
  tipo: MovTipo;
  quantidade: number;
  observacao: string | null;
  created_by: string | null;
  medicamento: { nome: string } | null;
  lote: { numero_lote: string } | null;
  profile: { nome_completo: string | null } | null;
};

function EstoquePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("lotes");
  const [search, setSearch] = useState("");
  const [movOpen, setMovOpen] = useState(false);
  const [loteOpen, setLoteOpen] = useState(false);

  const medsQ = useQuery({
    queryKey: ["meds-options"],
    queryFn: async (): Promise<MedOption[]> => {
      const { data, error } = await supabase
        .from("medicamentos")
        .select("id, nome, estoque_minimo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as MedOption[];
    },
  });

  const lotesQ = useQuery({
    queryKey: ["lotes", search],
    queryFn: async (): Promise<LoteRow[]> => {
      let q = supabase
        .from("lotes")
        .select("id, numero_lote, validade, quantidade, preco_custo, medicamento:medicamentos(id, nome, estoque_minimo)")
        .order("validade", { ascending: true })
        .limit(200);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as LoteRow[];
      if (!search.trim()) return rows;
      const s = search.trim().toLowerCase();
      return rows.filter(
        (l) =>
          l.numero_lote.toLowerCase().includes(s) ||
          (l.medicamento?.nome ?? "").toLowerCase().includes(s),
      );
    },
  });

  const movsQ = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async (): Promise<MovRow[]> => {
      const { data, error } = await supabase
        .from("estoque_movimentacoes")
        .select(
          "id, data_movimento, tipo, quantidade, observacao, created_by, medicamento:medicamentos(nome), lote:lotes(numero_lote)",
        )
        .order("data_movimento", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
      let profiles: Record<string, string | null> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome_completo").in("id", userIds);
        (profs ?? []).forEach((p: any) => (profiles[p.id] = p.nome_completo));
      }
      return rows.map((r) => ({
        ...r,
        profile: r.created_by ? { nome_completo: profiles[r.created_by] ?? null } : null,
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Warehouse className="h-6 w-6" /> Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de lotes, validades e movimentações de entrada e saída.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLoteOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo lote
          </Button>
          <Button onClick={() => setMovOpen(true)}>
            <ArrowDownToLine className="h-4 w-4 mr-1" /> Nova movimentação
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="lotes">Lotes e saldos</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por medicamento ou número do lote..."
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
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço custo</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesQ.isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : (lotesQ.data ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lote encontrado.</TableCell></TableRow>
                    ) : (
                      lotesQ.data!.map((l) => {
                        const validade = new Date(l.validade);
                        const dias = Math.floor((validade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const vencido = dias < 0;
                        const vencendo = !vencido && dias <= 60;
                        const baixo = l.medicamento && l.quantidade < l.medicamento.estoque_minimo;
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.medicamento?.nome ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{l.numero_lote}</TableCell>
                            <TableCell>
                              {format(validade, "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right font-medium">{l.quantidade}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {l.preco_custo != null ? Number(l.preco_custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {vencido && <Badge variant="destructive">Vencido</Badge>}
                                {vencendo && <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Vence em {dias}d</Badge>}
                                {baixo && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Estoque baixo
                                  </Badge>
                                )}
                                {!vencido && !vencendo && !baixo && <Badge variant="secondary">OK</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader><CardTitle className="text-base">Últimas movimentações</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movsQ.isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : (movsQ.data ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma movimentação registrada.</TableCell></TableRow>
                    ) : (
                      movsQ.data!.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">
                            {format(new Date(m.data_movimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={TIPO_VARIANT[m.tipo]}>{TIPO_LABEL[m.tipo]}</Badge>
                          </TableCell>
                          <TableCell>{m.medicamento?.nome ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{m.lote?.numero_lote ?? "—"}</TableCell>
                          <TableCell className={`text-right font-medium ${m.quantidade >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {m.quantidade > 0 ? "+" : ""}{m.quantidade}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.profile?.nome_completo ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{m.observacao ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaMovimentacaoDialog
        open={movOpen}
        onOpenChange={setMovOpen}
        meds={medsQ.data ?? []}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["lotes"] });
          qc.invalidateQueries({ queryKey: ["movimentacoes"] });
        }}
      />
      <NovoLoteDialog
        open={loteOpen}
        onOpenChange={setLoteOpen}
        meds={medsQ.data ?? []}
        onDone={() => qc.invalidateQueries({ queryKey: ["lotes"] })}
      />
    </div>
  );
}

function NovaMovimentacaoDialog({
  open, onOpenChange, meds, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meds: MedOption[];
  onDone: () => void;
}) {
  const [medicamentoId, setMedicamentoId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [tipo, setTipo] = useState<MovTipo>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const lotesQ = useQuery({
    queryKey: ["lotes-do-med", medicamentoId],
    enabled: !!medicamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero_lote, validade, quantidade")
        .eq("medicamento_id", medicamentoId)
        .order("validade");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const qtd = parseInt(quantidade, 10);
      if (!medicamentoId || !loteId) throw new Error("Selecione medicamento e lote");
      if (!qtd || qtd === 0) throw new Error("Quantidade inválida");
      const { error } = await supabase.rpc("registrar_movimentacao_estoque", {
        p_medicamento_id: medicamentoId,
        p_lote_id: loteId,
        p_tipo: tipo,
        p_quantidade: qtd,
        p_observacao: observacao.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada.");
      setMedicamentoId(""); setLoteId(""); setQuantidade(""); setObservacao(""); setTipo("entrada");
      onOpenChange(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Registre entrada, saída, perda, devolução ou ajuste. O estoque do lote é atualizado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as MovTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada"><ArrowDownToLine className="h-4 w-4 inline mr-2" />Entrada</SelectItem>
                <SelectItem value="saida"><ArrowUpFromLine className="h-4 w-4 inline mr-2" />Saída</SelectItem>
                <SelectItem value="devolucao">Devolução</SelectItem>
                <SelectItem value="perda">Perda / vencido</SelectItem>
                <SelectItem value="ajuste">Ajuste (informe positivo ou negativo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Medicamento *</Label>
            <Select value={medicamentoId} onValueChange={(v) => { setMedicamentoId(v); setLoteId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {meds.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={setLoteId} disabled={!medicamentoId}>
              <SelectTrigger>
                <SelectValue placeholder={medicamentoId ? "Selecione um lote..." : "Escolha o medicamento antes"} />
              </SelectTrigger>
              <SelectContent>
                {(lotesQ.data ?? []).map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.numero_lote} — val. {format(new Date(l.validade), "dd/MM/yyyy")} — saldo {l.quantidade}
                  </SelectItem>
                ))}
                {(lotesQ.data ?? []).length === 0 && medicamentoId && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum lote cadastrado. Crie um lote primeiro.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              placeholder={tipo === "ajuste" ? "Ex.: -5 para reduzir, 10 para aumentar" : "Qtd. positiva"}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo / observação</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Registrando..." : "Registrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovoLoteDialog({
  open, onOpenChange, meds, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meds: MedOption[];
  onDone: () => void;
}) {
  const [medicamentoId, setMedicamentoId] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [validade, setValidade] = useState("");
  const [quantidade, setQuantidade] = useState("0");
  const [precoCusto, setPrecoCusto] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!medicamentoId || !numeroLote.trim() || !validade) throw new Error("Preencha medicamento, lote e validade");
      const { error } = await supabase.from("lotes").insert({
        medicamento_id: medicamentoId,
        numero_lote: numeroLote.trim(),
        validade,
        quantidade: parseInt(quantidade || "0", 10),
        preco_custo: precoCusto ? Number(precoCusto) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lote criado.");
      setMedicamentoId(""); setNumeroLote(""); setValidade(""); setQuantidade("0"); setPrecoCusto("");
      onOpenChange(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar lote."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lote</DialogTitle>
          <DialogDescription>Cadastre um lote antes de registrar entradas ou saídas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid gap-4">
          <div className="space-y-2">
            <Label>Medicamento *</Label>
            <Select value={medicamentoId} onValueChange={setMedicamentoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {meds.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número do lote *</Label>
              <Input value={numeroLote} onChange={(e) => setNumeroLote(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validade *</Label>
              <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quantidade inicial</Label>
              <Input type="number" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preço de custo</Label>
              <Input type="number" step="0.01" min="0" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Criar lote"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
