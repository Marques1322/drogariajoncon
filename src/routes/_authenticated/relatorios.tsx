import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — PharmaERP" },
      {
        name: "description",
        content:
          "Exportação de relatórios de estoque, vendas, compras e financeiro em PDF e Excel.",
      },
    ],
  }),
  component: RelatoriosPage,
});

type ReportKey =
  | "estoque"
  | "vencidos"
  | "compras"
  | "vendas"
  | "fornecedores"
  | "clientes"
  | "contas_pagar"
  | "contas_receber"
  | "fluxo";

type ReportDef = {
  key: ReportKey;
  title: string;
  description: string;
  needsPeriod?: boolean;
};

const REPORTS: ReportDef[] = [
  {
    key: "estoque",
    title: "Estoque atual",
    description: "Saldo de todos os lotes por medicamento.",
  },
  {
    key: "vencidos",
    title: "Medicamentos vencidos / a vencer",
    description: "Lotes com validade próxima ou expirada.",
  },
  {
    key: "compras",
    title: "Compras",
    description: "Notas fiscais registradas por período.",
    needsPeriod: true,
  },
  {
    key: "vendas",
    title: "Vendas",
    description: "Vendas concluídas por período.",
    needsPeriod: true,
  },
  { key: "fornecedores", title: "Fornecedores", description: "Lista de fornecedores cadastrados." },
  { key: "clientes", title: "Clientes", description: "Clientes com limite de crédito e saldo." },
  {
    key: "contas_pagar",
    title: "Contas a pagar",
    description: "Duplicatas por período de vencimento.",
    needsPeriod: true,
  },
  {
    key: "contas_receber",
    title: "Contas a receber",
    description: "Parcelas por período de vencimento.",
    needsPeriod: true,
  },
  {
    key: "fluxo",
    title: "Fluxo de caixa",
    description: "Receitas, despesas e saldo por período.",
    needsPeriod: true,
  },
];

async function fetchReport(
  key: ReportKey,
  from: string,
  to: string,
): Promise<{ headers: string[]; rows: (string | number)[][] }> {
  const fromISO = from ? `${from}T00:00:00` : null;
  const toISO = to ? `${to}T23:59:59` : null;

  switch (key) {
    case "estoque": {
      const { data, error } = await supabase
        .from("lotes")
        .select(
          "numero_lote, quantidade, validade, preco_custo, medicamento:medicamentos(nome, estoque_minimo)",
        )
        .order("validade");
      if (error) throw error;
      return {
        headers: ["Medicamento", "Lote", "Validade", "Quantidade", "Estoque mínimo", "Preço custo"],
        rows: (data ?? []).map((r: any) => [
          r.medicamento?.nome ?? "—",
          r.numero_lote,
          r.validade ? format(new Date(r.validade), "dd/MM/yyyy") : "—",
          r.quantidade ?? 0,
          r.medicamento?.estoque_minimo ?? 0,
          brl(Number(r.preco_custo ?? 0)),
        ]),
      };
    }
    case "vencidos": {
      const limit = new Date();
      limit.setDate(limit.getDate() + 60);
      const { data, error } = await supabase
        .from("lotes")
        .select("numero_lote, quantidade, validade, medicamento:medicamentos(nome)")
        .lte("validade", limit.toISOString().slice(0, 10))
        .order("validade");
      if (error) throw error;
      return {
        headers: ["Medicamento", "Lote", "Validade", "Quantidade", "Situação"],
        rows: (data ?? []).map((r: any) => {
          const v = new Date(r.validade);
          const status = v < new Date() ? "Vencido" : "A vencer (60d)";
          return [
            r.medicamento?.nome ?? "—",
            r.numero_lote,
            format(v, "dd/MM/yyyy"),
            r.quantidade ?? 0,
            status,
          ];
        }),
      };
    }
    case "compras": {
      let q = supabase
        .from("compras")
        .select("numero_nota, data_compra, valor_total, status, fornecedor:fornecedores(nome)")
        .order("data_compra", { ascending: false });
      if (fromISO) q = q.gte("data_compra", fromISO);
      if (toISO) q = q.lte("data_compra", toISO);
      const { data, error } = await q;
      if (error) throw error;
      return {
        headers: ["Data", "Nº Nota", "Fornecedor", "Status", "Valor"],
        rows: (data ?? []).map((r: any) => [
          format(new Date(r.data_compra), "dd/MM/yyyy"),
          r.numero_nota ?? "—",
          r.fornecedor?.nome ?? "—",
          r.status,
          brl(Number(r.valor_total)),
        ]),
      };
    }
    case "vendas": {
      let q = supabase
        .from("vendas")
        .select("data_venda, valor_total, forma_pagamento, status, cliente:clientes(nome)")
        .order("data_venda", { ascending: false });
      if (fromISO) q = q.gte("data_venda", fromISO);
      if (toISO) q = q.lte("data_venda", toISO);
      const { data, error } = await q;
      if (error) throw error;
      return {
        headers: ["Data", "Cliente", "Pagamento", "Status", "Valor"],
        rows: (data ?? []).map((r: any) => [
          format(new Date(r.data_venda), "dd/MM/yyyy HH:mm"),
          r.cliente?.nome ?? "Consumidor",
          r.forma_pagamento,
          r.status,
          brl(Number(r.valor_total)),
        ]),
      };
    }
    case "fornecedores": {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("nome, cnpj, telefone, email, cidade, estado, ativo")
        .order("nome");
      if (error) throw error;
      return {
        headers: ["Nome", "CNPJ", "Telefone", "E-mail", "Cidade", "UF", "Status"],
        rows: (data ?? []).map((r: any) => [
          r.nome,
          r.cnpj ?? "—",
          r.telefone ?? "—",
          r.email ?? "—",
          r.cidade ?? "—",
          r.estado ?? "—",
          r.ativo ? "Ativo" : "Inativo",
        ]),
      };
    }
    case "clientes": {
      const { data, error } = await supabase
        .from("clientes")
        .select("nome, cpf, telefone, email, limite_credito, ativo")
        .order("nome");
      if (error) throw error;
      return {
        headers: ["Nome", "CPF", "Telefone", "E-mail", "Limite crédito", "Status"],
        rows: (data ?? []).map((r: any) => [
          r.nome,
          r.cpf ?? "—",
          r.telefone ?? "—",
          r.email ?? "—",
          brl(Number(r.limite_credito ?? 0)),
          r.ativo ? "Ativo" : "Inativo",
        ]),
      };
    }
    case "contas_pagar": {
      let q = supabase
        .from("contas_pagar")
        .select(
          "descricao, valor, valor_pago, data_vencimento, status, fornecedor:fornecedores(nome)",
        )
        .order("data_vencimento");
      if (from) q = q.gte("data_vencimento", from);
      if (to) q = q.lte("data_vencimento", to);
      const { data, error } = await q;
      if (error) throw error;
      return {
        headers: ["Vencimento", "Fornecedor", "Descrição", "Valor", "Pago", "Status"],
        rows: (data ?? []).map((r: any) => [
          format(new Date(r.data_vencimento), "dd/MM/yyyy"),
          r.fornecedor?.nome ?? "—",
          r.descricao ?? "—",
          brl(Number(r.valor)),
          brl(Number(r.valor_pago ?? 0)),
          r.status,
        ]),
      };
    }
    case "contas_receber": {
      let q = supabase
        .from("contas_receber")
        .select("descricao, valor, valor_recebido, data_vencimento, status, cliente:clientes(nome)")
        .order("data_vencimento");
      if (from) q = q.gte("data_vencimento", from);
      if (to) q = q.lte("data_vencimento", to);
      const { data, error } = await q;
      if (error) throw error;
      return {
        headers: ["Vencimento", "Cliente", "Descrição", "Valor", "Recebido", "Status"],
        rows: (data ?? []).map((r: any) => [
          format(new Date(r.data_vencimento), "dd/MM/yyyy"),
          r.cliente?.nome ?? "—",
          r.descricao ?? "—",
          brl(Number(r.valor)),
          brl(Number(r.valor_recebido ?? 0)),
          r.status,
        ]),
      };
    }
    case "fluxo": {
      let q = supabase
        .from("fluxo_caixa")
        .select("data_movimento, tipo, categoria, descricao, valor")
        .order("data_movimento", { ascending: false });
      if (from) q = q.gte("data_movimento", from);
      if (to) q = q.lte("data_movimento", to);
      const { data, error } = await q;
      if (error) throw error;
      return {
        headers: ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
        rows: (data ?? []).map((r: any) => [
          format(new Date(r.data_movimento), "dd/MM/yyyy"),
          r.tipo,
          r.categoria ?? "—",
          r.descricao ?? "—",
          brl(Number(r.valor)),
        ]),
      };
    }
  }
}

function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 21);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(String)),
    startY: 26,
    styles: { fontSize: 8 },
  });
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

function exportXLSX(title: string, headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_").toLowerCase()}.xlsx`);
}

function RelatoriosPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<string | null>(null);

  const handle = async (rep: ReportDef, kind: "pdf" | "xlsx") => {
    const id = `${rep.key}-${kind}`;
    try {
      setLoading(id);
      const { headers, rows } = await fetchReport(rep.key, from, to);
      if (rows.length === 0) {
        toast.info("Sem dados para o período/relatório.");
        return;
      }
      if (kind === "pdf") exportPDF(rep.title, headers, rows);
      else exportXLSX(rep.title, headers, rows);
      toast.success("Relatório exportado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar relatório.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Exporte os relatórios em PDF ou Excel. Alguns filtram por período.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 max-w-md">
          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription>
                {r.description}
                {r.needsPeriod && " (usa o período)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading === `${r.key}-pdf`}
                onClick={() => handle(r, "pdf")}
              >
                {loading === `${r.key}-pdf` ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}{" "}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading === `${r.key}-xlsx`}
                onClick={() => handle(r, "xlsx")}
              >
                {loading === `${r.key}-xlsx` ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}{" "}
                Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
