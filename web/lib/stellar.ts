import "server-only";
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

/**
 * Integración con el contrato BonoNFT (Soroban / testnet).
 *
 * El backend firma en nombre de las wallets custodiales. La cadena es la fuente
 * de verdad; Supabase solo cachea lo que ocurre acá.
 */

const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const FRIENDBOT = process.env.FRIENDBOT_URL || "https://friendbot.stellar.org";

export function getContractId(): string {
  const id = process.env.BONO_CONTRACT_ID;
  if (!id) throw new Error("BONO_CONTRACT_ID no configurado");
  return id;
}

export function systemKeypair(): Keypair {
  const secret = process.env.SYSTEM_SECRET;
  if (!secret) throw new Error("SYSTEM_SECRET no configurado");
  return Keypair.fromSecret(secret);
}

export function server() {
  return new rpc.Server(RPC_URL);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Crea un keypair custodial nuevo y lo fondea con Friendbot (testnet). */
export async function createAndFundWallet(): Promise<{ publicKey: string; secret: string }> {
  const kp = Keypair.random();
  const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(kp.publicKey())}`);
  if (!res.ok && res.status !== 400) {
    // 400 = ya fondeada (improbable para una cuenta nueva); cualquier otro error es real.
    throw new Error(`Friendbot falló (${res.status}) para ${kp.publicKey()}`);
  }
  return { publicKey: kp.publicKey(), secret: kp.secret() };
}

// ---- Conversión de argumentos a ScVal ----
const scAddr = (pk: string) => new Address(pk).toScVal();
const scStr = (s: string) => nativeToScVal(s, { type: "string" });
const scU32 = (n: number) => nativeToScVal(n, { type: "u32" });
const scI128 = (n: bigint | number) => nativeToScVal(BigInt(n), { type: "i128" });

/** Invoca una función de escritura del contrato, firmada por `signer`. Espera confirmación. */
async function invoke(
  method: string,
  args: xdr.ScVal[],
  signer: Keypair,
): Promise<{ hash: string; returnValue: unknown }> {
  const s = server();
  const account = await s.getAccount(signer.publicKey());
  const contract = new Contract(getContractId());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await s.prepareTransaction(tx);
  prepared.sign(signer);

  const sent = await s.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`Envío rechazado: ${JSON.stringify(sent.errorResult)}`);
  }

  let got = await s.getTransaction(sent.hash);
  for (let i = 0; got.status === "NOT_FOUND" && i < 30; i++) {
    await sleep(1000);
    got = await s.getTransaction(sent.hash);
  }
  if (got.status !== "SUCCESS") {
    throw new Error(`Transacción ${method} falló: ${got.status}`);
  }
  return {
    hash: sent.hash,
    returnValue: got.returnValue ? scValToNative(got.returnValue) : undefined,
  };
}

/** Llama una función de lectura del contrato (simulación, gratis). */
async function read(method: string, args: xdr.ScVal[]): Promise<unknown> {
  const s = server();
  const account = await s.getAccount(systemKeypair().publicKey());
  const contract = new Contract(getContractId());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await s.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulación de ${method} falló: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  return retval ? scValToNative(retval) : undefined;
}

// ---- API de alto nivel ----

export type BonoOnChain = {
  partido: string;
  serie: string;
  numero: number;
  valor_nominal: bigint;
  fecha_emision: string;
};

/** Mintea un bono (firma el sistema). Devuelve el token_id asignado. */
export async function mintBono(
  to: string,
  meta: { partido: string; serie: string; numero: number; valorNominal: bigint; fechaEmision: string },
): Promise<{ tokenId: number; hash: string }> {
  const { returnValue, hash } = await invoke(
    "mint_bono",
    [
      scAddr(to),
      scStr(meta.partido),
      scStr(meta.serie),
      scU32(meta.numero),
      scI128(meta.valorNominal),
      scStr(meta.fechaEmision),
    ],
    systemKeypair(),
  );
  return { tokenId: Number(returnValue), hash };
}

/** Endoso con precio obligatorio (R19). `fromSecret` = llave del vendedor (custodial). */
export async function transferConPrecio(
  fromSecret: string,
  to: string,
  tokenId: number,
  precio: bigint,
): Promise<{ hash: string }> {
  const signer = Keypair.fromSecret(fromSecret);
  const { hash } = await invoke(
    "transfer_con_precio",
    [scAddr(signer.publicKey()), scAddr(to), scU32(tokenId), scI128(precio)],
    signer,
  );
  return { hash };
}

/** Dueño actual del bono (verificación contra la cadena). */
export async function ownerOf(tokenId: number): Promise<string> {
  return (await read("owner_of", [scU32(tokenId)])) as string;
}

/** Metadata inmutable on-chain del bono. */
export async function getBono(tokenId: number): Promise<BonoOnChain> {
  return (await read("get_bono", [scU32(tokenId)])) as BonoOnChain;
}
