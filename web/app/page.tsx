import Link from "next/link";
import {
  ArrowRightLeft,
  ExternalLink,
  Landmark,
  LogIn,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { TrazabilidadSearch } from "@/components/trazabilidad";
import { Reveal } from "@/components/reveal";

const STELLAR_CONTRACT_URL =
  "https://stellar.expert/explorer/testnet/contract/CBCMZ5LYDCZHA7VFC5UT5EOYVCUN3ZUK3YWYJV6RW4RJYCEB763NOSKR";

const PASOS: { icon: ComponentType<LucideProps>; n: string; titulo: string; texto: string }[] = [
  {
    icon: Stamp,
    n: "01",
    titulo: "Emisión",
    texto: "El TSE aprueba y el bono nace en la cadena, con su valor y serie inmutables.",
  },
  {
    icon: Landmark,
    n: "02",
    titulo: "Colocación",
    texto: "El partido entrega el bono a su primer tenedor, con fecha y precio registrados.",
  },
  {
    icon: ArrowRightLeft,
    n: "03",
    titulo: "Endoso",
    texto: "Cada traspaso entre tenedores queda firmado y público, sin perder la cadena.",
  },
];

// PUB-1 — Buscador de Trazabilidad Pública (sin login).
export default function PublicoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        subtitle="Trazabilidad Pública"
        width="5xl"
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Reveal className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Tribunal Supremo de Elecciones
          </div>
          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Registro público de bonos de deuda política
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Consultá la cadena de custodia completa de cualquier bono: quién lo emitió, quién lo
            tuvo y a qué precio se endosó. Verificable de forma inmutable en la cadena.
          </p>
          <a
            href={STELLAR_CONTRACT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
          >
            Ver contrato en Blockchain
            <ExternalLink className="size-3.5" />
          </a>
        </Reveal>

        <Reveal index={1} className="mb-10">
          <ol className="grid gap-4 sm:grid-cols-3">
            {PASOS.map(({ icon: Icon, n, titulo, texto }, i) => (
              <li
                key={n}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-panel"
              >
                <span
                  className="pointer-events-none absolute -right-2 -top-3 font-heading text-6xl font-semibold text-secondary/70 tnum"
                  aria-hidden
                >
                  {n}
                </span>
                <span className="relative grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="relative mt-3 font-heading text-lg font-semibold text-foreground">
                  {titulo}
                </h3>
                <p className="relative mt-1 text-sm text-muted-foreground">{texto}</p>
                {i < PASOS.length - 1 && (
                  <ArrowRightLeft
                    className="absolute right-4 top-1/2 hidden size-4 -translate-y-1/2 text-accent sm:block"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal index={2}>
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Consultar un bono
            </h2>
          </div>
          <TrazabilidadSearch />
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
