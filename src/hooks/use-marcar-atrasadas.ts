import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Executa uma única vez, na montagem da tela, a rotina que marca duplicatas /
 * parcelas vencidas como "atrasado" e depois invalida a lista informada.
 *
 * Centraliza o mesmo efeito que existia duplicado em Contas a Pagar e
 * Contas a Receber, agora com tratamento de erro (antes a falha era engolida).
 */
export function useMarcarContasAtrasadas(queryKey: string) {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    supabase.rpc("marcar_contas_atrasadas").then(({ error }) => {
      if (cancelled) return;
      if (error) {
        console.error("Falha ao atualizar contas atrasadas:", error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: [queryKey] });
    });

    return () => {
      cancelled = true;
    };
  }, [qc, queryKey]);
}
