import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Wallet,
  AlertTriangle,
  CreditCard,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PharmaERP" },
      { name: "description", content: "Indicadores em tempo real do ERP farmacêutico." },
    ],
  }),
  component: DashboardPage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchIndicators() {
  const hoje = new Date();
  const em60 = addDays(hoje, 60);
  const inicioMes = startOfMonth(hoje);

  const [
    totalMedRes,
    lotesRes,
    vencendoRes,
    apagarRes,
    areceberRes,
    faturamentoRes,
  ] = await Promise.all([
    supabase.from("medicamentos").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase
      .from("lotes")
      .select("quantidade, medicamento:medicamentos(preco_venda)")
      .gt("quantidade", 0),
    supabase
      .from("lotes")
      .select("*", { count: "exact", head: true })
      .gt("quantidade", 0)
      .lte("validade", ymd(em60))
      .gte("validade", ymd(hoje)),
    supabase
      .from("contas_pagar")
      .select("valor")
      .in("status", ["pendente", "atrasado"]),
    supabase
      .from("contas_receber")
      .select("valor")
      .in("status", ["pendente", "atrasado"]),
    supabase
      .from("vendas")
      .select("valor_total")
      .eq("status", "concluida")
      .gte("data_venda", inicioMes.toISOString()),
  ]);

  const valorEstoque = (lotesRes.data ?? []).reduce((acc, r: any) => {
    const preco = Number(r.medicamento?.preco_venda ?? 0);
    return acc + Number(r.quantidade ?? 0) * preco;
  }, 0);
  const totalAPagar = (apagarRes.data ?? []).reduce((a, r: any) => a + Number(r.valor ?? 0), 0);
  const totalAReceber = (areceberRes.data ?? []).reduce((a, r: any) => a + Number(r.valor ?? 0), 0);
  const faturamentoMes = (faturamentoRes.data ?? []).reduce(
    (a, r: any) => a + Number(r.valor_total ?? 0),
    0,
  );

  return {
    totalMedicamentos: totalMedRes.count ?? 0,
    valorEstoque,
    produtosVencendo: vencendoRes.count ?? 0,
    totalAPagar,
    totalAReceber,
    faturamentoMes,
  };
}

async function fetchVendasDiarias() {
  const inicio = addDays(new Date(), -29);
  const { data } = await supabase
    .from("vendas")
    .select("data_venda, valor_total, status")
    .eq("status", "concluida")
    .gte("data_venda", inicio.toISOString());

  const bucket = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = addDays(inicio, i);
    bucket.set(ymd(d), 0);
  }
  (data ?? []).forEach((v: any) => {
    const key = String(v.data_venda).slice(0, 10);
    bucket.set(key, (bucket.get(key) ?? 0) + Number(v.valor_total ?? 0));
  });
  return Array.from(bucket.entries()).map(([data, total]) => ({
    data: data.slice(5),
    total,
  }));
}

async function fetchFluxoMensal() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const [pagar, receber] = await Promise.all([
    supabase.from("contas_pagar").select("valor, data_vencimento").gte("data_vencimento", ymd(inicio)),
    supabase.from("contas_receber").select("valor, data_vencimento").gte("data_vencimento", ymd(inicio)),
  ]);
  const meses: { key: string; label: string; a_pagar: number; a_receber: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      a_pagar: 0,
      a_receber: 0,
    });
  }
  const map = new Map(meses.map((m) => [m.key, m]));
  (pagar.data ?? []).forEach((r: any) => {
    const k = String(r.data_vencimento).slice(0, 7);
    const m = map.get(k);
    if (m) m.a_pagar += Number(r.valor ?? 0);
  });
  (receber.data ?? []).forEach((r: any) => {
    const k = String(r.data_vencimento).slice(0, 7);
    const m = map.get(k);
    if (m) m.a_receber += Number(r.valor ?? 0);
  });
  return meses;
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneCls =
    tone === "warning"
      ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
      : tone === "success"
        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
        : tone === "danger"
          ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
          : "text-primary bg-primary/10";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const indicators = useQuery({
    queryKey: ["dashboard", "indicators"],
    queryFn: fetchIndicators,
    refetchInterval: 60_000,
  });
  const vendas = useQuery({
    queryKey: ["dashboard", "vendas-30d"],
    queryFn: fetchVendasDiarias,
    refetchInterval: 60_000,
  });
  const fluxo = useQuery({
    queryKey: ["dashboard", "fluxo-6m"],
    queryFn: fetchFluxoMensal,
    refetchInterval: 60_000,
  });

  const i = indicators.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real da sua operação.</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Atualiza a cada 60s
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Medicamentos"
          value={i ? String(i.totalMedicamentos) : "—"}
          icon={Package}
          hint="Cadastros ativos"
        />
        <StatCard
          title="Valor do estoque"
          value={i ? brl(i.valorEstoque) : "—"}
          icon={Wallet}
          tone="success"
          hint="A preço de venda"
        />
        <StatCard
          title="Produtos vencendo"
          value={i ? String(i.produtosVencendo) : "—"}
          icon={AlertTriangle}
          tone="warning"
          hint="Nos próximos 60 dias"
        />
        <StatCard
          title="Contas a pagar"
          value={i ? brl(i.totalAPagar) : "—"}
          icon={CreditCard}
          tone="danger"
          hint="Pendentes e atrasadas"
        />
        <StatCard
          title="Contas a receber"
          value={i ? brl(i.totalAReceber) : "—"}
          icon={DollarSign}
          tone="success"
          hint="Pendentes e atrasadas"
        />
        <StatCard
          title="Faturamento do mês"
          value={i ? brl(i.faturamentoMes) : "—"}
          icon={TrendingUp}
          tone="success"
          hint="Vendas finalizadas"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Vendas nos últimos 30 dias
            </CardTitle>
            <CardDescription>Total finalizado por dia</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vendas.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" /> Fluxo financeiro
            </CardTitle>
            <CardDescription>A pagar vs a receber (6 meses)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxo.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Bar dataKey="a_receber" name="A receber" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="a_pagar" name="A pagar" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
