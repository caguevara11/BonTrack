"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Vuelve a la vista anterior. La página del bono es pública y se llega a ella
// desde varios lugares (cartera, panel del partido, búsqueda), así que usamos
// el historial del navegador en vez de un destino fijo; con fallback por si se
// entró directo por URL.
export function BackLink({
  fallback = "/",
  label = "Volver",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
