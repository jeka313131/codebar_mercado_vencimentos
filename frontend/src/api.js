import { requireSupabase } from "./utils/supabase/client.js";

const PRODUCT_COLUMNS = "id, barcode, name, expiry_date, created_at";

function mapProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
  };
}

export async function fetchProducts() {
  const { data, error } = await requireSupabase()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error("Não foi possível carregar os produtos.");
  }

  return data.map(mapProduct);
}

export async function saveProduct({ barcode, name, expiryDate }) {
  const { data, error } = await requireSupabase()
    .from("products")
    .insert({
      barcode: barcode.trim(),
      name: name.trim(),
      expiry_date: expiryDate,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Não foi possível salvar.");
  }

  return mapProduct(data);
}
