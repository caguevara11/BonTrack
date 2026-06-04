import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentActor } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBonoByTokenId } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-chrome";
import { LogoutButton } from "@/components/logout-button";
import { Reveal } from "@/components/reveal";
import { TransferForm } from "@/components/transfer-form";
import { colones, bonoLabel } from "@/lib/utils";

// TEN-2 — Transferir Bono.
export default async function TransferirPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId: tokenIdStr } = await params;
  const tokenId = Number(tokenIdStr);

  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role !== "tenedor" || !actor.ownerPubkey) redirect("/inicio");

  const admin = createSupabaseAdmin();
  const bono = await getBonoByTokenId(admin, tokenId);
  const esDueno = bono?.current_owner_pubkey === actor.ownerPubkey;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader subtitle={actor.displayName} right={<LogoutButton />} width="2xl" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <Link
          href="/tenedor"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a mis bonos
        </Link>

        {!bono || !esDueno ? (
          <Reveal className="mt-4">
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-4 text-sm text-destructive">
                Este bono no existe o no figura a tu nombre. Solo el tenedor actual puede
                transferirlo (R18).
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <Reveal className="mt-3">
            <h1 className="mb-4 font-heading text-2xl font-semibold text-foreground">
              Transferir bono
            </h1>
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-accent-foreground/70">
                    {bonoLabel(bono.partido, bono.serie, bono.numero)}
                  </div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {bono.partido} · Serie {bono.serie} · #{bono.numero} ·{" "}
                    <span className="tnum">{colones(bono.valor_nominal)}</span> nominal
                  </div>
                </div>
                <TransferForm tokenId={tokenId} />
              </CardContent>
            </Card>
          </Reveal>
        )}
      </main>
    </div>
  );
}
