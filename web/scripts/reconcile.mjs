import fs from "node:fs";
import path from "node:path";
import {
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const env = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const root = path.resolve(import.meta.dirname, "..");
const env = { ...process.env, ...loadEnv(path.join(root, ".env.local")) };
const passphrase = env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const server = new rpc.Server(env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org");
const source = Keypair.fromSecret(env.SYSTEM_SECRET);
const contract = new Contract(env.BONO_CONTRACT_ID);

const scU32 = (n) => nativeToScVal(Number(n), { type: "u32" });

async function read(method, args) {
  const account = await server.getAccount(source.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: passphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return sim.result?.retval ? scValToNative(sim.result.retval) : undefined;
}

function sameText(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function sameNumber(a, b) {
  return Number(a) === Number(b);
}

const { data: bonos, error } = await supabase
  .from("bonos")
  .select("*")
  .order("partido", { ascending: true })
  .order("serie", { ascending: true })
  .order("numero", { ascending: true });

if (error) throw new Error(error.message);

const resultados = [];
for (const bono of bonos ?? []) {
  const diferencias = [];
  let ownerOnChain = null;
  try {
    const [owner, meta] = await Promise.all([
      read("owner_of", [scU32(bono.token_id)]),
      read("get_bono", [scU32(bono.token_id)]),
    ]);
    ownerOnChain = owner;
    if (owner !== bono.current_owner_pubkey) diferencias.push("tenedor_actual");
    if (!sameText(meta.partido, bono.partido)) diferencias.push("partido");
    if (!sameText(meta.serie, bono.serie)) diferencias.push("serie");
    if (!sameNumber(meta.numero, bono.numero)) diferencias.push("numero");
    if (!sameNumber(meta.valor_nominal, bono.valor_nominal)) diferencias.push("valor_nominal");
    if (!sameText(meta.fecha_emision, bono.fecha_emision)) diferencias.push("fecha_emision");
  } catch (e) {
    diferencias.push(`chain_error:${e.message}`);
  }

  resultados.push({
    token_id: bono.token_id,
    identidad: `${bono.partido}-${bono.serie}-${bono.numero}`,
    ok: diferencias.length === 0,
    ownerOnChain,
    diferencias,
  });
}

const desalineados = resultados.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      ok: desalineados.length === 0,
      total: resultados.length,
      desalineados: desalineados.length,
      resultados: desalineados.length === 0 ? resultados.map(({ token_id, identidad, ok }) => ({ token_id, identidad, ok })) : desalineados,
    },
    null,
    2,
  ),
);
