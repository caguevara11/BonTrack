import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentActor } from "@/lib/auth";
import { validarElegibilidad, type NuevoTenedor, type TipoEleccion } from "@/lib/eligibility";
import { findOrCreateHolder, getBonoByTokenId } from "@/lib/db";
import { getWalletSecret, labelForPubkey } from "@/lib/wallets";
import { transferConPrecio } from "@/lib/stellar";

export const dynamic = "force-dynamic";

/**
 * Endoso de un bono a otro tenedor (FLUJO 3 / AC-3).
 *
 * - R18: solo el vendedor (tenedor actual logueado) registra la transferencia.
 * - R17/R1–R5: el nuevo tenedor debe cumplir elegibilidad.
 * - R19: precio obligatorio (validado acá y en el contrato).
 * - El bono permanece COLOCADO; cambia el tenedor actual.
 * - R16: el partido NO aprueba — se entera por la trazabilidad pública.
 */
export async function POST(req: NextRequest) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (actor.role !== "tenedor" || !actor.ownerPubkey) {
    return NextResponse.json(
      { error: "Solo un tenedor puede registrar una transferencia (R18)." },
      { status: 403 },
    );
  }

  let body: {
    tokenId?: number;
    precio?: number;
    nuevoTenedor?: NuevoTenedor;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { tokenId, precio, nuevoTenedor } = body;
  if (typeof tokenId !== "number" || !nuevoTenedor) {
    return NextResponse.json({ error: "Faltan datos de la transferencia." }, { status: 400 });
  }
  if (typeof precio !== "number" || !Number.isFinite(precio) || precio <= 0) {
    return NextResponse.json(
      { error: "El precio es obligatorio y debe ser mayor a 0 (R19)." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdmin();

  // R18: el bono debe pertenecer al tenedor logueado.
  const bono = await getBonoByTokenId(admin, tokenId);
  if (!bono) return NextResponse.json({ error: "Bono inexistente." }, { status: 404 });
  if (bono.current_owner_pubkey !== actor.ownerPubkey) {
    return NextResponse.json(
      { error: "No sos el tenedor actual de este bono (R18)." },
      { status: 403 },
    );
  }

  // tipo de elección del partido emisor (hook de R3 municipal).
  let tipoEleccion: TipoEleccion = "presidencial";
  if (bono.partido_id) {
    const { data } = await admin
      .from("partidos")
      .select("tipo_eleccion")
      .eq("id", bono.partido_id)
      .maybeSingle();
    if (data?.tipo_eleccion === "municipal") tipoEleccion = "municipal";
  }

  // Normalizar cédula y validar elegibilidad (R1–R5 / R17).
  const cedulaLimpia = nuevoTenedor.cedula.replace(/[\s-]/g, "");
  const target: NuevoTenedor = { ...nuevoTenedor, cedula: cedulaLimpia };
  const elig = validarElegibilidad(target, tipoEleccion);
  if (!elig.ok) {
    return NextResponse.json({ error: elig.reason, code: elig.code }, { status: 422 });
  }

  try {
    const dest = await findOrCreateHolder(admin, target);
    const fromLabel = await labelForPubkey(admin, actor.ownerPubkey);
    const fromSecret = await getWalletSecret(admin, actor.ownerPubkey);

    // Endoso on-chain (precio obligatorio R19).
    const { hash } = await transferConPrecio(
      fromSecret,
      dest.publicKey,
      tokenId,
      BigInt(precio),
    );

    // Espejar el evento en Supabase (caché para trazabilidad rápida).
    await admin.from("eventos").insert({
      token_id: tokenId,
      tipo: "ENDOSO",
      from_pubkey: actor.ownerPubkey,
      to_pubkey: dest.publicKey,
      from_label: fromLabel,
      to_label: dest.label,
      precio,
      ts: new Date().toISOString(),
      tx_hash: hash,
      registrado_por: actor.displayName,
    });
    await admin
      .from("bonos")
      .update({
        current_owner_pubkey: dest.publicKey,
        estado: "COLOCADO",
        updated_at: new Date().toISOString(),
      })
      .eq("token_id", tokenId);

    return NextResponse.json({ ok: true, hash });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
