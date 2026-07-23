
-- =========================================================
-- 1) Private schema hosting the true role-check definers
-- =========================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO authenticated;

-- =========================================================
-- 2) Public wrappers become SECURITY INVOKER (no linter flag)
--    They delegate to private.* so no RLS recursion happens.
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT private.has_role(_user_id, _role); $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, _roles); $$;

-- =========================================================
-- 3) Restrict permissive "true" SELECT policies
-- =========================================================
DROP POLICY IF EXISTS "Autenticado lê clientes" ON public.clientes;
CREATE POLICY "Papéis autorizados leem clientes" ON public.clientes
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê fornecedores" ON public.fornecedores;
CREATE POLICY "Papéis autorizados leem fornecedores" ON public.fornecedores
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê compras" ON public.compras;
CREATE POLICY "Papéis autorizados leem compras" ON public.compras
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê itens de compra" ON public.compras_itens;
CREATE POLICY "Papéis autorizados leem itens de compra" ON public.compras_itens
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê movimentações" ON public.estoque_movimentacoes;
CREATE POLICY "Papéis autorizados leem movimentações" ON public.estoque_movimentacoes
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','atendente']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê medicamentos" ON public.medicamentos;
CREATE POLICY "Papéis autorizados leem medicamentos" ON public.medicamentos
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','atendente','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê lotes" ON public.lotes;
CREATE POLICY "Papéis autorizados leem lotes" ON public.lotes
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','atendente','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê categorias" ON public.categorias;
CREATE POLICY "Papéis autorizados leem categorias" ON public.categorias
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','estoque','atendente','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê vendas" ON public.vendas;
CREATE POLICY "Papéis autorizados leem vendas" ON public.vendas
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente','financeiro']::public.app_role[])
);

DROP POLICY IF EXISTS "Autenticado lê itens de venda" ON public.vendas_itens;
CREATE POLICY "Papéis autorizados leem itens de venda" ON public.vendas_itens
FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','gerente','atendente','financeiro']::public.app_role[])
);

-- =========================================================
-- 4) Auditoria — remove permissive INSERT policy.
--    No client-side insert path; keep admin-only SELECT.
-- =========================================================
DROP POLICY IF EXISTS "Autenticado insere auditoria" ON public.auditoria;

-- =========================================================
-- 5) Convert operational RPCs to SECURITY INVOKER.
--    They still call public.has_role / has_any_role for
--    role checks; users have table grants + policies allow
--    their writes.
-- =========================================================
CREATE OR REPLACE FUNCTION public.registrar_compra(
  p_fornecedor_id uuid, p_numero_nota text, p_data_compra date,
  p_observacoes text, p_itens jsonb, p_parcelas jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_compra_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_parc jsonb;
  v_lote_id uuid;
  v_qtd integer;
  v_preco numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'gerente') OR public.has_role(v_uid,'estoque')) THEN
    RAISE EXCEPTION 'Sem permissão para registrar compras';
  END IF;

  INSERT INTO public.compras (fornecedor_id, numero_nota, data_compra, data_recebimento, valor_total, status, observacoes, created_by)
  VALUES (p_fornecedor_id, NULLIF(p_numero_nota,''), p_data_compra, p_data_compra, 0, 'recebida', NULLIF(p_observacoes,''), v_uid)
  RETURNING id INTO v_compra_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) LOOP
    v_qtd := (v_item->>'quantidade')::int;
    v_preco := (v_item->>'preco_unitario')::numeric;
    IF v_qtd IS NULL OR v_qtd <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

    SELECT id INTO v_lote_id
      FROM public.lotes
     WHERE medicamento_id = (v_item->>'medicamento_id')::uuid
       AND numero_lote = (v_item->>'numero_lote')
     LIMIT 1;

    IF v_lote_id IS NULL THEN
      INSERT INTO public.lotes (medicamento_id, numero_lote, validade, quantidade, preco_custo, fornecedor_id)
      VALUES ((v_item->>'medicamento_id')::uuid, v_item->>'numero_lote', (v_item->>'validade')::date, 0, v_preco, p_fornecedor_id)
      RETURNING id INTO v_lote_id;
    END IF;

    INSERT INTO public.compras_itens (compra_id, medicamento_id, lote_id, quantidade, preco_unitario, subtotal)
    VALUES (v_compra_id, (v_item->>'medicamento_id')::uuid, v_lote_id, v_qtd, v_preco, v_qtd * v_preco);

    INSERT INTO public.estoque_movimentacoes (medicamento_id, lote_id, tipo, quantidade, compra_id, observacao, created_by)
    VALUES ((v_item->>'medicamento_id')::uuid, v_lote_id, 'entrada', v_qtd, v_compra_id, 'Entrada por compra '||coalesce(p_numero_nota,''), v_uid);

    UPDATE public.lotes SET quantidade = quantidade + v_qtd, updated_at = now() WHERE id = v_lote_id;
    v_total := v_total + (v_qtd * v_preco);
  END LOOP;

  UPDATE public.compras SET valor_total = v_total, updated_at = now() WHERE id = v_compra_id;

  FOR v_parc IN SELECT * FROM jsonb_array_elements(coalesce(p_parcelas,'[]'::jsonb)) LOOP
    INSERT INTO public.contas_pagar (fornecedor_id, compra_id, descricao, valor, data_emissao, data_vencimento, status, forma_pagamento, created_by)
    VALUES (p_fornecedor_id, v_compra_id,
      coalesce(v_parc->>'descricao','Duplicata compra '||coalesce(p_numero_nota,'')),
      (v_parc->>'valor')::numeric, p_data_compra, (v_parc->>'data_vencimento')::date, 'pendente',
      NULLIF(v_parc->>'forma_pagamento','')::public.pagamento_forma, v_uid);
  END LOOP;

  RETURN v_compra_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_venda(
  p_cliente_id uuid, p_forma_pagamento public.pagamento_forma, p_desconto numeric,
  p_observacoes text, p_itens jsonb, p_parcelas jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_venda_id uuid;
  v_total numeric := 0;
  v_item jsonb; v_parc jsonb;
  v_med uuid; v_qtd integer; v_preco numeric; v_desc numeric;
  v_restante integer; v_lote record; v_take integer; v_a_prazo boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'gerente') OR public.has_role(v_uid,'atendente')) THEN
    RAISE EXCEPTION 'Sem permissão para registrar vendas';
  END IF;

  v_a_prazo := jsonb_array_length(coalesce(p_parcelas,'[]'::jsonb)) > 0;

  INSERT INTO public.vendas (cliente_id, data_venda, valor_total, desconto, forma_pagamento, status, observacoes, created_by)
  VALUES (p_cliente_id, now(), 0, coalesce(p_desconto,0), p_forma_pagamento, 'concluida', NULLIF(p_observacoes,''), v_uid)
  RETURNING id INTO v_venda_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) LOOP
    v_med := (v_item->>'medicamento_id')::uuid;
    v_qtd := (v_item->>'quantidade')::int;
    v_preco := (v_item->>'preco_unitario')::numeric;
    v_desc := coalesce((v_item->>'desconto')::numeric, 0);
    IF v_qtd IS NULL OR v_qtd <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

    v_restante := v_qtd;
    FOR v_lote IN
      SELECT id, quantidade FROM public.lotes
       WHERE medicamento_id = v_med AND quantidade > 0
       ORDER BY validade ASC, created_at ASC
    LOOP
      EXIT WHEN v_restante <= 0;
      v_take := LEAST(v_restante, v_lote.quantidade);

      INSERT INTO public.vendas_itens (venda_id, medicamento_id, lote_id, quantidade, preco_unitario, desconto, subtotal)
      VALUES (v_venda_id, v_med, v_lote.id, v_take, v_preco, v_desc * v_take / v_qtd, (v_take * v_preco) - (v_desc * v_take / v_qtd));

      INSERT INTO public.estoque_movimentacoes (medicamento_id, lote_id, tipo, quantidade, venda_id, observacao, created_by)
      VALUES (v_med, v_lote.id, 'saida', -v_take, v_venda_id, 'Saída por venda', v_uid);

      UPDATE public.lotes SET quantidade = quantidade - v_take, updated_at = now() WHERE id = v_lote.id;
      v_restante := v_restante - v_take;
    END LOOP;

    IF v_restante > 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente para o medicamento (faltam % unidades)', v_restante;
    END IF;

    v_total := v_total + (v_qtd * v_preco) - v_desc;
  END LOOP;

  UPDATE public.vendas SET valor_total = v_total, updated_at = now() WHERE id = v_venda_id;

  IF v_a_prazo THEN
    FOR v_parc IN SELECT * FROM jsonb_array_elements(p_parcelas) LOOP
      INSERT INTO public.contas_receber (cliente_id, venda_id, descricao, valor, data_emissao, data_vencimento, status, forma_pagamento, created_by)
      VALUES (p_cliente_id, v_venda_id, coalesce(v_parc->>'descricao','Parcela venda'),
        (v_parc->>'valor')::numeric, current_date, (v_parc->>'data_vencimento')::date, 'pendente', p_forma_pagamento, v_uid);
    END LOOP;
  ELSE
    INSERT INTO public.fluxo_caixa (data_movimento, tipo, categoria, valor, descricao, venda_id, created_by)
    VALUES (current_date, 'entrada', 'Venda', v_total, 'Venda à vista', v_venda_id, v_uid);
  END IF;

  RETURN v_venda_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_estoque(
  p_medicamento_id uuid, p_lote_id uuid, p_tipo public.mov_estoque_tipo,
  p_quantidade integer, p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_delta integer;
  v_new_qty integer;
  v_mov_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_any_role(v_user, ARRAY['admin','gerente','estoque','atendente']::public.app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para movimentar estoque';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade = 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_lote_id IS NULL THEN RAISE EXCEPTION 'Lote é obrigatório'; END IF;

  v_delta := CASE p_tipo
    WHEN 'entrada'   THEN abs(p_quantidade)
    WHEN 'devolucao' THEN abs(p_quantidade)
    WHEN 'saida'     THEN -abs(p_quantidade)
    WHEN 'perda'     THEN -abs(p_quantidade)
    WHEN 'ajuste'    THEN p_quantidade
  END;

  UPDATE public.lotes
     SET quantidade = quantidade + v_delta
   WHERE id = p_lote_id AND medicamento_id = p_medicamento_id
  RETURNING quantidade INTO v_new_qty;

  IF v_new_qty IS NULL THEN RAISE EXCEPTION 'Lote não encontrado para o medicamento informado'; END IF;
  IF v_new_qty < 0 THEN RAISE EXCEPTION 'Estoque insuficiente no lote (resultaria em %)', v_new_qty; END IF;

  INSERT INTO public.estoque_movimentacoes
    (medicamento_id, lote_id, tipo, quantidade, observacao, created_by, data_movimento)
  VALUES (p_medicamento_id, p_lote_id, p_tipo, v_delta, p_observacao, v_user, now())
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.receber_parcela(
  p_conta_id uuid, p_valor_recebido numeric, p_forma public.pagamento_forma, p_data date DEFAULT CURRENT_DATE
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_conta public.contas_receber;
  v_saldo numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'gerente') OR public.has_role(v_uid,'financeiro')) THEN
    RAISE EXCEPTION 'Sem permissão para receber parcelas';
  END IF;

  SELECT * INTO v_conta FROM public.contas_receber WHERE id = p_conta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;
  IF v_conta.status = 'pago' THEN RAISE EXCEPTION 'Parcela já paga'; END IF;
  IF p_valor_recebido <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  v_saldo := v_conta.valor - p_valor_recebido;
  IF v_saldo < 0 THEN RAISE EXCEPTION 'Valor recebido maior que o saldo'; END IF;

  IF v_saldo = 0 THEN
    UPDATE public.contas_receber
      SET status='pago', data_recebimento=p_data, forma_pagamento=p_forma, updated_at=now()
      WHERE id = p_conta_id;
  ELSE
    UPDATE public.contas_receber
      SET valor=p_valor_recebido, status='pago', data_recebimento=p_data, forma_pagamento=p_forma, updated_at=now()
      WHERE id = p_conta_id;
    INSERT INTO public.contas_receber (cliente_id, venda_id, descricao, valor, data_emissao, data_vencimento, status, created_by)
    VALUES (v_conta.cliente_id, v_conta.venda_id, v_conta.descricao || ' (saldo)', v_saldo, v_conta.data_emissao, v_conta.data_vencimento, 'pendente', v_uid);
  END IF;

  INSERT INTO public.fluxo_caixa (data_movimento, tipo, categoria, valor, descricao, conta_receber_id, created_by)
  VALUES (p_data, 'entrada', 'Recebimento', p_valor_recebido, coalesce(v_conta.descricao,'Recebimento'), p_conta_id, v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_duplicata(
  p_conta_id uuid, p_valor_pago numeric, p_forma public.pagamento_forma, p_data date DEFAULT CURRENT_DATE
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_conta public.contas_pagar;
  v_saldo numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'gerente') OR public.has_role(v_uid,'financeiro')) THEN
    RAISE EXCEPTION 'Sem permissão para pagar duplicatas';
  END IF;

  SELECT * INTO v_conta FROM public.contas_pagar WHERE id = p_conta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duplicata não encontrada'; END IF;
  IF v_conta.status = 'pago' THEN RAISE EXCEPTION 'Duplicata já paga'; END IF;
  IF p_valor_pago <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  v_saldo := v_conta.valor - p_valor_pago;
  IF v_saldo < 0 THEN RAISE EXCEPTION 'Valor pago maior que o saldo'; END IF;

  IF v_saldo = 0 THEN
    UPDATE public.contas_pagar
      SET status='pago', data_pagamento=p_data, forma_pagamento=p_forma, updated_at=now()
      WHERE id = p_conta_id;
  ELSE
    UPDATE public.contas_pagar
      SET valor=p_valor_pago, status='pago', data_pagamento=p_data, forma_pagamento=p_forma, updated_at=now()
      WHERE id = p_conta_id;
    INSERT INTO public.contas_pagar (fornecedor_id, compra_id, descricao, valor, data_emissao, data_vencimento, status, created_by)
    VALUES (v_conta.fornecedor_id, v_conta.compra_id, v_conta.descricao || ' (saldo)', v_saldo, v_conta.data_emissao, v_conta.data_vencimento, 'pendente', v_uid);
  END IF;

  INSERT INTO public.fluxo_caixa (data_movimento, tipo, categoria, valor, descricao, conta_pagar_id, created_by)
  VALUES (p_data, 'saida', 'Pagamento', p_valor_pago, coalesce(v_conta.descricao,'Pagamento'), p_conta_id, v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_contas_atrasadas()
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
BEGIN
  UPDATE public.contas_pagar
    SET status='atrasado', updated_at=now()
    WHERE status='pendente' AND data_vencimento < current_date;
  UPDATE public.contas_receber
    SET status='atrasado', updated_at=now()
    WHERE status='pendente' AND data_vencimento < current_date;
END;
$function$;

-- =========================================================
-- 6) handle_new_user stays SECURITY DEFINER (trigger),
--    but is not directly executable by users.
-- =========================================================
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
