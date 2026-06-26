-- Permite registrar alerta no dia do vencimento (days_before_expiry = 0)
-- Cole no SQL Editor do Supabase e execute.

ALTER TABLE public.alert_logs
  DROP CONSTRAINT IF EXISTS alert_logs_days_check;

ALTER TABLE public.alert_logs
  ADD CONSTRAINT alert_logs_days_check
  CHECK (days_before_expiry >= 0 AND days_before_expiry <= 31);

COMMENT ON COLUMN public.alert_logs.days_before_expiry IS
  'Quantos dias antes do vencimento o alerta foi enviado (0 = vence hoje, até 31)';
