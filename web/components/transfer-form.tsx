"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TipoTenedor } from "@/lib/eligibility";

// Formato de cédula física costarricense (provincia 1-9 + 4 + 4) para validación en cliente.
const CEDULA_CR = "[1-9]-?[0-9]{4}-?[0-9]{4}";
const CEDULA_JURIDICA_CR = "[0-9]-?[0-9]{3}-?[0-9]{6}";

type TransferPayload = {
  tokenId: number;
  precio: number;
  nuevoTenedor: {
    tipo: TipoTenedor;
    nombre: string;
    cedula: string;
    entidad?: string;
  };
};

export function TransferForm({
  tokenId,
  mode = "endoso",
  returnTo = "/tenedor",
}: {
  tokenId: number;
  mode?: "colocacion" | "endoso";
  returnTo?: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoTenedor>("persona");
  const [cedulaPersona, setCedulaPersona] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [holderExistente, setHolderExistente] = useState<{
    nombre: string;
    cedula: string;
  } | null>(null);
  const [buscandoHolder, setBuscandoHolder] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const esColocacion = mode === "colocacion";

  function cambiarCedulaPersona(value: string) {
    setCedulaPersona(value);
    if (holderExistente) {
      setHolderExistente(null);
      setNombrePersona("");
    }
  }

  useEffect(() => {
    if (tipo !== "persona") {
      setHolderExistente(null);
      setLookupError(null);
      return;
    }

    const cedula = cedulaPersona.replace(/[\s-]/g, "");
    if (!/^[1-9]\d{8}$/.test(cedula)) {
      setHolderExistente(null);
      setLookupError(null);
      return;
    }

    const controller = new AbortController();
    setBuscandoHolder(true);
    setLookupError(null);

    fetch(`/api/holders/persona?cedula=${encodeURIComponent(cedula)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo consultar la cédula.");
        setHolderExistente(data.holder ?? null);
        if (data.holder?.nombre) setNombrePersona(data.holder.nombre);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setHolderExistente(null);
          setLookupError((error as Error).message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBuscandoHolder(false);
      });

    return () => controller.abort();
  }, [cedulaPersona, tipo]);

  const transferir = useMutation({
    mutationFn: async (payload: TransferPayload) => {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar la transferencia.");
      return data;
    },
    onSuccess: () => {
      toast.success(
        esColocacion ? "Colocación registrada en la cadena" : "Endoso registrado en la cadena",
        {
          description: "El bono quedó a nombre del nuevo tenedor.",
        },
      );
      router.push(returnTo);
      router.refresh();
    },
  });

  function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entidad = String(fd.get("entidad") ?? "");
    transferir.mutate({
      tokenId,
      precio: Number(fd.get("precio")),
      nuevoTenedor: {
        tipo,
        nombre: tipo === "persona" ? String(fd.get("nombre") ?? "") : entidad,
        cedula: String(fd.get("cedula") ?? ""),
        entidad: tipo === "persona" ? undefined : entidad,
      },
    });
  }

  const tipos: { value: TipoTenedor; label: string }[] = [
    { value: "persona", label: "Persona física" },
    { value: "banco", label: "Banco" },
    { value: "medio", label: "Medio de comunicación" },
  ];

  return (
    <form onSubmit={confirmar} className="validate space-y-5">
      <div className="grid gap-2">
        <Label>Tipo de nuevo tenedor</Label>
        <RadioGroup
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoTenedor)}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {tipos.map((t) => (
            <div key={t.value} className="flex items-center gap-2">
              <RadioGroupItem value={t.value} id={`tipo-${t.value}`} />
              <Label htmlFor={`tipo-${t.value}`} className="cursor-pointer font-normal">
                {t.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {tipo === "persona" ? (
        <>
          <Field
            key="persona-cedula"
            id="cedula"
            label="Número de cédula"
            placeholder="1-1234-5678"
            pattern={CEDULA_CR}
            value={cedulaPersona}
            onChange={(e) => cambiarCedulaPersona(e.currentTarget.value)}
            mono
            error="Cédula costarricense inválida. Las personas extranjeras no pueden ser tenedoras (R2)."
          />
          <Field
            key="persona-nombre"
            id="nombre"
            label="Nombre completo"
            value={nombrePersona}
            onChange={(e) => setNombrePersona(e.currentTarget.value)}
            readOnly={Boolean(holderExistente)}
            hint={
              holderExistente
                ? "Nombre ya registrado para esta cédula."
                : buscandoHolder
                  ? "Consultando si la cédula ya existe..."
                  : "Si es la primera transferencia a esta cédula, ingresá el nombre completo."
            }
          />
          {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
        </>
      ) : (
        <>
          <Field
            key={`${tipo}-cedula-juridica`}
            id="cedula"
            label="Cédula jurídica"
            placeholder="3-101-123456"
            pattern={CEDULA_JURIDICA_CR}
            mono
            error="La cédula jurídica debe tener 10 dígitos."
          />
          <Field
            key={`${tipo}-entidad`}
            id="entidad"
            label={tipo === "banco" ? "Razón social del banco" : "Razón social del medio"}
            hint="Este será el nombre visible del tenedor jurídico."
          />
        </>
      )}

      <Field
        id="precio"
        label="Precio pactado (₡)"
        type="number"
        min="1"
        placeholder="950000"
        mono
        hint="Obligatorio — queda registrado on-chain (R19)."
        error="Ingresá un monto mayor a 0 (R19)."
      />

      <div className="flex items-start gap-2.5 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground/80">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <p>
          {esColocacion
            ? "La colocación queda registrada en la cadena pública e inmutable como primer traspaso del partido al tenedor."
            : "El endoso queda registrado en la cadena pública e inmutable. El partido no necesita aprobar — se entera consultando la trazabilidad."}
        </p>
      </div>

      {transferir.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(transferir.error as Error).message}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={transferir.isPending}>
          {transferir.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {transferir.isPending
            ? esColocacion
              ? "Registrando colocación…"
              : "Registrando endoso…"
            : "Confirmar transferencia"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  placeholder,
  pattern,
  min,
  hint,
  error,
  mono,
  value,
  onChange,
  readOnly,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  pattern?: string;
  min?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
}) {
  const controlledProps =
    value === undefined
      ? {}
      : {
          value,
          onChange,
        };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        pattern={pattern}
        min={min}
        required
        readOnly={readOnly}
        className={mono ? "tnum" : undefined}
        {...controlledProps}
      />
      {error && (
        <p data-error className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
