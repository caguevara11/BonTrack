"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  async function salir() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={salir}
      className="text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </Button>
  );
}
