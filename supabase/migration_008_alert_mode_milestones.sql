-- Modo de alerta: "period" (atual) ou "milestones" (marcos personalizados)
-- Cole no SQL Editor do Supabase e execute.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alert_mode TEXT NOT NULL DEFAULT 'period';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_alert_mode_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_alert_mode_check
  CHECK (alert_mode IN ('period', 'milestones'));

-- 4 marcos (dias antes do vencimento), do maior para o menor. 0 = vence hoje.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alert_milestones SMALLINT[] NOT NULL DEFAULT ARRAY[10, 7, 3, 0];

COMMENT ON COLUMN public.users.alert_mode IS
  'Modo de alerta: period (todos os dias até N) ou milestones (apenas nos marcos escolhidos)';

COMMENT ON COLUMN public.users.alert_milestones IS
  'Marcos (dias antes do vencimento, 0–30) em ordem decrescente. Usado quando alert_mode = milestones';
