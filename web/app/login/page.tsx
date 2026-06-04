"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/site-chrome";
import { Reveal } from "@/components/reveal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createSupabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales inválidas.");
      setLoading(false);
      return;
    }
    router.push("/inicio");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <Reveal className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Brand tone="dark" />
          <p className="mt-2 text-sm text-muted-foreground">
            Ingreso para tenedores, partidos y TSE
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={ingresar} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@bontrack.cr"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Ingresando…" : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          ¿Solo querés consultar?{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Trazabilidad pública (sin login)
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
