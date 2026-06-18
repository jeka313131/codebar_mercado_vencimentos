-- Bloqueia acesso direto anon/authenticated em products (uso via backend + service role)

DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_all" ON public.products;
DROP POLICY IF EXISTS "products_update_all" ON public.products;
DROP POLICY IF EXISTS "products_delete_all" ON public.products;

-- Sem políticas para anon/authenticated = acesso negado pelo RLS
