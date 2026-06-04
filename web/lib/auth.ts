import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "./supabase/server";
import { createSupabaseAdmin } from "./supabase/admin";

export type Role = "tse" | "partido" | "tenedor";

export type Actor = {
  userId: string;
  role: Role;
  displayName: string;
  partidoId: string | null;
  holderId: string | null;
  /** Wallet del actor (tenedor → su wallet; partido → wallet del partido). */
  ownerPubkey: string | null;
};

/**
 * Lee el actor logueado (sesión + perfil). Devuelve null si no hay sesión.
 * Memoizado por request con React.cache: varias llamadas (página + layout +
 * generateMetadata) ejecutan las queries una sola vez.
 */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const supa = await createSupabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, display_name, partido_id, holder_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  let ownerPubkey: string | null = null;
  if (profile.role === "tenedor" && profile.holder_id) {
    const { data } = await admin
      .from("holders")
      .select("wallet:wallets(public_key)")
      .eq("id", profile.holder_id)
      .maybeSingle();
    ownerPubkey = (data?.wallet as unknown as { public_key: string } | null)?.public_key ?? null;
  } else if (profile.role === "partido" && profile.partido_id) {
    const { data } = await admin
      .from("partidos")
      .select("wallet:wallets(public_key)")
      .eq("id", profile.partido_id)
      .maybeSingle();
    ownerPubkey = (data?.wallet as unknown as { public_key: string } | null)?.public_key ?? null;
  }

  return {
    userId: user.id,
    role: profile.role as Role,
    displayName: profile.display_name,
    partidoId: profile.partido_id,
    holderId: profile.holder_id,
    ownerPubkey,
  };
});

export function homeForRole(role: Role): string {
  return role === "tse" ? "/tse" : role === "partido" ? "/partido" : "/tenedor";
}
