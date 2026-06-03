-- ============================================================
-- Mercado Giro Rápido — Schema inicial
-- Cole no SQL Editor do Supabase:
-- Dashboard → SQL → New query → Run
-- ============================================================

-- Produtos cadastrados pelo leitor de barcode
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_barcode_not_empty CHECK (char_length(trim(barcode)) > 0),
  CONSTRAINT products_name_not_empty CHECK (char_length(trim(name)) > 0)
);

COMMENT ON TABLE public.products IS 'Produtos com validade curta cadastrados no mercado';
COMMENT ON COLUMN public.products.barcode IS 'Código de barras EAN/UPC';
COMMENT ON COLUMN public.products.name IS 'Nome do produto';
COMMENT ON COLUMN public.products.expiry_date IS 'Data de vencimento';

CREATE INDEX IF NOT EXISTS idx_products_expiry_date
  ON public.products (expiry_date);

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON public.products (barcode);

-- Histórico de alertas enviados (WhatsApp 7/3/1 dia — uso futuro)
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  days_before_expiry SMALLINT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT alert_logs_days_check CHECK (days_before_expiry IN (7, 3, 1)),
  CONSTRAINT alert_logs_channel_not_empty CHECK (char_length(trim(channel)) > 0),
  CONSTRAINT alert_logs_unique_alert UNIQUE (product_id, days_before_expiry, channel)
);

COMMENT ON TABLE public.alert_logs IS 'Registro de alertas de vencimento já enviados';
COMMENT ON COLUMN public.alert_logs.days_before_expiry IS 'Quantos dias antes do vencimento (7, 3 ou 1)';

CREATE INDEX IF NOT EXISTS idx_alert_logs_product_id
  ON public.alert_logs (product_id);

CREATE INDEX IF NOT EXISTS idx_alert_logs_sent_at
  ON public.alert_logs (sent_at DESC);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Políticas abertas para fase de teste (troque quando tiver login)
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_all" ON public.products;
DROP POLICY IF EXISTS "products_update_all" ON public.products;
DROP POLICY IF EXISTS "products_delete_all" ON public.products;

CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "products_insert_all"
  ON public.products FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "products_update_all"
  ON public.products FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete_all"
  ON public.products FOR DELETE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "alert_logs_select_all" ON public.alert_logs;
DROP POLICY IF EXISTS "alert_logs_insert_all" ON public.alert_logs;

CREATE POLICY "alert_logs_select_all"
  ON public.alert_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "alert_logs_insert_all"
  ON public.alert_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- View útil: produtos que vencem em X dias (para alertas futuros)
CREATE OR REPLACE VIEW public.products_expiring_soon AS
SELECT
  p.*,
  (p.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM public.products p
WHERE p.expiry_date >= CURRENT_DATE
ORDER BY p.expiry_date ASC;

COMMENT ON VIEW public.products_expiring_soon IS 'Produtos ainda não vencidos, ordenados por vencimento';
