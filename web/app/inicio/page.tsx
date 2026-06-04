import { redirect } from "next/navigation";
import { getCurrentActor, homeForRole } from "@/lib/auth";

// Redirige al panel correspondiente según el rol del usuario logueado.
export default async function InicioPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  redirect(homeForRole(actor.role));
}
