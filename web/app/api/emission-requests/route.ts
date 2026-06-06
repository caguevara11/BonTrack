import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { createEmissionRequest } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (actor.role !== "partido" || !actor.partidoId) {
    return NextResponse.json({ error: "Solo un partido puede solicitar emisiones." }, { status: 403 });
  }

  let body: { serie?: string; cantidad?: number; valorNominal?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  try {
    const solicitud = await createEmissionRequest(createSupabaseAdmin(), {
      partidoId: actor.partidoId,
      serie: String(body.serie ?? ""),
      cantidad: Number(body.cantidad),
      valorNominal: Number(body.valorNominal),
      requestedBy: actor.userId,
    });
    return NextResponse.json({ ok: true, solicitud });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
