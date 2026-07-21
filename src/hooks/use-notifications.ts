import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Notificacao = {
  id: string;
  tipo: "vencimento" | "estoque_baixo" | "conta_pagar" | "conta_receber";
  titulo: string;
  descricao: string;
  gravidade: "alta" | "media" | "baixa";
  link: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notificacoes"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Notificacao[]> => {
      // marcar contas atrasadas antes de listar
      await supabase.rpc("marcar_contas_atrasadas");

      const hoje = new Date();
      const em30 = new Date(); em30.setDate(em30.getDate() + 30);
      const em60 = new Date(); em60.setDate(em60.getDate() + 60);
      const em7 = new Date(); em7.setDate(em7.getDate() + 7);
      const iso = (d: Date) => d.toISOString().slice(0, 10);

      const [lotes, meds, cp, cr] = await Promise.all([
        supabase.from("lotes").select("id, numero_lote, validade, quantidade, medicamento:medicamentos(nome)").gt("quantidade", 0).lte("validade", iso(em60)).order("validade").limit(20),
        supabase.from("medicamentos").select("id, nome, estoque_minimo, lotes(quantidade)").eq("ativo", true).limit(500),
        supabase.from("contas_pagar").select("id, descricao, valor, data_vencimento, status").in("status", ["pendente", "atrasado"]).lte("data_vencimento", iso(em7)).order("data_vencimento").limit(20),
        supabase.from("contas_receber").select("id, descricao, valor, data_vencimento, status").in("status", ["pendente", "atrasado"]).lte("data_vencimento", iso(em7)).order("data_vencimento").limit(20),
      ]);

      const out: Notificacao[] = [];

      (lotes.data ?? []).forEach((l: any) => {
        const val = new Date(l.validade);
        const dias = Math.ceil((val.getTime() - hoje.getTime()) / 86400000);
        const venc = dias < 0;
        out.push({
          id: `lote-${l.id}`,
          tipo: "vencimento",
          titulo: venc ? "Medicamento vencido" : `Vence em ${dias}d`,
          descricao: `${l.medicamento?.nome ?? "—"} • lote ${l.numero_lote} • ${l.quantidade} un.`,
          gravidade: venc ? "alta" : dias <= 15 ? "alta" : "media",
          link: "/estoque",
        });
      });

      (meds.data ?? []).forEach((m: any) => {
        const total = (m.lotes ?? []).reduce((s: number, x: any) => s + (x.quantidade ?? 0), 0);
        if (m.estoque_minimo > 0 && total < m.estoque_minimo) {
          out.push({
            id: `min-${m.id}`,
            tipo: "estoque_baixo",
            titulo: "Estoque abaixo do mínimo",
            descricao: `${m.nome} • ${total} / mín. ${m.estoque_minimo}`,
            gravidade: total === 0 ? "alta" : "media",
            link: "/estoque",
          });
        }
      });

      (cp.data ?? []).forEach((c: any) => {
        const atrasada = c.status === "atrasado";
        out.push({
          id: `cp-${c.id}`,
          tipo: "conta_pagar",
          titulo: atrasada ? "Duplicata atrasada" : "Duplicata a vencer",
          descricao: `${c.descricao} • R$ ${Number(c.valor).toFixed(2)} • ${c.data_vencimento}`,
          gravidade: atrasada ? "alta" : "media",
          link: "/contas-pagar",
        });
      });

      (cr.data ?? []).forEach((c: any) => {
        const atrasada = c.status === "atrasado";
        out.push({
          id: `cr-${c.id}`,
          tipo: "conta_receber",
          titulo: atrasada ? "Parcela de cliente atrasada" : "Parcela a vencer",
          descricao: `${c.descricao} • R$ ${Number(c.valor).toFixed(2)} • ${c.data_vencimento}`,
          gravidade: atrasada ? "alta" : "media",
          link: "/contas-receber",
        });
      });

      return out.sort((a, b) => {
        const ord = { alta: 0, media: 1, baixa: 2 };
        return ord[a.gravidade] - ord[b.gravidade];
      });
    },
  });
}
