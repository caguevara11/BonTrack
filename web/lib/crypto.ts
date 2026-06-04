import crypto from "node:crypto";

/**
 * Cifrado de llaves secretas custodiales (AES-256-GCM).
 *
 * MVP/demo: la clave maestra vive en `WALLET_ENCRYPTION_KEY` (32 bytes en base64).
 * En producción esto se delegaría a un KMS (decisión abierta en sprint-01.md).
 * El usuario nunca ve su llave secreta; el backend la descifra solo para firmar.
 */

function masterKey(): Buffer {
  const b64 = process.env.WALLET_ENCRYPTION_KEY;
  if (!b64) throw new Error("WALLET_ENCRYPTION_KEY no configurada");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("WALLET_ENCRYPTION_KEY debe ser 32 bytes (base64)");
  return key;
}

export type SecretCipher = { cipher: string; iv: string; tag: string };

export function encryptSecret(plaintext: string): SecretCipher {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    cipher: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(c: SecretCipher): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(c.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(c.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(c.cipher, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
