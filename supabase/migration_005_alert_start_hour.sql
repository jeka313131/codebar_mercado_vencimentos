-- Hora diária (Brasília) para envio de alertas de vencimento no WhatsApp
-- Cole no SQL Editor do Supabase e execute.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alert_start_hour SMALLINT NOT NULL DEFAULT 8;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_alert_start_hour_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_alert_start_hour_check
  CHECK (alert_start_hour >= 0 AND alert_start_hour <= 23);

COMMENT ON COLUMN public.users.alert_start_hour IS
  'Hora (0–23) em America/Sao_Paulo para disparo diário dos alertas de vencimento';
