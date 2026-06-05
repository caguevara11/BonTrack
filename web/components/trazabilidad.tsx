"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal } from "@/components/reveal";
import { ResultadoBono } from "@/components/bono-result";
import type { Resultado } from "@/app/api/trazabilidad/route";

type Modo = "bono" | "cedula";
type Catalogo = { partidos: string[]; series: string[] };
const ALL_VALUE = "__all__";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error en la consulta.");
  return data as T;
}

export function TrazabilidadSearch() {
  const [modo, setModo] = useState<Modo>("bono");
  const [partido, setPartido] = useState("");
  const [serie, setSerie] = useState("");
  const [numero, setNumero] = useState("");
  const [cedula, setCedula] = useState("");

  // Catálogo deduplicado/cacheado por TanStack Query (reemplaza useEffect+fetch).
  const { data: catalogo } = useQuery<Catalogo>({
    queryKey: ["catalogo"],
    queryFn: () => fetchJson<Catalogo>("/api/catalogo"),
  });
  const partidos = catalogo?.partidos ?? [];
  const series = catalogo?.series ?? [];

  const busqueda = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams({ mode: modo });
      if (modo === "bono") {
        if (partido) params.set("partido", partido);
        if (serie) params.set("serie", serie);
        if (numero) params.set("numero", numero);
        if (partido && serie && numero) params.set("verify", "chain");
      } else {
        params.set("cedula", cedula);
      }
      return fetchJson<{ resultados: Resultado[] }>(`/api/trazabilidad?${params}`);
    },
  });

  const resultados = busqueda.data?.resultados;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              busqueda.mutate();
            }}
          >
            <RadioGroup
              value={modo}
              onValueChange={(v) => setModo(v as Modo)}
              className="mb-5 flex flex-wrap gap-x-6 gap-y-2"
            >
              {(
                [
                  ["bono", "Bono / partido"],
                  ["cedula", "Cédula de tenedor"],
                ] as const
              ).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`modo-${value}`} />
                  <Label htmlFor={`modo-${value}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex flex-wrap items-end gap-3">
              {modo === "bono" && (
                <>
                  <FieldSelect label="Partido" value={partido} onChange={setPartido} options={partidos} allowAll />
                  <FieldSelect label="Serie" value={serie} onChange={setSerie} options={series} allowAll />
                  <div className="grid gap-1.5">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      type="number"
                      min="1"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Todos"
                      className="w-28 tnum"
                    />
                  </div>
                </>
              )}

              {modo === "cedula" && (
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="cedula">Cédula del tenedor</Label>
                  <Input
                    id="cedula"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="1-1234-5678"
                    className="max-w-xs tnum"
                    required
                  />
                </div>
              )}

              <Button type="submit" disabled={busqueda.isPending}>
                <Search className="size-4" />
                {busqueda.isPending ? "Buscando…" : "Buscar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {busqueda.isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {(busqueda.error as Error).message}
          </CardContent>
        </Card>
      )}

      {resultados && resultados.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron bonos para esa búsqueda.
          </CardContent>
        </Card>
      )}

      {resultados?.map((r, i) => (
        <Reveal key={r.bono.token_id} index={i}>
          <ResultadoBono resultado={r} />
        </Reveal>
      ))}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  allowAll = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowAll?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value || ALL_VALUE} onValueChange={(v) => onChange(v === ALL_VALUE ? "" : v)}>
        <SelectTrigger className="min-w-[7rem]">
          <SelectValue placeholder={`Elegir ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value={ALL_VALUE}>Todos</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
