import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (ou SERVICE_ROLE_KEY) no .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocket,
  },
});
export function mapProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    expiryDate: row.expiry_date,
    quantity: row.quantity ?? 1,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}
