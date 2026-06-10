import { mapProduct, supabase } from "./supabase.js";

const PRODUCT_COLUMNS =
  "id, barcode, name, expiry_date, quantity, image_url, created_at";

export async function listProducts(limit = 20) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapProduct);
}

export async function addProduct({ barcode, name, expiryDate, quantity, imageUrl }) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      barcode: barcode.trim(),
      name: name.trim(),
      expiry_date: expiryDate,
      quantity: Number(quantity) || 1,
      image_url: imageUrl || null,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProduct(data);
}
