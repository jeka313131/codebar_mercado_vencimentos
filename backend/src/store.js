import { mapProduct, supabase } from "./supabase.js";
import { addDaysToIso, getBrasiliaNow } from "./timezone.js";
import { compressProductImage } from "./imageCompress.js";
import { isVpsImageStorageConfigured, uploadImageToVps } from "./vpsImageStorage.js";

const PRODUCT_COLUMNS =
  "id, barcode, name, expiry_date, quantity, image_url, created_at, user_id";

export async function listAllProducts(userId) {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("user_id", userId)
    .order("expiry_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data.map(mapProduct);
}

export async function listExpiringProducts(userId, filterDays) {
  const { date: today } = getBrasiliaNow();
  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("user_id", userId)
    .order("expiry_date", { ascending: true });

  if (filterDays === 0) {
    query = query.eq("expiry_date", today);
  } else {
    const end = addDaysToIso(today, filterDays);
    query = query.gte("expiry_date", today).lte("expiry_date", end);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapProduct);
}

export async function listProductCatalog(userId) {
  const { data, error } = await supabase
    .from("products")
    .select("barcode, name, image_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const seen = new Set();
  const items = [];

  for (const row of data) {
    const barcode = row.barcode?.trim();
    if (!barcode || seen.has(barcode)) continue;
    seen.add(barcode);
    items.push({
      barcode,
      name: row.name,
      imageUrl: row.image_url ?? null,
    });
  }

  return items;
}

export async function addProduct(userId, { barcode, name, expiryDate, quantity, imageUrl }) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: userId,
      barcode: barcode.trim(),
      name: name.trim(),
      expiry_date: expiryDate,
      quantity: Number(quantity) || 1,
      image_url: imageUrl || null,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function updateProduct(userId, id, { barcode, name, expiryDate, quantity, imageUrl }) {
  const { data, error } = await supabase
    .from("products")
    .update({
      barcode: barcode.trim(),
      name: name.trim(),
      expiry_date: expiryDate,
      quantity: Number(quantity) || 1,
      image_url: imageUrl || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function removeProduct(userId, id) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function uploadProductImage(userId, buffer) {
  const compressed = await compressProductImage(buffer);
  const relativePath = `${userId}/${crypto.randomUUID()}.jpg`;

  if (isVpsImageStorageConfigured()) {
    return uploadImageToVps(relativePath, compressed.buffer);
  }

  const { error } = await supabase.storage.from("product-images").upload(relativePath, compressed.buffer, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("product-images").getPublicUrl(relativePath);
  return data.publicUrl;
}
