import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBonoByIdentidad,
  getBonosByCedula,
  getBonosByPartidoNombre,
  getEventosByTokenIds,
  type BonoRow,
  type EventoRow,
} from "@/lib/db";
import { verificarBonosOnChain, type VerificacionCadena } from "@/lib/reconcile";

export const dynamic = "force-dynamic";

export type Resultado = {
  bono: BonoRow;
  eventos: EventoRow[];
  verificacion?: VerificacionCadena;
};

/**
 * Consulta de trazabilidad pública (FLUJO 4 / AC-4). Sin autenticación (PUB-1) —
 * todos los datos son públicos por ley (R20). Se sirve desde el índice en Supabase
 * (caché reconstruible de lo on-chain) para que la respuesta sea instantánea.
 *
 *   GET /api/trazabilidad?mode=bono&partido=PLN&serie=A&numero=4
 *   GET /api/trazabilidad?mode=cedula&cedula=1-1234-5678
 *   GET /api/trazabilidad?mode=bono&partido=PLN&serie=A&numero=4&verify=chain
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") ?? "bono";
  const verifyChain = sp.get("verify") === "chain";
  const admin = createSupabaseAdmin();

  try {
    let bonos: BonoRow[] = [];

    if (mode === "cedula") {
      const cedula = sp.get("cedula")?.trim();
      if (!cedula) return NextResponse.json({ error: "Falta la cédula." }, { status: 400 });
      bonos = await getBonosByCedula(admin, cedula);
    } else if (mode === "partido") {
      const partido = sp.get("partido")?.trim();
      if (!partido) return NextResponse.json({ error: "Falta el partido." }, { status: 400 });
      bonos = await getBonosByPartidoNombre(admin, partido);
    } else {
      const partido = sp.get("partido")?.trim();
      const serie = sp.get("serie")?.trim();
      const numero = Number(sp.get("numero"));
      if (!partido || !serie || !Number.isFinite(numero)) {
        return NextResponse.json(
          { error: "Indique partido, serie y número." },
          { status: 400 },
        );
      }
      const bono = await getBonoByIdentidad(admin, partido, serie, numero);
      bonos = bono ? [bono] : [];
    }

    const eventosPorBono = await getEventosByTokenIds(
      admin,
      bonos.map((b) => b.token_id),
    );
    const verificacionPorBono = verifyChain
      ? await verificarBonosOnChain(bonos)
      : new Map<number, VerificacionCadena>();

    const resultados: Resultado[] = bonos.map((bono) => ({
      bono,
      eventos: eventosPorBono.get(bono.token_id) ?? [],
      verificacion: verificacionPorBono.get(bono.token_id),
    }));

    return NextResponse.json({ resultados });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
