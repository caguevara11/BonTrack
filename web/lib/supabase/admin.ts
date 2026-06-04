import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service_role — SOLO en el servidor (API routes / seed).
 * Bypassa RLS: lo usamos para toda la lógica de negocio y la custodia de wallets.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL / service_role no configurados");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
