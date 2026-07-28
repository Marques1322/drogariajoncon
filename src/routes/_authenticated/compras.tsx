import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Search, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras — PharmaERP" },
      {
        name: "description",
        content: "Registro de notas fiscais de compra e entrada automática no estoque.",
      },
    ],
  }),
  component: ComprasPage,
});

type ItemLinha = {
  medicamento_id: string;
  numero_lote: string;
  validade: string;
  quantidade: string;
  preco_unitario: string;
};
type ParcelaLinha = { valor: string; data_vencimento: string; forma_pagamento: string };

function ComprasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const listQ = useQuery({
    queryKey: ["compras", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select(
          "id, numero_nota, data_compra, valor_total, status, observacoes, fornecedor:fornecedores(id, razao_social), itens:compras_itens(id, quantidade, preco_unitario, subtotal, medicamento:medicamentos(nome), lote:lotes(numero_lote, validade))",
        )
        .order("data_compra", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (!search.trim()) return rows;
      const s = search.trim().toLowerCase();
      return rows.filter(
        (r) =>
          (r.numero_nota ?? "").toLowerCase().includes(s) ||
          (r.fornecedor?.razao_social ?? "").toLowerCase().includes(s),
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6" /> Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            Notas fiscais de entrada. Ao salvar, os lotes e o estoque são atualizados
            automaticamente.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova compra
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nº nota ou fornecedor..."
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
                  <TableHead>Nº Nota</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
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
                      Nenhuma compra registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  listQ.data!.map((c: any) => (
                    <>
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                      >
                        <TableCell>
                          {expanded[c.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.numero_nota ?? "—"}</TableCell>
                        <TableCell>{c.fornecedor?.razao_social ?? "—"}</TableCell>
                        <TableCell>
                          {format(new Date(c.data_compra), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.status === "recebida"
                                ? "secondary"
                                : c.status === "cancelada"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {brl(Number(c.valor_total))}
                        </TableCell>
                      </TableRow>
                      {expanded[c.id] && (
                        <TableRow key={`${c.id}-det`} className="bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="p-2">
                              <p className="text-xs font-semibold mb-2">Itens</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Medicamento</TableHead>
                                    <TableHead>Lote / Validade</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Preço unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(c.itens ?? []).map((it: any) => (
                                    <TableRow key={it.id}>
                                      <TableCell>{it.medicamento?.nome ?? "—"}</TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {it.lote?.numero_lote ?? "—"} •{" "}
                                        {it.lote?.validade
                                          ? format(new Date(it.lote.validade), "dd/MM/yyyy")
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">{it.quantidade}</TableCell>
                                      <TableCell className="text-right">
                                        {brl(Number(it.preco_unitario))}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {brl(Number(it.subtotal ?? 0))}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {c.observacoes && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Obs.: {c.observacoes}
                                </p>
                              )}
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

      <NovaCompraDialog
        open={open}
        onOpenChange={setOpen}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["compras"] });
          qc.invalidateQueries({ queryKey: ["lotes"] });
          qc.invalidateQueries({ queryKey: ["movimentacoes"] });
          qc.invalidateQueries({ queryKey: ["contas-pagar"] });
        }}
      />
    </div>
  );
}

function NovaCompraDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [fornecedorId, setFornecedorId] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemLinha[]>([
    { medicamento_id: "", numero_lote: "", validade: "", quantidade: "", preco_unitario: "" },
  ]);
  const [parcelas, setParcelas] = useState<ParcelaLinha[]>([]);
  const [novoFornOpen, setNovoFornOpen] = useState(false);

  const fornQ = useQuery({
    queryKey: ["forns-options"],
    queryFn: async () =>
      (
        await supabase
          .from("fornecedores")
          .select("id, razao_social")
          .eq("ativo", true)
          .order("razao_social")
      ).data ?? [],
  });
  const medsQ = useQuery({
    queryKey: ["meds-options-ativos"],
    queryFn: async () =>
      (
        await supabase
          .from("medicamentos")
          .select("id, nome, preco_custo")
          .eq("ativo", true)
          .order("nome")
      ).data ?? [],
  });

  const total = useMemo(
    () =>
      itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0), 0),
    [itens],
  );

  const mut = useMutation({
    mutationFn: async () => {
      if (!fornecedorId) throw new Error("Selecione o fornecedor");
      const items = itens
        .filter(
          (i) =>
            i.medicamento_id &&
            i.numero_lote &&
            i.validade &&
            Number(i.quantidade) > 0 &&
            Number(i.preco_unitario) > 0,
        )
        .map((i) => ({
          medicamento_id: i.medicamento_id,
          numero_lote: i.numero_lote,
          validade: i.validade,
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
        }));
      if (items.length === 0) throw new Error("Adicione ao menos um item");

      const parcs = parcelas
        .filter((p) => Number(p.valor) > 0 && p.data_vencimento)
        .map((p) => ({
          valor: Number(p.valor),
          data_vencimento: p.data_vencimento,
          forma_pagamento: p.forma_pagamento || null,
          descricao: `Duplicata compra ${numeroNota}`,
        }));

      const { error } = await supabase.rpc("registrar_compra", {
        p_fornecedor_id: fornecedorId,
        p_numero_nota: numeroNota,
        p_data_compra: dataCompra,
        p_observacoes: observacoes,
        p_itens: items as any,
        p_parcelas: parcs as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compra registrada e estoque atualizado.");
      onOpenChange(false);
      setFornecedorId("");
      setNumeroNota("");
      setObservacoes("");
      setItens([
        { medicamento_id: "", numero_lote: "", validade: "", quantidade: "", preco_unitario: "" },
      ]);
      setParcelas([]);
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar."),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nova nota fiscal de compra</DialogTitle>
            <DialogDescription>
              Selecione o fornecedor, adicione os medicamentos com lote e validade, e as duplicatas
              do pagamento (opcional).
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="space-y-4 max-h-[75vh] overflow-y-auto pr-2"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Fornecedor *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setNovoFornOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Criar Novo Fornecedor
                  </Button>
                </div>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(fornQ.data ?? []).length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                        Nenhum fornecedor encontrado. Cadastre um para continuar.
                      </div>
                    ) : (
                      (fornQ.data ?? []).map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.razao_social}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da compra *</Label>
                <Input
                  type="date"
                  value={dataCompra}
                  onChange={(e) => setDataCompra(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Nº da nota</Label>
                <Input
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  placeholder="Ex.: 000123456"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens da nota</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItens([
                      ...itens,
                      {
                        medicamento_id: "",
                        numero_lote: "",
                        validade: "",
                        quantidade: "",
                        preco_unitario: "",
                      },
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
                      <TableHead>Nº Lote</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="w-24">Qtd</TableHead>
                      <TableHead className="w-28">Preço unit.</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it, idx) => {
                      const sub = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
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
                                            x.preco_unitario || String(m?.preco_custo ?? ""),
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
                          <TableCell>
                            <Input
                              value={it.numero_lote}
                              onChange={(e) =>
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx ? { ...x, numero_lote: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={it.validade}
                              onChange={(e) =>
                                setItens(
                                  itens.map((x, i) =>
                                    i === idx ? { ...x, validade: e.target.value } : x,
                                  ),
                                )
                              }
                            />
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
              <p className="text-right text-sm mt-2">
                Total da nota: <span className="font-semibold">{brl(total)}</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Duplicatas (contas a pagar)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (total > 0)
                        setParcelas([
                          {
                            valor: String(total),
                            data_vencimento: new Date(Date.now() + 30 * 86400000)
                              .toISOString()
                              .slice(0, 10),
                            forma_pagamento: "boleto",
                          },
                        ]);
                    }}
                  >
                    À vista (1x)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setParcelas([
                        ...parcelas,
                        { valor: "", data_vencimento: "", forma_pagamento: "" },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Duplicata
                  </Button>
                </div>
              </div>
              {parcelas.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma duplicata. A compra ficará sem lançamentos financeiros.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Forma prevista</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelas.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={p.valor}
                              onChange={(e) =>
                                setParcelas(
                                  parcelas.map((x, i) =>
                                    i === idx ? { ...x, valor: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={p.data_vencimento}
                              onChange={(e) =>
                                setParcelas(
                                  parcelas.map((x, i) =>
                                    i === idx ? { ...x, data_vencimento: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.forma_pagamento}
                              onValueChange={(v) =>
                                setParcelas(
                                  parcelas.map((x, i) =>
                                    i === idx ? { ...x, forma_pagamento: v } : x,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="pix">Pix</SelectItem>
                                <SelectItem value="boleto">Boleto</SelectItem>
                                <SelectItem value="debito">Débito</SelectItem>
                                <SelectItem value="credito">Crédito</SelectItem>
                                <SelectItem value="convenio">Convênio</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setParcelas(parcelas.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Salvando..." : "Salvar compra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <NovoFornecedorRapidoDialog
        open={novoFornOpen}
        onOpenChange={setNovoFornOpen}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["forns-options"] });
          qc.invalidateQueries({ queryKey: ["fornecedores"] });
          setFornecedorId(id);
        }}
      />
    </>
  );
}

function NovoFornecedorRapidoDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const reset = () => {
    setRazaoSocial("");
    setNomeFantasia("");
    setCnpj("");
    setTelefone("");
    setEmail("");
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!razaoSocial.trim()) throw new Error("Informe a razão social.");
      const { data, error } = await supabase
        .from("fornecedores")
        .insert({
          razao_social: razaoSocial.trim(),
          nome_fantasia: nomeFantasia.trim() || null,
          cnpj: cnpj.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          ativo: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Fornecedor cadastrado.");
      onCreated(id);
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao cadastrar fornecedor."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo fornecedor</DialogTitle>
          <DialogDescription>
            Cadastro rápido. Você pode completar os demais dados depois em Fornecedores.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label>Razão social *</Label>
            <Input
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Nome fantasia</Label>
            <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
