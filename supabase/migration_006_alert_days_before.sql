-- Antecedência (dias) para alerta de vencimento no WhatsApp
-- Cole no SQL Editor do Supabase e execute.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alert_days_before SMALLINT NOT NULL DEFAULT 7;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_alert_days_before_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_alert_days_before_check
  CHECK (alert_days_before >= 1 AND alert_days_before <= 31);

COMMENT ON COLUMN public.users.alert_days_before IS
  'Dias de antecedência para alerta de vencimento (1–31)';

ALTER TABLE public.alert_logs
  DROP CONSTRAINT IF EXISTS alert_logs_days_check;

ALTER TABLE public.alert_logs
  ADD CONSTRAINT alert_logs_days_check
  CHECK (days_before_expiry >= 1 AND days_before_expiry <= 31);

COMMENT ON COLUMN public.alert_logs.days_before_expiry IS
  'Quantos dias antes do vencimento o alerta foi enviado (1–31)';
