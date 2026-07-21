CREATE OR REPLACE FUNCTION public.registrar_movimentacao_estoque(
  p_medicamento_id uuid,
  p_lote_id uuid,
  p_tipo mov_estoque_tipo,
  p_quantidade integer,
  p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_delta integer;
  v_new_qty integer;
  v_mov_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT public.has_any_role(v_user, ARRAY['admin','gerente','estoque','atendente']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para movimentar estoque';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade = 0 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;
  IF p_lote_id IS NULL THEN
    RAISE EXCEPTION 'Lote é obrigatório';
  END IF;

  -- Determina o delta (positivo entra, negativo sai)
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

  IF v_new_qty IS NULL THEN
    RAISE EXCEPTION 'Lote não encontrado para o medicamento informado';
  END IF;
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente no lote (resultaria em %)', v_new_qty;
  END IF;

  INSERT INTO public.estoque_movimentacoes
    (medicamento_id, lote_id, tipo, quantidade, observacao, created_by, data_movimento)
  VALUES
    (p_medicamento_id, p_lote_id, p_tipo, v_delta, p_observacao, v_user, now())
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_movimentacao_estoque(uuid, uuid, mov_estoque_tipo, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registrar_movimentacao_estoque(uuid, uuid, mov_estoque_tipo, integer, text) TO authenticated;