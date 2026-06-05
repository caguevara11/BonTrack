import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCustodialWallet } from "./wallets";
import type { NuevoTenedor } from "./eligibility";
import { getContractId, mintBono } from "./stellar";

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

export type EmissionRequestRow = {
  id: string;
  partido_id: string;
  serie: string;
  cantidad: number;
  valor_nominal: number;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  motivo_rechazo: string | null;
  requested_by: string | null;
  reviewed_by: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  partido?: {
    nombre: string;
    slug: string;
    tipo_eleccion: string;
  } | null;
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

export async function getEmissionRequestsForPartido(
  admin: SupabaseClient,
  partidoId: string,
): Promise<EmissionRequestRow[]> {
  const { data } = await admin
    .from("emission_requests")
    .select("*, partido:partidos(nombre, slug, tipo_eleccion)")
    .eq("partido_id", partidoId)
    .order("requested_at", { ascending: false });
  return (data ?? []) as EmissionRequestRow[];
}

export async function getPendingEmissionRequests(
  admin: SupabaseClient,
): Promise<EmissionRequestRow[]> {
  const { data } = await admin
    .from("emission_requests")
    .select("*, partido:partidos(nombre, slug, tipo_eleccion)")
    .eq("estado", "PENDIENTE")
    .order("requested_at", { ascending: true });
  return (data ?? []) as EmissionRequestRow[];
}

export async function createEmissionRequest(
  admin: SupabaseClient,
  input: {
    partidoId: string;
    serie: string;
    cantidad: number;
    valorNominal: number;
    requestedBy: string;
  },
): Promise<EmissionRequestRow> {
  const serie = input.serie.trim().toUpperCase();
  if (!/^[A-Z]$/.test(serie)) throw new Error("La serie debe ser una letra de A a Z.");
  if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) {
    throw new Error("La cantidad debe ser un entero mayor a 0.");
  }
  if (!Number.isFinite(input.valorNominal) || input.valorNominal <= 0) {
    throw new Error("El valor nominal debe ser mayor a 0.");
  }

  const { data, error } = await admin
    .from("emission_requests")
    .insert({
      partido_id: input.partidoId,
      serie,
      cantidad: input.cantidad,
      valor_nominal: input.valorNominal,
      requested_by: input.requestedBy,
    })
    .select("*, partido:partidos(nombre, slug, tipo_eleccion)")
    .single();
  if (error) throw new Error(`No se pudo crear la solicitud: ${error.message}`);
  return data as EmissionRequestRow;
}

export async function rejectEmissionRequest(
  admin: SupabaseClient,
  input: { requestId: string; reviewedBy: string; motivo: string },
): Promise<void> {
  const motivo = input.motivo.trim();
  if (!motivo) throw new Error("El motivo de rechazo es obligatorio.");

  const { error } = await admin
    .from("emission_requests")
    .update({
      estado: "RECHAZADA",
      motivo_rechazo: motivo,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .eq("estado", "PENDIENTE");
  if (error) throw new Error(`No se pudo rechazar la solicitud: ${error.message}`);
}

async function ensurePartidoWallet(
  admin: SupabaseClient,
  partidoId: string,
): Promise<{ nombre: string; publicKey: string }> {
  const { data: partido, error } = await admin
    .from("partidos")
    .select("id, nombre, wallet_id, wallet:wallets(public_key)")
    .eq("id", partidoId)
    .single();
  if (error || !partido) throw new Error("Partido no encontrado.");

  const existingPublicKey =
    (partido.wallet as unknown as { public_key: string } | null)?.public_key ?? null;
  if (existingPublicKey) {
    return { nombre: partido.nombre as string, publicKey: existingPublicKey };
  }

  const wallet = await createCustodialWallet(admin, partido.nombre as string);
  const { error: updateError } = await admin
    .from("partidos")
    .update({ wallet_id: wallet.id })
    .eq("id", partidoId);
  if (updateError) throw new Error(`No se pudo asociar wallet al partido: ${updateError.message}`);

  return { nombre: partido.nombre as string, publicKey: wallet.publicKey };
}

export async function approveEmissionRequest(
  admin: SupabaseClient,
  input: { requestId: string; reviewedBy: string },
): Promise<{ minted: number }> {
  const { data: request, error } = await admin
    .from("emission_requests")
    .select("*, partido:partidos(nombre, slug, tipo_eleccion)")
    .eq("id", input.requestId)
    .single();
  if (error || !request) throw new Error("Solicitud no encontrada.");

  const solicitud = request as EmissionRequestRow;
  if (solicitud.estado !== "PENDIENTE") {
    throw new Error("Esta solicitud ya fue revisada.");
  }

  const partido = await ensurePartidoWallet(admin, solicitud.partido_id);
  const contractId = getContractId();
  const { data: lastBono } = await admin
    .from("bonos")
    .select("numero")
    .eq("partido_id", solicitud.partido_id)
    .eq("serie", solicitud.serie)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const startNumero = Number(lastBono?.numero ?? 0) + 1;
  const fechaEmision = new Date().toISOString().slice(0, 10);

  for (let offset = 0; offset < solicitud.cantidad; offset++) {
    const numero = startNumero + offset;
    const { tokenId, hash } = await mintBono(partido.publicKey, {
      partido: partido.nombre,
      serie: solicitud.serie,
      numero,
      valorNominal: BigInt(solicitud.valor_nominal),
      fechaEmision,
    });

    const { error: bonoError } = await admin.from("bonos").insert({
      token_id: tokenId,
      partido: partido.nombre,
      serie: solicitud.serie,
      numero,
      valor_nominal: solicitud.valor_nominal,
      fecha_emision: fechaEmision,
      partido_id: solicitud.partido_id,
      current_owner_pubkey: partido.publicKey,
      estado: "EMITIDO",
      contract_id: contractId,
    });
    if (bonoError) throw new Error(`No se pudo cachear el bono ${numero}: ${bonoError.message}`);

    const { error: eventoError } = await admin.from("eventos").insert({
      token_id: tokenId,
      tipo: "EMISION",
      from_pubkey: null,
      to_pubkey: partido.publicKey,
      from_label: null,
      to_label: partido.nombre,
      precio: null,
      ts: new Date().toISOString(),
      tx_hash: hash,
      registrado_por: "TSE",
    });
    if (eventoError) {
      throw new Error(`No se pudo cachear el evento de emisión: ${eventoError.message}`);
    }
  }

  const { error: updateError } = await admin
    .from("emission_requests")
    .update({
      estado: "APROBADA",
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);
  if (updateError) throw new Error(`No se pudo aprobar la solicitud: ${updateError.message}`);

  return { minted: solicitud.cantidad };
}
