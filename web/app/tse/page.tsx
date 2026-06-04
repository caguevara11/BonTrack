import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { TrazabilidadSearch } from "@/components/trazabilidad";
import { Reveal } from "@/components/reveal";

export const metadata = { title: "Trazabilidad · TSE · BonTrack" };

// TSE-3 — Consulta de Trazabilidad (con login).
export default async function TsePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "tse") redirect("/inicio");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle="Tribunal Supremo de Elecciones" right={<LogoutButton />} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Reveal className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Trazabilidad</h1>
          <p className="text-sm text-muted-foreground">
            Cadena de custodia completa de cualquier bono — por bono, por cédula del tenedor o por
            partido.
          </p>
        </Reveal>
        <Reveal index={1}>
          <TrazabilidadSearch />
        </Reveal>
      </main>
    </div>
  );
}
