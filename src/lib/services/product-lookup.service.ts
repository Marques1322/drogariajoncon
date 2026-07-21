import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  nome: string;
  codigo_barras: string;
  codigo_interno: string | null;
  preco_venda: number;
  estoque_minimo: number;
  categoria_id: string | null;
  categoria?: { nome: string } | null;
}

export interface LoteInfo {
  id: string;
  numero_lote: string;
  quantidade: number;
  validade: string;
  medicamento_id: string;
}

export class ProductLookupService {
  /**
   * Busca um medicamento pelo código de barras ou código interno
   */
  static async findProductByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode || barcode.trim().length === 0) {
      return null;
    }

    const sanitized = barcode.trim();

    try {
      // Tenta encontrar pelo código de barras primeiro
      let { data, error } = await supabase
        .from("medicamentos")
        .select("id, nome, codigo_barras, codigo_interno, preco_venda, estoque_minimo, categoria_id, categoria:categorias(nome)")
        .eq("codigo_barras", sanitized)
        .eq("ativo", true)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        return (data[0] as unknown as Product) || null;
      }

      // Se não encontrar, tenta pelo código interno
      ({ data, error } = await supabase
        .from("medicamentos")
        .select("id, nome, codigo_barras, codigo_interno, preco_venda, estoque_minimo, categoria_id, categoria:categorias(nome)")
        .eq("codigo_interno", sanitized)
        .eq("ativo", true)
        .limit(1));

      if (error) throw error;
      return (data?.[0] as unknown as Product) || null;
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      return null;
    }
  }

  /**
   * Busca os lotes disponíveis de um medicamento, ordenados por validade (FIFO)
   */
  static async findAvailableLotes(medicamentoId: string): Promise<LoteInfo[]> {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero_lote, quantidade, validade")
        .eq("medicamento_id", medicamentoId)
        .gt("quantidade", 0)
        .order("validade", { ascending: true })
        .order("criado_em", { ascending: true });

      if (error) throw error;
      return (data as unknown as LoteInfo[]) || [];
    } catch (error) {
      console.error("Erro ao buscar lotes:", error);
      return [];
    }
  }

  /**
   * Valida se um barcode possui formato válido
   */
  static isValidBarcode(barcode: string): boolean {
    if (!barcode || barcode.trim().length === 0) {
      return false;
    }

    // Aceita barcodes com 8-14 dígitos (padrão EAN)
    // Também aceita códigos customizados alfanuméricos
    return barcode.trim().length >= 3;
  }

  /**
   * Busca quantidade total em estoque de um medicamento
   */
  static async getTotalStock(medicamentoId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select("quantidade");

      if (error) throw error;

      return (data as any[] || []).reduce((sum, lote) => sum + (Number(lote.quantidade) || 0), 0);
    } catch (error) {
      console.error("Erro ao buscar estoque:", error);
      return 0;
    }
  }
}
