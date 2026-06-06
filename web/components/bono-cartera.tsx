"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarteraItem = {
  tokenId: number;
  serie: string;
  estado: string;
  /** Nombre del partido — para agrupar y rotular cuando hay varios. Opcional. */
  partido?: string;
  /** Tarjeta o fila ya renderizada en el servidor. */
  node: ReactNode;
};

type EstadoFiltro = "TODOS" | "EMITIDO" | "COLOCADO";

const PAGE_SIZE = 12;

/**
 * Cartera de bonos compartida (partido y tenedor): agrupa por serie con
 * encabezados compactos, filtra por serie (y opcionalmente por estado) y
 * pagina cuando hay muchos. Recibe cada bono ya renderizado como `node`, así
 * sirve tanto para la lista densa del partido como para la grilla del tenedor.
 */
export function BonoCartera({
  items,
  layout = "list",
  estadoFilter = false,
  emptyLabel = "No hay bonos en esta vista.",
}: {
  items: CarteraItem[];
  layout?: "list" | "grid";
  estadoFilter?: boolean;
  emptyLabel?: string;
}) {
  const [estado, setEstado] = useState<EstadoFiltro>("TODOS");
  const [serie, setSerie] = useState<string>("TODAS");
  const [page, setPage] = useState(0);

  const series = useMemo(
    () => [...new Set(items.map((i) => i.serie))].sort(),
    [items],
  );

  const porEstado = useMemo(
    () => (serie === "TODAS" ? items : items.filter((i) => i.serie === serie)),
    [items, serie],
  );
  const porSerie = useMemo(
    () => (estado === "TODOS" ? items : items.filter((i) => i.estado === estado)),
    [items, estado],
  );

  const filtrados = useMemo(
    () =>
      items.filter(
        (i) =>
          (estado === "TODOS" || i.estado === estado) &&
          (serie === "TODAS" || i.serie === serie),
      ),
    [items, estado, serie],
  );

  const pageCount = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const slice = filtrados.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Agrupa la página visible por partido+serie, conservando el orden. Mostramos
  // el partido en el encabezado solo si la lista mezcla varios.
  const multiPartido = new Set(items.map((i) => i.partido).filter(Boolean)).size > 1;
  const grupos: { key: string; partido?: string; serie: string; items: CarteraItem[] }[] = [];
  for (const it of slice) {
    const key = `${it.partido ?? ""}␟${it.serie}`;
    const last = grupos[grupos.length - 1];
    if (last && last.key === key) last.items.push(it);
    else grupos.push({ key, partido: it.partido, serie: it.serie, items: [it] });
  }

  const panelBar = layout === "list";

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          panelBar ? "border-b border-border px-5 py-3" : "mb-4",
        )}
      >
        {estadoFilter &&
          (
            [
              ["TODOS", "Todos"],
              ["EMITIDO", "Emitidos"],
              ["COLOCADO", "Colocados"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              active={estado === value}
              onClick={() => {
                setEstado(value);
                setPage(0);
              }}
              count={
                value === "TODOS"
                  ? porEstado.length
                  : porEstado.filter((b) => b.estado === value).length
              }
            >
              {label}
            </Chip>
          ))}

        {estadoFilter && series.length > 1 && (
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        )}

        {series.length > 1 && (
          <>
            <Chip
              active={serie === "TODAS"}
              onClick={() => {
                setSerie("TODAS");
                setPage(0);
              }}
              count={porSerie.length}
            >
              Todas
            </Chip>
            {series.map((s) => (
              <Chip
                key={s}
                active={serie === s}
                onClick={() => {
                  setSerie(s);
                  setPage(0);
                }}
                count={porSerie.filter((b) => b.serie === s).length}
              >
                Serie {s}
              </Chip>
            ))}
          </>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <Inbox className="size-7 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className={cn(layout === "list" ? "cv-list" : "space-y-5")}>
          {grupos.map((g) => (
            <section key={g.key}>
              <SerieHeader
                serie={g.serie}
                partido={multiPartido ? g.partido : undefined}
                count={g.items.length}
                inset={panelBar}
              />
              {layout === "grid" ? (
                <div className="bono-grid">{g.items.map((it) => it.node)}</div>
              ) : (
                <div className="divide-y divide-border">
                  {g.items.map((it) => it.node)}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 text-sm text-muted-foreground",
            panelBar ? "border-t border-border px-5 py-3" : "mt-4",
          )}
        >
          <span className="tnum">
            {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + slice.length} de {filtrados.length}
          </span>
          <div className="flex items-center gap-1">
            <PagerButton onClick={() => setPage(current - 1)} disabled={current === 0}>
              <ChevronLeft className="size-4" />
              Anterior
            </PagerButton>
            <span className="px-2 tnum">
              {current + 1} / {pageCount}
            </span>
            <PagerButton
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function SerieHeader({
  serie,
  partido,
  count,
  inset = false,
}: {
  serie: string;
  partido?: string;
  count: number;
  inset?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 py-1.5", inset && "px-5")}>
      <span className="font-mono text-xs font-semibold uppercase tracking-wide text-accent-foreground/70">
        {partido ? `${partido} · Serie ${serie}` : `Serie ${serie}`}
      </span>
      <span className="tnum text-xs text-muted-foreground">{count}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
      )}
    >
      {children}
      <span className="tnum opacity-70">{count}</span>
    </button>
  );
}

function PagerButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
