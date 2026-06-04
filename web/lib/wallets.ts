import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAndFundWallet } from "./stellar";
import { encryptSecret, decryptSecret } from "./crypto";

/**
 * Servicio de wallets custodiales: crea/fondea un keypair, cifra la llave secreta
 * y la guarda en Supabase. El usuario nunca ve la llave; el backend la descifra
 * solo para firmar.
 */

export async function createCustodialWallet(
  admin: SupabaseClient,
  label: string,
): Promise<{ id: string; publicKey: string }> {
  const { publicKey, secret } = await createAndFundWallet();
  const enc = encryptSecret(secret);
  const { data, error } = await admin
    .from("wallets")
    .insert({
      public_key: publicKey,
      secret_cipher: enc.cipher,
      secret_iv: enc.iv,
      secret_tag: enc.tag,
      funded: true,
      label,
    })
    .select("id, public_key")
    .single();
  if (error) throw new Error(`No se pudo guardar la wallet: ${error.message}`);
  return { id: data.id, publicKey: data.public_key };
}

/** Descifra la llave secreta de una wallet por su public key (para firmar). */
export async function getWalletSecret(
  admin: SupabaseClient,
  publicKey: string,
): Promise<string> {
  const { data, error } = await admin
    .from("wallets")
    .select("secret_cipher, secret_iv, secret_tag")
    .eq("public_key", publicKey)
    .single();
  if (error || !data) throw new Error(`Wallet no encontrada: ${publicKey}`);
  return decryptSecret({ cipher: data.secret_cipher, iv: data.secret_iv, tag: data.secret_tag });
}

/** Etiqueta legible de una wallet por su public key (para mostrar partes en la trazabilidad). */
export async function labelForPubkey(
  admin: SupabaseClient,
  publicKey: string,
): Promise<string> {
  const { data } = await admin
    .from("wallets")
    .select("label")
    .eq("public_key", publicKey)
    .maybeSingle();
  return data?.label ?? `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`;
}
