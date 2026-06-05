import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBonosByCedula,
  getBonosByFiltros,
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

export type TrazabilidadResponse = {
  resultados: Resultado[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Consulta de trazabilidad pública (FLUJO 4 / AC-4). Sin autenticación (PUB-1) —
 * todos los datos son públicos por ley (R20). Se sirve desde el índice en Supabase
 * (caché reconstruible de lo on-chain) para que la respuesta sea instantánea.
 *
 *   GET /api/trazabilidad?mode=bono&partido=PLN&serie=A&numero=4
 *   GET /api/trazabilidad?mode=bono&partido=PLN&serie=A
 *   GET /api/trazabilidad?mode=bono&page=1&pageSize=10
 *   GET /api/trazabilidad?mode=cedula&cedula=1-1234-5678
 *   GET /api/trazabilidad?mode=bono&partido=PLN&serie=A&numero=4&verify=chain
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") ?? "bono";
  const verifyChain = sp.get("verify") === "chain";
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(25, Math.max(1, Number(sp.get("pageSize") ?? 10) || 10));
  const admin = createSupabaseAdmin();

  try {
    let bonos: BonoRow[] = [];
    let total = 0;

    if (mode === "cedula") {
      const cedula = sp.get("cedula")?.trim();
      if (!cedula) return NextResponse.json({ error: "Falta la cédula." }, { status: 400 });
      bonos = await getBonosByCedula(admin, cedula);
      total = bonos.length;
    } else if (mode === "partido") {
      const partido = sp.get("partido")?.trim();
      if (!partido) return NextResponse.json({ error: "Falta el partido." }, { status: 400 });
      bonos = await getBonosByPartidoNombre(admin, partido);
      total = bonos.length;
    } else {
      const partido = sp.get("partido")?.trim();
      const serie = sp.get("serie")?.trim();
      const numeroParam = sp.get("numero")?.trim();
      const numero = numeroParam ? Number(numeroParam) : null;
      if (numero !== null && (!Number.isInteger(numero) || numero < 1)) {
        return NextResponse.json({ error: "El número de bono no es válido." }, { status: 400 });
      }
      const result = await getBonosByFiltros(
        admin,
        {
          partido,
          serie,
          numero: numero ?? undefined,
        },
        { page, pageSize },
      );
      bonos = result.bonos;
      total = result.total;
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

    return NextResponse.json({
      resultados,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    } satisfies TrazabilidadResponse);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
