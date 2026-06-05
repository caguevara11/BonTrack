import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightLeft, FilePlus2, History } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBonosByPartidoId,
  getEmissionRequestsForPartido,
  getEventosByTokenIds,
  type BonoRow,
  type EmissionRequestRow,
  type EventoRow,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EstadoBadge } from "@/components/estado-badge";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { Reveal } from "@/components/reveal";
import { EmissionRequestForm } from "@/components/emission-request-form";
import { colones, fmtFecha } from "@/lib/utils";

export const metadata = { title: "Panel del partido · BonTrack" };

// Vista del partido — sprint-01: trazabilidad de SUS bonos leída de la cadena
// pública. Así "se entera" de los endosos sin sistema de notificaciones (R16/AC-3.4).
export default async function PartidoPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "partido" || !actor.partidoId) redirect("/inicio");

  const admin = createSupabaseAdmin();
  const [bonos, solicitudes] = await Promise.all([
    getBonosByPartidoId(admin, actor.partidoId),
    getEmissionRequestsForPartido(admin, actor.partidoId),
  ]);
  const eventosPorBono = await getEventosByTokenIds(
    admin,
    bonos.map((b) => b.token_id),
  );
  const conEventos = bonos.map((bono) => ({
    bono,
    eventos: eventosPorBono.get(bono.token_id) ?? [],
  }));

  const emitidos = bonos.filter((b) => b.estado === "EMITIDO").length;
  const colocados = bonos.filter((b) => b.estado === "COLOCADO").length;
  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  const actividad = conEventos
    .flatMap(({ bono, eventos }) =>
      eventos.filter((e) => e.tipo !== "EMISION").map((e) => ({ bono, ev: e as EventoRow })),
    )
    .sort((a, b) => new Date(b.ev.ts).getTime() - new Date(a.ev.ts).getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle={actor.displayName} right={<LogoutButton />} />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        <Reveal className="grid grid-cols-3 gap-4">
          <Stat label="Emitidos" value={emitidos} hint="disponibles" accent />
          <Stat label="Colocados" value={colocados} hint="en tenedores" />
          <Stat label="Aprob. pendiente" value={pendientes} hint="solicitudes" />
        </Reveal>

        <Reveal index={1}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Nueva emisión
          </h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
                  <FilePlus2 className="size-5 text-accent-foreground" />
                  Solicitar bonos al TSE
                </h3>
                <p className="text-sm text-muted-foreground">
                  El TSE revisa la solicitud; si aprueba, los bonos quedan EMITIDO y listos para
                  colocar.
                </p>
              </div>
              <EmissionRequestForm />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal index={2}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Solicitudes
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {solicitudes.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No hay solicitudes de emisión todavía.
                </p>
              ) : (
                solicitudes.map((solicitud) => (
                  <SolicitudRow key={solicitud.id} solicitud={solicitud} />
                ))
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal index={3}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Actividad reciente
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {actividad.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Sin movimientos todavía.
                </p>
              ) : (
                actividad.map(({ bono, ev }) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <span className="text-foreground/90">
                      <span className="font-mono text-xs font-semibold uppercase text-accent-foreground/70">
                        {bono.serie}-{bono.numero}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {ev.tipo === "COLOCACION" ? "colocado:" : "endosado:"}
                      </span>{" "}
                      {ev.from_label}
                      <ArrowRightLeft className="mx-1 inline size-3 text-accent" />
                      <span className="font-medium">{ev.to_label}</span>
                      {ev.precio != null && (
                        <span className="ml-1 text-muted-foreground tnum">· {colones(ev.precio)}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tnum">
                      {fmtFecha(ev.ts)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal index={4}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Mis bonos
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {conEventos.map(({ bono, eventos }) => (
                <BonoRowItem
                  key={bono.token_id}
                  bono={bono}
                  tenedor={eventos[0]?.to_label}
                  puedeColocar={
                    bono.estado === "EMITIDO" && bono.current_owner_pubkey === actor.ownerPubkey
                  }
                />
              ))}
            </CardContent>
          </Card>
        </Reveal>
      </main>
    </div>
  );
}

function SolicitudRow({ solicitud }: { solicitud: EmissionRequestRow }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            Serie {solicitud.serie} · {solicitud.cantidad} bonos
          </span>
          <RequestBadge estado={solicitud.estado} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {colones(solicitud.valor_nominal)} nominal · solicitada {fmtFecha(solicitud.requested_at)}
        </p>
        {solicitud.motivo_rechazo && (
          <p className="mt-1 text-sm text-destructive">Motivo: {solicitud.motivo_rechazo}</p>
        )}
      </div>
      {solicitud.reviewed_at && (
        <span className="font-mono text-xs text-muted-foreground tnum">
          Revisada {fmtFecha(solicitud.reviewed_at)}
        </span>
      )}
    </div>
  );
}

function RequestBadge({ estado }: { estado: EmissionRequestRow["estado"] }) {
  const variant =
    estado === "RECHAZADA" ? "destructive" : estado === "APROBADA" ? "secondary" : "outline";
  return <Badge variant={variant}>{estado}</Badge>;
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-accent/40" : undefined}>
      <CardContent className="px-4 py-5 text-center">
        <div className="font-heading text-3xl font-semibold text-foreground tnum">{value}</div>
        <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function BonoRowItem({
  bono,
  tenedor,
  puedeColocar,
}: {
  bono: BonoRow;
  tenedor?: string;
  puedeColocar: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="text-sm">
        <span className="font-medium text-foreground">
          Serie {bono.serie} · #{bono.numero}
        </span>
        <span className="ml-2 text-muted-foreground">Tenedor: {tenedor ?? "—"}</span>
      </div>
      <div className="flex items-center gap-3">
        <EstadoBadge estado={bono.estado} />
        <Button asChild variant="outline" size="sm">
          <Link href={`/bono/${bono.token_id}`}>
            <History className="size-4" />
            Historial
          </Link>
        </Button>
        {puedeColocar && (
          <Button asChild size="sm">
            <Link href={`/partido/transferir/${bono.token_id}`}>
              <ArrowRightLeft className="size-4" />
              Colocar
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
