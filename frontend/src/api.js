import { requireSupabase } from "./utils/supabase/client.js";
import { addDaysIso, todayIso } from "./utils/dates.js";

const PRODUCT_COLUMNS =
  "id, barcode, name, expiry_date, quantity, image_url, created_at";

const PLACEHOLDER_IMAGE = "/placeholder-product.svg";

function mapProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    expiryDate: row.expiry_date,
    quantity: row.quantity ?? 1,
    imageUrl: row.image_url || PLACEHOLDER_IMAGE,
    createdAt: row.created_at,
  };
}

export function getPlaceholderImage() {
  return PLACEHOLDER_IMAGE;
}

export async function fetchAllProducts() {
  const { data, error } = await requireSupabase()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os produtos.");
  }

  return data.map(mapProduct);
}

export async function fetchProductsExpiring(filterDays) {
  const today = todayIso();
  let query = requireSupabase()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("expiry_date", { ascending: true });

  if (filterDays === 0) {
    query = query.eq("expiry_date", today);
  } else if (filterDays === 1) {
    query = query.eq("expiry_date", addDaysIso(today, 1));
  } else {
    const end = addDaysIso(today, filterDays);
    query = query.gte("expiry_date", today).lte("expiry_date", end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os produtos.");
  }

  return data.map(mapProduct);
}

export async function uploadProductImage(file) {
  const supabase = requireSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(error.message || "Não foi possível enviar a foto.");
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function fetchProductCatalog() {
  const { data, error } = await requireSupabase()
    .from("products")
    .select("barcode, name, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar o catálogo.");
  }

  const seen = new Set();
  const items = [];

  for (const row of data) {
    const barcode = row.barcode?.trim();
    if (!barcode || seen.has(barcode)) continue;
    seen.add(barcode);
    items.push({
      barcode,
      name: row.name,
      imageUrl: row.image_url || PLACEHOLDER_IMAGE,
    });
  }

  return items;
}

export async function updateProduct(id, { barcode, name, expiryDate, quantity, imageUrl }) {
  const { data, error } = await requireSupabase()
    .from("products")
    .update({
      barcode: barcode.trim(),
      name: name.trim(),
      expiry_date: expiryDate,
      quantity: Number(quantity) || 1,
      image_url: imageUrl || null,
    })
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Não foi possível atualizar.");
  }

  return mapProduct(data);
}

export async function deleteProduct(id) {
  const { error } = await requireSupabase()
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Não foi possível excluir.");
  }
}

export async function saveProduct({ barcode, name, expiryDate, quantity, imageUrl }) {
  const { data, error } = await requireSupabase()
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
    throw new Error(error.message || "Não foi possível salvar.");
  }

  return mapProduct(data);
}
