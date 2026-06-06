import Link from "next/link";
import { ArrowRightLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/estado-badge";
import { BonoCartera, type CarteraItem } from "@/components/bono-cartera";
import { colones } from "@/lib/utils";

export type PartidoBono = {
  tokenId: number;
  serie: string;
  numero: number;
  valorNominal: number;
  estado: string;
  tenedor: string | null;
  puedeColocar: boolean;
};

/** "Mis bonos" del partido: lista densa agrupada por serie, con filtros y paginación. */
export function PartidoBonos({ bonos }: { bonos: PartidoBono[] }) {
  const items: CarteraItem[] = bonos.map((b) => ({
    tokenId: b.tokenId,
    serie: b.serie,
    estado: b.estado,
    node: <PartidoBonoRow key={b.tokenId} bono={b} />,
  }));

  return <BonoCartera items={items} layout="list" estadoFilter />;
}

function PartidoBonoRow({ bono: b }: { bono: PartidoBono }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-secondary/30">
      <div className="min-w-[5rem]">
        <div className="font-heading text-base font-semibold leading-tight text-foreground">
          Bono #{b.numero}
        </div>
      </div>
      <div className="min-w-[8rem] flex-1 text-sm">
        <div className="text-xs text-muted-foreground">Tenedor</div>
        <div className="truncate text-foreground">{b.tenedor ?? "—"}</div>
      </div>
      <div className="text-sm tnum">
        <div className="text-xs text-muted-foreground">Valor nominal</div>
        <div className="font-medium text-foreground">{colones(b.valorNominal)}</div>
      </div>
      <EstadoBadge estado={b.estado} />
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/bono/${b.tokenId}`}>
            <History className="size-4" />
            Historial
          </Link>
        </Button>
        {b.puedeColocar && (
          <Button asChild size="sm">
            <Link href={`/partido/transferir/${b.tokenId}`}>
              <ArrowRightLeft className="size-4" />
              Colocar
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
