import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CartItem {
  medicamento_id: string;
  nome: string;
  codigo_barras: string;
  lote_id: string;
  numero_lote: string;
  validade: string;
  fabricante: string | null;
  quantidade: number;
  valor_unitario: number;
  preco_venda: number;
  estoque_disponivel: number;
}

export interface PdvSalePayload {
  cliente_id?: string | null;
  usuario_id: string;
  forma_pagamento: string;
  desconto: number;
  itens: Array<{
    medicamento_id: string;
    lote_id: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  observacoes?: string;
}

export class PdvService {
  /**
   * Busca informações do lote mais antigo (FIFO) para um medicamento
   */
  static async findFifoLote(medicamentoId: string, quantidadeNeeded: number) {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero_lote, validade, quantidade")
        .eq("medicamento_id", medicamentoId)
        .gt("quantidade", 0)
        .order("validade", { ascending: true })
        .order("criado_em", { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      const lote = data[0];
      if (Number(lote.quantidade) < quantidadeNeeded) {
        throw new Error(
          `Estoque insuficiente. Disponível: ${lote.quantidade}, Solicitado: ${quantidadeNeeded}`
        );
      }

      return lote;
    } catch (error) {
      console.error("Erro ao buscar lote FIFO:", error);
      throw error;
    }
  }

  /**
   * Busca medicamento pelo código de barras com informações de lote
   */
  static async findProductByBarcode(barcode: string) {
    try {
      const sanitized = barcode.trim();

      // Busca pelo código de barras
      let { data, error } = await supabase
        .from("medicamentos")
        .select("id, nome, codigo_barras, codigo_interno, preco_venda, fabricante, preco_custo")
        .eq("codigo_barras", sanitized)
        .eq("ativo", true)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        // Tenta código interno
        ({ data, error } = await supabase
          .from("medicamentos")
          .select("id, nome, codigo_barras, codigo_interno, preco_venda, fabricante, preco_custo")
          .eq("codigo_interno", sanitized)
          .eq("ativo", true)
          .limit(1));

        if (error) throw error;
        if (!data || data.length === 0) {
          return null;
        }
      }

      const medicamento = data[0];

      // Busca lotes disponíveis
      const { data: lotes, error: lotesError } = await supabase
        .from("lotes")
        .select("id, numero_lote, validade, quantidade")
        .eq("medicamento_id", medicamento.id)
        .gt("quantidade", 0)
        .order("validade", { ascending: true })
        .order("criado_em", { ascending: true });

      if (lotesError) throw lotesError;

      // Calcula estoque total
      const estoqueTotal = (lotes || []).reduce((sum, l) => sum + Number(l.quantidade || 0), 0);

      return {
        ...medicamento,
        lotes: lotes || [],
        estoqueTotal,
      };
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      throw error;
    }
  }

  /**
   * Cria uma venda e registra a movimentação de estoque
   */
  static async createSale(payload: PdvSalePayload) {
    try {
      // Valida itens
      if (!payload.itens || payload.itens.length === 0) {
        throw new Error("Adicione ao menos um item à venda");
      }

      // Calcula valor total
      const valorTotal = payload.itens.reduce(
        (sum, item) => sum + item.quantidade * item.valor_unitario,
        0
      ) - payload.desconto;

      if (valorTotal <= 0) {
        throw new Error("Valor total deve ser maior que zero");
      }

      // Inicia transação
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          cliente_id: payload.cliente_id || null,
          usuario_id: payload.usuario_id,
          forma_pagamento: payload.forma_pagamento,
          desconto: payload.desconto,
          valor_total: valorTotal,
          status: "concluida",
          observacoes: payload.observacoes || null,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Insere itens da venda
      const itensData = payload.itens.map((item) => ({
        venda_id: venda.id,
        medicamento_id: item.medicamento_id,
        lote_id: item.lote_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: 0,
      }));

      const { error: itensError } = await supabase.from("vendas_itens").insert(itensData);

      if (itensError) throw itensError;

      // Registra movimentação de estoque
      for (const item of payload.itens) {
        const { error: movError } = await supabase
          .from("movimentacao_estoque")
          .insert({
            medicamento_id: item.medicamento_id,
            lote_id: item.lote_id,
            tipo: "saida",
            quantidade: item.quantidade,
            referencia_tipo: "venda",
            referencia_id: venda.id,
            usuario_id: payload.usuario_id,
            observacoes: "Venda PDV",
          });

        if (movError) throw movError;

        // Atualiza quantidade no lote
        const { error: updateError } = await supabase.rpc("decrement_lote_quantity", {
          p_lote_id: item.lote_id,
          p_quantidade: item.quantidade,
        });

        if (updateError) {
          console.warn("Erro ao atualizar lote, tentando update direto:", updateError);
          // Fallback: atualiza direto
          const { data: loteData } = await supabase
            .from("lotes")
            .select("quantidade")
            .eq("id", item.lote_id)
            .single();

          if (loteData) {
            await supabase
              .from("lotes")
              .update({ quantidade: Math.max(0, Number(loteData.quantidade) - item.quantidade) })
              .eq("id", item.lote_id);
          }
        }
      }

      return venda;
    } catch (error) {
      console.error("Erro ao criar venda:", error);
      throw error;
    }
  }

  /**
   * Verifica se medicamento está vencendo (próximos 30 dias)
   */
  static checkExpiringMedicines(lote: any): { isExpiring: boolean; daysUntilExpiry: number | null } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(lote.validade);
    validade.setHours(0, 0, 0, 0);

    const diffTime = validade.getTime() - hoje.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpiring: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
      daysUntilExpiry: daysUntilExpiry >= 0 ? daysUntilExpiry : null,
    };
  }

  /**
   * Verifica se medicamento está vencido
   */
  static isExpired(lote: any): boolean {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(lote.validade);
    validade.setHours(0, 0, 0, 0);

    return validade < hoje;
  }
}
