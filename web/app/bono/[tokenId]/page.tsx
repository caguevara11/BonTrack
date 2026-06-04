import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBonoByTokenId, getEventos } from "@/lib/db";
import { ResultadoBono } from "@/components/bono-result";
import { SiteHeader } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { bonoLabel } from "@/lib/utils";

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

// Historial de custodia de un bono (lectura pública por token_id).
export default async function BonoPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId: tokenIdStr } = await params;
  const { bono, eventos } = await fetchBono(Number(tokenIdStr));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        subtitle="Historial de custodia"
        right={
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-primary-foreground/90 hover:text-primary-foreground"
          >
            <ArrowLeft className="size-4" />
            Inicio
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {bono ? (
          <Reveal>
            <ResultadoBono resultado={{ bono, eventos }} />
          </Reveal>
        ) : (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">
              No se encontró el bono solicitado.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
