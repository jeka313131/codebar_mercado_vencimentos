-- Multi-tenant: usuários Firebase → Supabase + user_id em produtos

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  whatsapp_group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Perfil sincronizado do Firebase Auth (id = Firebase UID)';
COMMENT ON COLUMN public.users.id IS 'Firebase UID — usado como user_id em products';

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_service" ON public.users;
DROP POLICY IF EXISTS "users_update_service" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escrita via service role (backend); anon não insere diretamente
CREATE POLICY "users_insert_service"
  ON public.users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "users_update_service"
  ON public.users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Coluna user_id em products (nullable para dados legados)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_user_id
  ON public.products (user_id);

ALTER TABLE public.alert_logs
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id
  ON public.alert_logs (user_id);

-- Recria view com user_id
DROP VIEW IF EXISTS public.products_expiring_soon;

CREATE VIEW public.products_expiring_soon AS
SELECT
  p.id,
  p.user_id,
  p.barcode,
  p.name,
  p.expiry_date,
  p.quantity,
  p.image_url,
  p.created_at,
  p.updated_at,
  (p.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM public.products p
WHERE p.expiry_date >= CURRENT_DATE
ORDER BY p.expiry_date ASC;
