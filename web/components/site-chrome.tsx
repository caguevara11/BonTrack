import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Brand({
  subtitle,
  tone = "light",
}: {
  subtitle?: string;
  tone?: "light" | "dark";
}) {
  const color = tone === "light" ? "text-primary-foreground" : "text-foreground";
  // Logo blanco sobre fondo oscuro (tone light); negro sobre fondo claro (tone dark).
  const logo = tone === "light" ? "/logo-blanco.svg" : "/logo-negro.svg";
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", color)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" aria-hidden className="h-7 w-auto shrink-0" />
      <span className="flex items-center gap-2.5">
        <span className="font-heading text-xl font-semibold leading-none tracking-tight">
          BonTrack
        </span>
        {subtitle && (
          <>
            <span className="h-4 w-px bg-accent/50" aria-hidden />
            <span
              className={cn(
                "text-sm leading-none",
                tone === "light" ? "text-primary-foreground/75" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </span>
          </>
        )}
      </span>
    </Link>
  );
}

/**
 * Banda superior institucional ("documento oficial"): tinta con profundidad y
 * textura grabada, sticky con elevación al hacer scroll, y filete dorado de
 * certificado abajo. Estilo en .site-header (globals.css).
 */
export function SiteHeader({
  subtitle,
  right,
  width = "3xl",
}: {
  subtitle?: string;
  right?: ReactNode;
  width?: "2xl" | "3xl" | "5xl" | "7xl";
}) {
  const maxw = {
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "5xl": "max-w-5xl",
    "7xl": "max-w-7xl",
  }[width];
  return (
    <header className="site-header">
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8",
          maxw,
        )}
      >
        <Brand subtitle={subtitle} />
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      <div className="site-header__rule" />
    </header>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-border bg-card/60", className)}>
      <div className="mx-auto max-w-3xl px-6 py-5 text-center text-xs leading-relaxed text-muted-foreground">
        Datos publicados conforme al Código Electoral. Toda la información es pública por mandato
        legal y queda registrada de forma inmutable en la cadena (Stellar testnet).
      </div>
    </footer>
  );
}
