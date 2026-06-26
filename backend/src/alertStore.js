import { addDaysToIso, daysBetweenIso } from "./timezone.js";
import { supabase } from "./supabase.js";

export async function listUsersForAlertHour(hour) {
  const { data, error } = await supabase
    .from("users")
    .select("id, whatsapp_group_id, alert_start_hour, alert_days_before, display_name")
    .not("whatsapp_group_id", "is", null)
    .eq("alert_start_hour", hour);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAllAlertUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, whatsapp_group_id, alert_start_hour, alert_days_before, display_name")
    .not("whatsapp_group_id", "is", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProductsExpiringWithin(userId, today, maxDays) {
  const maxDate = addDaysToIso(today, maxDays);

  const { data, error } = await supabase
    .from("products")
    .select("id, name, quantity, expiry_date, image_url")
    .eq("user_id", userId)
    .gte("expiry_date", today)
    .lte("expiry_date", maxDate)
    .order("expiry_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function attachDaysRemaining(products, today) {
  return products.map((product) => ({
    product,
    daysBeforeExpiry: daysBetweenIso(today, product.expiry_date),
  }));
}

export async function filterUnsentAlertEntries(entries) {
  if (!entries.length) return [];

  const ids = [...new Set(entries.map((e) => e.product.id))];
  const { data, error } = await supabase
    .from("alert_logs")
    .select("product_id, days_before_expiry")
    .in("product_id", ids)
    .eq("channel", "whatsapp");

  if (error) throw new Error(error.message);

  const sent = new Set(
    (data ?? []).map((row) => `${row.product_id}:${row.days_before_expiry}`),
  );

  return entries.filter(
    (entry) => !sent.has(`${entry.product.id}:${entry.daysBeforeExpiry}`),
  );
}

export async function insertAlertLog(userId, product, daysBeforeExpiry, message) {
  const { error } = await supabase.from("alert_logs").insert({
    user_id: userId,
    product_id: product.id,
    days_before_expiry: daysBeforeExpiry,
    channel: "whatsapp",
    message,
  });
  if (error) throw new Error(error.message);
}
