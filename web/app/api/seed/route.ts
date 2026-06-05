import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createCustodialWallet, getWalletSecret } from "@/lib/wallets";
import { findOrCreateHolder } from "@/lib/db";
import { mintBono, transferConPrecio, getContractId } from "@/lib/stellar";
import type { NuevoTenedor } from "@/lib/eligibility";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Seed de demo. FINGE la emisión + colocación + algunos endosos para dejar la
 * base con trazabilidad rica antes del demo en vivo:
 *
 *   - 2 partidos LLENOS (PLN, PUSC) con bonos minteados, colocados y endosados
 *     entre personas/entidades.
 *   - 1 partido VACÍO (Nueva República) para demostrar el flujo real del sprint-02
 *     (solicitar → TSE aprueba → mintea) sin chocar con datos sembrados.
 *
 *   POST /api/seed   (header  x-seed-secret: <SEED_SECRET>)
 */

const DEMO_PASSWORD = "Bontrack2026!";

type Admin = ReturnType<typeof createSupabaseAdmin>;
type Holder = { holderId: string; publicKey: string; label: string };
type Party = { id: string; nombre: string; publicKey: string; secret: string };

async function ensureUser(
  admin: Admin,
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

/** Crea un partido con su wallet custodial fondeada. */
async function createParty(
  admin: Admin,
  nombre: string,
  slug: string,
  tipoEleccion: "presidencial" | "municipal",
): Promise<Party> {
  const wallet = await createCustodialWallet(admin, nombre);
  const { data, error } = await admin
    .from("partidos")
    .insert({ nombre, slug, tipo_eleccion: tipoEleccion, wallet_id: wallet.id })
    .select("id")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el partido ${nombre}: ${error?.message}`);
  const secret = await getWalletSecret(admin, wallet.publicKey);
  return { id: data.id as string, nombre, publicKey: wallet.publicKey, secret };
}

/** Mintea una serie de bonos a la wallet del partido (estado EMITIDO + evento origen). */
async function mintSerie(
  admin: Admin,
  contractId: string,
  party: Party,
  opts: { serie: string; count: number; valorNominal: bigint; fechaEmision: string; tsEmision: string },
): Promise<Record<number, number>> {
  const tokenIdPorNumero: Record<number, number> = {};
  for (let numero = 1; numero <= opts.count; numero++) {
    const { tokenId, hash } = await mintBono(party.publicKey, {
      partido: party.nombre,
      serie: opts.serie,
      numero,
      valorNominal: opts.valorNominal,
      fechaEmision: opts.fechaEmision,
    });
    tokenIdPorNumero[numero] = tokenId;
    await admin.from("bonos").insert({
      token_id: tokenId,
      partido: party.nombre,
      serie: opts.serie,
      numero,
      valor_nominal: Number(opts.valorNominal),
      fecha_emision: opts.fechaEmision,
      partido_id: party.id,
      current_owner_pubkey: party.publicKey,
      estado: "EMITIDO",
      contract_id: contractId,
    });
    await admin.from("eventos").insert({
      token_id: tokenId,
      tipo: "EMISION",
      from_pubkey: null,
      to_pubkey: party.publicKey,
      from_label: null,
      to_label: party.nombre,
      precio: null,
      ts: opts.tsEmision,
      tx_hash: hash,
      registrado_por: "TSE",
    });
  }
  return tokenIdPorNumero;
}

/** Colocación: el partido endosa un bono EMITIDO al primer tenedor → COLOCADO. */
async function colocar(
  admin: Admin,
  party: Party,
  tokenId: number,
  dest: Holder,
  precio: number,
  ts: string,
) {
  const { hash } = await transferConPrecio(party.secret, dest.publicKey, tokenId, BigInt(precio));
  await admin.from("eventos").insert({
    token_id: tokenId,
    tipo: "COLOCACION",
    from_pubkey: party.publicKey,
    to_pubkey: dest.publicKey,
    from_label: party.nombre,
    to_label: dest.label,
    precio,
    ts,
    tx_hash: hash,
    registrado_por: party.nombre,
  });
  await admin
    .from("bonos")
    .update({ current_owner_pubkey: dest.publicKey, estado: "COLOCADO" })
    .eq("token_id", tokenId);
}

/** Endoso entre tenedores (tenedor actual → nuevo tenedor); el bono sigue COLOCADO. */
async function endosar(
  admin: Admin,
  from: Holder,
  to: Holder,
  tokenId: number,
  precio: number,
  ts: string,
) {
  const fromSecret = await getWalletSecret(admin, from.publicKey);
  const { hash } = await transferConPrecio(fromSecret, to.publicKey, tokenId, BigInt(precio));
  await admin.from("eventos").insert({
    token_id: tokenId,
    tipo: "ENDOSO",
    from_pubkey: from.publicKey,
    to_pubkey: to.publicKey,
    from_label: from.label,
    to_label: to.label,
    precio,
    ts,
    tx_hash: hash,
    registrado_por: from.label,
  });
  await admin
    .from("bonos")
    .update({ current_owner_pubkey: to.publicKey, estado: "COLOCADO" })
    .eq("token_id", tokenId);
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
    // ── Tenedores compartidos ────────────────────────────────────────────────
    const def = (t: NuevoTenedor) => findOrCreateHolder(admin, t);
    const bct = await def({ tipo: "banco", nombre: "Banco BCT", cedula: "3101123456", entidad: "Banco BCT" });
    const bncr = await def({ tipo: "banco", nombre: "Banco Nacional", cedula: "3101000123", entidad: "Banco Nacional de Costa Rica" });
    const teletica = await def({ tipo: "medio", nombre: "Teletica", cedula: "3101998877", entidad: "Televisora de Costa Rica S.A." });
    const carlos = await def({ tipo: "persona", nombre: "Carlos Pérez", cedula: "112345678" });
    const maria = await def({ tipo: "persona", nombre: "María Rodríguez", cedula: "309876543" });
    const jose = await def({ tipo: "persona", nombre: "José Jiménez", cedula: "207650981" });
    const ana = await def({ tipo: "persona", nombre: "Ana Solano", cedula: "401230567" });
    const luis = await def({ tipo: "persona", nombre: "Luis Vargas", cedula: "503210456" });

    // ── Partido 1: PLN (lleno) ───────────────────────────────────────────────
    const pln = await createParty(admin, "PLN", "pln", "presidencial");
    const A = await mintSerie(admin, contractId, pln, {
      serie: "A",
      count: 10,
      valorNominal: 1_000_000n,
      fechaEmision: "2026-01-14",
      tsEmision: "2026-01-14T11:00:00Z",
    });
    // Colocaciones (1-7; 8-10 quedan EMITIDO, disponibles).
    await colocar(admin, pln, A[1], bct, 850_000, "2026-01-15T09:14:00Z");
    await colocar(admin, pln, A[2], bct, 850_000, "2026-01-15T09:15:00Z");
    await colocar(admin, pln, A[3], bct, 850_000, "2026-01-15T09:16:00Z");
    await colocar(admin, pln, A[4], carlos, 900_000, "2026-01-16T10:02:00Z");
    await colocar(admin, pln, A[5], carlos, 900_000, "2026-01-16T10:03:00Z");
    await colocar(admin, pln, A[6], maria, 900_000, "2026-01-16T14:20:00Z");
    await colocar(admin, pln, A[7], jose, 880_000, "2026-01-17T08:45:00Z");
    // Endosos entre personas / entidad.
    await endosar(admin, carlos, maria, A[4], 950_000, "2026-02-03T11:30:00Z");
    await endosar(admin, carlos, jose, A[5], 920_000, "2026-02-05T16:10:00Z");
    await endosar(admin, jose, ana, A[5], 960_000, "2026-03-01T09:05:00Z");
    await endosar(admin, maria, luis, A[6], 910_000, "2026-02-20T13:40:00Z");
    await endosar(admin, jose, teletica, A[7], 890_000, "2026-03-10T10:00:00Z");

    // ── Partido 2: PUSC (lleno) ──────────────────────────────────────────────
    const pusc = await createParty(admin, "PUSC", "pusc", "presidencial");
    const B = await mintSerie(admin, contractId, pusc, {
      serie: "A",
      count: 8,
      valorNominal: 500_000n,
      fechaEmision: "2026-01-20",
      tsEmision: "2026-01-20T10:30:00Z",
    });
    // Colocaciones (1-5; 6-8 quedan EMITIDO).
    await colocar(admin, pusc, B[1], bncr, 480_000, "2026-01-22T09:00:00Z");
    await colocar(admin, pusc, B[2], bncr, 480_000, "2026-01-22T09:01:00Z");
    await colocar(admin, pusc, B[3], teletica, 470_000, "2026-01-23T11:15:00Z");
    await colocar(admin, pusc, B[4], ana, 490_000, "2026-01-24T15:30:00Z");
    await colocar(admin, pusc, B[5], luis, 490_000, "2026-01-24T15:31:00Z");
    // Endosos.
    await endosar(admin, ana, maria, B[4], 510_000, "2026-02-12T12:00:00Z");
    await endosar(admin, luis, carlos, B[5], 505_000, "2026-02-18T17:25:00Z");

    // ── Partido 3: Nueva República (VACÍO — para el demo de emisión real) ─────
    const pnr = await createParty(admin, "Nueva República", "nueva-republica", "presidencial");

    // ── Usuarios de login (Supabase Auth) ────────────────────────────────────
    await ensureUser(admin, "tse@bontrack.cr", { role: "tse", display_name: "TSE — Roger Ulate" });
    await ensureUser(admin, "pln@bontrack.cr", {
      role: "partido",
      display_name: "PLN — Juan Mora",
      partido_id: pln.id,
    });
    await ensureUser(admin, "pusc@bontrack.cr", {
      role: "partido",
      display_name: "PUSC — Sofía Castro",
      partido_id: pusc.id,
    });
    await ensureUser(admin, "pnr@bontrack.cr", {
      role: "partido",
      display_name: "Nueva República — Diego Núñez",
      partido_id: pnr.id,
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
      partidos: {
        llenos: ["PLN (Serie A · 10 bonos)", "PUSC (Serie A · 8 bonos)"],
        vacio: "Nueva República (para el flujo real de emisión)",
      },
      bonosMinteados: 18,
      colocaciones: 12,
      endosos: 7,
      logins: {
        password: DEMO_PASSWORD,
        usuarios: [
          "tse@bontrack.cr",
          "pln@bontrack.cr",
          "pusc@bontrack.cr",
          "pnr@bontrack.cr",
          "carlos@bontrack.cr",
          "maria@bontrack.cr",
        ],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
