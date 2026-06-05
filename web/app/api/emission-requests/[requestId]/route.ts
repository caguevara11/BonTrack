import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { approveEmissionRequest, rejectEmissionRequest } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (actor.role !== "tse") {
    return NextResponse.json({ error: "Solo el TSE puede revisar solicitudes." }, { status: 403 });
  }

  const { requestId } = await params;
  let body: { action?: "approve" | "reject"; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  try {
    if (body.action === "approve") {
      const result = await approveEmissionRequest(admin, {
        requestId,
        reviewedBy: actor.userId,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "reject") {
      await rejectEmissionRequest(admin, {
        requestId,
        reviewedBy: actor.userId,
        motivo: String(body.motivo ?? ""),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
