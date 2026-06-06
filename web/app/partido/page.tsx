import { redirect } from "next/navigation";
import { ArrowRightLeft, Coins, FilePlus2, Landmark, ScrollText, Send } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBonosByPartidoId,
  getEmissionRequestsForPartido,
  getEventosByTokenIds,
  nextSerieForPartido,
  type EmissionRequestRow,
  type EventoRow,
} from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { Reveal } from "@/components/reveal";
import { EmissionRequestForm } from "@/components/emission-request-form";
import { PartidoBonos } from "@/components/partido-bonos";
import { Shell, KpiBand, Stat, Panel, EmptyState } from "@/components/dashboard";
import { colones, fmtFecha } from "@/lib/utils";

export const metadata = { title: "Panel del partido · BonTrack" };

// Vista del partido — tablero operativo (sprint-03): KPIs + columna principal
// (Mis bonos) + riel (solicitar / solicitudes / actividad). La trazabilidad de
// SUS bonos se lee de la cadena pública (R16/AC-3.4).
export default async function PartidoPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "partido" || !actor.partidoId) redirect("/inicio");

  const admin = createSupabaseAdmin();
  const [bonos, solicitudes, nextSerie] = await Promise.all([
    getBonosByPartidoId(admin, actor.partidoId),
    getEmissionRequestsForPartido(admin, actor.partidoId),
    nextSerieForPartido(admin, actor.partidoId),
  ]);
  const seriesAgotadas = nextSerie > "Z";
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
  const valorColocado = conEventos
    .filter(({ bono }) => bono.estado === "COLOCADO")
    .reduce((sum, { bono }) => sum + Number(bono.valor_nominal), 0);

  const bonosUI = conEventos.map(({ bono, eventos }) => ({
    tokenId: bono.token_id,
    serie: bono.serie,
    numero: bono.numero,
    valorNominal: Number(bono.valor_nominal),
    estado: bono.estado,
    tenedor: eventos[0]?.to_label ?? null,
    puedeColocar:
      bono.estado === "EMITIDO" && bono.current_owner_pubkey === actor.ownerPubkey,
  }));

  const actividad = conEventos
    .flatMap(({ bono, eventos }) =>
      eventos.filter((e) => e.tipo !== "EMISION").map((e) => ({ bono, ev: e as EventoRow })),
    )
    .sort((a, b) => new Date(b.ev.ts).getTime() - new Date(a.ev.ts).getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle={actor.displayName} right={<LogoutButton />} width="7xl" />

      <Shell>
        <Reveal className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Panel del partido
          </h1>
          <p className="text-sm text-muted-foreground">
            Emisión, colocación y trazabilidad de los bonos de {actor.displayName}.
          </p>
        </Reveal>

        <Reveal index={1}>
          <KpiBand className="mb-6">
            <Stat icon={Coins} label="Emitidos" value={emitidos} hint="disponibles para colocar" accent />
            <Stat icon={Landmark} label="Colocados" value={colocados} hint="en tenedores" />
            <Stat icon={Send} label="Aprob. pendiente" value={pendientes} hint="solicitudes en revisión" />
            <Stat
              icon={ScrollText}
              label="Valor colocado"
              value={colones(valorColocado)}
              hint="nominal en circulación"
            />
          </KpiBand>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <Reveal index={2} className="min-w-0">
            <Panel eyebrow="Cartera" title="Mis bonos" flush>
              <PartidoBonos bonos={bonosUI} />
            </Panel>
          </Reveal>

          <div className="space-y-6">
            <Reveal index={2}>
              <Panel eyebrow="Nueva emisión" title="Solicitar bonos al TSE" icon={FilePlus2}>
                <p className="mb-4 text-sm text-muted-foreground">
                  El TSE revisa la solicitud; si aprueba, los bonos quedan EMITIDO y listos para
                  colocar.
                </p>
                {seriesAgotadas ? (
                  <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    Ya se emitieron todas las series disponibles (A–Z).
                  </p>
                ) : (
                  <EmissionRequestForm nextSerie={nextSerie} />
                )}
              </Panel>
            </Reveal>

            <Reveal index={3}>
              <Panel eyebrow="Trámites" title="Solicitudes" flush>
                {solicitudes.length === 0 ? (
                  <EmptyState icon={Send}>No hay solicitudes de emisión todavía.</EmptyState>
                ) : (
                  <div className="panel-scroll max-h-80 divide-y divide-border">
                    {solicitudes.map((solicitud) => (
                      <SolicitudRow key={solicitud.id} solicitud={solicitud} />
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>

            <Reveal index={4}>
              <Panel eyebrow="Movimientos" title="Actividad reciente" flush>
                {actividad.length === 0 ? (
                  <EmptyState icon={ArrowRightLeft}>Sin movimientos todavía.</EmptyState>
                ) : (
                  <div className="divide-y divide-border">
                    {actividad.map(({ bono, ev }) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                      >
                        <span className="min-w-0 text-foreground/90">
                          <span className="font-mono text-xs font-semibold uppercase text-accent-foreground/70">
                            {bono.serie}-{bono.numero}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {ev.tipo === "COLOCACION" ? "colocado:" : "endosado:"}
                          </span>{" "}
                          <span className="font-medium">{ev.to_label}</span>
                          {ev.precio != null && (
                            <span className="ml-1 text-muted-foreground tnum">
                              · {colones(ev.precio)}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground tnum">
                          {fmtFecha(ev.ts)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>
          </div>
        </div>
      </Shell>
    </div>
  );
}

function SolicitudRow({ solicitud }: { solicitud: EmissionRequestRow }) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">
          Serie {solicitud.serie} · {solicitud.cantidad} bonos
        </span>
        <RequestBadge estado={solicitud.estado} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground tnum">
        {colones(solicitud.valor_nominal)} nominal · {fmtFecha(solicitud.requested_at)}
      </p>
      {solicitud.motivo_rechazo && (
        <p className="mt-1 text-sm text-destructive">Motivo: {solicitud.motivo_rechazo}</p>
      )}
    </div>
  );
}

function RequestBadge({ estado }: { estado: EmissionRequestRow["estado"] }) {
  const variant =
    estado === "RECHAZADA" ? "destructive" : estado === "APROBADA" ? "secondary" : "outline";
  return <Badge variant={variant}>{estado}</Badge>;
}
