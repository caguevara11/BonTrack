import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createCustodialWallet, getWalletSecret } from "@/lib/wallets";
import { findOrCreateHolder } from "@/lib/db";
import { mintBono, transferConPrecio, getContractId } from "@/lib/stellar";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Seed del sprint-01: FINGE la emisión + colocación (que en realidad son del
 * sprint-02) para dejar bonos ya colocados a tenedores iniciales, con sus eventos
 * de origen y sus wallets custodiales fondeadas. Deja todo listo para el wedge:
 * el demo en vivo solo hace la transferencia Carlos → María + la consulta.
 *
 *   POST /api/seed   (header  x-seed-secret: <SEED_SECRET>)
 */

const DEMO_PASSWORD = "Bontrack2026!";
const VALOR_NOMINAL = 1_000_000n;
const FECHA_EMISION = "2026-01-14";
const TS_EMISION = "2026-01-14T11:00:00Z";
const TS_COLOCACION = "2026-01-15T09:14:00Z";

async function ensureUser(
  admin: ReturnType<typeof createSupabaseAdmin>,
  email: string,
  profile: { role: string; display_name: string; partido_id?: string; holder_id?: string },
) {
  let userId: string | undefined;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (error) {
    // Ya existe: buscarlo paginando la lista de usuarios.
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = data.users.find((u) => u.email === email)?.id;
  }
  if (!userId) throw new Error(`No se pudo crear/encontrar el usuario ${email}`);
  await admin.from("profiles").upsert({ id: userId, ...profile });
  return userId;
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-seed-secret") !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const contractId = getContractId();

  // Idempotencia: si ya hay bonos sembrados, no re-mintear.
  const { count } = await admin.from("bonos").select("token_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, alreadySeeded: true, bonos: count });
  }

  try {
    // 1) Partido PLN + su wallet custodial.
    const plnWallet = await createCustodialWallet(admin, "PLN");
    const { data: pln } = await admin
      .from("partidos")
      .insert({ nombre: "PLN", slug: "pln", tipo_eleccion: "presidencial", wallet_id: plnWallet.id })
      .select("id")
      .single();
    const partidoId = pln!.id as string;

    // 2) Mintear 10 bonos (Serie A) a la wallet del PLN → estado EMITIDO + evento de origen.
    const tokenIdPorNumero: Record<number, number> = {};
    for (let numero = 1; numero <= 10; numero++) {
      const { tokenId, hash } = await mintBono(plnWallet.publicKey, {
        partido: "PLN",
        serie: "A",
        numero,
        valorNominal: VALOR_NOMINAL,
        fechaEmision: FECHA_EMISION,
      });
      tokenIdPorNumero[numero] = tokenId;
      await admin.from("bonos").insert({
        token_id: tokenId,
        partido: "PLN",
        serie: "A",
        numero,
        valor_nominal: Number(VALOR_NOMINAL),
        fecha_emision: FECHA_EMISION,
        partido_id: partidoId,
        current_owner_pubkey: plnWallet.publicKey,
        estado: "EMITIDO",
        contract_id: contractId,
      });
      await admin.from("eventos").insert({
        token_id: tokenId,
        tipo: "EMISION",
        from_pubkey: null,
        to_pubkey: plnWallet.publicKey,
        from_label: null,
        to_label: "PLN",
        precio: null,
        ts: TS_EMISION,
        tx_hash: hash,
        registrado_por: "TSE",
      });
    }

    // 3) Tenedores iniciales con sus wallets.
    const bct = await findOrCreateHolder(admin, {
      tipo: "banco",
      nombre: "Ana Gómez",
      cedula: "19876543",
      entidad: "Banco BCT",
      representante: "Ana Gómez",
    });
    const carlos = await findOrCreateHolder(admin, {
      tipo: "persona",
      nombre: "Carlos Pérez",
      cedula: "112345678",
    });
    const maria = await findOrCreateHolder(admin, {
      tipo: "persona",
      nombre: "María Rodríguez",
      cedula: "309876543",
    });

    // 4) Colocación (FINGIDA por seed): PLN endosa a los tenedores iniciales.
    const plnSecret = await getWalletSecret(admin, plnWallet.publicKey);
    const colocaciones: Array<{ numero: number; dest: typeof bct; precio: number }> = [
      { numero: 1, dest: bct, precio: 850_000 },
      { numero: 2, dest: bct, precio: 850_000 },
      { numero: 3, dest: bct, precio: 850_000 },
      { numero: 4, dest: carlos, precio: 900_000 },
      { numero: 5, dest: carlos, precio: 900_000 },
    ];
    for (const c of colocaciones) {
      const tokenId = tokenIdPorNumero[c.numero];
      const { hash } = await transferConPrecio(
        plnSecret,
        c.dest.publicKey,
        tokenId,
        BigInt(c.precio),
      );
      await admin.from("eventos").insert({
        token_id: tokenId,
        tipo: "COLOCACION",
        from_pubkey: plnWallet.publicKey,
        to_pubkey: c.dest.publicKey,
        from_label: "PLN",
        to_label: c.dest.label,
        precio: c.precio,
        ts: TS_COLOCACION,
        tx_hash: hash,
        registrado_por: "PLN",
      });
      await admin
        .from("bonos")
        .update({ current_owner_pubkey: c.dest.publicKey, estado: "COLOCADO" })
        .eq("token_id", tokenId);
    }

    // 5) Usuarios de login (Supabase Auth).
    await ensureUser(admin, "tse@bontrack.cr", { role: "tse", display_name: "TSE — Roger Ulate" });
    await ensureUser(admin, "pln@bontrack.cr", {
      role: "partido",
      display_name: "PLN — Juan Mora",
      partido_id: partidoId,
    });
    await ensureUser(admin, "carlos@bontrack.cr", {
      role: "tenedor",
      display_name: "Carlos Pérez",
      holder_id: carlos.holderId,
    });
    await ensureUser(admin, "maria@bontrack.cr", {
      role: "tenedor",
      display_name: "María Rodríguez",
      holder_id: maria.holderId,
    });

    return NextResponse.json({
      ok: true,
      contractId,
      bonosMinteados: 10,
      colocados: colocaciones.length,
      logins: {
        password: DEMO_PASSWORD,
        usuarios: ["tse@bontrack.cr", "pln@bontrack.cr", "carlos@bontrack.cr", "maria@bontrack.cr"],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
