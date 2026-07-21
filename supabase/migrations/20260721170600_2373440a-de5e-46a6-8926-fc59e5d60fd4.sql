ALTER TABLE public.medicamentos
  ADD COLUMN IF NOT EXISTS codigo_interno text,
  ADD COLUMN IF NOT EXISTS localizacao text;

CREATE UNIQUE INDEX IF NOT EXISTS medicamentos_codigo_interno_key
  ON public.medicamentos (codigo_interno)
  WHERE codigo_interno IS NOT NULL;