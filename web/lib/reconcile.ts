import "server-only";
import { getBono, ownerOf } from "@/lib/stellar";
import type { BonoRow } from "@/lib/db";

export type VerificacionCadena = {
  ok: boolean;
  ownerOnChain: string | null;
  metadataOk: boolean;
  ownerOk: boolean;
  checkedAt: string;
  diferencias: string[];
};

function sameText(a: unknown, b: unknown): boolean {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function sameNumber(a: unknown, b: unknown): boolean {
  return Number(a) === Number(b);
}

/** Compara el índice Supabase de un bono contra la fuente de verdad on-chain. */
export async function verificarBonoOnChain(bono: BonoRow): Promise<VerificacionCadena> {
  const diferencias: string[] = [];

  try {
    const [owner, meta] = await Promise.all([ownerOf(bono.token_id), getBono(bono.token_id)]);

    if (owner !== bono.current_owner_pubkey) {
      diferencias.push("tenedor_actual");
    }
    if (!sameText(meta.partido, bono.partido)) diferencias.push("partido");
    if (!sameText(meta.serie, bono.serie)) diferencias.push("serie");
    if (!sameNumber(meta.numero, bono.numero)) diferencias.push("numero");
    if (!sameNumber(meta.valor_nominal, bono.valor_nominal)) {
      diferencias.push("valor_nominal");
    }
    if (!sameText(meta.fecha_emision, bono.fecha_emision)) {
      diferencias.push("fecha_emision");
    }

    const ownerOk = owner === bono.current_owner_pubkey;
    const metadataOk = diferencias.every((d) => d === "tenedor_actual");

    return {
      ok: diferencias.length === 0,
      ownerOnChain: owner,
      ownerOk,
      metadataOk,
      checkedAt: new Date().toISOString(),
      diferencias,
    };
  } catch (e) {
    return {
      ok: false,
      ownerOnChain: null,
      ownerOk: false,
      metadataOk: false,
      checkedAt: new Date().toISOString(),
      diferencias: [`chain_error:${(e as Error).message}`],
    };
  }
}

export async function verificarBonosOnChain(bonos: BonoRow[]): Promise<Map<number, VerificacionCadena>> {
  const map = new Map<number, VerificacionCadena>();
  for (const bono of bonos) {
    map.set(bono.token_id, await verificarBonoOnChain(bono));
  }
  return map;
}
