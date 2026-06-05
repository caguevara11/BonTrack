import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCustodialWallet } from "./wallets";
import type { NuevoTenedor } from "./eligibility";

export type BonoRow = {
  token_id: number;
  partido: string;
  serie: string;
  numero: number;
  valor_nominal: number;
  fecha_emision: string;
  partido_id: string | null;
  current_owner_pubkey: string;
  estado: string;
  contract_id: string;
  updated_at: string;
};

export type EventoRow = {
  id: string;
  token_id: number;
  tipo: "EMISION" | "COLOCACION" | "ENDOSO";
  from_pubkey: string | null;
  to_pubkey: string;
  from_label: string | null;
  to_label: string;
  precio: number | null;
  ts: string;
  tx_hash: string | null;
  registrado_por: string | null;
};

export type PaginatedBonos = {
  bonos: BonoRow[];
  total: number;
};

/** Etiqueta legible de un tenedor para mostrar en la trazabilidad. */
export function formatHolderLabel(t: {
  tipo: string;
  nombre: string;
  cedula: string;
  entidad?: string | null;
}): string {
  if (t.tipo === "persona") return `${t.nombre} (${t.cedula})`;
  return `${t.entidad ?? t.nombre} (${t.cedula})`;
}

type HolderIdentity = {
  id: string;
  tipo: string;
  nombre: string;
  cedula: string;
  entidad: string | null;
  wallet: { public_key: string } | null;
};

/**
 * Busca un tenedor por identificación; si no existe,
 * crea su wallet custodial y el registro. Devuelve la public key de su wallet.
 */
export async function findOrCreateHolder(
  admin: SupabaseClient,
  t: NuevoTenedor,
): Promise<{ holderId: string; publicKey: string; label: string }> {
  let query = admin
    .from("holders")
    .select("id, tipo, nombre, cedula, entidad, wallet:wallets(public_key)")
    .eq("tipo", t.tipo)
    .eq("cedula", t.cedula);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const holder = existing as unknown as HolderIdentity;
    const pk = holder.wallet?.public_key;
    if (pk) {
      return {
        holderId: holder.id,
        publicKey: pk,
        label: formatHolderLabel(holder),
      };
    }
  }

  const label = formatHolderLabel(t);
  const wallet = await createCustodialWallet(admin, label);
  const { data, error } = await admin
    .from("holders")
    .insert({
      tipo: t.tipo,
      nombre: t.nombre,
      cedula: t.cedula,
      entidad: t.entidad ?? null,
      wallet_id: wallet.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el tenedor: ${error.message}`);
  return { holderId: data.id, publicKey: wallet.publicKey, label };
}

export async function getPersonaHolderByCedula(
  admin: SupabaseClient,
  cedula: string,
): Promise<{ id: string; nombre: string; cedula: string } | null> {
  const limpia = cedula.replace(/[\s-]/g, "");
  const { data } = await admin
    .from("holders")
    .select("id, nombre, cedula")
    .eq("tipo", "persona")
    .eq("cedula", limpia)
    .maybeSingle();
  return data as { id: string; nombre: string; cedula: string } | null;
}

export async function getBonoByIdentidad(
  admin: SupabaseClient,
  partido: string,
  serie: string,
  numero: number,
): Promise<BonoRow | null> {
  const { data } = await admin
    .from("bonos")
    .select("*")
    .eq("partido", partido)
    .eq("serie", serie)
    .eq("numero", numero)
    .maybeSingle();
  return data as BonoRow | null;
}

export async function getBonosByFiltros(
  admin: SupabaseClient,
  filtros: { partido?: string; serie?: string; numero?: number },
  pagination?: { page: number; pageSize: number },
): Promise<PaginatedBonos> {
  let query = admin.from("bonos").select("*", { count: "exact" });
  if (filtros.partido) query = query.eq("partido", filtros.partido);
  if (filtros.serie) query = query.eq("serie", filtros.serie);
  if (typeof filtros.numero === "number") query = query.eq("numero", filtros.numero);
  query = query
    .order("partido", { ascending: true })
    .order("serie", { ascending: true })
    .order("numero", { ascending: true });
  if (pagination) {
    const from = (pagination.page - 1) * pagination.pageSize;
    query = query.range(from, from + pagination.pageSize - 1);
  }
  const { data, count } = await query;
  return { bonos: (data ?? []) as BonoRow[], total: count ?? 0 };
}

export async function getBonoByTokenId(
  admin: SupabaseClient,
  tokenId: number,
): Promise<BonoRow | null> {
  const { data } = await admin.from("bonos").select("*").eq("token_id", tokenId).maybeSingle();
  return data as BonoRow | null;
}

export async function getEventos(
  admin: SupabaseClient,
  tokenId: number,
): Promise<EventoRow[]> {
  const { data } = await admin
    .from("eventos")
    .select("*")
    .eq("token_id", tokenId)
    .order("ts", { ascending: false });
  return (data ?? []) as EventoRow[];
}

/**
 * Eventos de varios bonos en UNA sola query (evita el N+1 al listar bonos).
 * Devuelve un Map token_id -> eventos (más reciente primero).
 */
export async function getEventosByTokenIds(
  admin: SupabaseClient,
  tokenIds: number[],
): Promise<Map<number, EventoRow[]>> {
  const map = new Map<number, EventoRow[]>();
  if (tokenIds.length === 0) return map;
  const { data } = await admin
    .from("eventos")
    .select("*")
    .in("token_id", tokenIds)
    .order("ts", { ascending: false });
  for (const ev of (data ?? []) as EventoRow[]) {
    const arr = map.get(ev.token_id);
    if (arr) arr.push(ev);
    else map.set(ev.token_id, [ev]);
  }
  return map;
}

export async function getBonosByOwner(
  admin: SupabaseClient,
  ownerPubkey: string,
): Promise<BonoRow[]> {
  const { data } = await admin
    .from("bonos")
    .select("*")
    .eq("current_owner_pubkey", ownerPubkey)
    .order("numero", { ascending: true });
  return (data ?? []) as BonoRow[];
}

/** Todos los bonos del índice local, para reconciliación contra la cadena. */
export async function getAllBonos(admin: SupabaseClient): Promise<BonoRow[]> {
  const { data } = await admin
    .from("bonos")
    .select("*")
    .order("partido", { ascending: true })
    .order("serie", { ascending: true })
    .order("numero", { ascending: true });
  return (data ?? []) as BonoRow[];
}

/** Bonos actualmente en poder de una cédula (AC-4.4). */
export async function getBonosByCedula(
  admin: SupabaseClient,
  cedula: string,
): Promise<BonoRow[]> {
  const limpia = cedula.replace(/[\s-]/g, "");
  const { data: holders } = await admin
    .from("holders")
    .select("wallet:wallets(public_key)")
    .eq("cedula", limpia);
  const pubkeys = (holders ?? [])
    .map((h) => (h.wallet as unknown as { public_key: string } | null)?.public_key)
    .filter(Boolean) as string[];
  if (pubkeys.length === 0) return [];
  const { data } = await admin
    .from("bonos")
    .select("*")
    .in("current_owner_pubkey", pubkeys)
    .order("numero", { ascending: true });
  return (data ?? []) as BonoRow[];
}

/** Bonos de un partido (vista del partido — lee la cadena pública filtrada a lo suyo). */
export async function getBonosByPartidoId(
  admin: SupabaseClient,
  partidoId: string,
): Promise<BonoRow[]> {
  const { data } = await admin
    .from("bonos")
    .select("*")
    .eq("partido_id", partidoId)
    .order("numero", { ascending: true });
  return (data ?? []) as BonoRow[];
}

/** Todos los bonos de un partido por nombre (modo de búsqueda "por partido", TSE-3/PUB-1). */
export async function getBonosByPartidoNombre(
  admin: SupabaseClient,
  partido: string,
): Promise<BonoRow[]> {
  const { data } = await admin
    .from("bonos")
    .select("*")
    .eq("partido", partido)
    .order("serie", { ascending: true })
    .order("numero", { ascending: true });
  return (data ?? []) as BonoRow[];
}

/** Catálogo de partidos y series presentes (para poblar los dropdowns del buscador). */
export async function getCatalogo(
  admin: SupabaseClient,
): Promise<{ partidos: string[]; series: string[] }> {
  const { data } = await admin.from("bonos").select("partido, serie");
  const partidos = [...new Set((data ?? []).map((b) => b.partido as string))].sort();
  const series = [...new Set((data ?? []).map((b) => b.serie as string))].sort();
  return { partidos, series };
}
