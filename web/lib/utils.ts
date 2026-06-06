import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un monto en colones: 1000000 -> "₡1 000 000". */
export function colones(n: number | string | bigint): string {
  const v = typeof n === "bigint" ? Number(n) : Number(n);
  return "₡" + v.toLocaleString("es-CR");
}

/** Identificador legible de un bono: PLN · Serie A · #4 -> "PLN-A-4". */
export function bonoLabel(partido: string, serie: string, numero: number): string {
  return `${partido}-${serie}-${numero}`;
}

/** Formatea un timestamp (segundos o ISO) a fecha/hora local corta. */
export function fmtFecha(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Como fmtFecha pero solo la fecha (sin hora) — para vistas de un vistazo. */
export function fmtFechaCorta(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Acorta una llave pública Stellar: GABC…WXYZ. */
export function shortKey(pk: string): string {
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`;
}
