import { redirect } from "next/navigation";
import { ClipboardCheck, Coins, Inbox, Landmark, Layers, Vote } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAllBonos, getPendingEmissionRequests, type EmissionRequestRow } from "@/lib/db";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { TrazabilidadSearch } from "@/components/trazabilidad";
import { Reveal } from "@/components/reveal";
import { EmissionReviewActions } from "@/components/emission-review-actions";
import { Shell, KpiBand, Stat, Panel, EmptyState } from "@/components/dashboard";
import { colones, fmtFecha } from "@/lib/utils";

export const metadata = { title: "Panel TSE · BonTrack" };

// TSE — Sala de control (sprint-03): pulso del sistema + cola de aprobaciones +
// trazabilidad. Superficie en tema oscuro "tinta nocturna" para reforzar la
// sensación de monitoreo/autoridad.
export default async function TsePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "tse") redirect("/inicio");

  const admin = createSupabaseAdmin();
  const [solicitudes, bonos] = await Promise.all([
    getPendingEmissionRequests(admin),
    getAllBonos(admin),
  ]);

  const enCirculacion = bonos.filter((b) => b.estado === "COLOCADO").length;
  const montoTotal = bonos.reduce((sum, b) => sum + Number(b.valor_nominal), 0);
  const partidosActivos = new Set(bonos.map((b) => b.partido)).size;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle="Tribunal Supremo de Elecciones" right={<LogoutButton />} width="7xl" />

      <div className="theme-ink flex flex-1 flex-col text-foreground">
        <Shell>
          <Reveal className="mb-6">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Sala de control
            </h1>
            <p className="text-sm text-muted-foreground">
              Aprobación de emisiones y trazabilidad pública del registro nacional.
            </p>
          </Reveal>

          <Reveal index={1}>
            <KpiBand className="mb-6">
              <Stat icon={Coins} label="Bonos emitidos" value={bonos.length} hint="en el registro" />
              <Stat
                icon={Landmark}
                label="En circulación"
                value={enCirculacion}
                hint="colocados en tenedores"
              />
              <Stat
                icon={Layers}
                label="Monto nominal"
                value={colones(montoTotal)}
                hint="total emitido"
              />
              <Stat icon={Vote} label="Partidos activos" value={partidosActivos} hint="con emisiones" />
              <Stat
                icon={ClipboardCheck}
                label="Por aprobar"
                value={solicitudes.length}
                hint="solicitudes pendientes"
                accent
              />
            </KpiBand>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            <Reveal index={2} className="min-w-0">
              <Panel eyebrow="Cola de revisión" title="Solicitudes pendientes" flush>
                {solicitudes.length === 0 ? (
                  <EmptyState icon={Inbox}>No hay solicitudes pendientes.</EmptyState>
                ) : (
                  <div className="panel-scroll cv-list max-h-[34rem] divide-y divide-border">
                    {solicitudes.map((solicitud) => (
                      <SolicitudPendiente key={solicitud.id} solicitud={solicitud} />
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>

            <Reveal index={3} className="min-w-0">
              <Panel eyebrow="Consulta" title="Trazabilidad">
                <TrazabilidadSearch />
              </Panel>
            </Reveal>
          </div>
        </Shell>
      </div>
    </div>
  );
}

function SolicitudPendiente({ solicitud }: { solicitud: EmissionRequestRow }) {
  return (
    <div className="space-y-3 px-5 py-4">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
          <ClipboardCheck className="size-4 text-accent-foreground" />
          {solicitud.partido?.nombre ?? "Partido"} · Serie {solicitud.serie}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground tnum">
          {solicitud.cantidad} bonos · {colones(solicitud.valor_nominal)} nominal · solicitada{" "}
          {fmtFecha(solicitud.requested_at)}
        </p>
      </div>
      <EmissionReviewActions requestId={solicitud.id} />
    </div>
  );
}
