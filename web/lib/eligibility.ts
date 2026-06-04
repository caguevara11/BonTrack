/**
 * Reglas de elegibilidad de tenedores (R1–R5, business-rules.md).
 *
 * MVP: validación de FORMATO de cédula costarricense (no contra el RNPN — fuera de
 * scope, acceptance-criteria.md). Una cédula que no cumple el formato CR se trata
 * como persona extranjera y se rechaza (R2).
 */

export type TipoTenedor = "persona" | "banco" | "medio";
export type TipoEleccion = "presidencial" | "municipal";

export type NuevoTenedor = {
  tipo: TipoTenedor;
  nombre: string;
  cedula: string; // persona: su cédula; banco/medio: cédula del representante
  entidad?: string; // banco/medio: nombre de la entidad
  representante?: string; // banco/medio: nombre del representante legal
};

export type ElegibilidadResultado =
  | { ok: true }
  | { ok: false; code: string; reason: string };

/** Cédula física costarricense: 9 dígitos, provincia 1–9 (formato 1-1234-5678). */
export function esCedulaCostarricense(cedula: string): boolean {
  const limpia = cedula.replace(/[\s-]/g, "");
  return /^[1-9]\d{8}$/.test(limpia);
}

export function validarElegibilidad(
  t: NuevoTenedor,
  tipoEleccion: TipoEleccion,
): ElegibilidadResultado {
  // R1: solo persona física, banco o medio.
  if (!["persona", "banco", "medio"].includes(t.tipo)) {
    return { ok: false, code: "R1", reason: "Tipo de tenedor no permitido (R1)." };
  }

  // R3: en elecciones municipales, único tenedor permitido = banco.
  if (tipoEleccion === "municipal" && t.tipo !== "banco") {
    return {
      ok: false,
      code: "R3",
      reason: "En elecciones municipales solo un banco puede ser tenedor (R3).",
    };
  }

  if (!t.nombre?.trim()) {
    return { ok: false, code: "DATOS", reason: "El nombre es obligatorio." };
  }

  // R2: personas extranjeras no pueden ser tenedoras. Validamos formato CR.
  if (!esCedulaCostarricense(t.cedula)) {
    return {
      ok: false,
      code: "R2",
      reason:
        "Cédula no costarricense o con formato inválido. Las personas extranjeras no pueden ser tenedoras (R2).",
    };
  }

  // Banco / medio: requieren entidad + representante legal (roles.md).
  if (t.tipo === "banco" || t.tipo === "medio") {
    if (!t.entidad?.trim() || !t.representante?.trim()) {
      return {
        ok: false,
        code: "DATOS",
        reason: "Bancos y medios requieren entidad y representante legal.",
      };
    }
  }

  // R5 (medio recibe como pago por servicios) es informativo — sin validación dura en el MVP.
  return { ok: true };
}
