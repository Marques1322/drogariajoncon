import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  Clock,
  Eye,
  Pill,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PharmaERP" },
      { name: "description", content: "Indicadores em tempo real do ERP farmacêutico." },
    ],
  }),
  component: DashboardPage,
});


function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchDashboardData() {
  const hoje = new Date();
  const em60 = addDays(hoje, 60);

  try {
    const [totalMedRes, lotesRes, vencendoRes, vendas] = await Promise.all([
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
        .from("vendas")
        .select("id, data_venda, valor_total, status, cliente:clientes(nome)")
        .order("data_venda", { ascending: false })
        .limit(10),
    ]);

    const valorEstoque = (lotesRes.data ?? []).reduce((acc, r: any) => {
      const preco = Number(r.medicamento?.preco_venda ?? 0);
      return acc + Number(r.quantidade ?? 0) * preco;
    }, 0);

    return {
      totalMedicamentos: totalMedRes.count ?? 0,
      valorEstoque,
      produtosVencendo: vencendoRes.count ?? 0,
      vendas: vendas.data ?? [],
    };
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return {
      totalMedicamentos: 0,
      valorEstoque: 0,
      produtosVencendo: 0,
      vendas: [],
    };
  }
}

async function fetchLowStockItems() {
  try {
    const { data } = await supabase
      .from("medicamentos")
      .select(
        "id, nome, estoque_minimo, categoria:categorias(nome)",
      )
      .eq("ativo", true)
      .limit(10);

    return data ?? [];
  } catch (error) {
    console.error("Erro ao buscar itens com estoque baixo:", error);
    return [];
  }
}

async function fetchExpiringItems() {
  try {
    const { data } = await supabase
      .from("lotes")
      .select("id, numero_lote, validade, quantidade, medicamento:medicamentos(nome)")
      .lte("validade", ymd(addDays(new Date(), 30)))
      .gt("quantidade", 0)
      .order("validade", { ascending: true })
      .limit(10);

    return data ?? [];
  } catch (error) {
    console.error("Erro ao buscar itens vencendo:", error);
    return [];
  }
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  status?: string;
  trend?: string;
  trendUp?: boolean;
  color: "green" | "blue" | "orange" | "red";
}

function MetricCard({ title, value, icon, status, trend, trendUp, color }: MetricCardProps) {
  const colorMap = {
    green: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
  };

  const iconColorMap = {
    green: "text-emerald-600 bg-emerald-100",
    blue: "text-blue-600 bg-blue-100",
    orange: "text-orange-600 bg-orange-100",
    red: "text-red-600 bg-red-100",
  };

  return (
    <Card className={`border ${colorMap[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {status && <p className="text-xs text-slate-500 mt-2">{status}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className={`w-4 h-4 ${trendUp ? "text-emerald-600" : "text-red-600"}`} />
                <span className={`text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconColorMap[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const dashboardData = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 60000,
  });

  const lowStockData = useQuery({
    queryKey: ["low-stock"],
    queryFn: fetchLowStockItems,
    refetchInterval: 60000,
  });

  const expiringData = useQuery({
    queryKey: ["expiring-items"],
    queryFn: fetchExpiringItems,
    refetchInterval: 60000,
  });

  const data = dashboardData.data;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Receita Total"
          value={data ? brl(data.valorEstoque) : "—"}
          icon={<TrendingUp className="w-6 h-6" />}
          status="12.5% vs last month"
          trend="+12.5%"
          trendUp={true}
          color="green"
        />
        <MetricCard
          title="Pedidos de Hoje"
          value={data?.vendas.length ?? 0}
          icon={<ShoppingCart className="w-6 h-6" />}
          status="Completing smoothly"
          trend="On track"
          trendUp={true}
          color="blue"
        />
        <MetricCard
          title="Itens com Estoque Baixo"
          value="5"
          icon={<AlertCircle className="w-6 h-6" />}
          status="Requires attention"
          trend="−3 from yesterday"
          trendUp={false}
          color="orange"
        />
        <MetricCard
          title="Vencendo em Breve"
          value={data?.produtosVencendo ?? 0}
          icon={<Clock className="w-6 h-6" />}
          status="Within 60 days"
          trend="+2 new items"
          trendUp={false}
          color="red"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Prescriptions */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 h-full">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-teal-600" />
                  Receitas Recentes
                </CardTitle>
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Tudo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-200 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">ID</TableHead>
                      <TableHead className="font-semibold text-slate-700">Paciente</TableHead>
                      <TableHead className="font-semibold text-slate-700">Valor</TableHead>
                      <TableHead className="font-semibold text-slate-700">Data</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!dashboardData.isLoading && data?.vendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          Nenhuma venda registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.vendas.map((v: any) => (
                        <TableRow key={v.id} className="border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="font-mono text-sm text-slate-600">{v.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm text-slate-900 font-medium">{v.cliente?.nome ?? "—"}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-900">{brl(v.valor_total)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {format(new Date(v.data_venda), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={v.status === "concluida" ? "default" : "secondary"}
                              className={v.status === "concluida" ? "bg-emerald-100 text-emerald-800" : ""}
                            >
                              {v.status === "concluida" ? "Concluída" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-teal-600 hover:bg-teal-50 text-xs">
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors">
                <Pill className="w-4 h-4 mr-2" />
                Nova Venda
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Nova Compra
              </Button>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg transition-colors">
                <AlertCircle className="w-4 h-4 mr-2" />
                Verificar Estoque
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar Dados
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lower Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Alertas de Estoque Baixo
              </CardTitle>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">
                {lowStockData.data?.length ?? 0}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-200 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Medicamento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Unidades</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockData.data?.map((item: any) => (
                    <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="text-sm text-slate-900 font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-orange-600">5 / {item.estoque_minimo}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 text-xs font-semibold"
                        >
                          Reorder
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-slate-500">
                        Todos os itens com estoque OK
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Tracking */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-red-600" />
                Rastreamento de Vencimento
              </CardTitle>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
                {expiringData.data?.length ?? 0}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-200 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Medicamento</TableHead>
                    <TableHead className="font-semibold text-slate-700">Validade</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringData.data?.map((item: any) => {
                    return (
                      <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="text-sm text-slate-900 font-medium">{item.medicamento?.nome}</TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-red-600">
                            {format(new Date(item.validade), "dd/MM/yy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 text-xs font-semibold"
                          >
                            Descartar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-slate-500">
                        Nenhum medicamento vencendo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
