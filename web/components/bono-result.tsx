import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  Hash,
  Landmark,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  UserRound,
} from "lucide-react";
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
  const transferencias = eventos.filter((ev) => ev.tipo !== "EMISION").length;

  return (
    <Card className="bono-result overflow-hidden">
      <CardContent className="p-0">
        <div className="relative border-b border-border bg-card px-4 py-4 sm:px-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />
          <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
                  {bonoLabel(bono.partido, bono.serie, bono.numero)}
                </span>
                <EstadoBadge estado={bono.estado} />
              </div>
              <h3 className="mt-1 font-heading text-lg font-semibold leading-tight text-foreground">
                {bono.partido} · Serie {bono.serie} · Bono #{bono.numero}
              </h3>
            </div>
            <div className="rounded-md border border-border bg-secondary/55 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {transferencias} {transferencias === 1 ? "movimiento" : "movimientos"}
            </div>
          </div>
        </div>

        <div className="bono-result-body px-4 py-4 sm:px-5">
          <dl className="bono-result-facts grid gap-2">
            <Fact icon={CircleDollarSign} label="Valor nominal" value={colones(bono.valor_nominal)} />
            <Fact icon={UserRound} label="Tenedor actual" value={tenedorActual} />
            <Fact icon={CalendarDays} label="Emisión" value={bono.fecha_emision} />
          </dl>

          <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-secondary/25">
            <details className="bono-disclosure group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-medium text-foreground marker:hidden">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Hash className="size-4 shrink-0 text-primary" />
                  <span>Ver historial de custodia</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="bono-disclosure-panel px-3.5 pb-4 pt-1">
                <CustodyTimeline eventos={eventos} serie={bono.serie} />
              </div>
            </details>

            {verificacion && (
              <details className="bono-disclosure group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-medium text-foreground marker:hidden">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {verificacion.ok ? (
                      <ShieldCheck className="size-4 shrink-0 text-colocado-foreground" />
                    ) : (
                      <TriangleAlert className="size-4 shrink-0 text-destructive" />
                    )}
                    <span>{verificacion.ok ? "Ver verificación en cadena" : "Revisar alerta de cadena"}</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div
                  className={
                    verificacion.ok
                      ? "bono-disclosure-panel px-3.5 pb-4 pt-1 text-sm text-colocado-foreground"
                      : "bono-disclosure-panel px-3.5 pb-4 pt-1 text-sm text-destructive"
                  }
                >
                  <p className="font-medium">
                    {verificacion.ok
                      ? "Índice verificado contra la cadena"
                      : "El índice no coincide con la cadena"}
                  </p>
                  {!verificacion.ok && (
                    <p className="mt-1 text-xs">
                      Diferencias: {verificacion.diferencias.join(", ")}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground tnum">{value}</dd>
    </div>
  );
}
