import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — PharmaERP" },
      { name: "description", content: "Relatórios de estoque, compras, vendas, contas e fluxo financeiro em PDF e Excel." },
    ],
  }),
  component: RelatoriosPage,
});

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Report = {
  id: string;
  titulo: string;
  descricao: string;
  usaPeriodo?: boolean;
  fetch: (params: { de: string; ate: string }) => Promise<{ headers: string[]; rows: (string | number)[][] }>;
};

const relatorios: Report[] = [
  {
    id: "estoque",
    titulo: "Estoque atual",
    descricao: "Todos os lotes ativos, quantidades, validades e valor.",
    fetch: async () => {
      const { data } = await supabase
        .from("lotes")
        .select("numero_lote, validade, quantidade, preco_custo, medicamento:medicamentos(nome, codigo_interno)")
        .gt("quantidade", 0)
        .order("validade");
      return {
        headers: ["Medicamento", "Código", "Lote", "Validade", "Qtd", "Preço custo", "Total"],
        rows: (data ?? []).map((l: any) => [
          l.medicamento?.nome ?? "", l.medicamento?.codigo_interno ?? "",
          l.numero_lote, l.validade, l.quantidade,
          brl(Number(l.preco_custo ?? 0)), brl(Number(l.preco_custo ?? 0) * l.quantidade),
        ]),
      };
    },
  },
  {
    id: "vencidos",
    titulo: "Medicamentos vencidos e a vencer (60 dias)",
    descricao: "Lotes vencidos ou com validade próxima.",
    fetch: async () => {
      const em60 = new Date(); em60.setDate(em60.getDate() + 60);
      const { data } = await supabase
        .from("lotes")
        .select("numero_lote, validade, quantidade, medicamento:medicamentos(nome)")
        .gt("quantidade", 0)
        .lte("validade", em60.toISOString().slice(0, 10))
        .order("validade");
      return {
        headers: ["Medicamento", "Lote", "Validade", "Quantidade", "Situação"],
        rows: (data ?? []).map((l: any) => {
          const dias = Math.ceil((new Date(l.validade).getTime() - Date.now()) / 86400000);
          return [l.medicamento?.nome ?? "", l.numero_lote, l.validade, l.quantidade, dias < 0 ? `Vencido há ${-dias}d` : `Vence em ${dias}d`];
        }),
      };
    },
  },
  {
    id: "compras",
    titulo: "Compras",
    descricao: "Notas fiscais de compra no período.",
    usaPeriodo: true,
    fetch: async ({ de, ate }) => {
      const { data } = await supabase
        .from("compras")
        .select("numero_nota, data_compra, valor_total, status, fornecedor:fornecedores(razao_social)")
        .gte("data_compra", de).lte("data_compra", ate)
        .order("data_compra", { ascending: false });
      return {
        headers: ["Data", "Nº Nota", "Fornecedor", "Status", "Valor"],
        rows: (data ?? []).map((c: any) => [c.data_compra, c.numero_nota ?? "", c.fornecedor?.razao_social ?? "", c.status, brl(Number(c.valor_total))]),
      };
    },
  },
  {
    id: "vendas",
    titulo: "Vendas",
    descricao: "Vendas realizadas no período.",
    usaPeriodo: true,
    fetch: async ({ de, ate }) => {
      const { data } = await supabase
        .from("vendas")
        .select("data_venda, valor_total, desconto, forma_pagamento, status, cliente:clientes(nome)")
        .gte("data_venda", `${de}T00:00:00`).lte("data_venda", `${ate}T23:59:59`)
        .order("data_venda", { ascending: false });
      return {
        headers: ["Data", "Cliente", "Pagamento", "Status", "Desconto", "Total"],
        rows: (data ?? []).map((v: any) => [
          new Date(v.data_venda).toLocaleString("pt-BR"),
          v.cliente?.nome ?? "Consumidor", v.forma_pagamento, v.status,
          brl(Number(v.desconto ?? 0)), brl(Number(v.valor_total)),
        ]),
      };
    },
  },
  {
    id: "fornecedores",
    titulo: "Fornecedores",
    descricao: "Cadastro completo de fornecedores ativos.",
    fetch: async () => {
      const { data } = await supabase.from("fornecedores").select("razao_social, nome_fantasia, cnpj, telefone, email, cidade, estado, ativo").order("razao_social");
      return {
        headers: ["Razão social", "Nome fantasia", "CNPJ", "Telefone", "E-mail", "Cidade/UF", "Ativo"],
        rows: (data ?? []).map((f: any) => [f.razao_social, f.nome_fantasia ?? "", f.cnpj ?? "", f.telefone ?? "", f.email ?? "", `${f.cidade ?? ""}/${f.estado ?? ""}`, f.ativo ? "Sim" : "Não"]),
      };
    },
  },
  {
    id: "clientes",
    titulo: "Clientes",
    descricao: "Cadastro completo de clientes e limite de crédito.",
    fetch: async () => {
      const { data } = await supabase.from("clientes").select("nome, cpf, telefone, email, cidade, estado, limite_credito, ativo").order("nome");
      return {
        headers: ["Nome", "CPF", "Telefone", "E-mail", "Cidade/UF", "Limite", "Ativo"],
        rows: (data ?? []).map((c: any) => [c.nome, c.cpf ?? "", c.telefone ?? "", c.email ?? "", `${c.cidade ?? ""}/${c.estado ?? ""}`, brl(Number(c.limite_credito ?? 0)), c.ativo ? "Sim" : "Não"]),
      };
    },
  },
  {
    id: "contas-pagar",
    titulo: "Contas a pagar",
    descricao: "Duplicatas por vencimento no período.",
    usaPeriodo: true,
    fetch: async ({ de, ate }) => {
      const { data } = await supabase.from("contas_pagar").select("descricao, data_vencimento, data_pagamento, status, valor, fornecedor:fornecedores(razao_social)").gte("data_vencimento", de).lte("data_vencimento", ate).order("data_vencimento");
      return {
        headers: ["Descrição", "Fornecedor", "Vencimento", "Pagamento", "Status", "Valor"],
        rows: (data ?? []).map((r: any) => [r.descricao, r.fornecedor?.razao_social ?? "", r.data_vencimento, r.data_pagamento ?? "—", r.status, brl(Number(r.valor))]),
      };
    },
  },
  {
    id: "contas-receber",
    titulo: "Contas a receber",
    descricao: "Parcelas de clientes por vencimento no período.",
    usaPeriodo: true,
    fetch: async ({ de, ate }) => {
      const { data } = await supabase.from("contas_receber").select("descricao, data_vencimento, data_recebimento, status, valor, cliente:clientes(nome)").gte("data_vencimento", de).lte("data_vencimento", ate).order("data_vencimento");
      return {
        headers: ["Descrição", "Cliente", "Vencimento", "Recebimento", "Status", "Valor"],
        rows: (data ?? []).map((r: any) => [r.descricao, r.cliente?.nome ?? "", r.data_vencimento, r.data_recebimento ?? "—", r.status, brl(Number(r.valor))]),
      };
    },
  },
  {
    id: "fluxo",
    titulo: "Fluxo financeiro",
    descricao: "Entradas e saídas no período.",
    usaPeriodo: true,
    fetch: async ({ de, ate }) => {
      const { data } = await supabase.from("fluxo_caixa").select("data_movimento, tipo, categoria, valor, descricao").gte("data_movimento", de).lte("data_movimento", ate).order("data_movimento", { ascending: false });
      return {
        headers: ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
        rows: (data ?? []).map((r: any) => [r.data_movimento, r.tipo, r.categoria ?? "", r.descricao ?? "", (r.tipo === "entrada" ? "+" : "-") + brl(Number(r.valor))]),
      };
    },
  },
];

function RelatoriosPage() {
  const hoje = new Date();
  const [de, setDe] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje.toISOString().slice(0, 10));
  const [carregando, setCarregando] = useState<string | null>(null);

  async function exportar(rel: Report, formato: "pdf" | "xlsx") {
    setCarregando(`${rel.id}-${formato}`);
    try {
      const { headers, rows } = await rel.fetch({ de, ate });
      const nomeArquivo = `${rel.id}-${new Date().toISOString().slice(0, 10)}`;

      if (formato === "xlsx") {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, rel.titulo.slice(0, 30));
        XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
      } else {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text(rel.titulo, 14, 14);
        doc.setFontSize(9);
        doc.setTextColor(120);
        const periodo = rel.usaPeriodo ? ` | Período: ${de} a ${ate}` : "";
        doc.text(`PharmaERP • Gerado em ${new Date().toLocaleString("pt-BR")}${periodo}`, 14, 20);
        autoTable(doc, {
          startY: 25,
          head: [headers],
          body: rows.map((r) => r.map((c) => String(c))),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 41, 59] },
        });
        doc.save(`${nomeArquivo}.pdf`);
      }
      toast.success(`Relatório "${rel.titulo}" exportado.`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar relatório.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">Exporte relatórios em PDF ou Excel. Relatórios financeiros usam o período selecionado.</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
          <div className="space-y-2 flex-1"><Label>Período de</Label><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div className="space-y-2 flex-1"><Label>Período até</Label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatorios.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base">{r.titulo}</CardTitle>
              <CardDescription>{r.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant="outline" disabled={carregando === `${r.id}-pdf`} onClick={() => exportar(r, "pdf")}>
                {carregando === `${r.id}-pdf` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />} PDF
              </Button>
              <Button size="sm" variant="outline" disabled={carregando === `${r.id}-xlsx`} onClick={() => exportar(r, "xlsx")}>
                {carregando === `${r.id}-xlsx` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />} Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
