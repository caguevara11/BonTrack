"use client";

import { useState } from "react";
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

type TransferPayload = {
  tokenId: number;
  precio: number;
  nuevoTenedor: {
    tipo: TipoTenedor;
    nombre: string;
    cedula: string;
    entidad?: string;
    representante?: string;
  };
};

export function TransferForm({ tokenId }: { tokenId: number }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoTenedor>("persona");

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
      toast.success("Endoso registrado en la cadena", {
        description: "El bono quedó a nombre del nuevo tenedor.",
      });
      router.push("/tenedor");
      router.refresh();
    },
  });

  function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    transferir.mutate({
      tokenId,
      precio: Number(fd.get("precio")),
      nuevoTenedor: {
        tipo,
        nombre: String(fd.get("nombre") ?? fd.get("representante") ?? ""),
        cedula: String(fd.get("cedula") ?? ""),
        entidad: tipo === "persona" ? undefined : String(fd.get("entidad") ?? ""),
        representante: tipo === "persona" ? undefined : String(fd.get("representante") ?? ""),
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
          <Field id="nombre" label="Nombre completo" />
          <Field
            id="cedula"
            label="Número de cédula"
            placeholder="1-1234-5678"
            pattern={CEDULA_CR}
            mono
            error="Cédula costarricense inválida. Las personas extranjeras no pueden ser tenedoras (R2)."
          />
        </>
      ) : (
        <>
          <Field id="entidad" label={tipo === "banco" ? "Nombre del banco" : "Nombre del medio"} />
          <Field id="representante" label="Representante legal" />
          <Field
            id="cedula"
            label="Cédula del representante"
            placeholder="1-1234-5678"
            pattern={CEDULA_CR}
            mono
            error="Cédula costarricense inválida (R2)."
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
          El endoso queda registrado en la cadena pública e inmutable. El partido no necesita
          aprobar — se entera consultando la trazabilidad.
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
          {transferir.isPending ? "Registrando endoso…" : "Confirmar transferencia"}
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
}) {
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
        className={mono ? "tnum" : undefined}
      />
      {error && (
        <p data-error className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
