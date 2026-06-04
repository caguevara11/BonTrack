import { Landmark, ArrowRightLeft, Stamp, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/estado-badge";
import { colones, fmtFecha, bonoLabel } from "@/lib/utils";
import type { Resultado } from "@/app/api/trazabilidad/route";
import type { EventoRow } from "@/lib/db";

function EventoIcon({ tipo }: { tipo: EventoRow["tipo"] }) {
  const Icon = tipo === "EMISION" ? Stamp : tipo === "COLOCACION" ? Landmark : ArrowRightLeft;
  return (
    <span className="grid size-8 place-items-center rounded-full border border-border bg-card text-primary shadow-sm">
      <Icon className="size-4" />
    </span>
  );
}

/** Línea de tiempo vertical de la cadena de custodia (más reciente arriba). */
export function CustodyTimeline({ eventos, serie }: { eventos: EventoRow[]; serie: string }) {
  return (
    <ol className="relative space-y-5">
      {eventos.map((ev, i) => (
        <li key={ev.id} className="relative flex gap-3.5">
          {i < eventos.length - 1 && (
            <span className="absolute left-4 top-9 h-[calc(100%+4px)] w-px -translate-x-1/2 bg-border" aria-hidden />
          )}
          <EventoIcon tipo={ev.tipo} />
          <div className="flex-1 pt-0.5">
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground tnum">
              {fmtFecha(ev.ts)}
            </div>
            {ev.tipo === "EMISION" ? (
              <div className="text-sm text-foreground">
                <span className="font-semibold text-primary">[EMISIÓN]</span> El TSE aprobó la
                Serie {serie} · {ev.to_label}
              </div>
            ) : (
              <div className="text-sm text-foreground">
                <span className="text-muted-foreground">{ev.from_label}</span>
                <ArrowRightLeft className="mx-1.5 inline size-3 text-accent" />
                <span className="font-semibold">{ev.to_label}</span>
                {ev.precio != null && (
                  <span className="ml-2 inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground tnum">
                    {colones(ev.precio)}
                  </span>
                )}
                {ev.tipo === "COLOCACION" && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(colocación)</span>
                )}
              </div>
            )}
            {ev.tx_hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${ev.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary hover:underline"
              >
                verificar en la cadena <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tarjeta de resultado de trazabilidad: datos del bono + historial (TSE-3 / PUB-1). */
export function ResultadoBono({ resultado }: { resultado: Resultado }) {
  const { bono, eventos } = resultado;
  const tenedorActual = eventos[0]?.to_label ?? "—";
  const verificacion = resultado.verificacion;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-4">
          <div>
            <div className="font-mono text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
              {bonoLabel(bono.partido, bono.serie, bono.numero)}
            </div>
            <h3 className="mt-0.5 font-heading text-lg font-semibold text-foreground">
              {bono.partido} · Serie {bono.serie} · Bono #{bono.numero}
            </h3>
            <p className="text-sm text-muted-foreground tnum">
              {colones(bono.valor_nominal)} nominal · emitido {bono.fecha_emision}
            </p>
          </div>
          <div className="text-right">
            <EstadoBadge estado={bono.estado} />
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tenedor actual:{" "}
              <span className="font-medium text-foreground">{tenedorActual}</span>
            </p>
          </div>
        </div>
        {verificacion && (
          <div
            className={
              verificacion.ok
                ? "border-b border-border bg-colocado/35 px-5 py-3 text-sm text-colocado-foreground"
                : "border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm text-destructive"
            }
          >
            <div className="flex items-start gap-2">
              {verificacion.ok ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {verificacion.ok
                    ? "Índice verificado contra la cadena"
                    : "El índice no coincide con la cadena"}
                </p>
                {!verificacion.ok && (
                  <p className="mt-0.5 text-xs">
                    Diferencias: {verificacion.diferencias.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="px-5 py-5">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Historial de custodia
          </h4>
          <CustodyTimeline eventos={eventos} serie={bono.serie} />
        </div>
      </CardContent>
    </Card>
  );
}
