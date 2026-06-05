"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Payload = {
  serie: string;
  cantidad: number;
  valorNominal: number;
};

export function EmissionRequestForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [serie, setSerie] = useState("A");

  const crear = useMutation({
    mutationFn: async (payload: Payload) => {
      const res = await fetch("/api/emission-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la solicitud.");
      return data;
    },
    onSuccess: () => {
      toast.success("Solicitud enviada al TSE", {
        description: "Quedó pendiente de aprobación.",
      });
      formRef.current?.reset();
      setSerie("A");
      router.refresh();
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    crear.mutate({
      serie,
      cantidad: Number(fd.get("cantidad")),
      valorNominal: Number(fd.get("valorNominal")),
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[92px_1fr_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="serie">Serie</Label>
          <Input
            id="serie"
            name="serie"
            value={serie}
            onChange={(e) => setSerie(e.currentTarget.value.toUpperCase().slice(0, 1))}
            pattern="[A-Z]"
            required
            className="tnum uppercase"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input id="cantidad" name="cantidad" type="number" min="1" required className="tnum" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="valorNominal">Valor nominal</Label>
          <Input
            id="valorNominal"
            name="valorNominal"
            type="number"
            min="1"
            required
            className="tnum"
          />
        </div>
      </div>

      {crear.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(crear.error as Error).message}
        </div>
      )}

      <Button type="submit" disabled={crear.isPending}>
        {crear.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar solicitud
      </Button>

      {crear.isSuccess && (
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-accent-foreground" />
          Solicitud registrada.
        </p>
      )}
    </form>
  );
}
