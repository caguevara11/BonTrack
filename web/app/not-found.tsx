import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <Brand tone="dark" />
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La ruta que buscás no existe o se movió.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Ir a la trazabilidad pública</Link>
      </Button>
    </div>
  );
}
