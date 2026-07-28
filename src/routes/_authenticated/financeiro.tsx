import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — PharmaERP" },
      {
        name: "description",
        content: "Fluxo de caixa, receitas, despesas, lucro mensal e indicadores.",
      },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimHoje = hoje.toISOString().slice(0, 10);
  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(fimHoje);

  const fluxoQ = useQuery({
    queryKey: ["fluxo", de, ate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fluxo_caixa")
        .select("id, data_movimento, tipo, categoria, valor, descricao")
        .gte("data_movimento", de)
        .lte("data_movimento", ate)
        .order("data_movimento", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { entradas, saidas, lucro, porDia, porCategoria } = useMemo(() => {
    const rows = fluxoQ.data ?? [];
    let entradas = 0,
      saidas = 0;
    const dias: Record<string, { data: string; entradas: number; saidas: number }> = {};
    const cats: Record<string, { categoria: string; entradas: number; saidas: number }> = {};
    rows.forEach((r) => {
      const v = Number(r.valor);
      const d = r.data_movimento;
      if (!dias[d]) dias[d] = { data: d, entradas: 0, saidas: 0 };
      const cat = r.categoria ?? "Outros";
      if (!cats[cat]) cats[cat] = { categoria: cat, entradas: 0, saidas: 0 };
      if (r.tipo === "entrada") {
        entradas += v;
        dias[d].entradas += v;
        cats[cat].entradas += v;
      } else {
        saidas += v;
        dias[d].saidas += v;
        cats[cat].saidas += v;
      }
    });
    return {
      entradas,
      saidas,
      lucro: entradas - saidas,
      porDia: Object.values(dias).sort((a, b) => a.data.localeCompare(b.data)),
      porCategoria: Object.values(cats).sort(
        (a, b) => b.entradas + b.saidas - (a.entradas + a.saidas),
      ),
    };
  }, [fluxoQ.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">
          Fluxo de caixa, receitas, despesas e indicadores por período.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
          <div className="space-y-2 flex-1">
            <Label>De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" /> Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{brl(entradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-destructive" /> Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{brl(saidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Lucro / saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${lucro >= 0 ? "text-emerald-600" : "text-destructive"}`}
            >
              {brl(lucro)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Movimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{(fluxoQ.data ?? []).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo diário</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(Number(v))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Receitas"
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Despesas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCategoria}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(Number(v))} />
                <Legend />
                <Bar dataKey="entradas" fill="hsl(var(--primary))" name="Receitas" />
                <Bar dataKey="saidas" fill="hsl(var(--destructive))" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fluxoQ.data ?? []).slice(0, 100).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.data_movimento}</TableCell>
                    <TableCell>
                      <Badge variant={r.tipo === "entrada" ? "secondary" : "destructive"}>
                        {r.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.categoria ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.descricao ?? "—"}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${r.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {r.tipo === "entrada" ? "+" : "-"}
                      {brl(Number(r.valor))}
                    </TableCell>
                  </TableRow>
                ))}
                {(fluxoQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Sem lançamentos no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
