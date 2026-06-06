import Link from "next/link";
import { ArrowRightLeft, ExternalLink, History, Landmark, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/estado-badge";
import { colones, fmtFecha } from "@/lib/utils";
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

/**
 * Versión grid de la búsqueda: misma estética de tarjeta que la cartera. Lidera
 * con el número (la serie va en el encabezado de grupo) y trunca el partido para
 * que nada se salga del cuadro.
 */
export function ResultadoBonoGrid({ resultado }: { resultado: Resultado }) {
  const { bono, eventos } = resultado;
  const tenedorActual = eventos[0]?.to_label ?? "—";
  const movimientos = eventos.filter((ev) => ev.tipo !== "EMISION").length;

  return (
    <article className="cq group flex min-w-0 flex-col rounded-xl bg-card text-card-foreground shadow-panel ring-1 ring-foreground/10 transition-shadow hover:shadow-lg">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-accent-foreground/70">
            Bono #{bono.numero}
          </span>
          <EstadoBadge estado={bono.estado} />
        </div>
        <h3
          className="mt-1 line-clamp-2 font-heading text-base font-semibold leading-tight text-foreground"
          title={bono.partido}
        >
          {bono.partido}
        </h3>
      </div>

      <dl className="min-w-0 space-y-1 px-4 py-3 text-sm tnum">
        <RowMini label="Valor nominal" value={colones(bono.valor_nominal)} />
        <RowMini label="Tenedor" value={tenedorActual} />
        <RowMini label="Movimientos" value={String(movimientos)} />
      </dl>

      <div className="mt-auto border-t border-border px-4 py-3">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/bono/${bono.token_id}`}>
            <History className="size-4" />
            Ver historial
          </Link>
        </Button>
      </div>
    </article>
  );
}

function RowMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
