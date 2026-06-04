import { cn } from "@/lib/utils";

const estados: Record<string, string> = {
  EMITIDO: "bg-emitido text-emitido-foreground",
  COLOCADO: "bg-colocado text-colocado-foreground",
  ANULADO: "bg-anulado text-anulado-foreground",
  REDIMIDO: "bg-redimido text-redimido-foreground",
};

/** Badge semántico del estado del bono (states.md). */
export function EstadoBadge({ estado, className }: { estado: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        estados[estado] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {estado}
    </span>
  );
}
