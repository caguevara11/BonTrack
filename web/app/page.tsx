import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { TrazabilidadSearch } from "@/components/trazabilidad";
import { Reveal } from "@/components/reveal";

// PUB-1 — Buscador de Trazabilidad Pública (sin login).
export default function PublicoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        subtitle="Trazabilidad Pública"
        right={
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/90 transition-colors hover:bg-white/10"
          >
            <LogIn className="size-4" />
            Ingresar
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Reveal className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Tribunal Supremo de Elecciones
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Registro público de bonos de deuda política
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Consultá la cadena de custodia completa de cualquier bono: quién lo emitió, quién lo
            tuvo y a qué precio se endosó. Verificable de forma inmutable en la cadena.
          </p>
        </Reveal>

        <Reveal index={1}>
          <TrazabilidadSearch />
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
