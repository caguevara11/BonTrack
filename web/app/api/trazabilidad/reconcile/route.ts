import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAllBonos } from "@/lib/db";
import { verificarBonosOnChain } from "@/lib/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Reconciliación operativa del índice Supabase contra Stellar.
 *
 * Supabase es cache reconstruible; esta ruta verifica metadata + owner actual
 * contra `get_bono` y `owner_of` para detectar desalineaciones.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("x-seed-secret") !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const bonos = await getAllBonos(admin);
  const verificacionPorBono = await verificarBonosOnChain(bonos);

  const resultados = bonos.map((bono) => {
    const verificacion = verificacionPorBono.get(bono.token_id)!;
    return {
      token_id: bono.token_id,
      identidad: `${bono.partido}-${bono.serie}-${bono.numero}`,
      ok: verificacion.ok,
      ownerOk: verificacion.ownerOk,
      metadataOk: verificacion.metadataOk,
      ownerIndexado: bono.current_owner_pubkey,
      ownerOnChain: verificacion.ownerOnChain,
      diferencias: verificacion.diferencias,
      checkedAt: verificacion.checkedAt,
    };
  });

  const desalineados = resultados.filter((r) => !r.ok);

  return NextResponse.json({
    ok: desalineados.length === 0,
    total: resultados.length,
    desalineados: desalineados.length,
    resultados,
  });
}
