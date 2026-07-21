import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PharmaERP" },
      { name: "description", content: "Painel geral do ERP para gerenciamento de farmácias." },
    ],
  }),
  component: DashboardPage,
});

const cards = [
  { title: "Produtos", icon: Package, hint: "Cadastro de medicamentos e insumos" },
  { title: "Clientes", icon: Users, hint: "Base de clientes da farmácia" },
  { title: "Vendas", icon: ShoppingCart, hint: "PDV e histórico de vendas" },
  { title: "Financeiro", icon: DollarSign, hint: "Contas a pagar e receber" },
  { title: "Estoque", icon: AlertTriangle, hint: "Alertas e movimentações" },
  { title: "Relatórios", icon: TrendingUp, hint: "Indicadores e análises" },
];

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do sistema. Os módulos serão implementados um a um.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, icon: Icon, hint }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground mt-1">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
