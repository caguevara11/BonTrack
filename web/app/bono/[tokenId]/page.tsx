import { cache } from "react";
import type { Metadata } from "next";
import {
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Hash,
  UserRound,
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBonoByTokenId, getEventos } from "@/lib/db";
import { CustodyTimeline } from "@/components/bono-result";
import { BackLink } from "@/components/back-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { EstadoBadge } from "@/components/estado-badge";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { Panel } from "@/components/dashboard";
import { bonoLabel, colones } from "@/lib/utils";

// Memoizado por request: la página y generateMetadata comparten el mismo fetch.
const fetchBono = cache(async (tokenId: number) => {
  const admin = createSupabaseAdmin();
  const bono = await getBonoByTokenId(admin, tokenId);
  const eventos = bono ? await getEventos(admin, tokenId) : [];
  return { bono, eventos };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  const { bono } = await fetchBono(Number(tokenId));
  const id = bono ? bonoLabel(bono.partido, bono.serie, bono.numero) : "Bono";
  return { title: `${id} · Historial · BonTrack` };
}

// Historial de custodia de un bono (lectura pública por token_id) — sprint-03:
// la cadena es el protagonista, en timeline visible (no escondida en un acordeón).
export default async function BonoPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId: tokenIdStr } = await params;
  const { bono, eventos } = await fetchBono(Number(tokenIdStr));

  const tenedorActual = eventos[0]?.to_label ?? "—";
  const transferencias = eventos.filter((ev) => ev.tipo !== "EMISION").length;
  const explorerUrl = bono
    ? `https://stellar.expert/explorer/testnet/contract/${bono.contract_id}`
    : "#";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle="Historial de custodia" width="5xl" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {bono ? (
          <Reveal>
            <div className="mb-4">
              <BackLink />
            </div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
                  {bonoLabel(bono.partido, bono.serie, bono.numero)}
                </div>
                <h1 className="mt-1 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground">
                  {bono.partido}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Serie {bono.serie} · Bono #{bono.numero}
                </p>
              </div>
              <EstadoBadge estado={bono.estado} className="text-sm" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
              <div className="space-y-4">
                <Card className="shadow-panel">
                  <CardContent className="grid gap-2.5">
                    <Fact icon={CircleDollarSign} label="Valor nominal" value={colones(bono.valor_nominal)} />
                    <Fact icon={UserRound} label="Tenedor actual" value={tenedorActual} />
                    <Fact icon={CalendarDays} label="Fecha de emisión" value={bono.fecha_emision} />
                    <Fact icon={Hash} label="Movimientos" value={`${transferencias}`} />
                  </CardContent>
                </Card>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
                >
                  Verificar contrato en la cadena
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              <Panel eyebrow="Inmutable y público" title="Cadena de custodia">
                {eventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este bono no tiene eventos registrados.</p>
                ) : (
                  <CustodyTimeline eventos={eventos} serie={bono.serie} />
                )}
              </Panel>
            </div>
          </Reveal>
        ) : (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">
              No se encontró el bono solicitado.
            </CardContent>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
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
    <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/25 px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-foreground tnum">{value}</dd>
      </div>
    </div>
  );
}
