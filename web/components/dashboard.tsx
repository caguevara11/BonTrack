import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Primitivas de tablero (sprint-03). Reemplazan la columna única `max-w-3xl`
 * por superficies anchas y reutilizables: Shell (área de contenido), KpiBand
 * (banda de indicadores), Stat (indicador), Panel (sección con encabezado).
 */

/** Área de contenido del tablero: ancha, fluida, con aire generoso. */
export function Shell({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) {
  const maxw = width === "narrow" ? "max-w-3xl" : "max-w-7xl";
  return (
    <main className={cn("mx-auto w-full flex-1 px-4 py-7 sm:px-6 lg:px-8", maxw, className)}>
      {children}
    </main>
  );
}

/** Eyebrow: rótulo de sección en mayúsculas con tracking (sistema, no ad-hoc). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Banda de KPIs: grilla responsiva que usa el ancho (auto-fit + minmax). */
export function KpiBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Indicador individual: ícono, valor grande tabular, etiqueta y pista. */
export function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon?: ComponentType<LucideProps>;
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "kpi-accent relative justify-between gap-3 py-4 transition-shadow hover:shadow-panel",
        accent && "before:opacity-100 ring-accent/40",
        !accent && "before:opacity-0",
      )}
    >
      <div className="flex items-center justify-between px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg",
              accent ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="px-4">
        <div className="font-heading text-3xl font-semibold leading-none text-foreground tnum">
          {value}
        </div>
        {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}

/**
 * Panel de sección: encabezado (eyebrow + título + acción opcional) + cuerpo.
 * `flush` quita el padding del cuerpo para listas con `divide-y`.
 */
export function Panel({
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  flush,
}: {
  eyebrow?: string;
  title?: ReactNode;
  icon?: ComponentType<LucideProps>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}) {
  return (
    <Card className={cn("gap-0 py-0 shadow-panel", className)}>
      {(title || eyebrow || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold leading-tight text-foreground">
                {Icon && <Icon className="size-5 shrink-0 text-accent-foreground" />}
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? "" : "px-5 py-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Estado vacío consistente para listas/paneles. */
export function EmptyState({
  icon: Icon,
  children,
}: {
  icon?: ComponentType<LucideProps>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      {Icon && <Icon className="size-7 text-muted-foreground/50" aria-hidden />}
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
