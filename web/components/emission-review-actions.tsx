"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmissionReviewActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");

  const revisar = useMutation({
    mutationFn: async (payload: { action: "approve" | "reject"; motivo?: string }) => {
      const res = await fetch(`/api/emission-requests/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo revisar la solicitud.");
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(variables.action === "approve" ? "Emisión aprobada" : "Solicitud rechazada", {
        description:
          variables.action === "approve"
            ? `${data.minted ?? 0} bonos quedaron emitidos.`
            : "El partido verá el motivo en su panel.",
      });
      router.refresh();
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => revisar.mutate({ action: "approve" })}
          disabled={revisar.isPending}
        >
          {revisar.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Aprobar y mintear
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => revisar.mutate({ action: "reject", motivo })}
          disabled={revisar.isPending || !motivo.trim()}
        >
          <XCircle className="size-4" />
          Rechazar
        </Button>
      </div>
      <Input
        value={motivo}
        onChange={(e) => setMotivo(e.currentTarget.value)}
        placeholder="Motivo de rechazo"
      />
      {revisar.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(revisar.error as Error).message}
        </div>
      )}
    </div>
  );
}
