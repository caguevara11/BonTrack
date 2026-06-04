"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error inesperado al procesar la solicitud."}
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
