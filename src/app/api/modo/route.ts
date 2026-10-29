import { NextResponse, type NextRequest } from "next/server";
import { MODE_COOKIE, getCurrentUser, hasMemberRoles } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * Cambia la vista de un administrador que también compra o vende.
 * Solo alterna entre permisos que la cuenta ya tiene; no concede ninguno.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);
  if (!user) return to("/iniciar-sesion");
  if (!user.adminAvailable) return to(user.canBuy ? "/panel" : "/venta");
  const member = req.nextUrl.searchParams.get("vista") === "miembro" && hasMemberRoles(user);
  const res = to(member ? (user.canBuy ? "/panel" : "/venta") : "/admin/solicitudes");
  if (member) res.cookies.set(MODE_COOKIE, "miembro", { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/" });
  else res.cookies.delete(MODE_COOKIE);
  await audit(user.id, "auth.view_changed", "user", user.id, { meta: { vista: member ? "compra_venta" : "administracion" } });
  return res;
}
