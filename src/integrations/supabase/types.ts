export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          rg: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          created_at: string
          created_by: string | null
          data_compra: string
          data_recebimento: string | null
          fornecedor_id: string
          id: string
          numero_nota: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["compra_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_compra?: string
          data_recebimento?: string | null
          fornecedor_id: string
          id?: string
          numero_nota?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["compra_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_compra?: string
          data_recebimento?: string | null
          fornecedor_id?: string
          id?: string
          numero_nota?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["compra_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_itens: {
        Row: {
          compra_id: string
          created_at: string
          id: string
          lote_id: string | null
          medicamento_id: string
          preco_unitario: number
          quantidade: number
          subtotal: number | null
        }
        Insert: {
          compra_id: string
          created_at?: string
          id?: string
          lote_id?: string | null
          medicamento_id: string
          preco_unitario: number
          quantidade: number
          subtotal?: number | null
        }
        Update: {
          compra_id?: string
          created_at?: string
          id?: string
          lote_id?: string | null
          medicamento_id?: string
          preco_unitario?: number
          quantidade?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_itens_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_itens_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          compra_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["pagamento_forma"] | null
          fornecedor_id: string | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["conta_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["pagamento_forma"] | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["conta_status"]
          updated_at: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor: number
          venda_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          compra_id: string | null
          created_at: string
          created_by: string | null
          data_movimento: string
          id: string
          lote_id: string | null
          medicamento_id: string
          observacao: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["mov_estoque_tipo"]
          venda_id: string | null
        }
        Insert: {
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          id?: string
          lote_id?: string | null
          medicamento_id: string
          observacao?: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["mov_estoque_tipo"]
          venda_id?: string | null
        }
        Update: {
          compra_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          id?: string
          lote_id?: string | null
          medicamento_id?: string
          observacao?: string | null
          quantidade?: number
          tipo?: Database["public"]["Enums"]["mov_estoque_tipo"]
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxo_caixa: {
        Row: {
          categoria: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          created_by: string | null
          data_movimento: string
          descricao: string
          id: string
          tipo: Database["public"]["Enums"]["caixa_tipo"]
          valor: number
          venda_id: string | null
        }
        Insert: {
          categoria?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descricao: string
          id?: string
          tipo: Database["public"]["Enums"]["caixa_tipo"]
          valor: number
          venda_id?: string | null
        }
        Update: {
          categoria?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descricao?: string
          id?: string
          tipo?: Database["public"]["Enums"]["caixa_tipo"]
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fluxo_caixa_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxo_caixa_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxo_caixa_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          created_at: string
          fornecedor_id: string | null
          id: string
          medicamento_id: string
          numero_lote: string
          preco_custo: number | null
          quantidade: number
          updated_at: string
          validade: string
        }
        Insert: {
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          medicamento_id: string
          numero_lote: string
          preco_custo?: number | null
          quantidade?: number
          updated_at?: string
          validade: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          medicamento_id?: string
          numero_lote?: string
          preco_custo?: number | null
          quantidade?: number
          updated_at?: string
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo_barras: string | null
          concentracao: string | null
          controlado: boolean
          created_at: string
          created_by: string | null
          estoque_minimo: number
          exige_receita: boolean
          fabricante: string | null
          forma_farmaceutica:
            | Database["public"]["Enums"]["forma_farmaceutica"]
            | null
          fornecedor_padrao_id: string | null
          id: string
          nome: string
          preco_custo: number
          preco_venda: number
          principio_ativo: string | null
          registro_anvisa: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          concentracao?: string | null
          controlado?: boolean
          created_at?: string
          created_by?: string | null
          estoque_minimo?: number
          exige_receita?: boolean
          fabricante?: string | null
          forma_farmaceutica?:
            | Database["public"]["Enums"]["forma_farmaceutica"]
            | null
          fornecedor_padrao_id?: string | null
          id?: string
          nome: string
          preco_custo?: number
          preco_venda?: number
          principio_ativo?: string | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          concentracao?: string | null
          controlado?: boolean
          created_at?: string
          created_by?: string | null
          estoque_minimo?: number
          exige_receita?: boolean
          fabricante?: string | null
          forma_farmaceutica?:
            | Database["public"]["Enums"]["forma_farmaceutica"]
            | null
          fornecedor_padrao_id?: string | null
          id?: string
          nome?: string
          preco_custo?: number
          preco_venda?: number
          principio_ativo?: string | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicamentos_fornecedor_padrao_id_fkey"
            columns: ["fornecedor_padrao_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_completo: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_venda: string
          desconto: number
          forma_pagamento: Database["public"]["Enums"]["pagamento_forma"] | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["venda_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_venda?: string
          desconto?: number
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_venda?: string
          desconto?: number
          forma_pagamento?:
            | Database["public"]["Enums"]["pagamento_forma"]
            | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_itens: {
        Row: {
          created_at: string
          desconto: number
          id: string
          lote_id: string | null
          medicamento_id: string
          preco_unitario: number
          quantidade: number
          subtotal: number | null
          venda_id: string
        }
        Insert: {
          created_at?: string
          desconto?: number
          id?: string
          lote_id?: string | null
          medicamento_id: string
          preco_unitario: number
          quantidade: number
          subtotal?: number | null
          venda_id: string
        }
        Update: {
          created_at?: string
          desconto?: number
          id?: string
          lote_id?: string | null
          medicamento_id?: string
          preco_unitario?: number
          quantidade?: number
          subtotal?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_itens_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "estoque" | "atendente" | "gerente"
      caixa_tipo: "entrada" | "saida"
      compra_status: "pendente" | "recebida" | "cancelada"
      conta_status: "pendente" | "pago" | "atrasado" | "cancelado"
      forma_farmaceutica:
        | "comprimido"
        | "capsula"
        | "liquido"
        | "pomada"
        | "injetavel"
        | "aerossol"
        | "outro"
      mov_estoque_tipo: "entrada" | "saida" | "ajuste" | "perda" | "devolucao"
      pagamento_forma:
        | "dinheiro"
        | "debito"
        | "credito"
        | "pix"
        | "boleto"
        | "convenio"
      venda_status: "aberta" | "concluida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "financeiro", "estoque", "atendente", "gerente"],
      caixa_tipo: ["entrada", "saida"],
      compra_status: ["pendente", "recebida", "cancelada"],
      conta_status: ["pendente", "pago", "atrasado", "cancelado"],
      forma_farmaceutica: [
        "comprimido",
        "capsula",
        "liquido",
        "pomada",
        "injetavel",
        "aerossol",
        "outro",
      ],
      mov_estoque_tipo: ["entrada", "saida", "ajuste", "perda", "devolucao"],
      pagamento_forma: [
        "dinheiro",
        "debito",
        "credito",
        "pix",
        "boleto",
        "convenio",
      ],
      venda_status: ["aberta", "concluida", "cancelada"],
    },
  },
} as const
