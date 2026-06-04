import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getCatalogo } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Catálogo de partidos y series para poblar los dropdowns del buscador (TSE-3/PUB-1). */
export async function GET() {
  try {
    const catalogo = await getCatalogo(createSupabaseAdmin());
    return NextResponse.json(catalogo);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
