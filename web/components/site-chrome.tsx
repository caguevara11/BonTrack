import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sello institucional abstracto (estrella en orla) — motivo de "documento oficial". */
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-7", className)} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path
        d="M24 11l3.4 7.2 7.9.9-5.8 5.4 1.5 7.8L24 36l-7 3.3 1.5-7.8-5.8-5.4 7.9-.9L24 11z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Brand({
  subtitle,
  tone = "light",
}: {
  subtitle?: string;
  tone?: "light" | "dark";
}) {
  const color = tone === "light" ? "text-primary-foreground" : "text-foreground";
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", color)}>
      <Seal className={tone === "light" ? "text-accent" : "text-primary"} />
      <span className="flex items-baseline gap-2">
        <span className="font-heading text-xl font-semibold tracking-tight">BonTrack</span>
        {subtitle && (
          <span
            className={cn(
              "text-sm",
              tone === "light" ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Banda superior institucional: fondo tinta, filete dorado inferior. */
export function SiteHeader({
  subtitle,
  right,
  width = "3xl",
}: {
  subtitle?: string;
  right?: ReactNode;
  width?: "2xl" | "3xl" | "5xl";
}) {
  const maxw = { "2xl": "max-w-2xl", "3xl": "max-w-3xl", "5xl": "max-w-5xl" }[width];
  return (
    <header className="relative bg-primary">
      <div className={cn("mx-auto flex items-center justify-between gap-4 px-6 py-3.5", maxw)}>
        <Brand subtitle={subtitle} />
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
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
