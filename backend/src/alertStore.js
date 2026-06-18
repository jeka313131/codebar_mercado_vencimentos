import { supabase } from "./supabase.js";

const ALERT_DAYS = [7, 3, 1];

export { ALERT_DAYS };

export async function listUsersForAlertHour(hour) {
  const { data, error } = await supabase
    .from("users")
    .select("id, whatsapp_group_id, alert_start_hour, display_name")
    .not("whatsapp_group_id", "is", null)
    .eq("alert_start_hour", hour);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAllAlertUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, whatsapp_group_id, alert_start_hour, display_name")
    .not("whatsapp_group_id", "is", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProductsExpiringOn(userId, expiryDate) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, quantity, expiry_date")
    .eq("user_id", userId)
    .eq("expiry_date", expiryDate);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function filterUnsentProducts(products, daysBeforeExpiry) {
  if (!products.length) return [];

  const ids = products.map((p) => p.id);
  const { data, error } = await supabase
    .from("alert_logs")
    .select("product_id")
    .in("product_id", ids)
    .eq("days_before_expiry", daysBeforeExpiry)
    .eq("channel", "whatsapp");

  if (error) throw new Error(error.message);

  const sent = new Set((data ?? []).map((row) => row.product_id));
  return products.filter((p) => !sent.has(p.id));
}

export async function insertAlertLogs(userId, products, daysBeforeExpiry, message) {
  if (!products.length) return;

  const rows = products.map((p) => ({
    user_id: userId,
    product_id: p.id,
    days_before_expiry: daysBeforeExpiry,
    channel: "whatsapp",
    message,
  }));

  const { error } = await supabase.from("alert_logs").insert(rows);
  if (error) throw new Error(error.message);
}
