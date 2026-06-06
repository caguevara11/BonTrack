import Link from "next/link";
import { redirect } from "next/navigation";
import { History, ArrowRightLeft, Inbox, Wallet, Coins, Vote } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBonosByOwner, getEventosByTokenIds } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/estado-badge";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { Reveal } from "@/components/reveal";
import { Shell, KpiBand, Stat } from "@/components/dashboard";
import { colones, fmtFechaCorta, bonoLabel } from "@/lib/utils";

export const metadata = { title: "Mis bonos · BonTrack" };

// TEN-1 — Mi cartera (sprint-03): resumen del portafolio + grilla de bonos.
export default async function TenedorPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "tenedor" || !actor.ownerPubkey) redirect("/inicio");

  const admin = createSupabaseAdmin();

  // El perfil del holder y sus bonos son independientes → en paralelo (sin waterfall).
  const [{ data: holder }, bonos] = await Promise.all([
    admin.from("holders").select("cedula, nombre").eq("id", actor.holderId!).maybeSingle(),
    getBonosByOwner(admin, actor.ownerPubkey),
  ]);

  // Eventos de todos los bonos en una sola query.
  const eventosPorBono = await getEventosByTokenIds(
    admin,
    bonos.map((b) => b.token_id),
  );
  const conAdquisicion = bonos.map((bono) => {
    const eventos = eventosPorBono.get(bono.token_id) ?? [];
    const adq = eventos.find((e) => e.to_pubkey === actor.ownerPubkey);
    const desc =
      adq?.precio != null && adq.precio < bono.valor_nominal
        ? Math.round((1 - adq.precio / bono.valor_nominal) * 100)
        : null;
    return { bono, fechaAdquisicion: adq?.ts ?? null, precioPagado: adq?.precio ?? null, desc };
  });

  const valorTotal = bonos.reduce((sum, b) => sum + Number(b.valor_nominal), 0);
  const partidos = new Set(bonos.map((b) => b.partido)).size;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        subtitle={holder ? `${holder.nombre} · ${holder.cedula}` : actor.displayName}
        right={<LogoutButton />}
        width="7xl"
      />

      <Shell>
        <Reveal className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Mi cartera
          </h1>
          <p className="text-sm text-muted-foreground">
            Bonos de deuda política a tu nombre, verificables en la cadena.
          </p>
        </Reveal>

        {bonos.length === 0 ? (
          <Reveal index={1}>
            <Card className="shadow-panel">
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <Inbox className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Todavía no tenés bonos a tu nombre.</p>
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <>
            <Reveal index={1}>
              <KpiBand className="mb-6">
                <Stat icon={Wallet} label="Bonos" value={bonos.length} hint="en tu poder" accent />
                <Stat icon={Coins} label="Valor nominal" value={colones(valorTotal)} hint="total" />
                <Stat icon={Vote} label="Partidos" value={partidos} hint="distintos" />
              </KpiBand>
            </Reveal>

            <Reveal index={2}>
              <div className="bono-grid">
                {conAdquisicion.map(({ bono, fechaAdquisicion, precioPagado, desc }) => (
                  <article
                    key={bono.token_id}
                    className="cq group rounded-xl bg-card text-card-foreground shadow-panel ring-1 ring-foreground/10 transition-shadow hover:shadow-lg"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-mono text-xs uppercase tracking-widest text-accent-foreground/70">
                          {bonoLabel(bono.partido, bono.serie, bono.numero)}
                        </div>
                        <EstadoBadge estado={bono.estado} />
                      </div>
                      <h3 className="mt-1 font-heading text-base font-semibold leading-tight text-foreground">
                        {bono.partido}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Serie {bono.serie} · Bono #{bono.numero}
                      </p>
                    </div>

                    <dl className="space-y-1 px-4 py-3 text-sm tnum">
                      <Row label="Valor nominal" value={colones(bono.valor_nominal)} />
                      {fechaAdquisicion && (
                        <Row label="En mi poder desde" value={fmtFechaCorta(fechaAdquisicion)} />
                      )}
                      {precioPagado != null && (
                        <Row
                          label="Pagué"
                          value={
                            <>
                              {colones(precioPagado)}
                              {desc != null && desc > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground/80">
                                  (desc. {desc}%)
                                </span>
                              )}
                            </>
                          }
                        />
                      )}
                    </dl>

                    <div className="flex gap-2 border-t border-border px-4 py-3">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/bono/${bono.token_id}`}>
                          <History className="size-4" />
                          Historial
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/tenedor/transferir/${bono.token_id}`}>
                          <ArrowRightLeft className="size-4" />
                          Transferir
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          </>
        )}
      </Shell>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="whitespace-nowrap text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
