"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, History, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/estado-badge";
import { colones } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type PartidoBono = {
  tokenId: number;
  serie: string;
  numero: number;
  valorNominal: number;
  estado: string;
  tenedor: string | null;
  puedeColocar: boolean;
};

type Filtro = "TODOS" | "EMITIDO" | "COLOCADO";

/** "Mis bonos" del partido: tabla densa con filtro por estado (sprint-03). */
export function PartidoBonos({ bonos }: { bonos: PartidoBono[] }) {
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  const conteo = {
    TODOS: bonos.length,
    EMITIDO: bonos.filter((b) => b.estado === "EMITIDO").length,
    COLOCADO: bonos.filter((b) => b.estado === "COLOCADO").length,
  };
  const visibles = filtro === "TODOS" ? bonos : bonos.filter((b) => b.estado === filtro);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-3">
        {(
          [
            ["TODOS", "Todos"],
            ["EMITIDO", "Emitidos"],
            ["COLOCADO", "Colocados"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            aria-pressed={filtro === value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtro === value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
          >
            {label}
            <span className="tnum opacity-70">{conteo[value]}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <Inbox className="size-7 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">No hay bonos en esta vista.</p>
        </div>
      ) : (
        <div className="cv-list divide-y divide-border">
          {visibles.map((b) => (
            <div
              key={b.tokenId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-secondary/30"
            >
              <div className="min-w-[6rem]">
                <div className="font-mono text-xs font-semibold uppercase tracking-wide text-accent-foreground/70">
                  Serie {b.serie}
                </div>
                <div className="font-heading text-base font-semibold leading-tight text-foreground">
                  Bono #{b.numero}
                </div>
              </div>
              <div className="min-w-[8rem] flex-1 text-sm">
                <div className="text-xs text-muted-foreground">Tenedor</div>
                <div className="truncate text-foreground">{b.tenedor ?? "—"}</div>
              </div>
              <div className="text-sm tnum">
                <div className="text-xs text-muted-foreground">Valor nominal</div>
                <div className="font-medium text-foreground">{colones(b.valorNominal)}</div>
              </div>
              <EstadoBadge estado={b.estado} />
              <div className="ml-auto flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/bono/${b.tokenId}`}>
                    <History className="size-4" />
                    Historial
                  </Link>
                </Button>
                {b.puedeColocar && (
                  <Button asChild size="sm">
                    <Link href={`/partido/transferir/${b.tokenId}`}>
                      <ArrowRightLeft className="size-4" />
                      Colocar
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
