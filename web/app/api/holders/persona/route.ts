import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { getPersonaHolderByCedula } from "@/lib/db";
import { esCedulaCostarricense } from "@/lib/eligibility";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["partido", "tenedor"].includes(actor.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula")?.replace(/[\s-]/g, "") ?? "";
  if (!esCedulaCostarricense(cedula)) {
    return NextResponse.json({ error: "Cédula inválida." }, { status: 400 });
  }

  const holder = await getPersonaHolderByCedula(createSupabaseAdmin(), cedula);
  return NextResponse.json({ found: Boolean(holder), holder });
}
