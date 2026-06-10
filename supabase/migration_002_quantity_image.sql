-- ============================================================
-- Mercado Giro Rápido — Migração 002
-- Quantidade + foto do produto + bucket de imagens
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- Novas colunas em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_quantity_positive;

ALTER TABLE public.products
  ADD CONSTRAINT products_quantity_positive CHECK (quantity > 0);

COMMENT ON COLUMN public.products.quantity IS 'Quantidade em estoque com essa validade';
COMMENT ON COLUMN public.products.image_url IS 'URL pública da foto no Supabase Storage';

-- View atualizada (DROP obrigatório: p.* mudou com as novas colunas)
DROP VIEW IF EXISTS public.products_expiring_soon;

CREATE VIEW public.products_expiring_soon AS
SELECT
  p.id,
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

-- Bucket para fotos dos produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas do Storage (leitura pública, upload aberto — fase de teste)
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

CREATE POLICY "product_images_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'product-images');
