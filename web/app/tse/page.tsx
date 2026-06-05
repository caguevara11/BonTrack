import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getPendingEmissionRequests, type EmissionRequestRow } from "@/lib/db";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { TrazabilidadSearch } from "@/components/trazabilidad";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { EmissionReviewActions } from "@/components/emission-review-actions";
import { colones, fmtFecha } from "@/lib/utils";

export const metadata = { title: "Panel TSE · BonTrack" };

// TSE-3 — Consulta de Trazabilidad (con login).
export default async function TsePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "tse") redirect("/inicio");

  const solicitudes = await getPendingEmissionRequests(createSupabaseAdmin());

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle="Tribunal Supremo de Elecciones" right={<LogoutButton />} />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        <Reveal className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Panel TSE</h1>
          <p className="text-sm text-muted-foreground">
            Aprobación de emisiones y consulta de trazabilidad pública.
          </p>
        </Reveal>

        <Reveal index={1}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Solicitudes pendientes
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {solicitudes.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No hay solicitudes pendientes.
                </p>
              ) : (
                solicitudes.map((solicitud) => (
                  <SolicitudPendiente key={solicitud.id} solicitud={solicitud} />
                ))
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal index={2}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trazabilidad
          </h2>
          <TrazabilidadSearch />
        </Reveal>
      </main>
    </div>
  );
}

function SolicitudPendiente({ solicitud }: { solicitud: EmissionRequestRow }) {
  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_260px]">
      <div>
        <h3 className="flex items-center gap-2 font-medium text-foreground">
          <ClipboardCheck className="size-4 text-accent-foreground" />
          {solicitud.partido?.nombre ?? "Partido"} · Serie {solicitud.serie}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {solicitud.cantidad} bonos · {colones(solicitud.valor_nominal)} nominal · solicitada{" "}
          {fmtFecha(solicitud.requested_at)}
        </p>
      </div>
      <EmissionReviewActions requestId={solicitud.id} />
    </div>
  );
}
