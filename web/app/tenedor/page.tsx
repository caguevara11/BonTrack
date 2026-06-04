import Link from "next/link";
import { redirect } from "next/navigation";
import { History, ArrowRightLeft, Inbox } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBonosByOwner, getEventosByTokenIds } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/estado-badge";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { Reveal } from "@/components/reveal";
import { colones, fmtFecha, bonoLabel } from "@/lib/utils";

export const metadata = { title: "Mis bonos · BonTrack" };

// TEN-1 — Mis Bonos.
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

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        subtitle={holder ? `${holder.nombre} · ${holder.cedula}` : actor.displayName}
        right={<LogoutButton />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Reveal className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Mis bonos</h1>
          <p className="text-sm text-muted-foreground">
            {bonos.length} {bonos.length === 1 ? "bono activo" : "bonos activos"}
          </p>
        </Reveal>

        {bonos.length === 0 ? (
          <Reveal>
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Inbox className="size-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés bonos a tu nombre.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <div className="space-y-4">
            {conAdquisicion.map(({ bono, fechaAdquisicion, precioPagado, desc }, i) => (
              <Reveal key={bono.token_id} index={i}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-accent-foreground/70">
                        {bonoLabel(bono.partido, bono.serie, bono.numero)}
                      </div>
                      <h3 className="mt-0.5 font-heading text-lg font-semibold text-foreground">
                        {bono.partido} · Serie {bono.serie} · Bono #{bono.numero}
                      </h3>
                      <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground tnum">
                        <div>Valor nominal: {colones(bono.valor_nominal)}</div>
                        {fechaAdquisicion && (
                          <div>En mi poder desde: {fmtFecha(fechaAdquisicion)}</div>
                        )}
                        {precioPagado != null && (
                          <div>
                            Pagué: {colones(precioPagado)}
                            {desc != null && desc > 0 && (
                              <span className="text-muted-foreground/80"> (desc. {desc}%)</span>
                            )}
                          </div>
                        )}
                      </dl>
                    </div>
                    <EstadoBadge estado={bono.estado} />
                    <div className="flex w-full gap-2 border-t border-border pt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/bono/${bono.token_id}`}>
                          <History className="size-4" />
                          Ver historial
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/tenedor/transferir/${bono.token_id}`}>
                          <ArrowRightLeft className="size-4" />
                          Transferir
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
