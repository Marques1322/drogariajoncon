-- =========================================================================
-- ERP Farmácia — Modelagem completa
-- =========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'estoque', 'atendente', 'gerente');
CREATE TYPE public.forma_farmaceutica AS ENUM ('comprimido', 'capsula', 'liquido', 'pomada', 'injetavel', 'aerossol', 'outro');
CREATE TYPE public.mov_estoque_tipo AS ENUM ('entrada', 'saida', 'ajuste', 'perda', 'devolucao');
CREATE TYPE public.compra_status AS ENUM ('pendente', 'recebida', 'cancelada');
CREATE TYPE public.venda_status AS ENUM ('aberta', 'concluida', 'cancelada');
CREATE TYPE public.pagamento_forma AS ENUM ('dinheiro', 'debito', 'credito', 'pix', 'boleto', 'convenio');
CREATE TYPE public.conta_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
CREATE TYPE public.caixa_tipo AS ENUM ('entrada', 'saida');

-- =========================================================================
-- Timestamp trigger utilitário
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================================
-- PROFILES
-- =========================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- USER_ROLES + has_role
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- Auto-cria profile ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- FORNECEDORES
-- =========================================================================
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- CATEGORIAS
-- =========================================================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- CLIENTES
-- =========================================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- MEDICAMENTOS
-- =========================================================================
CREATE TABLE public.medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  principio_ativo TEXT,
  fabricante TEXT,
  codigo_barras TEXT UNIQUE,
  registro_anvisa TEXT,
  forma_farmaceutica public.forma_farmaceutica,
  concentracao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  exige_receita BOOLEAN NOT NULL DEFAULT false,
  controlado BOOLEAN NOT NULL DEFAULT false,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  fornecedor_padrao_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_medicamentos_categoria ON public.medicamentos(categoria_id);
CREATE INDEX idx_medicamentos_fornecedor ON public.medicamentos(fornecedor_padrao_id);
CREATE INDEX idx_medicamentos_nome ON public.medicamentos(nome);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicamentos TO authenticated;
GRANT ALL ON public.medicamentos TO service_role;
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_medicamentos_updated BEFORE UPDATE ON public.medicamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- LOTES
-- =========================================================================
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID NOT NULL REFERENCES public.medicamentos(id) ON DELETE CASCADE,
  numero_lote TEXT NOT NULL,
  validade DATE NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  preco_custo NUMERIC(12,2),
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicamento_id, numero_lote)
);
CREATE INDEX idx_lotes_medicamento ON public.lotes(medicamento_id);
CREATE INDEX idx_lotes_validade ON public.lotes(validade);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes TO authenticated;
GRANT ALL ON public.lotes TO service_role;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_lotes_updated BEFORE UPDATE ON public.lotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- COMPRAS
-- =========================================================================
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  numero_nota TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento DATE,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.compra_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_compras_fornecedor ON public.compras(fornecedor_id);
CREATE INDEX idx_compras_data ON public.compras(data_compra);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO authenticated;
GRANT ALL ON public.compras TO service_role;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_compras_updated BEFORE UPDATE ON public.compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.compras_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  medicamento_id UUID NOT NULL REFERENCES public.medicamentos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_compras_itens_compra ON public.compras_itens(compra_id);
CREATE INDEX idx_compras_itens_medicamento ON public.compras_itens(medicamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_itens TO authenticated;
GRANT ALL ON public.compras_itens TO service_role;
ALTER TABLE public.compras_itens ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- VENDAS
-- =========================================================================
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento public.pagamento_forma,
  status public.venda_status NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX idx_vendas_data ON public.vendas(data_venda);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  medicamento_id UUID NOT NULL REFERENCES public.medicamentos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario - desconto) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendas_itens_venda ON public.vendas_itens(venda_id);
CREATE INDEX idx_vendas_itens_medicamento ON public.vendas_itens(medicamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_itens TO authenticated;
GRANT ALL ON public.vendas_itens TO service_role;
ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- ESTOQUE MOVIMENTACOES
-- =========================================================================
CREATE TABLE public.estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID NOT NULL REFERENCES public.medicamentos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  tipo public.mov_estoque_tipo NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade <> 0),
  compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  observacao TEXT,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_mov_medicamento ON public.estoque_movimentacoes(medicamento_id);
CREATE INDEX idx_mov_data ON public.estoque_movimentacoes(data_movimento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentacoes TO authenticated;
GRANT ALL ON public.estoque_movimentacoes TO service_role;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- CONTAS A PAGAR
-- =========================================================================
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status public.conta_status NOT NULL DEFAULT 'pendente',
  forma_pagamento public.pagamento_forma,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_cp_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX idx_cp_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX idx_cp_status ON public.contas_pagar(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- CONTAS A RECEBER
-- =========================================================================
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status public.conta_status NOT NULL DEFAULT 'pendente',
  forma_pagamento public.pagamento_forma,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_cr_cliente ON public.contas_receber(cliente_id);
CREATE INDEX idx_cr_vencimento ON public.contas_receber(data_vencimento);
CREATE INDEX idx_cr_status ON public.contas_receber(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- FLUXO DE CAIXA
-- =========================================================================
CREATE TABLE public.fluxo_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo public.caixa_tipo NOT NULL,
  categoria TEXT,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  conta_pagar_id UUID REFERENCES public.contas_pagar(id) ON DELETE SET NULL,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_caixa_data ON public.fluxo_caixa(data_movimento);
CREATE INDEX idx_caixa_tipo ON public.fluxo_caixa(tipo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fluxo_caixa TO authenticated;
GRANT ALL ON public.fluxo_caixa TO service_role;
ALTER TABLE public.fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- AUDITORIA
-- =========================================================================
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_antes JSONB,
  dados_depois JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_user ON public.auditoria(user_id);
CREATE INDEX idx_auditoria_tabela ON public.auditoria(tabela);
CREATE INDEX idx_auditoria_data ON public.auditoria(created_at);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POLICIES
-- =========================================================================

-- PROFILES
CREATE POLICY "Ver próprio perfil ou admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Atualizar próprio perfil ou admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insere perfil" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin remove perfil" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES (somente admin gerencia)
CREATE POLICY "Usuário vê seus papéis ou admin vê todos" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insere papel" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin atualiza papel" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin remove papel" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: autenticado com qualquer papel operacional
-- Aplicamos SELECT amplo para autenticados e restringimos escrita por papel.

-- FORNECEDORES
CREATE POLICY "Autenticado lê fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin insere fornecedor" ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin atualiza fornecedor" ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Admin remove fornecedor" ON public.fornecedores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CATEGORIAS
CREATE POLICY "Autenticado lê categorias" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin gerencia categorias INS" ON public.categorias FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin gerencia categorias UPD" ON public.categorias FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Admin remove categoria" ON public.categorias FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CLIENTES
CREATE POLICY "Autenticado lê clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Atendente/gerente/admin insere cliente" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Atendente/gerente/admin atualiza cliente" ON public.clientes FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Admin remove cliente" ON public.clientes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- MEDICAMENTOS
CREATE POLICY "Autenticado lê medicamentos" ON public.medicamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin insere medicamento" ON public.medicamentos FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin atualiza medicamento" ON public.medicamentos FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Admin remove medicamento" ON public.medicamentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- LOTES
CREATE POLICY "Autenticado lê lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin gerencia lote INS" ON public.lotes FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin gerencia lote UPD" ON public.lotes FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Admin remove lote" ON public.lotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- COMPRAS + ITENS
CREATE POLICY "Autenticado lê compras" ON public.compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin insere compra" ON public.compras FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin atualiza compra" ON public.compras FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Admin remove compra" ON public.compras FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Autenticado lê itens de compra" ON public.compras_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/gerente/admin gerencia itens compra INS" ON public.compras_itens FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin gerencia itens compra UPD" ON public.compras_itens FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));
CREATE POLICY "Estoque/gerente/admin gerencia itens compra DEL" ON public.compras_itens FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque']::public.app_role[]));

-- VENDAS + ITENS
CREATE POLICY "Autenticado lê vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Atendente/gerente/admin insere venda" ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Atendente/gerente/admin atualiza venda" ON public.vendas FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Admin remove venda" ON public.vendas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Autenticado lê itens de venda" ON public.vendas_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Atendente/gerente/admin gerencia itens venda INS" ON public.vendas_itens FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Atendente/gerente/admin gerencia itens venda UPD" ON public.vendas_itens FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));
CREATE POLICY "Atendente/gerente/admin gerencia itens venda DEL" ON public.vendas_itens FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente']::public.app_role[]));

-- ESTOQUE MOVIMENTAÇÕES
CREATE POLICY "Autenticado lê movimentações" ON public.estoque_movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Estoque/atendente/gerente/admin insere movimentação" ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','atendente']::public.app_role[]));
CREATE POLICY "Admin/gerente atualiza movimentação" ON public.estoque_movimentacoes FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]));
CREATE POLICY "Admin remove movimentação" ON public.estoque_movimentacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CONTAS A PAGAR
CREATE POLICY "Financeiro/gerente/admin lê contas a pagar" ON public.contas_pagar FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin insere conta a pagar" ON public.contas_pagar FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin atualiza conta a pagar" ON public.contas_pagar FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Admin remove conta a pagar" ON public.contas_pagar FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CONTAS A RECEBER
CREATE POLICY "Financeiro/gerente/admin lê contas a receber" ON public.contas_receber FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin insere conta a receber" ON public.contas_receber FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin atualiza conta a receber" ON public.contas_receber FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Admin remove conta a receber" ON public.contas_receber FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- FLUXO DE CAIXA
CREATE POLICY "Financeiro/gerente/admin lê fluxo" ON public.fluxo_caixa FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin insere fluxo" ON public.fluxo_caixa FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Financeiro/gerente/admin atualiza fluxo" ON public.fluxo_caixa FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente','financeiro']::public.app_role[]));
CREATE POLICY "Admin remove fluxo" ON public.fluxo_caixa FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- AUDITORIA (somente admin lê; sistema/qualquer autenticado insere)
CREATE POLICY "Admin lê auditoria" ON public.auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticado insere auditoria" ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
